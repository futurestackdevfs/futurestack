"use client";

import { useCallback, useEffect, useState } from "react";

interface HealthResponse {
  status: "ok" | "degraded";
  dbOk: boolean;
  dbLatencyMs: number;
  uptimeSec: number;
  timestamp: string;
}

function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

export default function SystemHealthManager() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [reqLatencyMs, setReqLatencyMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    const startedAt = performance.now();
    try {
      const res = await fetch("/api/healthz", { cache: "no-store" });
      const data: HealthResponse = await res.json();
      setHealth(data);
      setError(res.ok ? null : "API responded but reported an unhealthy status.");
    } catch {
      setHealth(null);
      setError("Could not reach the API — it may be down or unreachable.");
    } finally {
      setReqLatencyMs(Math.round(performance.now() - startedAt));
      setCheckedAt(new Date());
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, [check]);

  const apiUp = health?.status === "ok" || (health != null && !error && health.status !== "degraded");
  const overallUp = !error && health?.status === "ok";

  const tiles: { label: string; value: string; color: string; icon: string }[] = [
    {
      label: "API Server",
      value: loading ? "Checking…" : error ? "Unreachable" : "Online",
      color: loading ? "var(--text3)" : error ? "var(--red)" : "var(--green)",
      icon: "🖥",
    },
    {
      label: "Database",
      value: loading ? "Checking…" : health?.dbOk ? "Connected" : "Unreachable",
      color: loading ? "var(--text3)" : health?.dbOk ? "var(--green)" : "var(--red)",
      icon: "🗄",
    },
    {
      label: "DB Latency",
      value: health ? `${health.dbLatencyMs} ms` : "—",
      color: "var(--text)",
      icon: "⚡",
    },
    {
      label: "Round Trip",
      value: reqLatencyMs != null ? `${reqLatencyMs} ms` : "—",
      color: "var(--text)",
      icon: "↔",
    },
    {
      label: "Process Uptime",
      value: health ? fmtUptime(health.uptimeSec) : "—",
      color: "var(--text)",
      icon: "⏱",
    },
  ];

  return (
    <div className="p-4 pb-7">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
            🖥 System Health
          </span>
          <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
            /healthz · polling every 15s
          </span>
        </div>
        <button
          onClick={check}
          className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer"
          style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
        >↻ Check Now</button>
      </div>

      <div
        className="flex items-center gap-3 px-4 py-3 rounded mb-3.5"
        style={{
          background: overallUp ? "var(--green-d)" : loading ? "var(--panel)" : "var(--red-d)",
          border: `1px solid ${overallUp ? "var(--green)" : loading ? "var(--border)" : "var(--red)"}`,
        }}
      >
        <span className="text-[20px]">{loading ? "⏳" : overallUp ? "✅" : "🚨"}</span>
        <div className="flex-1">
          <div className="text-[13px] font-bold" style={{ color: overallUp ? "var(--green)" : loading ? "var(--text)" : "var(--red)" }}>
            {loading ? "Checking system status…" : overallUp ? "All systems operational" : error ?? "System reporting degraded status"}
          </div>
          {checkedAt && (
            <div className="text-[10px] mt-0.5" style={{ color: "var(--text3)" }}>
              Last checked {checkedAt.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded p-3"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[13px]">{t.icon}</span>
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text3)" }}>
                {t.label}
              </span>
            </div>
            <div className="text-[15px] font-extrabold" style={{ color: t.color }}>{t.value}</div>
          </div>
        ))}
      </div>

      <div
        className="mt-3.5 rounded overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div
          className="px-3 py-2 font-mono text-[9.5px] font-bold uppercase tracking-wider"
          style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)", color: "var(--text2)" }}
        >
          Raw response
        </div>
        <pre
          className="px-3 py-2.5 text-[11px] font-mono overflow-x-auto"
          style={{ color: "var(--text2)" }}
        >
          {health ? JSON.stringify(health, null, 2) : error ?? "—"}
        </pre>
      </div>
    </div>
  );
}
