import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AiProviderError } from '../../ai/ai.errors';
import { GenerationStage } from './article-generator';

export type JobStage = 'queued' | 'topic' | GenerationStage | 'saving' | 'done';

export interface GenerationUsageMeta {
  model: string;
  inputTokens: number;
  outputTokens: number;
  calls: number;
  repaired: boolean;
  /** Tokens served from Anthropic's prompt cache (billed at ~10% of input price) — 0 if not hit. */
  cacheReadTokens: number;
  /** Tokens written to the cache this run (billed at ~125% of input price, paid back by later hits). */
  cacheWriteTokens: number;
}

export interface JobView {
  id: string;
  status: 'running' | 'succeeded' | 'failed';
  stage: JobStage;
  createdAt: string;
  result?: {
    postId: string;
    title: string;
    sourceTopic: string;
    meta: GenerationUsageMeta;
  };
  error?: { code: string; message: string; retryable: boolean };
}

/**
 * In-memory job registry for background AI generation. Jobs are short-lived
 * progress records (the finished article lives in the database as a draft,
 * not here); they expire after `ttlMs` and the store is size-capped so it
 * can't grow without bound. Per-process by design — fine for a single API
 * instance; a multi-instance deploy would need this moved to Redis.
 */
@Injectable()
export class JobStore {
  private readonly jobs = new Map<string, JobView>();

  constructor(
    private readonly ttlMs = 30 * 60_000,
    private readonly maxJobs = 200,
    private readonly now: () => number = Date.now,
  ) {}

  create(): JobView {
    this.sweep();
    if (this.jobs.size >= this.maxJobs) {
      // Drop the oldest FINISHED job; never evict one that's still running.
      const finished = [...this.jobs.values()].find((j) => j.status !== 'running');
      if (!finished) throw new AiProviderError('busy', 'Too many jobs in progress. Try again shortly.', true);
      this.jobs.delete(finished.id);
    }
    const job: JobView = { id: randomUUID(), status: 'running', stage: 'queued', createdAt: new Date(this.now()).toISOString() };
    this.jobs.set(job.id, job);
    return job;
  }

  get(id: string): JobView | undefined {
    this.sweep();
    return this.jobs.get(id);
  }

  update(id: string, patch: Partial<Omit<JobView, 'id' | 'createdAt'>>): void {
    const job = this.jobs.get(id);
    if (job) Object.assign(job, patch);
  }

  private sweep(): void {
    const cutoff = this.now() - this.ttlMs;
    for (const [id, job] of this.jobs) {
      if (job.status !== 'running' && Date.parse(job.createdAt) < cutoff) this.jobs.delete(id);
    }
  }
}
