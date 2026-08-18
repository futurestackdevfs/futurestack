import type { ReactNode } from "react";
import { TopNav } from "@/components/layout/marketing-top-nav";
import { FooterWrapper } from "@/components/layout/footer-wrapper";
import { CareerGuidance } from "@/app/(student)/components/career-guidance";

export default function StudentsLayout({ children }: { children: ReactNode }) {
  return (
    <CareerGuidance>
      <TopNav />
      <div className="h-[56px]" />
      {children}
      <FooterWrapper />
    </CareerGuidance>
  );
}
