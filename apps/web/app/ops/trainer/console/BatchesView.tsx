"use client";

import { useMemo, useState } from "react";
import type { TrainerBatch, TrainerSession } from "../lib/data";
import { KpiRow, Panel, Th, Td, Pill, ViewHeader, ProgressBar, ActionBtn } from "../sections/ui";
import { CourseModal, type CourseFormValues } from "../sections/CourseModal";

interface BatchesViewProps {
  batches: TrainerBatch[];
  sessions: TrainerSession[];
  searchQuery: string;
  onAddCourse?: (input: CourseFormValues) => void;
  onEditCourse?: (id: number, input: CourseFormValues) => void;
}

export default function BatchesView({ batches, sessions, searchQuery, onAddCourse, onEditCourse }: BatchesViewProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<CourseFormValues | null>(null);

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

  function openAdd() {
    setEditingId(null);
    setEditingData(null);
    setShowModal(true);
  }

  function openEdit(b: TrainerBatch) {
    setEditingId(b.id);
    setEditingData({
      title: b.course,
      category: b.startDate !== "—" ? b.startDate : "",
      level: b.schedule !== "—" ? b.schedule : "",
      price: b.currentModule.startsWith("₹") ? b.currentModule.slice(1) : "",
      description: "",
      whatYoullLearn: "",
      techStack: "",
      careerTitle: "",
      careerBody: "",
      thumbnailUrl: "",
      status: "DRAFT",
      duration: "",
      modules: "",
      totalLessons: "",
      totalHours: "",
      isFeatured: false,
    });
    setShowModal(true);
  }

  function handleSave(values: CourseFormValues) {
    if (editingId !== null) {
      onEditCourse?.(editingId, values);
    } else {
      onAddCourse?.(values);
    }
    setShowModal(false);
    setEditingId(null);
    setEditingData(null);
  }

  return (
    <div className="p-4 pb-7">
      <ViewHeader
        icon="📅"
        title="My Courses"
        meta={`role::trainer · ${batches.length} courses assigned`}
        action={<ActionBtn color="var(--green)" solid onClick={openAdd}>＋ ADD COURSE</ActionBtn>}
      />

      <CourseModal
        open={showModal}
        editing={editingId !== null}
        data={editingData ?? undefined}
        onSave={handleSave}
        onClose={() => { setShowModal(false); setEditingId(null); setEditingData(null); }}
      />

      <KpiRow items={[
        { label: "Total Courses", value: batches.length, delta: `${batches.filter((b) => b.status === "Running").length} running`, color: "var(--purple)" },
        { label: "Enrolled Students", value: totalEnrolled, delta: `across all courses`, color: "var(--blue)" },
        { label: "Upcoming Sessions", value: upcoming.length, delta: upcoming[0] ? `next: ${upcoming[0].date}` : "—", color: "var(--orange)" },
        { label: "Avg Course Progress", value: `${Math.round(batches.reduce((s, b) => s + b.progressPct, 0) / (batches.length || 1))}%`, delta: "of curriculum", color: "var(--green)" },
      ]} />

      <Panel title="📅 Assigned Courses" count={`${filtered.length} courses`}>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr>
              <Th>Batch Code</Th><Th>Course</Th><Th>Schedule</Th><Th>Students</Th>
              <Th>Start Date</Th><Th>Current Module</Th><Th>Progress</Th><Th>Next Session</Th><Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} className="cursor-pointer" onClick={() => openEdit(b)}>
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
              <tr><td colSpan={9} className="text-center font-mono text-[11px] py-6" style={{ color: "var(--text3)" }}>No courses found</td></tr>
            )}
          </tbody>
        </table>
      </Panel>

      <Panel title="🗓 Course Calendar — Upcoming Sessions" count={`${upcoming.length} scheduled`}>
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
