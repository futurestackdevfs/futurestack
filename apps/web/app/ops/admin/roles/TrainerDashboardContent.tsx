"use client";

import { useState, useMemo } from "react";

const sessions = [
  { id: 1, course: "MERN Stack Development", batch: "BAT-MERN-WD-04", time: "10:00 AM — 12:00 PM", date: "2026-06-30", students: 24, status: "Upcoming" },
  { id: 2, course: "HTML & CSS Fundamentals", batch: "BAT-WEB-WE-05", time: "2:00 PM — 4:00 PM", date: "2026-06-30", students: 40, status: "Completed" },
  { id: 3, course: "Python Programming", batch: "BAT-PY-WE-02", time: "9:00 AM — 11:00 AM", date: "2026-07-01", students: 31, status: "Upcoming" },
  { id: 4, course: "MERN Stack Development", batch: "BAT-MERN-WD-04", time: "10:00 AM — 12:00 PM", date: "2026-07-02", students: 24, status: "Upcoming" },
];

export default function TrainerDashboardContent() {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search) return sessions;
    const q = search.toLowerCase();
    return sessions.filter((s) => Object.values(s).some((v) => String(v).toLowerCase().includes(q)));
  }, [search]);

  return (
    <div className="p-4 pb-7">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>🎓 Trainer Dashboard</span>
          <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>role::trainer · 3 active courses</span>
        </div>
        <input placeholder="Search sessions…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="font-mono text-[10.5px] px-2.5 py-1.5 rounded outline-none w-48"
          style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }} />
      </div>

      <div className="grid grid-cols-4 rounded overflow-hidden mb-4" style={{ border: "1px solid var(--border)", background: "var(--border)", gap: 1 }}>
        {[
          { label: "Active Courses", value: 3, delta: "this month", color: "var(--orange)" },
          { label: "Total Students", value: 119, delta: "across all batches", color: "var(--blue)" },
          { label: "Avg. Rating", value: "4.8 ⭐", delta: "from 87 reviews", color: "var(--purple)" },
          { label: "Pending Reviews", value: 4, delta: "needs attention", color: "var(--amber)" },
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
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>📅 Upcoming Sessions</span>
          <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{filtered.length} sessions</span>
        </div>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr>{["Course", "Batch", "Date", "Time", "Students", "Status", "Actions"].map((h) => (
              <th key={h} className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5"
                style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map((s, idx) => (
              <tr key={s.id}
                style={{ background: idx % 2 === 0 ? "var(--surface)" : "var(--panel)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-h)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? "var(--surface)" : "var(--panel)"; }}
              >
                <td className="px-2.5 py-1.5 font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{s.course}</td>
                <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{s.batch}</td>
                <td className="px-2.5 py-1.5 font-mono" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{s.date}</td>
                <td className="px-2.5 py-1.5" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{s.time}</td>
                <td className="px-2.5 py-1.5 font-mono font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{s.students}</td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{
                      background: s.status === "Upcoming" ? "var(--blue-d)" : "var(--green-d)",
                      color: s.status === "Upcoming" ? "var(--blue)" : "var(--green)",
                    }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.status === "Upcoming" ? "var(--blue)" : "var(--green)" }} />
                    {s.status}
                  </span>
                </td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <button className="w-[22px] h-[22px] flex items-center justify-center rounded text-[11px] cursor-pointer"
                    style={{ color: "var(--text3)", border: "1px solid var(--border)", background: "var(--surface)" }}>▶</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
