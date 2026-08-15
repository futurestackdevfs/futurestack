'use client';

import { useEffect } from 'react';
import { SWRConfig } from 'swr';
import { fetcher } from './lib/fetcher';

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
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 5000,
      }}
    >
      {children}
    </SWRConfig>
  );
}
