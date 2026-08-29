"use client";

import { useMemo, useState } from "react";
import type { TrainerStudent, StudentFlag } from "../lib/data";
import { KpiRow, Panel, Th, Td, ActionBtn, ViewHeader, ProgressBar } from "../sections/ui";

interface ProgressViewProps {
  students: TrainerStudent[];
  searchQuery: string;
  onSetFlag: (id: number, flag: StudentFlag) => void;
  onFlagToCoordinator: (id: number, reason?: string) => void;
}

const FLAG_FILTERS: (StudentFlag | "All")[] = ["All", "On Track", "Falling Behind", "Ready for Next Module", "Needs Re-attempt"];

export default function ProgressView({ students, searchQuery, onSetFlag, onFlagToCoordinator }: ProgressViewProps) {
  const [flagFilter, setFlagFilter] = useState<StudentFlag | "All">("All");
  const [flagModal, setFlagModal] = useState<{ open: boolean; studentId: number; studentName: string }>({ open: false, studentId: 0, studentName: "" });
  const [flagReason, setFlagReason] = useState("");

  const filtered = useMemo(() => {
    let list = students;
    if (flagFilter !== "All") list = list.filter((s) => s.flag === flagFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => [s.name, s.email, s.batchCode, s.flag].some((v) => v.toLowerCase().includes(q)));
    }
    return list;
  }, [students, searchQuery, flagFilter]);

  const counts = useMemo(() => ({
    behind: students.filter((s) => s.flag === "Falling Behind").length,
    ready: students.filter((s) => s.flag === "Ready for Next Module").length,
    reattempt: students.filter((s) => s.flag === "Needs Re-attempt").length,
    flagged: students.filter((s) => s.flaggedToCoordinator).length,
  }), [students]);

  function handleFlagSubmit() {
    onFlagToCoordinator(flagModal.studentId, flagReason || undefined);
    setFlagModal({ open: false, studentId: 0, studentName: "" });
    setFlagReason("");
  }

  return (
    <div className="p-4 pb-7">
      <ViewHeader icon="📈" title="Student Progress" meta={`role::trainer · ${students.length} active students`} />

      <KpiRow items={[
        { label: "Active Students", value: students.length, delta: "in my batches", color: "var(--blue)" },
        { label: "Falling Behind", value: counts.behind, delta: "need attention", color: "var(--red)" },
        { label: "Ready for Next Module", value: counts.ready, delta: "module readiness ✓", color: "var(--green)" },
        { label: "Needs Re-attempt", value: counts.reattempt, delta: "assessment retake", color: "var(--amber)" },
        { label: "Flagged to Coordinator", value: counts.flagged, delta: "escalated", color: "var(--purple)" },
      ]} />

      {/* Flag filter tabs */}
      <div className="flex gap-1.5 mb-3">
        {FLAG_FILTERS.map((f) => (
          <button key={f}
            onClick={() => setFlagFilter(f)}
            className="font-mono text-[9.5px] font-semibold px-2.5 py-1 rounded cursor-pointer"
            style={flagFilter === f
              ? { background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }
              : { background: "var(--surface)", color: "var(--text2)", border: "1px solid var(--border)" }}
          >{f}</button>
        ))}
      </div>

      <Panel title="👥 Students" count={`${filtered.length} students`}>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr><Th>Student</Th><Th>Batch</Th><Th>Progress</Th><Th>Modules</Th><Th>Last Active</Th><Th>Readiness</Th><Th>Actions</Th></tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <Td>
                  <div className="font-semibold" style={{ color: "var(--text)" }}>{s.name}</div>
                  <div className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>{s.email}</div>
                </Td>
                <Td mono>{s.batchCode}</Td>
                <Td><ProgressBar pct={s.progressPct} /></Td>
                <Td mono color="var(--text)">{s.modulesDone}/{s.totalModules}</Td>
                <Td mono>{s.lastActive}</Td>
                <Td>
                  <select
                    value={s.flag}
                    onChange={(e) => onSetFlag(s.id, e.target.value as StudentFlag)}
                    className="font-mono text-[9px] px-1 py-0.5 rounded outline-none cursor-pointer"
                    style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}
                  >
                    {FLAG_FILTERS.slice(1).map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </Td>
                <Td>
                  {s.flaggedToCoordinator ? (
                    <div className="flex flex-col">
                      <span className="font-mono text-[9px] font-bold" style={{ color: "var(--purple)" }}>⚑ Flagged</span>
                      {s.flagReason && <span className="text-[8px] truncate max-w-[120px]" style={{ color: "var(--text3)" }} title={s.flagReason}>{s.flagReason}</span>}
                    </div>
                  ) : (
                    <ActionBtn color="var(--purple)" onClick={() => setFlagModal({ open: true, studentId: s.id, studentName: s.name })}>⚑ Flag to Coordinator</ActionBtn>
                  )}
                </Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center font-mono text-[11px] py-6" style={{ color: "var(--text3)" }}>No students found</td></tr>
            )}
          </tbody>
        </table>
      </Panel>

      {/* Flag Reason Modal */}
      {flagModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setFlagModal({ open: false, studentId: 0, studentName: "" })}>
          <div className="rounded-lg p-4 max-w-sm w-full mx-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[11px] font-bold" style={{ color: "var(--text)" }}>⚑ Flag {flagModal.studentName}</span>
              <button onClick={() => setFlagModal({ open: false, studentId: 0, studentName: "" })} className="text-[12px] cursor-pointer" style={{ color: "var(--text3)" }}>✕</button>
            </div>
            <textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Reason for flagging (optional)"
              rows={3}
              className="w-full font-mono text-[10px] p-2 rounded outline-none resize-none"
              style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => { setFlagModal({ open: false, studentId: 0, studentName: "" }); setFlagReason(""); }}
                className="font-mono text-[9px] font-bold px-3 py-1.5 rounded cursor-pointer"
                style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }}
              >Cancel</button>
              <button
                onClick={handleFlagSubmit}
                className="font-mono text-[9px] font-bold px-3 py-1.5 rounded cursor-pointer"
                style={{ background: "var(--purple)", color: "#fff", border: "1px solid var(--purple)" }}
              >Flag Student</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
