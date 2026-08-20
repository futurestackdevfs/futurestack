import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { Cron } from '@nestjs/schedule';
import { Currency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CouponService } from '../coupon/coupon.service';
import { PaymentSettingsService } from '../payment-settings/payment-settings.service';
import {
  computeTrainerShare,
  resolveTrainerSharePercent,
} from '../payment-settings/share.util';
import { RazorpayClientService } from './razorpay-client.service';
import { CreateOrderDto } from './dto/create-order.dto';

interface FinalizeMeta {
  razorpayPaymentId: string;
  razorpaySignature?: string;
  paymentMethod?: string;
}

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayClient: RazorpayClientService,
    private readonly couponService: CouponService,
    private readonly paymentSettings: PaymentSettingsService,
  ) {}

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  /** Extracts a readable message from any thrown value — Razorpay SDK errors carry
   *  their details in `error.description`/`error.code` rather than a plain `.message`. */
  private describeError(e: unknown): string {
    if (e instanceof Error && e.message) return e.message;
    if (typeof e === 'object' && e !== null) {
      const rec = e as Record<string, unknown>;
      const inner = rec.error as Record<string, unknown> | undefined;
      const desc =
        (typeof inner?.description === 'string'
          ? inner.description
          : undefined) ??
        (typeof inner?.code === 'string' ? inner.code : undefined) ??
        (typeof rec.description === 'string' ? rec.description : undefined) ??
        (typeof rec.code === 'string' ? rec.code : undefined);
      if (desc) return desc;
      try {
        return JSON.stringify(e);
      } catch {
        /* ignore */
      }
    }
    return String(e);
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    const { currency } = dto;
    const billing = {
      billingFullName: dto.fullName,
      billingEmail: dto.email,
      billingPhone: dto.phone,
      billingAddress: dto.address,
      billingCity: dto.city,
      billingState: dto.state,
      billingPincode: dto.pincode,
    };
    // Gate on the admin-controlled PaymentSettings toggle so a disabled
    // currency can never reach Razorpay even if the frontend sends it.
    const settings = await this.paymentSettings.getSettings();
    if (currency === Currency.INR && !settings.domesticEnabled)
      throw new BadRequestException('INR payments are currently disabled');
    if (currency === Currency.USD && !settings.internationalEnabled)
      throw new BadRequestException('USD payments are currently disabled');

    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { course: { select: { status: true, price: true } } },
        },
      },
    });

    if (!cart || cart.items.length === 0)
      throw new BadRequestException('Cart is empty');

    // Re-check every item: still ACTIVE? still not already enrolled? Drop the
    // failing ones and surface them so the frontend can show the user.
    const dropped: { courseId: string; reason: string }[] = [];
    const kept: { itemId: string; courseId: string; price: number }[] = [];

    for (const item of cart.items) {
      if (item.course.status !== 'ACTIVE') {
        dropped.push({
          courseId: item.courseId,
          reason: 'Course is no longer available',
        });
        continue;
      }
      const enrolled = await this.prisma.enrollment.findUnique({
        where: {
          studentId_courseId: { studentId: userId, courseId: item.courseId },
        },
        select: { id: true },
      });
      if (enrolled) {
        dropped.push({
          courseId: item.courseId,
          reason: 'You are already enrolled in this course',
        });
        continue;
      }
      kept.push({
        itemId: item.id,
        courseId: item.courseId,
        price: item.course.price,
      });
    }

    if (dropped.length > 0) {
      await this.prisma.cartItem.deleteMany({
        where: {
          cartId: cart.id,
          courseId: { in: dropped.map((d) => d.courseId) },
        },
      });
      throw new ConflictException({
        message: 'Some items in your cart are no longer available',
        dropped,
      });
    }

    // Double-charge guard: never create a second open order while the user
    // still has a CREATED order for any of the same courses. Otherwise two
    // Razorpay orders could both be paid — the 2nd finalize would fail the
    // enrollment unique constraint, leaving money collected with no access.
    const openOrder = await this.prisma.order.findFirst({
      where: {
        userId,
        status: 'CREATED',
        items: { some: { courseId: { in: kept.map((k) => k.courseId) } } },
      },
      select: { id: true, totalAmount: true },
    });
    if (openOrder) {
      throw new ConflictException({
        message:
          'You already have a pending order for one of these courses. Complete or cancel it before placing another.',
        orderId: openOrder.id,
      });
    }

    // Live prices from CoursePrice rows — never trust the frontend.
    // Fall back to the course's base price when no row exists for the currency.
    const priceRows = await this.prisma.coursePrice.findMany({
      where: { courseId: { in: kept.map((k) => k.courseId) }, currency },
    });
    const priceMap = new Map(priceRows.map((p) => [p.courseId, p.amount]));

    // Non-INR orders MUST have an explicit CoursePrice row — the course's base
    // `price` is INR. Falling back here would silently charge the INR amount as
    // USD (e.g. ₹5,000 → $5,000), so fail loudly instead.
    const missingPriced = kept.filter((k) => !priceMap.has(k.courseId));
    if (currency !== Currency.INR && missingPriced.length > 0) {
      throw new BadRequestException(
        'Pricing is not configured for this course in the selected currency — please retry in INR or contact support',
      );
    }

    const coursePrice = (k: { courseId: string; price: number }) =>
      priceMap.get(k.courseId) ?? k.price;

    const subtotal = this.round2(
      kept.reduce((sum, k) => sum + Math.round(coursePrice(k) * 100), 0) / 100,
    );

    // Re-validate the applied coupon from scratch — it may have expired since
    // it was applied to the cart. If it's no longer valid, clear it and proceed
    // with the real (undiscounted) amount rather than silently charging the user
    // a discounted total that no longer applies.
    let couponId: string | null = null;
    let discountAmount = 0;
    if (cart.couponId) {
      const applied = await this.prisma.coupon.findUnique({
        where: { id: cart.couponId },
      });
      if (applied) {
        try {
          const result = await this.couponService.validate({
            code: applied.code,
            userId,
            currency,
            subtotal,
            courseIds: kept.map((k) => k.courseId),
          });
          couponId = result.coupon.id;
          discountAmount = result.discountAmount;
        } catch (e) {
          if (e instanceof BadRequestException) {
            couponId = null;
            discountAmount = 0;
            await this.prisma.cart.update({
              where: { id: cart.id },
              data: { couponId: null },
            });
          } else {
            throw e;
          }
        }
      } else {
        couponId = null;
      }
    }

    const totalBeforeGst = this.round2(subtotal - discountAmount);

    // GST is added on top (exclusive) of the discounted fee. The rate is the
    // admin-configurable PaymentSettings value and is snapshotted on the Order
    // so historical invoices stay accurate if the rate changes later.
    const gstPercent = settings.gstPercent ?? 18;
    const gstAmount = this.round2((totalBeforeGst * gstPercent) / 100);
    const totalAmount = this.round2(totalBeforeGst + gstAmount);

    // Razorpay rejects orders below ₹1 (100 paise). Surface a clear error
    // instead of a misleading "gateway unavailable" when a coupon zeroes out
    // the total — e.g. a 100% discount.
    if (totalAmount < 1) {
      throw new BadRequestException(
        'Order total must be at least ₹1 — try a smaller discount',
      );
    }

    // Single Razorpay account today — international payments arrive on the same
    // account later, so no branching on currency. Keep the schema field for
    // future-proofing but always record DOMESTIC for now.
    const gatewayType = 'DOMESTIC' as const;

    // Create Order + OrderItem[] (snapshotting priceAtPurchase) in one tx.
    // The order id is generated client-side (Prisma @default(uuid())) and used as
    // the initial razorpayOrderId so the NOT NULL unique column never collides
    // (e.g. two concurrent checkouts) — it is overwritten with the real Razorpay
    // order id below.
    const orderId = randomUUID();
    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          id: orderId,
          userId,
          currency,
          gatewayType,
          subtotal,
          discountAmount,
          couponId,
          gstPercent,
          gstAmount,
          totalAmount,
          razorpayOrderId: orderId,
          ...billing,
        },
      });
      await tx.orderItem.createMany({
        data: kept.map((k) => ({
          orderId: created.id,
          courseId: k.courseId,
          priceAtPurchase: coursePrice(k),
          currency,
        })),
      });
      return created;
    });

    // Call Razorpay. If it fails, roll back the local Order so we never leave an
    // orphaned CREATED order without a razorpayOrderId.
    let razorpayOrderId: string;
    try {
      const created = await this.razorpayClient.getClient().orders.create({
        amount: Math.round(totalAmount * 100),
        currency,
        receipt: order.id,
      });
      razorpayOrderId = created.id;
    } catch (e) {
      // Roll back the local Order so we never leave an orphaned CREATED order.
      await this.prisma.order.delete({ where: { id: order.id } });
      if (e instanceof ServiceUnavailableException) throw e;
      this.logger.error(
        `Razorpay order creation failed: ${this.describeError(e)}`,
      );
      throw new ServiceUnavailableException(
        'Payment gateway unavailable, please try again',
      );
    }

    const saved = await this.prisma.order.update({
      where: { id: order.id },
      data: { razorpayOrderId },
    });

    return {
      razorpayOrderId: saved.razorpayOrderId,
      amount: totalAmount,
      currency,
      keyId: this.razorpayClient.getKeyId(),
    };
  }

  async verifyPayment(
    userId: string,
    dto: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { razorpayOrderId: dto.razorpay_order_id },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId)
      throw new ForbiddenException('You are not allowed to verify this order');

    const expected = this.hmacSignature(
      this.razorpayClient.getKeySecret(),
      `${order.razorpayOrderId}|${dto.razorpay_payment_id}`,
    );
    if (!this.constantTimeEqual(expected, dto.razorpay_signature)) {
      this.logger.warn(
        `Payment signature mismatch for order ${order.id} (user ${userId}) — possible tampered signature`,
      );
      throw new BadRequestException('Payment verification failed');
    }

    return this.finalizeOrder(order.id, {
      razorpayPaymentId: dto.razorpay_payment_id,
      razorpaySignature: dto.razorpay_signature,
    });
  }

  /**
   * Shared idempotent finalization used by both /checkout/verify and the
   * payment.captured webhook. The row-level guard is the updateMany + WHERE
   * status:'CREATED' — only the first caller wins the transition to PAID.
   */
  async finalizeOrder(orderId: string, meta: FinalizeMeta) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: { id: orderId, status: 'CREATED' },
        data: {
          status: 'PAID',
          razorpayPaymentId: meta.razorpayPaymentId,
          razorpaySignature: meta.razorpaySignature,
          ...(meta.paymentMethod ? { paymentMethod: meta.paymentMethod } : {}),
        },
      });

      if (updated.count === 0) {
        // Already processed by the other path (verify or webhook) — safe no-op.
        // Still backfill the payment method if it arrived later (webhook after
        // frontend verify) so the trainer revenue view always shows UPI/Card.
        if (meta.paymentMethod) {
          await tx.order.updateMany({
            where: { id: orderId, paymentMethod: null },
            data: { paymentMethod: meta.paymentMethod },
          });
        }
        const existing = await tx.order.findUnique({
          where: { id: orderId },
          include: { enrollments: true },
        });
        return existing?.enrollments ?? [];
      }

      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order) return [];

      const settings = await this.paymentSettings.getSettings();

      const enrollments = await Promise.all(
        order.items.map(async (item) => {
          const course = await tx.course.findUnique({
            where: { id: item.courseId },
            select: {
              id: true,
              trainer: { select: { id: true, trainerSharePercent: true } },
            },
          });

          const created = await tx.enrollment.create({
            data: {
              studentId: order.userId,
              courseId: item.courseId,
              amountPaid: item.priceAtPurchase,
              orderId: order.id,
            },
          });

          if (course?.trainer) {
            const sharePct = resolveTrainerSharePercent(
              course.trainer.trainerSharePercent,
              settings.trainerSharePercent,
            );
            const { trainerShare, platformCut } = computeTrainerShare(
              item.priceAtPurchase,
              sharePct,
            );
            await tx.revenueLedger.create({
              data: {
                trainerId: course.trainer.id,
                enrollmentId: created.id,
                gross: item.priceAtPurchase,
                platformCut,
                trainerShare,
              },
            });
          }

          return created;
        }),
      );

      if (order.couponId) {
        await tx.coupon.update({
          where: { id: order.couponId },
          data: { usedCount: { increment: 1 } },
        });
        await tx.couponRedemption.create({
          data: {
            couponId: order.couponId,
            userId: order.userId,
            orderId: order.id,
          },
        });
      }

      await tx.cart.update({
        where: { userId: order.userId },
        data: { items: { deleteMany: {} }, couponId: null },
      });

      /* Auto-attribution: this student paid online. If they have an active
         (unconverted) lead owned by a salesperson — matched by linked
         studentId or email — credit the order to that salesperson and
         auto-convert the lead. Pure online sales (no lead) stay unassigned. */
      if (order.salespersonId === null) {
        const user = await tx.user.findUnique({
          where: { id: order.userId },
          select: { email: true },
        });
        const lead = await tx.lead.findFirst({
          where: {
            status: { in: ['New', 'Interested'] },
            OR: [
              { studentId: order.userId },
              ...(user?.email ? [{ email: user.email }] : []),
            ],
          },
          orderBy: { createdAt: 'asc' },
        });
        if (lead && lead.salespersonId) {
          await tx.order.update({
            where: { id: order.id },
            data: { salespersonId: lead.salespersonId },
          });
          await tx.lead.update({
            where: { id: lead.id },
            data: {
              studentId: order.userId,
              status: 'Converted',
              score: 100,
              orderId: order.id,
              lastContact: new Date(),
              nextFollowUp: null,
            },
          });
        }
      }

      return enrollments;
    });
  }

  /** Handles a parsed Razorpay webhook event. Never throws to the caller. */
  async handleWebhookEvent(event: Record<string, any>) {
    try {
      const type = event?.event as string | undefined;
      const payload = event?.payload as
        | {
            payment?: {
              entity?: {
                id?: string;
                order_id?: string;
                payment_signature?: string;
                method?: string;
              };
            };
          }
        | undefined;
      const entity = payload?.payment?.entity;
      const razorpayOrderId = entity?.order_id;
      if (!razorpayOrderId) return;

      const order = await this.prisma.order.findUnique({
        where: { razorpayOrderId },
      });
      if (!order) {
        this.logger.warn(`Webhook for unknown order ${razorpayOrderId}`);
        return;
      }

      if (type === 'payment.captured') {
        await this.finalizeOrder(order.id, {
          razorpayPaymentId: entity?.id ?? '',
          razorpaySignature: entity?.payment_signature ?? undefined,
          paymentMethod: entity?.method ?? undefined,
        });
      } else if (type === 'payment.failed') {
        await this.prisma.order.updateMany({
          where: { id: order.id, status: 'CREATED' },
          data: { status: 'FAILED' },
        });
      }
    } catch (e) {
      this.logger.error(`Webhook processing error: ${(e as Error).message}`);
    }
  }

  private hmacSignature(secret: string, message: string): string {
    return createHmac('sha256', secret).update(message).digest('hex');
  }

  private constantTimeEqual(expectedHex: string, provided: string): boolean {
    if (!/^[a-f0-9]{64}$/i.test(provided)) return false;
    const a = Buffer.from(expectedHex, 'hex');
    const b = Buffer.from(provided, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /**
   * Mark an unpaid CREATED order as CANCELLED when the student aborts the
   * payment gateway. Idempotent: only the CREATED → CANCELLED transition is
   * applied, so a paid/failed/expired order is never touched.
   */
  async cancelOrder(userId: string, razorpayOrderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { razorpayOrderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId)
      throw new ForbiddenException('You are not allowed to cancel this order');

    const updated = await this.prisma.order.updateMany({
      where: { id: order.id, status: 'CREATED' },
      data: { status: 'CANCELLED' },
    });
    return { cancelled: updated.count > 0 };
  }

  /**
   * Hourly cleanup: mark any order still CREATED after 2 hours as EXPIRED.
   * (Razorpay orders the user never paid for / abandoned.)
   */
  @Cron('0 * * * *')
  async expireStaleOrders() {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = await this.prisma.order.updateMany({
      where: {
        status: 'CREATED',
        createdAt: { lt: cutoff },
      },
      data: { status: 'EXPIRED' },
    });
    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} stale order(s)`);
    }
  }
}
