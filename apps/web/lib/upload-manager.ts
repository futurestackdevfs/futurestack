'use client';

import { refreshSession } from '@/app/auth/lib/refresh-session';
import { decodeClaims } from '@/app/auth/lib/token-claims';

// Runs a video upload independent of any component's lifecycle — the caller
// (VideoUploadDialog) closes its modal the instant "Upload & Process" is
// clicked, so the XHR here must survive that dialog (and potentially the
// whole curriculum builder) unmounting. State is broadcast globally; the
// bottom-right UploadProgressWidget (mounted once at app/ops/layout.tsx) is
// what the admin actually watches. Same singleton + window-event pattern as
// app/auth/hooks/use-auth.ts's `shared`/`emit`, for consistency.

export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

export type UploadState = {
  status: UploadStatus;
  fileName: string;
  progress: number;
  error?: string;
};

/** Poll interval / ceiling while waiting for VdoCipher to finish transcoding
 *  after the raw file has already reached S3. 5s × 120 = 10 minutes, which
 *  comfortably covers normal processing time without polling forever. */
const STATUS_POLL_MS = 5000;
const STATUS_POLL_MAX_ATTEMPTS = 120;

/** The upload-credentials endpoint tells us which entity the new video
 *  belongs to (course `Video` vs project `ProjectCurriculumVideo`) — reused
 *  here to pick the matching status-check route instead of every caller
 *  having to pass one through explicitly. */
function deriveStatusEndpoint(uploadEndpoint: string, videoId: string): string | null {
  if (uploadEndpoint.includes('/admin/videos/upload-credentials')) {
    return `/api/admin/videos/${videoId}/status`;
  }
  if (uploadEndpoint.includes('/curriculum/videos/upload-credentials')) {
    return `/api/projects/curriculum/videos/${videoId}/status`;
  }
  return null;
}

// The access token lives ~15 minutes — a large video upload or a long status-
// poll loop routinely outlasts that. A plain 401 here used to surface as
// "Failed to get upload credentials" with no recovery; this mirrors
// opsFetch's silent refresh-and-retry so an expired token mid-upload doesn't
// kill it. Returns whichever token actually worked, so the caller keeps using
// the fresh one for the rest of the upload (status polling, etc).
async function fetchWithRefresh(doFetch: (t: string) => Promise<Response>, token: string): Promise<{ res: Response; token: string }> {
  let res = await doFetch(token);
  if (res.status === 401) {
    const role = decodeClaims(token)?.role;
    const refreshed = await refreshSession(role).catch(() => null);
    if (refreshed?.accessToken) {
      token = refreshed.accessToken;
      res = await doFetch(token);
    }
  }
  return { res, token };
}

async function pollUntilReady(statusUrl: string, token: string, fileName: string): Promise<string> {
  for (let attempt = 0; attempt < STATUS_POLL_MAX_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, STATUS_POLL_MS));
    try {
      const { res, token: nextToken } = await fetchWithRefresh(
        (t) => fetch(statusUrl, { headers: { Authorization: `Bearer ${t}` } }),
        token,
      );
      token = nextToken;
      if (res.ok) {
        const data = await res.json();
        if (data.videoStatus === 'READY') return token;
        if (data.videoStatus === 'ERROR') throw new Error('Video processing failed on VdoCipher');
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('processing failed')) throw err;
      // Transient network/poll error — keep trying, the next attempt may succeed.
    }
    emit({ status: 'processing', fileName, progress: 100 });
  }
  // Gave up waiting — don't hang the widget forever. The webhook will still
  // flip videoStatus to READY server-side whenever it actually finishes.
  return token;
}

const EVENT = 'fs:upload-status';

let shared: UploadState = { status: 'idle', fileName: '', progress: 0 };

function emit(next: UploadState) {
  shared = next;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<UploadState>(EVENT, { detail: next }));
  }
}

export function getUploadState(): UploadState {
  return shared;
}

export function subscribeUploadState(cb: (s: UploadState) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<UploadState>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

/** Manually dismiss the widget (e.g. an explicit close button). */
export function dismissUpload() {
  emit({ status: 'idle', fileName: '', progress: 0 });
}

export async function startVideoUpload(opts: {
  file: File;
  token: string;
  endpoint: string;
  body: Record<string, unknown>;
  /** Runs once the file has fully reached S3 — e.g. tells the curriculum
   *  builder to refresh and pick up the real video row. Awaited before the
   *  widget flips to "done" so the confirmation reflects reality, not just
   *  the raw file transfer. Receives the real DB video id the credentials
   *  endpoint created, so the caller can apply follow-up changes (like
   *  marking it a free preview) that the upload-credentials endpoint itself
   *  doesn't know about. */
  onDone?: (videoId: string) => void | Promise<void>;
}): Promise<void> {
  let { token } = opts;
  const { file, endpoint, body, onDone } = opts;

  if (shared.status === 'uploading' || shared.status === 'processing') {
    throw new Error('Another video is already uploading — wait for it to finish.');
  }

  emit({ status: 'uploading', fileName: file.name, progress: 0 });

  try {
    const { res: credRes, token: freshToken } = await fetchWithRefresh(
      (t) => fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify(body),
      }),
      token,
    );
    token = freshToken;
    if (!credRes.ok) throw new Error('Failed to get upload credentials');
    const uploadData = await credRes.json();

    const formDataToSend = new FormData();
    Object.entries(uploadData.uploadCredentials).forEach(([key, value]) => {
      // S3 POST policy requires ALL fields specified in the conditions —
      // empty strings are valid values and must still be included.
      if (value !== null && value !== undefined) {
        formDataToSend.append(key, value as string);
      }
    });
    formDataToSend.append('file', file);

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          emit({ status: 'uploading', fileName: file.name, progress: percent });
        }
      });
      xhr.addEventListener('load', () => {
        if (xhr.status === 201) resolve();
        else reject(new Error(`Upload failed: ${xhr.status}`));
      });
      xhr.addEventListener('error', () => reject(new Error('Upload error')));
      xhr.open('POST', uploadData.uploadUrl);
      xhr.send(formDataToSend);
    });

    emit({ status: 'uploading', fileName: file.name, progress: 100 });
    await onDone?.(uploadData.videoId);

    const statusUrl = deriveStatusEndpoint(endpoint, uploadData.videoId);
    if (statusUrl) {
      emit({ status: 'processing', fileName: file.name, progress: 100 });
      await pollUntilReady(statusUrl, token, file.name);
    }
    emit({ status: 'done', fileName: file.name, progress: 100 });
  } catch (err) {
    emit({
      status: 'error',
      fileName: file.name,
      progress: 0,
      error: err instanceof Error ? err.message : 'Upload failed',
    });
    throw err;
  } finally {
    // Auto-clear the widget after it settles — but only if nothing newer
    // (another upload) has started in the meantime.
    const settledAt = shared;
    const delay = settledAt.status === 'error' ? 8000 : 4000;
    setTimeout(() => {
      if (shared === settledAt) emit({ status: 'idle', fileName: '', progress: 0 });
    }, delay);
  }
}
