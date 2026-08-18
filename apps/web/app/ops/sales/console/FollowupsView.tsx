"use client";

import { useEffect, useMemo, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import type { LeadRecord } from "../lib/types";
import { Panel, Th, Td, Pill, ActionBtn, ViewHeader } from "../sections/ui";
import { LeadModal } from "../sections/LeadModal";
import { LeadDetailModal } from "../sections/LeadDetailModal";

type FollowUpFilter = "all" | "overdue" | "today" | "upcoming" | "unscheduled";

const FILTERS: { key: FollowUpFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "unscheduled", label: "No Schedule" },
];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(iso: string, day: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return fmtDateTime(iso).split(",")[0];
}

function fmtRupee(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function FollowupsView({ onToast, onNewSale, searchQuery, refreshSignal, onMutate }: {
  onToast: (msg: string, type?: "success" | "danger") => void;
  onNewSale: () => void;
  searchQuery?: string;
  refreshSignal?: number;
  onMutate?: () => void;
}) {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FollowUpFilter>("all");
  const [detail, setDetail] = useState<LeadRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<LeadRecord | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await opsFetch("/api/sales/leads");
        if (!r.ok) throw new Error(`Failed to load leads (${r.status})`);
        const data = await r.json();
        if (active) setLeads(Array.isArray(data) ? data : []);
      } catch (err) {
        if (active) onToast(err instanceof Error ? err.message : "Failed to load leads", "danger");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [onToast, refreshSignal]);

  const groups = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const q = (searchQuery ?? "").trim().toLowerCase();
    const active = leads.filter((l) => l.status !== "Converted" && l.status !== "Dropped");
    const matched = q
      ? active.filter((l) => [l.name, l.email, l.phone, l.course, l.city].some((v) => v && v.toLowerCase().includes(q)))
      : active;

    const overdue = matched
      .filter((l) => l.nextFollowUp && new Date(l.nextFollowUp) < today)
      .sort((a, b) => +new Date(a.nextFollowUp!) - +new Date(b.nextFollowUp!));
    const todays = matched
      .filter((l) => l.nextFollowUp && sameDay(l.nextFollowUp, today))
      .sort((a, b) => +new Date(a.nextFollowUp!) - +new Date(b.nextFollowUp!));
    const upcoming = matched
      .filter((l) => l.nextFollowUp && new Date(l.nextFollowUp) >= tomorrow)
      .sort((a, b) => +new Date(a.nextFollowUp!) - +new Date(b.nextFollowUp!));
    const unscheduled = matched
      .filter((l) => !l.nextFollowUp)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

    return { overdue, todays, upcoming, unscheduled };
  }, [leads, searchQuery]);

  const counts: Record<FollowUpFilter, number> = {
    all: groups.overdue.length + groups.todays.length + groups.upcoming.length + groups.unscheduled.length,
    overdue: groups.overdue.length,
    today: groups.todays.length,
    upcoming: groups.upcoming.length,
    unscheduled: groups.unscheduled.length,
  };

  const visible = useMemo(() => {
    switch (filter) {
      case "overdue": return groups.overdue;
      case "today": return groups.todays;
      case "upcoming": return groups.upcoming;
      case "unscheduled": return groups.unscheduled;
      default: return [...groups.overdue, ...groups.todays, ...groups.upcoming, ...groups.unscheduled];
    }
  }, [filter, groups]);

  async function markDone(lead: LeadRecord) {
    try {
      const r = await opsFetch(`/api/sales/leads/${lead.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          lastContact: new Date().toISOString(),
          nextFollowUp: null,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({ message: `${r.status}` }));
        throw new Error(e.message ?? "Update failed");
      }
      const updated = await r.json();
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      onToast(`Follow-up done — ${updated.name}`, "success");
      onMutate?.();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Update failed", "danger");
    }
  }

  function handleSaved(msg: string) {
    setCreating(false);
    setEditing(null);
    setDetail(null);
    onToast(msg, "success");
    (async () => {
      try {
        const r = await opsFetch("/api/sales/leads");
        if (!r.ok) return;
        const data = await r.json();
        setLeads(Array.isArray(data) ? data : []);
      } catch { /* ignore */ }
    })();
    onMutate?.();
  }

  function leadRow(lead: LeadRecord, overdue?: boolean) {
    return (
      <tr key={lead.id} className="cursor-pointer" onClick={() => setDetail(lead)}>
        <Td mono>
          <div>{lead.name}</div>
          {lead.email && <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{lead.email}</div>}
        </Td>
        <Td>{lead.course ?? "Not sure yet"}</Td>
        <Td><Pill value={lead.status} /></Td>
        <Td mono color={overdue ? "var(--red)" : "var(--text)"}>{lead.nextFollowUp ? fmtDateTime(lead.nextFollowUp) : "—"}</Td>
        <Td mono>{lead.lastContact ? fmtDate(lead.lastContact) : "—"}</Td>
        <Td mono color="var(--text)">{lead.budget > 0 ? fmtRupee(lead.budget) : "—"}</Td>
        <Td>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {lead.nextFollowUp && (
              <ActionBtn solid color="var(--green)" onClick={() => markDone(lead)}>✓ DONE</ActionBtn>
            )}
            <ActionBtn color="var(--orange)" onClick={() => setEditing(lead)}>RE-SCHEDULE</ActionBtn>
          </div>
        </Td>
      </tr>
    );
  }

  const activePanels: { key: FollowUpFilter; title: string; rows: LeadRecord[]; overdue?: boolean }[] = [
    { key: "overdue", title: "⏰ Overdue", rows: groups.overdue, overdue: true },
    { key: "today", title: "🕒 Today", rows: groups.todays },
    { key: "upcoming", title: "📅 Upcoming", rows: groups.upcoming },
    { key: "unscheduled", title: "❓ No Follow-up Scheduled", rows: groups.unscheduled },
  ];

  return (
    <div className="p-4">
      <ViewHeader
        icon="📌"
        title="Follow-ups"
        meta={`${counts.all} ACTIVE LEADS · ${counts.overdue} OVERDUE`}
        action={
          <div className="flex items-center gap-2">
            <ActionBtn solid color="var(--orange)" onClick={() => setCreating(true)}>＋ NEW LEAD</ActionBtn>
            <ActionBtn color="var(--blue)" onClick={onNewSale}>＋ NEW SALE</ActionBtn>
          </div>
        }
      />

      {/* Filter strip */}
      <div className="flex items-center gap-1.5 mb-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="font-mono text-[8.5px] font-bold px-2 py-1 rounded cursor-pointer"
            style={{
              background: filter === f.key ? "var(--orange)" : "var(--panel)",
              color: filter === f.key ? "#fff" : "var(--text2)",
              border: `1px solid ${filter === f.key ? "var(--orange)" : "var(--border)"}`,
            }}
          >
            {f.label.toUpperCase()} ({counts[f.key]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading follow-ups…</div>
      ) : visible.length === 0 ? (
        <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>
          No leads in this bucket — schedule follow-ups from a lead&apos;s details
        </div>
      ) : filter === "all" ? (
        activePanels.map((p) => (
          <Panel key={p.key} title={p.title} count={`${p.rows.length} LEADS`}>
            {p.rows.length === 0 ? (
              <div className="flex items-center justify-center py-6 font-mono text-[10px]" style={{ color: "var(--text3)" }}>Nothing here — clear!</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <Th>Lead</Th>
                      <Th>Course Interest</Th>
                      <Th>Status</Th>
                      <Th>Next Follow-up</Th>
                      <Th>Last Contact</Th>
                      <Th>Budget</Th>
                      <Th>Actions</Th>
                    </tr>
                  </thead>
                  <tbody>{p.rows.map((l) => leadRow(l, p.overdue))}</tbody>
                </table>
              </div>
            )}
          </Panel>
        ))
      ) : (
        <Panel title={activePanels.find((p) => p.key === filter)?.title ?? "Leads"} count={`${visible.length} LEADS`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Lead</Th>
                  <Th>Course Interest</Th>
                  <Th>Status</Th>
                  <Th>Next Follow-up</Th>
                  <Th>Last Contact</Th>
                  <Th>Budget</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>{visible.map((l) => leadRow(l, filter === "overdue"))}</tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Detail modal */}
      {detail && (
        <LeadDetailModal
          lead={detail}
          onClose={() => setDetail(null)}
          onEdit={(l) => { setDetail(null); setEditing(l); }}
          onDelete={async (l) => {
            try {
              const r = await opsFetch(`/api/sales/leads/${l.id}`, { method: "DELETE" });
              if (!r.ok) throw new Error("Delete failed");
              setLeads((prev) => prev.filter((x) => x.id !== l.id));
              setDetail(null);
              onToast(`Lead deleted — ${l.name}`);
              onMutate?.();
            } catch (err) {
              onToast(err instanceof Error ? err.message : "Delete failed", "danger");
            }
          }}
          onConvert={async (l) => {
            try {
              const r = await opsFetch(`/api/sales/leads/${l.id}`, {
                method: "PATCH",
                body: JSON.stringify({ status: "Converted", score: 100 }),
              });
              if (!r.ok) throw new Error("Convert failed");
              const updated = await r.json();
              setLeads((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
              setDetail(null);
              onToast(`Lead converted — ${updated.name}`, "success");
              onMutate?.();
            } catch (err) {
              onToast(err instanceof Error ? err.message : "Convert failed", "danger");
            }
          }}
        />
      )}

      {/* Create / edit modal */}
      {(creating || editing) && (
        <LeadModal
          open
          lead={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={handleSaved}
          onError={(msg) => onToast(msg, "danger")}
        />
      )}
    </div>
  );
}