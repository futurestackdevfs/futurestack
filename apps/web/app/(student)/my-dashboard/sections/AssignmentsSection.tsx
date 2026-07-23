"use client";

import { useState } from "react";

const assignments = [
  { id: 1, course: "MERN Stack Development", emoji: "⚛️", bg: "linear-gradient(135deg,#0d1f3c,#0a2a1a)", title: "Module 11 Lab — Express.js REST API Build", tags: [{ cls: "bg-[rgba(220,38,38,.1)] text-[#dc2626]", lbl: "Overdue · 3 days" }], meta: ["💻 Coding Lab", "⚡ 40 XP"], pct: 60, pctColor: "linear-gradient(90deg,var(--orange),var(--orange2))", dueLabel: "Was due", dueVal: "Jun 13", dueCls: "text-[#dc2626]", actions: [{ cls: "bg-[var(--orange)] text-white shadow-[0_2px_8px_rgba(240,90,26,.3)] hover:bg-[var(--orange2)]", lbl: "Submit Now" }, { cls: "bg-transparent text-[var(--text2)] border border-[var(--border2)] hover:border-[var(--blue)] hover:text-[var(--blue)]", lbl: "View" }], border: "border-l-[3px] border-l-[#dc2626]" },
  { id: 2, course: "Python Programming", emoji: "🐍", bg: "linear-gradient(135deg,#1a1a0d,#0d1a2e)", title: "Chapter 5 Quiz — OOP Concepts", tags: [{ cls: "bg-[rgba(220,38,38,.1)] text-[#dc2626]", lbl: "Overdue · 1 day" }], meta: ["📝 Quiz · 20 questions", "⚡ 25 XP"], pct: 0, pctColor: "linear-gradient(90deg,var(--orange),var(--orange2))", dueLabel: "Was due", dueVal: "Jun 15", dueCls: "text-[#dc2626]", actions: [{ cls: "bg-[var(--orange)] text-white shadow-[0_2px_8px_rgba(240,90,26,.3)] hover:bg-[var(--orange2)]", lbl: "Start Quiz" }, { cls: "bg-transparent text-[var(--text2)] border border-[var(--border2)] hover:border-[var(--blue)] hover:text-[var(--blue)]", lbl: "View" }], border: "border-l-[3px] border-l-[#dc2626]" },
  { id: 3, course: "Data Science & AI", emoji: "🧠", bg: "linear-gradient(135deg,#0d0d2e,#1a0d2e)", title: "NumPy Arrays — Practice Set 2", tags: [{ cls: "bg-[rgba(220,38,38,.1)] text-[#dc2626]", lbl: "Overdue · 2 days" }], meta: ["💻 Notebook", "⚡ 30 XP"], pct: 35, pctColor: "linear-gradient(90deg,#dc2626,#f87171)", dueLabel: "Was due", dueVal: "Jun 14", dueCls: "text-[#dc2626]", actions: [{ cls: "bg-[var(--orange)] text-white shadow-[0_2px_8px_rgba(240,90,26,.3)] hover:bg-[var(--orange2)]", lbl: "Submit Now" }, { cls: "bg-transparent text-[var(--text2)] border border-[var(--border2)] hover:border-[var(--blue)] hover:text-[var(--blue)]", lbl: "View" }], border: "border-l-[3px] border-l-[#dc2626]" },
  { id: 4, course: "MERN Stack Development", emoji: "⚛️", bg: "linear-gradient(135deg,#0d1f3c,#0a2a1a)", title: "React Hooks Deep Dive — Lab Exercise", tags: [{ cls: "bg-[var(--orange-d)] text-[var(--orange)]", lbl: "Due Today · 11:59 PM" }], meta: ["💻 Coding Lab", "⚡ 50 XP"], pct: 80, pctColor: "linear-gradient(90deg,var(--orange),var(--orange2))", dueLabel: "Due", dueVal: "Today", dueCls: "text-[var(--orange)]", actions: [{ cls: "bg-[var(--orange)] text-white shadow-[0_2px_8px_rgba(240,90,26,.3)] hover:bg-[var(--orange2)]", lbl: "Continue →" }, { cls: "bg-transparent text-[var(--text2)] border border-[var(--border2)] hover:border-[var(--blue)] hover:text-[var(--blue)]", lbl: "View" }], border: "border-l-[3px] border-l-[var(--orange)]" },
  { id: 5, course: "Python Programming", emoji: "🐍", bg: "linear-gradient(135deg,#1a1a0d,#0d1a2e)", title: "List Comprehension — Assignment 4", tags: [{ cls: "bg-[var(--orange-d)] text-[var(--orange)]", lbl: "Due Today · 11:59 PM" }], meta: ["📄 Written + Code", "⚡ 35 XP"], pct: 20, pctColor: "linear-gradient(90deg,var(--orange),var(--orange2))", dueLabel: "Due", dueVal: "Today", dueCls: "text-[var(--orange)]", actions: [{ cls: "bg-[var(--orange)] text-white shadow-[0_2px_8px_rgba(240,90,26,.3)] hover:bg-[var(--orange2)]", lbl: "Start →" }, { cls: "bg-transparent text-[var(--text2)] border border-[var(--border2)] hover:border-[var(--blue)] hover:text-[var(--blue)]", lbl: "View" }], border: "border-l-[3px] border-l-[var(--orange)]" },
  { id: 6, course: "MERN Stack Development", emoji: "⚛️", bg: "linear-gradient(135deg,#0d1f3c,#0a2a1a)", title: "Context API & State Management — Project", tags: [{ cls: "bg-[var(--blue-d)] text-[var(--blue2)]", lbl: "Due in 3 days" }], meta: ["🏗️ Project", "⚡ 80 XP"], pct: 0, pctColor: "linear-gradient(90deg,var(--orange),var(--orange2))", dueLabel: "Due", dueVal: "Jun 20", dueCls: "text-[var(--text)]", actions: [{ cls: "bg-transparent text-[var(--text2)] border border-[var(--border2)] hover:border-[var(--blue)] hover:text-[var(--blue)]", lbl: "Start →" }], border: "border-l-[3px] border-l-[var(--blue2)]" },
  { id: 7, course: "MERN Stack Development", emoji: "⚛️", bg: "linear-gradient(135deg,#0d1f3c,#0a2a1a)", title: "MongoDB CRUD Operations — Lab", tags: [{ cls: "bg-[var(--green-d)] text-[var(--green)]", lbl: "Submitted · Score: 94%" }], meta: ["💻 Coding Lab", "⚡ +40 XP earned"], pct: 94, pctColor: "linear-gradient(90deg,var(--green),#4ade80)", dueLabel: "Submitted", dueVal: "Jun 10", dueCls: "text-[var(--green)]", actions: [{ cls: "bg-[var(--green-d)] text-[var(--green)] border border-[rgba(22,163,74,.2)]", lbl: "✓ Submitted" }], border: "border-l-[3px] border-l-[var(--green)] opacity-70" },
];

const filters = [
  { key: "all", lbl: "All (7)" },
  { key: "overdue", lbl: "🚨 Overdue (3)" },
  { key: "today", lbl: "⏰ Today (2)" },
  { key: "upcoming", lbl: "📋 Upcoming (1)" },
  { key: "submitted", lbl: "✅ Submitted (1)" },
] as const;

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hasDue = [16, 17, 20, 22, 25];

export default function AssignmentsSection() {
  const [activeFilter, setActiveFilter] = useState("all");

  const filtered = assignments.filter(a => {
    if (activeFilter === "all") return true;
    if (activeFilter === "overdue") return a.border.includes("#dc2626");
    if (activeFilter === "today") return a.border.includes("var(--orange)") && a.dueVal === "Today";
    if (activeFilter === "upcoming") return a.border.includes("var(--blue2)");
    if (activeFilter === "submitted") return a.border.includes("var(--green)");
    return true;
  });

  return (
    <div className="flex flex-col gap-4 px-[18px] py-4">
      {/* STATS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { ico: "🚨", num: "3", lbl: "Overdue", icoBg: "rgba(220,38,38,.1)", numColor: "#dc2626" },
          { ico: "⏰", num: "2", lbl: "Due Today", icoBg: "var(--orange-d)", numColor: "var(--orange)" },
          { ico: "📋", num: "7", lbl: "Upcoming", icoBg: "var(--blue-d)", numColor: "var(--text)" },
          { ico: "✅", num: "18", lbl: "Submitted", icoBg: "var(--green-d)", numColor: "var(--green)" },
        ].map(s => (
          <div key={s.lbl} className="bg-[var(--card)] border border-[var(--border)] rounded-[10px] px-[15px] py-[13px] flex items-center gap-3 transition-transform duration-200 hover:-translate-y-[2px] hover:shadow-[var(--sh)]">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[17px] flex-shrink-0" style={{ background: s.icoBg }}>{s.ico}</div>
            <div>
              <div className="font-['Syne',sans-serif] text-[22px] font-[800] leading-none" style={{ color: s.numColor }}>{s.num}</div>
              <div className="text-[10.5px] text-[var(--text3)] mt-[2px]">{s.lbl}</div>
            </div>
          </div>
        ))}
      </div>

      {/* DEADLINE CALENDAR */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[var(--text3)]">{"// timeline"}</span>
          <span className="font-['Syne',sans-serif] text-[13.5px] font-bold text-[var(--text)]">Deadline Calendar</span>
          <span className="flex-1 h-[1px] bg-[var(--border)]" />
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[10px] p-[14px] flex gap-2 overflow-x-auto">
          {Array.from({ length: 15 }, (_, i) => 14 + i).map(d => {
            const due = hasDue.includes(d);
            const today = d === 17;
            return (
              <div
                key={d}
                className={`flex-shrink-0 w-[52px] rounded-lg py-2 px-1.5 text-center cursor-pointer border border-transparent transition-all duration-[0.15s] hover:border-[var(--border2)] hover:bg-[var(--card-h)] ${due ? "bg-[rgba(240,90,26,.07)] border-[rgba(240,90,26,.2)]" : ""} ${today ? "!bg-[var(--orange)] !border-[var(--orange)]" : ""}`}
              >
                <div className={`font-['JetBrains_Mono',monospace] text-[8.5px] text-[var(--text3)] uppercase mb-[4px] ${today ? "!text-white" : ""}`}>{days[d % 7]}</div>
                <div className={`font-['Syne',sans-serif] text-[15px] font-[800] text-[var(--text)] leading-none mb-[4px] ${today ? "!text-white" : ""}`}>{d}</div>
                <div className={`w-[6px] h-[6px] rounded-full mx-auto ${due ? "bg-[var(--orange)]" : "opacity-0"} ${today ? "!bg-white" : ""}`} />
              </div>
            );
          })}
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex bg-[var(--bg2)] border border-[var(--border)] rounded-lg overflow-hidden">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-3 py-[6px] text-[11.5px] font-semibold font-['DM_Sans',sans-serif] border-r border-[var(--border)] last:border-r-0 transition-all duration-[0.15s] whitespace-nowrap cursor-pointer ${activeFilter === f.key ? "bg-[var(--surface)] text-[var(--orange)] shadow-[inset_0_0_0_1px_rgba(240,90,26,.15)]" : "text-[var(--text3)] hover:text-[var(--text2)]"}`}
            >
              {f.lbl}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-[5px] font-['JetBrains_Mono',monospace] text-[10px] text-[var(--text3)] bg-[var(--bg2)] border border-[var(--border)] rounded-[7px] px-2.5 py-[4px]">
          <span>Sort:</span>
          <select className="bg-transparent border-none outline-none font-['JetBrains_Mono',monospace] text-[10px] text-[var(--text3)] cursor-pointer">
            <option>Due Date ↑</option>
            <option>Course</option>
            <option>Priority</option>
          </select>
        </div>
      </div>

      {/* ASSIGNMENTS LIST */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[var(--text3)]">{"// assignments"}</span>
          <span className="font-['Syne',sans-serif] text-[13.5px] font-bold text-[var(--text)]">All Assignments</span>
          <span className="flex-1 h-[1px] bg-[var(--border)]" />
          <a className="font-['JetBrains_Mono',monospace] text-[9.5px] font-semibold text-[var(--blue2)] px-2 py-[2px] border border-[rgba(59,130,246,.25)] rounded-[4px] transition-all duration-[0.15s] whitespace-nowrap hover:bg-[var(--blue-d)] hover:border-[var(--blue2)]" href="#">View Submitted →</a>
        </div>
        <div className="flex flex-col gap-2.5">
          {filtered.map(a => (
            <div
              key={a.id}
              className={`bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-[14px] flex items-start gap-3 sm:grid sm:grid-cols-[auto_1fr_auto_auto] sm:gap-[14px] sm:items-center transition-all duration-[0.15s] cursor-pointer hover:border-[var(--border2)] hover:shadow-[var(--sh)] hover:translate-x-[3px] [animation:fadeUp_.3s_ease_both] ${a.border} ${a.id > 6 ? "opacity-70" : ""}`}
            >
              <div className="w-10 h-10 rounded-[9px] flex items-center justify-center text-[20px] flex-shrink-0" style={{ background: a.bg }}>{a.emoji}</div>
              <div className="min-w-0 flex-1 sm:flex-none">
                <div className="font-['JetBrains_Mono',monospace] text-[9px] text-[var(--text3)] uppercase tracking-[.06em] mb-[3px]">{a.course}</div>
                <div className="text-[13px] font-bold text-[var(--text)] mb-[4px] truncate">{a.title}</div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {a.tags.map((t, i) => (
                    <span key={i} className={`font-['JetBrains_Mono',monospace] text-[8px] font-bold px-[7px] py-[2px] rounded-[3px] tracking-[.04em] ${t.cls}`}>{t.lbl}</span>
                  ))}
                  {a.meta.map((m, i) => (
                    <span key={i} className="font-['JetBrains_Mono',monospace] text-[9.5px] text-[var(--text3)] flex items-center gap-[3px]">{m}</span>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-2 sm:hidden">
                  <div className="flex-1">
                    <div className="font-['JetBrains_Mono',monospace] text-[8.5px] text-[var(--text3)] mb-[3px] flex justify-between">
                      <span>{a.border.includes("var(--green)") ? "Score" : "Progress"}</span>
                      <span className={a.border.includes("var(--green)") ? "text-[var(--green)] font-bold" : ""}>{a.pct}%</span>
                    </div>
                    <div className="h-[4px] bg-[var(--border)] rounded-[99px] overflow-hidden">
                      <div className="h-full rounded-[99px]" style={{ width: `${a.pct}%`, background: a.pctColor }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-['JetBrains_Mono',monospace] text-[9px] text-[var(--text3)] mb-[2px]">{a.dueLabel}</div>
                    <div className={`font-['Syne',sans-serif] text-[12px] font-bold ${a.dueCls}`}>{a.dueVal}</div>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-2 sm:hidden">
                  {a.actions.map((act, i) => (
                    <button
                      key={i}
                      className={`px-3 py-[5px] rounded-[6px] text-[11px] font-semibold transition-all duration-[0.15s] whitespace-nowrap ${act.cls}`}
                    >
                      {act.lbl}
                    </button>
                  ))}
                </div>
              </div>
              <div className="hidden sm:block sm:w-20">
                <div className="font-['JetBrains_Mono',monospace] text-[8.5px] text-[var(--text3)] mb-[3px] flex justify-between">
                  <span>{a.border.includes("var(--green)") ? "Score" : "Progress"}</span>
                  <span className={a.border.includes("var(--green)") ? "text-[var(--green)] font-bold" : ""}>{a.pct}%</span>
                </div>
                <div className="h-[4px] bg-[var(--border)] rounded-[99px] overflow-hidden">
                  <div className="h-full rounded-[99px]" style={{ width: `${a.pct}%`, background: a.pctColor }} />
                </div>
              </div>
              <div className="hidden sm:block text-right flex-shrink-0">
                <div className="font-['JetBrains_Mono',monospace] text-[9px] text-[var(--text3)] mb-[2px]">{a.dueLabel}</div>
                <div className={`font-['Syne',sans-serif] text-[12px] font-bold ${a.dueCls}`}>{a.dueVal}</div>
              </div>
              <div className="hidden sm:flex gap-1.5 flex-shrink-0">
                {a.actions.map((act, i) => (
                  <button
                    key={i}
                    className={`px-3 py-[5px] rounded-[6px] text-[11px] font-semibold transition-all duration-[0.15s] whitespace-nowrap ${act.cls}`}
                  >
                    {act.lbl}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-10 text-center font-['JetBrains_Mono',monospace] text-[11px] text-[var(--text3)]">
              No assignments match your current filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
