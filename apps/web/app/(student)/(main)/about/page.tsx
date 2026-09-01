"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/* ─── SCROLL REVEAL HOOK ─────────────────────────────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─── REVEAL WRAPPER ─────────────────────────────────────── */
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity .7s cubic-bezier(.2,.8,.2,1) ${delay}s, transform .7s cubic-bezier(.2,.8,.2,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── FLOATING PARTICLES ─────────────────────────────────── */
function Particles() {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number; duration: number; delay: number; opacity: number }[]>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 2,
        duration: 15 + Math.random() * 25,
        delay: Math.random() * -20,
        opacity: 0.1 + Math.random() * 0.25,
      }))
    );
  }, []);

  if (particles.length === 0) return <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true" />;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.id % 3 === 0 ? "var(--orange)" : p.id % 3 === 1 ? "var(--blue)" : "#fff",
            opacity: p.opacity,
            animation: `drift ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── ANIMATED COUNTER ───────────────────────────────────── */
function Counter({ end, suffix = "", label }: { end: number; suffix?: string; label: string }) {
  const { ref, visible } = useReveal(0.3);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.max(1, Math.floor(end / 40));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(start);
    }, 30);
    return () => clearInterval(timer);
  }, [visible, end]);
  return (
    <div ref={ref} className="text-center">
      <div
        className="text-[clamp(28px,4vw,42px)] font-bold"
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          background: "linear-gradient(135deg, var(--orange), var(--orange2), var(--blue))",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent",
          backgroundSize: "200% 200%",
          animation: visible ? "gradient-shift 3s ease infinite" : "none",
        }}
      >
        {count}{suffix}
      </div>
      <div className="text-[12px] text-[var(--muted)] mt-1">{label}</div>
    </div>
  );
}

/* ─── DATA ───────────────────────────────────────────────── */
const APPROACH = [
  { icon: "01", title: "Learn", desc: "Gain practical exposure to emerging technologies and real-world projects.", color: "var(--blue)" },
  { icon: "02", title: "Build", desc: "Don\u2019t just learn technology—use it to create products and solve problems.", color: "var(--orange)" },
  { icon: "03", title: "Innovate", desc: "Develop new possibilities through experimentation and creative engineering.", color: "var(--purple)" },
  { icon: "04", title: "Deploy", desc: "Ship solutions that make an impact in the real world.", color: "var(--green)" },
];

const DOMAINS = [
  { name: "Artificial Intelligence", icon: "\u2728" },
  { name: "Industrial IoT", icon: "\u2699\uFE0F" },
  { name: "Embedded Technology", icon: "\uD83D\uDDA5\uFE0F" },
  { name: "Digital Twins", icon: "\uD83D\uDD17" },
  { name: "Software Engineering", icon: "\uD83D\uDCBB" },
  { name: "Automation", icon: "\uD83E\uDD16" },
  { name: "Cloud", icon: "\u2601\uFE0F" },
  { name: "Data", icon: "\uD83D\uDCCA" },
];

const TIMELINE = [
  { year: "2017", title: "The Beginning", desc: "Started with a belief that education should go beyond concepts — it should enable people to build and solve real problems." },
  { year: "Today", title: "Growing Ecosystem", desc: "Evolved into a technology ecosystem focused on developing future-ready talent, products, and resources." },
  { year: "Future", title: "What\u2019s Next", desc: "Reorganizing the world through technology — faster development, smarter solutions, bigger impact." },
];

/* ─── PAGE ───────────────────────────────────────────────── */
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] overflow-hidden">

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        <Particles />

        {/* glow orbs */}
        <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-20" style={{ background: "radial-gradient(circle, var(--orange) 0%, transparent 70%)", filter: "blur(80px)", animation: "drift 30s ease-in-out infinite" }} />
        <div className="absolute bottom-[-15%] left-[-10%] w-[450px] h-[450px] rounded-full opacity-20" style={{ background: "radial-gradient(circle, var(--blue) 0%, transparent 70%)", filter: "blur(80px)", animation: "drift 36s ease-in-out -10s infinite" }} />

        <div className="relative z-10 text-center px-5 max-w-[800px] mx-auto">
          <Reveal>
            <div className="inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--blue)] bg-[var(--blue-d)] border border-[var(--blue)]/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--orange)] animate-pulse" />
              Est. 2017 · Building the Future
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h1 className="text-[clamp(32px,6vw,60px)] font-bold leading-[1.05] mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <span className="text-[var(--text)]">About </span>
              <span
                style={{
                  background: "linear-gradient(135deg, var(--orange), var(--orange2), var(--blue))",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                  backgroundSize: "200% 200%",
                  animation: "gradient-shift 4s ease infinite",
                }}
              >
                Future Stack
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="text-[clamp(16px,2.5vw,22px)] font-medium text-[var(--text2)] mb-4 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Think. Create. Conquer. Build the Future.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <p className="text-[14.5px] text-[var(--muted)] max-w-[600px] mx-auto leading-relaxed">
              A future-focused EdTech and technology innovation platform built with a simple vision: teach people the skills of tomorrow and empower them to create solutions for the future.
            </p>
          </Reveal>

          <Reveal delay={0.4}>
            <div className="flex gap-3 justify-center flex-wrap mt-8">
              <a href="#approach" className="inline-flex items-center gap-2 font-semibold text-[13.5px] px-6 py-3 rounded-[10px] text-white bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] shadow-[0_10px_28px_-10px_rgba(255,106,26,.35)] hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-10px_rgba(255,106,26,.35)] transition-all">
                See Our Approach
              </a>
              <a href="#journey" className="inline-flex items-center gap-2 font-semibold text-[13.5px] px-6 py-3 rounded-[10px] text-[var(--text)] bg-[var(--card)] border border-[var(--border)] hover:border-[var(--blue)] hover:bg-[var(--blue-d)] transition-all">
                Our Journey
              </a>
            </div>
          </Reveal>
        </div>

        {/* scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[var(--muted)] text-[10px] font-semibold tracking-wider uppercase" style={{ animation: "float 3s ease-in-out infinite" }}>
          <span>Scroll</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
        </div>
      </section>

      {/* ═══════════ ABOUT ═══════════ */}
      <section className="pt-12 pb-16 md:pt-16 md:pb-24">
        <div className="mx-auto max-w-[1240px] px-5 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-16 items-center">
            <Reveal>
              <div>
                <div className="inline-flex items-center gap-2.5 text-[12px] font-semibold text-[var(--orange)] mb-4">
                  <span className="w-[18px] h-[2px] rounded-sm bg-gradient-to-r from-[var(--orange)] to-[var(--blue)]" />
                  Who We Are
                </div>
                <h2 className="text-[clamp(22px,2.8vw,30px)] font-bold mb-5 leading-[1.25]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Education should enable people to <span className="text-[var(--orange)]">build, experiment, innovate</span>, and solve real-world problems.
                </h2>
                <p className="text-[14px] text-[var(--text2)] leading-[1.8] mb-3">
                  Our journey began in 2017 with a belief that education should go beyond learning concepts. Over the years, we have evolved into a growing technology ecosystem focused on developing future-ready talent, products, and resources.
                </p>
                <p className="text-[14px] text-[var(--text2)] leading-[1.8]">
                  At Future Stack, we bring together learning, technology, and innovation. Our goal is not just to create skilled professionals, but to create individuals who can contribute to and build the technologies that will shape tomorrow.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="flex flex-row lg:flex-col gap-3">
                {[
                  { n: "2017", l: "Founded", c: "var(--orange)" },
                  { n: "8+", l: "Domains", c: "var(--blue)" },
                ].map((s) => (
                  <div key={s.l} className="flex-1 lg:flex-none relative group">
                    <div className="absolute inset-0 rounded-[16px] bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(135deg, ${s.c}15, transparent)` }} />
                    <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-[16px] px-7 py-5 text-center group-hover:border-opacity-50 transition-all duration-300" style={{ borderColor: `color-mix(in srgb, ${s.c} 20%, var(--border))` }}>
                      <div className="text-[28px] font-bold mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif", color: s.c }}>{s.n}</div>
                      <div className="text-[10px] text-[var(--muted)] font-semibold uppercase tracking-wider">{s.l}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════ VISION ═══════════ */}
      <section className="py-14 md:py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--blue-d)]/20 via-[var(--blue-d)]/30 to-[var(--blue-d)]/20" />
        <div className="relative mx-auto max-w-[1240px] px-5 md:px-8">
          <Reveal>
            <div className="text-center max-w-[800px] mx-auto">
              <div className="inline-flex items-center gap-2.5 text-[12px] font-semibold text-[var(--purple)] mb-3">
                <span className="w-[18px] h-[2px] rounded-sm bg-gradient-to-r from-[var(--purple)] to-[var(--pink)]" />
                Our Vision
              </div>
              <h2 className="text-[clamp(26px,4vw,48px)] font-bold leading-[1.1] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Education directly leads to <span className="bg-gradient-to-r from-[var(--orange)] to-[var(--blue)] bg-clip-text" style={{ WebkitBackgroundClip: "text", color: "transparent" }}>creation</span>.
              </h2>
              <p className="text-[14.5px] text-[var(--text2)] leading-[1.75] mt-5 max-w-[580px] mx-auto">
                We want to build a strong community of future-ready resources who can work across multiple domains, adapt to rapidly changing technologies, and transform ideas into practical solutions.
              </p>
              <div className="mt-7 flex justify-center gap-2.5 flex-wrap">
                {["AI", "IoT", "Embedded", "Digital Twins", "Software", "Cloud", "Data"].map((t) => (
                  <span key={t} className="text-[11px] font-semibold text-[var(--blue)] bg-[var(--blue-d)] border border-[var(--blue)]/15 rounded-full px-3 py-1">{t}</span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════ APPROACH ═══════════ */}
      <section id="approach" className="py-14 md:py-20">
        <div className="mx-auto max-w-[1240px] px-5 md:px-8">
          <Reveal>
            <div className="text-center max-w-[600px] mx-auto mb-10">
              <div className="inline-flex items-center gap-2.5 text-[12px] font-semibold text-[var(--orange)] mb-3">
                <span className="w-[18px] h-[2px] rounded-sm bg-gradient-to-r from-[var(--orange)] to-[var(--blue)]" />
                Our Approach
              </div>
              <h2 className="text-[clamp(22px,3vw,34px)] font-bold leading-[1.15]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                From Learning to <span className="text-[var(--orange)]">Creation</span>
              </h2>
            </div>
          </Reveal>

          {/* Horizontal flow */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {APPROACH.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.08}>
                <div className="relative group h-full">
                  {/* connector arrow */}
                  {i < APPROACH.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 text-[var(--border2)] text-lg z-10">→</div>
                  )}
                  <div className="h-full rounded-[16px] p-5 border border-[var(--border)] bg-[var(--card)] hover:border-[var(--border2)] transition-all duration-300">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-[14px] font-bold text-white shrink-0"
                        style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}99)`, fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {step.icon}
                      </div>
                      <h3 className="text-[16px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{step.title}</h3>
                    </div>
                    <p className="text-[12.5px] text-[var(--text2)] leading-[1.65]">{step.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ DOMAINS ═══════════ */}
      <section className="py-14 md:py-20 relative">
        <div className="absolute inset-0 bg-[var(--bg2)]" />
        <div className="relative mx-auto max-w-[1240px] px-5 md:px-8">
          <Reveal>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-2.5 text-[12px] font-semibold text-[var(--blue)] mb-3">
                  <span className="w-[18px] h-[2px] rounded-sm bg-gradient-to-r from-[var(--blue)] to-[var(--purple)]" />
                  Our Domains
                </div>
                <h2 className="text-[clamp(22px,3vw,34px)] font-bold leading-[1.15]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Technologies That Shape <span className="text-[var(--orange)]">Tomorrow</span>
                </h2>
              </div>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DOMAINS.map((d, i) => (
              <Reveal key={d.name} delay={i * 0.05}>
                <div className="flex items-center gap-3 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--orange)]/25 transition-all duration-300 cursor-default group">
                  <span className="text-[26px] group-hover:scale-110 transition-transform duration-300">{d.icon}</span>
                  <span className="text-[13px] font-bold text-[var(--text)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{d.name}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ ACCELERATING ═══════════ */}
      <section className="py-14 md:py-20 relative">
        <div className="mx-auto max-w-[1240px] px-5 md:px-8">
          <Reveal>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
              <div className="lg:col-span-3">
                <div className="inline-flex items-center gap-2.5 text-[12px] font-semibold text-[var(--green)] mb-3">
                  <span className="w-[18px] h-[2px] rounded-sm bg-gradient-to-r from-[var(--green)] to-[var(--blue)]" />
                  Our Mission
                </div>
                <h2 className="text-[clamp(22px,3vw,34px)] font-bold mb-4 leading-[1.15]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Accelerating the <span className="text-[var(--orange)]">Future</span>
                </h2>
                <p className="text-[14px] text-[var(--text2)] leading-[1.75]">
                  Technology is evolving faster than ever. Our mission is to reduce the time between an idea and its implementation by combining skilled people, modern technologies, reusable resources, and innovative approaches.
                </p>
              </div>
              <div className="lg:col-span-2 flex flex-wrap gap-2.5">
                {["Skilled People", "Modern Tech", "Reusable Resources", "Innovative Approaches"].map((item, i) => (
                  <span key={item} className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-3.5 py-1.5 rounded-full border transition-all duration-300 hover:-translate-y-0.5" style={{
                    color: i === 0 ? "var(--orange)" : i === 1 ? "var(--blue)" : i === 2 ? "var(--green)" : "var(--purple)",
                    backgroundColor: i === 0 ? "var(--orange-d)" : i === 1 ? "var(--blue-d)" : i === 2 ? "var(--green-d)" : "var(--purple-d)",
                    borderColor: `color-mix(in srgb, ${i === 0 ? "var(--orange)" : i === 1 ? "var(--blue)" : i === 2 ? "var(--green)" : "var(--purple)"} 15%, transparent)`,
                  }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════ AMBITION ═══════════ */}
      <section className="py-14 md:py-20 relative">
        <div className="absolute inset-0 bg-[var(--bg2)]" />
        <div className="relative mx-auto max-w-[1240px] px-5 md:px-8">
          <Reveal>
            <div className="max-w-[700px] mx-auto text-center">
              <div className="inline-flex items-center gap-2.5 text-[12px] font-semibold text-[var(--purple)] mb-3">
                <span className="w-[18px] h-[2px] rounded-sm bg-gradient-to-r from-[var(--purple)] to-[var(--pink)]" />
                Reorganizing the World
              </div>
              <h2 className="text-[clamp(22px,3vw,34px)] font-bold mb-4 leading-[1.15]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Our ambition goes beyond <span className="text-[var(--orange)]">education</span>.
              </h2>
              <p className="text-[14px] text-[var(--text2)] leading-[1.75] mb-5">
                We want to use new technologies to rethink how things are designed, developed, and delivered. Through our learning ecosystem and R&D initiatives, we aim to create resources capable of working on multiple future-ready projects and contributing to meaningful technological transformation.
              </p>
              <div className="inline-flex items-center gap-2.5 bg-gradient-to-r from-[var(--orange)] to-[var(--blue)] text-white font-bold text-[14px] px-6 py-3 rounded-[12px] shadow-[0_8px_24px_-6px_rgba(255,106,26,.35)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Future Stack is building more than a learning platform.
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════ JOURNEY ═══════════ */}
      <section id="journey" className="py-14 md:py-20">
        <div className="mx-auto max-w-[1240px] px-5 md:px-8">
          <Reveal>
            <div className="text-center max-w-[600px] mx-auto mb-10">
              <div className="inline-flex items-center gap-2.5 text-[12px] font-semibold text-[var(--orange)] mb-3">
                <span className="w-[18px] h-[2px] rounded-sm bg-gradient-to-r from-[var(--orange)] to-[var(--blue)]" />
                Our Journey
              </div>
              <h2 className="text-[clamp(22px,3vw,34px)] font-bold leading-[1.15]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                2017 → Today → <span className="text-[var(--orange)]">Future</span>
              </h2>
            </div>
          </Reveal>

          <div className="relative max-w-[800px] mx-auto">
            <div className="absolute left-5 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--orange)] via-[var(--blue)] to-[var(--purple)] opacity-30" />

            {TIMELINE.map((t, i) => (
              <Reveal key={t.year} delay={i * 0.1}>
                <div className={`relative flex items-start gap-6 md:gap-0 mb-8 last:mb-0 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                  <div className="absolute left-5 md:left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-gradient-to-r from-[var(--orange)] to-[var(--blue)] border-2 border-[var(--bg)] z-10 mt-1.5" />

                  <div className={`ml-12 md:ml-0 md:w-1/2 ${i % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                    <div className="inline-block text-[12px] font-bold text-[var(--orange)] bg-[var(--orange-d)] border border-[var(--orange)]/15 rounded-full px-3 py-0.5 mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {t.year}
                    </div>
                    <h3 className="text-[16px] font-bold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{t.title}</h3>
                    <p className="text-[12.5px] text-[var(--text2)] leading-[1.65]">{t.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="pb-14 md:pb-20 pt-4">
        <div className="mx-auto max-w-[1240px] px-5 md:px-8">
          <Reveal>
            <div className="relative rounded-[24px] overflow-hidden p-8 md:p-14 text-center bg-gradient-to-br from-[#0c1120] to-[#141024] border border-white/10">
              <div className="absolute inset-0 bg-[radial-gradient(480px_280px_at_90%_0%,rgba(255,106,26,.35),transparent_65%),radial-gradient(420px_260px_at_5%_100%,rgba(28,134,214,.30),transparent_60%)]" />
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.12) 1px, transparent 1px)", backgroundSize: "26px 26px", maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, #000 20%, transparent 85%)" }} />
              <div className="relative z-10">
                <h2 className="text-white text-[clamp(22px,3.5vw,34px)] font-bold mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Think. Create. Conquer.
                </h2>
                <p className="text-white/60 text-[14px] max-w-[460px] mx-auto mb-6">
                  We are building a community of people who learn today, create tomorrow, and shape the future.
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <a href="/courses" className="inline-flex items-center gap-2 font-semibold text-[13px] px-5 py-2.5 rounded-[10px] text-white bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] shadow-[0_8px_24px_-8px_rgba(255,106,26,.35)] hover:-translate-y-0.5 transition-all">
                    Explore Courses
                  </a>
                  <a href="/research-and-development" className="inline-flex items-center gap-2 font-semibold text-[13px] px-5 py-2.5 rounded-[10px] text-white bg-white/10 border border-white/15 hover:bg-white/20 transition-all">
                    R&D Services
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
