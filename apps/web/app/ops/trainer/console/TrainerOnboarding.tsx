"use client";

import { useMemo, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { TRAINER_CAREER_PATHS } from "../lib/data";

/**
 * First-login gate for a trainer whose profile isn't submitted yet
 * (User.profileSubmittedAt is null) — shown instead of the console shell,
 * full-screen, in a page-wise wizard. Once the required fields are saved the
 * backend stamps profileSubmittedAt and the trainer drops into the normal
 * console with a "pending approval" ribbon (see trainer/page.tsx).
 *
 * Forced to the light theme regardless of the viewer's OS/app preference —
 * this is a one-time onboarding moment, not a themed console screen.
 */

type Form = {
  phone: string; dob: string; city: string; qualification: string;
  experience: string; careerPath: string; skills: string; bio: string;
};

const STEPS = ["Personal details", "Professional details", "About you"] as const;

const inputClass =
  "w-full bg-white border border-[#e2e6ef] rounded-lg px-3.5 py-2.5 text-sm text-[#12141a] outline-none transition-all duration-200 focus:border-orange-400 focus:shadow-[0_0_0_3px_rgba(240,90,26,.1)] placeholder:text-[#9aa2b1]";
const labelClass = "text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider block mb-1.5";

function stepValid(step: number, f: Form): boolean {
  if (step === 0) return !!(f.phone.trim() && f.dob.trim() && f.city.trim() && f.qualification.trim());
  if (step === 1) return !!(f.experience && f.careerPath && f.skills.trim());
  return !!f.bio.trim();
}

export default function TrainerOnboarding({ name, onSubmitted }: { name: string; onSubmitted: () => void }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({
    phone: "", dob: "", city: "", qualification: "", experience: "", careerPath: "", skills: "", bio: "",
  });

  const firstName = name.split(" ")[0];
  const canAdvance = useMemo(() => stepValid(step, form), [step, form]);

  function set<K extends keyof Form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await opsFetch("/api/trainer/profile", {
        method: "PUT",
        body: JSON.stringify({
          phone: form.phone.trim(),
          dob: form.dob,
          city: form.city.trim(),
          qualification: form.qualification.trim(),
          experience: form.experience.toUpperCase(),
          careerPath: form.careerPath,
          skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
          bio: form.bio.trim(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Could not save your profile — please try again.");
      }
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div data-theme="light" className="min-h-screen flex items-center justify-center px-4 py-8 sm:py-12" style={{ background: "#f4f5f8" }}>
      <div className="w-full max-w-[640px]">
        <div className="text-center mb-6 sm:mb-8 px-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4" style={{ background: "linear-gradient(135deg, #f05a1a, #ff8a4c)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#12141a]">Welcome, {firstName} — let&apos;s set up your trainer profile</h1>
          <p className="text-sm text-[#6b7280] mt-2 max-w-[440px] mx-auto">
            A few details before you get into the console. This is also what students see about you on course pages, so make it count.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 px-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1">
                <div
                  className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors"
                  style={i <= step
                    ? { background: "#f05a1a", color: "#fff" }
                    : { background: "#e2e6ef", color: "#9aa2b1" }}
                >
                  {i < step ? "✓" : i + 1}
                </div>
                <span className="hidden sm:inline text-[11px] font-semibold whitespace-nowrap" style={{ color: i <= step ? "#12141a" : "#9aa2b1" }}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className="h-px flex-1" style={{ background: i < step ? "#f05a1a" : "#e2e6ef" }} />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white border border-[#e2e6ef] shadow-[0_8px_30px_rgba(20,25,40,.06)] overflow-hidden">
          <div className="p-5 sm:p-7">
            {step === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Phone <span className="text-red-500">*</span></label>
                  <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Date of birth <span className="text-red-500">*</span></label>
                  <input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>City <span className="text-red-500">*</span></label>
                  <input type="text" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Mumbai, Maharashtra" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Qualification <span className="text-red-500">*</span></label>
                  <input type="text" value={form.qualification} onChange={(e) => set("qualification", e.target.value)} placeholder="e.g. B.Tech Computer Science" className={inputClass} />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Experience level <span className="text-red-500">*</span></label>
                  <select value={form.experience} onChange={(e) => set("experience", e.target.value)} className={inputClass + " appearance-none cursor-pointer"}>
                    <option value="" disabled>Select experience level</option>
                    <option value="beginner">Beginner (0–2 yrs)</option>
                    <option value="intermediate">Intermediate (2–5 yrs)</option>
                    <option value="advanced">Advanced (5+ yrs)</option>
                  </select>
                  <p className="mt-1 text-[10.5px] text-[#9aa2b1]">Beginner: 0–2 yrs · Intermediate: 2–5 yrs · Advanced: 5+ yrs of relevant teaching/industry experience</p>
                </div>
                <div>
                  <label className={labelClass}>Career path <span className="text-red-500">*</span></label>
                  <select value={form.careerPath} onChange={(e) => set("careerPath", e.target.value)} className={inputClass + " appearance-none cursor-pointer"}>
                    <option value="" disabled>Select career path</option>
                    {TRAINER_CAREER_PATHS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Skills <span className="font-normal normal-case text-[#9aa2b1]">(comma separated)</span> <span className="text-red-500">*</span></label>
                  <textarea value={form.skills} onChange={(e) => set("skills", e.target.value)} rows={2} placeholder="e.g. React, TypeScript, Node.js, Python, AWS" className={inputClass + " resize-none"} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Bio <span className="font-normal normal-case text-[#9aa2b1]">— shown publicly on your course pages</span> <span className="text-red-500">*</span></label>
                  <textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} rows={5} placeholder="Tell students about your teaching experience and expertise…" className={inputClass + " resize-none"} />
                </div>
                <div className="rounded-lg p-4" style={{ background: "#f7f8fb", border: "1px solid #e2e6ef" }}>
                  <div className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-2">Review</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] text-[#374151]">
                    <div><span className="text-[#9aa2b1]">Phone:</span> {form.phone || "—"}</div>
                    <div><span className="text-[#9aa2b1]">City:</span> {form.city || "—"}</div>
                    <div><span className="text-[#9aa2b1]">Qualification:</span> {form.qualification || "—"}</div>
                    <div><span className="text-[#9aa2b1]">Experience:</span> {form.experience || "—"}</div>
                    <div className="col-span-2"><span className="text-[#9aa2b1]">Career path:</span> {form.careerPath || "—"}</div>
                    <div className="col-span-2"><span className="text-[#9aa2b1]">Skills:</span> {form.skills || "—"}</div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-lg px-3.5 py-2.5 text-[12px] font-semibold text-red-600" style={{ background: "rgba(220,38,38,.06)", border: "1px solid rgba(220,38,38,.2)" }}>
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 px-5 sm:px-7 py-4 border-t border-[#e2e6ef]" style={{ background: "#fafbfc" }}>
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="px-4 py-2 rounded-lg text-[12px] font-semibold text-[#374151] border border-[#e2e6ef] bg-white disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
            >
              Back
            </button>
            <span className="text-[11px] text-[#9aa2b1] font-mono">Step {step + 1} of {STEPS.length}</span>
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => canAdvance && setStep((s) => s + 1)}
                disabled={!canAdvance}
                className="px-5 py-2 rounded-lg text-[12px] font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ background: "linear-gradient(to right, #f05a1a, #ff8a4c)" }}
              >
                Continue
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={!canAdvance || saving}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-[12px] font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ background: "linear-gradient(to right, #f05a1a, #ff8a4c)" }}
              >
                {saving && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {saving ? "Submitting…" : "Submit for review"}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-[#9aa2b1] mt-5">
          After you submit, an admin reviews your profile. You&apos;ll see your account status right at the top once you&apos;re in.
        </p>
      </div>
    </div>
  );
}
