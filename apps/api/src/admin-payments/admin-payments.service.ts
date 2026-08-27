import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  computeTrainerShare,
  resolveTrainerSharePercent,
} from '../payment-settings/share.util';

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

    const [total, orders, projectOrders] = await Promise.all([
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
      this.prisma.projectOrder.findMany({
        where: status && (VALID_STATUSES as readonly string[]).includes(status)
          ? { status: status as any }
          : {},
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } },
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

    // Map project orders into the same response shape as course orders
    const projectMapped = projectOrders.map((po) => ({
      id: po.id,
      orderNo: po.id.slice(0, 8).toUpperCase(),
      status: po.status.toUpperCase(),
      currency: 'INR',
      gatewayType: 'RAZORPAY',
      subtotal: po.pricePaid,
      discountAmount: 0,
      totalAmount: po.pricePaid,
      createdAt: po.createdAt,
      razorpayOrderId: '',
      razorpayPaymentId: null,
      billing: {
        fullName: po.name,
        email: po.email,
        phone: po.phone,
        city: null,
        state: null,
        pincode: null,
        address: null,
      },
      student: po.student
        ? { id: po.student.id, name: po.student.name, email: po.student.email }
        : null,
      couponCode: null,
      enrollmentsCount: 0,
      items: [
        {
          courseId: po.projectId,
          title: po.project?.name ?? 'Project',
          priceAtPurchase: po.pricePaid,
          type: 'project' as const,
        },
      ],
    }));

    const mapped = orders.map((o) => {
      const courseItems = o.items.map((i) => ({
        courseId: i.courseId,
        title: i.course.title,
        priceAtPurchase: i.priceAtPurchase,
        type: 'course' as const,
      }));
      return {
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
        items: courseItems,
      };
    });

    // Merge both lists sorted by createdAt desc
    const allOrders = [...mapped, ...projectMapped].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return {
      summary,
      orders: allOrders,
      pagination: {
        page: pageNum,
        perPage: size,
        total,
        totalPages: Math.max(1, Math.ceil(total / size)),
      },
    };
  }

  /** Per-trainer revenue split (gross / platform cut / trainer share) computed
   *  live from the PAID order book — each item's course trainer + the trainer
   *  share % resolution (per-trainer override falling back to the global
   *  PaymentSettings default), same math as checkout. This works even for
   *  orders that predate the RevenueLedger. Sorted by trainer share. */
  async trainerBreakdown() {
    const [settings, paidOrders] = await Promise.all([
      this.prisma.paymentSettings.findFirst(),
      this.prisma.order.findMany({
        where: { status: OrderStatus.PAID },
        include: {
          items: {
            include: {
              course: {
                select: {
                  id: true,
                  trainer: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      trainerSharePercent: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const defaultSharePct = settings?.trainerSharePercent ?? 50;
    const map = new Map<
      string,
      {
        trainerId: string;
        trainerName: string;
        trainerEmail: string;
        trainerSharePercent: number | null;
        gross: number;
        platformCut: number;
        trainerShare: number;
        enrollments: number;
      }
    >();

    for (const order of paidOrders) {
      if (!order.subtotal || order.subtotal <= 0) continue;
      // Allocate the order discount proportionally across items so gross
      // reconciles exactly with the admin "Revenue (Paid)" KPI (totalAmount).
      const ratio = order.totalAmount / order.subtotal;
      for (const item of order.items) {
        const trainer = item.course.trainer;
        if (!trainer) continue;
        const cur =
          map.get(trainer.id) ??
          {
            trainerId: trainer.id,
            trainerName: trainer.name,
            trainerEmail: trainer.email,
            trainerSharePercent: trainer.trainerSharePercent ?? null,
            gross: 0,
            platformCut: 0,
            trainerShare: 0,
            enrollments: 0,
          };
        const pct = resolveTrainerSharePercent(
          trainer.trainerSharePercent,
          defaultSharePct,
        );
        const effective = Math.round(item.priceAtPurchase * ratio * 100) / 100;
        const { trainerShare, platformCut } = computeTrainerShare(
          effective,
          pct,
        );
        cur.gross += effective;
        cur.platformCut += platformCut;
        cur.trainerShare += trainerShare;
        cur.enrollments += 1;
        map.set(trainer.id, cur);
      }
    }

    const trainers = Array.from(map.values()).sort(
      (a, b) => b.trainerShare - a.trainerShare,
    );

    const totals = trainers.reduce(
      (acc, t) => {
        acc.gross += t.gross;
        acc.platformCut += t.platformCut;
        acc.trainerShare += t.trainerShare;
        acc.enrollments += t.enrollments;
        return acc;
      },
      { gross: 0, platformCut: 0, trainerShare: 0, enrollments: 0 },
    );

    return { trainers, totals, count: trainers.length };
  }
}
