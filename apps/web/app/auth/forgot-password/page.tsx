'use client';
import * as React from 'react';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { authApi } from '../lib/auth-api';
import { showToast } from '@/lib/toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [emailError, setEmailError] = React.useState('');
  const [apiError, setApiError] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const validateEmail = (value: string) => {
    if (!value) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;

    setIsLoading(true);
    setApiError('');
    try {
      await authApi.forgotPassword(email);
      showToast('Reset link sent! Check your inbox.');
      setSuccess(true);
    } catch (ex) {
      setApiError(ex instanceof Error ? ex.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl bg-white dark:bg-gray-900 p-8 sm:p-10 m-3 md:m-4">
      <div className="flex flex-col items-center text-center space-y-6">
        <Link href="/">
          <img src="/images/logo.png" alt="" className="h-9" />
        </Link>
        <Link href="/" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          ← Back to home
        </Link>

        <div className="space-y-1.5">
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Forgot password?
          </h1>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Enter your email and we&apos;ll send a reset link if an account exists.
          </p>
        </div>

        {success ? (
          <div className="w-full space-y-4">
            <div className="p-4 text-xs text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400 rounded-xl border border-green-200 dark:border-green-900/50 font-medium flex items-start gap-3 text-left">
              <svg className="w-4 h-4 mt-0.5 shrink-0 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Check your inbox — a password reset link has been sent (valid for 1 hour).</span>
            </div>
            <Link href="/" className="block w-full py-3.5 font-semibold text-xs rounded-xl text-center bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200">
              Continue to Dashboard
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            {apiError && (
              <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900/50 text-center font-medium">
                {apiError}
              </div>
            )}

            <div className="space-y-1.5 text-left">
              <Label htmlFor="email" className="text-xs font-semibold">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(validateEmail(e.target.value));
                }}
                onBlur={(e) => { if (e.target.value) setEmailError(validateEmail(e.target.value)); }}
                autoComplete="email"
                error={!!emailError}
                className="rounded-xl border-gray-200 dark:border-gray-800 text-xs"
              />
              {emailError && <p className="text-[10px] text-red-500 font-semibold">{emailError}</p>}
            </div>

            <Button type="submit" disabled={isLoading} className="w-full py-4 font-semibold text-xs rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending…
                </span>
              ) : (
                'Send reset link'
              )}
            </Button>

            <p className="text-xs text-muted-foreground">
              Remember your password?{' '}
              <Link href="/" className="text-primary font-bold hover:underline">Sign in</Link>
            </p>
          </form>
        )}

        <p className="text-xs text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/" className="text-primary font-bold hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
