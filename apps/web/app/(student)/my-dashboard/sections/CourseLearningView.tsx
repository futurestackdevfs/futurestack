"use client";

import { useState, useEffect } from "react";

const API = '/api';

interface Video {
  id: string;
  title: string;
  vdoCipherId: string;
  durationSeconds: number;
  order: number;
}

interface Section {
  id: string;
  title: string;
  order: number;
  videos: Video[];
}

interface Resource {
  id: string;
  title: string;
  fileType: string;
  fileUrl: string;
  fileSizeLabel: string | null;
}

interface CourseDetail {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  whatYoullLearn: string[];
  techStack: string[];
  category: string;
  hours: number;
  level: string;
  rating: number;
  students: number;
  mentorInitials: string;
  mentorName: string;
  mentorAvatar: string | null;
  mentorBio: string | null;
  mentorYearsExp: number | null;
  mentorCoursesTaught: number | null;
  mentorRating: number | null;
  totalLessons: number;
  totalVideos: number;
  sections: Section[];
  resources: Resource[];
}

interface Props {
  courseSlug: string;
  onBack: () => void;
}

const TABS = ["curriculum", "overview", "resources", "discussion"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, { label: string; icon: string; badge?: string }> = {
  curriculum: { label: "Curriculum", icon: "📋" },
  overview: { label: "Overview", icon: "ℹ️" },
  resources: { label: "Resources", icon: "📎" },
  discussion: { label: "Discussion", icon: "💬", badge: "24" },
};

export default function CourseLearningView({ courseSlug, onBack }: Props) {
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("curriculum");
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [currentLesson, setCurrentLesson] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/courses`);
        const all: { id: string; title: string }[] = await res.json();
        const matched = all.find(
          (c) => c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") === courseSlug
        );
        if (matched) {
          const detail: CourseDetail = await fetch(`${API}/courses/${matched.id}`).then((r) => r.json());
          setCourse(detail);
          if (detail.sections.length > 0) {
            setOpenSections(new Set([detail.sections[0].id]));
            if (detail.sections[0].videos.length > 0) {
              setCurrentLesson(detail.sections[0].videos[0].id);
            }
          }
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [courseSlug]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalDuration = course?.sections.reduce(
    (sum, s) => sum + s.videos.reduce((vSum, v) => vSum + v.durationSeconds, 0), 0
  ) ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-[var(--orange)] border-t-transparent rounded-full animate-spin" />
          <span className="text-[var(--text3)] font-['Inter',system-ui,sans-serif] text-[10px]">Loading course…</span>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="text-3xl mb-3">📭</div>
        <div className="font-['Inter_Tight',sans-serif] text-[14px] font-bold text-[var(--text)] mb-1">Course not found</div>
        <button onClick={onBack} className="text-[var(--orange)] font-semibold underline text-[11px] bg-transparent border-none cursor-pointer">Back to My Courses</button>
      </div>
    );
  }

  const totalVideos = course.sections.reduce((s, sec) => s + sec.videos.length, 0);

  return (
    <div className="flex flex-col bg-[var(--bg)] h-full font-['Inter',system-ui,-apple-system,sans-serif]">
      {/* BREADCRUMB */}
      <div className="flex items-center gap-[5px] px-4 py-[7px] bg-[var(--surface)] border-b border-[var(--border)] text-[10px] text-[var(--text3)] shrink-0" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
        <span className="cursor-pointer hover:text-[var(--orange)] transition-colors" onClick={onBack}>futurestack</span>
        <span className="text-[var(--border2)]">/</span>
        <span className="cursor-pointer hover:text-[var(--orange)] transition-colors" onClick={onBack}>my-courses</span>
        <span className="text-[var(--border2)]">/</span>
        <span className="text-[var(--orange)]">{course.title.toLowerCase().replace(/\s+/g, "-")}</span>
        <span className="ml-auto flex items-center gap-[6px]">
          <span className="text-[var(--orange)] text-[10px]" style={{ animation: "pulse 1.6s ease infinite" }}>●</span>
          <span>Module 1 / {course.sections.length} · 0% complete</span>
        </span>
      </div>

      {/* COURSE BODY */}
      <div className="flex-1 overflow-hidden" style={{ display: "grid", gridTemplateColumns: "385px 1fr" }}>
        {/* VIDEO PANEL */}
        <div className="bg-[var(--surface)] border-r border-[var(--border)] overflow-y-auto flex flex-col">
          {/* Player */}
          <div className="relative bg-black cursor-pointer shrink-0">
            <div className="aspect-[16/9] flex items-center justify-center relative overflow-hidden"
              style={{ background: "linear-gradient(135deg,#040c1a 0%,#061522 40%,#080f04 100%)" }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at 65% 40%,rgba(59,130,246,.15),transparent 55%),radial-gradient(ellipse at 25% 75%,rgba(240,90,26,.1),transparent 50%)"
                }} />
              <svg className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none" viewBox="0 0 330 185" preserveAspectRatio="none">
                <defs>
                  <pattern id="g" width="33" height="33" patternUnits="userSpaceOnUse">
                    <path d="M33 0H0V33" fill="none" stroke="#ffffff" strokeWidth=".35"/>
                  </pattern>
                </defs>
                <rect width="330" height="185" fill="url(#g)"/>
                <polyline points="0,140 55,110 110,125 165,72 220,90 275,46 330,62" fill="none" stroke="rgba(59,130,246,.55)" strokeWidth="1.5"/>
                <polyline points="0,160 80,150 165,138 250,118 330,94" fill="none" stroke="rgba(240,90,26,.45)" strokeWidth="1.2"/>
              </svg>
              <span className="absolute top-[10px] left-[10px] z-[2] bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white text-[8px] font-bold px-[9px] py-[3px] rounded-[4px] uppercase tracking-[.06em]" style={{ boxShadow: "0 2px 8px rgba(240,90,26,.4)" }}>▶ Now Playing</span>
              <span className="absolute bottom-[8px] right-[10px] z-[2] bg-black/65 text-white text-[10px] px-[7px] py-[2px] rounded-[4px]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
                {Math.floor(totalDuration / 60)}:{(totalDuration % 60).toString().padStart(2, "0")}
              </span>
              <div className="flex flex-col items-center gap-3 relative z-[1]">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--orange)] to-[var(--orange2)] flex items-center justify-center transition-transform hover:scale-110" style={{ boxShadow: "0 6px 28px rgba(240,90,26,.55)" }}>
                  <div className="w-0 h-0 border-solid border-t-[11px] border-b-[11px] border-l-[20px] border-transparent border-l-white ml-[4px]" />
                </div>
                <div className="text-white text-[12.5px] font-bold text-center px-4 leading-[1.35]">Introduction to {course.title}</div>
              </div>
            </div>
          </div>

          {/* Video Info */}
          <div className="px-4 py-[14px] border-b border-[var(--border)]">
            <div className="text-[13px] font-bold text-[var(--text)] mb-[3px]">Introduction to {course.title}</div>
            <div className="flex items-center gap-[5px] text-[9.5px] text-[var(--text3)] mb-3" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Module 1 · Lesson 1 · {course.category}
            </div>
            <div className="flex justify-between items-center mb-[5px]">
              <span className="text-[9px] font-bold uppercase tracking-[.06em] text-[var(--text3)]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>Course Progress</span>
              <span className="text-[14px] font-extrabold text-[var(--orange)]" style={{ fontFamily: "'Inter_Tight',sans-serif" }}>0%</span>
            </div>
            <div className="h-[6px] bg-[var(--border)] rounded-[99px] overflow-hidden mb-[6px]">
              <div className="h-full w-0 bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] rounded-[99px]" />
            </div>
            <div className="text-[11px] text-[var(--text3)] mb-3"><strong className="text-[var(--orange)]">0 of {totalVideos}</strong> lessons completed</div>
            <button className="w-full py-[9px] rounded-[8px] bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white text-[12px] font-bold flex items-center justify-center gap-[6px] transition-all hover:opacity-90" style={{ boxShadow: "0 3px 14px rgba(240,90,26,.35)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Resume Learning
            </button>
          </div>

          {/* Instructor */}
          <div className="px-4 py-[14px] border-b border-[var(--border)]">
            <div className="text-[8.5px] font-bold uppercase tracking-[.1em] text-[var(--text3)] mb-[10px]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>Instructor</div>
            <div className="flex items-center gap-[10px] mb-[10px]">
              <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-r from-[var(--blue)] to-[var(--blue2)] flex items-center justify-center text-[13px] font-bold text-white shrink-0" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>{course.mentorInitials}</div>
              <div>
                <div className="text-[12.5px] font-bold text-[var(--text)] mb-[1px]">{course.mentorName}</div>
                <div className="text-[9px] text-[var(--text3)] leading-[1.4]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>{course.mentorBio ?? "Senior Instructor"}<br />{course.category} Expert</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-[8px]">
              {[
                { num: `${course.mentorYearsExp ?? "-"}+`, lbl: "Years Exp." },
                { num: `${course.mentorCoursesTaught ?? "-"}`, lbl: "Courses" },
                { num: `${course.mentorRating ?? "-"}`, lbl: "Rating", star: true },
              ].map((stat) => (
                <div key={stat.lbl} className="text-center pt-[10px] pb-[9px] px-[6px] bg-[var(--surface)] rounded-[8px] border border-[var(--border)] relative overflow-hidden" style={{ boxShadow: "var(--sh)" }}>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[28px] h-[2px] rounded-b-[99px] bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)]" />
                  <div className="text-[24px] font-extrabold text-[var(--text)] leading-[1] mb-[5px] tracking-[-.01em]" style={{ fontFamily: "'Inter_Tight',sans-serif" }}>
                    {stat.num}{stat.star ? <span className="text-[13px]" style={{ color: "var(--yellow)" }}>★</span> : ""}
                  </div>
                  <div className="text-[9px] font-bold text-[var(--text3)] uppercase tracking-[.08em]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>{stat.lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TABS PANEL */}
        <div className="overflow-hidden flex flex-col bg-[var(--bg)]">
          {/* Tab Bar */}
          <div className="flex bg-[var(--surface)] border-b border-[var(--border)] shrink-0 overflow-x-auto">
            {TABS.map((tab) => {
              const info = TAB_LABELS[tab];
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-[5px] px-5 py-3 text-[12.5px] font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-all bg-transparent border-none ${
                    activeTab === tab
                      ? "text-[var(--orange)] border-b-2 border-[var(--orange)] bg-[var(--surface)]"
                      : "text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--card-h)]"
                  }`}>
                  <span className="text-[13px]">{info.icon}</span>
                  {info.label}
                  {info.badge && (
                    <span className="text-[9px] bg-[var(--orange-d)] text-[var(--orange)] px-[5px] py-[1px] rounded-[3px] ml-[3px]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>{info.badge}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* CURRICULUM */}
          <div className={`flex-1 overflow-y-auto ${activeTab === "curriculum" ? "flex flex-col" : "hidden"}`}>
            <div className="p-4 flex flex-col gap-3">
              {course.sections.map((section, si) => {
                const isOpen = openSections.has(section.id);
                const isCurrent = currentLesson && section.videos.some((v) => v.id === currentLesson);
                return (
                  <div key={section.id} className="bg-[var(--card)] border border-[var(--border)] rounded-[10px] overflow-hidden" style={{ boxShadow: "var(--sh)", borderColor: isCurrent ? "rgba(240,90,26,.3)" : undefined }}>
                    <div onClick={() => toggleSection(section.id)}
                      className={`flex items-center gap-[10px] px-4 py-3 cursor-pointer select-none transition-all ${isOpen ? "" : ""} ${isCurrent ? "bg-[rgba(240,90,26,.04)]" : "bg-[var(--surface)] hover:bg-[var(--card-h)]"}`}>
                      <span className={`text-[10px] text-[var(--text3)] shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}>▶</span>
                      <span className="text-[9px] font-bold text-[var(--orange)] w-5 shrink-0" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>{String(si + 1).padStart(2, "0")}</span>
                      <span className="text-[12.5px] font-bold text-[var(--text)] flex-1">{section.title}</span>
                      <span className="text-[9px] text-[var(--text3)] flex gap-[10px] shrink-0" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
                        <span>{section.videos.length} lessons</span>
                        <span>{Math.floor(section.videos.reduce((s, v) => s + v.durationSeconds, 0) / 60)}m</span>
                      </span>
                      <span className="text-[9px] font-bold text-[var(--orange)] shrink-0" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>0/{section.videos.length}</span>
                    </div>
                    <div className={isOpen ? "block" : "hidden"}>
                      {section.videos.map((video, vi) => {
                        const isCurrentVideo = currentLesson === video.id;
                        return (
                          <div key={video.id}
                            onClick={() => setCurrentLesson(video.id)}
                            className={`grid items-center gap-[10px] px-4 py-[9px] border-t border-[var(--border)] transition-all cursor-pointer ${
                              isCurrentVideo
                                ? "bg-[rgba(240,90,26,.04)] border-l-2 border-l-[var(--orange)]"
                                : "opacity-50 cursor-default"
                            }`}
                            style={{ gridTemplateColumns: "24px 1fr auto auto auto" }}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                              isCurrentVideo
                                ? "bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white"
                                : "bg-[var(--bg2)] text-[var(--text3)] border border-[var(--border2)]"
                            }`} style={isCurrentVideo ? { boxShadow: "0 2px 8px rgba(240,90,26,.5)", animation: "pulse 1.6s ease infinite" } : {}}>
                              {isCurrentVideo ? "▶" : "🔒"}
                            </div>
                            <div>
                              <div className="text-[11.5px] font-semibold text-[var(--text)] leading-[1.3]" style={isCurrentVideo ? { color: "var(--orange)" } : {}}>{video.title}</div>
                              <div className="text-[9px] text-[var(--text3)] mt-[1px]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>📹 Video</div>
                            </div>
                            <div className="text-[10px] text-[var(--text2)] text-right whitespace-nowrap" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
                              {Math.floor(video.durationSeconds / 60)}m
                            </div>
                            <div className="text-[10px] font-bold text-right whitespace-nowrap text-[var(--text3)]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>—</div>
                            <div className={`text-[8px] font-bold px-[7px] py-[2px] rounded-[3px] text-center whitespace-nowrap ${
                              isCurrentVideo
                                ? "bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white"
                                : "bg-[var(--bg2)] text-[var(--text3)] border border-[var(--border)]"
                            }`} style={{ fontFamily: "'Inter',system-ui,sans-serif", boxShadow: isCurrentVideo ? "0 1px 4px rgba(240,90,26,.3)" : undefined }}>
                              {isCurrentVideo ? "Active" : "Locked"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* OVERVIEW */}
          <div className={`flex-1 overflow-y-auto ${activeTab === "overview" ? "flex flex-col" : "hidden"}`}>
            <div className="p-5 flex flex-col gap-[22px]">
              <div>
                <div className="flex items-center gap-[8px] text-[9px] font-bold uppercase tracking-[.12em] text-[var(--text3)] mb-[10px]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
                  About This Course
                  <span className="flex-1 h-px bg-[var(--border)]" />
                </div>
                <p className="text-[12px] text-[var(--text2)] leading-[1.75]">{course.description}</p>
              </div>

              {course.whatYoullLearn.length > 0 && (
                <div>
                  <div className="flex items-center gap-[8px] text-[9px] font-bold uppercase tracking-[.12em] text-[var(--text3)] mb-[10px]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
                    What You&apos;ll Learn
                    <span className="flex-1 h-px bg-[var(--border)]" />
                  </div>
                  <div className="grid grid-cols-2 gap-[8px]">
                    {course.whatYoullLearn.map((item, i) => (
                      <div key={i} className="flex items-start gap-[8px] p-[9px_11px] bg-[var(--bg2)] border border-[var(--border)] rounded-[8px] text-[11.5px] text-[var(--text2)] leading-[1.4] transition-all hover:border-[var(--border2)]">
                        <div className="w-[18px] h-[18px] rounded-full bg-[var(--blue)] flex items-center justify-center shrink-0 mt-[1px]">
                          <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center gap-[8px] text-[9px] font-bold uppercase tracking-[.12em] text-[var(--text3)] mb-[10px]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
                  Technologies Covered
                  <span className="flex-1 h-px bg-[var(--border)]" />
                </div>
                <div className="flex flex-wrap gap-[7px]">
                  {course.techStack.map((tech, i) => (
                    <span key={i} className="text-[10px] font-semibold px-[13px] py-[4px] rounded-[20px] border border-[var(--border2)] text-[var(--text2)] bg-[var(--surface)] transition-all hover:border-[var(--orange)] hover:text-[var(--orange)] hover:bg-[var(--orange-d)] cursor-default" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>{tech}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RESOURCES */}
          <div className={`flex-1 overflow-y-auto ${activeTab === "resources" ? "flex flex-col" : "hidden"}`}>
            <div className="p-4 flex flex-col gap-[8px]">
              {course.resources.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <div className="text-3xl mb-3">📄</div>
                  <div className="font-['Inter_Tight',sans-serif] text-[13px] font-bold text-[var(--text)]">No resources yet</div>
                  <div className="text-[var(--text3)] text-[10.5px] mt-1">Resources will appear here as they are added.</div>
                </div>
              ) : (
                course.resources.map((r) => (
                  <a key={r.id} href={r.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-[10px] bg-[var(--card)] border border-[var(--border)] transition-all no-underline hover:border-[var(--border2)] cursor-pointer" style={{ boxShadow: "var(--sh)" }}>
                    <div className="w-9 h-9 rounded-[8px] bg-[var(--orange-d)] flex items-center justify-center text-base shrink-0">📄</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-[var(--text)] mb-[2px]">{r.title}</div>
                      <div className="text-[9px] text-[var(--text3)]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>{r.fileType.toUpperCase()}{r.fileSizeLabel ? ` · ${r.fileSizeLabel}` : ""}</div>
                    </div>
                    <span className="text-[9px] font-bold text-[var(--blue2)] px-[10px] py-[4px] rounded-[5px] border border-[rgba(59,130,246,.25)] bg-[var(--blue-d)] shrink-0 whitespace-nowrap" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>⬇ Download</span>
                  </a>
                ))
              )}
            </div>
          </div>

          {/* DISCUSSION */}
          <div className={`flex-1 overflow-y-auto ${activeTab === "discussion" ? "flex flex-col" : "hidden"}`}>
            <div className="p-4 flex flex-col gap-[10px]">
              <div className="flex gap-[8px] items-start p-3 bg-[var(--card)] border border-[var(--border)] rounded-[10px]">
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[var(--blue2)] to-[var(--orange)] flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-[2px]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>R</div>
                <div className="flex-1 bg-[var(--bg2)] border border-[var(--border)] rounded-[7px] px-3 py-2 text-[11.5px] text-[var(--text3)] cursor-text transition-all hover:border-[var(--border2)]">Ask a question or share your progress…</div>
                <button className="px-[14px] py-[7px] rounded-[6px] bg-[var(--orange)] text-white text-[10.5px] font-bold border-none cursor-pointer whitespace-nowrap hover:bg-[var(--orange2)] transition-all">Post</button>
              </div>
              {[
                { initials: "P", color: "linear-gradient(135deg,#f05a1a,#ff7a3c)", name: "Priya Mehta", time: "2h ago", badge: "doubt", bColor: "var(--blue-d)", bText: "var(--blue2)", text: <>I&apos;m confused about <strong>useEffect</strong> cleanup functions. When exactly do they run? Is it before every re-render or only on unmount?</> },
                { initials: "A", color: "linear-gradient(135deg,#2563eb,#3b82f6)", name: "Aakash Verma", time: "5h ago", badge: "instructor", bColor: "var(--orange-d)", bText: "var(--orange)", text: <>🎉 Congrats to everyone who completed <strong>Module 12</strong>! Solutions are now in Resources. For Module 13, focus on understanding the hooks flow before the lab.</> },
                { initials: "K", color: "linear-gradient(135deg,#9333ea,#a855f7)", name: "Karan Patel", time: "Yesterday", badge: "tip", bColor: "var(--green-d)", bText: "var(--green)", text: <>For those struggling with <strong>Redux setup</strong>, I made a quick reference diagram. Join <strong>#mern-2025</strong> in Study Groups!</> },
              ].map((item, i) => (
                <div key={i} className={`flex gap-[10px] p-[14px] bg-[var(--card)] border border-[var(--border)] rounded-[10px] transition-all hover:border-[var(--border2)] ${i === 1 ? "border-[rgba(240,90,26,.2)] bg-[rgba(240,90,26,.02)]" : ""}`}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-[1px]" style={{ background: item.color, fontFamily: "'Inter',system-ui,sans-serif" }}>{item.initials}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-[8px] mb-[6px] flex-wrap">
                      <span className="text-[12px] font-bold text-[var(--text)]">{item.name}</span>
                      <span className="text-[9px] text-[var(--text3)]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>{item.time}</span>
                      <span className="text-[8px] font-bold px-[6px] py-[2px] rounded-[3px]" style={{ background: item.bColor, color: item.bText, fontFamily: "'Inter',system-ui,sans-serif" }}>{item.badge}</span>
                    </div>
                    <div className="text-[11.5px] text-[var(--text2)] leading-[1.6] mb-[8px]">{item.text}</div>
                    <div className="flex gap-3">
                      {["👍 12", "💬 Reply · 3", "🔖 Save"].map((act) => (
                        <span key={act} className="text-[9px] text-[var(--text3)] cursor-pointer hover:text-[var(--text2)] transition-all" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>{act}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* STATUS BAR */}
      <div className="flex items-center gap-[14px] px-3 py-0 h-[22px] bg-[var(--bg2)] border-t border-[var(--border)] text-[9.5px] text-[var(--text3)] shrink-0" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
        <span className="flex items-center gap-1 text-[var(--green)]"><span className="text-[8px]">●</span>Connected</span>
        <span className="text-[var(--border2)]">│</span>
        <span className="flex items-center gap-1 text-[var(--orange)]">🔥 14-day streak</span>
        <span className="text-[var(--border2)]">│</span>
        <span className="flex items-center gap-1 text-[var(--blue2)]">⚡ 1,240 XP · Level 6</span>
        <span className="text-[var(--border2)]">│</span>
        <span className="flex items-center gap-1">📺 {course.category} · Module 1 · Lesson 1</span>
        <span className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1">0% complete</span>
          <span className="text-[var(--border2)]">│</span>
          <span className="text-[var(--orange)]">FutureStack v2.4.1</span>
          <span className="text-[var(--border2)]">│</span>
          <span>India/Pune</span>
        </span>
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }
      `}</style>
    </div>
  );
}
