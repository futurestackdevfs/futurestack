import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EscalationSettings,
  EscalationSeverity,
  EscalationStatus,
  EscalationType,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  ACTIVE_STATUSES,
  addDays,
  addHours,
  escalationRef,
  hoursBetween,
  isActiveStatus,
  isSlaBreached,
  severityRank,
} from './escalation-rules.util';
import {
  BulkEscalationDto,
  CreateEscalationDto,
  UpdateEscalationDto,
  UpdateEscalationSettingsDto,
} from './dto/escalation.dto';

/** Staff who can own an escalation. */
const ASSIGNABLE_ROLES: Role[] = ['ADMIN', 'COORDINATOR', 'SUPPORT'];

export interface Actor {
  id: string;
  name?: string | null;
}

export interface RaiseInput {
  type: EscalationType;
  severity: EscalationSeverity;
  title: string;
  reason: string;
  studentId?: string | null;
  orderId?: string | null;
  ticketId?: string | null;
  refundId?: string | null;
  courseId?: string | null;
  videoId?: string | null;
  createdById?: string | null;
  assigneeId?: string | null;
  /** Set by the automatic scan — guarantees the same problem is raised once. */
  dedupeKey?: string;
  autoRaised?: boolean;
  /** Overrides the default resolve-by time. */
  dueAt?: Date | null;
}

export interface RaiseResult {
  escalation: Prisma.EscalationGetPayload<object>;
  /** True when this call created it (or re-opened an auto-resolved one). */
  raised: boolean;
}

export interface ListFilters {
  /** 'ACTIVE' = anything still open; or a single status. */
  status?: string;
  type?: string;
  severity?: string;
  assigneeId?: string;
  /** 'me' is resolved by the controller before it gets here. */
  q?: string;
  overdue?: boolean;
  page?: number;
  perPage?: number;
}

const LIST_INCLUDE = {
  student: { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, role: true } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.EscalationInclude;

const TYPES: EscalationType[] = [
  'TRAINER_FLAG',
  'SUPPORT_TICKET',
  'REFUND',
  'PAYMENT',
  'CONTENT',
  'COMPLAINT',
  'COORDINATOR',
  'MANUAL',
];
const SEVERITIES: EscalationSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES: EscalationStatus[] = [
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'DISMISSED',
];

function isUniqueViolation(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
  );
}

@Injectable()
export class EscalationsService {
  private readonly logger = new Logger(EscalationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  // ─── settings ──────────────────────────────────────────────────

  async getSettings(): Promise<EscalationSettings> {
    const existing = await this.prisma.escalationSettings.findFirst();
    if (existing) return existing;
    return this.prisma.escalationSettings.create({ data: {} });
  }

  async updateSettings(dto: UpdateEscalationSettingsDto) {
    const settings = await this.getSettings();
    return this.prisma.escalationSettings.update({
      where: { id: settings.id },
      data: dto,
    });
  }

  // ─── raising ───────────────────────────────────────────────────

  /**
   * Creates an escalation. With a `dedupeKey` it is idempotent: an existing
   * active one is left alone (and only ever made MORE severe), one that the
   * system auto-resolved is re-opened, one an admin dismissed stays dismissed.
   */
  async raise(
    input: RaiseInput,
    settings?: EscalationSettings,
  ): Promise<RaiseResult> {
    const cfg = settings ?? (await this.getSettings());

    if (input.dedupeKey) {
      const existing = await this.prisma.escalation.findUnique({
        where: { dedupeKey: input.dedupeKey },
      });
      if (existing) return this.refreshExisting(existing, input, cfg);
    }

    try {
      const escalation = await this.prisma.escalation.create({
        data: {
          type: input.type,
          severity: input.severity,
          title: input.title,
          reason: input.reason,
          studentId: input.studentId ?? null,
          orderId: input.orderId ?? null,
          ticketId: input.ticketId ?? null,
          refundId: input.refundId ?? null,
          courseId: input.courseId ?? null,
          videoId: input.videoId ?? null,
          createdById: input.createdById ?? null,
          assigneeId: input.assigneeId ?? null,
          status: input.assigneeId ? 'ASSIGNED' : 'OPEN',
          dedupeKey: input.dedupeKey ?? null,
          autoRaised: input.autoRaised ?? false,
          dueAt:
            input.dueAt === undefined
              ? addHours(new Date(), cfg.resolveSlaHours)
              : input.dueAt,
          events: {
            create: {
              actorId: input.createdById ?? null,
              action: 'CREATED',
              note: input.autoRaised ? 'Detected automatically' : null,
            },
          },
        },
      });
      return { escalation, raised: true };
    } catch (e) {
      // Two scans raced to raise the same problem — the other one won.
      if (input.dedupeKey && isUniqueViolation(e)) {
        const existing = await this.prisma.escalation.findUnique({
          where: { dedupeKey: input.dedupeKey },
        });
        if (existing) return { escalation: existing, raised: false };
      }
      throw e;
    }
  }

  private async refreshExisting(
    existing: Prisma.EscalationGetPayload<object>,
    input: RaiseInput,
    cfg: EscalationSettings,
  ): Promise<RaiseResult> {
    if (isActiveStatus(existing.status)) {
      if (severityRank(input.severity) > severityRank(existing.severity)) {
        const escalation = await this.prisma.escalation.update({
          where: { id: existing.id },
          data: {
            severity: input.severity,
            events: {
              create: {
                action: 'SEVERITY',
                note: `Raised from ${existing.severity} to ${input.severity} — still unresolved`,
              },
            },
          },
        });
        return { escalation, raised: false };
      }
      return { escalation: existing, raised: false };
    }

    // Closed by the system, and the problem is back → re-open it.
    if (existing.status === 'RESOLVED') {
      const lastEvent = await this.prisma.escalationEvent.findFirst({
        where: { escalationId: existing.id },
        orderBy: { createdAt: 'desc' },
        select: { action: true },
      });
      // The last thing that happened was the system closing it (nobody touched it since).
      if (lastEvent?.action === 'AUTO_RESOLVED') {
        const escalation = await this.prisma.escalation.update({
          where: { id: existing.id },
          data: {
            status: 'OPEN',
            severity: input.severity,
            reason: input.reason,
            resolvedAt: null,
            resolution: null,
            dueAt: addHours(new Date(), cfg.resolveSlaHours),
            events: {
              create: { action: 'REOPENED', note: 'The problem came back' },
            },
          },
        });
        return { escalation, raised: true };
      }
    }
    // Dismissed (or resolved by a person) → respect that decision.
    return { escalation: existing, raised: false };
  }

  /**
   * Closes active auto-raised escalations of `type` whose underlying problem is
   * gone (their key is no longer in `stillActiveKeys`).
   */
  async autoResolveCleared(
    type: EscalationType,
    stillActiveKeys: Set<string>,
  ): Promise<number> {
    const open = await this.prisma.escalation.findMany({
      where: {
        type,
        autoRaised: true,
        status: { in: ACTIVE_STATUSES },
        dedupeKey: { not: null },
      },
      select: { id: true, dedupeKey: true },
    });
    const cleared = open.filter(
      (e) => e.dedupeKey && !stillActiveKeys.has(e.dedupeKey),
    );
    if (cleared.length === 0) return 0;

    const now = new Date();
    const note =
      'Resolved automatically — the underlying problem is no longer present.';
    await this.prisma.$transaction([
      this.prisma.escalation.updateMany({
        where: { id: { in: cleared.map((e) => e.id) } },
        data: { status: 'RESOLVED', resolution: note, resolvedAt: now },
      }),
      this.prisma.escalationEvent.createMany({
        data: cleared.map((e) => ({
          escalationId: e.id,
          action: 'AUTO_RESOLVED',
          note,
        })),
      }),
    ]);
    return cleared.length;
  }

  async createManual(dto: CreateEscalationDto, actor: Actor) {
    if (dto.studentId) {
      const student = await this.prisma.user.findUnique({
        where: { id: dto.studentId },
        select: { id: true },
      });
      if (!student) throw new BadRequestException('Student not found');
    }
    if (dto.assigneeId) await this.assertAssignable(dto.assigneeId);

    const { escalation } = await this.raise({
      type: 'MANUAL',
      severity: dto.severity ?? 'MEDIUM',
      title: dto.title.trim(),
      reason: dto.reason.trim(),
      studentId: dto.studentId,
      orderId: dto.orderId,
      ticketId: dto.ticketId,
      courseId: dto.courseId,
      assigneeId: dto.assigneeId,
      createdById: actor.id,
    });
    await this.notifyRaised([escalation]);
    return this.get(escalation.id);
  }

  /**
   * A trainer (or coordinator) flags a student. One active flag per student —
   * flagging again just adds to its history.
   */
  async flagStudent(studentId: string, reason: string | null, actor: Actor) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, role: true },
    });
    if (!student || student.role !== 'STUDENT')
      throw new NotFoundException('Student not found');

    const cfg = await this.getSettings();
    const note = reason?.trim() || null;

    const active = await this.prisma.escalation.findFirst({
      where: {
        type: 'TRAINER_FLAG',
        studentId,
        status: { in: ACTIVE_STATUSES },
      },
    });

    let escalation: Prisma.EscalationGetPayload<object>;
    let raised = false;
    if (active) {
      escalation = await this.prisma.escalation.update({
        where: { id: active.id },
        data: {
          events: {
            create: {
              actorId: actor.id,
              action: 'COMMENT',
              note: `Flagged again${actor.name ? ` by ${actor.name}` : ''}${note ? `: ${note}` : ''}`,
            },
          },
        },
      });
    } else {
      ({ escalation, raised } = await this.raise(
        {
          type: 'TRAINER_FLAG',
          severity: 'MEDIUM',
          title: `Student flagged: ${student.name}`,
          reason:
            note ?? 'Flagged for coordinator attention (no reason given).',
          studentId,
          createdById: actor.id,
          dueAt: addDays(new Date(), cfg.coordinatorSlaDays),
        },
        cfg,
      ));
    }

    // Keeps the trainer console's "flagged" badge working.
    await this.prisma.user.update({
      where: { id: studentId },
      data: { flaggedToCoordinator: true, flagReason: note },
    });
    if (raised) await this.notifyRaised([escalation]);
    return escalation;
  }

  // ─── reading ───────────────────────────────────────────────────

  async list(filters: ListFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const perPage = Math.min(100, Math.max(1, filters.perPage ?? 20));
    const now = new Date();

    const where: Prisma.EscalationWhereInput = {};
    if (filters.status === 'ACTIVE') where.status = { in: ACTIVE_STATUSES };
    else if (filters.status === 'CLOSED')
      where.status = { in: ['RESOLVED', 'DISMISSED'] };
    else if (
      filters.status &&
      STATUSES.includes(filters.status as EscalationStatus)
    ) {
      where.status = filters.status as EscalationStatus;
    }
    if (filters.type && TYPES.includes(filters.type as EscalationType)) {
      where.type = filters.type as EscalationType;
    }
    if (
      filters.severity &&
      SEVERITIES.includes(filters.severity as EscalationSeverity)
    ) {
      where.severity = filters.severity as EscalationSeverity;
    }
    if (filters.assigneeId === 'none') where.assigneeId = null;
    else if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.overdue) {
      where.status = { in: ACTIVE_STATUSES };
      where.dueAt = { lt: now };
    }
    const q = filters.q?.trim();
    if (q) {
      const num = /^(?:esc-?)?0*(\d+)$/i.exec(q);
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { reason: { contains: q, mode: 'insensitive' } },
        { student: { is: { name: { contains: q, mode: 'insensitive' } } } },
        { student: { is: { email: { contains: q, mode: 'insensitive' } } } },
        ...(num ? [{ number: Number(num[1]) }] : []),
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.escalation.findMany({
        where,
        include: LIST_INCLUDE,
        // Most severe first, then oldest — the thing that has waited longest is on top.
        orderBy: [{ severity: 'desc' }, { createdAt: 'asc' }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.escalation.count({ where }),
    ]);

    return {
      items: rows.map((r) => this.present(r, now)),
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    };
  }

  async summary() {
    const now = new Date();
    const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const [
      active,
      critical,
      breached,
      resolvedToday,
      byType,
      recentlyResolved,
    ] = await Promise.all([
      this.prisma.escalation.count({
        where: { status: { in: ACTIVE_STATUSES } },
      }),
      this.prisma.escalation.count({
        where: { status: { in: ACTIVE_STATUSES }, severity: 'CRITICAL' },
      }),
      this.prisma.escalation.count({
        where: { status: { in: ACTIVE_STATUSES }, dueAt: { lt: now } },
      }),
      this.prisma.escalation.count({
        where: { status: 'RESOLVED', resolvedAt: { gte: startOfDay } },
      }),
      this.prisma.escalation.groupBy({
        by: ['type'],
        where: { status: { in: ACTIVE_STATUSES } },
        _count: { _all: true },
      }),
      this.prisma.escalation.findMany({
        where: { status: 'RESOLVED', resolvedAt: { gte: since } },
        select: { createdAt: true, resolvedAt: true },
        take: 500,
      }),
    ]);

    const hours = recentlyResolved
      .filter((e) => e.resolvedAt)
      .map((e) => hoursBetween(e.createdAt, e.resolvedAt as Date));
    const avgResolveHours = hours.length
      ? Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10
      : null;

    return {
      active,
      critical,
      breached,
      resolvedToday,
      avgResolveHours,
      byType: Object.fromEntries(byType.map((r) => [r.type, r._count._all])),
    };
  }

  /** Just the number the sidebar badge shows. */
  async activeCount() {
    return this.prisma.escalation.count({
      where: { status: { in: ACTIVE_STATUSES } },
    });
  }

  async get(id: string) {
    const row = await this.prisma.escalation.findUnique({
      where: { id },
      include: {
        ...LIST_INCLUDE,
        events: {
          orderBy: { createdAt: 'asc' },
          include: { actor: { select: { id: true, name: true } } },
        },
      },
    });
    if (!row) throw new NotFoundException('Escalation not found');

    // What it is about, in words — so the console can show it without extra calls.
    const [ticket, course, order] = await Promise.all([
      row.ticketId
        ? this.prisma.supportTicket.findUnique({
            where: { id: row.ticketId },
            select: { number: true, subject: true, status: true },
          })
        : null,
      row.courseId
        ? this.prisma.course.findUnique({
            where: { id: row.courseId },
            select: { title: true },
          })
        : null,
      row.orderId
        ? this.prisma.order.findUnique({
            where: { id: row.orderId },
            select: { totalAmount: true, currency: true, status: true },
          })
        : null,
    ]);

    return {
      ...this.present(row, new Date()),
      events: row.events.map((e) => ({
        id: e.id,
        action: e.action,
        note: e.note,
        createdAt: e.createdAt,
        actor: e.actor ? { id: e.actor.id, name: e.actor.name } : null,
      })),
      context: {
        ticket: ticket
          ? {
              ref: `SUP-${String(ticket.number).padStart(5, '0')}`,
              subject: ticket.subject,
              status: ticket.status,
            }
          : null,
        course: course ? { title: course.title } : null,
        order: order
          ? {
              total: order.totalAmount.toNumber(),
              currency: order.currency,
              status: order.status,
            }
          : null,
      },
    };
  }

  async assignableStaff() {
    return this.prisma.user.findMany({
      where: { role: { in: ASSIGNABLE_ROLES }, isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
  }

  // ─── changing ──────────────────────────────────────────────────

  async update(id: string, dto: UpdateEscalationDto, actor: Actor) {
    const current = await this.prisma.escalation.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Escalation not found');

    const data: Prisma.EscalationUpdateInput = {};
    const events: Prisma.EscalationEventCreateWithoutEscalationInput[] = [];
    const log = (action: string, note: string | null) =>
      events.push({ action, note, actor: { connect: { id: actor.id } } });

    let nextStatus: EscalationStatus = current.status;

    if (dto.assigneeId !== undefined) {
      if (dto.assigneeId === null) {
        if (current.assigneeId) {
          data.assignee = { disconnect: true };
          log('ASSIGNED', 'Unassigned');
          if (nextStatus === 'ASSIGNED') nextStatus = 'OPEN';
        }
      } else if (dto.assigneeId !== current.assigneeId) {
        const assignee = await this.assertAssignable(dto.assigneeId);
        data.assignee = { connect: { id: dto.assigneeId } };
        log('ASSIGNED', `Assigned to ${assignee.name}`);
        if (nextStatus === 'OPEN') nextStatus = 'ASSIGNED';
      }
    }

    if (dto.status && dto.status !== current.status) nextStatus = dto.status;

    if (dto.severity && dto.severity !== current.severity) {
      data.severity = dto.severity;
      log(
        'SEVERITY',
        `Severity changed from ${current.severity} to ${dto.severity}`,
      );
    }

    if (nextStatus !== current.status) {
      const closing = nextStatus === 'RESOLVED' || nextStatus === 'DISMISSED';
      const reopening =
        !isActiveStatus(current.status) && isActiveStatus(nextStatus);
      const resolution = dto.resolution?.trim();

      if (nextStatus === 'RESOLVED' && !resolution) {
        throw new BadRequestException(
          'Add a resolution note before marking this resolved.',
        );
      }
      data.status = nextStatus;
      if (closing) {
        data.resolvedAt = new Date();
        data.resolution = resolution || current.resolution;
        log(
          'STATUS',
          `Marked ${nextStatus.toLowerCase()}${resolution ? `: ${resolution}` : ''}`,
        );
      } else if (reopening) {
        data.resolvedAt = null;
        data.dueAt = addHours(
          new Date(),
          (await this.getSettings()).resolveSlaHours,
        );
        log('REOPENED', dto.comment?.trim() || 'Re-opened');
      } else {
        log('STATUS', `Status changed from ${current.status} to ${nextStatus}`);
      }
    }

    if (dto.comment?.trim() && !events.some((e) => e.action === 'REOPENED')) {
      log('COMMENT', dto.comment.trim());
    }

    if (events.length === 0 && Object.keys(data).length === 0)
      return this.get(id);

    await this.prisma.escalation.update({
      where: { id },
      data: { ...data, events: { create: events } },
    });

    if (isActiveStatus(current.status) && !isActiveStatus(nextStatus)) {
      await this.clearTrainerFlagIfDone(current);
    }
    return this.get(id);
  }

  async addComment(id: string, note: string, actor: Actor) {
    const exists = await this.prisma.escalation.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Escalation not found');
    await this.prisma.escalationEvent.create({
      data: {
        escalationId: id,
        actorId: actor.id,
        action: 'COMMENT',
        note: note.trim(),
      },
    });
    return this.get(id);
  }

  async bulk(dto: BulkEscalationDto, actor: Actor) {
    if (dto.action === 'RESOLVE' && !dto.note?.trim()) {
      throw new BadRequestException(
        'Add a resolution note to resolve in bulk.',
      );
    }
    if (dto.action === 'ASSIGN' && !dto.assigneeId) {
      throw new BadRequestException('Choose who to assign these to.');
    }
    let done = 0;
    const failed: { id: string; message: string }[] = [];
    for (const id of dto.ids) {
      try {
        if (dto.action === 'ASSIGN') {
          await this.update(id, { assigneeId: dto.assigneeId }, actor);
        } else {
          await this.update(
            id,
            {
              status: dto.action === 'RESOLVE' ? 'RESOLVED' : 'DISMISSED',
              resolution: dto.note,
            },
            actor,
          );
        }
        done += 1;
      } catch (e) {
        failed.push({ id, message: e instanceof Error ? e.message : 'Failed' });
      }
    }
    return { done, failed };
  }

  // ─── coordinator view (trainer flags) ──────────────────────────

  async activeTrainerFlags() {
    return this.prisma.escalation.findMany({
      where: { type: 'TRAINER_FLAG', status: { in: ACTIVE_STATUSES } },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
            enrollments: { select: { course: { select: { title: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveTrainerFlag(id: string, resolution: string, actor: Actor) {
    const esc = await this.prisma.escalation.findUnique({
      where: { id },
      select: { type: true },
    });
    if (!esc || esc.type !== 'TRAINER_FLAG')
      throw new NotFoundException('Escalation not found');
    return this.update(id, { status: 'RESOLVED', resolution }, actor);
  }

  // ─── notifications ─────────────────────────────────────────────

  /** One digest email for whatever was just raised at HIGH / CRITICAL. */
  async notifyRaised(raised: Prisma.EscalationGetPayload<object>[]) {
    try {
      const urgent = raised.filter(
        (e) => e.severity === 'HIGH' || e.severity === 'CRITICAL',
      );
      if (urgent.length === 0) return;
      const cfg = await this.getSettings();
      if (!cfg.alertsEnabled) return;

      const frontend =
        this.config.get<string>('FRONTEND_URL')?.split(',')[0].trim() ??
        'http://localhost:3000';
      await this.mail.sendEscalationDigestEmail(
        this.mail.getPrimaryInboxAddress(),
        {
          total: urgent.length,
          url: `${frontend}/ops/admin?view=escalations`,
          items: urgent
            .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
            .slice(0, 10)
            .map((e) => ({
              ref: escalationRef(e.number),
              severity: e.severity,
              type: e.type,
              title: e.title,
            })),
        },
      );
    } catch (e) {
      // An alert failing must never break the thing that raised it.
      this.logger.error(
        'Failed to send escalation alert',
        e instanceof Error ? e.stack : e,
      );
    }
  }

  // ─── helpers ───────────────────────────────────────────────────

  private present(
    r: Prisma.EscalationGetPayload<{ include: typeof LIST_INCLUDE }>,
    now: Date,
  ) {
    return {
      id: r.id,
      ref: escalationRef(r.number),
      number: r.number,
      type: r.type,
      severity: r.severity,
      status: r.status,
      title: r.title,
      reason: r.reason,
      autoRaised: r.autoRaised,
      student: r.student,
      assignee: r.assignee,
      createdBy: r.createdBy,
      orderId: r.orderId,
      ticketId: r.ticketId,
      refundId: r.refundId,
      courseId: r.courseId,
      videoId: r.videoId,
      dueAt: r.dueAt,
      slaBreached: isSlaBreached(r, now),
      resolution: r.resolution,
      resolvedAt: r.resolvedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      ageHours: hoursBetween(r.createdAt, r.resolvedAt ?? now),
    };
  }

  private async assertAssignable(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true, isActive: true },
    });
    if (!user || !user.isActive || !ASSIGNABLE_ROLES.includes(user.role)) {
      throw new BadRequestException(
        'That person cannot be assigned escalations.',
      );
    }
    return user;
  }

  /** When a trainer flag closes, drop the trainer-console badge (unless another flag is still open). */
  private async clearTrainerFlagIfDone(esc: {
    type: EscalationType;
    studentId: string | null;
    id: string;
  }) {
    if (esc.type !== 'TRAINER_FLAG' || !esc.studentId) return;
    const stillOpen = await this.prisma.escalation.count({
      where: {
        type: 'TRAINER_FLAG',
        studentId: esc.studentId,
        status: { in: ACTIVE_STATUSES },
        id: { not: esc.id },
      },
    });
    if (stillOpen === 0) {
      await this.prisma.user.update({
        where: { id: esc.studentId },
        data: { flaggedToCoordinator: false, flagReason: null },
      });
    }
  }
}
