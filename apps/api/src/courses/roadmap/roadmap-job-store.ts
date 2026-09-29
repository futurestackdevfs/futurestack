import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AiUsage } from '../../ai/ai-provider.service';
import { AiProviderError } from '../../ai/ai.errors';
import { Roadmap } from './roadmap-schemas';

export type RoadmapJobStage = 'queued' | 'generating' | 'saving' | 'done';

export interface RoadmapJobView {
  id: string;
  status: 'running' | 'succeeded' | 'failed';
  stage: RoadmapJobStage;
  createdAt: string;
  result?: Roadmap;
  /** Token/cache usage for the generation call — present once the job succeeds. */
  usage?: AiUsage;
  error?: { code: string; message: string; retryable: boolean };
}

/**
 * In-memory job registry for background roadmap generation — same shape as
 * the blog pipeline's JobStore, kept as its own small class (rather than a
 * shared generic) so this feature has no compile-time coupling to blog code.
 */
@Injectable()
export class RoadmapJobStore {
  private readonly jobs = new Map<string, RoadmapJobView>();

  constructor(
    private readonly ttlMs = 30 * 60_000,
    private readonly maxJobs = 100,
    private readonly now: () => number = Date.now,
  ) {}

  create(): RoadmapJobView {
    this.sweep();
    if (this.jobs.size >= this.maxJobs) {
      const finished = [...this.jobs.values()].find((j) => j.status !== 'running');
      if (!finished) throw new AiProviderError('busy', 'Too many roadmap jobs in progress. Try again shortly.', true);
      this.jobs.delete(finished.id);
    }
    const job: RoadmapJobView = { id: randomUUID(), status: 'running', stage: 'queued', createdAt: new Date(this.now()).toISOString() };
    this.jobs.set(job.id, job);
    return job;
  }

  get(id: string): RoadmapJobView | undefined {
    this.sweep();
    return this.jobs.get(id);
  }

  update(id: string, patch: Partial<Omit<RoadmapJobView, 'id' | 'createdAt'>>): void {
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
