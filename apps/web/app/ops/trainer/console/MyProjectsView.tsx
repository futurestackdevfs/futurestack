"use client";

import { useState, useEffect } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { KpiRow, Panel, Th, Td, ViewHeader, Pill } from "../sections/ui";

interface TrainerProject {
  id: string;
  name: string;
  tech: string;
  category: string | null;
  level: string | null;
  status: string;
  price: number;
  enrolled: number;
  duration: string;
  updatedAt: string;
}

export default function MyProjectsView({ searchQuery, profileComplete = true, onNavigateProfile }: { searchQuery: string; profileComplete?: boolean; onNavigateProfile?: () => void }) {
  const [projects, setProjects] = useState<TrainerProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await opsFetch("/api/trainer/projects").then((r) => (r.ok ? r.json() : null));
        if (!cancelled) setProjects(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = searchQuery
    ? projects.filter((p) => [p.name, p.tech, p.category].some((v) => v?.toLowerCase().includes(searchQuery.toLowerCase())))
    : projects;

  const totalEnrolled = projects.reduce((s, p) => s + p.enrolled, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 font-mono text-[11px]" style={{ color: "var(--text3)" }}>
        Loading projects…
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="p-4 pb-7">
        <ViewHeader icon="📦" title="My Projects" meta={`role::trainer · 0 projects assigned`} />
        {!profileComplete && (
          <div className="mb-4 px-4 py-3 rounded-lg flex items-center gap-3" style={{ background: "linear-gradient(135deg, var(--amber-d), var(--orange-d))", border: "1px solid var(--amber)" }}>
            <span className="text-[20px]">⚠️</span>
            <div className="flex-1">
              <div className="text-[12px] font-bold" style={{ color: "var(--amber)" }}>Complete your profile first</div>
              <div className="text-[10.5px]" style={{ color: "var(--text3)" }}>Fill in at least 5 profile fields to unlock project management.</div>
            </div>
            {onNavigateProfile && (
              <button onClick={onNavigateProfile} className="shrink-0 px-3 py-1.5 rounded text-[10px] font-bold cursor-pointer" style={{ background: "var(--amber)", color: "#fff", border: "none" }}>Complete Profile →</button>
            )}
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-16 rounded" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="text-[28px] mb-3">📦</div>
          <div className="font-mono text-[12px] font-bold mb-1" style={{ color: "var(--text)" }}>No projects assigned yet</div>
          <div className="text-[11px]" style={{ color: "var(--text3)" }}>Please contact your content manager to add projects</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-7">
      <ViewHeader icon="📦" title="My Projects" meta={`role::trainer · ${projects.length} projects assigned`} />

      <KpiRow items={[
        { label: "Total Projects", value: projects.length, delta: `${projects.filter((p) => p.status === "ACTIVE").length} active`, color: "var(--purple)" },
        { label: "Total Enrolled", value: totalEnrolled, delta: `across all projects`, color: "var(--blue)" },
      ]} />

      <Panel title="📦 Assigned Projects" count={`${filtered.length} projects`}>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr>
              <Th>Project</Th><Th>Tech</Th><Th>Category</Th><Th>Level</Th>
              <Th>Enrolled</Th><Th>Duration</Th><Th>Status</Th><Th>Last Updated</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <Td color="var(--text)"><b>{p.name}</b></Td>
                <Td mono>{p.tech || "—"}</Td>
                <Td>{p.category || "—"}</Td>
                <Td>{p.level || "—"}</Td>
                <Td mono color="var(--text)">{p.enrolled}</Td>
                <Td mono>{p.duration || "—"}</Td>
                <Td><Pill value={p.status} /></Td>
                <Td mono>{p.updatedAt ? new Date(p.updatedAt).toISOString().slice(0, 16).replace("T", " ") : "—"}</Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center font-mono text-[11px] py-6" style={{ color: "var(--text3)" }}>No projects found</td></tr>
            )}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
