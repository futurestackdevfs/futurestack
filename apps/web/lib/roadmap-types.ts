/** Shared shape for the stage-tree roadmap visualization (used by /roadmaps and the
 *  per-course roadmap view). Populated from real data — course.roadmap (AI-generated,
 *  see apps/api/src/courses/roadmap) via the adapter in components/RoadmapTree.tsx. */

export type TopicKind = "c" | "f" | "o";
/** [topic label, kind, linked video id (if any)] */
export type RoadmapTopic = [string, TopicKind, string | null | undefined];
export type RoadmapGroup = [string, RoadmapTopic[]];
export interface RoadmapStage {
  t: string;
  why: string;
  future?: boolean;
  g: RoadmapGroup[];
}
export interface Roadmap {
  id: string;
  name: string;
  mono: string;
  cat: string;
  level: string;
  duration: string;
  course: string;
  summary: string;
  roles: string[];
  prereq: string;
  stages: RoadmapStage[];
  rels: Array<[string, string]>;
}
