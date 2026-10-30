import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Careers",
  description:
    "Join the FutureStack team. See open roles and internships, and learn how we work and what we value.",
  path: "/careers",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
