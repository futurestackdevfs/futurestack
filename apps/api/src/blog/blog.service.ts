import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { BlogPost } from '@prisma/client';
import { AiProviderError } from '../ai/ai.errors';
import { AuditActor } from '../audit/audit.service';
import { BlogGenerationService, GenerationJob } from './pipeline/blog-generation.service';

@Injectable()
export class BlogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generation: BlogGenerationService,
  ) {}

  /**
   * Starts AI article generation in the background (research → write →
   * fact-check → save as a DRAFT) and returns a job id right away; the
   * dashboard polls {@link getGeneration}. Runs in-process via
   * {@link BlogGenerationService} — no network hop, no second deploy.
   */
  startGeneration(topic?: string, actor?: AuditActor): { jobId: string } {
    try {
      return this.generation.start(topic, actor);
    } catch (err) {
      throw this.toHttpError(err);
    }
  }

  getGeneration(jobId: string): GenerationJob {
    const job = this.generation.getJob(jobId);
    if (!job) throw new NotFoundException('Generation job not found or expired');
    return job;
  }

  /** Cancels a running job (aborts the in-flight Claude call). No-op if it already finished. */
  cancelGeneration(jobId: string): { cancelled: true } {
    this.generation.cancel(jobId);
    return { cancelled: true };
  }

  private toHttpError(err: unknown): ServiceUnavailableException {
    if (err instanceof AiProviderError) {
      return new ServiceUnavailableException({
        statusCode: 503,
        error: 'AI Generation Failed',
        message: err.message,
        reason: err.code,
        retryable: err.retryable,
      });
    }
    throw err;
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

  /** Manual creation from the admin panel — reuses the same slug/create logic as `create()`. */
  async createManual(dto: CreateBlogPostDto): Promise<BlogPost> {
    return this.create(dto);
  }

  async update(id: string, dto: UpdateBlogPostDto): Promise<BlogPost> {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Blog post with id "${id}" not found`);
    }

    let slug = existing.slug;
    if (dto.slug && dto.slug !== existing.slug) {
      const clash = await this.prisma.blogPost.findUnique({ where: { slug: dto.slug } });
      if (clash && clash.id !== id) {
        throw new BadRequestException(`Slug "${dto.slug}" is already in use`);
      }
      slug = dto.slug;
    }

    const data: Record<string, unknown> = { slug };
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.metaDescription !== undefined) data.metaDescription = dto.metaDescription;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'published' && !existing.publishedAt) {
        data.publishedAt = new Date();
      }
    }

    return this.prisma.blogPost.update({ where: { id }, data });
  }

  async remove(id: string): Promise<BlogPost> {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Blog post with id "${id}" not found`);
    }
    return this.prisma.blogPost.delete({ where: { id } });
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
