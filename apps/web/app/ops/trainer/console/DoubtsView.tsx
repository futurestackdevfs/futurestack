"use client";

import { useMemo, useState, useEffect } from "react";
import { ViewHeader } from "../sections/ui";
import { opsFetch } from "@/app/ops/lib/ops-fetch";

/* ── Types ── */

interface DiscussionAuthor {
  id: string; name: string; avatarUrl: string | null; role: string;
}
interface DiscussionReply {
  id: string; body: string; createdAt: string;
  author: DiscussionAuthor;
  userHasUpvoted: boolean; upvoteCount: number;
}
interface DiscussionMessage {
  id: string; courseId: string; courseTitle?: string;
  body: string; tag: "DOUBT" | "TIP" | "ANNOUNCEMENT" | "RESOURCE";
  isPinned: boolean; isAnswered: boolean;
  attachmentUrl: string | null;
  createdAt: string;
  author: DiscussionAuthor;
  userHasUpvoted: boolean;
  upvoteCount: number; replyCount: number;
  replies: DiscussionReply[];
}

interface DoubtsViewProps {
  messages: DiscussionMessage[];
  searchQuery: string;
  user: { id: string; name: string };
  onToggleAnswer: (msgId: string, courseId: string) => void;
  onTogglePin: (msgId: string, courseId: string) => void;
  onReply: (msgId: string, courseId: string, body: string) => Promise<any>;
  onDelete: (msgId: string, courseId: string) => void;
  onUpvote: (msgId: string, courseId: string, replyId?: string) => void;
  onCreate: (courseId: string, body: string, tag: string, attachmentUrl?: string | null) => Promise<any>;
  onUpdate: (msgId: string, courseId: string, body: string) => Promise<any>;
  onDeleteReply: (replyId: string, courseId: string) => Promise<any>;
}

/* ── Constants ── */

const TAG_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  DOUBT: { label: "doubt", bg: "var(--orange-d)", text: "var(--orange)" },
  TIP: { label: "tip", bg: "var(--blue-d)", text: "var(--blue2)" },
  ANNOUNCEMENT: { label: "announcement", bg: "var(--purple-d)", text: "var(--purple, #a855f7)" },
  RESOURCE: { label: "resource", bg: "var(--green-d)", text: "var(--green)" },
};

const TAG_ICONS: Record<string, string> = {
  DOUBT: "❓",
  TIP: "💡",
  ANNOUNCEMENT: "📢",
  RESOURCE: "📎",
};

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 172800) return "Yesterday";
  return `${Math.floor(secs / 86400)}d ago`;
}

function initials(name: string): string {
  return name.split(" ").map((w) => w[0] ?? "").join("").toUpperCase().slice(0, 2);
}

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

/* ── Read/unread tracker ── */

function readKey(userId: string) { return `fs-trainer-${userId}-read-msgs`; }

function loadReadIds(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(readKey(userId)) || "[]")); } catch { return new Set(); }
}

function saveReadIds(userId: string, ids: Set<string>) {
  try { localStorage.setItem(readKey(userId), JSON.stringify([...ids])); } catch { /* noop */ }
}

/* ── Confirm Modal ── */

function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.45)" }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 8, padding: "24px 28px", minWidth: 300, border: "1px solid var(--border)", boxShadow: "0 12px 32px rgba(0,0,0,.25)" }}>
        <p className="font-mono text-[11px] mb-4" style={{ color: "var(--text2)", lineHeight: 1.5 }}>{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="font-mono text-[10px] px-3 py-1.5 rounded cursor-pointer" style={{ border: "1px solid var(--border)", background: "transparent", color: "var(--text3)" }}>Cancel</button>
          <button onClick={onConfirm} className="font-mono text-[10px] px-3 py-1.5 rounded cursor-pointer text-white" style={{ background: "var(--red, #e53e3e)", border: "none" }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ── Component ── */

export default function DoubtsView({ messages, searchQuery, user, onToggleAnswer, onTogglePin, onReply, onDelete, onUpvote, onCreate, onUpdate, onDeleteReply }: DoubtsViewProps) {
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds(user.id));
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [openReplies, setOpenReplies] = useState<Set<string>>(new Set());
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replying, setReplying] = useState<Record<string, boolean>>({});
  const [composerBody, setComposerBody] = useState("");
  const [composerTag, setComposerTag] = useState<string>("DOUBT");
  const [posting, setPosting] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ msgId: string; courseId: string } | null>(null);
  const [confirmDeleteReply, setConfirmDeleteReply] = useState<{ replyId: string; courseId: string } | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);

  const isUnread = (m: DiscussionMessage) => m.author.id !== user.id && !readIds.has(m.id);

  function markRead(msgId: string) {
    if (readIds.has(msgId)) return;
    const next = new Set(readIds);
    next.add(msgId);
    setReadIds(next);
    saveReadIds(user.id, next);
  }

  function markCourseRead(courseId: string) {
    const next = new Set(readIds);
    for (const m of messages) { if (m.courseId === courseId) next.add(m.id); }
    setReadIds(next);
    saveReadIds(user.id, next);
  }

  /* Group by course */
  const courseList = useMemo(() => {
    const map = new Map<string, { title: string; messages: DiscussionMessage[] }>();
    for (const m of messages) {
      const key = m.courseId || "unknown";
      if (!map.has(key)) map.set(key, { title: m.courseTitle || key, messages: [] });
      map.get(key)!.messages.push(m);
    }
    return [...map.entries()].map(([id, g]) => ({
      id,
      title: g.title,
      count: g.messages.length,
      unread: g.messages.filter((m) => isUnread(m)).length,
      unanswered: g.messages.filter((m) => !m.isAnswered).length,
      tagCounts: g.messages.reduce((acc, m) => { acc[m.tag] = (acc[m.tag] || 0) + 1; return acc; }, {} as Record<string, number>),
    })).sort((a, b) => {
      if (a.unread !== b.unread) return b.unread - a.unread;
      return a.title.localeCompare(b.title);
    });
  }, [messages, readIds]);

  /* Select first course with unread by default */
  useEffect(() => {
    if (!selectedCourse && courseList.length > 0) {
      const first = courseList.find((c) => c.unread > 0) || courseList[0];
      setSelectedCourse(first.id);
    }
  }, [courseList, selectedCourse]);

  /* Messages for selected course */
  const selectedMessages = useMemo(() => {
    const list = messages.filter((m) => m.courseId === selectedCourse);
    return list
      .filter((m) => tagFilter === "all" || m.tag === tagFilter)
      .filter((m) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return [m.body, m.author.name, m.tag].some((v) => v.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [messages, selectedCourse, tagFilter, searchQuery]);

  const selectedCourseTitle = selectedCourse
    ? courseList.find((c) => c.id === selectedCourse)?.title || selectedCourse
    : "";

  /* Auto-mark selected course as read */
  useEffect(() => {
    if (selectedCourse) markCourseRead(selectedCourse);
  }, [selectedCourse]);

  function selectCourse(courseId: string) {
    setSelectedCourse(courseId);
    setOpenReplies(new Set());
    setReplyDrafts({});
  }

  /* Reply */
  async function submitReply(msgId: string, courseId: string) {
    const body = (replyDrafts[msgId] ?? "").trim();
    if (!body || replying[msgId]) return;
    setReplying((p) => ({ ...p, [msgId]: true }));
    await onReply(msgId, courseId, body);
    setReplyDrafts((d) => ({ ...d, [msgId]: "" }));
    setReplying((p) => ({ ...p, [msgId]: false }));
  }

  const toggleReplies = (id: string) => {
    markRead(id);
    setOpenReplies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  /* Composer */
  async function submitComposer() {
    const body = composerBody.trim();
    if ((!body && !attachment) || posting || !selectedCourse) return;
    setPosting(true);
    let attachmentUrl = null;

    if (attachment) {
      const fd = new FormData();
      fd.append("file", attachment);
      try {
        const uploadRes = await opsFetch("/api/upload/discussion", { method: "POST", body: fd });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          attachmentUrl = data.url;
        }
      } catch (err) {
        setPosting(false);
        return;
      }
    }

    await onCreate(selectedCourse, body, composerTag, attachmentUrl);
    setComposerBody("");
    setComposerTag("DOUBT");
    setAttachment(null);
    setPosting(false);
  }

  /* Edit message */
  function startEdit(msg: DiscussionMessage) {
    setEditingMsgId(msg.id);
    setEditBody(msg.body);
  }
  function cancelEdit() {
    setEditingMsgId(null);
    setEditBody("");
  }
  async function saveEdit(msgId: string) {
    const body = editBody.trim();
    if (!body || savingEdit || !selectedCourse) return;
    setSavingEdit(true);
    await onUpdate(msgId, selectedCourse, body);
    setEditingMsgId(null);
    setEditBody("");
    setSavingEdit(false);
  }

  /* Confirm handlers */
  function handleConfirmDelete() {
    if (!confirmDelete) return;
    onDelete(confirmDelete.msgId, confirmDelete.courseId);
    setConfirmDelete(null);
  }
  async function handleConfirmDeleteReply() {
    if (!confirmDeleteReply) return;
    await onDeleteReply(confirmDeleteReply.replyId, confirmDeleteReply.courseId);
    setConfirmDeleteReply(null);
  }

  const actionBtn = "text-[9px] text-[var(--text3)] cursor-pointer hover:text-[var(--text2)] transition-all bg-transparent border-none p-0";

  return (
    <div className="p-4 pb-7 h-full flex flex-col">
      <ViewHeader icon="❓" title="Discussions" meta={`${messages.length} messages · ${courseList.length} courses`} />

      <div className="flex gap-4 flex-1 min-h-0" style={{ minHeight: 0 }}>
        {/* ── LEFT: Course list ── */}
        <div className="w-[240px] shrink-0 rounded overflow-hidden flex flex-col" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <div className="px-2.5 py-2 font-mono text-[9px] font-bold uppercase tracking-wider" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)", color: "var(--text3)" }}>
            Courses
          </div>
          <div className="flex-1 overflow-y-auto">
            {courseList.length === 0 && (
              <div className="px-3 py-6 font-mono text-[10px] text-center" style={{ color: "var(--text3)" }}>No discussions</div>
            )}
            {courseList.map((course) => {
              const active = selectedCourse === course.id;
              const tagList = Object.entries(course.tagCounts).sort(([, a], [, b]) => b - a);
              return (
                <button
                  key={course.id}
                  onClick={() => selectCourse(course.id)}
                  className="w-full text-left px-2.5 py-2.5 cursor-pointer transition-all block"
                  style={{
                    background: active ? "rgba(240,90,26,.06)" : "transparent",
                    borderBottom: "1px solid var(--border)",
                    borderLeft: `3px solid ${active ? "var(--orange)" : "transparent"}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="text-[10.5px] font-bold truncate" style={{ color: "var(--text)" }}>{course.title}</span>
                    <span className="font-mono text-[9px] whitespace-nowrap shrink-0" style={{ color: "var(--text3)" }}>{course.count}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {tagList.slice(0, 3).map(([tag, count]) => (
                      <span key={tag} className="font-mono text-[7.5px] px-1 py-[1px] rounded" style={{ background: TAG_STYLES[tag]?.bg || "var(--panel)", color: TAG_STYLES[tag]?.text || "var(--text3)" }}>
                        {TAG_ICONS[tag]}{count}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-1">
                    {course.unread > 0 && (
                      <span className="font-mono text-[8px] font-bold" style={{ color: "var(--orange)" }}>{course.unread} new</span>
                    )}
                    {course.unanswered > 0 && (
                      <span className="font-mono text-[8px]" style={{ color: "var(--red)" }}>{course.unanswered} pending</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Discussion panel ── */}
        <div className="flex-1 rounded overflow-hidden flex flex-col" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          {!selectedCourse ? (
            <div className="flex-1 flex items-center justify-center font-mono text-[11px]" style={{ color: "var(--text3)" }}>Select a course to view discussions</div>
          ) : (
            <>
              {/* Tag legend */}
              <details className="px-3 py-1.5 cursor-pointer select-none" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
                <summary className="font-mono text-[8px] uppercase tracking-wider" style={{ color: "var(--text3)" }}>
                  Tag legend — click to expand
                </summary>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  {([
                    { tag: "DOUBT", desc: "Question / doubt", who: "Everyone" },
                    { tag: "TIP", desc: "Helpful tip / trick", who: "Everyone" },
                    { tag: "ANNOUNCEMENT", desc: "Official announcement", who: "Staff only (Trainer, Admin, Content Mgr)" },
                    { tag: "RESOURCE", desc: "Useful link / reference material", who: "Everyone" },
                  ] as const).map(({ tag, desc, who }) => (
                    <div key={tag} className="flex items-center gap-1.5">
                      <span className="font-mono text-[7.5px] font-bold px-1 py-[1px] rounded" style={{ background: TAG_STYLES[tag]?.bg || "var(--panel)", color: TAG_STYLES[tag]?.text || "var(--text3)" }}>
                        {TAG_ICONS[tag]} {TAG_STYLES[tag]?.label || tag.toLowerCase()}
                      </span>
                      <span className="font-mono text-[7.5px]" style={{ color: "var(--text3)" }}>— {desc}</span>
                      <span className="font-mono text-[7px] px-1 rounded" style={{ background: "var(--blue-d)", color: "var(--blue)" }}>{who}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[7.5px] font-bold px-1 py-[1px] rounded" style={{ background: "var(--panel)", color: "var(--text3)" }}>📎 Attachment</span>
                    <span className="font-mono text-[7.5px]" style={{ color: "var(--text3)" }}>— File / URL on any message (not a tag)</span>
                    <span className="font-mono text-[7px] px-1 rounded" style={{ background: "var(--red-d)", color: "var(--red)" }}>Upload: Admin/Content Mgr only</span>
                  </div>
                </div>
              </details>

              {/* Top bar: course name + tag filter */}
              <div className="flex items-center justify-between px-3 py-2.5" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[13px] font-bold truncate" style={{ color: "var(--text)" }}>{selectedCourseTitle}</span>
                  <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>{selectedMessages.length} messages</span>
                  {selectedMessages.filter((m) => !m.isAnswered).length > 0 && (
                    <span className="font-mono text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--red-d)", color: "var(--red)" }}>
                      {selectedMessages.filter((m) => !m.isAnswered).length} unanswered
                    </span>
                  )}
                </div>
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

              {/* Messages */}
              <div className="flex-1 overflow-y-auto">
                {selectedMessages.length === 0 && (
                  <div className="flex items-center justify-center h-full font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
                    {tagFilter !== "all" ? `No ${tagFilter.toLowerCase()} messages in this course.` : "No messages in this course yet."}
                  </div>
                )}
                {selectedMessages.map((msg) => {
                  const tagStyle = TAG_STYLES[msg.tag] || { label: msg.tag, bg: "var(--panel)", text: "var(--text3)" };
                  const repliesOpen = openReplies.has(msg.id);

                  return (
                    <div key={msg.id} className="border-b" style={{ borderColor: "var(--border)" }}>
                      {/* Message card */}
                      <div className="flex gap-3 px-3 py-3">
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
                            {msg.author.role === "TRAINER" && (
                              <span className="text-[7.5px] font-bold px-[5px] py-[1px] rounded-[2px]" style={{ background: "var(--orange-d)", color: "var(--orange)" }}>you</span>
                            )}
                            {msg.isPinned && <span className="text-[9px]" title="Pinned">📌</span>}
                            {msg.isAnswered && (
                              <span className="text-[7.5px] font-bold px-[5px] py-[1px] rounded-[2px]" style={{ background: "var(--green-d)", color: "var(--green)" }}>✓ answered</span>
                            )}
                          </div>

                          {editingMsgId === msg.id ? (
                            <div className="mb-[8px]">
                              <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} maxLength={2000} rows={3}
                                className="w-full font-mono text-[10px] px-2 py-1.5 rounded outline-none resize-none"
                                style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
                              />
                              <div className="flex gap-2 mt-1">
                                <button onClick={cancelEdit} className="font-mono text-[9px] px-2 py-1 rounded cursor-pointer" style={{ border: "1px solid var(--border)", background: "transparent", color: "var(--text3)" }}>Cancel</button>
                                <button onClick={() => saveEdit(msg.id)} disabled={!editBody.trim() || savingEdit} className="font-mono text-[9px] px-2 py-1 rounded cursor-pointer text-white disabled:opacity-50" style={{ background: "var(--orange)", border: "none" }}>{savingEdit ? "…" : "Save"}</button>
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
                            <button onClick={() => onUpvote(msg.id, msg.courseId)} className={`${actionBtn} ${msg.userHasUpvoted ? "!text-[var(--orange)] font-bold" : ""}`}>
                              👍 {msg.userHasUpvoted ? msg.upvoteCount : `Like${msg.upvoteCount > 0 ? ` · ${msg.upvoteCount}` : ""}`}
                            </button>
                            <button onClick={() => toggleReplies(msg.id)} className={actionBtn}>
                              💬 Reply{msg.replyCount > 0 ? ` · ${msg.replyCount}` : ""}
                            </button>
                            {msg.author.id === user.id && (
                              <button onClick={() => startEdit(msg)} className={actionBtn}>✏️ Edit</button>
                            )}
                            <button onClick={() => onToggleAnswer(msg.id, msg.courseId)} className={actionBtn}>
                              {msg.isAnswered ? "↩️ Unmark" : "✓ Mark answered"}
                            </button>
                            <button onClick={() => onTogglePin(msg.id, msg.courseId)} className={actionBtn}>
                              {msg.isPinned ? "📌 Unpin" : "📌 Pin"}
                            </button>
                            <button onClick={() => setConfirmDelete({ msgId: msg.id, courseId: msg.courseId })} className={actionBtn}>🗑️ Delete</button>
                          </div>
                        </div>
                      </div>

                      {/* Replies */}
                      {repliesOpen && (
                        <div className="px-3 pb-3 flex flex-col gap-[8px]" style={{ background: "var(--panel)" }}>
                          {msg.replies.length === 0 && (
                            <div className="font-mono text-[9.5px] pt-1" style={{ color: "var(--text3)" }}>No replies yet.</div>
                          )}
                          {msg.replies.map((reply) => (
                            <div key={reply.id} className="flex gap-[8px] pt-1">
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold text-white shrink-0 mt-[2px]"
                                style={{ background: avatarColor(reply.author.id) }}
                              >{initials(reply.author.name)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-[6px] flex-wrap">
                                  <span className="text-[10.5px] font-bold" style={{ color: "var(--text)" }}>{reply.author.name}</span>
                                  {reply.author.role === "TRAINER" && (
                                    <span className="text-[7px] font-bold px-[5px] py-[1px] rounded-[3px]" style={{ background: "var(--orange-d)", color: "var(--orange)" }}>instructor</span>
                                  )}
                                  <span className="font-mono text-[8px]" style={{ color: "var(--text3)" }}>{timeAgo(reply.createdAt)}</span>
                                </div>
                                <div className="text-[10.5px] leading-[1.5] mt-[1px] whitespace-pre-wrap break-words" style={{ color: "var(--text2)" }}>{reply.body}</div>
                                <button onClick={() => onUpvote(msg.id, msg.courseId, reply.id)} className={`${actionBtn} mt-[2px] ${reply.userHasUpvoted ? "!text-[var(--orange)] font-bold" : ""}`}>
                                  👍 {reply.userHasUpvoted ? reply.upvoteCount : `Like${reply.upvoteCount > 0 ? ` · ${reply.upvoteCount}` : ""}`}
                                </button>
                                {reply.author.id === user.id && (
                                  <button onClick={() => setConfirmDeleteReply({ replyId: reply.id, courseId: msg.courseId })} className={`${actionBtn} mt-[2px]`}>🗑️</button>
                                )}
                              </div>
                            </div>
                          ))}

                          <div className="flex gap-[6px] items-center pt-1">
                            <input
                              value={replyDrafts[msg.id] ?? ""}
                              onChange={(e) => setReplyDrafts((d) => ({ ...d, [msg.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitReply(msg.id, msg.courseId); } }}
                              placeholder="Write a reply…"
                              maxLength={2000}
                              className="flex-1 font-mono text-[9.5px] px-2 py-1.5 rounded outline-none"
                              style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
                            />
                            <button
                              onClick={() => submitReply(msg.id, msg.courseId)}
                              disabled={!(replyDrafts[msg.id] ?? "").trim() || replying[msg.id]}
                              className="px-[8px] py-[5px] rounded-[4px] text-white text-[9px] font-bold border-none cursor-pointer disabled:opacity-50"
                              style={{ background: "var(--orange)" }}
                            >{replying[msg.id] ? "…" : "Reply"}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Composer */}
              <form onSubmit={(e) => { e.preventDefault(); submitComposer(); }} className="flex flex-col px-3 py-2.5 gap-2" style={{ borderTop: "1px solid var(--border)", background: "var(--panel)" }}>
                {attachment && (
                  <div className="flex items-center gap-2 text-[10px] font-mono px-2 py-1 rounded w-max" style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}>
                    📎 {attachment.name}
                    <button type="button" onClick={() => setAttachment(null)} className="cursor-pointer font-bold text-red-500 hover:text-red-600 bg-transparent border-none p-0 ml-1">✕</button>
                  </div>
                )}
                <div className="flex items-start gap-2 w-full">
                  <textarea value={composerBody} onChange={(e) => setComposerBody(e.target.value)} placeholder="Write a message…" maxLength={2000} rows={1}
                    className="flex-1 font-mono text-[9.5px] px-2 py-1.5 rounded outline-none resize-none"
                    style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", minHeight: 32 }}
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <label className="cursor-pointer text-[12px] px-1 hover:opacity-70 transition-opacity flex items-center justify-center" title="Attach an image">
                      📎
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setAttachment(e.target.files[0])} />
                    </label>
                    {(["DOUBT", "TIP", "ANNOUNCEMENT", "RESOURCE"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setComposerTag(t)}
                      className="font-mono text-[7.5px] font-bold px-1.5 py-0.5 rounded cursor-pointer"
                      style={composerTag === t
                        ? { background: TAG_STYLES[t]?.bg || "var(--panel)", color: TAG_STYLES[t]?.text || "var(--text3)", border: "1px solid currentColor" }
                        : { background: "transparent", color: "var(--text3)", border: "1px solid var(--border)" }}
                    >{TAG_ICONS[t]}</button>
                  ))}
                  <button type="submit" disabled={!composerBody.trim() || posting}
                    className="px-[8px] py-[5px] rounded-[4px] text-white text-[9px] font-bold border-none cursor-pointer disabled:opacity-50"
                    style={{ background: "var(--orange)" }}
                  >{posting ? "…" : "Post"}</button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Confirm modals */}
      {confirmDelete && (
        <ConfirmModal message="Delete this message permanently?" onConfirm={handleConfirmDelete} onCancel={() => setConfirmDelete(null)} />
      )}
      {confirmDeleteReply && (
        <ConfirmModal message="Delete this reply permanently?" onConfirm={handleConfirmDeleteReply} onCancel={() => setConfirmDeleteReply(null)} />
      )}
    </div>
  );
}
