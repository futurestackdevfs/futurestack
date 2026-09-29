import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiProviderError } from '../../ai/ai.errors';
import { AuditActor, AuditService } from '../../audit/audit.service';
import { ArticleGenerator } from './article-generator';
import { GenerationGate } from '../../ai/generation-gate';
import { GenerationUsageMeta, JobStore, JobView } from './job-store';
import { normalizeTopic, pickTrendingTopic } from './topics';

/** Failure reasons the dashboard understands (kept flat/stable for the frontend). */
export type GenerationFailureReason =
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

export interface GenerationJob {
  id: string;
  status: 'running' | 'succeeded' | 'failed';
  stage: JobView['stage'];
  result?: { postId: string; title: string; sourceTopic: string; meta?: GenerationUsageMeta };
  error?: { reason: GenerationFailureReason; message: string; retryable: boolean };
}

const REASON_MAP: Record<string, GenerationFailureReason> = {
  not_configured: 'not_configured',
  busy: 'busy',
  daily_limit: 'daily_limit',
  refused: 'refused',
  truncated: 'invalid_output',
  invalid_output: 'invalid_output',
  upstream_auth: 'upstream_auth',
  upstream_rate_limited: 'upstream_rate_limited',
  upstream_unavailable: 'upstream_unavailable',
  save_failed: 'save_failed',
  cancelled: 'cancelled',
};

/**
 * Orchestrates AI blog-article generation as a background job: pick a topic →
 * research → write → verify → save as a DRAFT. Runs entirely in-process (no
 * network hop to a separate service) — {@link ArticleGenerator} does the model
 * calls via the shared {@link AiProviderService}, and this class owns the
 * job bookkeeping, spend limits and persistence.
 */
@Injectable()
export class BlogGenerationService {
  private readonly logger = new Logger(BlogGenerationService.name);
  private readonly store = new JobStore();
  private readonly gate = new GenerationGate();
  /** One AbortController per in-flight job, so cancel() can stop the actual Claude call (not just hide it in the UI). */
  private readonly controllers = new Map<string, AbortController>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly generator: ArticleGenerator,
    private readonly auditService: AuditService,
  ) {}

  get isConfigured(): boolean {
    return this.generator.isConfigured;
  }

  /** Starts a job and returns immediately; throws an AiProviderError (429-ish) if at capacity. */
  start(topic?: string, actor?: AuditActor): { jobId: string } {
    if (!this.generator.isConfigured) {
      throw new AiProviderError('not_configured', 'AI generation is not configured. Set ANTHROPIC_API_KEY and restart.', false);
    }
    const release = this.gate.acquire();
    let job: JobView;
    try {
      job = this.store.create();
    } catch (err) {
      release();
      throw err;
    }
    const controller = new AbortController();
    this.controllers.set(job.id, controller);
    void this.run(job.id, controller.signal, topic?.trim() || undefined, actor).finally(() => {
      this.controllers.delete(job.id);
      release();
    });
    return { jobId: job.id };
  }

  /** Cancels a running job: aborts the in-flight Claude call (no charge for a partial response) and marks it failed. */
  cancel(jobId: string): void {
    const job = this.store.get(jobId);
    if (!job || job.status !== 'running') return;
    this.controllers.get(jobId)?.abort();
    this.store.update(jobId, { status: 'failed', error: { code: 'cancelled', message: 'Generation was cancelled.', retryable: false } });
  }

  getJob(jobId: string): GenerationJob | undefined {
    const job = this.store.get(jobId);
    if (!job) return undefined;
    const out: GenerationJob = { id: job.id, status: job.status, stage: job.stage };
    if (job.result) out.result = { postId: job.result.postId, title: job.result.title, sourceTopic: job.result.sourceTopic, meta: job.result.meta };
    if (job.error) out.error = { reason: REASON_MAP[job.error.code] ?? 'unknown', message: job.error.message, retryable: job.error.retryable };
    return out;
  }

  /** Source topics already used (drafts included) — lets topic-picking skip repeats. */
  async recentSourceTopics(limit = 200): Promise<Set<string>> {
    const rows = await this.prisma.blogPost.findMany({
      where: { sourceTopic: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { sourceTopic: true },
    });
    return new Set(rows.map((r) => r.sourceTopic).filter((t): t is string => !!t).map(normalizeTopic));
  }

  private async run(id: string, signal: AbortSignal, given?: string, actor?: AuditActor): Promise<void> {
    try {
      let topic = given;
      if (!topic) {
        this.store.update(id, { stage: 'topic' });
        const used = await this.recentSourceTopics();
        topic = await pickTrendingTopic(used, this.logger);
      }

      const { article, meta } = await this.generator.generate(topic, (stage) => this.store.update(id, { stage }), signal);

      if (signal.aborted) throw new AiProviderError('cancelled', 'Generation was cancelled.', false);
      this.store.update(id, { stage: 'saving' });
      let saved: { id: string; title: string };
      try {
        saved = await this.saveDraft(article, topic);
      } catch (err) {
        this.logger.error(`Saving the generated draft failed: ${(err as Error).message}`);
        throw new AiProviderError('internal', 'The article was generated but could not be saved.', true);
      }

      this.store.update(id, { status: 'succeeded', stage: 'done', result: { postId: saved.id, title: saved.title, sourceTopic: topic, meta } });
      this.logger.log(`Article job ${id} succeeded -> post ${saved.id} (${meta.calls} calls, repaired=${meta.repaired})`);
      if (actor) {
        void this.auditService.record(actor, {
          action: 'GENERATE',
          entityType: 'BlogPost',
          entityId: saved.id,
          meta: { stage: 'completed', sourceTopic: topic, usage: meta },
        });
      }
    } catch (err) {
      const e = err instanceof AiProviderError ? err : new AiProviderError('internal', 'Unexpected error while generating the article.', false);
      if (!(err instanceof AiProviderError)) this.logger.error(`Job ${id} crashed: ${(err as Error)?.message}`);
      const code = e.code === 'internal' && e.message.includes('could not be saved') ? 'save_failed' : e.code;
      this.store.update(id, { status: 'failed', error: { code, message: e.message, retryable: e.retryable } });
    }
  }

  private async saveDraft(article: { title: string; content: string; metaDescription: string; tags: string[] }, sourceTopic: string) {
    const slug = await this.generateUniqueSlug(article.title);
    const post = await this.prisma.blogPost.create({
      data: {
        title: article.title,
        slug,
        content: article.content,
        metaDescription: article.metaDescription,
        tags: article.tags,
        sourceTopic,
        status: 'draft',
      },
    });
    return { id: post.id, title: post.title };
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = base;
    let counter = 0;
    while (true) {
      const existing = await this.prisma.blogPost.findUnique({ where: { slug } });
      if (!existing) return slug;
      counter++;
      slug = `${base}-${counter}`;
    }
  }
}
