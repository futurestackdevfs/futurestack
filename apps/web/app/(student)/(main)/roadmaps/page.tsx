"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function RoadmapsPage() {
  const { openLead } = useCareerGuidance();
  const [data, setData] = useState<RoadmapCard[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("all");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/courses/public/roadmaps")
      .then((r) => { if (!r.ok) throw new Error("failed"); return r.json(); })
      .then((rows: RoadmapCard[]) => { if (!cancelled) setData(rows); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, number>();
    data.forEach((r) => seen.set(r.category, (seen.get(r.category) ?? 0) + 1));
    return Array.from(seen.entries()).map(([name, count]) => ({ name, count }));
  }, [data]);

  const total = data?.reduce((n, r) => n + r.topics, 0) ?? 0;
  const future = data?.reduce((n, r) => n + r.future, 0) ?? 0;

  const q = query.trim().toLowerCase();
  const cats = activeCat === "all" ? categories : categories.filter((c) => c.name === activeCat);
  const groups = (data ?? []).length
    ? cats
        .map((c) => ({ cat: c, list: (data ?? []).filter((r) => r.category === c.name && matches(r, q)) }))
        .filter((g) => g.list.length > 0)
    : [];
  const shown = groups.reduce((n, g) => n + g.list.length, 0);

  return (
    <div className="mx-auto max-w-[1720px] px-4 sm:px-5 md:px-8 xl:px-12 py-8 md:py-10 flex flex-col gap-8">
      <nav className="flex flex-wrap items-center gap-1.5 text-[12.5px]" style={{ color: "var(--rm-muted)" }}>
        <Link href="/" className="font-medium hover:opacity-75">Home</Link>
        <span className="opacity-60">›</span>
        <span className="font-semibold" style={{ color: "var(--text)" }}>Roadmaps</span>
      </nav>

      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8 md:p-10 flex flex-wrap items-end justify-between gap-6"
        style={{ background: "var(--hero-bg, #0b1120)", color: "#e8eaf0", border: "1px solid rgba(255,255,255,.06)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(520px 260px at 92% 0%, rgba(255,106,26,.28), transparent 70%), radial-gradient(420px 240px at 0% 110%, rgba(37,99,235,.25), transparent 70%)",
          }}
        />
        <div className="relative max-w-[620px] flex flex-col gap-2.5">
          <span className="text-[11px] font-bold tracking-[.1em] uppercase" style={{ color: "var(--orange)" }}>
            Future Stack Roadmaps
          </span>
          <h1 className="text-[26px] sm:text-[30px] md:text-[38px] font-bold leading-tight">
            Pick a course. <span style={{ color: "var(--orange2)" }}>Follow its roadmap stage by stage.</span>
          </h1>
          <p className="text-[13.5px] sm:text-[14.5px] leading-relaxed" style={{ color: "#b0bac9" }}>
            Every roadmap here is generated from the actual course curriculum. Topics marked{" "}
            <b style={{ color: "var(--orange2)" }}>future stack</b> are optional or newer additions worth picking up later.
          </p>
        </div>
        <dl className="relative flex gap-6 sm:gap-7">
          <div className="grid gap-0.5">
            <dd className="font-bold text-[22px] sm:text-[28px] leading-none" style={{ color: "#fff" }}>{data?.length ?? "—"}</dd>
            <dt className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "#7a859a" }}>Roadmaps</dt>
          </div>
          <div className="grid gap-0.5">
            <dd className="font-bold text-[22px] sm:text-[28px] leading-none" style={{ color: "#fff" }}>{total || "—"}</dd>
            <dt className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "#7a859a" }}>Topics</dt>
          </div>
          <div className="grid gap-0.5">
            <dd className="font-bold text-[22px] sm:text-[28px] leading-none" style={{ color: "var(--orange2)" }}>{future || "—"}</dd>
            <dt className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "#7a859a" }}>Future-stack topics</dt>
          </div>
        </dl>
      </section>

      {error && (
        <div className="text-center py-14" style={{ color: "var(--rm-muted)" }}>
          Couldn&apos;t load roadmaps right now. Please try again shortly.
        </div>
      )}

      {!error && data === null && (
        <div className="text-center py-14" style={{ color: "var(--rm-muted)" }}>Loading roadmaps…</div>
      )}

      {!error && data !== null && data.length === 0 && (
        <div className="text-center py-14 flex flex-col items-center gap-2.5" style={{ color: "var(--rm-muted)" }}>
          <h3 className="font-bold text-[17px]" style={{ color: "var(--text)" }}>No roadmaps published yet</h3>
          <p className="text-[13px]">Course roadmaps are generated by our team and will show up here once ready.</p>
        </div>
      )}

      {data !== null && data.length > 0 && (
        <>
          <section className="flex flex-col gap-3">
            <label
              className="flex items-center gap-2.5 rounded-lg px-3.5 h-11 max-w-[560px]"
              style={{ background: "var(--card)", border: "1px solid var(--border2)", color: "var(--rm-muted)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search roadmaps by course, category, or level"
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-[14px]"
                style={{ color: "var(--text)" }}
              />
            </label>

            <div className="flex flex-wrap items-center gap-1.5">
              {[{ name: "all", count: data.length }, ...categories].map((c) => {
                const active = activeCat === c.name;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setActiveCat(c.name)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors"
                    style={
                      active
                        ? { background: "var(--text)", color: "var(--bg)", border: "1px solid var(--text)" }
                        : { background: "var(--card)", color: "var(--rm-text2)", border: "1px solid var(--border)" }
                    }
                  >
                    {c.name === "all" ? "All roadmaps" : c.name} <span className="opacity-70 text-[11px]">{c.count}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {shown === 0 ? (
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
            <div className="flex flex-col gap-7">
              {groups.map(({ cat, list }) => (
                <section key={cat.name} className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-[17px] font-bold" style={{ color: "var(--text)" }}>{cat.name}</h2>
                    <span className="text-[12px] font-medium" style={{ color: "var(--rm-muted)" }}>
                      {list.length} roadmap{list.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5">
                    {list.map((r) => (
                      <RoadmapCardView key={r.id} r={r} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {/* Guidance CTA */}
      <section
        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 sm:px-6 py-5"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="flex flex-col gap-1">
          <div className="font-bold text-[15.5px]" style={{ color: "var(--text)" }}>Not sure which course fits you?</div>
          <p className="text-[12.5px] max-w-[60ch]" style={{ color: "var(--rm-muted)" }}>
            Tell us your background and goal. A course advisor will suggest a track and a starting point.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openLead("roadmaps_page")}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold text-white shrink-0"
          style={{ background: "linear-gradient(135deg, var(--orange) 0%, var(--orange2) 100%)" }}
        >
          Get free career guidance
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </section>
    </div>
  );
}

function RoadmapCardView({ r }: { r: RoadmapCard }) {
  return (
    <Link
      href={`/roadmaps/${r.slug}`}
      className="group flex flex-col gap-3 rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
      style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}
    >
      <div className="flex gap-3 items-start">
        <div
          className="w-11 h-11 rounded-[10px] shrink-0 grid place-items-center font-bold text-[15px]"
          style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--orange)" }}
        >
          {r.title.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-[15.5px] leading-tight" style={{ color: "var(--text)" }}>{r.title}</div>
          <div className="text-[11px] font-semibold mt-0.5" style={{ color: "var(--orange)" }}>{r.category}</div>
        </div>
      </div>

      <p className="text-[12.5px] leading-relaxed line-clamp-2" style={{ color: "var(--rm-text2)" }}>{r.summary}</p>

      <div className="flex flex-wrap gap-[5px]">
        <RmChip>{r.level}</RmChip>
        <RmChip>{r.stages} stages · {r.topics} topics</RmChip>
        {r.future > 0 && <RmChip future>{r.future} future stack</RmChip>}
      </div>

      <div className="mt-auto flex items-center justify-end gap-1 text-[12px] font-semibold" style={{ color: "var(--blue)" }}>
        View roadmap
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
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
