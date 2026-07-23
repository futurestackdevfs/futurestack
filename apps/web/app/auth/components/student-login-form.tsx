'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/use-auth';
import { showToast } from '@/lib/toast';

type FormErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
  api?: string;
};

export function StudentLoginForm() {
  const router = useRouter();
  const { login, register, loginWithGoogle } = useAuth();

  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const triggerHighlight = useCallback(() => {
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlighted(true);
    setTimeout(() => setHighlighted(false), 2000);
  }, []);

  useEffect(() => {
    window.addEventListener('fs:highlight-login', triggerHighlight);
    if (window.location.hash === '#student-login') triggerHighlight();
    return () => window.removeEventListener('fs:highlight-login', triggerHighlight);
  }, [triggerHighlight]);

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (isSignup) {
      if (!name.trim()) errs.name = 'Full name is required';
      else if (name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    }
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address';
    if (!password) errs.password = 'Password is required';
    else if (isSignup && password.length < 8) errs.password = 'Password must be at least 8 characters';
    else if (!isSignup && password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (isSignup) {
      if (!confirmPassword) errs.confirmPassword = 'Please confirm your password';
      else if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
      if (!agreeTerms) errs.terms = 'You must agree to the terms';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});
    try {
      if (isSignup) {
        await register(name, email, password);
        showToast('Account created! Welcome to FutureStack.');
      } else {
        await login(email, password);
        showToast('Welcome back! Signed in successfully.');
      }
      router.push('/my-dashboard');
    } catch (ex) {
      setErrors({ api: ex instanceof Error ? ex.message : 'Something went wrong. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (field: keyof FormErrors) =>
    `h-9 w-full border-none outline-none px-2.5 rounded-xl bg-[var(--surface)] border text-[var(--text)] text-[12px] transition duration-300 placeholder:text-[var(--muted)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)] ${
      errors[field] ? 'border-red-500' : 'border-[var(--border)] focus:border-[#2563eb]'
    }`;

  return (
    <div
      ref={cardRef}
      id="student-login"
      className={`relative w-full max-w-[280px] mx-auto overflow-hidden rounded-[20px] border-2 p-4 transition-all duration-300 hover:-translate-y-1 ${highlighted ? 'scale-[1.03]' : ''}`}
      style={{
        background: 'linear-gradient(135deg, var(--surface), var(--bg))',
        borderColor: highlighted ? 'rgba(37,99,235,0.7)' : 'rgba(37,99,235,0.18)',
        boxShadow: highlighted
          ? '0 0 0 4px rgba(37,99,235,0.18), 0 20px 48px rgba(37,99,235,0.28)'
          : '0 0 0 1px rgba(37,99,235,0.08), 0 12px 30px rgba(37,99,235,0.12)',
      }}
      onMouseEnter={(e) => { if (!highlighted) e.currentTarget.style.boxShadow = '0 0 0 1px rgba(37,99,235,0.15), 0 18px 40px rgba(37,99,235,0.18)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 0 1px rgba(37,99,235,0.08), 0 12px 30px rgba(37,99,235,0.12)'; }}
    >
      <div className="absolute -right-15 -top-15 h-[140px] w-[140px] rounded-full" style={{ background: 'radial-gradient(rgba(37,99,235,0.18), transparent 70%)', pointerEvents: 'none' }} />
      <div className="absolute -bottom-[50px] -left-[50px] h-[120px] w-[120px] rounded-full" style={{ background: 'radial-gradient(rgba(255,106,0,0.18), transparent 70%)', pointerEvents: 'none' }} />

      <div className="relative z-10 mb-2.5">
        <h3 className="mb-0.5 text-lg text-[var(--text)]">{isSignup ? 'Student Sign Up' : 'Student Login'}</h3>
        <p className="text-[11px] text-[var(--muted)]">{isSignup ? 'Create your account & start learning' : 'Access your dashboard & courses'}</p>
      </div>

      <form className="relative z-[2] flex flex-col gap-2.5" onSubmit={handleSubmit} noValidate>
        {errors.api && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-[10px] text-red-600 font-medium">
            {errors.api}
          </div>
        )}

        {isSignup && (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-[var(--text2)]">Full Name</label>
            <input type="text" placeholder="Enter your full name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass('name')} />
            {errors.name && <span className="text-[9px] text-red-500">{errors.name}</span>}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[var(--text2)]">Email Address</label>
          <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass('email')} />
          {errors.email && <span className="text-[9px] text-red-500">{errors.email}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[var(--text2)]">Password</label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass('password')} pr-8`} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer border-none bg-transparent text-[var(--muted)] hover:text-[var(--text)]">
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
          {errors.password && <span className="text-[9px] text-red-500">{errors.password}</span>}
        </div>

        {isSignup && (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-[var(--text2)]">Confirm Password</label>
            <div className="relative">
              <input type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`${inputClass('confirmPassword')} pr-8`} />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer border-none bg-transparent text-[var(--muted)] hover:text-[var(--text)]">
                {showConfirmPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
            {errors.confirmPassword && <span className="text-[9px] text-red-500">{errors.confirmPassword}</span>}
          </div>
        )}

        {!isSignup && (
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
              <input type="checkbox" />
              Remember me
            </label>
            <a href="/auth/forgot-password" className="text-[10px] text-[var(--blue)] font-semibold">Forgot Password?</a>
          </div>
        )}

        {isSignup && (
          <div className="flex flex-col gap-1">
            <label className="flex items-start gap-1.5 text-[10px] text-[var(--muted)] leading-relaxed">
              <input type="checkbox" className="mt-0.5" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
              I agree to the <a href="#" className="text-[var(--blue)] font-semibold">Terms</a> &amp; <a href="#" className="text-[var(--blue)] font-semibold">Privacy Policy</a>
            </label>
            {errors.terms && <span className="text-[9px] text-red-500">{errors.terms}</span>}
          </div>
        )}

        <button type="submit" disabled={isLoading} className="h-[38px] border-none rounded-xl bg-[linear-gradient(135deg,#ff6b00,#2563eb)] text-white text-[13px] font-semibold cursor-pointer shadow-[0_8px_18px_rgba(37,99,235,0.18)] transition duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed">
          {isLoading ? (isSignup ? 'Creating…' : 'Signing in…') : (isSignup ? 'Sign Up' : 'Login')}
        </button>

        <div className="relative z-10 my-0.5 flex items-center text-center text-[9.5px] text-[var(--muted)] before:flex-1 before:h-px before:bg-[var(--border)] before:content-[''] after:flex-1 after:h-px after:bg-[var(--border)] after:content-['']">
          <span className="whitespace-nowrap px-2">or continue with</span>
        </div>

        <button
          type="button"
          onClick={loginWithGoogle}
          className="relative z-10 flex h-[38px] cursor-pointer items-center justify-center gap-2 rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--surface)] text-[12.5px] font-semibold text-[var(--text)] transition-all duration-200 hover:-translate-y-px hover:border-[var(--border2)] hover:bg-[var(--bg)] dark:bg-[var(--card-hover)] dark:hover:bg-[var(--surface)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.69-2.26 1.1-3.71 1.1-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.14c-.22-.69-.35-1.43-.35-2.14s.13-1.45.35-2.14V7.02H2.18A10.97 10.97 0 001 12c0 1.77.43 3.45 1.18 4.98l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.02l3.66 2.84c.87-2.6 3.3-4.48 6.16-4.48z"/>
          </svg>
          Continue with Gmail
        </button>

        <div className="text-center text-[10px] text-[var(--muted)]">
          {isSignup ? (
            <>Already have an account? <button type="button" onClick={() => { setIsSignup(false); setErrors({}); }} className="font-semibold text-[var(--blue)] cursor-pointer border-none bg-transparent p-0">Login</button></>
          ) : (
            <>Don&apos;t have an account? <button type="button" onClick={() => { setIsSignup(true); setErrors({}); }} className="font-semibold text-[var(--blue)] cursor-pointer border-none bg-transparent p-0">Sign Up</button></>
          )}
        </div>
      </form>
    </div>
  );
}
