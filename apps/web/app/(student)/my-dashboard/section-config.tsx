import type { ReactNode } from "react";

export interface SectionDef {
  id: string;
  icon: string;
  label: string;
  badge?: string | ((ctx: SectionContext) => string);
  badgeCls?: string;
}

export interface SectionContext {
  isLoading: boolean;
  courseCount: number;
}

export const SECTION_ORDER = [
  "overview",
  "courses",
  "schedule",
  "assignments",
  "certificates",
  "projects",
  "discussion",
] as const;

export type TabId = (typeof SECTION_ORDER)[number];

export const SECTION_CONFIG: SectionDef[] = [
  { id: "overview", icon: "⊞", label: "Overview" },
  {
    id: "courses",
    icon: "📚",
    label: "My Courses",
    badge: (ctx: SectionContext) => ctx.isLoading ? "…" : ctx.courseCount.toString(),
    badgeCls: "bg-blue-500/10 text-[#3b82f6] dark:text-[#60a5fa]",
  },
  {
    id: "schedule",
    icon: "📅",
    label: "Schedule",
    badge: "2 Live",
    badgeCls: "bg-green-500/10 text-green-600 dark:text-green-500",
  },
  {
    id: "assignments",
    icon: "📝",
    label: "Assignments",
    badge: "3 Due",
    badgeCls: "bg-orange-500/10 text-[#f05a1a] dark:text-[#ff6a1a]",
  },
  { id: "certificates", icon: "🏅", label: "Certificates" },
  { id: "projects", icon: "📁", label: "Projects" },
];

export function getSectionDef(id: TabId): SectionDef | undefined {
  return SECTION_CONFIG.find((s) => s.id === id);
}

export function resolveBadge(def: SectionDef, ctx: SectionContext): string | undefined {
  if (typeof def.badge === "function") return def.badge(ctx);
  return def.badge;
}
