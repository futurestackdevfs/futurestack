"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "@/app/auth/hooks/use-auth";
import { showToast } from "@/lib/toast";

interface Msg {
  id: string;
  body: string;
  attachmentUrl: string | null;
  isInternalNote: boolean;
  createdAt: string;
  author: { id: string; name: string; role: string; isAgent: boolean };
}
interface Thread {
  id: string;
  ref: string;
  subject: string;
  category: string;
  topic: string | null;
  status: "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
  priority: string;
  context: Record<string, unknown> | null;
  assignee: { id: string; name: string } | null;
  createdAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  messages: Msg[];
}

const STATUS_META: Record<Thread["status"], { label: string; dot: string; text: string }> = {
  OPEN: { label: "Open", dot: "#3b82f6", text: "#2563eb" },
  PENDING: { label: "Awaiting your reply", dot: "#f59e0b", text: "#b45309" },
  RESOLVED: { label: "Resolved", dot: "#22c55e", text: "#16a34a" },
  CLOSED: { label: "Closed", dot: "#9ca3af", text: "#6b7280" },
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function TicketThreadPage() {
  const params = useParams();
  const id = params?.id as string;
  const { isAuthenticated, isLoading } = useAuth();
  const { data: thread, isLoading: loading, mutate } = useSWR<Thread>(
    isAuthenticated && id ? `/api/support/tickets/${id}` : null,
  );

  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [thread?.messages.length]);

  async function send() {
    if (!reply.trim() || sending || !thread) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${id}/messages`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return showToast(data.message || "Couldn't send your reply");
      setReply("");
      await mutate();
    } finally {
      setSending(false);
    }
  }

  async function closeTicket() {
    if (closing) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/support/tickets/${id}/close`, { method: "PATCH", credentials: "same-origin" });
      if (!res.ok) return showToast("Couldn't close the ticket");
      showToast("Ticket closed");
      await mutate();
    } finally {
      setClosing(false);
    }
  }

  return (
    <Shell>
      {!isLoading && !isAuthenticated ? (
        <Card><SignIn /></Card>
      ) : loading ? (
        <p className="text-[12px] text-[#6b7280] py-10">Loading ticket…</p>
      ) : !thread ? (
        <Card>
          <p className="text-[13px] text-[#dc2626] mb-3">Ticket not found.</p>
          <Link href="/support/tickets" className="text-[12px] font-semibold text-[#2563eb] hover:underline">← Your tickets</Link>
        </Card>
      ) : (
        <>
          <Link href="/support/tickets" className="text-[12px] text-[#6b7280] dark:text-[#8b93a7] hover:text-[#f05a1a] mb-3 inline-block">← Your tickets</Link>

          <div className="grid lg:grid-cols-[1fr_240px] gap-5 items-start">
            {/* thread */}
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-3 mb-1">
                <h1 className="text-[19px] font-extrabold text-[#0f1420] dark:text-[#e9edf6]">{thread.subject}</h1>
                <span className="shrink-0 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: STATUS_META[thread.status].text }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_META[thread.status].dot }} />
                  {STATUS_META[thread.status].label}
                </span>
              </div>
              <div className="font-mono text-[10.5px] text-[#9ca3af] mb-5">{thread.ref} · opened {fmt(thread.createdAt)}</div>

              <div ref={scrollRef} className="flex flex-col gap-3 mb-5 max-h-[52vh] overflow-y-auto pr-1">
                {thread.messages.map((m) => (
                  <div key={m.id}
                    className={`rounded-2xl px-4 py-3 max-w-[90%] ${
                      m.author.isAgent
                        ? "self-start bg-white dark:bg-white/[0.04] border border-[#e4e7ef] dark:border-white/10"
                        : "self-end bg-[#eef2ff] dark:bg-[#182238] border border-[#c7d8ff] dark:border-[#25324c]"
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11.5px] font-bold text-[#0f1420] dark:text-[#e9edf6]">{m.author.isAgent ? m.author.name : "You"}</span>
                      {m.author.isAgent && <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-[#2563eb] text-white">support</span>}
                      <span className="ml-auto text-[9.5px] text-[#9ca3af]">{fmt(m.createdAt)}</span>
                    </div>
                    <div className="text-[12.5px] whitespace-pre-wrap break-words text-[#374151] dark:text-[#aeb7c7]">{m.body}</div>
                    {m.attachmentUrl && (
                      <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-[10.5px] text-[#2563eb] underline">📎 attachment</a>
                    )}
                  </div>
                ))}

                {/* system line — resolution / closure event */}
                {(thread.status === "RESOLVED" || thread.status === "CLOSED") && (
                  <div className="self-center flex items-center gap-2 my-1 px-3 py-1.5 rounded-full text-[10.5px] font-semibold"
                    style={
                      thread.status === "RESOLVED"
                        ? { background: "#dcfce7", color: "#15803d" }
                        : { background: "#f1f5f9", color: "#64748b" }
                    }>
                    <span>{thread.status === "RESOLVED" ? "✓" : "🔒"}</span>
                    {thread.status === "RESOLVED"
                      ? `Marked resolved by ${thread.assignee?.name ?? "our support team"}${thread.resolvedAt ? ` · ${fmt(thread.resolvedAt)}` : ""}`
                      : `Ticket closed${thread.closedAt ? ` · ${fmt(thread.closedAt)}` : ""}`}
                  </div>
                )}
              </div>

              {thread.status === "CLOSED" ? (
                <Card>
                  <p className="text-[12px] text-[#6b7280] dark:text-[#8b93a7] mb-2 text-center">
                    This ticket was closed by our support team. You can still read the full conversation above.
                  </p>
                  <div className="text-center"><Link href="/support" className="text-[12px] font-semibold text-[#2563eb] hover:underline">Open a new ticket →</Link></div>
                </Card>
              ) : (
                <div>
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3}
                    placeholder={thread.status === "RESOLVED" ? "Reply to re-open this ticket…" : "Add a reply…"}
                    className="w-full text-[13px] rounded-xl px-3.5 py-2.5 outline-none resize-none bg-white dark:bg-[#0e131d] border border-[#e4e7ef] dark:border-white/10 text-[#0f1420] dark:text-[#e9edf6] focus:border-[#f05a1a] transition-colors" />
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={closeTicket} disabled={closing}
                      className="text-[11.5px] font-semibold text-[#6b7280] dark:text-[#8b93a7] hover:text-[#dc2626] disabled:opacity-50">
                      {closing ? "Closing…" : "Close ticket"}
                    </button>
                    <button onClick={send} disabled={sending || !reply.trim()}
                      className="ml-auto text-white text-[12px] font-bold px-5 py-2 rounded-xl disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg,#f05a1a,#ff7a3c)" }}>
                      {sending ? "Sending…" : "Send reply"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* meta */}
            <div className="rounded-2xl border border-[#e4e7ef] dark:border-white/[0.08] bg-white/90 dark:bg-white/[0.03] backdrop-blur-sm p-4 lg:sticky lg:top-[76px] text-[11.5px]">
              <Meta label="Category">{thread.category.replace(/_/g, " ").toLowerCase()}</Meta>
              <Meta label="Priority">{thread.priority.toLowerCase()}</Meta>
              <Meta label="Handled by">{thread.assignee?.name ?? "Support team"}</Meta>
              {thread.context && Object.entries(thread.context).filter(([, v]) => v).length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#e4e7ef] dark:border-white/10">
                  {Object.entries(thread.context).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="mb-1.5">
                      <div className="text-[9px] font-mono uppercase tracking-wide text-[#9ca3af]">{k}</div>
                      <div className="text-[11px] text-[#374151] dark:text-[#aeb7c7] break-words">{String(v)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2.5">
      <div className="text-[9px] font-bold uppercase tracking-widest text-[#9ca3af] mb-0.5">{label}</div>
      <div className="text-[12px] font-medium text-[#374151] dark:text-[#c1c6d2] capitalize">{children}</div>
    </div>
  );
}

function SignIn() {
  return (
    <div className="text-center">
      <p className="text-[14px] text-[#374151] dark:text-[#aeb7c7] mb-4">Please sign in to view this ticket.</p>
      <Link href="/#student-login" className="inline-block text-white text-[13px] font-bold px-5 py-2.5 rounded-xl" style={{ background: "linear-gradient(135deg,#f05a1a,#ff7a3c)" }}>Sign in</Link>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-[#e4e7ef] dark:border-white/[0.08] bg-white/90 dark:bg-white/[0.03] p-8">{children}</div>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[calc(100vh-56px)] bg-[#f6f7fb] dark:bg-[#080b12] overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-100"
        style={{ background: "radial-gradient(600px 300px at 15% -5%, rgba(240,90,26,.10), transparent 60%), radial-gradient(700px 340px at 100% 0%, rgba(37,99,235,.12), transparent 55%)" }} />
      <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 py-8 lg:py-10">{children}</div>
    </main>
  );
}
