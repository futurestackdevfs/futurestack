"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import ReportChart from "./ReportChart";
import {
  Currency,
  Kpi,
  ReportData,
  ReportTable,
  Row,
  addDaysStr,
  downloadCsv,
  fmtRangeDate,
  formatValue,
  slug,
  tableToCsv,
  todayIst,
} from "./report-format";

interface CatalogItem {
  type: string;
  title: string;
  icon: string;
  description: string;
  currency: boolean;
}

// Shown while the list loads (and if it fails) so the page is never empty.
const FALLBACK_CATALOG: CatalogItem[] = [
  { type: "revenue", title: "Revenue", icon: "💵", description: "Collected, refunded, GST and discounts", currency: true },
  { type: "enrollments", title: "Enrollments & courses", icon: "🎓", description: "Signups, purchases and course performance", currency: false },
  { type: "refunds", title: "Refunds", icon: "💸", description: "Amounts, reasons and turnaround", currency: true },
  { type: "trainers", title: "Trainers", icon: "🧑‍🏫", description: "Earnings, payouts and ratings", currency: false },
  { type: "sales", title: "Sales & leads", icon: "📞", description: "Leads, conversion and targets", currency: true },
  { type: "support", title: "Support & escalations", icon: "🎧", description: "Response times and escalations", currency: false },
  { type: "staff", title: "Staff activity", icon: "🗂", description: "What each team member changed", currency: false },
];

type PresetKey = "today" | "7d" | "30d" | "month" | "lastMonth" | "fy" | "custom";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "month", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "fy", label: "This FY" },
  { key: "custom", label: "Custom" },
];

/** Date range for a preset, in Indian dates. FY runs April → March. */
function presetRange(key: PresetKey): { from: string; to: string } {
  const today = todayIst();
  const [y, m] = today.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  switch (key) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: addDaysStr(today, -6), to: today };
    case "month":
      return { from: `${y}-${pad(m)}-01`, to: today };
    case "lastMonth": {
      const ly = m === 1 ? y - 1 : y;
      const lm = m === 1 ? 12 : m - 1;
      const first = `${ly}-${pad(lm)}-01`;
      return { from: first, to: addDaysStr(`${y}-${pad(m)}-01`, -1) };
    }
    case "fy": {
      const startYear = m >= 4 ? y : y - 1;
      return { from: `${startYear}-04-01`, to: today };
    }
    default:
      return { from: addDaysStr(today, -29), to: today };
  }
}

const TABLE_PREVIEW = 50;

function DeltaChip({ k }: { k: Kpi }) {
  if (k.deltaPct == null) return null;
  const up = k.deltaPct > 0;
  const flat = k.deltaPct === 0;
  const good = flat ? null : k.lowerIsBetter ? !up : up;
  const color = good === null ? "var(--text3)" : good ? "var(--green)" : "var(--red)";
  return (
    <span className="font-mono text-[10px] font-bold" style={{ color }} title="Compared with the previous period of the same length">
      {flat ? "■" : up ? "▲" : "▼"} {Math.abs(k.deltaPct)}%
    </span>
  );
}

function DataTable({ table, report, fileBase }: { table: ReportTable; report: ReportData; fileBase: string }) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState("");

  const rows = useMemo(() => {
    let r = table.rows;
    const q = filter.trim().toLowerCase();
    if (q) r = r.filter((row) => Object.values(row).some((v) => v != null && String(v).toLowerCase().includes(q)));
    if (sort) {
      const { key, dir } = sort;
      r = [...r].sort((a, b) => {
        const x = a[key];
        const y = b[key];
        if (x == null && y == null) return 0;
        if (x == null) return 1; // blanks always last
        if (y == null) return -1;
        if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
        return String(x).localeCompare(String(y)) * dir;
      });
    }
    return r;
  }, [table.rows, sort, filter]);

  const visible = showAll ? rows : rows.slice(0, TABLE_PREVIEW);
  const isNumeric = (format?: string) => format === "money" || format === "count" || format === "percent" || format === "hours";

  function onSort(key: string) {
    setSort((s) => (s?.key === key ? (s.dir === 1 ? { key, dir: -1 } : null) : { key, dir: 1 }));
  }

  return (
    <section className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between gap-3 flex-wrap px-3.5 py-2.5" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
        <div>
          <div className="text-[12.5px] font-bold" style={{ color: "var(--text)" }}>{table.title}</div>
          {table.note && <div className="text-[10.5px] mt-0.5" style={{ color: "var(--text3)" }}>{table.note}</div>}
        </div>
        <div className="flex items-center gap-2">
          {table.rows.length > 8 && (
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter rows…"
              aria-label={`Filter ${table.title}`}
              className="font-mono text-[10.5px] px-2.5 py-1 rounded outline-none w-[140px]"
              style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
            />
          )}
          <button
            disabled={table.rows.length === 0}
            onClick={() => downloadCsv(`${fileBase}-${slug(table.title)}.csv`, tableToCsv(table, report.currency))}
            className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
          >
            ⬇ CSV
          </button>
        </div>
      </div>

      {table.rows.length === 0 ? (
        <div className="px-3.5 py-8 text-center font-mono text-[11px]" style={{ color: "var(--text3)" }}>Nothing here for this period.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(148,163,184,.05)" }}>
                  {table.columns.map((c) => {
                    const active = sort?.key === c.key;
                    return (
                      <th
                        key={c.key}
                        onClick={() => onSort(c.key)}
                        aria-sort={active ? (sort!.dir === 1 ? "ascending" : "descending") : "none"}
                        className="font-mono text-[9px] font-bold uppercase tracking-[.08em] px-2.5 py-[7px] cursor-pointer select-none"
                        style={{ whiteSpace: "nowrap", color: active ? "var(--text)" : "var(--text3)", textAlign: isNumeric(c.format) ? "right" : "left" }}
                      >
                        {c.label}
                        {active ? (sort!.dir === 1 ? " ↑" : " ↓") : ""}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visible.map((row: Row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    {table.columns.map((c) => {
                      const cur = (c.currencyKey ? (row[c.currencyKey] as Currency) : report.currency) ?? undefined;
                      return (
                        <td
                          key={c.key}
                          className={`px-2.5 py-[6px] ${isNumeric(c.format) ? "font-mono tabular-nums" : ""}`}
                          style={{ textAlign: isNumeric(c.format) ? "right" : "left", color: "var(--text)", whiteSpace: isNumeric(c.format) || c.format === "datetime" ? "nowrap" : undefined, maxWidth: 280 }}
                        >
                          <span className={isNumeric(c.format) ? "" : "block truncate"} title={typeof row[c.key] === "string" ? String(row[c.key]) : undefined}>
                            {formatValue(row[c.key] ?? null, c.format, cur)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-3.5 py-2" style={{ borderTop: "1px solid var(--border)", background: "var(--panel)" }}>
            <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>
              {filter ? `${rows.length} of ${table.rows.length} rows match` : `${table.rows.length} row${table.rows.length === 1 ? "" : "s"}`}
              {!showAll && rows.length > TABLE_PREVIEW ? ` · showing first ${TABLE_PREVIEW}` : ""}
            </span>
            {rows.length > TABLE_PREVIEW && (
              <button onClick={() => setShowAll((v) => !v)} className="font-mono text-[10.5px] font-semibold cursor-pointer" style={{ background: "transparent", border: "none", color: "var(--blue)" }}>
                {showAll ? "Show fewer" : `Show all ${rows.length}`}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default function ReportsManager({ token }: { token: string }) {
  const [catalog, setCatalog] = useState<CatalogItem[]>(FALLBACK_CATALOG);
  const [type, setType] = useState("revenue");
  const [preset, setPreset] = useState<PresetKey>("30d");
  const [range, setRange] = useState(() => presetRange("30d"));
  const [currency, setCurrency] = useState<Currency>("INR");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const meta = catalog.find((c) => c.type === type) ?? catalog[0];

  useEffect(() => {
    if (!token) return;
    opsFetch("/api/admin/reports")
      .then((r) => (r.ok ? r.json() : null))
      .then((c: CatalogItem[] | null) => { if (Array.isArray(c) && c.length) setCatalog(c); })
      .catch(() => {});
  }, [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams({ from: range.from, to: range.to });
      if (meta.currency) p.set("currency", currency);
      const res = await opsFetch(`/api/admin/reports/${type}?${p.toString()}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(Array.isArray(body.message) ? body.message.join(", ") : body.message || "Could not build this report");
      setReport(body as ReportData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build this report");
    } finally {
      setLoading(false);
    }
  }, [token, type, range, currency, meta.currency]);

  useEffect(() => { load(); }, [load]);

  function pickPreset(key: PresetKey) {
    setPreset(key);
    if (key !== "custom") setRange(presetRange(key));
  }

  const fileBase = `${type}_${range.from}_to_${range.to}`;
  // The report on screen may lag behind the picker while loading.
  const shown = report && report.type === type ? report : null;

  return (
    <div className="p-4 pb-16">
      <div className="flex items-baseline gap-2.5 mb-4">
        <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>📊 Data Reports</span>
        <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>business numbers by date — download any table as CSV</span>
      </div>

      {/* Report picker */}
      <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Reports">
        {catalog.map((c) => {
          const on = c.type === type;
          return (
            <button
              key={c.type}
              role="tab"
              aria-selected={on}
              onClick={() => setType(c.type)}
              title={c.description}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[11px] font-semibold cursor-pointer transition-colors"
              style={{ background: on ? "var(--orange)" : "var(--surface)", color: on ? "#fff" : "var(--text2)", border: `1px solid ${on ? "var(--orange)" : "var(--border)"}` }}
            >
              <span>{c.icon}</span> {c.title}
            </button>
          );
        })}
      </div>

      {/* Date range + currency */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4 rounded-xl px-3 py-2.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-1 flex-wrap">
          {PRESETS.map((p) => {
            const on = preset === p.key;
            return (
              <button
                key={p.key}
                onClick={() => pickPreset(p.key)}
                className="px-2.5 py-1 rounded-md font-mono text-[10.5px] font-semibold cursor-pointer"
                style={{ background: on ? "var(--panel)" : "transparent", color: on ? "var(--text)" : "var(--text3)", border: `1px solid ${on ? "var(--border2, var(--border))" : "transparent"}` }}
              >
                {p.label}
              </button>
            );
          })}
          {preset === "custom" && (
            <span className="flex items-center gap-1.5 ml-2">
              <input type="date" value={range.from} max={range.to} onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))} aria-label="From date" className="font-mono text-[11px] px-2 py-1 rounded outline-none" style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }} />
              <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>to</span>
              <input type="date" value={range.to} min={range.from} max={todayIst()} onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))} aria-label="To date" className="font-mono text-[11px] px-2 py-1 rounded outline-none" style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }} />
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {meta.currency && (
            <div className="flex items-center gap-1 rounded-md px-1 py-[2px]" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
              {(["INR", "USD"] as Currency[]).map((c) => (
                <button key={c} onClick={() => setCurrency(c)} className="px-2.5 py-0.5 rounded font-mono text-[10.5px] font-semibold cursor-pointer" style={{ background: currency === c ? "var(--orange)" : "transparent", color: currency === c ? "#fff" : "var(--text2)", border: "none" }}>
                  {c === "INR" ? "₹ INR" : "$ USD"}
                </button>
              ))}
            </div>
          )}
          <button onClick={load} className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer" style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}>↻ Refresh</button>
        </div>
      </div>

      <div className="font-mono text-[10.5px] mb-3" style={{ color: "var(--text3)" }}>
        {meta.title} · {fmtRangeDate(range.from)} – {fmtRangeDate(range.to)}
        {shown?.kpis.some((k) => k.deltaPct != null) ? " · ▲▼ compare with the period just before" : ""}
        {loading ? " · loading…" : ""}
      </div>

      {error ? (
        <div className="rounded-xl p-6 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="text-[13px] font-bold mb-1" style={{ color: "var(--red)" }}>Couldn’t build this report</div>
          <div className="text-[12px] mb-3" style={{ color: "var(--text2)" }}>{error}</div>
          <button onClick={load} className="font-mono text-[10.5px] font-semibold px-3 py-1.5 rounded cursor-pointer" style={{ background: "var(--orange)", color: "#fff", border: "none" }}>Try again</button>
        </div>
      ) : !shown ? (
        <div className="rounded-xl p-10 text-center font-mono text-[11px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text3)" }}>Building report…</div>
      ) : (
        <div className="flex flex-col gap-4" style={{ opacity: loading ? 0.55 : 1, transition: "opacity .15s" }}>
          <p className="text-[12px]" style={{ color: "var(--text2)" }}>{shown.description}</p>

          {/* KPIs */}
          <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))" }}>
            {shown.kpis.map((k) => (
              <div key={k.label} className="rounded-xl px-3.5 py-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--text3)" }}>{k.label}</div>
                <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                  <span className="text-[17px] font-extrabold tracking-tight tabular-nums" style={{ color: "var(--text)" }}>
                    {formatValue(k.value, k.format, shown.currency)}
                  </span>
                  <DeltaChip k={k} />
                </div>
                {k.hint && <div className="text-[10px] mt-0.5" style={{ color: "var(--text3)" }}>{k.hint}</div>}
              </div>
            ))}
          </div>

          {shown.chart && (
            <div className="rounded-xl p-3.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <ReportChart chart={shown.chart} currency={shown.currency} />
            </div>
          )}

          {shown.tables.map((t) => (
            <DataTable key={t.title} table={t} report={shown} fileBase={fileBase} />
          ))}

          {shown.notes.length > 0 && (
            <ul className="text-[11px] leading-relaxed list-disc pl-5" style={{ color: "var(--text3)" }}>
              {shown.notes.map((n) => <li key={n}>{n}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
