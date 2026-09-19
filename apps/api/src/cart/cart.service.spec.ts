import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { CouponService } from '../coupon/coupon.service';
import { PaymentSettingsService } from '../payment-settings/payment-settings.service';
import { decimal } from '../test-utils/fixtures';

// Fully mocked PrismaService / CouponService / PaymentSettingsService — no
// live DB connection is ever opened by this file.
function makePrismaMock() {
  return {
    cart: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    cartItem: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    course: { findUnique: jest.fn(), findMany: jest.fn() },
    project: { findUnique: jest.fn() },
    enrollment: { findUnique: jest.fn(), findMany: jest.fn() },
    coupon: { findUnique: jest.fn() },
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
  } as unknown as PrismaService;
}

function makeCartRow(overrides: Partial<Record<string, any>> = {}) {
  return { id: '__spec__cart-1', userId: '__spec__student-1', couponId: null, ...overrides };
}

describe('CartService', () => {
  let service: CartService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let couponService: { validate: jest.Mock };
  let paymentSettings: { getSettings: jest.Mock };

  beforeEach(() => {
    prisma = makePrismaMock();
    couponService = { validate: jest.fn() };
    paymentSettings = {
      getSettings: jest.fn().mockResolvedValue({ gstPercent: 18, gstPercentUsd: 0, usdRate: 84 }),
    };
    service = new CartService(
      prisma,
      couponService as unknown as CouponService,
      paymentSettings as unknown as PaymentSettingsService,
    );
  });

  describe('getOrCreateCart()', () => {
    it('returns the existing cart when one is already present', async () => {
      (prisma.cart.findUnique as jest.Mock).mockResolvedValue(makeCartRow());

      const result = await service.getOrCreateCart('__spec__student-1');
      expect(result.id).toBe('__spec__cart-1');
      expect(prisma.cart.create).not.toHaveBeenCalled();
    });

    it('recovers from a concurrent-create race (P2002) by re-reading the cart', async () => {
      (prisma.cart.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeCartRow());
      const conflictError = Object.assign(new Error('unique constraint'), {
        code: 'P2002',
      });
      (prisma.cart.create as jest.Mock).mockRejectedValue(conflictError);

      const result = await service.getOrCreateCart('__spec__student-1');
      expect(result.id).toBe('__spec__cart-1');
    });
  });

  describe('addItem()', () => {
    it('rejects a call with neither courseId nor projectId', async () => {
      await expect(service.addItem('__spec__student-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects adding an inactive course', async () => {
      (prisma.cart.findUnique as jest.Mock).mockResolvedValue(makeCartRow());
      (prisma.course.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__course-1',
        status: 'DRAFT',
      });

      await expect(
        service.addItem('__spec__student-1', '__spec__course-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects adding a course the student is already enrolled in', async () => {
      (prisma.cart.findUnique as jest.Mock).mockResolvedValue(makeCartRow());
      (prisma.course.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__course-1',
        status: 'ACTIVE',
      });
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__enroll-1' });

      await expect(
        service.addItem('__spec__student-1', '__spec__course-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('adds an active course not yet enrolled and returns the cart view', async () => {
      (prisma.cart.findUnique as jest.Mock).mockResolvedValue(makeCartRow());
      (prisma.course.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__course-1',
        status: 'ACTIVE',
      });
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.cartItem.upsert as jest.Mock).mockResolvedValue({});
      (prisma.cartItem.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.addItem('__spec__student-1', '__spec__course-1');

      expect(prisma.cartItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: { cartId: '__spec__cart-1', courseId: '__spec__course-1' },
        }),
      );
      expect(result.items).toEqual([]);
    });

    it('rejects adding an inactive project', async () => {
      (prisma.cart.findUnique as jest.Mock).mockResolvedValue(makeCartRow());
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__project-1',
        status: 'DRAFT',
      });

      await expect(
        service.addItem('__spec__student-1', undefined, '__spec__project-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeItem()', () => {
    it('throws 404 when the item was never in the cart', async () => {
      (prisma.cart.findUnique as jest.Mock).mockResolvedValue(makeCartRow());
      (prisma.cartItem.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      await expect(
        service.removeItem('__spec__student-1', '__spec__course-x'),
      ).rejects.toThrow(NotFoundException);
    });

    it('removes a present item and returns the refreshed cart view', async () => {
      (prisma.cart.findUnique as jest.Mock).mockResolvedValue(makeCartRow());
      (prisma.cartItem.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.cartItem.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.removeItem('__spec__student-1', '__spec__course-1');
      expect(result.items).toEqual([]);
    });
  });

  describe('getCartView() pricing math', () => {
    it('computes subtotal, GST and total from cart items in INR', async () => {
      (prisma.cart.findUnique as jest.Mock).mockResolvedValue(makeCartRow());
      (prisma.cartItem.findMany as jest.Mock).mockResolvedValue([
        {
          courseId: '__spec__course-1',
          projectId: null,
          course: {
            id: '__spec__course-1',
            title: '__spec__ Course',
            thumbnailUrl: null,
            price: decimal(1000),
            originalPrice: null,
            priceUsd: null,
            originalPriceUsd: null,
            category: 'Web',
            techStack: [],
            averageRating: 4.5,
            reviewCount: 10,
            _count: { sections: 2 },
            sections: [],
          },
          project: null,
        },
      ]);

      const result = await service.getCartView('__spec__student-1', 'INR' as any);

      expect(result.subtotal).toBe(1000);
      expect(result.gstPercent).toBe(18);
      expect(result.gstAmount).toBe(180);
      expect(result.total).toBe(1180);
    });

    it('applies a valid cart-level coupon discount before computing GST', async () => {
      (prisma.cart.findUnique as jest.Mock).mockResolvedValue(
        makeCartRow({ couponId: '__spec__coupon-1' }),
      );
      (prisma.cartItem.findMany as jest.Mock).mockResolvedValue([
        {
          courseId: '__spec__course-1',
          projectId: null,
          course: {
            id: '__spec__course-1',
            title: '__spec__ Course',
            thumbnailUrl: null,
            price: decimal(1000),
            originalPrice: null,
            priceUsd: null,
            originalPriceUsd: null,
            category: 'Web',
            techStack: [],
            averageRating: 4.5,
            reviewCount: 10,
            _count: { sections: 2 },
            sections: [],
          },
          project: null,
        },
      ]);
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__coupon-1',
        code: 'SAVE10',
        discountType: 'PERCENT',
        value: decimal(10),
      });
      couponService.validate.mockResolvedValue({
        coupon: { id: '__spec__coupon-1', code: 'SAVE10', discountType: 'PERCENT', value: 10 },
        discountAmount: 100,
      });

      const result = await service.getCartView('__spec__student-1', 'INR' as any);

      expect(result.discountAmount).toBe(100);
      expect(result.gstAmount).toBe(162); // 18% of (1000-100)
      expect(result.total).toBe(1062);
    });

    it('silently drops a coupon that no longer validates instead of failing the whole cart', async () => {
      (prisma.cart.findUnique as jest.Mock).mockResolvedValue(
        makeCartRow({ couponId: '__spec__coupon-1' }),
      );
      (prisma.cartItem.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__coupon-1',
        code: 'EXPIRED',
        discountType: 'PERCENT',
        value: decimal(10),
      });
      couponService.validate.mockRejectedValue(new BadRequestException('Coupon expired'));

      const result = await service.getCartView('__spec__student-1', 'INR' as any);
      expect(result.discountAmount).toBe(0);
    });
  });

  describe('applyCoupon()', () => {
    it('stores the validated coupon id on the cart and returns the computed totals', async () => {
      (prisma.cart.findUnique as jest.Mock).mockResolvedValue(makeCartRow());
      (prisma.cartItem.findMany as jest.Mock).mockResolvedValue([]);
      couponService.validate.mockResolvedValue({
        coupon: { id: '__spec__coupon-1', code: 'SAVE10', discountType: 'PERCENT', value: 10 },
        discountAmount: 0,
      });
      (prisma.cart.update as jest.Mock).mockResolvedValue({});

      const result = await service.applyCoupon('__spec__student-1', 'SAVE10');

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: '__spec__cart-1' },
        data: { couponId: '__spec__coupon-1' },
      });
      expect(result.coupon.code).toBe('SAVE10');
    });
  });

  describe('clearCoupon()', () => {
    it('clears couponId on the cart when one was applied', async () => {
      (prisma.cart.findUnique as jest.Mock).mockResolvedValue(
        makeCartRow({ couponId: '__spec__coupon-1' }),
      );
      (prisma.cart.update as jest.Mock).mockResolvedValue({});
      (prisma.cartItem.findMany as jest.Mock).mockResolvedValue([]);

      await service.clearCoupon('__spec__student-1');

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: '__spec__cart-1' },
        data: { couponId: null },
      });
    });

    it('is a no-op (no update call) when no coupon was applied', async () => {
      (prisma.cart.findUnique as jest.Mock).mockResolvedValue(makeCartRow());
      (prisma.cartItem.findMany as jest.Mock).mockResolvedValue([]);

      await service.clearCoupon('__spec__student-1');
      expect(prisma.cart.update).not.toHaveBeenCalled();
    });
  });
});
