"use client";

import { useEffect, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";

interface VideoPreviewModalProps {
  videoId: string;
  title: string;
  onClose: () => void;
  /** Admin preview-otp endpoint for this video's entity — courses vs project
   *  curriculum videos live on different routes. Defaults to the course one. */
  otpEndpoint?: string;
}

/** Plays back any already-uploaded video (course or project curriculum) in a
 *  lightweight modal, via an admin-only preview-otp endpoint that skips all
 *  public-preview gating — staff can spot-check any video regardless of
 *  where it sits in the curriculum. */
export function VideoPreviewModal({ videoId, title, onClose, otpEndpoint }: VideoPreviewModalProps) {
  const [otp, setOtp] = useState<string | null>(null);
  const [playbackInfo, setPlaybackInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProcessing(false);
    opsFetch(otpEndpoint ?? `/api/courses/videos/${videoId}/preview-otp`)
      .then(async (r) => {
        if (r.ok) return r.json();
        const body = await r.json().catch(() => ({}));
        if (r.status === 400 && /not ready/i.test(body?.message || "")) return Promise.reject('processing');
        return Promise.reject('error');
      })
      .then((data) => { if (!cancelled) { setOtp(data.otp); setPlaybackInfo(data.playbackInfo); } })
      .catch((reason) => {
        if (cancelled) return;
        if (reason === 'processing') setProcessing(true);
        else setError('Failed to load video preview');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [videoId, otpEndpoint]);

  const playerSrc = otp && playbackInfo
    ? `https://player.vdocipher.com/v2/?otp=${otp}&playbackInfo=${playbackInfo}&autoplay=true`
    : null;

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center p-6"
      style={{ background: "var(--overlay)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex flex-col rounded-lg overflow-hidden w-full"
        style={{ maxWidth: 860, background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}
      >
        <div className="flex items-center justify-between px-4 py-2.5 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="text-[12.5px] font-bold truncate pr-2" style={{ color: "var(--text)" }}>▶ {title}</div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-6 h-6 rounded text-[14px] cursor-pointer shrink-0"
            style={{ color: "var(--btn-text, var(--text3))", background: "var(--btn-bg, transparent)" }}
          >✕</button>
        </div>
        <div className="relative w-full aspect-video bg-black">
          {playerSrc ? (
            <iframe
              src={playerSrc}
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="encrypted-media; autoplay"
              allowFullScreen
              title={title}
            />
          ) : loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--orange)", borderTopColor: "transparent" }} />
            </div>
          ) : processing ? (
            <div className="absolute inset-0 flex items-center justify-center text-center px-4">
              <div style={{ color: "#94a3b8" }}>
                <div className="text-lg mb-1">⏳</div>
                <div className="text-xs font-bold text-white mb-0.5">Still processing</div>
                <div className="text-[10px]">This video hasn't finished processing on VdoCipher yet — check back shortly.</div>
              </div>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center text-center px-4">
              <div style={{ color: "#94a3b8" }}>
                <div className="text-lg mb-1">⚠️</div>
                <div className="text-xs font-bold text-white mb-0.5">Preview unavailable</div>
                <div className="text-[10px]">{error}</div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
