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
    paymentSettings: { findFirst: jest.fn().mockResolvedValue({ refundEtaDays: 7 }) },
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
    sendRefundRejectedEmail: jest.fn().mockResolvedValue(undefined),
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
    currency: 'INR',
    subtotal: decimal(4999),
    discountAmount: decimal(0),
    gstPercent: decimal(0),
    gstAmount: decimal(0),
    totalAmount: decimal(4999),
    refunds: [],
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

describe('RefundService#createRefund — refunds what the student actually paid', () => {
  function stubRefundWrites(tx: any, razorpayClient: any, capturedPaise: number) {
    tx.refund.create.mockImplementation(async ({ data }: any) => ({
      id: '__spec__refund-paid',
      status: 'PROCESSED',
      razorpayRefundId: 'rfnd_paid',
      amount: decimal(data.amount),
      processedAt: new Date(),
    }));
    tx.revenueLedger.findUnique.mockResolvedValue(null);
    tx.enrollment.update.mockResolvedValue({});
    tx.order.update.mockResolvedValue({});
    tx.enrollment.findMany = jest.fn().mockResolvedValue([]);
    tx.orderItem.findMany = jest.fn().mockResolvedValue([]);
    const client = razorpayClient.getClient() as any;
    client.payments.fetch.mockResolvedValue({ amount: capturedPaise });
    client.payments.refund.mockResolvedValue({ id: 'rfnd_paid' });
    (razorpayClient.getClient as jest.Mock).mockReturnValue(client);
    return client;
  }

  it('defaults to the amount paid after the coupon cut, GST included — not the list price', async () => {
    const { service, prisma, razorpayClient, tx, mailService } = setup();
    // ₹5000 course, ₹1000 coupon, 18% GST → paid (5000 − 1000) × 1.18 = ₹4720
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(
      makeOrder({
        subtotal: decimal(5000),
        discountAmount: decimal(1000),
        gstPercent: decimal(18),
        gstAmount: decimal(720),
        totalAmount: decimal(4720),
        items: [
          {
            id: '__spec__item-1',
            courseId: '__spec__course-react',
            projectId: null,
            priceAtPurchase: decimal(5000),
            course: { id: '__spec__course-react', title: '__spec__ React Bootcamp' },
            project: null,
          },
        ],
      }),
    );
    (prisma.refund.findFirst as jest.Mock).mockResolvedValue(null);
    const client = stubRefundWrites(tx, razorpayClient, 472000);

    const result = await service.createRefund(
      { orderId: '__spec__order-1', courseId: '__spec__course-react', reason: 'requested' } as any,
      '__spec__admin-1',
    );

    expect(result.amount).toBe(4720);
    expect(client.payments.refund).toHaveBeenCalledWith('pay_abc123', expect.objectContaining({ amount: 472000 }));
    expect(result.estimatedBy).toBeInstanceOf(Date);

    // the email carries the real expected date (from the admin's setting), not a hard-coded "5-7 days"
    expect(mailService.sendRefundProcessedEmail).toHaveBeenCalledWith(
      '__spec__asha@example.com',
      expect.objectContaining({
        refundAmount: 4720,
        currency: 'INR',
        etaDays: 7,
        expectedBy: result.estimatedBy,
        orderId: expect.stringMatching(/^FS-/),
      }),
    );
  });

  it('refuses to refund more than the student paid (list price when a coupon was used)', async () => {
    const { service, prisma } = setup();
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(
      makeOrder({
        subtotal: decimal(5000),
        discountAmount: decimal(1000),
        totalAmount: decimal(4000),
        items: [
          {
            id: '__spec__item-1',
            courseId: '__spec__course-react',
            projectId: null,
            priceAtPurchase: decimal(5000),
            course: { id: '__spec__course-react', title: 'x' },
            project: null,
          },
        ],
      }),
    );
    (prisma.refund.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.createRefund(
        { orderId: '__spec__order-1', courseId: '__spec__course-react', amount: 5000, reason: 'x' } as any,
        '__spec__admin-1',
      ),
    ).rejects.toThrow(/exceeds ₹4000/);
  });

  it('previewRefund returns the breakdown and expected credit date without touching Razorpay', async () => {
    const { service, prisma, razorpayClient } = setup();
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(
      makeOrder({
        subtotal: decimal(5000),
        discountAmount: decimal(1000),
        gstPercent: decimal(18),
        totalAmount: decimal(4720),
        items: [
          {
            id: '__spec__item-1',
            courseId: '__spec__course-react',
            projectId: null,
            priceAtPurchase: decimal(5000),
            course: { id: '__spec__course-react', title: 'x' },
            project: null,
          },
        ],
      }),
    );

    const preview = await service.previewRefund({ orderId: '__spec__order-1', courseId: '__spec__course-react' });

    expect(preview.breakdown).toEqual({ itemPrice: 5000, couponDiscount: 1000, gstAmount: 720, paid: 4720 });
    expect(preview.refundAmount).toBe(4720);
    expect(preview.etaDays).toBe(7);
    expect(razorpayClient.getClient).not.toHaveBeenCalled();
  });
});

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
    ).rejects.toThrow(/exceeds ₹4999/);
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

  it('refuses a cash / offline (MANUAL-) order — those are refunded manually, outside the system', async () => {
    const { service, prisma, razorpayClient, tx } = setup();
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(
      makeOrder({ razorpayOrderId: 'MANUAL-cash-1', razorpayPaymentId: null }),
    );

    await expect(
      service.createRefund(
        { orderId: '__spec__order-1', courseId: '__spec__course-react', amount: 4999, reason: 'cash refund' } as any,
        '__spec__admin-1',
      ),
    ).rejects.toThrow(/cash .* offline payment/);

    await expect(
      service.previewRefund({ orderId: '__spec__order-1', courseId: '__spec__course-react' }),
    ).rejects.toThrow(/cash .* offline payment/);

    expect(razorpayClient.getClient).not.toHaveBeenCalled();
    expect(tx.refund.create).not.toHaveBeenCalled();
  });
});

describe('RefundService#rejectRefund', () => {
  const pending = (overrides: Record<string, unknown> = {}) => ({
    id: 'ref-1',
    status: 'PENDING',
    amount: decimal(4720),
    student: { name: 'Asha Rao', email: 'asha@example.com' },
    course: { title: 'React Bootcamp' },
    project: null,
    order: { id: 'abcd1234-aaaa-bbbb-cccc-000000000001', currency: 'INR' },
    ...overrides,
  });

  it('rejects a pending refund and tells the student', async () => {
    const { service, prisma, mailService } = setup();
    (prisma as any).refund.findUnique = jest.fn().mockResolvedValue(pending());
    (prisma as any).refund.update = jest.fn().mockResolvedValue({ id: 'ref-1', status: 'REJECTED' });

    const result = await service.rejectRefund('ref-1');

    expect(result).toEqual({ refundId: 'ref-1', status: 'REJECTED' });
    expect(mailService.sendRefundRejectedEmail).toHaveBeenCalledWith('asha@example.com', {
      name: 'Asha Rao',
      itemName: 'React Bootcamp',
      amount: 4720,
      currency: 'INR',
      orderRef: 'FS-ABCD1234',
    });
  });

  it('sends nothing when the refund cannot be rejected', async () => {
    const { service, prisma, mailService } = setup();
    (prisma as any).refund.findUnique = jest.fn().mockResolvedValue(pending({ status: 'PROCESSED' }));

    await expect(service.rejectRefund('ref-1')).rejects.toThrow(/only PENDING/);
    expect(mailService.sendRefundRejectedEmail).not.toHaveBeenCalled();
  });
});
