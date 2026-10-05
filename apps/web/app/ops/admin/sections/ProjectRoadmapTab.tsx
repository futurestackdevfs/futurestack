"use client";

import { useEffect, useRef, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { RoadmapView, type RoadmapData } from "@/components/RoadmapTree";
import type { VideoOption } from "@/components/roadmaps/RoadmapDetailTree";
import { AiUsageBlock, type AiUsage } from "@/components/AiUsageBlock";

type Roadmap = RoadmapData;

interface ProjectRoadmapTabProps {
  projectId: string;
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

/** Project's counterpart to CourseRoadmapTab — identical flow (generate/poll/
 *  cancel/edit), just pointed at /projects/:id/roadmap* and sourcing video
 *  options from the project's curriculum videos instead of course sections. */
export function ProjectRoadmapTab({ projectId, token, onChanged }: ProjectRoadmapTabProps) {
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

  const [editDraft, setEditDraft] = useState<Roadmap | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editSaved, setEditSaved] = useState(false);

  useEffect(() => {
    unmounted.current = false;
    return () => { unmounted.current = true; };
  }, []);

  function load() {
    if (!token || !projectId) return;
    setLoading(true);
    apiCall(`/projects/${projectId}`)
      .then((data) => {
        const rm = data?.roadmap;
        setRoadmap(rm && Array.isArray(rm.phases) ? rm : null);
        setGeneratedAt(data?.roadmapGeneratedAt ?? null);
        const opts: VideoOption[] = (data?.curriculum ?? []).flatMap((c: any) =>
          (c.videos ?? []).map((v: any) => ({ id: v.id, title: v.title, sectionTitle: c.title })),
        );
        setVideoOptions(opts);
        setEditDraft(null);
      })
      .catch((e) => setError({ message: e.message || "Failed to load roadmap" }))
      .finally(() => setLoading(false));
  }

  useEffect(() => { setUsage(null); load(); }, [projectId, token]);

  async function handleCancel() {
    const jobId = jobIdRef.current;
    if (!jobId || cancelling) return;
    setCancelling(true);
    cancelledRef.current = true;
    try {
      await apiCall(`/projects/${projectId}/roadmap/generate/${jobId}`, { method: "DELETE" });
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
      const body = await apiCall(`/projects/${projectId}/roadmap/generate`, { method: "POST" });
      const jobId: string = body.jobId;
      jobIdRef.current = jobId;
      const deadline = Date.now() + MAX_WAIT_MS;

      while (!unmounted.current && !cancelledRef.current) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        if (unmounted.current || cancelledRef.current) return;

        const job = await apiCall(`/projects/${projectId}/roadmap/generate/${jobId}`).catch((e) => {
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

  function startEdit() {
    if (!roadmap) return;
    setEditDraft(JSON.parse(JSON.stringify(roadmap)));
    setEditSaved(false);
  }

  function cancelEdit() {
    setEditDraft(null);
  }

  async function handleSaveEdit() {
    if (!editDraft) return;
    setSavingEdit(true);
    setError(null);
    try {
      const updated = await apiCall(`/projects/${projectId}/roadmap`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDraft),
      });
      setRoadmap(updated);
      setEditDraft(null);
      setEditSaved(true);
      onChanged?.();
    } catch (e: any) {
      setError({ message: e.message || "Couldn't save roadmap edits." });
    } finally {
      setSavingEdit(false);
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
        ) : editDraft ? (
          <div className="flex items-center gap-2">
            <button onClick={cancelEdit} className="font-mono text-[10px] font-semibold px-3 py-1.5 rounded cursor-pointer" style={{ background: "var(--card)", color: "var(--text2)", border: "1px solid var(--border)" }}>
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="font-mono text-[10px] font-semibold px-3 py-1.5 rounded cursor-pointer disabled:opacity-50"
              style={{ background: "var(--orange)", color: "#fff" }}
            >
              {savingEdit ? "Saving…" : "💾 Save Edits"}
            </button>
            {editSaved && <span className="font-mono text-[10px]" style={{ color: "var(--green)" }}>✓ Saved</span>}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {roadmap && (
              <button
                onClick={startEdit}
                className="font-mono text-[10px] font-semibold px-3 py-1.5 rounded cursor-pointer"
                style={{ background: "var(--card)", color: "var(--text2)", border: "1px solid var(--border)" }}
              >
                ✏ Edit Nodes
              </button>
            )}
            <button
              onClick={handleGenerate}
              className="font-mono text-[10px] font-semibold px-3 py-1.5 rounded cursor-pointer"
              style={{ background: "var(--orange)", color: "#fff" }}
            >
              🗺 {roadmap ? "Regenerate Roadmap" : "Generate Roadmap"}
            </button>
          </div>
        )}
      </div>

      {editDraft && (
        <p className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>
          Click any node/topic title to rename it, use the dropdowns to change a topic&apos;s kind or which video it
          links to (including adding one where there&apos;s none), and use + Add / 🗑 / ✕ to add or remove nodes and topics.
        </p>
      )}

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
            Generate a detailed, tree-shaped Beginner → Advanced roadmap for this project — shown on the public project page.
          </div>
        )
      ) : (
        <RoadmapView
          roadmap={editDraft ?? roadmap}
          trackProgress={false}
          editable={!!editDraft}
          videoOptions={videoOptions}
          onEdit={editDraft ? setEditDraft : undefined}
        />
      )}
    </div>
  );
}
