"use client";

import { useState, useEffect } from "react";

interface ApiVideo {
  id: string; title: string; vdoCipherId: string; durationSeconds: number; order: number;
}
interface ApiQuiz {
  id: string; title: string; order: number; totalQuestions: number; passingScore?: number;
}
interface ApiSection {
  id: string; title: string; order: number; videos: ApiVideo[]; quizzes: ApiQuiz[];
}

interface MergedLesson {
  id: string;
  kind: "video" | "quiz";
  title: string;
  order: number;
  typeLabel: string;
  durationLabel: string;
  durationSeconds: number;
  totalQuestions: number;
}

interface MergedSection {
  id: string;
  num: string;
  title: string;
  order: number;
  lessons: MergedLesson[];
}

interface CurriculumBuilderProps {
  open: boolean;
  courseId: string;
  courseName: string;
  courseCode: string;
  token: string;
  onSave: () => void;
  onClose: () => void;
}

const LESSON_TYPE_OPTIONS = ["Video", "Video + Lab", "Video + Docs", "Quiz", "Quiz + Project", "Project", "Live Session"];

function formatDuration(item: ApiVideo | ApiQuiz): string {
  if ("durationSeconds" in item) {
    const m = Math.round(item.durationSeconds / 60);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : m > 0 ? `${m}m` : "—";
  }
  return `${item.totalQuestions} questions`;
}

function mergeLessons(sections: ApiSection[]): MergedSection[] {
  return sections.map((s) => {
    const merged: MergedLesson[] = [
      ...s.videos.map((v) => ({
        id: v.id, kind: "video" as const, title: v.title, order: v.order,
        typeLabel: v.vdoCipherId?.startsWith("type:") ? v.vdoCipherId.slice(5) : "Video",
        durationLabel: formatDuration(v), durationSeconds: v.durationSeconds, totalQuestions: 0,
      })),
      ...s.quizzes.map((q) => ({
        id: q.id, kind: "quiz" as const, title: q.title, order: q.order,
        typeLabel: q.passingScore ? "Quiz + Project" : "Quiz",
        durationLabel: formatDuration(q), durationSeconds: 0, totalQuestions: q.totalQuestions,
      })),
    ].sort((a, b) => a.order - b.order);

    return {
      id: s.id,
      num: String(s.order + 1).padStart(2, "0"),
      title: s.title,
      order: s.order,
      lessons: merged,
    };
  }).sort((a, b) => a.order - b.order);
}

async function apiCall(token: string, endpoint: string, options?: RequestInit) {
  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || res.statusText || `Request failed (${res.status})`);
  }
  return res.json();
}

function parseDurationToSeconds(d: string): number {
  const m = parseInt(d);
  if (isNaN(m)) return 0;
  if (d.includes("h")) {
    const p = d.match(/(\d+)h\s*(\d+)?m?/);
    if (p) return (parseInt(p[1]) * 60 + (parseInt(p[2]) || 0)) * 60;
    return parseInt(p![1]) * 3600;
  }
  return m * 60;
}

function getTotalMinutes(lessons: MergedLesson[]): number {
  return lessons.reduce((sum, l) => l.kind === "video" ? sum + l.durationSeconds : sum, 0) / 60;
}

export function CurriculumBuilder({
  open, courseId, courseName, courseCode, token, onSave, onClose,
}: CurriculumBuilderProps) {
  const [sections, setSections] = useState<ApiSection[]>([]);
  const [displaySections, setDisplaySections] = useState<MergedSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !courseId || !token) return;
    setLoading(true);
    setFetchError(null);
    apiCall(token, `/courses/${courseId}`)
      .then((data) => {
        if (!data || typeof data !== "object") { setFetchError("Invalid response from server"); return; }
        const secs: ApiSection[] = (data.sections || []).map((s: any) => ({
          id: s.id, title: s.title || "", order: s.order ?? 0,
          videos: (s.videos || []).map((v: any) => ({
            id: v.id, title: v.title || "", vdoCipherId: v.vdoCipherId || "",
            durationSeconds: v.durationSeconds ?? 0, order: v.order ?? 0,
          })),
          quizzes: (s.quizzes || []).map((q: any) => ({
            id: q.id, title: q.title || "", order: q.order ?? 0,
            totalQuestions: q.totalQuestions ?? 0, passingScore: q.passingScore,
          })),
        }));
        setSections(secs);
        setDisplaySections(mergeLessons(secs));
      })
      .catch((e) => { console.warn("[curriculum] fetch failed:", e); setFetchError(e.message || "Failed to load curriculum"); })
      .finally(() => setLoading(false));
  }, [open, courseId, token]);

  function refreshSections() {
    if (!token) return;
    setFetchError(null);
    apiCall(token, `/courses/${courseId}`)
      .then((data) => {
        if (!data || typeof data !== "object") return;
        const secs: ApiSection[] = (data.sections || []).map((s: any) => ({
          id: s.id, title: s.title || "", order: s.order ?? 0,
          videos: (s.videos || []).map((v: any) => ({
            id: v.id, title: v.title || "", vdoCipherId: v.vdoCipherId || "",
            durationSeconds: v.durationSeconds ?? 0, order: v.order ?? 0,
          })),
          quizzes: (s.quizzes || []).map((q: any) => ({
            id: q.id, title: q.title || "", order: q.order ?? 0,
            totalQuestions: q.totalQuestions ?? 0, passingScore: q.passingScore,
          })),
        }));
        setSections(secs);
        setDisplaySections(mergeLessons(secs));
      })
      .catch(() => {});
  }

  async function addSection() {
    if (!token || !courseId) return;
    setActing(true);
    try {
      const maxOrder = sections.reduce((m, s) => Math.max(m, s.order), -1);
      await apiCall(token, `/courses/${courseId}/sections`, {
        method: "POST", body: JSON.stringify({ title: "New Section", order: maxOrder + 1 }),
      });
      refreshSections();
    } catch {}
    setActing(false);
  }

  async function removeSection(sectionId: string) {
    if (!token) return;
    setActing(true);
    try {
      await apiCall(token, `/courses/sections/${sectionId}`, { method: "DELETE" });
      refreshSections();
    } catch {}
    setActing(false);
  }

  function saveSectionTitle(sectionId: string, title: string) {
    if (!token) return;
    setDisplaySections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, title } : s)));
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, title } : s)));
    apiCall(token, `/courses/sections/${sectionId}`, { method: "PATCH", body: JSON.stringify({ title }) })
      .catch((e) => console.warn("[curriculum] save section title failed:", e));
  }

  async function addLesson(sectionId: string, kind: "video" | "quiz") {
    if (!token) return;
    setActing(true);
    try {
      const section = sections.find((s) => s.id === sectionId);
      const maxOrder = Math.max(-1, ...(section?.videos || []).map((v) => v.order), ...(section?.quizzes || []).map((q) => q.order));
      if (kind === "video") {
        await apiCall(token, `/courses/sections/${sectionId}/videos`, {
          method: "POST", body: JSON.stringify({ title: "New Video", vdoCipherId: "type:Video", durationSeconds: 600, order: maxOrder + 1 }),
        });
      } else {
        await apiCall(token, `/courses/sections/${sectionId}/quizzes`, {
          method: "POST", body: JSON.stringify({ title: "New Quiz", order: maxOrder + 1, totalQuestions: 5 }),
        });
      }
      refreshSections();
    } catch {}
    setActing(false);
  }

  async function removeLesson(sectionId: string, lesson: MergedLesson) {
    if (!token) return;
    setActing(true);
    try {
      await apiCall(token, lesson.kind === "video" ? `/courses/videos/${lesson.id}` : `/courses/quizzes/${lesson.id}`, { method: "DELETE" });
      refreshSections();
    } catch (e) { console.warn("[curriculum] action failed:", e); }
    setActing(false);
  }

  function saveLessonTitle(sectionId: string, lessonId: string, title: string) {
    if (!token) return;
    setDisplaySections((prev) => prev.map((s) => s.id === sectionId ? { ...s, lessons: s.lessons.map((l) => l.id === lessonId ? { ...l, title } : l) } : s));
  }

  function saveLessonTitleToBackend(lessonId: string, title: string, kind: "video" | "quiz") {
    if (!token) return;
    const ep = kind === "video" ? `/courses/videos/${lessonId}` : `/courses/quizzes/${lessonId}`;
    apiCall(token, ep, { method: "PATCH", body: JSON.stringify({ title }) })
      .catch((e) => console.warn("[curriculum] save title failed:", e));
  }

  function saveLessonType(sectionId: string, lesson: MergedLesson, typeLabel: string) {
    if (!token) return;
    const isQuizType = typeLabel === "Quiz" || typeLabel === "Quiz + Project";
    if (lesson.kind === "video" && isQuizType) return;
    if (lesson.kind === "quiz" && !isQuizType) return;

    setDisplaySections((prev) => prev.map((s) => s.id === sectionId ? { ...s, lessons: s.lessons.map((l) => l.id === lesson.id ? { ...l, typeLabel } : l) } : s));

    if (lesson.kind === "video") {
      apiCall(token, `/courses/videos/${lesson.id}`, { method: "PATCH", body: JSON.stringify({ vdoCipherId: `type:${typeLabel}` }) })
        .catch((e) => console.warn("[curriculum] save type failed:", e));
    } else {
      apiCall(token, `/courses/quizzes/${lesson.id}`, { method: "PATCH", body: JSON.stringify({ passingScore: typeLabel === "Quiz + Project" ? 70 : null }) })
        .catch((e) => console.warn("[curriculum] save type failed:", e));
    }
  }

  function saveLessonDuration(sectionId: string, lesson: MergedLesson, durationLabel: string) {
    if (!token || lesson.kind !== "video") return;
    const seconds = parseDurationToSeconds(durationLabel);
    setDisplaySections((prev) => prev.map((s) => s.id === sectionId ? { ...s, lessons: s.lessons.map((l) => l.id === lesson.id ? { ...l, durationLabel, durationSeconds: seconds } : l) } : s));
    apiCall(token, `/courses/videos/${lesson.id}`, { method: "PATCH", body: JSON.stringify({ durationSeconds: seconds }) })
      .catch((e) => console.warn("[curriculum] save duration failed:", e));
  }

  function saveLessonQuestions(sectionId: string, lesson: MergedLesson, qty: number) {
    if (!token || lesson.kind !== "quiz") return;
    setDisplaySections((prev) => prev.map((s) => s.id === sectionId ? { ...s, lessons: s.lessons.map((l) => l.id === lesson.id ? { ...l, totalQuestions: qty, durationLabel: `${qty} questions` } : l) } : s));
    apiCall(token, `/courses/quizzes/${lesson.id}`, { method: "PATCH", body: JSON.stringify({ totalQuestions: qty }) })
      .catch((e) => console.warn("[curriculum] save questions failed:", e));
  }

  const totalLessons = displaySections.reduce((sum, s) => sum + s.lessons.length, 0);

  if (!open) return null;
  if (!token) {
    return (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-6"
        style={{ background: "var(--overlay)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="flex flex-col rounded-lg max-w-full max-h-[88vh] p-8 items-center gap-3"
          style={{
            width: 440,
            maxWidth: "96vw",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 20px 60px rgba(0,0,0,.3)",
          }}
        >
          <div className="text-3xl">🔒</div>
          <div className="font-mono text-[12px] font-bold" style={{ color: "var(--text)" }}>Session Required</div>
          <div className="font-mono text-[11px] text-center" style={{ color: "var(--text3)" }}>
            Please log in to manage curriculum.
          </div>
          <button onClick={onClose}
            className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer"
            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
          >Close</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ background: "var(--overlay)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex flex-col rounded-lg max-w-full max-h-[88vh]"
        style={{
          width: 880,
          maxWidth: "96vw",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 20px 60px rgba(0,0,0,.3)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 text-[13.5px] font-extrabold" style={{ color: "var(--text)" }}>
            <span
              className="w-[26px] h-[26px] rounded flex items-center justify-center text-[13px]"
              style={{ background: "var(--orange-d)", color: "var(--orange)" }}
            >📚</span>
            Manage Curriculum{courseName ? <span style={{ fontWeight: 400, color: "var(--text3)" }}> — {courseName}</span> : ""}
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-6 h-6 rounded text-[14px] cursor-pointer"
            style={{ color: "var(--text3)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--panel)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent";                             (e.currentTarget as HTMLElement).style.color = "var(--text3)" }}
          >✕</button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-8 font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading curriculum...</div>
          ) : fetchError ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <div className="font-mono text-[11px]" style={{ color: "var(--red)" }}>✕ {fetchError}</div>
              <button onClick={() => { if (!token) { setFetchError("Session expired — please re-login"); return; } setLoading(true); setFetchError(null); apiCall(token, `/courses/${courseId}`).then((data) => { if (!data || typeof data !== "object") { setFetchError("Invalid response"); return; } const secs = (data.sections || []).map((s: any) => ({ id: s.id, title: s.title || "", order: s.order ?? 0, videos: (s.videos || []).map((v: any) => ({ id: v.id, title: v.title || "", vdoCipherId: v.vdoCipherId || "", durationSeconds: v.durationSeconds ?? 0, order: v.order ?? 0 })), quizzes: (s.quizzes || []).map((q: any) => ({ id: q.id, title: q.title || "", order: q.order ?? 0, totalQuestions: q.totalQuestions ?? 0, passingScore: q.passingScore })) })); setSections(secs); setDisplaySections(mergeLessons(secs)); }).catch((e) => setFetchError(e.message || "Failed to load")).finally(() => setLoading(false)); }}
                className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded cursor-pointer"
                style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
              >↻ Retry</button>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-3 gap-2">
                <div style={{ fontSize: 11.5, color: "var(--text2)" }}>
                  <strong style={{ color: "var(--text)" }}>{courseCode}</strong>
                  <span className="ml-2 font-mono text-[10px]" style={{ color: "var(--text3)" }}>{courseName}</span>
                </div>
                <div className="flex gap-3.5 font-mono text-[10px]" style={{ color: "var(--text3)" }}>
                  <span>{displaySections.length} sections</span>
                  <span>·</span>
                  <span>{totalLessons} lessons</span>
                </div>
              </div>

              {/* Sections */}
              {displaySections.map((section, si) => {
                const totalMin = getTotalMinutes(section.lessons);
                return (
                  <div key={section.id} className="rounded mb-2.5 overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                    {/* Section head */}
                    <div className="flex items-center gap-2 px-3 py-2" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
                      <span className="font-mono text-[9px] font-bold shrink-0" style={{ color: "var(--orange)", width: 22 }}>{section.num}</span>
                      <input
                        value={section.title}
                        onChange={(e) => saveSectionTitle(section.id, e.target.value)}
                        className="flex-1 text-[12px] font-bold rounded px-1.5 py-0.5 outline-none"
                        style={{ color: "var(--text)", background: "transparent", border: "1px solid transparent" }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                      />
                      <span className="font-mono text-[9px]" style={{ color: "var(--text3)", whiteSpace: "nowrap" }}>
                        {section.lessons.length} lesson{section.lessons.length !== 1 ? "s" : ""}
                        {totalMin > 0 ? ` · ${Math.floor(totalMin / 60)}h ${Math.round(totalMin % 60)}m` : ""}
                      </span>
                      <div className="flex gap-1 shrink-0">
                        <button disabled={acting} onClick={() => removeSection(section.id)}
                          className="flex items-center justify-center w-[20px] h-[20px] rounded text-[10px] cursor-pointer disabled:opacity-40"
                          style={{ color: "var(--text3)" }} title="Remove Section"
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--red)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text3)"; }}>🗑</button>
                      </div>
                    </div>

                    {/* Lessons */}
                    <div className="px-3 py-1.5">
                      {section.lessons.length === 0 ? (
                        <div className="text-center py-3 font-mono text-[10px]" style={{ color: "var(--text3)" }}>No lessons yet</div>
                      ) : (
                        section.lessons.map((lesson, li) => (
                          <div key={lesson.id} className="grid gap-2 items-center py-1" style={{ gridTemplateColumns: "24px 1.6fr 1fr 70px 28px" }}>
                            <span className="font-mono text-[9px] text-center" style={{ color: "var(--text3)" }}>{li + 1}</span>
                            <input
                              value={lesson.title}
                              onChange={(e) => saveLessonTitle(section.id, lesson.id, e.target.value)}
                              className="text-[11px] px-1.5 py-1 rounded outline-none"
                              style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
                              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--orange)"; e.currentTarget.style.background = "var(--surface)"; }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg)"; saveLessonTitleToBackend(lesson.id, e.currentTarget.value, lesson.kind); }}
                              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                              placeholder="Lesson name"
                            />
                            <select
                              value={lesson.typeLabel}
                              onChange={(e) => saveLessonType(section.id, lesson, e.target.value)}
                              className="text-[11px] px-1.5 py-1 rounded outline-none"
                              style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
                              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--orange)"; e.currentTarget.style.background = "var(--surface)"; }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg)"; }}
                            >
                              {LESSON_TYPE_OPTIONS.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                            </select>
                            {lesson.kind === "video" ? (
                              <input defaultValue={lesson.durationLabel}
                                className="text-[11px] px-1.5 py-1 rounded outline-none text-center"
                                style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--orange)"; e.currentTarget.style.background = "var(--surface)"; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg)"; if (e.currentTarget.value !== lesson.durationLabel) saveLessonDuration(section.id, lesson, e.currentTarget.value); }}
                                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} placeholder="25m"
                              />
                            ) : (
                              <input defaultValue={lesson.totalQuestions || 5} type="number" min="1"
                                className="text-[11px] px-1.5 py-1 rounded outline-none text-center"
                                style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--orange)"; e.currentTarget.style.background = "var(--surface)"; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg)"; const val = parseInt(e.currentTarget.value); if (!isNaN(val) && val !== lesson.totalQuestions) saveLessonQuestions(section.id, lesson, val); }}
                                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                              />
                            )}
                            <button disabled={acting} onClick={() => removeLesson(section.id, lesson)}
                              className="flex items-center justify-center text-[10px] cursor-pointer disabled:opacity-40"
                              style={{ color: "var(--text3)" }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--red)"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text3)"; }}
                              title="Remove Lesson">🗑</button>
                          </div>
                        ))
                      )}
                      <div className="flex gap-2 mt-1.5">
                        <button disabled={acting} onClick={() => addLesson(section.id, "video")}
                          className="font-mono text-[10px] font-semibold inline-flex items-center gap-1 py-1 cursor-pointer disabled:opacity-40"
                          style={{ color: "var(--green)" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "none"; }}>+ Add Video</button>
                        <button disabled={acting} onClick={() => addLesson(section.id, "quiz")}
                          className="font-mono text-[10px] font-semibold inline-flex items-center gap-1 py-1 cursor-pointer disabled:opacity-40"
                          style={{ color: "var(--blue)" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "none"; }}>+ Add Quiz</button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add Section */}
              <button disabled={acting} onClick={addSection}
                className="w-full py-2.5 rounded font-mono text-[11px] font-semibold text-center cursor-pointer disabled:opacity-40"
                style={{ border: "1.5px dashed var(--border2)", color: "var(--text3)", background: "var(--panel)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--orange)"; (e.currentTarget as HTMLElement).style.color = "var(--orange)"; (e.currentTarget as HTMLElement).style.background = "var(--orange-d)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; (e.currentTarget as HTMLElement).style.color = "var(--text3)"; (e.currentTarget as HTMLElement).style.background = "var(--panel)"; }}
              >+ Add Section / Module</button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 shrink-0" style={{ borderTop: "1px solid var(--border)", background: "var(--panel)" }}>
          <button onClick={onClose}
            className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer"
            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
          >Close</button>
          <button disabled={loading} onClick={onSave}
            className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer disabled:opacity-40"
            style={{ background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >💾 Save Curriculum</button>
        </div>
      </div>
    </div>
  );
}
