'use client';

import Link from "next/link";
import useSWR from "swr";
import type { StudentDashboard } from "../hooks/student-dashboard";

export function ResumeLearning() {
  const { data, isLoading } = useSWR<StudentDashboard>('/api/student/dashboard');
  const courses = (data?.resumeCourses ?? []).slice(0, 2);

  if (isLoading) {
    return (
      <div>
        <div className="font-['Syne'] text-[14px] font-bold text-[var(--text)] mb-3">Resume Learning</div>
        {[1, 2].map((i) => (
          <div key={i} className="mb-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 animate-pulse">
            <div className="flex gap-2.5">
              <div className="h-11 w-[52px] flex-shrink-0 rounded bg-[var(--border)]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 rounded bg-[var(--border)]" />
                <div className="h-2 w-1/2 rounded bg-[var(--border)]" />
                <div className="h-1 w-full rounded bg-[var(--border)]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (courses.length === 0) return null;

  return (
    <div>
      <div className="font-['Syne'] text-[14px] font-bold text-[var(--text)] flex justify-between items-center mb-3">
        <span>Resume Learning</span>
        <Link href="/my-dashboard" className="text-[11px] font-semibold text-[var(--blue)] font-['DM_Sans'] no-underline">View All</Link>
      </div>

      {courses.map((course) => (
          <Link
            key={course.courseId}
            href={`/my-dashboard?courseId=${course.courseId}`}
            className="mb-2 flex cursor-pointer items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 shadow-[var(--shadow)] hover:border-[var(--orange)] no-underline"
          >
            <div className="flex h-11 w-[52px] flex-shrink-0 items-center justify-center rounded text-xl" style={{ background: "linear-gradient(135deg,#0d1f3c,#0a2a1a)" }}>
              {course.title.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[var(--text)] truncate">{course.title}</div>
              <div className="mb-1.5 truncate text-[10px] text-[var(--muted)]">
                {course.nextVideo ? `${course.nextVideo.sectionTitle} · ${course.nextVideo.title}` : 'Starting soon'}
              </div>
              <div className="mb-1 h-1 rounded-full bg-[var(--border)]">
                <div className="h-full rounded-full bg-[var(--orange)]" style={{ width: `${course.progressPercent}%` }} />
              </div>
              <div className="text-[10px] text-[var(--muted)]">
                <span>{course.progressPercent}% Complete</span>
              </div>
            </div>
            <span className="rounded border-none bg-[var(--blue)] px-3 py-1 text-[10px] font-bold text-white shrink-0">
              Continue
            </span>
          </Link>
      ))}
    </div>
  );
}
