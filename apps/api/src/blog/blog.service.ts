import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { BlogPost } from '@prisma/client';

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

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
