"use client";

import { useMemo } from "react";
import type { TrainerSession } from "../lib/data";
import { KpiRow, Panel, Th, Td, Pill, ActionBtn, ViewHeader } from "../sections/ui";

interface SessionsViewProps {
  sessions: TrainerSession[];
  searchQuery: string;
  onUpdateStatus: (id: number, status: TrainerSession["status"]) => void;
}

export default function SessionsView({ sessions, searchQuery, onUpdateStatus }: SessionsViewProps) {
  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    if (!searchQuery) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter((s) => [s.batchCode, s.course, s.topic, s.status].some((v) => v.toLowerCase().includes(q)));
  }, [sessions, searchQuery]);

  const todays = filtered.filter((s) => s.date === today);
  const scheduled = filtered.filter((s) => s.status === "Scheduled");
  const completed = filtered.filter((s) => s.status === "Completed");

  function statusActions(s: TrainerSession) {
    if (s.status === "Scheduled") {
      return (
        <div className="flex gap-1">
          <ActionBtn color="var(--green)" solid onClick={() => onUpdateStatus(s.id, "In Progress")}>▶ Start</ActionBtn>
          <ActionBtn color="var(--red)" onClick={() => onUpdateStatus(s.id, "Cancelled")}>✕ Cancel</ActionBtn>
        </div>
      );
    }
    if (s.status === "In Progress") {
      return <ActionBtn color="var(--blue)" solid onClick={() => onUpdateStatus(s.id, "Completed")}>✓ Mark Completed</ActionBtn>;
    }
    return <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>—</span>;
  }

  return (
    <div className="p-4 pb-7">
      <ViewHeader icon="🎥" title="Session Management" meta={`role::trainer · ${sessions.length} sessions`} />

      <KpiRow items={[
        { label: "Today's Sessions", value: todays.length, delta: today, color: "var(--orange)" },
        { label: "Scheduled", value: scheduled.length, delta: "upcoming", color: "var(--blue)" },
        { label: "Completed", value: completed.length, delta: "this month", color: "var(--green)" },
        { label: "Avg Attendance", value: completed.length ? Math.round(completed.reduce((s, x) => s + (x.attendance ?? 0), 0) / completed.length) : "—", delta: "students / session", color: "var(--purple)" },
      ]} />

      {/* Today's session detail */}
      <Panel title="⚡ Today's Session" count={today}>
        {todays.length === 0 ? (
          <div className="px-3 py-4 font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>No session scheduled today.</div>
        ) : todays.map((s) => (
          <div key={s.id} className="px-3 py-2.5 flex items-start gap-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[12.5px] font-bold" style={{ color: "var(--text)" }}>{s.topic}</span>
                <Pill value={s.status} />
              </div>
              <div className="font-mono text-[10px] mt-1" style={{ color: "var(--text3)" }}>
                {s.batchCode} · {s.course} · {s.time}
              </div>
              <div className="font-mono text-[10px] mt-0.5">
                <span style={{ color: "var(--text3)" }}>Session link: </span>
                <a href={s.link} target="_blank" rel="noreferrer" style={{ color: "var(--blue)" }}>{s.link}</a>
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {s.materials.map((m, i) => (
                  <span key={i} className="font-mono text-[9px] px-2 py-1 rounded cursor-pointer" style={{ background: "var(--blue-d)", color: "var(--blue)", border: "1px solid var(--border)" }}>
                    📎 {m.kind} · {m.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="shrink-0 pt-1">{statusActions(s)}</div>
          </div>
        ))}
      </Panel>

      {/* All sessions */}
      <Panel title="🗓 All Sessions" count={`${filtered.length} sessions`}>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr><Th>Date</Th><Th>Time</Th><Th>Batch</Th><Th>Topic</Th><Th>Materials</Th><Th>Attendance</Th><Th>Status</Th><Th>Actions</Th></tr>
          </thead>
          <tbody>
            {filtered
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((s) => (
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
                  <Td mono>{s.attendance != null ? `${s.attendance} present` : "—"}</Td>
                  <Td><Pill value={s.status} /></Td>
                  <Td>{statusActions(s)}</Td>
                </tr>
              ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center font-mono text-[11px] py-6" style={{ color: "var(--text3)" }}>No sessions found</td></tr>
            )}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
