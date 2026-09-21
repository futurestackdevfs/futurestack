"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SectionRenderer from "./sections/SectionRenderer";
import { useStudentDashboard } from "../hooks/student-dashboard";
import { userApi, type ProfileData } from "@/app/auth/lib/auth-api";
import { useAuth } from "@/app/auth/hooks/use-auth";
import { useViewParam } from "@/lib/use-view-param";
import { SECTION_CONFIG, SECTION_ORDER, resolveBadge } from "./section-config";
import type { TabId, SectionContext } from "./section-config";

const notifs = [
  { icon: "📡", text: <><span className="font-semibold">Live session starting</span> in 2 hours — React Hooks Deep Dive</>, time: "10 min ago", ic: "bg-orange-500/10" },
  { icon: "🏅", text: <>You earned the <span className="font-semibold">7-Day Streak</span> badge!</>, time: "1 hour ago", ic: "bg-green-500/10" },
  { icon: "📝", text: <>Quiz graded — Python Ch.2 — <span className="font-semibold">94/100</span></>, time: "3 hours ago", ic: "bg-blue-500/10" },
  { icon: "💬", text: <>Aakash replied to your <span className="font-semibold">doubt</span> in MERN discussion</>, time: "Yesterday", ic: "bg-purple-500/10" },
];

const todosInit = [
  { text: "Watch: Express.js Middleware", tag: "DONE", tc: "bg-green-500/10 text-green-600 dark:text-green-500" },
  { text: "Complete: React Hooks notes", tag: "MERN", tc: "bg-orange-500/10 text-[#f05a1a] dark:text-[#ff6a1a]" },
  { text: "Practice: Python List problems × 5", tag: "PY", tc: "bg-blue-500/10 text-[#3b82f6] dark:text-[#60a5fa]" },
  { text: "Daily quiz — JavaScript concepts", tag: "DONE", tc: "bg-green-500/10 text-green-600 dark:text-green-500" },
  { text: "Read: MongoDB aggregation docs", tag: "READ", tc: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
];

const activity = [
  { text: <>Completed <span className="font-semibold">Module 13</span> — React Components</>, time: "Today, 9:14 AM · +40 XP", c: "#f05a1a" },
  { text: <>Scored <span className="font-semibold">94%</span> on Python Quiz Ch.2</>, time: "Today, 8:30 AM · +25 XP", c: "#16a34a" },
  { text: <>Watched <span className="font-semibold">Express.js Middleware</span> video</>, time: "Yesterday, 7:45 PM · +15 XP", c: "#3b82f6" },
  { text: <>Asked a <span className="font-semibold">doubt</span> in MERN community</>, time: "Yesterday, 5:20 PM", c: "#7c3aed" },
  { text: <>Earned <span className="font-semibold">7-Day Streak</span> badge 🔥</>, time: "2 days ago · +50 XP", c: "#eab308" },
];

// ─── Profile Completion ────────────────────────────────────────────────────────

const PROFILE_FIELDS: (keyof ProfileData)[] = [
  'name', 'email', 'phone', 'dob', 'city', 'qualification', 'experience', 'careerPath', 'skills', 'bio',
];

function calcProfilePct(data: ProfileData): number {
  let filled = 0;
  for (const field of PROFILE_FIELDS) {
    const val = data[field];
    if (val === undefined || val === null) continue;
    if (Array.isArray(val)) { if (val.length > 0) filled++; }
    else if (typeof val === 'string') { if (val.trim() !== '') filled++; }
    else filled++;
  }
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

function useProfileCompletion() {
  const [pct, setPct] = useState<number | null>(null);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!user || authLoading) return;
    userApi.getProfile(user.role)
      .then((data) => setPct(calcProfilePct(data)))
      .catch(() => setPct(null));
  }, [user, authLoading]);

  return pct;
}

function ProfileCompletionRibbon({ pct, onDismiss }: { pct: number; onDismiss: () => void }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(onDismiss, 15_000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="shrink-0 flex flex-wrap items-center gap-x-2 gap-y-1.5 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 text-white cursor-pointer transition-all bg-gradient-to-r from-[#f05a1a] via-[#ff6a1a] to-[#7c3aed] shadow-[0_4px_20px_rgba(240,90,26,.35)] relative overflow-hidden"
      style={{ animation: "ribbonIn .45s cubic-bezier(.2,.9,.3,1.3) both" }}
      onClick={() => router.push('/profile')}
      role="button"
      tabIndex={0}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,.25), transparent)", backgroundSize: "200% 100%", animation: "shimmer 2.4s linear infinite" }}
      />
      <div className="relative z-[1] w-[26px] h-[26px] sm:w-[30px] sm:h-[30px] rounded-full bg-white/20 flex items-center justify-center shrink-0" style={{ animation: "pulseGlow 1.8s ease infinite" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>
      <div className="relative z-[1] flex flex-col gap-0.5 flex-1 min-w-[150px] sm:flex-none">
        <span className="font-bold text-[13px] leading-tight">Complete your profile</span>
        <span className="text-[10px] text-white/75 leading-tight">Unlock the full experience</span>
      </div>
      <div className="relative z-[1] h-1.5 rounded-full bg-white/25 overflow-hidden flex-1 sm:flex-none basis-[80px] min-w-[80px] sm:w-[140px] sm:ml-2">
        <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${pct}%`, boxShadow: "0 0 8px rgba(255,255,255,.8)" }} />
      </div>
      <span className="relative z-[1] font-mono text-[12px] font-bold tabular-nums tracking-tight">{pct}%</span>
      <span className="relative z-[1] font-semibold text-[12px] sm:text-[13px] underline decoration-dotted underline-offset-2 text-white sm:ml-auto whitespace-nowrap shrink-0">Complete Now →</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        className="relative z-[1] shrink-0 flex items-center justify-center w-6 h-6 rounded-full border-none cursor-pointer text-white/70 hover:text-white hover:bg-white/15 transition-colors bg-transparent"
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
      <style>{`
        @keyframes ribbonIn { from { opacity: 0; transform: translateY(-100%); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
        @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,.5); } 50% { box-shadow: 0 0 0 6px rgba(255,255,255,0); } }
      `}</style>
    </div>
  );
}


export default function MyDashboardPage() {
  const [activeTab, setActiveTab] = useViewParam("overview", "tab", SECTION_ORDER);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [discussionCourseId, setDiscussionCourseId] = useState<string | null>(null);
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [doneSet, setDoneSet] = useState<Set<number>>(new Set([0, 3]));
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showRibbon, setShowRibbon] = useState(false);
  const [comingSoon, setComingSoon] = useState<{ icon: string; label: string } | null>(null);
  const pct = useProfileCompletion();

  useEffect(() => {
    if (pct !== null && pct < 90) setShowRibbon(true);
  }, [pct]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get('courseId');
    if (courseId) setSelectedCourseId(courseId);
  }, []);

  const { data, isLoading, error } = useStudentDashboard();

  const enrolledCourses = data?.enrolledCourses ?? [];
  const courseCount = enrolledCourses.length;
  const selectedCourse = enrolledCourses.find(c => c.courseId === selectedCourseId) ?? null;

  const sectionCtx: SectionContext = { isLoading, courseCount };
  const tabs = SECTION_CONFIG;

  const toggleTodo = (i: number) => {
    setDoneSet(p => { const n = new Set(p); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  };

  useEffect(() => {
    const handler = () => setNotifOpen(p => !p);
    window.addEventListener("toggle-notif-panel", handler);
    return () => window.removeEventListener("toggle-notif-panel", handler);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "discussion" && !discussionCourseId && enrolledCourses.length > 0) {
      setLoadingCounts(true);
      Promise.all(
        enrolledCourses.map(async (course) => {
          try {
            const res = await fetch(`/api/discussion/${course.courseId}?page=1&limit=50`, { credentials: "same-origin" });
            const data = await res.json();
            return { courseId: course.courseId, count: Array.isArray(data) ? data.length : 0 };
          } catch {
            return { courseId: course.courseId, count: 0 };
          }
        }),
      ).then((results) => {
        const counts: Record<string, number> = {};
        results.forEach((r) => { counts[r.courseId] = r.count; });
        setMessageCounts(counts);
        setLoadingCounts(false);
      });
    }
  }, [activeTab, discussionCourseId, enrolledCourses]);

  function openComingSoon(icon: string, label: string) {
    setComingSoon({ icon, label });
  }

  function selectTab(tabId: TabId) {
    setComingSoon(null);
    setActiveTab(tabId);
  }

  const renderSection = () => comingSoon ? (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-[64px] h-[64px] rounded-full flex items-center justify-center text-[28px] mb-4 border border-[var(--border)]"
        style={{ background: "var(--orange-d)" }}>
        {comingSoon.icon}
      </div>
      <div className="font-['Syne',sans-serif] text-[18px] font-bold text-[var(--text)] mb-1.5">{comingSoon.label}</div>
      <div className="font-['JetBrains_Mono',monospace] text-[10.5px] font-semibold uppercase tracking-[.14em] px-2.5 py-1 rounded-full mb-3"
        style={{ background: "var(--orange-d)", color: "var(--orange)" }}>
        🚧 Coming Soon
      </div>
      <div className="text-[12px] text-[var(--text3)] max-w-[320px] leading-[1.6]">
        We&apos;re working on this feature — check back soon!
      </div>
      <button
        onClick={() => selectTab("overview")}
        className="mt-5 inline-flex items-center gap-1.5 px-4 py-[8px] rounded-[8px] text-[11.5px] font-semibold text-white cursor-pointer border-none"
        style={{ background: "var(--orange)" }}
      >
        ← Back to Overview
      </button>
    </div>
  ) : (
    <SectionRenderer
      activeTab={activeTab}
      selectedCourseId={selectedCourseId}
      selectedCourse={selectedCourse}
      enrolledCourses={enrolledCourses}
      discussionCourseId={discussionCourseId}
      messageCounts={messageCounts}
      loadingCounts={loadingCounts}
      setSelectedCourseId={setSelectedCourseId}
      setDiscussionCourseId={setDiscussionCourseId}
      setActiveTab={setActiveTab}
      data={data}
      isLoading={isLoading}
    />
  );

  const isForbidden = !isLoading && !!error && /forbidden|unauthorized/i.test(error);

  if (isForbidden) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] bg-[#f4f6fa] dark:bg-[#0b0e14] text-center px-6">
        <div className="text-5xl mb-5">🔒</div>
        <h2 className="font-['Syne',sans-serif] font-bold text-[22px] text-[#111827] dark:text-[#e8eaf0] mb-2">Sign in to continue</h2>
        <p className="text-[13px] text-[#6b7280] dark:text-[#7a859a] mb-6 max-w-[320px] leading-relaxed">
          Please sign in to view your dashboard and access your courses.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[9px] bg-[#f05a1a] text-white text-[13px] font-semibold shadow-[0_4px_12px_rgba(240,90,26,.35)] hover:bg-[#d94e14] hover:shadow-[0_6px_18px_rgba(240,90,26,.4)] transition-all duration-200 no-underline"
        >
          Sign In
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-[13px]"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden bg-[#f4f6fa] dark:bg-[#0b0e14]" style={{ height: "calc(100vh - 56px)" }}>
      {showRibbon && pct !== null && pct < 90 && (
        <ProfileCompletionRibbon pct={pct} onDismiss={() => setShowRibbon(false)} />
      )}
      {error && !isLoading && (
        <div className="shrink-0 px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-600 dark:text-red-400 font-['JetBrains_Mono',monospace] text-[10px]">
          ⚠ {error}
        </div>
      )}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Mobile sidebar FAB */}
        <button
          onClick={() => setSidebarOpen(p => !p)}
          className="fixed bottom-5 right-5 z-40 lg:hidden w-[48px] h-[48px] rounded-full flex items-center justify-center cursor-pointer transition-all duration-[250ms] hover:scale-105 active:scale-95 border-none outline-none"
          style={{ background: "linear-gradient(135deg, #f05a1a 0%, #ff7a3c 100%)", boxShadow: "0 4px 16px rgba(240,90,26,.35), inset 0 1px 0 rgba(255,255,255,.2)" }}
        >
          <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
        </button>

        {/* LEFT SIDEBAR - desktop only */}
        <aside className="hidden lg:flex sticky top-0 z-40 w-[210px] shrink-0 bg-white dark:bg-[#111520]
          border-r border-[#e2e6ef] dark:border-[#1e2535] flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Navigation */}
          <div className="p-2.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { selectTab(tab.id as TabId); if (tab.id !== "courses") setSelectedCourseId(null); }}
                className={`flex items-center gap-2 px-2.5 py-[6px] rounded-[6px] w-full text-left text-[13px] cursor-pointer transition-all no-underline border-none ${!comingSoon && activeTab === tab.id
                  ? "bg-[#f05a1a] dark:bg-[#ff6a1a] text-white font-semibold"
                  : "text-[#000000] dark:text-[#b0bac9] hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#000000] dark:hover:text-[#e8eaf0]"
                  }`}
              >
                <span className="text-[14px] shrink-0 w-4 text-center">{tab.icon}</span>
                <span className="flex-1">{tab.label}</span>
                {resolveBadge(tab, sectionCtx) && (
                  <span className={`font-['JetBrains_Mono',monospace] text-[9px] font-semibold px-[4px] py-px rounded-[3px] ${tab.badgeCls || ""}`}>{resolveBadge(tab, sectionCtx)}</span>
                )}
              </button>
            ))}
          </div>

          {/* Level Progress */}
          {/* <div className="px-2.5 py-1.5 border-t border-[#e2e6ef] dark:border-[#1e2535] mx-2.5">
            <div className="bg-[#f0f2f7] dark:bg-[#10141e] rounded-[6px] p-[5px_7px]">
              <div className="flex justify-between items-center font-['JetBrains_Mono',monospace] text-[10px] text-[#000000] dark:text-[#b0bac9] mb-0.5">
                <span className="font-semibold text-[#000000] dark:text-[#e8eaf0]">Intermediate</span>
                <span>1,240 / 2,000 XP</span>
              </div>
              <div className="h-[3px] bg-[#e2e6ef] dark:bg-[#1e2535] rounded-full overflow-hidden mb-0.5">
                <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-[#f05a1a] to-[#ff7a3c]"></div>
              </div>
              <div className="font-['JetBrains_Mono',monospace] text-[9px] text-[#000000] dark:text-[#7a859a]">762 XP to Senior</div>
            </div>
          </div> */}

          {/* Explore */}
          <div className="px-2.5 py-0.5">
            <div className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#000000] dark:text-[#7a859a] mb-0.5 px-2">Explore</div>
            <Link href="/courses?category=ai-ml" className="flex items-center gap-2 px-2.5 py-[5px] rounded-[5px] text-[#000000] dark:text-[#b0bac9] text-[12.5px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#000000] dark:hover:text-[#e8eaf0] transition-all no-underline"><span className="text-[13px] shrink-0 w-4 text-center">🧠</span><span className="flex-1">AI / ML</span></Link>
            <Link href="/courses?category=full-stack" className="flex items-center gap-2 px-2.5 py-[5px] rounded-[5px] text-[#000000] dark:text-[#b0bac9] text-[12.5px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#000000] dark:hover:text-[#e8eaf0] transition-all no-underline"><span className="text-[13px] shrink-0 w-4 text-center">🌐</span><span className="flex-1">Full Stack</span></Link>
            <Link href="/courses?category=devops" className="flex items-center gap-2 px-2.5 py-[5px] rounded-[5px] text-[#000000] dark:text-[#b0bac9] text-[12.5px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#000000] dark:hover:text-[#e8eaf0] transition-all no-underline"><span className="text-[13px] shrink-0 w-4 text-center">🔧</span><span className="flex-1">DevOps</span></Link>
            <Link href="/courses?category=data-science" className="flex items-center gap-2 px-2.5 py-[5px] rounded-[5px] text-[#000000] dark:text-[#b0bac9] text-[12.5px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#000000] dark:hover:text-[#e8eaf0] transition-all no-underline"><span className="text-[13px] shrink-0 w-4 text-center">📊</span><span className="flex-1">Data Science</span></Link>
          </div>

          {/* Community */}
          <div className="px-2.5 py-0.5">
            <div className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#000000] dark:text-[#7a859a] mb-0.5 px-2">Community</div>
            <button onClick={() => { setComingSoon(null); setActiveTab("discussion"); setDiscussionCourseId(null); }} className="flex items-center gap-2 px-2.5 py-[5px] rounded-[5px] text-[#000000] dark:text-[#b0bac9] text-[12.5px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#000000] dark:hover:text-[#e8eaf0] transition-all no-underline w-full text-left cursor-pointer border-none bg-transparent"><span className="text-[13px] shrink-0 w-4 text-center">💬</span><span className="flex-1">Discussion</span><span className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold px-[3px] py-px rounded-[3px] bg-blue-500/10 text-[#3b82f6] dark:text-[#60a5fa]">12</span></button>
            <button onClick={() => selectTab("skilltests")} className="flex items-center gap-2 px-2.5 py-[5px] rounded-[5px] text-[#000000] dark:text-[#b0bac9] text-[12.5px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#000000] dark:hover:text-[#e8eaf0] transition-all no-underline w-full text-left cursor-pointer border-none bg-transparent"><span className="text-[13px] shrink-0 w-4 text-center">🎯</span><span className="flex-1">Skill Tests</span></button>
            <button onClick={() => openComingSoon("🏆", "Leaderboard")} className="flex items-center gap-2 px-2.5 py-[5px] rounded-[5px] text-[#000000] dark:text-[#b0bac9] text-[12.5px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#000000] dark:hover:text-[#e8eaf0] transition-all no-underline w-full text-left cursor-pointer border-none bg-transparent"><span className="text-[13px] shrink-0 w-4 text-center">🏆</span><span className="flex-1">Leaderboard</span></button>
            <button onClick={() => openComingSoon("🤝", "Study Groups")} className="flex items-center gap-2 px-2.5 py-[5px] rounded-[5px] text-[#000000] dark:text-[#b0bac9] text-[12.5px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#000000] dark:hover:text-[#e8eaf0] transition-all no-underline w-full text-left cursor-pointer border-none bg-transparent"><span className="text-[13px] shrink-0 w-4 text-center">🤝</span><span className="flex-1">Study Groups</span></button>
          </div>

          {/* Account */}
          <div className="px-2.5 py-0.5">
            <div className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#000000] dark:text-[#7a859a] mb-0.5 px-2">Account</div>
            <Link href="/profile" className="flex items-center gap-2 px-2.5 py-[5px] rounded-[5px] text-[#000000] dark:text-[#b0bac9] text-[12.5px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#000000] dark:hover:text-[#e8eaf0] transition-all no-underline"><span className="text-[13px] shrink-0 w-4 text-center">⚙️</span><span className="flex-1">Settings</span></Link>
            <Link href="/support" className="flex items-center gap-2 px-2.5 py-[5px] rounded-[5px] text-[#000000] dark:text-[#b0bac9] text-[12.5px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#000000] dark:hover:text-[#e8eaf0] transition-all no-underline"><span className="text-[13px] shrink-0 w-4 text-center">🆘</span><span className="flex-1">Help Center</span></Link>
          </div>

          {/* Sidebar Footer */}
          <div className="mt-auto px-2.5 py-1.5 border-t border-[#e2e6ef] dark:border-[#1e2535] mx-2.5">
            <div className="font-['JetBrains_Mono',monospace] text-[9px] text-[#000000] dark:text-[#7a859a]">v1.0.0 · <span className="font-semibold text-[#000000] dark:text-[#e8eaf0]">FutureStack</span></div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
          <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-3 lg:p-4 flex flex-col gap-3 min-h-0">
            {renderSection()}
          </div>
        </div>

        {/* RIGHT PANEL - desktop only */}
        {notifOpen && (
          <aside className="hidden lg:flex w-[300px] shrink-0 bg-white dark:bg-[#111520] border-l border-[#e2e6ef] dark:border-[#1e2535] flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="p-4 border-b border-[#e2e6ef] dark:border-[#1e2535]">
              <div className="flex items-center justify-between mb-3">
                <span className="font-['Syne',sans-serif] text-[14px] font-bold text-[#111827] dark:text-[#e8eaf0]">🔔 Notifications</span>
                <Link href="/my-dashboard" className="font-['JetBrains_Mono',monospace] text-[9.5px] font-semibold text-[#3b82f6] dark:text-[#60a5fa]">View All</Link>
              </div>
              <div className="flex flex-col gap-2">
                {notifs.map((n, i) => (
                  <div key={i} className="flex gap-2.5 p-2.5 rounded-[7px] bg-[#f4f6fa] dark:bg-[#0b0e14] border border-[#e2e6ef] dark:border-[#1e2535] hover:border-[#d0d6e4] dark:hover:border-[#263048] cursor-pointer transition-all">
                    <div className={`w-[32px] h-[32px] rounded-[7px] flex items-center justify-center text-base shrink-0 ${n.ic}`}>{n.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-[#374151] dark:text-[#b0bac9] leading-[1.4]">{n.text}</div>
                      <div className="font-['JetBrains_Mono',monospace] text-[8.5px] text-[#6b7280] dark:text-[#7a859a] mt-1">{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-b border-[#e2e6ef] dark:border-[#1e2535]">
              <div className="flex items-center justify-between mb-3">
                <span className="font-['Syne',sans-serif] text-[14px] font-bold text-[#111827] dark:text-[#e8eaf0]">✅ Today&apos;s Tasks</span>
                <span className="font-['JetBrains_Mono',monospace] text-[9px] text-[#6b7280] dark:text-[#7a859a]">{doneSet.size}/{todosInit.length}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {todosInit.map((t, i) => {
                  const done = doneSet.has(i);
                  return (
                    <div key={i} className={`flex items-start gap-2 p-2 rounded-[7px] border cursor-pointer transition-all ${done ? "bg-[#f4f6fa] dark:bg-[#0b0e14] border-[#e2e6ef] dark:border-[#1e2535] opacity-60" : "bg-[#f4f6fa] dark:bg-[#0b0e14] border-[#e2e6ef] dark:border-[#1e2535] hover:border-[#d0d6e4] dark:hover:border-[#263048]"}`} onClick={() => toggleTodo(i)}>
                      <div className={`w-[14px] h-[14px] rounded-[3px] border-2 shrink-0 mt-[3px] flex items-center justify-center transition-all ${done ? "bg-green-600 dark:bg-green-500 border-green-600 dark:border-green-500" : "border-[#d0d6e4] dark:border-[#263048] hover:border-[#3b82f6] dark:hover:border-[#60a5fa]"}`}>
                        {done ? <span className="text-[9px] text-white leading-none">✓</span> : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[11px] leading-[1.3] ${done ? "text-[#6b7280] dark:text-[#7a859a] line-through" : "text-[#374151] dark:text-[#b0bac9]"}`}>{t.text}</div>
                      </div>
                      <span className={`font-['JetBrains_Mono',monospace] text-[8px] font-semibold px-1.5 py-[1px] rounded-[3px] shrink-0 mt-[1px] ${t.tc}`}>{t.tag}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-['Syne',sans-serif] text-[14px] font-bold text-[#111827] dark:text-[#e8eaf0]">🕐 Recent Activity</span>
                <Link href="/my-dashboard" className="font-['JetBrains_Mono',monospace] text-[9.5px] font-semibold text-[#3b82f6] dark:text-[#60a5fa]">View All</Link>
              </div>
              <div className="flex flex-col gap-2">
                {activity.map((a, i) => (
                  <div key={i} className="flex gap-2.5 items-start">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a.c }}></div>
                      {i < activity.length - 1 ? <div className="w-px flex-1 bg-[#e2e6ef] dark:bg-[#1e2535] mt-1"></div> : null}
                    </div>
                    <div className="pb-3">
                      <div className="text-[11px] text-[#374151] dark:text-[#b0bac9] leading-[1.4]">{a.text}</div>
                      <div className="font-['JetBrains_Mono',monospace] text-[8.5px] text-[#6b7280] dark:text-[#7a859a] mt-0.5">{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Mobile sidebar bottom sheet */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col">
          <div className="flex-1" style={{ background: "rgba(0,0,0,.35)" }} onClick={() => setSidebarOpen(false)} />
          <div className="bg-white dark:bg-[#111520] rounded-t-2xl max-h-[75vh] overflow-y-auto px-3 pt-4 pb-8 shadow-[0_-8px_30px_rgba(0,0,0,.12)]">
            <div className="flex items-center justify-between mb-3 px-2.5">
              <span className="font-['Syne',sans-serif] text-[14px] font-bold text-[#000000] dark:text-[#e8eaf0]">Navigation</span>
              <button onClick={() => setSidebarOpen(false)} className="w-[30px] h-[30px] rounded-full flex items-center justify-center border-none cursor-pointer hover:text-[#000000] dark:hover:text-[#e8eaf0] bg-[var(--btn-bg,#0b0e14)]" style={{ color: "var(--btn-text, #7a859a)" }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            {/* Navigation */}
            <div className="p-2.5">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { selectTab(tab.id as TabId); if (tab.id !== "courses") setSelectedCourseId(null); setSidebarOpen(false); }}
                  className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-[6px] w-full text-left text-[14px] cursor-pointer transition-all no-underline border-none ${!comingSoon && activeTab === tab.id
                    ? "bg-[#f05a1a] dark:bg-[#ff6a1a] text-white font-semibold"
                    : "text-[#000000] dark:text-[#b0bac9] hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#000000] dark:hover:text-[#e8eaf0]"
                    }`}
                >
                  <span className="text-[15px] shrink-0 w-4 text-center">{tab.icon}</span>
                  <span className="flex-1">{tab.label}</span>
                  {resolveBadge(tab, sectionCtx) && (
                    <span className={`font-['JetBrains_Mono',monospace] text-[10px] font-semibold px-[5px] py-px rounded-[3px] ${tab.badgeCls || ""}`}>{resolveBadge(tab, sectionCtx)}</span>
                  )}
                </button>
              ))}
            </div>
            {/* Level Progress */}
            {/* <div className="px-2.5 py-1.5 border-t border-[#e2e6ef] dark:border-[#1e2535] mx-2.5">
              <div className="bg-[#f0f2f7] dark:bg-[#10141e] rounded-[6px] p-2">
                <div className="flex justify-between items-center font-['JetBrains_Mono',monospace] text-[11px] text-[#000000] dark:text-[#b0bac9] mb-1">
                  <span className="font-semibold text-[#000000] dark:text-[#e8eaf0]">Intermediate</span>
                  <span>1,240 / 2,000 XP</span>
                </div>
                <div className="h-[4px] bg-[#e2e6ef] dark:bg-[#1e2535] rounded-full overflow-hidden mb-1">
                  <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-[#f05a1a] to-[#ff7a3c]"></div>
                </div>
                <div className="font-['JetBrains_Mono',monospace] text-[10px] text-[#000000] dark:text-[#7a859a]">762 XP to Senior</div>
              </div>
            </div> */}
            {/* Explore */}
            <div className="px-2.5 py-1">
              <div className="text-[11px] font-semibold uppercase tracking-[.1em] text-[#000000] dark:text-[#7a859a] mb-1 px-2">Explore</div>
              <Link href="/courses?category=ai-ml" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[5px] text-[#000000] dark:text-[#b0bac9] text-[13px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#000000] dark:hover:text-[#e8eaf0] transition-all no-underline"><span className="text-[14px] shrink-0 w-4 text-center">🧠</span><span className="flex-1">AI / ML</span></Link>
              <Link href="/courses?category=full-stack" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[5px] text-[#000000] dark:text-[#b0bac9] text-[13px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#000000] dark:hover:text-[#e8eaf0] transition-all no-underline"><span className="text-[14px] shrink-0 w-4 text-center">🌐</span><span className="flex-1">Full Stack</span></Link>
              <Link href="/courses?category=devops" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[5px] text-[#000000] dark:text-[#b0bac9] text-[13px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#000000] dark:hover:text-[#e8eaf0] transition-all no-underline"><span className="text-[14px] shrink-0 w-4 text-center">🔧</span><span className="flex-1">DevOps</span></Link>
              <Link href="/courses?category=data-science" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[5px] text-[#000000] dark:text-[#b0bac9] text-[13px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#000000] dark:hover:text-[#e8eaf0] transition-all no-underline"><span className="text-[14px] shrink-0 w-4 text-center">📊</span><span className="flex-1">Data Science</span></Link>
            </div>
            {/* Community */}
            <div className="px-2.5 py-1">
              <div className="text-[11px] font-semibold uppercase tracking-[.1em] text-[#000000] dark:text-[#7a859a] mb-1 px-2">Community</div>
              <button onClick={() => { setComingSoon(null); setActiveTab("discussion"); setDiscussionCourseId(null); setSidebarOpen(false); }} className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[5px] text-[#000000] dark:text-[#b0bac9] text-[13px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#000000] dark:hover:text-[#e8eaf0] transition-all no-underline w-full text-left cursor-pointer border-none bg-transparent"><span className="text-[14px] shrink-0 w-4 text-center">💬</span><span className="flex-1">Discussion</span><span className="font-['JetBrains_Mono',monospace] text-[10px] font-semibold px-[4px] py-px rounded-[3px] bg-blue-500/10 text-[#3b82f6] dark:text-[#60a5fa]">12</span></button>
              <button onClick={() => { selectTab("skilltests"); setSidebarOpen(false); }} className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[5px] text-[#000000] dark:text-[#b0bac9] text-[13px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#000000] dark:hover:text-[#e8eaf0] transition-all no-underline w-full text-left cursor-pointer border-none bg-transparent"><span className="text-[14px] shrink-0 w-4 text-center">🎯</span><span className="flex-1">Skill Tests</span></button>
              <button onClick={() => { openComingSoon("🏆", "Leaderboard"); setSidebarOpen(false); }} className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[5px] text-[#000000] dark:text-[#b0bac9] text-[13px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#000000] dark:hover:text-[#e8eaf0] transition-all no-underline w-full text-left cursor-pointer border-none bg-transparent"><span className="text-[14px] shrink-0 w-4 text-center">🏆</span><span className="flex-1">Leaderboard</span></button>
              <button onClick={() => { openComingSoon("🤝", "Study Groups"); setSidebarOpen(false); }} className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[5px] text-[#000000] dark:text-[#b0bac9] text-[13px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#000000] dark:hover:text-[#e8eaf0] transition-all no-underline w-full text-left cursor-pointer border-none bg-transparent"><span className="text-[14px] shrink-0 w-4 text-center">🤝</span><span className="flex-1">Study Groups</span></button>
            </div>
            {/* Account */}
            <div className="px-2.5 py-1">
              <div className="text-[11px] font-semibold uppercase tracking-[.1em] text-[#000000] dark:text-[#7a859a] mb-1 px-2">Account</div>
              <Link href="/profile" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[5px] text-[#000000] dark:text-[#b0bac9] text-[13px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#000000] dark:hover:text-[#e8eaf0] transition-all no-underline"><span className="text-[14px] shrink-0 w-4 text-center">⚙️</span><span className="flex-1">Settings</span></Link>
              <Link href="/support" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[5px] text-[#000000] dark:text-[#b0bac9] text-[13px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#000000] dark:hover:text-[#e8eaf0] transition-all no-underline"><span className="text-[14px] shrink-0 w-4 text-center">🆘</span><span className="flex-1">Help Center</span></Link>
            </div>
            {/* Footer */}
            <div className="mt-3 px-2.5 py-1.5 border-t border-[#e2e6ef] dark:border-[#1e2535] mx-2.5">
              <div className="font-['JetBrains_Mono',monospace] text-[10px] text-[#000000] dark:text-[#7a859a]">v1.0.0 · <span className="font-semibold text-[#000000] dark:text-[#e8eaf0]">FutureStack</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar — full width */}
      <div className="flex items-center gap-x-2 gap-y-1 px-2 sm:px-4 py-[7px] bg-[var(--surface)] border-t border-[var(--border)] text-[10.5px] font-['JetBrains_Mono',monospace] text-[var(--text3)] flex-shrink-0 flex-wrap sm:flex-nowrap">
        <span className="flex items-center gap-1 text-[var(--green)] font-semibold"><span className="text-[8px]">●</span>Connected</span>
        <span className="ml-auto flex items-center gap-2 hidden sm:flex">
          <span className="truncate max-w-[120px]">{isLoading ? "—" : `${courseCount} course${courseCount !== 1 ? "s" : ""}`}</span>
          <span className="text-[var(--border2)]">│</span>
          <span className="text-[var(--orange)] hidden lg:inline">FutureStack v1.0.0</span>
          <span className="text-[var(--border2)] hidden lg:inline">│</span>
          <span className="hidden lg:inline">India/Pune</span>
        </span>
      </div>
    </div>
  );
}
