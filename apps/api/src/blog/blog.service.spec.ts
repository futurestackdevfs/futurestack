import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { BlogService } from './blog.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiProviderError } from '../ai/ai.errors';
import { BlogGenerationService } from './pipeline/blog-generation.service';

// Fully mocked PrismaService / BlogGenerationService — no live DB connection
// is ever opened and no request to the AI provider is ever made.
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
  let generation: { start: jest.Mock; getJob: jest.Mock };

  beforeEach(() => {
    prisma = makePrismaMock();
    generation = { start: jest.fn(), getJob: jest.fn() };
    service = new BlogService(prisma, generation as unknown as BlogGenerationService);
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

  describe('AI generation (delegated to BlogGenerationService)', () => {
    it('starts a job and returns its id', () => {
      generation.start.mockReturnValue({ jobId: 'job-1' });

      expect(service.startGeneration('Some topic')).toEqual({ jobId: 'job-1' });

      expect(generation.start).toHaveBeenCalledWith('Some topic', undefined);
      expect(prisma.blogPost.create).not.toHaveBeenCalled(); // the pipeline saves the draft, not this call
    });

    it('maps an AiProviderError to a 503 with the reason/retryable the dashboard expects', () => {
      generation.start.mockImplementation(() => {
        throw new AiProviderError('busy', 'Too many generations in progress.', true);
      });

      let err: ServiceUnavailableException | undefined;
      try {
        service.startGeneration('t');
      } catch (e) {
        err = e as ServiceUnavailableException;
      }
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      expect(err!.getResponse()).toMatchObject({ statusCode: 503, message: 'Too many generations in progress.', reason: 'busy', retryable: true });
    });

    it('rethrows a non-AiProviderError unchanged', () => {
      generation.start.mockImplementation(() => {
        throw new Error('unexpected');
      });
      expect(() => service.startGeneration('t')).toThrow('unexpected');
    });

    it('returns job progress unchanged', () => {
      const job = { id: 'job-1', status: 'running', stage: 'write' };
      generation.getJob.mockReturnValue(job);

      expect(service.getGeneration('job-1')).toBe(job);
      expect(generation.getJob).toHaveBeenCalledWith('job-1');
    });

    it('404s an unknown or expired job', () => {
      generation.getJob.mockReturnValue(undefined);
      expect(() => service.getGeneration('missing')).toThrow(NotFoundException);
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
