import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiUsage } from '../../ai/ai-provider.service';
import { AiProviderError } from '../../ai/ai.errors';
import { AuditActor, AuditService } from '../../audit/audit.service';
import { GenerationGate } from '../../ai/generation-gate';
import { RoadmapGenerator } from './roadmap-generator';
import { RoadmapJobStore, RoadmapJobView } from './roadmap-job-store';
import { Roadmap } from './roadmap-schemas';

export type RoadmapFailureReason =
  | 'not_configured'
  | 'busy'
  | 'daily_limit'
  | 'refused'
  | 'invalid_output'
  | 'upstream_auth'
  | 'upstream_rate_limited'
  | 'upstream_unavailable'
  | 'save_failed'
  | 'cancelled'
  | 'unknown';

export interface RoadmapJob {
  id: string;
  status: 'running' | 'succeeded' | 'failed';
  stage: RoadmapJobView['stage'];
  result?: Roadmap;
  usage?: AiUsage;
  error?: { reason: RoadmapFailureReason; message: string; retryable: boolean };
}

const REASON_MAP: Record<string, RoadmapFailureReason> = {
  not_configured: 'not_configured',
  busy: 'busy',
  daily_limit: 'daily_limit',
  refused: 'refused',
  truncated: 'invalid_output',
  invalid_output: 'invalid_output',
  upstream_auth: 'upstream_auth',
  upstream_rate_limited: 'upstream_rate_limited',
  upstream_unavailable: 'upstream_unavailable',
  cancelled: 'cancelled',
  invalid_request: 'unknown',
  save_failed: 'save_failed',
};

/**
 * Orchestrates AI course-roadmap generation as a background job: read the
 * course + its curriculum's lesson titles -> one structured Claude call ->
 * save the result on `Course.roadmap`. Mirrors the blog pipeline's
 * job+poll+cancel shape (BlogGenerationService) but is a single-call feature,
 * so there's no multi-stage progress to report beyond generating/saving.
 *
 * Regeneration is allowed (unlike blog drafts, a roadmap is a single field on
 * an existing row) — each successful run overwrites the previous roadmap and
 * bumps `roadmapGeneratedAt`.
 */
@Injectable()
export class CourseRoadmapService {
  private readonly logger = new Logger(CourseRoadmapService.name);
  private readonly store = new RoadmapJobStore();
  // Cheap single-call feature — allow more per day than the blog's default, own instance
  // so it never competes with the blog's daily cap.
  private readonly gate = new GenerationGate(1, 30);
  private readonly controllers = new Map<string, AbortController>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly generator: RoadmapGenerator,
    private readonly auditService: AuditService,
  ) {}

  get isConfigured(): boolean {
    return this.generator.isConfigured;
  }

  /** Starts a job and returns immediately; throws an AiProviderError if at capacity or the course has no curriculum yet. */
  start(courseId: string, actor?: AuditActor): { jobId: string } {
    if (!this.generator.isConfigured) {
      throw new AiProviderError('not_configured', 'AI generation is not configured. Set ANTHROPIC_API_KEY and restart.', false);
    }
    const release = this.gate.acquire();
    let job: RoadmapJobView;
    try {
      job = this.store.create();
    } catch (err) {
      release();
      throw err;
    }
    const controller = new AbortController();
    this.controllers.set(job.id, controller);
    void this.run(job.id, courseId, controller.signal, actor).finally(() => {
      this.controllers.delete(job.id);
      release();
    });
    return { jobId: job.id };
  }

  cancel(jobId: string): void {
    const job = this.store.get(jobId);
    if (!job || job.status !== 'running') return;
    this.controllers.get(jobId)?.abort();
    this.store.update(jobId, { status: 'failed', error: { code: 'cancelled', message: 'Roadmap generation was cancelled.', retryable: false } });
  }

  getJob(jobId: string): RoadmapJob | undefined {
    const job = this.store.get(jobId);
    if (!job) return undefined;
    const out: RoadmapJob = { id: job.id, status: job.status, stage: job.stage };
    if (job.result) out.result = job.result;
    if (job.usage) out.usage = job.usage;
    if (job.error) out.error = { reason: REASON_MAP[job.error.code] ?? 'unknown', message: job.error.message, retryable: job.error.retryable };
    return out;
  }

  private async run(id: string, courseId: string, signal: AbortSignal, actor?: AuditActor): Promise<void> {
    try {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: {
          title: true,
          description: true,
          category: true,
          skillLevel: true,
          techStack: true,
          sections: {
            orderBy: { order: 'asc' },
            select: { title: true, videos: { orderBy: { order: 'asc' }, select: { title: true } } },
          },
        },
      });
      if (!course) throw new AiProviderError('invalid_request', 'Course not found.', false);

      // Curriculum is used as a loose reference only now — the model is allowed to
      // design a complete roadmap from the title/description/tech stack alone when
      // there are no lessons yet (or not enough of them).
      const sections = course.sections.map((s) => ({ title: s.title, lessonTitles: s.videos.map((v) => v.title) }));

      this.store.update(id, { stage: 'generating' });
      const { roadmap, usage } = await this.generator.generate(
        { title: course.title, description: course.description, category: course.category, skillLevel: course.skillLevel, techStack: course.techStack, sections },
        signal,
      );

      if (signal.aborted) throw new AiProviderError('cancelled', 'Roadmap generation was cancelled.', false);

      this.store.update(id, { stage: 'saving' });
      try {
        await this.prisma.course.update({ where: { id: courseId }, data: { roadmap: roadmap as object, roadmapGeneratedAt: new Date() } });
      } catch (err) {
        this.logger.error(`Saving the generated roadmap failed: ${(err as Error).message}`);
        throw new AiProviderError('save_failed', 'The roadmap was generated but could not be saved.', true);
      }

      this.store.update(id, { status: 'succeeded', stage: 'done', result: roadmap, usage });
      const nodeCount = roadmap.phases.reduce((sum, p) => sum + p.nodes.length, 0);
      const cachePct = usage.inputTokens > 0 ? Math.round((usage.cacheReadTokens / usage.inputTokens) * 100) : 0;
      this.logger.log(
        `Roadmap job ${id} succeeded for course ${courseId} (${roadmap.phases.length} phases, ${nodeCount} nodes) — ` +
          `${usage.model}, ${usage.inputTokens} in / ${usage.outputTokens} out tokens, cache ${cachePct}% (read ${usage.cacheReadTokens}, write ${usage.cacheWriteTokens})`,
      );
      if (actor) {
        void this.auditService.record(actor, {
          action: 'GENERATE',
          entityType: 'Course',
          entityId: courseId,
          meta: { stage: 'completed', phases: roadmap.phases.length, nodes: nodeCount, usage },
        });
      }
    } catch (err) {
      const e = err instanceof AiProviderError ? err : new AiProviderError('internal', 'Unexpected error while generating the roadmap.', false);
      if (!(err instanceof AiProviderError)) this.logger.error(`Roadmap job ${id} crashed: ${(err as Error)?.message}`);
      this.store.update(id, { status: 'failed', error: { code: e.code, message: e.message, retryable: e.retryable } });
    }
  }
}
