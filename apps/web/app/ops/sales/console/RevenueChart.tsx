"use client";

import { useEffect, useRef, useState } from "react";
import { Chart } from "chart.js/auto";
import type { RevenueSeries } from "../lib/types";

interface RevenueChartProps {
  monthly: RevenueSeries;
  yearly: RevenueSeries;
}

function fmtL(n: number): string {
  return `₹${(n / 100000).toFixed(1)}L`;
}

export default function RevenueChart({ monthly, yearly }: RevenueChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [range, setRange] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const series = range === "monthly" ? monthly : yearly;

    const gridColor = getComputedStyle(document.documentElement).getPropertyValue("--border").trim() || "rgba(120,120,120,.15)";
    const textColor = getComputedStyle(document.documentElement).getPropertyValue("--text3").trim() || "#888";
    const onlineColor = getComputedStyle(document.documentElement).getPropertyValue("--blue").trim() || "#3b82f6";
    const offlineColor = getComputedStyle(document.documentElement).getPropertyValue("--purple").trim() || "#a855f7";

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: "Online",
            data: series.online,
            backgroundColor: onlineColor,
            borderRadius: 3,
            barPercentage: 0.55,
          },
          {
            label: "Offline",
            data: series.offline,
            backgroundColor: offlineColor,
            borderRadius: 3,
            barPercentage: 0.55,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true,
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              color: textColor,
              font: { family: "ui-monospace, monospace", size: 10 },
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx: any) => `${ctx.dataset.label}: ${fmtL(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: "ui-monospace, monospace", size: 9.5 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: "ui-monospace, monospace", size: 9.5 },
              callback: (v: any) => fmtL(Number(v)),
            },
          },
        },
      },
    });

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [range, monthly, yearly]);

  const series = range === "monthly" ? monthly : yearly;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--blue)" }} />
            <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>ONLINE {fmtL(series.onlineTotal)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--purple)" }} />
            <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>OFFLINE {fmtL(series.offlineTotal)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded" style={{ border: "1px solid var(--border)", background: "var(--panel)" }}>
          {(["monthly", "yearly"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="font-mono text-[8.5px] font-bold px-2 py-1 cursor-pointer capitalize rounded"
              style={{
                background: range === r ? "var(--orange)" : "transparent",
                color: range === r ? "#fff" : "var(--text2)",
                border: "none",
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div style={{ height: 220, position: "relative" }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}