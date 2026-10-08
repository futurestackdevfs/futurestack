import LiveProjectsPageClient, { mapApiProject } from "./LiveProjectsPageClient";
import type { Project } from "./LiveProjectsPageClient";

const BACKEND = process.env.API_URL ?? "http://localhost:3002";

// Server-fetch the active project list so the catalog has real content on
// first paint instead of a client-only loading skeleton. Tech-filtering
// still happens entirely client-side exactly as before — this only seeds
// the very first render.
async function getInitialProjects(): Promise<Project[] | undefined> {
  try {
    const res = await fetch(`${BACKEND}/projects?status=ACTIVE`, { cache: "no-store" });
    if (!res.ok) return undefined;
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.projects || [];
    return list.map(mapApiProject);
  } catch {
    return undefined;
  }
}

export default async function LiveProjectsPage() {
  const initialProjects = await getInitialProjects();

  return <LiveProjectsPageClient initialProjects={initialProjects} />;
}
