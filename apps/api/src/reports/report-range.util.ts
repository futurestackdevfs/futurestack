import { BadRequestException } from '@nestjs/common';

/** Business runs on Indian time: a "day" is midnight-to-midnight IST. */
const IST_OFFSET_MIN = 330;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_SPAN_DAYS = 366;

export interface DateRange {
  /** Inclusive start (00:00 IST of the first day). */
  from: Date;
  /** Inclusive end (23:59:59.999 IST of the last day). */
  to: Date;
  /** YYYY-MM-DD, as typed by the user. */
  fromStr: string;
  toStr: string;
  days: number;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** The calendar date in IST as YYYY-MM-DD. */
export function istDateString(d: Date): string {
  const ist = new Date(d.getTime() + IST_OFFSET_MIN * 60 * 1000);
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`;
}

function startOfIstDay(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+05:30`);
}

function endOfIstDay(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999+05:30`);
}

function isValidDateStr(s: string | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = startOfIstDay(s);
  return !Number.isNaN(d.getTime()) && istDateString(d) === s;
}

/** Defaults to the last 30 days (today included). */
export function parseRange(
  from?: string,
  to?: string,
  now: Date = new Date(),
): DateRange {
  const today = istDateString(now);
  const toStr = to ?? today;
  const fromStr =
    from ??
    istDateString(new Date(startOfIstDay(toStr).getTime() - 29 * DAY_MS));

  if (!isValidDateStr(fromStr) || !isValidDateStr(toStr)) {
    throw new BadRequestException('Dates must be in YYYY-MM-DD format.');
  }
  const start = startOfIstDay(fromStr);
  const end = endOfIstDay(toStr);
  if (start.getTime() > end.getTime()) {
    throw new BadRequestException(
      'The start date must be on or before the end date.',
    );
  }
  const days =
    Math.round((startOfIstDay(toStr).getTime() - start.getTime()) / DAY_MS) + 1;
  if (days > MAX_SPAN_DAYS) {
    throw new BadRequestException(
      `Pick a range of at most ${MAX_SPAN_DAYS} days.`,
    );
  }
  return { from: start, to: end, fromStr, toStr, days };
}

/** The period of equal length immediately before `r` — the baseline for "vs previous". */
export function previousRange(r: DateRange): DateRange {
  const prevTo = new Date(r.from.getTime() - DAY_MS);
  const prevFrom = new Date(r.from.getTime() - r.days * DAY_MS);
  const toStr = istDateString(prevTo);
  const fromStr = istDateString(prevFrom);
  return {
    from: startOfIstDay(fromStr),
    to: endOfIstDay(toStr),
    fromStr,
    toStr,
    days: r.days,
  };
}

export type BucketKind = 'day' | 'month';

/** Long ranges read better by month; short ones by day. */
export function bucketKind(r: DateRange): BucketKind {
  return r.days > 92 ? 'month' : 'day';
}

export function bucketKey(d: Date, kind: BucketKind): string {
  const s = istDateString(d);
  return kind === 'month' ? s.slice(0, 7) : s;
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Short axis label for a bucket key: "05 Oct" or "Oct 2026". */
export function bucketLabel(key: string, kind: BucketKind): string {
  if (kind === 'month') {
    const [y, m] = key.split('-');
    return `${MONTHS[Number(m) - 1]} ${y}`;
  }
  const [, m, d] = key.split('-');
  return `${d} ${MONTHS[Number(m) - 1]}`;
}

/** Every bucket key between from and to, in order — so empty days show as zero, not as gaps. */
export function bucketKeys(r: DateRange, kind: BucketKind): string[] {
  const keys: string[] = [];
  for (let t = r.from.getTime(); t <= r.to.getTime(); t += DAY_MS) {
    const k = bucketKey(new Date(t), kind);
    if (keys[keys.length - 1] !== k) keys.push(k);
  }
  return keys;
}

/** % change from `previous` to `current`; null when there is nothing to compare against. */
export function deltaPct(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
