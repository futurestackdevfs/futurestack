"use client";

import { useEffect, useRef, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import type { SalesCourse, SalesStudent, SaleResult, LeadRecord } from "../lib/types";
import { Pill } from "./ui";

interface SaleModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (msg: string) => void;
  onError: (msg: string) => void;
}

interface NewStudentForm {
  name: string;
  email: string;
  phone: string;
  city: string;
  qualification: string;
}

const EMPTY_STUDENT: NewStudentForm = { name: "", email: "", phone: "", city: "", qualification: "Undergraduate" };

function fmtRupee(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function SaleModal({ open, onClose, onComplete, onError }: SaleModalProps) {
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [courses, setCourses] = useState<SalesCourse[]>([]);
  const [students, setStudents] = useState<SalesStudent[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<SalesStudent | null>(null);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [leadSearch, setLeadSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  const [newStudent, setNewStudent] = useState<NewStudentForm>(EMPTY_STUDENT);
  const [courseId, setCourseId] = useState("");
  const [batchMode, setBatchMode] = useState<"Online" | "Offline">("Online");
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "Card" | "Net Banking" | "Cash" | "Other">("UPI");
  const [discountPct, setDiscountPct] = useState(0);
  const [discountReason, setDiscountReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SaleResult | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<number | null>(null);

  /* Lock body scroll + fetch dropdowns when opened */
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    setResult(null);
    setError("");
    setSubmitting(false);
    setCourses([]);
    setStudents([]);
    setSelectedStudent(null);
    setStudentSearch("");
    setSelectedLead(null);
    setLeadSearch("");
    setSendEmail(true);
    setDiscountPct(0);
    setDiscountReason("");

    (async () => {
      try {
        const [cRes, sRes, lRes] = await Promise.all([
          opsFetch("/api/sales/courses"),
          opsFetch("/api/sales/students"),
          opsFetch("/api/sales/leads"),
        ]);
        if (cRes.ok) {
          const c = await cRes.json();
          setCourses(Array.isArray(c) ? c : []);
          if (Array.isArray(c) && c.length > 0) setCourseId(c[0].id);
        }
        if (sRes.ok) {
          const s = await sRes.json();
          setStudents(Array.isArray(s) ? s : []);
        }
        if (lRes.ok) {
          const l = await lRes.json();
          const active = (Array.isArray(l) ? l : []).filter((x: LeadRecord) => x.status === "New" || x.status === "Interested");
          setLeads(active);
        }
      } catch {
        /* dropdowns just stay empty */
      }
    })();

    setTimeout(() => inputRef.current?.focus(), 60);
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const course = courses.find((c) => c.id === courseId);
  const price = course?.price ?? 0;
  const discAmt = Math.round((price * discountPct) / 100);
  const totalBeforeGst = price - discAmt;
  const gstPct = course?.gstPercent ?? 18;
  const gstAmount = Math.round((totalBeforeGst * gstPct) / 100);
  const totalAmount = totalBeforeGst + gstAmount;

  function handleStudentSearch(q: string) {
    setStudentSearch(q);
    setStudents([]);
    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = window.setTimeout(async () => {
      try {
        const r = await opsFetch(`/api/sales/students?q=${encodeURIComponent(q)}`);
        if (r.ok) {
          const s = await r.json();
          setStudents(Array.isArray(s) ? s : []);
        }
      } catch { /* ignore */ }
    }, 350);
  }

  async function handleSubmit() {
    setError("");
    if (!courseId) { setError("Choose a course"); return; }
    if (mode === "existing" && !selectedStudent) { setError("Choose a student"); return; }
    if (mode === "new" && (!newStudent.name.trim() || !newStudent.email.trim())) {
      setError("Name and email are required for a new student");
      return;
    }

    setSubmitting(true);
    try {
      const r = await opsFetch("/api/sales/sale", {
        method: "POST",
        body: JSON.stringify({
          isNewStudent: mode === "new",
          studentId: selectedStudent?.id,
          leadId: selectedLead?.id,
          sendEmail,
          name: mode === "new" ? newStudent.name.trim() : undefined,
          email: mode === "new" ? newStudent.email.trim() : undefined,
          phone: (mode === "new" ? newStudent.phone : selectedStudent?.phone) ?? "",
          city: (mode === "new" ? newStudent.city : selectedStudent?.city) ?? "",
          qualification: mode === "new" ? newStudent.qualification : undefined,
          courseId,
          discountPct,
          discountReason: discountPct > 0 ? discountReason : undefined,
          batchMode,
          paymentMethod,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({ message: `${r.status}` }));
        throw new Error(e.message ?? "Sale failed");
      }
      const data = await r.json();
      setResult({
        orderId: data.orderId,
        status: data.status ?? "processing",
        studentEmail: data.studentEmail ?? null,
        studentName: data.studentName ?? null,
        courseName: data.courseName,
        batchMode: data.batchMode,
        finalAmt: data.finalAmt,
        leadConverted: data.leadConverted,
        isNewStudent: data.isNewStudent,
        tempPassword: data.tempPassword ?? null,
        emailSent: data.emailSent,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sale failed");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (result) {
      onComplete(`Sale recorded — ${result.courseName ?? "payment pending"}`);
    }
    onClose();
  }

  if (!open) return null;

  const done = result !== null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="rounded w-[480px] max-w-[95vw] max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)", background: "var(--panel)" }}>
          <div>
            <div className="text-[13px] font-extrabold" style={{ color: "var(--text)" }}>{done ? "✓ Sale Recorded" : "＋ New Sale"}</div>
            <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{done ? "PAYMENT PENDING · UNDER PROCESSING" : "RECORD A SALE"}</div>
          </div>
          <button onClick={handleClose} className="cursor-pointer text-[16px]" style={{ color: "var(--text3)", background: "none", border: "none" }}>✕</button>
        </div>

        {done ? (
          /* ── Processing (payment pending) ── */
          <div className="p-4">
            <div className="rounded p-4 mb-3" style={{ border: "1px dashed var(--amber)", background: "var(--panel)" }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[12px] font-extrabold" style={{ color: "var(--text)" }}>FutureStack</div>
                  <div className="font-mono text-[8px]" style={{ color: "var(--text3)" }}>SALE ORDER</div>
                </div>
                <div className="text-right font-mono text-[8.5px]" style={{ color: "var(--amber)" }}>
                  <span style={{ background: "var(--amber-d)", padding: "2px 8px", borderRadius: 999 }}>⏳ UNDER PROCESSING</span>
                  <div className="mt-1" style={{ color: "var(--text3)" }}>#{result?.orderId.slice(0, 8).toUpperCase()}</div>
                </div>
              </div>
              <div className="flex flex-col gap-1 mb-3">
                <div className="text-[11.5px] font-bold" style={{ color: "var(--text)" }}>{result?.studentName ?? "Student"}</div>
                {result?.studentEmail && <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{result.studentEmail}</div>}
              </div>
              <div className="flex justify-between font-mono text-[9.5px] py-1" style={{ borderTop: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text3)" }}>COURSE</span><span style={{ color: "var(--text)" }}>{result?.courseName}</span>
              </div>
              <div className="flex justify-between font-mono text-[9.5px] py-1">
                <span style={{ color: "var(--text3)" }}>AMOUNT DUE</span><span style={{ color: "var(--amber)" }}>{fmtRupee(result?.finalAmt ?? 0)}</span>
              </div>
              <div className="flex justify-between font-mono text-[9.5px] py-1">
                <span style={{ color: "var(--text3)" }}>STATUS</span><span style={{ color: "var(--amber)" }}>AWAITING PAYMENT</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Pill value={result?.batchMode ?? "—"} />
                <Pill value="Processing" />
              </div>
            </div>

            {result?.emailSent && (
              <div className="rounded p-3 mb-3 font-mono text-[9px]" style={{ background: "var(--green-d)", border: "1px solid var(--green)", color: "var(--green)" }}>
                ✓ Enrollment email sent to {result.studentEmail ?? "the student"}
              </div>
            )}

            {result?.leadConverted && (
              <div className="rounded p-3 mb-3 font-mono text-[9px]" style={{ background: "var(--purple-d)", border: "1px solid var(--purple)", color: "var(--purple)" }}>
                ✓ Linked lead auto-converted & added to {result?.courseName}
              </div>
            )}

            {result?.isNewStudent && result.tempPassword && (
              <div className="rounded p-3 mb-3 font-mono text-[9px]" style={{ background: "var(--amber-d)", border: "1px solid var(--amber)", color: "var(--amber)" }}>
                ⚠ New student account created — login emailed to the student.
                <div className="mt-1 font-bold" style={{ color: "var(--text)" }}>{result.studentEmail}</div>
                <div className="font-bold" style={{ color: "var(--text)" }}>Temp password: <code>{result.tempPassword}</code></div>
              </div>
            )}

            <div className="rounded p-3 mb-3 font-mono text-[9px]" style={{ background: "var(--blue-d)", border: "1px solid var(--blue)", color: "var(--blue)" }}>
              → Confirm payment from the <b>Converted</b> tab once the payment is received — receipt will be generated + emailed.
            </div>

            <button
              onClick={handleClose}
              className="w-full py-2 rounded font-mono text-[10.5px] font-bold cursor-pointer"
              style={{ background: "var(--amber)", color: "#fff", border: "1px solid var(--amber)" }}
            >
              DONE — Payment Pending
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <div className="p-4">
            {/* Student toggle */}
            <div className="flex items-center gap-1 rounded mb-3 p-0.5" style={{ border: "1px solid var(--border)", background: "var(--panel)" }}>
              {(["new", "existing"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="flex-1 py-1.5 rounded font-mono text-[9px] font-bold cursor-pointer"
                  style={{ background: mode === m ? "var(--orange)" : "transparent", color: mode === m ? "#fff" : "var(--text2)", border: "none" }}
                >
                  {m === "new" ? "NEW STUDENT" : "EXISTING STUDENT"}
                </button>
              ))}
            </div>

            {mode === "new" ? (
              <div className="grid grid-cols-2 gap-2 mb-3">
                <input ref={inputRef} value={newStudent.name} onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  placeholder="Full name *" className="col-span-2 rounded px-2.5 py-1.5 text-[11px] outline-none"
                  style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }} />
                <input value={newStudent.email} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  placeholder="Email *" className="col-span-2 rounded px-2.5 py-1.5 text-[11px] outline-none"
                  style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }} />
                <input value={newStudent.phone} onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                  placeholder="Phone" className="rounded px-2.5 py-1.5 text-[11px] outline-none"
                  style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }} />
                <input value={newStudent.city} onChange={(e) => setNewStudent({ ...newStudent, city: e.target.value })}
                  placeholder="City" className="rounded px-2.5 py-1.5 text-[11px] outline-none"
                  style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }} />
                <select value={newStudent.qualification} onChange={(e) => setNewStudent({ ...newStudent, qualification: e.target.value })}
                  className="col-span-2 rounded px-2.5 py-1.5 text-[11px] outline-none cursor-pointer"
                  style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }}>
                  {["High School", "Diploma", "Undergraduate", "Postgraduate", "Other"].map((q) => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
            ) : (
              <div className="mb-3">
                <input
                  value={studentSearch}
                  onChange={(e) => { setStudentSearch(e.target.value); handleStudentSearch(e.target.value); }}
                  placeholder="Search student by name or email…"
                  className="w-full rounded px-2.5 py-1.5 text-[11px] outline-none mb-1.5"
                  style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
                <div className="rounded max-h-[110px] overflow-y-auto flex flex-col" style={{ border: "1px solid var(--border)" }}>
                  {students.length === 0 ? (
                    <div className="px-2.5 py-2 font-mono text-[9px]" style={{ color: "var(--text3)" }}>{studentSearch ? "No matches" : "Type to search…"}</div>
                  ) : (
                    students.map((s) => (
                      <button key={s.id} onClick={() => { setSelectedStudent(s); setStudentSearch(s.name); setStudents([]); }}
                        className="text-left px-2.5 py-1.5 text-[10.5px] cursor-pointer"
                        style={{ background: selectedStudent?.id === s.id ? "var(--orange-d)" : "transparent", color: "var(--text)", border: "none" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--panel)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = selectedStudent?.id === s.id ? "var(--orange-d)" : "transparent"; }}
                      >
                        <span className="font-semibold">{s.name}</span> <span className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{s.email}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Link to lead (optional) */}
            <div className="mb-3">
              <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>LINK TO LEAD (OPTIONAL)</div>
              <input
                value={selectedLead ? selectedLead.name : leadSearch}
                onChange={(e) => { setSelectedLead(null); setLeadSearch(e.target.value); }}
                placeholder="Search active lead…"
                className="w-full rounded px-2.5 py-1.5 text-[11px] outline-none mb-1.5"
                style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
              <div className="rounded max-h-[100px] overflow-y-auto flex flex-col" style={{ border: "1px solid var(--border)" }}>
                {leads.length === 0 ? (
                  <div className="px-2.5 py-2 font-mono text-[9px]" style={{ color: "var(--text3)" }}>No active leads</div>
                ) : (
                  leads
                    .filter((l) => {
                      const q = leadSearch.trim().toLowerCase();
                      if (!q) return true;
                      return l.name.toLowerCase().includes(q) || (l.course ?? "").toLowerCase().includes(q);
                    })
                    .map((l) => (
                      <button key={l.id} onClick={() => { setSelectedLead(l); setLeadSearch(l.name); }}
                        className="text-left px-2.5 py-1.5 text-[10.5px] cursor-pointer"
                        style={{ background: selectedLead?.id === l.id ? "var(--orange-d)" : "transparent", color: "var(--text)", border: "none" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--panel)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = selectedLead?.id === l.id ? "var(--orange-d)" : "transparent"; }}
                      >
                        <span className="font-semibold">{l.name}</span>{" "}
                        <span className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{l.course ?? "Not sure yet"} · {l.status}</span>
                      </button>
                    ))
                )}
              </div>
              {selectedLead && (
                <div className="font-mono text-[8.5px] mt-1" style={{ color: "var(--purple)" }}>→ This lead will auto-convert on sale</div>
              )}
            </div>

            {/* Course */}
            <div className="mb-3">
              <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>COURSE *</div>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full rounded px-2.5 py-1.5 text-[11px] outline-none cursor-pointer"
                style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }}>
                {courses.length === 0 && <option value="">No active courses</option>}
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title} — {fmtRupee(c.price)}</option>)}
              </select>
            </div>

            {/* Batch mode + payment */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>BATCH MODE</div>
                <div className="flex items-center gap-1 rounded p-0.5" style={{ border: "1px solid var(--border)", background: "var(--panel)" }}>
                  {(["Online", "Offline"] as const).map((b) => (
                    <button key={b} onClick={() => setBatchMode(b)} className="flex-1 py-1 rounded font-mono text-[8.5px] font-bold cursor-pointer"
                      style={{ background: batchMode === b ? "var(--orange)" : "transparent", color: batchMode === b ? "#fff" : "var(--text2)", border: "none" }}>{b}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>PAYMENT</div>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className="w-full rounded px-2 py-1.5 text-[11px] outline-none cursor-pointer"
                  style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }}>
                  {["UPI", "Card", "Net Banking", "Cash", "Other"].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Discount */}
            <div className="mb-3">
              <div className="font-mono text-[8.5px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>DISCOUNT %</div>
              <input type="number" min={0} max={100} value={discountPct} onChange={(e) => setDiscountPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                className="w-full rounded px-2.5 py-1.5 text-[11px] outline-none mb-1"
                style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }} />
              {discountPct > 0 && (
                <input value={discountReason} onChange={(e) => setDiscountReason(e.target.value)}
                  placeholder="Discount reason (e.g. scholarship, referral)"
                  className="w-full rounded px-2.5 py-1.5 text-[11px] outline-none"
                  style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }} />
              )}
            </div>

            {/* Price summary */}
            <div className="rounded p-3 mb-3 font-mono text-[9.5px]" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
              <div className="flex justify-between py-0.5"><span style={{ color: "var(--text3)" }}>LIST PRICE</span><span style={{ color: "var(--text)" }}>{fmtRupee(price)}</span></div>
              <div className="flex justify-between py-0.5"><span style={{ color: "var(--text3)" }}>DISCOUNT</span><span style={{ color: "var(--red)" }}>−{fmtRupee(discAmt)}</span></div>
              <div className="flex justify-between py-0.5"><span style={{ color: "var(--text3)" }}>GST {gstPct}%</span><span style={{ color: "var(--text)" }}>{fmtRupee(gstAmount)}</span></div>
              <div className="flex justify-between py-1 font-bold" style={{ borderTop: "1px solid var(--border)", color: "var(--green)" }}>
                <span>TOTAL</span><span>{fmtRupee(totalAmount)}</span>
              </div>
            </div>

            {error && <div className="rounded px-3 py-2 mb-3 font-mono text-[9.5px]" style={{ background: "var(--red-d)", color: "var(--red)", border: "1px solid var(--red)" }}>⚠ {error}</div>}

            <label className="flex items-center gap-2 rounded px-2.5 py-2 mb-3 cursor-pointer" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="cursor-pointer accent-[var(--orange)]"
              />
              <span className="text-[10.5px]" style={{ color: "var(--text2)" }}>
                📧 <span className="font-semibold" style={{ color: "var(--text)" }}>Email receipt + login details</span> directly to the student
              </span>
            </label>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-2 rounded font-mono text-[10.5px] font-bold cursor-pointer disabled:opacity-50"
              style={{ background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }}
            >
              {submitting ? "RECORDING…" : "CONFIRM SALE & GENERATE RECEIPT"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}