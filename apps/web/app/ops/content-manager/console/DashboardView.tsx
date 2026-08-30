"use client";

import { ViewHeader, KpiRow } from "../../sales/sections/ui";

interface Props {
  stats: {
    totalCourses: number;
    activeCourses: number;
    draftCourses: number;
    totalProjects: number;
    activeProjects: number;
    totalTrainers: number;
    pendingTrainers: number;
    totalEnrollments: number;
    totalResources: number;
  } | null;
  onRefresh: () => void;
  onNavigate: (view: string) => void;
}

export default function DashboardView({ stats, onRefresh, onNavigate }: Props) {
  const s = stats ?? { totalCourses: 0, activeCourses: 0, draftCourses: 0, totalProjects: 0, activeProjects: 0, totalTrainers: 0, pendingTrainers: 0, totalEnrollments: 0, totalResources: 0 };

  return (
    <div className="p-4 pb-7">
      <ViewHeader
        icon="📊"
        title="Content Dashboard"
        meta="OVERVIEW · LIVE"
        action={
          <button onClick={onRefresh}
            className="font-mono text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer"
            style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}>
            ↻ Refresh
          </button>
        }
      />

      <KpiRow items={[
        { label: "Total Courses", value: s.totalCourses, delta: `${s.activeCourses} active · ${s.draftCourses} draft`, color: "var(--blue)" },
        { label: "Projects", value: s.totalProjects, delta: `${s.activeProjects} active`, color: "var(--purple)" },
        { label: "Trainers", value: s.totalTrainers, delta: `${s.pendingTrainers} pending approval`, color: "var(--amber)" },
        { label: "Enrollments", value: s.totalEnrollments, delta: "all time", color: "var(--green)" },
      ]} />

      {/* Quick Actions */}
      <div className="rounded overflow-hidden mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="px-3 py-2" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>⚡ Quick Actions</span>
        </div>
        <div className="p-3 flex flex-wrap gap-2">
          {[
            { label: "🗄 Master Data", view: "master-data", color: "var(--amber)" },
            { label: "📖 Course Builder", view: "curriculum", color: "var(--green)" },
            { label: "📦 Resources", view: "resources", color: "var(--amber)" },
            { label: "👨‍🏫 Trainer Approvals", view: "trainer-approvals", color: "var(--red)", badge: s.pendingTrainers },
          ].map((a) => (
            <button
              key={a.view}
              onClick={() => onNavigate(a.view)}
              className="flex items-center gap-2 font-mono text-[10.5px] font-bold px-3 py-2 rounded cursor-pointer"
              style={{ border: `1px solid ${a.color}`, color: a.color, background: "var(--surface)" }}
            >
              {a.label}
              {a.badge && a.badge > 0 && (
                <span className="font-mono text-[8px] font-bold px-1 py-0.5 rounded" style={{ background: "var(--red-d)", color: "var(--red)" }}>{a.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Pending Trainers Alert */}
      {s.pendingTrainers > 0 && (
        <div className="rounded overflow-hidden mb-4" style={{ background: "var(--surface)", border: "1px solid var(--amber)" }}>
          <div className="px-3 py-2 flex items-center justify-between" style={{ background: "var(--amber-d)" }}>
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--amber)" }}>⚠ Pending Trainer Approvals</span>
            <button
              onClick={() => onNavigate("trainer-approvals")}
              className="font-mono text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer"
              style={{ border: "1px solid var(--amber)", color: "var(--amber)", background: "var(--surface)" }}
            >
              VIEW ALL →
            </button>
          </div>
          <div className="p-3 font-mono text-[11px]" style={{ color: "var(--text2)" }}>
            {s.pendingTrainers} trainer{s.pendingTrainers !== 1 ? "s" : ""} waiting for approval
          </div>
        </div>
      )}

      {/* Course Status Breakdown */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Active Courses", value: s.activeCourses, color: "var(--green)", icon: "✅" },
          { label: "Draft Courses", value: s.draftCourses, color: "var(--amber)", icon: "📝" },
          { label: "Total Resources", value: s.totalResources, color: "var(--blue)", icon: "📦" },
        ].map((item) => (
          <div key={item.label} className="rounded px-3.5 py-2.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-1">
              <span>{item.icon}</span>
              <span className="font-mono text-[8.5px] uppercase tracking-wider" style={{ color: "var(--text3)" }}>{item.label}</span>
            </div>
            <div className="font-mono text-[22px] font-bold" style={{ color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
