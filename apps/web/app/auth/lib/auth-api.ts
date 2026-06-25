const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  emailVerified?: boolean;
};

export type AuthResponse = { accessToken: string; user: User };

async function hashPassword(plain: string): Promise<string> {
  const data = new TextEncoder().encode(plain);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string },
): Promise<T> {
  const { token, ...init } = options;

  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new Error(`Cannot reach the API at ${API}. Make sure the backend is running.`);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      `API returned ${res.status} (${res.statusText}) — expected JSON but got HTML. ` +
      `Check that NEXT_PUBLIC_API_URL is set correctly (currently: ${API}).`,
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
    const hashedPassword = await hashPassword(password);
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: hashedPassword }),
    });
  },

  async register(name: string, email: string, password: string) {
    const hashedPassword = await hashPassword(password);
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password: hashedPassword }),
    });
  },

  me(token: string) {
    return request<User>('/auth/me', { method: 'GET', token });
  },

  forgotPassword(email: string) {
    return request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, newPassword: string) {
    const hashedPassword = await hashPassword(newPassword);
    return request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword: hashedPassword }),
    });
  },

  loginWithGoogle() {
    window.location.href = `${API}/auth/google`;
  },
};
