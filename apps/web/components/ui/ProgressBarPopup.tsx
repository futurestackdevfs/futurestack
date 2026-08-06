"use client"

import { useState, useEffect } from "react"
import { RingIndicator } from "./RingIndicator"

interface ProgressBarPopupProps {
  isOpen: boolean;
  onClose: () => void;
  progress: number;
  status: "idle" | "uploading" | "processing" | "ready" | "error";
  message?: string;
  title?: string;
}

export function ProgressBarPopup({
  isOpen,
  onClose,
  progress,
  status,
  message,
  title = "Video Processing",
}: ProgressBarPopupProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
    } else {
      const timer = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!show && !isOpen) return null;

  const getStatusColor = () => {
    switch (status) {
      case "uploading": return "var(--blue)";
      case "processing": return "var(--orange)";
      case "ready": return "var(--green)";
      case "error": return "var(--red)";
      default: return "var(--border2)";
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "uploading": return "Uploading to S3...";
      case "processing": return "VdoCipher Processing...";
      case "ready": return "✓ Video Ready!";
      case "error": return "Upload Failed!";
      default: return "Preparing...";
    }
  };

  const getRingColor = () => {
    switch (status) {
      case "uploading": return "var(--blue)";
      case "processing": return "var(--orange)";
      case "ready": return "var(--green)";
      case "error": return "var(--red)";
      default: return "var(--border2)";
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="rounded-lg w-full max-w-sm p-5 transform transition-all duration-300"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 20px 60px rgba(0,0,0,.4)",
          opacity: show ? 1 : 0,
          transform: show ? "scale(1)" : "scale(0.95)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--blue)] to-[var(--purple)] flex items-center justify-center">
              <span className="text-white text-xs">📹</span>
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: "var(--text)" }}>
                {title}
              </div>
              <div className="text-xs" style={{ color: "var(--text3)" }}>
                Video upload & processing
              </div>
            </div>
          </div>
          {status !== "ready" && status !== "error" && (
            <RingIndicator
              percentage={progress}
              size={36}
              strokeWidth={3}
              color={getRingColor()}
              label={true}
            />
          )}
          {(status === "ready" || status === "error") && (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: status === "ready" ? "rgba(34,197,94,.15)" : "rgba(239,68,68,.15)",
                border: status === "ready" ? "1px solid var(--green)" : "1px solid var(--red)",
              }}
            >
              <span className="text-sm" style={{ color: status === "ready" ? "var(--green)" : "var(--red)" }}>
                {status === "ready" ? "✓" : "✕"}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium" style={{ color: "var(--text2)" }}>Progress</span>
              <span className="text-xs font-bold" style={{ color: getStatusColor() }}>{progress}%</span>
            </div>
            <div
              className="h-2.5 rounded-full overflow-hidden"
              style={{ background: "var(--border)", position: "relative" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  background: getStatusColor(),
                  boxShadow: status === "processing" ? "0 0 10px var(--orange)" : "none",
                }}
              />
              {status === "processing" && progress > 0 && progress < 100 && (
                <div
                  className="absolute inset-0 animate-pulse"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                />
              )}
            </div>
          </div>

          <div className="text-xs p-3 rounded-md" style={{ background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
            <div className="font-medium mb-1" style={{ color: getStatusColor() }}>{getStatusLabel()}</div>
            {message && <div className="text-[11px] opacity-80">{message}</div>}
            {status === "uploading" && progress > 0 && (
              <div className="text-[10px] opacity-70 mt-1">S3 upload in progress...</div>
            )}
            {status === "processing" && (
              <div className="text-[10px] opacity-70 mt-1">VdoCipher is transcoding your video. This may take 1-5 minutes.</div>
            )}
            {status === "ready" && (
              <div className="text-[10px] opacity-70 mt-1">Video is ready for playback. Students can now access this content.</div>
            )}
          </div>
        </div>

        {status === "error" && (
          <div className="mt-4 p-3 rounded-md bg-red-900/20 border border-red-500/30">
            <div className="text-xs font-medium text-red-400 mb-1">Upload Failed</div>
            <div className="text-[10px] text-red-300/80">Something went wrong during upload. Please try again or contact support.</div>
          </div>
        )}

        {(status === "ready" || status === "error") && (
          <div className="mt-4 pt-3 border-t border-[var(--border)]">
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-md font-medium text-xs transition-all duration-200"
              style={{
                background: `var(--btn-bg, ${status === "ready" ? "var(--green-d)" : "var(--red-d)"})`,
                color: `var(--btn-text, ${status === "ready" ? "var(--green)" : "var(--red)"})`,
                border: `1px solid var(--btn-bg, ${status === "ready" ? "var(--green)" : "var(--red)"})`,
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget as HTMLElement;
                target.style.background = `var(--btn-bg-hover, ${status === "ready" ? "var(--green)" : "var(--red)"})`;
                target.style.color = "var(--btn-text, white)";
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget as HTMLElement;
                target.style.background = `var(--btn-bg, ${status === "ready" ? "var(--green-d)" : "var(--red-d)"})`;
                target.style.color = `var(--btn-text, ${status === "ready" ? "var(--green)" : "var(--red)"})`;
              }}
            >
              {status === "ready" ? "Continue to Course" : "Retry Upload"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
