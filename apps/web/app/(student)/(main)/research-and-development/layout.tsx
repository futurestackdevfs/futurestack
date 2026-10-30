import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Research & Development",
  description:
    "FutureStack R&D: engineering domains where software and hardware teams take an idea from the whiteboard to a working rig. Share a problem worth solving.",
  path: "/research-and-development",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
