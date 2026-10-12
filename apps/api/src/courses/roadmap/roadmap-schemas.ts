import { z } from 'zod';

/**
 * The shape we ask Claude to return (structured outputs guarantee valid JSON
 * of this shape). Kept constraint-free on purpose — length/format rules live
 * in `RoadmapSchema` below and are enforced after parsing.
 *
 * A branching TREE, modeled after roadmap.sh's spine layout: a variable
 * number of phases (4-8, as many as the subject naturally needs — NOT a
 * fixed Beginner/Intermediate/Advanced three-way split), each with several
 * main topic nodes (short title + one-line description), each branching into
 * sub-topic chips classified as must-learn / pick-one / optional — the same
 * three chip styles roadmap.sh uses. A chip can itself have a further level
 * of sub-chips when it genuinely needs breaking down (e.g. "Testing Types"
 * -> Unit / Integration / E2E).
 */
export const ChipKind = z.enum(['must', 'pick-one', 'optional']);

export const RoadmapSubChipWireSchema = z.object({
  title: z.string().describe('Short sub-of-sub-topic label, 1-4 words'),
  kind: ChipKind,
  lessonTitles: z
    .array(z.string())
    .describe('Curriculum lesson titles (copied VERBATIM) that map to this — leave empty if none genuinely fit, never invent one'),
});

export const RoadmapChipWireSchema = z.object({
  title: z.string().describe('Short sub-topic label, 1-4 words, e.g. "useState", "React Router"'),
  kind: ChipKind.describe(
    '"must" = essential, everyone needs this. "pick-one" = choose one option among alternatives (e.g. one router, one styling approach). "optional" = nice-to-have, not required to progress.',
  ),
  lessonTitles: z
    .array(z.string())
    .describe('Curriculum lesson titles (copied VERBATIM) that map to this sub-topic — leave empty if none genuinely fit, never invent one'),
  children: z
    .array(RoadmapSubChipWireSchema)
    .describe(
      'Only fill this when the sub-topic itself genuinely has further real structure (e.g. a "Testing Types" chip breaking down into Unit/Integration/E2E, or "SDLC Models" into Waterfall/Agile/V-Model) — most chips need NO children, leave empty for those.',
    ),
});

export const RoadmapNodeWireSchema = z.object({
  title: z.string().describe('Short main-topic label, 1-4 words, e.g. "Components", "Routing", "Backend Fundamentals"'),
  description: z.string().describe('One short line (under 8 words) on what this topic is for, e.g. "Build UI from small pieces"'),
  chips: z.array(RoadmapChipWireSchema).describe('4-8 sub-topic chips under this main topic'),
});

export const RoadmapPhaseWireSchema = z.object({
  phase: z.string().describe('Short internal label for this phase (not shown to the learner) — just something sensible like "Fundamentals", "Tooling", "Advanced Patterns"'),
  nodes: z.array(RoadmapNodeWireSchema).describe('2-6 main topic nodes belonging to this phase'),
});

export const RoadmapRelWireSchema = z.object({
  learnFirst: z.string().describe('Chip (or sub-chip) title that must be learned FIRST — copied VERBATIM from one of the titles above'),
  unlocks: z.string().describe('Chip (or sub-chip) title it UNLOCKS/leads into — copied VERBATIM from one of the titles above'),
});

export const RoadmapWireSchema = z.object({
  title: z.string().describe('Roadmap title, e.g. "Full-Stack Developer Roadmap"'),
  summary: z.string().describe('One or two sentences: what this path takes you from -> to'),
  prerequisites: z.array(z.string()).describe('2-4 short prerequisite topics someone should already know before starting (empty array if truly none)'),
  phases: z
    .array(RoadmapPhaseWireSchema)
    .describe(
      '4 to 8 phases in a sensible progressive order — however many the subject actually needs, not a fixed count. Be complete — cover every topic a real developer roadmap for this subject would include, the way roadmap.sh does it, using only short titles (no long descriptions on chips).',
    ),
  rels: z
    .array(RoadmapRelWireSchema)
    .describe(
      'Prerequisite links BETWEEN CHIPS (or sub-chips) across the whole roadmap: each entry names a title that must be learned first and the title it unlocks, using titles copied verbatim (e.g. {learnFirst:"useState", unlocks:"useEffect"}). Only real, meaningful dependencies — not every chip needs a link. 15-40 entries for a typical roadmap. Both titles must exactly match a chip/sub-chip title declared above.',
    ),
});

/** What we actually accept and save on the course. */
export const RoadmapSubChipSchema = z.object({
  title: z.string().trim().min(1).max(40),
  kind: ChipKind,
  lessonTitles: z.array(z.string().trim().min(1).max(200)).max(30),
  videoId: z.string().nullable().optional(),
});

export const RoadmapChipSchema = z.object({
  title: z.string().trim().min(1).max(40),
  kind: ChipKind,
  lessonTitles: z.array(z.string().trim().min(1).max(200)).max(30),
  // Which curriculum video this chip's content comes from. Auto-filled by
  // matching `lessonTitles` against the course's actual video titles right
  // after generation; admin can override it from the roadmap tab's "Link
  // videos" dropdown (see CourseRoadmapTab.tsx) when the auto-match is wrong
  // or a lesson title was ambiguous/missing.
  videoId: z.string().nullable().optional(),
  // One extra level of breakdown for a chip that genuinely needs it — most
  // chips leave this empty (defaulted so pre-existing saved roadmaps without
  // this field still parse).
  children: z.array(RoadmapSubChipSchema).max(8).default([]),
});

export const RoadmapNodeSchema = z.object({
  title: z.string().trim().min(2).max(50),
  description: z.string().trim().min(3).max(80),
  chips: z.array(RoadmapChipSchema).min(1).max(10),
});

export const RoadmapPhaseSchema = z.object({
  phase: z.string().trim().min(1).max(40),
  nodes: z.array(RoadmapNodeSchema).min(1).max(8),
});

export const RoadmapRelSchema = z.object({
  learnFirst: z.string().trim().min(1).max(40),
  unlocks: z.string().trim().min(1).max(40),
});

export const RoadmapSchema = z.object({
  title: z.string().trim().min(3).max(100),
  summary: z.string().trim().min(10).max(300),
  prerequisites: z.array(z.string().trim().min(1).max(60)).max(6),
  // Variable, subject-driven phase count — not a fixed 3-way Beginner/
  // Intermediate/Advanced split. Minimum 4 so a roadmap always has real
  // progressive structure; capped at 8 to keep it from sprawling.
  phases: z.array(RoadmapPhaseSchema).min(4).max(8),
  // learnFirst/unlocks pairs between chip titles — optional/defaulted so
  // roadmaps saved before this field existed still parse as "no links" rather
  // than failing validation.
  rels: z.array(RoadmapRelSchema).max(80).default([]),
});

export type RoadmapSubChip = z.infer<typeof RoadmapSubChipSchema>;
export type RoadmapChip = z.infer<typeof RoadmapChipSchema>;
export type RoadmapNode = z.infer<typeof RoadmapNodeSchema>;
export type RoadmapPhase = z.infer<typeof RoadmapPhaseSchema>;
export type Roadmap = z.infer<typeof RoadmapSchema>;
