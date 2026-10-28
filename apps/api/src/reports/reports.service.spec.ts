import { BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { buildRevenueReport } from './revenue.report';
import { buildRefundsReport } from './refunds.report';
import { parseRange } from './report-range.util';

// Fully mocked PrismaService — no live DB connection is ever opened by this file.
const dec = (n: number) => ({ toNumber: () => n });

function makePrismaMock() {
  return {
    order: { aggregate: jest.fn(), findMany: jest.fn() },
    refund: { aggregate: jest.fn(), findMany: jest.fn() },
    coupon: { findMany: jest.fn().mockResolvedValue([]) },
  } as unknown as PrismaService;
}

function order(over: Record<string, unknown> = {}) {
  return {
    id: 'abcdef1234',
    createdAt: new Date('2026-10-10T06:00:00Z'),
    status: 'PAID',
    subtotal: dec(1000),
    discountAmount: dec(0),
    couponId: null,
    gstPercent: dec(18),
    gstAmount: dec(180),
    totalAmount: dec(1180),
    razorpayOrderId: 'order_online',
    paymentMethod: 'upi',
    billingFullName: 'Stu',
    user: { name: 'Stu', email: 'stu@example.com' },
    invoices: [{ invoiceNumber: 'FS-202610-0001' }],
    items: [
      {
        priceAtPurchase: dec(1000),
        projectId: null,
        course: { title: 'React' },
        project: null,
      },
    ],
    ...over,
  };
}

describe('Revenue report', () => {
  const range = parseRange(
    '2026-10-01',
    '2026-10-31',
    new Date('2026-10-28T10:00:00Z'),
  );
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    // current period then previous period (called in that order by periodTotals)
    (prisma.order.aggregate as jest.Mock).mockResolvedValue({
      _sum: { totalAmount: dec(2000) },
      _count: { _all: 2 },
    });
    (prisma.refund.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amount: dec(500) },
    });
  });

  it('nets refunds off collected money and splits online vs cash', async () => {
    (prisma.order.findMany as jest.Mock).mockResolvedValue([
      order(),
      order({
        id: 'cash000001',
        razorpayOrderId: 'MANUAL-1',
        totalAmount: dec(820),
        subtotal: dec(695),
        gstAmount: dec(125),
        paymentMethod: 'Cash',
        invoices: [],
      }),
    ]);

    const r = await buildRevenueReport(prisma, range, 'INR');

    const kpi = (label: string) => r.kpis.find((k) => k.label === label)!;
    expect(kpi('Collected').value).toBe(2000);
    expect(kpi('Refunded').value).toBe(500);
    expect(kpi('Net revenue').value).toBe(1500);
    expect(kpi('Online').value).toBe(1180);
    expect(kpi('Cash / offline').value).toBe(820);
    expect(kpi('GST collected').value).toBe(305);
    expect(r.currency).toBe('INR');
  });

  it('compares with the previous period', async () => {
    (prisma.order.findMany as jest.Mock).mockResolvedValue([order()]);

    const r = await buildRevenueReport(prisma, range, 'INR');

    // both periods mocked identically → no change
    expect(r.kpis.find((k) => k.label === 'Collected')!.deltaPct).toBe(0);
  });

  it('puts each order in the chart bucket for the day it was placed (IST)', async () => {
    (prisma.order.findMany as jest.Mock).mockResolvedValue([order()]);

    const r = await buildRevenueReport(prisma, range, 'INR');

    const idx = r.chart!.labels.indexOf('10 Oct');
    expect(r.chart!.series[0].name).toBe('Online');
    expect(r.chart!.series[0].values[idx]).toBe(1180);
    expect(r.chart!.series[1].values[idx]).toBe(0);
    expect(r.chart!.labels).toHaveLength(31);
  });

  it('lists the invoice number and totals per order for the accountant', async () => {
    (prisma.order.findMany as jest.Mock).mockResolvedValue([order()]);

    const r = await buildRevenueReport(prisma, range, 'INR');

    const orders = r.tables.find((t) => t.title.startsWith('Orders'))!;
    expect(orders.rows[0]).toMatchObject({
      invoice: 'FS-202610-0001',
      total: 1180,
      gst: 180,
      mode: 'Online',
    });
  });

  it('reports what students actually paid per item, coupon cut included', async () => {
    (prisma.order.findMany as jest.Mock).mockResolvedValue([
      order({
        subtotal: dec(1000),
        discountAmount: dec(100),
        couponId: 'c1',
        gstAmount: dec(162),
        totalAmount: dec(1062),
      }),
    ]);
    (prisma.coupon.findMany as jest.Mock).mockResolvedValue([
      { id: 'c1', code: 'SAVE100' },
    ]);

    const r = await buildRevenueReport(prisma, range, 'INR');

    expect(r.tables[0].rows[0]).toMatchObject({
      name: 'React',
      units: 1,
      collected: 1062,
    });
    expect(r.tables[1].rows[0]).toMatchObject({
      code: 'SAVE100',
      orders: 1,
      discount: 100,
    });
  });

  it('warns when the order list was cut off', async () => {
    (prisma.order.findMany as jest.Mock).mockResolvedValue(
      Array.from({ length: 5001 }, (_, i) => order({ id: `id${i}00000` })),
    );

    const r = await buildRevenueReport(prisma, range, 'INR');

    expect(r.tables[2].rows).toHaveLength(5000);
    expect(r.notes.join(' ')).toContain('first 5000');
  });
});

describe('Refunds report', () => {
  const range = parseRange(
    '2026-10-01',
    '2026-10-31',
    new Date('2026-10-28T10:00:00Z'),
  );

  it('groups reasons together and times how long processing took', async () => {
    const prisma = makePrismaMock();
    const base = {
      orderId: 'ord12345678',
      student: { name: 'Stu', email: 's@example.com' },
      course: { title: 'React' },
      project: null,
      initiatedBy: { name: 'Admin' },
      createdAt: new Date('2026-10-10T00:00:00Z'),
    };
    (prisma.refund.findMany as jest.Mock).mockResolvedValue([
      {
        ...base,
        id: '1',
        amount: dec(1000),
        reason: 'Not satisfied',
        status: 'PROCESSED',
        processedAt: new Date('2026-10-10T10:00:00Z'),
      },
      {
        ...base,
        id: '2',
        amount: dec(500),
        reason: ' not  satisfied ',
        status: 'PENDING',
        processedAt: null,
      },
      {
        ...base,
        id: '3',
        amount: dec(200),
        reason: 'Duplicate',
        status: 'REJECTED',
        processedAt: null,
      },
    ]);
    (prisma.refund.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amount: dec(0) },
      _count: { _all: 0 },
    });

    const r = await buildRefundsReport(prisma, range, 'INR');

    const kpi = (l: string) => r.kpis.find((k) => k.label === l)!;
    expect(kpi('Refunded').value).toBe(1000);
    expect(kpi('Pending approval').value).toBe(1);
    expect(kpi('Rejected').value).toBe(1);
    expect(kpi('Avg time to process').value).toBe(10);
    const reasons = r.tables[0].rows;
    expect(reasons[0]).toMatchObject({ refunds: 2, amount: 1500 });
    expect(reasons).toHaveLength(2);
  });
});

describe('ReportsService.run()', () => {
  const svc = new ReportsService(makePrismaMock());

  it('rejects an unknown report', async () => {
    await expect(svc.run('nope', {})).rejects.toThrow(BadRequestException);
  });

  it('rejects a bad date', async () => {
    await expect(svc.run('revenue', { from: 'yesterday' })).rejects.toThrow(
      /YYYY-MM-DD/,
    );
  });

  it('lists every report in the catalog', () => {
    expect(svc.catalog().map((c) => c.type)).toEqual([
      'revenue',
      'enrollments',
      'refunds',
      'trainers',
      'sales',
      'support',
      'staff',
    ]);
  });
});
