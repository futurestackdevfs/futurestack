"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { showToast } from "@/lib/toast";
import { SUPPORT_FROM_ADDRESS } from "../lib/mail-from";

/* ── API shapes (support/staff/inbox/threads) ───────────── */

interface Address {
  email: string;
  displayName?: string;
}
interface Row {
  id: string;
  subject: string;
  preview: string;
  senders: Address[];
  recipients: Address[];
  unread: boolean;
  source?: string;
  updatedAt: string;
}
interface FolderInfo {
  key: string;
  label: string;
  total: number;
  unread: number;
}
interface ListResponse {
  folder: string;
  folders: FolderInfo[];
  total: number;
  threads: Row[];
  nextPageToken?: string;
}
interface Msg {
  id: string;
  fromMe: boolean;
  from: Address;
  to: Address[];
  cc: Address[];
  subject: string;
  text: string | null;
  html: string | null;
  attachments: { index: number; filename: string; contentType: string; size: number }[];
  createdAt: string;
}
interface ThreadDetail {
  id: string;
  subject: string;
  messages: Msg[];
}

// "Show more" loads this many emails at a time (the first screen shows the same amount).
const PAGE_SIZE = 10;
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const BLOCKED = /\.(exe|bat|cmd|com|scr|msi|vbs|ps1|jar|sh|dll)$/i;

const FOLDER_ICON: Record<string, string> = { inbox: "📥", sent: "📤", junk: "🚫", trash: "🗑" };

const who = (a: Address | undefined) => a?.displayName || a?.email || "Unknown";
const initials = (s: string) => s.split(/\s+/).map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString([], d.getFullYear() === now.getFullYear() ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
}
const fmtFull = (iso: string) =>
  new Date(iso).toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** An email's HTML in a sandbox with no scripts; sized to its content so the pane scrolls once. */
function HtmlBody({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [h, setH] = useState(240);
  return (
    <iframe
      ref={ref}
      title="email body"
      // No allow-scripts: nothing in the email can run. allow-same-origin only lets us measure its height.
      sandbox="allow-same-origin allow-popups"
      srcDoc={`<base target="_blank"><style>body{font-family:Arial,sans-serif;font-size:13px;color:#222;margin:12px;word-wrap:break-word}img{max-width:100%;height:auto}</style>${html}`}
      onLoad={() => {
        const d = ref.current?.contentDocument;
        if (d) setH(Math.min(Math.max(d.documentElement.scrollHeight, 120), 1400));
      }}
      className="w-full bg-white"
      style={{ height: h, border: "none", display: "block" }}
    />
  );
}

/** The real support mailbox: every folder, every email, conversations with our replies, and a reply box. */
export default function InboxView() {
  const [folder, setFolder] = useState("inbox");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selId, setSelId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);

  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [cc, setCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [quote, setQuote] = useState(true);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(
    async (append = false, pageToken?: string) => {
      setLoading(true);
      setError("");
      try {
        const p = new URLSearchParams({ limit: String(PAGE_SIZE), folder });
        if (q.trim()) p.set("q", q.trim());
        if (pageToken) p.set("pageToken", pageToken);
        const r = await opsFetch(`/api/support/staff/inbox/threads?${p}`);
        const body = (await r.json().catch(() => ({}))) as ListResponse & { message?: string };
        if (!r.ok) throw new Error(body.message || "Could not load the inbox");
        setRows((prev) => (append ? [...prev, ...(body.threads ?? [])] : body.threads ?? []));
        if (body.folders?.length) setFolders(body.folders); // "Show more" responses carry no counts
        setTotal(body.total ?? 0);
        setNextToken(body.nextPageToken);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load the inbox");
      } finally {
        setLoading(false);
      }
    },
    [q, folder],
  );

  useEffect(() => {
    const t = setTimeout(() => loadList(false), q ? 350 : 0);
    return () => clearTimeout(t);
  }, [loadList, q]);

  const openThread = useCallback(async (id: string) => {
    setSelId(id);
    setLoadingThread(true);
    setReply("");
    setFiles([]);
    setCc("");
    setShowCc(false);
    try {
      const r = await opsFetch(`/api/support/staff/inbox/threads/${id}`);
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.message || "Couldn't open that email");
      setThread(body as ThreadDetail);
      // opening marks it read - reflect that in the list and the unread count
      setRows((prev) => prev.map((t) => (t.id === id ? { ...t, unread: false } : t)));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't open that email");
      setThread(null);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    // land on the start of the newest message (not the bottom of a long one) so it can be read from the top
    const box = bodyRef.current;
    const last = box?.lastElementChild as HTMLElement | null;
    if (box && last) box.scrollTo({ top: Math.max(last.offsetTop - 16, 0) });
  }, [thread?.messages.length, thread?.id]);

  function addFiles(list: FileList | File[]) {
    const next = [...files];
    for (const f of Array.from(list)) {
      if (BLOCKED.test(f.name)) { showToast(`"${f.name}" is an executable file type and cannot be attached`); continue; }
      if (f.size > MAX_FILE_BYTES) { showToast(`"${f.name}" is over 10 MB`); continue; }
      if (next.length >= MAX_FILES) { showToast(`At most ${MAX_FILES} attachments`); break; }
      if (!next.some((x) => x.name === f.name && x.size === f.size)) next.push(f);
    }
    setFiles(next);
  }

  async function send() {
    if (!thread || (!reply.trim() && files.length === 0) || sending) return;
    const last = thread.messages[thread.messages.length - 1];
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("body", reply.trim());
      if (cc.trim()) fd.append("cc", cc.trim());
      fd.append("quote", String(quote));
      files.forEach((f) => fd.append("files", f));
      const r = await opsFetch(`/api/support/staff/inbox/threads/${last.id}/reply`, { method: "POST", body: fd });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        const msg = Array.isArray(e.message) ? e.message[0] : e.message;
        throw new Error(msg || "Couldn't send the reply");
      }
      showToast(files.length ? `Reply sent with ${files.length} attachment${files.length === 1 ? "" : "s"}` : "Reply sent");
      setReply("");
      setFiles([]);
      if (selId) openThread(selId); // reload: our reply now shows in the conversation
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't send the reply");
    } finally {
      setSending(false);
    }
  }

  async function download(messageId: string, a: { index: number; filename: string }) {
    try {
      const r = await opsFetch(`/api/support/staff/inbox/messages/${messageId}/attachments/${a.index}`);
      if (!r.ok) throw new Error("Couldn't download the attachment");
      const url = URL.createObjectURL(await r.blob());
      const el = document.createElement("a");
      el.href = url;
      el.download = a.filename;
      el.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't download the attachment");
    }
  }

  // who the reply goes to: the other side of the last message
  const lastMsg = thread?.messages[thread.messages.length - 1];
  const replyTo = lastMsg ? (lastMsg.fromMe ? lastMsg.to[0] : lastMsg.from) : undefined;

  const current = folders.find((f) => f.key === folder);
  const peer = (r: Row) => (folder === "sent" ? `To: ${who(r.recipients[0])}` : who(r.senders[0]));

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--bg)" }}>
      {selId && (
        <button
          onClick={() => setSelId(null)}
          className="lg:hidden flex items-center gap-1.5 px-3 py-2 text-[11.5px] font-semibold shrink-0 cursor-pointer"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)", color: "var(--blue)", borderTop: "none", borderLeft: "none", borderRight: "none" }}
        >
          ← Back to list
        </button>
      )}
      <div className="flex flex-1 min-h-0 min-w-0">
      {/* ── folders ── */}
      <div className="shrink-0 hidden lg:flex flex-col py-2" style={{ width: 150, borderRight: "1px solid var(--border)", background: "var(--surface)" }}>
        {(folders.length ? folders : [{ key: "inbox", label: "Inbox", total: 0, unread: 0 }]).map((f) => {
          const active = folder === f.key;
          return (
            <button
              key={f.key}
              onClick={() => { setFolder(f.key); setSelId(null); setThread(null); setQ(""); }}
              className="flex items-center gap-2 px-3 py-1.5 text-[11.5px] cursor-pointer"
              style={{
                color: active ? "var(--orange)" : "var(--text2)",
                background: active ? "var(--orange-d)" : "transparent",
                borderLeft: active ? "2px solid var(--orange)" : "2px solid transparent",
                fontWeight: active ? 700 : 500,
                borderTop: "none",
                borderRight: "none",
                borderBottom: "none",
              }}
            >
              <span style={{ width: 14, textAlign: "center" }}>{FOLDER_ICON[f.key] ?? "📁"}</span>
              <span className="flex-1 text-left">{f.label}</span>
              {f.unread > 0 ? (
                <span className="font-mono text-[8.5px] font-bold px-1 rounded-[2px]" style={{ background: "var(--orange)", color: "#fff" }}>{f.unread}</span>
              ) : f.total > 0 ? (
                <span className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{f.total}</span>
              ) : null}
            </button>
          );
        })}
        <div className="mt-auto px-3 py-2 font-mono text-[8.5px] break-all" style={{ color: "var(--text3)", borderTop: "1px solid var(--border)" }}>
          {SUPPORT_FROM_ADDRESS}
        </div>
      </div>

      {/* ── message list ── */}
      <div className={`${selId ? "hidden lg:flex" : "flex"} w-full lg:w-[380px] shrink-0 flex-col`} style={{ borderRight: "1px solid var(--border)", background: "var(--surface)" }}>
        <div className="px-3 py-2.5 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <select
              value={folder}
              onChange={(e) => { setFolder(e.target.value); setSelId(null); setThread(null); setQ(""); }}
              className="lg:hidden text-[11.5px] font-bold rounded px-1.5 py-1 outline-none"
              style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              {(folders.length ? folders : [{ key: "inbox", label: "Inbox" }]).map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            <div className="hidden lg:block text-[12.5px] font-bold" style={{ color: "var(--text)" }}>{current?.label ?? "Inbox"}</div>
            <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>
              {loading && rows.length === 0 ? "loading…" : `${total} email${total === 1 ? "" : "s"}${current && current.unread > 0 && !q ? ` · ${current.unread} unread` : ""}`}
            </span>
            <button
              onClick={() => loadList(false)}
              className="ml-auto text-[10px] font-semibold px-2 py-1 rounded cursor-pointer"
              style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
              title="Refresh"
            >
              ↻
            </button>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search sender, subject, text…"
            className="w-full text-[10.5px] rounded-md px-2 py-1.5 outline-none"
            style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {error ? (
            <div className="p-4 text-[11.5px] leading-relaxed" style={{ color: "var(--red)" }}>{error}</div>
          ) : loading && rows.length === 0 ? (
            <div className="p-4 text-[11px]" style={{ color: "var(--text3)" }}>Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-4 text-[11px]" style={{ color: "var(--text3)" }}>{q
                ? "No emails match your search."
                : "No emails here."}</div>
          ) : (
            rows.map((t) => {
              const sel = selId === t.id;
              const name = peer(t);
              return (
                <button
                  key={t.id}
                  onClick={() => openThread(t.id)}
                  className="w-full text-left px-3 py-2.5 flex gap-2.5 cursor-pointer"
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: sel ? "var(--blue-d)" : "transparent",
                    borderLeft: sel ? "2px solid var(--blue)" : t.unread ? "2px solid var(--orange)" : "2px solid transparent",
                  }}
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[9.5px] font-bold shrink-0 mt-0.5"
                    style={{ background: t.unread ? "var(--orange)" : "var(--panel)", color: t.unread ? "#fff" : "var(--text3)" }}
                  >
                    {initials(name.replace(/^To:\s*/, ""))}
                  </span>
                  <span className="min-w-0 flex-1 flex flex-col gap-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[11.5px] truncate flex-1" style={{ color: "var(--text)", fontWeight: t.unread ? 800 : 500 }}>{name}</span>
                      <span className="font-mono text-[8.5px] shrink-0" style={{ color: "var(--text3)" }}>{fmtWhen(t.updatedAt)}</span>
                    </span>
                    <span className="flex items-center gap-1.5 min-w-0">
                      {t.source && (
                        <span className="shrink-0 text-[8px] font-bold uppercase px-1.5 py-[1px] rounded" style={{ background: "var(--blue-d)", color: "var(--blue)" }}>{t.source}</span>
                      )}
                      <span className="text-[11px] truncate" style={{ color: "var(--text)", fontWeight: t.unread ? 700 : 500 }}>{t.subject}</span>
                    </span>
                    {t.preview && <span className="text-[10.5px] truncate" style={{ color: "var(--text3)" }}>{t.preview}</span>}
                  </span>
                </button>
              );
            })
          )}
          {nextToken && !error && (
            <button
              onClick={() => loadList(true, nextToken)}
              disabled={loading}
              className="w-full py-2.5 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
              style={{ color: "var(--blue)", background: "transparent", border: "none" }}
            >
              {loading ? "Loading…" : `Show ${Math.min(PAGE_SIZE, Math.max(total - rows.length, 0))} more · ${Math.max(total - rows.length, 0)} left`}
            </button>
          )}
        </div>
      </div>

      {/* ── reading pane ── */}
      <div className={`${selId ? "block" : "hidden lg:block"} flex-1 overflow-hidden min-w-0`}>
        {!selId ? (
          <div className="h-full flex flex-col items-center justify-center gap-1 text-[12px]" style={{ color: "var(--text3)" }}>
            <span className="text-[28px]">✉️</span>
            Select an email to read it.
          </div>
        ) : loadingThread || !thread ? (
          <div className="h-full flex items-center justify-center text-[12px]" style={{ color: "var(--text3)" }}>Loading…</div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
              <div className="text-[14px] font-bold truncate" style={{ color: "var(--text)" }}>{thread.subject}</div>
              <div className="font-mono text-[9px] mt-0.5" style={{ color: "var(--text3)" }}>
                {thread.messages.length} message{thread.messages.length === 1 ? "" : "s"} in this conversation
              </div>
            </div>

            <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 flex flex-col gap-3">
              {thread.messages.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg overflow-hidden shrink-0"
                  style={{ border: `1px solid ${m.fromMe ? "var(--blue)" : "var(--border)"}`, background: "var(--surface)" }}
                >
                  <div className="flex items-center gap-2 px-3 py-2" style={{ background: m.fromMe ? "var(--blue-d)" : "var(--panel)", borderBottom: "1px solid var(--border)" }}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0" style={{ background: m.fromMe ? "var(--blue)" : "var(--text3)", color: "#fff" }}>
                      {m.fromMe ? "ME" : initials(who(m.from))}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold truncate" style={{ color: "var(--text)" }}>
                        {m.fromMe ? "You" : who(m.from)}
                        <span className="font-normal font-mono text-[9px] ml-1.5" style={{ color: "var(--text3)" }}>&lt;{m.from.email}&gt;</span>
                      </div>
                      <div className="text-[9px] truncate" style={{ color: "var(--text3)" }}>to {m.to.map(who).join(", ") || "—"}</div>
                    </div>
                    {m.fromMe && <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0" style={{ background: "var(--green-d)", color: "var(--green)" }}>sent</span>}
                    <span className="font-mono text-[8.5px] shrink-0" style={{ color: "var(--text3)" }}>{fmtFull(m.createdAt)}</span>
                  </div>

                  {m.html ? (
                    <HtmlBody html={m.html} />
                  ) : (
                    <div className="px-3 py-2.5 text-[12px] whitespace-pre-wrap break-words" style={{ color: "var(--text2)" }}>{m.text ?? "(empty message)"}</div>
                  )}

                  {m.attachments.length > 0 && (
                    <div className="px-3 pb-2.5 pt-1 flex flex-wrap gap-1.5">
                      {m.attachments.map((a, i) => (
                        <button
                          key={i}
                          onClick={() => download(m.id, a)}
                          className="text-[10px] px-2 py-1 rounded cursor-pointer"
                          style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text2)" }}
                          title="Download"
                        >
                          📎 {a.filename} · {kb(a.size)} ⬇
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div
              className="px-4 py-3 shrink-0"
              style={{ borderTop: "1px solid var(--border)", background: dragging ? "var(--orange-d)" : "var(--surface)" }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}
            >
              <div className="flex items-center gap-2 mb-1.5 text-[10px]" style={{ color: "var(--text3)" }}>
                <span className="font-mono truncate">
                  To <b style={{ color: "var(--text2)" }}>{replyTo ? who(replyTo) : "—"}</b>{replyTo?.email ? ` <${replyTo.email}>` : ""} · from {SUPPORT_FROM_ADDRESS}
                </span>
                {!showCc && (
                  <button onClick={() => setShowCc(true)} className="ml-auto font-semibold cursor-pointer shrink-0" style={{ color: "var(--blue)", background: "none", border: "none" }}>+ Cc</button>
                )}
              </div>
              {showCc && (
                <input
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="Cc: name@example.com, other@example.com"
                  className="w-full text-[11.5px] rounded-md px-2.5 py-1.5 mb-2 outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
              )}
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={4}
                placeholder="Write your reply…  (you can also drop files here)"
                className="w-full text-[12px] rounded-lg px-3 py-2 outline-none resize-none"
                style={{ background: "var(--bg)", border: "1px solid var(--orange)", color: "var(--text)" }}
              />

              {files.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {files.map((f, i) => (
                    <span key={`${f.name}-${i}`} className="inline-flex items-center gap-1.5 text-[10.5px] pl-2 pr-1 py-1 rounded" style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text2)" }}>
                      📎 {f.name} · {kb(f.size)}
                      <button
                        onClick={() => setFiles(files.filter((_, j) => j !== i))}
                        className="w-4 h-4 rounded-full text-[10px] leading-none cursor-pointer"
                        style={{ background: "var(--border)", color: "var(--text2)", border: "none" }}
                        aria-label={`Remove ${f.name}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-2">
                <input ref={fileInput} type="file" multiple hidden onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
                <button
                  onClick={() => fileInput.current?.click()}
                  disabled={files.length >= MAX_FILES}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-40"
                  style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
                  title={`Up to ${MAX_FILES} files, 10 MB each`}
                >
                  📎 Attach
                </button>
                <label className="flex items-center gap-1.5 text-[10.5px] cursor-pointer" style={{ color: "var(--text2)" }}>
                  <input type="checkbox" checked={quote} onChange={(e) => setQuote(e.target.checked)} />
                  Include original message
                </label>
                <button
                  onClick={send}
                  disabled={sending || (!reply.trim() && files.length === 0)}
                  className="ml-auto px-5 py-1.5 rounded-lg text-[11.5px] font-bold text-white disabled:opacity-50 cursor-pointer"
                  style={{ background: "var(--orange)", border: "none" }}
                >
                  {sending ? "Sending…" : "✉ Send reply"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
