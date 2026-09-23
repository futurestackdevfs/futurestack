"use client";

import { useEffect, useState } from "react";
import { SkillTestBuilder } from "./SkillTestBuilder";
import { ConfirmDialog, type ConfirmOptions } from "./ConfirmDialog";
import { opsFetch } from "@/app/ops/lib/ops-fetch";

interface ApiQuiz {
  id: string;
  title: string;
  order: number;
  totalQuestions: number;
}
interface ApiSection {
  id: string;
  title: string;
  order: number;
  quizzes: ApiQuiz[];
}

interface CourseSkillTestsTabProps {
  courseId: string;
  token: string;
  onChanged?: () => void;
}

async function apiCall(_token: string, endpoint: string, options?: RequestInit) {
  const res = await opsFetch(`/api${endpoint}`, options);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || res.statusText || `Request failed (${res.status})`);
  }
  return res.json();
}

export function CourseSkillTestsTab({ courseId, token, onChanged }: CourseSkillTestsTabProps) {
  const [sections, setSections] = useState<ApiSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [editorTarget, setEditorTarget] = useState<{ id: string; title: string } | null>(null);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

  function load() {
    if (!token || !courseId) return;
    setLoading(true);
    setError(null);
    apiCall(token, `/courses/${courseId}`)
      .then((data) => {
        const secs: ApiSection[] = (data?.sections || []).map((s: any) => ({
          id: s.id,
          title: s.title || "",
          order: s.order ?? 0,
          quizzes: (s.quizzes || []).map((q: any) => ({
            id: q.id, title: q.title || "", order: q.order ?? 0, totalQuestions: q.totalQuestions ?? 0,
          })),
        })).sort((a: ApiSection, b: ApiSection) => a.order - b.order);
        setSections(secs);
      })
      .catch((e) => setError(e.message || "Failed to load skill tests"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [courseId, token]);

  function askConfirm(opts: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => setConfirmState({ ...opts, resolve }));
  }

  async function addQuiz(sectionId: string) {
    if (!token || acting) return;
    setActing(true);
    try {
      const section = sections.find((s) => s.id === sectionId);
      const maxOrder = Math.max(-1, ...(section?.quizzes.map((q) => q.order) ?? []));
      await apiCall(token, `/courses/sections/${sectionId}/quizzes`, {
        method: "POST",
        body: JSON.stringify({ title: "New Skill Test", order: maxOrder + 1 }),
      });
      load();
      onChanged?.();
    } catch (e: any) {
      setError(e.message || "Failed to create skill test");
    } finally {
      setActing(false);
    }
  }

  async function removeQuiz(quizId: string) {
    if (!token) return;
    const ok = await askConfirm({
      title: "Delete Skill Test?",
      message: "Delete this skill test and all its questions?\nThis cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    setActing(true);
    try {
      await apiCall(token, `/courses/quizzes/${quizId}`, { method: "DELETE" });
      load();
      onChanged?.();
    } catch (e: any) {
      setError(e.message || "Failed to delete skill test");
    } finally {
      setActing(false);
    }
  }

  const totalQuizzes = sections.reduce((sum, s) => sum + s.quizzes.length, 0);

  return (
    <div className="p-4 overflow-y-auto flex-1">
      {loading ? (
        <div className="text-center py-8 font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading skill tests...</div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <div className="font-mono text-[11px]" style={{ color: "var(--red)" }}>✕ {error}</div>
          <button onClick={load}
            className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded cursor-pointer"
            style={{ border: "1px solid var(--border)", color: "var(--btn-text, var(--text2))", background: "var(--btn-bg, var(--surface))" }}
          >↻ Retry</button>
        </div>
      ) : sections.length === 0 ? (
        <div className="text-center py-8 font-mono text-[11px]" style={{ color: "var(--text3)" }}>
          Add a section in the Curriculum tab first — skill tests live inside a section.
        </div>
      ) : (
        <>
          <div className="mb-3 font-mono text-[10px]" style={{ color: "var(--text3)" }}>
            {totalQuizzes} skill test{totalQuizzes !== 1 ? "s" : ""} across {sections.length} section{sections.length !== 1 ? "s" : ""}
          </div>
          {sections.map((section) => (
            <div key={section.id} className="rounded mb-2.5 overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between px-3 py-2" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
                <span className="text-[12px] font-bold" style={{ color: "var(--text)" }}>{section.title}</span>
                <button disabled={acting} onClick={() => addQuiz(section.id)}
                  className="font-mono text-[9px] font-semibold px-2.5 py-1 rounded cursor-pointer disabled:opacity-40"
                  style={{ background: "var(--btn-bg, var(--blue-d))", color: "var(--btn-text, var(--blue))", border: "1px solid var(--btn-bg, rgba(37,99,235,.2))" }}
                >+ Add Skill Test</button>
              </div>
              <div className="px-3 py-1.5">
                {section.quizzes.length === 0 ? (
                  <div className="text-center py-3 font-mono text-[10px]" style={{ color: "var(--text3)" }}>No skill tests in this section yet</div>
                ) : (
                  section.quizzes.map((q) => (
                    <div key={q.id} className="grid gap-2 items-center py-1.5" style={{ gridTemplateColumns: "1fr auto auto" }}>
                      <span className="text-[11px] truncate" style={{ color: "var(--text)" }}>{q.title}</span>
                      <button onClick={() => setEditorTarget({ id: q.id, title: q.title })}
                        className="font-mono text-[9px] font-semibold px-2.5 py-1 rounded cursor-pointer whitespace-nowrap"
                        style={{ background: "var(--btn-bg, var(--blue-d))", color: "var(--btn-text, var(--blue))", border: "1px solid var(--btn-bg, rgba(37,99,235,.2))" }}
                      >✎ {q.totalQuestions} question{q.totalQuestions !== 1 ? "s" : ""}</button>
                      <button disabled={acting} onClick={() => removeQuiz(q.id)}
                        className="flex items-center justify-center text-[10px] cursor-pointer disabled:opacity-40"
                        style={{ color: "var(--btn-text, var(--text3))", background: "var(--btn-bg, transparent)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--btn-text, var(--red))"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--btn-text, var(--text3))"; }}
                        title="Delete">🗑</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </>
      )}

      {editorTarget && (
        <SkillTestBuilder
          open={!!editorTarget}
          skillTestId={editorTarget.id}
          skillTestTitle={editorTarget.title}
          token={token}
          onSave={() => { load(); onChanged?.(); }}
          onClose={() => { setEditorTarget(null); load(); }}
        />
      )}

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title || ""}
        message={confirmState?.message || ""}
        confirmLabel={confirmState?.confirmLabel}
        cancelLabel={confirmState?.cancelLabel}
        danger={confirmState?.danger}
        onConfirm={() => { confirmState?.resolve(true); setConfirmState(null); }}
        onCancel={() => { confirmState?.resolve(false); setConfirmState(null); }}
      />
    </div>
  );
}
