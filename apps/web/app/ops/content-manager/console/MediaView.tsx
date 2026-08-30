"use client";

import { useCallback, useEffect, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { Panel, Th, Td, ViewHeader } from "../../sales/sections/ui";

interface VideoRecord {
  id: string;
  title: string;
  sectionTitle: string;
  courseTitle: string;
  videoStatus: string;
  durationSeconds: number | null;
  createdAt: string;
}

function fmtDuration(secs: number | null): string {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function videoStatusBadge(status: string) {
  switch (status) {
    case "READY": return { fg: "var(--green)", bg: "var(--green-d)" };
    case "UPLOADING": return { fg: "var(--blue)", bg: "var(--blue-d)" };
    case "PROCESSING": return { fg: "var(--amber)", bg: "var(--amber-d)" };
    case "FAILED": return { fg: "var(--red)", bg: "var(--red-d)" };
    default: return { fg: "var(--text3)", bg: "var(--panel)" };
  }
}

export default function MediaView({ refreshSignal, onToast }: {
  refreshSignal?: number;
  onToast: (msg: string, type?: "success" | "danger") => void;
}) {
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    opsFetch("/api/courses").then((r) => r.ok ? r.json() : []).then((data) => {
      setCourses(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, [refreshSignal]);

  const loadVideos = useCallback(async (courseId: string) => {
    if (!courseId) { setVideos([]); return; }
    setLoading(true);
    try {
      const r = await opsFetch(`/api/courses/${courseId}`);
      if (!r.ok) throw new Error("Failed to load");
      const data = await r.json();
      const vids: VideoRecord[] = [];
      for (const section of data.sections ?? []) {
        for (const v of section.videos ?? []) {
          vids.push({
            id: v.id,
            title: v.title,
            sectionTitle: section.title,
            courseTitle: data.title,
            videoStatus: v.videoStatus,
            durationSeconds: v.durationSeconds,
            createdAt: v.createdAt ?? new Date().toISOString(),
          });
        }
      }
      setVideos(vids);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Failed to load media", "danger");
    } finally { setLoading(false); }
  }, [onToast]);

  useEffect(() => { loadVideos(selectedCourseId); }, [selectedCourseId, loadVideos, refreshSignal]);

  async function handleRefresh() {
    if (!selectedCourseId) return;
    setPolling(true);
    await loadVideos(selectedCourseId);
    setPolling(false);
    onToast("Media status refreshed", "success");
  }

  const counts = {
    total: videos.length,
    ready: videos.filter((v) => v.videoStatus === "READY").length,
    processing: videos.filter((v) => v.videoStatus === "PROCESSING").length,
    uploading: videos.filter((v) => v.videoStatus === "UPLOADING").length,
    failed: videos.filter((v) => v.videoStatus === "FAILED").length,
  };

  return (
    <div className="p-4 pb-7">
      <ViewHeader
        icon="🎬"
        title="Media"
        meta={selectedCourseId ? `${counts.total} VIDEOS` : "SELECT A COURSE"}
        action={selectedCourseId ? (
          <button onClick={handleRefresh} disabled={polling}
            className="font-mono text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer disabled:opacity-50"
            style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}>
            {polling ? "REFRESHING…" : "↻ REFRESH STATUS"}
          </button>
        ) : undefined}
      />

      {/* Course Selector */}
      <div className="rounded p-3 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="font-mono text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text3)" }}>Select Course</div>
        <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)}
          className="w-full font-mono text-[11px] px-2.5 py-1.5 rounded outline-none"
          style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}>
          <option value="">— Choose a course —</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {/* Status Summary */}
      {selectedCourseId && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "Ready", value: counts.ready, color: "var(--green)" },
            { label: "Processing", value: counts.processing, color: "var(--amber)" },
            { label: "Uploading", value: counts.uploading, color: "var(--blue)" },
            { label: "Failed", value: counts.failed, color: "var(--red)" },
          ].map((item) => (
            <div key={item.label} className="rounded px-3 py-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="font-mono text-[8px] uppercase tracking-wider" style={{ color: "var(--text3)" }}>{item.label}</div>
              <div className="font-mono text-[16px] font-bold" style={{ color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Videos Table */}
      {selectedCourseId && (
        <Panel title="Videos" count={`${videos.length} VIDEOS`}>
          {loading ? (
            <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading…</div>
          ) : videos.length === 0 ? (
            <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>No videos in this course</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>Video</Th>
                    <Th>Section</Th>
                    <Th>Duration</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((v) => {
                    const vs = videoStatusBadge(v.videoStatus);
                    return (
                      <tr key={v.id}>
                        <Td><span className="font-semibold" style={{ color: "var(--text)" }}>{v.title}</span></Td>
                        <Td>{v.sectionTitle}</Td>
                        <Td mono>{fmtDuration(v.durationSeconds)}</Td>
                        <Td>
                          <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: vs.bg, color: vs.fg }}>
                            {v.videoStatus}
                          </span>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
