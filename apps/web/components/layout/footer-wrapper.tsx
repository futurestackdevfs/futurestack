"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./footer";

export function FooterWrapper() {
  const pathname = usePathname();
  if (pathname && pathname !== "/students" && pathname.startsWith("/students/")) return null;
  return <Footer />;
}
