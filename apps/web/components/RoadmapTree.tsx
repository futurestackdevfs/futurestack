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
  /** One extra level of breakdown for a chip that genuinely needs it (e.g.
   *  "Testing Types" -> Unit/Integration/E2E) — most chips have none. */
  children?: RoadmapChipData[];
}
export interface RoadmapNodeData {
  title: string;
  description: string;
  chips: RoadmapChipData[];
}
export interface RoadmapPhaseData {
  /** Internal grouping label only — never shown to the learner. No longer a
   *  fixed Beginner/Intermediate/Advanced enum: the AI picks however many
   *  phases (4-8) the subject actually needs. */
  phase: string;
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

/** Builds a tagline from this phase's actual node titles — different on
 *  every roadmap instead of a fixed generic phrase. */
function phaseTagline(phase: RoadmapPhaseData): string {
  const titles = phase.nodes.map((n) => n.title).filter(Boolean);
  return titles.length ? titles.slice(0, 2).join(" · ") : phase.phase;
}

function chipToTopic(chip: RoadmapChipData): RoadmapTopic {
  return [
    chip.title,
    CHIP_KIND_TO_TOPIC_KIND[chip.kind],
    chip.videoId,
    chip.children && chip.children.length > 0 ? chip.children.map(chipToTopic) : undefined,
  ];
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
      why: phaseTagline(phase),
      g: phase.nodes.map((node): RoadmapGroup => [
        node.title,
        node.chips.map(chipToTopic),
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

function findOrigChip(origChips: RoadmapChipData[] | undefined, title: string): RoadmapChipData | undefined {
  return origChips?.find((c) => c.title === title);
}

function topicToChip(topic: RoadmapTopic, orig?: RoadmapChipData): RoadmapChipData {
  const [title, kind, videoId, children] = topic;
  return {
    title,
    kind: TOPIC_KIND_TO_CHIP_KIND[kind],
    // lessonTitles can't be recovered for a renamed/added/reordered chip, so
    // it's dropped there — it was only ever a one-time hint for the initial
    // video auto-match, not shown anywhere.
    lessonTitles: orig?.title === title ? orig.lessonTitles : [],
    videoId: videoId ?? null,
    children: children?.map((c) => topicToChip(c, findOrigChip(orig?.children, c[0]))),
  };
}

/**
 * Reverse of toStageRoadmap — folds an edited stage-tree back onto the
 * original RoadmapData, by position (stage index = phase index, group index
 * = node index; toStageRoadmap never reorders or filters, so this always
 * lines up for phases/nodes — chips are matched back up by title since a
 * chip can now carry its own sub-chips).
 */
export function applyStageEdits(original: RoadmapData, edited: StageRoadmap): RoadmapData {
  const next: RoadmapData = JSON.parse(JSON.stringify(original));
  next.phases = edited.stages.map((stage, si) => {
    const origPhase = original.phases[si];
    return {
      phase: origPhase?.phase ?? stage.t,
      nodes: stage.g.map(([title, topics, description], gi) => {
        const origNode = origPhase?.nodes[gi];
        return {
          title,
          description: description ?? origNode?.description ?? "",
          chips: topics.map((topic) => topicToChip(topic, findOrigChip(origNode?.chips, topic[0]))),
        };
      }),
    };
  });
  return next;
}

function loadDone(key: string): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(`fs-roadmap-progress-${key}`) || "{}") || {}; } catch { return {}; }
}
function saveDone(key: string, done: Record<string, boolean>) {
  try { localStorage.setItem(`fs-roadmap-progress-${key}`, JSON.stringify(done)); } catch { /* ignore */ }
}

function collectAutoDone(topics: RoadmapTopic[], completed: Set<string>, out: string[]) {
  for (const [title, , videoId, children] of topics) {
    if (videoId && completed.has(videoId)) out.push(title);
    if (children) collectAutoDone(children, completed, out);
  }
}

/** Full roadmap: title/summary header + the same stage-tree diagram used on /roadmaps/[id]. */
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
      for (const [, topics] of stage.g) collectAutoDone(topics, completed, titles);
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
