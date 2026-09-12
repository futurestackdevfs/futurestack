'use client';

// Runs a video upload independent of any component's lifecycle — the caller
// (VideoUploadDialog) closes its modal the instant "Upload & Process" is
// clicked, so the XHR here must survive that dialog (and potentially the
// whole curriculum builder) unmounting. State is broadcast globally; the
// bottom-right UploadProgressWidget (mounted once at app/ops/layout.tsx) is
// what the admin actually watches. Same singleton + window-event pattern as
// app/auth/hooks/use-auth.ts's `shared`/`emit`, for consistency.

export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

export type UploadState = {
  status: UploadStatus;
  fileName: string;
  progress: number;
  error?: string;
};

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
   *  the raw file transfer. */
  onDone?: () => void | Promise<void>;
}): Promise<void> {
  const { file, token, endpoint, body, onDone } = opts;

  if (shared.status === 'uploading') {
    throw new Error('Another video is already uploading — wait for it to finish.');
  }

  emit({ status: 'uploading', fileName: file.name, progress: 0 });

  try {
    const credRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
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
    await onDone?.();
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
