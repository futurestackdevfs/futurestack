"use client";

import { useState, useEffect } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";

interface PendingTrainer {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  yearsExperience: number | null;
  createdAt: string;
}

interface Course {
  id: string | number;
  title?: string;
  name?: string;
  status?: string;
  price?: number;
  enrollments?: number;
  totalLessons?: number;
  category?: string;
  level?: string;
  instructor?: string;
}

interface Instructor {
  id: string;
  name: string;
  email: string;
  instId: string;
  specialization: string;
  rating: number;
  status: string;
}

interface PlatformStats {
  totalCourses: number;
  activeCourses: number;
  draftCourses: number;
  totalTracks: number;
  totalTrainers: number;
  pendingTrainers: number;
  totalStudents: number;
  totalEnrollments: number;
  activeEnrollments: number;
}

interface PaymentsSummary {
  total: number;
  created: number;
  paid: number;
  failed: number;
  cancelled: number;
  expired: number;
  totalRevenue: number;
}

interface TrainerShareRow {
  trainerId: string;
  trainerName: string;
  trainerEmail: string;
  trainerSharePercent: number | null;
  gross: number;
  platformCut: number;
  trainerShare: number;
  enrollments: number;
}

interface TrainerBreakdown {
  trainers: TrainerShareRow[];
  totals: { gross: number; platformCut: number; trainerShare: number; enrollments: number };
  count: number;
}

function PendingApprovalsPanel() {
  const [pending, setPending] = useState<PendingTrainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    opsFetch("/api/admin/trainers/pending")
      .then((r) => r.json())
      .then((data) => { if (!cancelled && Array.isArray(data)) setPending(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function decide(id: string, action: "approve" | "reject") {
    setActing(id);
    try {
      await opsFetch(`/api/admin/trainers/${id}/${action}`, {
        method: "POST",
        body: action === "reject" ? JSON.stringify({ reason: "Rejected by admin" }) : undefined,
      });
      setPending((prev) => prev.filter((t) => t.id !== id));
    } catch {}
    setActing(null);
  }

  if (loading) return null;
  if (pending.length === 0) return null;

  return (
    <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--amber)" }}>
      <div className="flex items-center justify-between px-2 py-1" style={{ background: "var(--amber-d)", borderBottom: "1px solid var(--amber)" }}>
        <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider" style={{ color: "var(--amber)" }}>
          ⏳ Pending Trainer Approvals
        </span>
        <span className="font-mono text-[8.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--amber)", color: "#fff" }}>
          {pending.length} pending
        </span>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {pending.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-3 py-2">
            <div>
              <div className="font-semibold text-[11px]" style={{ color: "var(--text)" }}>{t.name}</div>
              <div className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{t.email}</div>
              {t.bio && <div className="font-mono text-[9px] truncate max-w-[260px]" style={{ color: "var(--text3)" }}>{t.bio}</div>}
              <div className="font-mono text-[8.5px] mt-0.5" style={{ color: "var(--text3)" }}>
                {t.yearsExperience != null ? `${t.yearsExperience} yrs exp · ` : ""}Applied {t.createdAt?.slice(0, 10)}
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                disabled={acting === t.id}
                onClick={() => decide(t.id, "approve")}
                className="font-mono text-[8.5px] font-bold px-2.5 py-1 rounded cursor-pointer border-none"
                style={{ background: "var(--green)", color: "#fff", opacity: acting === t.id ? 0.6 : 1 }}
                onMouseEnter={(e) => { if (acting !== t.id) (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = acting === t.id ? "0.6" : "1"; }}
              >✓ Approve</button>
              <button
                disabled={acting === t.id}
                onClick={() => decide(t.id, "reject")}
                className="font-mono text-[8.5px] font-bold px-2.5 py-1 rounded cursor-pointer border-none"
                style={{ background: "var(--red)", color: "#fff", opacity: acting === t.id ? 0.6 : 1 }}
                onMouseEnter={(e) => { if (acting !== t.id) (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = acting === t.id ? "0.6" : "1"; }}
              >✕ Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  db: { [key: string]: any[] };
  stats: PlatformStats | null;
}

export default function AdminDashboardContent({ db, stats }: Props) {
  const courses = (db.courses || []) as Course[];
  const instructors = (db.instructors || []) as Instructor[];
  const [payments, setPayments] = useState<PaymentsSummary | null>(null);
  const [breakdown, setBreakdown] = useState<TrainerBreakdown | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      opsFetch("/api/admin/payments?perPage=1").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      opsFetch("/api/admin/payments/trainers").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([pay, brk]) => {
      if (cancelled) return;
      if (pay?.summary) setPayments(pay.summary);
      if (brk?.totals) setBreakdown(brk);
    });
    return () => { cancelled = true; };
  }, []);

  const formatMoney = (v: number) => `₹${(v ?? 0).toLocaleString("en-IN")}`;

  // ── Real backend totals (fall back to derived values when unavailable) ──
  const totalCourses = stats?.totalCourses ?? courses.length;
  const activeCourses = stats?.activeCourses ?? courses.filter((c) => c.status === "ACTIVE").length;
  const draftCourses = stats?.draftCourses ?? courses.filter((c) => c.status === "DRAFT").length;
  const archivedCourses = Math.max(0, totalCourses - activeCourses - draftCourses);
  const totalTracks = stats?.totalTracks ?? 0;
  const totalTrainers = stats?.totalTrainers ?? instructors.length;
  const pendingTrainers = stats?.pendingTrainers ?? 0;
  const totalStudents = stats?.totalStudents ?? 0;
  const totalEnrollments = stats?.totalEnrollments ?? courses.reduce((s, c) => s + (c.enrollments ?? 0), 0);
  const activeEnrollments = stats?.activeEnrollments ?? 0;

  // ── Derived from live course rows ──
  const lowContentCourses = courses.filter((c) => (c.totalLessons ?? 0) === 0 && c.status === "ACTIVE");
  const topCourses = [...courses]
    .sort((a, b) => (b.enrollments ?? 0) - (a.enrollments ?? 0))
    .slice(0, 5);

  const inReviewCount = stats?.pendingTrainers ?? 0;

  return (
    <div className="p-2.5 space-y-2">
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>⚙ Platform Admin</span>
          <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>role::lms_administrator · full platform control</span>
        </div>
      </div>

      <PendingApprovalsPanel />

      {/* ─── Platform Overview ─── */}
      <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-2 py-1" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
          <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>📊 Platform Overview</span>
          <span className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>Live · updated just now</span>
        </div>
        <div className="p-2">
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { label: "Total Students", value: String(totalStudents), delta: `${activeEnrollments} active enrollments`, color: "var(--blue)" },
              { label: "Total Courses", value: String(totalCourses), delta: `${activeCourses} active, ${draftCourses} draft`, color: "var(--orange)" },
              { label: "Total Enrollments", value: String(totalEnrollments), delta: `${activeEnrollments} active`, color: "var(--green)" },
              { label: "Approved Trainers", value: String(totalTrainers), delta: `${pendingTrainers} pending review`, color: "var(--purple)" },
              { label: "Learning Tracks", value: String(totalTracks), delta: "career paths", color: "var(--pink)" },
            ].map((s, i) => (
              <div key={i} className="px-2 py-1.5 rounded" style={{ background: "var(--panel)" }}>
                <div className="font-mono text-[7.5px] uppercase tracking-wider" style={{ color: "var(--text3)" }}>{s.label}</div>
                <div className="font-mono text-[19px] font-bold leading-none" style={{ color: s.color }}>{s.value}</div>
                <div className="font-mono text-[7.5px]" style={{ color: "var(--text3)" }}>{s.delta}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Two-column: Revenue & Catalog | Enrollment & Users ─── */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between px-2 py-1" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>💰 Sales & Revenue Split</span>
            <span className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{payments?.paid ?? breakdown?.totals.enrollments ?? 0} paid · {payments?.total ?? 0} orders</span>
          </div>
          <div className="p-2 space-y-1.5">
            {[
              { label: "Total Sales", value: formatMoney(payments?.totalRevenue ?? breakdown?.totals.gross ?? 0), badge: `${payments?.paid ?? 0} paid`, bc: "var(--green-d)", fc: "var(--green)" },
              { label: "Trainer Share", value: formatMoney(breakdown?.totals.trainerShare ?? 0), badge: `${breakdown?.totals.enrollments ?? 0} enrollments`, bc: "var(--purple-d)", fc: "var(--purple)" },
              { label: "Platform (Remaining)", value: formatMoney(breakdown?.totals.platformCut ?? 0), badge: "after trainer cut", bc: "var(--orange-d)", fc: "var(--orange)" },
              { label: "Active Courses", value: String(activeCourses), badge: `${draftCourses} draft`, bc: "var(--blue-d)", fc: "var(--blue)" },
              { label: "Approved Trainers", value: String(totalTrainers), badge: `${pendingTrainers} pending`, bc: "var(--amber-d)", fc: "var(--amber)" },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between px-2 py-1 rounded" style={{ background: "var(--panel)" }}>
                <div>
                  <div className="font-mono text-[8px] font-semibold" style={{ color: "var(--text3)" }}>{r.label}</div>
                  <div className="font-mono text-[13px] font-bold" style={{ color: "var(--text)" }}>{r.value}</div>
                </div>
                <span className="font-mono text-[7.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: r.bc, color: r.fc }}>{r.badge}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between px-2 py-1" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>📝 Enrollment & Users</span>
            <span className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>Platform health</span>
          </div>
          <div className="p-2 space-y-1.5">
            <div className="flex items-center justify-between px-2 py-1.5 rounded" style={{ background: "var(--panel)" }}>
              <div>
                <div className="font-mono text-[8px] font-semibold" style={{ color: "var(--text3)" }}>Active Enrollments</div>
                <div className="font-mono text-[19px] font-bold" style={{ color: "var(--orange)" }}>{activeEnrollments}</div>
              </div>
              <span className="font-mono text-[7.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--orange-d)", color: "var(--orange)" }}>{totalEnrollments} total</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 rounded" style={{ background: "var(--panel)" }}>
              <div>
                <div className="font-mono text-[8px] font-semibold" style={{ color: "var(--text3)" }}>Total Students</div>
                <div className="font-mono text-[15px] font-bold" style={{ color: "var(--green)" }}>{totalStudents}</div>
              </div>
              <span className="font-mono text-[7.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--green-d)", color: "var(--green)" }}>{totalStudents > 0 ? "Registered" : "None"}</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 rounded" style={{ background: "var(--panel)" }}>
              <div>
                <div className="font-mono text-[8px] font-semibold" style={{ color: "var(--text3)" }}>Courses in Review</div>
                <div className="font-mono text-[15px] font-bold" style={{ color: "var(--blue)" }}>{draftCourses}</div>
              </div>
              <span className="font-mono text-[7.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--blue-d)", color: "var(--blue)" }}>{draftCourses > 0 ? "Draft" : "None"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Two-column: Catalog Oversight | User & Role Management ─── */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between px-2 py-1" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>📚 Catalog Oversight</span>
            <span className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{lowContentCourses.length} flagged</span>
          </div>
          <div className="p-2 space-y-1.5">
            <div className="grid grid-cols-3 gap-1.5">
              <div className="px-2 py-1.5 rounded text-center" style={{ background: "var(--panel)" }}>
                <div className="font-mono text-[7.5px] uppercase" style={{ color: "var(--text3)" }}>Active</div>
                <div className="font-mono text-[17px] font-bold" style={{ color: "var(--green)" }}>{activeCourses}</div>
              </div>
              <div className="px-2 py-1.5 rounded text-center" style={{ background: "var(--panel)" }}>
                <div className="font-mono text-[7.5px] uppercase" style={{ color: "var(--text3)" }}>Draft</div>
                <div className="font-mono text-[17px] font-bold" style={{ color: "var(--blue)" }}>{draftCourses}</div>
              </div>
              <div className="px-2 py-1.5 rounded text-center" style={{ background: "var(--panel)" }}>
                <div className="font-mono text-[7.5px] uppercase" style={{ color: "var(--text3)" }}>Archived</div>
                <div className="font-mono text-[17px] font-bold" style={{ color: "var(--purple)" }}>{archivedCourses}</div>
              </div>
            </div>
            <div className="flex items-center justify-between px-2 py-1 rounded" style={{ background: "var(--panel)" }}>
              <div>
                <div className="font-mono text-[8px] font-semibold" style={{ color: "var(--text3)" }}>Low Content (ACTIVE)</div>
                <div className="font-mono text-[15px] font-bold" style={{ color: "var(--red)" }}>{lowContentCourses.length}</div>
              </div>
              <button className="font-mono text-[8px] font-semibold px-2 py-1 rounded cursor-pointer"
                style={{ background: "var(--red-d)", color: "var(--red)", border: "1px solid rgba(200,30,58,.25)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--red)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--red-d)"; (e.currentTarget as HTMLElement).style.color = "var(--red)"; }}
              >Flagged</button>
            </div>
            {lowContentCourses.slice(0, 2).map((c) => (
              <div key={String(c.id)} className="text-[9.5px] px-2 py-0.5 font-mono" style={{ color: "var(--text3)" }}>
                • <strong style={{ color: "var(--text)" }}>{c.title || c.name}</strong> — No lessons added yet
              </div>
            ))}
            {inReviewCount > 0 && (
              <div className="text-[9.5px] px-2 py-0.5 font-mono" style={{ color: "var(--text3)" }}>
                • <strong style={{ color: "var(--text)" }}>{inReviewCount}</strong> trainers awaiting approval
              </div>
            )}
            {lowContentCourses.length === 0 && inReviewCount === 0 && (
              <div className="text-[9.5px] px-2 py-0.5 font-mono" style={{ color: "var(--text3)" }}>No issues flagged</div>
            )}
          </div>
        </div>

        <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between px-2 py-1" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>👥 User & Role Management</span>
          </div>
          <div className="p-2">
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { role: "Approved Trainers", count: String(totalTrainers), color: "var(--purple)", bg: "var(--purple-d)" },
                { role: "Pending Review", count: String(pendingTrainers), color: "var(--amber)", bg: "var(--amber-d)" },
                { role: "Total Students", count: String(totalStudents), color: "var(--blue)", bg: "var(--blue-d)" },
                { role: "Active Courses", count: String(activeCourses), color: "var(--orange)", bg: "var(--orange-d)" },
                { role: "Draft Courses", count: String(draftCourses), color: "var(--green)", bg: "var(--green-d)" },
                { role: "Career Tracks", count: String(totalTracks), color: "var(--pink)", bg: "var(--pink-d)" },
              ].map((u, i) => (
                <div key={i} className="px-2 py-1.5 rounded flex items-center justify-between" style={{ background: "var(--panel)" }}>
                  <div>
                    <div className="font-mono text-[7.5px] uppercase" style={{ color: "var(--text3)" }}>{u.role}</div>
                    <div className="font-mono text-[14px] font-bold" style={{ color: "var(--text)" }}>{u.count}</div>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: u.color }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Reports & Analytics ─── */}
      <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-2 py-1" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
          <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>📊 Reports & Analytics</span>
          <span className="font-mono text-[7.5px]" style={{ color: "var(--text3)" }}>live data</span>
        </div>
        <div className="p-2">
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: "Total Courses", value: String(totalCourses), sub: `${activeCourses} active, ${draftCourses} draft, ${archivedCourses} archived`, icon: "📚", color: "var(--orange)" },
              { label: "Career Tracks", value: String(totalTracks), sub: "configured", icon: "🧭", color: "var(--blue)" },
              { label: "Approved Trainers", value: String(totalTrainers), sub: `${pendingTrainers} pending review`, icon: "🎓", color: "var(--purple)" },
              { label: "Total Students", value: String(totalStudents), sub: `${activeEnrollments} active enrollments`, icon: "🎒", color: "var(--green)" },
              { label: "Total Enrollments", value: String(totalEnrollments), sub: `${activeEnrollments} active`, icon: "📈", color: "var(--amber)" },
              { label: "Total Sales", value: formatMoney(payments?.totalRevenue ?? 0), sub: `${payments?.paid ?? 0} paid orders`, icon: "💰", color: "var(--pink)" },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ background: "var(--panel)" }}>
                <span style={{ fontSize: 16 }}>{r.icon}</span>
                <div>
                  <div className="font-mono text-[8px] font-semibold" style={{ color: "var(--text3)" }}>{r.label}</div>
                  <div className="font-mono text-[14px] font-bold" style={{ color: r.color }}>{r.value}</div>
                  <div className="font-mono text-[7.5px]" style={{ color: "var(--text3)" }}>{r.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {topCourses.length > 0 && (
            <div className="mt-2">
              <div className="font-mono text-[9px] font-bold uppercase tracking-wider px-1 py-1.5" style={{ color: "var(--text3)" }}>🏆 Top Courses by Enrollment</div>
              {topCourses.map((c, i) => (
                <div key={String(c.id)} className="flex items-center gap-2 px-2 py-1 rounded" style={{ background: "var(--panel)" }}>
                  <span className="font-mono text-[9px] font-bold w-3" style={{ color: "var(--text3)" }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[10px] font-semibold truncate" style={{ color: "var(--text)" }}>{c.title || c.name}</div>
                    <div className="font-mono text-[8px]" style={{ color: "var(--text3)" }}>{c.category || "—"} · {c.level || "—"}</div>
                  </div>
                  <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--blue-d)", color: "var(--blue)" }}>{c.enrollments ?? 0} students</span>
                </div>
              ))}
            </div>
          )}

          {breakdown && breakdown.trainers.length > 0 && (
            <div className="mt-2">
              <div className="font-mono text-[9px] font-bold uppercase tracking-wider px-1 py-1.5" style={{ color: "var(--text3)" }}>
                🎓 Trainer Revenue Split (per trainer)
              </div>
              {breakdown.trainers.slice(0, 8).map((t) => (
                <div key={t.trainerId} className="flex items-center gap-2 px-2 py-1 rounded" style={{ background: "var(--panel)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[10px] font-semibold truncate" style={{ color: "var(--text)" }}>{t.trainerName}</div>
                    <div className="font-mono text-[8px]" style={{ color: "var(--text3)" }}>{t.enrollments} enrollments · {t.trainerSharePercent != null ? `${t.trainerSharePercent}% share` : "global share"}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[8px] px-1.5 py-0.5 rounded" style={{ background: "var(--purple-d)", color: "var(--purple)" }}>{formatMoney(t.trainerShare)}</span>
                    <span className="font-mono text-[8px] px-1.5 py-0.5 rounded" style={{ background: "var(--orange-d)", color: "var(--orange)" }}>{formatMoney(t.platformCut)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
