import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About Us",
  description:
    "Meet the team behind FutureStack and our mission: practical, project-first tech learning with expert mentors and verified certificates.",
  path: "/about",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
