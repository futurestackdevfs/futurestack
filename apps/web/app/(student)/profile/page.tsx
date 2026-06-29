'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/auth/hooks/use-auth';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-5">
        <div className="size-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-2xl font-bold text-white shrink-0 shadow-md">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">{user.name}</h1>
          <p className="text-xs text-[var(--muted)] capitalize">{user.role}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text)]">Profile Information</h2>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="text-xs font-medium text-[var(--muted)] block mb-1.5">Full Name</label>
            <div className="text-sm text-[var(--text)] font-medium">{user.name}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--muted)] block mb-1.5">Email Address</label>
            <div className="flex items-center gap-2.5">
              <input
                type="email"
                value={user.email}
                readOnly
                className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] cursor-not-allowed opacity-70 outline-none"
              />
              <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${
                user.emailVerified
                  ? 'bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400'
                  : 'bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${user.emailVerified ? 'bg-green-500' : 'bg-amber-500'}`} />
                {user.emailVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text)]">Password</h2>
        </div>
        <div className="p-6">
          <Link
            href="/auth/forgot-password"
            className="inline-flex items-center gap-2 py-3 px-5 font-semibold text-xs rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Reset Password
          </Link>
        </div>
      </div>
    </div>
  );
}
