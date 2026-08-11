"use client";

import { useMemo } from "react";
import { INR } from "../lib/data";
import type { TrainerBatch, TrainerSession, TrainerStudent } from "../lib/data";
import type { ProjectSubmission, CurriculumFeedback, RevenueEnrollment, PayoutRecord } from "../lib/data";

/* Discussion API type */
interface DiscussionAuthor {
  id: string; name: string; avatarUrl: string | null; role: string;
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
}
import { KpiRow, Pill, ViewHeader, ProgressBar } from "../sections/ui";

interface DashboardHomeProps {
  userName: string;
  batches: TrainerBatch[];
  sessions: TrainerSession[];
  students: TrainerStudent[];
  submissions: ProjectSubmission[];
  doubts: DiscussionMessage[];
  feedback: CurriculumFeedback[];
  enrollments: RevenueEnrollment[];
  payouts: PayoutRecord[];
  onNavigate: (view: string) => void;
  sharePct?: number;
}

function Card({ icon, title, onOpen, children }: { icon: string; title: string; onOpen: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded overflow-hidden flex flex-col" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
        <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>{icon} {title}</span>
        <button
          onClick={onOpen}
          className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer"
          style={{ color: "var(--orange)", border: "1px solid var(--orange)", background: "transparent" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--orange-d)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >OPEN →</button>
      </div>
      <div className="p-3 flex-1">{children}</div>
    </div>
  );
}

function StatPair({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[10.5px]" style={{ color: "var(--text3)" }}>{label}</span>
      <span className="font-mono text-[10.5px] font-bold" style={{ color: color || "var(--text)" }}>{value}</span>
    </div>
  );
}

export default function DashboardHome({
  userName, batches, sessions, students, submissions, doubts, feedback, enrollments, payouts, onNavigate, sharePct = 50,
}: DashboardHomeProps) {
  const today = new Date().toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const running = batches.filter((b) => b.status === "Running");
    const enrolledTotal = batches.reduce((s, b) => s + b.enrolled, 0);
    const todaySessions = sessions.filter((s) => s.date === today && s.status !== "Cancelled");
    const behind = students.filter((s) => s.flag === "Falling Behind");
    const ready = students.filter((s) => s.flag === "Ready for Next Module");
    const reattempt = students.filter((s) => s.flag === "Needs Re-attempt");
    const newSubs = submissions.filter((s) => s.status === "New");
    const pendingSubs = submissions.filter((s) => s.status === "Pending Review");
    const revisionSubs = submissions.filter((s) => s.status === "Revision Requested");
    const approvedSubs = submissions.filter((s) => s.status === "Approved");
    const openDoubts = doubts.filter((d) => !d.isAnswered);
    const collected = enrollments.reduce((s, e) => {
      if (e.paymentMode === "Full") return s + e.courseFee;
      if (e.paymentMode === "EMI") return s + Math.round(e.courseFee * 0.5);
      return s;
    }, 0);
    const myShare = Math.round(collected * (sharePct / 100));
    const paidOut = payouts.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0);
    return {
      running, enrolledTotal, todaySessions, behind, ready, reattempt,
      newSubs, pendingSubs, revisionSubs, approvedSubs,
      openDoubts,
      collected, myShare, paidOut, pendingPayout: myShare - paidOut,
    };
  }, [batches, sessions, students, submissions, doubts, enrollments, payouts, today]);

  const nextSession = sessions
    .filter((s) => s.status === "Scheduled")
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  return (
    <div className="p-4 pb-7">
      <ViewHeader icon="🎓" title={`Welcome back, ${userName.split(" ")[0]}`} meta={`role::trainer · ${batches.length} courses · ${stats.enrolledTotal} students`} />

      <KpiRow items={[
        { label: "Active Courses", value: stats.running.length, delta: `${batches.length - stats.running.length} upcoming`, color: "var(--purple)" },
        { label: "Enrolled Students", value: stats.enrolledTotal, delta: `${stats.behind.length} falling behind`, color: "var(--blue)" },
        { label: "Sessions Today", value: stats.todaySessions.length, delta: nextSession ? `next: ${nextSession.date}` : "none scheduled", color: "var(--orange)" },
        { label: "Reviews Pending", value: stats.newSubs.length + stats.pendingSubs.length, delta: `${stats.newSubs.length} new submissions`, color: "var(--red)" },
        { label: "Open Doubts", value: stats.openDoubts.length, delta: "unanswered", color: "var(--amber)" },
      ]} />

      <div className="grid grid-cols-2 gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
        {/* Assigned courses */}
        <Card icon="📅" title="Assigned Courses" onOpen={() => onNavigate("batches")}>
          {batches.map((b) => (
            <div key={b.id} className="flex items-center gap-2 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[10px] font-bold truncate" style={{ color: "var(--text)" }}>{b.code}</div>
                <div className="text-[9.5px] truncate" style={{ color: "var(--text3)" }}>{b.course} · {b.enrolled} students</div>
              </div>
              <ProgressBar pct={b.progressPct} />
              <Pill value={b.status} />
            </div>
          ))}
          <StatPair label="Next session" value={batches.find((b) => b.status === "Running")?.nextSession || "—"} color="var(--orange)" />
        </Card>

        {/* Session management */}
        <Card icon="🎥" title="Session Management" onOpen={() => onNavigate("sessions")}>
          {stats.todaySessions.length > 0 ? stats.todaySessions.map((s) => (
            <div key={s.id} className="rounded p-2 mb-2" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>Today · {s.topic}</span>
                <Pill value={s.status} />
              </div>
              <div className="font-mono text-[9.5px] mt-1" style={{ color: "var(--text3)" }}>{s.batchCode} · {s.time}</div>
              <div className="font-mono text-[9.5px] truncate" style={{ color: "var(--blue)" }}>{s.link}</div>
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {s.materials.map((m, i) => (
                  <span key={i} className="font-mono text-[8.5px] px-1.5 py-0.5 rounded" style={{ background: "var(--blue-d)", color: "var(--blue)" }}>
                    📎 {m.kind}
                  </span>
                ))}
              </div>
            </div>
          )) : (
            <div className="font-mono text-[10px] py-2" style={{ color: "var(--text3)" }}>No session today.</div>
          )}
          <StatPair label="Upcoming sessions" value={sessions.filter((s) => s.status === "Scheduled").length} color="var(--blue)" />
          <StatPair label="Completed this month" value={sessions.filter((s) => s.status === "Completed").length} color="var(--green)" />
        </Card>

        {/* Student progress */}
        <Card icon="📈" title="Student Progress" onOpen={() => onNavigate("progress")}>
          <StatPair label="Active students" value={students.length} color="var(--blue)" />
          <StatPair label="Falling behind" value={stats.behind.length} color="var(--red)" />
          <StatPair label="Ready for next module" value={stats.ready.length} color="var(--green)" />
          <StatPair label="Needs re-attempt" value={stats.reattempt.length} color="var(--amber)" />
          {stats.behind.slice(0, 2).map((s) => (
            <div key={s.id} className="flex items-center justify-between mt-1.5 pt-1.5" style={{ borderTop: "1px solid var(--border)" }}>
              <span className="text-[10.5px] font-semibold" style={{ color: "var(--text)" }}>{s.name}</span>
              <Pill value={s.flag} />
            </div>
          ))}
        </Card>

        {/* Project review queue */}
        <Card icon="📦" title="Project Review Queue" onOpen={() => onNavigate("reviews")}>
          <StatPair label="New submissions" value={stats.newSubs.length} color="var(--purple)" />
          <StatPair label="Pending reviews" value={stats.pendingSubs.length} color="var(--amber)" />
          <StatPair label="Revisions requested" value={stats.revisionSubs.length} color="var(--red)" />
          <StatPair label="Approved" value={stats.approvedSubs.length} color="var(--green)" />
          {stats.newSubs.slice(0, 2).map((s) => (
            <div key={s.id} className="flex items-center justify-between mt-1.5 pt-1.5" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="min-w-0">
                <div className="text-[10.5px] font-semibold truncate" style={{ color: "var(--text)" }}>{s.project}</div>
                <div className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>{s.student} · {s.submittedAt}</div>
              </div>
              <Pill value={s.status} />
            </div>
          ))}
        </Card>

        {/* Doubt management */}
        <Card icon="❓" title="Doubt Management" onOpen={() => onNavigate("doubts")}>
          <StatPair label="Open / unanswered" value={stats.openDoubts.length} color="var(--red)" />
          <StatPair label="Total messages" value={doubts.length} color="var(--blue)" />
          <StatPair label="Answered" value={doubts.filter((d) => d.isAnswered).length} color="var(--green)" />
          {stats.openDoubts.slice(0, 3).map((d) => (
            <div key={d.id} className="flex items-center justify-between mt-1.5 pt-1.5 gap-2" style={{ borderTop: "1px solid var(--border)" }}>
              <span className="text-[10.5px] truncate flex-1" style={{ color: "var(--text)" }}>{d.body.slice(0, 60)}</span>
              <span className="font-mono text-[8px] px-1.5 py-0.5 rounded shrink-0" style={{ background: "var(--orange-d)", color: "var(--orange)" }}>
                {d.tag}
              </span>
            </div>
          ))}
        </Card>

        {/* Curriculum feedback */}
        <Card icon="📝" title="Curriculum Feedback" onOpen={() => onNavigate("feedback")}>
          <StatPair label="Outdated material flagged" value={feedback.filter((f) => f.kind === "Outdated Material").length} color="var(--red)" />
          <StatPair label="Confusing topics" value={feedback.filter((f) => f.kind === "Confusing Topic").length} color="var(--amber)" />
          <StatPair label="Content suggestions" value={feedback.filter((f) => f.kind === "Content Suggestion").length} color="var(--blue)" />
          <StatPair label="Drafts not yet submitted" value={feedback.filter((f) => f.status === "Draft").length} color="var(--purple)" />
        </Card>

      </div>
    </div>
  );
}
