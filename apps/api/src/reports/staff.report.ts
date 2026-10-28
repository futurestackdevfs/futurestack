import { PrismaService } from '../prisma/prisma.service';
import {
  DateRange,
  bucketKey,
  bucketKeys,
  bucketKind,
  bucketLabel,
  deltaPct,
  previousRange,
} from './report-range.util';
import { Report } from './report.types';

const inRange = (r: DateRange) => ({ gte: r.from, lte: r.to });
const RECENT = 300;

export async function buildStaffReport(
  prisma: PrismaService,
  range: DateRange,
): Promise<Report> {
  const kind = bucketKind(range);
  const keys = bucketKeys(range, kind);

  const [total, prevTotal, rows, byActor, byAction] = await Promise.all([
    prisma.auditLog.count({ where: { createdAt: inRange(range) } }),
    prisma.auditLog.count({
      where: { createdAt: inRange(previousRange(range)) },
    }),
    prisma.auditLog.findMany({
      where: { createdAt: inRange(range) },
      orderBy: { createdAt: 'desc' },
      take: 20000,
      select: {
        createdAt: true,
        actorId: true,
        actorName: true,
        actorEmail: true,
        actorRole: true,
        action: true,
        entityType: true,
        entityId: true,
      },
    }),
    prisma.auditLog.groupBy({
      by: ['actorId', 'actorName', 'actorRole'],
      where: { createdAt: inRange(range) },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.auditLog.groupBy({
      by: ['entityType', 'action'],
      where: { createdAt: inRange(range) },
      _count: { _all: true },
    }),
  ]);

  const perDay = new Map(keys.map((k) => [k, 0]));
  const byRole = new Map<string, number>();
  for (const r of rows) {
    const k = bucketKey(r.createdAt, kind);
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
    byRole.set(r.actorRole, (byRole.get(r.actorRole) ?? 0) + 1);
  }

  return {
    type: 'staff',
    title: 'Staff activity',
    description: 'What each team member changed, from the audit log.',
    range: { from: range.fromStr, to: range.toStr },
    kpis: [
      {
        label: 'Actions logged',
        value: total,
        format: 'count',
        deltaPct: deltaPct(total, prevTotal),
      },
      { label: 'People active', value: byActor.length, format: 'count' },
      {
        label: 'Admin actions',
        value: byRole.get('ADMIN') ?? 0,
        format: 'count',
      },
      {
        label: 'Other staff actions',
        value: [...byRole.entries()]
          .filter(([r]) => r !== 'ADMIN')
          .reduce((s, [, n]) => s + n, 0),
        format: 'count',
      },
    ],
    chart: {
      title: `Actions per ${kind}`,
      format: 'count',
      labels: keys.map((k) => bucketLabel(k, kind)),
      series: [
        { name: 'Actions', values: keys.map((k) => perDay.get(k) ?? 0) },
      ],
    },
    tables: [
      {
        title: 'By person',
        columns: [
          { key: 'name', label: 'Person' },
          { key: 'role', label: 'Role' },
          { key: 'actions', label: 'Actions', format: 'count' },
          { key: 'last', label: 'Last action', format: 'datetime' },
        ],
        rows: byActor
          .sort((a, b) => b._count._all - a._count._all)
          .map((a) => ({
            name: a.actorName ?? '(unknown)',
            role: a.actorRole,
            actions: a._count._all,
            last: a._max.createdAt?.toISOString() ?? null,
          })),
      },
      {
        title: 'By what was changed',
        columns: [
          { key: 'entity', label: 'Area' },
          { key: 'action', label: 'Action' },
          { key: 'count', label: 'Times', format: 'count' },
        ],
        rows: byAction
          .sort((a, b) => b._count._all - a._count._all)
          .map((a) => ({
            entity: a.entityType ?? '—',
            action: a.action,
            count: a._count._all,
          })),
      },
      {
        title: `Latest actions (${RECENT} most recent)`,
        columns: [
          { key: 'when', label: 'When', format: 'datetime' },
          { key: 'person', label: 'Person' },
          { key: 'role', label: 'Role' },
          { key: 'action', label: 'Action' },
          { key: 'entity', label: 'Area' },
          { key: 'entityId', label: 'Record' },
        ],
        rows: rows.slice(0, RECENT).map((r) => ({
          when: r.createdAt.toISOString(),
          person: r.actorName ?? r.actorEmail ?? '(unknown)',
          role: r.actorRole,
          action: r.action,
          entity: r.entityType ?? '—',
          entityId: r.entityId ? r.entityId.slice(0, 8) : '—',
        })),
      },
    ],
    notes: [
      'Only actions that are recorded in the audit log appear here. Until every staff area is audited, some work (for example in Sales or Support) will not show up.',
    ],
  };
}
