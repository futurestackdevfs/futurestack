'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { saveToken, saveStaffToken } from '@/app/auth/lib/token-store';
import { emit } from '@/app/auth/hooks/use-auth';

function decodeJwt(token: string) {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function SessionExpiredModal() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(10);

  const dismiss = useCallback(() => {
    setVisible(false);
    setCountdown(10);
    try { sessionStorage.removeItem('fs_last_role'); } catch {}
  }, []);

  const signIn = useCallback(async () => {
    try {
      const lastRole = sessionStorage.getItem('fs_last_role') ?? 'STUDENT';
      const refreshRes = await fetch(`/api/auth/refresh?role=${lastRole}`, { method: 'POST' });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        if (data.accessToken) {
          const payload = decodeJwt(data.accessToken);
          const uid = payload?.sub;
          const role = payload?.role;
          if (uid) {
            if (role && role !== 'STUDENT') {
              await saveStaffToken(uid, data.accessToken);
            } else {
              await saveToken(uid, data.accessToken);
            }
            await fetch(
              role && role !== 'STUDENT' ? '/api/auth/set-token-staff' : '/api/auth/set-token',
              {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ token: data.accessToken }),
              },
            );
            emit({
              user: { id: uid, name: payload.name, email: payload.email, role: payload.role, avatarUrl: payload.avatarUrl, emailVerified: payload.emailVerified },
              isAuthenticated: true,
              isLoading: false,
            });
            dismiss();
            return;
          }
        }
      }
    } catch {
      // Silent refresh failed — fall through to redirect
    }
    dismiss();
    router.push('/');
  }, [dismiss, router]);

  // Listen for the session-expired event (role carried so staff sessions
  // refresh with the right cookie and don't fail their redirect).
  useEffect(() => {
    const handler = (e: Event) => {
      const role = (e as CustomEvent<{ role?: string }>)?.detail?.role;
      if (role) {
        try { sessionStorage.setItem('fs_last_role', role); } catch {}
      }
      setVisible(true);
      setCountdown(10);
    };
    window.addEventListener('fs:session-expired', handler);
    return () => window.removeEventListener('fs:session-expired', handler);
  }, []);

  // Countdown timer — auto-redirect when it hits 0
  useEffect(() => {
    if (!visible) return;
    if (countdown <= 0) {
      signIn();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [visible, countdown, signIn]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden animate-[fadeUp_.25s_ease_both]">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />

        <div className="p-6 flex flex-col items-center text-center gap-4">
          {/* Icon */}
          <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-amber-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          {/* Text */}
          <div className="space-y-1.5">
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">
              Session Expired
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Your session has timed out for security. Please sign in again to continue where you left off.
            </p>
          </div>

          {/* Countdown ring */}
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
              <circle
                cx="24" cy="24" r="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-gray-100 dark:text-gray-800"
              />
              <circle
                cx="24" cy="24" r="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeDashoffset={`${2 * Math.PI * 20 * (1 - countdown / 10)}`}
                className="text-amber-500 transition-all duration-1000 ease-linear"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-gray-300">
              {countdown}
            </span>
          </div>

          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            Redirecting to sign in in {countdown}s…
          </p>

          {/* Actions */}
          <div className="flex gap-2.5 w-full mt-1">
            <button
              onClick={dismiss}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              style={{ background: "var(--btn-bg, transparent)", color: "var(--btn-text, #9ca3af)", borderColor: "var(--btn-bg, rgb(55 65 81))" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--btn-bg-hover, rgb(31 41 55))"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--btn-bg, transparent)"; }}
            >
              Dismiss
            </button>
            <button
              onClick={signIn}
              className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-90 transition-opacity cursor-pointer"
              style={{ background: "var(--btn-bg, linear-gradient(to right, #f97316, #2563eb))", color: "var(--btn-text, #fff)" }}
            >
              Sign In Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
