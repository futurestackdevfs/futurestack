import type { Metadata } from "next";
import type { ReactNode } from "react";
import { clampDescription, pageMetadata } from "@/lib/seo";

const BACKEND = process.env.API_URL ?? "http://localhost:3002";

type LayoutProps = { children: ReactNode; params: Promise<{ id: string }> };

/** A roadmap belongs to a course; `id` is the course slug. */
export async function generateMetadata({ params }: Pick<LayoutProps, "params">): Promise<Metadata> {
  const { id } = await params;
  const path = `/roadmaps/${id}`;
  try {
    const res = await fetch(`${BACKEND}/courses/public/slug/${encodeURIComponent(id)}`, {
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(4000),
    });
    if (res.status === 404) return { title: "Roadmap not found", robots: { index: false, follow: false } };
    if (!res.ok) return { alternates: { canonical: path } };
    const course = (await res.json()) as { title: string; description?: string; comingSoon?: boolean };
    if (course.comingSoon) return { title: `${course.title} roadmap`, alternates: { canonical: path }, robots: { index: false, follow: true } };
    return pageMetadata({
      title: `${course.title} Roadmap`,
      description:
        clampDescription(course.description) ??
        `A step-by-step learning roadmap for ${course.title}: what to learn, in what order, and the projects that build the skills.`,
      path,
    });
  } catch {
    return { alternates: { canonical: path } };
  }
}

export default function RoadmapLayout({ children }: { children: ReactNode }) {
  return children;
}
