"use client";

import { useMemo, useState } from "react";
import type { TrainerBatch, TrainerStudent } from "../lib/data";
import type { ProjectSubmission, RevenueEnrollment, PayoutRecord } from "../lib/data";

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
  students: TrainerStudent[];
  submissions: ProjectSubmission[];
  doubts: DiscussionMessage[];
  enrollments: RevenueEnrollment[];
  payouts: PayoutRecord[];
  reviews: { id: string; rating: number; studentName: string; courseTitle: string }[];
  onNavigate: (view: string) => void;
  sharePct?: number;
  profileComplete?: boolean;
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
  userName, batches, students, submissions, doubts, enrollments, payouts, reviews, onNavigate, sharePct = 50, profileComplete = true,
}: DashboardHomeProps) {
  const [showFlagInfo, setShowFlagInfo] = useState(false);

  const stats = useMemo(() => {
    const running = batches.filter((b) => b.status === "Running");
    const enrolledTotal = batches.reduce((s, b) => s + b.enrolled, 0);
    const behind = students.filter((s) => s.flag === "Falling Behind");
    const ready = students.filter((s) => s.flag === "Ready for Next Module");
    const reattempt = students.filter((s) => s.flag === "Needs Re-attempt");
    const newSubs = submissions.filter((s) => s.status === "New");
    const pendingSubs = submissions.filter((s) => s.status === "Pending Review");
    const revisionSubs = submissions.filter((s) => s.status === "Revision Requested");
    const approvedSubs = submissions.filter((s) => s.status === "Approved");
    const openDoubts = doubts.filter((d) => !d.isAnswered);
    const totalReviews = reviews.length;
    const uniqueReviewers = new Set(reviews.map((r) => r.studentName)).size;
    const avgRating = totalReviews > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1)
      : "—";
    const collected = enrollments.reduce((s, e) => {
      if (e.paymentMode === "Full") return s + e.courseFee;
      if (e.paymentMode === "EMI") return s + Math.round(e.courseFee * 0.5);
      return s;
    }, 0);
    const myShare = Math.round(collected * (sharePct / 100));
    const paidOut = payouts.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0);
    return {
      running, enrolledTotal, behind, ready, reattempt,
      newSubs, pendingSubs, revisionSubs, approvedSubs,
      openDoubts, totalReviews, uniqueReviewers, avgRating,
      collected, myShare, paidOut, pendingPayout: myShare - paidOut,
    };
  }, [batches, students, submissions, doubts, enrollments, payouts, reviews]);

  return (
    <div className="p-4 pb-7">
      <ViewHeader icon="🎓" title={`Welcome back, ${userName.split(" ")[0]}`} meta={`role::trainer · ${batches.length} courses · ${stats.enrolledTotal} students`} />

      {!profileComplete && (
        <div className="mb-4 px-4 py-3 rounded-lg flex items-center gap-3" style={{ background: "linear-gradient(135deg, var(--amber-d), var(--orange-d))", border: "1px solid var(--amber)" }}>
          <span className="text-[20px]">⚠️</span>
          <div className="flex-1">
            <div className="text-[12px] font-bold" style={{ color: "var(--amber)" }}>Complete your profile to start adding courses</div>
            <div className="text-[10.5px]" style={{ color: "var(--text3)" }}>Please fill in at least 5 of your profile fields (phone, DOB, city, qualification, etc.) to unlock course management.</div>
          </div>
          <button
            onClick={() => onNavigate("profile")}
            className="shrink-0 px-3 py-1.5 rounded text-[10px] font-bold cursor-pointer"
            style={{ background: "var(--amber)", color: "#fff", border: "none" }}
          >Complete Profile →</button>
        </div>
      )}

      <KpiRow items={[
        { label: "Active Courses", value: stats.running.length, delta: `${batches.length - stats.running.length} upcoming`, color: "var(--purple)" },
        { label: "Enrolled Students", value: stats.enrolledTotal, delta: `${stats.behind.length} falling behind`, color: "var(--blue)" },
        { label: "Total Reviews", value: stats.totalReviews, delta: `by ${stats.uniqueReviewers} students`, color: "var(--green)" },
        { label: "Open Doubts", value: stats.openDoubts.length, delta: "unanswered", color: "var(--amber)" },
      ]} />

      <div className="grid grid-cols-2 gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
        {/* Assigned courses */}
        <Card icon="📅" title="Assigned Courses" onOpen={() => onNavigate("batches")}>
          {batches.slice(0, 5).map((b) => (
            <div key={b.id} className="flex items-center gap-2 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[10px] font-bold truncate" style={{ color: "var(--text)" }}>{b.code}</div>
                <div className="text-[9.5px] truncate" style={{ color: "var(--text3)" }}>{b.course}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] font-mono font-bold" style={{ color: "var(--blue)" }}>{b.enrolled} students</div>
                {b.lastUpdated && <div className="text-[8.5px] font-mono" style={{ color: "var(--text3)" }}>updated {b.lastUpdated}</div>}
              </div>
            </div>
          ))}
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
          <button
            onClick={() => setShowFlagInfo(true)}
            className="mt-2 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold cursor-pointer"
            style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text3)" }}
            title="What do these flags mean?"
          >i</button>
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

        {/* Trainer reviews */}
        <Card icon="⭐" title="Trainer Reviews" onOpen={() => onNavigate("ratings")}>
          <div className="flex items-center gap-3 mb-2 pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="font-mono text-[22px] font-extrabold" style={{ color: "var(--text)" }}>{stats.avgRating}</span>
            <div>
              <div className="text-[10px]" style={{ color: "var(--text3)" }}>{stats.totalReviews} reviews · {stats.uniqueReviewers} students</div>
            </div>
          </div>
          {reviews.slice(0, 2).map((r) => (
            <div key={r.id} className="py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold" style={{ color: "var(--text)" }}>{r.studentName}</span>
                <span className="font-mono text-[9px] font-bold" style={{ color: "var(--amber)" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
              </div>
              <div className="text-[9px] truncate" style={{ color: "var(--text3)" }}>{r.courseTitle}</div>
            </div>
          ))}
          {reviews.length === 0 && (
            <div className="font-mono text-[10px] py-2" style={{ color: "var(--text3)" }}>No reviews yet</div>
          )}
        </Card>

      </div>

      {/* Flag Info Popup */}
      {showFlagInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowFlagInfo(false)}>
          <div className="rounded-lg p-4 max-w-xs w-full mx-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[11px] font-bold" style={{ color: "var(--text)" }}>Student Flags</span>
              <button onClick={() => setShowFlagInfo(false)} className="text-[12px] cursor-pointer" style={{ color: "var(--text3)" }}>✕</button>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded shrink-0" style={{ background: "var(--red-d)", color: "var(--red)" }}>Falling Behind</span>
                <span className="text-[10px]" style={{ color: "var(--text3)" }}>Progress less than 30%</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded shrink-0" style={{ background: "var(--green-d)", color: "var(--green)" }}>Ready for Next Module</span>
                <span className="text-[10px]" style={{ color: "var(--text3)" }}>Progress ≥ 70% and 70%+ modules done</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded shrink-0" style={{ background: "var(--blue-d)", color: "var(--blue)" }}>On Track</span>
                <span className="text-[10px]" style={{ color: "var(--text3)" }}>Progress between 30% – 69%</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded shrink-0" style={{ background: "var(--amber-d)", color: "var(--amber)" }}>Needs Re-attempt</span>
                <span className="text-[10px]" style={{ color: "var(--text3)" }}>Flagged by trainer for module re-attempt</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
