"use client";

import { useState } from "react";
import useSWR from "swr";
import { useStudentDashboard } from "../../hooks/student-dashboard";

// Backend calls it "upvote" — the UI shows it as "Like".

interface DiscussionAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
}

interface DiscussionReply {
  id: string;
  body: string;
  createdAt: string;
  author: DiscussionAuthor;
  userHasUpvoted: boolean;
  upvoteCount: number;
}

interface DiscussionMessage {
  id: string;
  body: string;
  tag: "DOUBT" | "TIP" | "ANNOUNCEMENT" | "RESOURCE";
  isPinned: boolean;
  isAnswered: boolean;
  attachmentUrl: string | null;
  createdAt: string;
  author: DiscussionAuthor;
  userHasUpvoted: boolean;
  upvoteCount: number;
  replyCount: number;
  replies: DiscussionReply[];
}

const PAGE_SIZE = 20;

const TAG_STYLES: Record<DiscussionMessage["tag"], { label: string; bg: string; text: string }> = {
  DOUBT: { label: "doubt", bg: "var(--orange-d)", text: "var(--orange)" },
  TIP: { label: "tip", bg: "var(--blue-d)", text: "var(--blue2)" },
  ANNOUNCEMENT: { label: "announcement", bg: "var(--purple-d, rgba(147,51,234,.12))", text: "var(--purple, #a855f7)" },
  RESOURCE: { label: "resource", bg: "var(--green-d)", text: "var(--green)" },
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

async function apiCall(url: string, method: string, body?: unknown): Promise<Response> {
  return fetch(url, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

interface Props {
  courseId: string;
  onCountChange?: (count: number) => void;
}

export default function DiscussionTab({ courseId, onCountChange }: Props) {
  const { data: dashboard } = useStudentDashboard();
  const me = dashboard?.user ?? null;
  const isStaff = !!me && me.role !== "STUDENT";

  const [limit, setLimit] = useState(PAGE_SIZE);
  const [postBody, setPostBody] = useState("");
  const [postTag, setPostTag] = useState<DiscussionMessage["tag"]>("DOUBT");
  const [posting, setPosting] = useState(false);
  const [openReplies, setOpenReplies] = useState<Set<string>>(new Set());
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: messages, isLoading, mutate } = useSWR<DiscussionMessage[]>(
    `/api/discussion/${courseId}?page=1&limit=${limit}`,
    {
      onSuccess: (data) => onCountChange?.(data.length),
    },
  );

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
      apiCall(`/api/discussion/${courseId}`, "POST", { body, tag: postTag }),
    );
    if (ok) {
      setPostBody("");
      setPostTag("DOUBT");
      await mutate();
    }
    setPosting(false);
  }

  // Like = backend upvote. Optimistic toggle, rollback via revalidate on failure.
  async function toggleLike(messageId: string, replyId?: string) {
    mutate(
      (prev) =>
        prev?.map((m) => {
          if (!replyId && m.id === messageId) {
            return { ...m, userHasUpvoted: !m.userHasUpvoted, upvoteCount: m.upvoteCount + (m.userHasUpvoted ? -1 : 1) };
          }
          if (replyId && m.id === messageId) {
            return {
              ...m,
              replies: m.replies.map((r) =>
                r.id === replyId
                  ? { ...r, userHasUpvoted: !r.userHasUpvoted, upvoteCount: r.upvoteCount + (r.userHasUpvoted ? -1 : 1) }
                  : r,
              ),
            };
          }
          return m;
        }),
      { revalidate: false },
    );
    const url = replyId
      ? `/api/discussion/${courseId}/replies/${replyId}/upvote`
      : `/api/discussion/${courseId}/messages/${messageId}/upvote`;
    const ok = await withErrorToast(() => apiCall(url, "POST"));
    if (!ok) await mutate();
  }

  async function postReply(messageId: string) {
    const body = (replyDrafts[messageId] ?? "").trim();
    if (!body) return;
    const ok = await withErrorToast(() =>
      apiCall(`/api/discussion/${courseId}/messages/${messageId}/replies`, "POST", { body }),
    );
    if (ok) {
      setReplyDrafts((d) => ({ ...d, [messageId]: "" }));
      await mutate();
    }
  }

  async function saveEdit(messageId: string) {
    const body = editDraft.trim();
    if (!body) return;
    const ok = await withErrorToast(() =>
      apiCall(`/api/discussion/${courseId}/messages/${messageId}`, "PATCH", { body }),
    );
    if (ok) {
      setEditingId(null);
      await mutate();
    }
  }

  async function deleteMessage(messageId: string) {
    if (!window.confirm("Delete this message?")) return;
    const ok = await withErrorToast(() =>
      apiCall(`/api/discussion/${courseId}/messages/${messageId}`, "DELETE"),
    );
    if (ok) await mutate();
  }

  async function deleteReply(replyId: string) {
    if (!window.confirm("Delete this reply?")) return;
    const ok = await withErrorToast(() =>
      apiCall(`/api/discussion/${courseId}/replies/${replyId}`, "DELETE"),
    );
    if (ok) await mutate();
  }

  async function togglePin(messageId: string) {
    const ok = await withErrorToast(() =>
      apiCall(`/api/discussion/${courseId}/messages/${messageId}/pin`, "PATCH"),
    );
    if (ok) await mutate();
  }

  async function toggleAnswered(messageId: string) {
    const ok = await withErrorToast(() =>
      apiCall(`/api/discussion/${courseId}/messages/${messageId}/answer`, "PATCH"),
    );
    if (ok) await mutate();
  }

  const toggleReplies = (id: string) =>
    setOpenReplies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const actionBtn = "text-[9px] text-[var(--text3)] cursor-pointer hover:text-[var(--text2)] transition-all bg-transparent border-none p-0";

  return (
    <div className="p-4 flex flex-col gap-[10px]">
      {/* Composer */}
      <div className="flex gap-[8px] items-start p-3 bg-[var(--card)] border border-[var(--border)] rounded-[10px]">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-[2px]"
          style={{ background: me ? avatarColor(me.id) : AVATAR_COLORS[0] }}
        >
          {me ? initials(me.name) : "?"}
        </div>
        <div className="flex-1 flex flex-col gap-[6px]">
          <textarea
            value={postBody}
            onChange={(e) => setPostBody(e.target.value)}
            placeholder="Ask a question or share your progress…"
            rows={2}
            maxLength={2000}
            className="w-full resize-none bg-[var(--bg2)] border border-[var(--border)] rounded-[7px] px-3 py-2 text-[11.5px] text-[var(--text)] outline-none transition-all focus:border-[var(--orange)] placeholder:text-[var(--text3)]"
          />
          <div className="flex items-center gap-[6px]">
            {(["DOUBT", "TIP", ...(isStaff ? (["ANNOUNCEMENT"] as const) : [])] as DiscussionMessage["tag"][]).map((tag) => (
              <button
                key={tag}
                onClick={() => setPostTag(tag)}
                className={`text-[8px] font-bold px-[6px] py-[2px] rounded-[3px] cursor-pointer border transition-all ${
                  postTag === tag ? "border-[var(--orange)]" : "border-transparent opacity-60 hover:opacity-100"
                }`}
                style={{ background: TAG_STYLES[tag].bg, color: TAG_STYLES[tag].text }}
              >
                {TAG_STYLES[tag].label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={postMessage}
          disabled={posting || !postBody.trim()}
          className="px-[14px] py-[7px] rounded-[6px] bg-[var(--orange)] text-white text-[10.5px] font-bold border-none cursor-pointer whitespace-nowrap hover:bg-[var(--orange2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {posting ? "Posting…" : "Post"}
        </button>
      </div>

      {error && (
        <div className="text-[10.5px] text-red-500 bg-red-500/10 border border-red-500/20 rounded-[7px] px-3 py-2">
          {error}
        </div>
      )}

      {isLoading && !messages && (
        <div className="text-[11px] text-[var(--text3)] text-center py-6">Loading discussion…</div>
      )}

      {messages?.length === 0 && (
        <div className="text-[11px] text-[var(--text3)] text-center py-6">
          No messages yet — be the first to start the discussion!
        </div>
      )}

      {/* Pinned first (server order), then announcements, then the rest */}
      {messages
        ?.slice()
        .sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          const aAnn = a.tag === "ANNOUNCEMENT" ? 1 : 0;
          const bAnn = b.tag === "ANNOUNCEMENT" ? 1 : 0;
          if (aAnn !== bAnn) return bAnn - aAnn;
          return 0;
        })
        .map((msg) => {
        const isInstructor = msg.author.role === "TRAINER";
        const canModify = me && (msg.author.id === me.id || ["ADMIN", "CONTENT_MANAGER"].includes(me.role));
        const repliesOpen = openReplies.has(msg.id);
        const tagStyle = TAG_STYLES[msg.tag];

        return (
          <div
            key={msg.id}
            className={`flex gap-[10px] p-[14px] bg-[var(--card)] border border-[var(--border)] rounded-[10px] transition-all hover:border-[var(--border2)] ${
              isInstructor || msg.isPinned ? "border-[rgba(240,90,26,.2)] bg-[rgba(240,90,26,.02)]" : ""
            }`}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-[1px]"
              style={{ background: avatarColor(msg.author.id) }}
            >
              {initials(msg.author.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-[8px] mb-[6px] flex-wrap">
                <span className="text-[12px] font-bold text-[var(--text)]">{msg.author.name}</span>
                <span className="text-[9px] text-[var(--text3)]">{timeAgo(msg.createdAt)}</span>
                <span className="text-[8px] font-bold px-[6px] py-[2px] rounded-[3px]" style={{ background: tagStyle.bg, color: tagStyle.text }}>
                  {tagStyle.label}
                </span>
                {isInstructor && (
                  <span className="text-[8px] font-bold px-[6px] py-[2px] rounded-[3px]" style={{ background: "var(--orange-d)", color: "var(--orange)" }}>
                    instructor
                  </span>
                )}
                {msg.isPinned && <span className="text-[9px]" title="Pinned">📌</span>}
                {msg.isAnswered && (
                  <span className="text-[8px] font-bold px-[6px] py-[2px] rounded-[3px]" style={{ background: "var(--green-d)", color: "var(--green)" }}>
                    ✓ answered
                  </span>
                )}
              </div>

              {editingId === msg.id ? (
                <div className="flex flex-col gap-[6px] mb-[8px]">
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    rows={2}
                    maxLength={2000}
                    className="w-full resize-none bg-[var(--bg2)] border border-[var(--border)] rounded-[7px] px-3 py-2 text-[11.5px] text-[var(--text)] outline-none focus:border-[var(--orange)]"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(msg.id)} className="text-[9px] font-bold text-[var(--orange)] bg-transparent border-none cursor-pointer p-0">Save</button>
                    <button onClick={() => setEditingId(null)} className={actionBtn}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="text-[11.5px] text-[var(--text2)] leading-[1.6] mb-[8px] whitespace-pre-wrap break-words">{msg.body}</div>
              )}

              {msg.attachmentUrl && (
                <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[var(--blue2)] underline block mb-[8px]">
                  📎 Attachment
                </a>
              )}

              <div className="flex gap-3 flex-wrap">
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
                  <button onClick={() => deleteMessage(msg.id)} className={actionBtn}>🗑️ Delete</button>
                )}
                {isStaff && (
                  <>
                    <button onClick={() => togglePin(msg.id)} className={actionBtn}>{msg.isPinned ? "📌 Unpin" : "📌 Pin"}</button>
                    <button onClick={() => toggleAnswered(msg.id)} className={actionBtn}>{msg.isAnswered ? "↩️ Unmark" : "✓ Mark answered"}</button>
                  </>
                )}
              </div>

              {repliesOpen && (
                <div className="mt-[10px] flex flex-col gap-[8px] border-l-2 border-[var(--border)] pl-[10px]">
                  {msg.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-[8px]">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0 mt-[1px]"
                        style={{ background: avatarColor(reply.author.id) }}
                      >
                        {initials(reply.author.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-[6px] flex-wrap">
                          <span className="text-[10.5px] font-bold text-[var(--text)]">{reply.author.name}</span>
                          {reply.author.role === "TRAINER" && (
                            <span className="text-[7px] font-bold px-[5px] py-[1px] rounded-[3px]" style={{ background: "var(--orange-d)", color: "var(--orange)" }}>
                              instructor
                            </span>
                          )}
                          <span className="text-[8.5px] text-[var(--text3)]">{timeAgo(reply.createdAt)}</span>
                        </div>
                        <div className="text-[10.5px] text-[var(--text2)] leading-[1.5] mt-[2px] whitespace-pre-wrap break-words">{reply.body}</div>
                        <div className="flex gap-3 mt-[4px]">
                          <button onClick={() => toggleLike(msg.id, reply.id)} className={`${actionBtn} ${reply.userHasUpvoted ? "!text-[var(--orange)] font-bold" : ""}`}>
                            👍 {reply.userHasUpvoted ? reply.upvoteCount : `Like${reply.upvoteCount > 0 ? ` · ${reply.upvoteCount}` : ""}`}
                          </button>
                          {me && (reply.author.id === me.id || ["ADMIN", "CONTENT_MANAGER"].includes(me.role)) && (
                            <button onClick={() => deleteReply(reply.id)} className={actionBtn}>🗑️ Delete</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-[6px] items-center">
                    <input
                      value={replyDrafts[msg.id] ?? ""}
                      onChange={(e) => setReplyDrafts((d) => ({ ...d, [msg.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postReply(msg.id); } }}
                      placeholder="Write a reply…"
                      maxLength={2000}
                      className="flex-1 bg-[var(--bg2)] border border-[var(--border)] rounded-[6px] px-[10px] py-[6px] text-[10.5px] text-[var(--text)] outline-none focus:border-[var(--orange)] placeholder:text-[var(--text3)]"
                    />
                    <button
                      onClick={() => postReply(msg.id)}
                      disabled={!(replyDrafts[msg.id] ?? "").trim()}
                      className="px-[10px] py-[6px] rounded-[5px] bg-[var(--orange)] text-white text-[9.5px] font-bold border-none cursor-pointer hover:bg-[var(--orange2)] transition-all disabled:opacity-50"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {messages && messages.length >= limit && (
        <button
          onClick={() => setLimit((l) => l + PAGE_SIZE)}
          className="text-[10.5px] font-semibold text-[var(--text3)] hover:text-[var(--text2)] bg-[var(--card)] border border-[var(--border)] rounded-[8px] py-2 cursor-pointer transition-all"
        >
          Load more messages
        </button>
      )}
    </div>
  );
}
