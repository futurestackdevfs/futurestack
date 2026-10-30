"use client";

import { useCallback, useEffect, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { showToast } from "@/lib/toast";
import { REFUND_STATUS, money } from "../sections/TicketRefund";

interface Row {
  id: string;
  status: string;
  amount: number;
  reason: string;
  rejectReason: string | null;
  createdAt: string;
  order: { currency: string } | null;
  student: { name: string; email: string };
  course: { title: string } | null;
  project: { name: string } | null;
  ticket: { id: string; ref: string; subject: string } | null;
}

interface Page {
  refunds: Row[];
  summary: { total: number; pending: number; processed: number; rejected: number; cancelled?: number };
  pagination: { page: number; totalPages: number; total: number };
}

const TABS = [
  { key: "all", label: "All mine", value: undefined },
  { key: "pending", label: "Initiated", value: "PENDING" },
  { key: "processed", label: "Confirmed", value: "PROCESSED" },
  { key: "rejected", label: "Rejected", value: "REJECTED" },
  { key: "cancelled", label: "Cancelled", value: "CANCELLED" },
];

const PER_PAGE = 15;

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Every refund the logged-in agent raised, with live status. Admin decisions show up here on refresh. */
export default function RefundsView({ onOpenTicket }: { onOpenTicket: (id: string) => void }) {
  const [tab, setTab] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const p = new URLSearchParams({ mine: "true", page: String(page), perPage: String(PER_PAGE) });
      if (tab) p.set("status", tab);
      const r = await opsFetch(`/api/admin/refunds?${p}`);
      if (r.ok) setData((await r.json()) as Page);
    } catch {
      /* keep what is on screen */
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => {
    setLoading(true);
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  async function cancel(id: string) {
    if (cancelling) return;
    if (!window.confirm("Cancel this refund request? The admin will no longer see it and the customer will be told on the ticket.")) return;
    setCancelling(id);
    try {
      const res = await opsFetch(`/api/admin/refunds/${id}/cancel`, { method: "PATCH" });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(body.message || "Could not cancel the request");
      showToast("Refund request cancelled");
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not cancel the request");
    } finally {
      setCancelling(null);
    }
  }

  const rows = data?.refunds ?? [];
  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="px-5 py-3 shrink-0 flex items-center gap-3 flex-wrap" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <div>
          <div className="text-[14px] font-bold" style={{ color: "var(--text)" }}>💸 My refunds</div>
          <div className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>refunds you raised from tickets · updates every 30s</div>
        </div>
        <div className="ml-auto flex items-center gap-1 rounded-lg px-1 py-[3px]" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
          {TABS.map((t) => {
            const active = tab === t.value;
            return (
              <button
                key={t.key}
                onClick={() => { setPage(1); setTab(t.value); }}
                className="px-2.5 py-1 rounded-md text-[10.5px] font-semibold cursor-pointer"
                style={{ background: active ? "var(--orange)" : "transparent", color: active ? "#fff" : "var(--text2)", border: "none" }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => { setLoading(true); load(); }}
          className="text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer"
          style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
        >
          ↻ Refresh
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[760px]" style={{ borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(148,163,184,.05)" }}>
                  {["Date", "Student", "Item", "Amount", "Ticket", "Status"].map((h) => (
                    <th key={h} className="font-mono text-[9px] font-bold uppercase tracking-[.08em] px-3 py-2" style={{ color: "var(--text3)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-[11.5px]" style={{ color: "var(--text3)" }}>
                      {loading ? "Loading…" : "No refunds here yet. Raise one from a ticket with “+ Refund”."}
                    </td>
                  </tr>
                )}
                {rows.map((r) => {
                  const st = REFUND_STATUS[r.status] ?? { label: r.status, color: "var(--text3)", bg: "var(--bg2)" };
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[10.5px]" style={{ color: "var(--text2)" }}>{fmt(r.createdAt)}</td>
                      <td className="px-3 py-2.5">
                        <div className="text-[11.5px] font-semibold" style={{ color: "var(--text)" }}>{r.student.name}</div>
                        <div className="font-mono text-[9px] max-w-[160px] truncate" style={{ color: "var(--text3)" }}>{r.student.email}</div>
                      </td>
                      <td className="px-3 py-2.5 text-[11.5px] max-w-[200px]" style={{ color: "var(--text)" }}>
                        <div className="truncate">{r.course?.title ?? r.project?.name ?? "—"}</div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11.5px] font-bold tabular-nums whitespace-nowrap" style={{ color: "var(--text)" }}>
                        {money(r.amount, r.order?.currency)}
                      </td>
                      <td className="px-3 py-2.5">
                        {r.ticket ? (
                          <button
                            onClick={() => onOpenTicket(r.ticket!.id)}
                            className="font-mono text-[10px] font-bold cursor-pointer underline"
                            style={{ color: "var(--blue)", background: "none", border: "none" }}
                            title={r.ticket.subject}
                          >
                            {r.ticket.ref.replace("FS-SUP-", "#")}
                          </button>
                        ) : (
                          <span style={{ color: "var(--text3)" }}>—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-[9.5px] font-bold px-2 py-[3px] rounded-full whitespace-nowrap" style={{ color: st.color, background: st.bg }}>
                          {st.label}
                        </span>
                        {r.status === "REJECTED" && r.rejectReason && (
                          <div className="text-[10.5px] mt-1 max-w-[220px]" style={{ color: "var(--text2)" }}>Reason: {r.rejectReason}</div>
                        )}
                        {r.status === "PENDING" && (
                          <div className="mt-1.5">
                            <button
                              onClick={() => cancel(r.id)}
                              disabled={cancelling === r.id}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-md cursor-pointer disabled:opacity-50"
                              style={{ background: "transparent", color: "var(--red)", border: "1px solid var(--red)" }}
                            >
                              {cancelling === r.id ? "Cancelling…" : "✕ Cancel request"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3.5 py-2" style={{ borderTop: "1px solid var(--border)", background: "var(--panel)" }}>
              <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-2.5 h-7 rounded-md text-[11px] cursor-pointer disabled:opacity-40" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}>‹ Prev</button>
                <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-2.5 h-7 rounded-md text-[11px] cursor-pointer disabled:opacity-40" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}>Next ›</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
