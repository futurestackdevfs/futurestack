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
import { Report } from './report.types';

const inRange = (r: DateRange) => ({ gte: r.from, lte: r.to });
const ACTIVE = ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] as const;
const TICKET_CAP = 5000;

const hoursBetween = (a: Date, b: Date) =>
  Math.max(0, (b.getTime() - a.getTime()) / 36e5);
const avg = (xs: number[]) =>
  xs.length ? round2(xs.reduce((s, x) => s + x, 0) / xs.length) : 0;

export async function buildSupportReport(
  prisma: PrismaService,
  range: DateRange,
): Promise<Report> {
  const kind = bucketKind(range);
  const keys = bucketKeys(range, kind);
  const now = new Date();

  const [
    tickets,
    prevCount,
    openNow,
    escCreated,
    escResolved,
    escActive,
    escBreached,
    escByType,
  ] = await Promise.all([
    prisma.supportTicket.findMany({
      where: { createdAt: inRange(range) },
      select: {
        id: true,
        studentId: true,
        category: true,
        priority: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
      },
      take: TICKET_CAP,
    }),
    prisma.supportTicket.count({
      where: { createdAt: inRange(previousRange(range)) },
    }),
    prisma.supportTicket.count({
      where: { status: { in: ['OPEN', 'PENDING'] } },
    }),
    prisma.escalation.count({ where: { createdAt: inRange(range) } }),
    prisma.escalation.findMany({
      where: { status: 'RESOLVED', resolvedAt: inRange(range) },
      select: { createdAt: true, resolvedAt: true },
      take: 5000,
    }),
    prisma.escalation.count({ where: { status: { in: [...ACTIVE] } } }),
    prisma.escalation.count({
      where: { status: { in: [...ACTIVE] }, dueAt: { lt: now } },
    }),
    prisma.escalation.groupBy({
      by: ['type'],
      where: { createdAt: inRange(range) },
      _count: { _all: true },
    }),
  ]);

  // First reply from staff = the first message not written by the student.
  const ids = tickets.map((t) => t.id);
  const messages = ids.length
    ? await prisma.supportTicketMessage.findMany({
        where: { ticketId: { in: ids }, isInternalNote: false },
        orderBy: { createdAt: 'asc' },
        select: { ticketId: true, authorId: true, createdAt: true },
      })
    : [];
  const studentOf = new Map(tickets.map((t) => [t.id, t.studentId]));
  const firstReply = new Map<string, Date>();
  for (const m of messages) {
    if (
      m.authorId !== studentOf.get(m.ticketId) &&
      !firstReply.has(m.ticketId)
    ) {
      firstReply.set(m.ticketId, m.createdAt);
    }
  }
  const replyHours = tickets
    .filter((t) => firstReply.has(t.id))
    .map((t) => hoursBetween(t.createdAt, firstReply.get(t.id) as Date));
  const resolveHours = tickets
    .filter((t) => t.resolvedAt)
    .map((t) => hoursBetween(t.createdAt, t.resolvedAt as Date));
  const resolved = tickets.filter(
    (t) => t.status === 'RESOLVED' || t.status === 'CLOSED',
  ).length;

  const perDay = new Map(keys.map((k) => [k, 0]));
  const byCategory = new Map<
    string,
    { category: string; tickets: number; resolved: number }
  >();
  const byPriority = new Map<string, number>();
  for (const t of tickets) {
    const k = bucketKey(t.createdAt, kind);
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
    const c = byCategory.get(t.category) ?? {
      category: t.category,
      tickets: 0,
      resolved: 0,
    };
    c.tickets += 1;
    if (t.status === 'RESOLVED' || t.status === 'CLOSED') c.resolved += 1;
    byCategory.set(t.category, c);
    byPriority.set(t.priority, (byPriority.get(t.priority) ?? 0) + 1);
  }

  const escHours = escResolved
    .filter((e) => e.resolvedAt)
    .map((e) => hoursBetween(e.createdAt, e.resolvedAt as Date));

  const notes = [
    'Ticket figures cover tickets created in the period. "Open now" and the escalation backlog are snapshots of right now.',
  ];
  if (tickets.length >= TICKET_CAP)
    notes.push(
      `Only the first ${TICKET_CAP} tickets of the period were analysed.`,
    );

  return {
    type: 'support',
    title: 'Support & escalations',
    description: 'How fast students get help, and what had to be escalated.',
    range: { from: range.fromStr, to: range.toStr },
    kpis: [
      {
        label: 'Tickets raised',
        value: tickets.length,
        format: 'count',
        deltaPct: deltaPct(tickets.length, prevCount),
      },
      {
        label: 'Resolved / closed',
        value: resolved,
        format: 'count',
        hint: `${tickets.length ? Math.round((resolved / tickets.length) * 100) : 0}% of those raised`,
      },
      {
        label: 'Avg first reply',
        value: avg(replyHours),
        format: 'hours',
        lowerIsBetter: true,
        hint: `${replyHours.length} tickets replied to`,
      },
      {
        label: 'Avg time to resolve',
        value: avg(resolveHours),
        format: 'hours',
        lowerIsBetter: true,
      },
      {
        label: 'Open or waiting now',
        value: openNow,
        format: 'count',
        hint: 'all tickets, right now',
      },
      { label: 'Escalations raised', value: escCreated, format: 'count' },
      {
        label: 'Escalation backlog',
        value: escActive,
        format: 'count',
        hint: `${escBreached} past their deadline`,
        lowerIsBetter: true,
      },
      {
        label: 'Avg escalation resolve time',
        value: avg(escHours),
        format: 'hours',
        lowerIsBetter: true,
      },
    ],
    chart: {
      title: `Tickets raised per ${kind}`,
      format: 'count',
      labels: keys.map((k) => bucketLabel(k, kind)),
      series: [
        { name: 'Tickets', values: keys.map((k) => perDay.get(k) ?? 0) },
      ],
    },
    tables: [
      {
        title: 'Tickets by category',
        columns: [
          { key: 'category', label: 'Category' },
          { key: 'tickets', label: 'Tickets', format: 'count' },
          { key: 'resolved', label: 'Resolved / closed', format: 'count' },
          { key: 'rate', label: 'Resolution rate', format: 'percent' },
        ],
        rows: [...byCategory.values()]
          .sort((a, b) => b.tickets - a.tickets)
          .map((c) => ({
            ...c,
            category: c.category.replace(/_/g, ' '),
            rate: c.tickets ? round2((c.resolved / c.tickets) * 100) : 0,
          })),
      },
      {
        title: 'Tickets by priority',
        columns: [
          { key: 'priority', label: 'Priority' },
          { key: 'tickets', label: 'Tickets', format: 'count' },
        ],
        rows: ['URGENT', 'HIGH', 'NORMAL', 'LOW'].map((p) => ({
          priority: p,
          tickets: byPriority.get(p) ?? 0,
        })),
      },
      {
        title: 'Escalations by type',
        columns: [
          { key: 'type', label: 'Type' },
          { key: 'escalations', label: 'Raised in period', format: 'count' },
        ],
        rows: escByType
          .sort((a, b) => b._count._all - a._count._all)
          .map((e) => ({
            type: e.type.replace(/_/g, ' '),
            escalations: e._count._all,
          })),
      },
    ],
    notes,
  };
}
