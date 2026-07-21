"use client"

import { useState, useEffect } from "react"

export function ProgressBubbles({
  videos,
  activeVideoId,
  onVideoClick,
}: {
  videos: Array<{ id: string; title: string; isCompleted?: boolean; isCurrent?: boolean }>;
  activeVideoId?: string;
  onVideoClick: (videoId: string) => void;
}) {
  return (
    <div className="flex gap-2 p-2 bg-[var(--bg)] rounded-lg">
      {videos.map((video) => {
        const isActive = video.id === activeVideoId;
        const isCompleted = video.isCompleted;
        const isCurrent = video.isCurrent;

        let bgColor = "bg-[var(--border)]";
        let borderColor = "border-[var(--border)]";
        let textColor = "text-[var(--text3)]";
        let dot = "🔒";

        if (isActive) {
          bgColor = "bg-[var(--orange-d)]";
          borderColor = "border-[var(--orange)]";
          textColor = "text-[var(--orange)] font-semibold";
          dot = "▶";
        }

        if (isCompleted) {
          bgColor = "bg-[var(--green-d)]";
          borderColor = "border-[var(--green)]";
          textColor = "text-[var(--green)] font-semibold";
          dot = "✓";
        }

        return (
          <button
            key={video.id}
            onClick={() => onVideoClick(video.id)}
            className={`w-12 h-12 rounded-lg border ${bgColor} ${borderColor} ${textColor} text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-1`}
          >
            <span className="text-xs">{dot}</span>
            <span className="text-[8px] leading-tight text-center px-1">{video.title.substring(0, 10)}{video.title.length > 10 ? "..." : ""}</span>
          </button>
        );
      })}
    </div>
  );
}
