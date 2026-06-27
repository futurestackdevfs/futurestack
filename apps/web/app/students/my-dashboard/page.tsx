"use client";

import { useState, useEffect } from "react";
import OverviewSection from "./sections/OverviewSection";
import MyCoursesSection from "./sections/MyCoursesSection";
import CourseLearningView from "./sections/CourseLearningView";
import ScheduleSection from "./sections/ScheduleSection";
import AssignmentsSection from "./sections/AssignmentsSection";
import CertificatesSection from "./sections/CertificatesSection";
import ProjectsSection from "./sections/ProjectsSection";
import { useStudentDashboard } from "../hooks/student-dashboard";

type TabId = "overview" | "courses" | "schedule" | "assignments" | "certificates" | "projects";

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

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function MyDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [selectedCourseSlug, setSelectedCourseSlug] = useState<string | null>(null);
  const [doneSet, setDoneSet] = useState<Set<number>>(new Set([0, 3]));
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data, isLoading, error } = useStudentDashboard();

  const enrolledCourses = data?.enrolledCourses ?? [];
  const courseCount = enrolledCourses.length;

  const tabs: { id: TabId; icon: string; label: string; badge?: string; badgeCls?: string }[] = [
    { id: "overview", icon: "⊞", label: "Overview" },
    { id: "courses", icon: "📚", label: "My Courses", badge: isLoading ? "…" : courseCount.toString(), badgeCls: "bg-blue-500/10 text-[#3b82f6] dark:text-[#60a5fa]" },
    { id: "schedule", icon: "📅", label: "Schedule", badge: "2 Live", badgeCls: "bg-green-500/10 text-green-600 dark:text-green-500" },
    { id: "assignments", icon: "📝", label: "Assignments", badge: "3 Due", badgeCls: "bg-orange-500/10 text-[#f05a1a] dark:text-[#ff6a1a]" },
    { id: "certificates", icon: "🏅", label: "Certificates" },
    { id: "projects", icon: "📁", label: "Projects" },
  ];

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

  const renderSection = () => {
    if (activeTab === "courses" && selectedCourseSlug) {
      return <CourseLearningView courseSlug={selectedCourseSlug} onBack={() => setSelectedCourseSlug(null)} />;
    }
    return (
      <>
        {activeTab === "overview" && (
          <OverviewSection
            user={data?.user ?? null}
            enrolledCourses={enrolledCourses}
            isLoading={isLoading}
          />
        )}
        {activeTab === "courses" && (
          <MyCoursesSection
            enrolledCourses={enrolledCourses}
            isLoading={isLoading}
            onCourseClick={(title) => setSelectedCourseSlug(slugify(title))}
          />
        )}
        {activeTab === "schedule" && <ScheduleSection />}
        {activeTab === "assignments" && <AssignmentsSection />}
        {activeTab === "certificates" && <CertificatesSection />}
        {activeTab === "projects" && <ProjectsSection />}
      </>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-[#f4f6fa] dark:bg-[#0b0e14]">
      {error && !isLoading && (
        <div className="shrink-0 px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-600 dark:text-red-400 font-['JetBrains_Mono',monospace] text-[10px]">
          ⚠ {error}
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <button
          onClick={() => setSidebarOpen(p => !p)}
          className="fixed bottom-3 left-3 z-40 lg:hidden w-9 h-9 rounded-full bg-[#f05a1a] dark:bg-[#ff6a1a] text-white shadow-lg flex items-center justify-center text-sm"
        >
          {sidebarOpen ? "✕" : "☰"}
        </button>

        {/* LEFT SIDEBAR */}
        <aside className={`
          fixed lg:sticky inset-y-0 left-0 z-40 w-[210px] shrink-0 bg-white dark:bg-[#111520]
          border-r border-[#e2e6ef] dark:border-[#1e2535] flex flex-col overflow-y-auto
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}>
          {/* Navigation */}
          <div className="p-2.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); if (tab.id !== "courses") setSelectedCourseSlug(null); }}
                className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-[6px] w-full text-left text-[11.5px] cursor-pointer transition-all no-underline border-none ${activeTab === tab.id
                  ? "bg-orange-500/10 text-[#f05a1a] dark:text-[#ff6a1a] font-semibold"
                  : "text-[#374151] dark:text-[#b0bac9] hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#111827] dark:hover:text-[#e8eaf0]"
                  }`}
              >
                <span className="text-sm shrink-0 w-4 text-center">{tab.icon}</span>
                <span className="flex-1">{tab.label}</span>
                {tab.badge && (
                  <span className={`font-['JetBrains_Mono',monospace] text-[8px] font-semibold px-[5px] py-px rounded-[3px] ${tab.badgeCls}`}>{tab.badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* Level Progress */}
          <div className="px-2.5 py-1.5 border-t border-[#e2e6ef] dark:border-[#1e2535] mx-2.5">
            <div className="bg-[#f0f2f7] dark:bg-[#10141e] rounded-[6px] p-2">
              <div className="flex justify-between items-center font-['JetBrains_Mono',monospace] text-[8.5px] text-[#374151] dark:text-[#b0bac9] mb-1">
                <span className="font-semibold text-[#111827] dark:text-[#e8eaf0]">Intermediate</span>
                <span>1,240 / 2,000 XP</span>
              </div>
              <div className="h-[4px] bg-[#e2e6ef] dark:bg-[#1e2535] rounded-full overflow-hidden mb-1">
                <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-[#f05a1a] to-[#ff7a3c]"></div>
              </div>
              <div className="font-['JetBrains_Mono',monospace] text-[7.5px] text-[#6b7280] dark:text-[#7a859a]">762 XP to Senior</div>
            </div>
          </div>

          {/* Explore */}
          <div className="px-2.5 py-1">
            <div className="text-[9px] font-semibold uppercase tracking-[.1em] text-[#6b7280] dark:text-[#7a859a] mb-1 px-2">Explore</div>
            <div className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[5px] text-[#374151] dark:text-[#b0bac9] text-[11px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#111827] dark:hover:text-[#e8eaf0] cursor-pointer transition-all"><span className="text-xs shrink-0 w-4 text-center">🔥</span><span className="flex-1">Trending</span><span className="font-['JetBrains_Mono',monospace] text-[7.5px] font-semibold px-[4px] py-px rounded-[3px] bg-green-500/10 text-green-600 dark:text-green-500">New</span></div>
            <div className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[5px] text-[#374151] dark:text-[#b0bac9] text-[11px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#111827] dark:hover:text-[#e8eaf0] cursor-pointer transition-all"><span className="text-xs shrink-0 w-4 text-center">🧠</span><span className="flex-1">AI / ML</span></div>
            <div className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[5px] text-[#374151] dark:text-[#b0bac9] text-[11px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#111827] dark:hover:text-[#e8eaf0] cursor-pointer transition-all"><span className="text-xs shrink-0 w-4 text-center">🌐</span><span className="flex-1">Full Stack</span></div>
            <div className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[5px] text-[#374151] dark:text-[#b0bac9] text-[11px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#111827] dark:hover:text-[#e8eaf0] cursor-pointer transition-all"><span className="text-xs shrink-0 w-4 text-center">🔧</span><span className="flex-1">DevOps</span></div>
            <div className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[5px] text-[#374151] dark:text-[#b0bac9] text-[11px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#111827] dark:hover:text-[#e8eaf0] cursor-pointer transition-all"><span className="text-xs shrink-0 w-4 text-center">📊</span><span className="flex-1">Data Science</span></div>
          </div>

          {/* Community */}
          <div className="px-2.5 py-1">
            <div className="text-[9px] font-semibold uppercase tracking-[.1em] text-[#6b7280] dark:text-[#7a859a] mb-1 px-2">Community</div>
            <div className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[5px] text-[#374151] dark:text-[#b0bac9] text-[11px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#111827] dark:hover:text-[#e8eaf0] cursor-pointer transition-all"><span className="text-xs shrink-0 w-4 text-center">💬</span><span className="flex-1">Discussion</span><span className="font-['JetBrains_Mono',monospace] text-[7.5px] font-semibold px-[4px] py-px rounded-[3px] bg-blue-500/10 text-[#3b82f6] dark:text-[#60a5fa]">12</span></div>
            <div className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[5px] text-[#374151] dark:text-[#b0bac9] text-[11px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#111827] dark:hover:text-[#e8eaf0] cursor-pointer transition-all"><span className="text-xs shrink-0 w-4 text-center">🎯</span><span className="flex-1">Skill Tests</span></div>
            <div className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[5px] text-[#374151] dark:text-[#b0bac9] text-[11px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#111827] dark:hover:text-[#e8eaf0] cursor-pointer transition-all"><span className="text-xs shrink-0 w-4 text-center">🏆</span><span className="flex-1">Leaderboard</span></div>
            <div className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[5px] text-[#374151] dark:text-[#b0bac9] text-[11px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#111827] dark:hover:text-[#e8eaf0] cursor-pointer transition-all"><span className="text-xs shrink-0 w-4 text-center">🤝</span><span className="flex-1">Study Groups</span></div>
          </div>

          {/* Account */}
          <div className="px-2.5 py-1">
            <div className="text-[9px] font-semibold uppercase tracking-[.1em] text-[#6b7280] dark:text-[#7a859a] mb-1 px-2">Account</div>
            <div className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[5px] text-[#374151] dark:text-[#b0bac9] text-[11px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#111827] dark:hover:text-[#e8eaf0] cursor-pointer transition-all"><span className="text-xs shrink-0 w-4 text-center">⚙️</span><span className="flex-1">Settings</span></div>
            <div className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[5px] text-[#374151] dark:text-[#b0bac9] text-[11px] mx-1 hover:bg-[#f4f6fa] dark:hover:bg-[#0b0e14] hover:text-[#111827] dark:hover:text-[#e8eaf0] cursor-pointer transition-all"><span className="text-xs shrink-0 w-4 text-center">🆘</span><span className="flex-1">Help Center</span></div>
          </div>

          {/* Sidebar Footer */}
          <div className="mt-auto px-2.5 py-1.5 border-t border-[#e2e6ef] dark:border-[#1e2535] mx-2.5">
            <div className="font-['JetBrains_Mono',monospace] text-[8px] text-[#6b7280] dark:text-[#7a859a]">v2.4.1 · <span className="font-semibold text-[#111827] dark:text-[#e8eaf0]">FutureStack</span></div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-y-auto p-3 lg:p-4 flex flex-col gap-3">
            {renderSection()}
          </div>
        </div>

        {/* RIGHT PANEL - desktop only */}
        {notifOpen && (
          <aside className="hidden lg:flex w-[300px] shrink-0 bg-white dark:bg-[#111520] border-l border-[#e2e6ef] dark:border-[#1e2535] flex-col overflow-y-auto">
            <div className="p-4 border-b border-[#e2e6ef] dark:border-[#1e2535]">
              <div className="flex items-center justify-between mb-3">
                <span className="font-['Syne',sans-serif] text-[14px] font-bold text-[#111827] dark:text-[#e8eaf0]">🔔 Notifications</span>
                <a href="#" className="font-['JetBrains_Mono',monospace] text-[9.5px] font-semibold text-[#3b82f6] dark:text-[#60a5fa]">View All</a>
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
                <a href="#" className="font-['JetBrains_Mono',monospace] text-[9.5px] font-semibold text-[#3b82f6] dark:text-[#60a5fa]">View All</a>
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

      {/* Status Bar — full width */}
      <div className="flex items-center gap-2 px-4 py-[7px] bg-[var(--surface)] border-t border-[var(--border)] text-[10.5px] font-['JetBrains_Mono',monospace] text-[var(--text3)] flex-shrink-0">
        <span className="flex items-center gap-1 text-[var(--green)] font-semibold"><span className="text-[8px]">●</span>Connected</span>
        <span className="text-[var(--border2)]">│</span>
        <span className="flex items-center gap-1 text-[var(--orange)]">🔥 14-day streak</span>
        <span className="text-[var(--border2)]">│</span>
        <span className="flex items-center gap-1 text-[var(--blue2)]">⚡ 1,240 XP · Level 6</span>
        <span className="text-[var(--border2)]">│</span>
        <span className="flex items-center gap-1">📅 Next live: Wed 10:00 AM</span>
        <span className="ml-auto flex items-center gap-2">
          <span>{isLoading ? "— enrolled courses" : `${courseCount} enrolled course${courseCount !== 1 ? "s" : ""}`}</span>
          <span className="text-[var(--border2)]">│</span>
          <span className="text-[var(--orange)]">FutureStack v2.4.1</span>
          <span className="text-[var(--border2)]">│</span>
          <span>India/Pune</span>
        </span>
      </div>
    </div>
  );
}
