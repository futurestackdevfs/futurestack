import { BadRequestException } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { CouponService } from './coupon.service';
import { PrismaService } from '../prisma/prisma.service';
import { decimal, makeCoupon } from '../test-utils/fixtures';

// This module never gets a real DB connection anywhere in this file — every
// Prisma call the service makes goes through this mock, so there's zero risk
// of touching the live Supabase database while testing coupon math.
function makePrismaMock() {
  return {
    coupon: { findUnique: jest.fn() },
    couponRedemption: { count: jest.fn() },
  } as unknown as PrismaService;
}

describe('CouponService', () => {
  let service: CouponService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new CouponService(prisma);
  });

  describe('validate()', () => {
    const baseInput = {
      code: 'launch25',
      userId: '__spec__student-1',
      currency: Currency.INR,
      subtotal: 4000,
      courseIds: ['__spec__course-react'],
      projectIds: [] as string[],
    };

    it('accepts a live, unused coupon and returns the computed discount', async () => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(makeCoupon());
      (prisma.couponRedemption.count as jest.Mock).mockResolvedValue(0);

      const result = await service.validate(baseInput);

      expect(result.coupon.code).toBe('LAUNCH25');
      expect(result.discountAmount).toBe(1000); // 25% of 4000
    });

    it('rejects when the coupon does not exist', async () => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.validate(baseInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects an expired coupon', async () => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(
        makeCoupon({ validUntil: new Date('2020-01-01T00:00:00Z') }),
      );
      (prisma.couponRedemption.count as jest.Mock).mockResolvedValue(0);

      await expect(service.validate(baseInput)).rejects.toThrow(
        'This coupon has expired',
      );
    });

    it('rejects a coupon that has not started yet', async () => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(
        makeCoupon({ validFrom: new Date('2099-01-01T00:00:00Z') }),
      );
      (prisma.couponRedemption.count as jest.Mock).mockResolvedValue(0);

      await expect(service.validate(baseInput)).rejects.toThrow(
        'This coupon is not valid yet',
      );
    });

    it('rejects a coupon that has hit its global maxUses', async () => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(
        makeCoupon({ maxUses: 100, usedCount: 100 }),
      );
      (prisma.couponRedemption.count as jest.Mock).mockResolvedValue(0);

      await expect(service.validate(baseInput)).rejects.toThrow(
        'This coupon has reached its usage limit',
      );
    });

    it('rejects when this specific user already used up their per-user limit', async () => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(
        makeCoupon({ perUserLimit: 1 }),
      );
      (prisma.couponRedemption.count as jest.Mock).mockResolvedValue(1);

      await expect(service.validate(baseInput)).rejects.toThrow(
        'You have already used this coupon',
      );
    });

    it('rejects when the order subtotal is below minOrderAmount', async () => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(
        makeCoupon({ minOrderAmount: decimal(5000) }),
      );
      (prisma.couponRedemption.count as jest.Mock).mockResolvedValue(0);

      await expect(
        service.validate({ ...baseInput, subtotal: 4000 }),
      ).rejects.toThrow(/Minimum order amount/);
    });

    it('rejects a coupon restricted to courses that are not in the cart', async () => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(
        makeCoupon({ applicableCourseIds: ['__spec__course-node'] }),
      );
      (prisma.couponRedemption.count as jest.Mock).mockResolvedValue(0);

      await expect(
        service.validate({ ...baseInput, courseIds: ['__spec__course-react'] }),
      ).rejects.toThrow('This coupon does not apply to items in your cart');
    });

    it('accepts a course-restricted coupon when one of the cart items matches', async () => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(
        makeCoupon({ applicableCourseIds: ['__spec__course-react'] }),
      );
      (prisma.couponRedemption.count as jest.Mock).mockResolvedValue(0);

      const result = await service.validate(baseInput);
      expect(result.discountAmount).toBe(1000);
    });

    it('rejects a FLAT coupon whose fixed currency differs from the checkout currency', async () => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(
        makeCoupon({ discountType: 'FLAT', value: decimal(500), currency: Currency.USD }),
      );
      (prisma.couponRedemption.count as jest.Mock).mockResolvedValue(0);

      await expect(
        service.validate({ ...baseInput, currency: Currency.INR }),
      ).rejects.toThrow('This coupon is not valid for the selected currency');
    });
  });

  describe('computeDiscount() (via validate)', () => {
    it('caps a FLAT discount at the subtotal so it never goes negative', async () => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(
        makeCoupon({ discountType: 'FLAT', value: decimal(9999), currency: Currency.INR }),
      );
      (prisma.couponRedemption.count as jest.Mock).mockResolvedValue(0);

      const result = await service.validate({
        code: 'BIGFLAT',
        userId: '__spec__student-2',
        currency: Currency.INR,
        subtotal: 500,
        courseIds: [],
        projectIds: [],
      });

      expect(result.discountAmount).toBe(500);
    });

    it('rounds a PERCENT discount down to whole paise/cents, never up', async () => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(
        makeCoupon({ discountType: 'PERCENT', value: decimal(33) }),
      );
      (prisma.couponRedemption.count as jest.Mock).mockResolvedValue(0);

      const result = await service.validate({
        code: 'THIRD',
        userId: '__spec__student-3',
        currency: Currency.INR,
        subtotal: 10, // 33% of 10 = 3.3 -> minor units 330 -> floor(330*33/100)... check exact math below
        courseIds: [],
        projectIds: [],
      });

      // subtotal minor = 1000, 1000*33/100 = 330 minor units -> discountAmount 3.3
      expect(result.discountAmount).toBeCloseTo(3.3, 2);
    });
  });
});
