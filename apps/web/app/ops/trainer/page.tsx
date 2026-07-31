"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo } from "react";
import { authApi } from "@/app/auth/lib/auth-api";
import { loadStaffToken, clearStaffToken } from "@/app/auth/lib/token-store";
import { OpsStatusbar } from "@/app/ops/components/OpsStatusbar";
import { TrainerTopbar } from "./sections/TrainerTopbar";
import { TrainerSidebar } from "./sections/TrainerSidebar";
import DashboardHome from "./console/DashboardHome";
import BatchesView from "./console/BatchesView";
import { type CourseFormValues } from "./sections/CourseModal";
import SessionsView from "./console/SessionsView";
import ProgressView from "./console/ProgressView";
import ReviewsView from "./console/ReviewsView";
import StudentRatingsView from "./console/StudentRatingsView";
import DoubtsView from "./console/DoubtsView";
import FeedbackView from "./console/FeedbackView";
import RevenueView from "./console/RevenueView";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { loadLocal, saveLocal } from "./lib/store";
import {
  type TrainerBatch, type TrainerSession, type TrainerStudent,
  type ProjectSubmission, type CurriculumFeedback,
  type RevenueEnrollment, type PayoutRecord,
  type StudentFlag, type SubmissionStatus,
} from "./lib/data";

/* ───────────────────────────────────────────────
   TYPES
─────────────────────────────────────────────── */

interface TrainerCourseRaw {
  id: string; title: string; mentorName?: string;
  category?: string; level?: string; price?: number;
  students?: number; hours?: number; totalLessons?: number;
  totalVideos?: number; totalQuizzes?: number;
  sections?: any[]; modules?: number;
}

interface DiscussionAuthor {
  id: string; name: string; avatarUrl: string | null; role: string;
}
interface DiscussionReply {
  id: string; body: string; createdAt: string;
  author: DiscussionAuthor;
  userHasUpvoted: boolean; upvoteCount: number;
}
interface DiscussionMessage {
  id: string; courseId: string; courseTitle?: string;
  body: string; tag: "DOUBT" | "TIP" | "ANNOUNCEMENT" | "RESOURCE";
  isPinned: boolean; isAnswered: boolean;
  attachmentUrl: string | null;
  createdAt: string;
  author: DiscussionAuthor;
  userHasUpvoted: boolean;
  upvoteCount: number; replyCount: number;
  replies: DiscussionReply[];
}

/* ───────────────────────────────────────────────
   HELPERS
─────────────────────────────────────────────── */

async function jsonOrThrow<T = any>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `${res.status} ${res.statusText}`);
  }
  return res.json();
}

/* ───────────────────────────────────────────────
   COMPONENT
─────────────────────────────────────────────── */

export default function TrainerDashboardPage() {
  const [view, setView] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string; initials: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "danger" }[]>([]);

  /* Console data — see data.ts for seed defaults */
  const [batches, setBatches] = useState<TrainerBatch[]>([]);
  const [sessions, setSessions] = useState<TrainerSession[]>([]);
  const [students, setStudents] = useState<TrainerStudent[]>([]);
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [doubts, setDoubts] = useState<DiscussionMessage[]>([]);
  const [feedback, setFeedback] = useState<CurriculumFeedback[]>([]);
  const [enrollments, setEnrollments] = useState<RevenueEnrollment[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);

  /* ── session + user auth ── */
  useEffect(() => {
    (async () => {
      const t = await loadStaffToken().catch(() => null);
      if (!t) { window.location.href = "/auth/staff-login"; return; }
      setToken(t);
      try {
        const u = await authApi.me(t);
        setUser({
          id: u.id!, name: u.name, email: u.email, role: u.role,
          initials: u.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "T",
        });
      } catch { window.location.href = "/auth/staff-login"; }
      finally { setSessionLoading(false); }
    })();
  }, []);

  /* ── fetch data (admin pattern: Promise.all with token) ── */
  useEffect(() => {
    if (!token || !user) return;
    let cancelled = false;

    (async () => {
      /* Fetch courses from public API (filtered by mentorName) */
      const coursesPromise = opsFetch("/api/courses/public/cards?page=1&perPage=100")
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((body: any) => {
          const all: any[] = body.data ?? [];
          return all.filter((c: any) => c.mentorName === user.name);
        })
        .catch(() => []);

      /* Fetch discussions for doubts */
      const cards = await coursesPromise;
      if (cancelled) return;

      const myCourses: TrainerCourseRaw[] = cards;
      /* enrich with detail */
      const withDetails = await Promise.all(
        myCourses.map((c) =>
          opsFetch(`/api/courses/public/${c.id}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ),
      );
      if (cancelled) return;
      const enriched: TrainerCourseRaw[] = withDetails.filter(Boolean);

      /* Map to batches for dashboard (courses become the "batches") */
      const fromApi = enriched.map((c, i) => ({
        id: i + 1,
        code: c.title?.slice(0, 2).toUpperCase() + "-" + (c.id?.slice(0, 4) ?? i),
        course: c.title ?? "Untitled",
        schedule: "—",
        enrolled: c.students ?? 0,
        startDate: "—",
        progressPct: 0,
        currentModule: `${c.modules ?? 0} modules`,
        nextSession: "—",
        status: "Running" as const,
      }));

      /* Fetch discussions for all courses */
      const allDiscussions: DiscussionMessage[] = [];
      for (const c of enriched) {
        try {
          const msgs = await jsonOrThrow<DiscussionMessage[]>(
            await opsFetch(`/api/discussion/${c.id}?page=1&limit=50`),
          );
          const withCourse = (Array.isArray(msgs) ? msgs : []).map((m) => ({
            ...m,
            courseId: c.id,
            courseTitle: c.title ?? "",
          }));
          allDiscussions.push(...withCourse);
        } catch { /* skip */ }
      }

      /* Load localStorage-persisted data for entities without backend APIs */
      const localSessions = loadLocal<TrainerSession[]>(user.id, "sessions", []);
      const localStudents = loadLocal<TrainerStudent[]>(user.id, "students", []);
      const localSubmissions = loadLocal<ProjectSubmission[]>(user.id, "submissions", []);
      const localFeedback = loadLocal<CurriculumFeedback[]>(user.id, "feedback", []);

      /* Revenue & payouts from trainer API */
      const trainerData = await opsFetch("/api/trainer/revenue")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      if (trainerData) {
        setEnrollments(
          (trainerData.studentRegistrations ?? []).map((r: any, i: number) => ({
            id: `enroll-${i}`,
            student: r.studentName,
            batchCode: r.courseTitle.slice(0, 8).toUpperCase(),
            course: r.courseTitle,
            courseFee: r.courseFee,
            paymentMode: r.paidSoFar >= r.courseFee ? "Full" : r.paidSoFar > 0 ? "EMI" : "Pending",
            enrolledOn: new Date(r.enrolledOn).toISOString().slice(0, 10),
          }))
        );
        setPayouts(
          (trainerData.payoutHistory ?? []).map((p: any, i: number) => ({
            id: i,
            period: p.period,
            batchCode: "",
            amount: p.amount,
            status: p.status === "PAID" ? "Paid" : "Pending",
          }))
        );
      } else {
        setEnrollments([]);
        setPayouts([]);
      }

      if (cancelled) return;
      setBatches(fromApi);
      setSessions(localSessions);
      setStudents(localStudents);
      setSubmissions(localSubmissions);
      setDoubts(allDiscussions);
      setFeedback(localFeedback);
      setDataLoading(false);
    })();

    return () => { cancelled = true; };
  }, [token, user]);

  function addToast(msg: string, type: "success" | "danger" = "success") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  /* ── mutations shared across views (persist to localStorage) ── */
  function updateSessionStatus(id: number, status: TrainerSession["status"]) {
    setSessions((prev) => {
      const next = prev.map((s) => s.id === id ? { ...s, status } : s);
      if (user) saveLocal(user.id, "sessions", next);
      return next;
    });
    addToast(`Session ${status === "Cancelled" ? "cancelled" : `marked ${status.toLowerCase()}`}`, status === "Cancelled" ? "danger" : "success");
  }

  function setStudentFlag(id: number, flag: StudentFlag) {
    setStudents((prev) => {
      const next = prev.map((s) => s.id === id ? { ...s, flag } : s);
      if (user) saveLocal(user.id, "students", next);
      return next;
    });
    addToast("Student readiness updated");
  }

  function flagToCoordinator(id: number) {
    setStudents((prev) => {
      const next = prev.map((s) => s.id === id ? { ...s, flaggedToCoordinator: true } : s);
      if (user) saveLocal(user.id, "students", next);
      return next;
    });
    const st = students.find((s) => s.id === id);
    addToast(`${st?.name || "Student"} flagged to Coordinator`);
  }

  function reviewSubmission(id: number, status: SubmissionStatus, feedbackText: string) {
    setSubmissions((prev) => {
      const next = prev.map((s) => s.id === id ? { ...s, status, feedback: feedbackText } : s);
      if (user) saveLocal(user.id, "submissions", next);
      return next;
    });
    addToast(status === "Approved" ? "Project approved" : "Revision requested");
  }

  function genCourseCode(title: string, existing: any[]): string {
    const prefix = (title.match(/[a-zA-Z0-9]/g) ?? []).join('').toUpperCase().slice(0, 3) || 'CRS';
    const maxSeq = existing
      .filter(c => c.code?.startsWith(`CRS-${prefix}-`))
      .reduce((max, c) => Math.max(max, parseInt(c.code.split('-').pop() ?? '0', 10)), 0);
    return `CRS-${prefix}-${String(maxSeq + 1).padStart(3, '0')}`;
  }

  function addCourse(input: CourseFormValues) {
    const stored = user ? loadLocal<any[]>(user.id, "courses", []) : [];
    const autoCode = genCourseCode(input.title || "Untitled Course", stored);
    const newCourse: TrainerBatch = {
      id: Date.now(),
      code: autoCode,
      course: input.title || "Untitled Course",
      schedule: input.level || "—",
      enrolled: 0,
      startDate: input.category || "—",
      progressPct: 0,
      currentModule: input.price ? `₹${input.price}` : "—",
      nextSession: "—",
      status: "Running" as const,
    };
    setBatches((prev) => [newCourse, ...prev]);
    if (user) {
      saveLocal(user.id, "courses", [{ ...input, code: autoCode, id: newCourse.id }, ...stored]);
    }
    addToast("Course added");
  }

  function updateCourse(id: number, input: CourseFormValues) {
    setBatches((prev) => prev.map((b) => b.id === id ? {
      ...b,
      course: input.title || b.course,
      schedule: input.level || b.schedule,
      startDate: input.category || b.startDate,
      currentModule: input.price ? `₹${input.price}` : b.currentModule,
    } : b));
    if (user) {
      const stored = loadLocal<any[]>(user.id, "courses", []);
      saveLocal(user.id, "courses", stored.map((c) => c.id === id ? { ...c, ...input, code: c.code || genCourseCode(input.title || c.code || '', stored) } : c));
    }
    addToast("Course updated");
  }

  /* ── Discussion API actions ── */

  async function apiAction<T = any>(url: string, init?: RequestInit): Promise<T | null> {
    try {
      const r = await opsFetch(url, init);
      if (!r.ok) { const e = await r.json().catch(() => ({ message: `${r.status}` })); addToast(e.message ?? "Request failed", "danger"); return null; }
      return r.json();
    } catch { addToast("Network error", "danger"); return null; }
  }

  async function handleToggleAnswer(msgId: string, courseId: string) {
    const res = await apiAction<{ isAnswered: boolean }>(`/api/discussion/${courseId}/messages/${msgId}/answer`, { method: "PATCH" });
    if (res) {
      setDoubts((prev) => prev.map((d) => d.id === msgId ? { ...d, isAnswered: res.isAnswered } : d));
      addToast(res.isAnswered ? "Marked as answered" : "Unmarked");
    }
  }

  async function handleTogglePin(msgId: string, courseId: string) {
    const res = await apiAction<{ isPinned: boolean }>(`/api/discussion/${courseId}/messages/${msgId}/pin`, { method: "PATCH" });
    if (res) {
      setDoubts((prev) => prev.map((d) => d.id === msgId ? { ...d, isPinned: res.isPinned } : d));
      addToast(res.isPinned ? "Pinned" : "Unpinned");
    }
  }

  async function handleReply(msgId: string, courseId: string, body: string) {
    const res = await apiAction(`/api/discussion/${courseId}/messages/${msgId}/replies`, { method: "POST", body: JSON.stringify({ body }) });
    if (res) addToast("Reply posted");
    return res;
  }

  async function handleDelete(msgId: string, courseId: string) {
    const res = await apiAction(`/api/discussion/${courseId}/messages/${msgId}`, { method: "DELETE" });
    if (res) { setDoubts((prev) => prev.filter((d) => d.id !== msgId)); addToast("Deleted"); }
  }

  async function handleUpvote(msgId: string, courseId: string, replyId?: string) {
    const url = replyId
      ? `/api/discussion/${courseId}/replies/${replyId}/upvote`
      : `/api/discussion/${courseId}/messages/${msgId}/upvote`;
    const res = await apiAction<{ upvoted: boolean; upvoteCount: number }>(url, { method: "POST" });
    if (res) {
      if (replyId) {
        setDoubts((prev) => prev.map((d) => d.id === msgId ? { ...d, replies: d.replies.map((r) => r.id === replyId ? { ...r, userHasUpvoted: res.upvoted, upvoteCount: res.upvoteCount } : r) } : d));
      } else {
        setDoubts((prev) => prev.map((d) => d.id === msgId ? { ...d, userHasUpvoted: res.upvoted, upvoteCount: res.upvoteCount } : d));
      }
    }
  }

  async function handleCreateMessage(courseId: string, body: string, tag: string, attachmentUrl?: string | null) {
    const res = await apiAction<DiscussionMessage>(`/api/discussion/${courseId}`, { method: "POST", body: JSON.stringify({ body, tag, attachmentUrl }) });
    if (res) {
      setDoubts((prev) => [{ ...res, courseId, replies: [] }, ...prev]);
      addToast("Message posted");
    }
    return res;
  }

  async function handleUpdateMessage(msgId: string, courseId: string, body: string) {
    const res = await apiAction(`/api/discussion/${courseId}/messages/${msgId}`, { method: "PATCH", body: JSON.stringify({ body }) });
    if (res) {
      setDoubts((prev) => prev.map((d) => d.id === msgId ? { ...d, body } : d));
      addToast("Message updated");
    }
    return res;
  }

  async function handleDeleteReply(replyId: string, courseId: string) {
    const res = await apiAction(`/api/discussion/${courseId}/replies/${replyId}`, { method: "DELETE" });
    if (res) {
      setDoubts((prev) => prev.map((d) => ({ ...d, replies: d.replies.filter((r) => r.id !== replyId) })));
      addToast("Reply deleted");
    }
    return res;
  }

  function addFeedback(item: Omit<CurriculumFeedback, "id" | "raisedAt" | "status">) {
    setFeedback((prev) => {
      const next = [
        { ...item, id: Math.max(0, ...prev.map((f) => f.id)) + 1, raisedAt: new Date().toISOString().slice(0, 10), status: "Draft" as const },
        ...prev,
      ];
      if (user) saveLocal(user.id, "feedback", next);
      return next;
    });
    addToast("Feedback saved as draft");
  }

  function submitFeedbackDraft(id: number) {
    setFeedback((prev) => {
      const next = prev.map((f) => f.id === id ? { ...f, status: "Submitted" as const } : f);
      if (user) saveLocal(user.id, "feedback", next);
      return next;
    });
    addToast("Feedback submitted to Content Manager");
  }

  const badges = useMemo(() => ({
    reviews: submissions.filter((s) => s.status === "New" || s.status === "Pending Review").length,
    doubts: doubts.filter((d) => !d.isAnswered).length,
    behind: students.filter((s) => s.flag === "Falling Behind").length,
  }), [submissions, doubts, students]);

  if (sessionLoading) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", color: "var(--text3)" }} className="font-mono text-[11px]">Checking session…</div>;
  if (!user) return null;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <TrainerTopbar
        user={user}
        currentView={view}
        onSearch={setSearchQuery}
        onSignOut={async () => {
          await clearStaffToken();
          await fetch("/api/auth/set-token-staff", { method: "DELETE" });
          setUser(null);
          window.location.href = "/auth/staff-login";
        }}
      />

      <div className="flex" style={{ flex: 1, overflow: "hidden" }}>
        <TrainerSidebar activeView={view} onSwitchView={setView} badges={badges} />

        <main className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
          {dataLoading ? (
            <div className="flex items-center justify-center h-full font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading data…</div>
          ) : (
            <>
              {view === "dashboard" && (
                <DashboardHome
                  userName={user.name}
                  batches={batches} sessions={sessions} students={students}
                  submissions={submissions} doubts={doubts} feedback={feedback}
                  enrollments={enrollments} payouts={payouts}
                  onNavigate={setView}
                />
              )}
              {view === "batches" && <BatchesView batches={batches} sessions={sessions} searchQuery={searchQuery} onAddCourse={addCourse} onEditCourse={updateCourse} />}
              {view === "sessions" && <SessionsView sessions={sessions} searchQuery={searchQuery} onUpdateStatus={updateSessionStatus} />}
              {view === "progress" && <ProgressView students={students} searchQuery={searchQuery} onSetFlag={setStudentFlag} onFlagToCoordinator={flagToCoordinator} />}
              {view === "reviews" && <ReviewsView submissions={submissions} searchQuery={searchQuery} onReview={reviewSubmission} />}
              {view === "doubts" && (
                <DoubtsView
                  messages={doubts}
                  searchQuery={searchQuery}
                  user={user}
                  onToggleAnswer={handleToggleAnswer}
                  onTogglePin={handleTogglePin}
                  onReply={handleReply}
                  onDelete={handleDelete}
                  onUpvote={handleUpvote}
                  onCreate={handleCreateMessage}
                  onUpdate={handleUpdateMessage}
                  onDeleteReply={handleDeleteReply}
                />
              )}
              {view === "feedback" && <FeedbackView feedback={feedback} searchQuery={searchQuery} onAdd={addFeedback} onSubmitDraft={submitFeedbackDraft} />}
              {view === "revenue" && <RevenueView enrollments={enrollments} payouts={payouts} batches={batches} searchQuery={searchQuery} addToast={addToast} />}
              {view === "ratings" && <StudentRatingsView searchQuery={searchQuery} />}
              {["grading","mentees","content-library","reports","session-history"].includes(view) && (
                <div className="flex items-center justify-center h-full">
                  <div className="font-mono text-[13px]" style={{ color: "var(--text3)" }}>
                    {view === "grading" ? "Grading Queue" :
                     view === "mentees" ? "Mentees" :
                     view === "content-library" ? "Content Library" :
                     view === "reports" ? "Reports" :
                     "Session History"} — coming soon
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <OpsStatusbar leftItems={[
        "SYS_SYNC: OK",
        `COURSES: ${batches.length}`,
        `STUDENTS: ${students.length}`,
        dataLoading ? "LOADING…" : "LIVE",
      ]} sessionEmail={user.email} />

      {/* Toasts */}
      <div className="fixed bottom-9 right-4 flex flex-col gap-2 z-[300]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded text-[11.5px] font-semibold min-w-[220px]"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 8px 24px rgba(0,0,0,.18)",
              color: "var(--text)",
              borderLeft: `3px solid ${t.type === "success" ? "var(--green)" : "var(--red)"}`,
              animation: "toast-in .2s ease",
            }}
          >
            <span style={{ fontSize: 13 }}>{t.type === "success" ? "✓" : "✕"}</span>
            {t.msg}
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
