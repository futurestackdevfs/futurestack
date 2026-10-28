"use client";

import { useCallback, useEffect, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import {
  EscalationDetailData,
  EscSeverity,
  SEVERITY_META,
  STATUS_META,
  StaffUser,
  TYPE_META,
  fmtAge,
  fmtDateTime,
  fmtDue,
  isActive,
  sourceLinks,
} from "./escalation-types";

const ACTION_LABEL: Record<string, string> = {
  CREATED: "Raised",
  STATUS: "Status",
  SEVERITY: "Severity",
  ASSIGNED: "Assignment",
  COMMENT: "Comment",
  AUTO_RESOLVED: "Auto-resolved",
  REOPENED: "Re-opened",
};

const SEVERITIES: EscSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export default function EscalationDetail({
  id,
  staff,
  onClose,
  onChanged,
  onToast,
}: {
  id: string;
  staff: StaffUser[];
  onClose: () => void;
  /** Called after any change so the list and KPIs refresh. */
  onChanged: () => void;
  onToast: (msg: string, type?: "success" | "danger") => void;
}) {
  const [data, setData] = useState<EscalationDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState<"RESOLVED" | "DISMISSED" | null>(null);
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await opsFetch(`/api/admin/escalations/${id}`);
      if (!res.ok) throw new Error("Failed to load escalation");
      setData((await res.json()) as EscalationDetailData);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to load escalation", "danger");
    } finally {
      setLoading(false);
    }
  }, [id, onToast]);

  useEffect(() => {
    setClosing(null);
    setNote("");
    setComment("");
    load();
  }, [load]);

  async function send(path: string, method: "PATCH" | "POST", body: unknown, okMsg: string) {
    setBusy(true);
    try {
      const res = await opsFetch(`/api/admin/escalations/${id}${path}`, { method, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "Something went wrong");
      setData(json as EscalationDetailData);
      onToast(okMsg, "success");
      onChanged();
      return true;
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Something went wrong", "danger");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function confirmClose() {
    if (!closing) return;
    if (closing === "RESOLVED" && !note.trim()) {
      onToast("Add a resolution note first", "danger");
      return;
    }
    const ok = await send("", "PATCH", { status: closing, resolution: note.trim() || undefined }, closing === "RESOLVED" ? "Marked resolved" : "Dismissed");
    if (ok) {
      setClosing(null);
      setNote("");
    }
  }

  async function postComment() {
    if (!comment.trim()) return;
    const ok = await send("/comments", "POST", { note: comment.trim() }, "Comment added");
    if (ok) setComment("");
  }

  const e = data;
  const sev = e ? SEVERITY_META[e.severity] : null;
  const st = e ? STATUS_META[e.status] : null;
  const active = e ? isActive(e.status) : false;

  const field = (label: string, value: React.ReactNode) => (
    <div className="min-w-0">
      <div className="font-mono text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--text3)" }}>{label}</div>
      <div className="text-[12px] break-words" style={{ color: "var(--text)" }}>{value}</div>
    </div>
  );

  const selectStyle = { border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" } as const;

  return (
    <div className="fixed inset-0 z-[200] flex justify-end" style={{ background: "var(--overlay)" }} onClick={onClose}>
      <aside
        className="h-full w-full max-w-[480px] overflow-y-auto flex flex-col"
        style={{ background: "var(--surface)", borderLeft: "1px solid var(--border)", boxShadow: "-12px 0 40px rgba(0,0,0,.25)" }}
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 sticky top-0 z-10" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-[11px] font-bold" style={{ color: "var(--blue)" }}>{e?.ref ?? "…"}</span>
            {sev && <span className="font-mono text-[9.5px] font-bold px-2 py-[2px] rounded-full" style={{ color: sev.color, background: sev.bg }}>{sev.label}</span>}
            {st && <span className="font-mono text-[9.5px] font-bold px-2 py-[2px] rounded-full" style={{ color: st.color, background: st.bg }}>{st.label}</span>}
            {e?.slaBreached && <span className="font-mono text-[9.5px] font-bold px-2 py-[2px] rounded-full" style={{ color: "var(--red)", background: "var(--red-d)" }}>SLA breached</span>}
          </div>
          <button onClick={onClose} aria-label="Close" className="w-7 h-7 rounded cursor-pointer" style={{ background: "transparent", border: "none", color: "var(--text2)" }}>✕</button>
        </div>

        {loading && !e ? (
          <div className="p-6 font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading…</div>
        ) : e ? (
          <div className="p-4 flex flex-col gap-4">
            <div>
              <div className="text-[15px] font-extrabold leading-snug" style={{ color: "var(--text)" }}>{e.title}</div>
              <div className="text-[12px] mt-1.5 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text2)" }}>{e.reason}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-lg p-3" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
              {field("Type", <>{TYPE_META[e.type].icon} {TYPE_META[e.type].label}</>)}
              {field("Source", e.autoRaised ? "Detected automatically" : e.createdBy ? `Raised by ${e.createdBy.name}` : "Imported")}
              {field("Student", e.student ? <>{e.student.name}<div className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>{e.student.email}</div></> : "—")}
              {field("Open for", fmtAge(e.ageHours))}
              {field("Raised", fmtDateTime(e.createdAt))}
              {field("Resolve by", active ? <span style={{ color: e.slaBreached ? "var(--red)" : "var(--text)" }}>{fmtDue(e.dueAt, e.slaBreached)}</span> : "—")}
            </div>

            {(e.context.ticket || e.context.course || e.context.order) && (
              <div className="rounded-lg p-3 text-[11.5px] flex flex-col gap-1" style={{ border: "1px solid var(--border)", color: "var(--text2)" }}>
                <div className="font-mono text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text3)" }}>About</div>
                {e.context.ticket && <div>🎧 {e.context.ticket.ref} — {e.context.ticket.subject} <span style={{ color: "var(--text3)" }}>({e.context.ticket.status.toLowerCase()})</span></div>}
                {e.context.course && <div>📚 {e.context.course.title}</div>}
                {e.context.order && <div>🧾 Order {e.context.order.currency === "USD" ? "$" : "₹"}{e.context.order.total.toLocaleString("en-IN")} · {e.context.order.status.toLowerCase()}</div>}
              </div>
            )}

            {sourceLinks(e).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sourceLinks(e).map((l) => (
                  <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded no-underline" style={{ border: "1px solid var(--border)", color: "var(--blue)", background: "var(--surface)" }}>
                    {l.label} ↗
                  </a>
                ))}
              </div>
            )}

            {/* Owner + severity */}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text3)" }}>Owner</span>
                <select
                  value={e.assignee?.id ?? ""}
                  disabled={busy}
                  onChange={(ev) => send("", "PATCH", { assigneeId: ev.target.value || null }, ev.target.value ? "Assigned" : "Unassigned")}
                  className="font-mono text-[11.5px] px-2 py-1.5 rounded outline-none"
                  style={selectStyle}
                >
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} · {s.role.toLowerCase()}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text3)" }}>Severity</span>
                <select
                  value={e.severity}
                  disabled={busy}
                  onChange={(ev) => send("", "PATCH", { severity: ev.target.value }, "Severity updated")}
                  className="font-mono text-[11.5px] px-2 py-1.5 rounded outline-none"
                  style={selectStyle}
                >
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>{SEVERITY_META[s].label}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Status actions */}
            {active ? (
              closing ? (
                <div className="rounded-lg p-3 flex flex-col gap-2" style={{ border: "1px solid var(--border)", background: "var(--panel)" }}>
                  <div className="text-[12px] font-bold" style={{ color: "var(--text)" }}>
                    {closing === "RESOLVED" ? "Resolve — what was done?" : "Dismiss — why is this not a problem?"}
                  </div>
                  <textarea
                    autoFocus
                    value={note}
                    onChange={(ev) => setNote(ev.target.value)}
                    rows={3}
                    maxLength={4000}
                    placeholder={closing === "RESOLVED" ? "Resolution note (required)" : "Optional note"}
                    className="w-full text-[12px] p-2 rounded outline-none resize-none"
                    style={selectStyle}
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setClosing(null); setNote(""); }} disabled={busy} className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}>Cancel</button>
                    <button onClick={confirmClose} disabled={busy} className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer disabled:opacity-60" style={{ background: closing === "RESOLVED" ? "var(--green)" : "var(--text2)", color: "#fff", border: "none" }}>
                      {busy ? "Saving…" : closing === "RESOLVED" ? "Mark resolved" : "Dismiss"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {e.status !== "IN_PROGRESS" && (
                    <button onClick={() => send("", "PATCH", { status: "IN_PROGRESS" }, "Marked in progress")} disabled={busy} className="font-mono text-[10.5px] font-semibold px-3 py-1.5 rounded cursor-pointer disabled:opacity-60" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}>▶ Start work</button>
                  )}
                  <button onClick={() => setClosing("RESOLVED")} disabled={busy} className="font-mono text-[10.5px] font-semibold px-3 py-1.5 rounded cursor-pointer" style={{ background: "var(--green)", color: "#fff", border: "none" }}>✓ Resolve</button>
                  <button onClick={() => setClosing("DISMISSED")} disabled={busy} className="font-mono text-[10.5px] font-semibold px-3 py-1.5 rounded cursor-pointer" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}>Dismiss</button>
                </div>
              )
            ) : (
              <div className="rounded-lg p-3 flex flex-col gap-2" style={{ border: "1px solid var(--border)", background: "var(--panel)" }}>
                <div className="text-[12px]" style={{ color: "var(--text2)" }}>
                  <b>{STATUS_META[e.status].label}</b> {fmtDateTime(e.resolvedAt)}
                  {e.resolution ? <> — {e.resolution}</> : null}
                </div>
                <div>
                  <button onClick={() => send("", "PATCH", { status: "OPEN" }, "Re-opened")} disabled={busy} className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer disabled:opacity-60" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}>↺ Re-open</button>
                </div>
              </div>
            )}

            {/* History */}
            <div>
              <div className="font-mono text-[9.5px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text3)" }}>History</div>
              <div className="flex flex-col">
                {e.events.map((ev, i) => (
                  <div key={ev.id} className="flex gap-2.5">
                    <div className="flex flex-col items-center">
                      <span className="size-2.5 rounded-full mt-1 shrink-0" style={{ background: ev.action === "COMMENT" ? "var(--blue)" : "var(--border2, var(--border))" }} />
                      {i < e.events.length - 1 && <span className="w-px flex-1 min-h-4" style={{ background: "var(--border)" }} />}
                    </div>
                    <div className="pb-3 min-w-0">
                      <div className="text-[11.5px]" style={{ color: "var(--text)" }}>
                        <b>{ACTION_LABEL[ev.action] ?? ev.action}</b>
                        <span style={{ color: "var(--text3)" }}> · {ev.actor?.name ?? "System"} · {fmtDateTime(ev.createdAt)}</span>
                      </div>
                      {ev.note && <div className="text-[11.5px] mt-0.5 whitespace-pre-wrap break-words" style={{ color: "var(--text2)" }}>{ev.note}</div>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-1">
                <input
                  value={comment}
                  onChange={(ev) => setComment(ev.target.value)}
                  onKeyDown={(ev) => { if (ev.key === "Enter") postComment(); }}
                  maxLength={2000}
                  placeholder="Add a comment…"
                  className="flex-1 text-[12px] px-2.5 py-1.5 rounded outline-none"
                  style={selectStyle}
                />
                <button onClick={postComment} disabled={busy || !comment.trim()} className="font-mono text-[10.5px] font-semibold px-3 rounded cursor-pointer disabled:opacity-50" style={{ background: "var(--orange)", color: "#fff", border: "none" }}>Post</button>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
