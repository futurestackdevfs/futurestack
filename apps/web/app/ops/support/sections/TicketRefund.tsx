"use client";

import { useCallback, useEffect, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { showToast } from "@/lib/toast";

/* ── API shapes ─────────────────────────────────────────── */

interface RefundRow {
  id: string;
  status: "PENDING" | "PROCESSED" | "REJECTED" | string;
  amount: number;
  reason: string;
  createdAt: string;
  processedAt: string | null;
  rejectedAt: string | null;
  rejectReason: string | null;
  estimatedBy: string;
  order: { currency: string } | null;
  course: { title: string } | null;
  project: { name: string } | null;
}

interface OptionItem {
  courseId: string | null;
  projectId: string | null;
  title: string;
  maxRefund: number;
  refundStatus: "NONE" | "PENDING" | "PROCESSED";
  refundable: boolean;
}
interface OptionOrder {
  orderId: string;
  orderRef: string;
  createdAt: string;
  currency: string;
  total: number;
  online: boolean;
  items: OptionItem[];
}

/* ── helpers ─────────────────────────────────────────────── */

export const money = (n: number, cur = "INR") => (cur === "USD" ? "$" : "₹") + n.toLocaleString(cur === "USD" ? "en-US" : "en-IN");
const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export const REFUND_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: "Refund initiated", color: "#d97706", bg: "rgba(217,119,6,.12)" },
  PROCESSED: { label: "Refund confirmed", color: "var(--green)", bg: "var(--green-d)" },
  CANCELLED: { label: "Refund cancelled", color: "var(--text3)", bg: "var(--bg2)" },
  REJECTED: { label: "Refund rejected", color: "var(--red)", bg: "var(--red-d, rgba(220,38,38,.12))" },
};


/* ── component ───────────────────────────────────────────── */

/**
 * Refund block for a support ticket: shows every refund raised from this ticket with
 * its status, lets the agent raise a new one (an admin approves it) and cancel one
 * that is still waiting for approval.
 */
export default function TicketRefund({
  ticketId,
  studentId,
  studentName,
  closed,
  onChanged,
}: {
  ticketId: string;
  studentId: string;
  studentName: string;
  closed?: boolean;
  onChanged?: () => void;
}) {
  const [rows, setRows] = useState<RefundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await opsFetch(`/api/admin/refunds?ticketId=${encodeURIComponent(ticketId)}&perPage=50`);
      if (r.ok) setRows(((await r.json()) as { refunds: RefundRow[] }).refunds ?? []);
    } catch {
      /* non-fatal: the block just stays as it was */
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  const [cancelling, setCancelling] = useState<string | null>(null);

  async function cancelRequest(id: string) {
    if (cancelling) return;
    if (!window.confirm("Cancel this refund request? The admin will no longer see it and the customer will be told on this ticket.")) return;
    setCancelling(id);
    try {
      const res = await opsFetch(`/api/admin/refunds/${id}/cancel`, { method: "PATCH" });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(body.message || "Could not cancel the request");
      showToast("Refund request cancelled");
      await load();
      onChanged?.();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not cancel the request");
    } finally {
      setCancelling(null);
    }
  }

  useEffect(() => {
    setLoading(true);
    load();
    // Statuses change on the admin side — keep this block roughly live.
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="rounded-lg" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 px-2.5 py-2">
        <span className="text-[12px]">💸</span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold" style={{ color: "var(--text)" }}>Refunds</div>
          <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>
            {loading ? "loading…" : rows.length === 0 ? "none raised from this ticket" : `${rows.length} raised from this ticket`}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={closed}
          title={closed ? "Reopen the ticket to raise a refund" : `Raise a refund for ${studentName}`}
          className="text-[10px] font-bold px-2.5 py-1 rounded-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          style={{ background: "var(--orange)", color: "#fff", border: "none" }}
        >
          + Refund
        </button>
      </div>

      {rows.length > 0 && (
        <div className="flex flex-col max-h-[170px] overflow-y-auto" style={{ borderTop: "1px solid var(--border)" }}>
          {rows.map((r) => {
            const st = REFUND_STATUS[r.status] ?? { label: r.status, color: "var(--text3)", bg: "var(--bg2)" };
            return (
              <div key={r.id} className="px-2.5 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold truncate flex-1" style={{ color: "var(--text)" }}>
                    {r.course?.title ?? r.project?.name ?? "Item"}
                  </span>
                  <span className="font-mono text-[11px] font-bold tabular-nums shrink-0" style={{ color: "var(--text)" }}>
                    {money(r.amount, r.order?.currency)}
                  </span>
                </div>
                <div className="mt-1">
                  <span className="font-mono text-[9px] font-bold px-1.5 py-[2px] rounded-full" style={{ color: st.color, background: st.bg }}>
                    {st.label}
                  </span>
                </div>
                {r.status === "PENDING" && (
                  <button
                    type="button"
                    onClick={() => cancelRequest(r.id)}
                    disabled={cancelling === r.id}
                    className="mt-1.5 text-[10px] font-bold px-2.5 py-1 rounded-md cursor-pointer disabled:opacity-50"
                    style={{ background: "transparent", color: "var(--red)", border: "1px solid var(--red)" }}
                  >
                    {cancelling === r.id ? "Cancelling…" : "✕ Cancel request"}
                  </button>
                )}
                {r.status === "REJECTED" && r.rejectReason && (
                  <div className="text-[10.5px] mt-1 leading-snug" style={{ color: "var(--text2)" }}>
                    Reason: {r.rejectReason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <RefundModal
          ticketId={ticketId}
          studentId={studentId}
          studentName={studentName}
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            load();
            onChanged?.();
          }}
        />
      )}
    </div>
  );
}

/* ── modal ───────────────────────────────────────────────── */

function RefundModal({
  ticketId,
  studentId,
  studentName,
  onClose,
  onDone,
}: {
  ticketId: string;
  studentId: string;
  studentName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [orders, setOrders] = useState<OptionOrder[] | null>(null);
  const [error, setError] = useState("");
  const [pick, setPick] = useState<{ orderId: string; item: OptionItem } | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    opsFetch(`/api/admin/refunds/options?studentId=${encodeURIComponent(studentId)}`)
      .then(async (r) => {
        if (!alive) return;
        if (!r.ok) throw new Error("Could not load this student's orders");
        setOrders(((await r.json()) as { orders: OptionOrder[] }).orders);
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "Could not load orders"));
    return () => {
      alive = false;
    };
  }, [studentId]);

  const cur = orders?.find((o) => o.orderId === pick?.orderId)?.currency ?? "INR";
  const max = pick?.item.maxRefund ?? 0;
  const amt = amount.trim() === "" ? max : Number(amount);
  const amountBad = !pick || !Number.isFinite(amt) || amt < 1 || amt > max + 0.001;
  const canSubmit = !!pick && !amountBad && reason.trim().length >= 5 && !saving;

  function choose(orderId: string, item: OptionItem) {
    setPick({ orderId, item });
    setAmount(String(item.maxRefund));
  }

  async function submit() {
    if (!pick || !canSubmit) return;
    setSaving(true);
    setError("");
    try {
      const res = await opsFetch("/api/admin/refunds/request", {
        method: "POST",
        body: JSON.stringify({
          orderId: pick.orderId,
          ...(pick.item.courseId ? { courseId: pick.item.courseId } : { projectId: pick.item.projectId }),
          amount: amt,
          reason: reason.trim(),
          ticketId,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
      if (!res.ok) {
        const m = Array.isArray(body.message) ? body.message[0] : body.message;
        throw new Error(m || "Could not raise the refund");
      }
      showToast("Refund initiated — sent to admin for approval");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not raise the refund");
    } finally {
      setSaving(false);
    }
  }

  const why = (o: OptionOrder, it: OptionItem) =>
    it.refundStatus === "PENDING"
      ? "Request already pending"
      : it.refundStatus === "PROCESSED"
        ? "Already refunded"
        : !o.online
          ? "Cash / offline payment — refund manually"
          : "Nothing left to refund";

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.5)" }} onClick={onClose}>
      <div
        className="rounded-xl w-[520px] max-w-full max-h-[90vh] flex flex-col"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 24px 48px rgba(0,0,0,.3)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <div className="text-[14px] font-bold" style={{ color: "var(--text)" }}>Raise a refund</div>
            <div className="text-[10.5px]" style={{ color: "var(--text3)" }}>for {studentName} · money moves only after admin approval</div>
          </div>
          <button onClick={onClose} className="text-[18px] cursor-pointer" style={{ color: "var(--text3)", background: "none", border: "none" }}>✕</button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex flex-col gap-4">
          <div>
            <div className="font-mono text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>1 · What is being refunded?</div>
            {orders === null && !error ? (
              <div className="text-[11.5px]" style={{ color: "var(--text3)" }}>Loading orders…</div>
            ) : orders && orders.length === 0 ? (
              <div className="text-[11.5px]" style={{ color: "var(--text3)" }}>This student has no paid orders.</div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {orders?.map((o) => (
                  <div key={o.orderId} className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
                      <span className="font-mono text-[10px] font-bold" style={{ color: "var(--blue)" }}>{o.orderRef}</span>
                      <span className="text-[10px]" style={{ color: "var(--text3)" }}>{fmt(o.createdAt)}</span>
                      <span className="ml-auto font-mono text-[10px] font-semibold" style={{ color: "var(--text2)" }}>{money(o.total, o.currency)}</span>
                    </div>
                    {o.items.map((it) => {
                      const selected = pick?.orderId === o.orderId && pick.item.title === it.title && pick.item.courseId === it.courseId && pick.item.projectId === it.projectId;
                      return (
                        <label
                          key={`${it.courseId ?? ""}${it.projectId ?? ""}`}
                          className="flex items-center gap-2.5 px-3 py-2 text-[11.5px]"
                          style={{
                            cursor: it.refundable ? "pointer" : "not-allowed",
                            opacity: it.refundable ? 1 : 0.55,
                            background: selected ? "var(--orange-d)" : "transparent",
                            borderTop: "1px solid var(--border)",
                          }}
                        >
                          <input type="radio" name="refund-item" disabled={!it.refundable} checked={selected} onChange={() => choose(o.orderId, it)} />
                          <span className="flex-1 min-w-0 truncate" style={{ color: "var(--text)" }}>{it.title}</span>
                          {it.refundable ? (
                            <span className="font-mono text-[10.5px] font-bold shrink-0" style={{ color: "var(--text2)" }}>up to {money(it.maxRefund, o.currency)}</span>
                          ) : (
                            <span className="text-[9.5px] shrink-0" style={{ color: "var(--text3)" }}>{why(o, it)}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="font-mono text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>2 · Amount</div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold" style={{ color: "var(--text2)" }}>{cur === "USD" ? "$" : "₹"}</span>
              <input
                type="number"
                min={1}
                max={max || undefined}
                value={amount}
                disabled={!pick}
                onChange={(e) => setAmount(e.target.value)}
                className="w-[140px] text-[12.5px] rounded-md px-2.5 py-1.5 outline-none disabled:opacity-50"
                style={{ background: "var(--bg)", border: `1px solid ${pick && amountBad ? "var(--red)" : "var(--border)"}`, color: "var(--text)" }}
              />
              <span className="text-[10.5px]" style={{ color: pick && amountBad ? "var(--red)" : "var(--text3)" }}>
                {pick ? `max ${money(max, cur)} — what the student actually paid (after coupon, GST included)` : "pick an item first"}
              </span>
            </div>
          </div>

          <div>
            <div className="font-mono text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>3 · Reason</div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Why should this be refunded? The admin sees this when approving."
              className="w-full text-[12px] rounded-lg px-3 py-2 outline-none resize-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>

          {error && <div className="text-[11.5px] font-semibold" style={{ color: "var(--red)" }}>{error}</div>}
        </div>

        <div className="flex items-center gap-2 px-5 py-3 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
          <span className="text-[10px] flex-1" style={{ color: "var(--text3)" }}>Goes to the admin for approval and the student is told on this ticket. You can cancel it until the admin acts. Logged under your name.</span>
          <button onClick={onClose} className="text-[11.5px] font-semibold px-3.5 py-1.5 rounded-lg cursor-pointer" style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}>
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="text-[11.5px] font-bold px-4 py-1.5 rounded-lg cursor-pointer text-white disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--orange)", border: "none" }}
          >
            {saving ? "Sending…" : "Initiate refund"}
          </button>
        </div>
      </div>
    </div>
  );
}
