import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Help & Support",
  description:
    "Get help with courses, payments, refunds and your account. Raise a support ticket and the FutureStack team will get back to you.",
  path: "/support",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
