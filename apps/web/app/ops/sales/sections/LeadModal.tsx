"use client";

import { useEffect, useRef, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import type { LeadRecord, PipelineStatus } from "../lib/types";
import { LEAD_COURSE_OPTIONS } from "../lib/data";

const STATUSES: PipelineStatus[] = ["New", "Interested", "Converted", "Dropped"];
const SOURCES = ["Website", "Referral", "Walk-in", "Demo", "Instagram", "Counselling", "Other"];
const COURSE_OPTIONS = LEAD_COURSE_OPTIONS;

interface LeadForm {
  name: string;
  email: string;
  phone: string;
  city: string;
  course: string;
  status: PipelineStatus;
  budget: string;
  source: string;
  notes: string;
  nextFollowUp: string;
  lastContact: string;
}

const EMPTY_FORM: LeadForm = {
  name: "",
  email: "",
  phone: "",
  city: "",
  course: "",
  status: "New",
  budget: "",
  source: "Website",
  notes: "",
  nextFollowUp: "",
  lastContact: "",
};

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalInputDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toForm(lead: LeadRecord): LeadForm {
  return {
    name: lead.name,
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    city: lead.city ?? "",
    course: lead.course ?? "",
    status: lead.status,
    budget: lead.budget > 0 ? String(lead.budget) : "",
    source: lead.source ?? "Website",
    notes: lead.notes ?? "",
    nextFollowUp: lead.nextFollowUp ? toLocalInputValue(lead.nextFollowUp) : "",
    lastContact: lead.lastContact ? toLocalInputDate(lead.lastContact) : "",
  };
}

const inputStyle = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  color: "var(--text)",
} as const;

const labelStyle = {
  color: "var(--text3)",
} as const;

export function LeadModal({ open, lead, onClose, onSaved, onError }: {
  open: boolean;
  lead: LeadRecord | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState<LeadForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    setError("");
    setSubmitting(false);
    setForm(lead ? toForm(lead) : EMPTY_FORM);
    setTimeout(() => inputRef.current?.focus(), 60);
    return () => { document.body.style.overflow = ""; };
  }, [open, lead]);

  if (!open) return null;

  const set = (patch: Partial<LeadForm>) => setForm((f) => ({ ...f, ...patch }));

  async function handleSave() {
    setError("");
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        city: form.city.trim() || undefined,
        course: form.course.trim() || undefined,
        status: form.status,
        budget: form.budget ? Number(form.budget) : undefined,
        source: form.source || undefined,
        notes: form.notes.trim() || undefined,
        nextFollowUp: form.nextFollowUp ? new Date(form.nextFollowUp).toISOString() : undefined,
        lastContact: form.lastContact ? new Date(form.lastContact).toISOString() : undefined,
      };
      const r = await opsFetch(lead ? `/api/sales/leads/${lead.id}` : "/api/sales/leads", {
        method: lead ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({ message: `${r.status}` }));
        throw new Error(e.message ?? "Failed to save lead");
      }
      const saved = await r.json();
      onSaved(lead ? `Lead updated — ${saved.name}` : `Lead created — ${saved.name}`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save lead");
      onError(err instanceof Error ? err.message : "Failed to save lead");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded w-[520px] max-w-[95vw] max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)", background: "var(--panel)" }}>
          <div>
            <div className="text-[13px] font-extrabold" style={{ color: "var(--text)" }}>{lead ? "✎ Edit Lead" : "＋ New Lead"}</div>
            <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{lead ? "UPDATE PROSPECT RECORD" : "LOG A NEW PROSPECT"}</div>
          </div>
          <button onClick={onClose} className="cursor-pointer text-[16px]" style={{ color: "var(--text3)", background: "none", border: "none" }}>✕</button>
        </div>

        <div className="p-4">
          {/* Name */}
          <div className="mb-3">
            <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1" style={labelStyle}>NAME *</div>
            <input ref={inputRef} value={form.name} onChange={(e) => set({ name: e.target.value })}
              placeholder="Prospect name" className="w-full rounded px-2.5 py-1.5 text-[11px] outline-none"
              style={inputStyle} />
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1" style={labelStyle}>EMAIL</div>
              <input value={form.email} onChange={(e) => set({ email: e.target.value })}
                placeholder="email@example.com" className="w-full rounded px-2.5 py-1.5 text-[11px] outline-none"
                style={inputStyle} />
            </div>
            <div>
              <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1" style={labelStyle}>PHONE</div>
              <input value={form.phone} onChange={(e) => set({ phone: e.target.value })}
                placeholder="Phone" className="w-full rounded px-2.5 py-1.5 text-[11px] outline-none"
                style={inputStyle} />
            </div>
            <div>
              <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1" style={labelStyle}>CITY</div>
              <input value={form.city} onChange={(e) => set({ city: e.target.value })}
                placeholder="City" className="w-full rounded px-2.5 py-1.5 text-[11px] outline-none"
                style={inputStyle} />
            </div>
            <div>
              <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1" style={labelStyle}>SOURCE</div>
              <select value={form.source} onChange={(e) => set({ source: e.target.value })}
                className="w-full rounded px-2.5 py-1.5 text-[11px] outline-none cursor-pointer"
                style={inputStyle}>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Course interest + budget */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1" style={labelStyle}>COURSE INTEREST</div>
              <input list="lead-course-options" value={form.course} onChange={(e) => set({ course: e.target.value })}
                placeholder="Course / Not sure yet" className="w-full rounded px-2.5 py-1.5 text-[11px] outline-none"
                style={inputStyle} />
              <datalist id="lead-course-options">
                {COURSE_OPTIONS.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1" style={labelStyle}>BUDGET (₹)</div>
              <input type="number" min={0} value={form.budget} onChange={(e) => set({ budget: e.target.value })}
                placeholder="0" className="w-full rounded px-2.5 py-1.5 text-[11px] outline-none"
                style={inputStyle} />
            </div>
          </div>

          {/* Status */}
          <div className="mb-3">
            <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1" style={labelStyle}>STATUS</div>
            <div className="flex items-center gap-1 rounded p-0.5" style={{ border: "1px solid var(--border)", background: "var(--panel)" }}>
              {STATUSES.map((s) => (
                <button key={s} onClick={() => set({ status: s })}
                  className="flex-1 py-1.5 rounded font-mono text-[8.5px] font-bold cursor-pointer"
                  style={{ background: form.status === s ? "var(--orange)" : "transparent", color: form.status === s ? "#fff" : "var(--text2)", border: "none" }}>{s}</button>
              ))}
            </div>
          </div>

          {/* Follow-ups */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1" style={labelStyle}>NEXT FOLLOW-UP</div>
              <input type="datetime-local" value={form.nextFollowUp} onChange={(e) => set({ nextFollowUp: e.target.value })}
                className="w-full rounded px-2.5 py-1.5 text-[11px] outline-none"
                style={inputStyle} />
            </div>
            <div>
              <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1" style={labelStyle}>LAST CONTACT</div>
              <input type="date" value={form.lastContact} onChange={(e) => set({ lastContact: e.target.value })}
                className="w-full rounded px-2.5 py-1.5 text-[11px] outline-none"
                style={inputStyle} />
            </div>
          </div>

          {/* Notes */}
          <div className="mb-3">
            <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1" style={labelStyle}>NOTES</div>
            <textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })}
              placeholder="Context, objections, demo outcome, next steps…"
              rows={3}
              className="w-full rounded px-2.5 py-1.5 text-[11px] outline-none resize-none"
              style={inputStyle} />
          </div>

          {error && <div className="rounded px-3 py-2 mb-3 font-mono text-[9.5px]" style={{ background: "var(--red-d)", color: "var(--red)", border: "1px solid var(--red)" }}>⚠ {error}</div>}

          <button
            onClick={handleSave}
            disabled={submitting}
            className="w-full py-2 rounded font-mono text-[10.5px] font-bold cursor-pointer disabled:opacity-50"
            style={{ background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }}
          >
            {submitting ? "SAVING…" : lead ? "SAVE CHANGES" : "CREATE LEAD"}
          </button>
        </div>
      </div>
    </div>
  );
}