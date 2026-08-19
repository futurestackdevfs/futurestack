"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";

interface PaymentOrder {
  id: string;
  orderNo: string;
  status: string;
  currency: string;
  gatewayType: string;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  createdAt: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  billing: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    address: string | null;
  };
  student: { id: string; name: string; email: string } | null;
  couponCode: string | null;
  enrollmentsCount: number;
  items: { courseId: string; title: string; priceAtPurchase: number }[];
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

interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

interface PaymentsData {
  summary: PaymentsSummary;
  orders: PaymentOrder[];
  pagination: Pagination;
}

interface TrainerShare {
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
  trainers: TrainerShare[];
  totals: {
    gross: number;
    platformCut: number;
    trainerShare: number;
    enrollments: number;
  };
  count: number;
}

interface Tab {
  key: string;
  label: string;
  value?: string;
}

const TABS: Tab[] = [
  { key: "all", label: "All" },
  { key: "paid", label: "Success", value: "PAID" },
  { key: "failed", label: "Failed", value: "FAILED" },
  { key: "expired", label: "Expired", value: "EXPIRED" },
  { key: "created", label: "Pending", value: "CREATED" },
  { key: "cancelled", label: "Cancelled", value: "CANCELLED" },
];

const PER_PAGE = 10;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    PAID: { label: "Paid", color: "var(--green)", bg: "var(--green-d)" },
    FAILED: { label: "Failed", color: "var(--red)", bg: "var(--red-d)" },
    EXPIRED: { label: "Expired", color: "var(--amber)", bg: "rgba(217,119,6,.12)" },
    CANCELLED: { label: "Cancelled", color: "var(--text3)", bg: "var(--bg2)" },
    CREATED: { label: "Pending", color: "var(--blue)", bg: "var(--blue-d)" },
  };
  const s = map[status] ?? { label: status, color: "var(--text3)", bg: "var(--bg2)" };
  return (
    <span
      className="font-mono text-[9.5px] font-bold px-2 py-[3px] rounded-full whitespace-nowrap"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  );
}

function formatMoney(n: number | null | undefined, currency: string) {
  const v = Number.isFinite(n) ? n ?? 0 : 0;
  return currency === "USD" ? "$" + v.toFixed(2) : "₹" + v.toLocaleString("en-IN");
}

/** Compact page-number list with ellipsis collapse (e.g. 1 … 4 5 6 … 20). */
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

export default function PaymentsManager({ token, searchQuery = "" }: { token: string; searchQuery?: string }) {
  const [data, setData] = useState<PaymentsData | null>(null);
  const [trainers, setTrainers] = useState<TrainerBreakdown | null>(null);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [trainerPage, setTrainerPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "danger" }[]>([]);

  const filteredOrders = useMemo<PaymentOrder[]>(() => {
    const rows = data?.orders ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((o) =>
      [
        o.orderNo,
        o.id,
        o.student?.name,
        o.student?.email,
        o.billing.fullName,
        o.billing.email,
        o.razorpayOrderId,
        o.razorpayPaymentId,
        o.couponCode,
        ...o.items.map((i) => i.title),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [data, searchQuery]);

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
        const res = await opsFetch(`/api/admin/payments?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load payments");
        const body = (await res.json()) as PaymentsData;
        setData(body);
        setLoading(false);
        return body;
      } catch (e: unknown) {
        addToast(e instanceof Error ? e.message : "Failed to load payments", "danger");
        setLoading(false);
        return null;
      }
    },
    [token],
  );

  const loadTrainers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await opsFetch("/api/admin/payments/trainers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load trainer breakdown");
      setTrainers((await res.json()) as TrainerBreakdown);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : "Failed to load trainer breakdown", "danger");
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const body = await load(status, page);
      if (!cancelled && body) setData(body);
    })();
    loadTrainers();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, status, page]);

  const summary = data?.summary;
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const from = pagination && pagination.total > 0 ? (pagination.page - 1) * pagination.perPage + 1 : 0;
  const to = pagination ? Math.min(pagination.page * pagination.perPage, pagination.total) : 0;

  const TRAINER_PER_PAGE = 10;
  const trainerList = trainers?.trainers ?? [];
  const trainerTotalPages = Math.max(1, Math.ceil(trainerList.length / TRAINER_PER_PAGE));
  const trainerFrom = trainerList.length > 0 ? (trainerPage - 1) * TRAINER_PER_PAGE + 1 : 0;
  const trainerTo = Math.min(trainerPage * TRAINER_PER_PAGE, trainerList.length);
  const trainerPageRows = trainerList.slice((trainerPage - 1) * TRAINER_PER_PAGE, trainerPage * TRAINER_PER_PAGE);

  function goToTrainerPage(p: number) {
    if (p < 1 || p > trainerTotalPages || p === trainerPage) return;
    setTrainerPage(p);
  }

  function switchStatus(next?: string) {
    setExpandedId(null);
    setPage(1);
    setStatus(next);
  }

  function goToPage(p: number) {
    if (p < 1 || p > totalPages || p === page) return;
    setExpandedId(null);
    setPage(p);
  }

  function kpi(label: string, value: string | number, color: string) {
    return (
      <div className="flex-1 min-w-[112px] rounded-xl px-3.5 py-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="text-[13px] font-extrabold tracking-tight tabular-nums" style={{ color }}>{String(value)}</div>
        <div className="text-[10px] font-medium mt-0.5 uppercase tracking-wider" style={{ color: "var(--text3)" }}>{label}</div>
      </div>
    );
  }

  function exportCsv() {
    if (!data?.orders.length) return;
    const rows = data.orders.map((o) => [
      o.orderNo,
      o.student?.name ?? "",
      o.student?.email ?? "",
      o.status,
      o.currency,
      String(o.subtotal),
      String(o.discountAmount),
      String(o.totalAmount),
      new Date(o.createdAt).toISOString().slice(0, 10),
      o.razorpayPaymentId ?? "",
    ]);
    const csv = [
      ["OrderNo", "Student", "Email", "Status", "Currency", "Subtotal", "Discount", "Total", "Date", "PaymentId"],
      ...rows,
    ]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(`Exported ${data.orders.length} rows (page ${page})`);
  }

  return (
    <div className="p-4 pb-16">
      <div className="flex items-baseline gap-2.5 mb-4">
        <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
          💵 Payments
        </span>
        <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
          full order book — success · failed · expired · cancelled
        </span>
      </div>

      {loading && !data ? (
        <div className="p-8 text-center font-mono text-[11px]" style={{ color: "var(--text3)" }}>
          Loading payments...
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="flex flex-wrap gap-2.5 mb-4">
            {kpi("Total Orders", summary?.total ?? 0, "var(--text)")}
            {kpi("Revenue (Paid)", formatMoney(summary?.totalRevenue, "INR"), "var(--green)")}
            {kpi("Success", summary?.paid ?? 0, "var(--green)")}
            {kpi("Failed", summary?.failed ?? 0, "var(--red)")}
            {kpi("Expired", summary?.expired ?? 0, "var(--amber)")}
            {kpi("Cancelled", summary?.cancelled ?? 0, "var(--text3)")}
            {kpi("Pending", summary?.created ?? 0, "var(--blue)")}
          </div>

          {/* Trainer share breakdown */}
          <div
            className="rounded-xl overflow-hidden mb-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}
          >
            <div
              className="flex items-center justify-between px-3.5 py-2"
              style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}
            >
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>
                🎓 Trainer Share Breakdown
              </span>
              <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>
                {trainerList.length > 0 ? `${trainerFrom}–${trainerTo} of ${trainerList.length} trainers` : "0 trainers"} · {TRAINER_PER_PAGE}/page
              </span>
            </div>

            {trainerList.length === 0 ? (
              <div className="px-3.5 py-8 text-center font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
                No revenue generated yet — trainer shares will appear here once orders are paid.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 px-3.5 py-2.5" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                  <div className="flex items-center gap-5 rounded-lg px-3 py-2" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
                    <div>
                      <div className="text-[15px] font-extrabold tabular-nums" style={{ color: "var(--text)" }}>{formatMoney(trainers?.totals.gross, "INR")}</div>
                      <div className="text-[9px] font-medium mt-0.5 uppercase tracking-wider" style={{ color: "var(--text3)" }}>Total Gross</div>
                    </div>
                    <div className="pl-5" style={{ borderLeft: "1px solid var(--border)" }}>
                      <div className="text-[15px] font-extrabold tabular-nums" style={{ color: "var(--green)" }}>{formatMoney(trainers?.totals.trainerShare, "INR")}</div>
                      <div className="text-[9px] font-medium mt-0.5 uppercase tracking-wider" style={{ color: "var(--text3)" }}>Trainer Share</div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[760px]" style={{ borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(148,163,184,.05)" }}>
                        {["Trainer", "Share %", "Enrollments", "Gross", "Platform Cut", "Trainer Share"].map((h) => (
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
                      {trainerPageRows.map((t) => (
                        <tr key={t.trainerId} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td className="px-2.5 py-[7px]">
                            <div className="text-[11.5px] font-semibold" style={{ color: "var(--text)" }}>{t.trainerName}</div>
                            <div className="font-mono text-[9px] max-w-[200px] truncate" style={{ color: "var(--text3)" }}>{t.trainerEmail}</div>
                          </td>
                          <td className="px-2.5 py-[7px] font-mono text-[10.5px]" style={{ color: "var(--text2)" }}>
                            {t.trainerSharePercent != null ? `${t.trainerSharePercent}%` : "—"}
                          </td>
                          <td className="px-2.5 py-[7px] font-mono text-[10.5px] tabular-nums" style={{ color: "var(--text2)" }}>
                            {t.enrollments}
                          </td>
                          <td className="px-2.5 py-[7px] font-mono text-[10.5px] tabular-nums whitespace-nowrap" style={{ color: "var(--text2)" }}>
                            {formatMoney(t.gross, "INR")}
                          </td>
                          <td className="px-2.5 py-[7px] font-mono text-[10.5px] tabular-nums whitespace-nowrap" style={{ color: "var(--text3)" }}>
                            {formatMoney(t.platformCut, "INR")}
                          </td>
                          <td className="px-2.5 py-[7px] font-mono text-[11.5px] font-bold tabular-nums whitespace-nowrap" style={{ color: "var(--green)" }}>
                            {formatMoney(t.trainerShare, "INR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {trainerTotalPages > 1 && (
                  <div
                    className="flex items-center justify-between flex-wrap gap-2 px-3.5 py-2"
                    style={{ borderTop: "1px solid var(--border)", background: "var(--panel)" }}
                  >
                    <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>
                      Page {trainerPage} of {trainerTotalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <PageBtn label="‹" disabled={trainerPage <= 1} onClick={() => goToTrainerPage(trainerPage - 1)} title="Previous" />
                      {getPageItems(trainerPage, trainerTotalPages).map((p, i) =>
                        p === "…" ? (
                          <span key={`e${i}`} className="px-1 font-mono text-[10px]" style={{ color: "var(--text3)" }}>…</span>
                        ) : (
                          <PageBtn key={p} label={String(p)} active={p === trainerPage} onClick={() => goToTrainerPage(p)} />
                        ),
                      )}
                      <PageBtn label="›" disabled={trainerPage >= trainerTotalPages} onClick={() => goToTrainerPage(trainerPage + 1)} title="Next" />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Filter tabs + actions */}
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
                    onClick={() => switchStatus(t.value ? t.value : undefined)}
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
            <div className="flex gap-1.5">
              <button
                onClick={() => load(status, page)}
                className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer"
                style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
              >
                ↻ Refresh
              </button>
              <button
                onClick={exportCsv}
                className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer"
                style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
              >
                ⇩ Export CSV
              </button>
            </div>
          </div>

          {/* Modern thin table */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}
          >
            <div
              className="flex items-center justify-between px-3.5 py-2"
              style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}
            >
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>
                {loading && data ? "syncing…" : `${pagination ? `${from}–${to}` : "0"} of ${pagination?.total ?? 0} records`}
              </span>
              <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>payment ledger · {PER_PAGE}/page</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[880px]" style={{ borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(148,163,184,.05)" }}>
                    {["Order", "Date", "Student", "Courses", "Subtotal", "Discount", "Total", "Status", "Payment"].map((h) => (
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
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-3 py-10 text-center font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
                        {data?.orders.length === 0
                          ? `No payments${status ? ` with status ${status}` : ""} found.`
                          : `No payments match "${searchQuery}".`}
                      </td>
                    </tr>
                  )}
                  {filteredOrders.map((o) => {
                    const open = expandedId === o.id;
                    return (
                      <OrderRow
                        key={o.id}
                        order={o}
                        open={open}
                        onToggle={() => setExpandedId(open ? null : o.id)}
                      />
                    );
                  })}
                  {loading && data && filteredOrders.length > 0 && (
                    <tr>
                      <td colSpan={9} className="px-3 py-2 text-center font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>
                        syncing…
                      </td>
                    </tr>
                  )}
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
                      <span key={`e${i}`} className="px-1 font-mono text-[10px]" style={{ color: "var(--text3)" }}>
                        …
                      </span>
                    ) : (
                      <PageBtn
                        key={p}
                        label={String(p)}
                        active={p === page}
                        onClick={() => goToPage(p)}
                      />
                    ),
                  )}
                  <PageBtn label="›" disabled={page >= totalPages} onClick={() => goToPage(page + 1)} title="Next" />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Toast shell */}
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

function PageBtn({
  label,
  onClick,
  disabled,
  active,
  title,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
}) {
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

function OrderRow({
  order,
  open,
  onToggle,
}: {
  order: PaymentOrder;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer"
        style={{ borderBottom: open ? "none" : "1px solid var(--border)", background: open ? "var(--panel)" : "transparent" }}
        onMouseEnter={(e) => {
          if (!open) (e.currentTarget as HTMLElement).style.background = "rgba(148,163,184,.06)";
        }}
        onMouseLeave={(e) => {
          if (!open) (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
      >
        <td className="px-2.5 py-[7px]">
          <span className="font-mono text-[10.5px] font-bold" style={{ color: "var(--blue)" }}>{order.orderNo}</span>
          <div className="font-mono text-[8.5px] text-[var(--muted)] max-w-[120px] truncate">{order.id}</div>
        </td>
        <td className="px-2.5 py-[7px] font-mono text-[10px] whitespace-nowrap" style={{ color: "var(--text2)" }}>
          {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        </td>
        <td className="px-2.5 py-[7px]">
          <div className="text-[11.5px] font-semibold" style={{ color: "var(--text)" }}>{order.student?.name ?? "—"}</div>
          <div className="font-mono text-[9px] max-w-[160px] truncate" style={{ color: "var(--text3)" }}>{order.student?.email ?? ""}</div>
        </td>
        <td className="px-2.5 py-[7px]">
          <span className="font-mono text-[10.5px] tabular-nums" style={{ color: "var(--text2)" }}>{order.items.length}</span>
          <div className="font-mono text-[8.5px]" style={{ color: "var(--muted)" }}>{order.enrollmentsCount} enrolled</div>
        </td>
        <td className="px-2.5 py-[7px] font-mono text-[10.5px] tabular-nums whitespace-nowrap" style={{ color: "var(--text2)" }}>
          {formatMoney(order.subtotal, order.currency)}
        </td>
        <td className="px-2.5 py-[7px] font-mono text-[10.5px] tabular-nums whitespace-nowrap" style={{ color: order.discountAmount > 0 ? "var(--green)" : "var(--text2)" }}>
          {order.discountAmount > 0 ? `−${formatMoney(order.discountAmount, order.currency)}` : "—"}
        </td>
        <td className="px-2.5 py-[7px] font-mono text-[11.5px] font-bold tabular-nums" style={{ color: "var(--text)" }}>
          {formatMoney(order.totalAmount, order.currency)}
        </td>
        <td className="px-2.5 py-[7px]"><StatusBadge status={order.status} /></td>
        <td className="px-2.5 py-[7px] font-mono text-[9.5px] whitespace-nowrap" style={{ color: "var(--text3)" }}>
          {order.razorpayPaymentId ? order.razorpayPaymentId.slice(0, 14) + "…" : "—"}
        </td>
      </tr>
      {open && (
        <tr style={{ borderBottom: "1px solid var(--border)" }}>
          <td colSpan={12} className="px-4 py-3" style={{ background: "var(--panel)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontSize: 12 }}>
              <div>
                <div className="font-mono text-[9px] font-bold uppercase tracking-[.08em] mb-1" style={{ color: "var(--text3)" }}>
                  Courses
                </div>
                {order.items.length === 0 && <div style={{ color: "var(--text3)" }}>No items</div>}
                {order.items.map((it, i) => (
                  <div key={it.courseId} className="flex justify-between py-0.5" style={{ color: "var(--text2)" }}>
                    <span className="mr-3">{i + 1}. {it.title}</span>
                    <span className="font-mono whitespace-nowrap">{formatMoney(it.priceAtPurchase, order.currency)}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="font-mono text-[9px] font-bold uppercase tracking-[.08em] mb-1" style={{ color: "var(--text3)" }}>
                  Details
                </div>
                <DetailRow label="Razorpay order" value={order.razorpayOrderId} mono />
                <DetailRow label="Payment id" value={order.razorpayPaymentId ?? "—"} mono />
                <DetailRow label="Gateway" value={order.gatewayType} />
                <DetailRow label="Coupon" value={order.couponCode ?? "—"} />
                <DetailRow label="Currency" value={order.currency} />
                <DetailRow label="Customer" value={order.billing.fullName ?? order.student?.email ?? "—"} />
                {order.billing.phone && <DetailRow label="Phone" value={order.billing.phone} mono />}
                {order.billing.city && (
                  <DetailRow label="City / State" value={`${order.billing.city}, ${order.billing.state ?? ""} · ${order.billing.pincode ?? ""}`} />
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-0.5" style={{ color: "var(--text2)" }}>
      <span className="text-[var(--text3)]">{label}</span>
      <span className={`${mono ? "font-mono text-[10.5px]" : ""} text-right break-all`}>{value}</span>
    </div>
  );
}