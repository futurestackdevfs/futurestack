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
}

export default function AdminDashboardContent({ db }: Props) {
  const courses = db.courses || [];
  const batches = db.batches || [];
  const instructors = db.instructors || [];
  const feeplans = db.feeplans || [];
  const departments = db.departments || [];

  const totalCourses = courses.length;
  const draftCourses = courses.filter((c: any) => c.status === "Draft").length;
  const activeCourses = courses.filter((c: any) => c.status === "Active").length;

  const totalBatches = batches.length;
  const runningBatches = batches.filter((b: any) => b.status === "Running").length;
  const upcomingBatches = batches.filter((b: any) => b.status === "Upcoming").length;
  const completedBatches = batches.filter((b: any) => b.status === "Completed").length;
  const totalEnrolled = batches.reduce((s: number, b: any) => s + (b.enrolled || 0), 0);
  const totalSeats = batches.reduce((s: number, b: any) => s + (b.seats || 0), 0);
  const avgBatchSize = totalBatches > 0 ? Math.round(totalEnrolled / totalBatches) : 0;

  const activeInstructors = instructors.filter((i: any) => i.status === "Active").length;
  const instructorsOnLeave = instructors.filter((i: any) => i.status === "On Leave").length;
  const totalInstructors = instructors.length;

  const activeFeePlans = feeplans.filter((f: any) => f.status === "Active").length;
  const totalRevenue = feeplans.reduce((s: number, f: any) => s + (f.baseFee || 0), 0);

  const totalDeptHeadcount = departments.reduce((s: number, d: any) => s + (d.headcount || 0), 0);
  const activeDepts = departments.filter((d: any) => d.status === "Active").length;

  const lowEnrollBatches = batches.filter((b: any) => b.enrolled < Math.ceil(b.seats * 0.7));
  const instructorsOnLeaveList = instructors.filter((i: any) => i.status === "On Leave");

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
          <span className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>Updated just now</span>
        </div>
        <div className="p-2">
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { label: "Total Students", value: String(totalEnrolled), delta: `across ${totalBatches} batches`, color: "var(--blue)" },
              { label: "Active Batches", value: String(runningBatches), delta: `of ${totalBatches} total`, color: "var(--green)" },
              { label: "Active Trainers", value: String(activeInstructors), delta: `${instructorsOnLeave} on leave`, color: "var(--purple)" },
              { label: "Total Courses", value: String(totalCourses), delta: `${draftCourses} draft`, color: "var(--orange)" },
              { label: "New Enrollments", value: String(totalEnrolled), delta: "across all batches", color: "var(--pink)" },
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

      {/* ─── Two-column: Revenue & Finance | Enrollment Control ─── */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between px-2 py-1" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>💰 Revenue & Finance</span>
            <span className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{activeFeePlans} active plans</span>
          </div>
          <div className="p-2 space-y-1.5">
            {[
              { label: "Total Base Revenue", value: `₹${totalRevenue.toLocaleString("en-IN")}`, badge: `${activeFeePlans} plans`, bc: "var(--green-d)", fc: "var(--green)" },
              { label: "Total Enrollments", value: String(totalEnrolled), badge: `${totalSeats} seats available`, bc: "var(--blue-d)", fc: "var(--blue)" },
              { label: "Active Courses", value: String(activeCourses), badge: `${draftCourses} draft`, bc: "var(--orange-d)", fc: "var(--orange)" },
              { label: "Active Instructors", value: String(activeInstructors), badge: `${instructorsOnLeave} on leave`, bc: "var(--purple-d)", fc: "var(--purple)" },
              { label: "Active Departments", value: String(activeDepts), badge: `${totalDeptHeadcount} staff`, bc: "var(--amber-d)", fc: "var(--amber)" },
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
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>📝 Enrollment Control</span>
            <span className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>Batch status</span>
          </div>
          <div className="p-2 space-y-1.5">
            <div className="flex items-center justify-between px-2 py-1.5 rounded" style={{ background: "var(--panel)" }}>
              <div>
                <div className="font-mono text-[8px] font-semibold" style={{ color: "var(--text3)" }}>Running Batches</div>
                <div className="font-mono text-[19px] font-bold" style={{ color: "var(--orange)" }}>{runningBatches}</div>
              </div>
              <button className="font-mono text-[8px] font-semibold px-2 py-1 rounded cursor-pointer"
                style={{ background: "var(--orange)", color: "#fff", border: "none" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
              >View</button>
            </div>
            <div className="flex items-center justify-between px-2 py-1 rounded" style={{ background: "var(--panel)" }}>
              <div>
                <div className="font-mono text-[8px] font-semibold" style={{ color: "var(--text3)" }}>Upcoming Batches</div>
                <div className="font-mono text-[15px] font-bold" style={{ color: "var(--green)" }}>{upcomingBatches}</div>
              </div>
              <span className="font-mono text-[7.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--green-d)", color: "var(--green)" }}>{upcomingBatches > 0 ? "Scheduled" : "None"}</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 rounded" style={{ background: "var(--panel)" }}>
              <div>
                <div className="font-mono text-[8px] font-semibold" style={{ color: "var(--text3)" }}>Completed Batches</div>
                <div className="font-mono text-[15px] font-bold" style={{ color: "var(--blue)" }}>{completedBatches}</div>
              </div>
              <span className="font-mono text-[7.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--blue-d)", color: "var(--blue)" }}>Finished</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Two-column: Batch Oversight | User & Role Management ─── */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between px-2 py-1" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>📅 Batch Oversight</span>
            <span className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{lowEnrollBatches.length} flagged</span>
          </div>
          <div className="p-2 space-y-1.5">
            <div className="grid grid-cols-3 gap-1.5">
              <div className="px-2 py-1.5 rounded text-center" style={{ background: "var(--panel)" }}>
                <div className="font-mono text-[7.5px] uppercase" style={{ color: "var(--text3)" }}>Running</div>
                <div className="font-mono text-[17px] font-bold" style={{ color: "var(--green)" }}>{runningBatches}</div>
              </div>
              <div className="px-2 py-1.5 rounded text-center" style={{ background: "var(--panel)" }}>
                <div className="font-mono text-[7.5px] uppercase" style={{ color: "var(--text3)" }}>Upcoming</div>
                <div className="font-mono text-[17px] font-bold" style={{ color: "var(--blue)" }}>{upcomingBatches}</div>
              </div>
              <div className="px-2 py-1.5 rounded text-center" style={{ background: "var(--panel)" }}>
                <div className="font-mono text-[7.5px] uppercase" style={{ color: "var(--text3)" }}>Avg Size</div>
                <div className="font-mono text-[17px] font-bold" style={{ color: "var(--purple)" }}>{avgBatchSize}</div>
              </div>
            </div>
            <div className="flex items-center justify-between px-2 py-1 rounded" style={{ background: "var(--panel)" }}>
              <div>
                <div className="font-mono text-[8px] font-semibold" style={{ color: "var(--text3)" }}>Low Enrollment</div>
                <div className="font-mono text-[15px] font-bold" style={{ color: "var(--red)" }}>{lowEnrollBatches.length}</div>
              </div>
              <button className="font-mono text-[8px] font-semibold px-2 py-1 rounded cursor-pointer"
                style={{ background: "var(--red-d)", color: "var(--red)", border: "1px solid rgba(200,30,58,.25)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--red)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--red-d)"; (e.currentTarget as HTMLElement).style.color = "var(--red)"; }}
              >Flagged</button>
            </div>
            {lowEnrollBatches.slice(0, 2).map((b: any) => (
              <div key={b.code} className="text-[9.5px] px-2 py-0.5 font-mono" style={{ color: "var(--text3)" }}>
                • <strong style={{ color: "var(--text)" }}>{b.code}</strong> — Low enrollment ({b.enrolled}/{b.seats})
              </div>
            ))}
            {instructorsOnLeaveList.slice(0, 1).map((i: any) => (
              <div key={i.instId} className="text-[9.5px] px-2 py-0.5 font-mono" style={{ color: "var(--text3)" }}>
                • <strong style={{ color: "var(--text)" }}>{i.instId}</strong> — {i.name} on leave
              </div>
            ))}
            {lowEnrollBatches.length === 0 && instructorsOnLeaveList.length === 0 && (
              <div className="text-[9.5px] px-2 py-0.5 font-mono" style={{ color: "var(--text3)" }}>No issues flagged</div>
            )}
          </div>
        </div>

        <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between px-2 py-1" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>👥 User & Role Management</span>
            <button className="font-mono text-[7.5px] font-semibold px-1.5 py-0.5 rounded cursor-pointer" style={{ border: "1px solid var(--border)", color: "var(--blue)", background: "var(--surface)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--blue)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
            >+ Add User</button>
          </div>
          <div className="p-2">
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { role: "Instructors", count: String(totalInstructors), color: "var(--purple)", bg: "var(--purple-d)" },
                { role: "Active", count: String(activeInstructors), color: "var(--green)", bg: "var(--green-d)" },
                { role: "On Leave", count: String(instructorsOnLeave), color: "var(--red)", bg: "var(--red-d)" },
                { role: "Active Courses", count: String(activeCourses), color: "var(--orange)", bg: "var(--orange-d)" },
                { role: "Students", count: String(totalEnrolled), color: "var(--blue)", bg: "var(--blue-d)" },
                { role: "Departments", count: String(activeDepts), color: "var(--pink)", bg: "var(--pink-d)" },
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
          <button className="font-mono text-[7.5px] font-semibold px-1.5 py-0.5 rounded cursor-pointer" style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
          >View All →</button>
        </div>
        <div className="p-2">
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: "Total Courses", value: String(totalCourses), sub: `${activeCourses} active, ${draftCourses} draft`, icon: "📚", color: "var(--orange)" },
              { label: "Total Batches", value: String(totalBatches), sub: `${runningBatches} running, ${upcomingBatches} upcoming, ${completedBatches} completed`, icon: "📅", color: "var(--blue)" },
              { label: "Total Instructors", value: String(totalInstructors), sub: `${activeInstructors} active, ${instructorsOnLeave} on leave`, icon: "🎓", color: "var(--purple)" },
              { label: "Total Enrollments", value: String(totalEnrolled), sub: `avg ${avgBatchSize}/batch`, icon: "📈", color: "var(--green)" },
              { label: "Revenue Potential", value: `₹${totalRevenue.toLocaleString("en-IN")}`, sub: `${activeFeePlans} fee plans`, icon: "💰", color: "var(--amber)" },
              { label: "Departments", value: String(activeDepts), sub: `${totalDeptHeadcount} total staff`, icon: "🏢", color: "var(--pink)" },
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
        </div>
      </div>

    </div>
  );
}
