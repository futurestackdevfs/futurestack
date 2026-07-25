// Calls go to /api/* (Next.js BFF proxy) — backend URL never exposed to browser
const API = '/api';

export type User = {
  id?: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  emailVerified?: boolean;
};

export type AuthResponse = { accessToken: string; user: User };

async function request<T>(
  path: string,
  options: RequestInit & { token?: string },
): Promise<T> {
  const { token, ...init } = options;

  const doFetch = async (t?: string): Promise<Response> => {
    return fetch(`${API}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...init.headers,
      },
    });
  };

  let res: Response;
  try {
    res = await doFetch(token);
  } catch {
    throw new Error(`Cannot reach the API at ${API}. Make sure the backend is running.`);
  }

  // On 401 with a token, try refreshing before giving up
  if (res.status === 401 && token && !path.includes('/refresh') && !path.includes('/login')) {
    try {
      const refreshRes = await fetch(`${API}/auth/refresh`, { method: 'POST' });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const { loadToken, saveToken } = await import('./token-store');
        const uid = localStorage.getItem('fs_uid');
        if (uid && refreshData.accessToken) {
          await saveToken(uid, refreshData.accessToken);
        }
        // Retry original request with new token
        res = await doFetch(refreshData.accessToken);
      }
    } catch {
      // Refresh failed — fall through to error handling below
    }
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      `API returned ${res.status} (${res.statusText}) — expected JSON but got HTML. ` +
      `Check that the BFF proxy is running correctly (current API path: ${API}).`,
    );
  }

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message ?? `Request failed (${res.status})`);
    if (res.status === 401 && token) {
      // Authenticated request rejected — token expired or revoked
      (err as Error & { isSessionExpired: boolean }).isSessionExpired = true;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fs:session-expired'));
      }
    }
    throw err;
  }
  return data as T;
}

export const authApi = {
  async login(email: string, password: string) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, portal: 'student' }),
    });
  },

  async loginOps(email: string, password: string) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, portal: 'ops' }),
    });
  },

  async register(name: string, email: string, password: string) {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  me(token?: string) {
    return request<User>('/auth/me', { method: 'GET', ...(token ? { token } : {}) });
  },

  forgotPassword(email: string) {
    return request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, newPassword: string) {
    return request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },

  loginWithGoogle() {
    window.location.href = `/api/auth/google`;
  },

  async logout() {
    return request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  },

  async refreshToken(role = 'STUDENT') {
    return request<{ accessToken: string; user: User }>(`/auth/refresh?role=${role}`, {
      method: 'POST',
    });
  },
};
