'use client';
import { useState, useEffect, useCallback } from 'react';
import { authApi, type User } from '../lib/auth-api';
import { saveToken, loadToken, clearToken, loadStaffToken, saveStaffToken, clearStaffToken } from '../lib/token-store';
import { showToast } from '@/lib/toast';
import { refreshSession } from '../lib/refresh-session';
import { decodeClaims } from '../lib/token-claims';

// Read the user's claims client-side — avoids a network round-trip on every page load.
// `token` is either a real JWT (right after login/refresh) or the session marker from the
// token store (claims kept in localStorage). The backend re-verifies the real JWT on every call.
function decodeJwt(token: string): User {
  const payload = decodeClaims(token);
  if (!payload) throw new Error('No session claims');
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
let shared: AuthState = { user: null, isAuthenticated: false, isLoading: true };

export function emit(next: AuthState) {
  shared = next;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<AuthState>(AUTH_EVENT, { detail: next }));
  }
}

let bootstrapped = false;

// Sets the HttpOnly cookie the BFF proxy resolves session markers against.
async function setSessionCookie(token: string, type: 'student' | 'staff' = 'student') {
  await fetch(type === 'staff' ? '/api/auth/set-token-staff' : '/api/auth/set-token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}

async function clearSessionCookie(type: 'student' | 'staff' = 'student') {
  await fetch(type === 'staff' ? '/api/auth/set-token-staff' : '/api/auth/set-token', { method: 'DELETE' });
}

async function bootstrap() {
  try {
    const isOps = typeof window !== 'undefined' && window.location.pathname.startsWith('/ops');
    let token: string | null = null;

    if (isOps) {
      token = await loadStaffToken();
    } else {
      token = await loadToken();
      // No staff fallback — staff tokens are only valid on /ops/* paths.
    }

    if (!token) {
      emit({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    const user = decodeJwt(token);
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

    // Try a silent refresh FIRST — this event also fires for a transient 401
    // that a background refresh can recover from. Logging out unconditionally
    // here races the SessionExpiredModal's own silent-refresh attempt and
    // always wins, flipping isAuthenticated:false and triggering every
    // page-level `!isAuthenticated -> router.push('/')` guard before the
    // modal's recovery path ever gets a chance — i.e. an instant, avoidable
    // logout on what may have been a recoverable expiry.
    // `refreshSession` is single-flight per role, so this shares the same
    // in-flight request as the modal's attempt instead of duplicating it.
    try {
      const refreshed = await refreshSession(role);
      if (refreshed?.accessToken) {
        const payload = JSON.parse(
          atob(refreshed.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
        );
        emit({
          user: {
            id: payload.sub,
            name: payload.name,
            email: payload.email,
            role: payload.role,
            avatarUrl: payload.avatarUrl,
            emailVerified: payload.emailVerified,
          },
          isAuthenticated: true,
          isLoading: false,
        });
        try { sessionStorage.removeItem('fs_last_role'); } catch {}
        return;
      }
    } catch {
      // fall through to hard logout below
    }

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
    const isOps = window.location.pathname.startsWith('/ops');
    try {
      await authApi.logout();
    } catch {
      // Backend logout is best-effort — always clear local state
    }
    // Only clear the token for the current portal — never touch the other
    if (isOps) {
      // Logging out from ops portal → clear staff token only
      try { await clearStaffToken(); } catch {}
      try { await clearSessionCookie('staff'); } catch {}
      try { localStorage.removeItem('fs_token_staff'); } catch {}
      try { localStorage.removeItem('fs_staff_uid'); } catch {}
    } else {
      // Logging out from student portal → clear student token only
      try { await clearToken(); } catch {}
      try { await clearSessionCookie(); } catch {}
      try { localStorage.removeItem('fs_token'); } catch {}
      try { localStorage.removeItem('fs_uid'); } catch {}
      try { localStorage.removeItem('fs-admin-id'); } catch {}
      try { localStorage.removeItem('fs_billing'); } catch {}
    }
    bootstrapped = false;
    emit({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  const loginWithGoogle = useCallback(() => {
    authApi.loginWithGoogle();
  }, []);

  return { ...state, login, register, logout, loginWithGoogle };
}
