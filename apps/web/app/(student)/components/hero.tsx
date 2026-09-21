"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

interface HeroSlide {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  displayOrder: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function Hero() {
  const { data, isLoading } = useSWR<HeroSlide[]>("/api/courses/public/featured-hero-slides", fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    dedupingInterval: 300_000,
  });
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef(0);
  const restartRef = useRef(false);

  const slides: HeroSlide[] = (Array.isArray(data) ? data : []).sort((a, b) => a.displayOrder - b.displayOrder);

  const advance = useCallback(() => {
    setCurrent((prev) => (prev + 1) % Math.max(1, slides.length));
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    progressRef.current = 0;
    restartRef.current = false;
    startRef.current = performance.now();

    function frame(now: number) {
      if (restartRef.current) {
        restartRef.current = false;
        startRef.current = now;
        progressRef.current = 0;
        setProgress(0);
        rafRef.current = requestAnimationFrame(frame);
        return;
      }
      const elapsed = now - startRef.current;
      const pct = Math.min(100, (elapsed / 5000) * 100);
      const rounded = Math.round(pct);
      if (rounded !== progressRef.current) {
        progressRef.current = rounded;
        setProgress(rounded);
      }
      if (pct >= 100) {
        startRef.current = now;
        progressRef.current = 0;
        setProgress(0);
        advance();
      }
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [paused, advance, slides.length]);

  function handleDotClick(i: number) {
    restartRef.current = true;
    setCurrent(i);
    setProgress(0);
  }

  const showDesktopSlider = !isLoading && slides.length > 0;

  return (
    <>
      {/* Mobile/tablet-only — the desktop slider below is hidden under md, so
          without this, phones/tablets got no hero at all. Self-contained,
          doesn't depend on slide data. */}
      <MobileHero />

      {/* Plain banner-shaped placeholder while slide data loads — same 307px box as the slider so nothing jumps. */}
      {isLoading && (
        <section
          aria-busy="true"
          aria-label="Loading banner"
          className="hidden md:block rounded-2xl border border-[var(--border)] bg-[var(--card)] animate-pulse"
          style={{ height: 307 }}
        />
      )}

      {/* Desktop/tablet-and-up slider — unchanged, still hidden below md */}
      {showDesktopSlider && (
      <section
      className="relative hidden items-center overflow-hidden rounded-2xl border border-white/6 bg-[var(--hero-bg)] shadow-[var(--shadow-lg)] [animation:fadeUp_.5s_ease_both] md:flex"
      style={{ height: 307 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 60% 50%, rgba(45,126,247,.2) 0%, transparent 60%), radial-gradient(ellipse at 90% 30%, rgba(255,106,26,.14) 0%, transparent 50%)" }}>
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      <div className="relative z-10 h-full w-full overflow-hidden rounded-xl">
        {slides.map((s, i) => (
          <img
            key={s.id}
            src={s.imageUrl}
            alt={s.title || ""}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "auto"}
            decoding="async"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            className="absolute inset-0 block w-full transition-opacity duration-700"
            style={{ height: 307, objectFit: "fill", opacity: i === current ? 1 : 0 }}
          />
        ))}
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {slides.map((_, i) =>
            i === current ? (
              <div
                key={i}
                onClick={() => handleDotClick(i)}
                className="relative h-1.5 rounded-full overflow-hidden cursor-pointer transition-all duration-300 hover:scale-110"
                style={{
                  width: 28,
                  background: "rgba(255,255,255,.15)",
                  boxShadow: "0 0 6px rgba(255,106,26,.4)",
                }}
              >
                <div
                  className="absolute inset-0 rounded-full transition-none"
                  style={{
                    background: "linear-gradient(90deg, #ff6a1a, #ff8c42)",
                    width: `${progress}%`,
                    boxShadow: "0 0 8px rgba(255,106,26,.5)",
                  }}
                />
              </div>
            ) : (
              <button
                key={i}
                onClick={() => handleDotClick(i)}
                className="rounded-full border-none cursor-pointer transition-all duration-300 hover:scale-125"
                style={{
                  width: 8,
                  height: 8,
                  background: "rgba(255,255,255,.35)",
                }}
              />
            ),
          )}
        </div>
      )}
    </section>
      )}
    </>
  );
}

/**
 * Mobile/tablet-only hero (hidden at md and up — the slider above takes over
 * there). Purely decorative/static, so it doesn't wait on slide data and
 * renders immediately, matching the site's futuristic theme (glow orbs, grid
 * backdrop, Syne/JetBrains Mono type) used elsewhere (e.g. the dashboard).
 */
const MOBILE_HERO_HIGHLIGHTS = [
  { icon: "🏆", title: "Industry Certificates", desc: "Recognized by 400+ hiring partners", accent: "#a855f7", tint: "rgba(168,85,247,.16)" },
  { icon: "🛠️", title: "Real Projects", desc: "Ship a portfolio that gets you hired", accent: "#60a5fa", tint: "rgba(96,165,250,.16)" },
  { icon: "💼", title: "Placement Support", desc: "Dedicated career guidance & job access", accent: "#4ade80", tint: "rgba(74,222,128,.16)" },
];

function MobileHero() {
  const router = useRouter();
  return (
    <section
      className="relative md:hidden overflow-hidden rounded-2xl border border-[var(--border)] flex flex-col [animation:fadeUp_.5s_ease_both]"
      style={{ minHeight: "80vh", background: "radial-gradient(120% 140% at 0% 0%, rgba(240,90,26,.14), transparent 55%), radial-gradient(100% 120% at 100% 0%, rgba(59,130,246,.14), transparent 55%), var(--hero-bg)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.4]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px)", backgroundSize: "24px 24px" }}
      />
      <div className="absolute -top-10 -left-8 w-[160px] h-[160px] rounded-full blur-[60px] opacity-60 pointer-events-none" style={{ background: "rgba(240,90,26,.35)" }} />
      <div className="absolute -bottom-14 -right-8 w-[180px] h-[180px] rounded-full blur-[70px] opacity-50 pointer-events-none" style={{ background: "rgba(59,130,246,.3)" }} />

      <div className="relative z-[1] flex-1 flex flex-col justify-center px-5 py-6">
        <div className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full border border-[rgba(240,90,26,.3)] bg-[var(--orange-d)] font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.14em] text-[var(--orange)] w-fit">
          <span className="w-[5px] h-[5px] rounded-full bg-[var(--orange)]" style={{ animation: "pulse 1.6s ease infinite" }} />
          Learn · Build · Get Hired
        </div>

        <h1 className="font-['Syne',sans-serif] text-[26px] font-extrabold leading-[1.15] mb-2 text-white">
          Your next <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg,#ff9a5c,#60a5fa)" }}>skill upgrade</span> starts here
        </h1>
        <p className="text-[12.5px] leading-relaxed mb-4 max-w-[320px]" style={{ color: "rgba(255,255,255,.72)" }}>
          Industry-recognized certificates, real projects and dedicated placement support — all in one platform.
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => router.push("/courses")}
            className="inline-flex items-center gap-1.5 px-4 py-[9px] rounded-[9px] text-white text-[12px] font-bold border-none"
            style={{ background: "linear-gradient(135deg,var(--orange),#ff8a4c)", boxShadow: "0 4px 16px rgba(240,90,26,.4)" }}
          >
            Browse Courses
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
          <button
            onClick={() => router.push("/live-projects")}
            className="inline-flex items-center gap-1.5 px-4 py-[9px] rounded-[9px] text-[12px] font-bold border border-white/20 bg-white/10 text-white backdrop-blur-sm"
          >
            View Projects
          </button>
        </div>

        {/* Highlights */}
        <div className="flex flex-col gap-2.5">
          {MOBILE_HERO_HIGHLIGHTS.map((h, i) => (
            <div
              key={h.title}
              className="flex items-center gap-3 rounded-[12px] border border-white/10 bg-white/[0.06] backdrop-blur-sm px-3.5 py-3 [animation:fadeUp_.4s_ease_both]"
              style={{ animationDelay: `${0.1 + i * 0.08}s` }}
            >
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[17px] shrink-0"
                style={{ background: h.tint, boxShadow: `0 0 0 1px ${h.tint}` }}
              >
                {h.icon}
              </div>
              <div className="min-w-0">
                <div className="text-[12.5px] font-bold text-white leading-tight">{h.title}</div>
                <div className="text-[10.5px] leading-snug mt-0.5" style={{ color: "rgba(255,255,255,.6)" }}>{h.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
