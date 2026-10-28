export const REPORT_TYPES = [
  'revenue',
  'enrollments',
  'trainers',
  'sales',
  'refunds',
  'support',
  'staff',
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export type ReportCurrency = 'INR' | 'USD';

export type ValueFormat =
  | 'money'
  | 'count'
  | 'hours'
  | 'percent'
  | 'text'
  | 'date'
  | 'datetime';

export interface Kpi {
  label: string;
  value: number | string;
  format: ValueFormat;
  /** Change vs the previous period of the same length, in %. null = no baseline. */
  deltaPct?: number | null;
  /** For deltas where going DOWN is good (e.g. refunds, time to resolve). */
  lowerIsBetter?: boolean;
  hint?: string;
}

export interface ChartData {
  title: string;
  format: ValueFormat;
  labels: string[];
  /** One series = one bar per label; two+ are stacked. */
  series: { name: string; values: number[] }[];
}

export interface Column {
  key: string;
  label: string;
  format?: ValueFormat;
  /** Money columns: take the currency from this row field instead of the report currency. */
  currencyKey?: string;
}

export type Cell = string | number | null;

export interface ReportTable {
  title: string;
  columns: Column[];
  rows: Record<string, Cell>[];
  note?: string;
}

export interface Report {
  type: ReportType;
  title: string;
  description: string;
  range: { from: string; to: string };
  /** Set when money in this report is in a single currency. */
  currency?: ReportCurrency;
  kpis: Kpi[];
  chart?: ChartData;
  tables: ReportTable[];
  notes: string[];
}

/** Most rows any single table may carry — keeps responses and CSVs sane. */
export const ROW_CAP = 5000;
