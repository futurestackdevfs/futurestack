"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import type { LeadRecord, PendingOrder, SaleReceipt, SalesLead } from "../lib/types";
import { Panel, Th, Td, Pill, ViewHeader } from "../sections/ui";

function fmtRupee(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

interface ConvertedRow {
  id: string;
  name: string;
  course: string;
  status: string;
  batchMode: string | null;
  paidOn: string;
  amount: number;
}

function ReceiptModal({ receipt, onClose }: { receipt: SaleReceipt; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="rounded w-[480px] max-w-[95vw] max-h-[90vh] overflow-y-auto" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        <div className="p-4">
          <div className="rounded p-4 mb-3" style={{ border: "1px dashed var(--border2)", background: "var(--panel)" }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[12px] font-extrabold" style={{ color: "var(--text)" }}>FutureStack</div>
                <div className="font-mono text-[8px]" style={{ color: "var(--text3)" }}>SALES RECEIPT</div>
              </div>
              <div className="text-right font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>
                {receipt.receiptNo}
                <div>{receipt.date.slice(0, 10)}</div>
              </div>
            </div>
            <div className="flex flex-col gap-1 mb-3">
              <div className="text-[11.5px] font-bold" style={{ color: "var(--text)" }}>{receipt.studentName}</div>
              {receipt.studentEmail && <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{receipt.studentEmail}</div>}
            </div>
            <div className="flex justify-between font-mono text-[9.5px] py-1" style={{ borderTop: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text3)" }}>COURSE</span><span style={{ color: "var(--text)" }}>{receipt.courseName}</span>
            </div>
            <div className="flex justify-between font-mono text-[9.5px] py-1">
              <span style={{ color: "var(--text3)" }}>LIST PRICE</span><span style={{ color: "var(--text)" }}>{fmtRupee(receipt.price)}</span>
            </div>
            <div className="flex justify-between font-mono text-[9.5px] py-1">
              <span style={{ color: "var(--text3)" }}>DISCOUNT ({receipt.discountPct}%)</span><span style={{ color: "var(--red)" }}>−{fmtRupee(receipt.discAmt)}</span>
            </div>
            <div className="flex justify-between font-mono text-[9.5px] py-1">
              <span style={{ color: "var(--text3)" }}>GST ({receipt.gstPercent ?? 18}%)</span><span style={{ color: "var(--text)" }}>{fmtRupee(receipt.gstAmount)}</span>
            </div>
            <div className="flex justify-between font-mono text-[12px] font-bold py-1.5" style={{ borderTop: "1px solid var(--border)", color: "var(--green)" }}>
              <span>TOTAL PAID</span><span>{fmtRupee(receipt.finalAmt)}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Pill value={receipt.batchMode} />
              <Pill value={receipt.paymentMethod} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2 rounded font-mono text-[10.5px] font-bold cursor-pointer"
            style={{ background: "var(--green)", color: "#fff", border: "1px solid var(--green)" }}
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConvertedView({ pipeline, searchQuery, refreshSignal, onToast }: {
  pipeline: SalesLead[];
  searchQuery: string;
  refreshSignal?: number;
  onToast?: (msg: string, type?: "success" | "danger") => void;
}) {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [pending, setPending] = useState<PendingOrder[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);

  const load = useCallback(async () => {
    const [lRes, pRes] = await Promise.all([
      opsFetch("/api/sales/leads"),
      opsFetch("/api/sales/orders/pending"),
    ]);
    if (lRes.ok) {
      const data = await lRes.json();
      setLeads(Array.isArray(data) ? data : []);
    }
    if (pRes.ok) {
      const data = await pRes.json();
      setPending(Array.isArray(data) ? data : []);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try { await load(); } catch { /* ignore */ }
    })();
  }, [refreshSignal, load]);

  const converted = useMemo(() => {
    /* Order-derived conversions (paid orders in the pipeline) */
    const orderRows: ConvertedRow[] = pipeline
      .filter((p) => p.status === "Converted")
      .map((p) => ({
        id: p.id,
        name: p.name,
        course: p.course,
        status: p.status,
        batchMode: p.batchMode,
        paidOn: p.lastContact,
        amount: p.budget,
      }));

    /* Manually-marked Converted leads (no order yet) — merged, deduped by orderId */
    const orderIds = new Set(pipeline.map((p) => p.id));
    const leadRows: ConvertedRow[] = leads
      .filter((l) => l.status === "Converted")
      .filter((l) => !(l.orderId && orderIds.has(l.orderId)))
      .map((l) => ({
        id: l.id,
        name: l.name,
        course: l.course ?? "Not sure yet",
        status: l.status,
        batchMode: null,
        paidOn: l.createdAt,
        amount: l.budget,
      }));

    const merged = [...orderRows, ...leadRows];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter((l) => l.name.toLowerCase().includes(q) || l.course.toLowerCase().includes(q));
  }, [pipeline, leads, searchQuery]);

  const total = converted.reduce((s, l) => s + l.amount, 0);
  const pendingTotal = pending.reduce((s, o) => s + o.totalAmount, 0);

  async function handleConfirm(order: PendingOrder) {
    setConfirmingId(order.id);
    try {
      const r = await opsFetch(`/api/sales/orders/${order.id}/confirm-payment`, {
        method: "POST",
        body: JSON.stringify({ paymentMethod: order.paymentMethod ?? undefined }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({ message: `${r.status}` }));
        throw new Error(e.message ?? "Payment confirmation failed");
      }
      const data = await r.json();
      setReceipt(data);
      setPending((prev) => prev.filter((o) => o.id !== order.id));
      onToast?.(`Payment confirmed — ${data.courseName}`, "success");
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Payment confirmation failed", "danger");
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <div className="p-4">
      <ViewHeader
        icon="✅"
        title="Converted"
        meta={`${converted.length} CONVERSIONS · ${fmtRupee(total)}`}
      />

      {/* Pending payments */}
      <Panel title="Pending Payments" count={`${pending.length} UNDER PROCESSING · ${fmtRupee(pendingTotal)}`}>
        {pending.length === 0 ? (
          <div className="flex items-center justify-center py-8 font-mono text-[11px]" style={{ color: "var(--text3)" }}>
            0 pending — all payments confirmed
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Student</Th>
                  <Th>Course</Th>
                  <Th>Batch</Th>
                  <Th>Payment Method</Th>
                  <Th>Ordered On</Th>
                  <Th>Amount Due</Th>
                  <Th>{" "}</Th>
                </tr>
              </thead>
              <tbody>
                {pending.map((o) => (
                  <tr key={o.id}>
                    <Td mono>{o.studentName ?? "—"}</Td>
                    <Td>{o.course}</Td>
                    <Td>{o.batchMode ? <Pill value={o.batchMode} /> : <span style={{ color: "var(--text3)" }}>—</span>}</Td>
                    <Td>{o.paymentMethod ?? <span style={{ color: "var(--text3)" }}>—</span>}</Td>
                    <Td mono>{fmtDate(o.createdAt)}</Td>
                    <Td mono color="var(--amber)">{fmtRupee(o.totalAmount)}</Td>
                    <Td>
                      <button
                        onClick={() => handleConfirm(o)}
                        disabled={confirmingId === o.id}
                        className="rounded px-2.5 py-1 font-mono text-[9px] font-bold cursor-pointer"
                        style={{ background: "var(--green)", color: "#fff", border: "1px solid var(--green)", opacity: confirmingId === o.id ? 0.6 : 1 }}
                      >
                        {confirmingId === o.id ? "CONFIRMING…" : "✓ CONFIRM PAYMENT"}
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Converted Students" count={`${converted.length} RECORDS`}>
        {converted.length === 0 ? (
          <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>
            {searchQuery ? "No conversions match your search" : "0 records — no conversions yet"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Student</Th>
                  <Th>Course</Th>
                  <Th>Status</Th>
                  <Th>Batch Mode</Th>
                  <Th>Paid On</Th>
                  <Th>Amount</Th>
                </tr>
              </thead>
              <tbody>
                {converted.map((lead) => (
                  <tr key={lead.id}>
                    <Td mono>{lead.name}</Td>
                    <Td>{lead.course}</Td>
                    <Td><Pill value={lead.status} /></Td>
                    <Td>{lead.batchMode ? <Pill value={lead.batchMode} /> : <span style={{ color: "var(--text3)" }}>—</span>}</Td>
                    <Td mono>{fmtDate(lead.paidOn)}</Td>
                    <Td mono color="var(--green)">{fmtRupee(lead.amount)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}