import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

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
    if (existing) return existing;

    const invoiceNumber = await this.generateInvoiceNumber();

    return this.prisma.invoice.create({
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
  }

  async getInvoiceByOrder(orderId: string) {
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
    return invoice;
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
      invoices,
      total,
      page,
      perPage,
      pageCount: Math.ceil(total / perPage),
    };
  }
}
