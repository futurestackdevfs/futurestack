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
function fmtMoney(n: number, currency: string): string {
  const symbol = currency === "USD" ? "$" : "₹";
  return symbol + n.toLocaleString(currency === "USD" ? "en-US" : "en-IN", { maximumFractionDigits: 0 });
}
function initials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}
function Stars({ n }: { n: number }) {
  return (
    <span style={{ color: "var(--amber, #b45309)", letterSpacing: 1 }}>
      {"★".repeat(n)}<span style={{ color: "var(--border2)" }}>{"★".repeat(5 - n)}</span>
    </span>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const c = pct >= 80 ? "var(--green)" : pct >= 30 ? "var(--amber, #b45309)" : "var(--text3)";
  return (
    <div className="flex items-center gap-1.5" style={{ minWidth: 90 }}>
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 5, background: "var(--panel)", border: "1px solid var(--border)" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: c }} />
      </div>
      <span className="font-mono text-[9.5px] shrink-0" style={{ color: "var(--text3)" }}>{pct}%</span>
    </div>
  );
}

function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="font-mono text-[9.5px] font-bold uppercase tracking-widest" style={{ color: "var(--text3)" }}>{children}</span>
      {count !== undefined && (
        <span className="font-mono text-[8.5px] px-1 rounded" style={{ background: "var(--panel)", color: "var(--text3)" }}>{count}</span>
      )}
      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
    </div>
  );
}

export default function EnrollmentsView({ onOpenTicket }: { onOpenTicket: (id: string) => void }) {
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
      const r = await opsFetch(`/api/support/staff/students?${p}`);
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
      {/* ── student table (left) ── */}
      <div className="shrink-0 flex flex-col" style={{ width: 420, borderRight: "1px solid var(--border)", background: "var(--surface)" }}>
        <div className="px-3.5 py-2.5 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="text-[13px] font-extrabold" style={{ color: "var(--text)" }}>🎓 Enrollments</div>
          <div className="font-mono text-[9px] mt-0.5" style={{ color: "var(--text3)" }}>{rows.length} students — click a row for full details</div>
        </div>
        <div className="px-3 py-2 shrink-0">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / email / course…"
            className="w-full text-[10.5px] rounded-md px-2 py-1.5 outline-none"
            style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }} />
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {["Student", "Courses", "Last login"].map((h) => (
                  <th key={h} className="text-left font-mono text-[8px] font-bold uppercase tracking-wider px-2.5 py-1.5 sticky top-0"
                    style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingList ? (
                <tr><td colSpan={3} className="px-3 py-8 text-center text-[11px]" style={{ color: "var(--text3)" }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={3} className="px-3 py-8 text-center text-[11px]" style={{ color: "var(--text3)" }}>No students found.</td></tr>
              ) : rows.map((s) => {
                const sel = selId === s.id;
                return (
                  <tr key={s.id} onClick={() => setSelId(s.id)} className="cursor-pointer"
                    style={{ background: sel ? "var(--orange-d)" : "transparent", borderLeft: sel ? "2px solid var(--orange)" : "2px solid transparent" }}>
                    <td className="px-2.5 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[8.5px] font-bold shrink-0"
                          style={{ background: "var(--blue-d)", color: "var(--blue)" }}>{initials(s.name)}</span>
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold truncate" style={{ color: "var(--text)" }}>{s.name}</div>
                          <div className="text-[9px] truncate" style={{ color: "var(--text3)" }}>{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2.5 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                      <span className="font-mono text-[9.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--panel)", color: "var(--text2)" }}>{s.enrollmentCount}</span>
                    </td>
                    <td className="px-2.5 py-2 font-mono text-[9px]" style={{ color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>{timeAgo(s.lastLoginAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 360° profile (right panel — like a ticket detail) ── */}
      <div className="flex-1 overflow-y-auto">
        {!selId ? (
          <div className="h-full flex items-center justify-center text-[12px]" style={{ color: "var(--text3)" }}>
            Select a student from the table to see their full profile.
          </div>
        ) : loadingProfile || !profile ? (
          <div className="h-full flex items-center justify-center text-[12px]" style={{ color: "var(--text3)" }}>Loading profile…</div>
        ) : (
          <div>
            {/* sticky header — same feel as SupportConsoleBody's ticket header */}
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
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-[10.5px]" style={{ color: "var(--text3)" }}>
                  <span>✉ {profile.user.email}</span>
                  {profile.user.phone && <span>☎ {profile.user.phone}</span>}
                  {profile.user.city && <span>📍 {profile.user.city}</span>}
                  <span>last login: {timeAgo(profile.user.lastLoginAt)}</span>
                  <span>joined {fmtDate(profile.user.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 mx-auto" style={{ maxWidth: 860 }}>
              {/* courses */}
              <SectionTitle count={profile.courses.length}>Courses</SectionTitle>
              {profile.courses.length === 0 ? (
                <div className="text-[11px] mb-5" style={{ color: "var(--text3)" }}>No course enrollments.</div>
              ) : (
                <div className="flex flex-col gap-2 mb-5">
                  {profile.courses.map((c) => (
                    <div key={c.enrollmentId} className="rounded-lg p-3 flex items-center gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-bold truncate" style={{ color: "var(--text)" }}>{c.title}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-[9.5px]" style={{ color: "var(--text3)" }}>
                          <span className="font-mono px-1 rounded"
                            style={{ background: c.status === "active" ? "var(--green-d)" : "var(--panel)", color: c.status === "active" ? "var(--green)" : "var(--text3)" }}>{c.status}</span>
                          <span>{fmtMoney(c.amountPaid, "INR")} paid</span>
                          <span>enrolled {fmtDate(c.enrolledAt)}</span>
                          {c.certificate && (
                            <span style={{ color: "var(--orange)" }}>🎓 {c.certificate.credentialId}{c.certificate.score != null ? ` · ${c.certificate.score}%` : ""}</span>
                          )}
                        </div>
                      </div>
                      <ProgressBar pct={c.progressPercent} />
                    </div>
                  ))}
                </div>
              )}

              {/* projects */}
              <SectionTitle count={profile.projects.length}>Live projects</SectionTitle>
              {profile.projects.length === 0 ? (
                <div className="text-[11px] mb-5" style={{ color: "var(--text3)" }}>No project purchases.</div>
              ) : (
                <div className="flex flex-col gap-2 mb-5">
                  {profile.projects.map((p) => (
                    <div key={p.orderItemId} className="rounded-lg p-3 flex items-center gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-bold truncate" style={{ color: "var(--text)" }}>{p.name}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-[9.5px]" style={{ color: "var(--text3)" }}>
                          <span className="font-mono px-1 rounded" style={{ background: "var(--panel)", color: "var(--text3)" }}>{p.status ?? "—"}</span>
                          <span>purchased {fmtDate(p.purchasedAt)}</span>
                        </div>
                      </div>
                      <ProgressBar pct={p.progressPercent} />
                    </div>
                  ))}
                </div>
              )}

              {/* ratings */}
              <SectionTitle count={profile.reviews.length}>Ratings given</SectionTitle>
              {profile.reviews.length === 0 ? (
                <div className="text-[11px] mb-5" style={{ color: "var(--text3)" }}>No ratings/reviews yet.</div>
              ) : (
                <div className="flex flex-col gap-2 mb-5">
                  {profile.reviews.map((r) => (
                    <div key={r.id} className="rounded-lg p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <div className="flex items-center gap-2">
                        <Stars n={r.rating} />
                        <span className="text-[11px] font-semibold truncate" style={{ color: "var(--text2)" }}>on {r.on}</span>
                        <span className="ml-auto font-mono text-[9px]" style={{ color: "var(--text3)" }}>{fmtDate(r.createdAt)}</span>
                      </div>
                      {r.comment && <div className="text-[11px] mt-1.5" style={{ color: "var(--text2)" }}>{r.comment}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* recent orders */}
              <SectionTitle count={profile.recentOrders.length}>Recent orders</SectionTitle>
              {profile.recentOrders.length === 0 ? (
                <div className="text-[11px] mb-5" style={{ color: "var(--text3)" }}>No orders yet.</div>
              ) : (
                <div className="overflow-x-auto mb-5 rounded-lg" style={{ border: "1px solid var(--border)" }}>
                  <table className="w-full">
                    <thead>
                      <tr>
                        {["Order", "Amount", "Status", "Date"].map((h) => (
                          <th key={h} className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5"
                            style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {profile.recentOrders.map((o, i) => (
                        <tr key={o.id} style={{ background: i % 2 === 0 ? "var(--surface)" : "var(--panel)" }}>
                          <td className="px-2.5 py-1.5 font-mono text-[9.5px]" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{o.razorpayOrderId.slice(0, 16)}</td>
                          <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: "var(--green)", borderBottom: "1px solid var(--border)" }}>{fmtMoney(o.totalAmount, o.currency)}</td>
                          <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                            <span className="font-mono text-[8.5px] font-bold px-1.5 py-0.5 rounded"
                              style={{ background: o.status === "PAID" ? "var(--green-d)" : "var(--panel)", color: o.status === "PAID" ? "var(--green)" : "var(--text3)" }}>{o.status}</span>
                          </td>
                          <td className="px-2.5 py-1.5 font-mono text-[9.5px]" style={{ color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>{fmtDate(o.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

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
