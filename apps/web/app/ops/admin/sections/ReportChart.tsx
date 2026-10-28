"use client";

import { useMemo, useState } from "react";
import { ChartData, Currency, formatValue } from "./report-format";

// Two series are validated for colour-blind separation on both light and dark
// surfaces; more than two are never needed by these reports.
const SERIES_COLORS = ["var(--blue)", "#f05a1a"];

const W = 800;
const H = 230;
const PAD = { top: 12, right: 8, bottom: 30, left: 56 };

/** A "nice" axis maximum and tick step (1, 2, 2.5, 5 × 10ⁿ). */
function niceScale(max: number, ticks = 4) {
  if (max <= 0) return { max: 1, step: 1 / ticks };
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  return { max: step * ticks, step };
}

function compact(n: number, format: ChartData["format"], currency?: Currency) {
  const abs = Math.abs(n);
  const short =
    abs >= 1e7 ? `${+(n / 1e7).toFixed(1)}Cr` : abs >= 1e5 ? `${+(n / 1e5).toFixed(1)}L` : abs >= 1e3 ? `${+(n / 1e3).toFixed(1)}k` : String(+n.toFixed(2));
  if (format === "money") return (currency === "USD" ? "$" : "₹") + short;
  return short;
}

export default function ReportChart({ chart, currency }: { chart: ChartData; currency?: Currency }) {
  const [hover, setHover] = useState<number | null>(null);

  const totals = useMemo(
    () => chart.labels.map((_, i) => chart.series.reduce((s, ser) => s + (ser.values[i] ?? 0), 0)),
    [chart],
  );
  const { max, step } = useMemo(() => niceScale(Math.max(0, ...totals)), [totals]);
  const hasData = totals.some((t) => t > 0);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const n = chart.labels.length;
  const slot = innerW / Math.max(n, 1);
  const barW = Math.max(3, Math.min(28, slot * 0.62));
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  // Show at most ~10 x labels so they never collide.
  const every = Math.max(1, Math.ceil(n / 10));
  const gridValues = Array.from({ length: 5 }, (_, i) => i * step);

  const cur = hover != null ? hover : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <div className="text-[12px] font-bold" style={{ color: "var(--text)" }}>{chart.title}</div>
        {chart.series.length > 1 && (
          <div className="flex items-center gap-3">
            {chart.series.map((s, i) => (
              <span key={s.name} className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: "var(--text2)" }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: SERIES_COLORS[i] }} />
                {s.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center font-mono text-[11px]" style={{ height: 120, color: "var(--text3)" }}>
          Nothing to chart in this period.
        </div>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto block"
            role="img"
            aria-label={`${chart.title}. Total ${formatValue(totals.reduce((a, b) => a + b, 0), chart.format, currency)}.`}
            onMouseLeave={() => setHover(null)}
          >
            {/* recessive grid + y axis labels */}
            {gridValues.map((g) => (
              <g key={g}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y(g)} y2={y(g)} stroke="var(--border)" strokeWidth={1} strokeDasharray={g === 0 ? undefined : "3 4"} />
                <text x={PAD.left - 8} y={y(g) + 3} textAnchor="end" fontSize={10} fill="var(--text3)" fontFamily="ui-monospace, monospace">
                  {compact(g, chart.format, currency)}
                </text>
              </g>
            ))}

            {chart.labels.map((label, i) => {
              const cx = PAD.left + slot * i + slot / 2;
              let acc = 0;
              return (
                <g key={`${label}-${i}`}>
                  {/* wide invisible hit target — bigger than the mark */}
                  <rect
                    x={PAD.left + slot * i}
                    y={PAD.top}
                    width={slot}
                    height={innerH}
                    fill={cur === i ? "var(--border)" : "transparent"}
                    opacity={cur === i ? 0.35 : 1}
                    onMouseEnter={() => setHover(i)}
                  />
                  {chart.series.map((s, si) => {
                    const v = s.values[i] ?? 0;
                    if (v <= 0) return null;
                    const top = y(acc + v);
                    const bottom = y(acc);
                    acc += v;
                    // 2px gap between stacked fills; only the top segment gets rounded ends
                    const isTop = chart.series.slice(si + 1).every((o) => (o.values[i] ?? 0) <= 0);
                    const h = Math.max(1, bottom - top - (si > 0 ? 2 : 0));
                    return (
                      <rect
                        key={s.name}
                        x={cx - barW / 2}
                        y={top}
                        width={barW}
                        height={h}
                        rx={isTop ? Math.min(4, barW / 2) : 0}
                        fill={SERIES_COLORS[si]}
                        pointerEvents="none"
                      />
                    );
                  })}
                  {i % every === 0 && (
                    <text x={cx} y={H - 10} textAnchor="middle" fontSize={10} fill="var(--text3)" fontFamily="ui-monospace, monospace">
                      {label.length > 12 ? label.slice(0, 11) + "…" : label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {cur != null && (
            <div
              className="absolute pointer-events-none rounded-md px-2.5 py-1.5 text-[11px] z-10"
              style={{
                top: 0,
                left: `${Math.min(78, Math.max(2, ((PAD.left + slot * cur + slot / 2) / W) * 100 - 8))}%`,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                boxShadow: "0 6px 18px rgba(0,0,0,.2)",
                color: "var(--text)",
                minWidth: 120,
              }}
            >
              <div className="font-mono text-[10px] mb-0.5" style={{ color: "var(--text3)" }}>{chart.labels[cur]}</div>
              {chart.series.map((s, si) => (
                <div key={s.name} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5" style={{ color: "var(--text2)" }}>
                    {chart.series.length > 1 && <span style={{ width: 8, height: 8, borderRadius: 2, background: SERIES_COLORS[si] }} />}
                    {s.name}
                  </span>
                  <b className="tabular-nums">{formatValue(s.values[cur] ?? 0, chart.format, currency)}</b>
                </div>
              ))}
              {chart.series.length > 1 && (
                <div className="flex items-center justify-between gap-3 mt-0.5 pt-0.5" style={{ borderTop: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--text2)" }}>Total</span>
                  <b className="tabular-nums">{formatValue(totals[cur], chart.format, currency)}</b>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
