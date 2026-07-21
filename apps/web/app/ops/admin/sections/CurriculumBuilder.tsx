"use client";

import { useState, useEffect, useRef } from "react"
import { VideoUploadDialog } from "./VideoUploadDialog"
import { ConfirmDialog, type ConfirmOptions } from "./ConfirmDialog"

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
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedLessonTitle, setSelectedLessonTitle] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const isDirty = useRef(false);
  const originalSections = useRef<ApiSection[]>([]);
  const tempIdCounter = useRef(0);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

  function nextTempId() { return `new_${--tempIdCounter.current}`; }

  function askConfirm(opts: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => setConfirmState({ ...opts, resolve }));
  }

  function resolveConfirm(ok: boolean) {
    confirmState?.resolve(ok);
    setConfirmState(null);
  }

  async function handleClose() {
    if (isDirty.current) {
      const ok = await askConfirm({
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Discard them and close?',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep Editing',
        danger: false,
      });
      if (!ok) return;
    }
    onClose();
  }

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
        originalSections.current = JSON.parse(JSON.stringify(secs));
        tempIdCounter.current = 0;
        isDirty.current = false;
      })
      .catch((e) => { console.warn("[curriculum] fetch failed:", e); setFetchError(e.message || "Failed to load curriculum"); })
      .finally(() => setLoading(false));
  }, [open, courseId, token]);

  function refreshSections() {
    if (!token) return Promise.resolve();
    setFetchError(null);
    return apiCall(token, `/courses/${courseId}`)
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
        originalSections.current = JSON.parse(JSON.stringify(secs));
      })
      .catch(() => {});
  }

  function addSection() {
    if (!token || !courseId) return;
    const tempId = nextTempId();
    setSections(prev => {
      const maxOrder = prev.reduce((m, s) => Math.max(m, s.order), -1);
      const newSection: ApiSection = { id: tempId, title: 'New Section', order: maxOrder + 1, videos: [], quizzes: [] };
      const updated = [...prev, newSection];
      setDisplaySections(mergeLessons(updated));
      return updated;
    });
    isDirty.current = true;
  }

  function removeSection(sectionId: string) {
    if (!token) return;
    askConfirm({
      title: 'Delete Section?',
      message: 'Delete this section and ALL its lessons?\nThis cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    }).then(ok => {
      if (!ok) return;
      isDirty.current = true;
      setSections(prev => {
        const updated = prev.filter(s => s.id !== sectionId);
        setDisplaySections(mergeLessons(updated));
        return updated;
      });
    });
  }

  function saveSectionTitle(sectionId: string, title: string) {
    if (!token) return;
    isDirty.current = true;
    setDisplaySections((prev) => prev.map((s) => s.id === sectionId ? { ...s, title } : s));
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, title } : s)));
  }

  function addLesson(sectionId: string, kind: "video" | "quiz") {
    if (!token) return;
    if (kind === "video") {
      const newVideo: ApiVideo = { id: nextTempId(), title: 'New Video', vdoCipherId: 'type:Video', durationSeconds: 600, order: 0 };
      setSections(prev => {
        const sec = prev.find(s => s.id === sectionId);
        if (!sec) return prev;
        const maxOrder = Math.max(-1, ...sec.videos.map(v => v.order), ...sec.quizzes.map(q => q.order));
        newVideo.order = maxOrder + 1;
        const updated = prev.map(s => s.id === sectionId ? { ...s, videos: [...s.videos, newVideo] } : s);
        setDisplaySections(mergeLessons(updated));
        return updated;
      });
    } else {
      const newQuiz: ApiQuiz = { id: nextTempId(), title: 'New Quiz', order: 0, totalQuestions: 5 };
      setSections(prev => {
        const sec = prev.find(s => s.id === sectionId);
        if (!sec) return prev;
        const maxOrder = Math.max(-1, ...sec.videos.map(v => v.order), ...sec.quizzes.map(q => q.order));
        newQuiz.order = maxOrder + 1;
        const updated = prev.map(s => s.id === sectionId ? { ...s, quizzes: [...s.quizzes, newQuiz] } : s);
        setDisplaySections(mergeLessons(updated));
        return updated;
      });
    }
    isDirty.current = true;
  }

  function removeLesson(sectionId: string, lesson: MergedLesson) {
    if (!token) return;
    const kindLabel = lesson.kind === "video" ? "Video" : "Quiz";
    const lessonId = lesson.id;
    const lessonKind = lesson.kind;
    askConfirm({
      title: `Delete ${kindLabel}?`,
      message: `Are you sure you want to remove this ${kindLabel.toLowerCase()}?\nThis cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    }).then(ok => {
      if (!ok) return;
      isDirty.current = true;
      setSections(prev => {
        const updated = prev.map(s => {
          if (s.id !== sectionId) return s;
          if (lessonKind === "video") return { ...s, videos: s.videos.filter(v => v.id !== lessonId) };
          return { ...s, quizzes: s.quizzes.filter(q => q.id !== lessonId) };
        });
        setDisplaySections(mergeLessons(updated));
        return updated;
      });
    });
  }

  function saveLessonTitle(sectionId: string, lessonId: string, title: string) {
    if (!token) return;
    isDirty.current = true;
    setDisplaySections((prev) => prev.map((s) => s.id === sectionId ? { ...s, lessons: s.lessons.map((l) => l.id === lessonId ? { ...l, title } : l) } : s));
    setSections(prev => prev.map(s => s.id !== sectionId ? s : {
      ...s,
      videos: s.videos.map(v => v.id === lessonId ? { ...v, title } : v),
      quizzes: s.quizzes.map(q => q.id === lessonId ? { ...q, title } : q),
    }));
  }

  function saveLessonType(sectionId: string, lesson: MergedLesson, typeLabel: string) {
    if (!token) return;
    isDirty.current = true;
    const isQuizType = typeLabel === "Quiz" || typeLabel === "Quiz + Project";
    if (lesson.kind === "video" && isQuizType) return;
    if (lesson.kind === "quiz" && !isQuizType) return;

    setDisplaySections((prev) => prev.map((s) => s.id === sectionId ? { ...s, lessons: s.lessons.map((l) => l.id === lesson.id ? { ...l, typeLabel } : l) } : s));

    if (lesson.kind === "video") {
      setSections(prev => prev.map(s => s.id !== sectionId ? s : {
        ...s,
        videos: s.videos.map(v => v.id === lesson.id ? { ...v, vdoCipherId: `type:${typeLabel}` } : v),
      }));
    } else {
      setSections(prev => prev.map(s => s.id !== sectionId ? s : {
        ...s,
        quizzes: s.quizzes.map(q => q.id === lesson.id ? { ...q, passingScore: typeLabel === 'Quiz + Project' ? 70 : undefined } : q),
      }));
    }
  }

  function saveLessonQuestions(sectionId: string, lesson: MergedLesson, qty: number) {
    if (!token || lesson.kind !== "quiz") return;
    isDirty.current = true;
    setDisplaySections((prev) => prev.map((s) => s.id === sectionId ? { ...s, lessons: s.lessons.map((l) => l.id === lesson.id ? { ...l, totalQuestions: qty, durationLabel: `${qty} questions` } : l) } : s));
    setSections(prev => prev.map(s => s.id !== sectionId ? s : {
      ...s,
      quizzes: s.quizzes.map(q => q.id === lesson.id ? { ...q, totalQuestions: qty } : q),
    }));
  }

  async function handleSave() {
    if (!token) return;

    // Check if any video is still a placeholder (not uploaded)
    const hasPlaceholder = sections.some(s =>
      s.videos.some(v => v.vdoCipherId?.startsWith('type:'))
    );
    if (hasPlaceholder) {
      await askConfirm({
        title: 'Videos Not Uploaded',
        message: 'Some videos are still placeholders — they have not been uploaded yet.\nPlease upload the video first.',
        confirmLabel: 'OK, Got It',
        cancelLabel: 'Go Back',
        danger: true,
      });
      return;
    }

    setActing(true);
    const orig = originalSections.current;
    const curr = sections;

    try {
      // 1. DELETE items removed from local state
      const deletedSections = orig.filter(o => !curr.some(c => c.id === o.id));
      for (const sec of deletedSections) {
        if (sec.id.startsWith('new_')) continue; // never saved to backend
        await apiCall(token, `/courses/sections/${sec.id}`, { method: 'DELETE' });
      }

      // 2. CREATE new sections + their lessons, UPDATE existing
      for (const section of curr) {
        const isNew = section.id.startsWith('new_');
        const origSec = orig.find(o => o.id === section.id);

        if (isNew) {
          // Create section
          const created = await apiCall(token, `/courses/${courseId}/sections`, {
            method: 'POST',
            body: JSON.stringify({ title: section.title, order: section.order }),
          });
          const realSectionId = created.id;

          // Create its videos
          for (const v of section.videos) {
            await apiCall(token, `/courses/sections/${realSectionId}/videos`, {
              method: 'POST',
              body: JSON.stringify({ title: v.title, vdoCipherId: v.vdoCipherId || '', durationSeconds: v.durationSeconds, order: v.order }),
            });
          }
          // Create its quizzes
          for (const q of section.quizzes) {
            await apiCall(token, `/courses/sections/${realSectionId}/quizzes`, {
              method: 'POST',
              body: JSON.stringify({ title: q.title, order: q.order, totalQuestions: q.totalQuestions }),
            });
          }
        } else if (origSec) {
          // Update section title if changed
          if (section.title !== origSec.title) {
            await apiCall(token, `/courses/sections/${section.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ title: section.title }),
            });
          }

          // Handle video changes
          const deletedVids = origSec.videos.filter(ov => !section.videos.some(cv => cv.id === ov.id));
          const newVids = section.videos.filter(cv => cv.id.startsWith('new_'));
          const updatedVids = section.videos.filter(cv => !cv.id.startsWith('new_') && origSec.videos.some(ov => ov.id === cv.id && (ov.title !== cv.title || ov.vdoCipherId !== cv.vdoCipherId)));

          for (const v of deletedVids) {
            await apiCall(token, `/courses/videos/${v.id}`, { method: 'DELETE' });
          }
          for (const v of newVids) {
            await apiCall(token, `/courses/sections/${section.id}/videos`, {
              method: 'POST',
              body: JSON.stringify({ title: v.title, vdoCipherId: v.vdoCipherId || '', durationSeconds: v.durationSeconds, order: v.order }),
            });
          }
          for (const v of updatedVids) {
            const body: any = {};
            if (v.title !== origSec.videos.find(ov => ov.id === v.id)?.title) body.title = v.title;
            if (v.vdoCipherId !== origSec.videos.find(ov => ov.id === v.id)?.vdoCipherId) body.vdoCipherId = v.vdoCipherId;
            if (Object.keys(body).length) {
              await apiCall(token, `/courses/videos/${v.id}`, { method: 'PATCH', body: JSON.stringify(body) });
            }
          }

          // Handle quiz changes
          const deletedQuizzes = origSec.quizzes.filter(oq => !section.quizzes.some(cq => cq.id === oq.id));
          const newQuizzes = section.quizzes.filter(cq => cq.id.startsWith('new_'));
          const updatedQuizzes = section.quizzes.filter(cq => !cq.id.startsWith('new_') && origSec.quizzes.some(oq => oq.id === cq.id && (oq.title !== cq.title || oq.totalQuestions !== cq.totalQuestions || oq.passingScore !== cq.passingScore)));
          for (const q of deletedQuizzes) {
            await apiCall(token, `/courses/quizzes/${q.id}`, { method: 'DELETE' });
          }
          for (const q of newQuizzes) {
            const body: any = { title: q.title, order: q.order, totalQuestions: q.totalQuestions };
            if (q.passingScore !== undefined) body.passingScore = q.passingScore;
            await apiCall(token, `/courses/sections/${section.id}/quizzes`, {
              method: 'POST',
              body: JSON.stringify(body),
            });
          }
          for (const q of updatedQuizzes) {
            const body: any = {};
            if (q.title !== origSec.quizzes.find(oq => oq.id === q.id)?.title) body.title = q.title;
            if (q.totalQuestions !== origSec.quizzes.find(oq => oq.id === q.id)?.totalQuestions) body.totalQuestions = q.totalQuestions;
            if (q.passingScore !== origSec.quizzes.find(oq => oq.id === q.id)?.passingScore) body.passingScore = q.passingScore ?? null;
            if (Object.keys(body).length) {
              await apiCall(token, `/courses/quizzes/${q.id}`, { method: 'PATCH', body: JSON.stringify(body) });
            }
          }
        }
      }

      // Refresh from backend to get real IDs
      await refreshSections();
      isDirty.current = false;
      onSave();
    } catch (e) {
      console.warn('[curriculum] save failed:', e);
      await askConfirm({
        title: 'Save Failed',
        message: 'Failed to save curriculum. Please try again.',
        confirmLabel: 'OK',
        cancelLabel: 'Go Back',
        danger: true,
      });
    }
    setActing(false);
  }

  const totalLessons = displaySections.reduce((sum, s) => sum + s.lessons.length, 0);

  if (!open) return null;
  if (!token) {
    return (        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-6"
          style={{ background: "var(--overlay)" }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
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
          <button onClick={handleClose}
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
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
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
            onClick={handleClose}
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
                          <div key={lesson.id} className="grid gap-2 items-center py-1" style={{ gridTemplateColumns: "24px 1.6fr 1fr auto 28px" }}>
                            <span className="font-mono text-[9px] text-center" style={{ color: "var(--text3)" }}>{li + 1}</span>
                            <input
                              value={lesson.title}
                              onChange={(e) => saveLessonTitle(section.id, lesson.id, e.target.value)}
                              className="text-[11px] px-1.5 py-1 rounded outline-none"
                              style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
                              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--orange)"; e.currentTarget.style.background = "var(--surface)"; }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg)"; }}
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
                              <button
                                onClick={async () => {
                                  // If section is unsaved (temp ID), create it first so upload gets a real UUID
                                  let targetSectionId = section.id;
                                  if (section.id.startsWith('new_') && token) {
                                    try {
                                      const created = await apiCall(token, `/courses/${courseId}/sections`, {
                                        method: 'POST',
                                        body: JSON.stringify({ title: section.title, order: section.order }),
                                      });
                                      const realId = created.id;
                                      // Replace temp ID with real ID in state
                                      setSections(prev => {
                                        const updated = prev.map(s => s.id === section.id ? { ...s, id: realId } : s);
                                        setDisplaySections(mergeLessons(updated));
                                        return updated;
                                      });
                                      // Mark as saved so handleSave won't POST it again
                                      originalSections.current = [...originalSections.current, { ...section, id: realId }];
                                      targetSectionId = realId;
                                    } catch (e) {
                                      console.warn('[upload] failed to create section first:', e);
                                      return;
                                    }
                                  }
                                  setSelectedSectionId(targetSectionId);
                                  setSelectedLessonTitle(lesson.title);
                                  setSelectedLessonId(lesson.id);
                                  setUploadDialogOpen(true);
                                }}
                                className="font-mono text-[9px] font-semibold px-2.5 py-1 rounded cursor-pointer whitespace-nowrap"
                                style={{ background: "var(--orange-d)", color: "var(--orange)", border: "1px solid rgba(240,90,26,.2)" }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--orange)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--orange-d)"; (e.currentTarget as HTMLElement).style.color = "var(--orange)"; }}
                              >📤 Upload</button>
                            ) : (
                              <input defaultValue={lesson.totalQuestions || 5} type="number" min="1"
                                className="text-[11px] px-1.5 py-1 rounded outline-none text-center"
                                style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", width: 70 }}
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
          <button onClick={handleClose}
            className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer"
            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
          >Close</button>
          <button disabled={loading || acting} onClick={handleSave}
            className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer disabled:opacity-40"
            style={{ background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >💾 Save Curriculum</button>
        </div>
      </div>

      {/* Upload Video Dialog */}
      <VideoUploadDialog
        isOpen={uploadDialogOpen}
        onClose={() => {
          setUploadDialogOpen(false);
          setSelectedLessonId(null);
        }}
        onUpload={async () => {
          // Upload success -> backend created a real Video record via upload-credentials API.
          // Remove the local-only placeholder from state (it was never saved to backend).
          const lessonIdToRemove = selectedLessonId;
          if (lessonIdToRemove) {
            setSections(prev => {
              const updated = prev.map(s => ({
                ...s,
                videos: s.videos.filter(v => v.id !== lessonIdToRemove),
              }));
              setDisplaySections(mergeLessons(updated));
              return updated;
            });
          }
          setSelectedLessonId(null);
          isDirty.current = true;
          // Await refresh so state is fully updated before dialog closes
          // (swallow error — the upload itself succeeded on the server side)
          try { await refreshSections(); } catch {}
        }}
        sectionId={selectedSectionId || ''}
        token={token}
        initialTitle={selectedLessonTitle}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmLabel={confirmState?.confirmLabel}
        cancelLabel={confirmState?.cancelLabel}
        danger={confirmState?.danger}
        onConfirm={() => resolveConfirm(true)}
        onCancel={() => resolveConfirm(false)}
      />
    </div>
  );
}
