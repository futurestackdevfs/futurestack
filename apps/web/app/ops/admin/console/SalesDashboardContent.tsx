"use client";

import { useState, useMemo } from "react";

const leads = [
  { id: 1, name: "Rahul Sharma", course: "MERN Stack", source: "Website", status: "Hot", date: "2026-06-28", value: 45000 },
  { id: 2, name: "Priya Patel", course: "Data Science", source: "Referral", status: "Warm", date: "2026-06-27", value: 60000 },
  { id: 3, name: "Amit Singh", course: "Python", source: "LinkedIn", status: "Cold", date: "2026-06-26", value: 25000 },
  { id: 4, name: "Sneha Reddy", course: "DevOps", source: "Website", status: "Hot", date: "2026-06-25", value: 55000 },
  { id: 5, name: "Vikram Joshi", course: "MERN Stack", source: "Walk-in", status: "Warm", date: "2026-06-24", value: 45000 },
];

export default function SalesDashboardContent() {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search) return leads;
    const q = search.toLowerCase();
    return leads.filter((l) => Object.values(l).some((v) => String(v).toLowerCase().includes(q)));
  }, [search]);

  const hotLeads = leads.filter((l) => l.status === "Hot").length;
  const totalValue = leads.reduce((s, l) => s + l.value, 0);

  return (
    <div className="p-4 pb-7">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>📞 Sales Dashboard</span>
          <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>role::sales_exec · {hotLeads} hot leads</span>
        </div>
        <input placeholder="Search leads…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="font-mono text-[10.5px] px-2.5 py-1.5 rounded outline-none w-48"
          style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }} />
      </div>

      <div className="grid grid-cols-4 rounded overflow-hidden mb-4" style={{ border: "1px solid var(--border)", background: "var(--border)", gap: 1 }}>
        {[
          { label: "Active Leads", value: leads.length, delta: `${hotLeads} hot`, color: "var(--orange)" },
          { label: "Pipeline Value", value: `₹${(totalValue / 1000).toFixed(0)}K`, delta: "this month", color: "var(--blue)" },
          { label: "Conversion Rate", value: "24%", delta: "12 converted", color: "var(--green)" },
          { label: "Avg. Deal Size", value: `₹${(totalValue / leads.length / 1000).toFixed(1)}K`, delta: "this quarter", color: "var(--purple)" },
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
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>📋 Lead Pipeline</span>
          <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{filtered.length} leads</span>
        </div>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr>{["Name", "Course", "Source", "Status", "Date", "Value", "Actions"].map((h) => (
              <th key={h} className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5"
                style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map((lead, idx) => (
              <tr key={lead.id}
                style={{ background: idx % 2 === 0 ? "var(--surface)" : "var(--panel)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-h)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? "var(--surface)" : "var(--panel)"; }}
              >
                <td className="px-2.5 py-1.5 font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{lead.name}</td>
                <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: "var(--blue)", borderBottom: "1px solid var(--border)" }}>{lead.course}</td>
                <td className="px-2.5 py-1.5" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{lead.source}</td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{
                      background: lead.status === "Hot" ? "var(--red-d)" : lead.status === "Warm" ? "var(--amber-d)" : "var(--blue-d)",
                      color: lead.status === "Hot" ? "var(--red)" : lead.status === "Warm" ? "var(--amber)" : "var(--blue)",
                    }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: lead.status === "Hot" ? "var(--red)" : lead.status === "Warm" ? "var(--amber)" : "var(--blue)" }} />
                    {lead.status}
                  </span>
                </td>
                <td className="px-2.5 py-1.5 font-mono" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{lead.date}</td>
                <td className="px-2.5 py-1.5 font-mono font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>₹{lead.value.toLocaleString()}</td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex gap-1">
                    <button className="w-[22px] h-[22px] flex items-center justify-center rounded text-[11px] cursor-pointer"
                      style={{ color: "var(--text3)", border: "1px solid var(--border)", background: "var(--surface)" }}>📞</button>
                    <button className="w-[22px] h-[22px] flex items-center justify-center rounded text-[11px] cursor-pointer"
                      style={{ color: "var(--text3)", border: "1px solid var(--border)", background: "var(--surface)" }}>✏</button>
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
