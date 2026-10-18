import type { Metadata } from "next";
import PracticeHub from "@/components/practice-hub/PracticeHub";

export const metadata: Metadata = {
  title: "Practice Hub – FutureStack",
  description:
    "Practice test automation with Selenium and Playwright. Get test-case-level feedback on what passed, where you got stuck and why.",
  alternates: { canonical: "/practice-hub" },
};

export default function PracticeHubPage() {
  return <PracticeHub />;
}
