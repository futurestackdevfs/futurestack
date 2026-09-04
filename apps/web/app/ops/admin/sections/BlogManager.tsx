"use client";

import { useState, useEffect } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { EntityTable, type ColumnDef } from "./EntityTable";
import { showToast } from "@/lib/toast";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  metaDescription: string;
  tags: string[];
  sourceTopic?: string | null;
  status: string;
  publishedAt?: string | null;
  createdAt: string;
}

function useBlogData() {
  const [token, setToken] = useState<string | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      const t = await (await import("@/app/auth/lib/token-store")).loadStaffToken().catch(() => null);
      setToken(t);
      if (!t) {
        window.location.href = "/auth/staff-login";
      }
    })();
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function fetchData() {
      try {
        const res = await opsFetch("/api/articles/admin?all=true", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        // API returns a paginated envelope: { data, total, page, limit, totalPages }
        const list: BlogPost[] = Array.isArray(result) ? result : result?.data ?? [];
        if (!cancelled) setPosts(list);
      } catch (e: any) {
        if (!cancelled) showToast(`Failed to load blog posts: ${e.message}`);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [token, refreshKey]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function refresh() {
      try {
        const res = await opsFetch("/api/articles/admin?all=true", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        // API returns a paginated envelope: { data, total, page, limit, totalPages }
        const list: BlogPost[] = Array.isArray(result) ? result : result?.data ?? [];
        if (!cancelled) setPosts(list);
      } catch (e: any) {
        if (!cancelled) showToast(`Failed to refresh: ${e.message}`);
      }
    }
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token, refreshKey]);

  return { token, posts, refreshKey, setRefreshKey };
}

const COLUMNS: ColumnDef[] = [
  { key: "title", label: "Title", strong: true },
  {
    key: "status",
    label: "Status",
    render: (val: any, row: any) => {
      const statusText = row.status === "published" ? "Published" : "Draft";
      return (
        <span className="px-2 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider"
          style={{
            background: row.status === "published" ? "var(--green-d)" : "var(--orange-d)",
            color: row.status === "published" ? "var(--green)" : "var(--orange)",
          }}>
          {statusText}
        </span>
      );
    },
  },
  { key: "sourceTopic", label: "Source Topic" },
  { key: "createdAt", label: "Created", render: (val: any, row: any) => new Date(val).toLocaleDateString() },
  { key: "publishedAt", label: "Published", render: (val: any, row: any) => (val ? new Date(val).toLocaleDateString() : "—") },
] as const;

interface GenResult {
  ok: boolean;
  title?: string;
  message: string;
  reason?: string;
  retryable?: boolean;
}

/** Extra "how to fix" hints keyed by the backend's `reason`. */
const REASON_HINT: Record<string, { hint: string; link?: { label: string; href: string } }> = {
  not_configured: { hint: "Add OPENAI_API_KEY to apps/api/.env and restart the backend." },
  no_credits: {
    hint: "This OpenAI account is out of credits. Add billing, or switch OPENAI_BASE_URL / OPENAI_MODEL to another provider (Groq, OpenRouter).",
    link: { label: "OpenAI billing", href: "https://platform.openai.com/settings/organization/billing/" },
  },
  invalid_key: { hint: "The key in apps/api/.env was rejected. Paste a valid key and restart." },
  rate_limited: { hint: "Too many requests. Wait a minute, then retry." },
  bad_model: { hint: "Set a valid OPENAI_MODEL for this key in apps/api/.env." },
  upstream_down: { hint: "The provider is down. Retry in a bit." },
  network: { hint: "The backend couldn't reach the provider. Check connectivity / OPENAI_BASE_URL." },
  invalid_json: { hint: "The model returned malformed output. Retry, or use a stronger model." },
  empty_response: { hint: "The model returned nothing. Retry with a shorter topic." },
};

export default function BlogManager() {
  const { token, posts, refreshKey, setRefreshKey } = useBlogData();
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenResult | null>(null);

  if (!token) return null;

  async function handleGenerate() {
    setGenerating(true);
    setResult(null);
    try {
      const res = await opsFetch("/api/articles/admin/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ topic: topic.trim() || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({
          ok: false,
          message: body?.message || `Generation failed (HTTP ${res.status}).`,
          reason: body?.reason,
          retryable: body?.retryable,
        });
        return;
      }
      setResult({ ok: true, title: body.title, message: `Draft saved. Review it in the table below, then publish.` });
      setTopic("");
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setResult({ ok: false, message: e?.message || "Generation failed — the request never completed.", reason: "network", retryable: true });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Optional topic — leave blank to pick a trending story"
          disabled={generating}
          className="flex-1 min-w-[240px] px-3 py-2 rounded-lg text-[12px] outline-none disabled:opacity-60"
          style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-4 py-2 rounded-lg text-[12px] font-semibold text-white disabled:opacity-60 disabled:cursor-default cursor-pointer"
          style={{ background: "var(--orange)" }}
        >
          {generating ? "Generating…" : "Generate Article"}
        </button>
      </div>

      <EntityTable
        columns={COLUMNS}
        data={posts}
        emptyMessage={`No blog posts found.`}
        onEdit={() => {}}
        onDelete={() => {}}
      />

      {result && (
        <GenResultModal
          result={result}
          busy={generating}
          onRetry={handleGenerate}
          onClose={() => setResult(null)}
        />
      )}
    </div>
  );
}

function GenResultModal({
  result,
  busy,
  onRetry,
  onClose,
}: {
  result: GenResult;
  busy: boolean;
  onRetry: () => void;
  onClose: () => void;
}) {
  const fix = result.reason ? REASON_HINT[result.reason] : undefined;
  const accent = result.ok ? "var(--green)" : "var(--red)";

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/55 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-[440px] rounded-2xl overflow-hidden shadow-[var(--shadow-lg)]"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2.5 px-5 py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[13px] font-bold shrink-0"
            style={{ background: accent }}
          >
            {result.ok ? "✓" : "!"}
          </span>
          <h3 className="text-[13px] font-bold" style={{ color: "var(--text)" }}>
            {result.ok ? "Article generated" : "Couldn’t generate the article"}
          </h3>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          {result.ok && result.title && (
            <div
              className="text-[12.5px] font-semibold px-3 py-2 rounded-lg"
              style={{ background: "var(--panel)", color: "var(--text)", border: "1px solid var(--border)" }}
            >
              “{result.title}”
            </div>
          )}

          <p className="text-[12px] leading-relaxed" style={{ color: "var(--text2, var(--text))" }}>
            {result.message}
          </p>

          {fix && (
            <div
              className="text-[11.5px] leading-relaxed px-3 py-2 rounded-lg"
              style={{ background: "var(--panel)", color: "var(--text3, var(--text))", border: "1px solid var(--border)" }}
            >
              <span className="font-semibold" style={{ color: "var(--text)" }}>How to fix: </span>
              {fix.hint}
              {fix.link && (
                <>
                  {" "}
                  <a href={fix.link.href} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--orange)" }}>
                    {fix.link.label} ↗
                  </a>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: "1px solid var(--border)" }}>
          {!result.ok && result.retryable && (
            <button
              onClick={onRetry}
              disabled={busy}
              className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold text-white disabled:opacity-60 cursor-pointer"
              style={{ background: "var(--orange)" }}
            >
              {busy ? "Retrying…" : "Retry"}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer"
            style={{ background: "var(--panel)", color: "var(--text)", border: "1px solid var(--border)" }}
          >
            {result.ok ? "Done" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}