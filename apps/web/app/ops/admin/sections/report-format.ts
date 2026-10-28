export type ValueFormat = "money" | "count" | "hours" | "percent" | "text" | "date" | "datetime";
export type Currency = "INR" | "USD";

export interface Kpi {
  label: string;
  value: number | string;
  format: ValueFormat;
  deltaPct?: number | null;
  lowerIsBetter?: boolean;
  hint?: string;
}

export interface ChartData {
  title: string;
  format: ValueFormat;
  labels: string[];
  series: { name: string; values: number[] }[];
}

export interface Column {
  key: string;
  label: string;
  format?: ValueFormat;
  currencyKey?: string;
}

export type Cell = string | number | null;
export type Row = Record<string, Cell>;

export interface ReportTable {
  title: string;
  columns: Column[];
  rows: Row[];
  note?: string;
}

export interface ReportData {
  type: string;
  title: string;
  description: string;
  range: { from: string; to: string };
  currency?: Currency;
  kpis: Kpi[];
  chart?: ChartData;
  tables: ReportTable[];
  notes: string[];
}

const IST = "Asia/Kolkata";

export function currencySymbol(c: Currency | undefined) {
  return c === "USD" ? "$" : "₹";
}

export function fmtMoney(n: number, currency: Currency = "INR") {
  const locale = currency === "USD" ? "en-US" : "en-IN";
  return currencySymbol(currency) + n.toLocaleString(locale, { maximumFractionDigits: 2 });
}

/** "5h", "2d 3h" — durations in hours. */
export function fmtHours(h: number) {
  if (!Number.isFinite(h)) return "—";
  if (h < 1) return h === 0 ? "0h" : "<1h";
  if (h < 48) return `${Math.round(h * 10) / 10}h`;
  return `${Math.floor(h / 24)}d ${Math.round(h % 24)}h`;
}

export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { timeZone: IST, day: "2-digit", month: "short", year: "numeric" });
}

/** A value as it should read on screen. */
export function formatValue(value: Cell, format: ValueFormat | undefined, currency?: Currency): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") {
    if (format === "datetime") return fmtDateTime(value);
    if (format === "date") return fmtDate(value);
    return value;
  }
  switch (format) {
    case "money":
      return fmtMoney(value, currency ?? "INR");
    case "percent":
      return `${Math.round(value * 10) / 10}%`;
    case "hours":
      return fmtHours(value);
    case "count":
      return value.toLocaleString("en-IN");
    default:
      return String(value);
  }
}

/** Today's date in India as YYYY-MM-DD. */
export function todayIst(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: IST });
}

export function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "01 Oct 2026" from a YYYY-MM-DD string. */
export function fmtRangeDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });
}

// ── CSV ─────────────────────────────────────────────────────────

/** Spreadsheets run text starting with these as a formula — defuse it. */
function csvText(s: string) {
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

function csvCell(value: Cell, format: ValueFormat | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  if (format === "datetime" || format === "date") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      const ist = d.toLocaleString("sv-SE", { timeZone: IST }); // "2026-10-10 11:30:00"
      return csvText(format === "date" ? ist.slice(0, 10) : ist.slice(0, 16));
    }
  }
  return csvText(value);
}

/** Money columns carry a currency symbol in the header so the sheet is unambiguous. */
export function tableToCsv(table: ReportTable, currency?: Currency): string {
  const header = table.columns
    .map((c) => csvText(c.format === "money" && !c.currencyKey ? `${c.label} (${currency ?? "INR"})` : c.label))
    .join(",");
  const lines = table.rows.map((r) => table.columns.map((c) => csvCell(r[c.key] ?? null, c.format)).join(","));
  // BOM so Excel opens ₹, é, etc. correctly.
  return "﻿" + [header, ...lines].join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
