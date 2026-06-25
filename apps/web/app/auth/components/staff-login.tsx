'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const roles = [
  { id: 'admin', icon: '🛡️', label: 'Admin', color: '#9333ea' },
  { id: 'teacher', icon: '🎓', label: 'Teacher', color: '#2563eb' },
  { id: 'coordinator', icon: '📋', label: 'Coordinator', color: '#16a34a' },
  { id: 'sales', icon: '💰', label: 'Sales', color: '#f05a1a' },
] as const;

type RoleId = (typeof roles)[number]['id'];

const roleData: Record<RoleId, { title: string; sub: string; email: string }> = {
  admin:       { title: 'Welcome back, Admin',       sub: 'Sign in to manage courses, users, and platform settings.', email: 'you@futurestack.com' },
  teacher:     { title: 'Welcome back, Educator',     sub: 'Sign in to access your courses, grading, and student progress.', email: 'teacher@futurestack.com' },
  coordinator: { title: 'Welcome back, Coordinator',  sub: 'Sign in to manage batches, schedules, and live sessions.', email: 'coordinator@futurestack.com' },
  sales:       { title: 'Welcome back, Sales',        sub: 'Sign in to access leads, enrollments, and revenue dashboards.', email: 'sales@futurestack.com' },
};

export function StaffLoginForm() {
  const [isDark, setIsDark] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleId>('admin');
  const [showPw, setShowPw] = useState(false);

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

  const active = roleData[selectedRole];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] w-full min-h-screen">

      {/* ── LEFT BRAND PANEL ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0b1120] via-[#0d1a35] to-[#0a1228] flex flex-col text-white">
        <div className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-br from-[rgba(240,90,26,0.3)] to-transparent blur-[60px] -top-[120px] -right-[100px] pointer-events-none" />
        <div className="absolute w-[350px] h-[350px] rounded-full bg-gradient-to-br from-[rgba(59,130,246,0.25)] to-transparent blur-[60px] -bottom-[80px] -left-[80px] pointer-events-none" />
        <div className="absolute w-[250px] h-[250px] rounded-full bg-gradient-to-br from-[rgba(168,85,247,0.2)] to-transparent blur-[50px] top-1/3 left-1/4 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="flex flex-col min-h-full px-12 py-10 relative z-10">
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
              One unified portal for Admins, Teachers, Coordinators, and Sales — manage courses, students, batches, and revenue from a single dashboard.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '🛡️', name: 'Admin', desc: 'Full system control', bg: 'rgba(147,51,234,.15)' },
                { icon: '🎓', name: 'Teacher', desc: 'Courses & grading', bg: 'rgba(37,99,235,.15)' },
                { icon: '📋', name: 'Coordinator', desc: 'Batches & scheduling', bg: 'rgba(22,163,74,.15)' },
                { icon: '💰', name: 'Sales', desc: 'Leads & enrollments', bg: 'rgba(240,90,26,.15)' },
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
        <div className="flex items-center justify-end px-10 pt-8 pb-0 shrink-0">
          <button className="relative w-[52px] h-7 bg-transparent border-none p-0 shrink-0 cursor-pointer" onClick={toggleTheme} aria-label="Toggle theme">
            <div className="w-[52px] h-7 rounded-[99px] bg-[var(--border2)] border border-[var(--border)] relative flex items-center px-1 transition-[background] duration-300 dark:bg-[#2d3a56] dark:border-[#3b4f72]">
              <div className="flex justify-between items-center w-full px-0.5 pointer-events-none">
                <span className="text-[12px] leading-none">☀️</span>
                <span className="text-[12px] leading-none">🌙</span>
              </div>
              <div className="size-5 rounded-full bg-[var(--surface)] shadow-[0_1px_4px_rgba(0,0,0,.2)] absolute left-1 transition-[transform,background] duration-300 dark:translate-x-6 dark:bg-[#3b82f6]" />
            </div>
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center px-14 lg:px-16">
          <div className="max-w-[400px] w-full mx-auto animate-[fadeUp_0.4s_ease_both]">
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--orange)] mb-3">Staff Portal</div>
            <h2 className="font-['Inter_Tight',sans-serif] text-[26px] font-extrabold text-[var(--text)] mb-1.5 tracking-[-0.01em]">{active.title}</h2>
            <p className="text-[13px] text-[var(--muted)] mb-7 leading-[1.6]">{active.sub}</p>

            <div className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-[0.06em] mb-3">I am logging in as</div>
            <div className="grid grid-cols-4 gap-2 mb-7">
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRole(r.id)}
                  className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedRole === r.id
                      ? 'border-[var(--rc)] bg-[var(--rc-pale)]'
                      : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border2)]'
                  }`}
                  style={{
                    '--rc': r.color,
                    '--rc-pale': `${r.color}14`,
                  } as React.CSSProperties}
                >
                  <span className="text-xl">{r.icon}</span>
                  <span className="text-[10px] font-bold" style={{ color: selectedRole === r.id ? r.color : 'var(--text2)' }}>{r.label}</span>
                </button>
              ))}
            </div>

            <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-[var(--text2)]">Work Email</label>
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>
                  <input type="email" placeholder={active.email} className="h-12 w-full rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--bg)] pl-10 pr-4 text-[13px] text-[var(--text)] outline-none transition-all placeholder:text-[var(--muted)] focus:border-[var(--blue)] focus:shadow-[0_0_0_3px_var(--blue-dim)] focus:bg-[var(--surface)]" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-[var(--text2)]">Password</label>
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  <input type={showPw ? 'text' : 'password'} placeholder="Enter your password" className="h-12 w-full rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--bg)] pl-10 pr-10 text-[13px] text-[var(--text)] outline-none transition-all placeholder:text-[var(--muted)] focus:border-[var(--blue)] focus:shadow-[0_0_0_3px_var(--blue-dim)] focus:bg-[var(--surface)]" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text2)] p-1 cursor-pointer bg-transparent border-none flex">
                    {showPw ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a18.5 18.5 0 015.06-5.94M9.9 4.24A10.94 10.94 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <label className="flex items-center gap-2 text-[12px] text-[var(--text2)] cursor-pointer">
                  <input type="checkbox" className="w-[15px] h-[15px] accent-[var(--orange)] cursor-pointer rounded" />
                  Keep me signed in
                </label>
                <a href="#" className="text-[12px] text-[var(--blue)] font-semibold hover:underline">Forgot password?</a>
              </div>

              <button
                type="submit"
                className="h-[48px] rounded-xl border-none text-white text-[14px] font-bold flex items-center justify-center gap-2 shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer mt-1"
                style={{ background: `linear-gradient(135deg, ${selectedRole === 'admin' ? '#9333ea' : selectedRole === 'teacher' ? '#2563eb' : selectedRole === 'coordinator' ? '#16a34a' : '#f05a1a'}, ${selectedRole === 'admin' ? '#a855f7' : selectedRole === 'teacher' ? '#3b82f6' : selectedRole === 'coordinator' ? '#22c55e' : '#ff7a3c'})` }}
              >
                Sign In to Dashboard
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </button>

              <div className="flex items-center text-center text-[11px] text-[var(--muted)] my-1 before:flex-1 before:h-px before:bg-[var(--border)] after:flex-1 after:h-px after:bg-[var(--border)]">
                <span className="px-3 whitespace-nowrap">or sign in with SSO</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button type="button" className="h-[44px] flex items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-[13px] font-semibold hover:border-[var(--border2)] hover:bg-[var(--bg)] hover:-translate-y-px transition-all cursor-pointer">
                  <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.69-2.26 1.1-3.71 1.1-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.14c-.22-.69-.35-1.43-.35-2.14s.13-1.45.35-2.14V7.02H2.18A10.97 10.97 0 001 12c0 1.77.43 3.45 1.18 4.98l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.02l3.66 2.84c.87-2.6 3.3-4.48 6.16-4.48z"/></svg>
                  Google
                </button>
                <button type="button" className="h-[44px] flex items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-[13px] font-semibold hover:border-[var(--border2)] hover:bg-[var(--bg)] hover:-translate-y-px transition-all cursor-pointer">
                  <svg width="16" height="16" viewBox="0 0 23 23"><path fill="#f25022" d="M1 1h10v10H1z"/><path fill="#00a4ef" d="M1 12h10v10H1z"/><path fill="#7fba00" d="M12 1h10v10H12z"/><path fill="#ffb900" d="M12 12h10v10H12z"/></svg>
                  Microsoft
                </button>
              </div>

              <div className="flex items-start gap-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3.5 mt-3 text-[11px] text-[var(--muted)] leading-[1.5]">
                <svg className="shrink-0 mt-0.5 text-[var(--orange)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                <span>This portal is restricted to authorized FutureStack staff. All login attempts are monitored and logged for security purposes.</span>
              </div>
            </form>

            <div className="flex items-center justify-center gap-1.5 mt-6 text-[12px] text-[var(--muted)]">
              Not a staff member?{' '}
              <Link href="/students" className="text-[var(--blue)] font-semibold hover:underline">Go to Student Login →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
