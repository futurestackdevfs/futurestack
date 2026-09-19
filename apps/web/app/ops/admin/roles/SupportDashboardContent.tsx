"use client";

import { useState, useEffect, useMemo } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";

interface Ticket {
  id: string;
  number: number;
  subject: string;
  priority: string;
  status: string;
  student: { name: string; email: string } | null;
  assignee: { name: string } | null;
  createdAt: string;
}

interface Stats {
  OPEN: number;
  PENDING: number;
  RESOLVED: number;
  CLOSED: number;
  TOTAL: number;
}

export default function SupportDashboardContent() {
  const [search, setSearch] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      opsFetch("/api/support/staff/tickets?limit=20").then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
      opsFetch("/api/support/staff/stats").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([ticketsRes, statsRes]) => {
      if (cancelled) return;
      setTickets(Array.isArray(ticketsRes?.data) ? ticketsRes.data : []);
      setStats(statsRes);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!search) return tickets;
    const q = search.toLowerCase();
    return tickets.filter((t) => `${t.subject} ${t.student?.name ?? ""} ${t.priority} ${t.status}`.toLowerCase().includes(q));
  }, [tickets, search]);

  const openCount = (stats?.OPEN ?? 0) + (stats?.PENDING ?? 0);
  const highPriorityOpen = tickets.filter((t) => t.priority === "HIGH" && t.status !== "RESOLVED" && t.status !== "CLOSED").length;

  if (loading) return (
    <div className="p-4 font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading support dashboard…</div>
  );

  return (
    <div className="p-4 pb-7">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>🎧 Support Dashboard</span>
          <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>role::support_lead · {openCount} open tickets</span>
        </div>
        <input placeholder="Search tickets…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="font-mono text-[10.5px] px-2.5 py-1.5 rounded outline-none w-48"
          style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }} />
      </div>

      <div className="grid grid-cols-4 rounded overflow-hidden mb-4" style={{ border: "1px solid var(--border)", background: "var(--border)", gap: 1 }}>
        {[
          { label: "Open Tickets", value: openCount, delta: `${stats?.TOTAL ?? 0} total`, color: "var(--orange)" },
          { label: "High Priority", value: highPriorityOpen, delta: "needs attention", color: "var(--red)" },
          { label: "Resolved", value: stats?.RESOLVED ?? 0, delta: "all time", color: "var(--green)" },
          { label: "Closed", value: stats?.CLOSED ?? 0, delta: "all time", color: "var(--blue)" },
        ].map((kpi, i) => (
          <div key={i} style={{ background: "var(--surface)" }} className="px-3.5 py-2.5">
            <div className="font-mono text-[8.5px] uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>{kpi.label}</div>
            <div className="font-mono text-[19px] font-bold leading-none" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="font-mono text-[8.5px] mt-0.5" style={{ color: "var(--text3)" }}>{kpi.delta}</div>
          </div>
        ))}
      </div>

      <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-3 py-2" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>🎫 Support Tickets</span>
          <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{filtered.length} tickets</span>
        </div>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr>{["Ticket", "Student", "Subject", "Priority", "Status", "Assignee"].map((h) => (
              <th key={h} className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5"
                style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map((t, idx) => (
              <tr key={t.id}
                style={{ background: idx % 2 === 0 ? "var(--surface)" : "var(--panel)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-h)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? "var(--surface)" : "var(--panel)"; }}
              >
                <td className="px-2.5 py-1.5 font-mono font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>#{t.number}</td>
                <td className="px-2.5 py-1.5" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{t.student?.name ?? "—"}</td>
                <td className="px-2.5 py-1.5" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{t.subject}</td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{
                      background: t.priority === "HIGH" ? "var(--red-d)" : t.priority === "MEDIUM" ? "var(--amber-d)" : "var(--blue-d)",
                      color: t.priority === "HIGH" ? "var(--red)" : t.priority === "MEDIUM" ? "var(--amber)" : "var(--blue)",
                    }}>{t.priority}</span>
                </td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{
                      background: t.status === "OPEN" ? "var(--blue-d)" : t.status === "PENDING" ? "var(--amber-d)" : "var(--green-d)",
                      color: t.status === "OPEN" ? "var(--blue)" : t.status === "PENDING" ? "var(--amber)" : "var(--green)",
                    }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: t.status === "OPEN" ? "var(--blue)" : t.status === "PENDING" ? "var(--amber)" : "var(--green)" }} />
                    {t.status}
                  </span>
                </td>
                <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: t.assignee ? "var(--text2)" : "var(--red)", borderBottom: "1px solid var(--border)" }}>{t.assignee?.name ?? "Unassigned"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="font-mono text-[10.5px] py-3 text-center" style={{ color: "var(--text3)" }}>No tickets found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
