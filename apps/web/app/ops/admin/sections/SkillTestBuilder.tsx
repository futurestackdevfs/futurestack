"use client";

import { useState, useEffect, useRef } from "react";
import { ConfirmDialog, type ConfirmOptions } from "./ConfirmDialog";
import { opsFetch } from "@/app/ops/lib/ops-fetch";

interface ApiQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndices: number[];
  isMultiSelect: boolean;
  explanation?: string | null;
  order: number;
}

interface SkillTestBuilderProps {
  open: boolean;
  skillTestId: string;
  skillTestTitle: string;
  token: string;
  onSave: () => void;
  onClose: () => void;
  embedded?: boolean;
}

async function apiCall(_token: string, endpoint: string, options?: RequestInit) {
  const res = await opsFetch(`/api${endpoint}`, options);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || res.statusText || `Request failed (${res.status})`);
  }
  return res.json();
}

function nextTempId(counter: React.MutableRefObject<number>) {
  return `new_${--counter.current}`;
}

export function SkillTestBuilder({
  open, skillTestId, skillTestTitle, token, onSave, onClose, embedded = false,
}: SkillTestBuilderProps) {
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const isDirty = useRef(false);
  const original = useRef<ApiQuestion[]>([]);
  const tempIdCounter = useRef(0);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

  function askConfirm(opts: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => setConfirmState({ ...opts, resolve }));
  }

  function resolveConfirm(ok: boolean) {
    confirmState?.resolve(ok);
    setConfirmState(null);
  }

  function loadQuestions() {
    if (!token || !skillTestId) return;
    setLoading(true);
    setFetchError(null);
    apiCall(token, `/courses/quizzes/${skillTestId}`)
      .then((data) => {
        const qs: ApiQuestion[] = (data.questions || []).map((q: any) => ({
          id: q.id,
          question: q.question || "",
          options: Array.isArray(q.options) && q.options.length ? q.options : ["", "", "", ""],
          correctIndices: Array.isArray(q.correctIndices) && q.correctIndices.length ? q.correctIndices : [0],
          isMultiSelect: !!q.isMultiSelect,
          explanation: q.explanation || "",
          order: q.order ?? 0,
        })).sort((a: ApiQuestion, b: ApiQuestion) => a.order - b.order);
        setQuestions(qs);
        original.current = JSON.parse(JSON.stringify(qs));
        tempIdCounter.current = 0;
        isDirty.current = false;
      })
      .catch((e) => setFetchError(e.message || "Failed to load questions"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!open) return;
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, skillTestId, token]);

  async function handleClose() {
    if (isDirty.current) {
      const ok = await askConfirm({
        title: "Unsaved Changes",
        message: "You have unsaved changes. Discard them and close?",
        confirmLabel: "Discard",
        cancelLabel: "Keep Editing",
        danger: false,
      });
      if (!ok) return;
    }
    onClose();
  }

  function addQuestion() {
    isDirty.current = true;
    setQuestions((prev) => {
      const maxOrder = prev.reduce((m, q) => Math.max(m, q.order), -1);
      return [
        ...prev,
        { id: nextTempId(tempIdCounter), question: "", options: ["", "", "", ""], correctIndices: [0], isMultiSelect: false, explanation: "", order: maxOrder + 1 },
      ];
    });
  }

  function updateQuestion(id: string, patch: Partial<ApiQuestion>) {
    isDirty.current = true;
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  function updateOption(id: string, idx: number, value: string) {
    isDirty.current = true;
    setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, options: q.options.map((o, i) => i === idx ? value : o) } : q));
  }

  /** Toggle option `oi` as correct for question `id`, respecting single- vs multi-select mode. */
  function toggleCorrect(id: string, oi: number) {
    isDirty.current = true;
    setQuestions((prev) => prev.map((q) => {
      if (q.id !== id) return q;
      if (!q.isMultiSelect) return { ...q, correctIndices: [oi] };
      const has = q.correctIndices.includes(oi);
      const next = has ? q.correctIndices.filter((i) => i !== oi) : [...q.correctIndices, oi];
      return { ...q, correctIndices: next.length ? next : q.correctIndices }; // keep at least one marked correct
    }));
  }

  /** Flip a question between single-answer (radio) and multi-select (checkbox). */
  function setMultiSelect(id: string, multi: boolean) {
    isDirty.current = true;
    setQuestions((prev) => prev.map((q) => q.id === id
      ? { ...q, isMultiSelect: multi, correctIndices: multi ? q.correctIndices : [q.correctIndices[0] ?? 0] }
      : q));
  }

  async function removeQuestion(id: string) {
    const ok = await askConfirm({
      title: "Delete Question?",
      message: "Are you sure you want to remove this question?\nThis cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    isDirty.current = true;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function moveQuestion(id: string, dir: -1 | 1) {
    isDirty.current = true;
    setQuestions((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((q) => q.id === id);
      const swapIdx = idx + dir;
      if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return prev;
      const a = sorted[idx], b = sorted[swapIdx];
      const aOrder = a.order, bOrder = b.order;
      return prev.map((q) => q.id === a.id ? { ...q, order: bOrder } : q.id === b.id ? { ...q, order: aOrder } : q);
    });
  }

  async function handleSave() {
    if (!token) return;
    const invalid = questions.find((q) => !q.question.trim() || q.options.some((o) => !o.trim()));
    if (invalid) {
      await askConfirm({
        title: "Incomplete Question",
        message: "Every question needs text and all options filled in.",
        confirmLabel: "OK, Got It",
        cancelLabel: "Go Back",
        danger: true,
      });
      return;
    }

    setActing(true);
    const orig = original.current;
    const curr = questions;
    try {
      const deleted = orig.filter((o) => !curr.some((c) => c.id === o.id));
      for (const q of deleted) {
        if (q.id.startsWith("new_")) continue;
        await apiCall(token, `/courses/quizzes/questions/${q.id}`, { method: "DELETE" });
      }

      for (const q of curr) {
        const isNew = q.id.startsWith("new_");
        const body = {
          question: q.question,
          options: q.options,
          correctIndices: q.correctIndices,
          isMultiSelect: q.isMultiSelect,
          explanation: q.explanation || undefined,
          order: q.order,
        };
        if (isNew) {
          await apiCall(token, `/courses/quizzes/${skillTestId}/questions`, {
            method: "POST",
            body: JSON.stringify(body),
          });
        } else {
          const origQ = orig.find((o) => o.id === q.id);
          if (!origQ || JSON.stringify(origQ) !== JSON.stringify(q)) {
            await apiCall(token, `/courses/quizzes/questions/${q.id}`, {
              method: "PATCH",
              body: JSON.stringify(body),
            });
          }
        }
      }

      loadQuestions();
      isDirty.current = false;
      onSave();
    } catch {
      await askConfirm({
        title: "Save Failed",
        message: "Failed to save questions. Please try again.",
        confirmLabel: "OK",
        cancelLabel: "Go Back",
        danger: true,
      });
    }
    setActing(false);
  }

  if (!open) return null;

  const sorted = [...questions].sort((a, b) => a.order - b.order);

  const bodyAndFooter = (
    <>
        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-8 font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading questions...</div>
          ) : fetchError ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <div className="font-mono text-[11px]" style={{ color: "var(--red)" }}>✕ {fetchError}</div>
              <button onClick={loadQuestions}
                className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded cursor-pointer"
                style={{ border: "1px solid var(--border)", color: "var(--btn-text, var(--text2))", background: "var(--btn-bg, var(--surface))" }}
              >↻ Retry</button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3 gap-2">
                <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>{sorted.length} question{sorted.length !== 1 ? "s" : ""}</span>
              </div>

              {sorted.length === 0 ? (
                <div className="text-center py-8 font-mono text-[11px]" style={{ color: "var(--text3)" }}>No questions yet. Add the first one below.</div>
              ) : (
                sorted.map((q, qi) => (
                  <div key={q.id} className="rounded mb-3 overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-2 px-3 py-2" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
                      <span className="font-mono text-[9px] font-bold shrink-0" style={{ color: "var(--orange)", width: 22 }}>{String(qi + 1).padStart(2, "0")}</span>
                      <input
                        value={q.question}
                        onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                        placeholder="Question text"
                        className="flex-1 text-[12px] font-semibold rounded px-1.5 py-0.5 outline-none"
                        style={{ color: "var(--text)", background: "transparent", border: "1px solid transparent" }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                      />
                      <div className="flex gap-1 shrink-0">
                        <button disabled={acting || qi === 0} onClick={() => moveQuestion(q.id, -1)}
                          className="flex items-center justify-center w-[20px] h-[20px] rounded text-[10px] cursor-pointer disabled:opacity-30"
                          style={{ color: "var(--text3)" }} title="Move Up">↑</button>
                        <button disabled={acting || qi === sorted.length - 1} onClick={() => moveQuestion(q.id, 1)}
                          className="flex items-center justify-center w-[20px] h-[20px] rounded text-[10px] cursor-pointer disabled:opacity-30"
                          style={{ color: "var(--text3)" }} title="Move Down">↓</button>
                        <button disabled={acting} onClick={() => removeQuestion(q.id)}
                          className="flex items-center justify-center w-[20px] h-[20px] rounded text-[10px] cursor-pointer disabled:opacity-40"
                          style={{ color: "var(--text3)" }} title="Remove Question"
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--red)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text3)"; }}>🗑</button>
                      </div>
                    </div>

                    <div className="px-3 py-2.5 flex flex-col gap-1.5">
                      <label className="flex items-center gap-1.5 self-start cursor-pointer mb-0.5">
                        <input
                          type="checkbox"
                          checked={q.isMultiSelect}
                          onChange={(e) => setMultiSelect(q.id, e.target.checked)}
                        />
                        <span className="font-mono text-[9.5px] font-semibold" style={{ color: "var(--text3)" }}>Allow multiple correct answers</span>
                      </label>
                      {q.options.map((opt, oi) => {
                        const isCorrect = q.correctIndices.includes(oi);
                        return (
                          <div key={oi} className="flex items-center gap-2">
                            <input
                              type={q.isMultiSelect ? "checkbox" : "radio"}
                              name={q.isMultiSelect ? undefined : `correct-${q.id}`}
                              checked={isCorrect}
                              onChange={() => toggleCorrect(q.id, oi)}
                              title="Mark as correct answer"
                            />
                            <input
                              value={opt}
                              onChange={(e) => updateOption(q.id, oi, e.target.value)}
                              placeholder={`Option ${oi + 1}`}
                              className="flex-1 text-[11px] px-1.5 py-1 rounded outline-none"
                              style={{ border: "1px solid var(--border)", background: "var(--bg)", color: isCorrect ? "var(--green)" : "var(--text)" }}
                              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--orange)"; }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                            />
                          </div>
                        );
                      })}
                      <button
                        onClick={() => updateQuestion(q.id, { options: [...q.options, ""] })}
                        className="self-start font-mono text-[9.5px] font-semibold mt-0.5 cursor-pointer"
                        style={{ color: "var(--blue)" }}
                      >+ Add Option</button>
                      <textarea
                        value={q.explanation || ""}
                        onChange={(e) => updateQuestion(q.id, { explanation: e.target.value })}
                        placeholder="Explanation (optional) — shown on the results screen"
                        rows={2}
                        className="text-[10.5px] px-1.5 py-1 rounded outline-none mt-1"
                        style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text2)" }}
                      />
                    </div>
                  </div>
                ))
              )}

              <button disabled={acting} onClick={addQuestion}
                className="w-full py-2.5 rounded font-mono text-[11px] font-semibold text-center cursor-pointer disabled:opacity-40"
                style={{ border: "1.5px dashed var(--border2)", color: "var(--text3)", background: "var(--panel)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--orange)"; (e.currentTarget as HTMLElement).style.color = "var(--orange)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; (e.currentTarget as HTMLElement).style.color = "var(--text3)"; }}
              >+ Add Question</button>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 shrink-0" style={{ borderTop: "1px solid var(--border)", background: "var(--panel)" }}>
          <button onClick={handleClose}
            className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer"
            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
          >Close</button>
          <button disabled={loading || acting} onClick={handleSave}
            className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer disabled:opacity-40"
            style={{ background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }}
          >💾 Save Questions</button>
        </div>
    </>
  );

  const confirmDialog = (
    <ConfirmDialog
      open={!!confirmState}
      title={confirmState?.title || ""}
      message={confirmState?.message || ""}
      confirmLabel={confirmState?.confirmLabel}
      cancelLabel={confirmState?.cancelLabel}
      danger={confirmState?.danger}
      onConfirm={() => resolveConfirm(true)}
      onCancel={() => resolveConfirm(false)}
    />
  );

  if (embedded) {
    return (
      <>
        {bodyAndFooter}
        {confirmDialog}
      </>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ background: "var(--overlay)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="flex flex-col rounded-lg max-w-full h-[88vh]"
        style={{ width: 1080, maxWidth: "96vw", background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}
      >
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 text-[13.5px] font-extrabold" style={{ color: "var(--text)" }}>
            <span className="w-[26px] h-[26px] rounded flex items-center justify-center text-[13px]" style={{ background: "var(--orange-d)", color: "var(--orange)" }}>🧪</span>
            Manage Questions{skillTestTitle ? <span style={{ fontWeight: 400, color: "var(--text3)" }}> — {skillTestTitle}</span> : ""}
          </div>
          <button onClick={handleClose}
            className="flex items-center justify-center w-6 h-6 rounded text-[14px] cursor-pointer"
            style={{ color: "var(--btn-text, var(--text3))", background: "var(--btn-bg, transparent)" }}
          >✕</button>
        </div>

        {bodyAndFooter}
      </div>

      {confirmDialog}
    </div>
  );
}
