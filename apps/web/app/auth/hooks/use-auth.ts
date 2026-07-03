'use client';
import { useState, useEffect, useCallback } from 'react';
import { authApi, type User } from '../lib/auth-api';
import { saveToken, loadToken, clearToken, clearStaffToken } from '../lib/token-store';
import { showToast } from '@/lib/toast';

// Decode JWT payload client-side — avoids a network round-trip on every page load.
// The backend still re-verifies the signature on every API call; this is only for reading claims.
function decodeJwt(token: string): User {
  const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  return {
    id: payload.sub as string,
    name: payload.name as string,
    email: payload.email as string,
    role: payload.role as string,
    avatarUrl: payload.avatarUrl as string | undefined,
    emailVerified: payload.emailVerified as boolean | undefined,
  };
}

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

const AUTH_EVENT = 'fs:auth';
// sessionStorage key — set once per tab session so bootstrap skips the cookie sync on F5
const COOKIE_SYNCED = 'fs_ck';

let shared: AuthState = { user: null, isAuthenticated: false, isLoading: true };

export function emit(next: AuthState) {
  shared = next;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<AuthState>(AUTH_EVENT, { detail: next }));
  }
}

let bootstrapped = false;

// Sets the HttpOnly cookie so the BFF proxy can forward it as Authorization.
// Marks COOKIE_SYNCED in sessionStorage so subsequent bootstraps in this tab skip the call.
async function setSessionCookie(token: string) {
  await fetch('/api/auth/set-token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  sessionStorage.setItem(COOKIE_SYNCED, '1');
}

async function clearSessionCookie() {
  await fetch('/api/auth/set-token', { method: 'DELETE' });
  sessionStorage.removeItem(COOKIE_SYNCED);
}

async function bootstrap() {
  try {
    const token = await loadToken();
    if (!token) {
      emit({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    const user = decodeJwt(token);
    // Skip the cookie sync if already done in this tab session (survives F5, clears on tab close)
    if (!sessionStorage.getItem(COOKIE_SYNCED)) {
      await setSessionCookie(token);
    }
    emit({ user, isAuthenticated: true, isLoading: false });
  } catch (err) {
    await clearToken();
    await clearSessionCookie();
    emit({ user: null, isAuthenticated: false, isLoading: false });
    if (err instanceof Error && (err as Error & { isSessionExpired?: boolean }).isSessionExpired) {
      showToast('Your session has expired. Please sign in again.');
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('fs:session-expired', async () => {
    if (!shared.isAuthenticated) return;
    await clearToken();
    await clearSessionCookie();
    bootstrapped = false;
    emit({ user: null, isAuthenticated: false, isLoading: false });
    showToast('Your session has expired. Please sign in again.');
  });
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(shared);

  useEffect(() => {
    const handler = (e: Event) => {
      setState((e as CustomEvent<AuthState>).detail);
    };
    window.addEventListener(AUTH_EVENT, handler);

    if (!bootstrapped) {
      bootstrapped = true;
      bootstrap();
    } else if (shared.isLoading === false) {
      setState(shared);
    }

    return () => window.removeEventListener(AUTH_EVENT, handler);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken, user } = await authApi.login(email, password);
    await clearStaffToken();
    await fetch('/api/auth/set-token-staff', { method: 'DELETE' });
    await saveToken(user.id, accessToken);
    await setSessionCookie(accessToken);
    emit({ user, isAuthenticated: true, isLoading: false });
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { accessToken, user } = await authApi.register(name, email, password);
    await clearStaffToken();
    await fetch('/api/auth/set-token-staff', { method: 'DELETE' });
    await saveToken(user.id, accessToken);
    await setSessionCookie(accessToken);
    emit({ user, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(async () => {
    await clearToken();
    await clearSessionCookie();
    bootstrapped = false;
    emit({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  const loginWithGoogle = useCallback(() => {
    authApi.loginWithGoogle();
  }, []);

  return { ...state, login, register, logout, loginWithGoogle };
}
