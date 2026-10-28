import type {
  EscalationSeverity,
  EscalationStatus,
  SupportTicket,
} from '@prisma/client';

const SEVERITY_ORDER: EscalationSeverity[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
];

/** Statuses that still need someone's attention. */
export const ACTIVE_STATUSES: EscalationStatus[] = [
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
];

export function isActiveStatus(status: EscalationStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/** Moves a severity up by `steps` levels, capped at CRITICAL. */
export function bumpSeverity(
  base: EscalationSeverity,
  steps: number,
): EscalationSeverity {
  const idx = Math.min(
    SEVERITY_ORDER.length - 1,
    SEVERITY_ORDER.indexOf(base) + Math.max(0, steps),
  );
  return SEVERITY_ORDER[idx];
}

export function severityRank(severity: EscalationSeverity): number {
  return SEVERITY_ORDER.indexOf(severity);
}

/**
 * The longer a problem has been left alone past its limit, the more severe it
 * gets: 2x the limit bumps one level, 4x bumps two.
 */
export function severityForOverrun(
  base: EscalationSeverity,
  waited: number,
  limit: number,
): EscalationSeverity {
  if (limit <= 0) return base;
  const ratio = waited / limit;
  if (ratio >= 4) return bumpSeverity(base, 2);
  if (ratio >= 2) return bumpSeverity(base, 1);
  return base;
}

export function ticketSeverity(
  priority: SupportTicket['priority'],
  waitedHours: number,
  slaHours: number,
): EscalationSeverity {
  const base: EscalationSeverity =
    priority === 'URGENT' || priority === 'HIGH' ? 'HIGH' : 'MEDIUM';
  return severityForOverrun(base, waitedHours, slaHours);
}

export function refundSeverity(
  waitedHours: number,
  pendingHours: number,
): EscalationSeverity {
  return severityForOverrun('HIGH', waitedHours, pendingHours);
}

export function complaintSeverity(
  count: number,
  minCount: number,
): EscalationSeverity {
  return severityForOverrun('MEDIUM', count, minCount);
}

/** An active escalation whose resolve-by time has passed. */
export function isSlaBreached(
  e: { status: EscalationStatus; dueAt: Date | null },
  now: Date = new Date(),
): boolean {
  return (
    isActiveStatus(e.status) &&
    e.dueAt != null &&
    e.dueAt.getTime() < now.getTime()
  );
}

export function addHours(from: Date, hours: number): Date {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

export function addDays(from: Date, days: number): Date {
  return addHours(from, days * 24);
}

export function hoursBetween(from: Date, to: Date): number {
  return Math.max(
    0,
    Math.floor((to.getTime() - from.getTime()) / (60 * 60 * 1000)),
  );
}

/** "ESC-00042" — the human reference shown in the console and in emails. */
export function escalationRef(number: number): string {
  return `ESC-${String(number).padStart(5, '0')}`;
}
