"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { loadStaffToken } from "@/app/auth/lib/token-store";
import { ViewHeader } from "../../sales/sections/ui";
import { CurriculumBuilder } from "../../admin/sections/CurriculumBuilder";

interface Course { id: string; title: string; code: string; status: string; trainerId: string | null; trainer?: { id: string; name: string }; updatedAt: string; }

function fmtDate(d: string) {
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function CurriculumView({ searchQuery, refreshSignal, onToast }: {
  searchQuery: string;
  refreshSignal?: number;
  onToast: (msg: string, type?: "success" | "danger") => void;
}) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [trainers, setTrainers] = useState<{ id: string; name: string }[]>([]);
  const [trainerFilter, setTrainerFilter] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [cbOpen, setCbOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    loadStaffToken().then(setToken).catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      opsFetch("/api/courses"),
      opsFetch("/api/admin/trainers/approved"),
    ]).then(async ([cRes, tRes]) => {
      if (cRes.ok) { const d = await cRes.json(); setCourses(Array.isArray(d) ? d : []); }
      if (tRes.ok) { const d = await tRes.json(); setTrainers(Array.isArray(d) ? d : []); }
    }).catch(() => {});
  }, [refreshSignal]);

  const filteredCourses = useMemo(() => {
    let list = courses;
    if (trainerFilter) list = list.filter((c) => c.trainerId === trainerFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((c) => c.title.toLowerCase().includes(q) || (c.code && c.code.toLowerCase().includes(q)));
    }
    return list;
  }, [courses, trainerFilter, searchQuery]);

  function handleSaveCurriculum() {
    onToast("Curriculum saved", "success");
    // Refresh course list to get updated updatedAt
    opsFetch("/api/courses").then((r) => r.ok ? r.json() : []).then((data) => {
      if (Array.isArray(data)) setCourses(data);
    }).catch(() => {});
  }

  return (
    <div className="p-4 pb-7">
      <ViewHeader
        icon="📖"
        title="Course Builder"
        meta={selectedCourse ? `${selectedCourse.title}` : "SELECT A COURSE"}
      />

      {/* Trainer Filter */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="font-mono text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>Filter by Trainer</div>
          <select
            value={trainerFilter}
            onChange={(e) => { setTrainerFilter(e.target.value); setSelectedCourse(null); }}
            className="w-full font-mono text-[11px] px-2.5 py-1.5 rounded outline-none"
            style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}>
            <option value="">All Trainers ({courses.length} courses)</option>
            {trainers.map((t) => {
              const count = courses.filter((c) => c.trainerId === t.id).length;
              return <option key={t.id} value={t.id}>{t.name} ({count} courses)</option>;
            })}
          </select>
        </div>
        <div className="rounded p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="font-mono text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>Select Course</div>
          <select
            value={selectedCourse?.id || ""}
            onChange={(e) => {
              const c = courses.find((c) => c.id === e.target.value);
              setSelectedCourse(c || null);
            }}
            className="w-full font-mono text-[11px] px-2.5 py-1.5 rounded outline-none"
            style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}>
            <option value="">— Choose a course —</option>
            {filteredCourses.map((c) => (
              <option key={c.id} value={c.id}>{c.title} ({c.status}){c.trainer ? ` — ${c.trainer.name}` : ""}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Course Card */}
      {selectedCourse && (
        <div className="rounded p-3 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-mono text-[11px] font-bold" style={{ color: "var(--text)" }}>{selectedCourse.title}</span>
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: selectedCourse.status === "ACTIVE" ? "var(--green-d)" : "var(--amber-d)", color: selectedCourse.status === "ACTIVE" ? "var(--green)" : "var(--amber)" }}>{selectedCourse.status}</span>
              {selectedCourse.trainer && <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>Trainer: {selectedCourse.trainer.name}</span>}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>Updated: {fmtDate(selectedCourse.updatedAt)}</span>
              <button
                onClick={() => setCbOpen(true)}
                className="font-mono text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer"
                style={{ background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }}
              >📖 Open Curriculum Builder</button>
            </div>
          </div>
        </div>
      )}

      {!selectedCourse && (
        <div className="flex items-center justify-center py-16 font-mono text-[11px]" style={{ color: "var(--text3)" }}>
          Select a course above, then click "Open Curriculum Builder"
        </div>
      )}

      {/* Admin's Curriculum Builder Modal */}
      {token && selectedCourse && (
        <CurriculumBuilder
          open={cbOpen}
          courseId={selectedCourse.id}
          courseName={selectedCourse.title}
          courseCode={selectedCourse.code || selectedCourse.id.slice(0, 8)}
          token={token}
          onSave={handleSaveCurriculum}
          onClose={() => setCbOpen(false)}
        />
      )}
    </div>
  );
}
