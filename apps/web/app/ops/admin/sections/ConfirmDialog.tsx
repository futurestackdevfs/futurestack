"use client";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Go Back",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const accent = danger ? "var(--red)" : "var(--orange)";

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-6"
      style={{ background: "var(--overlay)" }}
    >
      <div
        className="flex flex-col rounded-lg max-w-full"
        style={{
          width: 400,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 20px 60px rgba(0,0,0,.35)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <span
            className="w-[26px] h-[26px] rounded flex items-center justify-center text-[13px] shrink-0"
            style={{
              background: danger ? "rgba(239,68,68,.12)" : "var(--orange-d)",
              color: accent,
            }}
          >
            {danger ? "🗑️" : "⚠️"}
          </span>
          <span className="text-[13.5px] font-extrabold" style={{ color: "var(--text)" }}>
            {title}
          </span>
        </div>

        {/* Body */}
        <div
          className="px-4 py-4 text-[12px] leading-relaxed whitespace-pre-line"
          style={{ color: "var(--text2)" }}
        >
          {message}
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2 px-4 py-3"
          style={{ borderTop: "1px solid var(--border)", background: "var(--panel)" }}
        >
          <button
            autoFocus
            onClick={onCancel}
            className="font-mono text-[10.5px] font-semibold px-3 py-1.5 rounded cursor-pointer"
            style={{
              border: "1px solid var(--border)",
              color: "var(--btn-text, var(--text2))",
              background: "var(--btn-bg, var(--surface))",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            }}
          >
            ← {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="font-mono text-[10.5px] font-semibold px-3 py-1.5 rounded cursor-pointer"
            style={{ background: `var(--btn-bg, ${accent})`, color: "var(--btn-text, #fff)", border: `1px solid var(--btn-bg, ${accent})` }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "1";
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
