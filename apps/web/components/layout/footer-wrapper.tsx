"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./footer";

export function FooterWrapper() {
  const pathname = usePathname();
  const showFooter =
    pathname === "/" ||
    pathname.startsWith("/live-projects") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/careers") ||
    pathname.startsWith("/research-and-development") ||
    pathname.startsWith("/support") ||
    pathname.startsWith("/faq") ||
    pathname.startsWith("/articles") ||
    pathname.startsWith("/certificates");
  if (!showFooter) return null;
  return <Footer />;
}
