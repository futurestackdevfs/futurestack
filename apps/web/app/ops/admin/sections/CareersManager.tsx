"use client";

import { useCallback, useEffect, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";

interface JobPosting {
  id: string;
  title: string;
  duration: string;
  description: string | null;
  requirements: string | null;
  skills: string | null;
  createdAt: string;
}

interface CareersManagerProps {
  token: string;
}

export default function CareersManager({ token }: CareersManagerProps) {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [skills, setSkills] = useState("");
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "danger" }[]>([]);

  function addToast(msg: string, type: "success" | "danger" = "success") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await opsFetch("/api/admin/careers/jobs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load job postings");
      const data = (await res.json()) as JobPosting[];
      setJobs(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : "Failed to load job postings", "danger");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setDuration("");
    setDescription("");
    setRequirements("");
    setSkills("");
  }

  function startEdit(job: JobPosting) {
    setEditingId(job.id);
    setTitle(job.title);
    setDuration(job.duration);
    setDescription(job.description ?? "");
    setRequirements(job.requirements ?? "");
    setSkills(job.skills ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handlePost() {
    if (!title.trim() || !duration.trim()) {
      addToast("Title and duration are required", "danger");
      return;
    }
    setPosting(true);
    try {
      const editing = editingId !== null;
      const res = await opsFetch(
        editing ? `/api/admin/careers/jobs/${editingId}` : "/api/admin/careers/jobs",
        {
          method: editing ? "PATCH" : "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            title: title.trim(),
            duration: duration.trim(),
            // On edit, send "" so a cleared field is actually cleared server-side.
            description: editing ? description.trim() : description.trim() || undefined,
            requirements: editing ? requirements.trim() : requirements.trim() || undefined,
            skills: editing ? skills.trim() : skills.trim() || undefined,
          }),
        },
      );
      if (!res.ok) throw new Error(editing ? "Failed to update job" : "Failed to post job");
      resetForm();
      await load();
      addToast(editing ? "Job posting updated" : "Job posting created");
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : "Failed to post job", "danger");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(job: JobPosting) {
    if (!window.confirm(`Delete job posting "${job.title}"? This cannot be undone.`)) return;
    setDeletingId(job.id);
    try {
      const res = await opsFetch(`/api/admin/careers/jobs/${job.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete job posting");
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      addToast("Job posting deleted");
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : "Failed to delete job posting", "danger");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="text-[12.5px] font-extrabold mb-3" style={{ color: "var(--text)" }}>
          {editingId ? "✏️ Edit job posting" : "🧑‍💼 Post a new opening"}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block font-mono text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Full Stack Trainer"
              disabled={posting}
              className="w-full text-[12px] px-2.5 py-1.5 rounded outline-none disabled:opacity-60"
              style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
            />
          </div>
          <div>
            <label className="block font-mono text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>
              Duration / Type
            </label>
            <input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. Full-time, 3-month internship"
              disabled={posting}
              className="w-full text-[12px] px-2.5 py-1.5 rounded outline-none disabled:opacity-60"
              style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
            />
          </div>
        </div>
        <div className="mb-3">
          <label className="block font-mono text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Role responsibilities..."
            disabled={posting}
            rows={3}
            className="w-full text-[12px] px-2.5 py-1.5 rounded outline-none resize-vertical disabled:opacity-60"
            style={{ fontFamily: "'JetBrains Mono', monospace", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
          />
        </div>
        <div className="mb-3">
          <label className="block font-mono text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>
            Requirements (optional)
          </label>
          <textarea
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder="e.g. 3+ years of Node.js experience, prior teaching experience..."
            disabled={posting}
            rows={3}
            className="w-full text-[12px] px-2.5 py-1.5 rounded outline-none resize-vertical disabled:opacity-60"
            style={{ fontFamily: "'JetBrains Mono', monospace", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
          />
        </div>
        <div className="mb-3">
          <label className="block font-mono text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>
            Skills (optional)
          </label>
          <input
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="e.g. TypeScript, PostgreSQL, Docker"
            disabled={posting}
            className="w-full text-[12px] px-2.5 py-1.5 rounded outline-none disabled:opacity-60"
            style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePost}
            disabled={posting}
            className="px-4 py-2 rounded-lg text-[12px] font-semibold text-white disabled:opacity-60 disabled:cursor-default cursor-pointer"
            style={{ background: "var(--orange)" }}
          >
            {posting ? (editingId ? "Saving…" : "Posting…") : editingId ? "Save Changes" : "Post Job"}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              disabled={posting}
              className="px-4 py-2 rounded-lg text-[12px] font-semibold cursor-pointer disabled:opacity-60"
              style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--panel)" }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div>
        <div className="text-[12.5px] font-extrabold mb-2" style={{ color: "var(--text)" }}>
          Open Positions ({jobs.length})
        </div>
        {loading ? (
          <div className="p-8 text-center font-mono text-[11px]" style={{ color: "var(--text3)" }}>
            Loading job postings...
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl p-8 text-center font-mono text-[11px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text3)" }}>
            No open positions yet — use the form above to post one.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-xl p-3.5 flex items-start justify-between gap-3"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12.5px] font-extrabold" style={{ color: "var(--text)" }}>
                      {job.title}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full font-mono text-[9px] font-bold"
                      style={{ background: "var(--blue-d)", color: "var(--blue)" }}
                    >
                      {job.duration}
                    </span>
                  </div>
                  {job.description && (
                    <div className="text-[11.5px] leading-relaxed" style={{ color: "var(--text2)" }}>
                      {job.description}
                    </div>
                  )}
                  {job.requirements && (
                    <div className="text-[11px] leading-relaxed mt-1.5" style={{ color: "var(--text3)" }}>
                      <span className="font-mono text-[9px] font-bold uppercase tracking-wider mr-1.5">Requirements</span>
                      {job.requirements}
                    </div>
                  )}
                  {job.skills && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {job.skills.split(",").map((s) => s.trim()).filter(Boolean).map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded-full font-mono text-[9px] font-bold"
                          style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text2)" }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="font-mono text-[9px] mt-1.5" style={{ color: "var(--text3)" }}>
                    posted {new Date(job.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={() => startEdit(job)}
                  disabled={posting}
                  className="font-mono text-[10.5px] font-semibold px-2.5 py-1 rounded cursor-pointer disabled:opacity-60"
                  style={{ border: "1px solid var(--border)", color: "var(--blue)", background: "var(--panel)" }}
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(job)}
                  disabled={deletingId === job.id}
                  className="font-mono text-[10.5px] font-semibold px-2.5 py-1 rounded cursor-pointer disabled:opacity-60"
                  style={{ border: "1px solid var(--border)", color: "var(--red)", background: "var(--panel)" }}
                >
                  🗑 {deletingId === job.id ? "Deleting…" : "Delete"}
                </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-9 right-4 flex flex-col gap-2 z-[300]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded text-[11.5px] font-semibold min-w-[220px]"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 8px 24px rgba(0,0,0,.18)",
              color: "var(--text)",
              borderLeft: `3px solid ${t.type === "success" ? "var(--green)" : "var(--red)"}`,
              animation: "toast-in .2s ease",
            }}
          >
            <span style={{ fontSize: 13 }}>{t.type === "success" ? "✓" : "✕"}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
