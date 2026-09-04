"use client";

import { useMemo } from "react";
import { KpiRow, Panel, ViewHeader, ActionBtn } from "@/app/ops/coordinator/sections/ui";
import {
  CATEGORY_LABEL,
  PRIORITY_STYLE,
  STATUS_STYLE,
  type Ticket,
  type TicketCategory,
  type TicketPriority,
  type TicketStats,
} from "../lib/types";

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

const ACTIVE = new Set(["OPEN", "PENDING"]);

function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <span className="font-mono text-[9.5px] w-[120px] shrink-0 truncate" style={{ color: "var(--text3)" }}>{label}</span>
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: "var(--panel)", border: "1px solid var(--border)" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
      <span className="font-mono text-[10px] font-bold w-[28px] text-right" style={{ color: "var(--text2)" }}>{value}</span>
    </div>
  );
}

export default function DashboardView({
  stats, tickets, meId, loading, onRefresh, onOpenTicket, onGoView,
}: {
  stats: TicketStats | null;
  tickets: Ticket[];
  meId: string;
  loading: boolean;
  onRefresh: () => void;
  onOpenTicket: (id: string) => void;
  onGoView: (v: string) => void;
}) {
  const d = useMemo(() => {
    const active = tickets.filter((t) => ACTIVE.has(t.status));
    const now = Date.now();
    const unassigned = active.filter((t) => !t.assignee).length;
    const mine = active.filter((t) => t.assignee?.id === meId).length;
    const urgentOpen = active.filter((t) => t.priority === "URGENT" || t.priority === "HIGH").length;
    const aging72 = active.filter((t) => now - new Date(t.createdAt).getTime() > 72 * 3600e3).length;
    const noReply = active.filter((t) => !t.lastAgentReply).length;
    const resolved24 = tickets.filter((t) => t.resolvedAt && now - new Date(t.resolvedAt).getTime() < 24 * 3600e3).length;

    const priorityMix = (["URGENT", "HIGH", "NORMAL", "LOW"] as TicketPriority[]).map((p) => ({
      p, n: active.filter((t) => t.priority === p).length,
    }));
    const catCount = new Map<TicketCategory, number>();
    for (const t of active) catCount.set(t.category, (catCount.get(t.category) ?? 0) + 1);
    const categoryMix = [...catCount.entries()].sort((a, b) => b[1] - a[1]);

    // Notification emails sent to students across the sample (derived from state).
    const emails = { opened: tickets.length, replies: 0, resolved: 0 };
    for (const t of tickets) {
      if (t.lastAgentReply) emails.replies += 1;
      if (t.resolvedAt) emails.resolved += 1;
    }
    emails.opened = tickets.length;
    const emailTotal = emails.opened + emails.replies + emails.resolved;

    const recent = [...tickets]
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
      .slice(0, 8);

    const oldest = [...active]
      .sort((a, b) => new Date(a.lastMessageAt).getTime() - new Date(b.lastMessageAt).getTime())
      .slice(0, 6);

    return { active, unassigned, mine, urgentOpen, aging72, noReply, resolved24, priorityMix, categoryMix, emails, emailTotal, recent, oldest };
  }, [tickets, meId]);

  const activeTotal = d.active.length || 1;

  return (
    <div className="p-4">
      <ViewHeader
        icon="🎧"
        title="Support Dashboard"
        meta={loading ? "SYNCING…" : "OVERVIEW · LIVE"}
        action={<ActionBtn color="var(--blue)" onClick={onRefresh}>REFRESH</ActionBtn>}
      />

      <KpiRow items={[
        { label: "Open", value: stats?.OPEN ?? 0, delta: "waiting on us", color: "var(--blue)" },
        { label: "Awaiting Student", value: stats?.PENDING ?? 0, delta: "replied, pending", color: "var(--amber)" },
        { label: "Unassigned", value: d.unassigned, delta: "needs an owner", color: d.unassigned ? "var(--red)" : "var(--text3)" },
        { label: "No Reply Yet", value: d.noReply, delta: "never answered", color: d.noReply ? "var(--red)" : "var(--text3)" },
        { label: "My Tickets", value: d.mine, delta: "assigned to me", color: "var(--orange)" },
        { label: "Aging > 72h", value: d.aging72, delta: "still active", color: d.aging72 ? "var(--red)" : "var(--text3)" },
        { label: "Resolved · 24h", value: d.resolved24, delta: "last day", color: "var(--green)" },
        { label: "All Tickets", value: stats?.TOTAL ?? 0, delta: "lifetime", color: "var(--purple)" },
      ]} />

      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[420px]">
          <Panel
            title="Needs attention — oldest active"
            count={`${d.oldest.length}`}
            action={<ActionBtn color="var(--orange)" onClick={() => onGoView("queue")}>OPEN QUEUE</ActionBtn>}
          >
            {d.oldest.length === 0 ? (
              <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>
                {loading ? "Loading…" : "Inbox zero — nothing waiting 🎉"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      {["Ref", "Subject", "Student", "Pri", "Status", "Owner", "Idle"].map((h) => (
                        <th key={h} className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5"
                          style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d.oldest.map((t, i) => (
                      <tr key={t.id} onClick={() => onOpenTicket(t.id)} className="cursor-pointer"
                        style={{ background: i % 2 === 0 ? "var(--surface)" : "var(--panel)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--blue-d)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? "var(--surface)" : "var(--panel)"; }}>
                        <td className="px-2.5 py-1.5 font-mono text-[9.5px] font-semibold" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{t.ref}</td>
                        <td className="px-2.5 py-1.5 text-[10.5px] font-medium max-w-[200px] truncate" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{t.subject}</td>
                        <td className="px-2.5 py-1.5 text-[10px] max-w-[120px] truncate" style={{ color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>{t.student.name}</td>
                        <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                          <span className="font-mono text-[8px] font-bold uppercase px-1 py-0.5 rounded" style={{ background: PRIORITY_STYLE[t.priority].bg, color: PRIORITY_STYLE[t.priority].color }}>{t.priority}</span>
                        </td>
                        <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                          <span className="font-mono text-[8px] font-bold uppercase px-1 py-0.5 rounded" style={{ background: STATUS_STYLE[t.status].bg, color: STATUS_STYLE[t.status].color }}>{STATUS_STYLE[t.status].label}</span>
                        </td>
                        <td className="px-2.5 py-1.5 text-[10px] max-w-[110px] truncate" style={{ color: t.assignee ? "var(--text2)" : "var(--red)", borderBottom: "1px solid var(--border)" }}>{t.assignee?.name ?? "unassigned"}</td>
                        <td className="px-2.5 py-1.5 font-mono text-[9.5px]" style={{ color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>{timeAgo(t.lastMessageAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Recent activity" count={`${d.recent.length} latest`}>
            {d.recent.length === 0 ? (
              <div className="flex items-center justify-center py-8 font-mono text-[11px]" style={{ color: "var(--text3)" }}>No activity yet</div>
            ) : (
              <div className="flex flex-col">
                {d.recent.map((t) => (
                  <div key={t.id} onClick={() => onOpenTicket(t.id)}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                    style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--panel)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                    <span className="font-mono text-[8.5px] font-bold w-[64px] shrink-0" style={{ color: "var(--text3)" }}>{t.ref.replace("FS-SUP-", "#")}</span>
                    <span className="text-[10.5px] flex-1 truncate" style={{ color: "var(--text2)" }}>{t.subject}</span>
                    <span className="text-[9.5px] shrink-0 max-w-[130px] truncate" style={{ color: "var(--text3)" }}>
                      {t.lastAgentReply ? `↩ ${t.lastAgentReply.by}` : `✉ ${t.student.name}`}
                    </span>
                    <span className="font-mono text-[9px] shrink-0" style={{ color: "var(--text3)" }}>{timeAgo(t.lastMessageAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="w-[300px] shrink-0">
          <Panel title="Active by priority" count={`${d.active.length}`}>
            <div className="py-1.5">
              {d.priorityMix.map(({ p, n }) => (
                <Bar key={p} label={p} value={n} total={activeTotal} color={PRIORITY_STYLE[p].color} />
              ))}
            </div>
          </Panel>

          <Panel title="Active by category" count={`${d.categoryMix.length}`}>
            <div className="py-1.5">
              {d.categoryMix.length === 0 ? (
                <div className="px-3 py-4 font-mono text-[10px]" style={{ color: "var(--text3)" }}>—</div>
              ) : d.categoryMix.map(([c, n]) => (
                <Bar key={c} label={CATEGORY_LABEL[c]} value={n} total={activeTotal} color="var(--blue)" />
              ))}
            </div>
          </Panel>

          <Panel title="Email notifications" count={`${d.emailTotal} sent`}>
            <div className="p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[9px] font-mono pb-1" style={{ color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>
                <span>from</span>
                <span style={{ color: "var(--text2)" }}>futurestack@agentmail.to</span>
              </div>
              {[
                { icon: "🎫", label: "Ticket confirmations", n: d.emails.opened, color: "var(--blue)" },
                { icon: "↩️", label: "Reply notifications", n: d.emails.replies, color: "var(--orange)" },
                { icon: "✅", label: "Resolved notifications", n: d.emails.resolved, color: "var(--green)" },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-2">
                  <span>{r.icon}</span>
                  <span className="text-[10.5px] flex-1" style={{ color: "var(--text2)" }}>{r.label}</span>
                  <span className="font-mono text-[11px] font-bold" style={{ color: r.color }}>{r.n}</span>
                </div>
              ))}
              <div className="text-[8.5px] mt-1" style={{ color: "var(--text3)" }}>
                Auto-sent to the student on open, every agent reply, and on resolve.
                Delivery is best-effort — failures are logged, not retried. Internal
                notes, student replies and closes send nothing.
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
