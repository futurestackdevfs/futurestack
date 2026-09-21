"use client";

import { createContext, useContext, useState, type FormEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LEAD_COURSE_OPTIONS } from "@/app/ops/sales/lib/data";

interface CareerGuidanceCtx {
  openLead: (source: string) => void;
}

const CareerGuidanceContext = createContext<CareerGuidanceCtx>({ openLead: () => {} });

export function useCareerGuidance() {
  return useContext(CareerGuidanceContext);
}

export function CareerGuidance({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("fab");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pathname = usePathname();
  const hidden = pathname.startsWith("/my-dashboard") || pathname.startsWith("/profile");

  const openLead = (src: string) => {
    setSource(src);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setSuccess(false);
    setError(null);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();

    if (!name || !phone || !/\S+@\S+\.\S+/.test(email)) return;

    const payload = {
      name,
      phone,
      email,
      course: String(fd.get("course") ?? ""),
      city: String(fd.get("city") ?? ""),
      source,
    };

    setSubmitting(true);
    setError(null);
    fetch("/api/public-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not submit right now — please try again.");
        setSuccess(true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not submit right now — please try again."))
      .finally(() => setSubmitting(false));
  };

  return (
    <CareerGuidanceContext.Provider value={{ openLead }}>
      {children}

      <button
        onClick={() => openLead("fab")}
        className="fixed right-6 bottom-[39px] z-[900] flex items-center gap-2 rounded-full border-none px-4 py-3 text-[13px] font-bold text-white cursor-pointer shadow-[0_10px_30px_rgba(255,106,26,.4)] hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(255,106,26,.5)]"
        style={{ background: "linear-gradient(135deg, var(--orange) 0%, var(--orange2) 100%)", display: hidden ? "none" : undefined }}
      >
        <span className="relative flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white/20 text-[14px]">
          <span className="absolute -inset-1 rounded-full border-2 opacity-55 animate-ping" style={{ borderColor: "var(--orange)" }} />
          🎓
        </span>
        Free Career Guidance
      </button>

      {open && !hidden && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(6,10,20,.6)] p-5 backdrop-blur-[3px]"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="w-full max-w-[440px] max-h-[92vh] overflow-y-auto rounded-[18px] shadow-[var(--shadow-lg)]" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            {!success ? (
              <>
                <div className="relative overflow-hidden rounded-t-[18px] px-5.5 pb-4 pt-5.5 text-white" style={{ background: "linear-gradient(135deg, #0b1120 0%, #1a1030 100%)" }}>
                  <div className="pointer-events-none absolute -right-5 -top-10 h-[160px] w-[160px] rounded-full" style={{ background: "radial-gradient(circle, rgba(255,106,26,.4) 0%, transparent 70%)" }} />
                  <button
                    onClick={close}
                    className="absolute right-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-[14px] text-white"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                  <h2 className="relative text-[20px] font-bold leading-[1.25] mb-1.5">Get Free Career Counselling</h2>
                  <p className="relative text-[12px] leading-[1.5]" style={{ color: "#9ba8be" }}>Tell us a bit about yourself — one of our course advisors will call you back with the right course, fees &amp; batch options.</p>
                  <div className="relative mt-3.5 flex flex-wrap gap-3.5">
                    <div className="flex items-center gap-1.5 text-[10.5px]" style={{ color: "#c7cfdd" }}>✅ 100% Free</div>
                    <div className="flex items-center gap-1.5 text-[10.5px]" style={{ color: "#c7cfdd" }}>🔒 No Spam</div>
                    <div className="flex items-center gap-1.5 text-[10.5px]" style={{ color: "#c7cfdd" }}>⚡ Callback in 2 hrs</div>
                  </div>
                </div>

                <form className="px-5.5 pb-5.5 pt-5" onSubmit={handleSubmit}>
                  <div className="mb-3 flex flex-col gap-1">
                    <label className="text-[11px] font-semibold" style={{ color: "var(--text2)" }}>Full Name <span style={{ color: "var(--orange)" }}>*</span></label>
                    <input type="text" name="name" placeholder="Enter your full name" required
                      className="h-10 rounded-lg px-3 outline-none"
                      style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }} />
                  </div>
                  <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold" style={{ color: "var(--text2)" }}>Phone <span style={{ color: "var(--orange)" }}>*</span></label>
                      <input type="tel" name="phone" placeholder="Enter your phone number" required
                        className="h-10 rounded-lg px-3 outline-none"
                        style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold" style={{ color: "var(--text2)" }}>Email <span style={{ color: "var(--orange)" }}>*</span></label>
                      <input type="email" name="email" placeholder="Enter your email" required
                        className="h-10 rounded-lg px-3 outline-none"
                        style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }} />
                    </div>
                  </div>
                  <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold" style={{ color: "var(--text2)" }}>Course Interest</label>
                      <select name="course"
                        className="h-10 rounded-lg px-3 outline-none"
                        style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}>
                        {LEAD_COURSE_OPTIONS.map((course) => <option key={course}>{course}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold" style={{ color: "var(--text2)" }}>City</label>
                      <input type="text" name="city" placeholder="Enter your city"
                        className="h-10 rounded-lg px-3 outline-none"
                        style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }} />
                    </div>
                  </div>

                  {error && (
                    <div className="mt-1.5 rounded-[8px] px-3 py-2 text-[11px] font-semibold text-[#dc2626]" style={{ background: "rgba(220,38,38,.08)", border: "1px solid rgba(220,38,38,.25)" }}>
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={submitting}
                    className="mt-1.5 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border-none text-[13px] font-bold text-white shadow-[0_6px_20px_rgba(255,106,26,.35)] disabled:opacity-55"
                    style={{ background: "var(--orange)" }}>
                    {submitting ? (
                      <>
                        <span className="h-[13px] w-[13px] rounded-full border-2 border-white/40 border-t-white animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      "Request Free Callback"
                    )}
                  </button>
                  <p className="mt-2.5 text-center text-[10px]" style={{ color: "var(--muted)" }}>By submitting, you agree to be contacted by our course advisors.</p>
                </form>
              </>
            ) : (
              <div className="px-6.5 py-8 text-center">
                <div className="mx-auto mb-4 flex h-[60px] w-[60px] items-center justify-center rounded-full text-[28px]" style={{ background: "rgba(22,163,74,.12)", color: "var(--green)" }}>
                  ✓
                </div>
                <h3 className="mb-2 text-[17px] font-bold">Thanks, we&apos;ve got it!</h3>
                <p className="mb-5 text-[12.5px] leading-[1.6]" style={{ color: "var(--muted)" }}>
                  A course advisor will call you shortly to help you pick the right course.<br />
                  Meanwhile, feel free to keep exploring.
                </p>
                <button onClick={close}
                  className="rounded-lg px-4.5 py-2 text-[12px] font-semibold"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text2)" }}>
                  Continue browsing
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </CareerGuidanceContext.Provider>
  );
}

export function CareerGuidanceCard() {
  const { openLead } = useCareerGuidance();
  return (
    <div className="relative overflow-hidden rounded-[16px] border p-4 text-white" style={{ background: "linear-gradient(155deg, #131a2c 0%, #0b1120 100%)", borderColor: "var(--border2)" }}>
      <div className="pointer-events-none absolute -right-[30px] -top-[30px] h-[130px] w-[130px] rounded-full" style={{ background: "radial-gradient(circle, rgba(255,106,26,.35) 0%, transparent 70%)" }} />
      <span className="relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.04em] mb-2.5" style={{ background: "rgba(255,106,26,.18)", color: "var(--orange2)" }}>
        <span className="h-[5px] w-[5px] rounded-full bg-[#4ade80]" />Free Counselling
      </span>
      <h3 className="relative mb-1.5 text-[15.5px] font-bold leading-[1.3]">Not sure which course fits you?</h3>
      <p className="relative mb-3.5 text-[11.5px] leading-[1.55]" style={{ color: "#9ba8be" }}>Talk to a career expert for 15 minutes — get a personalised roadmap, fee &amp; batch details. No cost, no obligation.</p>
      <button onClick={() => openLead("sidebar_card")} className="relative flex w-full items-center justify-center gap-1.5 rounded-lg border-none bg-white p-2.5 text-[12.5px] font-bold" style={{ color: "#0b1120" }}>
        📞 Request a Free Callback
      </button>
      <div className="relative mt-2.5 flex items-center gap-1.5 text-[10px]" style={{ color: "#6b7a95" }}>⚡ Avg. response time: under 2 hours</div>
    </div>
  );
}