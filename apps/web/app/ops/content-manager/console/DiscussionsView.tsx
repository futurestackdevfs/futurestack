"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { Panel, Th, Td, ViewHeader, ActionBtn } from "../../sales/sections/ui";

interface DiscussionMessage {
  id: string;
  body: string;
  tag: string;
  isPinned: boolean;
  isAnswered: boolean;
  createdAt: string;
  author: { id: string; name: string; role: string };
  course: { id: string; title: string };
  _count?: { replies: number };
}

export default function DiscussionsView({ searchQuery, refreshSignal, onToast }: {
  searchQuery: string;
  refreshSignal?: number;
  onToast: (msg: string, type?: "success" | "danger") => void;
}) {
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState<string>("");
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const loadCourses = useCallback(async () => {
    try {
      const r = await opsFetch("/api/courses");
      if (r.ok) {
        const data = await r.json();
        setCourses(Array.isArray(data) ? data.map((c: any) => ({ id: c.id, title: c.title })) : []);
      }
    } catch { /* ignore */ }
  }, []);

  const loadDiscussions = useCallback(async () => {
    setLoading(true);
    try {
      const endpoints = courseFilter
        ? [`/api/discussions/course/${courseFilter}`]
        : courses.map((c) => `/api/discussions/course/${c.id}`);

      if (endpoints.length === 0) { setLoading(false); return; }

      const results = await Promise.all(
        endpoints.map((url) => opsFetch(url).then((r) => r.ok ? r.json() : []))
      );
      const all = results.flat();
      setMessages(all.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [courseFilter, courses]);

  useEffect(() => { loadCourses(); }, [loadCourses]);
  useEffect(() => { if (courses.length > 0 || courseFilter) loadDiscussions(); }, [courses, courseFilter, loadDiscussions, refreshSignal]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return messages.filter((m) => !q || [m.body, m.author.name, m.course.title].some((v) => v.toLowerCase().includes(q)));
  }, [messages, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  async function handleTogglePin(msg: DiscussionMessage) {
    const r = await opsFetch(`/api/discussions/${msg.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isPinned: !msg.isPinned }),
    });
    if (r.ok) {
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, isPinned: !m.isPinned } : m));
      onToast(msg.isPinned ? "Unpinned" : "Pinned", "success");
    }
  }

  async function handleToggleAnswered(msg: DiscussionMessage) {
    const r = await opsFetch(`/api/discussions/${msg.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isAnswered: !msg.isAnswered }),
    });
    if (r.ok) {
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, isAnswered: !m.isAnswered } : m));
      onToast(msg.isAnswered ? "Marked unanswered" : "Marked answered", "success");
    }
  }

  async function handleDelete(msg: DiscussionMessage) {
    if (!confirm("Delete this discussion?")) return;
    const r = await opsFetch(`/api/discussions/${msg.id}`, { method: "DELETE" });
    if (r.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      onToast("Discussion deleted", "success");
    }
  }

  function tagBadge(tag: string) {
    switch (tag) {
      case "DOUBT": return { fg: "var(--amber)", bg: "var(--amber-d)" };
      case "TIP": return { fg: "var(--green)", bg: "var(--green-d)" };
      case "ANNOUNCEMENT": return { fg: "var(--red)", bg: "var(--red-d)" };
      case "RESOURCE": return { fg: "var(--blue)", bg: "var(--blue-d)" };
      default: return { fg: "var(--text3)", bg: "var(--panel)" };
    }
  }

  return (
    <div className="p-4 pb-7">
      <ViewHeader
        icon="💬"
        title="Discussions"
        meta={`${filtered.length} MESSAGES`}
      />

      {/* Course Filter */}
      <div className="flex items-center gap-1.5 mb-3">
        <button onClick={() => setCourseFilter("")}
          className="font-mono text-[8.5px] font-bold px-2 py-1 rounded cursor-pointer"
          style={{
            background: !courseFilter ? "var(--amber)" : "var(--panel)",
            color: !courseFilter ? "#fff" : "var(--text2)",
            border: `1px solid ${!courseFilter ? "var(--amber)" : "var(--border)"}`,
          }}>ALL COURSES</button>
        {courses.slice(0, 5).map((c) => (
          <button key={c.id} onClick={() => setCourseFilter(c.id)}
            className="font-mono text-[8.5px] font-bold px-2 py-1 rounded cursor-pointer truncate max-w-[120px]"
            style={{
              background: courseFilter === c.id ? "var(--amber)" : "var(--panel)",
              color: courseFilter === c.id ? "#fff" : "var(--text2)",
              border: `1px solid ${courseFilter === c.id ? "var(--amber)" : "var(--border)"}`,
            }}>{c.title}</button>
        ))}
      </div>

      <Panel title="Discussion Messages" count={`${filtered.length} MESSAGES`}>
        {loading ? (
          <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>No discussions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Author</Th>
                  <Th>Course</Th>
                  <Th>Tag</Th>
                  <Th>Message</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((m) => {
                  const tag = tagBadge(m.tag);
                  return (
                    <tr key={m.id}>
                      <Td>
                        <span className="font-semibold" style={{ color: "var(--text)" }}>{m.author.name}</span>
                        <div className="font-mono text-[8px] px-1 py-0.5 rounded inline-block" style={{ background: "var(--panel)", color: "var(--text3)" }}>{m.author.role}</div>
                      </Td>
                      <Td><span className="font-mono text-[9.5px]" style={{ color: "var(--blue)" }}>{m.course.title}</span></Td>
                      <Td>
                        <span className="font-mono text-[8.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: tag.bg, color: tag.fg }}>{m.tag}</span>
                      </Td>
                      <Td>
                        <div className="text-[10.5px] max-w-[300px] truncate" style={{ color: "var(--text2)" }}>{m.body}</div>
                        <div className="font-mono text-[8px]" style={{ color: "var(--text3)" }}>{m._count?.replies ?? 0} replies</div>
                      </Td>
                      <Td>
                        <div className="flex gap-1">
                          {m.isPinned && <span className="font-mono text-[8px] px-1 py-0.5 rounded" style={{ background: "var(--red-d)", color: "var(--red)" }}>📌 PINNED</span>}
                          {m.isAnswered && <span className="font-mono text-[8px] px-1 py-0.5 rounded" style={{ background: "var(--green-d)", color: "var(--green)" }}>✓ ANSWERED</span>}
                        </div>
                      </Td>
                      <Td>
                        <div className="flex gap-1">
                          <ActionBtn color="var(--amber)" onClick={() => handleTogglePin(m)}>{m.isPinned ? "UNPIN" : "PIN"}</ActionBtn>
                          <ActionBtn color="var(--green)" onClick={() => handleToggleAnswered(m)}>{m.isAnswered ? "UNANSWER" : "ANSWER"}</ActionBtn>
                          <ActionBtn color="var(--red)" onClick={() => handleDelete(m)}>✕</ActionBtn>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {!loading && filtered.length > PER_PAGE && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <button onClick={() => setPage(safePage - 1)} disabled={safePage <= 1}
            className="font-mono text-[9px] font-bold px-2.5 py-1 rounded cursor-pointer disabled:opacity-40"
            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}>← PREV</button>
          <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{safePage} / {totalPages}</span>
          <button onClick={() => setPage(safePage + 1)} disabled={safePage >= totalPages}
            className="font-mono text-[9px] font-bold px-2.5 py-1 rounded cursor-pointer disabled:opacity-40"
            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}>NEXT →</button>
        </div>
      )}
    </div>
  );
}
