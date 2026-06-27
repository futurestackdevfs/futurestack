"use client";

import Link from "next/link";
import type { DashboardUser, EnrolledCourse } from "../../hooks/student-dashboard";

interface Props {
  user: DashboardUser | null;
  enrolledCourses: EnrolledCourse[];
  isLoading: boolean;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate(): string {
  const d = new Date();
  const dow = d.toLocaleDateString("en-US", { weekday: "long" });
  const month = d.toLocaleDateString("en-US", { month: "long" });
  return `${dow}, ${month} ${d.getDate()}`;
}

function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ".");
}

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

export default function OverviewSection({ user, enrolledCourses, isLoading }: Props) {
  const firstName = user?.name.split(" ")[0] ?? (isLoading ? "…" : "there");
  const slug = user ? nameToSlug(user.name) : "student";
  const greeting = getGreeting();
  const dateLabel = getFormattedDate();

  const firstCourse = enrolledCourses.find(c => c.progressPercent < 100) ?? enrolledCourses[0] ?? null;
  const ringPct = firstCourse?.progressPercent ?? 0;
  const ringOffset = Number((188.5 * (1 - ringPct / 100)).toFixed(1));

  const activeCourseCount = enrolledCourses.filter(c => c.progressPercent < 100).length;
  const totalCompleted = enrolledCourses.reduce((sum, c) => sum + c.completedVideos, 0);

  const welcomeBody = isLoading
    ? "Loading your progress…"
    : firstCourse
      ? `You're ${firstCourse.progressPercent}% through ${firstCourse.title}. Complete today's module to stay on track.`
      : "Welcome back! Browse our catalog to find your next course.";

  const continueLabel = firstCourse ? `▶ Continue ${firstCourse.title}` : "Browse Courses";

  return (
    <div className="flex flex-col gap-3.5">
      {/* WELCOME */}
      <div className="bg-gradient-to-br from-white to-[#f8fafc] dark:from-[#161b27] dark:to-[#1a2033] border border-[#e2e6ef] dark:border-[#1e2535] rounded-[10px] relative z-0">
        <div className="flex flex-col md:flex-row">
          <div className="p-[18px_22px] flex-1">
            <div className="flex items-center gap-1.5 mb-1.5 font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.12em] text-[#f05a1a] dark:text-[#ff6a1a]">
              <span className="w-[5px] h-[5px] rounded-full bg-[#f05a1a] dark:bg-[#ff6a1a] inline-block"></span>
              {greeting}, {firstName} · {dateLabel}
            </div>
            <div className="font-['Syne',sans-serif] text-xl font-extrabold text-[#111827] dark:text-[#e8eaf0] leading-[1.2] mb-1.5">Keep the <span className="text-[#f05a1a] dark:text-[#ff6a1a]">momentum</span> going 🚀</div>
            <div className="text-[11.5px] text-[#374151] dark:text-[#b0bac9] max-w-[400px] leading-[1.6]">{welcomeBody}</div>
            <div className="flex gap-2 mt-3">
              {firstCourse ? (
                <button className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-[6px] bg-[#f05a1a] dark:bg-[#ff6a1a] text-white text-[11.5px] font-semibold shadow-[0_3px_14px_rgba(240,90,26,.35)] hover:bg-[#ff7a3c] dark:hover:bg-[#ff8c42] hover:-translate-y-px hover:shadow-[0_5px_18px_rgba(240,90,26,.45)] transition-all">{continueLabel}</button>
              ) : (
                <Link href="/students/courses" className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-[6px] bg-[#f05a1a] dark:bg-[#ff6a1a] text-white text-[11.5px] font-semibold shadow-[0_3px_14px_rgba(240,90,26,.35)] hover:bg-[#ff7a3c] dark:hover:bg-[#ff8c42] hover:-translate-y-px hover:shadow-[0_5px_18px_rgba(240,90,26,.45)] transition-all no-underline">Browse Courses</Link>
              )}
              <button className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[6px] bg-transparent text-[#374151] dark:text-[#b0bac9] border border-[#d0d6e4] dark:border-[#263048] text-[11.5px] font-medium hover:border-[#3b82f6] dark:hover:border-[#60a5fa] hover:text-[#3b82f6] dark:hover:text-[#60a5fa] hover:bg-blue-500/10 transition-all">📅 View Schedule</button>
            </div>
          </div>
          <div className="p-[18px_22px] flex items-center gap-3.5 relative z-[1] border-t md:border-t-0 md:border-l border-[#e2e6ef] dark:border-[#1e2535]">
            <div className="relative w-[72px] h-[72px] shrink-0">
              <svg width="72" height="72" viewBox="0 0 72 72" className="rotate-[-90deg]">
                <circle cx="36" cy="36" r="30" fill="none" stroke="#e2e6ef" strokeWidth="5"/>
                <circle cx="36" cy="36" r="30" fill="none" stroke="#f05a1a" strokeWidth="5" strokeDasharray="188.5" strokeDashoffset={ringOffset} strokeLinecap="round"/>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-['Syne',sans-serif] text-sm font-extrabold text-[#111827] dark:text-[#e8eaf0]">{isLoading ? "…" : `${ringPct}%`}</div>
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
        <span className="text-[#374151] dark:text-[#b0bac9]">{slug}</span><span className="text-[#d0d6e4] dark:text-[#263048]">/</span>
        <span className="text-[#374151] dark:text-[#b0bac9]">dashboard</span>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[
          { icon: "📚", num: isLoading ? "…" : activeCourseCount.toString(), lbl: "Active Courses", delta: "+1 this month", dc: "bg-blue-500/10 text-[#3b82f6] dark:text-[#60a5fa]", bc: "bg-orange-500/10" },
          { icon: "⏱️", num: "47h", lbl: "Hours Studied", delta: "↑ 12h this week", dc: "bg-green-500/10 text-green-600 dark:text-green-500", bc: "bg-blue-500/10" },
          { icon: "✅", num: isLoading ? "…" : totalCompleted.toString(), lbl: "Modules Done", delta: "↑ 6 this week", dc: "bg-green-500/10 text-green-600 dark:text-green-500", bc: "bg-green-500/10" },
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
