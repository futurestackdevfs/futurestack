"use client";

import { useCallback, useEffect, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
// Same discussion board the trainers use — a course list on the left, the
// thread on the right. Content managers get it across *all* courses.
import DoubtsView, { type DiscussionMessage } from "../../trainer/console/DoubtsView";

/** Latest messages loaded per course (the API caps a page at 100). */
const PER_COURSE = 50;

export default function DiscussionsView({ searchQuery, refreshSignal, onToast, user }: {
  searchQuery: string;
  refreshSignal?: number;
  onToast: (msg: string, type?: "success" | "danger") => void;
  user: { id: string; name: string };
}) {
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cr = await opsFetch("/api/courses");
      if (!cr.ok) throw new Error("Couldn't load courses");
      const list = (await cr.json()) as { id: string; title: string }[];
      const courses = Array.isArray(list) ? list : [];

      let failed = 0;
      const perCourse = await Promise.all(
        courses.map(async (c) => {
          try {
            const r = await opsFetch(`/api/discussion/${c.id}?page=1&limit=${PER_COURSE}`);
            if (!r.ok) { failed += 1; return [] as DiscussionMessage[]; }
            const rows = (await r.json()) as DiscussionMessage[];
            return (Array.isArray(rows) ? rows : []).map((m) => ({ ...m, courseId: c.id, courseTitle: c.title }));
          } catch {
            failed += 1;
            return [] as DiscussionMessage[];
          }
        }),
      );
      if (failed > 0) onToast(`Couldn't load discussions for ${failed} course${failed === 1 ? "" : "s"}`, "danger");
      setMessages(perCourse.flat());
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Couldn't load discussions", "danger");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => { load(); }, [load, refreshSignal]);

  /* ── actions (same API calls the trainer console makes) ── */

  async function apiAction<T = unknown>(url: string, init?: RequestInit): Promise<T | null> {
    try {
      const r = await opsFetch(url, init);
      if (!r.ok) {
        const e = await r.json().catch(() => ({ message: `${r.status}` }));
        onToast(e.message ?? "Request failed", "danger");
        return null;
      }
      return (await r.json()) as T;
    } catch {
      onToast("Network error", "danger");
      return null;
    }
  }

  async function handleToggleAnswer(msgId: string, courseId: string) {
    const res = await apiAction<{ isAnswered: boolean }>(`/api/discussion/${courseId}/messages/${msgId}/answer`, { method: "PATCH" });
    if (res) {
      setMessages((prev) => prev.map((d) => (d.id === msgId ? { ...d, isAnswered: res.isAnswered } : d)));
      onToast(res.isAnswered ? "Marked as answered" : "Unmarked");
    }
  }

  async function handleTogglePin(msgId: string, courseId: string) {
    const res = await apiAction<{ isPinned: boolean }>(`/api/discussion/${courseId}/messages/${msgId}/pin`, { method: "PATCH" });
    if (res) {
      setMessages((prev) => prev.map((d) => (d.id === msgId ? { ...d, isPinned: res.isPinned } : d)));
      onToast(res.isPinned ? "Pinned" : "Unpinned");
    }
  }

  async function handleReply(msgId: string, courseId: string, body: string) {
    const res = await apiAction(`/api/discussion/${courseId}/messages/${msgId}/replies`, { method: "POST", body: JSON.stringify({ body }) });
    if (res) onToast("Reply posted");
    return res;
  }

  async function handleDelete(msgId: string, courseId: string) {
    const res = await apiAction(`/api/discussion/${courseId}/messages/${msgId}`, { method: "DELETE" });
    if (res) {
      setMessages((prev) => prev.filter((d) => d.id !== msgId));
      onToast("Deleted");
    }
  }

  async function handleUpvote(msgId: string, courseId: string, replyId?: string) {
    const url = replyId
      ? `/api/discussion/${courseId}/replies/${replyId}/upvote`
      : `/api/discussion/${courseId}/messages/${msgId}/upvote`;
    const res = await apiAction<{ upvoted: boolean; upvoteCount: number }>(url, { method: "POST" });
    if (!res) return;
    setMessages((prev) =>
      prev.map((d) => {
        if (d.id !== msgId) return d;
        if (!replyId) return { ...d, userHasUpvoted: res.upvoted, upvoteCount: res.upvoteCount };
        return {
          ...d,
          replies: d.replies.map((r) => (r.id === replyId ? { ...r, userHasUpvoted: res.upvoted, upvoteCount: res.upvoteCount } : r)),
        };
      }),
    );
  }

  async function handleCreate(courseId: string, body: string, tag: string, attachmentUrl?: string | null) {
    const res = await apiAction<DiscussionMessage>(`/api/discussion/${courseId}`, { method: "POST", body: JSON.stringify({ body, tag, attachmentUrl }) });
    if (res) {
      const title = messages.find((m) => m.courseId === courseId)?.courseTitle;
      setMessages((prev) => [{ ...res, courseId, courseTitle: title, replies: [] }, ...prev]);
      onToast("Message posted");
    }
    return res;
  }

  async function handleUpdate(msgId: string, courseId: string, body: string) {
    const res = await apiAction(`/api/discussion/${courseId}/messages/${msgId}`, { method: "PATCH", body: JSON.stringify({ body }) });
    if (res) {
      setMessages((prev) => prev.map((d) => (d.id === msgId ? { ...d, body } : d)));
      onToast("Message updated");
    }
    return res;
  }

  async function handleDeleteReply(replyId: string, courseId: string) {
    const res = await apiAction(`/api/discussion/${courseId}/replies/${replyId}`, { method: "DELETE" });
    if (res) {
      setMessages((prev) => prev.map((d) => ({ ...d, replies: d.replies.filter((r) => r.id !== replyId) })));
      onToast("Reply deleted");
    }
    return res;
  }

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 font-mono text-[11px]" style={{ color: "var(--text3)" }}>
        Loading discussions…
      </div>
    );
  }

  return (
    <DoubtsView
      messages={messages}
      searchQuery={searchQuery}
      user={user}
      onToggleAnswer={handleToggleAnswer}
      onTogglePin={handleTogglePin}
      onReply={handleReply}
      onDelete={handleDelete}
      onUpvote={handleUpvote}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDeleteReply={handleDeleteReply}
    />
  );
}
