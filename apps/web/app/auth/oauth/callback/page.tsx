'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '../../lib/auth-api';
import { saveToken } from '../../lib/token-store';

function decodeId(token: string) {
  return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub as string;
}
import { showToast } from '@/lib/toast';
import { emit } from '../../hooks/use-auth';

/**
 * Pulls `#token=…` out of the URL fragment and immediately wipes it from the
 * address bar / history so the JWT never lingers where a screenshot, a shared
 * link, or `window.location` logging could pick it up. A fragment (unlike a
 * query string) is never sent to the server or leaked via Referer.
 */
function takeTokenFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return null;
  const token = new URLSearchParams(raw).get('token');
  if (token) {
    // Scrub the fragment without adding a history entry.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  return token;
}

function OAuthHandler() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = takeTokenFromHash();
    if (!token) {
      setError('No token received from OAuth provider.');
      return;
    }

    authApi
      .me(token)
      .then(async (user) => {
        await saveToken(decodeId(token), token);
        // Set HttpOnly session cookie so the BFF proxy can forward it
        await fetch('/api/auth/set-token', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        emit({ user, isAuthenticated: true, isLoading: false });
        showToast('Signed in with Google!');
        router.replace('/my-dashboard');
      })
      .catch(() => {
        setError('Authentication failed. Please try again.');
      });
  }, [router]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-red-500">{error}</p>
        <Link href="/" className="text-xs text-primary font-semibold hover:underline">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-muted-foreground">Signing you in…</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <Suspense fallback={<div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />}>
        <OAuthHandler />
      </Suspense>
    </div>
  );
}
