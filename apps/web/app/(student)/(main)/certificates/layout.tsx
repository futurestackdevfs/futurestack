import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Verified Certificates",
  description:
    "See the FutureStack certificate you earn on completing a course, and track your earned and in-progress certificates from your dashboard.",
  path: "/certificates",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
