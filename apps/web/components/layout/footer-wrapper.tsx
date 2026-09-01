"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./footer";

export function FooterWrapper() {
  const pathname = usePathname();
  const showFooter = pathname === "/" || pathname.startsWith("/live-projects") || pathname.startsWith("/about") || pathname.startsWith("/research-and-development");
  if (!showFooter) return null;
  return <Footer />;
}
