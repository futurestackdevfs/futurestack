"use client";

import { useState, useRef, useEffect } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";

interface CreateStaffModalProps {
  role: { id: string; label: string; icon: string; color: string };
  onClose: () => void;
}

export default function CreateStaffModal({ role, onClose }: CreateStaffModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ email: string; companyId: string; tempPassword: string; emailSent?: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailValid) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await opsFetch("/api/admin/staff", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          role: role.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? "Failed to create account.");
      }
      setResult({ email: data.email, companyId: data.companyId, tempPassword: data.tempPassword, emailSent: !!data.emailSent });
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function copyCredentials() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(`Login Email: ${result.companyId}\nPassword: ${result.tempPassword}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={onClose}>
      <div
        ref={ref}
        className="w-full max-w-md rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden"
        style={{ background: "var(--surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-3" style={{ background: "var(--bg)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[15px]" style={{ background: `color-mix(in srgb, ${role.color} 12%, transparent)`, color: role.color }}>
            {role.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[13px] font-bold" style={{ color: "var(--text)" }}>Add {role.label}</h2>
            <p className="text-[10.5px] text-[var(--text3)] mt-0.5">Email &amp; temporary password auto-generated</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg border-none bg-transparent cursor-pointer hover:bg-[var(--bg)] transition-colors"
            style={{ color: "var(--text3)" }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {result ? (
          <div className="p-5 space-y-4">
            <div className="rounded-xl p-4 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded-full flex items-center justify-center bg-green-500/15 text-green-500 text-[11px] font-bold">✓</span>
                <span className="text-[12px] font-bold" style={{ color: "var(--text)" }}>Account created!</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                  <span className="text-[10.5px] text-[var(--text3)] font-semibold uppercase tracking-wider">Login Email</span>
                  <span className="text-[12px] font-mono font-bold truncate" style={{ color: "var(--blue)" }}>{result.companyId}</span>
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                  <span className="text-[10.5px] text-[var(--text3)] font-semibold uppercase tracking-wider">Password</span>
                  <span className="text-[12px] font-mono font-bold" style={{ color: "var(--orange)" }}>{result.tempPassword}</span>
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                  <span className="text-[10.5px] text-[var(--text3)] font-semibold uppercase tracking-wider">Personal Email</span>
                  <span className="text-[12px] font-mono font-bold truncate" style={{ color: "var(--green)" }}>{result.email}</span>
                </div>
              </div>
              <p className="text-[10.5px] text-[var(--text3)] mt-3 leading-[1.5]">
                {result.emailSent ? (
                  <>These credentials were also emailed to <strong style={{ color: "var(--green)" }}>{result.email}</strong>. They&apos;ll set their own password on first login.</>
                ) : (
                  <>Share these credentials with {name.trim()}. They&apos;ll set their own password on first login.</>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyCredentials}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-none text-[12px] font-bold text-white cursor-pointer transition-all"
                style={{ background: "linear-gradient(135deg, #ff6b00, #2563eb)" }}
              >
                {copied ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                    Copy Credentials
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-[12px] font-bold cursor-pointer border"
                style={{ color: "var(--text2)", borderColor: "var(--border)", background: "transparent" }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="p-5 space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-wider">Full Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ram Warhekar"
                className="w-full px-3.5 py-2.5 rounded-lg text-[13px] outline-none transition-all border-[1.5px] focus:border-[var(--blue)] focus:shadow-[0_0_0_3px_var(--blue-d)]"
                style={{ background: "var(--bg)", color: "var(--text)", borderColor: "var(--border)" }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-wider">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. ram@gmail.com"
                type="email"
                className="w-full px-3.5 py-2.5 rounded-lg text-[13px] outline-none transition-all border-[1.5px] focus:border-[var(--blue)] focus:shadow-[0_0_0_3px_var(--blue-d)]"
                style={{ background: "var(--bg)", color: "var(--text)", borderColor: "var(--border)" }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-wider">
                Phone Number <span className="font-normal normal-case text-[var(--text3)]">(optional)</span>
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                type="tel"
                className="w-full px-3.5 py-2.5 rounded-lg text-[13px] outline-none transition-all border-[1.5px] focus:border-[var(--blue)] focus:shadow-[0_0_0_3px_var(--blue-d)]"
                style={{ background: "var(--bg)", color: "var(--text)", borderColor: "var(--border)" }}
              />
            </div>

            {error && (
              <div className="rounded-lg px-3.5 py-2.5 text-[11.5px] font-medium bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-[11px] leading-[1.5]" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--muted)" }}>
              <span style={{ color: "var(--orange)" }}>💡</span>
              <span>A company login email and a temporary password will be generated automatically.</span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl text-[12px] font-bold cursor-pointer border"
                style={{ color: "var(--text2)", borderColor: "var(--border)", background: "transparent" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-none text-[12px] font-bold text-white cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: `linear-gradient(135deg, ${role.color}, color-mix(in srgb, ${role.color} 75%, transparent))` }}
              >
                {loading ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Create Account
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}