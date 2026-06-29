"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const API = '/api';

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface CourseDetail {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  price: number;
  whatYoullLearn: string[];
  techStack: string[];
  careerTitle: string | null;
  careerBody: string | null;
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
  mentorRating: number | null;
  mentorCoursesTaught: number | null;
  totalLessons: number;
  totalVideos: number;
  totalQuizzes: number;
  sections: {
    id: string;
    title: string;
    order: number;
    videos: { id: string; title: string; vdoCipherId: string; durationSeconds: number; order: number }[];
    quizzes: { id: string; title: string; totalQuestions: number | null; order: number }[];
  }[];
  resources: { id: string; title: string; fileType: string; fileUrl: string; fileSizeLabel: string | null }[];
}

interface CourseCard {
  id: string;
  title: string;
  img: string;
  students: string;
  hours: number;
  level: string;
  rating: number;
  category: string;
  mentorName: string;
}

export default function CourseDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [related, setRelated] = useState<CourseCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [plan, setPlan] = useState("annual");
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/courses`);
        const all: CourseCard[] = await res.json();
        const matched = all.find((c) => slugify(c.title) === slug);
        if (matched) {
          const [detailRes] = await Promise.all([
            fetch(`${API}/courses/${matched.id}`),
          ]);
          const detail: CourseDetail = await detailRes.json();
          setCourse(detail);
          setRelated(all.filter((c) => c.id !== matched.id).slice(0, 3));
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [slug]);

  const totalDuration = course?.sections.reduce(
    (sum, s) => sum + s.videos.reduce((vSum, v) => vSum + v.durationSeconds, 0), 0
  ) ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div className="text-lg font-semibold text-[var(--text2)]">Loading course…</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] gap-4">
        <div className="text-lg font-semibold text-[var(--text2)]">Course not found</div>
        <Link href="/courses" className="text-[var(--orange)] font-semibold underline">Browse all courses</Link>
      </div>
    );
  }

  const sectionModules = course.sections.map((s, si) => {
    const items = [...s.videos, ...s.quizzes].sort((a, b) => a.order - b.order);
    return { section: s, items, index: si };
  });

  const faqs = [
    { q: "What does the subscription include?", a: `Your subscription unlocks all ${course.totalLessons} lessons, graded enterprise projects, verified certificate, 2 live mentor sessions per month, and access to the full Future Stack catalog of 150+ courses across all technology tracks.` },
    { q: "How long do I have access to the course?", a: "For as long as your subscription is active. If you choose annual billing, you have 12 months of access to all content. You can also download resources and project templates for offline use." },
    { q: "Do I need prior experience?", a: `This course is rated ${course.level} which means you should be comfortable with basic concepts. No prior ${course.category} experience is required — the course builds it from the ground up.` },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Breadcrumb */}
      <div className="max-w-[1700px] mx-auto px-6">
        <div className="flex items-center gap-[6px] py-4 text-[12.5px] text-[var(--text3)]">
          <Link href="/" className="hover:text-[var(--blue)] transition-colors">Home</Link>
          <span className="text-[var(--border2)]">/</span>
          <Link href="/courses" className="hover:text-[var(--blue)] transition-colors">Courses</Link>
          <span className="text-[var(--border2)]">/</span>
          <span className="font-medium text-[var(--text2)]">{course.title}</span>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-[var(--hero-bg)] py-7 relative overflow-hidden">
        <div className="max-w-[1700px] mx-auto px-6 flex items-center gap-5 relative z-[1]">
          <div className="flex-1">
            <div className="inline-flex items-center gap-[6px] bg-[rgba(255,255,255,.1)] border border-[rgba(255,255,255,.15)] px-3 py-[4px] rounded-[20px] text-[11.5px] font-semibold text-[rgba(255,255,255,.85)] uppercase tracking-[.4px] mb-2.5">
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              {course.category}
            </div>
            <h1 className="text-[28px] font-bold font-['Syne',sans-serif] text-white leading-[1.25] mb-2.5 max-w-[560px]">{course.title}</h1>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-[5px] text-[13px] text-[rgba(255,255,255,.75)]">
                <svg width="14" height="14" fill="#F59E0B" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                <span className="font-bold text-[#F59E0B]">{course.rating}</span>
                <span className="font-normal text-[rgba(255,255,255,.55)]">({course.students} reviews)</span>
              </span>
              <span className="flex items-center gap-[5px] text-[13px] text-[rgba(255,255,255,.75)]">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                {course.students} enrolled
              </span>
              <span className="flex items-center gap-[5px] text-[13px] text-[rgba(255,255,255,.75)]">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                {course.hours}h · {course.totalLessons} lessons
              </span>
              <span className="flex items-center gap-[5px] text-[13px] text-[rgba(255,255,255,.75)]">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                {course.mentorName}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0 text-right flex flex-col gap-2 items-end">
            <span className="bg-[var(--orange)] text-white px-3.5 py-[5px] rounded-[20px] text-[11px] font-extrabold uppercase tracking-[.5px] shadow-[0_2px_10px_rgba(240,78,0,.4)]">🔥 HOT COURSE</span>
            <span className="bg-[rgba(255,255,255,.12)] border border-[rgba(255,255,255,.2)] px-3 py-[4px] rounded-[20px] text-[11.5px] text-white font-medium">{course.level}</span>
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="max-w-[1700px] mx-auto px-6">
        <div className="grid grid-cols-[300px_1fr_308px] gap-5 py-6 items-start" style={{ alignItems: "start" }}>
          {/* LEFT */}
          <aside className="flex flex-col gap-4 sticky top-[72px]">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-[var(--shadow)]">
              <div className="relative bg-[var(--hero-bg)] aspect-video cursor-pointer overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center z-[2]">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--orange)] to-[var(--orange2)] flex items-center justify-center shadow-[0_4px_20px_rgba(240,78,0,.5)] transition-transform hover:scale-110">
                    <div className="w-0 h-0 border-solid border-t-[9px] border-b-[9px] border-l-[17px] border-transparent border-l-white ml-[4px]"></div>
                  </div>
                </div>
                <span className="absolute top-2.5 left-2.5 bg-[var(--green)] text-white px-2.5 py-[3px] rounded-[5px] text-[10.5px] font-extrabold uppercase tracking-[.5px] shadow-[0_2px_8px_rgba(22,163,74,.4)] z-[2]">Free Preview</span>
                <span className="absolute bottom-2 right-2.5 bg-[rgba(0,0,0,.65)] backdrop-blur-[4px] text-white px-2 py-[2px] rounded-[4px] text-[11px] font-mono z-[2]">
                  {Math.floor(totalDuration / 60)}:{(totalDuration % 60).toString().padStart(2, "0")}
                </span>
              </div>
              <div className="p-3.5 border-t border-[var(--border)]">
                <div className="text-[13px] font-bold text-[var(--text)]">Introduction to {course.title}</div>
                <div className="text-[12px] text-[var(--text3)] flex items-center gap-1 mt-1">
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  Watch free · No login required
                </div>
              </div>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 shadow-[var(--shadow)]">
              <div className="text-[11px] uppercase tracking-[.6px] text-[var(--text3)] font-bold mb-3">Your Instructor</div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--blue)] to-[var(--blue-dim)] flex items-center justify-center text-[14px] font-bold text-white flex-shrink-0">{course.mentorInitials}</div>
                <div>
                  <div className="text-[14px] font-bold text-[var(--text)]">{course.mentorName}</div>
                  <div className="text-[12px] text-[var(--text3)]">{course.mentorBio ?? "Senior Instructor"}</div>
                </div>
              </div>
              <div className="flex gap-3 mt-3">
                <div className="flex-1 text-center p-2 bg-[var(--bg)] rounded-[8px]">
                  <div className="text-base font-extrabold text-[var(--text)]">{course.mentorYearsExp ?? "-"}+</div>
                  <div className="text-[11px] text-[var(--muted)]">Years Exp.</div>
                </div>
                <div className="flex-1 text-center p-2 bg-[var(--bg)] rounded-[8px]">
                  <div className="text-base font-extrabold text-[var(--text)]">{course.mentorCoursesTaught ?? "-"}</div>
                  <div className="text-[11px] text-[var(--muted)]">Courses</div>
                </div>
                <div className="flex-1 text-center p-2 bg-[var(--bg)] rounded-[8px]">
                  <div className="text-base font-extrabold text-[var(--text)]">{course.mentorRating ?? "-"}★</div>
                  <div className="text-[11px] text-[var(--muted)]">Rating</div>
                </div>
              </div>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-[14px_16px] shadow-[var(--shadow)]">
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-[12px] font-bold uppercase tracking-[.5px] text-[var(--text2)]">Your Progress</div>
                <div className="text-[12px] font-bold text-[var(--orange)]">0%</div>
              </div>
              <div className="h-[6px] bg-[var(--bg2)] rounded-[3px] overflow-hidden">
                <div className="h-full w-0 bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] rounded-[3px] transition-[width_.6s_ease]"></div>
              </div>
              <div className="text-[11.5px] text-[var(--muted)] mt-2"><span className="text-[var(--orange)] font-semibold">0 of {course.totalLessons} lessons</span> completed · Subscribe to continue</div>
            </div>
          </aside>

          {/* CENTER */}
          <main className="min-w-0">
            <div className="flex gap-0 bg-[var(--card)] border border-[var(--border)] rounded-xl p-1 mb-4 shadow-[var(--shadow)]">
              {["overview", "curriculum", "projects", "reviews"].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-[9px] px-3 rounded-[10px] text-[13px] font-semibold text-center transition-all ${
                    activeTab === tab
                      ? "bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white shadow-[0_2px_8px_rgba(240,90,26,.3)]"
                      : "text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
                  }`}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Overview */}
            {activeTab === "overview" && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-[22px_24px] shadow-[var(--shadow)] mb-4">
                <div className="font-['Syne',sans-serif] text-[20px] font-bold text-[var(--text)] pb-3 border-b border-[var(--border)] mb-3.5">About This Course</div>
                <div className="text-[14px] text-[var(--text2)] leading-[1.75] mb-4">{course.description}</div>

                {course.whatYoullLearn.length > 0 && (
                  <>
                    <div className="text-[13px] font-bold uppercase tracking-[.6px] text-[var(--muted)] mb-2.5 mt-4">What You'll Learn</div>
                    <div className="grid grid-cols-2 gap-2.5 mb-4">
                      {course.whatYoullLearn.map((item, i) => (
                        <div key={i} className="flex items-start gap-[9px] p-[10px_12px] bg-[var(--blue-dim)]/20 border border-[var(--blue-dim)]/50 rounded-[8px]">
                          <div className="w-[18px] h-[18px] rounded-full bg-gradient-to-br from-[var(--blue)] to-[var(--blue-dim)] flex items-center justify-center flex-shrink-0 mt-[1px]">
                            <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                          <span className="text-[12.5px] text-[var(--text2)] leading-[1.4]">{item}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {course.careerTitle && (
                  <>
                    <div className="text-[13px] font-bold uppercase tracking-[.6px] text-[var(--muted)] mb-2.5 mt-4">Career Relevance</div>
                    <div className="bg-gradient-to-r from-[var(--orange)]/5 to-[var(--blue)]/5 border border-[var(--border)] rounded-[10px] p-[14px_16px] flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[8px] bg-gradient-to-br from-[var(--orange)] to-[var(--orange2)] flex items-center justify-center flex-shrink-0">
                        <svg width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                      </div>
                      <div>
                        <strong className="text-[13px] text-[var(--text)] block mb-0.5">{course.careerTitle}</strong>
                        <span className="text-[12.5px] text-[var(--text2)]">{course.careerBody}</span>
                      </div>
                    </div>
                  </>
                )}

                {course.techStack.length > 0 && (
                  <>
                    <div className="text-[13px] font-bold uppercase tracking-[.6px] text-[var(--muted)] mb-2.5 mt-4">Technologies Covered</div>
                    <div className="flex flex-wrap gap-2">
                      {course.techStack.map((tech, i) => (
                        <span key={i} className="px-3 py-[5px] rounded-[6px] bg-[var(--bg)] border border-[var(--border)] text-[12px] font-semibold text-[var(--text2)] font-mono hover:bg-[var(--blue-dim)]/20 hover:border-[var(--blue-dim)] hover:text-[var(--blue)] transition-all cursor-default">{tech}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Curriculum */}
            {activeTab === "curriculum" && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-[22px_24px] shadow-[var(--shadow)] mb-4">
                <div className="font-['Syne',sans-serif] text-[20px] font-bold text-[var(--text)] pb-3 border-b border-[var(--border)] mb-3.5">Course Curriculum</div>
                <div className="text-[12px] text-[var(--muted)] mb-4 p-[10px_14px] bg-[var(--bg)] rounded-[8px] border border-[var(--border)]">
                  <strong className="text-[var(--text)]">{course.sections.length} modules</strong> · {course.totalLessons} lessons · {course.hours}h total
                  <span className="ml-2 text-[var(--green)] font-semibold">· 1 free preview</span>
                </div>

                <div className="flex flex-col gap-3">
                  {sectionModules.map(({ section, items, index }) => {
                    const isFirstModule = index === 0;
                    return (
                      <div key={section.id}>
                        <div className="flex items-center justify-between p-3 rounded-[10px] bg-[var(--hero-bg)] text-white mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-[26px] h-[26px] rounded-[6px] bg-[rgba(255,255,255,.15)] flex items-center justify-center text-[11px] font-extrabold">{index + 1}</div>
                            <span className="text-[13px] font-bold">{section.title}</span>
                          </div>
                          <span className="text-[12px] text-[rgba(255,255,255,.55)] flex items-center gap-[5px]">
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                            {items.length} items
                          </span>
                        </div>

                        {items.map((item, vi) => {
                          const isVideo = "vdoCipherId" in item;
                          const isFree = isFirstModule && vi === 0;
                          return (
                            <div key={item.id} className={`flex items-center gap-3 p-3 rounded-[10px] border border-[var(--border)] bg-[var(--card)] transition-all ${isFree ? "hover:border-[var(--green)]/50 hover:shadow-[var(--shadow)] hover:translate-x-[2px]" : "opacity-65 bg-[var(--bg)]"}`}>
                              <div className={`w-7 h-7 rounded-[6px] flex items-center justify-center text-[11px] font-extrabold flex-shrink-0 ${isFree ? "bg-[var(--green)] text-white" : "bg-[var(--border)] text-[var(--muted)]"}`}>
                                {isFree ? "✔" : <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[13.5px] font-semibold text-[var(--text)] flex items-center gap-[7px]">
                                  {item.title}
                                  {isFree && <span className="text-[10px] font-extrabold uppercase text-[var(--green)] bg-[var(--green)]/10 px-[7px] py-[1px] rounded-[4px]">Free</span>}
                                </div>
                                {isVideo && (
                                  <div className="text-[12px] text-[var(--muted)] mt-[2px] flex items-center gap-2">
                                    <span className="flex items-center gap-[3px] font-mono text-[11px]">
                                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                                      {Math.floor((item as any).durationSeconds / 60)}:{(item as any).durationSeconds % 60}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-shrink-0">
                                {isFree ? (
                                  <button className="px-4 py-[6px] rounded-[6px] bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white text-[12px] font-bold flex items-center gap-[5px] hover:opacity-90 hover:-translate-y-px transition-all">
                                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                    Watch
                                  </button>
                                ) : (
                                  <button className="px-4 py-[6px] rounded-[6px] bg-[var(--bg2)] text-[var(--muted)] text-[12px] font-semibold cursor-not-allowed flex items-center gap-[5px]">
                                    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                                    Locked
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Projects */}
            {activeTab === "projects" && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-[22px_24px] shadow-[var(--shadow)] mb-4">
                <div className="font-['Syne',sans-serif] text-[20px] font-bold text-[var(--text)] pb-3 border-b border-[var(--border)] mb-3.5">Hands-On Projects</div>
                <p className="text-[13.5px] text-[var(--text2)] mb-[18px]">Apply your skills with real-world projects. Included with subscription.</p>
                <div className="grid grid-cols-2 gap-3">
                  {course.sections.slice(0, 4).map((section, i) => (
                    <div key={section.id} className={`border border-[var(--border)] rounded-[10px] overflow-hidden ${i > 0 ? "opacity-60" : ""}`}>
                      <div className="h-[90px] relative overflow-hidden">
                        <div className={`w-full h-full ${i > 0 ? "blur-[4px] scale-105" : ""}`} style={{ background: `hsl(${i * 60 + 200}, 50%, ${i === 0 ? "70%" : "85%"})` }}></div>
                        {i > 0 && (
                          <div className="absolute inset-0 bg-[rgba(11,14,20,.6)] flex items-center justify-center">
                            <svg width="28" height="28" fill="none" stroke="#fff" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="text-[13px] font-bold text-[var(--text)]">Project: {section.title}</div>
                        <div className="text-[12px] text-[var(--muted)] leading-[1.5] mt-1">Build a real-world {section.title.toLowerCase()} implementation.</div>
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          <span className="text-[11px] px-2 py-[2px] rounded-[4px] bg-[var(--bg)] text-[var(--muted)] font-mono">{i === 0 ? "Free" : "🔒 Subscriber"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {activeTab === "reviews" && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-[22px_24px] shadow-[var(--shadow)] mb-4">
                <div className="font-['Syne',sans-serif] text-[20px] font-bold text-[var(--text)] pb-3 border-b border-[var(--border)] mb-3.5">Student Reviews</div>
                <div className="flex gap-5 items-center mb-5 p-4 bg-[var(--bg)] rounded-[10px] border border-[var(--border)]">
                  <div className="text-center flex-shrink-0">
                    <div className="text-[42px] font-extrabold text-[var(--text)] leading-none font-['Syne',sans-serif]">{course.rating}</div>
                    <div className="flex gap-[2px] my-1 justify-center">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <svg key={s} className="w-3 h-3" viewBox="0 0 20 20" fill={s <= Math.floor(course.rating) ? "#F59E0B" : "var(--border2)"}><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      ))}
                    </div>
                    <div className="text-[12px] text-[var(--muted)]">Course Rating</div>
                  </div>
                  <div className="flex-1">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const pct = star === 5 ? 84 : star === 4 ? 12 : star === 3 ? 3 : star === 2 ? 1 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 mb-[5px]">
                          <span className="text-[12px] text-[var(--muted)] w-3 text-right">{star}</span>
                          <div className="flex-1 h-[6px] bg-[var(--border)] rounded-[3px] overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] rounded-[3px]" style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="text-[11px] text-[var(--muted)] w-7">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* RIGHT */}
          <aside className="sticky top-[72px]">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-[var(--shadow)]">
              <div className="flex p-3 border-b border-[var(--border)] gap-2">
                {(["monthly", "annual"] as const).map((p) => (
                  <button key={p} onClick={() => setPlan(p)}
                    className={`flex-1 py-2 rounded-[8px] text-center text-[13px] font-semibold transition-all relative ${
                      plan === p
                        ? "bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white shadow-[0_2px_8px_rgba(240,90,26,.3)]"
                        : "text-[var(--muted)] bg-[var(--bg)]"
                    }`}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                    {p === "annual" && (
                      <span className="absolute -top-[10px] right-1 bg-[var(--orange)] text-white text-[9.5px] font-extrabold px-1.5 py-[2px] rounded-[4px] uppercase tracking-[.3px]">Save 40%</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="p-5 pb-4 border-b border-[var(--border)]">
                {plan === "monthly" ? (
                  <div className="flex items-end gap-1.5 mb-2">
                    <span className="text-[36px] font-extrabold text-[var(--text)] font-['Syne',sans-serif] leading-none">₹3,999</span>
                    <span className="text-[14px] text-[var(--muted)] pb-1">/month</span>
                  </div>
                ) : (
                  <>
                    <div className="text-[13px] text-[var(--muted)] line-through mb-0.5">₹3,999/mo</div>
                    <div className="flex items-end gap-1.5 mb-1">
                      <span className="text-[36px] font-extrabold text-[var(--text)] font-['Syne',sans-serif] leading-none">₹1,999</span>
                      <span className="text-[14px] text-[var(--muted)] pb-1">/month</span>
                    </div>
                    <div className="text-[12px] font-bold text-[var(--green)]">✓ Save ₹24,000/yr — billed ₹23,988/yr</div>
                  </>
                )}
              </div>

              <div className="p-4 border-b border-[var(--border)]">
                <div className="text-[11.5px] uppercase tracking-[.6px] text-[var(--muted)] font-bold mb-3">Everything Included</div>
                {[
                  { title: `Full course access — all ${course.totalLessons} lessons`, sub: "Instant unlock across all devices" },
                  { title: "Real-world enterprise projects", sub: "Graded with mentor feedback" },
                  { title: "Verified digital certificate", sub: "LinkedIn & resume ready" },
                  { title: "Live mentor sessions — 2 per month", sub: `Direct Q&A with ${course.mentorName}` },
                  { title: "Access to 150+ courses across all tracks", sub: "Full platform — not just this course" },
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-[9px] mb-2.5">
                    <div className="w-[18px] h-[18px] rounded-full bg-[var(--green)] flex items-center justify-center flex-shrink-0 mt-[1px]">
                      <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div className="text-[13px] text-[var(--text2)]">{f.title}<small className="block text-[11.5px] text-[var(--muted)]">{f.sub}</small></div>
                  </div>
                ))}
              </div>

              <div className="p-4">
                <button className="w-full py-3.5 rounded-[10px] bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white text-[15px] font-extrabold shadow-[0_4px_20px_rgba(240,90,26,.35)] hover:opacity-90 hover:-translate-y-0.5 hover:shadow-[0_6px_28px_rgba(240,90,26,.45)] transition-all mb-2.5">🔓 Unlock Full Course</button>
                <button className="w-full py-2.5 rounded-[10px] border-[1.5px] border-[var(--blue-dim)] text-[var(--blue)] text-[13.5px] font-bold hover:bg-[var(--blue-dim)]/20 transition-all">▶ Start Free Preview</button>
                <div className="text-[11.5px] text-[var(--muted)] text-center mt-2.5 leading-[1.5]">No commitment. Cancel anytime.<br/>Prices in INR · GST applicable</div>
              </div>
            </div>

            <div className="bg-[var(--card)] border border-[var(--blue-dim)]/50 rounded-xl p-4 mt-4 shadow-[var(--shadow)] relative overflow-hidden">
              <div className="text-[60px] font-extrabold text-[var(--blue-dim)]/20 right-[-10px] bottom-[-14px] absolute tracking-[-2px] leading-none pointer-events-none font-['Syne',sans-serif] select-none">CERTIFICATE</div>
              <div className="flex items-center gap-2.5 mb-3 relative z-[1]">
                <div className="w-9 h-9 rounded-[8px] bg-gradient-to-r from-[var(--blue)] to-[var(--blue-dim)] flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
                </div>
                <div>
                  <div className="text-[13px] font-bold text-[var(--text)]">Industry Certificate Included</div>
                  <div className="text-[11.5px] text-[var(--muted)]">Issued upon course completion</div>
                </div>
              </div>
              <div className="border border-dashed border-[var(--blue-dim)]/50 rounded-[8px] p-3 text-center bg-[var(--blue-dim)]/10 relative z-[1]">
                <div className="font-['Syne',sans-serif] text-[14px] font-bold text-[var(--text)]">Certificate of Completion</div>
                <div className="text-[11px] text-[var(--text2)] my-1">{course.title}</div>
                <div className="text-[11px] text-[var(--muted)]">Future Stack · Verified by {course.mentorName}</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 mt-3 p-3 rounded-[10px] bg-[var(--green)]/10 border border-[var(--green)]/20">
              <svg width="22" height="22" fill="none" stroke="var(--green)" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <div className="text-[12px] font-semibold text-[var(--green)]">7-Day Money-Back Guarantee<small className="block font-normal opacity-80">Full refund if you're not satisfied</small></div>
            </div>
          </aside>
        </div>
      </div>

      {/* Bottom Sections */}
      <div className="max-w-[1700px] mx-auto px-6 pb-[60px]">
        <div className="bg-[var(--hero-bg)] rounded-xl p-8 mb-6 grid grid-cols-4 gap-6 relative overflow-hidden">
          {[
            { num: "92%", lbl: "Placement Rate" },
            { num: "₹22L+", lbl: "Avg. Starting Salary" },
            { num: course.students.toString(), lbl: "Students Enrolled" },
            { num: `${course.rating}★`, lbl: "Course Rating" },
          ].map((stat, i) => (
            <div key={i} className="text-center relative z-[1]">
              <div className="text-[32px] font-bold text-white font-['Syne',sans-serif] leading-none">
                <span className="text-[var(--orange)]">{stat.num}</span>
              </div>
              <div className="text-[12.5px] text-[rgba(255,255,255,.55)] mt-1">{stat.lbl}</div>
            </div>
          ))}
        </div>

        {related.length > 0 && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-[22px_24px] shadow-[var(--shadow)] mb-4">
            <div className="font-['Syne',sans-serif] text-[20px] font-bold text-[var(--text)] pb-3 border-b border-[var(--border)] mb-3.5">Related Courses</div>
            <div className="grid grid-cols-3 gap-4">
              {related.map((rc) => (
                <Link key={rc.id} href={`/courses/${slugify(rc.title)}`}
                  className="border border-[var(--border)] rounded-xl overflow-hidden cursor-pointer transition-all hover:border-[var(--blue-dim)] hover:shadow-[var(--shadow)] hover:-translate-y-[3px] bg-[var(--card)] no-underline">
                  <div className="h-[100px] overflow-hidden">
                    <img src={rc.img} alt={rc.title} className="w-full h-full object-cover transition-transform hover:scale-105" />
                  </div>
                  <div className="p-3">
                    <div className="text-[11px] font-bold uppercase tracking-[.5px] text-[var(--orange)]">{rc.category}</div>
                    <div className="text-[13px] font-bold text-[var(--text)] leading-[1.35] mt-1">{rc.title}</div>
                    <div className="flex items-center gap-2 text-[12px] text-[var(--muted)] mt-1.5">⭐ {rc.rating} · {rc.hours}h · {rc.level}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-[22px_24px] shadow-[var(--shadow)]">
          <div className="font-['Syne',sans-serif] text-[20px] font-bold text-[var(--text)] pb-3 border-b border-[var(--border)] mb-3.5">Frequently Asked Questions</div>
          {faqs.map((faq, i) => (
            <div key={i} className={`border border-[var(--border)] rounded-[10px] mb-2 overflow-hidden transition-all ${openFaq === faq.q ? "border-[var(--orange)]" : ""}`}>
              <div className="flex items-center justify-between p-[14px_18px] text-[13.5px] font-semibold text-[var(--text)] cursor-pointer select-none hover:bg-[var(--bg)] transition-all"
                onClick={() => setOpenFaq(openFaq === faq.q ? null : faq.q)}>
                {faq.q}
                <span className={`text-base text-[var(--muted)] flex-shrink-0 transition-transform ${openFaq === faq.q ? "rotate-45 text-[var(--orange)]" : ""}`}>+</span>
              </div>
              <div className={`overflow-hidden transition-all ${openFaq === faq.q ? "max-h-[200px] px-[18px] pb-4" : "max-h-0 px-[18px]"}`}>
                <div className="text-[13.5px] text-[var(--text2)] leading-[1.7]">{faq.a}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
