"use client";

import { useState } from "react";

const courses = [
  { id: 1, emoji: "⚛️", name: "MERN Stack Development", sub: "MongoDB · Express.js · React · Node.js", tag1: "Full Stack", tag2: "Advanced", tag1Css: "tag-o", tag2Css: "tag-dim", pct: 65, modules: "Module 13 / 20", status: "progress", pillCss: "pill-prog", barCss: "bar-o", color: "var(--orange)", next: "React Hooks Deep Dive", due: "Jun 15", timeLeft: "28h left", cta: "orange", ctaText: "▶ Resume", extra: "🔴 Live Wed 10AM", insName: "Aakash Verma", insAv: "AV", insBg: "linear-gradient(135deg,#f05a1a,#ff7a3c)", insRating: "⭐ 4.8", banner: "banner-mern" },
  { id: 2, emoji: "🐍", name: "Python Programming", sub: "Functions · OOP · Modules · APIs", tag1: "Programming", tag2: "Beginner", tag1Css: "tag-b", tag2Css: "tag-dim", pct: 30, modules: "Module 6 / 20", status: "progress", pillCss: "pill-new", barCss: "bar-b", color: "var(--blue2)", next: "List Comprehension", due: "Quiz due Thu", timeLeft: "36h left", cta: "blue", ctaText: "Continue →", extra: "📁 2 projects", insName: "Priya Joshi", insAv: "PJ", insBg: "linear-gradient(135deg,#2563eb,#3b82f6)", insRating: "⭐ 4.7", banner: "banner-python" },
  { id: 3, emoji: "📊", name: "Data Science with Pandas", sub: "NumPy · Pandas · Matplotlib · Sklearn", tag1: "Data Science", tag2: "Intermediate", tag1Css: "tag-p", tag2Css: "tag-dim", pct: 25, modules: "Module 4 / 16", status: "progress", pillCss: "pill-prog", barCss: "bar-p", color: "var(--purple)", next: "DataFrame Merging", due: "Jul 1", timeLeft: "44h left", cta: "purple", ctaText: "Continue →", extra: "📝 Quiz due Fri", insName: "Sanjay Mehta", insAv: "SM", insBg: "linear-gradient(135deg,#9333ea,#a855f7)", insRating: "⭐ 4.9", banner: "banner-ds" },
  { id: 4, emoji: "🎨", name: "HTML & CSS Mastery", sub: "Flexbox · Grid · Animations · Responsive", tag1: "Frontend", tag2: "Beginner", tag1Css: "tag-g", tag2Css: "tag-dim", pct: 100, modules: "All Modules Done", status: "completed", pillCss: "pill-done", barCss: "bar-g", color: "var(--green)", next: "🏅 Certificate Earned · Apr 14, 2025", due: "Score: 96%", timeLeft: "18h total", cta: "green", ctaText: "View Cert →", extra: "🎓 Verified cert", insName: "Kiran Das", insAv: "KD", insBg: "linear-gradient(135deg,#16a34a,#22c55e)", insRating: "⭐ 4.8", banner: "banner-html" },
  { id: 5, emoji: "🧠", name: "Generative AI & LLM Engineering", sub: "Transformers · RAG · Fine-tuning · Agents", tag1: "AI/ML", tag2: "Advanced", tag1Css: "tag-p", tag2Css: "tag-dim", pct: 12, modules: "Module 2 / 28", status: "progress", pillCss: "pill-new", barCss: "bar-p", color: "var(--purple)", next: "Attention Mechanism", due: "Aug 10", timeLeft: "52h left", cta: "purple", ctaText: "▶ Start", extra: "🧪 5 labs", insName: "Dr. Arjun Singh", insAv: "AS", insBg: "linear-gradient(135deg,#7c3aed,#a855f7)", insRating: "⭐ 4.9", banner: "banner-ai" },
  { id: 6, emoji: "☁️", name: "AWS Solutions Architect", sub: "EC2 · S3 · Lambda · VPC · IAM", tag1: "Cloud", tag2: "Advanced", tag1Css: "tag-o", tag2Css: "tag-dim", pct: 8, modules: "Module 1 / 24", status: "progress", pillCss: "pill-new", barCss: "bar-o", color: "var(--orange)", next: "AWS Global Infrastructure", due: "Sep 5", timeLeft: "60h left", cta: "orange", ctaText: "▶ Start", extra: "☁️ 3 sandbox labs", insName: "Rahul Verma", insAv: "RV", insBg: "linear-gradient(135deg,#f97316,#fb923c)", insRating: "⭐ 4.7", banner: "banner-aws" },
  { id: 7, emoji: "📱", name: "React Native Mobile Dev", sub: "Expo · Navigation · APIs · Store", tag1: "Mobile", tag2: "Intermediate", tag1Css: "tag-b", tag2Css: "tag-dim", pct: 0, modules: "Not Started", status: "saved", pillCss: "pill-new", barCss: "bar-b", color: "var(--blue2)", next: "Environment Setup", due: "Flexible", timeLeft: "—", cta: "blue", ctaText: "Enroll →", extra: "📱 Cross-platform", insName: "Sneha Patel", insAv: "SP", insBg: "linear-gradient(135deg,#2563eb,#60a5fa)", insRating: "⭐ 4.6", banner: "banner-rn" },
  { id: 8, emoji: "🔧", name: "Docker & Kubernetes", sub: "Containers · Orchestration · CI/CD · Helm", tag1: "DevOps", tag2: "Intermediate", tag1Css: "tag-g", tag2Css: "tag-dim", pct: 0, modules: "Not Started", status: "saved", pillCss: "pill-new", barCss: "bar-g", color: "var(--green)", next: "Docker Fundamentals", due: "Flexible", timeLeft: "—", cta: "green", ctaText: "Enroll →", extra: "🐳 6 hands-on labs", insName: "Aakash Verma", insAv: "AV", insBg: "linear-gradient(135deg,#16a34a,#4ade80)", insRating: "⭐ 4.8", banner: "banner-k8s" },
  { id: 9, emoji: "🗄️", name: "PostgreSQL & Database Design", sub: "SQL · Indexing · Normalization · Transactions", tag1: "Database", tag2: "Intermediate", tag1Css: "tag-b", tag2Css: "tag-dim", pct: 45, modules: "Module 7 / 14", status: "progress", pillCss: "pill-prog", barCss: "bar-b", color: "var(--blue2)", next: "Query Optimization", due: "Jul 22", timeLeft: "20h left", cta: "blue", ctaText: "Continue →", extra: "📊 Performance tuning", insName: "Neha Gupta", insAv: "NG", insBg: "linear-gradient(135deg,#0ea5e9,#38bdf8)", insRating: "⭐ 4.5", banner: "banner-db" },
  { id: 10, emoji: "🛡️", name: "Cybersecurity Fundamentals", sub: "Network Security · Cryptography · Ethical Hacking", tag1: "Security", tag2: "Beginner", tag1Css: "tag-g", tag2Css: "tag-dim", pct: 18, modules: "Module 3 / 18", status: "progress", pillCss: "pill-new", barCss: "bar-g", color: "var(--green)", next: "Threat Modeling", due: "Aug 5", timeLeft: "32h left", cta: "green", ctaText: "Continue →", extra: "🛡️ Capture The Flag", insName: "Vikram Rathore", insAv: "VR", insBg: "linear-gradient(135deg,#16a34a,#34d399)", insRating: "⭐ 4.6", banner: "banner-sec" },
  { id: 11, emoji: "📈", name: "Machine Learning with Python", sub: "Regression · Classification · Clustering · Neural Nets", tag1: "AI/ML", tag2: "Advanced", tag1Css: "tag-p", tag2Css: "tag-dim", pct: 55, modules: "Module 8 / 16", status: "progress", pillCss: "pill-prog", barCss: "bar-p", color: "var(--purple)", next: "Neural Network Basics", due: "Jul 30", timeLeft: "24h left", cta: "purple", ctaText: "▶ Resume", extra: "🤖 Build a classifier", insName: "Dr. Arjun Singh", insAv: "AS", insBg: "linear-gradient(135deg,#7c3aed,#c084fc)", insRating: "⭐ 4.9", banner: "banner-ml" },
  { id: 12, emoji: "🌐", name: "TypeScript Full Stack", sub: "Next.js · Prisma · tRPC · Tailwind", tag1: "Full Stack", tag2: "Advanced", tag1Css: "tag-o", tag2Css: "tag-dim", pct: 100, modules: "All Modules Done", status: "completed", pillCss: "pill-done", barCss: "bar-o", color: "var(--orange)", next: "🏅 Certificate Earned · May 28, 2025", due: "Score: 91%", timeLeft: "42h total", cta: "orange", ctaText: "View Cert →", extra: "🎓 Verified cert", insName: "Aakash Verma", insAv: "AV", insBg: "linear-gradient(135deg,#f05a1a,#ff7a3c)", insRating: "⭐ 4.8", banner: "banner-ts" },
];

const sessions = [
  { day: "18", dow: "WED", name: "MERN — React Hooks Live Q&A", meta: "10:00 AM · Aakash Verma · 90 min", tag: "Live", tagCss: "st-live" },
  { day: "20", dow: "FRI", name: "Python — Chapter 6 Quiz", meta: "Due by 11:59 PM · 15 questions", tag: "Quiz", tagCss: "st-quiz" },
  { day: "22", dow: "SUN", name: "Data Science — Assignment 2", meta: "Submit by midnight · Pandas project", tag: "Submit", tagCss: "st-submit" },
  { day: "25", dow: "WED", name: "Python — OOP Deep Dive Live", meta: "7:00 PM · Priya Joshi · 60 min", tag: "Live", tagCss: "st-live" },
];

export default function MyCoursesSection() {
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("grid");

  const filters = [
    { key: "all", label: "All (12)" },
    { key: "progress", label: "In Progress (8)" },
    { key: "completed", label: "Completed (2)" },
    { key: "saved", label: "Saved (2)" },
  ];

  return (
    <div className="flex flex-col bg-[var(--bg)] font-['DM_Sans',sans-serif] text-[var(--text)]">
      {/* BREADCRUMB */}
      <div className="flex items-center gap-[5px] px-[18px] h-[30px] bg-[var(--surface)] border-b border-[var(--border)] font-['JetBrains_Mono',monospace] text-[10px] text-[var(--text3)] shrink-0">
        <span>futurestack</span><span className="text-[var(--border2)]">/</span>
        <span className="text-[var(--text2)]">rahul.sharma</span><span className="text-[var(--border2)]">/</span>
        <span className="text-[var(--orange)]">my-courses</span>
        <span className="ml-auto flex items-center gap-[6px]">
          <span className="text-[var(--green)] text-[10px]" style={{ animation: "pulse 1.6s ease infinite" }}>●</span>
          <span>8 in progress · 2 completed · 112h studied</span>
        </span>
      </div>

      {/* MAIN BODY */}
      <div className="p-[16px_18px] flex flex-col gap-[16px]">
        {/* TOOLBAR */}
        <div className="flex items-center gap-[8px] flex-wrap" style={{ animation: "fadeUp .3s .05s ease both" }}>
          <div className="flex bg-[var(--bg2)] border border-[var(--border)] rounded-[8px] overflow-hidden shrink-0">
            {filters.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className="px-[13px] py-[6px] text-[11.5px] font-semibold border-r border-[var(--border)] last:border-r-0 transition-all font-['DM_Sans',sans-serif] whitespace-nowrap"
                style={filter === f.key ? { background: "var(--surface)", color: "var(--orange)", boxShadow: "inset 0 0 0 1px rgba(240,90,26,.2)" } : { background: "transparent", color: "var(--text3)" }}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-[6px] bg-[var(--bg2)] border border-[var(--border)] rounded-[7px] px-[10px] h-[30px] w-[160px] transition-all focus-within:border-[var(--blue2)]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[var(--text3)]"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search courses…" className="bg-none bg-transparent border-none outline-none font-['JetBrains_Mono',monospace] text-[10px] text-[var(--text)] w-full placeholder:text-[var(--text3)]" />
          </div>
          <div className="flex items-center gap-[5px] ml-auto bg-[var(--bg2)] border border-[var(--border)] rounded-[7px] px-[10px] py-[4px] font-['JetBrains_Mono',monospace] text-[10px] text-[var(--text3)]">
            <span>Sort:</span>
            <select className="bg-none bg-transparent border-none outline-none font-['JetBrains_Mono',monospace] text-[10px] text-[var(--text3)] cursor-pointer">
              <option>Recently Accessed</option>
              <option>Progress %</option>
              <option>Deadline</option>
              <option>Title A–Z</option>
            </select>
          </div>
          <div className="flex bg-[var(--bg2)] border border-[var(--border)] rounded-[7px] overflow-hidden">
            <button onClick={() => setView("grid")} className="w-[30px] h-[30px] flex items-center justify-center border-r border-[var(--border)] last:border-r-0 text-xs transition-all"
              style={view === "grid" ? { background: "var(--surface)", color: "var(--orange)" } : { background: "transparent", color: "var(--text3)" }}>⊞</button>
            <button onClick={() => setView("list")} className="w-[30px] h-[30px] flex items-center justify-center border-r border-[var(--border)] last:border-r-0 text-xs transition-all"
              style={view === "list" ? { background: "var(--surface)", color: "var(--orange)" } : { background: "transparent", color: "var(--text3)" }}>☰</button>
          </div>
        </div>

        {/* SECTION HEAD + COURSE GRID */}
        <div>
          <div className="flex items-center gap-[8px] mb-[14px]">
            <span className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[var(--text3)]">// enrolled</span>
            <span className="font-['Syne',sans-serif] text-[13px] font-bold text-[var(--text)]">Enrolled Courses</span>
            <div className="flex-1 h-[1px] bg-[var(--border)]"></div>
            <a href="#" className="font-['JetBrains_Mono',monospace] text-[9.5px] font-semibold text-[var(--blue2)] px-[8px] py-[2px] border border-[rgba(59,130,246,.2)] rounded-[4px] transition-all whitespace-nowrap hover:bg-[var(--blue-d)]">Browse Catalog →</a>
          </div>

          <div className={`grid gap-[12px] ${view === "grid" ? "grid-cols-3" : "grid-cols-1"}`} style={{ animation: "fadeUp .3s .1s ease both" }}>
            {courses.filter((c) => filter === "all" || c.status === filter).map((c) => (
              <div key={c.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden transition-all cursor-pointer flex flex-col hover:translate-y-[-3px] hover:shadow-[0_10px_28px_rgba(0,0,0,.11)] hover:border-[var(--border2)]"
                style={view === "list" ? { display: "grid", gridTemplateColumns: "72px 1fr", borderRadius: "10px" } : {}}>
                {/* BANNER */}
                <div className={`h-[70px] relative overflow-hidden flex items-end justify-between px-[10px] py-[8px] ${c.banner}`}
                  style={{ background: c.id === 1 ? "linear-gradient(140deg,#040c1a 0%,#071822 45%,#0a200e 100%)" : c.id === 2 ? "linear-gradient(140deg,#060d18 0%,#101a06 50%,#1a1404 100%)" : c.id === 3 ? "linear-gradient(140deg,#060420 0%,#100820 50%,#1c0c18 100%)" : "linear-gradient(140deg,#050e16 0%,#061608 50%,#0e1808 100%)" }}>
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)", backgroundSize: "22px 22px" }}></div>
                  <div className="absolute w-[100px] h-[100px] rounded-full top-[-24px] right-[-18px] pointer-events-none blur-[32px] opacity-50"
                    style={{ background: c.id === 1 ? "rgba(59,130,246,.5)" : c.id === 2 ? "rgba(234,179,8,.45)" : c.id === 3 ? "rgba(168,85,247,.5)" : "rgba(34,197,94,.45)" }}></div>
                  <div className="text-[24px] leading-none absolute top-[9px] left-[10px]" style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,.55))" }}>{c.emoji}</div>
                  <span className={`font-['JetBrains_Mono',monospace] text-[7.5px] font-bold tracking-[.06em] px-[7px] py-[2px] rounded-[20px] border uppercase backdrop-blur-[4px] relative z-[1] ${c.pillCss}`}
                    style={{ background: c.status === "progress" ? "rgba(240,90,26,.25)" : c.status === "completed" ? "rgba(22,163,74,.25)" : "rgba(59,130,246,.25)", color: c.status === "progress" ? "#ffb89a" : c.status === "completed" ? "#86efac" : "#93c5fd", borderColor: c.status === "progress" ? "rgba(240,90,26,.5)" : c.status === "completed" ? "rgba(22,163,74,.5)" : "rgba(59,130,246,.5)" }}>
                    {c.status === "progress" ? "● In Progress" : "✓ Completed"}
                  </span>
                  <button className="text-sm text-[rgba(255,255,255,.4)] bg-[rgba(255,255,255,.06)] border border-[rgba(255,255,255,.1)] rounded-[5px] w-[20px] h-[20px] flex items-center justify-center transition-all relative z-[1] hover:text-white hover:bg-[rgba(255,255,255,.14)] hover:border-[rgba(255,255,255,.2)]">⋯</button>
                </div>

                {/* BODY */}
                <div className="p-[10px_12px_12px] flex flex-col flex-1">
                  {/* TAGS */}
                  <div className="flex gap-[4px] mb-[6px]">
                    <span className={`font-['JetBrains_Mono',monospace] text-[7.5px] font-bold px-[7px] py-[2px] rounded-[20px] tracking-[.04em] ${c.tag1Css}`}
                      style={c.id === 1 ? { background: "var(--orange-d)", color: "var(--orange)", border: "1px solid rgba(240,90,26,.2)" } : c.id === 2 ? { background: "var(--blue-d)", color: "var(--blue2)", border: "1px solid rgba(59,130,246,.2)" } : c.id === 3 ? { background: "var(--purple-d)", color: "var(--purple)", border: "1px solid rgba(147,51,234,.2)" } : { background: "var(--green-d)", color: "var(--green)", border: "1px solid rgba(22,163,74,.2)" }}>{c.tag1}</span>
                    <span className="font-['JetBrains_Mono',monospace] text-[7.5px] font-bold px-[7px] py-[2px] rounded-[20px] tracking-[.04em] tag-dim"
                      style={{ background: "var(--bg2)", color: "var(--text3)", border: "1px solid var(--border)" }}>{c.tag2}</span>
                  </div>
                  {/* NAME */}
                  <div className="font-['Syne',sans-serif] text-[13px] font-extrabold text-[var(--text)] leading-[1.25] mb-[2px]">{c.name}</div>
                  <div className="font-['JetBrains_Mono',monospace] text-[8.5px] text-[var(--text3)] mb-[9px] leading-[1.5]">{c.sub}</div>

                  {/* INSTRUCTOR */}
                  <div className="flex items-center gap-[6px] mb-[9px] px-[8px] py-[5px] bg-[var(--bg2)] rounded-[6px] border border-[var(--border)]">
                    <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center font-['JetBrains_Mono',monospace] text-[7px] font-bold text-white shrink-0" style={{ background: c.insBg }}>{c.insAv}</div>
                    <span className="text-[10px] font-semibold text-[var(--text2)] flex-1">{c.insName}</span>
                    <span className="font-['JetBrains_Mono',monospace] text-[8.5px] font-semibold text-[var(--yellow)]">{c.insRating}</span>
                  </div>

                  {/* PROGRESS */}
                  <div className="mb-[9px]">
                    <div className="flex justify-between items-center mb-[4px]">
                      <span className="font-['JetBrains_Mono',monospace] text-[8.5px] text-[var(--text3)]">{c.modules}</span>
                      <span className="font-['Syne',sans-serif] text-xs font-extrabold" style={{ color: c.color }}>{c.pct}%</span>
                    </div>
                    <div className="h-[4px] bg-[var(--border)] rounded-[99px] overflow-hidden mb-[4px]">
                      <div className="h-full rounded-[99px] transition-[width_.9s_ease]" style={{ width: `${c.pct}%`, background: c.id === 1 ? "linear-gradient(90deg,#f05a1a,#ff7a3c)" : c.id === 2 ? "linear-gradient(90deg,#2563eb,#3b82f6)" : c.id === 3 ? "linear-gradient(90deg,#9333ea,#c084fc)" : "linear-gradient(90deg,#16a34a,#4ade80)" }}></div>
                    </div>
                    <div className="flex items-center gap-[3px] text-[9.5px] text-[var(--text2)] font-medium mt-[3px]">
                      <span className="text-[9px]">▶</span>{c.next}
                    </div>
                    <div className="flex justify-between font-['JetBrains_Mono',monospace] text-[8.5px] text-[var(--text3)]">
                      <span>📅 Due {c.due}</span>
                      <span>{c.timeLeft}</span>
                    </div>
                  </div>

                  {/* FOOTER */}
                  <div className="flex items-center justify-between pt-[9px] border-t border-[var(--border)] mt-auto">
                    <div className="flex gap-[8px]">
                      <span className="font-['JetBrains_Mono',monospace] text-[8.5px]" style={{ color: c.extra.includes("Live") ? "var(--orange)" : "var(--text3)", fontWeight: c.extra.includes("Live") ? "600" : "400" }}>{c.extra}</span>
                    </div>
                    <button className={`px-[11px] py-[4px] rounded-[6px] text-[10px] font-bold whitespace-nowrap border-none flex items-center gap-[4px] transition-all ${c.cta}`}
                      style={c.id === 1 ? { background: "linear-gradient(135deg,var(--orange),var(--orange2))", color: "#fff", boxShadow: "0 2px 8px rgba(240,90,26,.3)" } : c.id === 2 ? { background: "linear-gradient(135deg,var(--blue),var(--blue2))", color: "#fff", boxShadow: "0 2px 8px rgba(37,99,235,.25)" } : c.id === 3 ? { background: "linear-gradient(135deg,var(--purple),#a855f7)", color: "#fff", boxShadow: "0 2px 8px rgba(147,51,234,.25)" } : { background: "linear-gradient(135deg,var(--green),#22c55e)", color: "#fff", boxShadow: "0 2px 8px rgba(22,163,74,.25)" }}>{c.ctaText}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* UPCOMING SESSIONS */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-[14px] py-[10px] border-b border-[var(--border)]">
              <span className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[var(--text3)]">Upcoming Sessions</span>
              <a href="#" className="font-['JetBrains_Mono',monospace] text-[9px] text-[var(--blue2)]">View all →</a>
            </div>
            {sessions.map((s) => (
              <div key={s.name} className="flex items-center gap-[10px] px-[14px] py-[10px] border-b border-[var(--border)] last:border-b-0 transition-all hover:bg-[var(--card-h)] cursor-pointer">
                <div className="text-center shrink-0 w-[32px]">
                  <div className="font-['Syne',sans-serif] text-[15px] font-extrabold text-[var(--text)] leading-none">{s.day}</div>
                  <div className="font-['JetBrains_Mono',monospace] text-[8px] text-[var(--text3)]">{s.dow}</div>
                </div>
                <div className="w-[1px] h-[30px] bg-[var(--border)] shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11.5px] font-semibold text-[var(--text)] whitespace-nowrap overflow-hidden text-ellipsis">{s.name}</div>
                  <div className="font-['JetBrains_Mono',monospace] text-[9px] text-[var(--text3)] mt-[1px]">{s.meta}</div>
                </div>
                <span className={`font-['JetBrains_Mono',monospace] text-[8.5px] font-semibold px-[8px] py-[2px] rounded-[3px] shrink-0 ${s.tagCss}`}
                  style={s.tag === "Live" ? { background: "rgba(34,197,94,.15)", color: "var(--green)" } : s.tag === "Quiz" ? { background: "var(--orange-d)", color: "var(--orange)" } : { background: "var(--blue-d)", color: "var(--blue2)" }}>{s.tag}</span>
              </div>
            ))}
          </div>
      </div>

      <style>{`
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      `}      </style>
    </div>
  );
}
