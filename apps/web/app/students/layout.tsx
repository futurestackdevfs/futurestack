import type { ReactNode } from "react";
import { TopNav } from "@/components/layout/top-nav";
import { FooterWrapper } from "@/components/layout/footer-wrapper";

export default function StudentsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopNav />
      {children}
      <FooterWrapper />
    </>
  );
}
