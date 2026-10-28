"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { ConfirmDialog } from "./ConfirmDialog";

interface OrderDetail {
  id: string;
  status: string;
  currency: string;
  gatewayType: string;
  subtotal: number;
  discountAmount: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  paymentMethod: string | null;
  /** Admin-gifted enrollment: full course price, 100% GIFT discount, ₹0 charged. */
  isGift?: boolean;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  batchMode: string | null;
  createdAt: string;
}

interface TrainerDetail {
  id: string;
  name: string;
  email: string;
  sharePercent: number | null;
}

interface RevenueDetail {
  gross: number;
  trainerShare: number;
  platformCut: number;
}

interface Enrollment {
  id: string;
  studentName: string;
  studentEmail: string;
  studentId: string;
  courseTitle: string;
  courseCategory: string | null;
  courseId: string;
  amountPaid: number;
  status: string;
  enrolledAt: string;
  orderId: string | null;
  orderStatus: string | null;
  trainer: TrainerDetail | null;
  order: OrderDetail | null;
  revenue: RevenueDetail | null;
}

interface GiftedProject {
  orderId: string;
  student: { id: string; name: string; email: string };
  projectName: string;
  price: number;
  discount: number;
  gst: number;
  paid: number;
  invoiceNumber: string | null;
  giftedAt: string;
}

interface Props {
  searchQuery?: string;
}

const PAGE_SIZE = 10;

export default function EnrollmentsManager({ searchQuery = "" }: Props) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [showEnroll, setShowEnroll] = useState(false);
  const [students, setStudents] = useState<{ id: string; name: string; email: string }[]>([]);
  const [courses, setCourses] = useState<{ id: string; title: string; price: number }[]>([]);
  const [form, setForm] = useState({ studentId: "", courseId: "", projectId: "" });
  const [giftKind, setGiftKind] = useState<"course" | "project">("course");
  const [projects, setProjects] = useState<{ id: string; name: string; price: number }[]>([]);
  const [giftedProjects, setGiftedProjects] = useState<GiftedProject[]>([]);
  const [withdraw, setWithdraw] = useState<GiftedProject | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const fetchGiftedProjects = useCallback(async () => {
    try {
      const res = await opsFetch("/api/admin/gifts/projects");
      if (res.ok) setGiftedProjects(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchGiftedProjects(); }, [fetchGiftedProjects]);

  async function openEnroll() {
    setShowEnroll(true);
    setEnrollError(null);
    const [s, c, p] = await Promise.all([
      opsFetch("/api/admin/users").then((r) => r.ok ? r.json() : []),
      opsFetch("/api/sales/courses").then((r) => r.ok ? r.json() : []),
      opsFetch("/api/projects/admin/all").then((r) => r.ok ? r.json() : []),
    ]);
    setProjects((Array.isArray(p) ? (p as { id: string; name: string; price?: number | string }[]) : []).map((x) => ({ id: x.id, name: x.name, price: Number(x.price) || 0 })));
    setStudents(s.filter((u: any) => u.role === "STUDENT").map((u: any) => ({ id: u.id, name: u.name, email: u.email })));
    setCourses(c.map((c: any) => ({ id: c.id, title: c.title, price: c.price ?? 0 })));
  }

  async function handleEnroll() {
    const itemId = giftKind === "course" ? form.courseId : form.projectId;
    if (!form.studentId || !itemId) return;
    setSaving(true);
    setEnrollError(null);
    try {
      const res = await opsFetch("/api/admin/enrollments", {
        method: "POST",
        body: JSON.stringify({ studentId: form.studentId, ...(giftKind === "course" ? { courseId: itemId } : { projectId: itemId }) }),
      });
      if (res.ok) {
        setShowEnroll(false);
        setForm({ studentId: "", courseId: "", projectId: "" });
        fetchEnrollments();
        fetchGiftedProjects();
      } else {
        const body = await res.json().catch(() => ({}));
        setEnrollError(Array.isArray(body.message) ? body.message.join(", ") : body.message || "Could not enrol this student");
      }
    } catch {
      setEnrollError("Could not enrol this student — please try again");
    } finally { setSaving(false); }
  }

  async function confirmWithdraw() {
    if (!withdraw) return;
    setWithdrawing(true);
    try {
      const res = await opsFetch(`/api/admin/gifts/projects/${withdraw.orderId}`, { method: "DELETE" });
      if (res.ok) {
        setWithdraw(null);
        fetchGiftedProjects();
      }
    } catch {} finally { setWithdrawing(false); }
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
          🎁 Gift Enrollment
        </button>
      </div>

      {showEnroll && (
        <div className="rounded-lg p-4 mb-4 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="font-mono text-[11px] font-bold mb-2" style={{ color: "var(--text)" }}>🎁 Gift a course or project</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
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
              <label className="font-mono text-[9px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text3)" }}>
                Gift a
                <span className="ml-2 inline-flex rounded overflow-hidden align-middle" style={{ border: "1px solid var(--border)" }}>
                  {(["course", "project"] as const).map((k) => (
                    <button key={k} type="button" onClick={() => { setGiftKind(k); setEnrollError(null); }}
                      className="px-2 py-0.5 cursor-pointer font-bold uppercase"
                      style={{ background: giftKind === k ? "var(--orange)" : "var(--panel)", color: giftKind === k ? "#fff" : "var(--text2)", border: "none", fontSize: 9 }}>
                      {k}
                    </button>
                  ))}
                </span>
                {" "}*
              </label>
              {giftKind === "course" ? (
                <select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                  className="w-full font-mono text-[11px] px-2.5 py-1.5 rounded outline-none"
                  style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}>
                  <option value="">Select course</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title} (₹{c.price.toLocaleString()})</option>)}
                </select>
              ) : (
                <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  className="w-full font-mono text-[11px] px-2.5 py-1.5 rounded outline-none"
                  style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}>
                  <option value="">Select project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name} (₹{p.price.toLocaleString()})</option>)}
                </select>
              )}
            </div>
          </div>
          {(() => {
            const item = giftKind === "course" ? courses.find((x) => x.id === form.courseId) : projects.find((x) => x.id === form.projectId);
            const price = item?.price ?? 0;
            return (
              <div className="rounded-md px-3 py-2 mb-3 font-mono text-[10px] leading-relaxed" style={{ background: "var(--panel)", border: "1px dashed var(--border2, var(--border))", color: "var(--text2)" }}>
                {item ? (
                  <>
                    {giftKind === "course" ? "Course" : "Project"} price <b style={{ color: "var(--text)" }}>₹{price.toLocaleString()}</b>
                    {" · "}Discount <b style={{ color: "var(--green)" }}>GIFT −₹{price.toLocaleString()} (100%)</b>
                    {" · "}Student pays <b style={{ color: "var(--text)" }}>₹0</b>
                    {" · "}No trainer or platform share.
                  </>
                ) : (
                  "Nothing is charged. The student gets it for free, recorded as an order at the full price with a 100% GIFT discount, and an invoice is issued."
                )}
              </div>
            );
          })()}
          {enrollError && <div className="font-mono text-[10.5px] mb-3" style={{ color: "var(--red)" }}>{enrollError}</div>}
          <div className="flex gap-2">
            <button onClick={() => setShowEnroll(false)}
              className="font-mono text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer"
              style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text3)" }}>Cancel</button>
            <button onClick={handleEnroll} disabled={saving}
              className="font-mono text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer disabled:opacity-50"
              style={{ background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }}>
              {saving ? "…" : "Gift it"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr>{["", "Student", "Course", "Amount", "Trainer Cut", "Status", "Enrolled", "Actions"].map((h) => (
              <th key={h} className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5"
                style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-2.5 py-4 text-center font-mono text-[10px]" style={{ color: "var(--text3)" }}>Loading…</td></tr>
            ) : enrollments.length === 0 ? (
              <tr><td colSpan={8} className="px-2.5 py-4 text-center font-mono text-[10px]" style={{ color: "var(--text3)" }}>No enrollments</td></tr>
            ) : enrollments.map((e, idx) => {
              const isOpen = expandedId === e.id;
              return (
              <Fragment key={e.id}>
                <tr
                  style={{ background: isOpen ? "var(--row-h)" : idx % 2 === 0 ? "var(--surface)" : "var(--panel)", cursor: "pointer" }}
                  onClick={() => setExpandedId(isOpen ? null : e.id)}
                  onMouseEnter={(e2) => { if (!isOpen) (e2.currentTarget as HTMLElement).style.background = "var(--row-h)"; }}
                  onMouseLeave={(e2) => { if (!isOpen) (e2.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? "var(--surface)" : "var(--panel)"; }}
                >
                  <td className="px-2 py-1.5 text-center font-mono text-[9px]" style={{ color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>{isOpen ? "▾" : "▸"}</td>
                  <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                    <div className="font-semibold" style={{ color: "var(--text)" }}>{e.studentName}</div>
                    <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{e.studentEmail}</div>
                  </td>
                  <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: "var(--blue)", borderBottom: "1px solid var(--border)" }}>{e.courseTitle}</td>
                  <td className="px-2.5 py-1.5 font-mono font-semibold" style={{ color: "var(--green)", borderBottom: "1px solid var(--border)" }}>
                    ₹{e.amountPaid.toLocaleString()}
                    {e.order?.isGift && (
                      <span className="ml-1.5 font-mono text-[8.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--purple-d, rgba(124,58,237,.12))", color: "var(--purple, #7c3aed)" }}>🎁 GIFT</span>
                    )}
                  </td>
                  <td className="px-2.5 py-1.5 font-mono text-[9.5px]" style={{ borderBottom: "1px solid var(--border)" }}>
                    {e.revenue ? (
                      <span style={{ color: "var(--text2)" }}>
                        ₹{e.revenue.trainerShare.toLocaleString()} <span style={{ color: "var(--text3)" }}>/ ₹{e.revenue.platformCut.toLocaleString()} admin</span>
                      </span>
                    ) : e.order?.isGift ? (
                      <span style={{ color: "var(--text3)" }}>— none (gift)</span>
                    ) : (
                      <span title="No RevenueLedger row — this enrollment didn't go through checkout (e.g. manual admin enroll)" style={{ color: "var(--red)" }}>— untracked</span>
                    )}
                  </td>
                  <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                      style={{ background: statusColor(e.status).bg, color: statusColor(e.status).fg }}>{e.status}</span>
                  </td>
                  <td className="px-2.5 py-1.5 font-mono text-[9px]" style={{ color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>{e.enrolledAt.slice(0, 10)}</td>
                  <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                    <button onClick={(ev) => { ev.stopPropagation(); handleUnenroll(e.id); }} disabled={deleting === e.id}
                      className="font-mono text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer disabled:opacity-50"
                      style={{ border: "1px solid var(--red)", color: "var(--red)", background: "transparent" }}>
                      {deleting === e.id ? "…" : "Remove"}
                    </button>
                  </td>
                </tr>
                {isOpen && (
                  <tr style={{ background: "var(--bg)" }}>
                    <td colSpan={8} className="px-4 py-3" style={{ borderBottom: "1px solid var(--border2)" }}>
                      {e.order?.isGift && <GiftSummary order={e.order} />}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>Student & Course</div>
                          <div className="font-mono text-[10px] flex flex-col gap-0.5" style={{ color: "var(--text2)" }}>
                            <span>Enrollment ID: <span style={{ color: "var(--text)" }}>{e.id}</span></span>
                            <span>Student ID: <span style={{ color: "var(--text)" }}>{e.studentId}</span></span>
                            <span>Course ID: <span style={{ color: "var(--text)" }}>{e.courseId}</span></span>
                            <span>Category: <span style={{ color: "var(--text)" }}>{e.courseCategory ?? "—"}</span></span>
                          </div>
                        </div>

                        <div>
                          <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>Trainer & Revenue Split</div>
                          {e.trainer ? (
                            <div className="font-mono text-[10px] flex flex-col gap-0.5" style={{ color: "var(--text2)" }}>
                              <span>Trainer: <span style={{ color: "var(--text)" }}>{e.trainer.name}</span> ({e.trainer.email})</span>
                              <span>Share %: <span style={{ color: "var(--text)" }}>{e.trainer.sharePercent ?? "default (global)"}</span></span>
                              {e.revenue ? (
                                <>
                                  <span>Gross: <span style={{ color: "var(--text)" }}>₹{e.revenue.gross.toLocaleString()}</span></span>
                                  <span>Trainer share: <span style={{ color: "var(--green)" }}>₹{e.revenue.trainerShare.toLocaleString()}</span></span>
                                  <span>Platform cut: <span style={{ color: "var(--orange)" }}>₹{e.revenue.platformCut.toLocaleString()}</span></span>
                                </>
                              ) : e.order?.isGift ? (
                                <span style={{ color: "var(--text3)" }}>No share — this was a gift, so nothing was collected to split.</span>
                              ) : (
                                <span style={{ color: "var(--red)" }}>No RevenueLedger row — this enrollment bypassed checkout, so the trainer/admin split was never recorded.</span>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>No trainer assigned to this course</span>
                          )}
                        </div>

                        <div>
                          <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>Order & Payment</div>
                          {e.order ? (
                            <div className="font-mono text-[10px] flex flex-col gap-0.5" style={{ color: "var(--text2)" }}>
                              <span>Order ID: <span style={{ color: "var(--text)" }}>{e.order.id}</span></span>
                              <span>Status: <span style={{ color: "var(--text)" }}>{e.order.status}</span></span>
                              <span>Gateway: <span style={{ color: "var(--text)" }}>{e.order.gatewayType} · {e.order.currency}</span></span>
                              <span>Subtotal: <span style={{ color: "var(--text)" }}>₹{e.order.subtotal.toLocaleString()}</span></span>
                              {e.order.discountAmount > 0 && <span>Discount: <span style={{ color: "var(--text)" }}>-₹{e.order.discountAmount.toLocaleString()}</span></span>}
                              <span>GST: <span style={{ color: "var(--text)" }}>{e.order.gstPercent}% (₹{e.order.gstAmount.toLocaleString()})</span></span>
                              <span>Total charged: <span style={{ color: "var(--text)" }}>₹{e.order.totalAmount.toLocaleString()}</span></span>
                              <span>Payment method: <span style={{ color: "var(--text)" }}>{e.order.paymentMethod ?? "—"}</span></span>
                              {e.order.batchMode && <span>Batch mode: <span style={{ color: "var(--text)" }}>{e.order.batchMode}</span></span>}
                              {!e.order.isGift && <span>Razorpay Order: <span style={{ color: "var(--text)" }}>{e.order.razorpayOrderId}</span></span>}
                              {e.order.razorpayPaymentId && <span>Razorpay Payment: <span style={{ color: "var(--text)" }}>{e.order.razorpayPaymentId}</span></span>}
                              <span>Order created: <span style={{ color: "var(--text)" }}>{new Date(e.order.createdAt).toLocaleString()}</span></span>
                            </div>
                          ) : (
                            <span className="font-mono text-[10px]" style={{ color: "var(--red)" }}>No Order record — this enrollment was created without going through checkout (e.g. admin manual enroll).</span>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
              );
            })}
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

      {/* Gifted projects — projects have no enrollment row, so they are listed here */}
      <div className="mt-5">
        <div className="flex items-baseline gap-2.5 mb-2">
          <span className="text-[14px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>🎁 Gifted projects</span>
          <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>{giftedProjects.length} gifted · code GIFT</span>
        </div>
        <div className="rounded overflow-x-auto" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <table className="w-full border-collapse" style={{ fontSize: 11 }}>
            <thead>
              <tr>{["Student", "Project", "Actual price", "Discount (GIFT)", "Amount paid", "Trainer / platform share", "Invoice", "Gifted", ""].map((h) => (
                <th key={h} className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5 whitespace-nowrap"
                  style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {giftedProjects.length === 0 ? (
                <tr><td colSpan={9} className="px-2.5 py-4 text-center font-mono text-[10px]" style={{ color: "var(--text3)" }}>No gifted projects yet</td></tr>
              ) : giftedProjects.map((g) => (
                <tr key={g.orderId}>
                  <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                    <div className="font-semibold" style={{ color: "var(--text)" }}>{g.student.name}</div>
                    <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{g.student.email}</div>
                  </td>
                  <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: "var(--blue)", borderBottom: "1px solid var(--border)" }}>🚀 {g.projectName}</td>
                  <td className="px-2.5 py-1.5 font-mono" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>₹{g.price.toLocaleString()}</td>
                  <td className="px-2.5 py-1.5 font-mono" style={{ color: "var(--green)", borderBottom: "1px solid var(--border)" }}>
                    − ₹{g.discount.toLocaleString()} <span style={{ color: "var(--text3)" }}>({g.price > 0 ? Math.round((g.discount / g.price) * 100) : 100}%)</span>
                  </td>
                  <td className="px-2.5 py-1.5 font-mono font-semibold" style={{ color: "var(--green)", borderBottom: "1px solid var(--border)" }}>
                    ₹{g.paid.toLocaleString()}
                    <span className="ml-1.5 font-mono text-[8.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--purple-d, rgba(124,58,237,.12))", color: "var(--purple, #7c3aed)" }}>🎁 GIFT</span>
                  </td>
                  <td className="px-2.5 py-1.5 font-mono text-[9.5px]" style={{ color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>₹0 / ₹0 — none</td>
                  <td className="px-2.5 py-1.5 font-mono text-[9.5px]" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{g.invoiceNumber ?? "—"}</td>
                  <td className="px-2.5 py-1.5 font-mono text-[9px]" style={{ color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>{g.giftedAt.slice(0, 10)}</td>
                  <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                    <button onClick={() => setWithdraw(g)}
                      className="font-mono text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer"
                      style={{ border: "1px solid var(--red)", color: "var(--red)", background: "transparent" }}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!withdraw}
        danger
        title="Remove this gifted project?"
        message={withdraw ? `${withdraw.student.name} will lose access to "${withdraw.projectName}". Nothing was paid, so there is nothing to refund.` : ""}
        confirmLabel={withdrawing ? "Removing…" : "Remove"}
        onConfirm={confirmWithdraw}
        onCancel={() => !withdrawing && setWithdraw(null)}
      />
    </div>
  );
}

/** The gifted-enrollment breakdown: real price, 100% GIFT discount, nothing charged, no share. */
function GiftSummary({ order }: { order: OrderDetail }) {
  const price = order.subtotal;
  const pct = price > 0 ? Math.round((order.discountAmount / price) * 100) : 100;
  const money = (n: number) => "₹" + n.toLocaleString();
  const cell = (label: string, value: string, tone?: string) => (
    <div className="rounded-md px-3 py-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text3)" }}>{label}</div>
      <div className="font-mono text-[13px] font-extrabold tabular-nums mt-0.5" style={{ color: tone ?? "var(--text)" }}>{value}</div>
    </div>
  );
  return (
    <div className="rounded-lg p-3 mb-4" style={{ background: "var(--purple-d, rgba(124,58,237,.08))", border: "1px solid var(--purple, #7c3aed)" }}>
      <div className="font-mono text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--purple, #7c3aed)" }}>
        🎁 Gifted enrollment · code GIFT
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
        {cell("Actual course price", money(price))}
        {cell(`Discount (GIFT ${pct}%)`, "− " + money(order.discountAmount), "var(--green)")}
        {cell("GST", money(order.gstAmount))}
        {cell("Amount paid", money(order.totalAmount))}
        {cell("Trainer share", money(0))}
        {cell("Platform cut", money(0))}
      </div>
      <div className="font-mono text-[9.5px] mt-2" style={{ color: "var(--text3)" }}>
        Recorded as a paid order with an invoice, like any other enrollment — only no money was taken and nothing is shared with the trainer.
      </div>
    </div>
  );
}
