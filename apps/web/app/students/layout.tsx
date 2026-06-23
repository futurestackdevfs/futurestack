import type { ReactNode } from "react";
import { TopNav } from "@/components/layout/marketing-top-nav";
import { FooterWrapper } from "@/components/layout/footer-wrapper";

export default function StudentsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopNav />
      <div className="h-[56px]" />
      {children}
      <FooterWrapper />
    </>
  );
}
