import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Currency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CouponService } from '../coupon/coupon.service';
import { PaymentSettingsService } from '../payment-settings/payment-settings.service';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly couponService: CouponService,
    private readonly paymentSettings: PaymentSettingsService,
  ) {}

  async getOrCreateCart(userId: string) {
    const existing = await this.prisma.cart.findUnique({ where: { userId } });
    if (existing) return existing;
    try {
      return await this.prisma.cart.create({ data: { userId } });
    } catch (e) {
      // Two parallel logins can both attempt the create — one hits the unique
      // constraint. Treat that as "cart already exists" and re-read.
      if (this.isConflict(e)) {
        const cart = await this.prisma.cart.findUnique({ where: { userId } });
        if (cart) return cart;
      }
      throw e;
    }
  }

  private isConflict(error: unknown): boolean {
    return (
      error instanceof Error &&
      typeof (error as { code?: string }).code === 'string' &&
      (error as { code?: string }).code === 'P2002'
    );
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  private async getVideoStats(
    courseIds: string[],
  ): Promise<Map<string, { totalSeconds: number; videoCount: number }>> {
    if (courseIds.length === 0) return new Map();
    const rows: {
      courseId: string;
      totalSeconds: number | null;
      videoCount: number | null;
    }[] = await this.prisma.$queryRawUnsafe(
      `SELECT s."courseId", COALESCE(SUM(v."durationSeconds"), 0) as "totalSeconds", COUNT(v.id) as "videoCount"
         FROM "Section" s LEFT JOIN "Video" v ON v."sectionId" = s."id"
         WHERE s."courseId" = ANY($1)
         GROUP BY s."courseId"`,
      courseIds,
    );
    const map = new Map<string, { totalSeconds: number; videoCount: number }>();
    for (const row of rows) {
      map.set(row.courseId, {
        totalSeconds: Number(row.totalSeconds ?? 0),
        videoCount: Number(row.videoCount ?? 0),
      });
    }
    return map;
  }

  /**
   * Builds the cart view for a given currency.
   */
  async getCartView(userId: string, currency: Currency) {
    const cart = await this.getOrCreateCart(userId);

    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            price: true,
            originalPrice: true,
            category: true,
            techStack: true,
            averageRating: true,
            reviewCount: true,
            _count: { select: { sections: true } },
            sections: { select: { _count: { select: { videos: true } } } },
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            image: true,
            thumbGradient: true,
            price: true,
            originalPrice: true,
            shortDesc: true,
            techLabel: true,
            trainer: { select: { name: true } },
          },
        },
      },
      orderBy: { addedAt: 'asc' },
    });

    const courseIds = items.filter((i) => i.courseId).map((i) => i.courseId!);
    const videoStats = await this.getVideoStats(courseIds);

    const enriched = items.map((item) => {
      if (item.projectId && item.project) {
        const p = item.project;
        const price = p.price;
        const originalPrice = p.originalPrice ?? null;
        let offPct = 0;
        if (originalPrice != null && originalPrice > price) {
          offPct = Math.min(99, Math.round(((originalPrice - price) / originalPrice) * 100));
        }
        return {
          type: 'project' as const,
          projectId: item.projectId,
          courseId: null,
          title: p.name,
          image: p.image,
          thumbGradient: p.thumbGradient,
          shortDesc: p.shortDesc,
          techLabel: p.techLabel,
          trainer: p.trainer?.name ?? 'TBD',
          rating: 0,
          reviews: 0,
          modules: 0,
          lessons: 0,
          hours: 0,
          price,
          originalPrice,
          offPct,
          hasDiscount: offPct > 0,
          currency,
        };
      }

      const c = item.course!;
      const price = c.price;
      const originalPrice = c.originalPrice ?? null;
      let offPct = 0;
      if (originalPrice != null && originalPrice > price) {
        offPct = Math.min(99, Math.round(((originalPrice - price) / originalPrice) * 100));
      }
      const stats = videoStats.get(item.courseId!) ?? {
        totalSeconds: 0,
        videoCount: 0,
      };
      const totalHours = Math.round(stats.totalSeconds / 3600);
      return {
        type: 'course' as const,
        courseId: item.courseId,
        projectId: null,
        title: c.title,
        image: c.thumbnailUrl,
        thumbGradient: null,
        shortDesc: null,
        techLabel: c.category ?? c.techStack[0] ?? 'General',
        trainer: null,
        category: c.category ?? c.techStack[0] ?? 'General',
        rating: c.averageRating,
        reviews: c.reviewCount,
        modules: c._count.sections,
        lessons: stats.videoCount,
        hours: totalHours || 1,
        price,
        originalPrice,
        offPct,
        hasDiscount: offPct > 0,
        currency,
      };
    });

    // Sum in minor units (paise/cents) to avoid float accumulation drift.
    const subtotal = this.round2(
      enriched.reduce((sum, e) => sum + Math.round(e.price * 100), 0) / 100,
    );

    let coupon: {
      id: string;
      code: string;
      discountType: string;
      value: number;
    } | null = null;
    let discountAmount = 0;
    if (cart.couponId) {
      const applied = await this.prisma.coupon.findUnique({
        where: { id: cart.couponId },
      });
      if (applied) {
        coupon = this.presentCoupon(applied);
        try {
          const courseIdsOnly = enriched.filter((e) => e.type === 'course').map((e) => e.courseId!);
          const projectIdsOnly = enriched.filter((e) => e.type === 'project').map((e) => e.projectId!);
          const res = await this.couponService.validate({
            code: applied.code,
            userId,
            currency,
            subtotal,
            courseIds: courseIdsOnly,
            projectIds: projectIdsOnly,
          });
          discountAmount = res.discountAmount;
        } catch (e) {
          if (!(e instanceof BadRequestException)) throw e;
        }
      }
    }

    const taxableAmount = this.round2(subtotal - discountAmount);
    const gstPercent =
      (await this.paymentSettings.getSettings()).gstPercent ?? 18;
    const gstAmount = this.round2((taxableAmount * gstPercent) / 100);

    return {
      items: enriched,
      coupon,
      discountAmount,
      subtotal,
      gstPercent,
      gstAmount,
      total: this.round2(taxableAmount + gstAmount),
      currency,
    };
  }

  private presentCoupon(c: {
    id: string;
    code: string;
    discountType: string;
    value: number;
  }) {
    return {
      id: c.id,
      code: c.code,
      discountType: c.discountType,
      value: c.value,
    };
  }

  async addItem(userId: string, courseId?: string, projectId?: string) {
    if (!courseId && !projectId) {
      throw new BadRequestException('Either courseId or projectId is required');
    }

    const cart = await this.getOrCreateCart(userId);

    if (projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, status: true },
      });
      if (!project || project.status !== 'ACTIVE') {
        throw new NotFoundException('Project not found');
      }
      await this.prisma.cartItem.upsert({
        where: { cartId_projectId: { cartId: cart.id, projectId } },
        create: { cartId: cart.id, projectId },
        update: {},
      });
    } else if (courseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, status: true },
      });
      if (!course || course.status !== 'ACTIVE') {
        throw new NotFoundException('Course not found');
      }
      await this.assertNotEnrolled(userId, courseId);
      await this.prisma.cartItem.upsert({
        where: { cartId_courseId: { cartId: cart.id, courseId } },
        create: { cartId: cart.id, courseId },
        update: {},
      });
    }

    return this.getCartView(userId, 'INR');
  }

  private async assertNotEnrolled(userId: string, courseId: string) {
    const enrolled = await this.prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: userId, courseId } },
      select: { id: true },
    });
    if (enrolled) {
      throw new ConflictException('You are already enrolled in this course');
    }
  }

  async removeItem(userId: string, courseIdOrProjectId: string) {
    const cart = await this.getOrCreateCart(userId);
    const result = await this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        OR: [
          { courseId: courseIdOrProjectId },
          { projectId: courseIdOrProjectId },
        ],
      },
    });
    if (result.count === 0) throw new NotFoundException('Item not in cart');
    return this.getCartView(userId, 'INR');
  }

  /**
   * Merge guest cart course ids into the DB cart. Bad ids (missing, inactive,
   * already-enrolled) are skipped silently — this runs automatically on login
   * and must never block it. Returns the final cart.
   */
  async mergeCart(userId: string, courseIds: string[]) {
    const cart = await this.getOrCreateCart(userId);
    if (courseIds.length === 0) return this.getCartView(userId, 'INR');

    const active = await this.prisma.course.findMany({
      where: { id: { in: courseIds }, status: 'ACTIVE' },
      select: { id: true },
    });
    const valid = new Set(active.map((c) => c.id));

    const enrolledRows =
      valid.size > 0
        ? await this.prisma.enrollment.findMany({
            where: { studentId: userId, courseId: { in: [...valid] } },
            select: { courseId: true },
          })
        : [];
    const enrolled = new Set(enrolledRows.map((e) => e.courseId));

    for (const courseId of courseIds) {
      if (!valid.has(courseId) || enrolled.has(courseId)) continue;
      try {
        await this.prisma.cartItem.upsert({
          where: { cartId_courseId: { cartId: cart.id, courseId } },
          create: { cartId: cart.id, courseId },
          update: {},
        });
      } catch {
        // Individual bad ids must never throw — swallow and continue.
      }
    }

    return this.getCartView(userId, 'INR');
  }

  /** Applies a coupon after full validation. Throws the real reason on failure. */
  async applyCoupon(userId: string, code: string) {
    const cart = await this.getOrCreateCart(userId);
    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      select: { courseId: true, projectId: true },
    });
    const view = await this.getCartView(userId, 'INR');

    const result = await this.couponService.validate({
      code,
      userId,
      currency: 'INR',
      subtotal: view.subtotal,
      courseIds: items.filter((i) => i.courseId).map((i) => i.courseId as string),
      projectIds: items.filter((i) => i.projectId).map((i) => i.projectId as string),
    });

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { couponId: result.coupon.id },
    });

    const taxableAmount = this.round2(view.subtotal - result.discountAmount);
    const gstPercent =
      (await this.paymentSettings.getSettings()).gstPercent ?? 18;
    const gstAmount = this.round2((taxableAmount * gstPercent) / 100);

    return {
      coupon: this.presentCoupon(result.coupon),
      discountAmount: result.discountAmount,
      subtotal: view.subtotal,
      gstPercent,
      gstAmount,
      total: this.round2(taxableAmount + gstAmount),
      currency: 'INR' as const,
    };
  }

  async clearCoupon(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    if (cart.couponId) {
      await this.prisma.cart.update({
        where: { id: cart.id },
        data: { couponId: null },
      });
    }
    return this.getCartView(userId, 'INR');
  }
}
