import { Roadmap } from './roadmap-schemas';

/**
 * Zero-token guard: the model is instructed to copy lesson titles verbatim
 * from the curriculum we gave it, but nothing stops it from paraphrasing or
 * inventing one. Strip any `lessonTitles` entry (nested at phase -> node ->
 * chip) that isn't an exact (case/whitespace-insensitive) match to a real
 * title — cheaper and more reliable than asking the model to double-check
 * itself.
 */
export function sanitizeRoadmapLessonTitles(roadmap: Roadmap, actualTitles: readonly string[]): Roadmap {
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  const valid = new Map(actualTitles.map((t) => [normalize(t), t]));

  return {
    ...roadmap,
    phases: roadmap.phases.map((phase) => ({
      ...phase,
      nodes: phase.nodes.map((node) => ({
        ...node,
        chips: node.chips.map((chip) => ({
          ...chip,
          lessonTitles: chip.lessonTitles
            .map((t) => valid.get(normalize(t)))
            .filter((t): t is string => !!t),
        })),
      })),
    })),
  };
}
