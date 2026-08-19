'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '../lib/auth-api';
import { showToast } from '@/lib/toast';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const isStudent = params.get('portal') === 'student';
  const homeRoute = isStudent ? '/' : '/my-dashboard';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (v: string) => {
    if (!v) return 'Password is required';
    if (v.length < 8) return 'Password must be at least 8 characters';
    return '';
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="size-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        </div>
        <div>
          <h2 className="text-[15px] font-bold text-[var(--text)]">Invalid or missing reset token</h2>
          <p className="text-[11px] text-[var(--muted)] mt-1">This link is broken or has already been used.</p>
        </div>
        <Link href="/auth/forgot-password" className="text-[12px] font-semibold text-[var(--blue)] hover:text-[var(--orange)] transition-colors">
          ← Request a new link
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pErr = validatePassword(newPassword);
    const cErr = newPassword !== confirmPassword ? 'Passwords do not match' : '';
    setPasswordError(pErr);
    setConfirmError(cErr);
    if (pErr || cErr) return;

    setIsLoading(true);
    setApiError('');
    try {
      await authApi.resetPassword(token, newPassword);
      showToast('Password reset successfully!');
      setSuccess(true);
      setTimeout(() => router.replace(homeRoute), 2500);
    } catch (ex) {
      setApiError(ex instanceof Error ? ex.message : 'Reset failed. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="size-14 rounded-full bg-gradient-to-br from-[#2563eb] to-[#ff6b00] flex items-center justify-center shadow-[0_8px_24px_rgba(37,99,235,0.25)]">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
        </div>
        <div>
          <h2 className="text-[16px] font-bold text-[var(--text)]">Password reset successful!</h2>
          <p className="text-[12px] text-[var(--muted)] mt-1">{isStudent ? 'Redirecting you to your home…' : 'Redirecting you to your dashboard…'}</p>
        </div>
        <Link
          href={homeRoute}
          className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[12px] font-bold text-white bg-[linear-gradient(135deg,#ff6b00,#2563eb)] hover:opacity-90 hover:-translate-y-0.5 shadow-[0_8px_18px_rgba(37,99,235,0.2)] transition-all duration-300 no-underline"
        >
          {isStudent ? 'Go to Home' : 'Go to Dashboard'}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </Link>
      </div>
    );
  }

  const inputClass = (hasError: boolean) =>
    `h-11 w-full border-none outline-none px-3.5 rounded-xl bg-[var(--bg)] text-[13px] text-[var(--text)] transition duration-300 placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)] ${
      hasError ? 'border border-red-500' : 'border border-[var(--border)] focus:border-[#2563eb]'
    }`;

  return (
    <form onSubmit={handleSubmit} className="relative z-[2] flex flex-col gap-4 w-full" noValidate>
      {apiError && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 px-3.5 py-2.5 text-[11px] text-red-600 dark:text-red-400 font-medium">
          {apiError}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-[var(--text2)]">New Password</label>
        <div className="relative">
          <input
            id="newPassword"
            type={showPassword ? 'text' : 'password'}
            placeholder="Min. 8 characters"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (passwordError) setPasswordError(validatePassword(e.target.value));
              if (confirmPassword) setConfirmError(e.target.value !== confirmPassword ? 'Passwords do not match' : '');
            }}
            autoComplete="new-password"
            className={`${inputClass(!!passwordError)} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer border-none bg-transparent text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            {showPassword ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>
        {passwordError && <span className="text-[10px] text-red-500 font-semibold">{passwordError}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-[var(--text2)]">Confirm Password</label>
        <div className="relative">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setConfirmError(newPassword !== e.target.value ? 'Passwords do not match' : '');
            }}
            autoComplete="new-password"
            className={`${inputClass(!!confirmError)} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer border-none bg-transparent text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            {showConfirmPassword ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>
        {confirmError && <span className="text-[10px] text-red-500 font-semibold">{confirmError}</span>}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="h-12 border-none rounded-xl bg-[linear-gradient(135deg,#ff6b00,#2563eb)] text-white text-[13px] font-bold cursor-pointer shadow-[0_8px_18px_rgba(37,99,235,0.18)] transition duration-300 hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Resetting…
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            Reset Password
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </span>
        )}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center px-4 py-8 sm:px-6">
      <div className="relative w-full max-w-[400px] overflow-hidden rounded-[22px] border-2 p-6 sm:p-8"
        style={{
          background: 'linear-gradient(135deg, var(--surface), var(--bg))',
          borderColor: 'rgba(37,99,235,0.18)',
          boxShadow: '0 0 0 1px rgba(37,99,235,0.08), 0 20px 50px rgba(37,99,235,0.12)',
        }}
      >
        {/* Decorative blobs */}
        <div className="absolute -right-[60px] -top-[60px] h-[160px] w-[160px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(rgba(37,99,235,0.18), transparent 70%)' }} />
        <div className="absolute -bottom-[50px] -left-[50px] h-[140px] w-[140px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(rgba(255,106,0,0.16), transparent 70%)' }} />

        <div className="relative z-10 flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <Link href="/" className="mb-1 block">
              <img src="/images/logo.png" alt="FutureStack" className="h-9 mx-auto" />
            </Link>
            <Link href="/" className="text-[10px] text-[var(--muted)] hover:text-[var(--text)] transition-colors">
              ← Back to home
            </Link>

            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="size-12 rounded-2xl bg-[linear-gradient(135deg,#2563eb,#ff6b00)] flex items-center justify-center shadow-[0_8px_20px_rgba(37,99,235,0.25)]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-[var(--text)]">Reset your password</h1>
              <p className="text-[12px] text-[var(--muted)]">Enter a new password for your account.</p>
            </div>
          </div>

          <Suspense fallback={<div className="py-8 text-center text-[12px] text-[var(--muted)]">Loading…</div>}>
            <ResetPasswordForm />
          </Suspense>

          <p className="text-center text-[11px] text-[var(--muted)]">
            Remember your password?{' '}
            <Link href="/" className="text-[var(--blue)] font-bold hover:text-[var(--orange)] transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}