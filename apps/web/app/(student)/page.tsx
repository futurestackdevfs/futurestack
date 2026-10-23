import HomeClient from "./HomeClient";
import { HomeSeed } from "./HomeSeed";

const BACKEND = process.env.API_URL ?? "http://localhost:3002";

// Public catalog data changes rarely. Fetch it on the server and let Next's
// Data Cache hold it for 2 minutes, so most visits never wait on the backend
// (which can be cold on the free Render plan) and the page paints with content.
async function getPublic<T>(path: string): Promise<T | undefined> {
  try {
    // Give up after 4s (e.g. a cold free-tier backend) so the page still renders
    // at once and the browser fetches the data itself, as it did before.
    const res = await fetch(`${BACKEND}${path}`, {
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return undefined;
    return (await res.json()) as T;
  } catch {
    return undefined;
  }
}

export default async function StudentPage() {
  const [courses, slides, tracks] = await Promise.all([
    getPublic("/courses/public/featured-courses"),
    getPublic("/courses/public/featured-hero-slides"),
    getPublic("/courses/public/featured-tracks"),
  ]);

  // Only seed what actually loaded — a missing key just falls back to the
  // normal client fetch.
  const fallback: Record<string, unknown> = {};
  if (courses) fallback["/api/courses/public/featured-courses"] = courses;
  if (slides) fallback["/api/courses/public/featured-hero-slides"] = slides;
  if (tracks) fallback["/api/courses/public/featured-tracks"] = tracks;

  return (
    <HomeSeed fallback={fallback}>
      <HomeClient />
    </HomeSeed>
  );
}
