"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Props {
  videoId: string;
  title: string;
  durationSeconds: number;
  initialPosition?: number;
  isCompleted?: boolean;
  onProgress?: (positionSec: number) => void;
  onComplete?: () => void;
}

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoPlayer({
  videoId,
  title,
  durationSeconds,
  initialPosition = 0,
  isCompleted = false,
  onProgress,
  onComplete,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const [saved, setSaved] = useState(initialPosition);
  const lastSentRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendProgress = useCallback(
    async (pos: number) => {
      try {
        const res = await fetch(`/api/student/videos/${videoId}/progress`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ positionSec: Math.floor(pos) }),
        });
        if (!res.ok) return;
        const data = await res.json();
        setSaved(pos);
        lastSentRef.current = pos;
        if (data.justCompleted && onComplete) {
          onComplete();
        }
      } catch {
        // silent — will retry on next tick
      }
    },
    [videoId, onComplete],
  );

  // Heartbeat: send progress every 5s while playing
  useEffect(() => {
    if (!playing || isCompleted) return;
    intervalRef.current = setInterval(() => {
      setPosition((prev) => {
        const next = Math.min(prev + 1, durationSeconds);
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, isCompleted, durationSeconds]);

  // Send to API every 5 seconds of playback
  useEffect(() => {
    if (!playing || isCompleted) return;
    if (position - lastSentRef.current >= 5 || position >= durationSeconds) {
      sendProgress(position);
      onProgress?.(position);
    }
  }, [position, playing, isCompleted, durationSeconds, sendProgress, onProgress]);

  // Mark complete when reaching the end
  useEffect(() => {
    if (position >= durationSeconds && !isCompleted && playing) {
      sendProgress(durationSeconds);
      setPlaying(false);
    }
  }, [position, durationSeconds, isCompleted, playing, sendProgress]);

  // Save on unmount / pause
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (position > lastSentRef.current) {
        sendProgress(position);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progressPct = durationSeconds > 0 ? (position / durationSeconds) * 100 : 0;
  const completed = isCompleted || position >= durationSeconds;

  return (
    <div className="relative w-full aspect-[16/9] bg-black overflow-hidden group">
      {/* Simulated video background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg,#040c1a 0%,#061522 40%,#080f04 100%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 65% 40%,rgba(59,130,246,.15),transparent 55%),radial-gradient(ellipse at 25% 75%,rgba(240,90,26,.1),transparent 50%)",
        }}
      />
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none"
        viewBox="0 0 330 185"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id="grid" width="33" height="33" patternUnits="userSpaceOnUse">
            <path d="M33 0H0V33" fill="none" stroke="#ffffff" strokeWidth=".35" />
          </pattern>
        </defs>
        <rect width="330" height="185" fill="url(#grid)" />
        <polyline
          points="0,140 55,110 110,125 165,72 220,90 275,46 330,62"
          fill="none"
          stroke="rgba(59,130,246,.55)"
          strokeWidth="1.5"
        />
        <polyline
          points="0,160 80,150 165,138 250,118 330,94"
          fill="none"
          stroke="rgba(240,90,26,.45)"
          strokeWidth="1.2"
        />
      </svg>

      {/* Status badge */}
      <div className="absolute top-[10px] left-[10px] z-[2] bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white text-[8px] font-bold px-[9px] py-[3px] rounded-[4px] uppercase tracking-[.06em]"
        style={{ boxShadow: "0 2px 8px rgba(240,90,26,.4)" }}>
        {completed ? "✓ Completed" : playing ? "▶ Now Playing" : "⏸ Paused"}
      </div>

      {/* Duration badge */}
      <div className="absolute bottom-[42px] right-[10px] z-[2] bg-black/65 text-white text-[10px] px-[7px] py-[2px] rounded-[4px]">
        {fmtTime(position)} / {fmtTime(durationSeconds)}
      </div>

      {/* Center play/pause button */}
      <div className="absolute inset-0 flex items-center justify-center z-[1]">
        <button
          onClick={() => {
            if (completed) return;
            setPlaying(!playing);
          }}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--orange)] to-[var(--orange2)] flex items-center justify-center transition-transform hover:scale-110 cursor-pointer border-none"
          style={{ boxShadow: "0 6px 28px rgba(240,90,26,.55)" }}
          disabled={completed}
        >
          {completed ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          ) : playing ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <div className="w-0 h-0 border-solid border-t-[11px] border-b-[11px] border-l-[20px] border-transparent border-l-white ml-[4px]" />
          )}
        </button>
      </div>

      {/* Title overlay */}
      <div className="absolute bottom-[10px] left-[10px] z-[2]">
        <div className="text-white text-[12.5px] font-bold px-[8px] py-[3px] rounded-[4px] bg-black/50">
          {title}
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-white/20 z-[3]">
        <div
          className="h-full bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] transition-[width] duration-1000"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}
