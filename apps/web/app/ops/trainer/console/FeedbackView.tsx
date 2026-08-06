"use client";

import { useMemo, useState } from "react";
import type { CurriculumFeedback, FeedbackKind } from "../lib/data";
import { KpiRow, Panel, Th, Td, Pill, ActionBtn, ViewHeader } from "../sections/ui";

interface FeedbackViewProps {
  feedback: CurriculumFeedback[];
  searchQuery: string;
  onAdd: (item: Omit<CurriculumFeedback, "id" | "raisedAt" | "status">) => void;
  onSubmitDraft: (id: number) => void;
}

const KINDS: FeedbackKind[] = ["Outdated Material", "Confusing Topic", "Content Suggestion"];

export default function FeedbackView({ feedback, searchQuery, onAdd, onSubmitDraft }: FeedbackViewProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ kind: KINDS[0] as FeedbackKind, course: "", module: "", note: "" });

  const filtered = useMemo(() => {
    if (!searchQuery) return feedback;
    const q = searchQuery.toLowerCase();
    return feedback.filter((f) => [f.kind, f.course, f.module, f.note, f.status].some((v) => v.toLowerCase().includes(q)));
  }, [feedback, searchQuery]);

  const counts = useMemo(() => ({
    outdated: feedback.filter((f) => f.kind === "Outdated Material").length,
    confusing: feedback.filter((f) => f.kind === "Confusing Topic").length,
    suggestions: feedback.filter((f) => f.kind === "Content Suggestion").length,
    drafts: feedback.filter((f) => f.status === "Draft").length,
  }), [feedback]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.course.trim() || !form.module.trim() || !form.note.trim()) return;
    onAdd(form);
    setForm({ kind: KINDS[0], course: "", module: "", note: "" });
    setFormOpen(false);
  }

  return (
    <div className="p-4 pb-7">
      <ViewHeader
        icon="📝" title="Curriculum Feedback" meta={`role::trainer · ${feedback.length} reports`}
        action={
          <button onClick={() => setFormOpen(true)}
            className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer"
            style={{ background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >+ New Feedback</button>
        }
      />

      <KpiRow items={[
        { label: "Outdated Material", value: counts.outdated, delta: "flagged for update", color: "var(--red)" },
        { label: "Confusing Topics", value: counts.confusing, delta: "students struggled", color: "var(--amber)" },
        { label: "Content Suggestions", value: counts.suggestions, delta: "to Content Manager", color: "var(--blue)" },
        { label: "Drafts", value: counts.drafts, delta: "not yet submitted", color: "var(--purple)" },
      ]} />

      <Panel title="📝 Feedback to Content Manager" count={`${filtered.length} items`}>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr><Th>Type</Th><Th>Course</Th><Th>Module</Th><Th>Feedback</Th><Th>Raised</Th><Th>Status</Th><Th>Actions</Th></tr>
          </thead>
          <tbody>
            {filtered.map((f) => (
              <tr key={f.id}>
                <Td><Pill value={f.kind} /></Td>
                <Td color="var(--text)">{f.course}</Td>
                <Td mono>{f.module}</Td>
                <Td><span className="text-[10.5px] block max-w-[320px]" style={{ color: "var(--text2)" }}>{f.note}</span></Td>
                <Td mono>{f.raisedAt}</Td>
                <Td><Pill value={f.status} /></Td>
                <Td>
                  {f.status === "Draft" ? (
                    <ActionBtn color="var(--blue)" solid onClick={() => onSubmitDraft(f.id)}>↗ Submit</ActionBtn>
                  ) : (
                    <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>—</span>
                  )}
                </Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center font-mono text-[11px] py-6" style={{ color: "var(--text3)" }}>No feedback yet</td></tr>
            )}
          </tbody>
        </table>
      </Panel>

      {/* New feedback modal */}
      {formOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setFormOpen(false); }}
        >
          <div className="rounded-lg p-5 w-full max-w-md" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-extrabold text-[13px]" style={{ color: "var(--text)" }}>New Curriculum Feedback</span>
              <button onClick={() => setFormOpen(false)} className="font-mono text-[12px] cursor-pointer border-none" style={{ color: "var(--btn-text, var(--text3))", background: "var(--btn-bg, transparent)" }}>✕</button>
            </div>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <div>
                <label className="font-mono text-[9.5px] uppercase tracking-wider mb-1 block" style={{ color: "var(--text3)" }}>Type</label>
                <select
                  value={form.kind}
                  onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value as FeedbackKind }))}
                  className="w-full font-mono text-[11px] px-2.5 py-1.5 rounded outline-none cursor-pointer"
                  style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}
                >
                  {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="font-mono text-[9.5px] uppercase tracking-wider mb-1 block" style={{ color: "var(--text3)" }}>Course</label>
                <input
                  value={form.course}
                  onChange={(e) => setForm((p) => ({ ...p, course: e.target.value }))}
                  placeholder="e.g. MERN Stack Development" required
                  className="w-full font-mono text-[11px] px-2.5 py-1.5 rounded outline-none"
                  style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}
                />
              </div>
              <div>
                <label className="font-mono text-[9.5px] uppercase tracking-wider mb-1 block" style={{ color: "var(--text3)" }}>Module / Topic</label>
                <input
                  value={form.module}
                  onChange={(e) => setForm((p) => ({ ...p, module: e.target.value }))}
                  placeholder="e.g. M5 · Express.js" required
                  className="w-full font-mono text-[11px] px-2.5 py-1.5 rounded outline-none"
                  style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}
                />
              </div>
              <div>
                <label className="font-mono text-[9.5px] uppercase tracking-wider mb-1 block" style={{ color: "var(--text3)" }}>Details</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                  rows={4} required
                  placeholder="What is outdated/confusing, and what should change…"
                  className="w-full font-mono text-[11px] px-2.5 py-1.5 rounded outline-none resize-y"
                  style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}
                />
              </div>
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setFormOpen(false)}
                  className="flex-1 font-mono text-[10.5px] font-semibold py-1.5 rounded cursor-pointer"
                  style={{ border: "1px solid var(--border)", color: "var(--btn-text, var(--text2))", background: "var(--btn-bg, var(--panel))" }}
                >Cancel</button>
                <button type="submit"
                  className="flex-1 font-mono text-[10.5px] font-semibold py-1.5 rounded cursor-pointer"
                  style={{ background: "var(--btn-bg, var(--orange))", color: "var(--btn-text, #fff)", border: "none" }}
                >Save as Draft</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
