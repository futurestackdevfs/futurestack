import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const BACKEND = process.env.API_URL ?? "http://localhost:3002";

// Built per request but the data behind it is cached for an hour (see getJson),
// so the backend is hit about once an hour — and a failed fetch is never cached,
// so a cold backend can't leave a half-empty sitemap stuck for long.
export const dynamic = "force-dynamic";

const STATIC_PATHS = [
  "/",
  "/courses",
  "/live-projects",
  "/roadmaps",
  "/articles",
  "/certificates",
  "/about",
  "/careers",
  "/faq",
  "/support",
  "/research-and-development",
  "/practice-hub",
];

async function getJson<T>(path: string): Promise<T | undefined> {
  try {
    const res = await fetch(`${BACKEND}${path}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return undefined;
    return (await res.json()) as T;
  } catch {
    return undefined;
  }
}

interface CardsPage {
  data?: { slug?: string; comingSoon?: boolean }[];
  total?: number;
}

/** Every public course, page by page (the API caps a page at 60). */
async function courseSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  const perPage = 60;
  for (let page = 1; page <= 50; page++) {
    const body = await getJson<CardsPage>(`/courses/public/cards?page=${page}&perPage=${perPage}`);
    const rows = body?.data ?? [];
    for (const c of rows) {
      // "Coming soon" (draft) courses only show a title — too thin to index.
      if (c.slug && !c.comingSoon) slugs.push(c.slug);
    }
    if (rows.length < perPage || slugs.length >= (body?.total ?? Infinity)) break;
  }
  return slugs;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Live-project detail pages are not listed yet: nothing in the site links to them and
  // they render client-side only, so they would index as empty pages.
  const [courses, roadmaps, articles] = await Promise.all([
    courseSlugs(),
    getJson<{ slug?: string }[]>("/courses/public/roadmaps"),
    getJson<{ data?: { slug: string; publishedAt?: string | null; createdAt?: string }[] } | { slug: string; publishedAt?: string | null; createdAt?: string }[]>(
      "/articles?limit=100",
    ),
  ]);

  const url = (p: string) => (p === "/" ? SITE_URL : `${SITE_URL}${p}`);
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({ url: url(p) }));

  for (const slug of courses) entries.push({ url: url(`/courses/${slug}`) });

  for (const r of Array.isArray(roadmaps) ? roadmaps : []) {
    if (r.slug) entries.push({ url: url(`/roadmaps/${r.slug}`) });
  }

  const articleRows = Array.isArray(articles) ? articles : articles?.data ?? [];
  for (const a of articleRows) {
    const when = a.publishedAt ?? a.createdAt;
    entries.push({ url: url(`/articles/${a.slug}`), ...(when ? { lastModified: new Date(when) } : {}) });
  }

  return entries;
}
