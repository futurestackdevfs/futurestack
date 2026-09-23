'use client';

import { useEffect, useState } from 'react';
import { getUploadState, subscribeUploadState, dismissUpload, type UploadState } from '@/lib/upload-manager';

/**
 * Global bottom-right upload indicator — mounted once (app/ops/layout.tsx) so
 * it survives the VideoUploadDialog that started the upload being closed.
 * See lib/upload-manager.ts for the actual upload + state-broadcast logic.
 */
export function UploadProgressWidget() {
  const [state, setState] = useState<UploadState>(getUploadState());

  useEffect(() => subscribeUploadState(setState), []);

  if (state.status === 'idle') return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-[400] w-[300px] rounded-xl overflow-hidden [animation:fadeUp_.25s_ease_both]"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,.25)' }}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        {state.status === 'uploading' && (
          <div
            className="w-8 h-8 rounded-full border-2 shrink-0 animate-spin"
            style={{ borderColor: 'var(--blue-d)', borderTopColor: 'var(--blue)' }}
          />
        )}
        {state.status === 'processing' && (
          <div
            className="w-8 h-8 rounded-full border-2 shrink-0 animate-spin"
            style={{ borderColor: 'var(--orange-d)', borderTopColor: 'var(--orange)' }}
          />
        )}
        {state.status === 'done' && (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-[14px]"
            style={{ background: 'var(--green)' }}
          >
            ✓
          </div>
        )}
        {state.status === 'error' && (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-[14px]"
            style={{ background: 'var(--red)' }}
          >
            !
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold truncate" style={{ color: 'var(--text)' }}>
            {state.status === 'uploading' && `Uploading video… ${state.progress}%`}
            {state.status === 'processing' && 'Processing video…'}
            {state.status === 'done' && 'Video ready ✓'}
            {state.status === 'error' && 'Upload failed'}
          </div>
          <div className="text-[10.5px] truncate" style={{ color: 'var(--text3)' }}>
            {state.status === 'error' ? state.error
              : state.status === 'processing' ? `${state.fileName} — VdoCipher is transcoding it, this can take a few minutes`
              : state.fileName}
          </div>
        </div>

        {state.status !== 'uploading' && state.status !== 'processing' && (
          <button
            onClick={dismissUpload}
            className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[11px] cursor-pointer border-none bg-transparent"
            style={{ color: 'var(--text3)' }}
            title="Dismiss"
          >
            ✕
          </button>
        )}
      </div>

      {state.status === 'uploading' && (
        <div className="h-1" style={{ background: 'var(--border)' }}>
          <div
            className="h-full transition-all duration-200 ease-out"
            style={{ width: `${state.progress}%`, background: 'var(--blue)' }}
          />
        </div>
      )}
      {state.status === 'processing' && (
        <div className="h-1 overflow-hidden" style={{ background: 'var(--border)' }}>
          <div className="h-full w-1/3 [animation:upload-processing-sweep_1.2s_ease-in-out_infinite]" style={{ background: 'var(--orange)' }} />
        </div>
      )}
      <style jsx>{`
        @keyframes upload-processing-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
