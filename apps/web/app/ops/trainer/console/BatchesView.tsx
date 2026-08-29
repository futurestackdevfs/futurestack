"use client";

import { useMemo, useState } from "react";
import type { TrainerBatch } from "../lib/data";
import { KpiRow, Panel, Th, Td, ViewHeader, ProgressBar } from "../sections/ui";

interface BatchesViewProps {
  batches: TrainerBatch[];
  searchQuery: string;
  profileComplete?: boolean;
  onNavigateProfile?: () => void;
}

const PAGE_SIZE = 10;

export default function BatchesView({ batches, searchQuery, profileComplete = true, onNavigateProfile }: BatchesViewProps) {
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!searchQuery) return batches;
    const q = searchQuery.toLowerCase();
    return batches.filter((b) => [b.code, b.course, b.status].some((v) => v.toLowerCase().includes(q)));
  }, [batches, searchQuery]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalEnrolled = batches.reduce((s, b) => s + b.enrolled, 0);

  if (batches.length === 0) {
    return (
      <div className="p-4 pb-7">
        <ViewHeader icon="📅" title="My Courses" meta={`role::trainer · 0 courses assigned`} />
        {!profileComplete && (
          <div className="mb-4 px-4 py-3 rounded-lg flex items-center gap-3" style={{ background: "linear-gradient(135deg, var(--amber-d), var(--orange-d))", border: "1px solid var(--amber)" }}>
            <span className="text-[20px]">⚠️</span>
            <div className="flex-1">
              <div className="text-[12px] font-bold" style={{ color: "var(--amber)" }}>Complete your profile first</div>
              <div className="text-[10.5px]" style={{ color: "var(--text3)" }}>Fill in at least 5 profile fields to unlock course management.</div>
            </div>
            {onNavigateProfile && (
              <button onClick={onNavigateProfile} className="shrink-0 px-3 py-1.5 rounded text-[10px] font-bold cursor-pointer" style={{ background: "var(--amber)", color: "#fff", border: "none" }}>Complete Profile →</button>
            )}
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-16 rounded" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="text-[28px] mb-3">📅</div>
          <div className="font-mono text-[12px] font-bold mb-1" style={{ color: "var(--text)" }}>No courses assigned yet</div>
          <div className="text-[11px]" style={{ color: "var(--text3)" }}>Please contact your content manager to add courses</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-7">
      <ViewHeader
        icon="📅"
        title="My Courses"
        meta={`role::trainer · ${batches.length} courses assigned`}
      />

      <KpiRow items={[
        { label: "Total Courses", value: batches.length, delta: `${batches.filter((b) => b.status === "Running").length} running`, color: "var(--purple)" },
        { label: "Enrolled Students", value: totalEnrolled, delta: `across all courses`, color: "var(--blue)" },
        { label: "Avg Course Progress", value: `${Math.round(batches.reduce((s, b) => s + b.progressPct, 0) / (batches.length || 1))}%`, delta: "of curriculum", color: "var(--green)" },
      ]} />

      <Panel title="📅 Assigned Courses" count={`${filtered.length} courses`}>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr>
              <Th>Batch Code</Th><Th>Course</Th><Th>Students</Th>
              <Th>Current Module</Th><Th>Progress</Th><Th>Last Updated</Th>
            </tr>
          </thead>
          <tbody>
            {paged.map((b) => (
              <tr key={b.id}>
                <Td mono color="var(--text)"><b>{b.code}</b></Td>
                <Td>{b.course}</Td>
                <Td mono color="var(--text)">{b.enrolled}</Td>
                <Td mono>{b.currentModule}</Td>
                <Td><ProgressBar pct={b.progressPct} /></Td>
                <Td mono>{b.lastUpdated ?? "—"}</Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center font-mono text-[11px] py-6" style={{ color: "var(--text3)" }}>No courses found</td></tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="font-mono text-[9px] font-bold px-2 py-1 rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }}
              >← Prev</button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="font-mono text-[9px] font-bold px-2 py-1 rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }}
              >Next →</button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
