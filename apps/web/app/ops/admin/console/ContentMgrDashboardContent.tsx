"use client";

import { useState, useEffect, useMemo } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { TeamMembersPanel } from "./TeamMembersPanel";

interface Course {
  id: string;
  title: string;
  category: string | null;
  status: string;
  updatedAt: string;
  _count?: { enrollments: number; sections: number };
  totalLessons?: number;
  totalHours?: number;
  lastEditedBy?: { name: string; at: string } | null;
}

const STATUS_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  ACTIVE: { bg: "var(--green-d)", fg: "var(--green)", label: "Active" },
  DRAFT: { bg: "var(--amber-d)", fg: "var(--amber)", label: "Draft" },
  ARCHIVED: { bg: "var(--red-d)", fg: "var(--red)", label: "Archived" },
};

export default function ContentMgrDashboardContent({ onAddStaff, addLabel, searchQuery = "" }: { onAddStaff?: () => void; addLabel?: string; searchQuery?: string }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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
    const q = search.toLowerCase();
    const eq = searchQuery.toLowerCase().trim();
    if (!q && !eq) return courses;
    return courses.filter((c) => `${c.title} ${c.category ?? ""} ${c.status}`.toLowerCase().includes(q) || `${c.title} ${c.category ?? ""} ${c.status}`.toLowerCase().includes(eq));
  }, [courses, search, searchQuery]);

  const active = courses.filter((c) => c.status === "ACTIVE").length;
  const draft = courses.filter((c) => c.status === "DRAFT").length;
  const totalSections = courses.reduce((sum, c) => sum + (c._count?.sections ?? 0), 0);
  const totalLessons = courses.reduce((sum, c) => sum + (c.totalLessons ?? 0), 0);

  if (loading) return (
    <div className="p-4 font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading content overview…</div>
  );

  return (
    <div className="p-4 pb-7">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>📝 Content Manager</span>
          <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>role::content_manager · {courses.length} courses</span>
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
          <input placeholder="Search courses…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="font-mono text-[10.5px] px-2.5 py-1.5 rounded outline-none w-48"
            style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }} />
        </div>
      </div>

      <div className="grid grid-cols-4 rounded overflow-hidden mb-4" style={{ border: "1px solid var(--border)", background: "var(--border)", gap: 1 }}>
        {[
          { label: "Total Courses", value: courses.length, delta: `${totalSections} sections`, color: "var(--blue)" },
          { label: "Published", value: active, delta: courses.length > 0 ? `${Math.round(active / courses.length * 100)}% of total` : "—", color: "var(--green)" },
          { label: "Drafts", value: draft, delta: "in progress", color: "var(--amber)" },
          { label: "Total Lessons", value: totalLessons, delta: "videos + quizzes", color: "var(--purple)" },
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
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>📚 Courses</span>
          <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{filtered.length} items</span>
        </div>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr>{["Title", "Category", "Sections", "Lessons", "Status", "Last Updated", "Edited By"].map((h) => (
              <th key={h} className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5"
                style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map((c, idx) => {
              const st = STATUS_STYLES[c.status] || STATUS_STYLES.DRAFT;
              return (
                <tr key={c.id}
                  style={{ background: idx % 2 === 0 ? "var(--surface)" : "var(--panel)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-h)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? "var(--surface)" : "var(--panel)"; }}
                >
                  <td className="px-2.5 py-1.5 font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{c.title}</td>
                  <td className="px-2.5 py-1.5" style={{ color: "var(--blue)", borderBottom: "1px solid var(--border)" }}>{c.category ?? "—"}</td>
                  <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{c._count?.sections ?? 0}</td>
                  <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{c.totalLessons ?? 0}</td>
                  <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                      style={{ background: st.bg, color: st.fg }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.fg }} />
                      {st.label}
                    </span>
                  </td>
                  <td className="px-2.5 py-1.5 font-mono" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>
                    {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                    {c.lastEditedBy ? (
                      <div>
                        <div className="font-semibold" style={{ color: "var(--text)" }}>{c.lastEditedBy.name}</div>
                        <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>
                          {new Date(c.lastEditedBy.at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                    ) : (
                      <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="font-mono text-[10.5px] py-3 text-center" style={{ color: "var(--text3)" }}>No courses found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <TeamMembersPanel role="CONTENT_MANAGER" label="Content Manager" />
      </div>
    </div>
  );
}
