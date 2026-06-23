"use client";

const courses = [
  {
    id: 1, status: "progress",
    bannerBg: "bg-[#0c1f2e]", emoji: "⚛️",
    tags: [{ label: "Full Stack", cls: "bg-orange-500/10 text-[#f05a1a] dark:text-[#ff6a1a] border border-orange-500/20" }, { label: "Advanced", cls: "bg-[#f0f2f7] dark:bg-[#10141e] text-[#6b7280] dark:text-[#7a859a] border border-[#e2e6ef] dark:border-[#1e2535]" }],
    name: "MERN Stack Development",
    sub: "Module 13/20 · React Hooks Deep Dive next",
    instructor: { initials: "AV", name: "Aakash Verma", rating: "4.8", bg: "#f05a1a" },
    progress: 65, barColor: "from-[#f05a1a] to-[#ff7a3c]", labelColor: "text-[#f05a1a] dark:text-[#ff6a1a]",
    statusPill: "In Progress", pillCls: "bg-orange-500/10 text-[#f05a1a] dark:text-[#ff6a1a] border border-orange-500/30",
    cta: "Resume →", ctaCls: "bg-[#f05a1a] dark:bg-[#ff6a1a] text-white hover:bg-[#ff7a3c] dark:hover:bg-[#ff8c42]",
  },
  {
    id: 2, status: "progress",
    bannerBg: "bg-[#181a0e]", emoji: "🐍",
    tags: [{ label: "Programming", cls: "bg-blue-500/10 text-[#2563eb] dark:text-[#3b82f6] border border-blue-500/20" }, { label: "Beginner", cls: "bg-[#f0f2f7] dark:bg-[#10141e] text-[#6b7280] dark:text-[#7a859a] border border-[#e2e6ef] dark:border-[#1e2535]" }],
    name: "Python Programming",
    sub: "Module 6/20 · List Comprehension next",
    instructor: { initials: "PJ", name: "Priya Joshi", rating: "4.7", bg: "#2563eb" },
    progress: 30, barColor: "from-[#2563eb] to-[#3b82f6]", labelColor: "text-[#2563eb] dark:text-[#3b82f6]",
    statusPill: "In Progress", pillCls: "bg-blue-500/10 text-[#2563eb] dark:text-[#3b82f6] border border-blue-500/30",
    cta: "Continue →", ctaCls: "bg-[#2563eb] dark:bg-[#3b82f6] text-white hover:bg-[#3b82f6] dark:hover:bg-[#60a5fa]",
  },
  {
    id: 3, status: "progress",
    bannerBg: "bg-[#150f24]", emoji: "📊",
    tags: [{ label: "Data Science", cls: "bg-purple-500/10 text-[#9333ea] dark:text-[#a855f7] border border-purple-500/20" }, { label: "Intermediate", cls: "bg-[#f0f2f7] dark:bg-[#10141e] text-[#6b7280] dark:text-[#7a859a] border border-[#e2e6ef] dark:border-[#1e2535]" }],
    name: "Data Science with Pandas",
    sub: "Module 4/16 · DataFrame Merging next",
    instructor: { initials: "SM", name: "Sanjay Mehta", rating: "4.9", bg: "#9333ea" },
    progress: 25, barColor: "from-[#9333ea] to-[#a855f7]", labelColor: "text-[#9333ea] dark:text-[#a855f7]",
    statusPill: "In Progress", pillCls: "bg-orange-500/10 text-[#f05a1a] dark:text-[#ff6a1a] border border-orange-500/30",
    cta: "Continue →", ctaCls: "bg-[#9333ea] text-white hover:opacity-85",
  },
  {
    id: 4, status: "completed",
    bannerBg: "bg-[#0d1810]", emoji: "🎨",
    tags: [{ label: "Frontend", cls: "bg-green-500/10 text-[#16a34a] dark:text-[#22c55e] border border-green-500/20" }, { label: "Beginner", cls: "bg-[#f0f2f7] dark:bg-[#10141e] text-[#6b7280] dark:text-[#7a859a] border border-[#e2e6ef] dark:border-[#1e2535]" }],
    name: "HTML & CSS Mastery",
    sub: "Completed Apr 14, 2025 · Score 96%",
    instructor: { initials: "KD", name: "Kiran Das", rating: "4.8", bg: "#16a34a" },
    progress: 100, barColor: "from-[#16a34a] to-[#22c55e]", labelColor: "text-[#16a34a] dark:text-[#22c55e]",
    statusPill: "Completed", pillCls: "bg-green-500/10 text-[#16a34a] dark:text-[#22c55e] border border-green-500/30",
    cta: "View Cert →", ctaCls: "bg-[#16a34a] dark:bg-[#22c55e] text-white hover:opacity-85",
  },
];

const certificates = [
  { emoji: "🎨", bg: "bg-green-500/10", name: "HTML & CSS Mastery", meta: "Earned Apr 14, 2025", tag: "Earned", tagCls: "bg-green-500/10 text-[#16a34a] dark:text-[#22c55e]" },
  { emoji: "⚛️", bg: "bg-orange-500/10", name: "MERN Stack Development", meta: "65% complete", tag: "In Progress", tagCls: "bg-orange-500/10 text-[#f05a1a] dark:text-[#ff6a1a]" },
  { emoji: "📊", bg: "bg-[#f0f2f7] dark:bg-[#10141e]", name: "Data Science with Pandas", meta: "25% complete", tag: "Locked", tagCls: "bg-[#f0f2f7] dark:bg-[#10141e] text-[#6b7280] dark:text-[#7a859a] border border-[#e2e6ef] dark:border-[#1e2535]" },
  { emoji: "🐍", bg: "bg-[#f0f2f7] dark:bg-[#10141e]", name: "Python Programming", meta: "30% complete", tag: "Locked", tagCls: "bg-[#f0f2f7] dark:bg-[#10141e] text-[#6b7280] dark:text-[#7a859a] border border-[#e2e6ef] dark:border-[#1e2535]" },
];

const skills = [
  { n: "JavaScript", p: 78 },
  { n: "React.js", p: 65 },
  { n: "Node.js", p: 52 },
  { n: "Python", p: 30 },
  { n: "MongoDB", p: 44 },
  { n: "DevOps", p: 18 },
];

const schedule = [
  { day: 31, dn: "WED", title: "React Hooks Deep Dive", meta: "10:00 AM — 12:00 PM · by Aakash", tag: "LIVE", tc: "text-green-500 dark:text-green-400 bg-green-500/10" },
  { day: 1, dn: "THU", title: "Python Quiz · Chapter 3", meta: "Due by 11:59 PM", tag: "QUIZ", tc: "text-[#f05a1a] dark:text-[#ff6a1a] bg-orange-500/10" },
  { day: 2, dn: "FRI", title: "Node.js Auth — Live Session", meta: "2:00 PM — 4:00 PM · by Dr. Mehta", tag: "LIVE", tc: "text-green-500 dark:text-green-400 bg-green-500/10" },
  { day: 5, dn: "MON", title: "MERN Project Submission", meta: "Final deadline", tag: "SUBMIT", tc: "text-[#3b82f6] dark:text-[#60a5fa] bg-blue-500/10" },
];

const coursesSchedule = [
  { day: 18, dow: "WED", name: "MERN — React Hooks Live Q&A", meta: "10:00 AM · Aakash Verma · 90 min", tag: "Live", tagCls: "bg-green-500/10 text-[#16a34a] dark:text-[#22c55e]" },
  { day: 20, dow: "FRI", name: "Python — Chapter 6 Quiz", meta: "Due by 11:59 PM · 15 questions", tag: "Quiz", tagCls: "bg-orange-500/10 text-[#f05a1a] dark:text-[#ff6a1a]" },
  { day: 22, dow: "SUN", name: "Data Science — Assignment 2", meta: "Submit by midnight · Pandas project", tag: "Submit", tagCls: "bg-blue-500/10 text-[#2563eb] dark:text-[#3b82f6]" },
  { day: 25, dow: "WED", name: "Python — OOP Deep Dive Live", meta: "7:00 PM · Priya Joshi · 60 min", tag: "Live", tagCls: "bg-green-500/10 text-[#16a34a] dark:text-[#22c55e]" },
];

const achievements = [
  { icon: "🔥", name: "7-Day Streak", desc: "Week warrior" },
  { icon: "⚡", name: "Fast Learner", desc: "10 modules/week" },
  { icon: "🏆", name: "Top 10%", desc: "Quiz leaderboard" },
  { icon: "🎓", name: "Certificate", desc: "HTML/CSS" },
  { icon: "💎", name: "Diamond Coder", desc: "Complete 5 courses", locked: true },
  { icon: "🚀", name: "Placement", desc: "Get placed", locked: true },
];

const leaderboard = [
  { r: 1, i: "A", n: "Arjun Singh", s: 28, x: "2,840 XP", g: "from-amber-500 to-red-500", cls: "text-amber-500" },
  { r: 2, i: "P", n: "Priya Mehta", s: 21, x: "2,410 XP", g: "from-purple-500 to-pink-500", cls: "text-gray-400" },
  { r: 3, i: "S", n: "Sneha Kulkarni", s: 17, x: "1,990 XP", g: "from-green-500 to-blue-600", cls: "text-amber-700 dark:text-amber-500" },
  { r: 6, i: "R", n: "Rahul Sharma", s: 14, x: "1,240 XP", g: "from-blue-600 to-orange-500", me: true },
  { r: 7, i: "K", n: "Karan Patel", s: 9, x: "1,180 XP", g: "from-amber-500 to-green-500" },
];

const days = ["M", "T", "W", "T", "F", "S", "S"];

export default function OverviewSection() {
  return (
    <div className="flex flex-col gap-3.5">
      {/* WELCOME */}
      <div className="bg-gradient-to-br from-white to-[#f8fafc] dark:from-[#161b27] dark:to-[#1a2033] border border-[#e2e6ef] dark:border-[#1e2535] rounded-[10px] relative z-0">
        <div className="flex flex-col md:flex-row">
          <div className="p-[18px_22px] flex-1">
            <div className="flex items-center gap-1.5 mb-1.5 font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.12em] text-[#f05a1a] dark:text-[#ff6a1a]">
              <span className="w-[5px] h-[5px] rounded-full bg-[#f05a1a] dark:bg-[#ff6a1a] inline-block"></span>
              Good morning, Rahul · Tuesday, May 30
            </div>
            <div className="font-['Syne',sans-serif] text-xl font-extrabold text-[#111827] dark:text-[#e8eaf0] leading-[1.2] mb-1.5">Keep the <span className="text-[#f05a1a] dark:text-[#ff6a1a]">momentum</span> going 🚀</div>
            <div className="text-[11.5px] text-[#374151] dark:text-[#b0bac9] max-w-[400px] leading-[1.6]">You&apos;re 65% through MERN Stack. Complete today&apos;s module to stay on track for your June 15 target.</div>
            <div className="flex gap-2 mt-3">
              <button className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-[6px] bg-[#f05a1a] dark:bg-[#ff6a1a] text-white text-[11.5px] font-semibold shadow-[0_3px_14px_rgba(240,90,26,.35)] hover:bg-[#ff7a3c] dark:hover:bg-[#ff8c42] hover:-translate-y-px hover:shadow-[0_5px_18px_rgba(240,90,26,.45)] transition-all">▶ Continue MERN Stack</button>
              <button className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[6px] bg-transparent text-[#374151] dark:text-[#b0bac9] border border-[#d0d6e4] dark:border-[#263048] text-[11.5px] font-medium hover:border-[#3b82f6] dark:hover:border-[#60a5fa] hover:text-[#3b82f6] dark:hover:text-[#60a5fa] hover:bg-blue-500/10 transition-all">📅 View Schedule</button>
            </div>
          </div>
          <div className="p-[18px_22px] flex items-center gap-3.5 relative z-[1] border-t md:border-t-0 md:border-l border-[#e2e6ef] dark:border-[#1e2535]">
            <div className="relative w-[72px] h-[72px] shrink-0">
              <svg width="72" height="72" viewBox="0 0 72 72" className="rotate-[-90deg]">
                <circle cx="36" cy="36" r="30" fill="none" stroke="#e2e6ef" strokeWidth="5"/>
                <circle cx="36" cy="36" r="30" fill="none" stroke="#f05a1a" strokeWidth="5" strokeDasharray="188.5" strokeDashoffset="71.6" strokeLinecap="round"/>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-['Syne',sans-serif] text-sm font-extrabold text-[#111827] dark:text-[#e8eaf0]">62%</div>
                <div className="font-['JetBrains_Mono',monospace] text-[8px] text-[#6b7280] dark:text-[#7a859a]">Level</div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-[7px]"><span className="text-sm">⚡</span><div><div className="font-['Syne',sans-serif] text-[13px] font-bold text-[#111827] dark:text-[#e8eaf0] leading-none">1,240</div><div className="font-['JetBrains_Mono',monospace] text-[9px] text-[#6b7280] dark:text-[#7a859a]">Total XP</div></div></div>
              <div className="flex items-center gap-[7px]"><span className="text-sm">🔥</span><div><div className="font-['Syne',sans-serif] text-[13px] font-bold text-[#111827] dark:text-[#e8eaf0] leading-none">14</div><div className="font-['JetBrains_Mono',monospace] text-[9px] text-[#6b7280] dark:text-[#7a859a]">Day Streak</div></div></div>
              <div className="flex items-center gap-[7px]"><span className="text-sm">🏅</span><div><div className="font-['Syne',sans-serif] text-[13px] font-bold text-[#111827] dark:text-[#e8eaf0] leading-none">3</div><div className="font-['JetBrains_Mono',monospace] text-[9px] text-[#6b7280] dark:text-[#7a859a]">Certificates</div></div></div>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#111520] border border-[#e2e6ef] dark:border-[#1e2535] rounded-[6px] font-['JetBrains_Mono',monospace] text-[10px] text-[#6b7280] dark:text-[#7a859a] shrink-0">
        <span>futurestack</span><span className="text-[#d0d6e4] dark:text-[#263048]">/</span>
        <span>students</span><span className="text-[#d0d6e4] dark:text-[#263048]">/</span>
        <span className="text-[#374151] dark:text-[#b0bac9]">rahul.sharma</span><span className="text-[#d0d6e4] dark:text-[#263048]">/</span>
        <span className="text-[#374151] dark:text-[#b0bac9]">dashboard</span>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[
          { icon: "📚", num: "3", lbl: "Active Courses", delta: "+1 this month", dc: "bg-blue-500/10 text-[#3b82f6] dark:text-[#60a5fa]", bc: "bg-orange-500/10" },
          { icon: "⏱️", num: "47h", lbl: "Hours Studied", delta: "↑ 12h this week", dc: "bg-green-500/10 text-green-600 dark:text-green-500", bc: "bg-blue-500/10" },
          { icon: "✅", num: "24", lbl: "Modules Done", delta: "↑ 6 this week", dc: "bg-green-500/10 text-green-600 dark:text-green-500", bc: "bg-green-500/10" },
          { icon: "🎯", num: "92%", lbl: "Quiz Avg.", delta: "Top 8%", dc: "bg-orange-500/10 text-[#f05a1a] dark:text-[#ff6a1a]", bc: "bg-purple-500/10" },
        ].map(k => (
          <div key={k.lbl} className="bg-white dark:bg-[#161b27] border border-[#e2e6ef] dark:border-[#1e2535] rounded-[9px] p-[13px_14px] flex items-start gap-2.5 cursor-default hover:border-[#d0d6e4] dark:hover:border-[#263048] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,.1)] dark:hover:shadow-[0_6px_24px_rgba(0,0,0,.45)] transition-all">
            <div className={`w-[34px] h-[34px] rounded-[7px] flex items-center justify-center text-base shrink-0 ${k.bc}`}>{k.icon}</div>
            <div>
              <div className="font-['Syne',sans-serif] text-xl font-extrabold text-[#111827] dark:text-[#e8eaf0] leading-none">{k.num}</div>
              <div className="text-[10.5px] text-[#374151] dark:text-[#b0bac9] mt-0.5">{k.lbl}</div>
              <div className={`font-['JetBrains_Mono',monospace] text-[9px] mt-1 px-[6px] py-[1px] rounded-[3px] inline-block ${k.dc}`}>{k.delta}</div>
            </div>
          </div>
        ))}
      </div>

      {/* SKILLS + SCHEDULE + ACHIEVEMENTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* SKILLS */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[#6b7280] dark:text-[#7a859a]">// skills</span>
            <span className="font-['Syne',sans-serif] text-[13.5px] font-bold text-[#111827] dark:text-[#e8eaf0]">Skill Progress</span>
            <div className="flex-1 h-px bg-[#e2e6ef] dark:bg-[#1e2535]"></div>
          </div>
          <div className="bg-white dark:bg-[#161b27] border border-[#e2e6ef] dark:border-[#1e2535] rounded-[9px] p-3">
            {skills.map(s => (
              <div key={s.n} className="flex items-center gap-2 mb-2 last:mb-0">
                <span className="font-['JetBrains_Mono',monospace] text-[9.5px] font-medium text-[#374151] dark:text-[#b0bac9] w-20 shrink-0">{s.n}</span>
                <div className="flex-1 h-[5px] bg-[#e2e6ef] dark:bg-[#1e2535] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#f05a1a] to-[#ff7a3c]" style={{ width: `${s.p}%` }}></div>
                </div>
                <span className="font-['JetBrains_Mono',monospace] text-[9px] text-[#6b7280] dark:text-[#7a859a] w-7 text-right shrink-0">{s.p}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* SCHEDULE */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[#6b7280] dark:text-[#7a859a]">// schedule</span>
            <span className="font-['Syne',sans-serif] text-[13.5px] font-bold text-[#111827] dark:text-[#e8eaf0]">Upcoming</span>
            <div className="flex-1 h-px bg-[#e2e6ef] dark:bg-[#1e2535]"></div>
          </div>
          <div className="bg-white dark:bg-[#161b27] border border-[#e2e6ef] dark:border-[#1e2535] rounded-[9px] overflow-hidden">
            <div className="flex border-b border-[#e2e6ef] dark:border-[#1e2535]">
              <div className="flex-1 py-2 text-center font-['JetBrains_Mono',monospace] text-[9.5px] font-semibold text-[#111827] dark:text-[#e8eaf0] border-b-2 border-b-[#f05a1a] dark:border-b-[#ff6a1a] cursor-pointer">This Week</div>
              <div className="flex-1 py-2 text-center font-['JetBrains_Mono',monospace] text-[9.5px] font-semibold text-[#6b7280] dark:text-[#7a859a] cursor-pointer hover:text-[#374151] dark:hover:text-[#b0bac9]">Next Week</div>
            </div>
            <div className="p-[10px_12px] flex flex-col gap-2">
              {schedule.map((s, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2 rounded-[7px] bg-[#f0f2f7] dark:bg-[#10141e] border border-[#e2e6ef] dark:border-[#1e2535] hover:border-[#d0d6e4] dark:hover:border-[#263048] cursor-pointer transition-all">
                  <div className="text-center shrink-0 w-[34px]">
                    <div className="font-['Syne',sans-serif] text-base font-extrabold text-[#111827] dark:text-[#e8eaf0] leading-none">{s.day}</div>
                    <div className="font-['JetBrains_Mono',monospace] text-[8px] text-[#6b7280] dark:text-[#7a859a]">{s.dn}</div>
                  </div>
                  <div className="w-px h-8 bg-[#e2e6ef] dark:bg-[#1e2535] shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-[#111827] dark:text-[#e8eaf0] truncate">{s.title}</div>
                    <div className="font-['JetBrains_Mono',monospace] text-[9px] text-[#6b7280] dark:text-[#7a859a] mt-[1px]">{s.meta}</div>
                  </div>
                  <span className={`font-['JetBrains_Mono',monospace] text-[8.5px] font-semibold px-[7px] py-[2px] rounded-[3px] shrink-0 ${s.tc}`}>{s.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ACHIEVEMENTS */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[#6b7280] dark:text-[#7a859a]">// badges</span>
            <span className="font-['Syne',sans-serif] text-[13.5px] font-bold text-[#111827] dark:text-[#e8eaf0]">Achievements</span>
            <div className="flex-1 h-px bg-[#e2e6ef] dark:bg-[#1e2535]"></div>
          </div>
          <div className="bg-white dark:bg-[#161b27] border border-[#e2e6ef] dark:border-[#1e2535] rounded-[9px] p-3">
            <div className="grid grid-cols-3 gap-2">
              {achievements.map((a, i) => (
                <div key={i} className={`bg-[#f0f2f7] dark:bg-[#10141e] border border-[#e2e6ef] dark:border-[#1e2535] rounded-[7px] p-[10px_8px] flex flex-col items-center gap-1 hover:border-[#f05a1a] dark:hover:border-[#ff6a1a] hover:-translate-y-0.5 transition-all cursor-default ${a.locked ? "opacity-40" : ""}`}>
                  <div className="text-[22px]">{a.icon}</div>
                  <div className="font-['JetBrains_Mono',monospace] text-[8.5px] font-semibold text-[#111827] dark:text-[#e8eaf0] text-center">{a.name}</div>
                  <div className="text-[9px] text-[#6b7280] dark:text-[#7a859a] text-center leading-[1.3]">{a.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* LEADERBOARD + STREAK */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* LEADERBOARD */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[#6b7280] dark:text-[#7a859a]">// rank</span>
            <span className="font-['Syne',sans-serif] text-[13.5px] font-bold text-[#111827] dark:text-[#e8eaf0]">Batch Leaderboard</span>
            <div className="flex-1 h-px bg-[#e2e6ef] dark:bg-[#1e2535]"></div>
            <a href="#" className="font-['JetBrains_Mono',monospace] text-[9.5px] font-semibold text-[#3b82f6] dark:text-[#60a5fa] px-2 py-0.5 border border-blue-500/25 rounded-[4px] hover:bg-blue-500/10 hover:border-[#3b82f6] dark:hover:border-[#60a5fa] transition-all whitespace-nowrap">Full Rankings →</a>
          </div>
          <div className="bg-white dark:bg-[#161b27] border border-[#e2e6ef] dark:border-[#1e2535] rounded-[9px] overflow-hidden">
            {leaderboard.map((l, i) => (
              <div key={i} className={`flex items-center gap-[9px] px-3 py-2 border-b border-[#e2e6ef] dark:border-[#1e2535] last:border-b-0 cursor-default hover:bg-[#f8f9fc] dark:hover:bg-[#1b2133] ${l.me ? "bg-orange-500/[0.06] border-l-2 border-l-[#f05a1a] dark:border-l-[#ff6a1a]" : ""}`}>
                <span className={`font-['JetBrains_Mono',monospace] text-[11px] font-bold w-5 text-center shrink-0 ${l.cls ? l.cls : l.me ? "text-[#f05a1a] dark:text-[#ff6a1a]" : "text-[#6b7280] dark:text-[#7a859a]"}`}>{l.r}</span>
                <div className={`w-6 h-6 rounded-full text-[9px] font-bold text-white flex items-center justify-center shrink-0 bg-gradient-to-br ${l.g}`}>{l.i}</div>
                <span className="flex-1 text-[11.5px] font-medium text-[#111827] dark:text-[#e8eaf0]">{l.n}{l.me ? <span className="font-['JetBrains_Mono',monospace] text-[9px] text-[#f05a1a] dark:text-[#ff6a1a] ml-1">(you)</span> : null}</span>
                <span className="font-['JetBrains_Mono',monospace] text-[9px] text-amber-500 shrink-0">🔥 {l.s}</span>
                <span className="font-['JetBrains_Mono',monospace] text-[10px] font-semibold text-[#374151] dark:text-[#b0bac9] shrink-0">{l.x}</span>
              </div>
            ))}
          </div>
        </div>

        {/* STREAK */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[#6b7280] dark:text-[#7a859a]">// activity</span>
            <span className="font-['Syne',sans-serif] text-[13.5px] font-bold text-[#111827] dark:text-[#e8eaf0]">Learning Streak</span>
            <div className="flex-1 h-px bg-[#e2e6ef] dark:bg-[#1e2535]"></div>
          </div>
          <div className="bg-white dark:bg-[#161b27] border border-[#e2e6ef] dark:border-[#1e2535] rounded-[9px] p-3">
            <div className="grid grid-cols-7 gap-1">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, di) => (
                <div key={di} className="flex flex-col gap-[3px] items-center">
                  <div className="font-['JetBrains_Mono',monospace] text-[8px] text-[#6b7280] dark:text-[#7a859a] mb-0.5">{day}</div>
                  {[0, 1, 2, 3].map(r => {
                    const seed = di * 4 + r;
                    let lvl = 0;
                    if (seed < 8) lvl = 0;
                    else if (seed < 16) lvl = seed % 3 === 0 ? 0 : seed % 3;
                    else lvl = seed % 5 === 0 ? 0 : Math.min(seed % 4, 3);
                    return <div key={r} className={`w-full aspect-square rounded-[3px] ${lvl === 0 ? "bg-[#e2e6ef] dark:bg-[#1e2535]" : lvl === 1 ? "bg-orange-500/25" : lvl === 2 ? "bg-orange-500/50" : "bg-[#f05a1a] dark:bg-[#ff6a1a]"}`}></div>;
                  })}
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#e2e6ef] dark:border-[#1e2535]">
              <div>
                <div className="font-['Syne',sans-serif] text-xl font-extrabold text-[#f05a1a] dark:text-[#ff6a1a]">14</div>
                <div className="font-['JetBrains_Mono',monospace] text-[9px] text-[#6b7280] dark:text-[#7a859a]">day streak</div>
              </div>
              <div className="text-right">
                <div className="font-['JetBrains_Mono',monospace] text-[9px] text-[#6b7280] dark:text-[#7a859a] leading-[1.5]">Best: 21 days<br/>This month: 22/30 days</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
