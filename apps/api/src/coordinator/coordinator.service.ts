import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EscalationsService, Actor } from '../escalations/escalations.service';

@Injectable()
export class CoordinatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly escalations: EscalationsService,
  ) {}

  async getDashboard() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const [
      totalStudents,
      activeBatches,
      totalOrders,
      paidOrders,
      createdOrders,
      newLeadsThisWeek,
      flaggedStudents,
      trainers,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { role: 'STUDENT', isActive: true },
      }),
      // Batches are derived from courses with active enrollments
      this.prisma.course.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          title: true,
          _count: { select: { enrollments: true } },
        },
      }),
      this.prisma.order.findMany({
        select: {
          id: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          batchMode: true,
        },
      }),
      // Placeholder — we use totalOrders below
      Promise.resolve(null),
      Promise.resolve(null),
      this.prisma.lead.count({
        where: {
          createdAt: { gte: weekStart },
        },
      }),
      this.prisma.escalation.count({
        where: { type: 'TRAINER_FLAG', status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } },
      }),
      this.prisma.user.findMany({
        where: { role: 'TRAINER' },
        select: {
          id: true,
          name: true,
          email: true,
          _count: { select: { coursesTaught: true } },
        },
      }),
    ]);

    const activeBatchCount = activeBatches.filter(
      (c) => c._count.enrollments > 0,
    ).length;
    const totalEnrolled = activeBatches.reduce(
      (s, c) => s + c._count.enrollments,
      0,
    );

    const paid = totalOrders.filter((o) => o.status === OrderStatus.PAID);
    const created = totalOrders.filter((o) => o.status === OrderStatus.CREATED);

    const revenueMtd = paid
      .filter((o) => o.createdAt >= monthStart)
      .reduce((s, o) => s + o.totalAmount.toNumber(), 0);

    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevRevenueMtd = paid
      .filter(
        (o) => o.createdAt >= prevMonthStart && o.createdAt < monthStart,
      )
      .reduce((s, o) => s + o.totalAmount.toNumber(), 0);

    const revenueDelta =
      prevRevenueMtd > 0
        ? Math.round(((revenueMtd - prevRevenueMtd) / prevRevenueMtd) * 100)
        : 0;

    const conversionRate =
      totalOrders.length > 0
        ? Math.round((paid.length / totalOrders.length) * 100)
        : 0;

    return {
      kpi: {
        totalStudents,
        activeBatches: activeBatchCount,
        totalEnrolled,
        revenueMtd: Math.round(revenueMtd),
        revenueDelta,
        pipeline: created.length,
        newLeadsWeek: newLeadsThisWeek,
        conversionRate,
        pendingEscalations: flaggedStudents,
        trainerCount: trainers.length,
      },
      recentOrders: paid.slice(0, 5).map((o) => ({
        id: o.id,
        amount: o.totalAmount.toNumber(),
        mode: o.batchMode,
        date: o.createdAt,
      })),
    };
  }

  async getBatches() {
    const courses = await this.prisma.course.findMany({
      where: { status: 'ACTIVE' },
      include: {
        trainer: {
          select: { id: true, name: true, email: true },
        },
        enrollments: {
          select: {
            id: true,
            status: true,
            enrolledAt: true,
            student: { select: { id: true, name: true, email: true } },
          },
        },
        sections: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return courses.map((c) => ({
      id: c.id,
      title: c.title,
      code: c.code,
      price: c.price.toNumber(),
      trainer: c.trainer,
      enrolledCount: c.enrollments.length,
      activeStudents: c.enrollments.filter((e) => e.status === 'active')
        .length,
      totalSections: c.sections.length,
      students: c.enrollments.slice(0, 20).map((e) => ({
        id: e.student.id,
        name: e.student.name,
        email: e.student.email,
        enrolledAt: e.enrolledAt,
        status: e.status,
      })),
    }));
  }

  async getStudents(q?: string) {
    const where: Prisma.UserWhereInput = {
      role: 'STUDENT',
      isActive: true,
    };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ];
    }

    const students = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        createdAt: true,
        lastLoginAt: true,
        enrollments: {
          select: {
            id: true,
            status: true,
            course: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return students.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      city: s.city,
      createdAt: s.createdAt,
      lastLoginAt: s.lastLoginAt,
      enrollments: s.enrollments.map((e) => ({
        id: e.id,
        course: e.course.title,
        courseId: e.course.id,
        status: e.status,
      })),
      totalEnrollments: s.enrollments.length,
      activeEnrollments: s.enrollments.filter((e) => e.status === 'active')
        .length,
    }));
  }

  /**
   * Coordinator sets a flag on a student. Any flag raises (or adds to) the
   * student's escalation; "resolved" closes it.
   */
  async updateStudentFlag(studentId: string, flag: string, note: string | undefined, actor: Actor) {
    if (flag === 'resolved') {
      const open = await this.escalations.activeTrainerFlags();
      for (const e of open.filter((x) => x.studentId === studentId)) {
        await this.escalations.resolveTrainerFlag(e.id, note?.trim() || 'Cleared by the coordinator', actor);
      }
      return { success: true, studentId, flag, note };
    }

    // The flag label travels in the reason so the escalations list can show it.
    const reason = `[${flag}] ${note?.trim() ?? ''}`.trim();
    await this.escalations.flagStudent(studentId, reason, actor);
    return { success: true, studentId, flag, note };
  }

  async getEscalations() {
    const flags = await this.escalations.activeTrainerFlags();
    return flags
      .filter((e) => e.student)
      .map((e) => {
        const student = e.student!;
        const m = /^\[([^\]]+)\]\s*([\s\S]*)$/.exec(e.reason);
        return {
          id: e.id,
          name: student.name,
          email: student.email,
          phone: student.phone,
          city: student.city,
          flag: m ? m[1] : 'flagged',
          note: (m ? m[2] : e.reason) || null,
          flaggedAt: e.createdAt,
          courses: student.enrollments.map((en) => en.course.title),
        };
      });
  }

  async resolveEscalation(id: string, resolution: string, actor: Actor) {
    await this.escalations.resolveTrainerFlag(id, resolution, actor);
    return { success: true, id, resolution };
  }

  async getTrainers() {
    const trainers = await this.prisma.user.findMany({
      where: { role: 'TRAINER' },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        approvalStatus: true,
        rating: true,
        coursesTaught: {
          select: {
            id: true,
            title: true,
            _count: { select: { enrollments: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return trainers.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      isActive: t.isActive,
      approvalStatus: t.approvalStatus,
      rating: t.rating,
      totalCourses: t.coursesTaught.length,
      totalStudents: t.coursesTaught.reduce(
        (s, c) => s + c._count.enrollments,
        0,
      ),
      courses: t.coursesTaught.map((c) => ({
        id: c.id,
        title: c.title,
        enrolled: c._count.enrollments,
      })),
    }));
  }

  async getPayments(status?: string, page = 1, perPage = 10) {
    const pageNum = Math.max(1, Math.floor(page) || 1);
    const size = Math.min(50, Math.max(1, Math.floor(perPage) || 10));

    const validStatuses = [
      'CREATED',
      'PAID',
      'FAILED',
      'CANCELLED',
      'EXPIRED',
    ] as const;

    const where: Prisma.OrderWhereInput = {};
    if (status && (validStatuses as readonly string[]).includes(status)) {
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

    const grouped = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { totalAmount: true },
    });

    const summary = {
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
      if (key in summary) {
        (summary as Record<string, number>)[key] = g._count._all;
      }
      summary.total += g._count._all;
      if (g.status === OrderStatus.PAID) {
        summary.totalRevenue = g._sum.totalAmount?.toNumber() ?? 0;
      }
    }

    return {
      summary,
      orders: orders.map((o) => ({
        id: o.id,
        orderNo: o.id.slice(0, 8).toUpperCase(),
        status: o.status,
        currency: o.currency,
        totalAmount: o.totalAmount.toNumber(),
        createdAt: o.createdAt,
        student: o.user,
        items: o.items.map((i) => ({
          title: i.course?.title ?? null,
          price: i.priceAtPurchase.toNumber(),
        })),
        enrollmentsCount: o._count.enrollments,
      })),
      pagination: {
        page: pageNum,
        perPage: size,
        total,
        totalPages: Math.max(1, Math.ceil(total / size)),
      },
    };
  }
}
