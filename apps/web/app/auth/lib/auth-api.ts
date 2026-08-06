// Calls go to /api/* (Next.js BFF proxy) — backend URL never exposed to browser
const API = '/api';
import { reportSessionExpired } from './session-events';

export type User = {
  id?: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  emailVerified?: boolean;
};

export type AuthResponse = { accessToken: string; user: User };

function decodeJwtRole(t?: string): string | undefined {
  if (!t) return undefined;
  try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role; } catch { return undefined; }
}

function isAuthenticated(): boolean {
  return typeof window !== 'undefined' && (!!localStorage.getItem('fs_uid') || !!localStorage.getItem('fs_staff_uid'));
}

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

  // On 401, try refreshing before giving up (even without explicit token — BFF proxy may have used cookie)
  if (res.status === 401 && !path.includes('/refresh') && !path.includes('/login')) {
    try {
      // Decode role from explicit token if available; otherwise default to STUDENT
      const role = decodeJwtRole(token);
      const qs = role && role !== 'STUDENT' ? `?role=${role}` : '';
      const refreshRes = await fetch(`${API}/auth/refresh${qs}`, { method: 'POST' });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const { saveToken, saveStaffToken } = await import('./token-store');
        const studentUid = localStorage.getItem('fs_uid');
        const staffUid = localStorage.getItem('fs_staff_uid');
        if (studentUid && refreshData.accessToken) {
          await saveToken(studentUid, refreshData.accessToken);
        }
        if (staffUid && refreshData.accessToken) {
          await saveStaffToken(staffUid, refreshData.accessToken);
        }
        // Update the BFF proxy cookie so subsequent calls don't use the expired JWT
        const cookieEndpoint = staffUid && !studentUid ? '/api/auth/set-token-staff' : '/api/auth/set-token';
        fetch(cookieEndpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: refreshData.accessToken }),
        }).catch(() => {});
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
    if (res.status === 401 && (token || isAuthenticated())) {
      // Authenticated request rejected — token expired or revoked
      (err as Error & { isSessionExpired: boolean }).isSessionExpired = true;
      reportSessionExpired(decodeJwtRole(token));
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

// ─── Profile API ──────────────────────────────────────────────────────────────

export type ProfileStats = {
  enrollmentCount: number;
  certificateCount: number;
  courseCount?: number;
};

export type ProfileData = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  emailVerified?: boolean;
  createdAt: string;
  bio?: string | null;
  phone?: string | null;
  dob?: string | null;
  city?: string | null;
  qualification?: string | null;
  experience?: string | null;
  careerPath?: string | null;
  skills: string[];
  stats: ProfileStats;
};

export type UpdateProfilePayload = {
  bio?: string;
  phone?: string;
  dob?: string;
  city?: string;
  qualification?: string;
  experience?: string;
  careerPath?: string;
  skills?: string[];
};

/** Returns '/student' or '/trainer' based on the logged-in user's role */
function profileBase(role: string): string {
  return role === 'TRAINER' ? '/trainer' : '/student';
}

export const userApi = {
  getProfile(role: string): Promise<ProfileData> {
    return request<ProfileData>(`${profileBase(role)}/profile`, { method: 'GET' });
  },

  updateProfile(role: string, data: UpdateProfilePayload): Promise<ProfileData> {
    return request<ProfileData>(`${profileBase(role)}/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
