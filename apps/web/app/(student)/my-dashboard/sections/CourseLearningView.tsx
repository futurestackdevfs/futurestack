"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import type { EnrolledCourse } from "../../hooks/student-dashboard";

interface CurriculumItem {
  type: 'video' | 'quiz';
  id: string;
  title: string;
  order: number;
  durationSeconds?: number;
  totalQuestions?: number;
  score: number | null;
  isCompleted: boolean;
  isCurrent: boolean;
  isLocked: boolean;
}

interface CourseSection {
  id: string;
  title: string;
  order: number;
  totalItems: number;
  completedItems: number;
  items: CurriculumItem[];
}

interface StudentCourseDetail {
  course: {
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string | null;
    whatYoullLearn: string[];
    techStack: string[];
  };
  instructor: {
    name: string;
    bio: string | null;
    yearsExperience: number | null;
    rating: number | null;
    coursesTaughtCount: number;
  } | null;
  progress: {
    completedItems: number;
    totalItems: number;
    progressPercent: number;
  };
  resources: {
    id: string;
    title: string;
    fileType: string;
    fileUrl: string;
    fileSizeLabel: string | null;
  }[];
  sections: CourseSection[];
}

interface Props {
  courseId: string;
  enrolledCourse: EnrolledCourse;
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

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2);
}

function fmtMins(secs: number): string {
  return `${Math.floor(secs / 60)}m`;
}

export default function CourseLearningView({ courseId, enrolledCourse, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("curriculum");
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [currentItemId, setCurrentItemId] = useState<string | null>(
    enrolledCourse.nextVideo?.id ?? null,
  );
  const [sectionsInitialized, setSectionsInitialized] = useState(false);

  const { data: detail, isLoading } = useSWR<StudentCourseDetail>(
    `/api/student/courses/${courseId}`,
  );

  // Once data arrives for the first time, open the relevant sections and set current item
  useEffect(() => {
    if (!detail || sectionsInitialized) return;
    const sectionsToOpen = new Set<string>();
    if (detail.sections[0]) sectionsToOpen.add(detail.sections[0].id);
    const current = detail.sections.find(s => s.items.some(i => i.isCurrent));
    if (current) sectionsToOpen.add(current.id);
    setOpenSections(sectionsToOpen);
    const currentItem = detail.sections.flatMap(s => s.items).find(i => i.isCurrent);
    if (currentItem) setCurrentItemId(currentItem.id);
    setSectionsInitialized(true);
  }, [detail, sectionsInitialized]);

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allItems = detail?.sections.flatMap(s => s.items) ?? [];
  const currentItem = allItems.find(i => i.id === currentItemId);

  // Use real progress from API once loaded; fall back to dashboard data while loading
  const progress = detail?.progress ?? {
    completedItems: enrolledCourse.completedVideos,
    totalItems: enrolledCourse.totalVideos,
    progressPercent: enrolledCourse.progressPercent,
  };

  const category = detail?.course.techStack[0] ?? enrolledCourse.title;

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

  if (!detail) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="text-3xl mb-3">📭</div>
        <div className="text-[14px] font-bold text-[var(--text)] mb-1">Course not found</div>
        <button onClick={onBack} className="text-[var(--orange)] font-semibold underline text-[11px] bg-transparent border-none cursor-pointer">
          Back to My Courses
        </button>
      </div>
    );
  }

  const { course, instructor } = detail;
  const instructorInitials = instructor ? getInitials(instructor.name) : '?';
  const resumeLabel = progress.progressPercent === 0 ? 'Start Learning'
    : progress.progressPercent === 100 ? 'Review Course'
    : 'Resume Learning';

  return (
    <div className="flex flex-col bg-[var(--bg)] h-full font-['Inter',system-ui,-apple-system,sans-serif]">
      {/* BREADCRUMB */}
      <div className="flex items-center gap-[5px] px-4 py-[7px] bg-[var(--surface)] border-b border-[var(--border)] text-[10px] text-[var(--text3)] shrink-0">
        <span className="cursor-pointer hover:text-[var(--orange)] transition-colors" onClick={onBack}>futurestack</span>
        <span className="text-[var(--border2)]">/</span>
        <span className="cursor-pointer hover:text-[var(--orange)] transition-colors" onClick={onBack}>my-courses</span>
        <span className="text-[var(--border2)]">/</span>
        <span className="text-[var(--orange)]">{course.title.toLowerCase().replace(/\s+/g, '-')}</span>
        <span className="ml-auto flex items-center gap-[6px]">
          <span className="text-[var(--orange)] text-[10px]" style={{ animation: "pulse 1.6s ease infinite" }}>●</span>
          <span>{detail.sections.length} sections · {progress.progressPercent}% complete</span>
        </span>
      </div>

      {/* COURSE BODY */}
      <div className="flex-1 overflow-hidden" style={{ display: "grid", gridTemplateColumns: "385px 1fr" }}>
        {/* LEFT PANEL — player + info */}
        <div className="bg-[var(--surface)] border-r border-[var(--border)] overflow-y-auto flex flex-col">
          {/* Video placeholder */}
          <div className="relative bg-black cursor-pointer shrink-0">
            <div className="aspect-[16/9] flex items-center justify-center relative overflow-hidden"
              style={{ background: "linear-gradient(135deg,#040c1a 0%,#061522 40%,#080f04 100%)" }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at 65% 40%,rgba(59,130,246,.15),transparent 55%),radial-gradient(ellipse at 25% 75%,rgba(240,90,26,.1),transparent 50%)" }} />
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
              <span className="absolute top-[10px] left-[10px] z-[2] bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white text-[8px] font-bold px-[9px] py-[3px] rounded-[4px] uppercase tracking-[.06em]"
                style={{ boxShadow: "0 2px 8px rgba(240,90,26,.4)" }}>
                {currentItem?.type === 'quiz' ? '📝 Quiz' : '▶ Now Playing'}
              </span>
              {currentItem?.durationSeconds && (
                <span className="absolute bottom-[8px] right-[10px] z-[2] bg-black/65 text-white text-[10px] px-[7px] py-[2px] rounded-[4px]">
                  {fmtMins(currentItem.durationSeconds)}
                </span>
              )}
              <div className="flex flex-col items-center gap-3 relative z-[1]">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--orange)] to-[var(--orange2)] flex items-center justify-center transition-transform hover:scale-110"
                  style={{ boxShadow: "0 6px 28px rgba(240,90,26,.55)" }}>
                  <div className="w-0 h-0 border-solid border-t-[11px] border-b-[11px] border-l-[20px] border-transparent border-l-white ml-[4px]" />
                </div>
                <div className="text-white text-[12.5px] font-bold text-center px-4 leading-[1.35]">
                  {currentItem?.title ?? course.title}
                </div>
              </div>
            </div>
          </div>

          {/* Progress info */}
          <div className="px-4 py-[14px] border-b border-[var(--border)]">
            <div className="text-[13px] font-bold text-[var(--text)] mb-[3px]">
              {currentItem?.title ?? course.title}
            </div>
            <div className="flex items-center gap-[5px] text-[9.5px] text-[var(--text3)] mb-3">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              {currentItem?.type === 'quiz' ? 'Quiz' : 'Video'} · {category}
            </div>
            <div className="flex justify-between items-center mb-[5px]">
              <span className="text-[9px] font-bold uppercase tracking-[.06em] text-[var(--text3)]">Course Progress</span>
              <span className="text-[14px] font-extrabold text-[var(--orange)]">{progress.progressPercent}%</span>
            </div>
            <div className="h-[6px] bg-[var(--border)] rounded-[99px] overflow-hidden mb-[6px]">
              <div className="h-full bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] rounded-[99px] transition-[width_.9s_ease]"
                style={{ width: `${progress.progressPercent}%` }} />
            </div>
            <div className="text-[11px] text-[var(--text3)] mb-3">
              <strong className="text-[var(--orange)]">{progress.completedItems} of {progress.totalItems}</strong> lessons completed
            </div>
            <button className="w-full py-[9px] rounded-[8px] bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white text-[12px] font-bold flex items-center justify-center gap-[6px] transition-all hover:opacity-90"
              style={{ boxShadow: "0 3px 14px rgba(240,90,26,.35)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              {resumeLabel}
            </button>
          </div>

          {/* Instructor */}
          {instructor && (
            <div className="px-4 py-[14px] border-b border-[var(--border)]">
              <div className="text-[8.5px] font-bold uppercase tracking-[.1em] text-[var(--text3)] mb-[10px]">Instructor</div>
              <div className="flex items-center gap-[10px] mb-[10px]">
                <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-r from-[var(--blue)] to-[var(--blue2)] flex items-center justify-center text-[13px] font-bold text-white shrink-0">
                  {instructorInitials}
                </div>
                <div>
                  <div className="text-[12.5px] font-bold text-[var(--text)] mb-[1px]">{instructor.name}</div>
                  <div className="text-[9px] text-[var(--text3)] leading-[1.4]">
                    {instructor.bio ?? 'Senior Instructor'}<br />{category} Expert
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-[8px]">
                {[
                  { num: instructor.yearsExperience != null ? `${instructor.yearsExperience}+` : '—', lbl: 'Years Exp.' },
                  { num: String(instructor.coursesTaughtCount), lbl: 'Courses' },
                  { num: instructor.rating != null ? String(instructor.rating) : '—', lbl: 'Rating', star: true },
                ].map(stat => (
                  <div key={stat.lbl} className="text-center pt-[10px] pb-[9px] px-[6px] bg-[var(--surface)] rounded-[8px] border border-[var(--border)] relative overflow-hidden"
                    style={{ boxShadow: "var(--sh)" }}>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[28px] h-[2px] rounded-b-[99px] bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)]" />
                    <div className="text-[24px] font-extrabold text-[var(--text)] leading-[1] mb-[5px] tracking-[-.01em]"
                      style={{ fontFamily: "'Inter_Tight',sans-serif" }}>
                      {stat.num}{stat.star ? <span className="text-[13px]" style={{ color: "var(--yellow)" }}>★</span> : ""}
                    </div>
                    <div className="text-[9px] font-bold text-[var(--text3)] uppercase tracking-[.08em]">{stat.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL — tabs */}
        <div className="overflow-hidden flex flex-col bg-[var(--bg)]">
          <div className="flex bg-[var(--surface)] border-b border-[var(--border)] shrink-0 overflow-x-auto">
            {TABS.map(tab => {
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
                    <span className="text-[9px] bg-[var(--orange-d)] text-[var(--orange)] px-[5px] py-[1px] rounded-[3px] ml-[3px]">{info.badge}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* CURRICULUM */}
          <div className={`flex-1 overflow-y-auto ${activeTab === "curriculum" ? "flex flex-col" : "hidden"}`}>
            <div className="p-4 flex flex-col gap-3">
              {detail.sections.map((section, si) => {
                const isOpen = openSections.has(section.id);
                const hasActive = section.items.some(i => i.id === currentItemId);
                const sectionMinutes = section.items
                  .filter(i => i.type === 'video')
                  .reduce((s, i) => s + (i.durationSeconds ?? 0), 0);

                return (
                  <div key={section.id}
                    className="bg-[var(--card)] border border-[var(--border)] rounded-[10px] overflow-hidden"
                    style={{ boxShadow: "var(--sh)", borderColor: hasActive ? "rgba(240,90,26,.3)" : undefined }}>
                    <div onClick={() => toggleSection(section.id)}
                      className={`flex items-center gap-[10px] px-4 py-3 cursor-pointer select-none transition-all ${hasActive ? "bg-[rgba(240,90,26,.04)]" : "bg-[var(--surface)] hover:bg-[var(--card-h)]"}`}>
                      <span className={`text-[10px] text-[var(--text3)] shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}>▶</span>
                      <span className="text-[9px] font-bold text-[var(--orange)] w-5 shrink-0">{String(si + 1).padStart(2, "0")}</span>
                      <span className="text-[12.5px] font-bold text-[var(--text)] flex-1">{section.title}</span>
                      <span className="text-[9px] text-[var(--text3)] flex gap-[10px] shrink-0">
                        <span>{section.totalItems} lessons</span>
                        <span>{fmtMins(sectionMinutes)}</span>
                      </span>
                      <span className="text-[9px] font-bold text-[var(--orange)] shrink-0">
                        {section.completedItems}/{section.totalItems}
                      </span>
                    </div>

                    <div className={isOpen ? "block" : "hidden"}>
                      {section.items.map(item => {
                        const isSelected = currentItemId === item.id;
                        const canClick = item.isCompleted || item.isCurrent;

                        return (
                          <div key={item.id}
                            onClick={() => canClick && setCurrentItemId(item.id)}
                            className={`grid items-center gap-[10px] px-4 py-[9px] border-t border-[var(--border)] transition-all ${
                              isSelected
                                ? "bg-[rgba(240,90,26,.04)] border-l-2 border-l-[var(--orange)]"
                                : item.isCompleted
                                  ? "hover:bg-[var(--card-h)] cursor-pointer opacity-80"
                                  : item.isLocked
                                    ? "opacity-40 cursor-not-allowed"
                                    : "hover:bg-[var(--card-h)] cursor-pointer"
                            }`}
                            style={{ gridTemplateColumns: "24px 1fr auto auto auto" }}>

                            {/* Status dot */}
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                              item.isCompleted
                                ? "bg-green-600 dark:bg-green-500 text-white"
                                : isSelected
                                  ? "bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white"
                                  : "bg-[var(--bg2)] text-[var(--text3)] border border-[var(--border2)]"
                            }`}
                              style={isSelected ? { boxShadow: "0 2px 8px rgba(240,90,26,.5)", animation: "pulse 1.6s ease infinite" } : {}}>
                              {item.isCompleted ? "✓" : isSelected ? "▶" : "🔒"}
                            </div>

                            {/* Title + type */}
                            <div>
                              <div className="text-[11.5px] font-semibold text-[var(--text)] leading-[1.3]"
                                style={isSelected ? { color: "var(--orange)" } : {}}>
                                {item.title}
                              </div>
                              <div className="text-[9px] text-[var(--text3)] mt-[1px]">
                                {item.type === 'quiz'
                                  ? `📝 Quiz · ${item.totalQuestions ?? '?'} questions`
                                  : '📹 Video'}
                              </div>
                            </div>

                            {/* Duration */}
                            <div className="text-[10px] text-[var(--text2)] text-right whitespace-nowrap">
                              {item.type === 'video' && item.durationSeconds ? fmtMins(item.durationSeconds) : ''}
                            </div>

                            {/* Score */}
                            <div className="text-[10px] font-bold text-right whitespace-nowrap text-[var(--text3)]">
                              {item.score != null ? `${item.score}%` : '—'}
                            </div>

                            {/* Badge */}
                            <div className={`text-[8px] font-bold px-[7px] py-[2px] rounded-[3px] text-center whitespace-nowrap ${
                              item.isCompleted
                                ? "bg-green-500/15 text-green-600 dark:text-green-400"
                                : isSelected
                                  ? "bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white"
                                  : "bg-[var(--bg2)] text-[var(--text3)] border border-[var(--border)]"
                            }`}
                              style={{ boxShadow: isSelected ? "0 1px 4px rgba(240,90,26,.3)" : undefined }}>
                              {item.isCompleted ? "Done" : isSelected ? "Active" : "Locked"}
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
                <div className="flex items-center gap-[8px] text-[9px] font-bold uppercase tracking-[.12em] text-[var(--text3)] mb-[10px]">
                  About This Course <span className="flex-1 h-px bg-[var(--border)]" />
                </div>
                <p className="text-[12px] text-[var(--text2)] leading-[1.75]">{course.description}</p>
              </div>

              {course.whatYoullLearn.length > 0 && (
                <div>
                  <div className="flex items-center gap-[8px] text-[9px] font-bold uppercase tracking-[.12em] text-[var(--text3)] mb-[10px]">
                    What You&apos;ll Learn <span className="flex-1 h-px bg-[var(--border)]" />
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
                <div className="flex items-center gap-[8px] text-[9px] font-bold uppercase tracking-[.12em] text-[var(--text3)] mb-[10px]">
                  Technologies Covered <span className="flex-1 h-px bg-[var(--border)]" />
                </div>
                <div className="flex flex-wrap gap-[7px]">
                  {course.techStack.map((tech, i) => (
                    <span key={i} className="text-[10px] font-semibold px-[13px] py-[4px] rounded-[20px] border border-[var(--border2)] text-[var(--text2)] bg-[var(--surface)] transition-all hover:border-[var(--orange)] hover:text-[var(--orange)] hover:bg-[var(--orange-d)] cursor-default">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RESOURCES */}
          <div className={`flex-1 overflow-y-auto ${activeTab === "resources" ? "flex flex-col" : "hidden"}`}>
            <div className="p-4 flex flex-col gap-[8px]">
              {detail.resources.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <div className="text-3xl mb-3">📄</div>
                  <div className="text-[13px] font-bold text-[var(--text)]">No resources yet</div>
                  <div className="text-[var(--text3)] text-[10.5px] mt-1">Resources will appear here as they are added.</div>
                </div>
              ) : (
                detail.resources.map(r => (
                  <a key={r.id} href={r.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-[10px] bg-[var(--card)] border border-[var(--border)] transition-all no-underline hover:border-[var(--border2)] cursor-pointer"
                    style={{ boxShadow: "var(--sh)" }}>
                    <div className="w-9 h-9 rounded-[8px] bg-[var(--orange-d)] flex items-center justify-center text-base shrink-0">📄</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-[var(--text)] mb-[2px]">{r.title}</div>
                      <div className="text-[9px] text-[var(--text3)]">
                        {r.fileType.toUpperCase()}{r.fileSizeLabel ? ` · ${r.fileSizeLabel}` : ''}
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-[var(--blue2)] px-[10px] py-[4px] rounded-[5px] border border-[rgba(59,130,246,.25)] bg-[var(--blue-d)] shrink-0 whitespace-nowrap">
                      ⬇ Download
                    </span>
                  </a>
                ))
              )}
            </div>
          </div>

          {/* DISCUSSION — static until a discussion API exists */}
          <div className={`flex-1 overflow-y-auto ${activeTab === "discussion" ? "flex flex-col" : "hidden"}`}>
            <div className="p-4 flex flex-col gap-[10px]">
              <div className="flex gap-[8px] items-start p-3 bg-[var(--card)] border border-[var(--border)] rounded-[10px]">
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[var(--blue2)] to-[var(--orange)] flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-[2px]">R</div>
                <div className="flex-1 bg-[var(--bg2)] border border-[var(--border)] rounded-[7px] px-3 py-2 text-[11.5px] text-[var(--text3)] cursor-text transition-all hover:border-[var(--border2)]">
                  Ask a question or share your progress…
                </div>
                <button className="px-[14px] py-[7px] rounded-[6px] bg-[var(--orange)] text-white text-[10.5px] font-bold border-none cursor-pointer whitespace-nowrap hover:bg-[var(--orange2)] transition-all">
                  Post
                </button>
              </div>
              {[
                { initials: "P", color: "linear-gradient(135deg,#f05a1a,#ff7a3c)", name: "Priya Mehta", time: "2h ago", badge: "doubt", bColor: "var(--blue-d)", bText: "var(--blue2)", text: <>I&apos;m confused about <strong>useEffect</strong> cleanup functions. When exactly do they run?</> },
                { initials: "A", color: "linear-gradient(135deg,#2563eb,#3b82f6)", name: "Aakash Verma", time: "5h ago", badge: "instructor", bColor: "var(--orange-d)", bText: "var(--orange)", text: <>🎉 Congrats to everyone who completed <strong>Module 12</strong>! Solutions are now in Resources.</> },
                { initials: "K", color: "linear-gradient(135deg,#9333ea,#a855f7)", name: "Karan Patel", time: "Yesterday", badge: "tip", bColor: "var(--green-d)", bText: "var(--green)", text: <>For those struggling with <strong>Redux setup</strong>, I made a quick reference diagram.</> },
              ].map((item, i) => (
                <div key={i} className={`flex gap-[10px] p-[14px] bg-[var(--card)] border border-[var(--border)] rounded-[10px] transition-all hover:border-[var(--border2)] ${i === 1 ? "border-[rgba(240,90,26,.2)] bg-[rgba(240,90,26,.02)]" : ""}`}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-[1px]" style={{ background: item.color }}>{item.initials}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-[8px] mb-[6px] flex-wrap">
                      <span className="text-[12px] font-bold text-[var(--text)]">{item.name}</span>
                      <span className="text-[9px] text-[var(--text3)]">{item.time}</span>
                      <span className="text-[8px] font-bold px-[6px] py-[2px] rounded-[3px]" style={{ background: item.bColor, color: item.bText }}>{item.badge}</span>
                    </div>
                    <div className="text-[11.5px] text-[var(--text2)] leading-[1.6] mb-[8px]">{item.text}</div>
                    <div className="flex gap-3">
                      {["👍 12", "💬 Reply · 3", "🔖 Save"].map(act => (
                        <span key={act} className="text-[9px] text-[var(--text3)] cursor-pointer hover:text-[var(--text2)] transition-all">{act}</span>
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
      <div className="flex items-center gap-[14px] px-3 py-0 h-[22px] bg-[var(--bg2)] border-t border-[var(--border)] text-[9.5px] text-[var(--text3)] shrink-0">
        <span className="flex items-center gap-1 text-[var(--green)]"><span className="text-[8px]">●</span>Connected</span>
        <span className="text-[var(--border2)]">│</span>
        <span className="flex items-center gap-1 text-[var(--orange)]">🔥 14-day streak</span>
        <span className="text-[var(--border2)]">│</span>
        <span className="flex items-center gap-1 text-[var(--blue2)]">⚡ 1,240 XP · Level 6</span>
        <span className="text-[var(--border2)]">│</span>
        <span className="flex items-center gap-1">📺 {currentItem?.title ?? course.title}</span>
        <span className="ml-auto flex items-center gap-3">
          <span>{progress.progressPercent}% complete</span>
          <span className="text-[var(--border2)]">│</span>
          <span className="text-[var(--orange)]">FutureStack v2.4.1</span>
          <span className="text-[var(--border2)]">│</span>
          <span>India/Pune</span>
        </span>
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }`}</style>
    </div>
  );
}
