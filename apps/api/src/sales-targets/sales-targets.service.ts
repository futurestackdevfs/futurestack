import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalesTargetsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildTarget(t: any) {
    const remaining = Math.max(0, t.targetAmount - t.currentAmount);
    const progressPct = t.targetAmount > 0 ? Math.min(100, Math.round((t.currentAmount / t.targetAmount) * 100)) : 0;
    const now = new Date();
    const endDate = new Date(t.endDate);
    const startDate = new Date(t.startDate);
    const isCompleted = t.currentAmount >= t.targetAmount;
    const isActive = now >= startDate && now <= endDate && !isCompleted;
    const isOverdue = now > endDate && !isCompleted;
    const isUpcoming = now < startDate;
    const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));
    const daysElapsed = Math.max(0, Math.min(totalDays, Math.ceil((now.getTime() - startDate.getTime()) / 86400000)));
    const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86400000));
    const expectedPct = totalDays > 0 ? Math.min(100, Math.round((daysElapsed / totalDays) * 100)) : 0;

    return {
      id: t.id,
      salespersonName: t.salesperson.name,
      salespersonId: t.salespersonId,
      courseName: t.course?.title ?? 'All Courses',
      courseId: t.courseId,
      period: t.period,
      targetAmount: t.targetAmount,
      currentAmount: t.currentAmount,
      remaining,
      progressPct,
      expectedPct,
      isOnTrack: progressPct >= expectedPct,
      isCompleted,
      isActive,
      isOverdue,
      isUpcoming,
      daysLeft,
      daysElapsed,
      totalDays,
      startDate: t.startDate.toISOString().slice(0, 10),
      endDate: t.endDate.toISOString().slice(0, 10),
      createdAt: t.createdAt.toISOString(),
    };
  }

  async getTargets(userId: string, role: Role) {
    const where: any = {};
    if (role === Role.SALES) {
      where.salespersonId = userId;
    }

    const targets = await this.prisma.salesTarget.findMany({
      where,
      include: {
        salesperson: { select: { id: true, name: true } },
        course: { select: { id: true, title: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    const built = targets.map((t) => this.buildTarget(t));

    // Dashboard summary
    const totalTarget = built.reduce((s, t) => s + t.targetAmount, 0);
    const totalAchieved = built.reduce((s, t) => s + t.currentAmount, 0);
    const totalRemaining = Math.max(0, totalTarget - totalAchieved);
    const activeTargets = built.filter((t) => t.isActive);
    const completedTargets = built.filter((t) => t.isCompleted);
    const overdueTargets = built.filter((t) => t.isOverdue);
    const upcomingTargets = built.filter((t) => t.isUpcoming);

    return {
      targets: built,
      summary: {
        totalTargets: built.length,
        activeCount: activeTargets.length,
        completedCount: completedTargets.length,
        overdueCount: overdueTargets.length,
        upcomingCount: upcomingTargets.length,
        totalTarget,
        totalAchieved,
        totalRemaining,
        overallProgressPct: totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0,
      },
    };
  }

  async createTarget(userId: string, dto: {
    salespersonId: string;
    courseId?: string;
    period: string;
    targetAmount: number;
    startDate: string;
    endDate: string;
  }) {
    const salesperson = await this.prisma.user.findUnique({
      where: { id: dto.salespersonId },
      select: { id: true, role: true },
    });
    if (!salesperson || salesperson.role !== Role.SALES) {
      throw new BadRequestException('Invalid salesperson');
    }

    if (dto.courseId) {
      const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
      if (!course) throw new BadRequestException('Invalid course');
    }

    const target = await this.prisma.salesTarget.create({
      data: {
        salespersonId: dto.salespersonId,
        courseId: dto.courseId || null,
        period: dto.period,
        targetAmount: dto.targetAmount,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
      include: {
        salesperson: { select: { id: true, name: true } },
        course: { select: { id: true, title: true } },
      },
    });

    return this.buildTarget(target);
  }

  async updateTarget(targetId: string, dto: {
    targetAmount?: number;
    period?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const existing = await this.prisma.salesTarget.findUnique({ where: { id: targetId } });
    if (!existing) throw new NotFoundException('Target not found');

    const updated = await this.prisma.salesTarget.update({
      where: { id: targetId },
      data: {
        ...(dto.targetAmount !== undefined && { targetAmount: dto.targetAmount }),
        ...(dto.period && { period: dto.period }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
      },
      include: {
        salesperson: { select: { id: true, name: true } },
        course: { select: { id: true, title: true } },
      },
    });

    return this.buildTarget(updated);
  }

  async deleteTarget(targetId: string) {
    const existing = await this.prisma.salesTarget.findUnique({ where: { id: targetId } });
    if (!existing) throw new NotFoundException('Target not found');
    await this.prisma.salesTarget.delete({ where: { id: targetId } });
    return { message: 'Target deleted' };
  }

  async refreshCurrentAmounts(userId: string, role: Role) {
    const where: any = {};
    if (role === Role.SALES) where.salespersonId = userId;

    const targets = await this.prisma.salesTarget.findMany({ where });

    for (const target of targets) {
      const paid = await this.prisma.order.aggregate({
        where: {
          salespersonId: target.salespersonId,
          status: 'PAID',
          createdAt: { gte: target.startDate, lte: target.endDate },
          ...(target.courseId ? {
            items: { some: { courseId: target.courseId } },
          } : {}),
        },
        _sum: { totalAmount: true },
      });

      await this.prisma.salesTarget.update({
        where: { id: target.id },
        data: { currentAmount: paid._sum.totalAmount ?? 0 },
      });
    }

    return this.getTargets(userId, role);
  }
}
