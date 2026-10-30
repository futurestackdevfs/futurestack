import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayClientService } from '../checkout/razorpay-client.service';
import { MailService } from '../mail/mail.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { RequestRefundDto } from './dto/request-refund.dto';
import { paymentModeOf } from '../common/payment-mode.util';
import {
  DEFAULT_REFUND_ETA_DAYS,
  computeRefundBreakdown,
  estimateRefundBy,
} from './refund-amount.util';

const round2 = (n: number) => Math.round(n * 100) / 100;

const REFUND_INCLUDE = {
  order: {
    select: {
      id: true,
      createdAt: true,
      currency: true,
      couponId: true,
      subtotal: true,
      discountAmount: true,
      gstPercent: true,
      gstAmount: true,
      totalAmount: true,
      razorpayPaymentId: true,
      items: { select: { courseId: true, projectId: true, priceAtPurchase: true } },
    },
  },
  student: { select: { id: true, name: true, email: true } },
  course: { select: { id: true, title: true } },
  project: { select: { id: true, name: true } },
  initiatedBy: { select: { id: true, name: true, role: true } },
  processedBy: { select: { id: true, name: true, role: true } },
  rejectedBy: { select: { id: true, name: true, role: true } },
  cancelledBy: { select: { id: true, name: true, role: true } },
  ticket: { select: { id: true, number: true, subject: true } },
} satisfies Prisma.RefundInclude;

/** Same human reference the support desk uses (FS-SUP-00042). */
const ticketRef = (n: number) => `FS-SUP-${String(n).padStart(5, '0')}`;

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayClient: RazorpayClientService,
    private readonly mailService: MailService,
  ) {}

  /** Days a refund takes to reach the student — admin-editable in Payment Settings. */
  async getEtaDays(): Promise<number> {
    const s = await this.prisma.paymentSettings.findFirst({
      select: { refundEtaDays: true },
    });
    return s?.refundEtaDays ?? DEFAULT_REFUND_ETA_DAYS;
  }

  /**
   * Loads the order + item being refunded and works out exactly what the
   * student paid for it (coupon cut, GST included) and how much of that can
   * still be refunded. Shared by the preview and the real refund.
   */
  private async loadRefundContext(
    dto: {
      orderId: string;
      courseId?: string;
      projectId?: string;
    },
    excludeRefundId?: string,
  ) {
    const isCourse = !!dto.courseId;
    const isProject = !!dto.projectId;
    if (!isCourse && !isProject) {
      throw new BadRequestException('Either courseId or projectId is required');
    }
    if (isCourse && isProject) {
      throw new BadRequestException('Provide only courseId or projectId, not both');
    }

    // Both course and project refunds now go through the same Order-based flow
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        items: {
          include: {
            course: { select: { id: true, title: true } },
            project: { select: { id: true, name: true } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
        enrollments: true,
        refunds: {
          where: {
            status: { in: ['PENDING', 'PROCESSED'] },
            ...(excludeRefundId ? { id: { not: excludeRefundId } } : {}),
          },
          select: { courseId: true, projectId: true, amount: true },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'PAID') {
      throw new BadRequestException(
        `Order status is ${order.status} — only PAID orders can be refunded`,
      );
    }

    // Only online (Razorpay) payments are refunded through the system. Cash /
    // offline sales have no gateway payment to reverse — the team returns the
    // money by hand, outside the app.
    if (paymentModeOf(order) === 'OFFLINE') {
      throw new BadRequestException(
        'This was a cash / offline payment — it cannot be refunded here. Refund it manually.',
      );
    }

    const orderItem = order.items.find((i) =>
      isCourse ? i.courseId === dto.courseId : i.projectId === dto.projectId,
    );
    if (!orderItem) {
      throw new BadRequestException(
        `${isCourse ? 'Course' : 'Project'} not found in order items`,
      );
    }

    const breakdown = computeRefundBreakdown(
      {
        subtotal: order.subtotal.toNumber(),
        discountAmount: order.discountAmount.toNumber(),
        gstPercent: order.gstPercent.toNumber(),
      },
      { priceAtPurchase: orderItem.priceAtPurchase.toNumber(), projectId: orderItem.projectId },
    );

    // Never refund more than the order actually collected. When this is the last
    // item left in the order it gets whatever remains, so per-item rounding can
    // never leave a few paise stuck (or push the total over what was paid).
    const alreadyRefunded = round2(
      order.refunds.reduce((sum, r) => sum + r.amount.toNumber(), 0),
    );
    const remaining = round2(order.totalAmount.toNumber() - alreadyRefunded);
    const isRefunded = (i: { courseId: string | null; projectId: string | null }) =>
      order.refunds.some(
        (r) =>
          (i.courseId && r.courseId === i.courseId) ||
          (i.projectId && r.projectId === i.projectId),
      );
    const isLastItem = order.items.every((i) => i.id === orderItem.id || isRefunded(i));
    const maxRefund = Math.max(0, isLastItem ? remaining : Math.min(breakdown.paid, remaining));

    return { order, orderItem, isCourse, isProject, breakdown, maxRefund, alreadyRefunded };
  }

  /** Read-only: what would be refunded for this item, with the full breakdown. */
  async previewRefund(dto: { orderId: string; courseId?: string; projectId?: string }) {
    const { order, breakdown, maxRefund, alreadyRefunded } = await this.loadRefundContext(dto);
    const etaDays = await this.getEtaDays();
    return {
      breakdown,
      refundAmount: maxRefund,
      alreadyRefunded,
      orderTotal: order.totalAmount.toNumber(),
      currency: order.currency,
      etaDays,
      estimatedBy: estimateRefundBy(new Date(), etaDays),
    };
  }

  /** Internal note on the ticket so the agent sees every refund step in the thread. */
  private async noteOnTicket(ticketId: string | null | undefined, authorId: string, body: string) {
    if (!ticketId) return;
    try {
      await this.prisma.supportTicketMessage.create({
        data: { ticketId, authorId, body, isInternalNote: true },
      });
    } catch (e) {
      this.logger.error(`Could not add refund note to ticket ${ticketId}: ${e}`);
    }
  }

  /**
   * Public reply on the ticket so the customer sees the refund on their thread.
   * `email` is false when the student already gets a dedicated refund email
   * (confirmed / rejected); initiated and cancelled have no other notification.
   */
  private async tellCustomerOnTicket(
    ticketId: string | null | undefined,
    authorId: string,
    body: string,
    student: { name: string; email?: string | null },
    email = false,
  ) {
    if (!ticketId) return;
    try {
      const ticket = await this.prisma.supportTicket.findUnique({
        where: { id: ticketId },
        select: { id: true, status: true, subject: true },
      });
      if (!ticket) return;
      await this.prisma.supportTicketMessage.create({
        data: { ticketId, authorId, body, isInternalNote: false },
      });
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          // a resolved / closed ticket stays as it is; an open one is now waiting on the student
          ...(ticket.status === 'OPEN' ? { status: 'PENDING' as const } : {}),
          lastMessageAt: new Date(),
          autoCloseReminderSentAt: null,
        },
      });
      if (email && student.email) {
        const base = (process.env.FRONTEND_URL ?? 'http://localhost:3000').split(',')[0].trim();
        void this.mailService.sendTicketReplyEmail(student.email, {
          studentName: student.name,
          subject: ticket.subject,
          preview: body.slice(0, 240),
          url: `${base}/support/tickets/${ticketId}`,
        });
      }
    } catch (e) {
      this.logger.error(`Could not message the customer on ticket ${ticketId}: ${e}`);
    }
  }

  /** Throws unless the ticket exists and belongs to the student being refunded. */
  private async assertTicketMatches(ticketId: string, studentId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, studentId: true },
    });
    if (!ticket) throw new NotFoundException('Support ticket not found');
    if (ticket.studentId !== studentId) {
      throw new BadRequestException(
        "This order belongs to a different student than the ticket's author",
      );
    }
  }

  private async assertNoOpenRefund(dto: { orderId: string; courseId?: string; projectId?: string }, isCourse: boolean) {
    const existingRefund = await this.prisma.refund.findFirst({
      where: {
        orderId: dto.orderId,
        ...(isCourse ? { courseId: dto.courseId } : { projectId: dto.projectId }),
        status: { in: ['PENDING', 'PROCESSED'] },
      },
    });
    if (existingRefund) {
      const waiting = existingRefund.status === 'PENDING';
      throw new ConflictException(
        waiting
          ? `A refund request for this ${isCourse ? 'course' : 'project'} is already waiting for admin approval`
          : `A refund already exists for this ${isCourse ? 'course' : 'project'} on this order`,
      );
    }
  }

  /**
   * Admin: refunds the money straight away (Razorpay) — no approval step.
   * When linked to a ticket the thread gets an internal note and a message to the customer.
   */
  async createRefund(dto: CreateRefundDto, actorId: string) {
    const ctx = await this.loadRefundContext(dto);
    const { order, isCourse, maxRefund } = ctx;

    // Default (and ceiling) is exactly what the student paid for this item
    // after the coupon cut — admins can refund less, never more.
    const amount = dto.amount ?? maxRefund;
    if (amount <= 0) {
      throw new BadRequestException('Nothing left to refund for this item');
    }
    if (amount > maxRefund + 0.001) {
      throw new BadRequestException(
        `Refund amount ₹${amount} exceeds ₹${maxRefund} — the amount the student actually paid for this item (after coupon, GST included)`,
      );
    }

    if (!order.razorpayPaymentId) {
      throw new BadRequestException(
        'Order has no Razorpay payment ID — cannot process online refund',
      );
    }

    await this.assertNoOpenRefund(dto, isCourse);
    if (dto.ticketId) await this.assertTicketMatches(dto.ticketId, order.userId);

    return this.executeRefund(ctx, {
      amount,
      reason: dto.reason,
      courseId: dto.courseId,
      projectId: dto.projectId,
      ticketId: dto.ticketId,
      initiatedById: actorId,
      processedById: actorId,
    });
  }

  /**
   * Support agent: raises a refund request (status PENDING). No money moves —
   * an admin has to approve it, and the agent can cancel it until then.
   */
  async requestRefund(dto: RequestRefundDto, actor: { id: string; role?: string }) {
    const { order, orderItem, isCourse, maxRefund } = await this.loadRefundContext(dto);

    const amount = dto.amount ?? maxRefund;
    if (amount <= 0) {
      throw new BadRequestException('Nothing left to refund for this item');
    }
    if (amount > maxRefund + 0.001) {
      throw new BadRequestException(
        `Refund amount ₹${amount} exceeds ₹${maxRefund} — the amount the student actually paid for this item (after coupon, GST included)`,
      );
    }
    if (!order.razorpayPaymentId) {
      throw new BadRequestException(
        'Order has no Razorpay payment ID — cannot process online refund',
      );
    }

    await this.assertNoOpenRefund(dto, isCourse);
    if (dto.ticketId) await this.assertTicketMatches(dto.ticketId, order.userId);

    const created = await this.prisma.refund.create({
      data: {
        orderId: dto.orderId,
        studentId: order.userId,
        courseId: dto.courseId ?? null,
        projectId: dto.projectId ?? null,
        amount,
        reason: dto.reason,
        status: 'PENDING',
        initiatedById: actor.id,
        ticketId: dto.ticketId ?? null,
      },
    });

    const itemName = isCourse
      ? orderItem.course?.title ?? 'Course'
      : orderItem.project?.name ?? 'Project';
    const sym = order.currency === 'USD' ? '$' : '₹';
    await this.noteOnTicket(
      dto.ticketId,
      actor.id,
      `💸 Refund initiated — ${itemName}, ${sym}${amount}. Sent to admin for approval.\nReason: ${dto.reason}`,
    );
    await this.tellCustomerOnTicket(
      dto.ticketId,
      actor.id,
      `Hi ${order.user.name}, we have initiated a refund of ${sym}${amount} for "${itemName}". It is being reviewed and we will confirm here as soon as it is approved.`,
      order.user,
      true,
    );

    return { id: created.id, refundId: created.id, status: created.status, amount };
  }

  /** Admin: approves a PENDING request — sends the money via Razorpay. */
  async approveRefund(id: string, adminId: string) {
    const pending = await this.prisma.refund.findUnique({ where: { id } });
    if (!pending) throw new NotFoundException('Refund not found');
    if (pending.status !== 'PENDING') {
      throw new BadRequestException(
        `Refund status is ${pending.status} — only PENDING refunds can be approved`,
      );
    }
    if (!pending.orderId) {
      throw new BadRequestException('This refund is not linked to an order');
    }

    const ctx = await this.loadRefundContext(
      {
        orderId: pending.orderId,
        courseId: pending.courseId ?? undefined,
        projectId: pending.projectId ?? undefined,
      },
      pending.id,
    );
    const amount = pending.amount.toNumber();
    if (amount > ctx.maxRefund + 0.001) {
      throw new BadRequestException(
        `Requested ₹${amount} is now more than the ₹${ctx.maxRefund} still refundable for this item`,
      );
    }
    if (!ctx.order.razorpayPaymentId) {
      throw new BadRequestException(
        'Order has no Razorpay payment ID — cannot process online refund',
      );
    }

    return this.executeRefund(ctx, {
      amount,
      reason: pending.reason,
      courseId: pending.courseId ?? undefined,
      projectId: pending.projectId ?? undefined,
      ticketId: pending.ticketId,
      initiatedById: pending.initiatedById,
      processedById: adminId,
      existingRefundId: pending.id,
    });
  }

  /**
   * Support (or admin): withdraws a refund request that is still waiting for
   * an admin. Nothing was sent to Razorpay, so there is no money to undo.
   */
  async cancelRefund(id: string, actor: { id: string }) {
    const refund = await this.prisma.refund.findUnique({
      where: { id },
      include: {
        student: { select: { name: true, email: true } },
        course: { select: { title: true } },
        project: { select: { name: true } },
      },
    });
    if (!refund) throw new NotFoundException('Refund not found');
    if (refund.status !== 'PENDING') {
      throw new BadRequestException(
        refund.status === 'PROCESSED'
          ? 'This refund was already approved and sent — it can no longer be cancelled'
          : `Refund status is ${refund.status} — only a request still waiting for admin approval can be cancelled`,
      );
    }

    const updated = await this.prisma.refund.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledById: actor.id },
    });

    const itemName = refund.course?.title ?? refund.project?.name ?? 'your purchase';
    await this.noteOnTicket(refund.ticketId, actor.id, `🚫 Refund request cancelled — ${itemName}. Nothing was refunded.`);
    await this.tellCustomerOnTicket(
      refund.ticketId,
      actor.id,
      `Hi ${refund.student.name}, the refund request for "${itemName}" has been cancelled. No money has been moved.`,
      refund.student,
      true,
    );

    return { id: updated.id, refundId: updated.id, status: updated.status };
  }

  /**
   * Sends the refund to Razorpay, then — in one transaction — records it
   * (create, or update the PENDING request), revokes the enrollment / marks the
   * project item refunded, and flips the order to REFUNDED when nothing is left.
   */
  private async executeRefund(
    ctx: Awaited<ReturnType<RefundService['loadRefundContext']>>,
    opts: {
      amount: number;
      reason: string;
      courseId?: string;
      projectId?: string;
      ticketId?: string | null;
      initiatedById: string;
      processedById: string;
      /** The PENDING request being approved — updated instead of creating a new row. */
      existingRefundId?: string;
    },
  ) {
    const { order, orderItem, isCourse, isProject } = ctx;
    const { amount } = opts;
    const dto = { orderId: order.id, courseId: opts.courseId, projectId: opts.projectId, reason: opts.reason };

    // Validate captured amount before calling Razorpay
    await this.validateRefundAmount(order.razorpayPaymentId!, amount);

    let razorpayRefundId: string;
    try {
      const refund = await this.razorpayClient
        .getClient()
        .payments.refund(order.razorpayPaymentId!, {
          amount: Math.round(amount * 100),
          notes: { reason: dto.reason },
        });
      razorpayRefundId = refund.id;
    } catch (e) {
      this.logger.error(`Razorpay refund failed for order ${order.id}: ${e}`);
      const desc = (e as any)?.error?.description ?? 'Unknown error';
      throw new BadRequestException(
        `Razorpay refund failed: ${desc} | Requested: ₹${amount} (${Math.round(amount * 100)} paise) | Payment ID: ${order.razorpayPaymentId}`,
      );
    }

    const itemName = isCourse
      ? orderItem.course?.title ?? 'Course'
      : orderItem.project?.name ?? 'Project';

    const refund = await this.prisma.$transaction(async (tx) => {
      const processedFields = {
        status: 'PROCESSED' as const,
        razorpayRefundId,
        processedAt: new Date(),
        processedById: opts.processedById,
      };
      const created = opts.existingRefundId
        ? await tx.refund.update({
            where: { id: opts.existingRefundId },
            data: processedFields,
          })
        : await tx.refund.create({
            data: {
              orderId: order.id,
              studentId: order.userId,
              courseId: dto.courseId ?? null,
              projectId: dto.projectId ?? null,
              amount,
              reason: dto.reason,
              initiatedById: opts.initiatedById,
              ticketId: opts.ticketId ?? null,
              ...processedFields,
            },
          });

      // Revoke enrollment for courses
      if (isCourse) {
        const enrollment = order.enrollments.find(
          (e) => e.courseId === dto.courseId,
        );
        if (enrollment) {
          await tx.enrollment.update({
            where: { id: enrollment.id },
            data: { status: 'refunded' },
          });

          const ledgerEntry = await tx.revenueLedger.findUnique({
            where: { enrollmentId: enrollment.id },
          });
          if (ledgerEntry) {
            await tx.revenueLedger.delete({
              where: { enrollmentId: enrollment.id },
            });
          }
        }
      }

      // Mark project OrderItem as refunded
      if (isProject) {
        await tx.orderItem.update({
          where: { id: orderItem.id },
          data: { status: 'refunded' },
        });
      }

      // Check if everything is refunded → mark Order as REFUNDED
      const allEnrollments = await tx.enrollment.findMany({
        where: { orderId: order.id },
      });
      const allProjectItems = await tx.orderItem.findMany({
        where: { orderId: order.id, projectId: { not: null } },
      });
      const allCoursesRefunded = allEnrollments.every((e) => e.status === 'refunded');
      const allProjectsRefunded = allProjectItems.every((i) => i.status === 'refunded');
      const hasEnrollments = allEnrollments.length > 0;
      const hasProjects = allProjectItems.length > 0;

      const shouldRefundOrder =
        (hasEnrollments && allCoursesRefunded && !hasProjects) ||
        (hasProjects && allProjectsRefunded && !hasEnrollments) ||
        (hasEnrollments && hasProjects && allCoursesRefunded && allProjectsRefunded);

      if (shouldRefundOrder) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'REFUNDED' },
        });
      }

      return created;
    });

    const etaDays = await this.getEtaDays();
    const estimatedBy = estimateRefundBy(refund.processedAt ?? new Date(), etaDays);

    this.mailService
      .sendRefundProcessedEmail(order.user.email, {
        studentName: order.user.name,
        courseName: itemName,
        refundAmount: amount,
        orderId: `FS-${order.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
        currency: order.currency,
        etaDays,
        expectedBy: estimatedBy,
      })
      .catch((err) => this.logger.error(`Failed to send refund email: ${err}`));

    await this.noteOnTicket(
      opts.ticketId,
      opts.processedById,
      opts.existingRefundId
        ? `✅ Refund confirmed — approved and sent to Razorpay. ${itemName}, ${order.currency === 'USD' ? '$' : '₹'}${amount}. Expected in the student's account by ${estimatedBy.toDateString()}.`
        : `💸 Refund initiated and sent to Razorpay. ${itemName}, ${order.currency === 'USD' ? '$' : '₹'}${amount}. Expected in the student's account by ${estimatedBy.toDateString()}.\nReason: ${opts.reason}`,
    );
    await this.tellCustomerOnTicket(
      opts.ticketId,
      opts.processedById,
      opts.existingRefundId
        ? `Hi ${order.user.name}, your refund of ${order.currency === 'USD' ? '$' : '₹'}${amount} for "${itemName}" has been confirmed. It should reach your original payment method by ${estimatedBy.toDateString()} (about ${etaDays} days).`
        : `Hi ${order.user.name}, we have initiated a refund of ${order.currency === 'USD' ? '$' : '₹'}${amount} for "${itemName}". It should reach your original payment method by ${estimatedBy.toDateString()} (about ${etaDays} days).`,
      order.user,
    );

    return {
      // `id` is what the audit interceptor reads to link the log row to this refund.
      id: refund.id,
      refundId: refund.id,
      status: refund.status,
      razorpayRefundId: refund.razorpayRefundId,
      amount: refund.amount.toNumber(),
      estimatedBy,
    };
  }

  private async validateRefundAmount(paymentId: string, refundAmount: number) {
    const payment = await this.razorpayClient
      .getClient()
      .payments.fetch(paymentId) as any;

    const capturedPaise: number = payment.amount ?? 0;
    const requestedPaise = Math.round(refundAmount * 100);

    if (requestedPaise > capturedPaise) {
      throw new BadRequestException(
        `Refund amount ₹${refundAmount} exceeds captured amount ₹${capturedPaise / 100} for this payment`,
      );
    }

    return capturedPaise;
  }

  async listRefunds(
    status?: string,
    page = 1,
    perPage = 10,
    ticketId?: string,
    initiatedById?: string,
  ) {
    const pageNum = Math.max(1, Math.floor(page) || 1);
    const size = Math.min(50, Math.max(1, Math.floor(perPage) || 10));

    const where: Prisma.RefundWhereInput = {};
    if (status && ['PENDING', 'PROCESSED', 'REJECTED', 'CANCELLED'].includes(status)) {
      where.status = status as any;
    }
    if (ticketId) where.ticketId = ticketId;
    // "my refunds" - only the ones this agent raised
    if (initiatedById) where.initiatedById = initiatedById;

    const [total, refunds] = await Promise.all([
      this.prisma.refund.count({ where }),
      this.prisma.refund.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * size,
        take: size,
        include: REFUND_INCLUDE,
      }),
    ]);

    const summary = await this.prisma.refund.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { amount: true },
    });

    const summaryMap: Record<string, { count: number; amount: number }> = {};
    let totalRefundAmount = 0;
    for (const g of summary) {
      const amount = g._sum.amount?.toNumber() ?? 0;
      summaryMap[g.status] = {
        count: g._count._all,
        amount,
      };
      totalRefundAmount += amount;
    }

    const etaDays = await this.getEtaDays();
    const couponCodes = await this.couponCodesFor(refunds.map((r) => r.order?.couponId));
    const plainRefunds = refunds.map((r) => this.toRefundView(r, etaDays, couponCodes));

    return {
      refunds: plainRefunds,
      summary: {
        total,
        totalRefundAmount,
        pending: summaryMap['PENDING']?.count ?? 0,
        processed: summaryMap['PROCESSED']?.count ?? 0,
        rejected: summaryMap['REJECTED']?.count ?? 0,
        cancelled: summaryMap['CANCELLED']?.count ?? 0,
      },
      pagination: {
        page: pageNum,
        perPage: size,
        total,
        totalPages: Math.max(1, Math.ceil(total / size)),
      },
    };
  }

  async getRefund(id: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id },
      include: REFUND_INCLUDE,
    });
    if (!refund) throw new NotFoundException('Refund not found');
    const etaDays = await this.getEtaDays();
    const couponCodes = await this.couponCodesFor([refund.order?.couponId]);
    return this.toRefundView(refund, etaDays, couponCodes);
  }

  private async couponCodesFor(ids: (string | null | undefined)[]) {
    const unique = [...new Set(ids.filter((i): i is string => !!i))];
    if (unique.length === 0) return new Map<string, string>();
    const coupons = await this.prisma.coupon.findMany({
      where: { id: { in: unique } },
      select: { id: true, code: true },
    });
    return new Map(coupons.map((c) => [c.id, c.code]));
  }

  /** Admin-facing refund: plain numbers + what the student paid, the coupon
   *  cut, GST, and the date the money is expected to reach them. */
  private toRefundView(
    r: Prisma.RefundGetPayload<{ include: typeof REFUND_INCLUDE }>,
    etaDays: number,
    couponCodes: Map<string, string>,
  ) {
    const item = r.order?.items.find((i) =>
      r.courseId ? i.courseId === r.courseId : i.projectId === r.projectId,
    );
    const subtotal = r.order?.subtotal.toNumber() ?? 0;
    const discountAmount = r.order?.discountAmount.toNumber() ?? 0;
    const gstPercent = r.order?.gstPercent.toNumber() ?? 0;
    const breakdown = item
      ? computeRefundBreakdown(
          { subtotal, discountAmount, gstPercent },
          { priceAtPurchase: item.priceAtPurchase.toNumber(), projectId: item.projectId },
        )
      : null;
    return {
      ...r,
      amount: r.amount.toNumber(),
      order: r.order
        ? {
            ...r.order,
            subtotal,
            discountAmount,
            gstPercent,
            gstAmount: r.order.gstAmount.toNumber(),
            totalAmount: r.order.totalAmount.toNumber(),
            couponCode: r.order.couponId ? couponCodes.get(r.order.couponId) ?? null : null,
          }
        : r.order,
      breakdown,
      etaDays,
      estimatedBy: estimateRefundBy(r.processedAt ?? r.createdAt, etaDays),
      ticket: r.ticket
        ? { id: r.ticket.id, ref: ticketRef(r.ticket.number), subject: r.ticket.subject }
        : null,
    };
  }

  /**
   * What a support agent can refund for a student: their PAID online orders,
   * item by item, with what each item would return and whether a refund is
   * already pending / done.
   */
  async refundOptions(studentId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId: studentId, status: { in: ['PAID', 'REFUNDED'] } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        items: {
          include: {
            course: { select: { id: true, title: true } },
            project: { select: { id: true, name: true } },
          },
        },
        refunds: { select: { courseId: true, projectId: true, status: true, amount: true } },
      },
    });

    const out: {
      orderId: string;
      orderRef: string;
      createdAt: Date;
      currency: string;
      total: number;
      online: boolean;
      items: {
        courseId: string | null;
        projectId: string | null;
        title: string;
        maxRefund: number;
        refundStatus: 'NONE' | 'PENDING' | 'PROCESSED';
        refundable: boolean;
      }[];
    }[] = [];

    for (const o of orders) {
      const online = paymentModeOf(o) !== 'OFFLINE' && !!o.razorpayPaymentId;
      const items: {
        courseId: string | null;
        projectId: string | null;
        title: string;
        maxRefund: number;
        refundStatus: 'NONE' | 'PENDING' | 'PROCESSED';
        refundable: boolean;
      }[] = [];
      for (const it of o.items) {
        const live = o.refunds.find(
          (r) =>
            (it.courseId ? r.courseId === it.courseId : r.projectId === it.projectId) &&
            (r.status === 'PENDING' || r.status === 'PROCESSED'),
        );
        let maxRefund = 0;
        if (online && o.status === 'PAID' && !live) {
          try {
            const p = await this.loadRefundContext({
              orderId: o.id,
              courseId: it.courseId ?? undefined,
              projectId: it.projectId ?? undefined,
            });
            maxRefund = p.maxRefund;
          } catch {
            maxRefund = 0;
          }
        }
        items.push({
          courseId: it.courseId,
          projectId: it.projectId,
          title: it.course?.title ?? it.project?.name ?? 'Item',
          maxRefund,
          refundStatus: (live?.status as 'PENDING' | 'PROCESSED' | undefined) ?? 'NONE',
          refundable: maxRefund > 0,
        });
      }
      out.push({
        orderId: o.id,
        orderRef: `FS-${o.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
        createdAt: o.createdAt,
        currency: o.currency,
        total: o.totalAmount.toNumber(),
        online,
        items,
      });
    }
    return { orders: out };
  }

  async rejectRefund(id: string, adminId?: string, reason?: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id },
      include: {
        student: { select: { name: true, email: true } },
        course: { select: { title: true } },
        project: { select: { name: true } },
        order: { select: { id: true, currency: true } },
      },
    });
    if (!refund) throw new NotFoundException('Refund not found');
    if (refund.status !== 'PENDING') {
      throw new BadRequestException(
        `Refund status is ${refund.status} — only PENDING refunds can be rejected`,
      );
    }

    const updated = await this.prisma.refund.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectReason: reason?.trim() || null,
        ...(adminId ? { rejectedById: adminId } : {}),
      },
    });

    if (refund.ticketId && adminId) {
      await this.tellCustomerOnTicket(
        refund.ticketId,
        adminId,
        `Hi ${refund.student.name}, we are unable to refund "${refund.course?.title ?? refund.project?.name ?? 'your purchase'}" and no money has been returned.${reason?.trim() ? ` Reason: ${reason.trim()}` : ''}`,
        refund.student,
      );
      await this.noteOnTicket(
        refund.ticketId,
        adminId,
        `❌ Refund rejected — ${refund.course?.title ?? refund.project?.name ?? 'item'}. No money was returned.${reason?.trim() ? `\nReason: ${reason.trim()}` : ''}`,
      );
    }

    // Tell the student — a silent rejection just looks like the request vanished.
    this.mailService
      .sendRefundRejectedEmail(refund.student.email, {
        name: refund.student.name,
        itemName: refund.course?.title ?? refund.project?.name ?? 'your purchase',
        amount: refund.amount.toNumber(),
        currency: refund.order?.currency ?? 'INR',
        orderRef: refund.order
          ? `FS-${refund.order.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
          : '—',
      })
      .catch((err) => this.logger.error(`Failed to send refund rejection email: ${err}`));

    return { id: updated.id, refundId: updated.id, status: updated.status };
  }
}
