'use client';
import { useEffect, useRef, useState } from 'react';
import { TOAST_EVENT } from '@/lib/toast';
import { refreshSession } from '@/app/auth/lib/refresh-session';

type ToastItem = { id: number; message: string; phase: 'enter' | 'visible' | 'exit' };

let nextId = 0;

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const handler = (e: Event) => {
      const message = (e as CustomEvent<string>).detail;
      const id = ++nextId;

      setToasts((prev) => [...prev, { id, message, phase: 'enter' }]);

      // Next frame: switch to visible so CSS transition fires
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setToasts((prev) =>
            prev.map((t) => (t.id === id ? { ...t, phase: 'visible' } : t)),
          );
        });
      });

      // Begin exit animation at 2.7 s
      const exitTimer = setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, phase: 'exit' } : t)),
        );
      }, 2700);

      // Remove from DOM at 3 s (after 300 ms transition)
      const removeTimer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timers.current.delete(id);
      }, 3000);

      timers.current.set(id, removeTimer);
      // Store exit timer too — clear both on unmount
      timers.current.set(id * -1, exitTimer);
    };

    window.addEventListener(TOAST_EVENT, handler);
    return () => {
      window.removeEventListener(TOAST_EVENT, handler);
      timers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={[
            'flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg',
            'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900',
            'text-xs font-medium max-w-xs pointer-events-auto',
            'transition-all duration-300',
            toast.phase === 'visible'
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 translate-x-4',
          ].join(' ')}
        >
          {/* Green check circle */}
          <span className="flex-shrink-0 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
            <svg
              className="w-2.5 h-2.5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          {toast.message.toLowerCase().includes('session') ? (
            <button
              onClick={async () => {
                const isOps = window.location.pathname.startsWith('/ops');
                const roles = isOps ? ['ADMIN', 'TRAINER', 'COORDINATOR', 'CONTENT_MANAGER', 'SUPPORT'] : ['STUDENT'];
                for (const role of roles) {
                  try {
                    const refreshed = await refreshSession(role);
                    if (refreshed?.accessToken) {
                      const { accessToken } = refreshed;
                      const uid = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub;
                      const saveKey = isOps ? 'fs_staff_uid' : 'fs_uid';
                      localStorage.setItem(saveKey, uid);
                      localStorage.setItem(isOps ? 'fs_token_staff' : 'fs_token', accessToken);
                      await fetch(isOps ? '/api/auth/set-token-staff' : '/api/auth/set-token', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ token: accessToken }),
                      });
                      window.location.reload();
                      return;
                    }
                  } catch {}
                }
                window.location.href = isOps ? '/auth/staff-login' : '/auth/login';
              }}
              className="bg-transparent border-none p-0 text-left cursor-pointer underline underline-offset-2"
              style={{ textDecorationColor: 'inherit' }}
            >
              {toast.message}
            </button>
          ) : (
            toast.message
          )}
        </div>
      ))}
    </div>
  );
}
