"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "@/app/auth/hooks/use-auth";
import { useStudentDashboard } from "@/app/(student)/hooks/student-dashboard";
import { showToast } from "@/lib/toast";
import {
  FIELD_LABEL,
  SUPPORT_TOPICS,
  type FieldKey,
  type SubTopic,
  type TopicCategory,
} from "./topics";

interface OrderLite {
  id: string;
  totalAmount: number;
  currency: "INR" | "USD";
  createdAt: string;
  items: { course: { title: string } | null; project?: { name: string } | null }[];
}

interface TicketLite {
  id: string;
  ref: string;
  subject: string;
  status: "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
  lastMessageAt: string;
}

const STATUS_DOT: Record<TicketLite["status"], string> = {
  OPEN: "#3b82f6",
  PENDING: "#f59e0b",
  RESOLVED: "#22c55e",
  CLOSED: "#6b7280",
};

function orderLabel(o: OrderLite): string {
  const name = o.items[0]?.course?.title ?? o.items[0]?.project?.name ?? "Order";
  const d = new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const amt = o.currency === "USD" ? `$${o.totalAmount}` : `₹${o.totalAmount.toLocaleString("en-IN")}`;
  return `${name} · ${amt} · ${d}`;
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function SupportPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data: dash } = useStudentDashboard();

  const { data: orders } = useSWR<OrderLite[]>(isAuthenticated ? "/api/student/orders" : null);
  const { data: myTickets } = useSWR<{ data: TicketLite[] }>(isAuthenticated ? "/api/support/tickets?limit=6" : null);

  const [catId, setCatId] = useState<TopicCategory["id"] | null>(null);
  const [sub, setSub] = useState<SubTopic | null>(null);
  const [phase, setPhase] = useState<"list" | "help" | "form">("list");
  const [search, setSearch] = useState("");

  // form
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [attachment, setAttachment] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const cat = useMemo(() => SUPPORT_TOPICS.find((c) => c.id === catId) ?? null, [catId]);
  const courses = dash?.enrolledCourses ?? [];

  const searchHits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const hits: { cat: TopicCategory; sub: SubTopic }[] = [];
    for (const c of SUPPORT_TOPICS)
      for (const s of c.subtopics)
        if (s.label.toLowerCase().includes(q) || c.label.toLowerCase().includes(q)) hits.push({ cat: c, sub: s });
    return hits.slice(0, 8);
  }, [search]);

  function openCategory(id: TopicCategory["id"]) {
    setCatId(id);
    setSub(null);
    setPhase("list");
    setSearch("");
  }

  function openSub(c: TopicCategory, s: SubTopic) {
    setCatId(c.id);
    setSub(s);
    setSubject(s.label);
    setFields(s.fields?.includes("browser") ? { browser: navigator.userAgent } : {});
    setPhase(s.help ? "help" : "form");
    setSearch("");
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/discussion", { method: "POST", credentials: "same-origin", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) return showToast(data.message || "Upload failed");
      setAttachment({ url: data.url, name: file.name });
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!cat || !sub) return;
    if (!isAuthenticated) {
      showToast("Sign in to send your ticket");
      router.push("/#student-login");
      return;
    }
    if (subject.trim().length < 3) return showToast("Add a short subject");
    if (body.trim().length < 10) return showToast("Please describe the issue in a bit more detail");
    setSubmitting(true);
    try {
      const context: Record<string, string> = {};
      for (const [k, v] of Object.entries(fields)) if (v.trim()) context[k] = v.trim();
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          category: cat.id,
          topic: sub.id,
          priority: sub.priority ?? "NORMAL",
          context: Object.keys(context).length ? context : undefined,
          attachmentUrl: attachment?.url,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return showToast(data.message || "Couldn't create the ticket");
      showToast(`Ticket ${data.ref} created`);
      router.push(`/support/tickets/${data.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-[calc(100vh-56px)] bg-[#f6f7fb] dark:bg-[#080b12] overflow-hidden">
      {/* ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-100"
        style={{
          background:
            "radial-gradient(600px 300px at 15% -5%, rgba(240,90,26,.10), transparent 60%), radial-gradient(700px 340px at 100% 0%, rgba(37,99,235,.12), transparent 55%)",
        }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 dark:opacity-[0.05] opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(#8891a5 1px,transparent 1px),linear-gradient(90deg,#8891a5 1px,transparent 1px)", backgroundSize: "44px 44px" }} />

      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 lg:gap-8 items-start">

          {/* ── LEFT RAIL ─────────────────────────────── */}
          <aside className="lg:sticky lg:top-[76px]">
            <div className="rounded-2xl border border-[#e4e7ef] dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm overflow-hidden">
              <div className="px-4 pt-4 pb-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f05a1a]">Support</div>
                <div className="text-[15px] font-extrabold text-[#0f1420] dark:text-[#e9edf6] mt-0.5">Help Center</div>
              </div>
              <nav className="px-2 pb-2">
                {SUPPORT_TOPICS.map((c) => {
                  const on = catId === c.id;
                  return (
                    <button key={c.id} onClick={() => openCategory(c.id)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12.5px] font-medium transition-all"
                      style={{
                        background: on ? "linear-gradient(90deg,rgba(240,90,26,.12),transparent)" : "transparent",
                        color: on ? "#f05a1a" : "var(--fs-rail, #4b5563)",
                        boxShadow: on ? "inset 2px 0 0 #f05a1a" : "none",
                      }}>
                      <span className="text-[15px]">{c.icon}</span>
                      <span className="dark:text-inherit">{c.label}</span>
                    </button>
                  );
                })}
              </nav>
              <div className="border-t border-[#e4e7ef] dark:border-white/[0.08] p-3 flex flex-col gap-2">
                <Link href="/support/tickets"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-[12px] font-semibold text-[#2563eb] bg-[#eef2ff] dark:bg-[#182238] dark:text-[#93b4ff]">
                  My tickets <span>→</span>
                </Link>
                <Link href="/faq"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-[12px] font-semibold text-[#6b7280] dark:text-[#8b93a7] hover:text-[#f05a1a]">
                  Browse the FAQ <span>→</span>
                </Link>
              </div>
            </div>

            {/* recent tickets */}
            {isAuthenticated && (myTickets?.data?.length ?? 0) > 0 && (
              <div className="mt-4 rounded-2xl border border-[#e4e7ef] dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm p-3">
                <div className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#8b93a7] px-1 mb-2">Recent tickets</div>
                <div className="flex flex-col gap-1">
                  {myTickets!.data.slice(0, 5).map((t) => (
                    <Link key={t.id} href={`/support/tickets/${t.id}`}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.04]">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_DOT[t.status] }} />
                      <span className="text-[11px] font-medium text-[#374151] dark:text-[#aeb7c7] truncate flex-1">{t.subject}</span>
                      <span className="text-[9px] text-[#9ca3af]">{timeAgo(t.lastMessageAt)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* ── RIGHT: CONTENT ────────────────────────── */}
          <section className="min-w-0">
            {/* search + heading */}
            <div className="mb-6">
              <h1 className="text-[26px] sm:text-[30px] font-extrabold tracking-tight text-[#0f1420] dark:text-[#e9edf6]">
                How can we help?
              </h1>
              <p className="text-[13px] text-[#6b7280] dark:text-[#8b93a7] mt-1">
                Search or pick a topic — many issues have an instant fix.
              </p>
              <div className="relative mt-4 max-w-[560px]">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]">⌕</span>
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Describe your issue…"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-[13.5px] outline-none bg-white dark:bg-[#0e131d] border border-[#e4e7ef] dark:border-white/10 text-[#0f1420] dark:text-[#e9edf6] focus:border-[#f05a1a] transition-colors" />
                {searchHits.length > 0 && (
                  <div className="absolute z-20 mt-2 w-full rounded-xl border border-[#e4e7ef] dark:border-white/10 bg-white dark:bg-[#0e131d] shadow-xl overflow-hidden">
                    {searchHits.map(({ cat: c, sub: s }) => (
                      <button key={c.id + s.id} onClick={() => openSub(c, s)}
                        className="w-full text-left px-4 py-2.5 text-[12.5px] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] flex items-center gap-2">
                        <span>{c.icon}</span>
                        <span className="text-[#0f1420] dark:text-[#e9edf6]">{s.label}</span>
                        <span className="ml-auto text-[10px] text-[#9ca3af]">{c.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* body by state */}
            {!cat && <Landing onPick={openCategory} />}

            {cat && !sub && (
              <Panel>
                <Crumbs items={[cat.label]} />
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[26px]">{cat.icon}</span>
                  <div>
                    <div className="text-[16px] font-extrabold text-[#0f1420] dark:text-[#e9edf6]">{cat.label}</div>
                    <div className="text-[12px] text-[#6b7280] dark:text-[#8b93a7]">{cat.blurb}</div>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {cat.subtopics.map((s) => (
                    <button key={s.id} onClick={() => openSub(cat, s)}
                      className="group text-left rounded-xl border border-[#e4e7ef] dark:border-white/10 bg-white dark:bg-[#0e131d] px-4 py-3.5 text-[12.5px] font-medium text-[#0f1420] dark:text-[#e9edf6] hover:border-[#f05a1a] hover:shadow-[0_0_0_3px_rgba(240,90,26,.10)] transition-all flex items-center justify-between gap-3">
                      {s.label}
                      <span className="text-[#c1c6d2] group-hover:text-[#f05a1a] transition-colors">→</span>
                    </button>
                  ))}
                </div>
              </Panel>
            )}

            {cat && sub && phase === "help" && (
              <Panel>
                <Crumbs items={[cat.label, sub.label]} onBack={() => setSub(null)} />
                <div className="text-[17px] font-extrabold text-[#0f1420] dark:text-[#e9edf6] mb-2">{sub.label}</div>
                <p className="text-[13px] leading-relaxed text-[#374151] dark:text-[#aeb7c7] max-w-[640px]">{sub.help}</p>
                <div className="flex flex-wrap gap-2.5 mt-6">
                  {sub.selfServe && (
                    <Link href={sub.selfServe.href}
                      className="px-4 py-2.5 rounded-xl text-[12.5px] font-bold text-white bg-gradient-to-r from-[#2563eb] to-[#4f46e5] shadow-[0_4px_16px_rgba(37,99,235,.3)]">
                      {sub.selfServe.label}
                    </Link>
                  )}
                  <button onClick={() => setPhase("form")}
                    className="px-4 py-2.5 rounded-xl text-[12.5px] font-bold text-[#0f1420] dark:text-[#e9edf6] border border-[#e4e7ef] dark:border-white/15 hover:border-[#f05a1a] transition-colors">
                    This didn't help — contact support
                  </button>
                </div>
              </Panel>
            )}

            {cat && sub && phase === "form" && (
              <Panel>
                <Crumbs items={[cat.label, sub.label, "New ticket"]} onBack={() => setPhase(sub.help ? "help" : "list")} />
                {!isAuthenticated && (
                  <div className="mb-4 rounded-xl px-4 py-3 text-[12px] font-medium bg-[#fff4ec] dark:bg-[#2a1b12] text-[#9a3412] dark:text-[#fdba74] border border-[#ffd9c2] dark:border-[#5c3a24] flex items-center justify-between gap-3 flex-wrap">
                    <span>You're browsing as a guest. Fill this in, then sign in to send it.</span>
                    <Link href="/#student-login" className="font-bold underline whitespace-nowrap">Sign in</Link>
                  </div>
                )}

                <Field label="Subject">
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
                </Field>

                {(sub.fields ?? []).map((f: FieldKey) => (
                  <Field key={f} label={FIELD_LABEL[f]}>
                    {f === "courseId" ? (
                      <select value={fields.courseId ?? ""} onChange={(e) => setFields((p) => ({ ...p, courseId: e.target.value }))} className={inputCls}>
                        <option value="">Select a course…</option>
                        {courses.map((c) => <option key={c.courseId} value={c.courseId}>{c.title}</option>)}
                      </select>
                    ) : f === "orderId" && isAuthenticated ? (
                      <select value={fields.orderId ?? ""} onChange={(e) => setFields((p) => ({ ...p, orderId: e.target.value }))} className={inputCls}>
                        <option value="">Select an order…</option>
                        {(orders ?? []).map((o) => <option key={o.id} value={o.id}>{orderLabel(o)}</option>)}
                      </select>
                    ) : (
                      <input value={fields[f] ?? ""} onChange={(e) => setFields((p) => ({ ...p, [f]: e.target.value }))} className={inputCls}
                        placeholder={f === "orderId" ? "Order number (sign in to pick from a list)" : undefined} />
                    )}
                  </Field>
                ))}

                <Field label="Describe the issue">
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5}
                    placeholder="What happened, what you expected, and any steps to reproduce it…"
                    className={inputCls + " resize-none"} />
                </Field>

                <div className="flex items-center gap-3 mb-5">
                  <label className="text-[11.5px] font-semibold text-[#2563eb] cursor-pointer">
                    {uploading ? "Uploading…" : attachment ? "Replace screenshot" : "📎 Attach a screenshot"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
                  </label>
                  {attachment && <span className="text-[11px] text-[#6b7280] dark:text-[#8b93a7] truncate">{attachment.name}</span>}
                </div>

                <button onClick={submit} disabled={submitting || uploading}
                  className="px-6 py-3 rounded-xl text-[13px] font-extrabold text-white disabled:opacity-60 shadow-[0_6px_20px_rgba(240,90,26,.35)]"
                  style={{ background: "linear-gradient(135deg,#f05a1a,#ff7a3c)" }}>
                  {submitting ? "Creating…" : isAuthenticated ? "Create ticket" : "Sign in to submit"}
                </button>
              </Panel>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

/* ── pieces ──────────────────────────────────────────── */

const inputCls =
  "w-full text-[13px] rounded-xl px-3.5 py-2.5 outline-none bg-white dark:bg-[#0e131d] border border-[#e4e7ef] dark:border-white/10 text-[#0f1420] dark:text-[#e9edf6] focus:border-[#f05a1a] transition-colors";

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#e4e7ef] dark:border-white/[0.08] bg-white/90 dark:bg-white/[0.03] backdrop-blur-sm p-5 sm:p-6">
      {children}
    </div>
  );
}

function Crumbs({ items, onBack }: { items: string[]; onBack?: () => void }) {
  return (
    <div className="flex items-center gap-1.5 mb-4 text-[11px] font-mono text-[#9ca3af]">
      {onBack && (
        <button onClick={onBack} className="text-[#6b7280] dark:text-[#8b93a7] hover:text-[#f05a1a] mr-1">← back</button>
      )}
      <span>support</span>
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="text-[#d1d5db]">/</span>
          <span className={i === items.length - 1 ? "text-[#4b5563] dark:text-[#c1c6d2] font-semibold" : ""}>{it}</span>
        </span>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-bold uppercase tracking-wide text-[#6b7280] dark:text-[#8b93a7] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Landing({ onPick }: { onPick: (id: TopicCategory["id"]) => void }) {
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
      {SUPPORT_TOPICS.map((c) => (
        <button key={c.id} onClick={() => onPick(c.id)}
          className="group relative text-left rounded-2xl border border-[#e4e7ef] dark:border-white/[0.08] bg-white/90 dark:bg-white/[0.03] backdrop-blur-sm p-4 overflow-hidden hover:border-[#f05a1a] hover:-translate-y-0.5 transition-all">
          <div aria-hidden className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity blur-2xl"
            style={{ background: "radial-gradient(circle,rgba(240,90,26,.4),transparent 70%)" }} />
          <div className="relative">
            <div className="text-[24px]">{c.icon}</div>
            <div className="text-[13.5px] font-extrabold text-[#0f1420] dark:text-[#e9edf6] mt-2.5">{c.label}</div>
            <div className="text-[11.5px] text-[#6b7280] dark:text-[#8b93a7] mt-0.5 leading-snug">{c.blurb}</div>
            <div className="mt-3 text-[10.5px] font-bold text-[#f05a1a] opacity-0 group-hover:opacity-100 transition-opacity">
              {c.subtopics.length} topics →
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
