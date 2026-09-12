'use client';

import { useState, useEffect } from "react";
import { useAuth } from "@/app/auth/hooks/use-auth";
import { StudentLoginForm } from "@/app/auth/components/student-login-form";
import { QuickActions } from "./quick-actions";
import { ResumeLearning } from "./resume-learning";
import { Achievements } from "./achievements";
import { CareerGuidanceCard } from "./career-guidance";
import Link from "next/link";

export function HomeSidebar({ className }: { className?: string }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  // `useAuth`'s state is a module-level singleton that persists for the whole
  // SPA session. SSR always renders assuming auth hasn't resolved yet, but if
  // the client's auth already resolved on an earlier page, a fresh mount of
  // this component reads the already-resolved value on its very first render
  // and disagrees with the SSR HTML (skeleton vs. real login form/greeting).
  // `mounted` forces the first client render to match the SSR-safe "still
  // resolving" assumption — same pattern as marketing-top-nav.tsx.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const authLoading = !mounted || isLoading;

  return (
    <aside className={`flex flex-col gap-5.5 border-l border-[var(--border)] bg-[var(--surface)] px-2.5 py-3 w-[295px] shrink-0 max-lg:border-l-0 max-lg:border-t max-lg:w-full ${className || ""}`}>
      {authLoading ? (
        /* Skeleton while auth resolves */
        <div className="w-full max-w-[280px] rounded-[20px] border-2 border-[var(--border)] p-4 animate-pulse">
          <div className="h-4 w-32 rounded bg-[var(--border)] mb-2" />
          <div className="h-3 w-48 rounded bg-[var(--border)] mb-4" />
          <div className="h-8 w-full rounded-xl bg-[var(--border)]" />
        </div>
      ) : isAuthenticated && user ? (
        /* Logged-in: user greeting + resume learning */
        <div className="flex flex-col gap-1.5">
          <div
            className="relative w-full max-w-[280px] overflow-hidden rounded-[20px] border-2 p-4"
            style={{
              background: 'linear-gradient(135deg, var(--surface), var(--bg))',
              borderColor: 'rgba(37,99,235,0.18)',
              boxShadow: '0 0 0 1px rgba(37,99,235,0.08), 0 12px 30px rgba(37,99,235,0.12)',
            }}
          >
            {/* Decorative blobs */}
            <div className="absolute -right-[60px] -top-[60px] h-[140px] w-[140px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(rgba(37,99,235,0.18), transparent 70%)' }} />
            <div className="absolute -bottom-[50px] -left-[50px] h-[120px] w-[120px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(rgba(255,106,0,0.18), transparent 70%)' }} />

            <div className="relative z-10 flex items-center gap-3 mb-3">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="size-10 rounded-full object-cover shrink-0 ring-2 ring-[rgba(37,99,235,0.2)]" />
              ) : (
                <div className="size-10 rounded-full bg-[linear-gradient(135deg,var(--blue)_0%,var(--orange)_100%)] flex items-center justify-center text-[15px] font-bold text-white shrink-0 ring-2 ring-[rgba(37,99,235,0.2)]">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-bold text-[13px] text-[var(--text)] truncate">
                  Welcome back, {user.name.split(' ')[0]}! 👋
                </div>
                <div className="text-[10px] text-[var(--muted)] truncate">{user.email}</div>
              </div>
            </div>

            <Link
              href="/my-dashboard"
              className="relative z-10 flex items-center justify-center gap-2 h-[34px] rounded-xl bg-[linear-gradient(135deg,#ff6b00,#2563eb)] text-white text-[12px] font-semibold no-underline shadow-[0_4px_12px_rgba(37,99,235,0.18)] hover:opacity-90 transition-opacity"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
              </svg>
              Go to My Dashboard
            </Link>
          </div>

          <ResumeLearning />
        </div>
      ) : (
        /* Guest: show login form */
        <StudentLoginForm />
      )}

      <CareerGuidanceCard />
      <QuickActions />
      <Achievements />
    </aside>
  );
}