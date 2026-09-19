"use client";

import { useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";

interface BlogPostEditorModalProps {
  token: string;
  post: {
    id?: string;
    title: string;
    slug?: string;
    metaDescription: string;
    tags: string[];
    content: string;
    status?: string;
  } | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function BlogPostEditorModal({
  token,
  post,
  onClose,
  onSaved,
}: BlogPostEditorModalProps) {
  const isCreate = !post?.id;
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [metaDescription, setMetaDescription] = useState(post?.metaDescription ?? "");
  const [tagsText, setTagsText] = useState((post?.tags ?? []).join(", "));
  const [content, setContent] = useState(post?.content ?? "");
  const [status, setStatus] = useState(post?.status ?? "draft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (saving) return;
    if (!title.trim() || !content.trim() || !metaDescription.trim()) {
      setError("Title, meta description and content are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const tags = tagsText.split(",").map((t) => t.trim()).filter(Boolean);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        content,
        metaDescription: metaDescription.trim(),
        tags,
      };
      if (slug.trim()) body.slug = slug.trim();

      let res;
      if (isCreate) {
        res = await opsFetch("/api/articles/admin", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
      } else {
        body.status = status;
        res = await opsFetch(`/api/articles/admin/${post!.id}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to save article");
      }
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save article");
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
              style={{ background: "var(--purple-d)", color: "var(--purple)" }}
            >
              📝
            </span>
            {isCreate ? "New Article" : `Edit "${post?.title}"`}
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-[12px] px-2.5 py-1.5 rounded outline-none"
                style={{ fontFamily: "'Inter', sans-serif", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
              />
            </div>
            <div>
              <label className="block font-mono text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>
                Slug {isCreate && <span style={{ color: "var(--text3)", textTransform: "none" }}>(auto if blank)</span>}
              </label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto-generated-from-title"
                className="w-full text-[12px] px-2.5 py-1.5 rounded outline-none"
                style={{ fontFamily: "'JetBrains Mono', monospace", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>
              Meta Description
            </label>
            <textarea
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              rows={2}
              className="w-full text-[12px] px-2.5 py-1.5 rounded outline-none resize-vertical"
              style={{ fontFamily: "'Inter', sans-serif", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>
                Tags (comma separated)
              </label>
              <input
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="react, javascript, careers"
                className="w-full text-[12px] px-2.5 py-1.5 rounded outline-none"
                style={{ fontFamily: "'Inter', sans-serif", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
              />
            </div>
            {!isCreate && (
              <div>
                <label className="block font-mono text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full text-[12px] px-2.5 py-1.5 rounded outline-none"
                  style={{ fontFamily: "'Inter', sans-serif", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col">
            <label className="block font-mono text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>
              Content (Markdown)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write the article content in Markdown..."
              className="w-full text-[12px] px-2.5 py-1.5 rounded outline-none resize-vertical flex-1"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                minHeight: 320,
              }}
            />
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
