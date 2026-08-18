"use client";

import type { LeadRecord } from "../lib/types";
import { Pill, ProgressBar, ActionBtn } from "./ui";

function fmtRupee(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function DetailRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between py-1 font-mono text-[9.5px]" style={{ borderBottom: "1px solid var(--border)" }}>
      <span style={{ color: "var(--text3)" }}>{label}</span>
      <span className={mono ? "text-right" : "text-right font-normal"} style={{ color: "var(--text)" }}>{value}</span>
    </div>
  );
}

export function LeadDetailModal({ lead, onClose, onEdit, onDelete, onConvert }: {
  lead: LeadRecord;
  onClose: () => void;
  onEdit: (lead: LeadRecord) => void;
  onDelete: (lead: LeadRecord) => void;
  onConvert: (lead: LeadRecord) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded w-[560px] max-w-[95vw] max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)", background: "var(--panel)" }}>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[15px] font-extrabold" style={{ color: "var(--text)" }}>{lead.name}</span>
              <Pill value={lead.status} />
            </div>
            <div className="font-mono text-[8.5px] mt-0.5" style={{ color: "var(--text3)" }}>
              LEAD · #{lead.id.slice(0, 8).toUpperCase()} · CREATED {fmtDate(lead.createdAt)}
            </div>
          </div>
          <button onClick={onClose} className="cursor-pointer text-[16px]" style={{ color: "var(--text3)", background: "none", border: "none" }}>✕</button>
        </div>

        <div className="p-4">
          {/* Score + conversion actions */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>QUALITY SCORE</div>
              <ProgressBar pct={lead.score} />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {lead.status !== "Converted" && (
                <ActionBtn solid color="var(--green)" onClick={() => onConvert(lead)}>✓ CONVERT</ActionBtn>
              )}
              <ActionBtn color="var(--orange)" onClick={() => onEdit(lead)}>✎ EDIT</ActionBtn>
              <ActionBtn color="var(--red)" onClick={() => onDelete(lead)}>✕</ActionBtn>
            </div>
          </div>

          {/* Contact */}
          <div className="rounded p-3 mb-3" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
            <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>📞 CONTACT</div>
            <DetailRow label="EMAIL" value={lead.email ?? "—"} mono />
            <DetailRow label="PHONE" value={lead.phone ?? "—"} mono />
            <DetailRow label="CITY" value={lead.city ?? "—"} />
          </div>

          {/* Prospect */}
          <div className="rounded p-3 mb-3" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
            <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>🎯 PROSPECT</div>
            <DetailRow label="COURSE INTEREST" value={lead.course ?? "Not sure yet"} />
            <DetailRow label="BUDGET" value={lead.budget > 0 ? fmtRupee(lead.budget) : "—"} mono />
            <DetailRow label="SOURCE" value={lead.source ?? "—"} />
            <DetailRow label="NEXT FOLLOW-UP" value={fmtDateTime(lead.nextFollowUp)} />
            <DetailRow label="LAST CONTACT" value={fmtDate(lead.lastContact)} />
          </div>

          {/* Notes */}
          <div className="rounded p-3 mb-3" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
            <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>📝 NOTES</div>
            {lead.notes ? (
              <div className="text-[10.5px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text2)" }}>{lead.notes}</div>
            ) : (
              <div className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>No notes yet</div>
            )}
          </div>

          {/* Follow-up history */}
          <div className="rounded p-3 mb-3" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
            <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>🔁 FOLLOW-UP HISTORY</div>
            {lead.followUps.length === 0 ? (
              <div className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>No follow-ups logged yet</div>
            ) : (
              <div className="flex flex-col">
                {lead.followUps.map((f) => (
                  <div key={f.id} className="flex items-center justify-between py-1.5 font-mono text-[9px]" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span className="uppercase font-bold" style={{ color: f.action === "completed" ? "var(--green)" : f.action === "converted" ? "var(--green)" : f.action === "dropped" ? "var(--red)" : "var(--amber)" }}>
                      {f.action}
                    </span>
                    <span style={{ color: "var(--text2)" }}>{fmtDateTime(f.scheduledAt)}</span>
                    <span style={{ color: "var(--text3)" }}>{fmtDateTime(f.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Linked student */}
          {lead.studentId && (
            <div className="rounded p-3 mb-3" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
              <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>👤 LINKED STUDENT</div>
              <DetailRow label="STUDENT" value={lead.studentName ?? "—"} />
            </div>
          )}

          {/* Conversion / order */}
          {lead.order && (
            <div className="rounded p-3 mb-3" style={{ background: "var(--green-d)", border: "1px solid var(--green)" }}>
              <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--green)" }}>💰 CONVERTED · ORDER {lead.order.status}</div>
              <DetailRow label="COURSE BOUGHT" value={lead.order.course ?? "—"} />
              <DetailRow label="AMOUNT PAID" value={fmtRupee(lead.order.totalAmount)} mono />
              <DetailRow label="PAYMENT" value={lead.order.paymentMethod ?? "—"} />
              <DetailRow label="BATCH MODE" value={lead.order.batchMode ?? "—"} />
              <DetailRow label="PAID ON" value={fmtDate(lead.order.createdAt)} />
            </div>
          )}

          {/* Assignment / audit */}
          <div className="rounded p-3" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
            <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>🔖 ASSIGNMENT</div>
            <DetailRow label="SALESPERSON" value={lead.salespersonName ?? "Unassigned"} />
            <DetailRow label="UPDATED" value={fmtDateTime(lead.updatedAt)} />
          </div>
        </div>
      </div>
    </div>
  );
}