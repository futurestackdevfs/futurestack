"use client";

import { useState, useEffect, useMemo } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";

interface Course {
  id: string;
  title: string;
  category: string | null;
  status: string;
  trainer?: { name: string; rating?: number | null } | null;
  _count?: { enrollments: number };
}

export default function TrainerDashboardContent() {
  const [search, setSearch] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    opsFetch("/api/courses")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (!cancelled) setCourses(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setCourses([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!search) return courses;
    const q = search.toLowerCase();
    return courses.filter((c) => `${c.title} ${c.trainer?.name ?? ""}`.toLowerCase().includes(q));
  }, [courses, search]);

  const active = courses.filter((c) => c.status === "ACTIVE");
  const totalStudents = courses.reduce((sum, c) => sum + (c._count?.enrollments ?? 0), 0);
  const ratings = courses.map((c) => c.trainer?.rating).filter((r): r is number => r != null);
  const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "—";

  if (loading) return (
    <div className="p-4 font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading trainer dashboard…</div>
  );

  return (
    <div className="p-4 pb-7">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>🎓 Trainer Dashboard</span>
          <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>role::trainer · {active.length} active courses</span>
        </div>
        <input placeholder="Search courses…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="font-mono text-[10.5px] px-2.5 py-1.5 rounded outline-none w-48"
          style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }} />
      </div>

      <div className="grid grid-cols-4 rounded overflow-hidden mb-4" style={{ border: "1px solid var(--border)", background: "var(--border)", gap: 1 }}>
        {[
          { label: "Active Courses", value: active.length, delta: `${courses.length} total`, color: "var(--orange)" },
          { label: "Total Students", value: totalStudents, delta: "across all courses", color: "var(--blue)" },
          { label: "Avg. Rating", value: avgRating === "—" ? avgRating : `★ ${avgRating}`, delta: ratings.length > 0 ? `${ratings.length} rated` : "no reviews yet", color: "var(--purple)" },
          { label: "Drafts", value: courses.filter((c) => c.status === "DRAFT").length, delta: "not yet live", color: "var(--amber)" },
        ].map((kpi, i) => (
          <div key={i} style={{ background: "var(--surface)" }} className="px-3.5 py-2.5">
            <div className="font-mono text-[8.5px] uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>{kpi.label}</div>
            <div className="font-mono text-[19px] font-bold leading-none" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="font-mono text-[8.5px] mt-0.5" style={{ color: "var(--text3)" }}>{kpi.delta}</div>
          </div>
        ))}
      </div>

      <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-3 py-2" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>📚 Active Courses</span>
          <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{filtered.length} courses</span>
        </div>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr>{["Course", "Trainer", "Students", "Status"].map((h) => (
              <th key={h} className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5"
                style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map((c, idx) => (
              <tr key={c.id}
                style={{ background: idx % 2 === 0 ? "var(--surface)" : "var(--panel)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-h)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? "var(--surface)" : "var(--panel)"; }}
              >
                <td className="px-2.5 py-1.5 font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{c.title}</td>
                <td className="px-2.5 py-1.5" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{c.trainer?.name ?? "—"}</td>
                <td className="px-2.5 py-1.5 font-mono font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{c._count?.enrollments ?? 0}</td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{
                      background: c.status === "ACTIVE" ? "var(--green-d)" : "var(--amber-d)",
                      color: c.status === "ACTIVE" ? "var(--green)" : "var(--amber)",
                    }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.status === "ACTIVE" ? "var(--green)" : "var(--amber)" }} />
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="font-mono text-[10.5px] py-3 text-center" style={{ color: "var(--text3)" }}>No courses found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
