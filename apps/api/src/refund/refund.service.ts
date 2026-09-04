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

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayClient: RazorpayClientService,
    private readonly mailService: MailService,
  ) {}

  async createRefund(dto: CreateRefundDto, adminId: string) {
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
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'PAID') {
      throw new BadRequestException(
        `Order status is ${order.status} — only PAID orders can be refunded`,
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
    if (dto.amount > orderItem.priceAtPurchase) {
      throw new BadRequestException(
        `Refund amount ₹${dto.amount} exceeds item price ₹${orderItem.priceAtPurchase}`,
      );
    }

    const isManualOrder = order.razorpayOrderId?.startsWith('MANUAL-');
    if (!isManualOrder && !order.razorpayPaymentId) {
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
    if (!isManualOrder) {
      await this.validateRefundAmount(order.razorpayPaymentId!, dto.amount);
    }

    let razorpayRefundId: string | null = null;
    if (!isManualOrder) {
      try {
        const refund = await this.razorpayClient
          .getClient()
          .payments.refund(order.razorpayPaymentId!, {
            amount: Math.round(dto.amount * 100),
            notes: { reason: dto.reason },
          });
        razorpayRefundId = refund.id;
      } catch (e) {
        this.logger.error(`Razorpay refund failed for order ${order.id}: ${e}`);
        const desc = (e as any)?.error?.description ?? 'Unknown error';
        throw new BadRequestException(
          `Razorpay refund failed: ${desc} | Requested: ₹${dto.amount} (${Math.round(dto.amount * 100)} paise) | Payment ID: ${order.razorpayPaymentId}`,
        );
      }
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
          amount: dto.amount,
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

    this.mailService
      .sendRefundProcessedEmail(order.user.email, {
        studentName: order.user.name,
        courseName: itemName,
        refundAmount: dto.amount,
        orderId: order.id,
      })
      .catch((err) => this.logger.error(`Failed to send refund email: ${err}`));

    return {
      refundId: refund.id,
      status: refund.status,
      razorpayRefundId: refund.razorpayRefundId,
      amount: refund.amount,
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
        include: {
          order: {
            select: {
              id: true,
              totalAmount: true,
              currency: true,
              razorpayPaymentId: true,
            },
          },
          student: { select: { id: true, name: true, email: true } },
          course: { select: { id: true, title: true } },
          project: { select: { id: true, name: true } },
          initiatedBy: { select: { id: true, name: true } },
        },
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
      summaryMap[g.status] = {
        count: g._count._all,
        amount: g._sum.amount ?? 0,
      };
      totalRefundAmount += g._sum.amount ?? 0;
    }

    return {
      refunds,
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
      include: {
        order: {
          select: {
            id: true,
            totalAmount: true,
            currency: true,
            razorpayPaymentId: true,
            createdAt: true,
          },
        },
        student: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
        initiatedBy: { select: { id: true, name: true } },
      },
    });
    if (!refund) throw new NotFoundException('Refund not found');
    return refund;
  }

  async rejectRefund(id: string) {
    const refund = await this.prisma.refund.findUnique({ where: { id } });
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

    return { refundId: updated.id, status: updated.status };
  }
}
