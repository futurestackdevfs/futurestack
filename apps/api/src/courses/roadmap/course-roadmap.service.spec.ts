import { AiProviderError } from '../../ai/ai.errors';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CourseRoadmapService } from './course-roadmap.service';
import { RoadmapGenerator } from './roadmap-generator';

function makePrismaMock(courseOverrides: Partial<Record<string, any>> = {}) {
  return {
    course: {
      findUnique: jest.fn().mockResolvedValue({
        title: 'Full-Stack Web Development',
        description: 'desc',
        category: 'Web Development',
        skillLevel: 'BEGINNER',
        techStack: ['React'],
        sections: [{ title: 'Basics', videos: [{ title: 'Intro to HTML' }] }],
        ...courseOverrides,
      }),
      update: jest.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaService;
}

function makeGenerator(overrides: Partial<RoadmapGenerator> = {}) {
  return { isConfigured: true, generate: jest.fn(), ...overrides } as unknown as RoadmapGenerator;
}

function fakeAudit() {
  return { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
}

const ROADMAP = {
  title: 'r',
  summary: 's',
  prerequisites: [],
  phases: [{ phase: 'Beginner', nodes: [{ title: 't', description: 'd', chips: [{ title: 'c', kind: 'must', lessonTitles: ['Intro to HTML'] }] }] }],
  rels: [],
};

const USAGE = { model: 'claude-haiku-4-5', inputTokens: 100, outputTokens: 400, cacheReadTokens: 0, cacheWriteTokens: 90 };
const GEN_RESULT = { roadmap: ROADMAP, usage: USAGE };

describe('CourseRoadmapService', () => {
  it('reports not configured (and never touches the DB) when the AI provider has no key', () => {
    const prisma = makePrismaMock();
    const svc = new CourseRoadmapService(prisma, makeGenerator({ isConfigured: false }), fakeAudit());
    expect(svc.isConfigured).toBe(false);
    expect(() => svc.start('course-1')).toThrow(AiProviderError);
    expect(prisma.course.update).not.toHaveBeenCalled();
  });

  it('starts a job, generates, and saves the roadmap + timestamp on the course', async () => {
    const prisma = makePrismaMock();
    const generate = jest.fn().mockResolvedValue(GEN_RESULT);
    const svc = new CourseRoadmapService(prisma, makeGenerator({ generate }), fakeAudit());

    const { jobId } = svc.start('course-1');
    expect(svc.getJob(jobId)?.status).toBe('running');

    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    const job = svc.getJob(jobId);
    expect(job?.status).toBe('succeeded');
    expect(job?.result).toEqual(ROADMAP);
    expect(job?.usage).toEqual(USAGE);
    expect(prisma.course.update).toHaveBeenCalledWith({
      where: { id: 'course-1' },
      data: { roadmap: ROADMAP, roadmapGeneratedAt: expect.any(Date) },
    });
  });

  it('still generates a roadmap when the course has no lessons yet (curriculum is a reference, not a requirement)', async () => {
    const prisma = makePrismaMock({ sections: [{ title: 'Empty section', videos: [] }] });
    const generate = jest.fn().mockResolvedValue(GEN_RESULT);
    const svc = new CourseRoadmapService(prisma, makeGenerator({ generate }), fakeAudit());

    const { jobId } = svc.start('course-1');
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(svc.getJob(jobId)).toMatchObject({ status: 'succeeded' });
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ sections: [{ title: 'Empty section', lessonTitles: [] }] }), expect.anything());
  });

  it('marks the job failed with save_failed when persisting the roadmap throws', async () => {
    const prisma = makePrismaMock();
    (prisma.course.update as jest.Mock).mockRejectedValue(new Error('db down'));
    const generate = jest.fn().mockResolvedValue(GEN_RESULT);
    const svc = new CourseRoadmapService(prisma, makeGenerator({ generate }), fakeAudit());

    const { jobId } = svc.start('course-1');
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(svc.getJob(jobId)?.error?.reason).toBe('save_failed');
  });

  it('cancel() aborts the in-flight signal and marks the job cancelled', async () => {
    let sawAbort = false;
    const generate = jest.fn((_course: unknown, signal?: AbortSignal): Promise<never> => {
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          sawAbort = true;
          reject(new AiProviderError('cancelled', 'Roadmap generation was cancelled.', false));
        });
      });
    });
    const prisma = makePrismaMock();
    const svc = new CourseRoadmapService(prisma, makeGenerator({ generate }), fakeAudit());

    const { jobId } = svc.start('course-1');
    // let run() get past the course lookup await and reach generate() so the abort listener is registered
    await new Promise((r) => setImmediate(r));
    svc.cancel(jobId);

    expect(sawAbort).toBe(true);
    expect(svc.getJob(jobId)).toMatchObject({ status: 'failed', error: { reason: 'cancelled' } });
  });

  it('cancel() is a no-op for an unknown or already-finished job', () => {
    const svc = new CourseRoadmapService(makePrismaMock(), makeGenerator(), fakeAudit());
    expect(() => svc.cancel('nonexistent')).not.toThrow();
  });

  it('returns undefined for an unknown job id', () => {
    const svc = new CourseRoadmapService(makePrismaMock(), makeGenerator(), fakeAudit());
    expect(svc.getJob('nonexistent')).toBeUndefined();
  });
});
