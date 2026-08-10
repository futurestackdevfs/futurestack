import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Currency, Coupon, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { translatePrismaError } from '../common/prisma-errors';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

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

    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }

    const userRedemptions = await this.prisma.couponRedemption.count({
      where: { couponId: coupon.id, userId: input.userId },
    });
    if (userRedemptions >= coupon.perUserLimit) {
      throw new BadRequestException('You have already used this coupon');
    }

    if (coupon.applicableCourseIds.length > 0) {
      const applies = input.courseIds.some((id) =>
        coupon.applicableCourseIds.includes(id),
      );
      if (!applies)
        throw new BadRequestException(
          'This coupon does not apply to items in your cart',
        );
    }

    if (coupon.minOrderAmount != null && input.subtotal < coupon.minOrderAmount) {
      throw new BadRequestException(
        `Minimum order amount of ${coupon.minOrderAmount} ${input.currency} not met`,
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

  /** Compute discounted amount in major units. Works in minor units internally. */
  private computeDiscount(coupon: Coupon, subtotal: number): number {
    const subtotalMinor = this.toMinor(subtotal);
    if (coupon.discountType === 'PERCENT') {
      const discountMinor = Math.floor((subtotalMinor * coupon.value) / 100);
      return discountMinor / 100;
    }
    const flatMinor = this.toMinor(coupon.value);
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
      return await this.prisma.coupon.create({
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

    return { items, total, page, perPage };
  }

  async findOne(id: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        _count: { select: { redemptions: true } },
      },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
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
      return await this.prisma.coupon.update({ where: { id }, data });
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
      return await this.prisma.coupon.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (e) {
      translatePrismaError(e, { onNotFound: 'Coupon not found' });
    }
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
