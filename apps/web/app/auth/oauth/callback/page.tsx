'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '../../lib/auth-api';
import { saveToken } from '../../lib/token-store';
import { showToast } from '@/lib/toast';

function OAuthHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setError('No token received from OAuth provider.');
      return;
    }

    authApi
      .me(token)
      .then(async (user) => {
        await saveToken(user.id, token);
        showToast('Signed in with Google!');
        router.replace('/students');
      })
      .catch(() => {
        setError('Authentication failed. Please try again.');
      });
  }, [params, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-red-500">{error}</p>
        <a href="/students" className="text-xs text-primary font-semibold hover:underline">
          Back to login
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-muted-foreground">Signing you in…</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <Suspense fallback={<div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />}>
        <OAuthHandler />
      </Suspense>
    </div>
  );
}
