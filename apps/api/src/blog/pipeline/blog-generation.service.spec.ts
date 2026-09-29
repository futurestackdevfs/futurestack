import { AiProviderError } from '../../ai/ai.errors';
import { AuditService } from '../../audit/audit.service';
import { ArticleGenerator } from './article-generator';
import { BlogGenerationService } from './blog-generation.service';
import { PrismaService } from '../../prisma/prisma.service';

function makePrismaMock() {
  return {
    blogPost: {
      create: jest.fn(),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
  } as unknown as PrismaService;
}

function makeGenerator(overrides: Partial<ArticleGenerator> = {}) {
  return {
    isConfigured: true,
    generate: jest.fn(),
    ...overrides,
  } as unknown as ArticleGenerator;
}

function fakeAudit() {
  return { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
}

const ARTICLE = { title: 'A Title Long Enough', content: 'x'.repeat(2600), metaDescription: 'd'.repeat(90), tags: ['a', 'b', 'c'] };

describe('BlogGenerationService', () => {
  it('reports not configured (and never touches the DB) when the AI provider has no key', () => {
    const prisma = makePrismaMock();
    const svc = new BlogGenerationService(prisma, makeGenerator({ isConfigured: false }), fakeAudit());
    expect(svc.isConfigured).toBe(false);
    expect(() => svc.start('topic')).toThrow(AiProviderError);
    expect(prisma.blogPost.create).not.toHaveBeenCalled();
  });

  it('starts a job, runs the pipeline in the background, and saves a draft on success', async () => {
    const prisma = makePrismaMock();
    (prisma.blogPost.create as jest.Mock).mockResolvedValue({ id: 'post-1', title: ARTICLE.title });
    const generate = jest.fn(async (_topic: string, onStage: (s: string) => void) => {
      onStage('research');
      onStage('write');
      onStage('verify');
      return { article: ARTICLE, meta: { model: 'claude-opus-5', inputTokens: 1, outputTokens: 1, calls: 2, repaired: false, cacheReadTokens: 0, cacheWriteTokens: 0 } };
    });
    const svc = new BlogGenerationService(prisma, makeGenerator({ generate }), fakeAudit());

    const { jobId } = svc.start('Some topic');
    expect(svc.getJob(jobId)?.status).toBe('running');

    // drain the microtask queue so the background run() completes
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    const job = svc.getJob(jobId);
    expect(job?.status).toBe('succeeded');
    expect(job?.result).toMatchObject({ postId: 'post-1', title: ARTICLE.title, sourceTopic: 'Some topic' });
    expect(prisma.blogPost.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'draft', sourceTopic: 'Some topic' }) }),
    );
  });

  it('marks the job failed with the provider error code when generation throws', async () => {
    const prisma = makePrismaMock();
    const generate = jest.fn().mockRejectedValue(new AiProviderError('refused', 'nope', false));
    const svc = new BlogGenerationService(prisma, makeGenerator({ generate }), fakeAudit());

    const { jobId } = svc.start('t');
    await new Promise((r) => setImmediate(r));

    const job = svc.getJob(jobId);
    expect(job?.status).toBe('failed');
    expect(job?.error).toEqual({ reason: 'refused', message: 'nope', retryable: false });
  });

  it('reports save_failed when the article was generated but the DB write throws', async () => {
    const prisma = makePrismaMock();
    (prisma.blogPost.create as jest.Mock).mockRejectedValue(new Error('db down'));
    const generate = jest.fn().mockResolvedValue({ article: ARTICLE, meta: { model: 'm', inputTokens: 1, outputTokens: 1, calls: 1, repaired: false, cacheReadTokens: 0, cacheWriteTokens: 0 } });
    const svc = new BlogGenerationService(prisma, makeGenerator({ generate }), fakeAudit());

    const { jobId } = svc.start('t');
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(svc.getJob(jobId)?.error?.reason).toBe('save_failed');
  });

  it('cancel() aborts the in-flight signal and marks the job failed/cancelled', async () => {
    const prisma = makePrismaMock();
    let sawAbort = false;
    const generate = jest.fn((_topic: string, _onStage: (s: string) => void, signal?: AbortSignal): Promise<never> => {
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          sawAbort = true;
          reject(new AiProviderError('cancelled', 'Generation was cancelled.', false));
        });
      });
    });
    const svc = new BlogGenerationService(prisma, makeGenerator({ generate }), fakeAudit());

    const { jobId } = svc.start('t');
    svc.cancel(jobId);

    expect(sawAbort).toBe(true);
    expect(svc.getJob(jobId)).toMatchObject({ status: 'failed', error: { reason: 'cancelled', retryable: false } });

    await new Promise((r) => setImmediate(r));
    expect(prisma.blogPost.create).not.toHaveBeenCalled();
  });

  it('cancel() is a no-op for an unknown or already-finished job', () => {
    const svc = new BlogGenerationService(makePrismaMock(), makeGenerator(), fakeAudit());
    expect(() => svc.cancel('nonexistent')).not.toThrow();
  });

  it('returns undefined for an unknown job id', () => {
    const svc = new BlogGenerationService(makePrismaMock(), makeGenerator(), fakeAudit());
    expect(svc.getJob('nonexistent')).toBeUndefined();
  });

  it('recentSourceTopics() returns normalized, non-null topics', async () => {
    const prisma = makePrismaMock();
    (prisma.blogPost.findMany as jest.Mock).mockResolvedValue([{ sourceTopic: 'Topic  A' }, { sourceTopic: null }, { sourceTopic: 'topic a' }]);
    const svc = new BlogGenerationService(prisma, makeGenerator(), fakeAudit());
    await expect(svc.recentSourceTopics()).resolves.toEqual(new Set(['topic a']));
  });
});
