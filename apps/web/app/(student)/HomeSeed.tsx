'use client';

import { SWRConfig } from 'swr';

// Seeds the SWR cache with data the server already fetched, so the home page's
// client components (hero, popular courses, career paths) render real content on
// first paint instead of showing skeletons while they call the API.
export function HomeSeed({
  fallback,
  children,
}: {
  fallback: Record<string, unknown>;
  children: React.ReactNode;
}) {
  return <SWRConfig value={{ fallback }}>{children}</SWRConfig>;
}
