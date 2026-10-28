'use client';

import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { authFetch } from '@/app/auth/lib/auth-fetch';
import { useAuth } from '@/app/auth/hooks/use-auth';
import { showToast } from '@/lib/toast';

export interface WishlistItem {
  courseId: string;
  title: string;
  thumbnail?: string | null;
  price: number | null;
  originalPrice?: number | null;
  offPct?: number;
  hasDiscount?: boolean;
  currency: 'INR' | 'USD';
}

export interface WishlistView {
  items: WishlistItem[];
}

export const WISHLIST_KEY = '/api/wishlist';

export async function wishlistFetcher(url: string): Promise<WishlistView> {
  const res = await authFetch(url);
  // Not logged in (401) or any other failure — treat as an empty wishlist
  // rather than a hard error.
  if (!res.ok) return { items: [] };
  return res.json();
}

/** Shared wishlist state — one SWR key, so every heart on the page stays in sync. */
export function useWishlist() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data, mutate } = useSWR<WishlistView>(
    !authLoading && isAuthenticated ? WISHLIST_KEY : null,
    wishlistFetcher,
  );
  const [busy, setBusy] = useState<string | null>(null);

  const ids = useMemo(() => new Set((data?.items ?? []).map((i) => i.courseId)), [data]);

  const toggle = useCallback(
    async (courseId: string) => {
      if (!isAuthenticated) {
        showToast('Please sign in to save courses to your wishlist');
        return;
      }
      const saved = ids.has(courseId);
      setBusy(courseId);
      try {
        const res = await authFetch(saved ? `${WISHLIST_KEY}/items/${courseId}` : `${WISHLIST_KEY}/items`, {
          method: saved ? 'DELETE' : 'POST',
          body: saved ? undefined : JSON.stringify({ courseId }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(body.message || 'Could not update your wishlist');
          return;
        }
        // Both endpoints return the refreshed wishlist view.
        await mutate(body as WishlistView, { revalidate: false });
        showToast(saved ? 'Removed from wishlist' : 'Saved to wishlist');
      } catch {
        showToast('Could not update your wishlist');
      } finally {
        setBusy(null);
      }
    },
    [ids, isAuthenticated, mutate],
  );

  return { items: data?.items ?? [], ids, toggle, busy, mutate };
}
