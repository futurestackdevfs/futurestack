"use client";

import { useCallback, useEffect, useState } from "react";
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
  order: { id: string; totalAmount: number; currency: string; razorpayPaymentId: string | null };
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
    PENDING: { label: "Pending", color: "#d97706", bg: "rgba(217,119,6,.12)" },
    PROCESSED: { label: "Processed", color: "var(--green)", bg: "var(--green-d)" },
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

function formatMoney(n: number | null | undefined) {
  const v = Number.isFinite(n) ? n ?? 0 : 0;
  return "₹" + v.toLocaleString("en-IN");
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
                {["Date", "Student", "Item", "Order", "Amount", "Reason", "Status", "Processed By"].map((h) => (
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
              {filteredRefunds.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-2.5 py-[7px] whitespace-nowrap">
                    <div className="font-mono text-[10px]" style={{ color: "var(--text2)" }}>
                      {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
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
                  <td className="px-2.5 py-[7px] font-mono text-[11.5px] font-bold tabular-nums" style={{ color: "var(--red)" }}>
                    {formatMoney(r.amount)}
                  </td>
                  <td className="px-2.5 py-[7px]">
                    <div className="text-[11px] max-w-[200px] truncate" style={{ color: "var(--text2)" }}>{r.reason}</div>
                  </td>
                  <td className="px-2.5 py-[7px]"><StatusBadge status={r.status} /></td>
                  <td className="px-2.5 py-[7px]">
                    <div className="text-[11px] font-medium" style={{ color: "var(--text2)" }}>{r.initiatedBy?.name ?? "—"}</div>
                  </td>
                </tr>
              ))}
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
