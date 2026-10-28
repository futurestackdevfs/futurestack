"use client";

import type { Ticket } from "../lib/types";

const REASON: Record<string, string> = {
  AUTO: "Closed automatically — no reply from the student",
  STUDENT: "Closed by the student",
  AGENT: "Closed by support",
};

/** Shown on a closed ticket: who/what closed it, when, and a one-click way to reopen. */
export default function ClosedBanner({
  ticket,
  onReopen,
  busy,
}: {
  ticket: Pick<Ticket, "closedAt" | "closedReason">;
  onReopen: () => void;
  busy?: boolean;
}) {
  const label = REASON[ticket.closedReason ?? "AGENT"] ?? REASON.AGENT;
  const when = ticket.closedAt
    ? new Date(ticket.closedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })
    : null;
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap rounded-lg px-3 py-2" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
      <div className="min-w-0">
        <div className="text-[11.5px] font-semibold" style={{ color: "var(--text)" }}>🗄 {label}</div>
        <div className="text-[10px]" style={{ color: "var(--text3)" }}>
          {when ? `${when} · ` : ""}You can reopen it any time.
        </div>
      </div>
      <button
        onClick={onReopen}
        disabled={busy}
        className="shrink-0 font-mono text-[10.5px] font-bold px-3 py-1.5 rounded cursor-pointer disabled:opacity-50"
        style={{ background: "var(--blue)", color: "#fff", border: "none" }}
      >
        ↺ Reopen ticket
      </button>
    </div>
  );
}
