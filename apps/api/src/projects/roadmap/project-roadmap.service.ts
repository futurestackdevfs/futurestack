import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiUsage } from '../../ai/ai-provider.service';
import { AiProviderError } from '../../ai/ai.errors';
import { AuditActor, AuditService } from '../../audit/audit.service';
import { GenerationGate } from '../../ai/generation-gate';
import { RoadmapGenerator } from '../../courses/roadmap/roadmap-generator';
import { RoadmapJobStore, RoadmapJobView } from '../../courses/roadmap/roadmap-job-store';
import { Roadmap, RoadmapSchema } from '../../courses/roadmap/roadmap-schemas';

export interface RoadmapVideoLinkUpdate {
  phase: number;
  node: number;
  chip: number;
  videoId: string | null;
}

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
 * Project's counterpart to CourseRoadmapService — same AI pipeline
 * (RoadmapGenerator/RoadmapSchema/RoadmapJobStore, all reused as-is from
 * courses/roadmap/), just reading/saving against Project + ProjectCurriculum
 * + ProjectCurriculumVideo instead of Course + Section + Video.
 */
@Injectable()
export class ProjectRoadmapService {
  private readonly logger = new Logger(ProjectRoadmapService.name);
  private readonly store = new RoadmapJobStore();
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

  start(projectId: string, actor?: AuditActor): { jobId: string } {
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
    void this.run(job.id, projectId, controller.signal, actor).finally(() => {
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

  async updateVideoLinks(projectId: string, updates: RoadmapVideoLinkUpdate[], actor?: AuditActor): Promise<Roadmap> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { roadmap: true } });
    if (!project) throw new NotFoundException('Project not found.');
    const parsed = RoadmapSchema.safeParse(project.roadmap);
    if (!parsed.success) throw new BadRequestException('This project has no valid roadmap to edit yet.');

    const roadmap = parsed.data;
    for (const u of updates) {
      const chip = roadmap.phases[u.phase]?.nodes[u.node]?.chips[u.chip];
      if (chip) chip.videoId = u.videoId;
    }

    await this.prisma.project.update({ where: { id: projectId }, data: { roadmap: roadmap as object } });
    if (actor) {
      void this.auditService.record(actor, {
        action: 'UPDATE',
        entityType: 'Project',
        entityId: projectId,
        meta: { stage: 'roadmap_video_links', updated: updates.length },
      });
    }
    return roadmap;
  }

  async updateContent(projectId: string, incoming: unknown, actor?: AuditActor): Promise<Roadmap> {
    const parsed = RoadmapSchema.safeParse(incoming);
    if (!parsed.success) throw new BadRequestException('That roadmap edit is not valid: ' + parsed.error.issues[0]?.message);
    const roadmap = parsed.data;

    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { roadmap: true } });
    if (!project) throw new NotFoundException('Project not found.');
    const prevByTitle = new Map<string, string | null | undefined>();
    const prev = RoadmapSchema.safeParse(project.roadmap);
    if (prev.success) {
      for (const phase of prev.data.phases) for (const node of phase.nodes) for (const chip of node.chips) prevByTitle.set(chip.title, chip.videoId);
    }
    for (const phase of roadmap.phases) {
      for (const node of phase.nodes) {
        for (const chip of node.chips) {
          if (chip.videoId === undefined) chip.videoId = prevByTitle.get(chip.title) ?? null;
        }
      }
    }

    await this.prisma.project.update({ where: { id: projectId }, data: { roadmap: roadmap as object } });
    if (actor) {
      void this.auditService.record(actor, {
        action: 'UPDATE',
        entityType: 'Project',
        entityId: projectId,
        meta: { stage: 'roadmap_manual_edit' },
      });
    }
    return roadmap;
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

  private async run(id: string, projectId: string, signal: AbortSignal, actor?: AuditActor): Promise<void> {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: {
          name: true,
          overview: true,
          shortDesc: true,
          category: true,
          level: true,
          stack: true,
          curriculum: {
            orderBy: { order: 'asc' },
            select: { title: true, videos: { orderBy: { order: 'asc' }, select: { id: true, title: true } } },
          },
        },
      });
      if (!project) throw new AiProviderError('invalid_request', 'Project not found.', false);

      const sections = project.curriculum.map((c) => ({ title: c.title, lessonTitles: c.videos.map((v) => v.title) }));

      this.store.update(id, { stage: 'generating' });
      const { roadmap, usage } = await this.generator.generate(
        {
          title: project.name,
          description: project.overview || project.shortDesc || null,
          category: project.category,
          skillLevel: project.level,
          techStack: project.stack,
          sections,
        },
        signal,
      );

      if (signal.aborted) throw new AiProviderError('cancelled', 'Roadmap generation was cancelled.', false);

      const videoByTitle = new Map<string, string>();
      for (const s of project.curriculum) for (const v of s.videos) videoByTitle.set(v.title.trim().toLowerCase(), v.id);
      const chipTitles = new Set<string>();
      for (const phase of roadmap.phases) {
        for (const node of phase.nodes) {
          for (const chip of node.chips) {
            const match = chip.lessonTitles.map((t) => videoByTitle.get(t.trim().toLowerCase())).find(Boolean);
            chip.videoId = match ?? null;
            chipTitles.add(chip.title);
          }
        }
      }

      roadmap.rels = roadmap.rels.filter((r) => chipTitles.has(r.learnFirst) && chipTitles.has(r.unlocks));

      this.store.update(id, { stage: 'saving' });
      try {
        await this.prisma.project.update({ where: { id: projectId }, data: { roadmap: roadmap as object, roadmapGeneratedAt: new Date() } });
      } catch (err) {
        this.logger.error(`Saving the generated roadmap failed: ${(err as Error).message}`);
        throw new AiProviderError('save_failed', 'The roadmap was generated but could not be saved.', true);
      }

      this.store.update(id, { status: 'succeeded', stage: 'done', result: roadmap, usage });
      const nodeCount = roadmap.phases.reduce((sum, p) => sum + p.nodes.length, 0);
      const cachePct = usage.inputTokens > 0 ? Math.round((usage.cacheReadTokens / usage.inputTokens) * 100) : 0;
      this.logger.log(
        `Roadmap job ${id} succeeded for project ${projectId} (${roadmap.phases.length} phases, ${nodeCount} nodes) — ` +
          `${usage.model}, ${usage.inputTokens} in / ${usage.outputTokens} out tokens, cache ${cachePct}% (read ${usage.cacheReadTokens}, write ${usage.cacheWriteTokens})`,
      );
      if (actor) {
        void this.auditService.record(actor, {
          action: 'GENERATE',
          entityType: 'Project',
          entityId: projectId,
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
