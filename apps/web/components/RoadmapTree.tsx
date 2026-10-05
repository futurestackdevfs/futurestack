"use client";

import { useEffect, useMemo, useState } from "react";
import type { Roadmap as StageRoadmap, RoadmapGroup, RoadmapTopic, TopicKind } from "@/lib/roadmap-types";
import { RoadmapDetailTree, type VideoOption } from "@/components/roadmaps/RoadmapDetailTree";

export type ChipKind = "must" | "pick-one" | "optional";

export interface RoadmapChipData {
  title: string;
  kind: ChipKind;
  lessonTitles: string[];
  /** The curriculum video this chip's content comes from — auto-matched at
   *  generation time from `lessonTitles`, editable by admins. Null/undefined
   *  means no match (or the admin explicitly unlinked it). */
  videoId?: string | null;
}
export interface RoadmapNodeData {
  title: string;
  description: string;
  chips: RoadmapChipData[];
}
export interface RoadmapPhaseData {
  phase: "Beginner" | "Intermediate" | "Advanced";
  nodes: RoadmapNodeData[];
}
export interface RoadmapData {
  title: string;
  summary: string;
  prerequisites: string[];
  phases: RoadmapPhaseData[];
  /** [learnFirst, unlocks] pairs between chip titles — AI-generated, optional for roadmaps saved before this field existed. */
  rels?: Array<{ learnFirst: string; unlocks: string }>;
}

const LEVEL: Record<string, { k: string; bg: string; label: string; tagline: string; icon: string }> = {
  Beginner: { k: "var(--green)", bg: "var(--green-d)", label: "Beginner", tagline: "Learn the core", icon: "●" },
  Intermediate: { k: "var(--amber)", bg: "var(--amber-d)", label: "Intermediate", tagline: "Patterns and ecosystem", icon: "◆" },
  Advanced: { k: "var(--purple)", bg: "var(--purple-d)", label: "Advanced", tagline: "Ship it to production", icon: "▲" },
};

const CHIP_LABEL: Record<ChipKind, string> = { must: "Must learn", "pick-one": "Pick one", optional: "Optional or later" };

function Chip({ chip, levelK, levelBg, onSide }: { chip: RoadmapChipData; levelK: string; levelBg: string; onSide: "left" | "right" }) {
  const style: React.CSSProperties =
    chip.kind === "must"
      ? { background: levelBg, border: `1px solid ${levelK}`, color: levelK, fontWeight: 500 }
      : chip.kind === "pick-one"
        ? { background: "var(--panel)", border: `1px dashed ${levelK}`, color: "var(--text)", fontWeight: 400 }
        : { background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text3)", fontWeight: 400 };

  // Inline (not just the .rm-chip class) because Tailwind's preflight reset
  // sets `button { padding: 0 }`, which otherwise fights the class-based rule.
  const sizeStyle: React.CSSProperties = {
    padding: "var(--rm-chip-py) var(--rm-chip-px)",
    fontSize: "var(--rm-chip-fs)",
    minWidth: "var(--rm-chip-min-w)",
    maxWidth: "var(--rm-chip-max-w)",
  };

  return (
    <button
      type="button"
      className={`rm-chip relative outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${onSide === "right" ? "rm-chip-r" : "rm-chip-l"}`}
      style={{ ...style, ...sizeStyle }}
      title={chip.lessonTitles.length ? `Lesson: ${chip.lessonTitles.join(", ")}` : chip.title}
      onClick={() => {
        const fn = (window as any).sendPrompt;
        if (typeof fn === "function") fn(`${chip.title} kya hai, explain karo`);
        else console.log(`${chip.title}: ${CHIP_LABEL[chip.kind]}`);
      }}
    >
      {chip.title}
      {chip.lessonTitles.length > 0 && <span className="ml-1 opacity-70">▸</span>}
    </button>
  );
}

/**
 * roadmap.sh-style spine diagram: one continuous vertical line, a start and
 * end node, three level dividers, main topic nodes on the spine (numbered
 * continuously), and sub-topic chips alternating left/right of the spine
 * with real connector lines. Fixed width, grows downward only — never wider
 * than its container. All sizing (node width, fonts, padding) scales down at
 * two breakpoints (tablet/laptop and mobile) via the CSS below, not just a
 * single all-or-nothing mobile switch.
 */
export function RoadmapTree({ roadmap }: { roadmap: RoadmapData }) {
  let counter = 0;

  return (
    <div className="rm-spine w-full max-w-[720px] mx-auto">
      <div className="relative flex flex-col items-stretch">
        {/* spine line — scoped to this wrapper only, so it never runs through the legend above */}
        <div className="rm-line absolute left-1/2 -translate-x-1/2 top-0 bottom-0" style={{ background: "var(--border2)", zIndex: 0 }} />

        {/* start node */}
        <div className="rm-endnode-wrap flex justify-center" style={{ position: "relative", zIndex: 1 }}>
          <div className="rm-endnode relative z-[1] rounded-[12px] text-center" style={{ background: "var(--btn-bg, #111827)", color: "var(--btn-text, #fff)", opacity: 0.9 }}>
            <div className="rm-endnode-title font-medium">Prerequisites</div>
            <div className="rm-endnode-sub opacity-70">{roadmap.prerequisites.length ? roadmap.prerequisites.join(", ") : "None — start here"}</div>
          </div>
        </div>

        {roadmap.phases.map((phase) => {
          const lv = LEVEL[phase.phase] ?? LEVEL.Beginner;
          return (
            <div key={phase.phase} className="flex flex-col items-stretch">
              {/* level pill */}
              <div className="rm-pill-wrap flex justify-center" style={{ position: "relative", zIndex: 1 }}>
                <div
                  className="rm-pill relative z-[1] inline-flex items-center rounded-full"
                  style={{ background: "var(--surface)", color: lv.k, border: `1.5px solid ${lv.k}` }}
                >
                  <span aria-hidden>{lv.icon}</span>
                  <span className="font-medium">{lv.label}</span>
                  <span className="opacity-70">— {lv.tagline}</span>
                </div>
              </div>

              {phase.nodes.map((node, ni) => {
                counter++;
                const side: "left" | "right" = counter % 2 === 1 ? "right" : "left";
                return (
                  <div key={ni} className="rm-row grid items-center">
                    {/* left column */}
                    <div
                      className={`flex justify-end min-w-0 ${side === "left" && node.chips.length > 0 ? "rm-side rm-side-l" : ""}`}
                      style={{ ["--tick" as string]: lv.k }}
                    >
                      {side === "left" && node.chips.length > 0 && (
                        <ul className="rm-bracket rm-bracket-l flex flex-col min-w-0 max-w-full" style={{ borderColor: lv.k, ["--tick" as string]: lv.k }}>
                          {node.chips.map((chip, ci) => (
                            <li key={ci} className="rm-tick rm-tick-l">
                              <Chip chip={chip} levelK={lv.k} levelBg={lv.bg} onSide="left" />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* node (center, on the spine) */}
                    <div
                      className="rm-node relative z-[1] w-full rounded-[12px] text-center"
                      style={{ background: "var(--surface)", border: `1.5px solid ${lv.k}`, padding: "var(--rm-node-py) var(--rm-node-px)" }}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span
                          className="rm-node-num rounded-full flex items-center justify-center font-medium flex-shrink-0"
                          style={{ background: lv.k, color: "var(--btn-text, #fff)" }}
                        >
                          {counter}
                        </span>
                        <span className="rm-node-title font-medium" style={{ color: "var(--text)" }}>{node.title}</span>
                      </div>
                      <div className="rm-node-desc" style={{ color: "var(--text3)" }}>{node.description}</div>
                    </div>

                    {/* right column */}
                    <div
                      className={`flex justify-start min-w-0 ${side === "right" && node.chips.length > 0 ? "rm-side rm-side-r" : ""}`}
                      style={{ ["--tick" as string]: lv.k }}
                    >
                      {side === "right" && node.chips.length > 0 && (
                        <ul className="rm-bracket rm-bracket-r flex flex-col min-w-0 max-w-full" style={{ borderColor: lv.k, ["--tick" as string]: lv.k }}>
                          {node.chips.map((chip, ci) => (
                            <li key={ci} className="rm-tick rm-tick-r">
                              <Chip chip={chip} levelK={lv.k} levelBg={lv.bg} onSide="right" />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* end node */}
        <div className="rm-endnode-wrap flex justify-center" style={{ position: "relative", zIndex: 1 }}>
          <div className="rm-endnode relative z-[1] inline-flex items-center rounded-[12px]" style={{ background: "var(--btn-bg, #111827)", color: "var(--btn-text, #fff)", opacity: 0.9 }}>
            <svg className="rm-check" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg>
            <span className="rm-endnode-title font-medium">Job-ready {roadmap.title.replace(/roadmap/i, "").trim()}</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .rm-spine {
          --rm-node-w: 190px;
          --rm-node-py: 22px;
          --rm-node-px: 28px;
          --rm-col-gap: 0.75rem;
          --rm-row-py: 0.9rem;
          --rm-title-fs: 13px;
          --rm-desc-fs: 11px;
          --rm-num-size: 20px;
          --rm-num-fs: 10px;
          --rm-chip-fs: 14px;
          --rm-chip-py: 2px;
          --rm-chip-px: 12px;
          --rm-chip-min-w: 110px;
          --rm-chip-max-w: 240px;
          --rm-pill-fs: 13px;
          --rm-pill-py: 10px;
          --rm-pill-px: 18px;
          --rm-endnode-fs: 13px;
          --rm-endnode-sub-fs: 11px;
          --rm-endnode-py: 14px;
          --rm-endnode-px: 22px;
          --rm-check: 14px;
          --rm-gap-y: 1.5rem;
        }
        .rm-line {
          width: 2px;
        }
        .rm-endnode-wrap {
          margin-bottom: var(--rm-gap-y);
        }
        .rm-pill-wrap {
          margin: 1rem 0;
        }
        .rm-endnode {
          padding: var(--rm-endnode-py) var(--rm-endnode-px);
          gap: 8px;
        }
        .rm-endnode-title {
          font-size: var(--rm-endnode-fs);
        }
        .rm-endnode-sub {
          font-size: var(--rm-endnode-sub-fs);
          margin-top: 2px;
        }
        .rm-check {
          width: var(--rm-check);
          height: var(--rm-check);
        }
        .rm-pill {
          gap: 8px;
          font-size: var(--rm-pill-fs);
          padding: var(--rm-pill-py) var(--rm-pill-px);
        }
        .rm-row {
          grid-template-columns: minmax(0, 1fr) var(--rm-node-w) minmax(0, 1fr);
          gap: var(--rm-col-gap);
          padding: var(--rm-row-py) 0;
        }
        .rm-node {
          padding: var(--rm-node-py) var(--rm-node-px);
        }
        .rm-node-num {
          width: var(--rm-num-size);
          height: var(--rm-num-size);
          font-size: var(--rm-num-fs);
        }
        .rm-node-title {
          font-size: var(--rm-title-fs);
        }
        .rm-node-desc {
          font-size: var(--rm-desc-fs);
        }
        .rm-side {
          position: relative;
        }
        /*
         * Bridges the exact grid gap between the bracket's border and the
         * node box — width is the live --rm-col-gap var (not a fixed px),
         * anchored flush to the column edge (right/left: 0) so it always
         * touches both the bracket border on one end and the node on the
         * other, at every breakpoint.
         */
        .rm-side-l::after,
        .rm-side-r::after {
          content: "";
          position: absolute;
          top: 50%;
          height: 0;
          width: var(--rm-col-gap);
          border-top: 1.5px solid var(--tick);
        }
        .rm-side-l::after {
          /* the gap sits OUTSIDE this column, to its right — push the box's
             right edge out past the column boundary by exactly one gap so
             it spans column-edge -> node-edge, not backwards into the chips */
          right: calc(-1 * var(--rm-col-gap));
        }
        .rm-side-r::after {
          left: calc(-1 * var(--rm-col-gap));
        }
        .rm-bracket {
          list-style: none;
          margin: 0;
          gap: 16px;
        }
        .rm-bracket-l {
          border-right: 1.5px solid;
          padding-right: 8px;
        }
        .rm-bracket-r {
          border-left: 1.5px solid;
          padding-left: 8px;
        }
        .rm-tick {
          position: relative;
          min-height: 28px;
          max-width: 100%;
          display: flex;
          align-items: center;
        }
        .rm-tick-l {
          justify-content: flex-end;
        }
        .rm-tick-l::after {
          content: "";
          position: absolute;
          right: -9px;
          top: 50%;
          width: 9px;
          height: 0;
          border-top: 1.5px solid;
          border-color: var(--tick);
        }
        .rm-tick-r {
          justify-content: flex-start;
        }
        .rm-tick-r::after {
          content: "";
          position: absolute;
          left: -9px;
          top: 50%;
          width: 9px;
          height: 0;
          border-top: 1.5px solid;
          border-color: var(--tick);
        }
        .rm-chip {
          font-size: var(--rm-chip-fs);
          padding: var(--rm-chip-py) var(--rm-chip-px);
          border-radius: 8px;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
          min-width: var(--rm-chip-min-w);
          max-width: var(--rm-chip-max-w);
          text-align: center;
          cursor: pointer;
          transition: transform 0.12s ease;
        }
        .rm-chip:hover {
          transform: translateY(-1px);
        }

        /*
         * Mobile: SAME layout as desktop (spine + alternating left/right
         * branches) — nothing about the structure changes, only sizes shrink
         * so it fits a small screen. Desktop (anything above this breakpoint)
         * is completely untouched by this block.
         */
        @media (max-width: 640px) {
          .rm-spine {
            --rm-node-w: 118px;
            --rm-node-py: 1px;
            --rm-node-px: 1px;
            --rm-col-gap: 0.35rem;
            --rm-row-py: 0.5rem;
            --rm-title-fs: 10.5px;
            --rm-desc-fs: 8.5px;
            --rm-num-size: 16px;
            --rm-num-fs: 8px;
            --rm-chip-fs: 9.5px;
            --rm-chip-py: 1px;
            --rm-chip-px: 1px;
            --rm-chip-min-w: 74px;
            --rm-chip-max-w: 108px;
            --rm-pill-fs: 10.5px;
            --rm-pill-py: 6px;
            --rm-pill-px: 12px;
            --rm-endnode-fs: 10.5px;
            --rm-endnode-sub-fs: 9px;
            --rm-endnode-py: 8px;
            --rm-endnode-px: 13px;
            --rm-check: 11px;
            --rm-gap-y: 1.1rem;
          }
          .rm-bracket,
          .rm-tick {
            gap: 8px;
          }
          .rm-tick {
            min-height: 22px;
          }
          .rm-chip {
            white-space: normal;
          }
          .rm-node-num {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

const PHASE_TAGLINE: Record<RoadmapPhaseData["phase"], string> = {
  Beginner: "Learn the core",
  Intermediate: "Patterns and ecosystem",
  Advanced: "Ship it to production",
};

/** must-learn chips map to "core", optional/later chips to "future stack", pick-one alternatives stay "alternative". */
const CHIP_KIND_TO_TOPIC_KIND: Record<ChipKind, TopicKind> = {
  must: "c",
  "pick-one": "o",
  optional: "f",
};

function mono(title: string) {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "RM";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "roadmap";
}

/** Adapts the AI-generated per-course roadmap into the shared stage-tree shape used by /roadmaps. */
export function toStageRoadmap(roadmap: RoadmapData): StageRoadmap {
  return {
    id: slugify(roadmap.title),
    name: roadmap.title,
    mono: mono(roadmap.title),
    cat: "",
    level: "",
    duration: "",
    course: roadmap.title,
    summary: roadmap.summary,
    roles: [],
    prereq: roadmap.prerequisites.length ? roadmap.prerequisites.join(", ") : "None — start here",
    stages: roadmap.phases.map((phase) => ({
      t: phase.phase,
      why: PHASE_TAGLINE[phase.phase],
      g: phase.nodes.map((node): RoadmapGroup => [
        node.title,
        node.chips.map((chip): RoadmapTopic => [chip.title, CHIP_KIND_TO_TOPIC_KIND[chip.kind], chip.videoId]),
        node.description,
      ]),
    })),
    // AI-generated [learnFirst, unlocks] chip pairs — absent on roadmaps saved
    // before this field existed, so default to no links rather than crash.
    rels: (roadmap.rels ?? []).map((r): [string, string] => [r.learnFirst, r.unlocks]),
  };
}

const TOPIC_KIND_TO_CHIP_KIND: Record<TopicKind, ChipKind> = {
  c: "must",
  o: "pick-one",
  f: "optional",
};

/**
 * Reverse of toStageRoadmap — folds an edited stage-tree back onto the
 * original RoadmapData, by position (stage index = phase index, group index
 * = node index, chip index = chip index; toStageRoadmap never reorders or
 * filters, so this always lines up). `lessonTitles` can't be recovered for a
 * renamed/added/reordered chip, so it's dropped there — it was only ever a
 * one-time hint for the initial video auto-match, not shown anywhere.
 */
export function applyStageEdits(original: RoadmapData, edited: StageRoadmap): RoadmapData {
  const next: RoadmapData = JSON.parse(JSON.stringify(original));
  next.phases = edited.stages.map((stage, si) => {
    const origPhase = original.phases[si];
    return {
      phase: origPhase?.phase ?? "Beginner",
      nodes: stage.g.map(([title, topics, description], gi) => {
        const origNode = origPhase?.nodes[gi];
        return {
          title,
          description: description ?? origNode?.description ?? "",
          chips: topics.map(([ctitle, kind, videoId], ci) => ({
            title: ctitle,
            kind: TOPIC_KIND_TO_CHIP_KIND[kind],
            lessonTitles: origNode?.chips[ci]?.title === ctitle ? origNode.chips[ci].lessonTitles : [],
            videoId: videoId ?? null,
          })),
        };
      }),
    };
  });
  return next;
}

/** Full roadmap: title/summary header + the same stage-tree diagram used on /roadmaps/[id]. */
function loadDone(key: string): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(`fs-roadmap-progress-${key}`) || "{}") || {}; } catch { return {}; }
}
function saveDone(key: string, done: Record<string, boolean>) {
  try { localStorage.setItem(`fs-roadmap-progress-${key}`, JSON.stringify(done)); } catch { /* ignore */ }
}

export function RoadmapView({
  roadmap, onJumpToVideo, trackProgress = true, editable, videoOptions, onEdit, completedVideoIds,
}: {
  roadmap: RoadmapData;
  onJumpToVideo?: (videoId: string) => void;
  /** Set false to hide the "mark as learned" checkboxes/panel button entirely (e.g. admin preview). */
  trackProgress?: boolean;
  /** Turns every node/chip in the tree into inline-editable fields, including
   *  which video a chip links to. Requires `onEdit`. */
  editable?: boolean;
  videoOptions?: VideoOption[];
  onEdit?: (next: RoadmapData) => void;
  /** Video IDs the student has already finished watching. Any topic linked
   *  to one of these is shown as learned automatically, no manual toggle needed. */
  completedVideoIds?: Set<string> | string[];
}) {
  const stageRoadmap = useMemo(() => toStageRoadmap(roadmap), [roadmap]);
  const progressKey = stageRoadmap.id;
  const [sel, setSel] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState<"sel" | "all">("sel");
  const [highlight, setHighlight] = useState<"all" | "c" | "f" | "todo">("all");
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (trackProgress) setDone(loadDone(progressKey));
  }, [progressKey, trackProgress]);

  const autoDoneTitles = useMemo(() => {
    if (!completedVideoIds) return [];
    const completed = completedVideoIds instanceof Set ? completedVideoIds : new Set(completedVideoIds);
    const titles: string[] = [];
    for (const stage of stageRoadmap.stages) {
      for (const [, topics] of stage.g) {
        for (const [title, , videoId] of topics) {
          if (videoId && completed.has(videoId)) titles.push(title);
        }
      }
    }
    return titles;
  }, [stageRoadmap, completedVideoIds]);

  const effectiveDone = useMemo(() => {
    if (!autoDoneTitles.length) return done;
    const next = { ...done };
    for (const title of autoDoneTitles) next[title] = true;
    return next;
  }, [done, autoDoneTitles]);

  function toggleDone(topic: string) {
    if (autoDoneTitles.includes(topic)) return;
    setDone((prev) => {
      const next = { ...prev };
      if (next[topic]) delete next[topic]; else next[topic] = true;
      saveDone(progressKey, next);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6 w-full">
      <div className="flex flex-wrap items-center gap-3">
        <RmSeg label="Show" value={highlight} onChange={setHighlight as (v: string) => void} options={
          trackProgress
            ? [{ v: "all", label: "All topics" }, { v: "c", label: "Core" }, { v: "f", label: "Future stack" }, { v: "todo", label: "Not learned yet" }]
            : [{ v: "all", label: "All topics" }, { v: "c", label: "Core" }, { v: "f", label: "Future stack" }]
        } />
        <RmSeg label="Links" value={linkMode} onChange={setLinkMode as (v: string) => void} options={[
          { v: "sel", label: "Selected topic" }, { v: "all", label: "All relations" },
        ]} />
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] w-full text-gray-600 dark:text-gray-300">
          <RmSwatch style={{ background: "#e8effd", borderColor: "#2563eb" }} label="Core" />
          <RmSwatch style={{ background: "#fdece3", borderColor: "#e0521a" }} label="Future stack" />
          <RmSwatch style={{ background: "#f1f3f7", borderColor: "#9ca3af", borderStyle: "dashed" }} label="Alternative, pick one" />
        </div>
      </div>

      <RoadmapDetailTree
        roadmap={stageRoadmap}
        sel={sel}
        onSelect={setSel}
        highlight={highlight}
        linkMode={linkMode}
        onJumpToVideo={onJumpToVideo}
        done={trackProgress ? effectiveDone : undefined}
        onToggleDone={trackProgress ? toggleDone : undefined}
        editable={editable}
        videoOptions={videoOptions}
        onEdit={onEdit ? (next) => onEdit(applyStageEdits(roadmap, next)) : undefined}
      />
    </div>
  );
}

function RmSeg<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { v: T; label: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide mr-0.5 text-gray-500 dark:text-gray-400">{label}</span>
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

function RmSwatch({ style, label }: { style: React.CSSProperties; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <i className="inline-block w-3 h-3 rounded" style={{ border: "1.5px solid", ...style }} />
      {label}
    </span>
  );
}
