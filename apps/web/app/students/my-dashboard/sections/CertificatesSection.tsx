"use client";

import { useState } from "react";

const earnedCerts = [
  { id: 1, emoji: "🎨", cat: "Frontend Development", name: "HTML & CSS Mastery", date: "Apr 14, 2025", score: "96%", bg: "linear-gradient(135deg,#155724,#1e6b30)" },
  { id: 2, emoji: "🧠", cat: "Programming", name: "JavaScript Foundations", date: "Mar 2, 2025", score: "91%", bg: "linear-gradient(135deg,#1e3a8a,#1d4ed8)" },
  { id: 3, emoji: "🗄️", cat: "Database", name: "SQL & Database Design", date: "Jan 18, 2025", score: "88%", bg: "linear-gradient(135deg,#713f12,#92400e)" },
];

const inProgressCerts = [
  { id: "p1", emoji: "⚛️", cat: "Full Stack", name: "MERN Stack Development", pct: 65, bg: "linear-gradient(135deg,#040c1a,#0a200e)", milestones: ["MongoDB", "Express", "React", "Node", "Deploy"], done: 2, color: "var(--orange)" },
  { id: "p2", emoji: "🐍", cat: "Programming", name: "Python Programming", pct: 30, bg: "linear-gradient(135deg,#0a0a1a,#1a0a1a)", milestones: ["Basics", "OOP", "Modules", "APIs", "Project"], done: 1, color: "var(--blue2)" },
  { id: "p3", emoji: "📊", cat: "Data Science", name: "Data Science with Pandas", pct: 12, bg: "linear-gradient(135deg,#0a0420,#04100a)", milestones: ["NumPy", "Pandas", "Viz", "ML", "Project"], done: 0, color: "var(--purple)" },
];

const lockedCerts = [
  { name: "DevOps & Docker Essentials", prereq: "Unlock after MERN Stack" },
  { name: "AWS Solutions Architect", prereq: "Unlock after DevOps" },
  { name: "Machine Learning Engineering", prereq: "Unlock after Data Science" },
  { name: "System Design & Architecture", prereq: "Unlock at Senior level" },
];

const certDetails: Record<number, { desc: string; skills: string[]; instructor: string; id: string; modules: string; hours: string; rank: string }> = {
  1: { desc: "Demonstrating proficiency in HTML5 semantics, CSS3 layouts including Flexbox and Grid, responsive design principles, CSS animations, and modern frontend development practices.", skills: ["HTML5", "CSS3", "Flexbox", "Grid", "Responsive", "Animations"], instructor: "Kiran Das", id: "FS-2025-HC-001", modules: "12", hours: "18h", rank: "#42" },
  2: { desc: "Mastery of ES6+ JavaScript including closures, promises, async/await, DOM manipulation, event handling, and modern JavaScript design patterns used in industry.", skills: ["ES6+", "Promises", "Async/Await", "DOM API", "Closures", "Events"], instructor: "Anjali Singh", id: "FS-2025-JS-004", modules: "16", hours: "24h", rank: "#18" },
  3: { desc: "Comprehensive understanding of relational database design, normalization, complex SQL queries, indexing, transactions, and database performance optimisation techniques.", skills: ["SQL", "Joins", "Indexes", "Transactions", "Normalisation", "PostgreSQL"], instructor: "Dr. Mehta", id: "FS-2025-DB-009", modules: "10", hours: "14h", rank: "#67" },
};

export default function CertificatesSection({ embedded }: { embedded?: boolean }) {
  const [activeCert, setActiveCert] = useState<number | string>(1);

  const earned = earnedCerts.find(c => c.id === activeCert);
  const inProg = inProgressCerts.find(c => c.id === activeCert);
  const detail = typeof activeCert === "number" ? certDetails[activeCert] : null;

  const content = (
    <div className="flex flex-col flex-1 bg-[var(--bg)]">
      {/* breadcrumb */}
      <div className="flex items-center gap-[5px] px-[18px] py-2 bg-[var(--surface)] border-b border-[var(--border)] font-['JetBrains_Mono',monospace] text-[10px] text-[var(--text3)] flex-shrink-0">
        <span>futurestack</span>
        <span className="text-[var(--border2)]">/</span>
        <span className="text-[var(--text2)]">rahul.sharma</span>
        <span className="text-[var(--border2)]">/</span>
        <span className="text-[var(--orange)]">certificates</span>
        <span className="ml-auto flex items-center gap-[6px]">
          <span className="text-[var(--green)] text-[10px]">●</span>
          <span>3 earned · 3 in progress · 4 locked</span>
        </span>
      </div>

      {/* two-panel grid */}
      <div className="grid grid-cols-[2fr_3fr] flex-1 min-h-0 overflow-hidden">
        {/* ─── LEFT ─── */}
        <div className="border-r border-[var(--border)] overflow-y-auto bg-[var(--surface)] flex flex-col">
          <div className="px-5 py-[18px] border-b border-[var(--border)] bg-[var(--surface)]">
            <div className="font-['Inter_Tight',sans-serif] text-[18px] font-[800] text-[var(--text)] mb-[2px]">My Certificates</div>
            <div className="text-[11.5px] text-[var(--text3)] mb-[14px]">Verified credentials recognised by 400+ hiring partners</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { num: "3", lbl: "Earned", color: "var(--green)" },
                { num: "3", lbl: "In Progress", color: "var(--orange)" },
                { num: "4", lbl: "Locked", color: "var(--text)" },
              ].map(s => (
                <div key={s.lbl} className="text-center py-2.5 px-1.5 bg-[var(--bg2)] border border-[var(--border)] rounded-lg">
                  <div className="font-['Inter_Tight',sans-serif] text-[22px] font-[800] leading-none" style={{ color: s.color }}>{s.num}</div>
                  <div className="font-['JetBrains_Mono',monospace] text-[8px] uppercase tracking-[.07em] text-[var(--text3)] mt-[3px]">{s.lbl}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-[7px] px-5 py-3 border-b border-[var(--border)] bg-[var(--bg2)]">
            <button className="flex-1 py-[7px] px-2.5 rounded-[7px] text-[11.5px] font-semibold flex items-center justify-center gap-1.5 transition-all duration-[0.15s] bg-[linear-gradient(135deg,#0a66c2,#1a8cff)] text-white border-none hover:opacity-[.88] hover:-translate-y-[1px]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" /><circle cx="4" cy="4" r="2" /></svg>
              Share on LinkedIn
            </button>
            <button className="flex-1 py-[7px] px-2.5 rounded-[7px] text-[11.5px] font-semibold flex items-center justify-center gap-1.5 transition-all duration-[0.15s] bg-transparent text-[var(--text2)] border border-[var(--border2)] hover:border-[var(--blue)] hover:text-[var(--blue)]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Download All
            </button>
          </div>

          <div className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[var(--text3)] flex items-center gap-2 px-5 pt-2.5 pb-1.5">
            ✦ Earned
            <span className="flex-1 h-[1px] bg-[var(--border)]" />
          </div>
          {earnedCerts.map(c => (
            <div
              key={c.id}
              onClick={() => setActiveCert(c.id)}
              className={`flex items-center gap-3 px-5 py-3 border-b border-[var(--border)] cursor-pointer transition-colors duration-100 relative ${activeCert === c.id ? "bg-[rgba(240,90,26,.05)] border-l-2 border-l-[var(--orange)]" : "hover:bg-[var(--card-h)]"}`}
            >
              <div className="w-[38px] h-[38px] rounded-[10px] flex-shrink-0 flex items-center justify-center text-[20px] shadow-[0_2px_8px_rgba(0,0,0,.15)]" style={{ background: c.bg }}>{c.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="font-['JetBrains_Mono',monospace] text-[8.5px] text-[var(--text3)] uppercase tracking-[.05em] mb-[2px]">{c.cat}</div>
                <div className={`text-[12.5px] font-bold text-[var(--text)] truncate ${activeCert === c.id ? "text-[var(--orange)]" : ""}`}>{c.name}</div>
                <div className="flex items-center gap-2 mt-[3px]">
                  <span className="font-['JetBrains_Mono',monospace] text-[9px] text-[var(--text3)]">📅 {c.date}</span>
                  <span className="font-['JetBrains_Mono',monospace] text-[9px] text-[var(--text3)]">Score: {c.score}</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <span className="font-['JetBrains_Mono',monospace] text-[8px] font-bold px-2 py-[2px] rounded-[20px] tracking-[.04em] uppercase bg-[var(--green-d)] text-[var(--green)] border border-[rgba(22,163,74,.2)]">✓ Earned</span>
              </div>
            </div>
          ))}

          <div className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[var(--text3)] flex items-center gap-2 px-5 pt-2.5 pb-1.5">
            ⏳ In Progress
            <span className="flex-1 h-[1px] bg-[var(--border)]" />
          </div>
          {inProgressCerts.map(c => {
            const isActive = activeCert === c.id;
            const fillGrad = c.color === "var(--orange)" ? "linear-gradient(90deg,var(--orange),var(--orange2))" : c.color === "var(--blue2)" ? "linear-gradient(90deg,var(--blue),var(--blue2))" : "linear-gradient(90deg,var(--purple),#c084fc)";
            return (
              <div
                key={c.id}
                onClick={() => setActiveCert(c.id)}
                className={`px-5 py-3 border-b border-[var(--border)] ${isActive ? "bg-[rgba(240,90,26,.05)] border-l-2 border-l-[var(--orange)]" : ""}`}
              >
                <div className="flex items-center gap-2.5 mb-2 cursor-pointer">
                  <div className="w-[34px] h-[34px] rounded-[9px] flex-shrink-0 flex items-center justify-center text-[17px]" style={{ background: c.bg }}>{c.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-['JetBrains_Mono',monospace] text-[8.5px] text-[var(--text3)] uppercase tracking-[.05em]">{c.cat}</div>
                    <div className="text-[12px] font-bold text-[var(--text)]">{c.name}</div>
                  </div>
                  <div className="font-['Inter_Tight',sans-serif] text-[13px] font-[800] flex-shrink-0" style={{ color: c.color }}>{c.pct}%</div>
                </div>
                <div className="h-[4px] bg-[var(--border)] rounded-[99px] overflow-hidden mb-[4px]">
                  <div className="h-full rounded-[99px] transition-[width] duration-[0.8s]" style={{ width: `${c.pct}%`, background: fillGrad }} />
                </div>
                <div className="flex items-center mt-[6px] relative">
                  <div className="absolute top-[6px] left-[6px] right-[6px] h-[1px] bg-[var(--border)] z-0" />
                  {c.milestones.map((m, i) => (
                    <div key={m} className="flex-1 flex flex-col items-center gap-[3px] relative z-[1]">
                      <div className={`w-[12px] h-[12px] rounded-full border-2 transition-all duration-200 ${i < c.done ? "bg-[var(--green)] border-[var(--green)]" : i === c.done ? "bg-[var(--orange)] border-[var(--orange)] shadow-[0_0_0_3px_rgba(240,90,26,.2)]" : "bg-[var(--surface)] border-[var(--border)]"}`} />
                      <div className="font-['JetBrains_Mono',monospace] text-[7.5px] text-[var(--text3)] text-center leading-[1.2] max-w-[40px]">{m}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[var(--text3)] flex items-center gap-2 px-5 pt-2.5 pb-1.5">
            🔒 Locked
            <span className="flex-1 h-[1px] bg-[var(--border)]" />
          </div>
          {lockedCerts.map(c => (
            <div key={c.name} className="flex items-center gap-3 px-5 py-2.5 border-b border-[var(--border)] opacity-[.55]">
              <div className="w-[34px] h-[34px] rounded-[9px] bg-[var(--bg2)] border border-[var(--border)] flex items-center justify-center text-[14px] flex-shrink-0 text-[var(--text3)]">🔒</div>
              <div className="flex-1">
                <div className="text-[12px] font-semibold text-[var(--text3)]">{c.name}</div>
                <div className="font-['JetBrains_Mono',monospace] text-[8.5px] text-[var(--text3)] mt-[2px]">{c.prereq}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── RIGHT ─── */}
        <div className="bg-[var(--bg)] flex flex-col items-center gap-5 py-8 px-7 overflow-y-auto">
          {earned && detail ? (
            <>
              <div className="w-full max-w-[600px] bg-[#fdfbf6] rounded-lg shadow-[0_8px_32px_rgba(0,0,0,.14),0_2px_8px_rgba(0,0,0,.08)] overflow-hidden relative [animation:fadeUp_.35s_ease_both]">
                <div className="absolute inset-0 pointer-events-none z-0 opacity-[.5]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px,rgba(201,168,76,.15) 1px,transparent 0)", backgroundSize: "14px 14px" }} />
                <div className="absolute right-[-30px] bottom-[-40px] w-[240px] h-[240px] opacity-[.05] pointer-events-none z-0 flex items-center justify-center font-['Inter_Tight',sans-serif] font-[800] text-[160px] text-[#0d1f3c] rotate-[-8deg]">FS</div>
                <div className="m-[9px] border border-[#c9a84c] rounded-[6px] relative z-[1]">
                  <div className="m-[7px] border-[2.5px] border-[#c9a84c] rounded-[4px] px-9 py-[30px] pb-[26px] relative bg-transparent">
                    <div className="absolute top-[-2.5px] left-[-2.5px] w-[22px] h-[22px] border-t-[2.5px] border-l-[2.5px] border-[#8b6914] rounded-tl-[4px] z-[2]" />
                    <div className="absolute top-[-2.5px] right-[-2.5px] w-[22px] h-[22px] border-t-[2.5px] border-r-[2.5px] border-[#8b6914] rounded-tr-[4px] z-[2]" />
                    <div className="absolute bottom-[-2.5px] left-[-2.5px] w-[22px] h-[22px] border-b-[2.5px] border-l-[2.5px] border-[#8b6914] rounded-bl-[4px] z-[2]" />
                    <div className="absolute bottom-[-2.5px] right-[-2.5px] w-[22px] h-[22px] border-b-[2.5px] border-r-[2.5px] border-[#8b6914] rounded-br-[4px] z-[2]" />

                    <div className="flex items-center justify-center gap-[9px] mb-[14px] relative z-[1]">
                      <div className="w-[34px] h-[34px] rounded-lg flex-shrink-0 bg-[linear-gradient(135deg,#f05a1a,#ff7a3c)] flex items-center justify-center font-['Inter_Tight',sans-serif] font-[800] text-[15px] text-white shadow-[0_3px_10px_rgba(240,90,26,.35)]">FS</div>
                      <div className="text-left leading-[1.1]">
                        <div className="font-['Inter_Tight',sans-serif] font-[800] text-[15px] text-[#1a1208]"><span className="text-[#f05a1a]">Future</span>Stack</div>
                        <div className="text-[7.5px] text-[#8b7340] tracking-[.08em] uppercase mt-[1px]">Think Ahead. Code Beyond.</div>
                      </div>
                    </div>

                    <div className="text-center border-b border-[#e8d99a] pb-4 mb-[18px] relative z-[1]">
                      <div className="font-['Inter_Tight',sans-serif] text-[10px] font-[800] uppercase tracking-[.24em] text-[#8b6914] mb-[6px]">FutureStack Academy</div>
                      <div className="font-['Instrument_Serif',Georgia,serif] text-[19px] italic text-[#5a4008] leading-[1.3]">Certificate of Completion</div>
                    </div>

                    <div className="relative w-[64px] h-[80px] mx-auto mb-4 z-[1]">
                      <div className="w-[64px] h-[64px] rounded-full bg-[linear-gradient(135deg,#c9a84c,#e8c96a,#c9a84c)] flex items-center justify-center text-[28px] shadow-[0_3px_14px_rgba(201,168,76,.45),inset_0_0_0_3px_rgba(255,255,255,.35)] animate-[float_3s_ease_infinite] relative z-[2]">
                        {earned.emoji}
                      </div>
                    </div>

                    <div className="text-[10.5px] text-[#8b7340] text-center tracking-[.08em] uppercase mb-2 relative z-[1]">This certifies that</div>
                    <div className="font-['Instrument_Serif',Georgia,serif] text-[32px] italic text-[#1a1208] text-center leading-[1.15] mb-[14px] pb-2.5 border-b border-dashed border-[#d4b96a] relative z-[1]">Rahul Sharma</div>

                    <div className="text-[10px] text-[#8b7340] text-center tracking-[.1em] uppercase mb-[5px] relative z-[1]">has successfully completed</div>
                    <div className="font-['Inter_Tight',sans-serif] text-[16px] font-[800] text-[#0d1f3c] text-center mb-3 leading-[1.3] relative z-[1]">{earned.name}</div>

                    <div className="text-[11px] text-[#5a4a30] text-center leading-[1.65] max-w-[400px] mx-auto mb-[18px] relative z-[1]">{detail.desc}</div>

                    <div className="flex justify-center gap-[7px] flex-wrap mb-5 relative z-[1]">
                      {detail.skills.map(s => (
                        <span key={s} className="font-['Inter',sans-serif] text-[9px] font-semibold px-3 py-[4px] rounded-[20px] border border-[#c9a84c] text-[#8b6914] bg-[rgba(201,168,76,.09)]">{s}</span>
                      ))}
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 border-t border-[#e8d99a] pt-4 relative z-[1]">
                      <div className="text-center">
                        <div className="font-['Instrument_Serif',Georgia,serif] italic text-[15px] text-[#1a1208] border-b border-[#c9a84c] pb-[5px] mb-[4px]">{detail.instructor}</div>
                        <div className="text-[8.5px] uppercase tracking-[.08em] text-[#8b7340]">Course Instructor</div>
                      </div>
                      <div className="text-center flex flex-col items-center gap-[3px]">
                        <div className="w-[26px] h-[26px] rounded-[6px] bg-[linear-gradient(135deg,#f05a1a,#ff7a3c)] flex items-center justify-center font-['Inter_Tight',sans-serif] font-[800] text-[11px] text-white shadow-[0_2px_7px_rgba(240,90,26,.35)]">FS</div>
                        <div className="font-['Inter_Tight',sans-serif] font-[800] text-[10px] text-[#8b6914] leading-none">FutureStack</div>
                        <div className="text-[7px] text-[#b09040] tracking-[.06em] uppercase">Academy</div>
                      </div>
                      <div className="text-center">
                        <div className="font-['Inter',sans-serif] text-[7.5px] text-[#b09040] mb-[2px]">ID: {detail.id}</div>
                        <div className="font-['Inter',sans-serif] text-[8px] text-[#8b6914] font-semibold">{earned.date}</div>
                        <div className="inline-block bg-[linear-gradient(135deg,#c9a84c,#e8c96a)] text-[#5a3a00] font-['Inter',sans-serif] text-[8px] font-bold px-[11px] py-[3px] rounded-[20px] mt-[6px] shadow-[0_2px_6px_rgba(201,168,76,.3)]">Score: {earned.score}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute top-[14px] right-[-2px] z-[3] bg-[linear-gradient(135deg,#16a34a,#22c55e)] text-white font-['Inter',sans-serif] text-[8.5px] font-bold py-[4px] pl-[10px] pr-3 shadow-[0_2px_8px_rgba(22,163,74,.35)] flex items-center gap-1" style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 8px 100%, 0 50%)" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>Verified
                </div>
              </div>

              <div className="flex gap-2.5 w-full max-w-[580px]">
                <button className="flex-1 py-2.5 rounded-lg text-[12.5px] font-bold flex items-center justify-center gap-[7px] transition-all duration-[0.18s] bg-[var(--orange)] text-white shadow-[0_3px_12px_rgba(240,90,26,.3)] border-none hover:bg-[var(--orange2)] hover:-translate-y-[1px]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  Download PDF
                </button>
                <button className="flex-1 py-2.5 rounded-lg text-[12.5px] font-bold flex items-center justify-center gap-[7px] transition-all duration-[0.18s] bg-[linear-gradient(135deg,#0a66c2,#1a8cff)] text-white shadow-[0_3px_12px_rgba(10,102,194,.3)] border-none hover:opacity-[.88] hover:-translate-y-[1px]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" /><circle cx="4" cy="4" r="2" /></svg>
                  Add to LinkedIn
                </button>
                <button className="flex-1 py-2.5 rounded-lg text-[12.5px] font-bold flex items-center justify-center gap-[7px] transition-all duration-[0.18s] bg-transparent text-[var(--text2)] border-[1.5px] border-[var(--border2)] hover:border-[var(--blue)] hover:text-[var(--blue)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
                  Copy Link
                </button>
              </div>

              <div className="w-full max-w-[580px] bg-[var(--surface)] border border-[var(--border)] rounded-[10px] px-[18px] py-[14px] grid grid-cols-4">
                {[
                  { val: earned.score, lbl: "Final Score", color: "var(--green)" },
                  { val: detail.modules, lbl: "Modules" },
                  { val: detail.hours, lbl: "Study Time" },
                  { val: detail.rank, lbl: "Class Rank" },
                ].map((s, i) => (
                  <div key={s.lbl} className={`text-center px-2 ${i < 3 ? "border-r border-[var(--border)]" : ""}`}>
                    <div className="font-['Inter_Tight',sans-serif] text-[20px] font-[800] leading-none mb-[3px]" style={{ color: s.color || "var(--text)" }}>{s.val}</div>
                    <div className="font-['JetBrains_Mono',monospace] text-[8.5px] uppercase tracking-[.07em] text-[var(--text3)]">{s.lbl}</div>
                  </div>
                ))}
              </div>
            </>
          ) : inProg ? (
            <div className="w-full max-w-[480px] flex flex-col gap-4">
              <div className="text-center py-2.5">
                <div className="text-[52px] mb-2">⏳</div>
                <div className="font-['Inter_Tight',sans-serif] text-[17px] font-[800] text-[var(--text)] mb-[4px]">{inProg.name}</div>
                <div className="text-[11.5px] text-[var(--text3)]">Complete the course to earn your verified certificate</div>
              </div>
              <div className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-[22px] py-5">
                <div className="flex justify-between items-baseline mb-[14px]">
                  <span className="font-['Inter_Tight',sans-serif] text-[14px] font-bold text-[var(--text)]">Overall Progress</span>
                  <span className="font-['Inter_Tight',sans-serif] text-[22px] font-[800]" style={{ color: inProg.color }}>{inProg.pct}%</span>
                </div>
                <div className="h-2 bg-[var(--border)] rounded-[99px] overflow-hidden mb-3">
                  <div className="h-full rounded-[99px] transition-[width] duration-[0.8s]" style={{ width: `${inProg.pct}%`, background: `linear-gradient(90deg,${inProg.color},${inProg.color === "var(--orange)" ? "var(--orange2)" : inProg.color === "var(--blue2)" ? "var(--blue)" : "#c084fc"})` }} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: inProg.done.toString(), lbl: "Modules Done" },
                    { val: (5 - inProg.done).toString(), lbl: "Remaining" },
                    { val: inProg.pct >= 60 ? "Jun 30" : inProg.pct >= 30 ? "Aug 10" : "Oct 1", lbl: "Est. Completion" },
                  ].map(s => (
                    <div key={s.lbl} className="text-center py-2 bg-[var(--bg2)] rounded-[7px]">
                      <div className="font-['Inter_Tight',sans-serif] text-[15px] font-[800] text-[var(--text)] leading-none">{s.val}</div>
                      <div className="font-['JetBrains_Mono',monospace] text-[8px] text-[var(--text3)] mt-[2px] uppercase tracking-[.06em]">{s.lbl}</div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-[14px] py-2.5 rounded-lg bg-[var(--orange)] text-white text-[12.5px] font-bold shadow-[0_3px_12px_rgba(240,90,26,.3)] hover:bg-[var(--orange2)] hover:-translate-y-[1px] transition-all duration-[0.18s]">▶ Continue Learning →</button>
              </div>
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] px-[18px] py-4">
                <div className="font-['JetBrains_Mono',monospace] text-[9px] uppercase tracking-[.1em] text-[var(--text3)] mb-2.5">What you&apos;ll earn</div>
                {[
                  { ico: "🏅", title: "Verified Digital Certificate", sub: "Shareable on LinkedIn · Unique credential ID" },
                  { ico: "🌐", title: "Industry Recognition", sub: "Recognised by 400+ hiring partners across India" },
                  { ico: "⚡", title: "+500 XP Bonus", sub: "Jump one level on completion" },
                ].map(item => (
                  <div key={item.title} className="flex items-start gap-2.5 mb-2 last:mb-0">
                    <span className="text-[16px] flex-shrink-0">{item.ico}</span>
                    <div>
                      <div className="text-[12px] font-semibold text-[var(--text)] mb-[1px]">{item.title}</div>
                      <div className="text-[11px] text-[var(--text3)]">{item.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 gap-[14px] px-6 py-10 text-center">
              <div className="text-[48px] opacity-[.5]">🔒</div>
              <div className="font-['Inter_Tight',sans-serif] text-[16px] font-bold text-[var(--text)]">Select a certificate</div>
              <div className="text-[12px] text-[var(--text3)] max-w-[280px] leading-[1.6]">Choose an earned certificate or an in-progress course from the left panel to view details.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return embedded ? content : (
    <div className="bg-[var(--bg)] flex flex-col flex-1 min-h-0 overflow-y-auto">
      {content}
    </div>
  );
}
