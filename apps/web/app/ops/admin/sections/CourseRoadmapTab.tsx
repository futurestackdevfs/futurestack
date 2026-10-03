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

interface VideoOption {
  id: string;
  title: string;
  sectionTitle: string;
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
  const [videoOptions, setVideoOptions] = useState<VideoOption[]>([]);
  const [linksOpen, setLinksOpen] = useState(false);
  const [pendingLinks, setPendingLinks] = useState<Record<string, string | null>>({});
  const [savingLinks, setSavingLinks] = useState(false);
  const [linksSaved, setLinksSaved] = useState(false);

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
        const opts: VideoOption[] = (data?.sections ?? []).flatMap((s: any) =>
          (s.videos ?? []).map((v: any) => ({ id: v.id, title: v.title, sectionTitle: s.title })),
        );
        setVideoOptions(opts);
        setPendingLinks({});
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

  function chipKey(phase: number, node: number, chip: number) {
    return `${phase}-${node}-${chip}`;
  }

  function setPendingLink(phase: number, node: number, chip: number, videoId: string | null) {
    setLinksSaved(false);
    setPendingLinks((prev) => ({ ...prev, [chipKey(phase, node, chip)]: videoId }));
  }

  async function handleSaveLinks() {
    if (!roadmap || Object.keys(pendingLinks).length === 0) return;
    setSavingLinks(true);
    setError(null);
    try {
      const links = Object.entries(pendingLinks).map(([key, videoId]) => {
        const [phase, node, chip] = key.split("-").map(Number);
        return { phase, node, chip, videoId };
      });
      const updated = await apiCall(`/courses/${courseId}/roadmap/video-links`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links }),
      });
      setRoadmap(updated);
      setPendingLinks({});
      setLinksSaved(true);
      onChanged?.();
    } catch (e: any) {
      setError({ message: e.message || "Couldn't save video links." });
    } finally {
      setSavingLinks(false);
    }
  }

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
        <>
          {/* Same component the public course page uses — what the admin previews here
              is pixel-for-pixel what students will see. */}
          <RoadmapView roadmap={roadmap} trackProgress={false} />

          <div className="rounded border" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={() => setLinksOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 font-mono text-[10.5px] font-semibold cursor-pointer"
              style={{ color: "var(--text2)" }}
            >
              <span>🎬 Link videos to roadmap topics {linksOpen ? "▲" : "▼"}</span>
              {Object.keys(pendingLinks).length > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--orange-d)", color: "var(--orange)" }}>
                  {Object.keys(pendingLinks).length} unsaved
                </span>
              )}
            </button>

            {linksOpen && (
              <div className="px-3 pb-3 flex flex-col gap-3">
                <p className="text-[10px]" style={{ color: "var(--text3)" }}>
                  Each chip auto-links to the curriculum video whose title matched its lesson title at generation
                  time. Fix any that matched wrong, or link a chip that has none.
                </p>

                {roadmap.phases.map((phase, pi) => (
                  <div key={pi} className="flex flex-col gap-2">
                    <div className="font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--orange)" }}>{phase.phase}</div>
                    {phase.nodes.map((node, ni) => (
                      <div key={ni} className="flex flex-col gap-1 pl-2">
                        <div className="text-[10.5px] font-semibold" style={{ color: "var(--text)" }}>{node.title}</div>
                        {node.chips.map((chip, ci) => {
                          const key = chipKey(pi, ni, ci);
                          const value = key in pendingLinks ? pendingLinks[key] : chip.videoId ?? "";
                          return (
                            <div key={ci} className="flex items-center gap-2 pl-2">
                              <span className="text-[10.5px] min-w-[140px]" style={{ color: "var(--text2)" }}>{chip.title}</span>
                              <select
                                value={value ?? ""}
                                onChange={(e) => setPendingLink(pi, ni, ci, e.target.value || null)}
                                className="flex-1 text-[10.5px] rounded px-2 py-1 border"
                                style={{ background: "var(--bg)", color: "var(--text)", borderColor: "var(--border)" }}
                              >
                                <option value="">— No video linked —</option>
                                {videoOptions.map((v) => (
                                  <option key={v.id} value={v.id}>{v.sectionTitle} › {v.title}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ))}

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveLinks}
                    disabled={savingLinks || Object.keys(pendingLinks).length === 0}
                    className="font-mono text-[10px] font-semibold px-3 py-1.5 rounded cursor-pointer disabled:opacity-50"
                    style={{ background: "var(--orange)", color: "#fff" }}
                  >
                    {savingLinks ? "Saving…" : "Save video links"}
                  </button>
                  {linksSaved && <span className="text-[10px]" style={{ color: "var(--green)" }}>✓ Saved</span>}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
