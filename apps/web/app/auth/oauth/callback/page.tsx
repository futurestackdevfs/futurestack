'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '../../lib/auth-api';
import { saveToken } from '../../lib/token-store';
import { oauthStateMatches, takeStoredOAuthState } from '../../lib/oauth-state';

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
function takeTokenFromHash(): { token: string; refresh: string | null; state: string | null } | null {
  if (typeof window === 'undefined') return null;
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const token = params.get('token');
  const refresh = params.get('refresh');
  const state = params.get('state');
  if (token) {
    // Scrub the fragment without adding a history entry.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  return token ? { token, refresh, state } : null;
}

function OAuthHandler() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const taken = takeTokenFromHash();
    if (!taken) {
      setError('No token received from OAuth provider.');
      return;
    }
    const { token, refresh, state } = taken;

    // Login-CSRF guard: only accept tokens that belong to a sign-in THIS tab
    // started. The nonce was stored by loginWithGoogle() and travelled through
    // Google; a crafted link carrying someone else's tokens can't know it.
    // The stored nonce is single use.
    if (!oauthStateMatches(state, takeStoredOAuthState())) {
      setError('This sign-in could not be verified. Please start again from the login page.');
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
        // Store the refresh token as a frontend-domain HttpOnly cookie so
        // /api/auth/refresh can find it when this access token expires.
        if (refresh) {
          await fetch('/api/auth/set-refresh', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ refresh }),
          }).catch(() => {});
        }
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
