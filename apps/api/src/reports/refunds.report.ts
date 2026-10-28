import { PrismaService } from '../prisma/prisma.service';
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

const inRange = (r: DateRange) => ({ gte: r.from, lte: r.to });

/** Groups free-text reasons so "Not satisfied" and "not satisfied " land together. */
function reasonKey(reason: string): string {
  return (
    reason.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 80) ||
    '(no reason)'
  );
}

export async function buildRefundsReport(
  prisma: PrismaService,
  range: DateRange,
  currency: ReportCurrency,
): Promise<Report> {
  const where = (r: DateRange) => ({
    createdAt: inRange(r),
    order: { is: { currency } },
  });
  const kind = bucketKind(range);
  const keys = bucketKeys(range, kind);

  const [refunds, prevAgg] = await Promise.all([
    prisma.refund.findMany({
      where: where(range),
      orderBy: { createdAt: 'asc' },
      take: ROW_CAP + 1,
      select: {
        id: true,
        orderId: true,
        amount: true,
        reason: true,
        status: true,
        createdAt: true,
        processedAt: true,
        student: { select: { name: true, email: true } },
        course: { select: { title: true } },
        project: { select: { name: true } },
        initiatedBy: { select: { name: true } },
      },
    }),
    prisma.refund.aggregate({
      where: { ...where(previousRange(range)), status: 'PROCESSED' },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const truncated = refunds.length > ROW_CAP;
  const rows = truncated ? refunds.slice(0, ROW_CAP) : refunds;

  let processedAmt = 0;
  let processedN = 0;
  let pendingN = 0;
  let pendingAmt = 0;
  let rejectedN = 0;
  let hoursSum = 0;
  const perDay = new Map(keys.map((k) => [k, 0]));
  const byReason = new Map<
    string,
    { reason: string; refunds: number; amount: number }
  >();

  const tableRows = rows.map((r) => {
    const amt = r.amount.toNumber();
    const hours =
      r.status === 'PROCESSED' && r.processedAt
        ? Math.max(
            0,
            Math.round(
              (r.processedAt.getTime() - r.createdAt.getTime()) / 36e5,
            ),
          )
        : null;
    if (r.status === 'PROCESSED') {
      processedAmt += amt;
      processedN += 1;
      if (hours != null) hoursSum += hours;
      const k = bucketKey(r.createdAt, kind);
      perDay.set(k, (perDay.get(k) ?? 0) + amt);
    } else if (r.status === 'PENDING') {
      pendingN += 1;
      pendingAmt += amt;
    } else {
      rejectedN += 1;
    }
    const key = reasonKey(r.reason);
    const e = byReason.get(key) ?? {
      reason: r.reason.trim() || '(no reason)',
      refunds: 0,
      amount: 0,
    };
    e.refunds += 1;
    e.amount += amt;
    byReason.set(key, e);

    return {
      requested: r.createdAt.toISOString(),
      student: r.student.name,
      email: r.student.email,
      item: r.course?.title ?? r.project?.name ?? '—',
      order: r.orderId ? r.orderId.slice(0, 8).toUpperCase() : '—',
      amount: amt,
      status:
        r.status === 'PROCESSED'
          ? 'Sent to Razorpay'
          : r.status === 'PENDING'
            ? 'Pending approval'
            : 'Rejected',
      hoursToProcess: hours,
      reason: r.reason,
      initiatedBy: r.initiatedBy.name,
    };
  });

  const prevAmount = prevAgg._sum.amount?.toNumber() ?? 0;
  const notes = [
    'Refunds are counted by the day they were requested. Amounts are what the student actually paid (coupon cut, GST included).',
  ];
  if (truncated)
    notes.push(
      `Only the first ${ROW_CAP} refunds are listed — narrow the date range for the full list.`,
    );

  return {
    type: 'refunds',
    title: 'Refunds',
    description: 'How much was refunded, why, and how quickly it was handled.',
    range: { from: range.fromStr, to: range.toStr },
    currency,
    kpis: [
      {
        label: 'Refunded',
        value: round2(processedAmt),
        format: 'money',
        deltaPct: deltaPct(processedAmt, prevAmount),
        lowerIsBetter: true,
      },
      {
        label: 'Refunds processed',
        value: processedN,
        format: 'count',
        deltaPct: deltaPct(processedN, prevAgg._count._all),
        lowerIsBetter: true,
      },
      {
        label: 'Pending approval',
        value: pendingN,
        format: 'count',
        hint: `${currency === 'USD' ? '$' : '₹'}${round2(pendingAmt).toLocaleString('en-IN')} waiting`,
      },
      { label: 'Rejected', value: rejectedN, format: 'count' },
      {
        label: 'Avg time to process',
        value: processedN ? Math.round(hoursSum / processedN) : 0,
        format: 'hours',
        lowerIsBetter: true,
      },
    ],
    chart: {
      title: `Refunded per ${kind}`,
      format: 'money',
      labels: keys.map((k) => bucketLabel(k, kind)),
      series: [
        {
          name: 'Refunded',
          values: keys.map((k) => round2(perDay.get(k) ?? 0)),
        },
      ],
    },
    tables: [
      {
        title: 'Why students ask for refunds',
        columns: [
          { key: 'reason', label: 'Reason' },
          { key: 'refunds', label: 'Refunds', format: 'count' },
          { key: 'amount', label: 'Amount', format: 'money' },
        ],
        rows: [...byReason.values()]
          .sort((a, b) => b.refunds - a.refunds)
          .slice(0, 50)
          .map((e) => ({ ...e, amount: round2(e.amount) })),
      },
      {
        title: 'All refunds',
        columns: [
          { key: 'requested', label: 'Requested', format: 'datetime' },
          { key: 'student', label: 'Student' },
          { key: 'email', label: 'Email' },
          { key: 'item', label: 'Item' },
          { key: 'order', label: 'Order' },
          { key: 'amount', label: 'Amount', format: 'money' },
          { key: 'status', label: 'Status' },
          { key: 'hoursToProcess', label: 'Hours to process', format: 'hours' },
          { key: 'reason', label: 'Reason' },
          { key: 'initiatedBy', label: 'Initiated by' },
        ],
        rows: tableRows,
      },
    ],
    notes,
  };
}
