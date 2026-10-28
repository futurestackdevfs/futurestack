"use client";

import { useEffect } from "react";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button — for destructive actions. */
  danger?: boolean;
  /** Disables both buttons while the action is running. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** In-page confirmation popup — replaces the browser's native confirm() alert. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-5 bg-black/55 backdrop-blur-[2px]"
      onClick={() => !busy && onCancel()}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[380px] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_20px_60px_rgba(0,0,0,.35)] animate-[fadeUp_.2s_ease_both]"
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[16px] ${
              danger ? "bg-red-500/15" : "bg-[var(--orange-d)]"
            }`}
          >
            {danger ? "🗑️" : "⚠️"}
          </div>
          <div className="min-w-0">
            <div id="confirm-dialog-title" className="text-[15px] font-bold text-[var(--text)]">
              {title}
            </div>
            <div className="mt-1 text-[13px] leading-[1.5] text-[var(--text2)]">{message}</div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            autoFocus
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-4 py-2 text-[12px] font-semibold text-[var(--text2)] transition-colors hover:bg-[var(--card-h)] disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`cursor-pointer rounded-lg border-none px-4 py-2 text-[12px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 ${
              danger ? "bg-red-500" : "bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)]"
            }`}
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
