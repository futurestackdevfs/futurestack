'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authApi } from '../lib/auth-api';

type State =
  | { kind: 'working' }
  | { kind: 'done'; already: boolean }
  | { kind: 'failed'; message: string };

function VerifyEmail() {
  const token = useSearchParams().get('token') ?? '';
  const [state, setState] = useState<State>(token ? { kind: 'working' } : { kind: 'failed', message: 'This link is missing its confirmation code.' });
  const [resend, setResend] = useState<{ busy: boolean; note: string }>({ busy: false, note: '' });
  // React strict mode runs effects twice in dev — one confirmation is enough.
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    authApi
      .verifyEmail(token)
      .then((r) => setState({ kind: 'done', already: r.alreadyVerified }))
      .catch((e: unknown) =>
        setState({ kind: 'failed', message: e instanceof Error ? e.message : 'This confirmation link is invalid or has expired.' }),
      );
  }, [token]);

  async function sendNewLink() {
    setResend({ busy: true, note: '' });
    try {
      const r = await authApi.resendVerification();
      setResend({ busy: false, note: r.message });
    } catch {
      setResend({ busy: false, note: 'Please sign in first, then try again.' });
    }
  }

  if (state.kind === 'working') {
    return <div className="py-8 text-center text-[13px] text-[var(--muted)]">Confirming your email…</div>;
  }

  if (state.kind === 'done') {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="size-14 rounded-full bg-gradient-to-br from-[#2563eb] to-[#ff6b00] flex items-center justify-center shadow-[0_8px_24px_rgba(37,99,235,0.25)]">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
        </div>
        <div>
          <h2 className="text-[16px] font-bold text-[var(--text)]">{state.already ? 'Email already confirmed' : 'Email confirmed!'}</h2>
          <p className="text-[12px] text-[var(--muted)] mt-1">
            {state.already ? 'Nothing more to do — you’re all set.' : 'Thanks! Your account is verified and ready to go.'}
          </p>
        </div>
        <Link
          href="/courses"
          className="mt-1 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[12px] font-bold text-white bg-[linear-gradient(135deg,#ff6b00,#2563eb)] hover:opacity-90 transition-all no-underline"
        >
          Explore courses
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="size-12 rounded-full bg-red-500/10 flex items-center justify-center">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
      </div>
      <div>
        <h2 className="text-[15px] font-bold text-[var(--text)]">We couldn’t confirm your email</h2>
        <p className="text-[12px] text-[var(--muted)] mt-1">{state.message}</p>
      </div>
      <button
        onClick={sendNewLink}
        disabled={resend.busy}
        className="px-5 py-2.5 rounded-xl text-[12px] font-bold text-white bg-[linear-gradient(135deg,#ff6b00,#2563eb)] hover:opacity-90 disabled:opacity-60 transition-all cursor-pointer border-none"
      >
        {resend.busy ? 'Sending…' : 'Send me a new link'}
      </button>
      {resend.note && <p className="text-[11.5px] text-[var(--text2)]">{resend.note}</p>}
      <Link href="/" className="text-[11px] text-[var(--blue)] font-semibold hover:text-[var(--orange)] transition-colors">← Back to home</Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center px-4 py-8 sm:px-6">
      <div
        className="relative w-full max-w-[400px] overflow-hidden rounded-[22px] border-2 p-6 sm:p-8"
        style={{
          background: 'linear-gradient(135deg, var(--surface), var(--bg))',
          borderColor: 'rgba(37,99,235,0.18)',
          boxShadow: '0 0 0 1px rgba(37,99,235,0.08), 0 20px 50px rgba(37,99,235,0.12)',
        }}
      >
        <div className="absolute -right-[60px] -top-[60px] h-[160px] w-[160px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(rgba(37,99,235,0.18), transparent 70%)' }} />
        <div className="absolute -bottom-[50px] -left-[50px] h-[140px] w-[140px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(rgba(255,106,0,0.16), transparent 70%)' }} />
        <div className="relative z-10 flex flex-col gap-5">
          <div className="flex flex-col items-center text-center">
            <Link href="/" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo.png" alt="FutureStack" className="h-9 mx-auto" />
            </Link>
          </div>
          <Suspense fallback={<div className="py-8 text-center text-[13px] text-[var(--muted)]">Loading…</div>}>
            <VerifyEmail />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
