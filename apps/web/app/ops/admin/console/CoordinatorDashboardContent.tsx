"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { TeamMembersPanel } from "./TeamMembersPanel";

interface DashboardKpi {
  totalStudents: number;
  activeBatches: number;
  totalEnrolled: number;
  revenueMtd: number;
  revenueDelta: number;
  pipeline: number;
  newLeadsWeek: number;
  conversionRate: number;
  pendingEscalations: number;
  trainerCount: number;
}

interface Batch {
  id: string;
  title: string;
  code: string | null;
  price: number;
  trainer: { id: string; name: string; email: string } | null;
  enrolledCount: number;
  activeStudents: number;
  totalSections: number;
  students: { id: string; name: string; email: string; enrolledAt: string; status: string }[];
}

interface Escalation {
  id: string;
  name: string;
  email: string;
  flag: string;
  note: string | null;
  flaggedAt: string | null;
  courses: string[];
}

interface Trainer {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  approvalStatus: string | null;
  totalCourses: number;
  totalStudents: number;
}

export default function CoordinatorDashboardContent({ onAddStaff, addLabel, searchQuery = "" }: { onAddStaff?: () => void; addLabel?: string; searchQuery?: string }) {
  const [kpi, setKpi] = useState<DashboardKpi | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [dashRes, batchRes, escRes, trainerRes] = await Promise.all([
        opsFetch("/api/coordinator/dashboard").then((r) => r.ok ? r.json() : null).catch(() => null),
        opsFetch("/api/coordinator/batches").then((r) => r.ok ? r.json() : null).catch(() => null),
        opsFetch("/api/coordinator/escalations").then((r) => r.ok ? r.json() : null).catch(() => null),
        opsFetch("/api/coordinator/trainers").then((r) => r.ok ? r.json() : null).catch(() => null),
      ]);
      if (dashRes?.kpi) setKpi(dashRes.kpi);
      if (Array.isArray(batchRes)) setBatches(batchRes);
      if (Array.isArray(escRes)) setEscalations(escRes);
      if (Array.isArray(trainerRes)) setTrainers(trainerRes);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    const q = (search + " " + searchQuery).trim().toLowerCase();
    if (!q) return batches;
    return batches.filter((b) =>
      [b.title, b.code, b.trainer?.name].some((v) => v && v.toLowerCase().includes(q))
    );
  }, [batches, search, searchQuery]);

  const totalStudents = batches.reduce((s, b) => s + b.enrolledCount, 0);
  const totalCapacity = batches.reduce((s, b) => s + b.activeStudents + 10, 0);

  if (loading) {
    return (
      <div className="p-4 pb-7">
        <div className="flex items-center justify-center py-20 font-mono text-[11px]" style={{ color: "var(--text3)" }}>
          Loading coordinator data…
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-7">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>🗂 Coordinator Dashboard</span>
          <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>role::coordinator · {batches.length} batches</span>
        </div>
        <div className="flex items-center gap-2">
          {onAddStaff && (
            <button
              onClick={onAddStaff}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
              style={{ background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >
              + Add {addLabel}
            </button>
          )}
          <input placeholder="Search batches…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="font-mono text-[10.5px] px-2.5 py-1.5 rounded outline-none w-48"
            style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }} />
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-5 rounded overflow-hidden mb-4" style={{ border: "1px solid var(--border)", background: "var(--border)", gap: 1 }}>
        {[
          { label: "Total Students", value: kpi?.totalStudents ?? totalStudents, delta: "active", color: "var(--blue)" },
          { label: "Active Batches", value: kpi?.activeBatches ?? batches.length, delta: `${kpi?.totalEnrolled ?? totalStudents} enrolled`, color: "var(--purple)" },
          { label: "Revenue MTD", value: `₹${(kpi?.revenueMtd ?? 0).toLocaleString("en-IN")}`, delta: `${kpi?.revenueDelta ?? 0}% vs last`, color: "var(--green)" },
          { label: "Escalations", value: kpi?.pendingEscalations ?? escalations.length, delta: "needs attention", color: "var(--red)" },
          { label: "Trainers", value: kpi?.trainerCount ?? trainers.length, delta: "active", color: "var(--amber)" },
        ].map((kpi, i) => (
          <div key={i} style={{ background: "var(--surface)" }} className="px-3.5 py-2.5">
            <div className="font-mono text-[8.5px] uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>{kpi.label}</div>
            <div className="font-mono text-[19px] font-bold leading-none" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="font-mono text-[8.5px] mt-0.5" style={{ color: "var(--text3)" }}>{kpi.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Batch Overview */}
        <div className="col-span-2 rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between px-3 py-2" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>📅 Batch Overview</span>
            <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{filtered.length} batches</span>
          </div>
          <table className="w-full border-collapse" style={{ fontSize: 11 }}>
            <thead>
              <tr>{["Course", "Trainer", "Enrolled", "Sections", "Status"].map((h) => (
                <th key={h} className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5"
                  style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.slice(0, 8).map((b, idx) => (
                <tr key={b.id}
                  style={{ background: idx % 2 === 0 ? "var(--surface)" : "var(--panel)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-h)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? "var(--surface)" : "var(--panel)"; }}
                >
                  <td className="px-2.5 py-1.5 font-mono font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>
                    <div>{b.title}</div>
                    {b.code && <div className="font-mono text-[8px]" style={{ color: "var(--text3)" }}>{b.code}</div>}
                  </td>
                  <td className="px-2.5 py-1.5" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{b.trainer?.name ?? "—"}</td>
                  <td className="px-2.5 py-1.5 font-mono font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{b.enrolledCount}</td>
                  <td className="px-2.5 py-1.5 font-mono" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{b.totalSections}</td>
                  <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                      style={{
                        background: b.activeStudents > 0 ? "var(--green-d)" : "var(--panel)",
                        color: b.activeStudents > 0 ? "var(--green)" : "var(--text3)",
                      }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: b.activeStudents > 0 ? "var(--green)" : "var(--text3)" }} />
                      {b.activeStudents > 0 ? "Active" : "Empty"}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center font-mono text-[11px] py-6" style={{ color: "var(--text3)" }}>No batches found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-3">
          {/* Escalations */}
          <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between px-3 py-2" style={{ background: "var(--red-d)", borderBottom: "1px solid var(--border)" }}>
              <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--red)" }}>🚩 Escalations</span>
              <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--red)", color: "#fff" }}>{escalations.length}</span>
            </div>
            <div className="p-2 space-y-1">
              {escalations.length === 0 ? (
                <div className="text-center font-mono text-[9.5px] py-3" style={{ color: "var(--text3)" }}>All clear!</div>
              ) : (
                escalations.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-center justify-between px-2 py-1.5 rounded" style={{ background: "var(--panel)" }}>
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold truncate" style={{ color: "var(--text)" }}>{e.name}</div>
                      <div className="font-mono text-[8px] truncate" style={{ color: "var(--text3)" }}>{e.flag} · {e.courses.join(", ") || "—"}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Trainer Summary */}
          <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between px-3 py-2" style={{ background: "var(--purple-d)", borderBottom: "1px solid var(--border)" }}>
              <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--purple)" }}>🧑‍🏫 Trainers</span>
              <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>{trainers.length}</span>
            </div>
            <div className="p-2 space-y-1">
              {trainers.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between px-2 py-1.5 rounded" style={{ background: "var(--panel)" }}>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold truncate" style={{ color: "var(--text)" }}>{t.name}</div>
                    <div className="font-mono text-[8px]" style={{ color: "var(--text3)" }}>{t.totalCourses} courses · {t.totalStudents} students</div>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.isActive ? "var(--green)" : "var(--red)" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <TeamMembersPanel role="COORDINATOR" label="Coordinator" />
      </div>
    </div>
  );
}
