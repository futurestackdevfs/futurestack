'use client';

import { useEffect } from 'react';
import { SWRConfig } from 'swr';
import { fetcher } from './lib/fetcher';
import { installFetchAutoRefresh } from './auth/lib/fetch-auto-refresh';

// Module scope on purpose: child effects (which fire the first API calls) run
// before this component's own effects, so the wrapper must exist before render.
installFetchAutoRefresh();

function isChunkLoadError(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === 'object' &&
      'name' in err &&
      (err as { name?: string }).name === 'ChunkLoadError',
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // After a dev-server crash / HMR hiccup, chunk files can 404 and the app is
    // left in a dead state. Reload once (guarded by sessionStorage) to let the
    // freshly restarted server serve valid chunks again.
    const RELOAD_KEY = 'fs_chunk_reload_done';
    let handling = false;

    function handleError(event: ErrorEvent) {
      if (handling) return;
      if (sessionStorage.getItem(RELOAD_KEY)) return;
      if (!isChunkLoadError(event.error)) return;
      handling = true;
      sessionStorage.setItem(RELOAD_KEY, '1');
      window.location.reload();
    }

    function handleRejection(event: PromiseRejectionEvent) {
      if (handling) return;
      if (sessionStorage.getItem(RELOAD_KEY)) return;
      if (!isChunkLoadError(event.reason)) return;
      handling = true;
      sessionStorage.setItem(RELOAD_KEY, '1');
      window.location.reload();
    }

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false, // Prevent aggressive refetching when switching tabs
        revalidateOnReconnect: true,
        dedupingInterval: 60000, // Cache requests for 60 seconds to avoid over-fetching
        keepPreviousData: true, // Keep old data visible while fetching new data
        // After a "Session expired" failure the refresh usually lands moments
        // later, so retry quickly (instead of SWR's slow backoff) and a few times.
        onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
          if (retryCount >= 4) return;
          const expired = error instanceof Error && error.message === 'Session expired';
          const delay = expired ? 1000 * (retryCount + 1) : 5000 * 2 ** retryCount;
          setTimeout(() => revalidate({ retryCount }), delay);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
