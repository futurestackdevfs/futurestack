"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { SupportConsoleBody } from "@/app/ops/support/SupportConsoleBody";
import {
  CATEGORY_LABEL,
  PRIORITY_STYLE,
  STATUS_STYLE,
  type Ticket,
  type TicketStats,
} from "@/app/ops/support/lib/types";

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const STATUS_FILTERS = ["OPEN", "PENDING", "RESOLVED", "CLOSED", ""] as const;

export default function SupportDashboardContent({
  onAddStaff,
  addLabel,
  searchQuery = "",
}: {
  onAddStaff?: () => void;
  addLabel?: string;
  searchQuery?: string;
}) {
  const [live, setLive] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const [rows, setRows] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const [localSearch, setLocalSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (statusFilter) params.set("status", statusFilter);
      const [listRes, statsRes] = await Promise.all([
        opsFetch(`/api/support/staff/tickets?${params}`),
        opsFetch(`/api/support/staff/stats`),
      ]);
      if (listRes.ok) setRows((await listRes.json()).data ?? []);
      if (statsRes.ok) setStats(await statsRes.json());
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = (localSearch + " " + searchQuery).toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((t) =>
      [t.ref, t.subject, t.student.name, t.student.email, CATEGORY_LABEL[t.category], t.assignee?.name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, localSearch, searchQuery]);

  // ── full console ──
  if (live) {
    return (
      <div className="flex flex-col" style={{ height: "calc(100vh - 84px)" }}>
        <div className="flex items-center justify-between px-4 py-2.5 shrink-0"
          style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => { setLive(false); setOpenId(null); load(); }}
            className="text-[11px] font-bold cursor-pointer" style={{ color: "var(--text3)" }}>
            ← Support Dashboard
          </button>
          {onAddStaff && (
            <button onClick={onAddStaff}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer"
              style={{ background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }}>
              + Add {addLabel}
            </button>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <SupportConsoleBody embedded initialTicketId={openId} />
        </div>
      </div>
    );
  }

  // ── dashboard table ──
  return (
    <div className="p-4 pb-7">
      <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>🎧 Support Dashboard</span>
          <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
            {stats ? `${stats.OPEN} open · ${stats.PENDING} awaiting student` : "loading…"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLive(true)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer"
            style={{ background: "var(--blue)", color: "#fff", border: "1px solid var(--blue)" }}>
            🎧 Open Support Console →
          </button>
          {onAddStaff && (
            <button onClick={onAddStaff}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer"
              style={{ background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }}>
              + Add {addLabel}
            </button>
          )}
          <input placeholder="Search…" value={localSearch} onChange={(e) => setLocalSearch(e.target.value)}
            className="font-mono text-[10.5px] px-2.5 py-1.5 rounded outline-none w-44"
            style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 rounded overflow-hidden mb-4" style={{ border: "1px solid var(--border)", background: "var(--border)", gap: 1 }}>
        {[
          { label: "Open", value: stats?.OPEN, color: "var(--blue)" },
          { label: "Awaiting Student", value: stats?.PENDING, color: "var(--amber, #b45309)" },
          { label: "Resolved", value: stats?.RESOLVED, color: "var(--green)" },
          { label: "Total", value: stats?.TOTAL, color: "var(--text2)" },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: "var(--surface)" }} className="px-3.5 py-2.5">
            <div className="font-mono text-[8.5px] uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>{kpi.label}</div>
            <div className="font-mono text-[19px] font-bold leading-none" style={{ color: kpi.color }}>{kpi.value ?? "—"}</div>
          </div>
        ))}
      </div>

      {/* status filter */}
      <div className="flex gap-1.5 mb-3">
        {STATUS_FILTERS.map((s) => (
          <button key={s || "all"} onClick={() => setStatusFilter(s)}
            className="px-2.5 py-1 rounded-md text-[10px] font-semibold cursor-pointer"
            style={{
              background: statusFilter === s ? "var(--blue)" : "var(--panel)",
              color: statusFilter === s ? "#fff" : "var(--text2)",
              border: "1px solid var(--border)",
            }}>{s ? STATUS_STYLE[s as keyof typeof STATUS_STYLE].label : "All"}</button>
        ))}
      </div>

      <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-3 py-2" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>🎫 Tickets</span>
          <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{filtered.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ fontSize: 11, minWidth: 900 }}>
            <thead>
              <tr>{["Ref", "Student", "Subject", "Category", "Priority", "Status", "Last support reply", "Assignee", ""].map((h) => (
                <th key={h} className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5"
                  style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-2.5 py-6 text-center" style={{ color: "var(--text3)" }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-2.5 py-6 text-center" style={{ color: "var(--text3)" }}>No tickets.</td></tr>
              ) : filtered.map((t, idx) => (
                <tr key={t.id}
                  onClick={() => { setOpenId(t.id); setLive(true); }}
                  className="cursor-pointer"
                  style={{ background: idx % 2 === 0 ? "var(--surface)" : "var(--panel)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-h, #eef3fb)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? "var(--surface)" : "var(--panel)"; }}>
                  <td className="px-2.5 py-1.5 font-mono font-semibold whitespace-nowrap" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{t.ref}</td>
                  <td className="px-2.5 py-1.5" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{t.student.name}</td>
                  <td className="px-2.5 py-1.5 max-w-[220px] truncate" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{t.subject}</td>
                  <td className="px-2.5 py-1.5 whitespace-nowrap" style={{ color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>{CATEGORY_LABEL[t.category]}</td>
                  <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span className="inline-flex font-mono text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                      style={{ background: PRIORITY_STYLE[t.priority].bg, color: PRIORITY_STYLE[t.priority].color }}>{t.priority}</span>
                  </td>
                  <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                      style={{ background: STATUS_STYLE[t.status].bg, color: STATUS_STYLE[t.status].color }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: STATUS_STYLE[t.status].color }} />
                      {STATUS_STYLE[t.status].label}
                    </span>
                  </td>
                  <td className="px-2.5 py-1.5 whitespace-nowrap" style={{ borderBottom: "1px solid var(--border)" }}>
                    {t.lastAgentReply ? (
                      <span style={{ color: "var(--text2)" }}>
                        {t.lastAgentReply.by}
                        <span className="font-mono text-[9px] ml-1.5" style={{ color: "var(--text3)" }}>· {timeAgo(t.lastAgentReply.at)}</span>
                      </span>
                    ) : (
                      <span className="font-mono text-[10px]" style={{ color: "var(--red)" }}>no reply yet</span>
                    )}
                  </td>
                  <td className="px-2.5 py-1.5 font-mono text-[10px] whitespace-nowrap"
                    style={{ color: t.assignee ? "var(--text2)" : "var(--red)", borderBottom: "1px solid var(--border)" }}>
                    {t.assignee?.name ?? "Unassigned"}
                  </td>
                  <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span className="text-[11px]" style={{ color: "var(--text3)" }}>open →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
