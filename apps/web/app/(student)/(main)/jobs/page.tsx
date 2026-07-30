"use client";

import { useState } from "react";

const jobs = [
  { title: "Full Stack Developer", company: "TechCorp India", location: "Bangalore", salary: "₹12-18 LPA", type: "Full-time", skills: ["MERN", "React", "Node.js"], color: "#2563eb", posted: "2d ago", applicants: 47 },
  { title: "Python Developer", company: "DataMinds Pvt Ltd", location: "Hyderabad", salary: "₹10-15 LPA", type: "Full-time", skills: ["Python", "Django", "SQL"], color: "#16a34a", posted: "3d ago", applicants: 32 },
  { title: "DevOps Engineer", company: "CloudBase Solutions", location: "Pune", salary: "₹14-20 LPA", type: "Full-time", skills: ["Docker", "K8s", "AWS"], color: "#ef4444", posted: "1d ago", applicants: 18 },
  { title: "ML Engineer", company: "AI Labs Inc", location: "Remote", salary: "₹18-25 LPA", type: "Remote", skills: ["ML", "Python", "TensorFlow"], color: "#7c3aed", posted: "5d ago", applicants: 53 },
  { title: "Frontend Developer", company: "WebStudio Agency", location: "Mumbai", salary: "₹8-14 LPA", type: "Full-time", skills: ["React", "CSS", "TypeScript"], color: "#f59e0b", posted: "Today", applicants: 12 },
  { title: "Data Analyst", company: "Insight Analytics", location: "Delhi", salary: "₹7-12 LPA", type: "Internship", skills: ["SQL", "Python", "Tableau"], color: "#14b8a6", posted: "4d ago", applicants: 28 },
  { title: "Backend Developer", company: "ServerStack Tech", location: "Bangalore", salary: "₹15-22 LPA", type: "Full-time", skills: ["Node.js", "PostgreSQL", "Redis"], color: "#3b82f6", posted: "1w ago", applicants: 41 },
  { title: "Cloud Architect", company: "NetSolutions Ltd", location: "Chennai", salary: "₹20-30 LPA", type: "Full-time", skills: ["AWS", "Azure", "Terraform"], color: "#f97316", posted: "6d ago", applicants: 15 },
  { title: "UI/UX Designer", company: "DesignCraft Studio", location: "Remote", salary: "₹10-16 LPA", type: "Full-time", skills: ["Figma", "UI Design", "Prototyping"], color: "#ec4899", posted: "2d ago", applicants: 22 },
  { title: "React Native Dev", company: "AppForge Labs", location: "Bangalore", salary: "₹12-19 LPA", type: "Full-time", skills: ["React Native", "JS", "Firebase"], color: "#06b6d4", posted: "1w ago", applicants: 19 },
  { title: "Cybersecurity Analyst", company: "SecureShield Inc", location: "Gurgaon", salary: "₹11-17 LPA", type: "Full-time", skills: ["Network Security", "Kali Linux", "SIEM"], color: "#dc2626", posted: "3d ago", applicants: 9 },
  { title: "Product Manager", company: "GrowthX", location: "Mumbai", salary: "₹18-28 LPA", type: "Full-time", skills: ["Product Strategy", "Analytics", "Agile"], color: "#8b5cf6", posted: "Today", applicants: 34 },
];

const allSkills = [...new Set(jobs.flatMap((j) => j.skills))].sort();

export default function JobsPage() {
  const [search, setSearch] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>("");

  const filtered = jobs.filter((j) => {
    if (search && !j.title.toLowerCase().includes(search.toLowerCase()) && !j.company.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedType && j.type !== selectedType) return false;
    if (selectedSkills.length && !selectedSkills.some((s) => j.skills.includes(s))) return false;
    return true;
  });

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 25% 50%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 75% 50%, #16a34a 0%, transparent 50%)" }} />
        <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            {/* Left */}
            <div className="md:max-w-lg">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-0.5 text-[9px] font-semibold" style={{ background: "rgba(255,255,255,.05)", color: "#94a3b8" }}>
                <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                2,000+ hiring partners
              </div>
              <h1 className="mb-1.5 font-['Syne'] text-xl font-extrabold md:text-2xl" style={{ color: "#f1f5f9" }}>
                Find Your <span style={{ background: "linear-gradient(135deg, #3b82f6, #22c55e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Dream Job</span>
              </h1>
              <p className="mb-3 text-[12px]" style={{ color: "#94a3b8" }}>Exclusive opportunities from 2,000+ hiring partners</p>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-1.5" style={{ background: "rgba(255,255,255,.06)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" className="size-4 shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs, companies..." className="w-full bg-transparent py-1 text-[13px] outline-none" style={{ color: "#f1f5f9" }} />
              </div>
            </div>

            {/* Right — Stats */}
            <div className="grid grid-cols-3 gap-2 shrink-0">
              {[
                { num: "2K+", label: "Hiring Partners" },
                { num: "85%", label: "Placement Rate" },
                { num: "₹12L", label: "Avg. Salary" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-white/5 px-3 py-2 text-center min-w-[100px]" style={{ background: "rgba(255,255,255,.03)" }}>
                  <div className="text-base font-extrabold" style={{ color: "#f1f5f9" }}>{s.num}</div>
                  <div className="text-[9px] font-medium" style={{ color: "#64748b" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content — Left Filter + Right Results */}
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6">
        {/* Left Panel — Filters */}
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-[72px] space-y-5 rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Type</span>
                {selectedType && (
                  <button onClick={() => setSelectedType("")} className="text-[9px] font-semibold" style={{ color: "var(--blue)" }}>Clear</button>
                )}
              </div>
              <div className="space-y-1">
                {["", "Full-time", "Internship", "Remote"].map((t) => (
                  <button key={t} onClick={() => setSelectedType(t === selectedType ? "" : t)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition-all"
                    style={{
                      background: selectedType === t ? "var(--blue-dim)" : "transparent",
                      color: selectedType === t ? "var(--blue)" : "var(--text2)",
                    }}
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded border text-[8px] font-bold" style={{
                      borderColor: selectedType === t ? "var(--blue)" : "var(--border)",
                      background: selectedType === t ? "var(--blue)" : "transparent",
                      color: selectedType === t ? "#fff" : "transparent",
                    }}>✓</span>
                    {t || "All"}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t" style={{ borderColor: "var(--border)" }} />

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Skills</span>
                {selectedSkills.length > 0 && (
                  <button onClick={() => setSelectedSkills([])} className="text-[9px] font-semibold" style={{ color: "var(--blue)" }}>Clear</button>
                )}
              </div>
              <div className="max-h-[160px] space-y-1 overflow-y-auto pr-1 scrollbar-thin" style={{ scrollbarWidth: "thin" }}>
                {allSkills.slice(0, 4).map((s) => (
                  <button key={s} onClick={() => toggleSkill(s)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition-all"
                    style={{
                      background: selectedSkills.includes(s) ? "var(--orange-d)" : "transparent",
                      color: selectedSkills.includes(s) ? "var(--orange)" : "var(--text2)",
                    }}
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded border text-[8px] font-bold" style={{
                      borderColor: selectedSkills.includes(s) ? "var(--orange)" : "var(--border)",
                      background: selectedSkills.includes(s) ? "var(--orange)" : "transparent",
                      color: selectedSkills.includes(s) ? "#fff" : "transparent",
                    }}>✓</span>
                    {s}
                  </button>
                ))}
              </div>
              {allSkills.length > 4 && (
                <div className="mt-1 text-center">
                  <span className="text-[9px] font-semibold" style={{ color: "var(--text3)" }}>
                    +{allSkills.length - 4} more — scroll ↓
                  </span>
                </div>
              )}
            </div>

            <div className="border-t" style={{ borderColor: "var(--border)" }} />

            <button onClick={() => { setSearch(""); setSelectedSkills([]); setSelectedType(""); }}
              className="w-full rounded-lg py-2 text-[11px] font-bold transition-all hover:opacity-80"
              style={{ background: "var(--bg)", color: "var(--text2)" }}
            >Reset Filters</button>
          </div>
        </aside>

        {/* Right Panel — Results */}
        <div className="flex-1 min-w-0">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[12px] font-semibold" style={{ color: "var(--muted)" }}>{filtered.length} job{filtered.length !== 1 ? "s" : ""} found</span>
            <button onClick={() => { setSearch(""); setSelectedSkills([]); setSelectedType(""); }}
              className="text-[11px] font-semibold underline-offset-2 hover:underline md:hidden" style={{ color: "var(--blue)" }}
            >Clear filters</button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((j) => (
              <div key={`${j.title}-${j.company}`} className="group relative overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-1" style={{ borderColor: "var(--border)", background: "var(--card)", boxShadow: "var(--shadow)" }}>
                <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${j.color}, ${j.color}80)` }} />
                <div className="p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold text-white shadow-lg transition-transform duration-300 group-hover:scale-110" style={{ background: `linear-gradient(135deg, ${j.color}, ${j.color}cc)` }}>
                        {j.title[0]}
                      </div>
                      <div>
                        <div className="text-[14px] font-bold" style={{ color: "var(--text)" }}>{j.title}</div>
                        <div className="flex items-center gap-1 text-[11px]" style={{ color: "var(--muted)" }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                          {j.company}
                        </div>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium" style={{ background: "var(--bg)", color: "var(--muted)" }}>{j.posted}</span>
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="flex items-center gap-1 rounded-md px-2 py-1 font-extrabold" style={{ background: "var(--orange-d)", color: "var(--orange)" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      {j.salary}
                    </span>
                    <span className="flex items-center gap-1" style={{ color: "var(--muted)" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {j.location}
                    </span>
                    <span className="flex items-center gap-1" style={{ color: "var(--muted)" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                      {j.type}
                    </span>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {j.skills.map((s) => (
                      <span key={s} className="rounded-md px-2 py-0.5 text-[10px] font-semibold transition-all" style={{ background: `${j.color}14`, color: j.color }}>{s}</span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[10px]" style={{ color: "var(--muted)" }}>
                    <span>{j.applicants} applicants</span>
                    <div className="flex gap-2">
                      <button className="rounded-lg px-4 py-1.5 text-[11px] font-bold text-white transition-all hover:opacity-90" style={{ background: "var(--blue)" }}>Apply</button>
                      <button className="rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all hover:border-[var(--orange)]" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="py-20 text-center">
              <div className="mb-3 text-3xl">🔍</div>
              <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>No jobs match your filters</div>
              <button onClick={() => { setSearch(""); setSelectedSkills([]); setSelectedType(""); }} className="mt-2 text-[12px] font-semibold underline-offset-2 hover:underline" style={{ color: "var(--blue)" }}>Clear all filters</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
