"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";

interface RefundItem {
  id: string;
  orderId: string;
  studentId: string;
  courseId: string;
  amount: number;
  reason: string;
  status: string;
  razorpayRefundId: string | null;
  initiatedById: string;
  processedAt: string | null;
  createdAt: string;
  order: {
    id: string;
    totalAmount: number;
    subtotal: number;
    discountAmount: number;
    gstPercent: number;
    gstAmount: number;
    currency: string;
    couponCode: string | null;
    razorpayPaymentId: string | null;
  };
  /** What the student paid for THIS item and what is returned (coupon cut, GST included). */
  breakdown: { itemPrice: number; couponDiscount: number; gstAmount: number; paid: number } | null;
  etaDays: number;
  /** Estimated date the money reaches the student. */
  estimatedBy: string;
  student: { id: string; name: string; email: string };
  course: { id: string; title: string } | null;
  project: { id: string; name: string } | null;
  initiatedBy: { id: string; name: string };
}

interface RefundSummary {
  total: number;
  totalRefundAmount: number;
  pending: number;
  processed: number;
  rejected: number;
}

interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

interface RefundsData {
  refunds: RefundItem[];
  summary: RefundSummary;
  pagination: Pagination;
}

const TABS = [
  { key: "all", label: "All", value: undefined },
  { key: "processed", label: "Processed", value: "PROCESSED" },
  { key: "pending", label: "Pending", value: "PENDING" },
  { key: "rejected", label: "Rejected", value: "REJECTED" },
];

const PER_PAGE = 10;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    PENDING: { label: "Pending review", color: "#d97706", bg: "rgba(217,119,6,.12)" },
    PROCESSED: { label: "Sent to Razorpay", color: "var(--green)", bg: "var(--green-d)" },
    REJECTED: { label: "Rejected", color: "var(--red)", bg: "var(--red-d)" },
  };
  const s = map[status?.toUpperCase()] ?? { label: status, color: "var(--text3)", bg: "var(--bg2)" };
  return (
    <span
      className="font-mono text-[9.5px] font-bold px-2 py-[3px] rounded-full whitespace-nowrap"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  );
}

function formatMoney(n: number | null | undefined, currency = "INR") {
  const v = Number.isFinite(n) ? n ?? 0 : 0;
  return (currency === "USD" ? "$" : "₹") + v.toLocaleString(currency === "USD" ? "en-US" : "en-IN");
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Where the refund is right now, in plain words, plus the date it should land. */
function refundProgress(r: RefundItem) {
  if (r.status === "REJECTED") return { text: "Rejected — nothing refunded", overdue: false };
  if (r.status === "PENDING") return { text: "Waiting for admin approval", overdue: false };
  const overdue = new Date(r.estimatedBy).getTime() < Date.now();
  return {
    text: overdue
      ? `Should have reached the student by ${fmtDate(r.estimatedBy)} — check with Razorpay`
      : `Money expected in student's account by ${fmtDate(r.estimatedBy)}`,
    overdue,
  };
}

function getPageItems(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

export default function RefundsManager({ token, searchQuery = "" }: { token: string; searchQuery?: string }) {
  const [data, setData] = useState<RefundsData | null>(null);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "danger" }[]>([]);

  function addToast(msg: string, type: "success" | "danger" = "success") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  const load = useCallback(
    async (st: string | undefined, pg: number) => {
      if (!token) return;
      setLoading(true);
      const params = new URLSearchParams();
      if (st) params.set("status", st);
      params.set("page", String(pg));
      params.set("perPage", String(PER_PAGE));
      try {
        const res = await opsFetch(`/api/admin/refunds?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load refunds");
        const body = (await res.json()) as RefundsData;
        setData(body);
      } catch (e: unknown) {
        addToast(e instanceof Error ? e.message : "Failed to load refunds", "danger");
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    load(status, page);
  }, [token, status, page]);

  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const from = pagination && pagination.total > 0 ? (pagination.page - 1) * pagination.perPage + 1 : 0;
  const to = pagination ? Math.min(pagination.page * pagination.perPage, pagination.total) : 0;

  function switchStatus(next?: string) {
    setPage(1);
    setStatus(next);
  }

  function goToPage(p: number) {
    if (p < 1 || p > totalPages || p === page) return;
    setPage(p);
  }

  const filteredRefunds = data?.refunds ?? [];

  return (
    <div className="p-4 pb-16">
      <div className="flex items-baseline gap-2.5 mb-4">
        <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
          💸 Refunds
        </span>
        <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
          refund history — processed · pending · rejected
        </span>
      </div>

      {/* KPIs */}
      <div className="flex flex-wrap gap-2.5 mb-4">
        <div className="flex-1 min-w-[112px] rounded-xl px-3.5 py-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="text-[13px] font-extrabold tracking-tight tabular-nums" style={{ color: "var(--text)" }}>{data?.summary.total ?? 0}</div>
          <div className="text-[10px] font-medium mt-0.5 uppercase tracking-wider" style={{ color: "var(--text3)" }}>Total Refunds</div>
        </div>
        <div className="flex-1 min-w-[112px] rounded-xl px-3.5 py-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="text-[13px] font-extrabold tracking-tight tabular-nums" style={{ color: "var(--red)" }}>{formatMoney(data?.summary.totalRefundAmount)}</div>
          <div className="text-[10px] font-medium mt-0.5 uppercase tracking-wider" style={{ color: "var(--text3)" }}>Total Amount</div>
        </div>
        <div className="flex-1 min-w-[112px] rounded-xl px-3.5 py-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="text-[13px] font-extrabold tracking-tight tabular-nums" style={{ color: "var(--green)" }}>{data?.summary.processed ?? 0}</div>
          <div className="text-[10px] font-medium mt-0.5 uppercase tracking-wider" style={{ color: "var(--text3)" }}>Processed</div>
        </div>
        <div className="flex-1 min-w-[112px] rounded-xl px-3.5 py-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="text-[13px] font-extrabold tracking-tight tabular-nums" style={{ color: "#d97706" }}>{data?.summary.pending ?? 0}</div>
          <div className="text-[10px] font-medium mt-0.5 uppercase tracking-wider" style={{ color: "var(--text3)" }}>Pending</div>
        </div>
        <div className="flex-1 min-w-[112px] rounded-xl px-3.5 py-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="text-[13px] font-extrabold tracking-tight tabular-nums" style={{ color: "var(--red)" }}>{data?.summary.rejected ?? 0}</div>
          <div className="text-[10px] font-medium mt-0.5 uppercase tracking-wider" style={{ color: "var(--text3)" }}>Rejected</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div
          className="flex items-center gap-1 rounded-lg px-1 py-[3px]"
          style={{ background: "var(--panel)", border: "1px solid var(--border)" }}
        >
          {TABS.map((t) => {
            const active = status === t.value;
            return (
              <button
                key={t.key}
                onClick={() => switchStatus(t.value)}
                className="px-3 py-1 rounded-md font-mono text-[10.5px] font-semibold cursor-pointer transition-colors"
                style={{
                  background: active ? "var(--orange)" : "transparent",
                  color: active ? "#fff" : "var(--text2)",
                  border: "none",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => load(status, page)}
          className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer"
          style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}
      >
        <div
          className="flex items-center justify-between px-3.5 py-2"
          style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}
        >
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>
            {loading ? "syncing…" : `${pagination ? `${from}–${to}` : "0"} of ${pagination?.total ?? 0} records`}
          </span>
          <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>refund ledger · {PER_PAGE}/page</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[880px]" style={{ borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(148,163,184,.05)" }}>
                {["Date", "Student", "Item", "Order", "Paid / Refund", "Status & expected by", "Reason", "Processed By"].map((h) => (
                  <th
                    key={h}
                    className="font-mono text-[9px] font-bold uppercase tracking-[.08em] text-[var(--text3)] px-2.5 py-[7px]"
                    style={{ textAlign: "left", whiteSpace: "nowrap", fontWeight: 700 }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRefunds.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
                    {loading ? "Loading refunds..." : "No refunds found."}
                  </td>
                </tr>
              )}
              {filteredRefunds.map((r) => {
                const progress = refundProgress(r);
                const open = expandedId === r.id;
                const cur = r.order?.currency ?? "INR";
                return (
                  <Fragment key={r.id}>
                    <tr
                      onClick={() => setExpandedId(open ? null : r.id)}
                      className="cursor-pointer"
                      style={{ borderBottom: open ? "none" : "1px solid var(--border)", background: open ? "rgba(148,163,184,.06)" : undefined }}
                    >
                      <td className="px-2.5 py-[7px] whitespace-nowrap">
                        <div className="font-mono text-[10px]" style={{ color: "var(--text2)" }}>{fmtDate(r.createdAt)}</div>
                        <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>
                          {new Date(r.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                        </div>
                      </td>
                      <td className="px-2.5 py-[7px]">
                        <div className="text-[11.5px] font-semibold" style={{ color: "var(--text)" }}>{r.student?.name ?? "—"}</div>
                        <div className="font-mono text-[9px] max-w-[160px] truncate" style={{ color: "var(--text3)" }}>{r.student?.email ?? ""}</div>
                      </td>
                      <td className="px-2.5 py-[7px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px]">{r.project ? "🚀" : "📚"}</span>
                          <div className="text-[11.5px] font-semibold" style={{ color: "var(--text)" }}>{r.course?.title ?? r.project?.name ?? "—"}</div>
                        </div>
                      </td>
                      <td className="px-2.5 py-[7px]">
                        <span className="font-mono text-[10.5px] font-bold" style={{ color: "var(--blue)" }}>
                          {r.orderId.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-2.5 py-[7px] whitespace-nowrap">
                        <div className="font-mono text-[11.5px] font-bold tabular-nums" style={{ color: "var(--red)" }}>
                          Refund {formatMoney(r.amount, cur)}
                        </div>
                        <div className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>
                          {r.breakdown
                            ? `Paid ${formatMoney(r.breakdown.paid, cur)}${r.breakdown.couponDiscount > 0 ? ` · coupon −${formatMoney(r.breakdown.couponDiscount, cur)}` : ""}`
                            : "—"}
                        </div>
                      </td>
                      <td className="px-2.5 py-[7px]">
                        <StatusBadge status={r.status} />
                        <div
                          className="font-mono text-[9px] mt-1 max-w-[230px] leading-snug"
                          style={{ color: progress.overdue ? "var(--red)" : "var(--text3)" }}
                        >
                          {progress.text}
                        </div>
                      </td>
                      <td className="px-2.5 py-[7px]">
                        <div className="text-[11px] max-w-[180px] truncate" style={{ color: "var(--text2)" }}>{r.reason}</div>
                      </td>
                      <td className="px-2.5 py-[7px]">
                        <div className="text-[11px] font-medium" style={{ color: "var(--text2)" }}>{r.initiatedBy?.name ?? "—"}</div>
                        <div className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>{open ? "▲ hide" : "▼ details"}</div>
                      </td>
                    </tr>
                    {open && (
                      <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(148,163,184,.06)" }}>
                        <td colSpan={8} className="px-4 pb-3.5 pt-1">
                          <RefundDetail r={r} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.total > 0 && (
          <div
            className="flex items-center justify-between flex-wrap gap-2 px-3.5 py-2"
            style={{ borderTop: "1px solid var(--border)", background: "var(--panel)" }}
          >
            <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>
              Page {pagination.page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <PageBtn label="‹" disabled={page <= 1} onClick={() => goToPage(page - 1)} title="Previous" />
              {getPageItems(page, totalPages).map((p, i) =>
                p === "…" ? (
                  <span key={`e${i}`} className="px-1 font-mono text-[10px]" style={{ color: "var(--text3)" }}>…</span>
                ) : (
                  <PageBtn key={p} label={String(p)} active={p === page} onClick={() => goToPage(p)} />
                ),
              )}
              <PageBtn label="›" disabled={page >= totalPages} onClick={() => goToPage(page + 1)} title="Next" />
            </div>
          </div>
        )}
      </div>

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
            }}
          >
            <span style={{ fontSize: 13 }}>{t.type === "success" ? "✓" : "✕"}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

function RefundDetail({ r }: { r: RefundItem }) {
  const cur = r.order?.currency ?? "INR";
  const b = r.breakdown;
  const progress = refundProgress(r);
  const rejected = r.status === "REJECTED";

  const steps: { label: string; when: string; state: "done" | "current" | "upcoming" | "failed" }[] = rejected
    ? [
        { label: "Refund requested", when: fmtDate(r.createdAt), state: "done" },
        { label: "Rejected by admin", when: "No money was returned", state: "failed" },
      ]
    : [
        { label: r.status === "PENDING" ? "Refund requested" : "Refund approved", when: fmtDate(r.createdAt), state: "done" },
        {
          label: "Sent to Razorpay / bank",
          when: r.processedAt ? fmtDate(r.processedAt) : "Waiting for approval",
          state: r.status === "PROCESSED" ? "done" : "current",
        },
        {
          label: "Credited to student",
          when: `Expected by ${fmtDate(r.estimatedBy)} (${r.etaDays} days)`,
          state: "upcoming",
        },
      ];
  const color = { done: "var(--green)", current: "#d97706", upcoming: "var(--text3)", failed: "var(--red)" };

  const row = (label: string, value: string, strong?: boolean, tone?: string) => (
    <div className="flex justify-between gap-6 py-1" style={{ borderTop: "1px solid var(--border)" }}>
      <span className="text-[11px]" style={{ color: "var(--text3)" }}>{label}</span>
      <span className={`font-mono text-[11.5px] tabular-nums ${strong ? "font-extrabold" : "font-semibold"}`} style={{ color: tone ?? "var(--text)" }}>{value}</span>
    </div>
  );

  return (
    <div className="grid gap-5 md:grid-cols-2 rounded-lg p-3.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div>
        <div className="font-mono text-[9.5px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>Amount — what the student paid vs. refunded</div>
        {b ? (
          <>
            {row("Item price", formatMoney(b.itemPrice, cur))}
            {b.couponDiscount > 0 && row(`Coupon discount${r.order.couponCode ? ` (${r.order.couponCode})` : ""} — never paid by student`, "− " + formatMoney(b.couponDiscount, cur), false, "var(--green)")}
            {b.gstAmount > 0 && row(`GST (${r.order.gstPercent}%)`, "+ " + formatMoney(b.gstAmount, cur))}
            {row("Student paid for this item", formatMoney(b.paid, cur), true)}
          </>
        ) : (
          row("Order total paid", formatMoney(r.order?.totalAmount, cur), true)
        )}
        {row("Refund amount", formatMoney(r.amount, cur), true, "var(--red)")}
        <div className="font-mono text-[9.5px] mt-1.5 leading-relaxed" style={{ color: "var(--text3)" }}>
          Refund = exactly what the student paid after the coupon cut (GST included) — never the list price.
          Whole order paid: {formatMoney(r.order?.totalAmount, cur)}.
        </div>
      </div>

      <div>
        <div className="font-mono text-[9.5px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>Status — step by step</div>
        {steps.map((st, i) => (
          <div key={st.label} className="flex gap-2.5">
            <div className="flex flex-col items-center">
              <span className="size-3.5 rounded-full text-[8px] font-bold flex items-center justify-center text-white shrink-0" style={{ background: st.state === "upcoming" ? "var(--border)" : color[st.state] }}>
                {st.state === "done" ? "✓" : st.state === "failed" ? "✕" : ""}
              </span>
              {i < steps.length - 1 && <span className="w-px flex-1 min-h-4" style={{ background: "var(--border)" }} />}
            </div>
            <div className="pb-2.5 -mt-0.5">
              <div className="text-[11.5px] font-semibold" style={{ color: st.state === "upcoming" ? "var(--text3)" : "var(--text)" }}>{st.label}</div>
              <div className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{st.when}</div>
            </div>
          </div>
        ))}
        <div className="font-mono text-[10px] font-semibold mt-0.5" style={{ color: progress.overdue ? "var(--red)" : "var(--text2)" }}>{progress.text}</div>
        {r.razorpayRefundId && (
          <div className="font-mono text-[9.5px] mt-1" style={{ color: "var(--text3)" }}>Razorpay refund ID: {r.razorpayRefundId}</div>
        )}
        {r.order?.razorpayPaymentId && (
          <div className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>Payment ID: {r.order.razorpayPaymentId}</div>
        )}
        <div className="text-[11px] mt-1.5" style={{ color: "var(--text2)" }}><b>Reason:</b> {r.reason}</div>
      </div>
    </div>
  );
}

function PageBtn({ label, onClick, disabled, active, title }: { label: string; onClick: () => void; disabled?: boolean; active?: boolean; title?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="min-w-[26px] h-7 px-1.5 rounded-md font-mono text-[10.5px] font-semibold cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        border: "1px solid var(--border)",
        background: active ? "var(--orange)" : "var(--surface)",
        color: active ? "#fff" : "var(--text2)",
      }}
    >
      {label}
    </button>
  );
}
