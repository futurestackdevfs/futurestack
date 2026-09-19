import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BlogService } from './blog.service';
import { PrismaService } from '../prisma/prisma.service';

// Fully mocked PrismaService / AiService / ConfigService — no live DB
// connection is ever opened, and no real OpenAI or Hacker News network call
// is ever made by this file (global fetch is mocked below too).
function makePrismaMock() {
  return {
    blogPost: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  } as unknown as PrismaService;
}

function makePostRow(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: '__spec__post-1',
    title: '__spec__ Understanding Event Loops',
    slug: 'understanding-event-loops',
    content: '# content',
    metaDescription: 'desc',
    tags: ['node'],
    sourceTopic: null,
    status: 'draft',
    publishedAt: null,
    createdAt: new Date('2026-09-01T00:00:00Z'),
    ...overrides,
  };
}

describe('BlogService', () => {
  let service: BlogService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let ai: { completeJson: jest.Mock; model: string };
  let config: { get: jest.Mock };
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    prisma = makePrismaMock();
    ai = { completeJson: jest.fn(), model: 'gpt-mock' };
    config = { get: jest.fn().mockReturnValue(undefined) };
    service = new BlogService(prisma, ai as any, config as any);
    // Stub global fetch so pickTrendingTopic() never makes a real network call.
    fetchSpy = jest.spyOn(global, 'fetch' as any).mockRejectedValue(new Error('no network in tests'));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('create() / generateUniqueSlug()', () => {
    it('slugifies the title and creates a draft post', async () => {
      (prisma.blogPost.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.blogPost.create as jest.Mock).mockResolvedValue(makePostRow());

      const result = await service.create({
        title: '__spec__ Understanding Event Loops',
        content: '# content',
        metaDescription: 'desc',
        tags: ['node'],
      } as any);

      expect(prisma.blogPost.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          slug: expect.stringMatching(/understanding-event-loops$/),
          status: 'draft',
        }),
      });
      expect(result.status).toBe('draft');
    });

    it('appends a numeric suffix when the base slug is already taken', async () => {
      (prisma.blogPost.findUnique as jest.Mock)
        .mockResolvedValueOnce(makePostRow()) // base slug taken
        .mockResolvedValueOnce(null); // -1 suffix is free
      (prisma.blogPost.create as jest.Mock).mockResolvedValue(
        makePostRow({ slug: 'understanding-event-loops-1' }),
      );

      const result = await service.create({
        title: '__spec__ Understanding Event Loops',
        content: 'x',
        metaDescription: 'y',
        tags: [],
      } as any);

      expect(prisma.blogPost.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ slug: expect.stringMatching(/-1$/) }),
      });
      expect(result.slug).toMatch(/-1$/);
    });
  });

  describe('createManual()', () => {
    it('delegates to create() using the same slug logic', async () => {
      (prisma.blogPost.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.blogPost.create as jest.Mock).mockResolvedValue(makePostRow());

      const result = await service.createManual({
        title: '__spec__ Understanding Event Loops',
        content: 'x',
        metaDescription: 'y',
        tags: [],
      } as any);

      expect(result.title).toBe('__spec__ Understanding Event Loops');
    });
  });

  describe('generateArticle() — AI failure handling', () => {
    it('propagates an error from the AI outline call rather than silently creating a bad post', async () => {
      ai.completeJson.mockRejectedValue(new Error('OpenAI request failed'));

      await expect(service.generateArticle('Some topic')).rejects.toThrow(
        'OpenAI request failed',
      );
      expect(prisma.blogPost.create).not.toHaveBeenCalled();
    });

    it('falls back to a generic topic when the Hacker News fetch fails and no topic was given', async () => {
      ai.completeJson
        .mockResolvedValueOnce({
          angle: 'a',
          audience: 'devs',
          keyPoints: ['p1'],
          seoKeywords: ['k1'],
        })
        .mockResolvedValueOnce({
          title: '__spec__ Generated Title',
          content: 'body',
          metaDescription: 'meta',
          tags: ['tag1'],
        });
      (prisma.blogPost.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.blogPost.create as jest.Mock).mockResolvedValue(
        makePostRow({ title: '__spec__ Generated Title' }),
      );

      const result = await service.generateArticle();

      expect(fetchSpy).toHaveBeenCalled();
      expect(result.title).toBe('__spec__ Generated Title');
      expect(prisma.blogPost.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: 'draft' }),
      });
    });
  });

  describe('publish()', () => {
    it('throws 404 for a nonexistent post', async () => {
      (prisma.blogPost.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.publish('__spec__missing')).rejects.toThrow(NotFoundException);
    });

    it('sets status to published and stamps publishedAt', async () => {
      (prisma.blogPost.findUnique as jest.Mock).mockResolvedValue(makePostRow());
      (prisma.blogPost.update as jest.Mock).mockResolvedValue(
        makePostRow({ status: 'published', publishedAt: new Date() }),
      );

      const result = await service.publish('__spec__post-1');

      expect(prisma.blogPost.update).toHaveBeenCalledWith({
        where: { id: '__spec__post-1' },
        data: { status: 'published', publishedAt: expect.any(Date) },
      });
      expect(result.status).toBe('published');
    });
  });

  describe('update()', () => {
    it('throws 404 for a nonexistent post', async () => {
      (prisma.blogPost.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.update('__spec__missing', { title: 'x' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects a slug change that collides with a different existing post', async () => {
      (prisma.blogPost.findUnique as jest.Mock)
        .mockResolvedValueOnce(makePostRow())
        .mockResolvedValueOnce(makePostRow({ id: '__spec__other-post' }));

      await expect(
        service.update('__spec__post-1', { slug: 'taken-slug' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows "changing" the slug to the same value it already had (no clash)', async () => {
      (prisma.blogPost.findUnique as jest.Mock).mockResolvedValue(makePostRow());
      (prisma.blogPost.update as jest.Mock).mockResolvedValue(makePostRow());

      await service.update('__spec__post-1', {
        slug: 'understanding-event-loops',
      } as any);

      expect(prisma.blogPost.update).toHaveBeenCalled();
    });

    it('stamps publishedAt the first time status flips to published', async () => {
      (prisma.blogPost.findUnique as jest.Mock).mockResolvedValue(
        makePostRow({ publishedAt: null }),
      );
      (prisma.blogPost.update as jest.Mock).mockResolvedValue({});

      await service.update('__spec__post-1', { status: 'published' } as any);

      const callArgs = (prisma.blogPost.update as jest.Mock).mock.calls[0][0];
      expect(callArgs.data.publishedAt).toBeInstanceOf(Date);
    });

    it('does not re-stamp publishedAt if the post was already published before', async () => {
      const existingPublishedAt = new Date('2026-01-01T00:00:00Z');
      (prisma.blogPost.findUnique as jest.Mock).mockResolvedValue(
        makePostRow({ publishedAt: existingPublishedAt, status: 'published' }),
      );
      (prisma.blogPost.update as jest.Mock).mockResolvedValue({});

      await service.update('__spec__post-1', { status: 'published' } as any);

      const callArgs = (prisma.blogPost.update as jest.Mock).mock.calls[0][0];
      expect(callArgs.data).not.toHaveProperty('publishedAt');
    });
  });

  describe('remove()', () => {
    it('throws 404 for a nonexistent post', async () => {
      (prisma.blogPost.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.remove('__spec__missing')).rejects.toThrow(NotFoundException);
    });

    it('deletes an existing post', async () => {
      (prisma.blogPost.findUnique as jest.Mock).mockResolvedValue(makePostRow());
      (prisma.blogPost.delete as jest.Mock).mockResolvedValue(makePostRow());

      const result = await service.remove('__spec__post-1');
      expect(prisma.blogPost.delete).toHaveBeenCalledWith({ where: { id: '__spec__post-1' } });
      expect(result.id).toBe('__spec__post-1');
    });
  });

  describe('findOnePublished()', () => {
    it('throws 404 when no published post matches the slug', async () => {
      (prisma.blogPost.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.findOnePublished('missing-slug')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
