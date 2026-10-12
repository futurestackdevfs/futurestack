"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";

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

function categorySectionId(category: string) {
  return `rm-cat-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export default function RoadmapsPage() {
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const { data: swrData, error: swrError } = useSWR<RoadmapCard[]>(
    "/api/courses/public/roadmaps",
    (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error("failed"); return r.json(); }),
  );
  const data = swrData ?? null;
  const error = !!swrError;

  const q = query.trim().toLowerCase();
  const list = (data ?? []).filter((r) => matches(r, q));

  const categories = Array.from(new Set(list.map((r) => r.category).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
  const grouped = categories.map((c) => ({ category: c, items: list.filter((r) => r.category === c) }));

  function jumpToCategory(category: string) {
    const el = document.getElementById(categorySectionId(category));
    if (!el) return;
    const headerOffset = 64; // sticky site header
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top, behavior: "smooth" });
  }

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 py-6 md:py-8 flex flex-col gap-4">
      <nav className="flex flex-wrap items-center gap-1.5 text-[12.5px]" style={{ color: "var(--rm-muted)" }}>
        <Link href="/" className="font-medium hover:opacity-75">Home</Link>
        <span className="opacity-60">›</span>
        <span className="font-semibold" style={{ color: "var(--text)" }}>Roadmaps</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold" style={{ color: "var(--text)" }}>Roadmaps</h1>
          <p className="text-[12.5px] mt-0.5" style={{ color: "var(--rm-muted)" }}>
            {data ? `${list.length} roadmap${list.length === 1 ? "" : "s"} available` : "Loading…"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSearch((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold"
          style={{ background: "var(--card)", border: "1px solid var(--border2)", color: "var(--rm-muted)" }}
          aria-expanded={showSearch}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Search
        </button>
      </div>

      {categories.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => jumpToCategory(c)}
              className="rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors"
              style={{ background: "var(--card)", color: "var(--rm-muted)", border: "1px solid var(--border2)" }}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {showSearch && (
        <label
          className="flex items-center gap-2.5 rounded-lg px-3.5 h-10 w-full sm:w-[320px]"
          style={{ background: "var(--card)", border: "1px solid var(--border2)", color: "var(--rm-muted)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by course, category, or level"
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-[13px]"
            style={{ color: "var(--text)" }}
          />
        </label>
      )}

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
        list.length === 0 ? (
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
          <div className="flex flex-col gap-6">
            {grouped.map(({ category, items }) => (
              <section key={category} id={categorySectionId(category)} className="flex flex-col gap-2.5 scroll-mt-16">
                <h2 className="text-[13.5px] font-bold uppercase tracking-wide" style={{ color: "var(--orange)" }}>
                  {category} <span style={{ color: "var(--rm-muted)", fontWeight: 600, textTransform: "none" }}>· {items.length}</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                  {items.map((r) => (
                    <RoadmapCardView key={r.id} r={r} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function RoadmapCardView({ r }: { r: RoadmapCard }) {
  return (
    <Link
      href={`/roadmaps/${r.slug}`}
      className="group relative flex flex-col gap-3 rounded-xl p-4 overflow-hidden transition-all hover:-translate-y-1"
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

      <div className="relative flex gap-2.5 items-start">
        <div
          className="w-9 h-9 rounded-lg shrink-0 grid place-items-center font-bold text-[13px] transition-transform group-hover:scale-105"
          style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--orange)" }}
        >
          {r.title.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--orange)" }}>{r.category}</div>
          <div className="font-bold text-[14px] leading-tight mt-0.5 transition-colors group-hover:text-[var(--orange)]" style={{ color: "var(--text)" }}>{r.title}</div>
        </div>
      </div>

      <p className="relative text-[11.5px] leading-relaxed line-clamp-2" style={{ color: "var(--rm-text2)" }}>{r.summary}</p>

      <div className="relative flex flex-wrap gap-[5px]">
        <RmChip>{r.level}</RmChip>
        <RmChip>{r.topics} topics</RmChip>
        {r.future > 0 && <RmChip future>{r.future} future stack</RmChip>}
      </div>

      <div
        className="relative mt-auto flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[11.5px] font-bold transition-colors"
        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--blue)" }}
      >
        Explore roadmap
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:translate-x-0.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </div>
    </Link>
  );
}

function RmChip({ children, future }: { children: React.ReactNode; future?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-[5px] rounded-full px-[8px] py-[2px] text-[10.5px] font-semibold whitespace-nowrap"
      style={{ fontVariantNumeric: "tabular-nums", ...(future
        ? { color: "var(--rm-future)", background: "var(--rm-future-soft)", border: "1px solid color-mix(in srgb, var(--rm-future) 30%, transparent)" }
        : { color: "var(--rm-text2)", background: "var(--bg)", border: "1px solid var(--border)" }) }}
    >
      {children}
    </span>
  );
}
