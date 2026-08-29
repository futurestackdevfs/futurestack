"use client";

import { useState, useEffect, useCallback } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";

interface Enrollment {
  id: string;
  studentName: string;
  studentEmail: string;
  studentId: string;
  courseTitle: string;
  courseId: string;
  amountPaid: number;
  status: string;
  enrolledAt: string;
  orderId: string | null;
  orderStatus: string | null;
}

interface Props {
  searchQuery?: string;
}

const PAGE_SIZE = 15;

export default function EnrollmentsManager({ searchQuery = "" }: Props) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [showEnroll, setShowEnroll] = useState(false);
  const [students, setStudents] = useState<{ id: string; name: string; email: string }[]>([]);
  const [courses, setCourses] = useState<{ id: string; title: string; price: number }[]>([]);
  const [form, setForm] = useState({ studentId: "", courseId: "", amountPaid: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), perPage: String(PAGE_SIZE) });
      if (searchQuery) params.set("q", searchQuery);
      const res = await opsFetch(`/api/admin/enrollments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEnrollments(data.enrollments);
        setTotal(data.total);
        setPageCount(data.pageCount);
      }
    } catch {} finally { setLoading(false); }
  }, [page, searchQuery]);

  useEffect(() => { fetchEnrollments(); }, [fetchEnrollments]);

  async function openEnroll() {
    setShowEnroll(true);
    const [s, c] = await Promise.all([
      opsFetch("/api/admin/users").then((r) => r.ok ? r.json() : []),
      opsFetch("/api/sales/courses").then((r) => r.ok ? r.json() : []),
    ]);
    setStudents(s.filter((u: any) => u.role === "STUDENT").map((u: any) => ({ id: u.id, name: u.name, email: u.email })));
    setCourses(c.map((c: any) => ({ id: c.id, title: c.title, price: c.price ?? 0 })));
  }

  async function handleEnroll() {
    if (!form.studentId || !form.courseId) return;
    setSaving(true);
    try {
      const course = courses.find((c) => c.id === form.courseId);
      const res = await opsFetch("/api/admin/enrollments", {
        method: "POST",
        body: JSON.stringify({
          studentId: form.studentId,
          courseId: form.courseId,
          amountPaid: parseFloat(form.amountPaid) || course?.price || 0,
        }),
      });
      if (res.ok) {
        setShowEnroll(false);
        setForm({ studentId: "", courseId: "", amountPaid: "" });
        fetchEnrollments();
      }
    } catch {} finally { setSaving(false); }
  }

  async function handleUnenroll(id: string) {
    if (!confirm("Remove this enrollment?")) return;
    setDeleting(id);
    try {
      const res = await opsFetch(`/api/admin/enrollments/${id}`, { method: "DELETE" });
      if (res.ok) fetchEnrollments();
    } catch {} finally { setDeleting(null); }
  }

  function statusColor(s: string) {
    if (s === "active") return { fg: "var(--green)", bg: "var(--green-d)" };
    return { fg: "var(--text3)", bg: "var(--bg)" };
  }

  return (
    <div className="p-4 pb-7">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>📋 Enrollment Management</span>
          <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>admin · {total} enrollments</span>
        </div>
        <button onClick={openEnroll}
          className="font-mono text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer"
          style={{ background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }}>
          + Manual Enroll
        </button>
      </div>

      {showEnroll && (
        <div className="rounded-lg p-4 mb-4 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="font-mono text-[9px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text3)" }}>Student *</label>
              <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                className="w-full font-mono text-[11px] px-2.5 py-1.5 rounded outline-none"
                style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}>
                <option value="">Select student</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
              </select>
            </div>
            <div>
              <label className="font-mono text-[9px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text3)" }}>Course *</label>
              <select value={form.courseId} onChange={(e) => {
                const c = courses.find((c) => c.id === e.target.value);
                setForm({ ...form, courseId: e.target.value, amountPaid: String(c?.price ?? 0) });
              }}
                className="w-full font-mono text-[11px] px-2.5 py-1.5 rounded outline-none"
                style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}>
                <option value="">Select course</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title} (₹{c.price.toLocaleString()})</option>)}
              </select>
            </div>
            <div>
              <label className="font-mono text-[9px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text3)" }}>Amount Paid (₹)</label>
              <input type="number" value={form.amountPaid} onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
                className="w-full font-mono text-[11px] px-2.5 py-1.5 rounded outline-none"
                style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowEnroll(false)}
              className="font-mono text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer"
              style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text3)" }}>Cancel</button>
            <button onClick={handleEnroll} disabled={saving}
              className="font-mono text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer disabled:opacity-50"
              style={{ background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }}>
              {saving ? "…" : "Enroll"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr>{["Student", "Course", "Amount", "Status", "Enrolled", "Actions"].map((h) => (
              <th key={h} className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5"
                style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-2.5 py-4 text-center font-mono text-[10px]" style={{ color: "var(--text3)" }}>Loading…</td></tr>
            ) : enrollments.length === 0 ? (
              <tr><td colSpan={6} className="px-2.5 py-4 text-center font-mono text-[10px]" style={{ color: "var(--text3)" }}>No enrollments</td></tr>
            ) : enrollments.map((e, idx) => (
              <tr key={e.id}
                style={{ background: idx % 2 === 0 ? "var(--surface)" : "var(--panel)" }}
                onMouseEnter={(e2) => { (e2.currentTarget as HTMLElement).style.background = "var(--row-h)"; }}
                onMouseLeave={(e2) => { (e2.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? "var(--surface)" : "var(--panel)"; }}
              >
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="font-semibold" style={{ color: "var(--text)" }}>{e.studentName}</div>
                  <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{e.studentEmail}</div>
                </td>
                <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: "var(--blue)", borderBottom: "1px solid var(--border)" }}>{e.courseTitle}</td>
                <td className="px-2.5 py-1.5 font-mono font-semibold" style={{ color: "var(--green)", borderBottom: "1px solid var(--border)" }}>₹{e.amountPaid.toLocaleString()}</td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                    style={{ background: statusColor(e.status).bg, color: statusColor(e.status).fg }}>{e.status}</span>
                </td>
                <td className="px-2.5 py-1.5 font-mono text-[9px]" style={{ color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>{e.enrolledAt.slice(0, 10)}</td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <button onClick={() => handleUnenroll(e.id)} disabled={deleting === e.id}
                    className="font-mono text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer disabled:opacity-50"
                    style={{ border: "1px solid var(--red)", color: "var(--red)", background: "transparent" }}>
                    {deleting === e.id ? "…" : "Remove"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pageCount > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
            <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>{total} rows</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                className="font-mono text-[10px] px-2 py-1 rounded cursor-pointer disabled:opacity-40"
                style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}>‹</button>
              <span className="font-mono text-[10px] font-bold px-2" style={{ color: "var(--text)" }}>{page}/{pageCount}</span>
              <button onClick={() => setPage(Math.min(pageCount, page + 1))} disabled={page >= pageCount}
                className="font-mono text-[10px] px-2 py-1 rounded cursor-pointer disabled:opacity-40"
                style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}>›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
