"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { loadStaffToken } from "@/app/auth/lib/token-store";
import { ViewHeader } from "../../sales/sections/ui";
import { ProjectCurriculumBuilder } from "../../admin/sections/ProjectCurriculumBuilder";

interface Project { id: string; name: string; status: string; trainerId: string | null; trainer?: { id: string; name: string }; updatedAt: string; }

function fmtDate(d: string) {
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ProjectBuilderView({ searchQuery, refreshSignal, onToast }: {
  searchQuery: string;
  refreshSignal?: number;
  onToast: (msg: string, type?: "success" | "danger") => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [trainers, setTrainers] = useState<{ id: string; name: string }[]>([]);
  const [trainerFilter, setTrainerFilter] = useState<string>("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [pbOpen, setPbOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    loadStaffToken().then(setToken).catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      opsFetch("/api/projects/admin/all"),
      opsFetch("/api/admin/trainers/approved"),
    ]).then(async ([pRes, tRes]) => {
      if (pRes.ok) { const d = await pRes.json(); setProjects(Array.isArray(d) ? d : []); }
      if (tRes.ok) { const d = await tRes.json(); setTrainers(Array.isArray(d) ? d : []); }
    }).catch(() => {});
  }, [refreshSignal]);

  const filteredProjects = useMemo(() => {
    let list = projects;
    if (trainerFilter) list = list.filter((p) => p.trainerId === trainerFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [projects, trainerFilter, searchQuery]);

  function handleSaveCurriculum() {
    onToast("Project curriculum saved", "success");
    setPbOpen(false);
    opsFetch("/api/projects/admin/all").then((r) => r.ok ? r.json() : []).then((data) => {
      if (Array.isArray(data)) setProjects(data);
    }).catch(() => {});
  }

  return (
    <div className="p-4 pb-7">
      <ViewHeader
        icon="🛠"
        title="Project Builder"
        meta={selectedProject ? `${selectedProject.name}` : "SELECT A PROJECT"}
      />

      {/* Trainer Filter */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="font-mono text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>Filter by Trainer</div>
          <select
            value={trainerFilter}
            onChange={(e) => { setTrainerFilter(e.target.value); setSelectedProject(null); }}
            className="w-full font-mono text-[11px] px-2.5 py-1.5 rounded outline-none"
            style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}>
            <option value="">All Trainers ({projects.length} projects)</option>
            {trainers.map((t) => {
              const count = projects.filter((p) => p.trainerId === t.id).length;
              return <option key={t.id} value={t.id}>{t.name} ({count} projects)</option>;
            })}
          </select>
        </div>
        <div className="rounded p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="font-mono text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>Select Project</div>
          <select
            value={selectedProject?.id || ""}
            onChange={(e) => {
              const p = projects.find((p) => p.id === e.target.value);
              setSelectedProject(p || null);
            }}
            className="w-full font-mono text-[11px] px-2.5 py-1.5 rounded outline-none"
            style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}>
            <option value="">— Choose a project —</option>
            {filteredProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.status}){p.trainer ? ` — ${p.trainer.name}` : ""}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Project Card */}
      {selectedProject && (
        <div className="rounded p-3 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-mono text-[11px] font-bold" style={{ color: "var(--text)" }}>{selectedProject.name}</span>
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: selectedProject.status === "ACTIVE" ? "var(--green-d)" : "var(--amber-d)", color: selectedProject.status === "ACTIVE" ? "var(--green)" : "var(--amber)" }}>{selectedProject.status}</span>
              {selectedProject.trainer && <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>Trainer: {selectedProject.trainer.name}</span>}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>Updated: {fmtDate(selectedProject.updatedAt)}</span>
              <button
                onClick={() => setPbOpen(true)}
                className="font-mono text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer"
                style={{ background: "var(--blue)", color: "#fff", border: "1px solid var(--blue)" }}
              >🛠 Open Curriculum Builder</button>
            </div>
          </div>
        </div>
      )}

      {!selectedProject && (
        <div className="flex items-center justify-center py-16 font-mono text-[11px]" style={{ color: "var(--text3)" }}>
          Select a project above, then click "Open Curriculum Builder"
        </div>
      )}

      {/* Admin's ProjectCurriculumBuilder Modal */}
      {token && selectedProject && (
        <ProjectCurriculumBuilder
          open={pbOpen}
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          token={token}
          onSave={handleSaveCurriculum}
          onClose={() => setPbOpen(false)}
        />
      )}
    </div>
  );
}
