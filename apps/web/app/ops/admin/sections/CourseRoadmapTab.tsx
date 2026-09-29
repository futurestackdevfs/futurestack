"use client";

import { useEffect, useRef, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { RoadmapView, type RoadmapData } from "@/components/RoadmapTree";
import { AiUsageBlock, type AiUsage } from "@/components/AiUsageBlock";

type Roadmap = RoadmapData;

interface CourseRoadmapTabProps {
  courseId: string;
  token: string;
  onChanged?: () => void;
}

const POLL_MS = 1500;
const MAX_WAIT_MS = 3 * 60_000;

const REASON_HINT: Record<string, string> = {
  not_configured: "Set ANTHROPIC_API_KEY in the API's backend env, then restart.",
  save_failed: "The roadmap was generated but couldn't be saved. Check the API's database connection and retry.",
  upstream_auth: "Anthropic rejected the configured API key. Check it's correct and the account has credits.",
  upstream_rate_limited: "Too many requests to Anthropic. Wait a minute, then retry.",
  busy: "Another roadmap is still being generated. Retry in a moment.",
  daily_limit: "Today's generation cap was reached. Retry tomorrow.",
  refused: "The AI declined this request. Try again after editing the curriculum a little.",
  upstream_unavailable: "The AI provider is down. Retry in a bit.",
  invalid_output: "The model returned an unusable roadmap. Retry.",
  network: "Lost contact with the server while generating. Retry.",
};

async function apiCall(endpoint: string, options?: RequestInit) {
  const res = await opsFetch(`/api${endpoint}`, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(body?.message || res.statusText || `Request failed (${res.status})`);
    err.reason = body?.reason;
    err.status = res.status;
    throw err;
  }
  return body;
}

export function CourseRoadmapTab({ courseId, token, onChanged }: CourseRoadmapTabProps) {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; reason?: string } | null>(null);
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const unmounted = useRef(false);
  const cancelledRef = useRef(false);
  const jobIdRef = useRef<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    unmounted.current = false;
    return () => { unmounted.current = true; };
  }, []);

  function load() {
    if (!token || !courseId) return;
    setLoading(true);
    apiCall(`/courses/${courseId}`)
      .then((data) => {
        // Guard against a roadmap saved under an older schema version before
        // regenerating — treat it as "not generated yet" rather than crash.
        const rm = data?.roadmap;
        setRoadmap(rm && Array.isArray(rm.phases) ? rm : null);
        setGeneratedAt(data?.roadmapGeneratedAt ?? null);
      })
      .catch((e) => setError({ message: e.message || "Failed to load roadmap" }))
      .finally(() => setLoading(false));
  }

  useEffect(() => { setUsage(null); load(); }, [courseId, token]);

  async function handleCancel() {
    const jobId = jobIdRef.current;
    if (!jobId || cancelling) return;
    setCancelling(true);
    cancelledRef.current = true;
    try {
      await apiCall(`/courses/${courseId}/roadmap/generate/${jobId}`, { method: "DELETE" });
    } catch {
      // best-effort
    } finally {
      jobIdRef.current = null;
      setCancelling(false);
      setGenerating(false);
      setStage(null);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setStage("queued");
    setError(null);
    setUsage(null);
    cancelledRef.current = false;
    try {
      const body = await apiCall(`/courses/${courseId}/roadmap/generate`, { method: "POST" });
      const jobId: string = body.jobId;
      jobIdRef.current = jobId;
      const deadline = Date.now() + MAX_WAIT_MS;

      while (!unmounted.current && !cancelledRef.current) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        if (unmounted.current || cancelledRef.current) return;

        const job = await apiCall(`/courses/${courseId}/roadmap/generate/${jobId}`).catch((e) => {
          throw e;
        });
        if (job.stage) setStage(job.stage);
        if (job.status === "succeeded") {
          setRoadmap(job.result);
          setGeneratedAt(new Date().toISOString());
          setUsage(job.usage ?? null);
          onChanged?.();
          return;
        }
        if (job.status === "failed") {
          setError({ message: job.error?.message || "Roadmap generation failed.", reason: job.error?.reason });
          return;
        }
        if (Date.now() > deadline) {
          setError({ message: "Generation is taking unusually long. Try again in a bit." });
          return;
        }
      }
    } catch (e: any) {
      setError({ message: e.message || "Roadmap generation failed.", reason: e.reason });
    } finally {
      if (!unmounted.current) {
        setGenerating(false);
        setStage(null);
      }
    }
  }

  const stageLabel: Record<string, string> = { queued: "Starting…", generating: "Designing the roadmap (detailed — takes a bit longer)…", saving: "Saving…", done: "Done" };

  return (
    <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>
          {roadmap ? `Last generated ${generatedAt ? new Date(generatedAt).toLocaleString() : ""}` : "No roadmap generated yet"}
        </div>
        {generating ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold" style={{ color: "var(--orange)" }}>
              {stageLabel[stage ?? "queued"] ?? "Working…"}
            </span>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="font-mono text-[9px] font-semibold px-2.5 py-1 rounded cursor-pointer disabled:opacity-60"
              style={{ background: "var(--red-d)", color: "var(--red)" }}
            >
              {cancelling ? "Cancelling…" : "Cancel"}
            </button>
          </div>
        ) : (
          <button
            onClick={handleGenerate}
            className="font-mono text-[10px] font-semibold px-3 py-1.5 rounded cursor-pointer"
            style={{ background: "var(--orange)", color: "#fff" }}
          >
            🗺 {roadmap ? "Regenerate Roadmap" : "Generate Roadmap"}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded px-3 py-2.5 flex flex-col gap-1" style={{ background: "var(--red-d)", border: "1px solid var(--red)" }}>
          <span className="text-[11.5px] font-semibold" style={{ color: "var(--red)" }}>✕ {error.message}</span>
          {error.reason && REASON_HINT[error.reason] && (
            <span className="text-[10.5px]" style={{ color: "var(--text2)" }}>{REASON_HINT[error.reason]}</span>
          )}
        </div>
      )}

      {usage && <AiUsageBlock usage={usage} />}

      {loading ? (
        <div className="text-center py-8 font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading…</div>
      ) : !roadmap ? (
        !error && (
          <div className="text-center py-8 font-mono text-[11px]" style={{ color: "var(--text3)" }}>
            Generate a detailed, tree-shaped Beginner → Advanced roadmap for this course — shown on the public course page.
          </div>
        )
      ) : (
        // Same component the public course page uses — what the admin previews here
        // is pixel-for-pixel what students will see.
        <RoadmapView roadmap={roadmap} />
      )}
    </div>
  );
}
