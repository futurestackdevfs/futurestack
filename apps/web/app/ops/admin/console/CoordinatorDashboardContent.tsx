"use client";

import { useState, useMemo } from "react";

const batches = [
  { id: 1, code: "BAT-MERN-WD-04", course: "MERN Stack", instructor: "Aakash Verma", students: 24, capacity: 30, status: "Running" },
  { id: 2, code: "BAT-PY-WE-02", course: "Python", instructor: "Priya Joshi", students: 31, capacity: 35, status: "Running" },
  { id: 3, code: "BAT-DS-WD-01", course: "Data Science", instructor: "Dr. Mehta", students: 16, capacity: 20, status: "Upcoming" },
  { id: 4, code: "BAT-WEB-WE-05", course: "HTML & CSS", instructor: "Aakash Verma", students: 40, capacity: 40, status: "Completed" },
  { id: 5, code: "BAT-DEVOPS-01", course: "Docker & K8s", instructor: "Rohit Singh", students: 12, capacity: 25, status: "Upcoming" },
];

export default function CoordinatorDashboardContent({ onAddStaff, addLabel, searchQuery = "" }: { onAddStaff?: () => void; addLabel?: string; searchQuery?: string }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const eq = searchQuery.toLowerCase().trim();
    if (!q && !eq) return batches;
    return batches.filter((b) => Object.values(b).some((v) => String(v).toLowerCase().includes(q) || String(v).toLowerCase().includes(eq)));
  }, [search, searchQuery]);

  const totalStudents = batches.reduce((s, b) => s + b.students, 0);
  const totalCapacity = batches.reduce((s, b) => s + b.capacity, 0);

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

      <div className="grid grid-cols-4 rounded overflow-hidden mb-4" style={{ border: "1px solid var(--border)", background: "var(--border)", gap: 1 }}>
        {[
          { label: "Active Batches", value: batches.filter((b) => b.status === "Running").length, delta: `${batches.length} total`, color: "var(--blue)" },
          { label: "Total Students", value: totalStudents, delta: `capacity: ${totalCapacity}`, color: "var(--orange)" },
          { label: "Fill Rate", value: `${Math.round(totalStudents / totalCapacity * 100)}%`, delta: `${batches.filter((b) => b.students < b.capacity).length} batches open`, color: "var(--green)" },
          { label: "Pending Alloc.", value: 3, delta: "needs attention", color: "var(--red)" },
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
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>📅 Batch Overview</span>
          <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{filtered.length} batches</span>
        </div>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr>{["Batch Code", "Course", "Instructor", "Students", "Capacity", "Status", "Actions"].map((h) => (
              <th key={h} className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5"
                style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map((b, idx) => (
              <tr key={b.id}
                style={{ background: idx % 2 === 0 ? "var(--surface)" : "var(--panel)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-h)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? "var(--surface)" : "var(--panel)"; }}
              >
                <td className="px-2.5 py-1.5 font-mono font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{b.code}</td>
                <td className="px-2.5 py-1.5" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{b.course}</td>
                <td className="px-2.5 py-1.5" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{b.instructor}</td>
                <td className="px-2.5 py-1.5 font-mono font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{b.students}</td>
                <td className="px-2.5 py-1.5 font-mono" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{b.capacity}</td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{
                      background: b.status === "Running" ? "var(--green-d)" : b.status === "Upcoming" ? "var(--blue-d)" : "var(--amber-d)",
                      color: b.status === "Running" ? "var(--green)" : b.status === "Upcoming" ? "var(--blue)" : "var(--amber)",
                    }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: b.status === "Running" ? "var(--green)" : b.status === "Upcoming" ? "var(--blue)" : "var(--amber)" }} />
                    {b.status}
                  </span>
                </td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex gap-1">
                    <button className="w-[22px] h-[22px] flex items-center justify-center rounded text-[11px] cursor-pointer"
                      style={{ color: "var(--text3)", border: "1px solid var(--border)", background: "var(--surface)" }}>✏</button>
                    <button className="w-[22px] h-[22px] flex items-center justify-center rounded text-[11px] cursor-pointer"
                      style={{ color: "var(--text3)", border: "1px solid var(--border)", background: "var(--surface)" }}>👥</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
