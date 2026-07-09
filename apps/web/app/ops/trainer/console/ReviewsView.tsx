"use client";

import { useMemo, useState } from "react";
import type { ProjectSubmission, SubmissionStatus } from "../lib/data";
import { KpiRow, Panel, Th, Td, Pill, ActionBtn, ViewHeader } from "../sections/ui";

interface ReviewsViewProps {
  submissions: ProjectSubmission[];
  searchQuery: string;
  onReview: (id: number, status: SubmissionStatus, feedback: string) => void;
}

const STATUS_FILTERS: (SubmissionStatus | "All")[] = ["All", "New", "Pending Review", "Revision Requested", "Approved"];

export default function ReviewsView({ submissions, searchQuery, onReview }: ReviewsViewProps) {
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "All">("All");
  const [reviewing, setReviewing] = useState<ProjectSubmission | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  const filtered = useMemo(() => {
    let list = submissions;
    if (statusFilter !== "All") list = list.filter((s) => s.status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => [s.student, s.project, s.batchCode, s.status].some((v) => v.toLowerCase().includes(q)));
    }
    return list;
  }, [submissions, searchQuery, statusFilter]);

  const counts = useMemo(() => ({
    newSubs: submissions.filter((s) => s.status === "New").length,
    pending: submissions.filter((s) => s.status === "Pending Review").length,
    revision: submissions.filter((s) => s.status === "Revision Requested").length,
    approved: submissions.filter((s) => s.status === "Approved").length,
  }), [submissions]);

  function openReview(sub: ProjectSubmission) {
    setReviewing(sub);
    setFeedbackText(sub.feedback);
  }

  function submitReview(status: SubmissionStatus) {
    if (!reviewing) return;
    onReview(reviewing.id, status, feedbackText);
    setReviewing(null);
    setFeedbackText("");
  }

  return (
    <div className="p-4 pb-7">
      <ViewHeader icon="📦" title="Project Review Queue" meta={`role::trainer · ${submissions.length} submissions`} />

      <KpiRow items={[
        { label: "New Submissions", value: counts.newSubs, delta: "awaiting first look", color: "var(--purple)" },
        { label: "Pending Reviews", value: counts.pending, delta: "in review", color: "var(--amber)" },
        { label: "Revisions Requested", value: counts.revision, delta: "back with students", color: "var(--red)" },
        { label: "Approved", value: counts.approved, delta: "completed", color: "var(--green)" },
      ]} />

      <div className="flex gap-1.5 mb-3">
        {STATUS_FILTERS.map((f) => (
          <button key={f}
            onClick={() => setStatusFilter(f)}
            className="font-mono text-[9.5px] font-semibold px-2.5 py-1 rounded cursor-pointer"
            style={statusFilter === f
              ? { background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }
              : { background: "var(--surface)", color: "var(--text2)", border: "1px solid var(--border)" }}
          >{f}</button>
        ))}
      </div>

      <Panel title="📦 Submissions" count={`${filtered.length} submissions`}>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr><Th>Student</Th><Th>Project</Th><Th>Module</Th><Th>Batch</Th><Th>Submitted</Th><Th>Status</Th><Th>Feedback</Th><Th>Actions</Th></tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <Td color="var(--text)"><b>{s.student}</b></Td>
                <Td color="var(--text)">{s.project}</Td>
                <Td mono>{s.module}</Td>
                <Td mono>{s.batchCode}</Td>
                <Td mono>{s.submittedAt}</Td>
                <Td><Pill value={s.status} /></Td>
                <Td>
                  <span className="text-[10px] block truncate max-w-[220px]" style={{ color: "var(--text3)" }} title={s.feedback}>
                    {s.feedback || "—"}
                  </span>
                </Td>
                <Td>
                  {s.status === "Approved" ? (
                    <span className="font-mono text-[9px]" style={{ color: "var(--green)" }}>✓ Done</span>
                  ) : (
                    <ActionBtn color="var(--orange)" solid onClick={() => openReview(s)}>✎ Review</ActionBtn>
                  )}
                </Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center font-mono text-[11px] py-6" style={{ color: "var(--text3)" }}>No submissions found</td></tr>
            )}
          </tbody>
        </table>
      </Panel>

      {/* Review modal */}
      {reviewing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setReviewing(null); }}
        >
          <div className="rounded-lg p-5 w-full max-w-md" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-extrabold text-[13px]" style={{ color: "var(--text)" }}>Review Submission</span>
              <button onClick={() => setReviewing(null)} className="font-mono text-[12px] cursor-pointer border-none bg-transparent" style={{ color: "var(--text3)" }}>✕</button>
            </div>
            <div className="font-mono text-[10px] mb-3" style={{ color: "var(--text3)" }}>
              {reviewing.student} · {reviewing.project} · {reviewing.batchCode}
            </div>
            <label className="font-mono text-[9.5px] uppercase tracking-wider mb-1 block" style={{ color: "var(--text3)" }}>
              Written Feedback (actionable)
            </label>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={5}
              placeholder="What works, what must change, and how to fix it…"
              className="w-full font-mono text-[11px] px-2.5 py-1.5 rounded outline-none resize-y"
              style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}
            />
            <div className="flex gap-2 mt-3">
              <button onClick={() => setReviewing(null)}
                className="flex-1 font-mono text-[10.5px] font-semibold py-1.5 rounded cursor-pointer"
                style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--panel)" }}
              >Cancel</button>
              <button onClick={() => submitReview("Revision Requested")}
                disabled={!feedbackText.trim()}
                className="flex-1 font-mono text-[10.5px] font-semibold py-1.5 rounded cursor-pointer"
                style={{ background: "var(--red)", color: "#fff", border: "none", opacity: feedbackText.trim() ? 1 : 0.5 }}
              >↩ Request Revision</button>
              <button onClick={() => submitReview("Approved")}
                className="flex-1 font-mono text-[10.5px] font-semibold py-1.5 rounded cursor-pointer"
                style={{ background: "var(--green)", color: "#fff", border: "none" }}
              >✓ Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
