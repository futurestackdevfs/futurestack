"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";

/* ── Types ── */
interface Course {
  id: string; title: string; category: string; skillLevel: string;
  mentorName?: string; price: number; status: string;
  _count?: { enrollments: number; sections: number };
  sections?: { _count: { videos: number } }[];
  totalLessons?: number; totalHours?: number;
  trainer?: { rating?: number };
}

interface Trainer {
  id: string; name: string; email: string; bio: string | null;
  yearsExperience: number | null; rating: number | null;
  approvalStatus: string; isActive: boolean;
  _count?: { coursesTaught: number };
  totalStudents?: number;
}

interface Stats {
  totalCourses: number; activeCourses: number; draftCourses: number;
  totalTrainers: number; pendingTrainers: number;
  totalStudents: number; totalEnrollments: number; activeEnrollments: number;
}

const BADGE_STYLES: Record<string, { bg: string; fg: string }> = {
  ACTIVE: { bg: "var(--green-d)", fg: "var(--green)" },
  DRAFT: { bg: "var(--amber-d)", fg: "var(--amber)" },
  ARCHIVED: { bg: "var(--red-d)", fg: "var(--red)" },
};

export default function TrainerDashboardContent() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const PER_PAGE = 7;

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    const q = searchQuery.toLowerCase();
    return courses.filter((c) => c.title.toLowerCase().includes(q));
  }, [courses, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedCourses = useMemo(() => {
    return filteredCourses.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE);
  }, [filteredCourses, safePage]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      opsFetch("/api/courses").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      opsFetch("/api/admin/trainers/approved").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      opsFetch("/api/admin/stats").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([coursesRes, trainersRes, statsRes]) => {
      if (cancelled) return;
      setCourses(Array.isArray(coursesRes) ? coursesRes : []);
      setTrainers(Array.isArray(trainersRes) ? trainersRes : []);
      if (statsRes && typeof statsRes.totalCourses === "number") setStats(statsRes);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  const kpi = useMemo(() => {
    const activeCourses = courses.filter((c) => c.status === "ACTIVE");
    const totalLessons = courses.reduce((sum, c) => sum + (c.totalLessons ?? 0), 0);
    const avgRating = trainers.length > 0
      ? (trainers.reduce((s, t) => s + (t.rating ?? 0), 0) / trainers.length).toFixed(1)
      : "—";
    const courseRatings = courses.map((c) => c.trainer?.rating).filter((r): r is number => r != null);
    const highestRating = courseRatings.length > 0 ? Math.max(...courseRatings).toFixed(1) : null;
    return {
      activeMentees: stats?.totalStudents ?? 0,
      avgRating,
      highestRating,
      activeBatches: activeCourses.length,
      completion: totalLessons > 0 ? Math.min(95, Math.round(((stats?.totalEnrollments ?? 0) / Math.max(totalLessons, 1)) * 100)) : 0,
    };
  }, [courses, trainers, stats]);

  const mentees = useMemo(() => {
    return trainers.slice(0, 5).map((t) => ({
      id: t.id,
      name: t.name,
      project: t.bio?.slice(0, 30) || "Training",
      status: t.approvalStatus === "APPROVED" ? "on track" : "needs review",
    }));
  }, [trainers]);

  const sessions = useMemo(() => {
    const activeCourses = courses.filter((c) => c.status === "ACTIVE").slice(0, 3);
    const days = ["mon", "tue", "wed", "thu", "fri"];
    return activeCourses.map((c, i) => ({
      id: c.id,
      topic: c.title,
      day: days[i % days.length],
      time: `${9 + i * 2}:00`,
      course: c.category || "General",
    }));
  }, [courses]);

  const batches = useMemo(() => {
    return courses.filter((c) => c.status === "ACTIVE").map((c) => ({
      id: c.id,
      code: c.title?.slice(0, 2).toUpperCase() + "-" + c.id?.slice(0, 4),
      name: c.title,
      enrolled: c._count?.enrollments ?? 0,
      modules: c._count?.sections ?? 0,
      lessons: c.totalLessons ?? 0,
    }));
  }, [courses]);

  if (loading) return (
    <div className="p-4 font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading trainer dashboard…</div>
  );

  return (
    <div className="p-4 pb-7">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
            Trainer / Mentor Responsibility
          </span>
          <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
            role::senior_trainer · {trainers.length} trainers · {courses.length} courses
          </span>
        </div>
        <div className="flex gap-1.5">
          <button className="font-mono text-[10.5px] font-semibold px-3 py-1.5 rounded cursor-pointer"
            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
          >↻ Refresh</button>
          <button className="font-mono text-[10.5px] font-semibold px-3 py-1.5 rounded cursor-pointer"
            style={{ background: "var(--orange)", color: "#fff", border: "none" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >+ Schedule Session</button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-6 rounded overflow-hidden mb-4" style={{ border: "1px solid var(--border)", background: "var(--border)", gap: 1 }}>
        <KPICell label="Total Courses" value={stats?.totalCourses ?? 0} delta={`${stats?.activeCourses ?? 0} active`} color="var(--purple)" />
        <KPICell label="Total Enrollments" value={stats?.totalEnrollments ?? 0} delta={`${stats?.activeEnrollments ?? 0} active`} color="var(--amber)" />
        <KPICell label="Active Mentees" value={kpi.activeMentees} delta="↑4 mo" deltaClass="up" color="var(--green)" />
        <KPICell label="Avg Rating" value={kpi.avgRating} delta={kpi.highestRating ? `Highest ${kpi.highestRating}` : "—"} color="var(--orange)" />
        <KPICell label="Active Batches" value={kpi.activeBatches} delta="running" color="var(--text)" />
        <KPICell label="Completion" value={`${kpi.completion}%`} delta="↑2pp mo" deltaClass="up" color="var(--green)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>

        {/* LEFT COL */}
        <div>
          {/* Course Enrollments */}
          <Panel title={
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>▤ Course Enrollments</span>
              <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: 6, fontSize: 9, color: "var(--text3)", pointerEvents: "none" }}>🔍</span>
                <input
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                  placeholder="Search…"
                  style={{
                    width: 100, fontSize: 10, padding: "2px 4px 2px 18px", border: "1px solid var(--border)",
                    background: "var(--surface)", color: "var(--text)", borderRadius: 3, outline: "none",
                  }}
                />
              </div>
            </div>
          } meta={`${filteredCourses.length} / ${courses.length} courses`}>
            <table className="w-full border-collapse" style={{ fontSize: 11 }}>
              <thead>
                <tr>{["Course", "Students", "Rating", "Status", "Price"].map((h) => (
                  <th key={h} className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5"
                    style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {paginatedCourses.map((c, idx) => {
                  const st = BADGE_STYLES[c.status] || BADGE_STYLES.DRAFT;
                  return (
                    <tr key={c.id}
                      style={{ background: idx % 2 === 0 ? "var(--surface)" : "var(--panel)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-h)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? "var(--surface)" : "var(--panel)"; }}
                    >
                      <td className="px-2.5 py-1.5 font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{c.title}</td>
                      <td className="px-2.5 py-1.5" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{c._count?.enrollments ?? 0}</td>
                      <td className="px-2.5 py-1.5" style={{ color: "var(--orange)", borderBottom: "1px solid var(--border)" }}>{c.trainer?.rating != null ? `★ ${c.trainer.rating.toFixed(1)}` : "—"}</td>
                      <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                        <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                          style={{ background: st.bg, color: st.fg }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.fg }} />
                          {c.status === "ACTIVE" ? "Active" : c.status === "DRAFT" ? "Draft" : c.status}
                        </span>
                      </td>
                      <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>₹{(c.price ?? 0).toLocaleString()}</td>
                    </tr>
                  );
                })}
                {paginatedCourses.length === 0 && (
                  <tr><td colSpan={5} className="font-mono text-[10.5px] py-2 text-center" style={{ color: "var(--text3)" }}>No courses found.</td></tr>
                )}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, paddingTop: 8, borderTop: "1px solid var(--border)", marginTop: 6 }}>
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}
                  style={{ fontSize: 10, padding: "1px 6px", border: "1px solid var(--border)", background: "var(--surface)", color: safePage === 0 ? "var(--text3)" : "var(--text)", borderRadius: 3, cursor: safePage === 0 ? "default" : "pointer" }}>◀</button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i} onClick={() => setPage(i)}
                    style={{
                      fontSize: 10, padding: "1px 6px", border: "1px solid var(--border)",
                      background: i === safePage ? "var(--orange)" : "var(--surface)",
                      color: i === safePage ? "#fff" : "var(--text2)", borderRadius: 3, cursor: "pointer",
                    }}>{i + 1}</button>
                ))}
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage === totalPages - 1}
                  style={{ fontSize: 10, padding: "1px 6px", border: "1px solid var(--border)", background: "var(--surface)", color: safePage === totalPages - 1 ? "var(--text3)" : "var(--text)", borderRadius: 3, cursor: safePage === totalPages - 1 ? "default" : "pointer" }}>▶</button>
              </div>
            )}
          </Panel>

          {/* Active Batches */}
          <Panel title="📅 Active Batches" meta={`${batches.length} running`} action={<button className="font-mono text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer" style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }} onClick={() => {}}>View All</button>}>
            <div>
              {batches.slice(0, 7).map((b) => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                  <div className="w-6 h-6 rounded flex items-center justify-center text-[11px] shrink-0" style={{ background: "var(--blue-d)", color: "var(--blue)" }}>📅</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{b.name}</div>
                    <div className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>{b.code} · {b.enrolled} students · {b.modules} modules</div>
                  </div>
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--green-d)", color: "var(--green)" }}>Running</span>
                </div>
              ))}
              {batches.length === 0 && (
                <div className="font-mono text-[10.5px] py-2" style={{ color: "var(--text3)" }}>No active batches.</div>
              )}
            </div>
          </Panel>
        </div>

        {/* RIGHT COL */}
        <div>
          {/* This Week's Sessions */}
          <Panel title="📅 This Week's Sessions">
            <div>
              {sessions.map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                  <div className="w-6 h-6 rounded flex items-center justify-center text-[11px] shrink-0" style={{ background: "var(--purple-d)", color: "var(--purple)" }}>
                    {s.topic.includes("React") ? "⚛" : s.topic.includes("REST") || s.topic.includes("API") ? "🔌" : "🔐"}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{s.topic}</div>
                    <div className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>{s.day} {s.time} · {s.course}</div>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="font-mono text-[10.5px] py-2" style={{ color: "var(--text3)" }}>No sessions scheduled.</div>
              )}
            </div>
          </Panel>

          {/* Active Mentees */}
          <Panel title="🛠 Active Mentees">
            <div>
              {mentees.map((m) => {
                const dotColor = m.status === "on track" ? "var(--green)" : "var(--amber)";
                const dotBg = m.status === "on track" ? "var(--green-d)" : "var(--amber-d)";
                return (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                    <div className="w-6 h-6 rounded flex items-center justify-center text-[11px] shrink-0" style={{ background: dotBg, color: dotColor }}>●</div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{m.name}</div>
                      <div className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>{m.project} · {m.status}</div>
                    </div>
                  </div>
                );
              })}
              {mentees.length === 0 && (
                <div className="font-mono text-[10.5px] py-2" style={{ color: "var(--text3)" }}>No active mentees.</div>
              )}
            </div>
          </Panel>
        </div>

      </div>
    </div>
  );
}

/* ── Sub-components ── */

function KPICell({ label, value, delta, deltaClass, color }: { label: string; value: string | number; delta: string; deltaClass?: string; color: string }) {
  return (
    <div style={{ background: "var(--surface)" }} className="px-3.5 py-2.5">
      <div className="font-mono text-[8.5px] uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>{label}</div>
      <div className="font-mono text-[19px] font-bold leading-none" style={{ color }}>{value}</div>
      <div className="font-mono text-[8.5px] mt-1" style={{ color: deltaClass === "up" ? "var(--green)" : deltaClass === "down" ? "var(--red)" : "var(--text3)" }}>{delta}</div>
    </div>
  );
}

function Panel({ title, meta, action, children }: { title: React.ReactNode; meta?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded overflow-hidden mb-3.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 13px", background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
        <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>{title}</span>
        <div className="flex items-center gap-2">
          {meta && <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{meta}</span>}
          {action}
        </div>
      </div>
      <div style={{ padding: "13px" }}>{children}</div>
    </div>
  );
}
