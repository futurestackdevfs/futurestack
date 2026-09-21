"use client";

import { useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";

interface PageContentEditorModalProps {
  token: string;
  slug: string;
  title: string;
  content: string;
  updatedAt: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function PageContentEditorModal({
  token,
  slug,
  title: initialTitle,
  content: initialContent,
  updatedAt,
  onClose,
  onSaved,
}: PageContentEditorModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await opsFetch(`/api/admin/legal-pages/${slug}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, content }),
      });
      if (!res.ok) throw new Error("Failed to save page");
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save page");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ background: "var(--overlay)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex flex-col rounded-lg max-w-full"
        style={{
          width: "80vw",
          maxWidth: "96vw",
          maxHeight: "80vh",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 20px 60px rgba(0,0,0,.3)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 text-[13.5px] font-extrabold" style={{ color: "var(--text)" }}>
            <span
              className="w-[26px] h-[26px] rounded flex items-center justify-center text-[13px]"
              style={{ background: "var(--orange-d)", color: "var(--orange)" }}
            >
              📄
            </span>
            Edit {initialTitle}
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-6 h-6 rounded text-[14px] cursor-pointer"
            style={{ color: "var(--btn-text, var(--text3))", background: "var(--btn-bg, transparent)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--btn-bg-hover, var(--panel))";
              (e.currentTarget as HTMLElement).style.color = "var(--btn-text, var(--text))";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--btn-bg, transparent)";
              (e.currentTarget as HTMLElement).style.color = "var(--btn-text, var(--text3))";
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          <div>
            <label className="block font-mono text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-[12px] px-2.5 py-1.5 rounded outline-none"
              style={{
                fontFamily: "'Inter', sans-serif",
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--orange)";
                e.currentTarget.style.background = "var(--surface)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.background = "var(--bg)";
              }}
            />
          </div>

          <div className="flex-1 flex flex-col">
            <label className="block font-mono text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>
              Content (Markdown)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write the page content in Markdown..."
              className="w-full text-[12px] px-2.5 py-1.5 rounded outline-none resize-vertical flex-1"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                minHeight: 320,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--orange)";
                e.currentTarget.style.background = "var(--surface)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.background = "var(--bg)";
              }}
            />
          </div>

          <div className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>
            last updated {updatedAt ? new Date(updatedAt).toLocaleString() : "never"}
          </div>

          {error && (
            <div className="font-mono text-[10.5px]" style={{ color: "var(--red)" }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-4 py-3 shrink-0"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button
            onClick={onClose}
            disabled={saving}
            className="font-mono text-[10.5px] font-semibold px-3 py-1.5 rounded cursor-pointer disabled:opacity-60"
            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--panel)" }}
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="font-mono text-[10.5px] font-semibold px-3 py-1.5 rounded cursor-pointer disabled:opacity-60"
            style={{ border: "none", color: "#fff", background: "var(--orange)" }}
          >
            {saving ? "Saving..." : "💾 Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
