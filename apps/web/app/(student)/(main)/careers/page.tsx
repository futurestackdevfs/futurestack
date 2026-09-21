"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

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

const MAIL = "careers@futurestack.dev";

interface JobPosting {
  id: string;
  title: string;
  duration: string;
  description: string | null;
  createdAt: string;
}

export default function CareersPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/careers/jobs");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setJobs(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setJobs([]);
      } finally {
        if (!cancelled) setJobsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
        <div className="mx-auto max-w-[900px] px-5 md:px-8">
          <Reveal>
            <h2 className="text-[clamp(24px,4vw,38px)] font-extrabold text-[var(--text)] mb-3">Open roles</h2>
            <p className="text-[14px] text-[var(--muted)] mb-5">We're remote-first within India.</p>
          </Reveal>

          {jobsLoading ? (
            <Reveal>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
                <div className="text-[13px] text-[var(--muted)]">Loading open positions…</div>
              </div>
            </Reveal>
          ) : jobs.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {jobs.map((job, i) => (
                <Reveal key={job.id} delay={i * 0.05}>
                  <div className="h-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--orange)] hover:-translate-y-0.5 transition-all">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="text-[15px] font-bold text-[var(--text)]">{job.title}</div>
                      <span className="shrink-0 inline-flex items-center text-[10.5px] font-semibold text-[var(--blue)] bg-[var(--blue-d)] border border-[var(--blue)]/20 rounded-full px-2.5 py-1">
                        {job.duration}
                      </span>
                    </div>
                    {job.description && (
                      <p className="text-[12.5px] text-[var(--muted)] leading-relaxed">{job.description}</p>
                    )}
                    <a href={`mailto:${MAIL}?subject=${encodeURIComponent(`Application: ${job.title}`)}`}
                      className="mt-4 inline-block text-[12px] font-bold text-[var(--orange)] hover:underline">
                      Apply →
                    </a>
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
                <a href={`mailto:${MAIL}?subject=${encodeURIComponent("Introduction")}`}
                  className="mt-5 inline-block text-white text-[12.5px] font-bold px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] hover:-translate-y-0.5 transition-all">
                  Introduce yourself →
                </a>
              </div>
            </Reveal>
          )}

          <Reveal>
            <p className="text-[12px] text-[var(--muted)] mt-6 text-center">
              Want to teach instead?{" "}
              <Link href="/support" className="font-semibold text-[var(--blue)] hover:underline">Become a trainer on FutureStack →</Link>
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
            <a href={`mailto:${MAIL}?subject=${encodeURIComponent("Keep me in mind")}`}
              className="inline-block text-white text-[13.5px] font-bold px-7 py-3.5 rounded-[10px] bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] shadow-[0_10px_28px_-10px_rgba(255,106,26,.4)] hover:-translate-y-0.5 transition-all">
              Write to us
            </a>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
