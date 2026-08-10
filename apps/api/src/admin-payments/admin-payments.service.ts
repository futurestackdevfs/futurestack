import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const VALID_STATUSES = [
  'CREATED',
  'PAID',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
] as const;

/** Currency detect + display parsing kept minimal — raw values are passed
 *  through to the ops panel which formats them. */
@Injectable()
export class AdminPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Payment dashboard for the ops panel. Returns platform-wide summary counts
   *  (independent of the active filter) plus a paginated order list, optionally
   *  filtered by `status` (an OrderStatus value, e.g. PAID / FAILED). */
  async listPayments(status?: string, page = 1, perPage = 10) {
    const pageNum = Math.max(1, Math.floor(page) || 1);
    const size = Math.min(50, Math.max(1, Math.floor(perPage) || 10));

    const where: Prisma.OrderWhereInput = {};
    if (status && (VALID_STATUSES as readonly string[]).includes(status)) {
      where.status = status as OrderStatus;
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * size,
        take: size,
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: {
            include: { course: { select: { id: true, title: true } } },
          },
          _count: { select: { enrollments: true } },
        },
      }),
    ]);

    // Order.couponId is a plain FK (no Prisma relation) — resolve the coupon
    // code through CouponRedemption.orderId (@unique) instead.
    const redemptionByOrder = new Map<string, string>();
    const pairedOrderIds = orders.filter((o) => o.couponId).map((o) => o.id);
    if (pairedOrderIds.length > 0) {
      const redemptions = await this.prisma.couponRedemption.findMany({
        where: { orderId: { in: pairedOrderIds } },
        include: { coupon: { select: { code: true } } },
      });
      for (const r of redemptions)
        redemptionByOrder.set(r.orderId, r.coupon.code);
    }

    const grouped = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { totalAmount: true },
    });

    const summary: {
      total: number;
      created: number;
      paid: number;
      failed: number;
      cancelled: number;
      expired: number;
      totalRevenue: number;
    } = {
      total: 0,
      created: 0,
      paid: 0,
      failed: 0,
      cancelled: 0,
      expired: 0,
      totalRevenue: 0,
    };

    for (const g of grouped) {
      const key = g.status.toLowerCase();
      summary[key] = g._count._all;
      summary.total += g._count._all;
      if (g.status === OrderStatus.PAID) {
        summary.totalRevenue = g._sum.totalAmount ?? 0;
      }
    }

    const mapped = orders.map((o) => ({
      id: o.id,
      orderNo: o.id.slice(0, 8).toUpperCase(),
      status: o.status,
      currency: o.currency,
      gatewayType: o.gatewayType,
      subtotal: o.subtotal,
      discountAmount: o.discountAmount,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt,
      razorpayOrderId: o.razorpayOrderId,
      razorpayPaymentId: o.razorpayPaymentId,
      billing: {
        fullName: o.billingFullName,
        email: o.billingEmail,
        phone: o.billingPhone,
        city: o.billingCity,
        state: o.billingState,
        pincode: o.billingPincode,
        address: o.billingAddress,
      },
      student: o.user,
      couponCode: redemptionByOrder.get(o.id) ?? null,
      enrollmentsCount: o._count.enrollments,
      items: o.items.map((i) => ({
        courseId: i.courseId,
        title: i.course.title,
        priceAtPurchase: i.priceAtPurchase,
      })),
    }));

    return {
      summary,
      orders: mapped,
      pagination: {
        page: pageNum,
        perPage: size,
        total,
        totalPages: Math.max(1, Math.ceil(total / size)),
      },
    };
  }
}
