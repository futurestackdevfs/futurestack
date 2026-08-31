"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { Panel, Th, Td, Pill, ViewHeader } from "../sections/ui";

function fmtRupee(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function statusBadge(status: string) {
  switch (status) {
    case "PAID": return { fg: "var(--green)", bg: "var(--green-d)", label: "PAID" };
    case "CREATED": return { fg: "var(--amber)", bg: "var(--amber-d)", label: "PENDING" };
    case "FAILED": return { fg: "var(--red)", bg: "var(--red-d)", label: "FAILED" };
    case "CANCELLED": return { fg: "var(--text3)", bg: "var(--panel)", label: "CANCELLED" };
    case "EXPIRED": return { fg: "var(--text3)", bg: "var(--panel)", label: "EXPIRED" };
    default: return { fg: "var(--text3)", bg: "var(--panel)", label: status };
  }
}

interface EnrollmentOrder {
  id: string;
  status: string;
  student: { id: string; name: string; email: string | null; phone: string | null } | null;
  course: { id: string; title: string; price: number; code: string | null } | null;
  items: { courseTitle: string; priceAtPurchase: number }[];
  subtotal: number;
  discountAmount: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  batchMode: string | null;
  paymentMethod: string | null;
  razorpayOrderId: string | null;
  enrollment: { id: string; status: string; enrolledAt: string } | null;
  createdAt: string;
  updatedAt: string;
}

function DetailModal({ order, onClose }: { order: EnrollmentOrder; onClose: () => void }) {
  const badge = statusBadge(order.status);
  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded w-[600px] max-w-[95vw] max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}
      >
        {/* Header */}
        <div className="p-4 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <span className="text-[15px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>Enrollment Details</span>
              <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: badge.bg, color: badge.fg }}>{badge.label}</span>
            </div>
            <button onClick={onClose} className="font-mono text-[11px] cursor-pointer" style={{ color: "var(--text3)", background: "none", border: "none" }}>✕</button>
          </div>
          <div className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>Order ID: {order.id}</div>
        </div>

        <div className="p-4 space-y-3">
          {/* Student Info */}
          <div className="rounded p-3" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
            <div className="font-mono text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text3)" }}>Student Information</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Name", value: order.student?.name ?? "—" },
                { label: "Email", value: order.student?.email ?? "—" },
                { label: "Phone", value: order.student?.phone ?? "—" },
                { label: "Enrolled", value: order.enrollment ? fmtDateTime(order.enrollment.enrolledAt) : "—" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="font-mono text-[8px] uppercase tracking-wider" style={{ color: "var(--text3)" }}>{item.label}</div>
                  <div className="font-mono text-[10.5px] font-semibold" style={{ color: "var(--text)" }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Course Info */}
          <div className="rounded p-3" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
            <div className="font-mono text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text3)" }}>Course Details</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Course", value: order.course?.title ?? "—" },
                { label: "Code", value: order.course?.code ?? "—" },
                { label: "Mode", value: order.batchMode ?? "—" },
                { label: "List Price", value: order.course ? fmtRupee(order.course.price) : "—" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="font-mono text-[8px] uppercase tracking-wider" style={{ color: "var(--text3)" }}>{item.label}</div>
                  <div className="font-mono text-[10.5px] font-semibold" style={{ color: "var(--text)" }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="rounded p-3" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
            <div className="font-mono text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text3)" }}>Payment Breakdown</div>
            <div className="flex flex-col gap-1.5">
              {[
                { label: "Subtotal", value: fmtRupee(order.subtotal), color: "var(--text)" },
                { label: `Discount`, value: order.discountAmount > 0 ? `−${fmtRupee(order.discountAmount)}` : "—", color: "var(--red)" },
                { label: `GST (${order.gstPercent}%)`, value: fmtRupee(order.gstAmount), color: "var(--text)" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between font-mono text-[10px] py-0.5">
                  <span style={{ color: "var(--text3)" }}>{row.label}</span>
                  <span style={{ color: row.color }}>{row.value}</span>
                </div>
              ))}
              <div className="flex justify-between font-mono text-[12px] font-bold py-1" style={{ borderTop: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text)" }}>TOTAL</span>
                <span style={{ color: "var(--green)" }}>{fmtRupee(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="rounded p-3" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
            <div className="font-mono text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text3)" }}>Payment Information</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Status", value: <span className="font-bold px-1.5 py-0.5 rounded" style={{ background: badge.bg, color: badge.fg }}>{badge.label}</span> },
                { label: "Method", value: order.paymentMethod ?? "—" },
                { label: "Ordered On", value: fmtDateTime(order.createdAt) },
                { label: "Payment ID", value: order.razorpayOrderId ?? "—" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="font-mono text-[8px] uppercase tracking-wider" style={{ color: "var(--text3)" }}>{item.label}</div>
                  <div className="font-mono text-[10.5px] font-semibold" style={{ color: "var(--text)" }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded p-3" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
            <div className="font-mono text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text3)" }}>Timeline</div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--blue)" }} />
                <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>Order created</span>
                <span className="font-mono text-[9.5px] font-semibold ml-auto" style={{ color: "var(--text)" }}>{fmtDateTime(order.createdAt)}</span>
              </div>
              {order.status === "PAID" && (
                <div className="flex items-center gap-2">
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} />
                  <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>Payment confirmed</span>
                  <span className="font-mono text-[9.5px] font-semibold ml-auto" style={{ color: "var(--text)" }}>{fmtDateTime(order.updatedAt)}</span>
                </div>
              )}
              {order.enrollment && (
                <div className="flex items-center gap-2">
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--orange)" }} />
                  <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>Enrolled</span>
                  <span className="font-mono text-[9.5px] font-semibold ml-auto" style={{ color: "var(--text)" }}>{fmtDateTime(order.enrollment.enrolledAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={onClose}
            className="w-full py-2 rounded font-mono text-[10.5px] font-bold cursor-pointer"
            style={{ background: "var(--panel)", color: "var(--text2)", border: "1px solid var(--border)" }}
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EnrollmentsView({ searchQuery, refreshSignal, onToast }: {
  searchQuery: string;
  refreshSignal?: number;
  onToast?: (msg: string, type?: "success" | "danger") => void;
}) {
  const [orders, setOrders] = useState<EnrollmentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<EnrollmentOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const loadOrders = useCallback(async () => {
    try {
      const r = await opsFetch("/api/sales/orders");
      if (!r.ok) throw new Error(`Failed to load enrollments (${r.status})`);
      const data = await r.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Failed to load enrollments", "danger");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders, refreshSignal]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "All") {
        if (statusFilter === "PAID" && o.status !== "PAID") return false;
        if (statusFilter === "PENDING" && o.status !== "CREATED") return false;
        if (statusFilter === "CANCELLED" && !["FAILED", "CANCELLED", "EXPIRED"].includes(o.status)) return false;
      }
      if (!q) return true;
      return [
        o.student?.name, o.student?.email, o.course?.title, o.batchMode, o.paymentMethod,
      ].some((v) => v && v.toLowerCase().includes(q));
    });
  }, [orders, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const paid = orders.filter((o) => o.status === "PAID");
    const pending = orders.filter((o) => o.status === "CREATED");
    const totalRevenue = paid.reduce((s, o) => s + o.totalAmount, 0);
    const pendingRevenue = pending.reduce((s, o) => s + o.totalAmount, 0);
    return { paidCount: paid.length, pendingCount: pending.length, totalRevenue, pendingRevenue };
  }, [orders]);

  function exportCsv() {
    if (filtered.length === 0) return;
    const header = ["Student", "Course", "Mode", "Status", "Amount", "Payment", "Ordered On"];
    const rows = filtered.map((o) => [
      o.student?.name ?? "",
      o.course?.title ?? "",
      o.batchMode ?? "",
      o.status,
      String(o.totalAmount),
      o.paymentMethod ?? "",
      o.createdAt.slice(0, 10),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `my-enrollments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 pb-7">
      <ViewHeader
        icon="📋"
        title="My Enrollments"
        meta={`${filtered.length} ENROLLMENTS · ${stats.paidCount} PAID`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              className="font-mono text-[9.5px] font-bold px-2.5 py-1 rounded cursor-pointer"
              style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}
            >
              ⬇ EXPORT CSV
            </button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        {[
          { label: "Total Enrollments", value: String(orders.length), sub: "all time", color: "var(--text)" },
          { label: "Paid", value: String(stats.paidCount), sub: fmtRupee(stats.totalRevenue), color: "var(--green)" },
          { label: "Pending", value: String(stats.pendingCount), sub: fmtRupee(stats.pendingRevenue), color: "var(--amber)" },
          { label: "Revenue", value: fmtRupee(stats.totalRevenue), sub: `avg ${fmtRupee(orders.length ? Math.round(stats.totalRevenue / stats.paidCount || 0) : 0)}`, color: "var(--blue)" },
        ].map((kpi, i) => (
          <div key={i} className="rounded-lg px-3.5 py-2.5 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="font-mono text-[8.5px] uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>{kpi.label}</div>
            <div className="font-mono text-[18px] font-bold leading-none" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="font-mono text-[8.5px] mt-0.5" style={{ color: "var(--text3)" }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-1.5 mb-3">
        {(["All", "PAID", "PENDING", "CANCELLED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className="font-mono text-[8.5px] font-bold px-2 py-1 rounded cursor-pointer"
            style={{
              background: statusFilter === s ? "var(--orange)" : "var(--panel)",
              color: statusFilter === s ? "#fff" : "var(--text2)",
              border: `1px solid ${statusFilter === s ? "var(--orange)" : "var(--border)"}`,
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Enrollments Table */}
      <Panel title="Enrollment Records" count={`${filtered.length} RECORDS`}>
        {loading ? (
          <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading enrollments…</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>
            {orders.length === 0 ? "No enrollments yet — create a sale to get started" : "No enrollments match your filter"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Student</Th>
                  <Th>Course</Th>
                  <Th>Mode</Th>
                  <Th>Status</Th>
                  <Th>Amount</Th>
                  <Th>Payment</Th>
                  <Th>Ordered On</Th>
                  <Th>Details</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const badge = statusBadge(o.status);
                  return (
                    <tr
                      key={o.id}
                      className="cursor-pointer"
                      onClick={() => setDetail(o)}
                      style={{ transition: "background .1s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-h)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
                    >
                      <Td>
                        <div className="font-semibold" style={{ color: "var(--text)" }}>{o.student?.name ?? "—"}</div>
                        {o.student?.email && <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{o.student.email}</div>}
                      </Td>
                      <Td>{o.course?.title ?? "—"}</Td>
                      <Td>{o.batchMode ? <Pill value={o.batchMode} /> : <span style={{ color: "var(--text3)" }}>—</span>}</Td>
                      <Td>
                        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: badge.bg, color: badge.fg }}>{badge.label}</span>
                      </Td>
                      <Td mono color="var(--green)">{fmtRupee(o.totalAmount)}</Td>
                      <Td mono>{o.paymentMethod ?? "—"}</Td>
                      <Td mono>{fmtDate(o.createdAt)}</Td>
                      <Td>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDetail(o); }}
                          className="font-mono text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer"
                          style={{ border: "1px solid var(--blue)", color: "var(--blue)", background: "transparent" }}
                        >
                          VIEW
                        </button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {detail && <DetailModal order={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
