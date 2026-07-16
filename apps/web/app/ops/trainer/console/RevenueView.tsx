"use client";

import { useEffect, useMemo, useState } from "react";
import { TRAINER_SHARE_PCT, INR, type RevenueEnrollment, type PayoutRecord, type TrainerBatch } from "../lib/data";
import { KpiRow, Panel, Th, Td, Pill, ViewHeader } from "../sections/ui";

const PAGE_SIZE = 7;

function usePagination<T>(rows: T[]) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [rows.length, totalPages, page]);

  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return { page, setPage, totalPages, pageRows };
}

function TablePagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 pt-2.5">
      <button
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="font-mono text-[10px] px-2 py-1 rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
      >‹ Prev</button>
      <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>Page {page} of {totalPages}</span>
      <button
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className="font-mono text-[10px] px-2 py-1 rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
      >Next ›</button>
    </div>
  );
}

interface RevenueViewProps {
  enrollments: RevenueEnrollment[];
  payouts: PayoutRecord[];
  batches: TrainerBatch[];
  searchQuery: string;
  addToast: (msg: string, type?: "success" | "danger") => void;
}

export default function RevenueView({ enrollments, payouts, batches, searchQuery, addToast }: RevenueViewProps) {
  const [batchFilter, setBatchFilter] = useState<string>("All");

  const filtered = useMemo(() => {
    let list = enrollments;
    if (batchFilter !== "All") list = list.filter((e) => e.batchCode === batchFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((e) => [e.student, e.batchCode, e.course].some((v) => v.toLowerCase().includes(q)));
    }
    return list;
  }, [enrollments, searchQuery, batchFilter]);

  const totals = useMemo(() => {
    const fee = enrollments.reduce((s, e) => s + e.courseFee, 0);
    const collected = enrollments.reduce((s, e) => {
      if (e.paymentMode === "Full") return s + e.courseFee;
      if (e.paymentMode === "EMI") return s + Math.round(e.courseFee * 0.5);
      return s;
    }, 0);
    const myShare = Math.round(collected * (TRAINER_SHARE_PCT / 100));
    const paidOut = payouts.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0);
    return { fee, collected, myShare, paidOut, pending: myShare - paidOut };
  }, [enrollments, payouts]);

  const byBatch = useMemo(() => {
    const map = new Map<string, { students: number; fee: number; collected: number }>();
    for (const e of enrollments) {
      const cur = map.get(e.batchCode) || { students: 0, fee: 0, collected: 0 };
      cur.students += 1;
      cur.fee += e.courseFee;
      const collectedAmt = e.paymentMode === "Full" ? e.courseFee : e.paymentMode === "EMI" ? Math.round(e.courseFee * 0.5) : 0;
      cur.collected += collectedAmt;
      map.set(e.batchCode, cur);
    }
    return Array.from(map.entries());
  }, [enrollments]);

  const batchPage = usePagination(byBatch);
  const enrollmentPage = usePagination(filtered);
  const payoutPage = usePagination(payouts);

  function downloadStatement() {
    const rows = [
      ["Student", "Batch", "Course", "Course Fee", "Payment Mode", "Enrolled On", `Trainer Share (${TRAINER_SHARE_PCT}%)`],
      ...enrollments.map((e) => [
        e.student, e.batchCode, e.course, e.courseFee, e.paymentMode,
        e.enrolledOn, Math.round(e.courseFee * (TRAINER_SHARE_PCT / 100)),
      ]),
      [],
      ["TOTAL", "", "", totals.fee, "", "", totals.myShare],
      ["PAID OUT", "", "", "", "", "", totals.paidOut],
      ["PENDING", "", "", "", "", "", totals.pending],
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trainer-payout-statement-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("Payout statement downloaded");
  }

  return (
    <div className="p-4 pb-7">
      <ViewHeader
        icon="💰" title="Revenue & Payouts" meta={`role::trainer · share ${TRAINER_SHARE_PCT}% · full transparency`}
        action={
          <button onClick={downloadStatement}
            className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer"
            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
          >⇩ Download Statement</button>
        }
      />

      <KpiRow items={[
        { label: "Registrations", value: enrollments.length, delta: "in my batches", color: "var(--blue)" },
        { label: `My Share (${TRAINER_SHARE_PCT}%)`, value: INR(totals.myShare), delta: "of collected revenue", color: "var(--green)" },
        { label: "Paid Out", value: INR(totals.paidOut), delta: "settled", color: "var(--green)" },
        { label: "Pending Payout", value: INR(totals.pending), delta: "not yet settled", color: "var(--amber)" },
      ]} />

      {/* Batch-wise breakdown */}
      <Panel title="📊 Batch-wise Revenue Breakdown" count={`${byBatch.length} batches`}>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr><Th>Batch</Th><Th>Students</Th><Th>Total Fees</Th><Th>Est. Collected</Th><Th>Collected %</Th><Th>My Share ({TRAINER_SHARE_PCT}%)</Th></tr>
          </thead>
          <tbody>
            {batchPage.pageRows.map(([code, b]) => (
              <tr key={code}>
                <Td mono color="var(--text)"><b>{code}</b></Td>
                <Td mono>{b.students}</Td>
                <Td mono>{INR(b.fee)}</Td>
                <Td mono color="var(--text)">{INR(b.collected)}</Td>
                <Td mono>{Math.round((b.collected / b.fee) * 100)}%</Td>
                <Td mono color="var(--green)"><b>{INR(Math.round(b.collected * (TRAINER_SHARE_PCT / 100)))}</b></Td>
              </tr>
            ))}
          </tbody>
        </table>
        <TablePagination page={batchPage.page} totalPages={batchPage.totalPages} onChange={batchPage.setPage} />
      </Panel>

      {/* Student-wise enrollments */}
      <Panel
        title="👥 Student-wise Registrations"
        count={`${filtered.length} students`}
        action={
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="font-mono text-[9px] px-1.5 py-0.5 rounded outline-none cursor-pointer"
            style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
          >
            <option value="All">All batches</option>
            {batches.map((b) => <option key={b.code} value={b.code}>{b.code}</option>)}
          </select>
        }
      >
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr><Th>Student</Th><Th>Batch</Th><Th>Course Fee</Th><Th>Payment Mode</Th><Th>Enrolled On</Th><Th>My Share ({TRAINER_SHARE_PCT}%)</Th></tr>
          </thead>
          <tbody>
            {enrollmentPage.pageRows.map((e) => (
              <tr key={e.id}>
                <Td color="var(--text)"><b>{e.student}</b></Td>
                <Td mono>{e.batchCode}</Td>
                <Td mono>{INR(e.courseFee)}</Td>
                <Td><Pill value={e.paymentMode} /></Td>
                <Td mono>{e.enrolledOn}</Td>
                <Td mono color="var(--green)">{INR(Math.round(e.courseFee * (TRAINER_SHARE_PCT / 100)))}</Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center font-mono text-[11px] py-6" style={{ color: "var(--text3)" }}>No registrations found</td></tr>
            )}
          </tbody>
        </table>
        <TablePagination page={enrollmentPage.page} totalPages={enrollmentPage.totalPages} onChange={enrollmentPage.setPage} />
      </Panel>

      {/* Payout history */}
      <Panel title="🧾 Payout History" count={`${payouts.length} payouts`}>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr><Th>Period</Th><Th>Batch</Th><Th>Amount</Th><Th>Status</Th></tr>
          </thead>
          <tbody>
            {payoutPage.pageRows.map((p) => (
              <tr key={p.id}>
                <Td color="var(--text)"><b>{p.period}</b></Td>
                <Td mono>{p.batchCode}</Td>
                <Td mono color="var(--text)">{INR(p.amount)}</Td>
                <Td><Pill value={p.status} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
        <TablePagination page={payoutPage.page} totalPages={payoutPage.totalPages} onChange={payoutPage.setPage} />
      </Panel>
    </div>
  );
}
