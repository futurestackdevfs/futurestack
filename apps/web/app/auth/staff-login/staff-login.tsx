'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/app/auth/lib/auth-api';
import { saveStaffToken } from '@/app/auth/lib/token-store';

function decodeToken(token: string) {
  return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
}

const roles = [
  { id: 'ADMIN',           icon: '🛡️', label: 'Admin',           color: '#9333ea' },
  { id: 'TRAINER',         icon: '🎓', label: 'Trainer',         color: '#2563eb' },
  { id: 'COORDINATOR',     icon: '📋', label: 'Coordinator',     color: '#16a34a' },
  { id: 'SUPPORT',         icon: '🎧', label: 'Support',         color: '#0891b2' },
  { id: 'CONTENT_MANAGER', icon: '✍️', label: 'Content Manager', color: '#f05a1a' },
  { id: 'SALES',           icon: '💼', label: 'Sales',           color: '#eab308' },
] as const;

type RoleId = (typeof roles)[number]['id'];

const roleData: Record<RoleId, { title: string; sub: string; email: string }> = {
  ADMIN:           { title: 'Welcome back, Admin',           sub: 'Sign in to manage courses, users, and platform settings.',      email: 'admin@example.com' },
  TRAINER:         { title: 'Welcome back, Trainer',         sub: 'Sign in to access your courses, grading, and student progress.', email: 'trainer@example.com' },
  COORDINATOR:     { title: 'Welcome back, Coordinator',     sub: 'Sign in to manage batches, schedules, and live sessions.',       email: 'coordinator@example.com' },
  SUPPORT:         { title: 'Welcome back, Support',         sub: 'Sign in to handle tickets, queries, and student support.',       email: 'support@example.com' },
  CONTENT_MANAGER: { title: 'Welcome back, Content Manager', sub: 'Sign in to manage course content, media, and publishing.',       email: 'content@example.com' },
  SALES:           { title: 'Welcome back, Sales',           sub: 'Sign in to manage leads, quotes, and admissions.',                  email: 'sales@example.com' },
};

const roleRedirects: Record<string, string> = {
  ADMIN:           '/ops/admin',
  TRAINER:         '/ops/trainer',
  COORDINATOR:     '/ops/coordinator',
  SUPPORT:         '/ops/support',
  CONTENT_MANAGER: '/ops/content-manager',
  SALES:           '/ops/sales',
};

export function StaffLoginForm() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleId>('ADMIN');
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    setIsDark(html.getAttribute('data-theme') === 'dark');
  }, []);

  function toggleTheme() {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    setIsDark(next === 'dark');
    try { localStorage.setItem('fs-theme', next); } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { accessToken, user } = await authApi.loginOps(email, password);
      if (selectedRole !== user.role) {
        const actualLabel = roles.find((r) => r.id === user.role)?.label ?? user.role;
        setError(`This account is a ${actualLabel}. Please select "${actualLabel}" in "I am logging in as" above to continue.`);
        return;
      }
      const uid = decodeToken(accessToken).sub;
      await saveStaffToken(uid, accessToken);
      await fetch('/api/auth/set-token-staff', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: accessToken }),
      });
      const redirectTo = new URLSearchParams(window.location.search).get('redirect');
      const path = redirectTo && redirectTo.startsWith('/ops/') ? redirectTo : roleRedirects[user.role];
      router.push(user.mustChangePassword ? '/auth/set-new-password' : path);
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const active = roleData[selectedRole];
  const activeRole = roles.find((r) => r.id === selectedRole)!;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_560px] w-full min-h-full">

      {/* ── LEFT BRAND PANEL ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0b1120] via-[#0d1a35] to-[#0a1228] flex-col text-white hidden lg:flex">
        <div className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-br from-[rgba(240,90,26,0.3)] to-transparent blur-[60px] -top-[120px] -right-[100px] pointer-events-none" />
        <div className="absolute w-[350px] h-[350px] rounded-full bg-gradient-to-br from-[rgba(59,130,246,0.25)] to-transparent blur-[60px] -bottom-[80px] -left-[80px] pointer-events-none" />
        <div className="absolute w-[250px] h-[250px] rounded-full bg-gradient-to-br from-[rgba(168,85,247,0.2)] to-transparent blur-[50px] top-1/3 left-1/4 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="flex flex-col flex-1 px-12 py-10 relative z-10">
          <div className="flex items-center gap-3 shrink-0">
            <img src="/images/logo.png" alt="FutureStack" className="h-[58px]" />
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-[480px]">
            <div className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#ff7a3c] mb-5">
              <span className="w-[7px] h-[7px] rounded-full bg-[#f05a1a] animate-pulse shadow-[0_0_0_5px_rgba(240,90,26,0.2)]" />
              Internal Access Only
            </div>

            <h1 className="font-['Inter_Tight',sans-serif] text-[42px] font-extrabold leading-[1.1] tracking-[-0.02em] mb-4">
              Run the platform<br />that runs <span className="bg-gradient-to-r from-[#ff7a3c] to-[#ffb380] bg-clip-text text-transparent">learning</span>.
            </h1>

            <p className="text-[15px] text-white/55 leading-[1.7] mb-10 max-w-[420px]">
              One unified portal for Admins, Trainers, Coordinators, Support and Content — manage courses, students, batches, and revenue from a single dashboard.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '🛡️', name: 'Admin',           desc: 'Full system control',       bg: 'rgba(147,51,234,.15)' },
                { icon: '🎓', name: 'Trainer',         desc: 'Courses & grading',         bg: 'rgba(37,99,235,.15)' },
                { icon: '📋', name: 'Coordinator',     desc: 'Batches & scheduling',      bg: 'rgba(22,163,74,.15)' },
                { icon: '🎧', name: 'Support',         desc: 'Tickets & student help',    bg: 'rgba(8,145,178,.15)' },
                { icon: '✍️', name: 'Content Manager', desc: 'Content & media publishing', bg: 'rgba(240,90,26,.15)' },
              ].map((r) => (
                <div key={r.name} className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm hover:bg-white/[0.07] hover:border-white/[0.14] transition-all">
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-lg shrink-0" style={{ background: r.bg }}>{r.icon}</div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-white">{r.name}</div>
                    <div className="text-[10px] text-white/40 truncate">{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-white/30 shrink-0 pt-8 border-t border-white/[0.06]">
            <span>© 2026 FutureStack Academy</span>
            <div className="flex gap-6">
              <a href="#" className="text-white/40 hover:text-white/80 transition-colors">Privacy</a>
              <a href="#" className="text-white/40 hover:text-white/80 transition-colors">Terms</a>
              <a href="#" className="text-white/40 hover:text-white/80 transition-colors">Support</a>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT LOGIN FORM ── */}
      <div className="bg-[var(--surface)] flex flex-col">
        <div className="flex-1 flex flex-col justify-center px-5 sm:px-8 lg:px-12 py-6 sm:py-8 lg:py-10">
          <div className="max-w-[400px] w-full mx-auto animate-[fadeUp_0.4s_ease_both]">
            <div className="flex items-center gap-3 mb-5 lg:hidden">
              <img src="/images/logo.png" alt="FutureStack" className="h-[42px]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--orange)]">Staff Portal</span>
            </div>
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--orange)] mb-3 hidden lg:block">Staff Portal</div>
            <h2 className="font-['Inter_Tight',sans-serif] text-[22px] sm:text-[26px] font-extrabold text-[var(--text)] mb-1.5 tracking-[-0.01em]">{active.title}</h2>
            <p className="text-[13px] text-[var(--muted)] mb-5 leading-[1.6]">{active.sub}</p>

            <div className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-[0.06em] mb-3">I am logging in as</div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-5">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRole(r.id)}
                  className={`flex flex-col items-center gap-1.5 px-1 sm:px-2 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedRole === r.id
                      ? 'border-[var(--rc)] bg-[var(--rc-pale)]'
                      : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border2)]'
                  }`}
                  style={{ '--rc': r.color, '--rc-pale': `${r.color}14` } as React.CSSProperties}
                >
                  <span className="text-lg sm:text-xl">{r.icon}</span>
                  <span className="text-[8px] sm:text-[9px] font-bold text-center leading-tight" style={{ color: selectedRole === r.id ? r.color : 'var(--text2)' }}>{r.label}</span>
                </button>
              ))}
            </div>

            <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-[var(--text2)]">Work Email</label>
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={active.email}
                    className="h-12 w-full rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--bg)] pl-10 pr-4 text-[13px] text-[var(--text)] outline-none transition-all placeholder:text-[var(--muted)] focus:border-[var(--blue)] focus:shadow-[0_0_0_3px_var(--blue-dim)] focus:bg-[var(--surface)]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-[var(--text2)]">Password</label>
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-12 w-full rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--bg)] pl-10 pr-10 text-[13px] text-[var(--text)] outline-none transition-all placeholder:text-[var(--muted)] focus:border-[var(--blue)] focus:shadow-[0_0_0_3px_var(--blue-dim)] focus:bg-[var(--surface)]"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text2)] p-1 cursor-pointer bg-transparent border-none flex">
                    {showPw ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a18.5 18.5 0 015.06-5.94M9.9 4.24A10.94 10.94 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-[12px]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                <label className="flex items-center gap-2 text-[12px] text-[var(--text2)] cursor-pointer">
                  <input type="checkbox" className="w-[15px] h-[15px] accent-[var(--orange)] cursor-pointer rounded" />
                  Keep me signed in
                </label>
                <a href="#" className="text-[12px] text-[var(--blue)] font-semibold hover:underline">Forgot password?</a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="h-[48px] rounded-xl border-none text-white text-[14px] font-bold flex items-center justify-center gap-2 shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer mt-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
                style={{ background: `linear-gradient(135deg, ${activeRole.color}, ${activeRole.color}cc)` }}
              >
                {isLoading ? (
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                ) : (
                  <>
                    Sign In to Dashboard
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  </>
                )}
              </button>

              <div className="flex items-start gap-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3.5 mt-1 text-[11px] text-[var(--muted)] leading-[1.5]">
                <svg className="shrink-0 mt-0.5 text-[var(--orange)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                <span>This portal is restricted to authorized FutureStack staff. All login attempts are monitored and logged for security purposes.</span>
              </div>
            </form>

            <div className="flex items-center justify-center gap-1.5 mt-6 text-[12px] text-[var(--muted)]">
              Not a staff member?{' '}
              <Link href="/" className="text-[var(--blue)] font-semibold hover:underline">Go to Student Login →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
