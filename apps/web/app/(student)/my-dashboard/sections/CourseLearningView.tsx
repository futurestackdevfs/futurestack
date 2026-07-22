"use client";

import { useState, useEffect, useCallback } from "react";
import VdoCipherVideoPlayer from "./VdoCipherVideoPlayer";
import { VideoProgressRing } from "@/components/ui/VideoProgressRing"; // Add this
import useSWR, { mutate } from "swr";
import type { EnrolledCourse } from "../../hooks/student-dashboard";
import DiscussionTab from "./DiscussionTab";
import VideoPlayer from "./VideoPlayer";
import QuizPlayer from "./QuizPlayer";

interface CurriculumItem {
  type: 'video' | 'quiz';
  id: string;
  title: string;
  order: number;
  durationSeconds?: number;
  totalQuestions?: number;
  passingScore?: number | null;
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
  onViewCertificate?: () => void;
}

const TABS = ["curriculum", "overview", "resources", "discussion"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, { label: string; icon: string; badge?: string }> = {
  curriculum: { label: "Curriculum", icon: "📋" },
  overview: { label: "Overview", icon: "ℹ️" },
  resources: { label: "Resources", icon: "📎" },
  discussion: { label: "Discussion", icon: "💬" },
};

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2);
}

function fmtMins(secs: number): string {
  return `${Math.floor(secs / 60)}m`;
}

export default function CourseLearningView({ courseId, enrolledCourse, onBack, onViewCertificate }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("curriculum");
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [sectionsInitialized, setSectionsInitialized] = useState(false);
  const [discussionCount, setDiscussionCount] = useState<number | null>(null);
  const [certEarned, setCertEarned] = useState(false);
  const [showAchievement, setShowAchievement] = useState(false);

  const { data: detail, isLoading } = useSWR<StudentCourseDetail>(
    `/api/student/courses/${courseId}`,
  );

  // Once data arrives for the first time, open the relevant sections and set current item
  useEffect(() => {
    if (!detail || sectionsInitialized) return;
    const sectionsToOpen = new Set<string>();
    detail.sections.slice(0, 3).forEach(s => sectionsToOpen.add(s.id));
    const current = detail.sections.find(s => s.items.some(i => i.isCurrent));
    if (current) sectionsToOpen.add(current.id);
    setOpenSections(sectionsToOpen);
    const currentItem = detail.sections.flatMap(s => s.items).find(i => i.isCurrent);
    if (currentItem) {
      setCurrentItemId(currentItem.id);
    } else {
      const firstItem = detail.sections[0]?.items[0];
      if (firstItem) setCurrentItemId(firstItem.id);
    }
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

  const handleComplete = useCallback(async () => {
    await mutate(`/api/student/courses/${courseId}`);
    const refreshed = await fetch(`/api/student/courses/${courseId}`, { credentials: "same-origin" }).then(r => r.json());
    const allDone = refreshed.sections.every((s: { items: { isCompleted: boolean }[] }) =>
      s.items.every((item: { isCompleted: boolean }) => item.isCompleted),
    );
    if (allDone) {
      await mutate("/api/certificates/my");
      setCertEarned(true);
      setShowAchievement(true);
      setTimeout(() => setShowAchievement(false), 6000);
    }
  }, [courseId]);

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
    : progress.progressPercent === 100 ? 'View Certificate'
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
          {/* Real Video or Quiz Player */}
          <div className="shrink-0">
            {currentItem?.type === 'video' ? (
              <VdoCipherVideoPlayer
                videoId={currentItem.id}
                title={currentItem.title}
                durationSeconds={currentItem.durationSeconds ?? 0}
                isCompleted={currentItem.isCompleted}
                onComplete={handleComplete}
              />
            ) : currentItem?.type === 'quiz' ? (
              <div className="aspect-[16/9]">
                <QuizPlayer
                  quizId={currentItem.id}
                  title={currentItem.title}
                  totalQuestions={currentItem.totalQuestions ?? 5}
                  passingScore={currentItem.passingScore ?? null}
                  previousScore={currentItem.score}
                  isCompleted={currentItem.isCompleted}
                  onComplete={handleComplete}
                />
              </div>
            ) : (
              /* Fallback placeholder */
              <div className="relative bg-black aspect-[16/9] flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#040c1a 0%,#061522 40%,#080f04 100%)" }}>
                <div className="text-white text-[12.5px] font-bold text-center px-4">{course.title}</div>
              </div>
            )}
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
            <button 
              onClick={async () => {
                if (progress.progressPercent === 100) {
                  const res = await fetch(`/api/certificates/claim/${courseId}`, {
                    method: "POST",
                    credentials: "same-origin"
                  });
                  if (res.ok) {
                    await mutate("/api/certificates/my");
                    onViewCertificate?.();
                  }
                } else {
                  const firstIncomplete = allItems.find(i => !i.isCompleted);
                  if (firstIncomplete) {
                    setCurrentItemId(firstIncomplete.id);
                    const section = detail?.sections.find(s => s.items.some(i => i.id === firstIncomplete.id));
                    if (section) setOpenSections(prev => new Set(prev).add(section.id));
                  }
                }
              }}
              className="w-full py-[9px] rounded-[8px] bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white text-[12px] font-bold flex items-center justify-center gap-[6px] transition-all hover:opacity-90"
              style={{ boxShadow: "0 3px 14px rgba(240,90,26,.35)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              {resumeLabel}
            </button>
          </div>

          {/* Certificate Earned Banner */}
          {certEarned && (
            <div className="mx-4 mb-3 p-3 rounded-[10px] bg-green-500/10 border border-green-500/20 flex items-center gap-3"
              style={{ animation: "fadeUp .4s ease both" }}>
              <span className="text-[24px]">🏆</span>
              <div className="flex-1">
                <div className="text-[12px] font-bold text-green-600 dark:text-green-400">Certificate Earned!</div>
                <div className="text-[10px] text-[var(--text3)]">View it in your Certificates tab</div>
              </div>
              <button
                onClick={onBack}
                className="px-3 py-1.5 rounded-[6px] text-[10px] font-bold bg-green-600 text-white border-none cursor-pointer hover:bg-green-700 transition-all"
              >
                Back to Courses →
              </button>
            </div>
          )}

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
                  {tab === "discussion" && discussionCount !== null && discussionCount > 0 && (
                    <span className="text-[9px] bg-[var(--orange-d)] text-[var(--orange)] px-[5px] py-[1px] rounded-[3px] ml-[3px]">{discussionCount}</span>
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
                        const canClick = true;

                        return (
                          <div key={item.id}
                            onClick={() => setCurrentItemId(item.id)}
                            className={`grid items-center gap-[10px] px-4 py-[9px] border-t border-[var(--border)] transition-all ${
                              isSelected
                                ? "bg-[rgba(240,90,26,.04)] border-l-2 border-l-[var(--orange)] cursor-pointer"
                                : item.isCompleted
                                  ? "hover:bg-[var(--card-h)] cursor-pointer opacity-80"
                                  : "hover:bg-[var(--card-h)] cursor-pointer"
                            }`}
                            style={{ gridTemplateColumns: "24px 1fr auto auto auto" }}>

                            {/* Status dot */}
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                              item.isCompleted
                                ? "bg-green-600 dark:bg-green-500 text-white"
                                : isSelected
                                  ? "bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white"
                                  : "bg-[var(--orange-d)] text-[var(--orange)]"
                            }`}
                              style={isSelected ? { boxShadow: "0 2px 8px rgba(240,90,26,.5)", animation: "pulse 1.6s ease infinite" } : {}}>
                              {item.isCompleted ? "✓" : isSelected ? "▶" : "○"}
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
                                  : "bg-[var(--orange-d)] text-[var(--orange)]"
                            }`}
                              style={{ boxShadow: isSelected ? "0 1px 4px rgba(240,90,26,.3)" : undefined }}>
                              {item.isCompleted ? "Done" : isSelected ? "Active" : "Ready"}
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

          {/* DISCUSSION */}
          <div className={`flex-1 overflow-y-auto ${activeTab === "discussion" ? "flex flex-col" : "hidden"}`}>
            <DiscussionTab courseId={courseId} onCountChange={setDiscussionCount} />
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }`}</style>

      {showAchievement && (
        <div className="fixed bottom-5 right-5 z-[50] animate-slideUp" style={{animation:"slideUp .5s ease both"}}>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[14px] p-4 flex items-start gap-3 shadow-2xl"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,.35), 0 0 0 1px rgba(240,90,26,.15)" }}>
            <div className="text-3xl">🏆</div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[.1em] text-[var(--orange)] mb-1">New Achievement</div>
              <div className="text-[15px] font-extrabold text-[var(--text)] mb-[2px]">Course Completed!</div>
              <div className="text-[11px] text-[var(--text3)]">Congratulations on completing <strong className="text-[var(--text2)]">{course.title}</strong></div>
              <button
                onClick={() => { setShowAchievement(false); onViewCertificate?.() }}
                className="mt-3 px-4 py-1.5 rounded-[8px] text-[10px] font-bold bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white border-none cursor-pointer hover:opacity-90 transition-all"
              >
                View Certificate →
              </button>
            </div>
            <button onClick={() => setShowAchievement(false)}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[10px] text-[var(--text3)] cursor-pointer hover:text-[var(--text)] transition-all">
              ✕
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  );
}
