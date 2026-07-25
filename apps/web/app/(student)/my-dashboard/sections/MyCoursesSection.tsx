"use client";

import { useState } from "react";
import Link from "next/link";
import type { EnrolledCourse } from "../../hooks/student-dashboard";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

interface Props {
  enrolledCourses: EnrolledCourse[];
  isLoading: boolean;
  onCourseClick?: (courseId: string) => void;
}

const CARD_COLORS = [
  {
    banner: "linear-gradient(140deg,#040c1a 0%,#071822 45%,#0a200e 100%)",
    glow: "rgba(59,130,246,.5)",
    bar: "linear-gradient(90deg,#f05a1a,#ff7a3c)",
    pctColor: "var(--orange)",
    pill: { bg: "rgba(240,90,26,.25)", color: "#ffb89a", border: "rgba(240,90,26,.5)" },
    tag: { bg: "var(--orange-d)", color: "var(--orange)", border: "1px solid rgba(240,90,26,.2)" },
    cta: { bg: "linear-gradient(135deg,var(--orange),var(--orange2))", shadow: "0 2px 8px rgba(240,90,26,.3)" },
  },
  {
    banner: "linear-gradient(140deg,#060d18 0%,#101a06 50%,#1a1404 100%)",
    glow: "rgba(234,179,8,.45)",
    bar: "linear-gradient(90deg,#2563eb,#3b82f6)",
    pctColor: "var(--blue2)",
    pill: { bg: "rgba(37,99,235,.25)", color: "#93c5fd", border: "rgba(37,99,235,.5)" },
    tag: { bg: "var(--blue-d)", color: "var(--blue2)", border: "1px solid rgba(59,130,246,.2)" },
    cta: { bg: "linear-gradient(135deg,var(--blue),var(--blue2))", shadow: "0 2px 8px rgba(37,99,235,.25)" },
  },
  {
    banner: "linear-gradient(140deg,#060420 0%,#100820 50%,#1c0c18 100%)",
    glow: "rgba(168,85,247,.5)",
    bar: "linear-gradient(90deg,#9333ea,#c084fc)",
    pctColor: "var(--purple)",
    pill: { bg: "rgba(147,51,234,.25)", color: "#d8b4fe", border: "rgba(147,51,234,.5)" },
    tag: { bg: "var(--purple-d)", color: "var(--purple)", border: "1px solid rgba(147,51,234,.2)" },
    cta: { bg: "linear-gradient(135deg,var(--purple),#a855f7)", shadow: "0 2px 8px rgba(147,51,234,.25)" },
  },
  {
    banner: "linear-gradient(140deg,#050e16 0%,#061608 50%,#0e1808 100%)",
    glow: "rgba(34,197,94,.45)",
    bar: "linear-gradient(90deg,#16a34a,#4ade80)",
    pctColor: "var(--green)",
    pill: { bg: "rgba(22,163,74,.25)", color: "#86efac", border: "rgba(22,163,74,.5)" },
    tag: { bg: "var(--green-d)", color: "var(--green)", border: "1px solid rgba(22,163,74,.2)" },
    cta: { bg: "linear-gradient(135deg,var(--green),#22c55e)", shadow: "0 2px 8px rgba(22,163,74,.25)" },
  },
];

const EMOJIS = ["⚛️", "🐍", "📊", "🎨", "🧠", "☁️", "📱", "🔧", "🗄️", "🛡️", "📈", "🌐"];

const STATIC_SESSIONS = [
  { day: "18", dow: "WED", name: "MERN — React Hooks Live Q&A", meta: "10:00 AM · Aakash Verma · 90 min", tag: "Live", tagStyle: { background: "rgba(34,197,94,.15)", color: "var(--green)" } },
  { day: "20", dow: "FRI", name: "Python — Chapter 6 Quiz", meta: "Due by 11:59 PM · 15 questions", tag: "Quiz", tagStyle: { background: "var(--orange-d)", color: "var(--orange)" } },
  { day: "22", dow: "SUN", name: "Data Science — Assignment 2", meta: "Submit by midnight · Pandas project", tag: "Submit", tagStyle: { background: "var(--blue-d)", color: "var(--blue2)" } },
  { day: "25", dow: "WED", name: "Python — OOP Deep Dive Live", meta: "7:00 PM · Priya Joshi · 60 min", tag: "Live", tagStyle: { background: "rgba(34,197,94,.15)", color: "var(--green)" } },
];

function SkeletonCard() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden animate-pulse flex flex-col">
      <div className="h-[70px] bg-[var(--bg2)]" />
      <div className="p-[10px_12px_12px] flex flex-col gap-2">
        <div className="h-3 bg-[var(--border)] rounded w-2/3" />
        <div className="h-2 bg-[var(--border)] rounded w-full" />
        <div className="h-2 bg-[var(--border)] rounded w-4/5" />
        <div className="h-1.5 bg-[var(--border)] rounded-full mt-2" />
        <div className="h-2 bg-[var(--border)] rounded w-1/2" />
      </div>
    </div>
  );
}

export default function MyCoursesSection({ enrolledCourses, isLoading, onCourseClick }: Props) {
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("grid");
  const [searchText, setSearchText] = useState("");
  const [sort, setSort] = useState("progress");

  const inProgress = enrolledCourses.filter(c => c.progressPercent < 100);
  const completed = enrolledCourses.filter(c => c.progressPercent === 100);

  const filters = [
    { key: "all", label: `All (${enrolledCourses.length})` },
    { key: "progress", label: `In Progress (${inProgress.length})` },
    { key: "completed", label: `Completed (${completed.length})` },
    { key: "saved", label: "Saved (0)" },
  ];

  const baseFiltered =
    filter === "all" ? enrolledCourses
    : filter === "progress" ? inProgress
    : filter === "completed" ? completed
    : [];

  const searched = searchText.trim()
    ? baseFiltered.filter(c => c.title.toLowerCase().includes(searchText.toLowerCase()))
    : baseFiltered;

  const visibleCourses = sort === "title"
    ? [...searched].sort((a, b) => a.title.localeCompare(b.title))
    : [...searched].sort((a, b) => b.progressPercent - a.progressPercent);

  return (
    <div className="flex flex-col bg-[var(--bg)] font-['DM_Sans',sans-serif] text-[var(--text)]">
      {/* BREADCRUMB */}
      <div className="flex items-center gap-[5px] px-[18px] h-[30px] bg-[var(--surface)] border-b border-[var(--border)] font-['JetBrains_Mono',monospace] text-[10px] text-[var(--text3)] shrink-0">
        <span>futurestack</span><span className="text-[var(--border2)]">/</span>
        <span className="text-[var(--text2)]">my-courses</span>
        <span className="ml-auto flex items-center gap-[6px]">
          <span className="text-[var(--green)] text-[10px]" style={{ animation: "pulse 1.6s ease infinite" }}>●</span>
          <span>
            {isLoading
              ? "Loading…"
              : `${inProgress.length} in progress · ${completed.length} completed`}
          </span>
        </span>
      </div>

      {/* MAIN BODY */}
      <div className="p-[16px_18px] flex flex-col gap-[16px]">
        {/* TOOLBAR */}
        <div className="flex items-center gap-[8px] flex-wrap" style={{ animation: "fadeUp .3s .05s ease both" }}>
          <div className="flex bg-[var(--bg2)] border border-[var(--border)] rounded-[8px] overflow-hidden shrink-0">
            {filters.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className="px-[13px] py-[6px] text-[11.5px] font-semibold border-r border-[var(--border)] last:border-r-0 transition-all font-['DM_Sans',sans-serif] whitespace-nowrap"
                style={filter === f.key ? { background: "var(--surface)", color: "var(--orange)", boxShadow: "inset 0 0 0 1px rgba(240,90,26,.2)" } : { background: "transparent", color: "var(--text3)" }}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-[6px] bg-[var(--bg2)] border border-[var(--border)] rounded-[7px] px-[10px] h-[30px] w-[160px] transition-all focus-within:border-[var(--blue2)]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[var(--text3)]"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              placeholder="Search courses…"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="bg-transparent border-none outline-none font-['JetBrains_Mono',monospace] text-[10px] text-[var(--text)] w-full placeholder:text-[var(--text3)]"
            />
          </div>
          <div className="flex items-center gap-[5px] ml-auto bg-[var(--bg2)] border border-[var(--border)] rounded-[7px] px-[10px] py-[4px] font-['JetBrains_Mono',monospace] text-[10px] text-[var(--text3)]">
            <span>Sort:</span>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="bg-transparent border-none outline-none font-['JetBrains_Mono',monospace] text-[10px] text-[var(--text3)] cursor-pointer">
              <option value="progress">Progress %</option>
              <option value="title">Title A–Z</option>
            </select>
          </div>
          <div className="flex bg-[var(--bg2)] border border-[var(--border)] rounded-[7px] overflow-hidden">
            <button onClick={() => setView("grid")} className="w-[30px] h-[30px] flex items-center justify-center border-r border-[var(--border)] last:border-r-0 text-xs transition-all"
              style={view === "grid" ? { background: "var(--surface)", color: "var(--orange)" } : { background: "transparent", color: "var(--text3)" }}>⊞</button>
            <button onClick={() => setView("list")} className="w-[30px] h-[30px] flex items-center justify-center text-xs transition-all"
              style={view === "list" ? { background: "var(--surface)", color: "var(--orange)" } : { background: "transparent", color: "var(--text3)" }}>☰</button>
          </div>
        </div>

        {/* COURSE GRID */}
        <div>
          <div className="flex items-center gap-[8px] mb-[14px]">
            <span className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[var(--text3)]">// enrolled</span>
            <span className="font-['Syne',sans-serif] text-[13px] font-bold text-[var(--text)]">Enrolled Courses</span>
            <div className="flex-1 h-[1px] bg-[var(--border)]"></div>
            <Link href="/courses" className="font-['JetBrains_Mono',monospace] text-[9.5px] font-semibold text-[var(--blue2)] px-[8px] py-[2px] border border-[rgba(59,130,246,.2)] rounded-[4px] transition-all whitespace-nowrap hover:bg-[var(--blue-d)] no-underline">Browse Catalog →</Link>
          </div>

          {isLoading ? (
            <div className={`grid gap-[12px] ${view === "grid" ? "grid-cols-3" : "grid-cols-1"}`}>
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
          ) : enrolledCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-[60px] px-6 text-center">
              <div className="w-[56px] h-[56px] rounded-full bg-gradient-to-br from-[#f05a1a] to-[#ff7a3c] flex items-center justify-center text-[24px] mb-[14px] shadow-[0_4px_16px_rgba(240,90,26,.3)]">🎓</div>
              <div className="font-['Syne',sans-serif] text-[15px] font-bold text-[var(--text)] mb-[6px]">No enrolled courses yet</div>
              <div className="font-['JetBrains_Mono',monospace] text-[10px] text-[var(--text3)] mb-[18px] max-w-[280px] leading-[1.6]">Start your learning journey by exploring our course catalog.</div>
              <Link href="/courses" className="inline-flex items-center gap-[7px] px-[20px] py-[9px] rounded-[8px] text-[12.5px] font-bold text-white bg-gradient-to-r from-[#f05a1a] to-[#ff7a3c] shadow-[0_4px_14px_rgba(240,90,26,.3)] hover:shadow-[0_6px_20px_rgba(240,90,26,.4)] hover:-translate-y-[1px] transition-all no-underline">
                Browse Courses →
              </Link>
            </div>
          ) : visibleCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-3">📭</div>
              <div className="font-['Syne',sans-serif] text-[14px] font-bold text-[var(--text)] mb-1">No courses here</div>
              <div className="font-['JetBrains_Mono',monospace] text-[10px] text-[var(--text3)]">
                {filter === "saved" ? "You haven't saved any courses yet."
                  : searchText ? `No courses match "${searchText}".`
                  : "Nothing matches this filter."}
              </div>
            </div>
          ) : (
            <div className={`grid gap-[12px] ${view === "grid" ? "grid-cols-3" : "grid-cols-1"}`} style={{ animation: "fadeUp .3s .1s ease both" }}>
              {visibleCourses.map((course, idx) => {
                const colors = CARD_COLORS[idx % CARD_COLORS.length];
                const emoji = EMOJIS[idx % EMOJIS.length];
                const isCompleted = course.progressPercent === 100;
                const moduleLabel = course.totalVideos > 0
                  ? `${course.completedVideos} / ${course.totalVideos} videos`
                  : "Not started";
                const nextLabel = course.nextVideo?.title
                  ?? (isCompleted ? "🏅 Certificate ready" : "No content yet");
                const timeLeft = isCompleted
                  ? `${course.hoursRemaining}h total`
                  : `${course.hoursRemaining}h left`;
                const ctaText = isCompleted
                  ? "View Cert →"
                  : course.progressPercent === 0
                    ? "▶ Start"
                    : "▶ Resume";

                return (
                  <div key={course.courseId}
                    onClick={() => onCourseClick?.(course.courseId)}
                    className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden transition-all cursor-pointer flex flex-col hover:translate-y-[-3px] hover:shadow-[0_10px_28px_rgba(0,0,0,.11)] hover:border-[var(--border2)]"
                    style={view === "list" ? { display: "grid", gridTemplateColumns: "72px 1fr", borderRadius: "10px" } : {}}>

                    {/* BANNER */}
                    <div className="h-[70px] relative overflow-hidden flex items-end justify-between px-[10px] py-[8px]"
                      style={{ background: colors.banner }}>
                      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)", backgroundSize: "22px 22px" }} />
                      <div className="absolute w-[100px] h-[100px] rounded-full top-[-24px] right-[-18px] pointer-events-none blur-[32px] opacity-50"
                        style={{ background: colors.glow }} />
                      <div className="text-[24px] leading-none absolute top-[9px] left-[10px]" style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,.55))" }}>{emoji}</div>
                      <span className="font-['JetBrains_Mono',monospace] text-[7.5px] font-bold tracking-[.06em] px-[7px] py-[2px] rounded-[20px] border uppercase backdrop-blur-[4px] relative z-[1]"
                        style={{ background: colors.pill.bg, color: colors.pill.color, borderColor: colors.pill.border }}>
                        {isCompleted ? "✓ Completed" : "● In Progress"}
                      </span>
                      <button
                        onClick={e => e.stopPropagation()}
                        className="text-sm text-[rgba(255,255,255,.4)] bg-[rgba(255,255,255,.06)] border border-[rgba(255,255,255,.1)] rounded-[5px] w-[20px] h-[20px] flex items-center justify-center transition-all relative z-[1] hover:text-white hover:bg-[rgba(255,255,255,.14)]">⋯</button>
                    </div>

                    {/* BODY */}
                    <div className="p-[10px_12px_12px] flex flex-col flex-1">
                      <div className="font-['Syne',sans-serif] text-[13px] font-extrabold text-[var(--text)] leading-[1.25] mb-[2px]">{course.title}</div>

                      {/* PROGRESS */}
                      <div className="mb-[9px]">
                        <div className="flex justify-between items-center mb-[4px]">
                          <span className="font-['JetBrains_Mono',monospace] text-[8.5px] text-[var(--text3)]">{moduleLabel}</span>
                          <span className="font-['Syne',sans-serif] text-xs font-extrabold" style={{ color: colors.pctColor }}>{course.progressPercent}%</span>
                        </div>
                        <div className="h-[4px] bg-[var(--border)] rounded-[99px] overflow-hidden mb-[4px]">
                          <div className="h-full rounded-[99px] transition-[width_.9s_ease]" style={{ width: `${course.progressPercent}%`, background: colors.bar }} />
                        </div>
                        <div className="flex items-center gap-[3px] text-[9.5px] text-[var(--text2)] font-medium mt-[3px]">
                          <span className="text-[9px]">▶</span>{nextLabel}
                        </div>
                        <div className="flex justify-end font-['JetBrains_Mono',monospace] text-[8.5px] text-[var(--text3)]">
                          <span>{timeLeft}</span>
                        </div>
                      </div>

                      {/* FOOTER */}
                      <div className="flex items-center justify-between pt-[9px] border-t border-[var(--border)] mt-auto">
                        <Link
                          href={`/courses/${slugify(course.title)}`}
                          onClick={e => e.stopPropagation()}
                          className="text-[9.5px] font-semibold text-[var(--muted)] no-underline hover:text-[var(--orange)] transition-colors"
                        >
                          ★ Write a Review
                        </Link>
                        <button
                          onClick={e => { e.stopPropagation(); onCourseClick?.(course.courseId); }}
                          className="px-[11px] py-[4px] rounded-[6px] text-[10px] font-bold text-white whitespace-nowrap border-none flex items-center gap-[4px] transition-all no-underline cursor-pointer"
                          style={{ background: colors.cta.bg, boxShadow: colors.cta.shadow }}>
                          {ctaText}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* UPCOMING SESSIONS */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-[14px] py-[10px] border-b border-[var(--border)]">
            <span className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[var(--text3)]">Upcoming Sessions</span>
            <Link href="/courses" className="font-['JetBrains_Mono',monospace] text-[9px] text-[var(--blue2)] no-underline">View all →</Link>
          </div>
          {STATIC_SESSIONS.map(s => (
            <div key={s.name} className="flex items-center gap-[10px] px-[14px] py-[10px] border-b border-[var(--border)] last:border-b-0 transition-all hover:bg-[var(--card-h)] cursor-pointer">
              <div className="text-center shrink-0 w-[32px]">
                <div className="font-['Syne',sans-serif] text-[15px] font-extrabold text-[var(--text)] leading-none">{s.day}</div>
                <div className="font-['JetBrains_Mono',monospace] text-[8px] text-[var(--text3)]">{s.dow}</div>
              </div>
              <div className="w-[1px] h-[30px] bg-[var(--border)] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[11.5px] font-semibold text-[var(--text)] whitespace-nowrap overflow-hidden text-ellipsis">{s.name}</div>
                <div className="font-['JetBrains_Mono',monospace] text-[9px] text-[var(--text3)] mt-[1px]">{s.meta}</div>
              </div>
              <span className="font-['JetBrains_Mono',monospace] text-[8.5px] font-semibold px-[8px] py-[2px] rounded-[3px] shrink-0" style={s.tagStyle}>{s.tag}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }
      `}</style>
    </div>
  );
}
