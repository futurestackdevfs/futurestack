'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { authApi } from '../lib/auth-api';
import { showToast } from '@/lib/toast';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      <div className="space-y-3 text-center">
        <p className="text-sm text-red-500">Invalid or missing reset token.</p>
        <Link href="/auth/forgot-password" className="text-xs text-primary font-bold hover:underline">
          Request a new link
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
      setTimeout(() => router.replace('/my-dashboard'), 2500);
    } catch (ex) {
      setApiError(ex instanceof Error ? ex.message : 'Reset failed. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-3">
        <div className="p-3 text-xs text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-900/50 font-medium">
          Password reset successfully! Redirecting to dashboard…
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {apiError && (
        <div className="p-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-md border border-red-200 dark:border-red-900/50 font-medium">
          {apiError}
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="newPassword" className="text-xs">New password</Label>
        <div className="relative">
          <Input
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
            error={!!passwordError}
            className="rounded-xl border-gray-200 dark:border-gray-800 text-xs pr-14"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {passwordError && <p className="text-[10px] text-red-500 font-semibold">{passwordError}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="confirmPassword" className="text-xs">Confirm password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Repeat your password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setConfirmError(newPassword !== e.target.value ? 'Passwords do not match' : '');
          }}
          autoComplete="new-password"
          className="rounded-xl border-gray-200 dark:border-gray-800 text-xs"
        />
        {confirmError && <p className="text-[10px] text-red-500 font-semibold">{confirmError}</p>}
      </div>

      <Button type="submit" disabled={isLoading} className="w-full py-4 font-semibold text-xs rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
        {isLoading ? 'Resetting…' : 'Reset password'}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl bg-white dark:bg-gray-900 p-8 sm:p-10 m-3 md:m-4">
      <div className="flex flex-col items-center text-center space-y-6">
        <Link href="/">
          <img src="/images/logo.png" alt="" className="h-9" />
        </Link>
        <div className="space-y-1.5">
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Reset your password
          </h1>
          <p className="text-xs text-muted-foreground">Enter a new password for your account.</p>
        </div>
        <Suspense fallback={<div className="text-xs text-muted-foreground">Loading…</div>}>
          <ResetPasswordForm />
        </Suspense>
        <p className="text-xs text-muted-foreground">
          Remember your password?{' '}
          <Link href="/" className="text-primary font-bold hover:underline">Sign in</Link>
        </p>
        <p className="text-xs text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/" className="text-primary font-bold hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
