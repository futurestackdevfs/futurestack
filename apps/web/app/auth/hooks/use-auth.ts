'use client';
import { useState, useEffect, useCallback } from 'react';
import { authApi, type User } from '../lib/auth-api';
import { saveToken, loadToken, clearToken, loadStaffToken, saveStaffToken, clearStaffToken } from '../lib/token-store';
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
async function setSessionCookie(token: string, type: 'student' | 'staff' = 'student') {
  await fetch(type === 'staff' ? '/api/auth/set-token-staff' : '/api/auth/set-token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  sessionStorage.setItem(COOKIE_SYNCED, '1');
}

async function clearSessionCookie(type: 'student' | 'staff' = 'student') {
  await fetch(type === 'staff' ? '/api/auth/set-token-staff' : '/api/auth/set-token', { method: 'DELETE' });
  sessionStorage.removeItem(COOKIE_SYNCED);
}

async function bootstrap() {
  try {
    const isOps = typeof window !== 'undefined' && window.location.pathname.startsWith('/ops');
    let token: string | null = null;
    let tokenType: 'student' | 'staff' = 'student';

    if (isOps) {
      token = await loadStaffToken();
      tokenType = 'staff';
    } else {
      token = await loadToken();
      if (!token) {
        // A logged-in staff member visiting the main site is still
        // authenticated — fall back to the staff token so the student
        // sign-in popup doesn't nag them on every page load.
        token = await loadStaffToken();
        if (token) tokenType = 'staff';
      }
    }

    if (!token) {
      emit({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    const user = decodeJwt(token);
    if (!sessionStorage.getItem(COOKIE_SYNCED)) {
      await setSessionCookie(token, tokenType);
    }
    emit({ user, isAuthenticated: true, isLoading: false });
  } catch (err) {
    try { await clearToken(); } catch {}
    try { await clearSessionCookie('student'); } catch {}
    try { await clearStaffToken(); } catch {}
    try { await clearSessionCookie('staff'); } catch {}
    emit({ user: null, isAuthenticated: false, isLoading: false });
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('fs:session-expired', async (ev: Event) => {
    if (!shared.isAuthenticated) return;
    // Role resolves from the event (staff/admin) so the modal can refresh with
    // the right cookie even when it didn't go through useAuth (e.g. admin panel).
    const evRole = (ev as CustomEvent<{ role?: string }>)?.detail?.role;
    const role = evRole || shared.user?.role || 'STUDENT';
    // Save the last known role before clearing so session-expired-modal can try silent refresh with the right cookie
    try { sessionStorage.setItem('fs_last_role', role); } catch {}
    try { await clearToken(); } catch {}
    try { await clearSessionCookie('student'); } catch {}
    try { await clearStaffToken(); } catch {}
    try { await clearSessionCookie('staff'); } catch {}
    bootstrapped = false;
    emit({ user: null, isAuthenticated: false, isLoading: false });
    showToast('Session expired. Tap to sign in again.');
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
    const uid = decodeJwt(accessToken).id!;
    await saveToken(uid, accessToken);
    await setSessionCookie(accessToken);
    emit({ user: { ...user, id: uid }, isAuthenticated: true, isLoading: false });
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { accessToken, user } = await authApi.register(name, email, password);
    const uid = decodeJwt(accessToken).id!;
    await saveToken(uid, accessToken);
    await setSessionCookie(accessToken);
    emit({ user: { ...user, id: uid }, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Backend logout is best-effort — always clear local state
    }
    const isOps = window.location.pathname.startsWith('/ops');
    if (isOps) {
      await clearStaffToken();
      await clearSessionCookie('staff');
    } else {
      await clearToken();
      await clearSessionCookie();
    }
    bootstrapped = false;
    emit({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  const loginWithGoogle = useCallback(() => {
    authApi.loginWithGoogle();
  }, []);

  return { ...state, login, register, logout, loginWithGoogle };
}
