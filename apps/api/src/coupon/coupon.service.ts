import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Currency, Coupon, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { translatePrismaError } from '../common/prisma-errors';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

/**
 * Order statuses that still hold a coupon use: an open order has been quoted the
 * discount, a paid one has consumed it, and refunds don't give the use back.
 */
const COUNTED_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.CREATED,
  OrderStatus.PAID,
  OrderStatus.REFUND_REQUESTED,
  OrderStatus.REFUNDED,
];

/** Either the PrismaService or a transaction client. */
type CouponUsageDb = Pick<Prisma.TransactionClient, 'order' | 'couponRedemption'>;

/** Live-priced cart snapshot passed to CouponService.validate(). */
export interface CouponValidationResult {
  coupon: Coupon;
  /** Computed discount amount in major units of `currency`. */
  discountAmount: number;
}

@Injectable()
export class CouponService {
  constructor(private readonly prisma: PrismaService) {}

  private toMinor(major: number): number {
    return Math.round(major * 100);
  }

  /**
   * Validate a coupon against a freshly-loaded cart and a user. Never mutates
   * anything — the caller decides whether to store / apply the discount. Usage
   * (`usedCount`, `CouponRedemption`) is only incremented inside the checkout
   * module's `finalizeOrder()` after payment actually succeeds.
   *
   * Failure reasons map 1:1 to user-facing messages so the frontend can show
   * the real reason instead of a generic "invalid coupon".
   */
  async validate(input: ValidateCouponDto): Promise<CouponValidationResult> {
    const code = input.code.toUpperCase().trim();
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon) throw new BadRequestException('Coupon not found');
    if (!coupon.isActive)
      throw new BadRequestException('This coupon is no longer active');

    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) {
      throw new BadRequestException('This coupon is not valid yet');
    }
    if (coupon.validUntil && now > coupon.validUntil) {
      throw new BadRequestException('This coupon has expired');
    }

    await this.assertWithinUsageLimits(this.prisma, coupon, input.userId);

    if (coupon.applicableCourseIds.length > 0) {
      const allIds = [...input.courseIds, ...(input.projectIds ?? [])];
      const applies = allIds.some((id) =>
        coupon.applicableCourseIds.includes(id),
      );
      if (!applies)
        throw new BadRequestException(
          'This coupon does not apply to items in your cart',
        );
    }

    const minOrderAmount = coupon.minOrderAmount?.toNumber() ?? null;
    if (minOrderAmount != null && input.subtotal < minOrderAmount) {
      throw new BadRequestException(
        `Minimum order amount of ${minOrderAmount} ${input.currency} not met`,
      );
    }

    if (coupon.discountType === 'FLAT') {
      if (!coupon.currency)
        throw new BadRequestException(
          'This coupon is not valid for the selected currency',
        );
      if (coupon.currency !== input.currency) {
        throw new BadRequestException(
          'This coupon is not valid for the selected currency',
        );
      }
    }

    const discountAmount = this.computeDiscount(coupon, input.subtotal);
    return { coupon, discountAmount };
  }

  /**
   * Enforce `maxUses` and `perUserLimit`.
   *
   * Uses are counted from the ORDERS that carry the coupon, not from a counter
   * that is bumped only at payment time. An order that is still CREATED already
   * holds its use (it has been quoted the discount), and an order that ends up
   * FAILED / CANCELLED / EXPIRED simply stops counting - so nothing has to be
   * "released" and the number can't drift. Counting only paid orders (the old
   * behaviour) let any number of buyers open discounted orders while the count
   * was still below the cap and then pay them all.
   *
   * To make the limit hold under concurrency, checkout calls this inside the
   * order-creation transaction after taking `lockCoupon()`.
   */
  async assertWithinUsageLimits(
    db: CouponUsageDb,
    coupon: Pick<Coupon, 'id' | 'maxUses' | 'usedCount' | 'perUserLimit'>,
    userId: string,
  ): Promise<void> {
    if (coupon.maxUses != null) {
      const used = await db.order.count({
        where: { couponId: coupon.id, status: { in: COUNTED_ORDER_STATUSES } },
      });
      // usedCount (bumped when an order is paid) is kept as a conservative floor.
      if (Math.max(used, coupon.usedCount) >= coupon.maxUses) {
        throw new BadRequestException('This coupon has reached its usage limit');
      }
    }

    const [userOrders, userRedemptions] = await Promise.all([
      db.order.count({
        where: { couponId: coupon.id, userId, status: { in: COUNTED_ORDER_STATUSES } },
      }),
      db.couponRedemption.count({ where: { couponId: coupon.id, userId } }),
    ]);
    if (Math.max(userOrders, userRedemptions) >= coupon.perUserLimit) {
      throw new BadRequestException('You have already used this coupon');
    }
  }

  /**
   * Serialize concurrent order creations that use the same coupon, for the
   * rest of the surrounding transaction (Postgres advisory transaction lock,
   * released automatically on commit/rollback). Call inside `$transaction`.
   */
  async lockCoupon(tx: Prisma.TransactionClient, couponId: string): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${couponId}))`;
  }

  /** Compute discounted amount in major units. Works in minor units internally. */
  private computeDiscount(coupon: Coupon, subtotal: number): number {
    const value = coupon.value.toNumber();
    const subtotalMinor = this.toMinor(subtotal);
    if (coupon.discountType === 'PERCENT') {
      const discountMinor = Math.floor((subtotalMinor * value) / 100);
      return discountMinor / 100;
    }
    const flatMinor = this.toMinor(value);
    const discountMinor = Math.min(flatMinor, subtotalMinor);
    return discountMinor / 100;
  }

  // ============================ ADMIN CRUD ============================

  async create(adminId: string, dto: CreateCouponDto) {
    this.assertCreateValid(dto);
    const code = dto.code.toUpperCase();
    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) throw new ConflictException('A coupon with this code already exists');
    try {
      const created = await this.prisma.coupon.create({
        data: {
          code,
          discountType: dto.discountType,
          value: dto.value,
          currency: dto.currency,
          applicableCourseIds: dto.applicableCourseIds ?? [],
          minOrderAmount: dto.minOrderAmount,
          maxUses: dto.maxUses,
          perUserLimit: dto.perUserLimit ?? 1,
          isActive: dto.isActive ?? true,
          validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
          createdByAdminId: adminId,
        },
      });
      return this.toPlainCoupon(created);
    } catch (error) {
      translatePrismaError(error, {
        onConflict: 'A coupon with this code already exists',
      });
    }
  }

  async list(page: number, perPage: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.coupon.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          code: true,
          discountType: true,
          value: true,
          currency: true,
          applicableCourseIds: true,
          minOrderAmount: true,
          maxUses: true,
          usedCount: true,
          perUserLimit: true,
          isActive: true,
          validFrom: true,
          validUntil: true,
          createdAt: true,
          _count: { select: { redemptions: true } },
        },
      }),
      this.prisma.coupon.count(),
    ]);

    return { items: items.map((c) => this.toPlainCoupon(c)), total, page, perPage };
  }

  async findOne(id: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        _count: { select: { redemptions: true } },
      },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return this.toPlainCoupon(coupon);
  }

  async update(id: string, dto: UpdateCouponDto) {
    if (
      dto.discountType ||
      dto.value !== undefined ||
      dto.currency !== undefined
    ) {
      const current = await this.prisma.coupon.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Coupon not found');
      const merged = { ...current, ...dto } as unknown as CreateCouponDto;
      this.assertCreateValid(merged);
    }

    const data: Prisma.CouponUpdateInput = {
      ...(dto.code && { code: dto.code.toUpperCase() }),
      ...(dto.discountType && { discountType: dto.discountType }),
      ...(dto.value !== undefined && { value: dto.value }),
      ...(dto.currency && { currency: dto.currency }),
      ...(dto.applicableCourseIds && {
        applicableCourseIds: dto.applicableCourseIds,
      }),
      ...(dto.minOrderAmount !== undefined && {
        minOrderAmount: dto.minOrderAmount,
      }),
      ...(dto.maxUses !== undefined && { maxUses: dto.maxUses }),
      ...(dto.perUserLimit !== undefined && { perUserLimit: dto.perUserLimit }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.validFrom && { validFrom: new Date(dto.validFrom) }),
      ...(dto.validUntil && { validUntil: new Date(dto.validUntil) }),
    };

    try {
      const updated = await this.prisma.coupon.update({ where: { id }, data });
      return this.toPlainCoupon(updated);
    } catch (e) {
      translatePrismaError(e, {
        onConflict: 'A coupon with this code already exists',
        onNotFound: 'Coupon not found',
      });
    }
  }

  /** Soft-delete: deactivate (isActive=false). CouponRedemption rows reference Coupon. */
  async deactivate(id: string) {
    try {
      const updated = await this.prisma.coupon.update({
        where: { id },
        data: { isActive: false },
      });
      return this.toPlainCoupon(updated);
    } catch (e) {
      translatePrismaError(e, { onNotFound: 'Coupon not found' });
    }
  }

  /**
   * Hard-delete a coupon. CouponRedemption rows have `ON DELETE RESTRICT`, so
   * they are removed first; Cart rows auto-null via SET NULL. Order.couponId is
   * a plain string (no FK) and is kept for historical records.
   */
  async remove(id: string) {
    await this.prisma.$transaction(async (tx) => {
      const coupon = await tx.coupon.findUnique({ where: { id } });
      if (!coupon) throw new NotFoundException('Coupon not found');
      await tx.couponRedemption.deleteMany({ where: { couponId: id } });
      await tx.coupon.delete({ where: { id } });
    });
    return { success: true };
  }

  /**
   * Sales made using a given coupon — joins CouponRedemption → Order → User so
   * the admin can see who redeemed it, when, and for how much.
   */
  async listSales(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');

    const redemptions = await this.prisma.couponRedemption.findMany({
      where: { couponId: id },
      orderBy: { createdAt: 'desc' },
    });
    if (redemptions.length === 0) {
      return { code: coupon.code, totalSales: 0, totalDiscount: 0, items: [] };
    }

    const orderIds = redemptions.map((r) => r.orderId);
    const orders = await this.prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { select: { courseId: true } },
      },
    });
    const orderMap = new Map(orders.map((o) => [o.id, o]));

    const items = redemptions.map((r) => {
      const order = orderMap.get(r.orderId);
      return {
        redemptionId: r.id,
        usedAt: r.createdAt,
        orderId: r.orderId,
        orderStatus: order?.status ?? null,
        amount: order?.totalAmount?.toNumber() ?? null,
        currency: order?.currency ?? null,
        discountAmount: order?.discountAmount?.toNumber() ?? null,
        subtotal: order?.subtotal?.toNumber() ?? null,
        student: order?.user
          ? { id: order.user.id, name: order.user.name, email: order.user.email }
          : null,
        courseCount: order?.items.length ?? null,
      };
    });

    const totalDiscount = this.round2(
      items.reduce((sum, i) => sum + (i.discountAmount ?? 0), 0),
    );

    return {
      code: coupon.code,
      totalSales: items.length,
      totalDiscount,
      items,
    };
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  /** Converts Coupon's Decimal columns (value, minOrderAmount) to plain
   *  numbers right at the DB read boundary, so admin CRUD JSON responses
   *  keep serializing numbers rather than Decimal strings. */
  private toPlainCoupon<T extends { value: Prisma.Decimal; minOrderAmount: Prisma.Decimal | null }>(
    coupon: T,
  ) {
    return {
      ...coupon,
      value: coupon.value.toNumber(),
      minOrderAmount: coupon.minOrderAmount?.toNumber() ?? null,
    };
  }

  private assertCreateValid(dto: {
    discountType: string;
    value: number;
    currency?: Currency | null;
  }) {
    if (dto.discountType === 'PERCENT') {
      if (dto.value < 0 || dto.value > 100) {
        throw new BadRequestException(
          'For PERCENT coupons, value must be between 0 and 100',
        );
      }
    }
    if (dto.discountType === 'FLAT' && !dto.currency) {
      throw new BadRequestException('For FLAT coupons, a currency is required');
    }
  }
}
