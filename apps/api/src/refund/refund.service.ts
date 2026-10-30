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
  initiatedBy: { select: { id: true, name: true } },
} satisfies Prisma.RefundInclude;

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
  private async loadRefundContext(dto: {
    orderId: string;
    courseId?: string;
    projectId?: string;
  }) {
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
          where: { status: { in: ['PENDING', 'PROCESSED'] } },
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

  async createRefund(dto: CreateRefundDto, adminId: string) {
    const { order, orderItem, isCourse, isProject, maxRefund } =
      await this.loadRefundContext(dto);

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

    const existingRefund = await this.prisma.refund.findFirst({
      where: {
        orderId: dto.orderId,
        ...(isCourse ? { courseId: dto.courseId } : { projectId: dto.projectId }),
        status: { in: ['PENDING', 'PROCESSED'] },
      },
    });
    if (existingRefund) {
      throw new ConflictException(
        `A refund already exists for this ${isCourse ? 'course' : 'project'} on this order`,
      );
    }

    // Validate captured amount before calling Razorpay
    await this.validateRefundAmount(order.razorpayPaymentId, amount);

    let razorpayRefundId: string;
    try {
      const refund = await this.razorpayClient
        .getClient()
        .payments.refund(order.razorpayPaymentId, {
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
      const created = await tx.refund.create({
        data: {
          orderId: dto.orderId,
          studentId: order.userId,
          courseId: dto.courseId ?? null,
          projectId: dto.projectId ?? null,
          amount,
          reason: dto.reason,
          status: 'PROCESSED',
          razorpayRefundId,
          initiatedById: adminId,
          processedAt: new Date(),
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
        where: { orderId: dto.orderId },
      });
      const allProjectItems = await tx.orderItem.findMany({
        where: { orderId: dto.orderId, projectId: { not: null } },
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
          where: { id: dto.orderId },
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

    return {
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

  async listRefunds(status?: string, page = 1, perPage = 10) {
    const pageNum = Math.max(1, Math.floor(page) || 1);
    const size = Math.min(50, Math.max(1, Math.floor(perPage) || 10));

    const where: Prisma.RefundWhereInput = {};
    if (status && ['PENDING', 'PROCESSED', 'REJECTED'].includes(status)) {
      where.status = status as any;
    }

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
    };
  }

  async rejectRefund(id: string) {
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
      data: { status: 'REJECTED' },
    });

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

    return { refundId: updated.id, status: updated.status };
  }
}
