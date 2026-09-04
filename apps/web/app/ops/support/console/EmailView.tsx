"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { showToast } from "@/lib/toast";
import {
  CATEGORY_LABEL,
  PRIORITY_STYLE,
  STATUS_STYLE,
  type Agent,
  type Ticket,
  type TicketStatus,
  type TicketThread,
} from "../lib/types";

/* ── helpers ─────────────────────────────────────────────── */

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString([], sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
}
function fmtFull(iso: string): string {
  return new Date(iso).toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function initials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

const FOLDERS = [
  { key: "inbox", label: "Inbox", icon: "📥", status: "OPEN" as TicketStatus, statKey: "OPEN" },
  { key: "sent", label: "Sent", icon: "📤", status: "PENDING" as TicketStatus, statKey: "PENDING" },
  { key: "all", label: "All mail", icon: "📬", status: null, statKey: "TOTAL" },
  { key: "resolved", label: "Resolved", icon: "✅", status: "RESOLVED" as TicketStatus, statKey: "RESOLVED" },
  { key: "closed", label: "Closed", icon: "🗄", status: "CLOSED" as TicketStatus, statKey: "CLOSED" },
] as const;

type FolderKey = (typeof FOLDERS)[number]["key"];

const FROM_ADDRESS = "futurestack@agentmail.to";

/* ── component ───────────────────────────────────────────── */

export default function EmailView({ meId, onOpenTicket }: { meId: string; onOpenTicket: (id: string) => void }) {
  const [folder, setFolder] = useState<FolderKey>("inbox");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [selId, setSelId] = useState<string | null>(null);
  const [thread, setThread] = useState<TicketThread | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);

  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  /* list */
  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const f = FOLDERS.find((x) => x.key === folder)!;
      const p = new URLSearchParams({ limit: "50" });
      if (f.status) p.set("status", f.status);
      if (q.trim()) p.set("q", q.trim());
      const [listRes, statsRes] = await Promise.all([
        opsFetch(`/api/support/staff/tickets?${p}`),
        opsFetch(`/api/support/staff/stats`),
      ]);
      if (listRes.ok) {
        const b = await listRes.json();
        setRows(b.data ?? []);
      }
      if (statsRes.ok) setStats(await statsRes.json());
    } finally {
      setLoadingList(false);
    }
  }, [folder, q]);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => {
    opsFetch("/api/support/staff/agents").then(async (r) => { if (r.ok) setAgents(await r.json()); }).catch(() => {});
  }, []);

  /* thread */
  const loadThread = useCallback(async (id: string) => {
    setLoadingThread(true);
    setReply(""); setInternal(false);
    try {
      const r = await opsFetch(`/api/support/staff/tickets/${id}`);
      if (r.ok) setThread(await r.json());
      else showToast("Couldn't open that conversation");
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    if (selId) loadThread(selId);
    else setThread(null);
  }, [selId, loadThread]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [thread?.messages.length]);

  const refresh = useCallback(() => { loadList(); if (selId) loadThread(selId); }, [loadList, loadThread, selId]);

  async function patch(data: Record<string, unknown>) {
    if (!thread) return;
    setBusy(true);
    try {
      const r = await opsFetch(`/api/support/staff/tickets/${thread.id}`, { method: "PATCH", body: JSON.stringify(data) });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        showToast(e.message || "Update failed");
      } else {
        showToast("Updated");
        refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!thread || !reply.trim() || sending) return;
    setSending(true);
    try {
      const r = await opsFetch(`/api/support/staff/tickets/${thread.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: reply.trim(), isInternalNote: internal }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        showToast(e.message || "Couldn't send");
        return;
      }
      setReply(""); setInternal(false);
      showToast(internal ? "Internal note added" : `Email sent to ${thread.student.name}`);
      refresh();
    } finally {
      setSending(false);
    }
  }

  const composerDisabled = thread?.status === "CLOSED";

  return (
    <div className="h-full flex" style={{ background: "var(--bg)" }}>
      {/* ── folders ── */}
      <div className="shrink-0 flex flex-col py-2" style={{ width: 150, borderRight: "1px solid var(--border)", background: "var(--surface)" }}>
        {FOLDERS.map((f) => {
          const active = folder === f.key;
          const count = stats[f.statKey] ?? 0;
          return (
            <button key={f.key} onClick={() => { setFolder(f.key); setSelId(null); }}
              className="flex items-center gap-2 px-3 py-1.5 text-[11.5px] cursor-pointer"
              style={{
                color: active ? "var(--orange)" : "var(--text2)",
                background: active ? "var(--orange-d)" : "transparent",
                borderLeft: active ? "2px solid var(--orange)" : "2px solid transparent",
                fontWeight: active ? 700 : 500,
              }}>
              <span style={{ width: 14, textAlign: "center" }}>{f.icon}</span>
              <span className="flex-1 text-left">{f.label}</span>
              {count > 0 && (
                <span className="font-mono text-[8.5px] font-bold px-1 rounded-[2px]"
                  style={{ background: active ? "var(--orange)" : "var(--panel)", color: active ? "#fff" : "var(--text3)" }}>{count}</span>
              )}
            </button>
          );
        })}
        <div className="mt-auto px-3 py-2 font-mono text-[8.5px]" style={{ color: "var(--text3)", borderTop: "1px solid var(--border)" }}>
          from<br />{FROM_ADDRESS}
        </div>
      </div>

      {/* ── conversation list ── */}
      <div className="shrink-0 flex flex-col" style={{ width: 340, borderRight: "1px solid var(--border)", background: "var(--surface)" }}>
        <div className="px-3 py-2 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mail…"
            className="w-full text-[10.5px] rounded-md px-2 py-1.5 outline-none"
            style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="p-4 text-[11px]" style={{ color: "var(--text3)" }}>Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-4 text-[11px]" style={{ color: "var(--text3)" }}>Nothing here.</div>
          ) : rows.map((t) => {
            const unread = t.status === "OPEN";
            const sel = selId === t.id;
            const who = folder === "sent" ? `To: ${t.student.name}` : t.student.name;
            return (
              <button key={t.id} onClick={() => setSelId(t.id)}
                className="w-full text-left px-3 py-2 flex flex-col gap-0.5 cursor-pointer"
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: sel ? "var(--blue-d)" : "transparent",
                  borderLeft: sel ? "2px solid var(--blue)" : unread ? "2px solid var(--orange)" : "2px solid transparent",
                }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] truncate flex-1" style={{ color: "var(--text)", fontWeight: unread ? 800 : 500 }}>{who}</span>
                  <span className="font-mono text-[8.5px] shrink-0" style={{ color: "var(--text3)" }}>{fmtWhen(t.lastMessageAt)}</span>
                </div>
                <div className="text-[11px] truncate" style={{ color: "var(--text2)", fontWeight: unread ? 700 : 500 }}>{t.subject}</div>
                <div className="flex items-center gap-1 text-[9px]" style={{ color: "var(--text3)" }}>
                  <span className="font-mono">{t.ref.replace("FS-SUP-", "#")}</span>
                  <span className="px-1 rounded" style={{ background: STATUS_STYLE[t.status].bg, color: STATUS_STYLE[t.status].color }}>{STATUS_STYLE[t.status].label}</span>
                  {(t.priority === "HIGH" || t.priority === "URGENT") && (
                    <span className="px-1 rounded font-bold" style={{ background: PRIORITY_STYLE[t.priority].bg, color: PRIORITY_STYLE[t.priority].color }}>{t.priority}</span>
                  )}
                  {t.assignee && <span className="truncate">· {t.assignee.name}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── reading pane ── */}
      <div className="flex-1 overflow-hidden">
        {!selId ? (
          <div className="h-full flex items-center justify-center text-[12px]" style={{ color: "var(--text3)" }}>
            Select a conversation.
          </div>
        ) : loadingThread || !thread ? (
          <div className="h-full flex items-center justify-center text-[12px]" style={{ color: "var(--text3)" }}>Loading…</div>
        ) : (
          <div className="h-full flex flex-col">
            {/* subject + toolbar */}
            <div className="px-4 py-2.5 shrink-0" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold truncate" style={{ color: "var(--text)" }}>{thread.subject}</div>
                  <div className="flex items-center gap-1.5 text-[10px] mt-0.5 flex-wrap" style={{ color: "var(--text3)" }}>
                    <span className="font-mono">{thread.ref}</span><span>·</span>
                    <span>{CATEGORY_LABEL[thread.category]}</span><span>·</span>
                    <span className="px-1 rounded" style={{ background: STATUS_STYLE[thread.status].bg, color: STATUS_STYLE[thread.status].color }}>{STATUS_STYLE[thread.status].label}</span>
                  </div>
                </div>
                <button onClick={() => onOpenTicket(thread.id)}
                  className="shrink-0 font-mono text-[8.5px] font-bold px-2 py-1 rounded cursor-pointer"
                  style={{ border: "1px solid var(--blue)", color: "var(--blue)" }}>FULL TICKET →</button>
              </div>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {thread.status !== "RESOLVED" && thread.status !== "CLOSED" && (
                  <ToolBtn onClick={() => patch({ status: "RESOLVED" })} disabled={busy} color="var(--green)">✓ Resolve</ToolBtn>
                )}
                {(thread.status === "RESOLVED" || thread.status === "CLOSED") && (
                  <ToolBtn onClick={() => patch({ status: "OPEN" })} disabled={busy} color="var(--blue)">↺ Reopen</ToolBtn>
                )}
                {thread.status !== "CLOSED" && (
                  <ToolBtn onClick={() => patch({ status: "CLOSED" })} disabled={busy} color="var(--text3)">🗄 Close</ToolBtn>
                )}
                <select value={thread.priority} disabled={busy} onChange={(e) => patch({ priority: e.target.value })}
                  className="text-[10px] rounded px-1.5 py-1 outline-none cursor-pointer"
                  style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text2)" }}>
                  {["LOW", "NORMAL", "HIGH", "URGENT"].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={thread.assignee?.id ?? ""} disabled={busy} onChange={(e) => patch({ assigneeId: e.target.value })}
                  className="text-[10px] rounded px-1.5 py-1 outline-none cursor-pointer"
                  style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text2)" }}>
                  <option value="">Unassigned</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name}{a.id === meId ? " (me)" : ""}</option>)}
                </select>
              </div>
            </div>

            {/* messages */}
            <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
              {thread.messages.map((m) => {
                const agent = m.author.isAgent;
                const note = m.isInternalNote;
                return (
                  <div key={m.id} className="rounded-lg overflow-hidden"
                    style={{ border: `1px solid ${note ? "var(--amber, #b45309)" : "var(--border)"}`, background: "var(--surface)" }}>
                    <div className="flex items-center gap-2 px-3 py-2" style={{ background: note ? "var(--amber-d)" : agent ? "var(--blue-d)" : "var(--panel)", borderBottom: "1px solid var(--border)" }}>
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                        style={{ background: agent ? "var(--blue)" : "var(--text3)", color: "#fff" }}>{initials(m.author.name)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold truncate" style={{ color: "var(--text)" }}>
                          {m.author.name}
                          <span className="font-normal font-mono text-[9px] ml-1.5" style={{ color: "var(--text3)" }}>
                            &lt;{agent ? FROM_ADDRESS : thread.student.email}&gt;
                          </span>
                        </div>
                        <div className="text-[9px]" style={{ color: "var(--text3)" }}>
                          {note ? "internal note — not emailed" : agent ? `to ${thread.student.email}` : `to ${FROM_ADDRESS}`}
                        </div>
                      </div>
                      {note
                        ? <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0" style={{ background: "var(--amber, #b45309)", color: "#fff" }}>note</span>
                        : <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0" style={{ background: agent ? "var(--green-d)" : "var(--panel)", color: agent ? "var(--green)" : "var(--text3)" }}>{agent ? "sent" : "received"}</span>}
                      <span className="font-mono text-[8.5px] shrink-0" style={{ color: "var(--text3)" }}>{fmtFull(m.createdAt)}</span>
                    </div>
                    <div className="px-3 py-2.5 text-[12px] whitespace-pre-wrap break-words" style={{ color: "var(--text2)" }}>{m.body}</div>
                    {m.attachmentUrl && (
                      <a href={m.attachmentUrl} target="_blank" rel="noreferrer"
                        className="block px-3 pb-2.5 text-[10.5px] underline" style={{ color: "var(--blue)" }}>📎 attachment</a>
                    )}
                  </div>
                );
              })}
            </div>

            {/* composer */}
            <div className="px-4 py-3 shrink-0" style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
              {composerDisabled ? (
                <div className="text-[11px]" style={{ color: "var(--text3)" }}>
                  This conversation is closed. Reopen it above to send another email.
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1.5 text-[9.5px] font-mono" style={{ color: "var(--text3)" }}>
                    <span>{internal ? "internal note" : `reply to ${thread.student.email}`}</span>
                  </div>
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)}
                    placeholder={internal ? "Write an internal note (teammates only)…" : `Write your email to ${thread.student.name}…`}
                    rows={4}
                    className="w-full text-[12px] rounded-lg px-3 py-2 outline-none resize-none"
                    style={{ background: "var(--bg)", border: `1px solid ${internal ? "var(--amber, #b45309)" : "var(--orange)"}`, color: "var(--text)" }} />
                  <div className="flex items-center gap-2 mt-2">
                    <label className="flex items-center gap-1.5 text-[10.5px] cursor-pointer" style={{ color: "var(--text2)" }}>
                      <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                      Internal note (not emailed)
                    </label>
                    <button onClick={send} disabled={sending || !reply.trim()}
                      className="ml-auto px-5 py-1.5 rounded-lg text-[11.5px] font-bold text-white disabled:opacity-50 cursor-pointer"
                      style={{ background: internal ? "var(--amber, #b45309)" : "var(--orange)" }}>
                      {sending ? "Sending…" : internal ? "Add note" : "✉ Send"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolBtn({ children, onClick, disabled, color }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; color: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="text-[10px] font-bold px-2 py-1 rounded cursor-pointer disabled:opacity-40"
      style={{ border: `1px solid ${color}`, color }}>
      {children}
    </button>
  );
}
