"use client";

import { useCallback, useEffect, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import type { CoordinatorPaymentsResponse } from "../lib/types";
import { KpiRow, Panel, Th, Td, Pill, ViewHeader, ActionBtn } from "../sections/ui";

function fmtRupee(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

const STATUS_FILTERS = ["", "PAID", "CREATED", "FAILED", "CANCELLED", "EXPIRED"] as const;

export default function PaymentsView({ searchQuery, refreshSignal, onToast }: {
  searchQuery: string;
  refreshSignal?: number;
  onToast: (msg: string, type?: "success" | "danger") => void;
}) {
  const [data, setData] = useState<CoordinatorPaymentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  const loadPayments = useCallback(async (status?: string, p?: number) => {
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (p) params.set("page", String(p));
      const r = await opsFetch(`/api/admin/payments?${params}`);
      if (!r.ok) throw new Error(`Failed to load payments (${r.status})`);
      const d = await r.json();
      setData(d);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Failed to load payments", "danger");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    setLoading(true);
    loadPayments(statusFilter || undefined, page);
  }, [statusFilter, page, refreshSignal, loadPayments]);

  const filtered = data?.orders.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return [o.orderNo, o.student.name, o.student.email, ...o.items.map((i) => i.title)].some((v) => v.toLowerCase().includes(q));
  }) ?? [];

  if (loading) return <div className="flex items-center justify-center h-full font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading payments…</div>;

  return (
    <div className="p-4">
      <ViewHeader
        icon="💰"
        title="Payments"
        meta={`${data?.pagination.total ?? 0} ORDERS · READ-ONLY`}
        action={<ActionBtn color="var(--blue)" onClick={() => loadPayments(statusFilter || undefined, page)}>REFRESH</ActionBtn>}
      />

      {data?.summary && (
        <KpiRow items={[
          { label: "Total Orders", value: data.summary.total, delta: "all time", color: "var(--text)" },
          { label: "Paid", value: data.summary.paid, color: "var(--green)" },
          { label: "Created", value: data.summary.created, delta: "pending", color: "var(--amber)" },
          { label: "Failed", value: data.summary.failed, color: "var(--red)" },
          { label: "Revenue", value: fmtRupee(data.summary.totalRevenue), color: "var(--green)" },
        ]} />
      )}

      <div className="flex items-center gap-1.5 mb-3">
        <button
          onClick={() => { setStatusFilter(""); setPage(1); }}
          className="font-mono text-[8.5px] font-bold px-2 py-1 rounded cursor-pointer"
          style={{
            background: statusFilter === "" ? "var(--blue)" : "var(--panel)",
            color: statusFilter === "" ? "#fff" : "var(--text2)",
            border: `1px solid ${statusFilter === "" ? "var(--blue)" : "var(--border)"}`,
          }}
        >ALL</button>
        {STATUS_FILTERS.filter(Boolean).map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className="font-mono text-[8.5px] font-bold px-2 py-1 rounded cursor-pointer"
            style={{
              background: statusFilter === s ? "var(--blue)" : "var(--panel)",
              color: statusFilter === s ? "#fff" : "var(--text2)",
              border: `1px solid ${statusFilter === s ? "var(--blue)" : "var(--border)"}`,
            }}
          >{s}</button>
        ))}
      </div>

      <Panel title="Payment Records" count={`${filtered.length} ORDERS`}>
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>No payment records</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Student</Th>
                  <Th>Course</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th>Date</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o, i) => (
                  <tr key={o.id} style={{ background: i % 2 === 0 ? "var(--surface)" : "var(--panel)" }}>
                    <Td mono color="var(--text)"><b>{o.orderNo}</b></Td>
                    <Td>
                      <div className="font-semibold" style={{ color: "var(--text)" }}>{o.student.name}</div>
                      <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{o.student.email}</div>
                    </Td>
                    <Td>{o.items.map((i) => i.title).join(", ") || "—"}</Td>
                    <Td mono color="var(--green)">{fmtRupee(o.totalAmount)}</Td>
                    <Td><Pill value={o.status} /></Td>
                    <Td mono>{new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="font-mono text-[9px] font-bold px-2.5 py-1 rounded cursor-pointer disabled:opacity-40"
            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
          >← PREV</button>
          <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>
            Page {data.pagination.page} of {data.pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
            disabled={page >= data.pagination.totalPages}
            className="font-mono text-[9px] font-bold px-2.5 py-1 rounded cursor-pointer disabled:opacity-40"
            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
          >NEXT →</button>
        </div>
      )}
    </div>
  );
}
