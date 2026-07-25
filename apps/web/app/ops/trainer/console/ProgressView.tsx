"use client";

import { useMemo, useState } from "react";
import type { TrainerStudent, StudentFlag } from "../lib/data";
import { KpiRow, Panel, Th, Td, ActionBtn, ViewHeader, ProgressBar } from "../sections/ui";

interface ProgressViewProps {
  students: TrainerStudent[];
  searchQuery: string;
  onSetFlag: (id: number, flag: StudentFlag) => void;
  onFlagToCoordinator: (id: number) => void;
}

const FLAG_FILTERS: (StudentFlag | "All")[] = ["All", "On Track", "Falling Behind", "Ready for Next Module", "Needs Re-attempt"];

export default function ProgressView({ students, searchQuery, onSetFlag, onFlagToCoordinator }: ProgressViewProps) {
  const [flagFilter, setFlagFilter] = useState<StudentFlag | "All">("All");

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
                    <span className="font-mono text-[9px] font-bold" style={{ color: "var(--purple)" }}>⚑ Flagged</span>
                  ) : (
                    <ActionBtn color="var(--purple)" onClick={() => onFlagToCoordinator(s.id)}>⚑ Flag to Coordinator</ActionBtn>
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
    </div>
  );
}
