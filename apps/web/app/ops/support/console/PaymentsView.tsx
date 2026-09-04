"use client";

import { useCallback, useEffect, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { showToast } from "@/lib/toast";
import type { OrderStatus, PaymentDetail, PaymentRow, PaymentStats } from "../lib/types";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function fmtMoney(n: number, currency: string): string {
  const symbol = currency === "USD" ? "$" : "₹";
  return symbol + n.toLocaleString(currency === "USD" ? "en-US" : "en-IN", { maximumFractionDigits: 0 });
}
function initials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

const ORDER_STATUS_STYLE: Record<OrderStatus, { color: string; bg: string }> = {
  CREATED: { color: "var(--text3)", bg: "var(--panel)" },
  PAID: { color: "var(--green)", bg: "var(--green-d)" },
  FAILED: { color: "var(--red)", bg: "var(--red-d, rgba(220,38,38,.12))" },
  CANCELLED: { color: "var(--text3)", bg: "var(--panel)" },
  EXPIRED: { color: "var(--text3)", bg: "var(--panel)" },
  REFUND_REQUESTED: { color: "var(--amber, #b45309)", bg: "var(--amber-d, rgba(180,83,9,.12))" },
  REFUNDED: { color: "var(--orange)", bg: "var(--orange-d)" },
};

const STATUS_TABS: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "PAID", label: "Paid" },
  { key: "CREATED", label: "Created" },
  { key: "FAILED", label: "Failed" },
  { key: "REFUNDED", label: "Refunded" },
];

function StatusPill({ status }: { status: OrderStatus }) {
  const st = ORDER_STATUS_STYLE[status] ?? { color: "var(--text3)", bg: "var(--panel)" };
  return (
    <span className="font-mono text-[8px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: st.bg, color: st.color }}>{status}</span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="font-mono text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--text3)" }}>{children}</span>
      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
    </div>
  );
}
function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-[10.5px]" style={{ borderBottom: "1px solid var(--border)" }}>
      <span style={{ color: "var(--text3)" }}>{label}</span>
      <span className={mono ? "font-mono" : ""} style={{ color: "var(--text)" }}>{value}</span>
    </div>
  );
}

export default function PaymentsView() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [stats, setStats] = useState<PaymentStats>({});
  const [loadingList, setLoadingList] = useState(true);

  const [selId, setSelId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PaymentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const p = new URLSearchParams({ limit: "50" });
      if (status) p.set("status", status);
      if (q.trim()) p.set("q", q.trim());
      const [listRes, statsRes] = await Promise.all([
        opsFetch(`/api/support/staff/payments?${p}`),
        opsFetch(`/api/support/staff/payments/stats`),
      ]);
      if (listRes.ok) setRows((await listRes.json()).data ?? []);
      if (statsRes.ok) setStats(await statsRes.json());
    } finally {
      setLoadingList(false);
    }
  }, [status, q]);

  useEffect(() => { loadList(); }, [loadList]);

  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const r = await opsFetch(`/api/support/staff/payments/${id}`);
      if (r.ok) setDetail(await r.json());
      else showToast("Couldn't load this order");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selId) loadDetail(selId);
    else setDetail(null);
  }, [selId, loadDetail]);

  const paidCount = stats.PAID?.count ?? 0;
  const paidTotal = stats.PAID?.total ?? 0;

  return (
    <div className="h-full flex" style={{ background: "var(--bg)" }}>
      {/* ── order list ── */}
      <div className="shrink-0 flex flex-col" style={{ width: 400, borderRight: "1px solid var(--border)", background: "var(--surface)" }}>
        <div className="px-3.5 py-2.5 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="text-[13px] font-extrabold" style={{ color: "var(--text)" }}>💳 Payments</div>
          <div className="font-mono text-[9px] mt-0.5" style={{ color: "var(--text3)" }}>
            {paidCount} paid · {fmtMoney(paidTotal, "INR")} total — read only
          </div>
        </div>

        <div className="px-3 pt-2.5 flex gap-1 flex-wrap shrink-0">
          {STATUS_TABS.map((t) => (
            <button key={t.key} onClick={() => setStatus(t.key)}
              className="px-2 py-1 rounded-md text-[10px] font-semibold cursor-pointer"
              style={{
                background: status === t.key ? "var(--orange)" : "var(--panel)",
                color: status === t.key ? "#fff" : "var(--text2)",
                border: "1px solid var(--border)",
              }}>{t.label}</button>
          ))}
        </div>

        <div className="px-3 py-2 shrink-0">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student / razorpay id…"
            className="w-full text-[10.5px] rounded-md px-2 py-1.5 outline-none"
            style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }} />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="p-4 text-[11px]" style={{ color: "var(--text3)" }}>Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-4 text-[11px]" style={{ color: "var(--text3)" }}>No orders match these filters.</div>
          ) : rows.map((o) => {
            const sel = selId === o.id;
            const label = o.items.map((i) => i.title).join(", ") || "—";
            return (
              <button key={o.id} onClick={() => setSelId(o.id)}
                className="w-full text-left px-3 py-2.5 flex flex-col gap-1 cursor-pointer"
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: sel ? "var(--orange-d)" : "transparent",
                  borderLeft: sel ? "2px solid var(--orange)" : "2px solid transparent",
                }}>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[7.5px] font-bold shrink-0"
                    style={{ background: "var(--blue-d)", color: "var(--blue)" }}>{initials(o.student.name)}</span>
                  <span className="text-[11.5px] font-semibold truncate" style={{ color: "var(--text)" }}>{o.student.name}</span>
                  <span className="ml-auto font-mono text-[9.5px] font-bold" style={{ color: "var(--green)" }}>{fmtMoney(o.totalAmount, o.currency)}</span>
                </div>
                <div className="text-[10px] truncate pl-6.5" style={{ color: "var(--text3)", paddingLeft: 26 }}>{label}</div>
                <div className="flex items-center gap-1.5" style={{ paddingLeft: 26 }}>
                  <StatusPill status={o.status} />
                  <span className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{o.razorpayOrderId.slice(0, 14)}</span>
                  <span className="ml-auto font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{fmtDate(o.createdAt)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── order detail (read-only) ── */}
      <div className="flex-1 overflow-y-auto">
        {!selId ? (
          <div className="h-full flex items-center justify-center text-[12px]" style={{ color: "var(--text3)" }}>
            Select an order to see full details.
          </div>
        ) : loadingDetail || !detail ? (
          <div className="h-full flex items-center justify-center text-[12px]" style={{ color: "var(--text3)" }}>Loading order…</div>
        ) : (
          <div>
            <div className="px-4 py-3 flex items-start gap-3 sticky top-0 z-10"
              style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
              <span className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{ background: "var(--blue-d)", color: "var(--blue)" }}>{initials(detail.student.name)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-bold truncate" style={{ color: "var(--text)" }}>{detail.student.name}</span>
                  <StatusPill status={detail.status} />
                  <span className="font-mono text-[8px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: "var(--panel)", color: "var(--text3)" }}>view only</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-[10.5px]" style={{ color: "var(--text3)" }}>
                  <span>✉ {detail.student.email}</span>
                  {detail.student.phone && <span>☎ {detail.student.phone}</span>}
                  <span>placed {fmtDateTime(detail.createdAt)}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-[16px] font-extrabold" style={{ color: "var(--green)" }}>{fmtMoney(detail.totalAmount, detail.currency)}</div>
                <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{detail.gatewayType.toLowerCase()}</div>
              </div>
            </div>

            <div className="p-4 mx-auto flex gap-5 flex-wrap" style={{ maxWidth: 820 }}>
              <div className="flex-1 min-w-[320px]">
                {/* items */}
                <SectionTitle>Items ({detail.items.length})</SectionTitle>
                <div className="flex flex-col gap-2 mb-5">
                  {detail.items.map((i) => (
                    <div key={i.id} className="rounded-lg p-3 flex items-center gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      {i.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={i.image} alt="" className="w-10 h-10 rounded-md object-cover shrink-0" style={{ border: "1px solid var(--border)" }} />
                      ) : (
                        <span className="w-10 h-10 rounded-md flex items-center justify-center text-[16px] shrink-0" style={{ background: "var(--panel)" }}>
                          {i.type === "course" ? "🎓" : i.type === "project" ? "🚀" : "❓"}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-bold truncate" style={{ color: "var(--text)" }}>{i.title}</div>
                        <div className="font-mono text-[9px] uppercase" style={{ color: "var(--text3)" }}>{i.type}{i.status ? ` · ${i.status}` : ""}</div>
                      </div>
                      <span className="font-mono text-[11px] font-bold shrink-0" style={{ color: "var(--text2)" }}>{fmtMoney(i.price, i.currency)}</span>
                    </div>
                  ))}
                </div>

                {/* refunds */}
                <SectionTitle>Refunds ({detail.refunds.length})</SectionTitle>
                {detail.refunds.length === 0 ? (
                  <div className="text-[11px] mb-5" style={{ color: "var(--text3)" }}>No refunds on this order.</div>
                ) : (
                  <div className="flex flex-col gap-2 mb-5">
                    {detail.refunds.map((r) => (
                      <div key={r.id} className="rounded-lg p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10.5px] font-bold" style={{ color: "var(--orange)" }}>{fmtMoney(r.amount, detail.currency)}</span>
                          <span className="font-mono text-[8px] font-bold uppercase px-1.5 py-0.5 rounded"
                            style={{
                              background: r.status === "PROCESSED" ? "var(--green-d)" : r.status === "REJECTED" ? "var(--red-d, rgba(220,38,38,.12))" : "var(--amber-d, rgba(180,83,9,.12))",
                              color: r.status === "PROCESSED" ? "var(--green)" : r.status === "REJECTED" ? "var(--red)" : "var(--amber, #b45309)",
                            }}>{r.status}</span>
                          <span className="ml-auto font-mono text-[9px]" style={{ color: "var(--text3)" }}>{fmtDate(r.createdAt)}</span>
                        </div>
                        <div className="text-[11px] mt-1" style={{ color: "var(--text2)" }}>{r.reason}{r.on ? ` — ${r.on}` : ""}</div>
                        <div className="text-[9.5px] mt-1" style={{ color: "var(--text3)" }}>initiated by {r.initiatedBy.name}{r.processedAt ? ` · processed ${fmtDate(r.processedAt)}` : ""}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* enrollments granted */}
                <SectionTitle>Access granted ({detail.enrollments.length})</SectionTitle>
                {detail.enrollments.length === 0 ? (
                  <div className="text-[11px]" style={{ color: "var(--text3)" }}>No enrollment record linked to this order.</div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {detail.enrollments.map((e) => (
                      <div key={e.id} className="rounded-lg px-3 py-2 flex items-center gap-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <span className="font-mono text-[8px] font-bold uppercase px-1.5 py-0.5 rounded"
                          style={{ background: e.status === "active" ? "var(--green-d)" : "var(--panel)", color: e.status === "active" ? "var(--green)" : "var(--text3)" }}>{e.status}</span>
                        <span className="text-[10.5px] flex-1" style={{ color: "var(--text2)" }}>course {e.courseId.slice(0, 8)}</span>
                        <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>{fmtDate(e.enrolledAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-[280px] shrink-0">
                {/* amount breakdown */}
                <SectionTitle>Amount breakdown</SectionTitle>
                <div className="rounded-lg p-3 mb-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <Row label="Subtotal" value={fmtMoney(detail.subtotal, detail.currency)} mono />
                  {detail.discountAmount > 0 && <Row label={`Discount${detail.discountReason ? ` (${detail.discountReason})` : ""}`} value={`− ${fmtMoney(detail.discountAmount, detail.currency)}`} mono />}
                  <Row label={`GST (${detail.gstPercent}%)`} value={fmtMoney(detail.gstAmount, detail.currency)} mono />
                  <div className="flex items-center justify-between pt-1.5">
                    <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>Total</span>
                    <span className="font-mono text-[13px] font-extrabold" style={{ color: "var(--green)" }}>{fmtMoney(detail.totalAmount, detail.currency)}</span>
                  </div>
                </div>

                {/* payment info */}
                <SectionTitle>Payment info</SectionTitle>
                <div className="rounded-lg p-3 mb-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <Row label="Razorpay order" value={detail.razorpayOrderId} mono />
                  {detail.razorpayPaymentId && <Row label="Razorpay payment" value={detail.razorpayPaymentId} mono />}
                  <Row label="Method" value={detail.paymentMethod ?? "—"} />
                  {detail.batchMode && <Row label="Batch mode" value={detail.batchMode} />}
                  {detail.salesperson && <Row label="Sold by" value={detail.salesperson.name} />}
                  {detail.invoice && <Row label="Invoice" value={detail.invoice.invoiceNumber} mono />}
                </div>

                {/* billing */}
                <SectionTitle>Billing details</SectionTitle>
                <div className="rounded-lg p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <Row label="Name" value={detail.billing.fullName ?? "—"} />
                  <Row label="Email" value={detail.billing.email ?? "—"} />
                  <Row label="Phone" value={detail.billing.phone ?? "—"} />
                  <Row label="Address" value={[detail.billing.address, detail.billing.city, detail.billing.state, detail.billing.pincode].filter(Boolean).join(", ") || "—"} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
