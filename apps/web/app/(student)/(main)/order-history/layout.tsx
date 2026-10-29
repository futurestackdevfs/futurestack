import type { Metadata } from "next";
import type { ReactNode } from "react";
import { privatePageMetadata } from "@/lib/seo";

// Account page — kept out of search results.
export const metadata: Metadata = privatePageMetadata("Order History");

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
