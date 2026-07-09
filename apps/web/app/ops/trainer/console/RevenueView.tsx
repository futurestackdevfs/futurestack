"use client";

import { useMemo, useState } from "react";
import { TRAINER_SHARE_PCT, INR, type RevenueEnrollment, type PayoutRecord, type TrainerBatch } from "../lib/data";
import { KpiRow, Panel, Th, Td, Pill, ViewHeader } from "../sections/ui";

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
      list = list.filter((e) => [e.student, e.batchCode, e.course, e.paymentMode].some((v) => v.toLowerCase().includes(q)));
    }
    return list;
  }, [enrollments, searchQuery, batchFilter]);

  const totals = useMemo(() => {
    const fee = enrollments.reduce((s, e) => s + e.courseFee, 0);
    const collected = enrollments.reduce((s, e) => s + e.paidSoFar, 0);
    const myShare = Math.round(collected * (TRAINER_SHARE_PCT / 100));
    const paidOut = payouts.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0);
    const nextPayout = payouts.find((p) => p.status === "Pending");
    return { fee, collected, myShare, paidOut, pending: myShare - paidOut, nextPayout };
  }, [enrollments, payouts]);

  const byBatch = useMemo(() => {
    const map = new Map<string, { students: number; fee: number; collected: number }>();
    for (const e of enrollments) {
      const cur = map.get(e.batchCode) || { students: 0, fee: 0, collected: 0 };
      cur.students += 1;
      cur.fee += e.courseFee;
      cur.collected += e.paidSoFar;
      map.set(e.batchCode, cur);
    }
    return Array.from(map.entries());
  }, [enrollments]);

  function downloadStatement() {
    const rows = [
      ["Student", "Batch", "Course", "Course Fee", "Paid So Far", "Payment Mode", "EMI Months", "Enrolled On", `Trainer Share (${TRAINER_SHARE_PCT}%)`],
      ...enrollments.map((e) => [
        e.student, e.batchCode, e.course, e.courseFee, e.paidSoFar, e.paymentMode,
        e.emiMonths ?? "", e.enrolledOn, Math.round(e.paidSoFar * (TRAINER_SHARE_PCT / 100)),
      ]),
      [],
      ["TOTAL COLLECTED", "", "", totals.fee, totals.collected, "", "", "", totals.myShare],
      ["PAID OUT", "", "", "", "", "", "", "", totals.paidOut],
      ["PENDING", "", "", "", "", "", "", "", totals.pending],
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
        { label: "Revenue Collected", value: INR(totals.collected), delta: `of ${INR(totals.fee)} total fees`, color: "var(--text)" as string },
        { label: `My Share (${TRAINER_SHARE_PCT}%)`, value: INR(totals.myShare), delta: "of collected revenue", color: "var(--green)" },
        { label: "Paid Out", value: INR(totals.paidOut), delta: "settled", color: "var(--green)" },
        { label: "Pending Payout", value: INR(totals.pending), delta: totals.nextPayout ? `expected ${totals.nextPayout.expectedOn}` : "—", color: "var(--amber)" },
      ]} />

      {/* Batch-wise breakdown */}
      <Panel title="📊 Batch-wise Revenue Breakdown" count={`${byBatch.length} batches`}>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr><Th>Batch</Th><Th>Students</Th><Th>Total Fees</Th><Th>Collected So Far</Th><Th>Collection %</Th><Th>My Share ({TRAINER_SHARE_PCT}%)</Th></tr>
          </thead>
          <tbody>
            {byBatch.map(([code, b]) => (
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
            <tr><Th>Student</Th><Th>Batch</Th><Th>Course Fee</Th><Th>Paid So Far</Th><Th>Payment</Th><Th>Enrolled On</Th><Th>My Share ({TRAINER_SHARE_PCT}%)</Th></tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id}>
                <Td color="var(--text)"><b>{e.student}</b></Td>
                <Td mono>{e.batchCode}</Td>
                <Td mono>{INR(e.courseFee)}</Td>
                <Td mono color={e.paidSoFar >= e.courseFee ? "var(--green)" : "var(--amber)"}>{INR(e.paidSoFar)}</Td>
                <Td>
                  <Pill value={e.paymentMode} />
                  {e.emiMonths && <span className="font-mono text-[8.5px] ml-1" style={{ color: "var(--text3)" }}>{e.emiMonths} mo</span>}
                </Td>
                <Td mono>{e.enrolledOn}</Td>
                <Td mono color="var(--green)">{INR(Math.round(e.paidSoFar * (TRAINER_SHARE_PCT / 100)))}</Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center font-mono text-[11px] py-6" style={{ color: "var(--text3)" }}>No registrations found</td></tr>
            )}
          </tbody>
        </table>
      </Panel>

      {/* Payout history */}
      <Panel title="🧾 Payout History" count={`${payouts.length} payouts`}>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr><Th>Period</Th><Th>Batch</Th><Th>Amount</Th><Th>Status</Th><Th>Paid / Expected</Th></tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id}>
                <Td color="var(--text)"><b>{p.period}</b></Td>
                <Td mono>{p.batchCode}</Td>
                <Td mono color="var(--text)">{INR(p.amount)}</Td>
                <Td><Pill value={p.status} /></Td>
                <Td mono color={p.status === "Paid" ? "var(--green)" : "var(--amber)"}>{p.paidOn || p.expectedOn || "—"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
