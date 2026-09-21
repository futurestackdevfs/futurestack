import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Role, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateAgentMessageDto } from './dto/create-agent-message.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

interface ReqUser {
  id: string;
  role: Role;
}

const AGENT_ROLES: Role[] = [Role.SUPPORT, Role.ADMIN];

const ticketInclude = {
  student: { select: { id: true, name: true, email: true, avatarUrl: true } },
  assignee: { select: { id: true, name: true } },
  // latest public reply from a support agent — powers the "last replied by" column
  messages: {
    where: { isInternalNote: false, author: { role: { in: AGENT_ROLES } } },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { createdAt: true, author: { select: { id: true, name: true } } },
  },
} satisfies Prisma.SupportTicketInclude;

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {}

  private isAgent(role: Role): boolean {
    return AGENT_ROLES.includes(role);
  }

  private get frontendUrl(): string {
    return (
      this.config.get<string>('FRONTEND_URL')?.split(',')[0].trim() ??
      'http://localhost:3000'
    );
  }

  private studentUrl(ticketId: string): string {
    return `${this.frontendUrl}/support/tickets/${ticketId}`;
  }

  private agentUrl(ticketId: string): string {
    return `${this.frontendUrl}/ops/support?ticket=${ticketId}`;
  }

  // ── shared loaders ────────────────────────────────────────────────

  private async loadTicketOr404(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: ticketInclude,
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  private async getOwnedTicketOr403(id: string, user: ReqUser) {
    const ticket = await this.loadTicketOr404(id);
    if (!this.isAgent(user.role) && ticket.studentId !== user.id) {
      throw new ForbiddenException('This ticket does not belong to you');
    }
    return ticket;
  }

  // ── serializers ──────────────────────────────────────────────────

  private ref(n: number): string {
    return `FS-SUP-${String(n).padStart(5, '0')}`;
  }

  private serializeTicket(
    t: Prisma.SupportTicketGetPayload<{ include: typeof ticketInclude }>,
  ) {
    const lastReply = t.messages?.[0];
    return {
      id: t.id,
      number: t.number,
      ref: this.ref(t.number),
      subject: t.subject,
      category: t.category,
      topic: t.topic,
      context: t.context ?? null,
      priority: t.priority,
      status: t.status,
      student: t.student,
      assignee: t.assignee,
      lastAgentReply: lastReply
        ? {
            by: lastReply.author.name,
            byId: lastReply.author.id,
            at: lastReply.createdAt,
          }
        : null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      lastMessageAt: t.lastMessageAt,
      resolvedAt: t.resolvedAt,
      closedAt: t.closedAt,
    };
  }

  private serializeMessage(m: {
    id: string;
    body: string;
    attachmentUrl: string | null;
    isInternalNote: boolean;
    createdAt: Date;
    author: { id: string; name: string; role: Role; avatarUrl: string | null };
  }) {
    return {
      id: m.id,
      body: m.body,
      attachmentUrl: m.attachmentUrl,
      isInternalNote: m.isInternalNote,
      createdAt: m.createdAt,
      author: {
        id: m.author.id,
        name: m.author.name,
        role: m.author.role,
        avatarUrl: m.author.avatarUrl,
        isAgent: this.isAgent(m.author.role),
      },
    };
  }

  // ── student: create ──────────────────────────────────────────────

  async createTicket(user: ReqUser, dto: CreateTicketDto) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        subject: dto.subject.trim(),
        category: dto.category,
        topic: dto.topic?.trim() || null,
        context: (dto.context ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        priority: dto.priority ?? 'NORMAL',
        status: 'OPEN',
        studentId: user.id,
        lastMessageAt: new Date(),
        messages: {
          create: {
            authorId: user.id,
            body: dto.body.trim(),
            attachmentUrl: dto.attachmentUrl?.trim() || null,
          },
        },
      },
      include: ticketInclude,
    });

    void this.notifyTicketOpened(ticket);
    return this.serializeTicket(ticket);
  }

  private async notifyTicketOpened(
    ticket: Prisma.SupportTicketGetPayload<{ include: typeof ticketInclude }>,
  ) {
    if (ticket.student.email) {
      await this.mail.sendTicketOpenedEmail(ticket.student.email, {
        studentName: ticket.student.name,
        ticketRef: this.ref(ticket.number),
        subject: ticket.subject,
        url: this.studentUrl(ticket.id),
      });
    }
    // Always ping the one configured inbox — no separate notify address.
    await this.mail.sendAgentNewTicketEmail(
      this.mail.getPrimaryInboxAddress(),
      {
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        url: this.agentUrl(ticket.id),
      },
    );
  }

  // ── student: read ────────────────────────────────────────────────

  async listMine(
    userId: string,
    opts: { status?: TicketStatus; page: number; limit: number },
  ) {
    const where: Prisma.SupportTicketWhereInput = {
      studentId: userId,
      ...(opts.status ? { status: opts.status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: ticketInclude,
        orderBy: { lastMessageAt: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return {
      data: rows.map((t) => this.serializeTicket(t)),
      total,
      page: opts.page,
      limit: opts.limit,
    };
  }

  async getThread(id: string, user: ReqUser) {
    const ticket = await this.getOwnedTicketOr403(id, user);
    const forStudent = !this.isAgent(user.role);
    const messages = await this.prisma.supportTicketMessage.findMany({
      where: {
        ticketId: id,
        ...(forStudent ? { isInternalNote: false } : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { id: true, name: true, role: true, avatarUrl: true },
        },
      },
    });
    return {
      ...this.serializeTicket(ticket),
      messages: messages.map((m) => this.serializeMessage(m)),
    };
  }

  // ── student: write ───────────────────────────────────────────────

  async addStudentMessage(id: string, user: ReqUser, dto: CreateMessageDto) {
    const ticket = await this.getOwnedTicketOr403(id, user);
    if (ticket.status === 'CLOSED') {
      throw new BadRequestException(
        'This ticket is closed. Open a new ticket instead.',
      );
    }
    const message = await this.prisma.supportTicketMessage.create({
      data: {
        ticketId: id,
        authorId: user.id,
        body: dto.body.trim(),
        attachmentUrl: dto.attachmentUrl?.trim() || null,
      },
      include: {
        author: {
          select: { id: true, name: true, role: true, avatarUrl: true },
        },
      },
    });
    await this.prisma.supportTicket.update({
      where: { id },
      data: { status: 'OPEN', lastMessageAt: new Date() },
    });
    return this.serializeMessage(message);
  }

  async closeOwn(id: string, user: ReqUser) {
    const ticket = await this.getOwnedTicketOr403(id, user);
    if (ticket.status === 'CLOSED') return this.serializeTicket(ticket);
    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
      include: ticketInclude,
    });
    return this.serializeTicket(updated);
  }

  // ── agent: queue ─────────────────────────────────────────────────

  async staffList(opts: {
    status?: string;
    priority?: string;
    category?: string;
    assigneeId?: string;
    q?: string;
    page: number;
    limit: number;
  }) {
    const where: Prisma.SupportTicketWhereInput = {};
    if (opts.status) where.status = opts.status as TicketStatus;
    if (opts.priority) where.priority = opts.priority as any;
    if (opts.category) where.category = opts.category as any;
    if (opts.assigneeId) {
      where.assigneeId =
        opts.assigneeId === 'unassigned' ? null : opts.assigneeId;
    }
    if (opts.q?.trim()) {
      const q = opts.q.trim();
      where.OR = [
        { subject: { contains: q, mode: 'insensitive' } },
        { student: { name: { contains: q, mode: 'insensitive' } } },
        { student: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: ticketInclude,
        orderBy: [{ status: 'asc' }, { lastMessageAt: 'desc' }],
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return {
      data: rows.map((t) => this.serializeTicket(t)),
      total,
      page: opts.page,
      limit: opts.limit,
    };
  }

  async staffStats() {
    const grouped = await this.prisma.supportTicket.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const counts: Record<string, number> = {
      OPEN: 0,
      PENDING: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };
    for (const g of grouped) counts[g.status] = g._count._all;
    counts.TOTAL = Object.values(counts).reduce((a, b) => a + b, 0);
    return counts;
  }

  async staffAgents() {
    return this.prisma.user.findMany({
      where: { role: { in: AGENT_ROLES }, isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });
  }

  // ── agent: write ─────────────────────────────────────────────────

  async staffAddMessage(id: string, user: ReqUser, dto: CreateAgentMessageDto) {
    const ticket = await this.loadTicketOr404(id);
    const internal = !!dto.isInternalNote;

    const message = await this.prisma.supportTicketMessage.create({
      data: {
        ticketId: id,
        authorId: user.id,
        body: dto.body.trim(),
        attachmentUrl: dto.attachmentUrl?.trim() || null,
        isInternalNote: internal,
      },
      include: {
        author: {
          select: { id: true, name: true, role: true, avatarUrl: true },
        },
      },
    });

    // A new ticket is visible to every agent while unassigned; whoever responds
    // first (public reply OR internal note) becomes its owner.
    const claim = ticket.assigneeId ? {} : { assigneeId: user.id };

    if (internal) {
      if (!ticket.assigneeId) {
        await this.prisma.supportTicket.update({ where: { id }, data: claim });
      }
    } else {
      await this.prisma.supportTicket.update({
        where: { id },
        data: {
          status: ticket.status === 'RESOLVED' ? 'RESOLVED' : 'PENDING',
          lastMessageAt: new Date(),
          ...claim,
        },
      });
      if (ticket.student.email) {
        void this.mail.sendTicketReplyEmail(ticket.student.email, {
          studentName: ticket.student.name,
          subject: ticket.subject,
          preview: dto.body.trim().slice(0, 240),
          url: this.studentUrl(id),
        });
      }
    }

    return this.serializeMessage(message);
  }

  async staffUpdate(id: string, dto: UpdateTicketDto) {
    const ticket = await this.loadTicketOr404(id);
    const data: Prisma.SupportTicketUpdateInput = {};

    if (dto.assigneeId !== undefined) {
      data.assignee =
        dto.assigneeId && dto.assigneeId !== ''
          ? { connect: { id: dto.assigneeId } }
          : { disconnect: true };
    }
    if (dto.priority) data.priority = dto.priority;

    if (dto.status && dto.status !== ticket.status) {
      data.status = dto.status;
      if (dto.status === 'RESOLVED') data.resolvedAt = new Date();
      if (dto.status === 'CLOSED') data.closedAt = new Date();
      if (dto.status === 'OPEN' || dto.status === 'PENDING') {
        data.resolvedAt = null;
        data.closedAt = null;
      }
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data,
      include: ticketInclude,
    });

    if (
      dto.status === 'RESOLVED' &&
      ticket.status !== 'RESOLVED' &&
      updated.student.email
    ) {
      void this.mail.sendTicketResolvedEmail(updated.student.email, {
        studentName: updated.student.name,
        subject: updated.subject,
        url: this.studentUrl(id),
      });
    }

    return this.serializeTicket(updated);
  }

  // ── agent: student directory / 360° profile ─────────────────────────

  async listStudents(opts: {
    q?: string;
    page: number;
    limit: number;
    enrolledOnly?: boolean;
  }) {
    // Enrollments view only wants students with >=1 enrollment; the general
    // Students directory wants every student regardless of enrollment.
    const where: Prisma.UserWhereInput = {
      role: Role.STUDENT,
      ...(opts.enrolledOnly ? { enrollments: { some: {} } } : {}),
    };
    if (opts.q?.trim()) {
      const q = opts.q.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        {
          enrollments: {
            some: { course: { title: { contains: q, mode: 'insensitive' } } },
          },
        },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          lastLoginAt: true,
          _count: { select: { enrollments: true } },
        },
        orderBy: { name: 'asc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl,
        lastLoginAt: u.lastLoginAt,
        enrollmentCount: u._count.enrollments,
      })),
      total,
      page: opts.page,
      limit: opts.limit,
    };
  }

  // Reuses the exact same flow as "Forgot password" on the login page —
  // generates + stores a reset token and emails the link, best-effort. An
  // agent can override the destination email (e.g. an alternate inbox the
  // student confirmed on a call); forgotPassword() only actually sends when
  // that email matches the account, same anti-enumeration guarantee as the
  // public flow.
  async sendStudentPasswordReset(studentId: string, overrideEmail?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, email: true, role: true },
    });
    if (!user || user.role !== Role.STUDENT) {
      throw new NotFoundException('Student not found');
    }
    const target = overrideEmail?.trim() || user.email;
    await this.authService.forgotPassword(target);
    return { sent: true, email: target };
  }

  async getStudentProfile(studentId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        avatarUrl: true,
        lastLoginAt: true,
        createdAt: true,
        isActive: true,
        role: true,
      },
    });
    if (!user || user.role !== Role.STUDENT) {
      throw new NotFoundException('Student not found');
    }

    const [
      enrollments,
      certificates,
      projectItems,
      reviews,
      recentOrders,
      ticketsRaw,
    ] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { studentId },
        include: {
          course: { select: { id: true, title: true, thumbnailUrl: true } },
        },
        orderBy: { enrolledAt: 'desc' },
      }),
      this.prisma.certificate.findMany({ where: { studentId } }),
      this.prisma.orderItem.findMany({
        where: { order: { userId: studentId }, projectId: { not: null } },
        include: {
          project: { select: { id: true, name: true, image: true } },
          order: { select: { createdAt: true, status: true } },
        },
        orderBy: { order: { createdAt: 'desc' } },
      }),
      this.prisma.review.findMany({
        where: { studentId },
        include: {
          course: { select: { title: true } },
          project: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.order.findMany({
        where: { userId: studentId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          totalAmount: true,
          currency: true,
          status: true,
          razorpayOrderId: true,
          createdAt: true,
        },
      }),
      this.prisma.supportTicket.findMany({
        where: { studentId },
        orderBy: { lastMessageAt: 'desc' },
        take: 10,
        select: {
          id: true,
          number: true,
          subject: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    const certByCourse = new Map(certificates.map((c) => [c.courseId, c]));

    // Lightweight progress: videos completed / total videos in the course —
    // matches the shape used across student.service.ts without importing it.
    const courses = await Promise.all(
      enrollments.map(async (e) => {
        const videoIds = await this.prisma.video.findMany({
          where: { section: { courseId: e.courseId } },
          select: { id: true },
        });
        const totalVideos = videoIds.length;
        const completedVideos = totalVideos
          ? await this.prisma.videoProgress.count({
              where: {
                studentId,
                isCompleted: true,
                videoId: { in: videoIds.map((v) => v.id) },
              },
            })
          : 0;
        const cert = certByCourse.get(e.courseId);
        return {
          enrollmentId: e.id,
          courseId: e.courseId,
          title: e.course.title,
          thumbnailUrl: e.course.thumbnailUrl,
          status: e.status,
          amountPaid: e.amountPaid.toNumber(),
          enrolledAt: e.enrolledAt,
          progressPercent: totalVideos
            ? Math.round((completedVideos / totalVideos) * 100)
            : 0,
          certificate: cert
            ? {
                credentialId: cert.credentialId,
                score: cert.score,
                issuedAt: cert.issuedAt,
              }
            : null,
        };
      }),
    );

    const projects = await Promise.all(
      projectItems.map(async (item) => {
        if (!item.project) return null;
        const curriculumVideoIds =
          await this.prisma.projectCurriculumVideo.findMany({
            where: { curriculum: { projectId: item.projectId! } },
            select: { id: true },
          });
        const total = curriculumVideoIds.length;
        const completed = total
          ? await this.prisma.videoProgress.count({
              where: {
                studentId,
                isCompleted: true,
                projectCurriculumVideoId: {
                  in: curriculumVideoIds.map((v) => v.id),
                },
              },
            })
          : 0;
        return {
          orderItemId: item.id,
          projectId: item.projectId,
          name: item.project.name,
          image: item.project.image,
          status: item.status,
          purchasedAt: item.order.createdAt,
          progressPercent: total ? Math.round((completed / total) * 100) : 0,
        };
      }),
    );

    return {
      user,
      courses,
      projects: projects.filter((p): p is NonNullable<typeof p> => p !== null),
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        on: r.course?.title ?? r.project?.name ?? 'Unknown',
        createdAt: r.createdAt,
      })),
      recentOrders: recentOrders.map((o) => ({
        ...o,
        totalAmount: o.totalAmount.toNumber(),
      })),
      tickets: ticketsRaw.map((t) => ({
        id: t.id,
        ref: this.ref(t.number),
        subject: t.subject,
        status: t.status,
        createdAt: t.createdAt,
      })),
    };
  }

  // ── agent: ratings & reviews (per course / per project) ─────────────

  async listRatingSubjects(opts: {
    type: 'course' | 'project';
    q?: string;
    page: number;
    limit: number;
  }) {
    // Only list courses/projects that actually have reviews.
    if (opts.type === 'course') {
      const where: Prisma.CourseWhereInput = { reviewCount: { gt: 0 } };
      if (opts.q?.trim())
        where.title = { contains: opts.q.trim(), mode: 'insensitive' };

      const [rows, total] = await Promise.all([
        this.prisma.course.findMany({
          where,
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            averageRating: true,
            reviewCount: true,
          },
          orderBy: { reviewCount: 'desc' },
          skip: (opts.page - 1) * opts.limit,
          take: opts.limit,
        }),
        this.prisma.course.count({ where }),
      ]);
      return {
        data: rows.map((c) => ({
          id: c.id,
          type: 'course' as const,
          title: c.title,
          image: c.thumbnailUrl,
          rating: c.averageRating,
          reviewCount: c.reviewCount,
        })),
        total,
        page: opts.page,
        limit: opts.limit,
      };
    }

    const where: Prisma.ProjectWhereInput = { reviewCount: { gt: 0 } };
    if (opts.q?.trim())
      where.name = { contains: opts.q.trim(), mode: 'insensitive' };

    const [rows, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        select: {
          id: true,
          name: true,
          image: true,
          rating: true,
          reviewCount: true,
        },
        orderBy: { reviewCount: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      this.prisma.project.count({ where }),
    ]);
    return {
      data: rows.map((p) => ({
        id: p.id,
        type: 'project' as const,
        title: p.name,
        image: p.image,
        rating: p.rating,
        reviewCount: p.reviewCount,
      })),
      total,
      page: opts.page,
      limit: opts.limit,
    };
  }

  async getRatingDetail(type: 'course' | 'project', id: string) {
    const subject =
      type === 'course'
        ? await this.prisma.course.findUnique({
            where: { id },
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
              averageRating: true,
              reviewCount: true,
            },
          })
        : await this.prisma.project.findUnique({
            where: { id },
            select: {
              id: true,
              name: true,
              image: true,
              rating: true,
              reviewCount: true,
            },
          });
    if (!subject) throw new NotFoundException('Not found');

    const reviews = await this.prisma.review.findMany({
      where: type === 'course' ? { courseId: id } : { projectId: id },
      include: {
        student: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Rating breakdown (5★..1★ counts) — computed here since Course/Project
    // only store the rolling average + count, not the distribution.
    const distribution: Record<'1' | '2' | '3' | '4' | '5', number> = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };
    for (const r of reviews) {
      const key = String(r.rating) as keyof typeof distribution;
      if (key in distribution) distribution[key] += 1;
    }

    const title = 'title' in subject ? subject.title : subject.name;
    const image =
      'thumbnailUrl' in subject ? subject.thumbnailUrl : subject.image;
    const rating =
      'averageRating' in subject ? subject.averageRating : subject.rating;

    return {
      id: subject.id,
      type,
      title,
      image,
      rating,
      reviewCount: subject.reviewCount,
      distribution,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        student: r.student,
        createdAt: r.createdAt,
      })),
    };
  }

  // ── agent: payments (read-only — no mutations here) ─────────────────

  private readonly paymentListInclude = {
    user: { select: { id: true, name: true, email: true } },
    items: {
      select: {
        id: true,
        priceAtPurchase: true,
        currency: true,
        status: true,
        course: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
      },
    },
  } satisfies Prisma.OrderInclude;

  async staffListPayments(opts: {
    status?: string;
    q?: string;
    page: number;
    limit: number;
  }) {
    const where: Prisma.OrderWhereInput = {};
    if (opts.status) where.status = opts.status as any;
    if (opts.q?.trim()) {
      const q = opts.q.trim();
      where.OR = [
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { razorpayOrderId: { contains: q, mode: 'insensitive' } },
        { razorpayPaymentId: { contains: q, mode: 'insensitive' } },
        { billingEmail: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: this.paymentListInclude,
        orderBy: { createdAt: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: rows.map((o) => ({
        id: o.id,
        student: o.user,
        items: o.items.map((i) => ({
          id: i.id,
          title: i.course?.title ?? i.project?.name ?? 'Unknown',
          type: i.course ? 'course' : i.project ? 'project' : 'unknown',
          price: i.priceAtPurchase.toNumber(),
          status: i.status,
        })),
        currency: o.currency,
        totalAmount: o.totalAmount.toNumber(),
        status: o.status,
        razorpayOrderId: o.razorpayOrderId,
        paymentMethod: o.paymentMethod,
        batchMode: o.batchMode,
        createdAt: o.createdAt,
      })),
      total,
      page: opts.page,
      limit: opts.limit,
    };
  }

  async staffPaymentStats() {
    const grouped = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { totalAmount: true },
    });
    const out: Record<string, { count: number; total: number }> = {};
    for (const g of grouped) {
      out[g.status] = { count: g._count._all, total: g._sum.totalAmount?.toNumber() ?? 0 };
    }
    return out;
  }

  async getPaymentDetail(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        items: {
          include: {
            course: { select: { id: true, title: true, thumbnailUrl: true } },
            project: { select: { id: true, name: true, image: true } },
          },
        },
        invoices: true,
        refunds: {
          include: {
            initiatedBy: { select: { id: true, name: true } },
            course: { select: { title: true } },
            project: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        enrollments: {
          select: { id: true, courseId: true, status: true, enrolledAt: true },
        },
        salesperson: { select: { id: true, name: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    return {
      id: order.id,
      student: order.user,
      currency: order.currency,
      gatewayType: order.gatewayType,
      subtotal: order.subtotal.toNumber(),
      discountAmount: order.discountAmount.toNumber(),
      discountReason: order.discountReason,
      gstPercent: order.gstPercent.toNumber(),
      gstAmount: order.gstAmount.toNumber(),
      totalAmount: order.totalAmount.toNumber(),
      status: order.status,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: order.razorpayPaymentId,
      paymentMethod: order.paymentMethod,
      batchMode: order.batchMode,
      billing: {
        fullName: order.billingFullName,
        email: order.billingEmail,
        phone: order.billingPhone,
        address: order.billingAddress,
        city: order.billingCity,
        state: order.billingState,
        pincode: order.billingPincode,
      },
      salesperson: order.salesperson,
      items: order.items.map((i) => ({
        id: i.id,
        type: i.course ? 'course' : i.project ? 'project' : 'unknown',
        title: i.course?.title ?? i.project?.name ?? 'Unknown',
        image: i.course?.thumbnailUrl ?? i.project?.image ?? null,
        price: i.priceAtPurchase.toNumber(),
        currency: i.currency,
        status: i.status,
      })),
      invoice: order.invoices[0]
        ? {
            invoiceNumber: order.invoices[0].invoiceNumber,
            totalAmount: order.invoices[0].totalAmount.toNumber(),
            issuedAt: order.invoices[0].issuedAt,
          }
        : null,
      refunds: order.refunds.map((r) => ({
        id: r.id,
        amount: r.amount.toNumber(),
        reason: r.reason,
        status: r.status,
        on: r.course?.title ?? r.project?.name ?? null,
        initiatedBy: r.initiatedBy,
        processedAt: r.processedAt,
        createdAt: r.createdAt,
      })),
      enrollments: order.enrollments,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  // ── agent: raw support-inbox reader (every real email, ticket or not) ──

  listInboxThreads(opts: { q?: string; limit: number; pageToken?: string }) {
    return this.mail.listInboxThreads(opts);
  }

  getInboxThread(threadId: string) {
    return this.mail.getInboxThread(threadId);
  }

  async replyInInboxThread(threadId: string, body: string) {
    await this.mail.replyInInboxThread(threadId, body);
    return { sent: true };
  }
}
