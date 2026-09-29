import { Logger } from '@nestjs/common';

const FALLBACK_TOPIC = 'A practical engineering topic relevant to full-stack developers today';
const HN_URL = 'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30';

export const normalizeTopic = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Picks the highest-scoring Hacker News front-page story that hasn't been
 * written about yet. `exclude` holds normalized topics already used (from our
 * own drafts/posts). Bounded by a hard timeout so a slow upstream can never
 * hang a job.
 */
export async function pickTrendingTopic(exclude: ReadonlySet<string>, log: Logger, fetchImpl: typeof fetch = fetch): Promise<string> {
  try {
    const res = await fetchImpl(HN_URL, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { hits?: { title?: unknown; points?: unknown }[] };
    const stories = (data.hits ?? [])
      .filter((h): h is { title: string; points?: unknown } => typeof h.title === 'string')
      .filter((h) => h.title.length > 15 && h.title.length <= 200)
      // eslint-disable-next-line no-control-regex
      .filter((h) => !/[\u0000-\u001f\u007f<>]/.test(h.title))
      .filter((h) => !exclude.has(normalizeTopic(h.title)))
      .sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0));
    if (stories.length) return stories[0]!.title;
    log.warn('No unused Hacker News topics available; using the generic fallback topic');
  } catch (err) {
    log.warn(`Hacker News topic fetch failed; using the generic fallback topic: ${(err as Error).message}`);
  }
  return FALLBACK_TOPIC;
}
