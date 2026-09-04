"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authApi } from "@/app/auth/lib/auth-api";
import { loadStaffToken } from "@/app/auth/lib/token-store";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { showToast } from "@/lib/toast";
import {
  CATEGORY_LABEL,
  PRIORITY_STYLE,
  STATUS_STYLE,
  type Agent,
  type Ticket,
  type TicketStats,
  type TicketStatus,
  type TicketThread,
} from "./lib/types";

const STATUS_TABS: { key: string; label: string }[] = [
  { key: "OPEN", label: "Open" },
  { key: "PENDING", label: "Awaiting student" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "CLOSED", label: "Closed" },
  { key: "", label: "All" },
];

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/**
 * The full support desk (queue + thread + triage). Self-contained — resolves
 * the current staff user itself. Works both as the standalone /ops/support page
 * and embedded inside the admin console's Support panel.
 */
export function SupportConsoleBody({
  embedded = false,
  initialTicketId,
  preset,
}: {
  embedded?: boolean;
  initialTicketId?: string | null;
  /** Locks the queue to a slice — driven by the console sidebar. */
  preset?: { status?: string; scope?: "all" | "me" | "unassigned"; title?: string };
}) {
  const [meId, setMeId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const [statusTab, setStatusTab] = useState<string>(preset?.status ?? "OPEN");
  const [scope, setScope] = useState<"all" | "me" | "unassigned">(preset?.scope ?? "all");
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(initialTicketId ?? null);
  const [thread, setThread] = useState<TicketThread | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);

  useEffect(() => {
    if (initialTicketId) { setSelectedId(initialTicketId); return; }
    const id = new URLSearchParams(window.location.search).get("ticket");
    if (id) setSelectedId(id);
  }, [initialTicketId]);

  useEffect(() => {
    setStatusTab(preset?.status ?? "OPEN");
    setScope(preset?.scope ?? "all");
    if (!initialTicketId) setSelectedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset?.status, preset?.scope, preset?.title]);

  useEffect(() => {
    (async () => {
      const t = await loadStaffToken().catch(() => null);
      if (!t) { window.location.href = "/auth/staff-login"; return; }
      try {
        const u = await authApi.me(t);
        setMeId(u.id ?? null);
      } catch { window.location.href = "/auth/staff-login"; return; }
      setReady(true);
    })();
  }, []);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (statusTab) params.set("status", statusTab);
      if (q.trim()) params.set("q", q.trim());
      if (priority) params.set("priority", priority);
      if (category) params.set("category", category);
      if (scope === "me" && meId) params.set("assigneeId", meId);
      else if (scope === "unassigned") params.set("assigneeId", "unassigned");
      const [listRes, statsRes] = await Promise.all([
        opsFetch(`/api/support/staff/tickets?${params}`),
        opsFetch(`/api/support/staff/stats`),
      ]);
      if (listRes.ok) setTickets((await listRes.json()).data ?? []);
      if (statsRes.ok) setStats(await statsRes.json());
    } catch {
      showToast("Failed to load tickets");
    } finally {
      setLoadingList(false);
    }
  }, [statusTab, q, priority, category, scope, meId]);

  useEffect(() => { if (ready) loadList(); }, [ready, loadList]);

  useEffect(() => {
    if (!ready) return;
    opsFetch("/api/support/staff/agents").then(async (r) => {
      if (r.ok) setAgents(await r.json());
    }).catch(() => {});
  }, [ready]);

  const loadThread = useCallback(async (id: string) => {
    setLoadingThread(true);
    try {
      const r = await opsFetch(`/api/support/staff/tickets/${id}`);
      if (r.ok) setThread(await r.json());
      else showToast("Couldn't open that ticket");
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) loadThread(selectedId);
    else setThread(null);
  }, [selectedId, loadThread]);

  const refreshBoth = useCallback(() => {
    loadList();
    if (selectedId) loadThread(selectedId);
  }, [loadList, loadThread, selectedId]);

  if (!ready) {
    return <div className="h-full flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <span className="text-[12px]" style={{ color: "var(--text3)" }}>Loading support console…</span>
    </div>;
  }

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--bg)" }}>
      {/* breadcrumb */}
      <div className="flex items-center gap-1.5 px-3.5 py-2 font-mono text-[10px] shrink-0"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", color: "var(--text3)" }}>
        <span>support</span>
        <span style={{ color: "var(--border2)" }}>/</span>
        <button onClick={() => setSelectedId(null)}
          className={selectedId ? "hover:text-[var(--orange)] cursor-pointer" : ""}
          style={{ color: selectedId ? "var(--text3)" : "var(--text2)", fontWeight: selectedId ? 400 : 600 }}>
          {preset?.title ?? "queue"}
        </button>
        {selectedId && thread && (
          <>
            <span style={{ color: "var(--border2)" }}>/</span>
            <span style={{ color: "var(--text2)", fontWeight: 600 }}>{thread.ref}</span>
          </>
        )}
        {!selectedId && (
          <span className="ml-auto flex items-center gap-1" style={{ color: "var(--text3)" }}>
            {stats ? `${stats.OPEN} open · ${stats.PENDING} pending` : ""}
          </span>
        )}
      </div>

      <div className="flex" style={{ flex: 1, overflow: "hidden" }}>
        {/* Ticket list */}
        <div className="flex flex-col shrink-0"
          style={{ width: embedded ? 340 : 380, borderRight: "1px solid var(--border)", background: "var(--surface)" }}>
          <div className="flex gap-1.5 px-3 pt-3 pb-2 flex-wrap">
            {(["OPEN", "PENDING", "RESOLVED"] as TicketStatus[]).map((s) => (
              <div key={s} className="flex-1 min-w-[70px] rounded-lg px-2 py-1.5 text-center"
                style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
                <div className="text-[15px] font-extrabold" style={{ color: STATUS_STYLE[s].color }}>{stats?.[s] ?? "—"}</div>
                <div className="font-mono text-[8px] uppercase tracking-wider" style={{ color: "var(--text3)" }}>{STATUS_STYLE[s].label}</div>
              </div>
            ))}
          </div>

          <div className="px-3 pb-2 flex flex-col gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subject / student…"
              className="text-[10.5px] rounded-md px-2 py-1.5 outline-none"
              style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }} />
            <div className="flex gap-1 flex-wrap">
              {STATUS_TABS.map((t) => (
                <button key={t.key} onClick={() => setStatusTab(t.key)}
                  className="px-2 py-1 rounded-md text-[10.5px] font-semibold cursor-pointer"
                  style={{
                    background: statusTab === t.key ? "var(--blue)" : "var(--panel)",
                    color: statusTab === t.key ? "#fff" : "var(--text2)",
                    border: "1px solid var(--border)",
                  }}>{t.label}</button>
              ))}
            </div>
            <div className="flex gap-1">
              {(["all", "me", "unassigned"] as const).map((s) => (
                <button key={s} onClick={() => setScope(s)}
                  className="flex-1 px-1.5 py-1 rounded-md text-[10px] font-semibold cursor-pointer capitalize"
                  style={{
                    background: scope === s ? "var(--orange)" : "var(--panel)",
                    color: scope === s ? "#fff" : "var(--text2)",
                    border: "1px solid var(--border)",
                  }}>{s === "me" ? "Mine" : s}</button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="flex-1 text-[10.5px] rounded-md px-1.5 py-1 outline-none"
                style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text2)" }}>
                <option value="">Any priority</option>
                {["URGENT", "HIGH", "NORMAL", "LOW"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="flex-1 text-[10.5px] rounded-md px-1.5 py-1 outline-none"
                style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text2)" }}>
                <option value="">Any category</option>
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="p-4 text-[11px]" style={{ color: "var(--text3)" }}>Loading…</div>
            ) : tickets.length === 0 ? (
              <div className="p-4 text-[11px]" style={{ color: "var(--text3)" }}>No tickets match these filters.</div>
            ) : tickets.map((t) => (
              <button key={t.id} onClick={() => setSelectedId(t.id)}
                className="w-full text-left px-3 py-2.5 flex flex-col gap-1 cursor-pointer"
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: selectedId === t.id ? "var(--blue-d)" : "transparent",
                  borderLeft: selectedId === t.id ? "2px solid var(--blue)" : "2px solid transparent",
                }}>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[8.5px] font-bold" style={{ color: "var(--text3)" }}>{t.ref}</span>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide"
                    style={{ background: PRIORITY_STYLE[t.priority].bg, color: PRIORITY_STYLE[t.priority].color }}>{t.priority}</span>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide"
                    style={{ background: STATUS_STYLE[t.status].bg, color: STATUS_STYLE[t.status].color }}>{STATUS_STYLE[t.status].label}</span>
                  <span className="ml-auto font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{timeAgo(t.lastMessageAt)}</span>
                </div>
                <div className="text-[12px] font-semibold truncate" style={{ color: "var(--text)" }}>{t.subject}</div>
                <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text3)" }}>
                  <span className="truncate">{t.student.name}</span>
                  <span>·</span>
                  <span className="truncate">{CATEGORY_LABEL[t.category]}</span>
                  {t.assignee && <><span>·</span><span className="truncate">→ {t.assignee.name}</span></>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-hidden" style={{ background: "var(--bg)" }}>
          {!selectedId ? (
            <div className="h-full flex items-center justify-center text-[12px]" style={{ color: "var(--text3)" }}>
              Select a ticket from the queue.
            </div>
          ) : loadingThread || !thread ? (
            <div className="h-full flex items-center justify-center text-[12px]" style={{ color: "var(--text3)" }}>Loading ticket…</div>
          ) : (
            <TicketDetail
              key={thread.id}
              thread={thread}
              agents={agents}
              meId={meId ?? ""}
              onChanged={refreshBoth}
              onBack={() => setSelectedId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TicketDetail({
  thread, agents, meId, onChanged, onBack,
}: {
  thread: TicketThread;
  agents: Agent[];
  meId: string;
  onChanged: () => void;
  onBack: () => void;
}) {
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [thread.messages.length]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const r = await opsFetch(`/api/support/staff/tickets/${thread.id}`, { method: "PATCH", body: JSON.stringify(body) });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        showToast(e.message || "Update failed");
      } else onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!reply.trim() || sending) return;
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
      setReply("");
      setInternal(false);
      onChanged();
    } finally {
      setSending(false);
    }
  }

  async function sendEmail() {
    if (!emailBody.trim() || emailSending) return;
    setEmailSending(true);
    try {
      const r = await opsFetch(`/api/support/staff/tickets/${thread.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: emailBody.trim(), isInternalNote: false }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        showToast(e.message || "Couldn't send email");
        return;
      }
      setEmailBody("");
      showToast(`Email sent to ${thread.student.name}`);
      onChanged();
    } finally {
      setEmailSending(false);
    }
  }

  const ctx = thread.context ?? {};
  const ctxEntries = Object.entries(ctx).filter(([, v]) => v != null && v !== "");

  // Notification emails the desk sends to the student (best-effort via AgentMail).
  // Derived from ticket state — internal notes, student replies and closes send nothing.
  const emailLog: { kind: string; label: string; at: string }[] = [
    { kind: "opened", label: "Ticket confirmation", at: thread.createdAt },
    ...thread.messages
      .filter((m) => m.author.isAgent && !m.isInternalNote)
      .map((m) => ({ kind: "reply", label: "Reply notification", at: m.createdAt })),
    ...(thread.resolvedAt ? [{ kind: "resolved", label: "Resolved notification", at: thread.resolvedAt }] : []),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 flex items-start gap-3" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <button onClick={onBack} className="text-[16px] leading-none mt-0.5 shrink-0" style={{ color: "var(--text3)" }}>←</button>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold truncate" style={{ color: "var(--text)" }}>{thread.subject}</div>
          <div className="flex items-center gap-1.5 text-[10.5px] mt-0.5 flex-wrap" style={{ color: "var(--text3)" }}>
            <span className="font-mono">{thread.ref}</span>
            <span>·</span>
            <span>{thread.student.name} &lt;{thread.student.email}&gt;</span>
            <span>·</span>
            <span>{CATEGORY_LABEL[thread.category]}{thread.topic ? ` / ${thread.topic}` : ""}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT: dedicated customer-email panel ── */}
        <div className="shrink-0 flex flex-col overflow-hidden"
          style={{ width: 268, borderRight: "1px solid var(--border)", background: "var(--surface)" }}>
          <div className="px-3 py-2 flex items-center gap-2 shrink-0"
            style={{ background: "linear-gradient(90deg, var(--orange-d), transparent)", borderBottom: "1px solid var(--border)" }}>
            <span className="text-[14px]">📧</span>
            <div>
              <div className="text-[11px] font-bold" style={{ color: "var(--text)" }}>Customer email</div>
              <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>goes to the student’s inbox</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            <div className="rounded-md p-2 flex flex-col gap-1" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
              {[
                ["to", thread.student.email],
                ["from", "futurestack@agentmail.to"],
                ["subject", `${thread.ref} · ${thread.subject}`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start gap-2 text-[9.5px]">
                  <span className="font-mono uppercase tracking-wide w-[42px] shrink-0" style={{ color: "var(--text3)" }}>{k}</span>
                  <span className="flex-1 break-words" style={{ color: "var(--text2)" }}>{v}</span>
                </div>
              ))}
            </div>

            <div>
              <div className="font-mono text-[8.5px] uppercase tracking-widest mb-1.5" style={{ color: "var(--text3)" }}>Sent history</div>
              <div className="flex flex-col gap-1.5">
                {emailLog.map((e, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[9.5px]">
                    <span className="shrink-0">{e.kind === "opened" ? "🎫" : e.kind === "resolved" ? "✅" : "↩️"}</span>
                    <span className="flex-1" style={{ color: "var(--text2)" }}>{e.label}</span>
                    <span className="font-mono shrink-0" style={{ color: "var(--text3)" }}>{timeAgo(e.at)}</span>
                  </div>
                ))}
              </div>
              <div className="text-[8.5px] mt-1.5" style={{ color: "var(--text3)" }}>
                Delivery is best-effort — failures are logged, not retried.
              </div>
            </div>
          </div>

          <div className="p-3 shrink-0" style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
            {thread.status === "CLOSED" ? (
              <div className="text-[10px]" style={{ color: "var(--text3)" }}>
                Ticket is closed. Set it back to Open to email the student.
              </div>
            ) : (
              <>
                <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)}
                  placeholder={`Write an email to ${thread.student.name}…`} rows={5}
                  className="w-full text-[11.5px] rounded-lg px-2.5 py-2 outline-none resize-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--orange)", color: "var(--text)" }} />
                <button onClick={sendEmail} disabled={emailSending || !emailBody.trim()}
                  className="mt-2 w-full px-3 py-2 rounded-lg text-[11.5px] font-bold text-white disabled:opacity-50 cursor-pointer"
                  style={{ background: "var(--orange)" }}>
                  {emailSending ? "Sending…" : "✉ Send email to student"}
                </button>
                <div className="text-[8.5px] mt-1.5 leading-snug" style={{ color: "var(--text3)" }}>
                  Posts a public reply to the thread, emails {thread.student.email}, and sets the ticket to “Awaiting student”.
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            {thread.messages.map((m) => (
              <div key={m.id} className="rounded-xl px-3.5 py-2.5"
                style={{
                  background: m.isInternalNote ? "var(--amber-d, rgba(180,83,9,.10))" : m.author.isAgent ? "var(--blue-d)" : "var(--surface)",
                  border: `1px solid ${m.isInternalNote ? "var(--amber, #b45309)" : "var(--border)"}`,
                  alignSelf: m.author.isAgent ? "flex-end" : "flex-start",
                  maxWidth: "82%",
                }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>{m.author.name}</span>
                  {m.author.isAgent && <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded" style={{ background: "var(--blue)", color: "#fff" }}>agent</span>}
                  {m.isInternalNote && <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded" style={{ background: "var(--amber, #b45309)", color: "#fff" }}>internal note</span>}
                  <span className="ml-auto font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{timeAgo(m.createdAt)}</span>
                </div>
                <div className="text-[12.5px] whitespace-pre-wrap break-words" style={{ color: "var(--text2)" }}>{m.body}</div>
                {m.attachmentUrl && (
                  <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-[10.5px] underline" style={{ color: "var(--blue)" }}>📎 attachment</a>
                )}
              </div>
            ))}
          </div>

          <div className="px-4 py-3" style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
            <textarea value={reply} onChange={(e) => setReply(e.target.value)}
              placeholder={internal ? "Internal note (student won't see this)…" : "Reply to the student…"} rows={3}
              className="w-full text-[12px] rounded-lg px-3 py-2 outline-none resize-none"
              style={{ background: "var(--bg)", border: `1px solid ${internal ? "var(--amber, #b45309)" : "var(--border)"}`, color: "var(--text)" }} />
            <div className="flex items-center gap-2 mt-2">
              <label className="flex items-center gap-1.5 text-[10.5px] cursor-pointer" style={{ color: "var(--text2)" }}>
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                Internal note
              </label>
              <button onClick={send} disabled={sending || !reply.trim()}
                className="ml-auto px-4 py-1.5 rounded-lg text-[11.5px] font-semibold text-white disabled:opacity-50 cursor-pointer"
                style={{ background: internal ? "var(--amber, #b45309)" : "var(--blue)" }}>
                {sending ? "Sending…" : internal ? "Add note" : "Send reply"}
              </button>
            </div>
          </div>
        </div>

        <div className="shrink-0 overflow-y-auto p-3 flex flex-col gap-3"
          style={{ width: 220, borderLeft: "1px solid var(--border)", background: "var(--surface)" }}>
          <MetaBlock label="Status">
            <select value={thread.status} disabled={busy} onChange={(e) => patch({ status: e.target.value })}
              className="w-full text-[11px] rounded-md px-2 py-1.5 outline-none"
              style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }}>
              {["OPEN", "PENDING", "RESOLVED", "CLOSED"].map((s) => <option key={s} value={s}>{STATUS_STYLE[s as TicketStatus].label}</option>)}
            </select>
          </MetaBlock>
          <MetaBlock label="Priority">
            <select value={thread.priority} disabled={busy} onChange={(e) => patch({ priority: e.target.value })}
              className="w-full text-[11px] rounded-md px-2 py-1.5 outline-none"
              style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }}>
              {["LOW", "NORMAL", "HIGH", "URGENT"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </MetaBlock>
          {ctxEntries.length > 0 && (
            <MetaBlock label="Context">
              <div className="flex flex-col gap-1">
                {ctxEntries.map(([k, v]) => (
                  <div key={k} className="text-[10px]">
                    <span className="font-mono uppercase tracking-wide" style={{ color: "var(--text3)" }}>{k}</span>
                    <div className="break-words" style={{ color: "var(--text2)" }}>{String(v)}</div>
                  </div>
                ))}
              </div>
            </MetaBlock>
          )}
          <div className="text-[9.5px] font-mono" style={{ color: "var(--text3)" }}>Created {timeAgo(thread.createdAt)}</div>
        </div>
      </div>
    </div>
  );
}

function MetaBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[8.5px] uppercase tracking-widest mb-1" style={{ color: "var(--text3)" }}>{label}</div>
      {children}
    </div>
  );
}
