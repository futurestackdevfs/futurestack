"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import useSWR from "swr";

/* ─── scroll reveal ─────────────────────────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity .6s cubic-bezier(.2,.8,.2,1) ${delay}s, transform .6s cubic-bezier(.2,.8,.2,1) ${delay}s`,
      }}>
      {children}
    </div>
  );
}

/* ─── data ─────────────────────────────────────── */
const VALUES = [
  { icon: "🚢", title: "Ship real things", desc: "We measure ourselves by what learners can build after using FutureStack — not by lecture hours." },
  { icon: "🧑‍🏫", title: "Teach by doing", desc: "Everyone here can explain their work. If you can't teach it, you don't fully understand it yet." },
  { icon: "🎯", title: "Learner obsession", desc: "Every decision starts with the person on the other side of the screen trying to change their career." },
  { icon: "🧩", title: "Own the outcome", desc: "Small team, high trust. You own problems end to end — from the idea to the deploy to the follow-up." },
  { icon: "🌱", title: "Grow in the open", desc: "We share drafts early, give direct feedback, and treat every project as a chance to level up." },
  { icon: "⚡", title: "Bias for shipping", desc: "A rough thing in front of real users beats a perfect thing in a doc. Iterate from there." },
];

const MAIL = "futurestack.work@gmail.com";

interface JobPosting {
  id: string;
  title: string;
  duration: string;
  description: string | null;
  requirements?: string | null;
  skills?: string | null;
  createdAt: string;
}

const gmailLink = (subject: string, body = "") =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(MAIL)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

const toList = (text?: string | null) =>
  (text ?? "").split(/\r?\n|,/).map((s) => s.replace(/^[\s•*-]+/, "").trim()).filter(Boolean);

function JobModal({ job, onClose }: { job: JobPosting; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const requirements = toList(job.requirements);
  const skills = toList(job.skills);
  const body = `Hi FutureStack team,\n\nI would like to apply for the "${job.title}" (${job.duration}) position.\n\nName:\nPhone:\nLinkedIn / Portfolio:\n\nPlease find my resume attached.\n\nThanks,`;
  const posted = new Date(job.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  const applyHref = gmailLink(`Application: ${job.title}`, body);

  const heading = (text: string) => (
    <div className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[.12em] text-[var(--orange)] mb-3">
      <span className="w-[14px] h-[2px] rounded-sm bg-gradient-to-r from-[var(--orange)] to-[var(--blue)]" />
      {text}
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center sm:p-6 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={job.title} onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full sm:max-w-[760px] max-h-[92vh] sm:max-h-[86vh] overflow-hidden rounded-t-3xl sm:rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">

        {/* header */}
        <div className="relative shrink-0 px-6 sm:px-8 pt-7 pb-5 border-b border-[var(--border)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--orange)] via-[var(--orange2)] to-[var(--blue)]" />
          <button onClick={onClose} aria-label="Close"
            className="absolute top-4 right-4 z-10 w-9 h-9 grid place-items-center cursor-pointer rounded-full text-[var(--muted)] border border-[var(--border)] hover:border-[var(--orange)] hover:text-[var(--text)] transition-all">✕</button>
          <div className="flex flex-wrap items-center gap-2 pr-10">
            <span className="inline-flex items-center text-[11px] font-semibold text-[var(--blue)] bg-[var(--blue-d)] border border-[var(--blue)]/20 rounded-full px-3 py-1">
              {job.duration}
            </span>
            <span className="text-[11.5px] text-[var(--muted)]">Posted {posted}</span>
          </div>
          <h3 className="text-[clamp(20px,3.4vw,28px)] font-extrabold leading-tight text-[var(--text)] mt-3 pr-10 break-words">{job.title}</h3>
        </div>

        {/* scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 sm:px-8 py-6 space-y-7">
          {job.description && (
            <section>
              {heading("About the role")}
              <p className="text-[13.5px] text-[var(--muted)] leading-[1.75] whitespace-pre-line break-words">{job.description}</p>
            </section>
          )}

          {requirements.length > 0 && (
            <section>
              {heading("Requirements")}
              <ul className="space-y-2.5">
                {requirements.map((r, i) => (
                  <li key={i} className="flex gap-3 text-[13.5px] text-[var(--muted)] leading-relaxed">
                    <span className="mt-[7px] w-1.5 h-1.5 shrink-0 rounded-full bg-[var(--orange)]" />
                    <span className="break-words min-w-0">{r}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {skills.length > 0 && (
            <section>
              {heading("Skills")}
              <div className="flex flex-wrap gap-2">
                {skills.map((s, i) => (
                  <span key={i} className="text-[12px] font-semibold text-[var(--text)] bg-[var(--bg)] border border-[var(--border)] rounded-full px-3.5 py-1.5">{s}</span>
                ))}
              </div>
            </section>
          )}

          {!job.description && requirements.length === 0 && skills.length === 0 && (
            <p className="text-[13.5px] text-[var(--muted)]">More details will be shared when you apply.</p>
          )}
        </div>

        {/* sticky footer */}
        <div className="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-6 sm:px-8 py-4 border-t border-[var(--border)] bg-[var(--card)]">
          <button onClick={onClose}
            className="text-[13px] font-semibold text-[var(--muted)] hover:text-[var(--text)] px-4 py-2.5 rounded-[10px] border border-[var(--border)] hover:border-[var(--blue)] transition-all">
            Close
          </button>
          <a href={applyHref} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 text-white text-[13.5px] font-bold px-7 py-3 rounded-[10px] bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] shadow-[0_10px_28px_-10px_rgba(255,106,26,.5)] hover:-translate-y-0.5 transition-all">
            Apply via Gmail →
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function CareersPage() {
  const [selected, setSelected] = useState<JobPosting | null>(null);
  const { data: jobsData, isLoading: jobsLoading } = useSWR<JobPosting[]>(
    "/api/careers/jobs",
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  );
  const jobs = jobsData ?? [];

  return (
    <div className="min-h-screen bg-[var(--bg)] overflow-hidden">
      <style>{`
        @keyframes crs-drift { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,-24px)} }
        @keyframes crs-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>

      {/* ── HERO ── */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute top-[-15%] right-[-10%] w-[480px] h-[480px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle,var(--orange) 0%,transparent 70%)", filter: "blur(80px)", animation: "crs-drift 30s ease-in-out infinite" }} />
        <div className="absolute bottom-[-15%] left-[-10%] w-[440px] h-[440px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle,var(--blue) 0%,transparent 70%)", filter: "blur(80px)", animation: "crs-drift 36s ease-in-out -10s infinite" }} />

        <div className="relative z-10 text-center px-5 max-w-[760px] mx-auto">
          <Reveal>
            <div className="inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--blue)] bg-[var(--blue-d)] border border-[var(--blue)]/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--orange)] animate-pulse" />
              Building the team
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="text-[clamp(30px,6vw,56px)] font-extrabold leading-[1.06] mb-5 text-[var(--text)]">
              Build the future of{" "}
              <span style={{ background: "linear-gradient(135deg,var(--orange),var(--orange2),var(--blue))", backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent" }}>
                tech education
              </span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-[15px] text-[var(--muted)] max-w-[560px] mx-auto leading-relaxed">
              We're a small, senior team building a platform where people don't just watch lectures —
              they ship real, production-style work and change their careers. Come help us make it better.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="flex gap-3 justify-center flex-wrap mt-6">
              <a href="#roles" className="inline-flex items-center gap-2 font-semibold text-[13.5px] px-6 py-3 rounded-[10px] text-white bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] shadow-[0_10px_28px_-10px_rgba(255,106,26,.4)] hover:-translate-y-0.5 transition-all">
                Open roles ↓
              </a>
              <a href="#life" className="inline-flex items-center gap-2 font-semibold text-[13.5px] px-6 py-3 rounded-[10px] text-[var(--text)] bg-[var(--card)] border border-[var(--border)] hover:border-[var(--blue)] hover:bg-[var(--blue-d)] transition-all">
                Life at FutureStack
              </a>
            </div>
          </Reveal>
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[var(--muted)] text-[10px] font-semibold tracking-wider uppercase"
          style={{ animation: "crs-float 3s ease-in-out infinite" }}>
          scroll
        </div>
      </section>

      {/* ── VALUES ── */}
      <section id="life" className="py-9 md:py-14">
        <div className="mx-auto max-w-[1140px] px-5 md:px-8">
          <Reveal>
            <div className="inline-flex items-center gap-2.5 text-[12px] font-semibold text-[var(--orange)] mb-3">
              <span className="w-[18px] h-[2px] rounded-sm bg-gradient-to-r from-[var(--orange)] to-[var(--blue)]" />
              How we work
            </div>
            <h2 className="text-[clamp(24px,4vw,38px)] font-extrabold text-[var(--text)] mb-3">The things we actually mean</h2>
            <p className="text-[14px] text-[var(--muted)] max-w-[540px] mb-6">
              Not a poster on a wall — these show up in how we plan, review, and ship every week.
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.04}>
                <div className="h-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--orange)] hover:-translate-y-0.5 transition-all">
                  <div className="text-[22px]">{v.icon}</div>
                  <div className="text-[14.5px] font-bold text-[var(--text)] mt-3">{v.title}</div>
                  <p className="text-[12.5px] text-[var(--muted)] mt-1.5 leading-relaxed">{v.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── OPEN ROLES ── */}
      <section id="roles" className="py-9 md:py-14" style={{ background: "var(--panel, rgba(0,0,0,.02))" }}>
        <div className="mx-auto max-w-[1140px] px-5 md:px-8">
          <Reveal>
            <h2 className="text-[clamp(24px,4vw,38px)] font-extrabold text-[var(--text)] mb-3">Open roles</h2>
          </Reveal>

          {jobsLoading ? (
            <Reveal>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
                <div className="text-[13px] text-[var(--muted)]">Loading open positions…</div>
              </div>
            </Reveal>
          ) : jobs.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map((job, i) => (
                <Reveal key={job.id} delay={i * 0.05}>
                  <div role="button" tabIndex={0} aria-label={`View details for ${job.title}`}
                    onClick={() => setSelected(job)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(job); } }}
                    className="h-full cursor-pointer rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--orange)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-[var(--orange)] transition-all">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="text-[15px] font-bold text-[var(--text)]">{job.title}</div>
                      <span className="shrink-0 inline-flex items-center text-[10.5px] font-semibold text-[var(--blue)] bg-[var(--blue-d)] border border-[var(--blue)]/20 rounded-full px-2.5 py-1">
                        {job.duration}
                      </span>
                    </div>
                    {job.description && (
                      <p className="text-[12.5px] text-[var(--muted)] leading-relaxed line-clamp-3">{job.description}</p>
                    )}
                    <span className="mt-4 inline-block text-[12px] font-bold text-[var(--orange)]">
                      View details & apply →
                    </span>
                  </div>
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal>
              <div className="rounded-2xl border border-dashed border-[var(--border2,var(--border))] bg-[var(--card)] p-8 text-center">
                <div className="text-[26px] mb-3">📭</div>
                <div className="text-[15px] font-bold text-[var(--text)]">No open positions right now</div>
                <p className="text-[13px] text-[var(--muted)] mt-1.5 max-w-[440px] mx-auto">
                  Check back soon, or reach out at{" "}
                  <a href={`mailto:${MAIL}`} className="font-semibold text-[var(--blue)] hover:underline">{MAIL}</a>.
                </p>
                <a href={`mailto:${MAIL}?subject=${encodeURIComponent("Looking for Opportunities — FutureStack Careers")}`}
                  className="mt-5 inline-block text-white text-[12.5px] font-bold px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] hover:-translate-y-0.5 transition-all">
                  Introduce yourself →
                </a>
              </div>
            </Reveal>
          )}

          <Reveal>
            <p className="text-[12px] text-[var(--muted)] mt-6 text-center">
              Want to teach instead?{" "}
              <a
                href={`mailto:${MAIL}?subject=${encodeURIComponent("Trainer Application — FutureStack Careers")}`}
                className="font-semibold text-[var(--blue)] hover:underline"
              >
                Become a trainer on FutureStack →
              </a>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-12">
        <div className="mx-auto max-w-[720px] px-5 text-center">
          <Reveal>
            <h2 className="text-[clamp(24px,4vw,36px)] font-extrabold text-[var(--text)] mb-3">Stay in touch</h2>
            <p className="text-[14px] text-[var(--muted)] mb-7 max-w-[480px] mx-auto">
              No fitting role today? Send us a note and we'll reach out when something opens up.
            </p>
            <a href={`mailto:${MAIL}?subject=${encodeURIComponent("Keep Me in Mind — FutureStack Careers")}`}
              className="inline-block text-white text-[13.5px] font-bold px-7 py-3.5 rounded-[10px] bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] shadow-[0_10px_28px_-10px_rgba(255,106,26,.4)] hover:-translate-y-0.5 transition-all">
              Write to us
            </a>
          </Reveal>
        </div>
      </section>

      {selected && <JobModal job={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
