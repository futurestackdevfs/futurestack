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
import { Report, ReportCurrency } from './report.types';

const inRange = (r: DateRange) => ({ gte: r.from, lte: r.to });
const OPEN_LEAD = { notIn: ['Converted', 'Dropped'] };

export async function buildSalesReport(
  prisma: PrismaService,
  range: DateRange,
  currency: ReportCurrency,
): Promise<Report> {
  const kind = bucketKind(range);
  const keys = bucketKeys(range, kind);
  const now = new Date();

  const [
    leadsNow,
    leadsPrev,
    leadRows,
    byStatus,
    bySource,
    perPersonStatus,
    salespeople,
    orders,
    targets,
    overdue,
  ] = await Promise.all([
    prisma.lead.count({ where: { createdAt: inRange(range) } }),
    prisma.lead.count({ where: { createdAt: inRange(previousRange(range)) } }),
    prisma.lead.findMany({
      where: { createdAt: inRange(range) },
      select: { createdAt: true },
      take: 50000,
    }),
    prisma.lead.groupBy({
      by: ['status'],
      where: { createdAt: inRange(range) },
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by: ['source', 'status'],
      where: { createdAt: inRange(range) },
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by: ['salespersonId', 'status'],
      where: { createdAt: inRange(range) },
      _count: { _all: true },
    }),
    prisma.user.findMany({
      where: { role: 'SALES' },
      select: { id: true, name: true, isActive: true },
    }),
    prisma.order.groupBy({
      by: ['salespersonId'],
      where: {
        salespersonId: { not: null },
        status: { in: ['PAID', 'REFUND_REQUESTED', 'REFUNDED'] },
        currency,
        createdAt: inRange(range),
      },
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
    prisma.salesTarget.findMany({
      where: { startDate: { lte: range.to }, endDate: { gte: range.from } },
      select: { salespersonId: true, targetAmount: true, currentAmount: true },
    }),
    prisma.lead.count({
      where: { nextFollowUp: { lt: now }, status: OPEN_LEAD },
    }),
  ]);

  const statusCount = (s: string) =>
    byStatus.find((r) => r.status === s)?._count._all ?? 0;
  const converted = statusCount('Converted');

  const perDay = new Map(keys.map((k) => [k, 0]));
  for (const l of leadRows) {
    const k = bucketKey(l.createdAt, kind);
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
  }

  // Source → { leads, converted }
  const sources = new Map<
    string,
    { source: string; leads: number; converted: number }
  >();
  for (const r of bySource) {
    const name = r.source?.trim() || 'Unknown';
    const e = sources.get(name) ?? { source: name, leads: 0, converted: 0 };
    e.leads += r._count._all;
    if (r.status === 'Converted') e.converted += r._count._all;
    sources.set(name, e);
  }

  const orderBy = new Map(orders.map((o) => [o.salespersonId, o]));
  const targetBy = new Map<string, { target: number; achieved: number }>();
  for (const t of targets) {
    const e = targetBy.get(t.salespersonId) ?? { target: 0, achieved: 0 };
    e.target += t.targetAmount.toNumber();
    e.achieved += t.currentAmount.toNumber();
    targetBy.set(t.salespersonId, e);
  }

  let revenue = 0;
  const peopleRows = salespeople
    .map((p) => {
      const mine = perPersonStatus.filter((r) => r.salespersonId === p.id);
      const leads = mine.reduce((s, r) => s + r._count._all, 0);
      const won = mine
        .filter((r) => r.status === 'Converted')
        .reduce((s, r) => s + r._count._all, 0);
      const o = orderBy.get(p.id);
      const rev = o?._sum.totalAmount?.toNumber() ?? 0;
      revenue += rev;
      const t = targetBy.get(p.id);
      return {
        salesperson: p.name,
        active: p.isActive ? 'Yes' : 'No',
        leads,
        converted: won,
        conversion: leads ? round2((won / leads) * 100) : 0,
        orders: o?._count._all ?? 0,
        revenue: round2(rev),
        target: t ? round2(t.target) : null,
        targetAchieved: t && t.target ? round2((rev / t.target) * 100) : null,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  return {
    type: 'sales',
    title: 'Sales & leads',
    description:
      'Where leads come from, who converts them, and how sales are tracking against target.',
    range: { from: range.fromStr, to: range.toStr },
    currency,
    kpis: [
      {
        label: 'New leads',
        value: leadsNow,
        format: 'count',
        deltaPct: deltaPct(leadsNow, leadsPrev),
      },
      {
        label: 'Converted',
        value: converted,
        format: 'count',
        hint: 'of leads created in the period',
      },
      {
        label: 'Conversion rate',
        value: leadsNow ? round2((converted / leadsNow) * 100) : 0,
        format: 'percent',
      },
      {
        label: 'Revenue by sales team',
        value: round2(revenue),
        format: 'money',
        hint: 'orders placed by salespeople',
      },
      {
        label: 'Follow-ups overdue now',
        value: overdue,
        format: 'count',
        hint: 'open leads, as of today',
        lowerIsBetter: true,
      },
    ],
    chart: {
      title: `New leads per ${kind}`,
      format: 'count',
      labels: keys.map((k) => bucketLabel(k, kind)),
      series: [{ name: 'Leads', values: keys.map((k) => perDay.get(k) ?? 0) }],
    },
    tables: [
      {
        title: 'By salesperson',
        note: 'Target % compares the revenue above with any target that overlaps this period.',
        columns: [
          { key: 'salesperson', label: 'Salesperson' },
          { key: 'active', label: 'Active' },
          { key: 'leads', label: 'Leads', format: 'count' },
          { key: 'converted', label: 'Converted', format: 'count' },
          { key: 'conversion', label: 'Conversion', format: 'percent' },
          { key: 'orders', label: 'Orders', format: 'count' },
          { key: 'revenue', label: 'Revenue', format: 'money' },
          { key: 'target', label: 'Target', format: 'money' },
          {
            key: 'targetAchieved',
            label: 'Target achieved',
            format: 'percent',
          },
        ],
        rows: peopleRows,
      },
      {
        title: 'By lead source',
        columns: [
          { key: 'source', label: 'Source' },
          { key: 'leads', label: 'Leads', format: 'count' },
          { key: 'converted', label: 'Converted', format: 'count' },
          { key: 'rate', label: 'Conversion', format: 'percent' },
        ],
        rows: [...sources.values()]
          .sort((a, b) => b.leads - a.leads)
          .map((s) => ({
            ...s,
            rate: s.leads ? round2((s.converted / s.leads) * 100) : 0,
          })),
      },
      {
        title: 'By lead status',
        columns: [
          { key: 'status', label: 'Status' },
          { key: 'leads', label: 'Leads', format: 'count' },
        ],
        rows: ['New', 'Interested', 'Converted', 'Dropped'].map((s) => ({
          status: s,
          leads: statusCount(s),
        })),
      },
    ],
    notes: [
      'Only leads created in the period are counted; "overdue follow-ups" is a snapshot of right now.',
    ],
  };
}
