"use client";

import { useCallback, useEffect, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import EscalationDetail from "./EscalationDetail";
import {
  EscalationRow,
  EscSettings,
  EscSeverity,
  EscSummary,
  EscType,
  SEVERITY_META,
  STATUS_META,
  StaffUser,
  TYPE_META,
  fmtAge,
  fmtDue,
  isActive,
} from "./escalation-types";

const PER_PAGE = 20;

const TABS = [
  { key: "ACTIVE", label: "Active" },
  { key: "MINE", label: "Mine" },
  { key: "OVERDUE", label: "SLA breached" },
  { key: "CLOSED", label: "Closed" },
  { key: "ALL", label: "All" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const SETTING_FIELDS: { key: keyof Omit<EscSettings, "alertsEnabled">; label: string; unit: string; hint: string; min: number; max: number }[] = [
  { key: "ticketSlaHours", label: "Support ticket SLA", unit: "hours", hint: "A ticket still waiting on an agent after this long is escalated.", min: 1, max: 720 },
  { key: "refundPendingHours", label: "Refund pending limit", unit: "hours", hint: "A refund not approved within this time is escalated.", min: 1, max: 720 },
  { key: "paidGraceMinutes", label: "Paid-order grace", unit: "minutes", hint: "How long a paid order may take to get its enrollment and invoice before it's flagged.", min: 5, max: 1440 },
  { key: "complaintMinCount", label: "Complaint threshold", unit: "reviews", hint: "Low-rating (2★ or less) reviews on one course needed to escalate it.", min: 1, max: 100 },
  { key: "complaintWindowDays", label: "Complaint window", unit: "days", hint: "How far back low ratings are counted.", min: 1, max: 90 },
  { key: "coordinatorSlaDays", label: "Coordinator SLA", unit: "days", hint: "A trainer flag the coordinator hasn't resolved by then is escalated to you.", min: 1, max: 60 },
  { key: "ticketAutoCloseDays", label: "Auto-close idle tickets", unit: "days", hint: "A support ticket waiting on the student (or resolved) with no reply for this long is closed automatically. Support can reopen it any time.", min: 1, max: 30 },
  { key: "resolveSlaHours", label: "Resolve-by time", unit: "hours", hint: "Default time an escalation has before it counts as an SLA breach.", min: 1, max: 720 },
];

function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span className="font-mono text-[9.5px] font-bold px-2 py-[3px] rounded-full whitespace-nowrap" style={{ color, background: bg }}>
      {label}
    </span>
  );
}

function Modal({ title, onClose, children, width = 440 }: { title: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-6" style={{ background: "var(--overlay)" }} onClick={onClose}>
      <div
        className="flex flex-col rounded-lg max-w-full max-h-[90vh]"
        style={{ width, background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-[13.5px] font-extrabold" style={{ color: "var(--text)" }}>{title}</span>
          <button onClick={onClose} aria-label="Close" className="cursor-pointer" style={{ background: "transparent", border: "none", color: "var(--text2)" }}>✕</button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

const inputStyle = { border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" } as const;

export default function EscalationsManager({ searchQuery = "", onCountChange }: { token: string; searchQuery?: string; onCountChange?: (n: number) => void }) {
  const [rows, setRows] = useState<EscalationRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, perPage: PER_PAGE, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState<EscSummary | null>(null);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<TabKey>("ACTIVE");
  const [type, setType] = useState("");
  const [severity, setSeverity] = useState("");
  const [owner, setOwner] = useState("");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState(searchQuery);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [bulkNote, setBulkNote] = useState<"RESOLVE" | "DISMISS" | null>(null);
  const [noteText, setNoteText] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "danger" }[]>([]);

  const addToast = useCallback((msg: string, type: "success" | "danger" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  // Debounce the topbar search.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadSummary = useCallback(async () => {
    try {
      const res = await opsFetch("/api/admin/escalations/summary");
      if (!res.ok) return;
      const s = (await res.json()) as EscSummary;
      setSummary(s);
      onCountChange?.(s.active);
    } catch {
      /* KPIs are best-effort */
    }
  }, [onCountChange]);

  const loadList = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tab === "ACTIVE" || tab === "MINE") params.set("status", "ACTIVE");
    if (tab === "CLOSED") params.set("status", "CLOSED");
    if (tab === "OVERDUE") params.set("overdue", "true");
    if (tab === "MINE") params.set("assignee", "me");
    if (type) params.set("type", type);
    if (severity) params.set("severity", severity);
    if (owner && tab !== "MINE") params.set("assignee", owner);
    if (q.trim()) params.set("q", q.trim());
    params.set("page", String(page));
    params.set("perPage", String(PER_PAGE));
    try {
      const res = await opsFetch(`/api/admin/escalations?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load escalations");
      const body = (await res.json()) as { items: EscalationRow[]; pagination: typeof pagination };
      setRows(body.items);
      setPagination(body.pagination);
      setSelected(new Set());
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to load escalations", "danger");
    } finally {
      setLoading(false);
    }
  }, [tab, type, severity, owner, q, page, addToast]);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => {
    opsFetch("/api/admin/escalations/staff")
      .then((r) => (r.ok ? r.json() : []))
      .then((s: StaffUser[]) => setStaff(Array.isArray(s) ? s : []))
      .catch(() => setStaff([]));
  }, []);

  const refreshAll = useCallback(() => { loadList(); loadSummary(); }, [loadList, loadSummary]);

  function resetTo(next: Partial<{ tab: TabKey; type: string; severity: string; owner: string }>) {
    if (next.tab !== undefined) setTab(next.tab);
    if (next.type !== undefined) setType(next.type);
    if (next.severity !== undefined) setSeverity(next.severity);
    if (next.owner !== undefined) setOwner(next.owner);
    setPage(1);
  }

  async function scanNow() {
    setScanning(true);
    try {
      const res = await opsFetch("/api/admin/escalations/scan", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Scan failed");
      addToast(
        body.skipped
          ? "A scan is already running"
          : `Scan done — ${body.raised} new, ${body.autoResolved} auto-resolved`,
        "success",
      );
      refreshAll();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Scan failed", "danger");
    } finally {
      setScanning(false);
    }
  }

  async function runBulk(action: "RESOLVE" | "DISMISS" | "ASSIGN", extra: { note?: string; assigneeId?: string } = {}) {
    const ids = [...selected];
    try {
      const res = await opsFetch("/api/admin/escalations/bulk", { method: "POST", body: JSON.stringify({ ids, action, ...extra }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Bulk action failed");
      addToast(
        body.failed?.length ? `${body.done} done, ${body.failed.length} failed` : `${body.done} updated`,
        body.failed?.length ? "danger" : "success",
      );
      setBulkNote(null);
      setNoteText("");
      setBulkAssignee("");
      refreshAll();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Bulk action failed", "danger");
    }
  }

  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  function toggleAll() {
    setSelected(allOnPage ? new Set() : new Set(rows.map((r) => r.id)));
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const kpi = (value: React.ReactNode, label: string, color: string) => (
    <div className="flex-1 min-w-[112px] rounded-xl px-3.5 py-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="text-[13px] font-extrabold tracking-tight tabular-nums" style={{ color }}>{value}</div>
      <div className="text-[10px] font-medium mt-0.5 uppercase tracking-wider" style={{ color: "var(--text3)" }}>{label}</div>
    </div>
  );

  const selectCls = "font-mono text-[10.5px] px-2 py-1 rounded outline-none cursor-pointer";
  const from = pagination.total > 0 ? (pagination.page - 1) * pagination.perPage + 1 : 0;
  const to = Math.min(pagination.page * pagination.perPage, pagination.total);

  return (
    <div className="p-4 pb-16">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>🚨 Escalations</span>
          <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>problems that need someone senior — raised by people and found automatically</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(true)} className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer" style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}>⚙ Rules & alerts</button>
          <button onClick={scanNow} disabled={scanning} className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer disabled:opacity-60" style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}>{scanning ? "Scanning…" : "🔍 Scan now"}</button>
          <button onClick={() => setShowNew(true)} className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer" style={{ background: "var(--orange)", color: "#fff", border: "none" }}>+ New escalation</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="flex flex-wrap gap-2.5 mb-4">
        {kpi(summary?.active ?? 0, "Active", "var(--text)")}
        {kpi(summary?.critical ?? 0, "Critical", "var(--red)")}
        {kpi(summary?.breached ?? 0, "SLA breached", "#d97706")}
        {kpi(summary?.resolvedToday ?? 0, "Resolved today", "var(--green)")}
        {kpi(summary?.avgResolveHours != null ? fmtAge(Math.round(summary.avgResolveHours)) : "—", "Avg time to resolve (30d)", "var(--blue)")}
      </div>

      {/* Active by type */}
      {summary && Object.keys(summary.byType).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(Object.keys(summary.byType) as EscType[]).map((t) => (
            <button
              key={t}
              onClick={() => resetTo({ tab: "ACTIVE", type: type === t ? "" : t })}
              title={TYPE_META[t].hint}
              className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded-full cursor-pointer"
              style={{ border: "1px solid var(--border)", background: type === t ? "var(--orange-d)" : "var(--surface)", color: type === t ? "var(--orange)" : "var(--text2)" }}
            >
              {TYPE_META[t].icon} {TYPE_META[t].label} · {summary.byType[t]}
            </button>
          ))}
        </div>
      )}

      {/* Tabs + filters */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-1 rounded-lg px-1 py-[3px]" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button key={t.key} onClick={() => resetTo({ tab: t.key })} className="px-3 py-1 rounded-md font-mono text-[10.5px] font-semibold cursor-pointer transition-colors" style={{ background: on ? "var(--orange)" : "transparent", color: on ? "#fff" : "var(--text2)", border: "none" }}>
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={type} onChange={(e) => resetTo({ type: e.target.value })} className={selectCls} style={inputStyle} aria-label="Type">
            <option value="">All types</option>
            {(Object.keys(TYPE_META) as EscType[]).map((t) => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
          </select>
          <select value={severity} onChange={(e) => resetTo({ severity: e.target.value })} className={selectCls} style={inputStyle} aria-label="Severity">
            <option value="">All severities</option>
            {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as EscSeverity[]).map((s) => <option key={s} value={s}>{SEVERITY_META[s].label}</option>)}
          </select>
          <select value={tab === "MINE" ? "" : owner} disabled={tab === "MINE"} onChange={(e) => resetTo({ owner: e.target.value })} className={selectCls} style={inputStyle} aria-label="Owner">
            <option value="">Any owner</option>
            <option value="none">Unassigned</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={refreshAll} className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer" style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}>↻ Refresh</button>
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 flex-wrap rounded-lg px-3 py-2 mb-3" style={{ background: "var(--orange-d)", border: "1px solid var(--orange)" }}>
          <span className="font-mono text-[11px] font-bold" style={{ color: "var(--orange)" }}>{selected.size} selected</span>
          <select value={bulkAssignee} onChange={(e) => setBulkAssignee(e.target.value)} className={selectCls} style={inputStyle} aria-label="Assign to">
            <option value="">Assign to…</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button disabled={!bulkAssignee} onClick={() => runBulk("ASSIGN", { assigneeId: bulkAssignee })} className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer disabled:opacity-50" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}>Assign</button>
          <button onClick={() => setBulkNote("RESOLVE")} className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer" style={{ background: "var(--green)", color: "#fff", border: "none" }}>✓ Resolve</button>
          <button onClick={() => setBulkNote("DISMISS")} className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}>Dismiss</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto font-mono text-[10.5px] cursor-pointer" style={{ background: "transparent", border: "none", color: "var(--text2)" }}>Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}>
        <div className="flex items-center justify-between px-3.5 py-2" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>
            {loading ? "syncing…" : `${from}–${to} of ${pagination.total} escalations`}
          </span>
          <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>most severe first · {PER_PAGE}/page</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]" style={{ borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(148,163,184,.05)" }}>
                <th className="px-2.5 py-[7px] w-8"><input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all" /></th>
                {["Ref", "Severity", "Type", "What happened", "Student", "Owner", "Open / due", "Status"].map((h) => (
                  <th key={h} className="font-mono text-[9px] font-bold uppercase tracking-[.08em] px-2.5 py-[7px]" style={{ textAlign: "left", whiteSpace: "nowrap", color: "var(--text3)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
                    {loading ? "Loading escalations…" : tab === "ACTIVE" ? "🎉 Nothing needs attention right now." : "No escalations match these filters."}
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const sev = SEVERITY_META[r.severity];
                const st = STATUS_META[r.status];
                return (
                  <tr key={r.id} onClick={() => setOpenId(r.id)} className="cursor-pointer" style={{ borderBottom: "1px solid var(--border)", background: selected.has(r.id) ? "rgba(148,163,184,.08)" : undefined }}>
                    <td className="px-2.5 py-[7px]" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} aria-label={`Select ${r.ref}`} />
                    </td>
                    <td className="px-2.5 py-[7px] whitespace-nowrap font-mono text-[10.5px] font-bold" style={{ color: "var(--blue)" }}>{r.ref}</td>
                    <td className="px-2.5 py-[7px]"><Pill label={sev.label} color={sev.color} bg={sev.bg} /></td>
                    <td className="px-2.5 py-[7px] whitespace-nowrap text-[11px]" style={{ color: "var(--text2)" }}>{TYPE_META[r.type].icon} {TYPE_META[r.type].label}</td>
                    <td className="px-2.5 py-[7px] max-w-[320px]">
                      <div className="text-[11.5px] font-semibold truncate" style={{ color: "var(--text)" }}>{r.title}</div>
                      <div className="font-mono text-[9.5px] truncate" style={{ color: "var(--text3)" }}>{r.reason}</div>
                    </td>
                    <td className="px-2.5 py-[7px]">
                      <div className="text-[11.5px]" style={{ color: "var(--text)" }}>{r.student?.name ?? "—"}</div>
                    </td>
                    <td className="px-2.5 py-[7px] text-[11px] whitespace-nowrap" style={{ color: r.assignee ? "var(--text)" : "var(--text3)" }}>{r.assignee?.name ?? "Unassigned"}</td>
                    <td className="px-2.5 py-[7px] whitespace-nowrap">
                      <div className="font-mono text-[10.5px]" style={{ color: "var(--text2)" }}>{fmtAge(r.ageHours)}</div>
                      {isActive(r.status) && (
                        <div className="font-mono text-[9px] font-semibold" style={{ color: r.slaBreached ? "var(--red)" : "var(--text3)" }}>{fmtDue(r.dueAt, r.slaBreached)}</div>
                      )}
                    </td>
                    <td className="px-2.5 py-[7px]"><Pill label={st.label} color={st.color} bg={st.bg} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-3.5 py-2" style={{ borderTop: "1px solid var(--border)", background: "var(--panel)" }}>
            <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-1.5">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer disabled:opacity-40" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}>← Prev</button>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer disabled:opacity-40" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {openId && (
        <EscalationDetail
          id={openId}
          staff={staff}
          onClose={() => setOpenId(null)}
          onChanged={refreshAll}
          onToast={addToast}
        />
      )}

      {bulkNote && (
        <Modal title={bulkNote === "RESOLVE" ? `Resolve ${selected.size} escalations` : `Dismiss ${selected.size} escalations`} onClose={() => setBulkNote(null)}>
          <textarea
            autoFocus
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder={bulkNote === "RESOLVE" ? "Resolution note (required)" : "Optional note"}
            className="w-full text-[12px] p-2 rounded outline-none resize-none"
            style={inputStyle}
          />
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setBulkNote(null)} className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}>Cancel</button>
            <button
              onClick={() => runBulk(bulkNote, { note: noteText.trim() || undefined })}
              disabled={bulkNote === "RESOLVE" && !noteText.trim()}
              className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer disabled:opacity-50"
              style={{ background: bulkNote === "RESOLVE" ? "var(--green)" : "var(--text2)", color: "#fff", border: "none" }}
            >
              {bulkNote === "RESOLVE" ? "Mark resolved" : "Dismiss"}
            </button>
          </div>
        </Modal>
      )}

      {showNew && <NewEscalationModal staff={staff} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); addToast("Escalation raised"); refreshAll(); }} onError={(m) => addToast(m, "danger")} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onSaved={() => { addToast("Rules saved"); }} onError={(m) => addToast(m, "danger")} />}

      <div className="fixed bottom-4 right-4 z-[400] flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-[12px] font-semibold" style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,.25)", borderLeft: `3px solid ${t.type === "success" ? "var(--green)" : "var(--red)"}` }}>
            <span>{t.type === "success" ? "✓" : "✕"}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

function NewEscalationModal({ staff, onClose, onCreated, onError }: { staff: StaffUser[]; onClose: () => void; onCreated: () => void; onError: (m: string) => void }) {
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [severity, setSeverity] = useState<EscSeverity>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const res = await opsFetch("/api/admin/escalations", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          reason: reason.trim(),
          severity,
          assigneeId: assigneeId || undefined,
          studentId: studentId.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(Array.isArray(body.message) ? body.message.join(", ") : body.message || "Could not raise escalation");
      onCreated();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not raise escalation");
    } finally {
      setSaving(false);
    }
  }

  const label = (t: string) => <span className="font-mono text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text3)" }}>{t}</span>;
  return (
    <Modal title="Raise an escalation" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">{label("Title")}
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="One line — what is wrong?" className="text-[12px] px-2.5 py-1.5 rounded outline-none" style={inputStyle} />
        </label>
        <label className="flex flex-col gap-1">{label("Details")}
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} maxLength={4000} placeholder="What happened, and what needs to be done?" className="text-[12px] p-2 rounded outline-none resize-none" style={inputStyle} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">{label("Severity")}
            <select value={severity} onChange={(e) => setSeverity(e.target.value as EscSeverity)} className="font-mono text-[11.5px] px-2 py-1.5 rounded outline-none" style={inputStyle}>
              {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as EscSeverity[]).map((s) => <option key={s} value={s}>{SEVERITY_META[s].label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">{label("Assign to")}
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="font-mono text-[11.5px] px-2 py-1.5 rounded outline-none" style={inputStyle}>
              <option value="">Unassigned</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1">{label("Student ID (optional)")}
          <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Paste a student's user id to link them" className="font-mono text-[11.5px] px-2.5 py-1.5 rounded outline-none" style={inputStyle} />
        </label>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="font-mono text-[10.5px] font-semibold px-3 py-1.5 rounded cursor-pointer" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}>Cancel</button>
          <button onClick={submit} disabled={saving || title.trim().length < 3 || reason.trim().length < 3} className="font-mono text-[10.5px] font-semibold px-3 py-1.5 rounded cursor-pointer disabled:opacity-50" style={{ background: "var(--orange)", color: "#fff", border: "none" }}>{saving ? "Raising…" : "Raise escalation"}</button>
        </div>
      </div>
    </Modal>
  );
}

function SettingsModal({ onClose, onSaved, onError }: { onClose: () => void; onSaved: () => void; onError: (m: string) => void }) {
  const [settings, setSettings] = useState<EscSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    opsFetch("/api/admin/escalations/settings")
      .then((r) => { if (!r.ok) throw new Error("Failed to load rules"); return r.json(); })
      .then((s: EscSettings) => setSettings(s))
      .catch((e) => onError(e instanceof Error ? e.message : "Failed to load rules"));
  }, [onError]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const body: Record<string, number | boolean> = { alertsEnabled: settings.alertsEnabled };
      for (const f of SETTING_FIELDS) body[f.key] = Math.max(f.min, Math.min(f.max, Math.round(Number(settings[f.key]) || f.min)));
      const res = await opsFetch("/api/admin/escalations/settings", { method: "PATCH", body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(Array.isArray(json.message) ? json.message.join(", ") : json.message || "Could not save");
      onSaved();
      onClose();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Escalation rules & alerts" onClose={onClose} width={520}>
      {!settings ? (
        <div className="font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading…</div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="text-[11.5px]" style={{ color: "var(--text2)" }}>
            The system checks every 15 minutes and raises an escalation when one of these limits is crossed. Changes apply from the next check.
          </div>
          {SETTING_FIELDS.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[12px] font-bold" style={{ color: "var(--text)" }}>{f.label}</div>
                <div className="text-[10.5px] leading-snug" style={{ color: "var(--text3)" }}>{f.hint}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min={f.min}
                  max={f.max}
                  value={settings[f.key]}
                  onChange={(e) => setSettings({ ...settings, [f.key]: Number(e.target.value) })}
                  className="font-mono text-[12px] px-2 py-1 rounded w-[80px] text-right outline-none"
                  style={inputStyle}
                />
                <span className="font-mono text-[10px] w-[44px]" style={{ color: "var(--text3)" }}>{f.unit}</span>
              </div>
            </div>
          ))}
          <label className="flex items-center gap-2.5 pt-2 cursor-pointer" style={{ borderTop: "1px solid var(--border)" }}>
            <input type="checkbox" checked={settings.alertsEnabled} onChange={(e) => setSettings({ ...settings, alertsEnabled: e.target.checked })} />
            <span>
              <span className="text-[12px] font-bold" style={{ color: "var(--text)" }}>Email me about High / Critical escalations</span>
              <span className="block text-[10.5px]" style={{ color: "var(--text3)" }}>One digest per check, sent to the support inbox.</span>
            </span>
          </label>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="font-mono text-[10.5px] font-semibold px-3 py-1.5 rounded cursor-pointer" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}>Cancel</button>
            <button onClick={save} disabled={saving} className="font-mono text-[10.5px] font-semibold px-3 py-1.5 rounded cursor-pointer disabled:opacity-60" style={{ background: "var(--orange)", color: "#fff", border: "none" }}>{saving ? "Saving…" : "Save rules"}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
