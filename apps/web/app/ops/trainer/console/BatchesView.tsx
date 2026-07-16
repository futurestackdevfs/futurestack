"use client";

import { useMemo } from "react";
import type { TrainerBatch, TrainerSession } from "../lib/data";
import { KpiRow, Panel, Th, Td, Pill, ViewHeader, ProgressBar } from "../sections/ui";

interface BatchesViewProps {
  batches: TrainerBatch[];
  sessions: TrainerSession[];
  searchQuery: string;
}

export default function BatchesView({ batches, sessions, searchQuery }: BatchesViewProps) {
  const filtered = useMemo(() => {
    if (!searchQuery) return batches;
    const q = searchQuery.toLowerCase();
    return batches.filter((b) => [b.code, b.course, b.schedule, b.status].some((v) => v.toLowerCase().includes(q)));
  }, [batches, searchQuery]);

  const upcoming = useMemo(
    () => sessions.filter((s) => s.status === "Scheduled").sort((a, b) => a.date.localeCompare(b.date)),
    [sessions],
  );

  const totalEnrolled = batches.reduce((s, b) => s + b.enrolled, 0);

  return (
    <div className="p-4 pb-7">
      <ViewHeader icon="📅" title="My Batches" meta={`role::trainer · ${batches.length} batches assigned`} />

      <KpiRow items={[
        { label: "Total Batches", value: batches.length, delta: `${batches.filter((b) => b.status === "Running").length} running`, color: "var(--purple)" },
        { label: "Enrolled Students", value: totalEnrolled, delta: `across all batches`, color: "var(--blue)" },
        { label: "Upcoming Sessions", value: upcoming.length, delta: upcoming[0] ? `next: ${upcoming[0].date}` : "—", color: "var(--orange)" },
        { label: "Avg Batch Progress", value: `${Math.round(batches.reduce((s, b) => s + b.progressPct, 0) / (batches.length || 1))}%`, delta: "of curriculum", color: "var(--green)" },
      ]} />

      <Panel title="📅 Assigned Batches" count={`${filtered.length} batches`}>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr>
              <Th>Batch Code</Th><Th>Course</Th><Th>Schedule</Th><Th>Students</Th>
              <Th>Start Date</Th><Th>Current Module</Th><Th>Progress</Th><Th>Next Session</Th><Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id}>
                <Td mono color="var(--text)"><b>{b.code}</b></Td>
                <Td>{b.course}</Td>
                <Td mono>{b.schedule}</Td>
                <Td mono color="var(--text)">{b.enrolled}</Td>
                <Td mono>{b.startDate}</Td>
                <Td mono>{b.currentModule}</Td>
                <Td><ProgressBar pct={b.progressPct} /></Td>
                <Td mono color="var(--orange)">{b.nextSession}</Td>
                <Td><Pill value={b.status} /></Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center font-mono text-[11px] py-6" style={{ color: "var(--text3)" }}>No batches found</td></tr>
            )}
          </tbody>
        </table>
      </Panel>

      <Panel title="🗓 Batch Calendar — Upcoming Sessions" count={`${upcoming.length} scheduled`}>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr><Th>Date</Th><Th>Time</Th><Th>Batch</Th><Th>Topic</Th><Th>Materials</Th><Th>Status</Th></tr>
          </thead>
          <tbody>
            {upcoming.map((s) => (
              <tr key={s.id}>
                <Td mono color="var(--text)"><b>{s.date}</b></Td>
                <Td mono>{s.time}</Td>
                <Td mono>{s.batchCode}</Td>
                <Td color="var(--text)">{s.topic}</Td>
                <Td>
                  <div className="flex gap-1 flex-wrap">
                    {s.materials.map((m, i) => (
                      <span key={i} className="font-mono text-[8.5px] px-1.5 py-0.5 rounded" style={{ background: "var(--blue-d)", color: "var(--blue)" }}>📎 {m.kind}</span>
                    ))}
                  </div>
                </Td>
                <Td><Pill value={s.status} /></Td>
              </tr>
            ))}
            {upcoming.length === 0 && (
              <tr><td colSpan={6} className="text-center font-mono text-[11px] py-6" style={{ color: "var(--text3)" }}>No upcoming sessions</td></tr>
            )}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
