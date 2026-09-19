import { BadRequestException, ConflictException } from '@nestjs/common';
import { decimal } from '../test-utils/fixtures';
import { RefundService } from './refund.service';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayClientService } from '../checkout/razorpay-client.service';
import { MailService } from '../mail/mail.service';

// Everything here is fully mocked: no real Prisma client and, crucially, no
// real RazorpayClientService — `payments.refund` / `payments.fetch` below are
// jest.fn() stand-ins, so this suite never calls the live Razorpay API.
function setup() {
  const tx = {
    refund: { create: jest.fn() },
    enrollment: { update: jest.fn() },
    revenueLedger: { findUnique: jest.fn(), delete: jest.fn() },
    orderItem: { update: jest.fn() },
    order: { update: jest.fn() },
  };

  const prisma = {
    order: { findUnique: jest.fn() },
    refund: { findFirst: jest.fn() },
    $transaction: jest.fn(async (cb: any) => cb(tx)),
  } as unknown as PrismaService;

  const razorpayClient = {
    getClient: jest.fn(() => ({
      payments: {
        refund: jest.fn(),
        fetch: jest.fn(),
      },
    })),
  } as unknown as RazorpayClientService;

  const mailService = {
    sendRefundProcessedEmail: jest.fn().mockResolvedValue(undefined),
  } as unknown as MailService;

  const service = new RefundService(prisma, razorpayClient, mailService);
  return { service, prisma, razorpayClient, mailService, tx };
}

function makeOrder(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: '__spec__order-1',
    userId: '__spec__student-1',
    status: 'PAID',
    razorpayOrderId: 'order_abc123',
    razorpayPaymentId: 'pay_abc123',
    items: [
      {
        id: '__spec__item-1',
        courseId: '__spec__course-react',
        projectId: null,
        priceAtPurchase: decimal(4999),
        course: { id: '__spec__course-react', title: '__spec__ React Bootcamp' },
        project: null,
      },
    ],
    user: { id: '__spec__student-1', name: '__spec__ Asha Rao', email: '__spec__asha@example.com' },
    enrollments: [{ id: '__spec__enr-1', courseId: '__spec__course-react', status: 'active' }],
    ...overrides,
  };
}

describe('RefundService#createRefund', () => {
  it('rejects when neither courseId nor projectId is given', async () => {
    const { service, prisma } = setup();
    prisma.order.findUnique = jest.fn() as any;

    await expect(
      service.createRefund(
        { orderId: '__spec__order-1', amount: 100, reason: 'test' } as any,
        '__spec__admin-1',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.order.findUnique).not.toHaveBeenCalled();
  });

  it('rejects refunding an order that is not PAID', async () => {
    const { service, prisma } = setup();
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(makeOrder({ status: 'CREATED' }));

    await expect(
      service.createRefund(
        { orderId: '__spec__order-1', courseId: '__spec__course-react', amount: 100, reason: 'x' } as any,
        '__spec__admin-1',
      ),
    ).rejects.toThrow(/only PAID orders can be refunded/);
  });

  it('rejects a refund amount greater than what was actually paid for that item', async () => {
    const { service, prisma } = setup();
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(makeOrder());

    await expect(
      service.createRefund(
        { orderId: '__spec__order-1', courseId: '__spec__course-react', amount: 9999, reason: 'x' } as any,
        '__spec__admin-1',
      ),
    ).rejects.toThrow(/exceeds item price/);
  });

  it('rejects a duplicate refund for a course that was already refunded on this order', async () => {
    const { service, prisma } = setup();
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(makeOrder());
    (prisma.refund.findFirst as jest.Mock).mockResolvedValue({ id: '__spec__refund-existing' });

    await expect(
      service.createRefund(
        { orderId: '__spec__order-1', courseId: '__spec__course-react', amount: 4999, reason: 'x' } as any,
        '__spec__admin-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('revokes the enrollment and deletes the matching revenue-ledger row when a course is refunded', async () => {
    const { service, prisma, razorpayClient, tx } = setup();
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(makeOrder());
    (prisma.refund.findFirst as jest.Mock).mockResolvedValue(null);
    tx.refund.create.mockResolvedValue({
      id: '__spec__refund-1',
      status: 'PROCESSED',
      razorpayRefundId: 'rfnd_1',
      amount: decimal(4999),
    });
    tx.revenueLedger.findUnique.mockResolvedValue({ enrollmentId: '__spec__enr-1' });
    tx.enrollment.update.mockResolvedValue({});
    tx.revenueLedger.delete.mockResolvedValue({});
    tx.order.update.mockResolvedValue({});

    const client = razorpayClient.getClient() as any;
    client.payments.fetch.mockResolvedValue({ amount: 499900 }); // paise, matches priceAtPurchase
    client.payments.refund.mockResolvedValue({ id: 'rfnd_1' });
    (razorpayClient.getClient as jest.Mock).mockReturnValue(client);

    tx.orderItem = { update: jest.fn() } as any;
    // simulate the "all courses refunded" follow-up queries used inside the tx
    (tx as any).enrollment.findMany = jest.fn().mockResolvedValue([
      { id: '__spec__enr-1', courseId: '__spec__course-react', status: 'refunded' },
    ]);
    (tx as any).orderItem.findMany = jest.fn().mockResolvedValue([]);

    const result = await service.createRefund(
      { orderId: '__spec__order-1', courseId: '__spec__course-react', amount: 4999, reason: 'requested' } as any,
      '__spec__admin-1',
    );

    expect(result.refundId).toBe('__spec__refund-1');
    expect(tx.enrollment.update).toHaveBeenCalledWith({
      where: { id: '__spec__enr-1' },
      data: { status: 'refunded' },
    });
    expect(tx.revenueLedger.delete).toHaveBeenCalledWith({
      where: { enrollmentId: '__spec__enr-1' },
    });
    // Every write above happened through `tx`, never through the bare `prisma`
    // client — asserting this is the whole point of the anti-leak safety rule.
    expect((prisma as any).enrollment).toBeUndefined();
    expect((prisma as any).revenueLedger).toBeUndefined();
  });

  it('marks the order REFUNDED once every course/project on it has been refunded', async () => {
    const { service, prisma, razorpayClient, tx } = setup();
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(makeOrder());
    (prisma.refund.findFirst as jest.Mock).mockResolvedValue(null);
    tx.refund.create.mockResolvedValue({
      id: '__spec__refund-2',
      status: 'PROCESSED',
      razorpayRefundId: 'rfnd_2',
      amount: decimal(4999),
    });
    tx.revenueLedger.findUnique.mockResolvedValue(null);
    tx.enrollment.update.mockResolvedValue({});
    tx.order.update.mockResolvedValue({});
    (tx as any).orderItem = { update: jest.fn() };
    (tx as any).enrollment.findMany = jest.fn().mockResolvedValue([
      { id: '__spec__enr-1', courseId: '__spec__course-react', status: 'refunded' },
    ]);
    (tx as any).orderItem.findMany = jest.fn().mockResolvedValue([]);

    const client = razorpayClient.getClient() as any;
    client.payments.fetch.mockResolvedValue({ amount: 499900 });
    client.payments.refund.mockResolvedValue({ id: 'rfnd_2' });
    (razorpayClient.getClient as jest.Mock).mockReturnValue(client);

    await service.createRefund(
      { orderId: '__spec__order-1', courseId: '__spec__course-react', amount: 4999, reason: 'requested' } as any,
      '__spec__admin-1',
    );

    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: '__spec__order-1' },
      data: { status: 'REFUNDED' },
    });
  });

  it('rejects when the requested refund exceeds the amount actually captured by Razorpay', async () => {
    const { service, prisma, razorpayClient } = setup();
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(makeOrder());
    (prisma.refund.findFirst as jest.Mock).mockResolvedValue(null);
    const client = razorpayClient.getClient() as any;
    client.payments.fetch.mockResolvedValue({ amount: 100000 }); // only ₹1000 captured
    (razorpayClient.getClient as jest.Mock).mockReturnValue(client);

    await expect(
      service.createRefund(
        { orderId: '__spec__order-1', courseId: '__spec__course-react', amount: 4999, reason: 'x' } as any,
        '__spec__admin-1',
      ),
    ).rejects.toThrow(/exceeds captured amount/);
    expect(client.payments.refund).not.toHaveBeenCalled();
  });

  it('never calls Razorpay for a MANUAL- order and still processes the refund locally', async () => {
    const { service, prisma, razorpayClient, tx } = setup();
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(
      makeOrder({ razorpayOrderId: 'MANUAL-cash-1', razorpayPaymentId: null }),
    );
    (prisma.refund.findFirst as jest.Mock).mockResolvedValue(null);
    tx.refund.create.mockResolvedValue({
      id: '__spec__refund-manual',
      status: 'PROCESSED',
      razorpayRefundId: null,
      amount: decimal(4999),
    });
    tx.revenueLedger.findUnique.mockResolvedValue(null);
    tx.enrollment.update.mockResolvedValue({});
    tx.order.update.mockResolvedValue({});
    (tx as any).orderItem = { update: jest.fn() };
    (tx as any).enrollment.findMany = jest.fn().mockResolvedValue([]);
    (tx as any).orderItem.findMany = jest.fn().mockResolvedValue([]);

    const result = await service.createRefund(
      { orderId: '__spec__order-1', courseId: '__spec__course-react', amount: 4999, reason: 'cash refund' } as any,
      '__spec__admin-1',
    );

    expect(result.razorpayRefundId).toBeNull();
    const client = razorpayClient.getClient() as any;
    expect(client.payments.refund).not.toHaveBeenCalled();
    expect(client.payments.fetch).not.toHaveBeenCalled();
  });
});
