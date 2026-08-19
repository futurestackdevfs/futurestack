"use client";

import { useState, useMemo } from "react";

const tickets = [
  { id: 1001, student: "Rahul Sharma", issue: "Payment gateway error", priority: "High", status: "Open", created: "2026-06-29", assignee: "You" },
  { id: 1002, student: "Priya Patel", issue: "Course content not loading", priority: "Medium", status: "In Progress", created: "2026-06-28", assignee: "You" },
  { id: 1003, student: "Amit Singh", issue: "Batch change request", priority: "Low", status: "Open", created: "2026-06-27", assignee: "Unassigned" },
  { id: 1004, student: "Sneha Reddy", issue: "Certificate not issued", priority: "High", status: "In Progress", created: "2026-06-26", assignee: "You" },
  { id: 1005, student: "Vikram Joshi", issue: "Login issue", priority: "Medium", status: "Resolved", created: "2026-06-25", assignee: "You" },
  { id: 1006, student: "Neha Gupta", issue: "Refund request", priority: "High", status: "Open", created: "2026-06-24", assignee: "Unassigned" },
];

export default function SupportDashboardContent({ onAddStaff, addLabel, searchQuery = "" }: { onAddStaff?: () => void; addLabel?: string; searchQuery?: string }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const eq = searchQuery.toLowerCase().trim();
    if (!q && !eq) return tickets;
    return tickets.filter((t) => Object.values(t).some((v) => String(v).toLowerCase().includes(q) || String(v).toLowerCase().includes(eq)));
  }, [search, searchQuery]);

  const openTickets = tickets.filter((t) => t.status !== "Resolved").length;
  const highPriority = tickets.filter((t) => t.priority === "High" && t.status !== "Resolved").length;

  return (
    <div className="p-4 pb-7">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>🎧 Support Dashboard</span>
          <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>role::support_lead · {openTickets} open tickets</span>
        </div>
        <div className="flex items-center gap-2">
          {onAddStaff && (
            <button
              onClick={onAddStaff}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
              style={{ background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >
              + Add {addLabel}
            </button>
          )}
          <input placeholder="Search tickets…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="font-mono text-[10.5px] px-2.5 py-1.5 rounded outline-none w-48"
            style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }} />
        </div>
      </div>

      <div className="grid grid-cols-4 rounded overflow-hidden mb-4" style={{ border: "1px solid var(--border)", background: "var(--border)", gap: 1 }}>
        {[
          { label: "Open Tickets", value: openTickets, delta: `${tickets.length} total this week`, color: "var(--orange)" },
          { label: "High Priority", value: highPriority, delta: "needs immediate attention", color: "var(--red)" },
          { label: "Avg Response", value: "2.4 hrs", delta: "last 7 days", color: "var(--blue)" },
          { label: "Resolution Rate", value: "87%", delta: "this month", color: "var(--green)" },
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
            <tr>{["Ticket", "Student", "Issue", "Priority", "Status", "Assignee", "Actions"].map((h) => (
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
                <td className="px-2.5 py-1.5 font-mono font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>#{t.id}</td>
                <td className="px-2.5 py-1.5" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{t.student}</td>
                <td className="px-2.5 py-1.5" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{t.issue}</td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{
                      background: t.priority === "High" ? "var(--red-d)" : t.priority === "Medium" ? "var(--amber-d)" : "var(--blue-d)",
                      color: t.priority === "High" ? "var(--red)" : t.priority === "Medium" ? "var(--amber)" : "var(--blue)",
                    }}>{t.priority}</span>
                </td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{
                      background: t.status === "Open" ? "var(--blue-d)" : t.status === "In Progress" ? "var(--amber-d)" : "var(--green-d)",
                      color: t.status === "Open" ? "var(--blue)" : t.status === "In Progress" ? "var(--amber)" : "var(--green)",
                    }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: t.status === "Open" ? "var(--blue)" : t.status === "In Progress" ? "var(--amber)" : "var(--green)" }} />
                    {t.status}
                  </span>
                </td>
                <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: t.assignee === "Unassigned" ? "var(--red)" : "var(--text2)", borderBottom: "1px solid var(--border)" }}>{t.assignee}</td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex gap-1">
                    <button className="w-[22px] h-[22px] flex items-center justify-center rounded text-[11px] cursor-pointer"
                      style={{ color: "var(--text3)", border: "1px solid var(--border)", background: "var(--surface)" }}>👁</button>
                    <button className="w-[22px] h-[22px] flex items-center justify-center rounded text-[11px] cursor-pointer"
                      style={{ color: "var(--text3)", border: "1px solid var(--border)", background: "var(--surface)" }}>💬</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
