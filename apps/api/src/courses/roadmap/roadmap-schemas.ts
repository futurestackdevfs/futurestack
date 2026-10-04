import { z } from 'zod';

/**
 * The shape we ask Claude to return (structured outputs guarantee valid JSON
 * of this shape). Kept constraint-free on purpose — length/format rules live
 * in `RoadmapSchema` below and are enforced after parsing.
 *
 * A branching TREE, modeled after roadmap.sh's spine layout: Beginner/
 * Intermediate/Advanced phases, each with several main topic nodes (short
 * title + one-line description), each branching into sub-topic chips
 * classified as must-learn / pick-one / optional — the same three chip
 * styles roadmap.sh uses.
 */
export const ChipKind = z.enum(['must', 'pick-one', 'optional']);

export const RoadmapChipWireSchema = z.object({
  title: z.string().describe('Short sub-topic label, 1-4 words, e.g. "useState", "React Router"'),
  kind: ChipKind.describe(
    '"must" = essential, everyone needs this. "pick-one" = choose one option among alternatives (e.g. one router, one styling approach). "optional" = nice-to-have, not required to progress.',
  ),
  lessonTitles: z
    .array(z.string())
    .describe('Curriculum lesson titles (copied VERBATIM) that map to this sub-topic — leave empty if none genuinely fit, never invent one'),
});

export const RoadmapNodeWireSchema = z.object({
  title: z.string().describe('Short main-topic label, 1-4 words, e.g. "Components", "Routing", "Backend Fundamentals"'),
  description: z.string().describe('One short line (under 8 words) on what this topic is for, e.g. "Build UI from small pieces"'),
  chips: z.array(RoadmapChipWireSchema).describe('4-8 sub-topic chips under this main topic'),
});

export const RoadmapPhaseWireSchema = z.object({
  phase: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  nodes: z.array(RoadmapNodeWireSchema).describe('2-6 main topic nodes belonging to this phase'),
});

export const RoadmapRelWireSchema = z.object({
  learnFirst: z.string().describe('Chip title that must be learned FIRST — copied VERBATIM from one of the chips above'),
  unlocks: z.string().describe('Chip title it UNLOCKS/leads into — copied VERBATIM from one of the chips above'),
});

export const RoadmapWireSchema = z.object({
  title: z.string().describe('Roadmap title, e.g. "Full-Stack Developer Roadmap"'),
  summary: z.string().describe('One or two sentences: what this path takes you from -> to'),
  prerequisites: z.array(z.string()).describe('2-4 short prerequisite topics someone should already know before starting (empty array if truly none)'),
  phases: z
    .array(RoadmapPhaseWireSchema)
    .describe(
      'Exactly 3 phases in order: Beginner, Intermediate, Advanced. Be complete — cover every topic a real developer roadmap for this subject would include, the way roadmap.sh does it, using only short titles (no long descriptions on chips).',
    ),
  rels: z
    .array(RoadmapRelWireSchema)
    .describe(
      'Prerequisite links BETWEEN CHIPS across the whole roadmap: each entry names a chip title that must be learned first and the chip title it unlocks, using chip titles copied verbatim (e.g. {learnFirst:"useState", unlocks:"useEffect"}). Only real, meaningful dependencies — not every chip needs a link. 15-40 entries for a typical roadmap. Both titles must exactly match a chip title declared above.',
    ),
});

/** What we actually accept and save on the course. */
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
});

export const RoadmapNodeSchema = z.object({
  title: z.string().trim().min(2).max(50),
  description: z.string().trim().min(3).max(80),
  chips: z.array(RoadmapChipSchema).min(1).max(10),
});

export const RoadmapPhaseSchema = z.object({
  phase: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  nodes: z.array(RoadmapNodeSchema).min(1).max(8),
});

export const RoadmapRelSchema = z.object({
  learnFirst: z.string().trim().min(1).max(40),
  unlocks: z.string().trim().min(1).max(40),
});

export const RoadmapSchema = z.object({
  title: z.string().trim().min(3).max(100),
  summary: z.string().trim().min(10).max(300),
  prerequisites: z.array(z.string().trim().min(1).max(40)).max(6),
  phases: z.array(RoadmapPhaseSchema).min(3).max(3),
  // learnFirst/unlocks pairs between chip titles — optional/defaulted so
  // roadmaps saved before this field existed still parse as "no links" rather
  // than failing validation.
  rels: z.array(RoadmapRelSchema).max(80).default([]),
});

export type RoadmapChip = z.infer<typeof RoadmapChipSchema>;
export type RoadmapNode = z.infer<typeof RoadmapNodeSchema>;
export type RoadmapPhase = z.infer<typeof RoadmapPhaseSchema>;
export type Roadmap = z.infer<typeof RoadmapSchema>;
