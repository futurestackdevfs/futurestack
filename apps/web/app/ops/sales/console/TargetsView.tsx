"use client";

import { useState, useEffect, useCallback } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";

interface Target {
  id: string;
  salespersonName: string;
  salespersonId: string;
  courseName: string;
  courseId: string | null;
  period: string;
  targetAmount: number;
  currentAmount: number;
  remaining: number;
  progressPct: number;
  expectedPct: number;
  isOnTrack: boolean;
  isCompleted: boolean;
  isActive: boolean;
  isOverdue: boolean;
  isUpcoming: boolean;
  daysLeft: number;
  daysElapsed: number;
  totalDays: number;
  startDate: string;
  endDate: string;
}

interface TargetSummary {
  totalTargets: number;
  activeCount: number;
  completedCount: number;
  overdueCount: number;
  upcomingCount: number;
  totalTarget: number;
  totalAchieved: number;
  totalRemaining: number;
  overallProgressPct: number;
}

interface Props {
  refreshSignal?: number;
  userRole?: string;
}

export default function TargetsView({ refreshSignal, userRole }: Props) {
  const isAdmin = userRole === "ADMIN" || userRole === "COORDINATOR";
  const [targets, setTargets] = useState<Target[]>([]);
  const [summary, setSummary] = useState<TargetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    salespersonId: "", courseId: "", period: "monthly",
    targetAmount: "", startDate: "", endDate: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    try {
      const [t, c, s] = await Promise.all([
        opsFetch("/api/sales-targets").then((r) => r.ok ? r.json() : { targets: [], summary: null }),
        opsFetch("/api/sales/courses").then((r) => r.ok ? r.json() : []),
        isAdmin ? opsFetch("/api/admin/users").then((r) => r.ok ? r.json() : []) : Promise.resolve([]),
      ]);
      setTargets(t.targets ?? []);
      setSummary(t.summary ?? null);
      setCourses(c.map((c: any) => ({ id: c.id, title: c.title })));
      setStaff(s.filter((u: any) => u.role === "SALES").map((u: any) => ({ id: u.id, name: u.name })));
    } catch {} finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => { fetchTargets(); }, [fetchTargets, refreshSignal]);

  async function handleCreate() {
    if (!form.salespersonId || !form.targetAmount || !form.startDate || !form.endDate) return;
    setSaving(true);
    try {
      const res = await opsFetch("/api/sales-targets", {
        method: "POST",
        body: JSON.stringify({
          salespersonId: form.salespersonId,
          courseId: form.courseId || undefined,
          period: form.period,
          targetAmount: parseFloat(form.targetAmount),
          startDate: form.startDate,
          endDate: form.endDate,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setForm({ salespersonId: "", courseId: "", period: "monthly", targetAmount: "", startDate: "", endDate: "" });
        fetchTargets();
      }
    } catch {} finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this target?")) return;
    const res = await opsFetch(`/api/sales-targets/${id}`, { method: "DELETE" });
    if (res.ok) fetchTargets();
  }

  async function handleRefresh() {
    await opsFetch("/api/sales-targets/refresh", { method: "POST" });
    fetchTargets();
  }

  function progressColor(pct: number) {
    if (pct >= 100) return "var(--green)";
    if (pct >= 60) return "var(--orange)";
    return "var(--red)";
  }

  function statusBadge(t: Target) {
    if (t.isCompleted) return { label: "Completed", fg: "var(--green)", bg: "var(--green-d)" };
    if (t.isOverdue) return { label: "Overdue", fg: "var(--red)", bg: "var(--red-d)" };
    if (t.isUpcoming) return { label: "Upcoming", fg: "var(--blue)", bg: "var(--blue-d)" };
    if (t.isOnTrack) return { label: "On Track", fg: "var(--green)", bg: "var(--green-d)" };
    return { label: "Behind", fg: "var(--orange)", bg: "var(--orange-d)" };
  }

  return (
    <div className="p-4 pb-7">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>🎯 Sales Targets</span>
          <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>{targets.length} targets</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh}
            className="font-mono text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer"
            style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}>
            ↻ Refresh
          </button>
          {isAdmin && (
            <button onClick={() => setShowCreate(!showCreate)}
              className="font-mono text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer"
              style={{ background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }}>
              + New Target
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-4">
          {[
            { label: "Total Target", value: `₹${(summary.totalTarget / 1000).toFixed(0)}K`, sub: `${summary.totalTargets} targets`, color: "var(--text)" },
            { label: "Achieved", value: `₹${(summary.totalAchieved / 1000).toFixed(0)}K`, sub: `${summary.overallProgressPct}% done`, color: "var(--green)" },
            { label: "Remaining", value: `₹${(summary.totalRemaining / 1000).toFixed(0)}K`, sub: `${100 - summary.overallProgressPct}% left`, color: "var(--orange)" },
            { label: "Active", value: String(summary.activeCount), sub: "in progress", color: "var(--blue)" },
            { label: "Overdue", value: String(summary.overdueCount), sub: `${summary.completedCount} completed`, color: summary.overdueCount > 0 ? "var(--red)" : "var(--text3)" },
          ].map((kpi, i) => (
            <div key={i} className="rounded-lg px-3.5 py-2.5 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="font-mono text-[8.5px] uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>{kpi.label}</div>
              <div className="font-mono text-[18px] font-bold leading-none" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="font-mono text-[8.5px] mt-0.5" style={{ color: "var(--text3)" }}>{kpi.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Create Form */}
      {showCreate && isAdmin && (
        <div className="rounded-lg p-4 mb-4 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="font-mono text-[9px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text3)" }}>Salesperson *</label>
              <select value={form.salespersonId} onChange={(e) => setForm({ ...form, salespersonId: e.target.value })}
                className="w-full font-mono text-[11px] px-2.5 py-1.5 rounded outline-none"
                style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}>
                <option value="">Select staff</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="font-mono text-[9px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text3)" }}>Course (optional)</label>
              <select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                className="w-full font-mono text-[11px] px-2.5 py-1.5 rounded outline-none"
                style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}>
                <option value="">All courses</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="font-mono text-[9px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text3)" }}>Period</label>
              <select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}
                className="w-full font-mono text-[11px] px-2.5 py-1.5 rounded outline-none"
                style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="font-mono text-[9px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text3)" }}>Target (₹) *</label>
              <input type="number" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                className="w-full font-mono text-[11px] px-2.5 py-1.5 rounded outline-none"
                style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}
                placeholder="e.g. 500000" />
            </div>
            <div>
              <label className="font-mono text-[9px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text3)" }}>Start Date *</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full font-mono text-[11px] px-2.5 py-1.5 rounded outline-none"
                style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }} />
            </div>
            <div>
              <label className="font-mono text-[9px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text3)" }}>End Date *</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full font-mono text-[11px] px-2.5 py-1.5 rounded outline-none"
                style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)}
              className="font-mono text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer"
              style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text3)" }}>Cancel</button>
            <button onClick={handleCreate} disabled={saving}
              className="font-mono text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer disabled:opacity-50"
              style={{ background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }}>
              {saving ? "…" : "Create Target"}
            </button>
          </div>
        </div>
      )}

      {/* Targets Table */}
      <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-3 py-2" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>📊 All Targets</span>
          <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{targets.length} targets</span>
        </div>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr>{["Salesperson", "Course", "Status", "Target", "Achieved", "Remaining", "Progress", "Expected", "Days Left", "Period", ...(isAdmin ? ["Actions"] : [])].map((h) => (
              <th key={h} className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5"
                style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="px-2.5 py-4 text-center font-mono text-[10px]" style={{ color: "var(--text3)" }}>Loading…</td></tr>
            ) : targets.length === 0 ? (
              <tr><td colSpan={11} className="px-2.5 py-4 text-center font-mono text-[10px]" style={{ color: "var(--text3)" }}>No targets set</td></tr>
            ) : targets.map((t, idx) => {
              const badge = statusBadge(t);
              return (
              <tr key={t.id}
                style={{ background: idx % 2 === 0 ? "var(--surface)" : "var(--panel)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-h)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? "var(--surface)" : "var(--panel)"; }}
              >
                <td className="px-2.5 py-1.5 font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{t.salespersonName}</td>
                <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: "var(--blue)", borderBottom: "1px solid var(--border)" }}>{t.courseName}</td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: badge.bg, color: badge.fg }}>{badge.label}</span>
                </td>
                <td className="px-2.5 py-1.5 font-mono font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>₹{t.targetAmount.toLocaleString()}</td>
                <td className="px-2.5 py-1.5 font-mono font-bold" style={{ color: "var(--green)", borderBottom: "1px solid var(--border)" }}>₹{t.currentAmount.toLocaleString()}</td>
                <td className="px-2.5 py-1.5 font-mono" style={{ color: t.remaining > 0 ? "var(--orange)" : "var(--green)", borderBottom: "1px solid var(--border)" }}>₹{t.remaining.toLocaleString()}</td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${t.progressPct}%`, background: progressColor(t.progressPct) }} />
                    </div>
                    <span className="font-mono text-[9px] font-bold" style={{ color: progressColor(t.progressPct) }}>{t.progressPct}%</span>
                  </div>
                </td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-1">
                    <div className="w-10 h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-full" style={{ width: `${t.expectedPct}%`, background: "var(--text3)" }} />
                    </div>
                    <span className="font-mono text-[8px]" style={{ color: "var(--text3)" }}>{t.expectedPct}%</span>
                  </div>
                </td>
                <td className="px-2.5 py-1.5 font-mono text-[9px]" style={{ color: t.daysLeft < 7 ? "var(--red)" : "var(--text3)", borderBottom: "1px solid var(--border)" }}>
                  {t.isCompleted ? "—" : t.isUpcoming ? `starts in ${Math.ceil((new Date(t.startDate).getTime() - Date.now()) / 86400000)}d` : `${t.daysLeft}d`}
                </td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                    style={{ background: "var(--purple-d)", color: "var(--purple)" }}>{t.period}</span>
                </td>
                {isAdmin && (
                  <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                    <button onClick={() => handleDelete(t.id)}
                      className="font-mono text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer"
                      style={{ border: "1px solid var(--red)", color: "var(--red)", background: "transparent" }}>✕</button>
                  </td>
                )}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
