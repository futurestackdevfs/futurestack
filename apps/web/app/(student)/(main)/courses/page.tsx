import { Suspense } from "react";
import CoursesPageClient from "./CoursesPageClient";
import type { CardsResponse } from "./CoursesPageClient";

const BACKEND = process.env.API_URL ?? "http://localhost:3002";

// Server-fetch the default (unfiltered, page 1) course list so the catalog
// has real content on first paint instead of a client-only loading skeleton.
// All filtering/sorting/pagination still happens client-side exactly as
// before — this only seeds the very first render.
async function getInitialCourses(): Promise<CardsResponse | undefined> {
  try {
    const res = await fetch(`${BACKEND}/courses/public/cards?page=1&perPage=12`, {
      // Cached 2 min in Next's Data Cache — the catalog rarely changes, and this
      // keeps every visit from waiting on a possibly-cold backend.
      next: { revalidate: 120 },
      // Don't let a cold backend hold up the whole page; fall back to the
      // client-side fetch after 4s.
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return undefined;
    return (await res.json()) as CardsResponse;
  } catch {
    return undefined;
  }
}

export default async function CoursesPage() {
  const initialData = await getInitialCourses();

  return (
    <Suspense fallback={null}>
      <CoursesPageClient initialData={initialData} />
    </Suspense>
  );
}
