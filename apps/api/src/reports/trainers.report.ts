import { PrismaService } from '../prisma/prisma.service';
import { DateRange, round2 } from './report-range.util';
import { Report } from './report.types';

export async function buildTrainersReport(
  prisma: PrismaService,
  range: DateRange,
): Promise<Report> {
  const [trainers, ledger, payouts] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'TRAINER' },
      select: {
        id: true,
        name: true,
        email: true,
        rating: true,
        isActive: true,
        _count: { select: { coursesTaught: true } },
      },
    }),
    prisma.revenueLedger.groupBy({
      by: ['trainerId'],
      where: { createdAt: { gte: range.from, lte: range.to } },
      _count: { _all: true },
      _sum: { gross: true, trainerShare: true, platformCut: true },
    }),
    prisma.payout.groupBy({
      by: ['trainerId', 'status'],
      _sum: { amount: true },
    }),
  ]);

  const ledgerBy = new Map(ledger.map((l) => [l.trainerId, l]));
  const payoutBy = new Map<string, { paid: number; pending: number }>();
  for (const p of payouts) {
    const e = payoutBy.get(p.trainerId) ?? { paid: 0, pending: 0 };
    const amt = p._sum.amount?.toNumber() ?? 0;
    if (p.status === 'PAID') e.paid += amt;
    else e.pending += amt;
    payoutBy.set(p.trainerId, e);
  }

  let gross = 0;
  let share = 0;
  let cut = 0;
  let pending = 0;
  const rows = trainers
    .map((t) => {
      const l = ledgerBy.get(t.id);
      const p = payoutBy.get(t.id) ?? { paid: 0, pending: 0 };
      const g = l?._sum.gross?.toNumber() ?? 0;
      const s = l?._sum.trainerShare?.toNumber() ?? 0;
      const c = l?._sum.platformCut?.toNumber() ?? 0;
      gross += g;
      share += s;
      cut += c;
      pending += p.pending;
      return {
        trainer: t.name,
        email: t.email,
        active: t.isActive ? 'Yes' : 'No',
        courses: t._count.coursesTaught,
        enrollments: l?._count._all ?? 0,
        gross: round2(g),
        trainerShare: round2(s),
        platformCut: round2(c),
        paidOut: round2(p.paid),
        pendingPayout: round2(p.pending),
        rating: t.rating ? round2(t.rating) : null,
      };
    })
    .sort((a, b) => b.gross - a.gross);

  const top = rows.filter((r) => r.gross > 0).slice(0, 10);

  return {
    type: 'trainers',
    title: 'Trainers',
    description:
      'What each trainer earned, what is owed, and how they are rated.',
    range: { from: range.fromStr, to: range.toStr },
    currency: 'INR',
    kpis: [
      {
        label: 'Gross from trainers’ courses',
        value: round2(gross),
        format: 'money',
      },
      { label: 'Trainer share', value: round2(share), format: 'money' },
      { label: 'Platform cut', value: round2(cut), format: 'money' },
      {
        label: 'Payouts pending (all time)',
        value: round2(pending),
        format: 'money',
        hint: 'owed to trainers',
      },
      {
        label: 'Active trainers',
        value: trainers.filter((t) => t.isActive).length,
        format: 'count',
      },
    ],
    chart: top.length
      ? {
          title: 'Gross by trainer (top 10)',
          format: 'money',
          labels: top.map((r) => r.trainer),
          series: [{ name: 'Gross', values: top.map((r) => r.gross) }],
        }
      : undefined,
    tables: [
      {
        title: 'Trainer earnings',
        note: 'Earnings are for enrollments in the period. Payouts are all-time.',
        columns: [
          { key: 'trainer', label: 'Trainer' },
          { key: 'email', label: 'Email' },
          { key: 'active', label: 'Active' },
          { key: 'courses', label: 'Courses', format: 'count' },
          {
            key: 'enrollments',
            label: 'Enrollments (period)',
            format: 'count',
          },
          { key: 'gross', label: 'Gross', format: 'money' },
          { key: 'trainerShare', label: 'Trainer share', format: 'money' },
          { key: 'platformCut', label: 'Platform cut', format: 'money' },
          { key: 'paidOut', label: 'Paid out', format: 'money' },
          { key: 'pendingPayout', label: 'Pending payout', format: 'money' },
          { key: 'rating', label: 'Rating' },
        ],
        rows,
      },
    ],
    notes: ['The revenue ledger is kept in rupees.'],
  };
}
