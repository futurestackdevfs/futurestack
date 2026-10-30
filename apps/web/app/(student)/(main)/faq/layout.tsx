import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "FAQ",
  description:
    "Answers to common questions about FutureStack courses, payments, certificates, refunds and your account.",
  path: "/faq",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
