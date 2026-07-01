"use client";

import { useState, useMemo } from "react";

const contentItems = [
  { id: 1, title: "React Hooks Deep Dive", course: "MERN Stack", type: "Video", status: "Published", updated: "2026-06-28", reviewer: "Aakash V." },
  { id: 2, title: "CRUD Operations in MongoDB", course: "MERN Stack", type: "Video + Lab", status: "Review", updated: "2026-06-27", reviewer: "—" },
  { id: 3, title: "Python OOP Concepts", course: "Python", type: "Video", status: "Draft", updated: "2026-06-26", reviewer: "—" },
  { id: 4, title: "NumPy & Arrays", course: "Data Science", type: "Video + Lab", status: "Published", updated: "2026-06-25", reviewer: "Dr. Mehta" },
  { id: 5, title: "Docker Compose Guide", course: "DevOps", type: "Article", status: "Review", updated: "2026-06-24", reviewer: "—" },
  { id: 6, title: "Flexbox & Grid Basics", course: "HTML & CSS", type: "Video", status: "Published", updated: "2026-06-23", reviewer: "Aakash V." },
  { id: 7, title: "Express.js REST API", course: "MERN Stack", type: "Video + Docs", status: "Draft", updated: "2026-06-22", reviewer: "—" },
];

export default function ContentMgrDashboardContent() {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search) return contentItems;
    const q = search.toLowerCase();
    return contentItems.filter((c) => Object.values(c).some((v) => String(v).toLowerCase().includes(q)));
  }, [search]);

  const pendingReview = contentItems.filter((c) => c.status === "Review").length;
  const published = contentItems.filter((c) => c.status === "Published").length;

  return (
    <div className="p-4 pb-7">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>📝 Content Manager</span>
          <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>role::content_manager · {pendingReview} pending reviews</span>
        </div>
        <input placeholder="Search content…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="font-mono text-[10.5px] px-2.5 py-1.5 rounded outline-none w-48"
          style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }} />
      </div>

      <div className="grid grid-cols-4 rounded overflow-hidden mb-4" style={{ border: "1px solid var(--border)", background: "var(--border)", gap: 1 }}>
        {[
          { label: "Total Assets", value: contentItems.length, delta: "across all courses", color: "var(--blue)" },
          { label: "Published", value: published, delta: `${Math.round(published / contentItems.length * 100)}% of total`, color: "var(--green)" },
          { label: "Pending Review", value: pendingReview, delta: "needs approval", color: "var(--orange)" },
          { label: "Drafts", value: contentItems.filter((c) => c.status === "Draft").length, delta: "in progress", color: "var(--amber)" },
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
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>📚 Content Assets</span>
          <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{filtered.length} items</span>
        </div>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr>{["Title", "Course", "Type", "Status", "Last Updated", "Reviewer", "Actions"].map((h) => (
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
                <td className="px-2.5 py-1.5" style={{ color: "var(--blue)", borderBottom: "1px solid var(--border)" }}>{c.course}</td>
                <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{c.type}</td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{
                      background: c.status === "Published" ? "var(--green-d)" : c.status === "Review" ? "var(--orange-d)" : "var(--blue-d)",
                      color: c.status === "Published" ? "var(--green)" : c.status === "Review" ? "var(--orange)" : "var(--blue)",
                    }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.status === "Published" ? "var(--green)" : c.status === "Review" ? "var(--orange)" : "var(--blue)" }} />
                    {c.status}
                  </span>
                </td>
                <td className="px-2.5 py-1.5 font-mono" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{c.updated}</td>
                <td className="px-2.5 py-1.5" style={{ color: c.reviewer === "—" ? "var(--text3)" : "var(--text2)", borderBottom: "1px solid var(--border)" }}>{c.reviewer}</td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex gap-1">
                    <button className="w-[22px] h-[22px] flex items-center justify-center rounded text-[11px] cursor-pointer"
                      style={{ color: "var(--text3)", border: "1px solid var(--border)", background: "var(--surface)" }}>✏</button>
                    <button className="w-[22px] h-[22px] flex items-center justify-center rounded text-[11px] cursor-pointer"
                      style={{ color: "var(--text3)", border: "1px solid var(--border)", background: "var(--surface)" }}>👁</button>
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
