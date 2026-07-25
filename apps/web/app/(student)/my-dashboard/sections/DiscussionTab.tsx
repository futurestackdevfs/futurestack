"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { useStudentDashboard } from "../../hooks/student-dashboard";

interface DiscussionAuthor {
  id: string; name: string; avatarUrl: string | null; role: string;
}
interface DiscussionReply {
  id: string; body: string; createdAt: string;
  author: DiscussionAuthor;
  userHasUpvoted: boolean; upvoteCount: number;
}
interface DiscussionMessage {
  id: string; body: string; tag: "DOUBT" | "TIP" | "ANNOUNCEMENT" | "RESOURCE";
  isPinned: boolean; isAnswered: boolean;
  attachmentUrl: string | null; createdAt: string;
  author: DiscussionAuthor;
  userHasUpvoted: boolean; upvoteCount: number; replyCount: number;
  replies: DiscussionReply[];
}

const PAGE_SIZE = 20;

const TAG_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  DOUBT: { label: "doubt", bg: "var(--orange-d)", text: "var(--orange)" },
  TIP: { label: "tip", bg: "var(--blue-d)", text: "var(--blue2)" },
  ANNOUNCEMENT: { label: "announcement", bg: "var(--purple-d, rgba(147,51,234,.12))", text: "var(--purple, #a855f7)" },
  RESOURCE: { label: "resource", bg: "var(--green-d)", text: "var(--green)" },
};

const TAG_ICONS: Record<string, string> = {
  DOUBT: "❓", TIP: "💡", ANNOUNCEMENT: "📢", RESOURCE: "📎",
};

const AVATAR_COLORS = [
  "linear-gradient(135deg,#f05a1a,#ff7a3c)",
  "linear-gradient(135deg,#2563eb,#3b82f6)",
  "linear-gradient(135deg,#9333ea,#a855f7)",
  "linear-gradient(135deg,#059669,#10b981)",
];

function avatarColor(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return name.split(" ").map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2);
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 172800) return "Yesterday";
  return `${Math.floor(secs / 86400)}d ago`;
}

function readKey(userId: string) { return `fs-student-${userId}-read-msgs`; }

function loadReadIds(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(readKey(userId)) || "[]")); } catch { return new Set(); }
}

function saveReadIds(userId: string, ids: Set<string>) {
  try { localStorage.setItem(readKey(userId), JSON.stringify([...ids])); } catch {}
}

function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="min-w-[300px] rounded-lg border p-6 shadow-xl" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <p className="font-mono text-[11px] mb-4 leading-[1.5]" style={{ color: "var(--text2)" }}>{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="font-mono text-[10px] cursor-pointer rounded px-3 py-1.5" style={{ border: "1px solid var(--border)", background: "transparent", color: "var(--text3)" }}>Cancel</button>
          <button onClick={onConfirm} className="font-mono text-[10px] cursor-pointer rounded border-none px-3 py-1.5 text-white" style={{ background: "#e53e3e" }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  courseId: string;
  onCountChange?: (count: number) => void;
}

export default function DiscussionTab({ courseId, onCountChange }: Props) {
  const { data: dashboard } = useStudentDashboard();
  const me = dashboard?.user ?? null;
  const isStaff = !!me && me.role !== "STUDENT";

  const [readIds, setReadIds] = useState<Set<string>>(() => me ? loadReadIds(me.id) : new Set());
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [postBody, setPostBody] = useState("");
  const [postTag, setPostTag] = useState<DiscussionMessage["tag"]>("DOUBT");
  const [posting, setPosting] = useState(false);
  const [openReplies, setOpenReplies] = useState<Set<string>>(new Set());
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replying, setReplying] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmDeleteReply, setConfirmDeleteReply] = useState<{ replyId: string; msgId: string } | null>(null);

  const { data: messages, isLoading, mutate } = useSWR<DiscussionMessage[]>(
    `/api/discussion/${courseId}?page=1&limit=${limit}`,
    { onSuccess: (data) => onCountChange?.(data.length) },
  );

  const isUnread = (m: DiscussionMessage) => me && m.author.id !== me.id && !readIds.has(m.id);

  function markRead(msgId: string) {
    if (!me || readIds.has(msgId)) return;
    const next = new Set(readIds);
    next.add(msgId);
    setReadIds(next);
    saveReadIds(me.id, next);
  }

  const filteredMessages = useMemo(() => {
    if (!messages) return [];
    return messages
      .slice()
      .filter((m) => tagFilter === "all" || m.tag === tagFilter)
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        const aAnn = a.tag === "ANNOUNCEMENT" ? 1 : 0;
        const bAnn = b.tag === "ANNOUNCEMENT" ? 1 : 0;
        if (aAnn !== bAnn) return bAnn - aAnn;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [messages, tagFilter]);

  async function withErrorToast(fn: () => Promise<Response>) {
    setError(null);
    try {
      const res = await fn();
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? `Request failed (${res.status})`);
        return false;
      }
      return true;
    } catch {
      setError("Network error — please try again");
      return false;
    }
  }

  async function postMessage() {
    const body = postBody.trim();
    if (!body || posting) return;
    setPosting(true);
    const ok = await withErrorToast(() =>
      fetch(`/api/discussion/${courseId}`, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, tag: postTag }),
      }),
    );
    if (ok) {
      setPostBody("");
      setPostTag("DOUBT");
      await mutate();
    }
    setPosting(false);
  }

  async function toggleLike(messageId: string, replyId?: string) {
    mutate(
      (prev) =>
        prev?.map((m) => {
          if (!replyId && m.id === messageId) {
            return { ...m, userHasUpvoted: !m.userHasUpvoted, upvoteCount: m.upvoteCount + (m.userHasUpvoted ? -1 : 1) };
          }
          if (replyId && m.id === messageId) {
            return { ...m, replies: m.replies.map((r) =>
              r.id === replyId
                ? { ...r, userHasUpvoted: !r.userHasUpvoted, upvoteCount: r.upvoteCount + (r.userHasUpvoted ? -1 : 1) }
                : r,
            )};
          }
          return m;
        }),
      { revalidate: false },
    );
    const url = replyId
      ? `/api/discussion/${courseId}/replies/${replyId}/upvote`
      : `/api/discussion/${courseId}/messages/${messageId}/upvote`;
    const ok = await withErrorToast(() =>
      fetch(url, { method: "POST", credentials: "same-origin" }),
    );
    if (!ok) await mutate();
  }

  async function postReply(messageId: string) {
    const body = (replyDrafts[messageId] ?? "").trim();
    if (!body || replying[messageId]) return;
    setReplying((p) => ({ ...p, [messageId]: true }));
    const ok = await withErrorToast(() =>
      fetch(`/api/discussion/${courseId}/messages/${messageId}/replies`, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      }),
    );
    if (ok) {
      setReplyDrafts((d) => ({ ...d, [messageId]: "" }));
      await mutate();
    }
    setReplying((p) => ({ ...p, [messageId]: false }));
  }

  async function saveEdit(messageId: string) {
    const body = editDraft.trim();
    if (!body) return;
    const ok = await withErrorToast(() =>
      fetch(`/api/discussion/${courseId}/messages/${messageId}`, {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      }),
    );
    if (ok) {
      setEditingId(null);
      await mutate();
    }
  }

  async function deleteMessage(messageId: string) {
    const ok = await withErrorToast(() =>
      fetch(`/api/discussion/${courseId}/messages/${messageId}`, {
        method: "DELETE", credentials: "same-origin",
      }),
    );
    if (ok) {
      setConfirmDelete(null);
      await mutate();
    }
  }

  async function deleteReply(replyId: string, msgId: string) {
    const ok = await withErrorToast(() =>
      fetch(`/api/discussion/${courseId}/replies/${replyId}`, {
        method: "DELETE", credentials: "same-origin",
      }),
    );
    if (ok) {
      setConfirmDeleteReply(null);
      await mutate();
    }
  }

  async function togglePin(messageId: string) {
    const ok = await withErrorToast(() =>
      fetch(`/api/discussion/${courseId}/messages/${messageId}/pin`, {
        method: "PATCH", credentials: "same-origin",
      }),
    );
    if (ok) await mutate();
  }

  async function toggleAnswered(messageId: string) {
    const ok = await withErrorToast(() =>
      fetch(`/api/discussion/${courseId}/messages/${messageId}/answer`, {
        method: "PATCH", credentials: "same-origin",
      }),
    );
    if (ok) await mutate();
  }

  const toggleReplies = (id: string) => {
    markRead(id);
    setOpenReplies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const actionBtn = "text-[9px] text-[var(--text3)] cursor-pointer hover:text-[var(--text2)] transition-all bg-transparent border-none p-0";

  return (
    <div className="flex flex-col h-full">

      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2.5" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[11.5px] font-bold" style={{ color: "var(--text)" }}>Discussion</span>
          <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>
            {isLoading ? "…" : `${filteredMessages.length} messages`}
          </span>
        </div>
        {/* Tag filter */}
        <div className="flex gap-1">
          {(["all", "DOUBT", "TIP", "ANNOUNCEMENT", "RESOURCE"] as const).map((t) => (
            <button key={t} onClick={() => setTagFilter(t)}
              className="font-mono text-[7.5px] font-bold px-1.5 py-0.5 rounded cursor-pointer uppercase"
              style={tagFilter === t
                ? { background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }
                : { background: "transparent", color: "var(--text3)", border: "1px solid var(--border)" }}
            >{t === "all" ? "all" : TAG_ICONS[t]}</button>
          ))}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-3 mt-2 text-[10.5px] text-red-500 bg-red-500/10 border border-red-500/20 rounded-[7px] px-3 py-2">
            {error}
          </div>
        )}

        {isLoading && !messages && (
          <div className="flex items-center justify-center h-full font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>Loading discussion…</div>
        )}

        {messages && filteredMessages.length === 0 && (
          <div className="flex items-center justify-center h-full font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
            {tagFilter !== "all" ? `No ${tagFilter.toLowerCase()} messages.` : "No messages yet — be the first to start the discussion!"}
          </div>
        )}

        {filteredMessages.map((msg) => {
          const tagStyle = TAG_STYLES[msg.tag] || { label: msg.tag, bg: "var(--panel)", text: "var(--text3)" };
          const isInstructor = msg.author.role === "TRAINER";
          const canModify = me && (
            msg.author.id === me.id
              ? Date.now() - new Date(msg.createdAt).getTime() < 600_000
              : ["ADMIN", "CONTENT_MANAGER"].includes(me.role)
          );
          const repliesOpen = openReplies.has(msg.id);
          const unread = isUnread(msg);

          return (
            <div key={msg.id} className="border-b" style={{ borderColor: "var(--border)" }}>
              {/* Message card */}
              <div className={`flex gap-3 px-3 py-3 transition-all ${unread ? "" : "opacity-90"}`}
                style={isInstructor || msg.isPinned ? { background: "rgba(240,90,26,.02)" } : {}}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-[2px]"
                  style={{ background: avatarColor(msg.author.id) }}
                >{initials(msg.author.name)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-[8px] mb-[4px] flex-wrap">
                    <span className="text-[12px] font-bold" style={{ color: "var(--text)" }}>{msg.author.name}</span>
                    <span className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{timeAgo(msg.createdAt)}</span>
                    <span className="text-[7.5px] font-bold px-[5px] py-[1px] rounded-[2px]" style={{ background: tagStyle.bg, color: tagStyle.text }}>
                      {TAG_ICONS[msg.tag]} {tagStyle.label}
                    </span>
                    {isInstructor && (
                      <span className="text-[7.5px] font-bold px-[5px] py-[1px] rounded-[2px]" style={{ background: "var(--orange-d)", color: "var(--orange)" }}>instructor</span>
                    )}
                    {msg.isPinned && <span className="text-[9px]" title="Pinned">📌</span>}
                    {msg.isAnswered && (
                      <span className="text-[7.5px] font-bold px-[5px] py-[1px] rounded-[2px]" style={{ background: "var(--green-d)", color: "var(--green)" }}>✓ answered</span>
                    )}
                    {unread && <span className="w-[6px] h-[6px] rounded-full bg-[var(--orange)] inline-block" title="Unread" />}
                  </div>

                  {editingId === msg.id ? (
                    <div className="mb-[8px]">
                      <textarea value={editDraft} onChange={(e) => setEditDraft(e.target.value)} maxLength={2000} rows={3}
                        className="w-full font-mono text-[10px] px-2 py-1.5 rounded outline-none resize-none"
                        style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
                      />
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => { setEditingId(null); setEditDraft(""); }} className="font-mono text-[9px] px-2 py-1 rounded cursor-pointer" style={{ border: "1px solid var(--border)", background: "transparent", color: "var(--text3)" }}>Cancel</button>
                        <button onClick={() => saveEdit(msg.id)} disabled={!editDraft.trim()} className="font-mono text-[9px] px-2 py-1 rounded cursor-pointer text-white disabled:opacity-50" style={{ background: "var(--orange)", border: "none" }}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] leading-[1.6] mb-[8px] whitespace-pre-wrap break-words" style={{ color: "var(--text2)" }}>
                      {msg.body}
                    </div>
                  )}

                  {msg.attachmentUrl && (
                    <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] underline block mb-[6px]" style={{ color: "var(--blue2)" }}>
                      📎 Attachment
                    </a>
                  )}

                  <div className="flex gap-3 flex-wrap items-center">
                    <button onClick={() => toggleLike(msg.id)} className={`${actionBtn} ${msg.userHasUpvoted ? "!text-[var(--orange)] font-bold" : ""}`}>
                      👍 {msg.userHasUpvoted ? msg.upvoteCount : `Like${msg.upvoteCount > 0 ? ` · ${msg.upvoteCount}` : ""}`}
                    </button>
                    <button onClick={() => toggleReplies(msg.id)} className={actionBtn}>
                      💬 Reply{msg.replyCount > 0 ? ` · ${msg.replyCount}` : ""}
                    </button>
                    {canModify && msg.author.id === me?.id && (
                      <button onClick={() => { setEditingId(msg.id); setEditDraft(msg.body); }} className={actionBtn}>✏️ Edit</button>
                    )}
                    {canModify && (
                      <button onClick={() => setConfirmDelete(msg.id)} className={actionBtn}>🗑️ Delete</button>
                    )}
                    {isStaff && (
                      <>
                        <button onClick={() => togglePin(msg.id)} className={actionBtn}>{msg.isPinned ? "📌 Unpin" : "📌 Pin"}</button>
                        <button onClick={() => toggleAnswered(msg.id)} className={actionBtn}>{msg.isAnswered ? "↩️ Unmark" : "✓ Mark answered"}</button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Replies */}
              {repliesOpen && (
                <div className="ml-[44px]" style={{ borderLeft: "1.5px solid var(--border)" }}>
                  <div className="flex flex-col gap-1 pl-4 pb-2 pt-1">
                    {msg.replies.length === 0 && (
                      <div className="font-mono text-[9.5px] py-1.5" style={{ color: "var(--text3)" }}>No replies yet.</div>
                    )}
                    {msg.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-[9px] py-1.5 px-2 rounded-[6px] transition-all hover:opacity-85" style={{ background: "transparent" }}>
                        <div
                          className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0 mt-[2px]"
                          style={{ background: avatarColor(reply.author.id) }}
                        >{initials(reply.author.name)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-[6px] flex-wrap">
                            <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>{reply.author.name}</span>
                            {reply.author.role === "TRAINER" && (
                              <span className="text-[7px] font-bold px-[5px] py-[1px] rounded-[3px]" style={{ background: "var(--orange-d)", color: "var(--orange)" }}>instructor</span>
                            )}
                            <span className="font-mono text-[8px]" style={{ color: "var(--text3)" }}>{timeAgo(reply.createdAt)}</span>
                          </div>
                          <div className="text-[10.5px] leading-[1.55] mt-[2px] whitespace-pre-wrap break-words" style={{ color: "var(--text2)" }}>{reply.body}</div>
                          <div className="flex items-center gap-3 mt-[4px]">
                            <button onClick={() => toggleLike(msg.id, reply.id)} className={`${actionBtn} !text-[9px] ${reply.userHasUpvoted ? "!text-[var(--orange)] font-bold" : ""}`}>
                              👍 {reply.userHasUpvoted ? reply.upvoteCount : `Like${reply.upvoteCount > 0 ? ` · ${reply.upvoteCount}` : ""}`}
                            </button>
                            {me && (reply.author.id === me.id || ["ADMIN", "CONTENT_MANAGER"].includes(me.role)) && (
                              <button onClick={() => setConfirmDeleteReply({ replyId: reply.id, msgId: msg.id })} className={actionBtn}>🗑️</button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="flex gap-[8px] items-center pt-0.5 pb-1">
                      <input
                        value={replyDrafts[msg.id] ?? ""}
                        onChange={(e) => setReplyDrafts((d) => ({ ...d, [msg.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postReply(msg.id); } }}
                        placeholder="Write a reply…"
                        maxLength={2000}
                        className="flex-1 font-mono text-[9.5px] px-2.5 py-[7px] rounded-[6px] outline-none transition-all focus:ring-[1.5px] focus:ring-[var(--orange)]"
                        style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
                      />
                      <button
                        onClick={() => postReply(msg.id)}
                        disabled={!(replyDrafts[msg.id] ?? "").trim() || replying[msg.id]}
                        className="px-3 py-[7px] rounded-[6px] text-white text-[9.5px] font-bold border-none cursor-pointer disabled:opacity-40 transition-all hover:brightness-110"
                        style={{ background: "var(--orange)" }}
                      >{replying[msg.id] ? "…" : "Reply"}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {messages && messages.length >= limit && (
          <button
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
            className="w-full font-mono text-[9.5px] font-semibold py-2 cursor-pointer transition-all"
            style={{ color: "var(--text3)", borderTop: "1px solid var(--border)", background: "transparent" }}
          >
            Load more messages
          </button>
        )}
      </div>

      {/* Composer - bottom bar */}
      <form onSubmit={(e) => { e.preventDefault(); postMessage(); }} className="flex items-start gap-2 px-3 py-2.5" style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
        <textarea value={postBody} onChange={(e) => setPostBody(e.target.value)} placeholder="Ask a question or share your progress…" maxLength={2000} rows={1}
          className="flex-1 font-mono text-[9.5px] px-2 py-1.5 rounded outline-none resize-none"
          style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", minHeight: 32 }}
        />
        <div className="flex items-center gap-1 shrink-0">
          {(["DOUBT", "TIP", "RESOURCE", ...(isStaff ? (["ANNOUNCEMENT"] as const) : [])] as DiscussionMessage["tag"][]).map((tag) => (
            <button key={tag} type="button" onClick={() => setPostTag(tag)}
              className="font-mono text-[7.5px] font-bold px-1.5 py-0.5 rounded cursor-pointer"
              style={postTag === tag
                ? { background: TAG_STYLES[tag]?.bg || "var(--panel)", color: TAG_STYLES[tag]?.text || "var(--text3)", border: "1px solid currentColor" }
                : { background: "transparent", color: "var(--text3)", border: "1px solid var(--border)" }}
            >{TAG_ICONS[tag]}</button>
          ))}
          <button type="submit" disabled={!postBody.trim() || posting}
            className="px-[8px] py-[5px] rounded-[4px] text-white text-[9px] font-bold border-none cursor-pointer disabled:opacity-50"
            style={{ background: "var(--orange)" }}
          >{posting ? "…" : "Post"}</button>
        </div>
      </form>

      {/* Confirm modals */}
      {confirmDelete && (
        <ConfirmModal message="Delete this message permanently?" onConfirm={() => deleteMessage(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
      )}
      {confirmDeleteReply && (
        <ConfirmModal message="Delete this reply permanently?" onConfirm={() => deleteReply(confirmDeleteReply.replyId, confirmDeleteReply.msgId)} onCancel={() => setConfirmDeleteReply(null)} />
      )}
    </div>
  );
}