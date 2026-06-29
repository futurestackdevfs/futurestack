'use client';
import { useState, useEffect, useCallback } from 'react';
import { authApi, type User } from '../lib/auth-api';
import { showToast } from '@/lib/toast';

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

const AUTH_EVENT = 'fs:auth';

let shared: AuthState = { user: null, isAuthenticated: false, isLoading: true };

function emit(next: AuthState) {
  shared = next;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<AuthState>(AUTH_EVENT, { detail: next }));
  }
}

let bootstrapped = false;

async function setHttpOnlyCookie(token: string) {
  await fetch('/api/auth/set-token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}

async function clearHttpOnlyCookie() {
  await fetch('/api/auth/set-token', { method: 'DELETE' });
}

async function bootstrap() {
  try {
    // No token needed — proxy reads HttpOnly cookie and forwards it to backend
    const user = await authApi.me();
    emit({ user, isAuthenticated: true, isLoading: false });
  } catch (err) {
    await clearHttpOnlyCookie();
    emit({ user: null, isAuthenticated: false, isLoading: false });
    if (err instanceof Error && (err as Error & { isSessionExpired?: boolean }).isSessionExpired) {
      showToast('Your session has expired. Please sign in again.');
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('fs:session-expired', async () => {
    if (!shared.isAuthenticated) return;
    await clearHttpOnlyCookie();
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
    await setHttpOnlyCookie(accessToken);
    emit({ user, isAuthenticated: true, isLoading: false });
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { accessToken, user } = await authApi.register(name, email, password);
    await setHttpOnlyCookie(accessToken);
    emit({ user, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(async () => {
    await clearHttpOnlyCookie();
    bootstrapped = false;
    emit({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  const loginWithGoogle = useCallback(() => {
    authApi.loginWithGoogle();
  }, []);

  return { ...state, login, register, logout, loginWithGoogle };
}
