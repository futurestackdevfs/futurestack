import { BadRequestException, ConflictException } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { decimal } from '../test-utils/fixtures';
import { CheckoutService } from './checkout.service';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayClientService } from './razorpay-client.service';
import { CouponService } from '../coupon/coupon.service';
import { PaymentSettingsService } from '../payment-settings/payment-settings.service';

/*
 * The Razorpay SDK is never touched for real in this file — `orders.create`
 * below is a jest.fn(), so createOrder() exercises only the real DB-side
 * price/GST/coupon math and never reaches the live payment gateway.
 */
function setup() {
  const tx = {
    order: { create: jest.fn() },
    orderItem: { createMany: jest.fn(), updateMany: jest.fn() },
  };

  const prisma = {
    cart: { findUnique: jest.fn(), update: jest.fn() },
    enrollment: { findUnique: jest.fn() },
    cartItem: { deleteMany: jest.fn() },
    order: { findFirst: jest.fn(), update: jest.fn(), delete: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn() },
    coupon: { findUnique: jest.fn(), update: jest.fn() },
    couponRedemption: { create: jest.fn() },
    revenueLedger: { create: jest.fn() },
    course: { findUnique: jest.fn() },
    lead: { findFirst: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    cart_: null,
    $transaction: jest.fn(async (cb: any) => cb(tx)),
  } as unknown as PrismaService;

  const razorpayOrdersCreate = jest.fn();
  const razorpayClient = {
    getClient: jest.fn(() => ({ orders: { create: razorpayOrdersCreate } })),
    getKeyId: jest.fn(() => 'rzp_test_key'),
  } as unknown as RazorpayClientService;

  const couponService = {
    validate: jest.fn(),
  } as unknown as CouponService;

  const paymentSettings = {
    getSettings: jest.fn().mockResolvedValue({
      domesticEnabled: true,
      internationalEnabled: true,
      usdRate: 84,
      gstPercent: 18,
      gstPercentUsd: 0,
      trainerSharePercent: 70,
    }),
  } as unknown as PaymentSettingsService;

  const service = new CheckoutService(prisma, razorpayClient, couponService, paymentSettings);
  return { service, prisma, razorpayClient, razorpayOrdersCreate, couponService, paymentSettings, tx };
}

function makeCart(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: '__spec__cart-1',
    userId: '__spec__student-1',
    couponId: null,
    items: [
      {
        id: '__spec__item-1',
        courseId: '__spec__course-react',
        projectId: null,
        course: { status: 'ACTIVE', price: decimal(4999), priceUsd: decimal(59) },
        project: null,
      },
    ],
    ...overrides,
  };
}

describe('CheckoutService#createOrder — pricing, GST, coupons, currency', () => {
  it('computes subtotal + 18% GST for an INR order with no coupon', async () => {
    const { service, prisma, tx, razorpayOrdersCreate } = setup();
    (prisma.cart.findUnique as jest.Mock).mockResolvedValue(makeCart());
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);
    tx.order.create.mockResolvedValue({ id: '__spec__order-new' });
    tx.orderItem.createMany.mockResolvedValue({});
    razorpayOrdersCreate.mockResolvedValue({ id: 'order_rzp_1' });
    (prisma.order.update as jest.Mock).mockResolvedValue({ razorpayOrderId: 'order_rzp_1' });

    const result = await service.createOrder('__spec__student-1', {
      currency: Currency.INR,
      fullName: '__spec__ Rohan Mehta',
      email: '__spec__rohan@example.com',
      phone: '9999999999',
      address: '1 MG Road',
      city: 'Pune',
      state: 'MH',
      pincode: '411001',
      country: 'IN',
    } as any);

    expect(result.amount).toBe(5898.82); // 4999 + 18% GST = 5898.82
    expect(result.currency).toBe(Currency.INR);
    expect(tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotal: 4999,
          discountAmount: 0,
          gstPercent: 18,
          totalAmount: 5898.82,
        }),
      }),
    );
  });

  it('charges the admin-set USD price directly and applies the 0% export GST rate', async () => {
    const { service, prisma, tx, razorpayOrdersCreate } = setup();
    (prisma.cart.findUnique as jest.Mock).mockResolvedValue(makeCart());
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);
    tx.order.create.mockResolvedValue({ id: '__spec__order-usd' });
    tx.orderItem.createMany.mockResolvedValue({});
    razorpayOrdersCreate.mockResolvedValue({ id: 'order_rzp_2' });
    (prisma.order.update as jest.Mock).mockResolvedValue({ razorpayOrderId: 'order_rzp_2' });

    const result = await service.createOrder('__spec__student-1', {
      currency: Currency.USD,
      fullName: '__spec__ Global Student',
      email: '__spec__global@example.com',
      phone: '+15551234567',
      address: '1 Main St',
      city: 'Austin',
      state: 'TX',
      pincode: '78701',
      country: 'US',
    } as any);

    expect(result.amount).toBe(59);
    expect(tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ gstPercent: 0, totalAmount: 59 }),
      }),
    );
  });

  it('rejects INR checkout when the admin has disabled domestic payments', async () => {
    const { service, prisma, paymentSettings } = setup();
    (paymentSettings.getSettings as jest.Mock).mockResolvedValue({
      domesticEnabled: false,
      internationalEnabled: true,
      usdRate: 84,
      gstPercent: 18,
      gstPercentUsd: 0,
    });

    await expect(
      service.createOrder('__spec__student-1', { currency: Currency.INR } as any),
    ).rejects.toThrow('INR payments are currently disabled');
    expect(prisma.cart.findUnique).not.toHaveBeenCalled();
  });

  it('applies a valid coupon discount before computing GST', async () => {
    const { service, prisma, tx, razorpayOrdersCreate, couponService } = setup();
    (prisma.cart.findUnique as jest.Mock).mockResolvedValue(
      makeCart({ couponId: '__spec__coupon-1' }),
    );
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.coupon.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__coupon-1', code: 'SAVE1000' });
    (couponService.validate as jest.Mock).mockResolvedValue({
      coupon: { id: '__spec__coupon-1' },
      discountAmount: 1000,
    });
    tx.order.create.mockResolvedValue({ id: '__spec__order-coupon' });
    tx.orderItem.createMany.mockResolvedValue({});
    razorpayOrdersCreate.mockResolvedValue({ id: 'order_rzp_3' });
    (prisma.order.update as jest.Mock).mockResolvedValue({ razorpayOrderId: 'order_rzp_3' });

    const result = await service.createOrder('__spec__student-1', {
      currency: Currency.INR,
    } as any);

    // subtotal 4999 - 1000 discount = 3999, +18% GST = 4718.82
    expect(result.amount).toBe(4718.82);
    expect(tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ discountAmount: 1000, couponId: '__spec__coupon-1' }),
      }),
    );
  });

  it('silently drops an expired/invalid coupon and charges full price instead of failing checkout', async () => {
    const { service, prisma, tx, razorpayOrdersCreate, couponService } = setup();
    (prisma.cart.findUnique as jest.Mock).mockResolvedValue(
      makeCart({ couponId: '__spec__coupon-expired' }),
    );
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.coupon.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__coupon-expired', code: 'OLD' });
    (couponService.validate as jest.Mock).mockRejectedValue(new BadRequestException('This coupon has expired'));
    (prisma.cart.update as jest.Mock).mockResolvedValue({});
    tx.order.create.mockResolvedValue({ id: '__spec__order-nocoupon' });
    tx.orderItem.createMany.mockResolvedValue({});
    razorpayOrdersCreate.mockResolvedValue({ id: 'order_rzp_4' });
    (prisma.order.update as jest.Mock).mockResolvedValue({ razorpayOrderId: 'order_rzp_4' });

    const result = await service.createOrder('__spec__student-1', { currency: Currency.INR } as any);

    expect(result.amount).toBe(5898.82); // full price, no discount applied
    expect(prisma.cart.update).toHaveBeenCalledWith({
      where: { id: '__spec__cart-1' },
      data: { couponId: null },
    });
  });

  it('rejects checkout when the resulting total falls below the gateway minimum (e.g. a 100% coupon)', async () => {
    const { service, prisma, couponService } = setup();
    (prisma.cart.findUnique as jest.Mock).mockResolvedValue(
      makeCart({ couponId: '__spec__coupon-100' }),
    );
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.coupon.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__coupon-100', code: 'FREE100' });
    (couponService.validate as jest.Mock).mockResolvedValue({
      coupon: { id: '__spec__coupon-100' },
      discountAmount: 4999, // 100% off
    });

    await expect(
      service.createOrder('__spec__student-1', { currency: Currency.INR } as any),
    ).rejects.toThrow(/at least/);
  });

  it('blocks a second checkout while a CREATED order already exists for the same course', async () => {
    const { service, prisma } = setup();
    (prisma.cart.findUnique as jest.Mock).mockResolvedValue(makeCart());
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.order.findFirst as jest.Mock).mockResolvedValue({ id: '__spec__order-open', totalAmount: decimal(5898.82) });

    await expect(
      service.createOrder('__spec__student-1', { currency: Currency.INR } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('rolls back the local Order if the Razorpay order.create call fails', async () => {
    const { service, prisma, tx, razorpayOrdersCreate } = setup();
    (prisma.cart.findUnique as jest.Mock).mockResolvedValue(makeCart());
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);
    tx.order.create.mockResolvedValue({ id: '__spec__order-fail' });
    tx.orderItem.createMany.mockResolvedValue({});
    razorpayOrdersCreate.mockRejectedValue(new Error('gateway timeout'));
    (prisma.order.delete as jest.Mock).mockResolvedValue({});

    await expect(
      service.createOrder('__spec__student-1', { currency: Currency.INR } as any),
    ).rejects.toThrow('Payment gateway unavailable, please try again');

    expect(prisma.order.delete).toHaveBeenCalledWith({ where: { id: '__spec__order-fail' } });
  });
});

describe('CheckoutService#finalizeOrder — idempotency', () => {
  it('processes a CREATED order exactly once, creating one enrollment', async () => {
    const { service, prisma, tx } = setup();
    (tx as any).order.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    (tx as any).order.findUnique = jest.fn().mockResolvedValue({
      id: '__spec__order-fin',
      userId: '__spec__student-1',
      couponId: null,
      salespersonId: null,
      items: [{ courseId: '__spec__course-react', priceAtPurchase: decimal(4999) }],
    });
    (tx as any).course = { findUnique: jest.fn().mockResolvedValue({ id: '__spec__course-react', trainer: null }) };
    (tx as any).enrollment = { create: jest.fn().mockResolvedValue({ id: '__spec__enr-new' }) };
    (tx as any).orderItem.updateMany = jest.fn().mockResolvedValue({});
    (tx as any).cart = { update: jest.fn().mockResolvedValue({}) };
    (tx as any).user = { findUnique: jest.fn().mockResolvedValue({ email: '__spec__student@example.com' }) };
    (tx as any).lead = { findFirst: jest.fn().mockResolvedValue(null) };

    const enrollments = await service.finalizeOrder('__spec__order-fin', {
      razorpayPaymentId: 'pay_1',
    });

    expect(enrollments).toHaveLength(1);
    expect((tx as any).order.updateMany).toHaveBeenCalledWith({
      where: { id: '__spec__order-fin', status: 'CREATED' },
      data: expect.objectContaining({ status: 'PAID' }),
    });
    expect((tx as any).enrollment.create).toHaveBeenCalledTimes(1);
  });

  it('does not double-process (no second enrollment, no double revenue row) when finalize is called twice', async () => {
    const { service, prisma, tx } = setup();
    // Second call: the WHERE status:'CREATED' guard matches nothing.
    (tx as any).order.updateMany = jest.fn().mockResolvedValue({ count: 0 });
    (tx as any).order.findUnique = jest.fn().mockResolvedValue({
      id: '__spec__order-fin2',
      userId: '__spec__student-1',
      enrollments: [{ id: '__spec__enr-existing', courseId: '__spec__course-react' }],
    });

    const enrollments = await service.finalizeOrder('__spec__order-fin2', {
      razorpayPaymentId: 'pay_1',
    });

    expect(enrollments).toEqual([{ id: '__spec__enr-existing', courseId: '__spec__course-react' }]);
    expect((tx as any).enrollment?.create).toBeUndefined(); // never wired up, never called
  });
});
