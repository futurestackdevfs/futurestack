import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../prisma/prisma.service';
import { decimal } from '../test-utils/fixtures';

// Fully mocked PrismaService — no live DB connection is ever opened by this file.
function makePrismaMock() {
  return {
    invoice: {
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    order: { findUnique: jest.fn() },
  } as unknown as PrismaService;
}

function makeOrderRow(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: '__spec__order-1',
    user: { id: '__spec__student-1' },
    subtotal: decimal(10000),
    gstPercent: decimal(18),
    gstAmount: decimal(1800),
    discountAmount: decimal(500),
    totalAmount: decimal(11300),
    billingFullName: '__spec__ Student',
    billingEmail: 'student@example.com',
    billingPhone: '9999999999',
    billingAddress: 'Addr',
    billingCity: 'City',
    billingState: 'State',
    billingPincode: '123456',
    ...overrides,
  };
}

function makeInvoiceRow(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: '__spec__invoice-1',
    invoiceNumber: 'FS-202609-0001',
    orderId: '__spec__order-1',
    userId: '__spec__student-1',
    subtotal: decimal(10000),
    gstPercent: decimal(18),
    gstAmount: decimal(1800),
    discountAmount: decimal(500),
    totalAmount: decimal(11300),
    ...overrides,
  };
}

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new InvoicesService(prisma);
  });

  describe('toPlainInvoice() Decimal-strip behavior (via public methods)', () => {
    it('createInvoice() returns a freshly created invoice with plain-number money fields', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(makeOrderRow());
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
      (prisma.invoice.create as jest.Mock).mockResolvedValue(makeInvoiceRow());

      const result = await service.createInvoice('__spec__order-1');

      expect(result.subtotal).toBe(10000);
      expect(typeof result.subtotal).toBe('number');
      expect(result.gstPercent).toBe(18);
      expect(result.gstAmount).toBe(1800);
      expect(result.discountAmount).toBe(500);
      expect(result.totalAmount).toBe(11300);
    });

    it('createInvoice() converts Decimals even on the idempotent "already exists" path', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(makeOrderRow());
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(makeInvoiceRow());

      const result = await service.createInvoice('__spec__order-1');

      expect(result.totalAmount).toBe(11300);
      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });

    it('createInvoice() throws 404 for a missing order', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.createInvoice('__spec__missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('getInvoiceByOrder() converts nested Order + OrderItem Decimal fields too', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(
        makeInvoiceRow({
          order: {
            subtotal: decimal(10000),
            gstPercent: decimal(18),
            gstAmount: decimal(1800),
            discountAmount: decimal(500),
            totalAmount: decimal(11300),
            items: [
              { priceAtPurchase: decimal(10000), course: { id: 'c1', title: 'Course' } },
            ],
          },
        }),
      );

      const result = await service.getInvoiceByOrder('__spec__order-1');

      expect(result.order!.subtotal).toBe(10000);
      expect(typeof result.order!.totalAmount).toBe('number');
      expect(result.order!.items![0].priceAtPurchase).toBe(10000);
      expect(typeof result.order!.items![0].priceAtPurchase).toBe('number');
    });

    it('getInvoiceByOrder() throws 404 when the invoice does not exist', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getInvoiceByOrder('__spec__missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('getInvoiceByOrder() forbids a student reading someone else\'s invoice', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(
        makeInvoiceRow({ userId: '__spec__other-student' }),
      );

      await expect(
        service.getInvoiceByOrder('__spec__order-1', {
          id: '__spec__student-1',
          role: 'STUDENT',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('getInvoiceByOrder() allows staff to read any invoice regardless of userId', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(
        makeInvoiceRow({ userId: '__spec__other-student' }),
      );

      const result = await service.getInvoiceByOrder('__spec__order-1', {
        id: '__spec__admin-1',
        role: 'ADMIN',
      });
      expect(result.totalAmount).toBe(11300);
    });

    it('getInvoiceByOrder() allows the owning student to read their own invoice', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(
        makeInvoiceRow({ userId: '__spec__student-1' }),
      );

      const result = await service.getInvoiceByOrder('__spec__order-1', {
        id: '__spec__student-1',
        role: 'STUDENT',
      });
      expect(result.totalAmount).toBe(11300);
    });

    it('listInvoices() converts Decimal fields for every row in the page', async () => {
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([
        makeInvoiceRow(),
        makeInvoiceRow({ id: '__spec__invoice-2', totalAmount: decimal(5000) }),
      ]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(2);

      const result = await service.listInvoices(1, 20);

      expect(result.invoices).toHaveLength(2);
      expect(result.invoices[0].totalAmount).toBe(11300);
      expect(result.invoices[1].totalAmount).toBe(5000);
      expect(result.total).toBe(2);
    });
  });

  describe('generateInvoiceNumber()', () => {
    it('formats the sequence number zero-padded to 4 digits', async () => {
      (prisma.invoice.count as jest.Mock).mockResolvedValue(41);

      const number = await service.generateInvoiceNumber();
      expect(number).toMatch(/^FS-\d{6}-0042$/);
    });
  });
});
