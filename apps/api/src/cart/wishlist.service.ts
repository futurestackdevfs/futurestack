import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateWishlist(userId: string) {
    const existing = await this.prisma.wishlist.findUnique({
      where: { userId },
    });
    if (existing) return existing;
    try {
      return await this.prisma.wishlist.create({ data: { userId } });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') {
        const wishlist = await this.prisma.wishlist.findUnique({
          where: { userId },
        });
        if (wishlist) return wishlist;
      }
      throw e;
    }
  }

  async getWishlistView(userId: string) {
    const wishlist = await this.getOrCreateWishlist(userId);
    const items = await this.prisma.wishlistItem.findMany({
      where: { wishlistId: wishlist.id },
      include: {
        course: { select: { id: true, title: true, thumbnailUrl: true } },
      },
      orderBy: { addedAt: 'asc' },
    });

    const courseIds = items.map((i) => i.courseId);
    const priceRows =
      courseIds.length > 0
        ? await this.prisma.coursePrice.findMany({
            where: { courseId: { in: courseIds }, currency: 'INR' },
          })
        : [];
    const priceMap = new Map(
      priceRows.map((p) => [p.courseId, { price: p.amount, originalPrice: p.originalPrice }]),
    );

    return {
      items: items.map((i) => {
        const row = priceMap.get(i.courseId);
        const price = row?.price ?? null;
        const originalPrice = row?.originalPrice ?? null;
        let offPct = 0;
        if (originalPrice != null && price != null && originalPrice > price) {
          offPct = Math.min(99, Math.round(((originalPrice - price) / originalPrice) * 100));
        }
        return {
          courseId: i.courseId,
          title: i.course.title,
          thumbnail: i.course.thumbnailUrl,
          price,
          originalPrice,
          offPct,
          hasDiscount: offPct > 0,
          currency: 'INR',
        };
      }),
    };
  }

  async addItem(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, status: true },
    });
    if (!course || course.status !== 'ACTIVE')
      throw new NotFoundException('Course not found');

    const enrolled = await this.prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: userId, courseId } },
      select: { id: true },
    });
    if (enrolled)
      throw new ConflictException('You are already enrolled in this course');

    const wishlist = await this.getOrCreateWishlist(userId);
    await this.prisma.wishlistItem.upsert({
      where: { wishlistId_courseId: { wishlistId: wishlist.id, courseId } },
      create: { wishlistId: wishlist.id, courseId },
      update: {},
    });

    return this.getWishlistView(userId);
  }

  async removeItem(userId: string, courseId: string) {
    const wishlist = await this.getOrCreateWishlist(userId);
    const result = await this.prisma.wishlistItem.deleteMany({
      where: { wishlistId: wishlist.id, courseId },
    });
    if (result.count === 0) throw new NotFoundException('Item not in wishlist');
    return this.getWishlistView(userId);
  }

  /**
   * Atomic move: remove from wishlist + add to cart in one transaction.
   * 404 if the course isn't currently in the student's wishlist.
   */
  async moveToCart(userId: string, courseId: string) {
    const cart = await this.getOrCreateCart(userId);
    const wishlist = await this.getOrCreateWishlist(userId);

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.wishlistItem.findUnique({
        where: { wishlistId_courseId: { wishlistId: wishlist.id, courseId } },
        select: { id: true },
      });
      if (!item) throw new NotFoundException('Course is not in your wishlist');

      const enrolled = await tx.enrollment.findUnique({
        where: { studentId_courseId: { studentId: userId, courseId } },
        select: { id: true },
      });
      if (enrolled)
        throw new ConflictException('You are already enrolled in this course');

      await tx.wishlistItem.delete({ where: { id: item.id } });

      await tx.cart.upsert({
        where: { userId },
        create: { userId, items: { create: { courseId } } },
        update: {},
      });
      await tx.cartItem.upsert({
        where: { cartId_courseId: { cartId: cart.id, courseId } },
        create: { cartId: cart.id, courseId },
        update: {},
      });

      return { moved: true, courseId };
    });
  }

  private async getOrCreateCart(userId: string) {
    const existing = await this.prisma.cart.findUnique({ where: { userId } });
    if (existing) return existing;
    try {
      return await this.prisma.cart.create({ data: { userId } });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') {
        const cart = await this.prisma.cart.findUnique({ where: { userId } });
        if (cart) return cart;
      }
      throw e;
    }
  }
}
