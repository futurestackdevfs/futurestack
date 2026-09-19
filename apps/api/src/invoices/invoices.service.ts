import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Converts Invoice's Decimal money columns — and its nested Order/OrderItem
   *  Decimal columns, when included — to plain numbers right at the DB read
   *  boundary, so JSON responses keep serializing numbers, not Decimal strings. */
  private toPlainInvoice<
    T extends {
      subtotal: { toNumber(): number };
      gstPercent: { toNumber(): number };
      gstAmount: { toNumber(): number };
      discountAmount: { toNumber(): number };
      totalAmount: { toNumber(): number };
      order?: {
        subtotal: { toNumber(): number };
        gstPercent: { toNumber(): number };
        gstAmount: { toNumber(): number };
        discountAmount: { toNumber(): number };
        totalAmount: { toNumber(): number };
        items?: { priceAtPurchase: { toNumber(): number } }[];
        [key: string]: any;
      };
    },
  >(invoice: T) {
    return {
      ...invoice,
      subtotal: invoice.subtotal.toNumber(),
      gstPercent: invoice.gstPercent.toNumber(),
      gstAmount: invoice.gstAmount.toNumber(),
      discountAmount: invoice.discountAmount.toNumber(),
      totalAmount: invoice.totalAmount.toNumber(),
      ...(invoice.order && {
        order: {
          ...invoice.order,
          subtotal: invoice.order.subtotal.toNumber(),
          gstPercent: invoice.order.gstPercent.toNumber(),
          gstAmount: invoice.order.gstAmount.toNumber(),
          discountAmount: invoice.order.discountAmount.toNumber(),
          totalAmount: invoice.order.totalAmount.toNumber(),
          ...(invoice.order.items && {
            items: invoice.order.items.map((i) => ({
              ...i,
              priceAtPurchase: i.priceAtPurchase.toNumber(),
            })),
          }),
        },
      }),
    };
  }

  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await this.prisma.invoice.count();
    const seq = String(count + 1).padStart(4, '0');
    return `FS-${year}${month}-${seq}`;
  }

  async createInvoice(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { id: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    const existing = await this.prisma.invoice.findUnique({ where: { orderId } });
    if (existing) return this.toPlainInvoice(existing);

    const invoiceNumber = await this.generateInvoiceNumber();

    const created = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        orderId,
        userId: order.user.id,
        subtotal: order.subtotal,
        gstPercent: order.gstPercent,
        gstAmount: order.gstAmount,
        discountAmount: order.discountAmount,
        totalAmount: order.totalAmount,
        billingFullName: order.billingFullName,
        billingEmail: order.billingEmail,
        billingPhone: order.billingPhone,
        billingAddress: order.billingAddress,
        billingCity: order.billingCity,
        billingState: order.billingState,
        billingPincode: order.billingPincode,
      },
    });
    return this.toPlainInvoice(created);
  }

  async getInvoiceByOrder(
    orderId: string,
    requester?: { id: string; role: string },
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { orderId },
      include: {
        order: {
          include: {
            items: {
              include: { course: { select: { id: true, title: true } } },
            },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    // A student may only read their own invoice (it carries full billing
    // name / email / phone / address). Staff roles are unrestricted.
    if (
      requester &&
      requester.role === 'STUDENT' &&
      invoice.userId !== requester.id
    ) {
      throw new ForbiddenException('You cannot access this invoice');
    }

    return this.toPlainInvoice(invoice);
  }

  async listInvoices(page = 1, perPage = 20) {
    const skip = (page - 1) * perPage;
    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        skip,
        take: perPage,
        orderBy: { issuedAt: 'desc' },
        include: {
          order: {
            include: {
              items: { include: { course: { select: { id: true, title: true } } } },
            },
          },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.invoice.count(),
    ]);

    return {
      invoices: invoices.map((i) => this.toPlainInvoice(i)),
      total,
      page,
      perPage,
      pageCount: Math.ceil(total / perPage),
    };
  }
}
