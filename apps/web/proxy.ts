import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const OPS_ROLES = ['ADMIN', 'TRAINER', 'COORDINATOR', 'SUPPORT', 'CONTENT_MANAGER'];

const OPS_ROLE_PATHS: Record<string, string> = {
  ADMIN:           '/ops/admin',
  TRAINER:         '/ops/trainer',
  COORDINATOR:     '/ops/coordinator',
  SUPPORT:         '/ops/support',
  CONTENT_MANAGER: '/ops/content-manager',
};

function decodeJwtRole(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(decoded) as { role?: string; exp?: number };
    if (parsed.exp && parsed.exp * 1000 < Date.now()) return null;
    return parsed.role ?? null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('fs_token')?.value;
  const role = token ? decodeJwtRole(token) : null;

  // ── Student routes ──────────────────────────────────────────────────
  const isStudentRoute =
    pathname.startsWith('/my-dashboard') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/certificates');

  if (isStudentRoute) {
    if (!token || !role) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    if (OPS_ROLES.includes(role)) {
      return NextResponse.redirect(
        new URL(OPS_ROLE_PATHS[role] ?? '/auth/staff-login', request.url),
      );
    }
  }

  // ── Ops routes ───────────────────────────────────────────────────────
  if (pathname.startsWith('/ops')) {
    if (!token || !role) {
      return NextResponse.redirect(new URL('/auth/staff-login', request.url));
    }
    if (!OPS_ROLES.includes(role)) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    const allowedPath = OPS_ROLE_PATHS[role];
    if (allowedPath && !pathname.startsWith(allowedPath)) {
      return NextResponse.redirect(new URL(allowedPath, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/my-dashboard/:path*',
    '/profile/:path*',
    '/certificates/:path*',
    '/ops/:path*',
  ],
};
