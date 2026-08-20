"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import type { CoordinatorTrainer } from "../lib/types";
import { KpiRow, Panel, Th, Td, Pill, ViewHeader } from "../sections/ui";

export default function TrainerActivityView({ searchQuery, refreshSignal, onToast }: {
  searchQuery: string;
  refreshSignal?: number;
  onToast: (msg: string, type?: "success" | "danger") => void;
}) {
  const [trainers, setTrainers] = useState<CoordinatorTrainer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrainers = useCallback(async () => {
    try {
      const r = await opsFetch("/api/coordinator/trainers");
      if (!r.ok) throw new Error(`Failed to load trainers (${r.status})`);
      const data = await r.json();
      setTrainers(Array.isArray(data) ? data : []);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Failed to load trainers", "danger");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => { loadTrainers(); }, [refreshSignal, loadTrainers]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return trainers;
    return trainers.filter((t) =>
      [t.name, t.email].some((v) => v.toLowerCase().includes(q))
    );
  }, [trainers, searchQuery]);

  const totalStudents = trainers.reduce((s, t) => s + t.totalStudents, 0);
  const totalCourses = trainers.reduce((s, t) => s + t.totalCourses, 0);
  const activeTrainers = trainers.filter((t) => t.isActive).length;

  if (loading) return <div className="flex items-center justify-center h-full font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading trainers…</div>;

  return (
    <div className="p-4">
      <ViewHeader
        icon="🧑‍🏫"
        title="Trainer Activity"
        meta={`${trainers.length} TRAINERS · READ-ONLY`}
      />

      <KpiRow items={[
        { label: "Total Trainers", value: trainers.length, delta: `${activeTrainers} active`, color: "var(--purple)" },
        { label: "Total Courses", value: totalCourses, delta: "assigned", color: "var(--blue)" },
        { label: "Total Students", value: totalStudents, delta: "across all courses", color: "var(--green)" },
      ]} />

      <Panel title="Trainer Activity" count={`${filtered.length} TRAINERS`}>
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>No trainers found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Trainer</Th><Th>Status</Th><Th>Approval</Th>
                  <Th>Courses</Th><Th>Students</Th><Th>Rating</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr key={t.id} style={{ background: i % 2 === 0 ? "var(--surface)" : "var(--panel)" }}>
                    <Td>
                      <div className="font-semibold" style={{ color: "var(--text)" }}>{t.name}</div>
                      <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{t.email}</div>
                    </Td>
                    <Td>
                      <span className="font-mono text-[8px] px-1 rounded" style={{
                        background: t.isActive ? "var(--green-d)" : "var(--red-d)",
                        color: t.isActive ? "var(--green)" : "var(--red)",
                      }}>{t.isActive ? "ACTIVE" : "INACTIVE"}</span>
                    </Td>
                    <Td><Pill value={t.approvalStatus ?? "PENDING"} /></Td>
                    <Td mono color="var(--text)">{t.totalCourses}</Td>
                    <Td mono color="var(--blue)">{t.totalStudents}</Td>
                    <Td mono>{t.rating ? `${t.rating.toFixed(1)} ★` : "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
