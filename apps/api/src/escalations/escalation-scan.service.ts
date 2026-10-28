import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EscalationSettings, EscalationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EscalationsService, RaiseInput } from './escalations.service';
import {
  ACTIVE_STATUSES,
  addDays,
  addHours,
  complaintSeverity,
  hoursBetween,
  refundSeverity,
  ticketSeverity,
} from './escalation-rules.util';

/** Max rows a single detector looks at. If a detector hits it, it skips auto-resolving (it can't see everything). */
const CAP = 1000;

type Candidate = Omit<RaiseInput, 'type' | 'autoRaised'> & {
  dedupeKey: string;
};

export interface ScanResult {
  skipped: boolean;
  raised: number;
  autoResolved: number;
  byType: Partial<
    Record<EscalationType, { raised: number; autoResolved: number }>
  >;
  ranAt: string;
}

/**
 * Looks for problems across the platform and raises an escalation for each one,
 * once. Problems that fix themselves are closed again automatically.
 */
@Injectable()
export class EscalationScanService {
  private readonly logger = new Logger(EscalationScanService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly escalations: EscalationsService,
  ) {}

  @Cron('*/15 * * * *')
  async scheduledScan() {
    try {
      await this.scan();
    } catch (e) {
      this.logger.error(
        'Escalation scan failed',
        e instanceof Error ? e.stack : e,
      );
    }
  }

  async scan(): Promise<ScanResult> {
    const result: ScanResult = {
      skipped: false,
      raised: 0,
      autoResolved: 0,
      byType: {},
      ranAt: new Date().toISOString(),
    };
    if (this.running) return { ...result, skipped: true };
    this.running = true;

    try {
      const cfg = await this.escalations.getSettings();
      const now = new Date();
      const newlyRaised: Prisma.EscalationGetPayload<object>[] = [];

      await this.importLegacyFlags(cfg, newlyRaised);

      const detectors: [EscalationType, () => Promise<Candidate[] | null>][] = [
        ['SUPPORT_TICKET', () => this.detectTickets(cfg, now)],
        ['REFUND', () => this.detectRefunds(cfg, now)],
        ['PAYMENT', () => this.detectPayments(cfg, now)],
        ['CONTENT', () => this.detectFailedVideos()],
        ['COMPLAINT', () => this.detectComplaints(cfg, now)],
        ['COORDINATOR', () => this.detectCoordinatorBreaches(now)],
      ];

      for (const [type, detect] of detectors) {
        // One broken detector must not stop the others.
        try {
          const candidates = await detect();
          if (candidates === null) continue;
          const stats = (result.byType[type] ??= {
            raised: 0,
            autoResolved: 0,
          });

          const keys = new Set<string>();
          for (const c of candidates) {
            keys.add(c.dedupeKey);
            const { escalation, raised } = await this.escalations.raise(
              { ...c, type, autoRaised: true },
              cfg,
            );
            if (raised) {
              stats.raised += 1;
              newlyRaised.push(escalation);
            }
          }
          stats.autoResolved = await this.escalations.autoResolveCleared(
            type,
            keys,
          );
          result.raised += stats.raised;
          result.autoResolved += stats.autoResolved;
        } catch (e) {
          this.logger.error(
            `Escalation detector ${type} failed`,
            e instanceof Error ? e.stack : e,
          );
        }
      }

      await this.escalations.notifyRaised(newlyRaised);
      if (result.raised || result.autoResolved) {
        this.logger.log(
          `Escalation scan: ${result.raised} raised, ${result.autoResolved} auto-resolved`,
        );
      }
      return result;
    } finally {
      this.running = false;
    }
  }

  // ─── detectors ─────────────────────────────────────────────────
  // Each returns every problem that exists right now, or null when it could not
  // see them all (so nothing gets auto-resolved on incomplete data).

  /** Tickets still waiting on an agent past the SLA. */
  private async detectTickets(
    cfg: EscalationSettings,
    now: Date,
  ): Promise<Candidate[] | null> {
    const rows = await this.prisma.supportTicket.findMany({
      where: {
        status: 'OPEN',
        lastMessageAt: { lt: addHours(now, -cfg.ticketSlaHours) },
      },
      select: {
        id: true,
        number: true,
        subject: true,
        priority: true,
        studentId: true,
        lastMessageAt: true,
      },
      take: CAP,
    });
    if (rows.length >= CAP) return null;

    return rows.map((t) => {
      const waited = hoursBetween(t.lastMessageAt, now);
      const ref = `SUP-${String(t.number).padStart(5, '0')}`;
      return {
        dedupeKey: `TICKET:${t.id}`,
        severity: ticketSeverity(t.priority, waited, cfg.ticketSlaHours),
        title: `Ticket ${ref} unanswered for ${waited}h`,
        reason: `"${t.subject}" has been waiting on an agent for ${waited} hours (limit: ${cfg.ticketSlaHours}h).`,
        studentId: t.studentId,
        ticketId: t.id,
      };
    });
  }

  /** Refund requests nobody has approved yet. */
  private async detectRefunds(
    cfg: EscalationSettings,
    now: Date,
  ): Promise<Candidate[] | null> {
    const rows = await this.prisma.refund.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: addHours(now, -cfg.refundPendingHours) },
      },
      select: {
        id: true,
        orderId: true,
        studentId: true,
        courseId: true,
        amount: true,
        createdAt: true,
        order: { select: { currency: true } },
      },
      take: CAP,
    });
    if (rows.length >= CAP) return null;

    return rows.map((r) => {
      const waited = hoursBetween(r.createdAt, now);
      const symbol = r.order?.currency === 'USD' ? '$' : '₹';
      const amount = `${symbol}${r.amount.toNumber().toLocaleString('en-IN')}`;
      return {
        dedupeKey: `REFUND:${r.id}`,
        severity: refundSeverity(waited, cfg.refundPendingHours),
        title: `Refund of ${amount} pending for ${waited}h`,
        reason: `A refund of ${amount} has been waiting for approval for ${waited} hours (limit: ${cfg.refundPendingHours}h). The student is expecting this money.`,
        studentId: r.studentId,
        orderId: r.orderId,
        refundId: r.id,
        courseId: r.courseId,
      };
    });
  }

  /** Paid orders that never got their enrollment (or, for online payments, their invoice). */
  private async detectPayments(
    cfg: EscalationSettings,
    now: Date,
  ): Promise<Candidate[] | null> {
    const orders = await this.prisma.order.findMany({
      where: {
        status: 'PAID',
        createdAt: { gte: addDays(now, -30) },
        // updatedAt is the closest thing to "when it was paid"; give finalization time to finish.
        updatedAt: {
          lt: new Date(now.getTime() - cfg.paidGraceMinutes * 60 * 1000),
        },
      },
      select: {
        id: true,
        userId: true,
        totalAmount: true,
        razorpayOrderId: true,
        invoices: { select: { id: true }, take: 1 },
        items: { select: { courseId: true, status: true } },
      },
      take: CAP,
    });
    if (orders.length >= CAP) return null;

    const courseItems = orders.flatMap((o) =>
      o.items
        .filter((i) => i.courseId && i.status !== 'refunded')
        .map((i) => ({ userId: o.userId, courseId: i.courseId as string })),
    );
    const enrolled = new Set<string>();
    if (courseItems.length > 0) {
      const rows = await this.prisma.enrollment.findMany({
        where: {
          studentId: { in: [...new Set(courseItems.map((c) => c.userId))] },
          courseId: { in: [...new Set(courseItems.map((c) => c.courseId))] },
        },
        select: { studentId: true, courseId: true },
      });
      for (const r of rows) enrolled.add(`${r.studentId}:${r.courseId}`);
    }

    const out: Candidate[] = [];
    for (const o of orders) {
      const missing = o.items.find(
        (i) =>
          i.courseId &&
          i.status !== 'refunded' &&
          !enrolled.has(`${o.userId}:${i.courseId}`),
      );
      // Cash sales (MANUAL-…) are invoiced from the sales console, so only online ones are checked here.
      const online = !o.razorpayOrderId.startsWith('MANUAL-');
      const noInvoice = online && o.invoices.length === 0;
      if (!missing && !noInvoice) continue;

      out.push({
        dedupeKey: `PAYMENT:${o.id}`,
        severity: missing ? 'CRITICAL' : 'MEDIUM',
        title: missing
          ? 'Paid order has no enrollment'
          : 'Paid order has no invoice',
        reason: missing
          ? 'The student paid but is not enrolled in a course from this order — they cannot access what they bought.'
          : 'This online payment was captured but no invoice was generated for it.',
        studentId: o.userId,
        orderId: o.id,
        courseId: missing?.courseId ?? null,
      });
    }
    return out;
  }

  /** Videos that failed processing and so cannot be watched. */
  private async detectFailedVideos(): Promise<Candidate[] | null> {
    const rows = await this.prisma.video.findMany({
      where: { videoStatus: 'FAILED' },
      select: {
        id: true,
        title: true,
        section: {
          select: { courseId: true, course: { select: { title: true } } },
        },
      },
      take: CAP,
    });
    if (rows.length >= CAP) return null;

    return rows.map((v) => ({
      dedupeKey: `VIDEO:${v.id}`,
      severity: 'HIGH' as const,
      title: `Video failed processing: ${v.title}`,
      reason: `"${v.title}" in "${v.section.course.title}" failed to process, so students cannot watch it. Re-upload it.`,
      videoId: v.id,
      courseId: v.section.courseId,
    }));
  }

  /** Courses collecting a run of low ratings. */
  private async detectComplaints(
    cfg: EscalationSettings,
    now: Date,
  ): Promise<Candidate[] | null> {
    const groups = await this.prisma.review.groupBy({
      by: ['courseId'],
      where: {
        courseId: { not: null },
        rating: { lte: 2 },
        createdAt: { gte: addDays(now, -cfg.complaintWindowDays) },
      },
      _count: { _all: true },
    });
    const hot = groups.filter(
      (g) => g.courseId && g._count._all >= cfg.complaintMinCount,
    );
    if (hot.length === 0) return [];

    const courses = await this.prisma.course.findMany({
      where: { id: { in: hot.map((g) => g.courseId as string) } },
      select: { id: true, title: true },
    });
    const titles = new Map(courses.map((c) => [c.id, c.title]));

    return hot.map((g) => ({
      dedupeKey: `COMPLAINT:${g.courseId}`,
      severity: complaintSeverity(g._count._all, cfg.complaintMinCount),
      title: `Low ratings on ${titles.get(g.courseId as string) ?? 'a course'}`,
      reason: `${g._count._all} reviews of 2★ or lower in the last ${cfg.complaintWindowDays} days (flagged at ${cfg.complaintMinCount}).`,
      courseId: g.courseId,
    }));
  }

  /** Trainer flags the coordinator has left unresolved past their SLA. */
  private async detectCoordinatorBreaches(
    now: Date,
  ): Promise<Candidate[] | null> {
    const rows = await this.prisma.escalation.findMany({
      where: {
        type: 'TRAINER_FLAG',
        status: { in: ACTIVE_STATUSES },
        dueAt: { lt: now },
      },
      select: {
        id: true,
        number: true,
        title: true,
        studentId: true,
        createdAt: true,
      },
      take: CAP,
    });
    if (rows.length >= CAP) return null;

    return rows.map((e) => ({
      dedupeKey: `COORD:${e.id}`,
      severity: 'HIGH' as const,
      title: `Coordinator hasn't resolved: ${e.title}`,
      reason: `A trainer flag has been open for ${Math.floor(hoursBetween(e.createdAt, now) / 24)} day(s) without being resolved.`,
      studentId: e.studentId,
    }));
  }

  /**
   * One-time bridge from the old storage: trainer flags that lived on the
   * student row (`flaggedToCoordinator`) or inside their bio JSON become real
   * escalations. Keyed, so it only ever imports each student once.
   */
  private async importLegacyFlags(
    cfg: EscalationSettings,
    collect: Prisma.EscalationGetPayload<object>[],
  ) {
    const alreadyOpen = async (studentId: string) =>
      (await this.prisma.escalation.count({
        where: {
          type: 'TRAINER_FLAG',
          studentId,
          status: { in: ACTIVE_STATUSES },
        },
      })) > 0;

    const flagged = await this.prisma.user.findMany({
      where: { role: 'STUDENT', flaggedToCoordinator: true },
      select: { id: true, name: true, flagReason: true },
      take: 500,
    });
    for (const s of flagged) {
      if (await alreadyOpen(s.id)) continue;
      const { escalation, raised } = await this.escalations.raise(
        {
          type: 'TRAINER_FLAG',
          severity: 'MEDIUM',
          title: `Student flagged: ${s.name}`,
          reason:
            s.flagReason ??
            'Flagged for coordinator attention (no reason given).',
          studentId: s.id,
          dedupeKey: `LEGACY_FLAG:${s.id}`,
          dueAt: addDays(new Date(), cfg.coordinatorSlaDays),
        },
        cfg,
      );
      if (raised) collect.push(escalation);
    }

    const withBio = await this.prisma.user.findMany({
      where: { role: 'STUDENT', bio: { contains: 'coordinatorFlag' } },
      select: { id: true, name: true, bio: true },
      take: 500,
    });
    for (const s of withBio) {
      let flags: Record<string, unknown> = {};
      try {
        const parsed: unknown = JSON.parse(s.bio ?? '{}');
        if (parsed && typeof parsed === 'object')
          flags = parsed as Record<string, unknown>;
      } catch {
        continue;
      }
      const flag = flags.coordinatorFlag;
      if (typeof flag !== 'string' || !flag || flag === 'resolved') continue;
      if (await alreadyOpen(s.id)) continue;

      const note =
        typeof flags.coordinatorFlagNote === 'string'
          ? flags.coordinatorFlagNote
          : null;
      const { escalation, raised } = await this.escalations.raise(
        {
          type: 'TRAINER_FLAG',
          severity: 'MEDIUM',
          title: `Student flagged: ${s.name}`,
          reason: note ?? `Flagged as "${flag}" (no reason given).`,
          studentId: s.id,
          dedupeKey: `LEGACY_BIO:${s.id}`,
          dueAt: addDays(new Date(), cfg.coordinatorSlaDays),
        },
        cfg,
      );
      if (raised) collect.push(escalation);
    }
  }
}
