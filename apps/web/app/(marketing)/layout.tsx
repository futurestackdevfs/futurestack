import type { ReactNode } from "react";
import { TopNav } from "@/components/layout/top-nav";
import { Footer } from "@/components/layout/footer";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopNav />
      <main className="flex flex-col gap-2.5" style={{ minHeight: "calc(100vh - 58px)", paddingBottom: 0 }}>
        {children}
      </main>
      <Footer />
    </>
  );
}
