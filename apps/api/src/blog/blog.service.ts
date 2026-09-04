import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { BlogPost } from '@prisma/client';
import { AiService } from '../ai/ai.service';

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Built-in content pipeline — no n8n needed. Runs on the schedule below;
   * only does anything when BLOG_AUTOGEN=true. Set BLOG_AUTOGEN_PUBLISH=true
   * to publish immediately instead of leaving a draft for review.
   *
   * Change the cadence with BLOG_AUTOGEN_CRON (standard 5-field cron).
   */
  @Cron(process.env.BLOG_AUTOGEN_CRON || '0 8 * * *', { name: 'blog-autogen' })
  async scheduledGenerate(): Promise<void> {
    if (this.config.get<string>('BLOG_AUTOGEN') !== 'true') return;
    try {
      const post = await this.generateArticle();
      if (this.config.get<string>('BLOG_AUTOGEN_PUBLISH') === 'true') {
        await this.publish(post.id);
        this.logger.log(`Auto-published "${post.title}"`);
      } else {
        this.logger.log(`Auto-generated draft "${post.title}" (publish manually)`);
      }
    } catch (err) {
      this.logger.error(`Scheduled article generation failed: ${(err as Error).message}`);
    }
  }

  /**
   * Two-call generation pipeline (kept small on purpose — one research/outline
   * call, one writing call) using OpenAI (see AiService / OPENAI_* env).
   * Falls back to a trending Hacker News story when no topic is given.
   * The article is saved as a draft.
   */
  async generateArticle(topicInput?: string): Promise<BlogPost> {
    const topic = topicInput?.trim() || (await this.pickTrendingTopic());
    this.logger.log(`Generating article on "${topic}" via ${this.ai.model}`);

    // 1 — research + outline
    const outline = await this.ai.completeJson<{
      angle: string;
      audience: string;
      keyPoints: string[];
      seoKeywords: string[];
    }>({
      system:
        'You are a senior technical editor planning a blog post for a software-engineering learning platform.',
      prompt: `Topic: "${topic}"\n\nProduce a JSON object with:\n- "angle": the specific angle/thesis for a 900-1200 word article\n- "audience": who it is for\n- "keyPoints": 4-6 concrete points the article must cover\n- "seoKeywords": 5-8 search keywords`,
      maxTokens: 1024,
    });

    // 2 — write the article
    const article = await this.ai.completeJson<{
      title: string;
      content: string;
      metaDescription: string;
      tags: string[];
    }>({
      system:
        'You are an expert technical writer. Write accurate, practical, non-fluffy articles in Markdown. Never invent facts, benchmarks, or quotes.',
      prompt:
        `Write the article now.\n\nTopic: "${topic}"\nAngle: ${outline.angle}\nAudience: ${outline.audience}\nMust cover:\n${outline.keyPoints.map((p) => `- ${p}`).join('\n')}\nSEO keywords to weave in naturally: ${outline.seoKeywords.join(', ')}\n\n` +
        `Return a JSON object with:\n- "title": <=70 chars, specific, no clickbait\n- "content": the full article in Markdown, 900-1200 words, with ## headings and at least one code block or list where relevant\n- "metaDescription": 140-160 chars\n- "tags": 3-5 lowercase tags`,
      maxTokens: 4096,
    });

    return this.create({
      title: article.title,
      content: article.content,
      metaDescription: article.metaDescription,
      tags: Array.isArray(article.tags) ? article.tags.slice(0, 5) : [],
      sourceTopic: topic,
    });
  }

  private async pickTrendingTopic(): Promise<string> {
    try {
      const res = await fetch(
        'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=20',
      );
      const data: any = await res.json();
      const titles: string[] = (data?.hits ?? [])
        .map((h: any) => h?.title)
        .filter((t: any): t is string => typeof t === 'string' && t.length > 15);
      if (titles.length) {
        return titles[Math.floor(Math.random() * Math.min(titles.length, 8))];
      }
    } catch (err) {
      this.logger.warn(`Hacker News topic fetch failed: ${(err as Error).message}`);
    }
    return 'A practical engineering topic relevant to full-stack developers today';
  }

  async create(dto: CreateBlogPostDto): Promise<BlogPost> {
    const slug = await this.generateUniqueSlug(dto.title);

    return this.prisma.blogPost.create({
      data: {
        title: dto.title,
        slug,
        content: dto.content,
        metaDescription: dto.metaDescription,
        tags: dto.tags,
        sourceTopic: dto.sourceTopic ?? null,
        status: 'draft',
      },
    });
  }

  async findAllPublished(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where: { status: 'published' },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          metaDescription: true,
          tags: true,
          sourceTopic: true,
          publishedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.blogPost.count({
        where: { status: 'published' },
      }),
    ]);

    return {
      data: posts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAllForAdmin(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.blogPost.count(),
    ]);

    return {
      data: posts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOnePublished(slug: string): Promise<BlogPost> {
    const post = await this.prisma.blogPost.findFirst({
      where: {
        slug,
        status: 'published',
      },
    });

    if (!post) {
      throw new NotFoundException(`Blog post "${slug}" not found`);
    }

    return post;
  }

  async publish(id: string): Promise<BlogPost> {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Blog post with id "${id}" not found`);
    }

    return this.prisma.blogPost.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: new Date(),
      },
    });
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = base;
    let counter = 0;

    while (true) {
      const existing = await this.prisma.blogPost.findUnique({
        where: { slug },
      });
      if (!existing) return slug;
      counter++;
      slug = `${base}-${counter}`;
    }
  }
}
