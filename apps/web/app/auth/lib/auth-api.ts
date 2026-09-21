// Calls go to /api/* (Next.js BFF proxy) — backend URL never exposed to browser
const API = '/api';
import { reportSessionExpired } from './session-events';
import { refreshSession } from './refresh-session';
import { decodeClaims } from './token-claims';

export type User = {
  id?: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  emailVerified?: boolean;
  mustChangePassword?: boolean;
};

export type AuthResponse = { accessToken: string; user: User };

function decodeJwtRole(t?: string): string | undefined {
  return decodeClaims(t)?.role;
}

function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  const isOps = window.location.pathname.startsWith('/ops');
  // Only check the token for the current portal
  return isOps ? !!localStorage.getItem('fs_staff_uid') : !!localStorage.getItem('fs_uid');
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
      const refreshed = await refreshSession(decodeJwtRole(token));
      if (refreshed) {
        res = await doFetch(refreshed.accessToken);
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

  async setPassword(newPassword: string) {
    return request<{ message: string }>('/auth/set-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
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
  name?: string;
  email?: string;
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

export type OrderHistoryItem = {
  id: string;
  currency: 'INR' | 'USD';
  gatewayType: 'DOMESTIC' | 'INTERNATIONAL';
  subtotal: number;
  discountAmount: number;
  couponId: string | null;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  status: 'CREATED' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  billingFullName: string | null;
  billingEmail: string | null;
  billingPhone: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPincode: string | null;
  createdAt: string;
  items: {
    priceAtPurchase: number;
    currency: 'INR' | 'USD';
    course: { id: string; title: string; thumbnailUrl: string | null } | null;
    project?: { id: string; name: string } | null;
  }[];
};

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

  getOrders(role: string): Promise<OrderHistoryItem[]> {
    return request<OrderHistoryItem[]>(`${profileBase(role)}/orders`, { method: 'GET' });
  },
};
