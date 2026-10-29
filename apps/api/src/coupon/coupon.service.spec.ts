import { BadRequestException } from '@nestjs/common';
import { Currency, OrderStatus } from '@prisma/client';
import { CouponService } from './coupon.service';
import { PrismaService } from '../prisma/prisma.service';
import { decimal, makeCoupon } from '../test-utils/fixtures';

// This module never gets a real DB connection anywhere in this file — every
// Prisma call the service makes goes through this mock, so there's zero risk
// of touching the live Supabase database while testing coupon math.
function makePrismaMock() {
  return {
    coupon: { findUnique: jest.fn() },
    couponRedemption: { count: jest.fn().mockResolvedValue(0) },
    order: { count: jest.fn().mockResolvedValue(0) },
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

  describe('usage limits are counted from the orders that hold a coupon', () => {
    const input = {
      code: 'launch25',
      userId: '__spec__student-1',
      currency: Currency.INR,
      subtotal: 4000,
      courseIds: ['__spec__course-react'],
      projectIds: [] as string[],
    };

    it('counts open (CREATED) and paid orders - not just paid ones - towards maxUses', async () => {
      // 5 unpaid orders already hold the last uses of a 5-use coupon even though usedCount is still 0
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(makeCoupon({ maxUses: 5, usedCount: 0 }));
      (prisma.order.count as jest.Mock).mockResolvedValue(5);

      await expect(service.validate(input)).rejects.toThrow('This coupon has reached its usage limit');
      expect(prisma.order.count).toHaveBeenCalledWith({
        where: {
          couponId: expect.any(String),
          status: {
            in: [OrderStatus.CREATED, OrderStatus.PAID, OrderStatus.REFUND_REQUESTED, OrderStatus.REFUNDED],
          },
        },
      });
    });

    it('does not count FAILED / CANCELLED / EXPIRED orders', async () => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(makeCoupon({ maxUses: 5, usedCount: 0 }));
      // global count = 4 (< maxUses 5), then this user has no orders
      (prisma.order.count as jest.Mock).mockResolvedValueOnce(4).mockResolvedValueOnce(0);

      await expect(service.validate(input)).resolves.toBeDefined();
      const statuses = (prisma.order.count as jest.Mock).mock.calls[0][0].where.status.in;
      expect(statuses).not.toContain(OrderStatus.FAILED);
      expect(statuses).not.toContain(OrderStatus.CANCELLED);
      expect(statuses).not.toContain(OrderStatus.EXPIRED);
    });

    it('still honours usedCount as a floor when it is higher than the order count', async () => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(makeCoupon({ maxUses: 5, usedCount: 5 }));
      (prisma.order.count as jest.Mock).mockResolvedValue(0);

      await expect(service.validate(input)).rejects.toThrow('This coupon has reached its usage limit');
    });

    it('blocks a second open order for a perUserLimit=1 coupon (no redemption exists yet)', async () => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(makeCoupon({ perUserLimit: 1 }));
      (prisma.couponRedemption.count as jest.Mock).mockResolvedValue(0);
      // maxUses is null so only this user's open order is counted
      (prisma.order.count as jest.Mock).mockResolvedValue(1);

      await expect(service.validate(input)).rejects.toThrow('You have already used this coupon');
    });

    it('enforces perUserLimit > 1 from orders, since CouponRedemption is unique per user', async () => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(makeCoupon({ perUserLimit: 3 }));
      (prisma.couponRedemption.count as jest.Mock).mockResolvedValue(1); // the DB can only ever hold 1 row
      (prisma.order.count as jest.Mock).mockResolvedValue(2);
      await expect(service.validate(input)).resolves.toBeDefined();

      (prisma.order.count as jest.Mock).mockResolvedValue(3);
      await expect(service.validate(input)).rejects.toThrow('You have already used this coupon');
    });

    it('assertWithinUsageLimits() can run against a transaction client', async () => {
      const tx = {
        order: { count: jest.fn().mockResolvedValue(5) },
        couponRedemption: { count: jest.fn().mockResolvedValue(0) },
      };

      await expect(
        service.assertWithinUsageLimits(tx as any, { id: 'c1', maxUses: 5, usedCount: 0, perUserLimit: 1 }, 'u1'),
      ).rejects.toThrow('This coupon has reached its usage limit');
    });

    it('lockCoupon() takes a Postgres advisory transaction lock keyed on the coupon', async () => {
      const tx = { $executeRaw: jest.fn().mockResolvedValue(1) };

      await service.lockCoupon(tx as any, '__spec__coupon-1');

      expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
      const [strings, ...values] = tx.$executeRaw.mock.calls[0];
      expect(strings.join('?')).toContain('pg_advisory_xact_lock');
      expect(values).toEqual(['__spec__coupon-1']);
    });
  });
});
