"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

/**
 * Global "Contact us" popup. Mounted once in the (student) layout. Opens when:
 *  - any `<a href="#contact">` on the page is clicked, or
 *  - `window.dispatchEvent(new Event("fs:open-contact"))` is fired.
 */

type ContactType = "business" | "trainer" | "other";

const TYPE_OPTIONS: { value: ContactType; label: string; hint: string }[] = [
  { value: "business", label: "Business / Partnership", hint: "Corporate training, collaborations, hiring" },
  { value: "trainer", label: "Become a Trainer", hint: "Teach or mentor on Future Stack" },
  { value: "other", label: "Something else", hint: "General questions, press, feedback" },
];

const inputCls =
  "w-full h-10 rounded-lg bg-[var(--bg2)] border border-[var(--border)] px-3 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--orange)] transition-colors";

export function ContactModal() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ContactType>("business");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const openIt = () => {
      setSent(false);
      setError("");
      setType("business");
      setOpen(true);
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href="#contact"]');
      if (a) {
        e.preventDefault();
        openIt();
      }
    };
    document.addEventListener("click", onClick);
    window.addEventListener("fs:open-contact", openIt);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("fs:open-contact", openIt);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim() || undefined,
      type,
      company: String(fd.get("company") ?? "").trim() || undefined,
      message: String(fd.get("message") ?? "").trim(),
      website: String(fd.get("website") ?? ""), // honeypot
    };
    if (payload.name.length < 2) return setError("Please enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return setError("Please enter a valid email.");
    if (payload.message.length < 10) return setError("Please add a bit more detail.");

    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/contact/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Couldn't send your message — please try again.");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send your message — please try again.");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-[rgba(6,10,20,.6)] p-4 backdrop-blur-[3px]"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div className="w-full max-w-[460px] max-h-[92vh] overflow-y-auto rounded-[18px] shadow-[var(--shadow-lg)]" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="relative overflow-hidden rounded-t-[18px] px-6 pb-4 pt-6 text-white" style={{ background: "linear-gradient(135deg, #0b1120 0%, #1a1030 100%)" }}>
          <div className="pointer-events-none absolute -right-5 -top-10 h-[160px] w-[160px] rounded-full" style={{ background: "radial-gradient(circle, rgba(255,106,26,.4) 0%, transparent 70%)" }} />
          <button
            onClick={() => setOpen(false)}
            className="absolute right-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-[14px] text-white"
            aria-label="Close"
          >
            ✕
          </button>
          <h2 className="relative text-[19px] font-bold leading-[1.25] mb-1">Contact Future Stack</h2>
          <p className="relative text-[12px] leading-[1.5]" style={{ color: "#9ba8be" }}>
            Partnerships, corporate training, trainer applications or anything else — we&apos;ll reply by email.
          </p>
        </div>

        {sent ? (
          <div className="p-8 text-center">
            <div className="text-[36px] mb-3">✅</div>
            <h3 className="text-[16px] font-bold text-[var(--text)] mb-1">Message sent</h3>
            <p className="text-[13px] text-[var(--muted)] max-w-[320px] mx-auto">We&apos;ve got your message and will reply to your email shortly.</p>
            <button onClick={() => setOpen(false)} className="mt-5 h-10 px-6 rounded-lg bg-[var(--bg2)] border border-[var(--border)] text-[13px] font-semibold text-[var(--text)] hover:border-[var(--border2)]">Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input name="name" className={inputCls} placeholder="Full name" autoComplete="name" required />
              <input name="email" type="email" className={inputCls} placeholder="Email" autoComplete="email" required />
              <input name="phone" type="tel" className={inputCls} placeholder="Phone (optional)" autoComplete="tel" maxLength={20} />
              <input name="company" className={inputCls} placeholder="Company (optional)" autoComplete="organization" maxLength={160} />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((o) => {
                const active = type === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setType(o.value)}
                    title={o.hint}
                    className={`rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-all ${
                      active
                        ? "border-[var(--orange)] bg-[var(--orange-d)] text-[var(--orange)]"
                        : "border-[var(--border)] bg-[var(--bg2)] text-[var(--text2)] hover:border-[var(--border2)]"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>

            <textarea
              name="message"
              rows={4}
              required
              minLength={10}
              maxLength={4000}
              className={`${inputCls} h-auto py-2.5 mt-3 resize-y`}
              placeholder="Tell us what you're looking for…"
            />

            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

            {error && <p className="mt-3 text-[12px] text-[var(--red)]">{error}</p>}

            <button
              type="submit"
              disabled={sending}
              className="mt-4 w-full h-11 rounded-xl bg-[linear-gradient(135deg,var(--orange),var(--orange2))] text-white text-[13.5px] font-extrabold shadow-[0_5px_18px_rgba(240,90,26,.35)] transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {sending ? "Sending…" : "Send message"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
