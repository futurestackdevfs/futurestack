"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useCareerGuidance } from "@/app/(student)/components/career-guidance";

interface RoadmapCard {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  level: string;
  stages: number;
  topics: number;
  future: number;
  roles: string[];
}

function matches(r: RoadmapCard, q: string) {
  if (!q) return true;
  return [r.title, r.summary, r.category, r.level].join(" ").toLowerCase().includes(q);
}

const STEPS = [
  { n: "01", title: "Pick a course", desc: "Every roadmap is generated straight from that course's real curriculum — not a generic template." },
  { n: "02", title: "Follow it stage by stage", desc: "Beginner → Intermediate → Advanced, with each topic grouped under the skill it builds toward." },
  { n: "03", title: "Track as you learn", desc: "Mark topics learned, jump straight to the lesson video for any topic, and see what unlocks next." },
];

export default function RoadmapsPage() {
  const { openLead } = useCareerGuidance();
  const [query, setQuery] = useState("");

  const { data: swrData, error: swrError } = useSWR<RoadmapCard[]>(
    "/api/courses/public/roadmaps",
    (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error("failed"); return r.json(); }),
  );
  const data = swrData ?? null;
  const error = !!swrError;

  const total = data?.reduce((n, r) => n + r.topics, 0) ?? 0;
  const future = data?.reduce((n, r) => n + r.future, 0) ?? 0;
  const q = query.trim().toLowerCase();
  const list = (data ?? []).filter((r) => matches(r, q));

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-5 md:px-8 py-8 md:py-10 flex flex-col gap-10">
      <nav className="flex flex-wrap items-center gap-1.5 text-[12.5px]" style={{ color: "var(--rm-muted)" }}>
        <Link href="/" className="font-medium hover:opacity-75">Home</Link>
        <span className="opacity-60">›</span>
        <span className="font-semibold" style={{ color: "var(--text)" }}>Roadmaps</span>
      </nav>

      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-3xl p-7 sm:p-10 md:p-14 flex flex-col items-center text-center gap-5"
        style={{ background: "var(--hero-bg, #0b1120)", color: "#e8eaf0", border: "1px solid rgba(255,255,255,.06)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />
        <div
          className="absolute -top-24 right-0 w-[360px] h-[360px] rounded-full pointer-events-none blur-[100px] opacity-30"
          style={{ background: "radial-gradient(circle, var(--orange) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-28 left-0 w-[320px] h-[320px] rounded-full pointer-events-none blur-[100px] opacity-20"
          style={{ background: "radial-gradient(circle, var(--blue) 0%, transparent 70%)" }}
        />

        <span className="relative inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[.14em] uppercase px-3 py-1 rounded-full" style={{ color: "var(--orange)", background: "rgba(255,106,26,.12)", border: "1px solid rgba(255,106,26,.25)" }}>
          ✦ Learning Roadmaps
        </span>
        <h1 className="relative text-[28px] sm:text-[36px] md:text-[44px] font-bold leading-tight max-w-[720px]">
          Know exactly what to learn, <span style={{ color: "var(--orange2)" }}>and in what order.</span>
        </h1>
        <p className="relative text-[13.5px] sm:text-[15px] leading-relaxed max-w-[560px]" style={{ color: "#b0bac9" }}>
          Each roadmap is built from a real course curriculum — Beginner to Advanced, stage by stage — so you always know what to do next.
        </p>

        <dl className="relative flex gap-7 sm:gap-10 mt-2">
          <HeroStat value={data?.length} label="Roadmaps" color="#fff" />
          <HeroStat value={total || undefined} label="Topics" color="#fff" />
          <HeroStat value={future || undefined} label="Future-stack" color="var(--orange2)" />
        </dl>
      </section>

      {/* How it works */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STEPS.map((s) => (
          <div key={s.n} className="relative rounded-2xl p-5 flex flex-col gap-2" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <span className="text-[22px] font-extrabold opacity-20" style={{ color: "var(--orange)" }}>{s.n}</span>
            <div className="font-bold text-[14.5px]" style={{ color: "var(--text)" }}>{s.title}</div>
            <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--rm-muted)" }}>{s.desc}</p>
          </div>
        ))}
      </section>

      {error && (
        <div className="text-center py-14" style={{ color: "var(--rm-muted)" }}>
          Couldn&apos;t load roadmaps right now. Please try again shortly.
        </div>
      )}

      {!error && data === null && (
        <div className="flex items-center justify-center py-14">
          <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--orange)", borderTopColor: "transparent" }} />
        </div>
      )}

      {!error && data !== null && data.length === 0 && (
        <div className="text-center py-14 flex flex-col items-center gap-2.5" style={{ color: "var(--rm-muted)" }}>
          <h3 className="font-bold text-[17px]" style={{ color: "var(--text)" }}>No roadmaps published yet</h3>
          <p className="text-[13px]">Course roadmaps are generated by our team and will show up here once ready.</p>
        </div>
      )}

      {data !== null && data.length > 0 && (
        <section className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[17px] font-bold" style={{ color: "var(--text)" }}>
              {list.length} roadmap{list.length === 1 ? "" : "s"} available
            </h2>
            <label
              className="flex items-center gap-2.5 rounded-lg px-3.5 h-10 w-full sm:w-[320px]"
              style={{ background: "var(--card)", border: "1px solid var(--border2)", color: "var(--rm-muted)" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by course, category, or level"
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-[13px]"
                style={{ color: "var(--text)" }}
              />
            </label>
          </div>

          {list.length === 0 ? (
            <div className="text-center py-14 flex flex-col items-center gap-2.5" style={{ color: "var(--rm-muted)" }}>
              <h3 className="font-bold text-[17px]" style={{ color: "var(--text)" }}>
                No roadmap matches &ldquo;{query.trim()}&rdquo;
              </h3>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-1 rounded-lg px-4 py-2 text-[12.5px] font-semibold"
                style={{ background: "var(--card)", border: "1px solid var(--border2)", color: "var(--text)" }}
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className={`grid grid-cols-1 ${list.length === 1 ? "" : "sm:grid-cols-2"} ${list.length <= 2 ? "" : "lg:grid-cols-3"} gap-5`}>
              {list.map((r) => (
                <RoadmapCardView key={r.id} r={r} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Guidance CTA */}
      <section
        className="relative overflow-hidden flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 sm:px-7 py-6"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-[3px] opacity-70"
          style={{ background: "linear-gradient(90deg, var(--orange), var(--blue))" }}
        />
        <div className="relative flex flex-col gap-1">
          <div className="font-bold text-[16px]" style={{ color: "var(--text)" }}>Not sure which course fits you?</div>
          <p className="text-[12.5px] max-w-[60ch]" style={{ color: "var(--rm-muted)" }}>
            Tell us your background and goal — a course advisor will suggest a track and a starting point, free of cost.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openLead("roadmaps_page")}
          className="relative inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white shrink-0"
          style={{ background: "linear-gradient(135deg, var(--orange) 0%, var(--orange2) 100%)" }}
        >
          Get free career guidance
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </section>
    </div>
  );
}

function HeroStat({ value, label, color }: { value: number | undefined; label: string; color: string }) {
  return (
    <div className="grid gap-0.5">
      <dd className="font-bold text-[24px] sm:text-[30px] leading-none" style={{ color }}>{value ?? "—"}</dd>
      <dt className="text-[10px] sm:text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "#7a859a" }}>{label}</dt>
    </div>
  );
}

function RoadmapCardView({ r }: { r: RoadmapCard }) {
  return (
    <Link
      href={`/roadmaps/${r.slug}`}
      className="group relative flex flex-col gap-4 rounded-2xl p-5 sm:p-6 overflow-hidden transition-all hover:-translate-y-1"
      style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[3px] opacity-80"
        style={{ background: "linear-gradient(90deg, var(--orange), var(--blue))" }}
      />
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none opacity-0 group-hover:opacity-20 transition-opacity blur-2xl"
        style={{ background: "var(--orange)" }}
      />

      <div className="relative flex gap-3.5 items-start">
        <div
          className="w-12 h-12 rounded-xl shrink-0 grid place-items-center font-bold text-[16px] transition-transform group-hover:scale-105"
          style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--orange)" }}
        >
          {r.title.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--orange)" }}>{r.category}</div>
          <div className="font-bold text-[16px] leading-tight mt-0.5 transition-colors group-hover:text-[var(--orange)]" style={{ color: "var(--text)" }}>{r.title}</div>
        </div>
      </div>

      <p className="relative text-[12.5px] leading-relaxed line-clamp-3" style={{ color: "var(--rm-text2)" }}>{r.summary}</p>

      <div className="relative flex items-center gap-[3px]">
        {Array.from({ length: r.stages }).map((_, i) => (
          <i key={i} className="flex-1 h-1.5 rounded-full" style={{ background: i === 0 ? "var(--orange)" : "var(--border2)" }} />
        ))}
      </div>

      <div className="relative flex flex-wrap gap-[6px]">
        <RmChip>{r.level}</RmChip>
        <RmChip>{r.stages} stages · {r.topics} topics</RmChip>
        {r.future > 0 && <RmChip future>{r.future} future stack</RmChip>}
      </div>

      <div
        className="relative mt-auto flex items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-bold transition-colors"
        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--blue)" }}
      >
        Explore roadmap
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:translate-x-0.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </div>
    </Link>
  );
}

function RmChip({ children, future }: { children: React.ReactNode; future?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-[5px] rounded-full px-[9px] py-[3px] text-[11.5px] font-semibold whitespace-nowrap"
      style={{ fontVariantNumeric: "tabular-nums", ...(future
        ? { color: "var(--rm-future)", background: "var(--rm-future-soft)", border: "1px solid color-mix(in srgb, var(--rm-future) 30%, transparent)" }
        : { color: "var(--rm-text2)", background: "var(--bg)", border: "1px solid var(--border)" }) }}
    >
      {children}
    </span>
  );
}
