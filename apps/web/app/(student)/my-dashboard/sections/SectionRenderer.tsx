"use client";

import type { ReactNode } from "react";
import OverviewSection from "./OverviewSection";
import MyCoursesSection from "./MyCoursesSection";
import ScheduleSection from "./ScheduleSection";
import AssignmentsSection from "./AssignmentsSection";
import CertificatesSection from "./CertificatesSection";
import ProjectsSection from "./ProjectsSection";
import DiscussionTab from "./DiscussionTab";
import CourseLearningView from "./CourseLearningView";
import type { EnrolledCourse } from "../../hooks/student-dashboard";

interface SectionRendererProps {
  activeTab: string;
  selectedCourseId: string | null;
  selectedCourse: EnrolledCourse | null;
  enrolledCourses: EnrolledCourse[];
  discussionCourseId: string | null;
  messageCounts: Record<string, number>;
  loadingCounts: boolean;
  setSelectedCourseId: (id: string | null) => void;
  setDiscussionCourseId: (id: string | null) => void;
  setActiveTab: (tab: any) => void;
  data: { user: { id: string; name: string; email: string; role: string } } | null;
  isLoading: boolean;
}

const COMPONENT_MAP: Record<string, ReactNode | ((props: any) => ReactNode)> = {
  overview: (props: SectionRendererProps) => (
    <OverviewSection user={props.data?.user ?? null} enrolledCourses={props.enrolledCourses} isLoading={props.isLoading} />
  ),
  courses: (props: SectionRendererProps) => {
    if (props.selectedCourseId && props.selectedCourse) {
      return (
        <CourseLearningView
          courseId={props.selectedCourseId}
          enrolledCourse={props.selectedCourse}
          onBack={() => props.setSelectedCourseId(null)}
          onViewCertificate={() => props.setActiveTab("certificates")}
        />
      );
    }
    return (
      <MyCoursesSection
        enrolledCourses={props.enrolledCourses}
        isLoading={props.isLoading}
        onCourseClick={(courseId) => props.setSelectedCourseId(courseId)}
      />
    );
  },
  schedule: () => <ScheduleSection />,
  assignments: () => <AssignmentsSection />,
  certificates: () => <CertificatesSection />,
  projects: () => <ProjectsSection />,
  discussion: (props: SectionRendererProps) => {
    if (props.discussionCourseId) {
      return (
        <div className="flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-[10px] overflow-hidden flex-1 min-h-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]" style={{ background: "var(--surface)" }}>
            <button onClick={() => props.setDiscussionCourseId(null)} className="font-mono text-[9.5px] font-semibold cursor-pointer bg-transparent border-none flex items-center gap-1" style={{ color: "var(--text3)" }}>
              ← Back to courses
            </button>
            <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>
              {props.enrolledCourses.find(c => c.courseId === props.discussionCourseId)?.title || ""}
            </span>
          </div>
          <DiscussionTab courseId={props.discussionCourseId} />
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em]" style={{ color: "var(--text3)" }}>// discussions</span>
          <span className="font-['Syne',sans-serif] text-[13.5px] font-bold" style={{ color: "var(--text)" }}>Select a Course</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>
        {props.isLoading ? (
          <div className="text-[11px] font-mono" style={{ color: "var(--text3)" }}>Loading courses…</div>
        ) : props.enrolledCourses.length === 0 ? (
          <div className="text-[11px] font-mono" style={{ color: "var(--text3)" }}>No enrolled courses yet. Browse the catalog to get started!</div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {props.enrolledCourses.map((course) => {
              const msgCount = props.messageCounts[course.courseId] ?? -1;
              return (
                <button
                  key={course.courseId}
                  onClick={() => props.setDiscussionCourseId(course.courseId)}
                  className="flex items-center gap-3 px-4 py-3 rounded-[8px] text-left cursor-pointer transition-all w-full border"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <span className="text-lg shrink-0">💬</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold truncate" style={{ color: "var(--text)" }}>{course.title}</div>
                  </div>
                  <span className="font-mono text-[8px] font-bold px-2 py-1 rounded shrink-0" style={{ background: "var(--orange-d)", color: "var(--orange)" }}>
                    {props.loadingCounts || msgCount < 0 ? "💬 …" : `💬 ${msgCount}`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  },
};

export default function SectionRenderer(props: SectionRendererProps) {
  const renderer = COMPONENT_MAP[props.activeTab];
  if (!renderer) return <div className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>Section not found: {props.activeTab}</div>;
  if (typeof renderer === "function") return renderer(props);
  return renderer;
}
