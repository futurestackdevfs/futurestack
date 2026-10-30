import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Course Roadmaps",
  description:
    "Follow a step-by-step roadmap for each FutureStack course: what to learn, in what order, and the projects that build the skills.",
  path: "/roadmaps",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
