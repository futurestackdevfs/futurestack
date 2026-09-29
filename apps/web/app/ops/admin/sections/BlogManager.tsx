"use client";

import { useState, useEffect, useRef } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { EntityTable, type ColumnDef } from "./EntityTable";
import BlogPostEditorModal from "./BlogPostEditorModal";
import { showToast } from "@/lib/toast";
import { AiUsageBlock, type AiUsage } from "@/components/AiUsageBlock";

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

const STAGE_LABEL: Record<string, string> = {
  queued: "Starting…",
  topic: "Picking a topic…",
  research: "Researching…",
  write: "Writing…",
  verify: "Fact-checking…",
  saving: "Saving draft…",
  done: "Done",
};

/** Order matters — drives the top progress bar's fill %. */
const STEPS: { key: string; label: string }[] = [
  { key: "queued", label: "Start" },
  { key: "topic", label: "Topic" },
  { key: "research", label: "Research" },
  { key: "write", label: "Write" },
  { key: "verify", label: "Verify" },
  { key: "saving", label: "Save" },
  { key: "done", label: "Done" },
];

const POLL_MS = 2000;
const MAX_WAIT_MS = 10 * 60_000;
const MAX_POLL_FAILURES = 3;

interface GenResult {
  ok: boolean;
  title?: string;
  message: string;
  reason?: string;
  retryable?: boolean;
  usage?: AiUsage;
}

/** Extra "how to fix" hints keyed by the backend's `reason`. */
const REASON_HINT: Record<string, { hint: string; link?: { label: string; href: string } }> = {
  not_configured: { hint: "Set ANTHROPIC_API_KEY in the API's backend env, then restart." },
  save_failed: { hint: "The article was written but couldn't be saved as a draft. Check the API's database connection and retry." },
  upstream_auth: {
    hint: "Anthropic rejected ANTHROPIC_API_KEY. Check it's correct and the account has credits.",
    link: { label: "Anthropic Console", href: "https://console.anthropic.com/" },
  },
  upstream_rate_limited: { hint: "Too many requests to Anthropic. Wait a minute, then retry." },
  busy: { hint: "Another article is still being generated. Retry in a moment." },
  daily_limit: { hint: "Today's article generation cap was reached. Raise MAX_GENERATIONS_PER_DAY, or retry tomorrow." },
  refused: { hint: "The AI declined this topic. Try a different or more specific topic." },
  upstream_unavailable: { hint: "The AI provider is down. Retry in a bit." },
  network: { hint: "Lost contact with the server while generating. Check the drafts list, or retry." },
  invalid_output: { hint: "The model returned an unusable article. Retry, or try a narrower topic." },
  cancelled: { hint: "Generation was cancelled." },
};

export default function BlogManager() {
  const { token, posts, refreshKey, setRefreshKey } = useBlogData();
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [result, setResult] = useState<GenResult | null>(null);
  // Stops polling if the admin navigates away mid-generation.
  const unmounted = useRef(false);
  useEffect(() => {
    unmounted.current = false;
    return () => { unmounted.current = true; };
  }, []);
  const jobIdRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);
  const [cancelling, setCancelling] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | "new" | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  if (!token) return null;

  async function handleDelete(row: BlogPost) {
    if (!window.confirm(`Delete article "${row.title}"? This cannot be undone.`)) return;
    setDeleting(row.id);
    try {
      const res = await opsFetch(`/api/articles/admin/${row.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast("Article deleted");
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      showToast(`Failed to delete: ${e.message}`);
    } finally {
      setDeleting(null);
    }
  }

  async function handleCancel() {
    const jobId = jobIdRef.current;
    if (!jobId || cancelling) return;
    setCancelling(true);
    cancelledRef.current = true;
    try {
      await opsFetch(`/api/articles/admin/generate/${jobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // best-effort — the poll loop already stopped locally either way
    } finally {
      jobIdRef.current = null;
      setCancelling(false);
      setGenerating(false);
      setStage(null);
      showToast("Generation cancelled");
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setStage("queued");
    setResult(null);
    cancelledRef.current = false;
    try {
      // 1 — start the background job (returns immediately)
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

      // 2 — poll for progress until it finishes (draft is saved by the AI service)
      const jobId: string = body.jobId;
      jobIdRef.current = jobId;
      const deadline = Date.now() + MAX_WAIT_MS;
      let failures = 0;
      while (!unmounted.current && !cancelledRef.current) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        if (unmounted.current || cancelledRef.current) return;

        let job: any;
        try {
          const pr = await opsFetch(`/api/articles/admin/generate/${jobId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          job = await pr.json().catch(() => ({}));
          if (pr.status === 404) {
            setResult({ ok: false, message: "The generation job expired before it finished. Check the drafts list, or try again.", retryable: true });
            return;
          }
          if (!pr.ok) throw new Error(job?.message || `HTTP ${pr.status}`);
          failures = 0;
        } catch (e: any) {
          // One flaky poll shouldn't abandon a job that's still running server-side.
          if (++failures >= MAX_POLL_FAILURES) {
            setResult({ ok: false, message: e?.message || "Lost contact with the server while generating.", reason: "network", retryable: true });
            return;
          }
          continue;
        }

        if (job.stage) setStage(job.stage);
        if (job.status === "succeeded") {
          setResult({
            ok: true,
            title: job.result?.title,
            message: "Draft saved. Review it in the table below, then publish.",
            usage: job.result?.meta
              ? {
                  model: job.result.meta.model,
                  inputTokens: job.result.meta.inputTokens,
                  outputTokens: job.result.meta.outputTokens,
                  cacheReadTokens: job.result.meta.cacheReadTokens ?? 0,
                  cacheWriteTokens: job.result.meta.cacheWriteTokens ?? 0,
                }
              : undefined,
          });
          setTopic("");
          setRefreshKey((k) => k + 1);
          return;
        }
        if (job.status === "failed") {
          setResult({
            ok: false,
            message: job.error?.message || "Generation failed.",
            reason: job.error?.reason,
            retryable: job.error?.retryable,
          });
          return;
        }
        if (Date.now() > deadline) {
          setResult({ ok: false, message: "Generation is taking unusually long. Check the drafts list in a few minutes, or try again.", reason: "network", retryable: true });
          return;
        }
      }
    } catch (e: any) {
      setResult({ ok: false, message: e?.message || "Generation failed — the request never completed.", reason: "network", retryable: true });
    } finally {
      if (!unmounted.current) {
        setGenerating(false);
        setStage(null);
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {generating && (
        <GenerationProgressBar stage={stage ?? "queued"} onCancel={handleCancel} cancelling={cancelling} />
      )}

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
          {generating ? (STAGE_LABEL[stage ?? "queued"] ?? "Generating…") : "Generate Article"}
        </button>
        <button
          onClick={() => setEditingPost("new")}
          className="px-4 py-2 rounded-lg text-[12px] font-semibold cursor-pointer"
          style={{ background: "var(--panel)", color: "var(--text)", border: "1px solid var(--border)" }}
        >
          + New Article
        </button>
      </div>

      <EntityTable
        columns={COLUMNS}
        data={posts}
        emptyMessage={`No blog posts found.`}
        onEdit={(row) => setEditingPost(row as BlogPost)}
        onDelete={handleDelete}
      />

      {result && (
        <GenResultModal
          result={result}
          busy={generating}
          onRetry={handleGenerate}
          onClose={() => setResult(null)}
        />
      )}

      {editingPost && (
        <BlogPostEditorModal
          token={token}
          post={
            editingPost === "new"
              ? null
              : {
                  id: editingPost.id,
                  title: editingPost.title,
                  slug: editingPost.slug,
                  metaDescription: editingPost.metaDescription,
                  tags: editingPost.tags,
                  content: editingPost.content,
                  status: editingPost.status,
                }
          }
          onClose={() => setEditingPost(null)}
          onSaved={() => {
            setEditingPost(null);
            setRefreshKey((k) => k + 1);
            showToast("Article saved");
          }}
        />
      )}
    </div>
  );
}

/** Top stepper shown while a generation job is running — one glance shows which stage it's on. */
function GenerationProgressBar({
  stage,
  onCancel,
  cancelling,
}: {
  stage: string;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const idx = Math.max(0, STEPS.findIndex((s) => s.key === stage));
  const fillPct = (idx / (STEPS.length - 1)) * 100;

  return (
    <div
      className="rounded-xl px-4 py-3 overflow-hidden"
      style={{ background: "var(--panel)", border: "1px solid var(--border)", animation: "slideDown 0.25s ease-out" }}
    >
      <div className="flex items-center justify-between mb-2.5 gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--orange)" }}>
          Generating article…
        </span>
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-medium" style={{ color: "var(--text3, var(--text))" }}>
            {STAGE_LABEL[stage] ?? "Working…"}
          </span>
          <button
            onClick={onCancel}
            disabled={cancelling}
            className="px-2.5 py-1 rounded-md text-[10.5px] font-semibold uppercase tracking-wide disabled:opacity-60 cursor-pointer disabled:cursor-default"
            style={{ background: "var(--red-d)", color: "var(--red)" }}
          >
            {cancelling ? "Cancelling…" : "Cancel"}
          </button>
        </div>
      </div>

      <div className="relative flex items-center justify-between">
        {/* Track + animated fill, sitting behind the step dots */}
        <div
          className="absolute left-0 right-0 h-[2px] rounded-full"
          style={{ top: "9px", background: "var(--border)" }}
        />
        <div
          className="absolute left-0 h-[2px] rounded-full transition-[width] duration-500 ease-out"
          style={{ top: "9px", width: `${fillPct}%`, background: "var(--orange)" }}
        />

        {STEPS.map((step, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <div key={step.key} className="relative z-[1] flex flex-col items-center gap-1.5" style={{ flex: i === 0 || i === STEPS.length - 1 ? "0 0 auto" : "1 1 0" }}>
              <span
                className="w-[19px] h-[19px] rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                style={{
                  background: done || active ? "var(--orange)" : "var(--surface)",
                  color: done || active ? "#fff" : "var(--text3, var(--text))",
                  border: done || active ? "none" : "1px solid var(--border)",
                  animation: active ? "ringPulse 1.4s ease-out infinite" : done ? "checkPop 0.25s ease-out" : undefined,
                }}
              >
                {done ? "✓" : active ? <span className="block w-[6px] h-[6px] rounded-full bg-white" /> : i + 1}
              </span>
              <span
                className="text-[9.5px] font-medium whitespace-nowrap hidden sm:block"
                style={{ color: done || active ? "var(--text)" : "var(--text3, var(--text))" }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
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

          {result.ok && result.usage && <AiUsageBlock usage={result.usage} />}
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