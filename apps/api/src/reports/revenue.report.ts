import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { computeRefundBreakdown } from '../refund/refund-amount.util';
import { paymentMethodLabel, paymentModeOf } from '../common/payment-mode.util';
import { GIFT_CODE, isGiftOrder } from '../common/gift.util';
import {
  DateRange,
  bucketKey,
  bucketKeys,
  bucketKind,
  bucketLabel,
  deltaPct,
  previousRange,
  round2,
} from './report-range.util';
import { Report, ReportCurrency, ROW_CAP } from './report.types';

/** Orders whose money actually reached us (refunds are taken off separately). */
const COLLECTED_STATUSES: Prisma.OrderWhereInput['status'] = {
  in: ['PAID', 'REFUND_REQUESTED', 'REFUNDED'],
};

async function periodTotals(
  prisma: PrismaService,
  range: DateRange,
  currency: ReportCurrency,
) {
  const [orders, refunds] = await Promise.all([
    prisma.order.aggregate({
      where: {
        status: COLLECTED_STATUSES,
        currency,
        // ₹0 gift enrollments are not sales — keep them out of the order count and average.
        totalAmount: { gt: 0 },
        createdAt: { gte: range.from, lte: range.to },
      },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.refund.aggregate({
      where: {
        status: 'PROCESSED',
        processedAt: { gte: range.from, lte: range.to },
        order: { is: { currency } },
      },
      _sum: { amount: true },
    }),
  ]);
  const collected = orders._sum.totalAmount?.toNumber() ?? 0;
  const refunded = refunds._sum.amount?.toNumber() ?? 0;
  return {
    collected: round2(collected),
    refunded: round2(refunded),
    net: round2(collected - refunded),
    orders: orders._count._all,
  };
}

export async function buildRevenueReport(
  prisma: PrismaService,
  range: DateRange,
  currency: ReportCurrency,
): Promise<Report> {
  const [prev, orders] = await Promise.all([
    periodTotals(prisma, previousRange(range), currency),
    prisma.order.findMany({
      where: {
        status: COLLECTED_STATUSES,
        currency,
        createdAt: { gte: range.from, lte: range.to },
      },
      orderBy: { createdAt: 'asc' },
      take: ROW_CAP + 1,
      select: {
        id: true,
        createdAt: true,
        status: true,
        subtotal: true,
        discountAmount: true,
        couponId: true,
        gstPercent: true,
        gstAmount: true,
        totalAmount: true,
        razorpayOrderId: true,
        paymentMethod: true,
        billingFullName: true,
        user: { select: { name: true, email: true } },
        invoices: { select: { invoiceNumber: true }, take: 1 },
        items: {
          select: {
            priceAtPurchase: true,
            projectId: true,
            course: { select: { title: true } },
            project: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const truncated = orders.length > ROW_CAP;
  const rows = truncated ? orders.slice(0, ROW_CAP) : orders;

  const couponIds = [
    ...new Set(rows.map((o) => o.couponId).filter((c): c is string => !!c)),
  ];
  const coupons = couponIds.length
    ? await prisma.coupon.findMany({
        where: { id: { in: couponIds } },
        select: { id: true, code: true },
      })
    : [];
  const couponCode = new Map(coupons.map((c) => [c.id, c.code]));

  // The refunds table is the source of truth for money returned in this period.
  const cur = await periodTotals(prisma, range, currency);

  let gst = 0;
  let discounts = 0;
  let online = 0;
  let cash = 0;
  let gifted = 0;
  let giftedValue = 0;
  const kind = bucketKind(range);
  const keys = bucketKeys(range, kind);
  const onlineBy = new Map(keys.map((k) => [k, 0]));
  const cashBy = new Map(keys.map((k) => [k, 0]));
  const byItem = new Map<
    string,
    { name: string; type: string; units: number; collected: number }
  >();
  const byCoupon = new Map<
    string,
    { code: string; orders: number; discount: number }
  >();

  const orderRows = rows.map((o) => {
    const total = o.totalAmount.toNumber();
    const mode = paymentModeOf(o);
    const gift = isGiftOrder(o);
    if (gift) gifted += 1;
    const key = bucketKey(o.createdAt, kind);
    gst += o.gstAmount.toNumber();
    // A gift's 100% discount is not a sales discount — track what was given away separately.
    if (gift) giftedValue += o.discountAmount.toNumber();
    else discounts += o.discountAmount.toNumber();
    if (gift) {
      // ₹0 — appears in the order list for invoice continuity, not in the money split.
    } else if (mode === 'ONLINE') {
      online += total;
      onlineBy.set(key, (onlineBy.get(key) ?? 0) + total);
    } else {
      cash += total;
      cashBy.set(key, (cashBy.get(key) ?? 0) + total);
    }

    const orderForMath = {
      subtotal: o.subtotal.toNumber(),
      discountAmount: o.discountAmount.toNumber(),
      gstPercent: o.gstPercent.toNumber(),
    };
    for (const it of gift ? [] : o.items) {
      const name = it.course?.title ?? it.project?.name ?? 'Unknown item';
      const type = it.projectId ? 'Project' : 'Course';
      const paid = computeRefundBreakdown(orderForMath, {
        priceAtPurchase: it.priceAtPurchase.toNumber(),
        projectId: it.projectId,
      }).paid;
      const k = `${type}:${name}`;
      const e = byItem.get(k) ?? { name, type, units: 0, collected: 0 };
      e.units += 1;
      e.collected += paid;
      byItem.set(k, e);
    }

    const code = o.couponId
      ? (couponCode.get(o.couponId) ?? 'deleted coupon')
      : null;
    if (code) {
      const e = byCoupon.get(code) ?? { code, orders: 0, discount: 0 };
      e.orders += 1;
      e.discount += o.discountAmount.toNumber();
      byCoupon.set(code, e);
    }

    return {
      date: o.createdAt.toISOString(),
      invoice: o.invoices[0]?.invoiceNumber ?? null,
      order: o.id.slice(0, 8).toUpperCase(),
      student: o.user.name,
      email: o.user.email,
      items: o.items
        .map((i) => i.course?.title ?? i.project?.name ?? '—')
        .join(', '),
      mode: gift ? 'Gift' : mode === 'ONLINE' ? 'Online' : 'Cash',
      method: paymentMethodLabel(o.paymentMethod),
      subtotal: o.subtotal.toNumber(),
      discount: o.discountAmount.toNumber(),
      coupon: code,
      gstPercent: o.gstPercent.toNumber(),
      gst: o.gstAmount.toNumber(),
      total,
      status:
        o.status === 'PAID'
          ? 'Paid'
          : o.status === 'REFUNDED'
            ? 'Refunded'
            : 'Refund requested',
    };
  });

  const notes = [
    'Counts orders by the day they were placed (IST). "Refunded" is money actually sent back in the period, so Net = Collected − Refunded.',
    'GST is already included in Collected.',
    'Gifted enrollments carry the course price with a 100% GIFT discount, so ₹0 is collected. They are listed below so invoice numbers stay unbroken, but are not counted as sales or discounts.',
  ];
  if (truncated)
    notes.push(
      `Only the first ${ROW_CAP} orders are listed below — narrow the date range for the full list.`,
    );

  return {
    type: 'revenue',
    title: 'Revenue',
    description:
      'What was collected, what was refunded, and the GST in between.',
    range: { from: range.fromStr, to: range.toStr },
    currency,
    kpis: [
      {
        label: 'Collected',
        value: cur.collected,
        format: 'money',
        deltaPct: deltaPct(cur.collected, prev.collected),
        hint: 'incl. GST',
      },
      {
        label: 'Refunded',
        value: cur.refunded,
        format: 'money',
        deltaPct: deltaPct(cur.refunded, prev.refunded),
        lowerIsBetter: true,
      },
      {
        label: 'Net revenue',
        value: cur.net,
        format: 'money',
        deltaPct: deltaPct(cur.net, prev.net),
      },
      { label: 'GST collected', value: round2(gst), format: 'money' },
      { label: 'Discounts given', value: round2(discounts), format: 'money' },
      {
        label: 'Orders',
        value: cur.orders,
        format: 'count',
        deltaPct: deltaPct(cur.orders, prev.orders),
      },
      {
        label: 'Avg order value',
        value: cur.orders ? round2(cur.collected / cur.orders) : 0,
        format: 'money',
      },
      {
        label: 'Online',
        value: round2(online),
        format: 'money',
        hint: 'Razorpay payments',
      },
      {
        label: 'Cash / offline',
        value: round2(cash),
        format: 'money',
        hint: 'collected by sales',
      },
      {
        label: 'Gifted enrollments',
        value: gifted,
        format: 'count',
        hint: `code ${GIFT_CODE} · worth ${currency === 'USD' ? '$' : '₹'}${round2(giftedValue).toLocaleString('en-IN')} given free`,
      },
    ],
    chart: {
      title: `Collected per ${kind}`,
      format: 'money',
      labels: keys.map((k) => bucketLabel(k, kind)),
      series: [
        {
          name: 'Online',
          values: keys.map((k) => round2(onlineBy.get(k) ?? 0)),
        },
        {
          name: 'Cash / offline',
          values: keys.map((k) => round2(cashBy.get(k) ?? 0)),
        },
      ],
    },
    tables: [
      {
        title: 'By course / project',
        note: 'What students paid for each item (after the coupon, GST included).',
        columns: [
          { key: 'name', label: 'Item' },
          { key: 'type', label: 'Type' },
          { key: 'units', label: 'Units sold', format: 'count' },
          { key: 'collected', label: 'Collected', format: 'money' },
        ],
        rows: [...byItem.values()]
          .sort((a, b) => b.collected - a.collected)
          .map((e) => ({ ...e, collected: round2(e.collected) })),
      },
      {
        title: 'Coupons',
        columns: [
          { key: 'code', label: 'Coupon' },
          { key: 'orders', label: 'Orders', format: 'count' },
          { key: 'discount', label: 'Discount given', format: 'money' },
        ],
        rows: [...byCoupon.values()]
          .sort((a, b) => b.discount - a.discount)
          .map((e) => ({ ...e, discount: round2(e.discount) })),
      },
      {
        title: 'Orders & GST (for the accountant)',
        columns: [
          { key: 'date', label: 'Date', format: 'datetime' },
          { key: 'invoice', label: 'Invoice no.' },
          { key: 'order', label: 'Order' },
          { key: 'student', label: 'Student' },
          { key: 'email', label: 'Email' },
          { key: 'items', label: 'Items' },
          { key: 'mode', label: 'Mode' },
          { key: 'method', label: 'Method' },
          { key: 'subtotal', label: 'Subtotal', format: 'money' },
          { key: 'discount', label: 'Discount', format: 'money' },
          { key: 'coupon', label: 'Coupon' },
          { key: 'gstPercent', label: 'GST %', format: 'percent' },
          { key: 'gst', label: 'GST', format: 'money' },
          { key: 'total', label: 'Total paid', format: 'money' },
          { key: 'status', label: 'Status' },
        ],
        rows: orderRows,
      },
    ],
    notes,
  };
}
