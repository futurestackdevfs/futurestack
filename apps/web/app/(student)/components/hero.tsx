"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  const { data, isLoading } = useSWR<HeroSlide[]>("/api/courses/public/featured-hero-slides", fetcher);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  const slides: HeroSlide[] = (Array.isArray(data) ? data : []).sort((a, b) => a.displayOrder - b.displayOrder);

  const advance = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    setProgress(0);
    progressRef.current = 0;
    startRef.current = performance.now();

    function frame(now: number) {
      const elapsed = now - startRef.current;
      const pct = Math.min(100, (elapsed / 5000) * 100);
      progressRef.current = pct;
      setProgress(pct);
      if (pct >= 100) {
        advance();
      } else {
        rafRef.current = requestAnimationFrame(frame);
      }
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [current, paused, advance, slides.length]);

  function handleDotClick(i: number) {
    setCurrent(i);
    setProgress(0);
  }

  if (!isLoading && slides.length === 0) {
    return (
      <section className="relative flex min-h-[270px] items-center overflow-hidden rounded-2xl border border-white/6 bg-[var(--hero-bg)] shadow-[var(--shadow-lg)] [animation:fadeUp_.5s_ease_both]">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 60% 50%, rgba(45,126,247,.2) 0%, transparent 60%), radial-gradient(ellipse at 90% 30%, rgba(255,106,26,.14) 0%, transparent 50%)" }}>
          <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="flex h-[300px] w-full items-center justify-center overflow-hidden rounded-xl">
            <img src="/images/mainbanner.png" alt="Technology" className="h-full w-full object-fill" />
          </div>
        </div>
      </section>
    );
  }

  if (isLoading) return null;

  return (
    <section
      className="relative flex min-h-[270px] items-center overflow-hidden rounded-2xl border border-white/6 bg-[var(--hero-bg)] shadow-[var(--shadow-lg)] [animation:fadeUp_.5s_ease_both]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 60% 50%, rgba(45,126,247,.2) 0%, transparent 60%), radial-gradient(ellipse at 90% 30%, rgba(255,106,26,.14) 0%, transparent 50%)" }}>
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      <div className="relative z-10 flex h-[300px] w-full items-center justify-center overflow-hidden rounded-xl">
        {slides.map((s, i) => (
          <img
            key={s.id}
            src={s.imageUrl}
            alt={s.title || ""}
            className="absolute inset-0 h-full w-full object-fill transition-opacity duration-700"
            style={{ opacity: i === current ? 1 : 0 }}
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
  );
}
