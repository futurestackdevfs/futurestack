"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo } from "react";
import { useViewParam } from "@/lib/use-view-param";
import { authApi } from "@/app/auth/lib/auth-api";
import { loadStaffToken, clearStaffToken } from "@/app/auth/lib/token-store";
import { OpsStatusbar } from "@/app/ops/components/OpsStatusbar";
import { RoleGate } from "@/app/ops/components/RoleGate";
import { TrainerTopbar } from "./sections/TrainerTopbar";
import { TrainerSidebar } from "./sections/TrainerSidebar";
import DashboardHome from "./console/DashboardHome";
import BatchesView from "./console/BatchesView";
import MyProjectsView from "./console/MyProjectsView";
import ProgressView from "./console/ProgressView";
import ReviewsView from "./console/ReviewsView";
import StudentRatingsView from "./console/StudentRatingsView";
import DoubtsView from "./console/DoubtsView";
import RevenueView from "./console/RevenueView";
import TrainerProfileView from "./console/TrainerProfileView";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import {
  type TrainerBatch, type TrainerStudent,
  type ProjectSubmission,
  type RevenueEnrollment, type PayoutRecord,
  type StudentFlag,
} from "./lib/data";

/* ───────────────────────────────────────────────
   TYPES
─────────────────────────────────────────────── */

interface TrainerCourseRaw {
  id: string; title: string; code?: string; mentorName?: string;
  category?: string; level?: string; price?: number;
  students?: number; hours?: number; totalLessons?: number;
  totalVideos?: number; totalQuizzes?: number;
  sections?: any[]; modules?: number;
  updatedAt?: string;
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
  const [view, setView] = useViewParam("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string; initials: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "danger" }[]>([]);

  /* Console data */
  const [batches, setBatches] = useState<TrainerBatch[]>([]);
  const [students, setStudents] = useState<TrainerStudent[]>([]);
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [doubts, setDoubts] = useState<DiscussionMessage[]>([]);
  const [enrollments, setEnrollments] = useState<RevenueEnrollment[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [reviews, setReviews] = useState<{ id: string; rating: number; studentName: string; courseTitle: string }[]>([]);
  const [sharePct, setSharePct] = useState(50);
  const [profileComplete, setProfileComplete] = useState(false);

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

  /* ── fetch profile completeness ── */
  useEffect(() => {
    if (!user) return;
    opsFetch("/api/trainer/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const required = [data.phone, data.dob, data.city, data.qualification, data.experience, data.careerPath, data.bio];
        const filled = required.filter((v) => v && String(v).trim()).length;
        setProfileComplete(filled >= 5);
      })
      .catch(() => {});
  }, [user]);

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
      /* enrich with detail — merge card data (has code) with detail data */
      const withDetails = await Promise.all(
        myCourses.map((c) =>
          opsFetch(`/api/courses/public/${c.id}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((detail) => detail ? { ...detail, code: detail.code ?? c.code } : null)
            .catch(() => null),
        ),
      );
      if (cancelled) return;
      const enriched: TrainerCourseRaw[] = withDetails.filter(Boolean);

      /* Map to batches for dashboard (courses become the "batches") */
      const fromApi = enriched.map((c, i) => ({
        id: i + 1,
        code: c.code || "—",
        course: c.title ?? "Untitled",
        schedule: "—",
        enrolled: c.students ?? 0,
        startDate: "—",
        progressPct: 0,
        currentModule: `${c.modules ?? 0} modules`,
        nextSession: "—",
        status: "Running" as const,
        lastUpdated: c.updatedAt
          ? new Date(c.updatedAt).toISOString().slice(0, 16).replace("T", " ")
          : new Date().toISOString().slice(0, 16).replace("T", " "),
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

      /* Students from trainer API */
      const studentsData = await opsFetch("/api/trainer/students")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      /* Reviews from trainer API */
      const reviewsData = await opsFetch("/api/trainer/reviews")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      /* Revenue & payouts from trainer API */
      const trainerData = await opsFetch("/api/trainer/revenue")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      if (trainerData) {
        setSharePct(trainerData.summary?.trainerSharePercent ?? 50);
        setEnrollments(
          (trainerData.studentRegistrations ?? []).map((r: any, i: number) => ({
            id: `enroll-${i}`,
            student: r.studentName,
            batchCode: r.courseTitle.slice(0, 8).toUpperCase(),
            course: r.courseTitle,
            courseFee: r.courseFee,
            paymentMode: r.paidSoFar >= r.courseFee ? "Full" : r.paidSoFar > 0 ? "EMI" : "Pending",
            paymentMethod: r.paymentMethod ?? null,
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
      setStudents(studentsData ?? []);
      setSubmissions([]);
      setDoubts(allDiscussions);
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      setDataLoading(false);
    })();

    return () => { cancelled = true; };
  }, [token, user]);

  function addToast(msg: string, type: "success" | "danger" = "success") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  /* ── mutations ── */
  function setStudentFlag(id: number, flag: StudentFlag) {
    setStudents((prev) => prev.map((s) => s.id === id ? { ...s, flag } : s));
    addToast("Student readiness updated");
  }

  function flagToCoordinator(id: number, reason?: string) {
    const st = students.find((s) => s.id === id);
    if (!st) return;

    opsFetch("/api/trainer/flag-student", {
      method: "POST",
      body: JSON.stringify({ studentId: String(id), reason }),
    }).then((r) => r.ok ? r.json() : null).catch(() => null);

    setStudents((prev) => prev.map((s) => s.id === id ? { ...s, flaggedToCoordinator: true, flagReason: reason } : s));
    addToast(`${st.name} flagged to Coordinator`);
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

  const badges = useMemo(() => ({
    reviews: submissions.filter((s) => s.status === "New" || s.status === "Pending Review").length,
    doubts: doubts.filter((d) => !d.isAnswered).length,
    behind: students.filter((s) => s.flag === "Falling Behind").length,
  }), [submissions, doubts, students]);

  if (sessionLoading) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", color: "var(--text3)" }} className="font-mono text-[11px]">Checking session…</div>;
  if (!user) return null;

  return (
    <RoleGate role="TRAINER">
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
                  batches={batches} students={students}
                  submissions={submissions} doubts={doubts}
                  enrollments={enrollments} payouts={payouts} reviews={reviews}
                  onNavigate={setView}
                  sharePct={sharePct}
                  profileComplete={profileComplete}
                />
              )}
              {view === "batches" && <BatchesView batches={batches} searchQuery={searchQuery} profileComplete={profileComplete} onNavigateProfile={() => setView("profile")} />}
              {view === "projects" && <MyProjectsView searchQuery={searchQuery} profileComplete={profileComplete} onNavigateProfile={() => setView("profile")} />}
              {view === "progress" && <ProgressView students={students} searchQuery={searchQuery} onSetFlag={setStudentFlag} onFlagToCoordinator={flagToCoordinator} />}
              {view === "reviews" && <ReviewsView searchQuery={searchQuery} />}
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
              {view === "revenue" && <RevenueView enrollments={enrollments} payouts={payouts} batches={batches} searchQuery={searchQuery} addToast={addToast} sharePct={sharePct} />}
              {view === "ratings" && <StudentRatingsView searchQuery={searchQuery} />}
              {view === "profile" && <TrainerProfileView userName={user.name} />}
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
    </RoleGate>
  );
}
