import { BadRequestException, ConflictException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicesService } from '../invoices/invoices.service';
import { computeRefundBreakdown } from '../refund/refund-amount.util';

// Fully mocked PrismaService / InvoicesService — no live DB connection is opened.
const price = { toNumber: () => 4999 };

function makePrismaMock() {
  const tx = {
    order: { create: jest.fn().mockResolvedValue({}), update: jest.fn() },
    enrollment: {
      create: jest
        .fn()
        .mockImplementation(
          async ({ data }: { data: { orderId: string } }) => ({
            id: 'enr-1',
            status: 'active',
            enrolledAt: new Date('2026-10-28T00:00:00Z'),
            orderId: data.orderId,
            student: { id: 'stu', name: 'Stu', email: 'stu@example.com' },
            course: { id: 'crs', title: 'React' },
          }),
        ),
      delete: jest.fn(),
    },
  };
  return {
    tx,
    prisma: {
      user: { findUnique: jest.fn(), update: jest.fn() },
      course: { findUnique: jest.fn() },
      project: { findUnique: jest.fn() },
      enrollment: { findUnique: jest.fn() },
      order: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      orderItem: { findFirst: jest.fn(), updateMany: jest.fn() },
      $transaction: jest.fn(async (arg: unknown) =>
        typeof arg === 'function'
          ? (arg as (t: typeof tx) => unknown)(tx)
          : Promise.all(arg as unknown[]),
      ),
    } as unknown as PrismaService,
  };
}

describe('AdminService — gift (manual) enrollment', () => {
  let service: AdminService;
  let prisma: PrismaService;
  let tx: ReturnType<typeof makePrismaMock>['tx'];
  let invoices: { createInvoice: jest.Mock };
  let mail: { sendGiftEnrollmentEmail: jest.Mock; sendTrainerApprovedEmail: jest.Mock; sendTrainerRejectedEmail: jest.Mock };

  beforeEach(() => {
    const m = makePrismaMock();
    prisma = m.prisma;
    tx = m.tx;
    invoices = {
      createInvoice: jest
        .fn()
        .mockResolvedValue({ invoiceNumber: 'FS-202610-0042' }),
    };
    mail = {
      sendGiftEnrollmentEmail: jest.fn().mockResolvedValue(undefined),
      sendTrainerApprovedEmail: jest.fn().mockResolvedValue(undefined),
      sendTrainerRejectedEmail: jest.fn().mockResolvedValue(undefined),
    };
    service = new AdminService(
      prisma,
      {} as never,
      mail as never,
      {} as never,
      {} as never,
      {} as never,
      invoices as unknown as InvoicesService,
    );
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'stu',
      role: 'STUDENT',
      name: 'Stu',
      email: 'stu@example.com',
      phone: '9999999999',
    });
    (prisma.course.findUnique as jest.Mock).mockResolvedValue({
      id: 'crs',
      price,
    });
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(null);
  });

  it('records a PAID order at the course price with a 100% GIFT discount, so ₹0 is charged', async () => {
    await service.manualEnroll('stu', { courseId: 'crs' });

    const order = tx.order.create.mock.calls[0][0].data;
    expect(order.status).toBe('PAID');
    expect(order.subtotal).toBe(price);
    expect(order.discountAmount).toBe(price);
    expect(order.totalAmount).toBe(0);
    expect(order.gstAmount).toBe(0);
    expect(order.discountReason).toBe('GIFT');
    expect(order.paymentMethod).toBe('Gift');
    expect(order.razorpayOrderId).toMatch(/^MANUAL-GIFT-/);
    expect(order.items.create).toMatchObject({
      courseId: 'crs',
      priceAtPurchase: price,
    });
    expect(order.billingEmail).toBe('stu@example.com');
  });

  it('links the enrollment to that order with nothing paid', async () => {
    const res = await service.manualEnroll('stu', { courseId: 'crs' });

    const enr = tx.enrollment.create.mock.calls[0][0].data;
    expect(enr.amountPaid).toBe(0);
    expect(enr.orderId).toBe(res.orderId);
    expect(res).toMatchObject({
      giftCode: 'GIFT',
      amountPaid: 0,
      invoiceNumber: 'FS-202610-0042',
    });
  });

  it('issues an invoice for the order', async () => {
    const res = await service.manualEnroll('stu', { courseId: 'crs' });
    expect(invoices.createInvoice).toHaveBeenCalledWith(res.orderId);
  });

  it('still enrolls the student if the invoice cannot be created', async () => {
    invoices.createInvoice.mockRejectedValue(new Error('db hiccup'));

    const res = await service.manualEnroll('stu', { courseId: 'crs' });

    expect(res.id).toBe('enr-1');
    expect(res.invoiceNumber).toBeNull();
  });

  it('rejects a non-student, an unknown course and a duplicate enrollment', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'x',
      role: 'TRAINER',
    });
    await expect(
      service.manualEnroll('x', { courseId: 'crs' }),
    ).rejects.toThrow(BadRequestException);

    (prisma.course.findUnique as jest.Mock).mockResolvedValueOnce(null);
    await expect(
      service.manualEnroll('stu', { courseId: 'nope' }),
    ).rejects.toThrow(/Course not found/);

    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'already',
    });
    await expect(
      service.manualEnroll('stu', { courseId: 'crs' }),
    ).rejects.toThrow(ConflictException);
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it('turns a race on the unique enrollment key into a conflict', async () => {
    (prisma.$transaction as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error('dup'), { code: 'P2002' }),
    );
    await expect(
      service.manualEnroll('stu', { courseId: 'crs' }),
    ).rejects.toThrow(ConflictException);
  });

  it('cancels the ₹0 order when a gift is withdrawn, but leaves a real order alone', async () => {
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'enr-1',
      order: { id: 'ord-1', razorpayOrderId: 'MANUAL-GIFT-ord-1' },
    });
    await service.unenroll('enr-1');
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 'ord-1' },
      data: { status: 'CANCELLED' },
    });

    tx.order.update.mockClear();
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'enr-2',
      order: { id: 'ord-2', razorpayOrderId: 'order_paid_online' },
    });
    await service.unenroll('enr-2');
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it('works out a gift item as ₹0 paid for the student — nothing is refundable', () => {
    const b = computeRefundBreakdown(
      { subtotal: 4999, discountAmount: 4999, gstPercent: 0 },
      { priceAtPurchase: 4999, projectId: null },
    );
    expect(b.paid).toBe(0);
    expect(b.couponDiscount).toBe(4999);
  });

  describe('gifting a project', () => {
    beforeEach(() => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'prj',
        name: 'Chat App',
        price,
      });
      (prisma.orderItem.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.order.create as jest.Mock).mockImplementation(
        async ({ data }: { data: { id: string } }) => ({
          id: data.id,
          createdAt: new Date('2026-10-28T00:00:00Z'),
        }),
      );
    });

    it('records a PAID order at the project price with a 100% GIFT discount and an active ₹0 item', async () => {
      const res = await service.manualEnroll('stu', { projectId: 'prj' });

      const order = (prisma.order.create as jest.Mock).mock.calls[0][0].data;
      expect(order).toMatchObject({
        status: 'PAID',
        totalAmount: 0,
        discountReason: 'GIFT',
        paymentMethod: 'Gift',
      });
      expect(order.subtotal).toBe(price);
      expect(order.discountAmount).toBe(price);
      // projects store the price after discount — that is ₹0 for a gift
      expect(order.items.create).toMatchObject({
        projectId: 'prj',
        priceAtPurchase: 0,
        status: 'active',
      });
      expect(res).toMatchObject({
        kind: 'project',
        giftCode: 'GIFT',
        courseTitle: 'Chat App',
        invoiceNumber: 'FS-202610-0042',
      });
      expect(invoices.createInvoice).toHaveBeenCalledWith(res.orderId);
    });

    it('does not gift a project the student already has', async () => {
      (prisma.orderItem.findFirst as jest.Mock).mockResolvedValue({ id: 'oi' });
      await expect(
        service.manualEnroll('stu', { projectId: 'prj' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('rejects an unknown project', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.manualEnroll('stu', { projectId: 'nope' }),
      ).rejects.toThrow(/Project not found/);
    });

    it('needs exactly one of course or project', async () => {
      await expect(service.manualEnroll('stu', {})).rejects.toThrow(
        /either a course or a project/,
      );
      await expect(
        service.manualEnroll('stu', { courseId: 'crs', projectId: 'prj' }),
      ).rejects.toThrow(/either a course or a project/);
    });

    it('withdraws a gifted project by cancelling its order and item', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'ord',
        razorpayOrderId: 'MANUAL-GIFT-ord',
      });

      await service.withdrawGiftedProject('ord');

      expect(prisma.orderItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderId: 'ord', projectId: { not: null } },
          data: { status: 'cancelled' },
        }),
      );
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'ord' },
        data: { status: 'CANCELLED' },
      });
    });

    it('refuses to withdraw a real (paid) order through the gift route', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'ord',
        razorpayOrderId: 'order_paid',
      });
      await expect(service.withdrawGiftedProject('ord')).rejects.toThrow(
        /not found/,
      );
      expect(prisma.order.update).not.toHaveBeenCalled();
    });
  });

  describe('emails', () => {
    it('tells the student about a gifted course (name, code, invoice number)', async () => {
      await service.manualEnroll('stu', { courseId: 'crs' });

      expect(mail.sendGiftEnrollmentEmail).toHaveBeenCalledWith('stu@example.com', {
        name: 'Stu',
        itemName: 'React',
        kind: 'course',
        giftCode: 'GIFT',
        invoiceNumber: 'FS-202610-0042',
      });
    });

    it('does not email when the gift is refused (already enrolled)', async () => {
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'already' });
      await expect(service.manualEnroll('stu', { courseId: 'crs' })).rejects.toThrow(ConflictException);
      expect(mail.sendGiftEnrollmentEmail).not.toHaveBeenCalled();
    });

    it('emails the trainer when approved, and when rejected — with the reason', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'tr', role: 'TRAINER', approvalStatus: 'PENDING', name: 'Tina', email: 'tina@example.com',
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: 'tr', name: 'Tina', email: 'tina@example.com' });

      await service.approveTrainer('tr');
      expect(mail.sendTrainerApprovedEmail).toHaveBeenCalledWith('tina@example.com', { name: 'Tina' });

      await service.rejectTrainer('tr', 'Need more teaching experience');
      expect(mail.sendTrainerRejectedEmail).toHaveBeenCalledWith('tina@example.com', {
        name: 'Tina',
        reason: 'Need more teaching experience',
      });
    });
  });
});
