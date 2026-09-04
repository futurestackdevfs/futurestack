"use client";

import { useCallback, useEffect, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { showToast } from "@/lib/toast";
import { STATUS_STYLE, type StudentProfile, type StudentRow } from "../lib/types";

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}
function initials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="font-mono text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--text3)" }}>{children}</span>
      {count !== undefined && (
        <span className="font-mono text-[8.5px] px-1 rounded" style={{ background: "var(--panel)", color: "var(--text3)" }}>{count}</span>
      )}
      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
    </div>
  );
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      showToast("Email copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast("Couldn't copy");
    }
  }
  return (
    <button onClick={copy} title="Copy email"
      className="inline-flex items-center gap-1 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer"
      style={{ background: copied ? "var(--green-d)" : "var(--panel)", color: copied ? "var(--green)" : "var(--text3)", border: "1px solid var(--border)" }}>
      {copied ? "✓ copied" : "⧉ copy"}
    </button>
  );
}

function PasswordResetPanel({ studentId, studentEmail }: { studentId: string; studentEmail: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(studentEmail);
  const [sending, setSending] = useState(false);

  useEffect(() => { setEmail(studentEmail); setOpen(false); }, [studentId, studentEmail]);

  async function send() {
    if (!email.trim() || sending) return;
    setSending(true);
    try {
      const r = await opsFetch(`/api/support/staff/students/${studentId}/send-password-reset`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        showToast(e.message || "Couldn't send reset link");
        return;
      }
      showToast(`Reset link sent to ${email.trim()}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 cursor-pointer text-left">
        <span className="text-[13px]">🔑</span>
        <span className="text-[11.5px] font-bold flex-1" style={{ color: "var(--text)" }}>Send password reset link</span>
        <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          <div className="text-[10px] mb-2" style={{ color: "var(--text3)" }}>
            Sends the same reset-password email as &quot;Forgot password&quot; on the login page.
            Confirm or change the destination email, then send.
          </div>
          <div className="flex gap-2">
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="student email"
              className="flex-1 text-[11px] rounded-md px-2.5 py-1.5 outline-none"
              style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }} />
            <button onClick={send} disabled={sending || !email.trim()}
              className="px-4 py-1.5 rounded-md text-[11px] font-bold text-white disabled:opacity-50 cursor-pointer shrink-0"
              style={{ background: "var(--orange)" }}>
              {sending ? "Sending…" : "Send link"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentsView({ onOpenTicket }: { onOpenTicket: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selId, setSelId] = useState<string | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const p = new URLSearchParams({ limit: "100" });
      if (q.trim()) p.set("q", q.trim());
      const r = await opsFetch(`/api/support/staff/all-students?${p}`);
      if (r.ok) setRows((await r.json()).data ?? []);
    } finally {
      setLoadingList(false);
    }
  }, [q]);

  useEffect(() => { loadList(); }, [loadList]);

  const loadProfile = useCallback(async (id: string) => {
    setLoadingProfile(true);
    try {
      const r = await opsFetch(`/api/support/staff/students/${id}/profile`);
      if (r.ok) setProfile(await r.json());
      else showToast("Couldn't load this student's profile");
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    if (selId) loadProfile(selId);
    else setProfile(null);
  }, [selId, loadProfile]);

  return (
    <div className="h-full flex" style={{ background: "var(--bg)" }}>
      {/* ── student list ── */}
      <div className="shrink-0 flex flex-col" style={{ width: 340, borderRight: "1px solid var(--border)", background: "var(--surface)" }}>
        <div className="px-3.5 py-2.5 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="text-[13px] font-extrabold" style={{ color: "var(--text)" }}>👤 Students</div>
          <div className="font-mono text-[9px] mt-0.5" style={{ color: "var(--text3)" }}>{rows.length} students — every account</div>
        </div>
        <div className="px-3 py-2 shrink-0">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / email…"
            className="w-full text-[10.5px] rounded-md px-2 py-1.5 outline-none"
            style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="p-4 text-[11px]" style={{ color: "var(--text3)" }}>Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-4 text-[11px]" style={{ color: "var(--text3)" }}>No students found.</div>
          ) : rows.map((s) => {
            const sel = selId === s.id;
            return (
              <button key={s.id} onClick={() => setSelId(s.id)}
                className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 cursor-pointer"
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: sel ? "var(--orange-d)" : "transparent",
                  borderLeft: sel ? "2px solid var(--orange)" : "2px solid transparent",
                }}>
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-[9.5px] font-bold shrink-0"
                  style={{ background: "var(--blue-d)", color: "var(--blue)" }}>{initials(s.name)}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] font-semibold truncate" style={{ color: "var(--text)" }}>{s.name}</div>
                  <div className="text-[9.5px] truncate" style={{ color: "var(--text3)" }}>{s.email}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>{timeAgo(s.lastLoginAt)}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── contact details (right panel) ── */}
      <div className="flex-1 overflow-y-auto">
        {!selId ? (
          <div className="h-full flex items-center justify-center text-[12px]" style={{ color: "var(--text3)" }}>
            Select a student to see their contact details.
          </div>
        ) : loadingProfile || !profile ? (
          <div className="h-full flex items-center justify-center text-[12px]" style={{ color: "var(--text3)" }}>Loading…</div>
        ) : (
          <div>
            <div className="px-4 py-3 flex items-start gap-3 sticky top-0 z-10"
              style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
              <span className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                style={{ background: "var(--blue-d)", color: "var(--blue)" }}>{initials(profile.user.name)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-bold truncate" style={{ color: "var(--text)" }}>{profile.user.name}</span>
                  <span className="font-mono text-[8px] font-bold uppercase px-1.5 py-0.5 rounded"
                    style={{ background: profile.user.isActive ? "var(--green-d)" : "var(--panel)", color: profile.user.isActive ? "var(--green)" : "var(--text3)" }}>
                    {profile.user.isActive ? "active" : "inactive"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-0.5 text-[10.5px]" style={{ color: "var(--text3)" }}>
                  <span>✉ {profile.user.email}</span>
                  <CopyBtn value={profile.user.email} />
                </div>
              </div>
            </div>

            <div className="p-4 mx-auto" style={{ maxWidth: 640 }}>
              {/* contact details */}
              <SectionTitle>Contact details</SectionTitle>
              <div className="rounded-lg mb-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                {[
                  ["Email", profile.user.email],
                  ["Phone", profile.user.phone ?? "—"],
                  ["City", profile.user.city ?? "—"],
                  ["Last login", timeAgo(profile.user.lastLoginAt)],
                  ["Joined", fmtDate(profile.user.createdAt)],
                  ["Enrollments", `${profile.courses.length} course${profile.courses.length === 1 ? "" : "s"} · ${profile.projects.length} project${profile.projects.length === 1 ? "" : "s"}`],
                ].map(([label, value], i, arr) => (
                  <div key={label} className="flex items-center justify-between px-3 py-2 text-[11px]"
                    style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <span style={{ color: "var(--text3)" }}>{label}</span>
                    <span style={{ color: "var(--text)" }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* password reset */}
              <SectionTitle>Account actions</SectionTitle>
              <div className="mb-5">
                <PasswordResetPanel studentId={profile.user.id} studentEmail={profile.user.email} />
              </div>

              {/* support history */}
              <SectionTitle count={profile.tickets.length}>Support history</SectionTitle>
              {profile.tickets.length === 0 ? (
                <div className="text-[11px]" style={{ color: "var(--text3)" }}>No support tickets.</div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {profile.tickets.map((t) => (
                    <button key={t.id} onClick={() => onOpenTicket(t.id)}
                      className="w-full text-left rounded-lg px-3 py-2 flex items-center gap-2 cursor-pointer"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <span className="font-mono text-[8.5px] font-bold shrink-0" style={{ color: "var(--text3)" }}>{t.ref}</span>
                      <span className="text-[11px] flex-1 truncate" style={{ color: "var(--text2)" }}>{t.subject}</span>
                      <span className="font-mono text-[8px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0"
                        style={{ background: STATUS_STYLE[t.status].bg, color: STATUS_STYLE[t.status].color }}>{STATUS_STYLE[t.status].label}</span>
                      <span className="font-mono text-[9px] shrink-0" style={{ color: "var(--text3)" }}>{fmtDate(t.createdAt)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
