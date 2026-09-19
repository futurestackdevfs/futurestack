import { ConflictException, NotFoundException } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { PrismaService } from '../prisma/prisma.service';
import { decimal } from '../test-utils/fixtures';

// Fully mocked PrismaService — no live DB connection is ever opened by this file.
function makePrismaMock() {
  return {
    wishlist: { findUnique: jest.fn(), create: jest.fn() },
    wishlistItem: { findMany: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    course: { findUnique: jest.fn() },
    enrollment: { findUnique: jest.fn() },
    cart: { findUnique: jest.fn(), create: jest.fn(), upsert: jest.fn() },
    cartItem: { upsert: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
}

function makeWishlistRow(overrides: Partial<Record<string, any>> = {}) {
  return { id: '__spec__wishlist-1', userId: '__spec__student-1', ...overrides };
}

describe('WishlistService', () => {
  let service: WishlistService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new WishlistService(prisma);
  });

  describe('getOrCreateWishlist()', () => {
    it('returns the existing wishlist without creating a new one', async () => {
      (prisma.wishlist.findUnique as jest.Mock).mockResolvedValue(makeWishlistRow());

      const result = await service.getOrCreateWishlist('__spec__student-1');
      expect(result.id).toBe('__spec__wishlist-1');
      expect(prisma.wishlist.create).not.toHaveBeenCalled();
    });

    it('recovers from a concurrent-create race (P2002)', async () => {
      (prisma.wishlist.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeWishlistRow());
      (prisma.wishlist.create as jest.Mock).mockRejectedValue({ code: 'P2002' });

      const result = await service.getOrCreateWishlist('__spec__student-1');
      expect(result.id).toBe('__spec__wishlist-1');
    });
  });

  describe('addItem()', () => {
    it('rejects adding a course that is not ACTIVE', async () => {
      (prisma.course.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__course-1',
        status: 'DRAFT',
      });

      await expect(
        service.addItem('__spec__student-1', '__spec__course-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects adding a course the student is already enrolled in', async () => {
      (prisma.course.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__course-1',
        status: 'ACTIVE',
      });
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__enroll-1' });

      await expect(
        service.addItem('__spec__student-1', '__spec__course-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('adds a valid course to the wishlist', async () => {
      (prisma.course.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__course-1',
        status: 'ACTIVE',
      });
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.wishlist.findUnique as jest.Mock).mockResolvedValue(makeWishlistRow());
      (prisma.wishlistItem.upsert as jest.Mock).mockResolvedValue({});
      (prisma.wishlistItem.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.addItem('__spec__student-1', '__spec__course-1');
      expect(result.items).toEqual([]);
    });
  });

  describe('removeItem()', () => {
    it('throws 404 when the course is not in the wishlist', async () => {
      (prisma.wishlist.findUnique as jest.Mock).mockResolvedValue(makeWishlistRow());
      (prisma.wishlistItem.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      await expect(
        service.removeItem('__spec__student-1', '__spec__course-x'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getWishlistView() discount computation', () => {
    it('computes offPct from price vs originalPrice', async () => {
      (prisma.wishlist.findUnique as jest.Mock).mockResolvedValue(makeWishlistRow());
      (prisma.wishlistItem.findMany as jest.Mock).mockResolvedValue([
        {
          courseId: '__spec__course-1',
          course: {
            title: '__spec__ Course',
            thumbnailUrl: null,
            price: decimal(800),
            originalPrice: decimal(1000),
          },
        },
      ]);

      const result = await service.getWishlistView('__spec__student-1');
      expect(result.items[0].price).toBe(800);
      expect(result.items[0].offPct).toBe(20);
      expect(result.items[0].hasDiscount).toBe(true);
    });
  });

  describe('moveToCart()', () => {
    it('throws 404 when the course is not in the wishlist', async () => {
      (prisma.cart.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__cart-1' });
      (prisma.wishlist.findUnique as jest.Mock).mockResolvedValue(makeWishlistRow());
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) =>
        fn({
          wishlistItem: { findUnique: jest.fn().mockResolvedValue(null) },
          enrollment: { findUnique: jest.fn() },
          cart: { upsert: jest.fn() },
          cartItem: { upsert: jest.fn() },
        }),
      );

      await expect(
        service.moveToCart('__spec__student-1', '__spec__course-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects moving a course the student is already enrolled in', async () => {
      (prisma.cart.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__cart-1' });
      (prisma.wishlist.findUnique as jest.Mock).mockResolvedValue(makeWishlistRow());
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) =>
        fn({
          wishlistItem: {
            findUnique: jest.fn().mockResolvedValue({ id: '__spec__item-1' }),
          },
          enrollment: { findUnique: jest.fn().mockResolvedValue({ id: '__spec__enroll-1' }) },
          cart: { upsert: jest.fn() },
          cartItem: { upsert: jest.fn() },
        }),
      );

      await expect(
        service.moveToCart('__spec__student-1', '__spec__course-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('atomically removes from wishlist and adds to cart', async () => {
      (prisma.cart.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__cart-1' });
      (prisma.wishlist.findUnique as jest.Mock).mockResolvedValue(makeWishlistRow());
      const txDelete = jest.fn();
      const txCartItemUpsert = jest.fn();
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) =>
        fn({
          wishlistItem: {
            findUnique: jest.fn().mockResolvedValue({ id: '__spec__item-1' }),
            delete: txDelete,
          },
          enrollment: { findUnique: jest.fn().mockResolvedValue(null) },
          cart: { upsert: jest.fn() },
          cartItem: { upsert: txCartItemUpsert },
        }),
      );

      const result = await service.moveToCart('__spec__student-1', '__spec__course-1');

      expect(txDelete).toHaveBeenCalledWith({ where: { id: '__spec__item-1' } });
      expect(txCartItemUpsert).toHaveBeenCalled();
      expect(result).toEqual({ moved: true, courseId: '__spec__course-1' });
    });
  });
});
