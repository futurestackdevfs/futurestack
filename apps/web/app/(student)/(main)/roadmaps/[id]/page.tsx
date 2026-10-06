"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { RoadmapDetailTree } from "@/components/roadmaps/RoadmapDetailTree";
import { toStageRoadmap, type RoadmapData } from "@/components/RoadmapTree";

interface CourseDetail {
  id: string;
  slug: string;
  title: string;
  category: string;
  hours: number;
  level: string;
  techStack: string[];
  roadmap: RoadmapData | null;
}

interface RelatedRoadmap {
  id: string;
  slug: string;
  title: string;
  category: string;
  level: string;
  stages: number;
  topics: number;
}

function countTopics(roadmap: RoadmapData) {
  let topics = 0, future = 0;
  roadmap.phases.forEach((phase) => phase.nodes.forEach((node) => node.chips.forEach((chip) => {
    topics++;
    if (chip.kind === "optional") future++;
  })));
  return { topics, future };
}

function loadDone(slug: string): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(`fs-roadmap-progress-${slug}`) || "{}") || {}; } catch { return {}; }
}
function saveDone(slug: string, done: Record<string, boolean>) {
  try { localStorage.setItem(`fs-roadmap-progress-${slug}`, JSON.stringify(done)); } catch { /* ignore */ }
}

export default function RoadmapDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetail | null | undefined>(undefined);
  const [related, setRelated] = useState<RelatedRoadmap[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState<"sel" | "all">("sel");
  const [highlight, setHighlight] = useState<"all" | "c" | "f" | "todo">("all");
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    setCourse(undefined);
    setSel(null);
    setDone(loadDone(params.id));
    fetch(`/api/courses/public/slug/${params.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((c: CourseDetail | null) => { if (!cancelled) setCourse(c); })
      .catch(() => { if (!cancelled) setCourse(null); });
    return () => { cancelled = true; };
  }, [params.id]);

  function toggleDone(topic: string) {
    setDone((prev) => {
      const next = { ...prev };
      if (next[topic]) delete next[topic]; else next[topic] = true;
      saveDone(params.id, next);
      return next;
    });
  }

  function resetProgress() {
    setDone({});
    saveDone(params.id, {});
  }

  useEffect(() => {
    if (!course) return;
    let cancelled = false;
    fetch("/api/courses/public/roadmaps")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: RelatedRoadmap[]) => {
        if (cancelled) return;
        const same = rows.filter((r) => r.category === course.category && r.slug !== course.slug);
        const others = rows.filter((r) => r.category !== course.category && r.slug !== course.slug);
        setRelated(same.concat(others).slice(0, 4));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [course]);

  const stageRoadmap = useMemo(() => (course?.roadmap ? toStageRoadmap(course.roadmap) : null), [course]);
  const counts = useMemo(() => (course?.roadmap ? countTopics(course.roadmap) : { topics: 0, future: 0 }), [course]);

  if (course === undefined) {
    return <div className="mx-auto max-w-[900px] px-4 py-20 text-center" style={{ color: "var(--rm-muted)" }}>Loading roadmap…</div>;
  }

  if (!course || !course.roadmap || !stageRoadmap) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-20 text-center flex flex-col items-center gap-3">
        <h2 className="text-[22px] font-bold" style={{ color: "var(--text)" }}>We couldn&apos;t find that roadmap</h2>
        <p style={{ color: "var(--rm-muted)" }}>The link may be out of date, or this course doesn&apos;t have a published roadmap yet.</p>
        <Link href="/roadmaps" className="mt-2 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-bold text-white" style={{ background: "linear-gradient(135deg, var(--orange) 0%, var(--orange2) 100%)" }}>
          See all roadmaps
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1720px] px-4 sm:px-5 md:px-8 xl:px-12 py-8 md:py-10 flex flex-col gap-6">
      <nav className="flex flex-wrap items-center gap-1.5 text-[12.5px]" style={{ color: "var(--rm-muted)" }}>
        <Link href="/" className="font-medium hover:opacity-75">Home</Link>
        <span className="opacity-60">›</span>
        <Link href="/roadmaps" className="font-medium hover:opacity-75">Roadmaps</Link>
        <span className="opacity-60">›</span>
        <span className="font-semibold" style={{ color: "var(--text)" }}>{stageRoadmap.name}</span>
      </nav>

      {/* Header */}
      <section
        className="relative overflow-hidden grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6 rounded-2xl p-5 sm:p-6 md:p-7"
        style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-[3px] opacity-80"
          style={{ background: "linear-gradient(90deg, var(--orange), var(--blue))" }}
        />
        <div
          className="absolute -top-16 right-10 w-[220px] h-[220px] rounded-full pointer-events-none blur-[80px] opacity-[.12]"
          style={{ background: "var(--orange)" }}
        />
        <div className="relative z-10 grid gap-3.5 content-start min-w-0">
          <div className="flex gap-3.5 items-center">
            <div
              className="w-[54px] h-[54px] rounded-xl shrink-0 grid place-items-center font-bold text-[18px]"
              style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--orange)" }}
            >
              {stageRoadmap.mono}
            </div>
            <div>
              <div className="text-[11.5px] font-bold uppercase tracking-wide" style={{ color: "var(--orange)" }}>{course.category}</div>
              <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-bold leading-tight" style={{ color: "var(--text)" }}>{stageRoadmap.name}</h1>
            </div>
          </div>
          <p className="text-[14px] sm:text-[14.5px] max-w-[68ch]" style={{ color: "var(--rm-text2)" }}>{stageRoadmap.summary}</p>
          <div className="flex flex-wrap gap-1.5">
            <Chip>{course.level}</Chip>
            <Chip>{course.hours} hrs</Chip>
            <Chip>{stageRoadmap.stages.length} stages</Chip>
            <Chip>{counts.topics} topics</Chip>
            {counts.future > 0 && <Chip future>{counts.future} future stack</Chip>}
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
            <Fact label="Before you start" value={stageRoadmap.prereq} />
            <Fact label="Key skills" value={course.techStack.length ? course.techStack.join(", ") : "—"} />
          </dl>
        </div>

        <aside className="relative z-10 grid gap-3.5 content-start border-t xl:border-t-0 xl:border-l pt-4 xl:pt-0 xl:pl-6" style={{ borderColor: "var(--border)" }}>
          {counts.topics > 0 && (
            <div className="flex items-center gap-3.5">
              <svg viewBox="0 0 80 80" width="64" height="64" className="shrink-0 -rotate-90">
                <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="8" />
                <circle
                  cx="40" cy="40" r="34" fill="none" stroke="var(--rm-done, #16a34a)" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={213.63} strokeDashoffset={213.63 * (1 - Object.keys(done).filter((k) => done[k]).length / counts.topics)}
                  style={{ transition: "stroke-dashoffset .4s ease" }}
                />
              </svg>
              <div>
                <span className="font-bold text-[22px] leading-none block" style={{ color: "var(--text)" }}>
                  {Math.round((Object.keys(done).filter((k) => done[k]).length / counts.topics) * 100)}%
                </span>
                <small className="text-[11px]" style={{ color: "var(--rm-muted)" }}>
                  {Object.keys(done).filter((k) => done[k]).length} / {counts.topics} learned
                </small>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => router.push(`/courses/${course.slug}`)}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white"
            style={{ background: "linear-gradient(135deg, var(--orange) 0%, var(--orange2) 100%)" }}
          >
            View the course
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
          {Object.keys(done).length > 0 && (
            <button type="button" onClick={resetProgress} className="text-[12px] underline justify-self-start" style={{ color: "var(--rm-muted)" }}>
              Reset my progress
            </button>
          )}
        </aside>
      </section>

      {/* Toolbar */}
      <section className="flex flex-wrap items-center gap-3 md:gap-5">
        <Seg label="Show" value={highlight} onChange={setHighlight as (v: string) => void} options={[
          { v: "all", label: "All topics" }, { v: "c", label: "Core" }, { v: "f", label: "Future stack" }, { v: "todo", label: "Not learned yet" },
        ]} />
        <Seg label="Links" value={linkMode} onChange={setLinkMode as (v: string) => void} options={[
          { v: "sel", label: "Selected topic" }, { v: "all", label: "All relations" },
        ]} />
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] w-full text-gray-600 dark:text-gray-300">
          <LegendSwatch style={{ background: "#e8effd", borderColor: "#2563eb" }} label="Core" />
          <LegendSwatch style={{ background: "#fdece3", borderColor: "#e0521a" }} label="Future stack" />
          <LegendSwatch style={{ background: "#f1f3f7", borderColor: "#9ca3af", borderStyle: "dashed" }} label="Alternative, pick one" />
        </div>
        <p className="text-[12.5px] w-full -mt-1" style={{ color: "var(--rm-muted)" }}>
          Select a topic to see what it needs and what it leads to. The number on a topic counts its links.
        </p>
      </section>

      {/* Tree */}
      <RoadmapDetailTree
        roadmap={stageRoadmap}
        sel={sel}
        onSelect={setSel}
        highlight={highlight}
        linkMode={linkMode}
        done={done}
        onToggleDone={toggleDone}
      />

      {/* Related */}
      {related.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-bold" style={{ color: "var(--text)" }}>Related roadmaps</h2>
            <Link href="/roadmaps" className="text-[12px] font-semibold" style={{ color: "var(--blue)" }}>All roadmaps</Link>
          </div>
          <div className={`grid grid-cols-1 ${related.length === 1 ? "" : "sm:grid-cols-2"} ${related.length >= 4 ? "lg:grid-cols-4" : related.length === 3 ? "lg:grid-cols-3" : ""} gap-3`}>
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/roadmaps/${r.slug}`}
                className="flex gap-3 items-center rounded-xl p-3.5 transition-transform hover:-translate-y-0.5"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <div className="w-10 h-10 rounded-lg shrink-0 grid place-items-center font-bold text-[13px]" style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--orange)" }}>
                  {r.title.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[13.5px] leading-tight truncate" style={{ color: "var(--text)" }}>{r.title}</div>
                  <div className="text-[11px]" style={{ color: "var(--rm-muted)" }}>{r.level} · {r.stages} stages · {r.topics} topics</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Chip({ children, future }: { children: React.ReactNode; future?: boolean }) {
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
      <dt className="text-[10.5px] font-bold uppercase tracking-wide mb-0.5" style={{ color: "var(--rm-muted)" }}>{label}</dt>
      <dd className="text-[13px] font-medium" style={{ color: "var(--text)" }}>{value}</dd>
    </div>
  );
}

function Seg<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { v: T; label: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide mr-0.5" style={{ color: "var(--rm-muted)" }}>{label}</span>
      {options.map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold border ${
              active
                ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white"
                : "bg-white text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function LegendSwatch({ style, label }: { style: React.CSSProperties; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <i className="inline-block w-3 h-3 rounded" style={{ border: "1.5px solid", ...style }} />
      {label}
    </span>
  );
}
