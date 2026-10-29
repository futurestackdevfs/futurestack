import type { Metadata } from "next";
import PracticeHub from "@/components/practice-hub/PracticeHub";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Practice Hub",
  description:
    "Practice test automation with Selenium and Playwright. Get test-case-level feedback on what passed, where you got stuck and why.",
  path: "/practice-hub",
});

export default function PracticeHubPage() {
  return <PracticeHub />;
}
