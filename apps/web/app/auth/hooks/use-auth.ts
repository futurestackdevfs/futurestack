'use client';
import { useState, useEffect, useCallback } from 'react';
import { authApi, type User } from '../lib/auth-api';
import { saveToken, loadToken, clearToken } from '../lib/token-store';
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

async function bootstrap() {
  try {
    const token = await loadToken();
    if (!token) {
      emit({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    const user = await authApi.me(token);
    emit({ user, isAuthenticated: true, isLoading: false });
  } catch (err) {
    await clearToken();
    emit({ user: null, isAuthenticated: false, isLoading: false });
    // Token was present but rejected — session expired between visits
    if (err instanceof Error && (err as Error & { isSessionExpired?: boolean }).isSessionExpired) {
      showToast('Your session has expired. Please sign in again.');
    }
  }
}

// Mid-session expiry: any authenticated API call returns 401 while user is logged in
if (typeof window !== 'undefined') {
  window.addEventListener('fs:session-expired', async () => {
    if (!shared.isAuthenticated) return; // bootstrap case already handled above
    await clearToken();
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
    await saveToken(user.id, accessToken);
    emit({ user, isAuthenticated: true, isLoading: false });
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { accessToken, user } = await authApi.register(name, email, password);
    await saveToken(user.id, accessToken);
    emit({ user, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(async () => {
    await clearToken();
    bootstrapped = false;
    emit({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  const loginWithGoogle = useCallback(() => {
    authApi.loginWithGoogle();
  }, []);

  return { ...state, login, register, logout, loginWithGoogle };
}
