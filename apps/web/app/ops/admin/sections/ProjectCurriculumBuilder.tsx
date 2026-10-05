"use client";

import { useState, useEffect, useCallback } from "react";
import { VideoUploadDialog } from "./VideoUploadDialog";
import { ConfirmDialog, type ConfirmOptions } from "./ConfirmDialog";
import { VideoPreviewModal } from "./VideoPreviewModal";

type VideoStatus = "UPLOADING" | "PROCESSING" | "READY" | "FAILED";

interface CurriculumVideo {
  id: string;
  title: string;
  vdoCipherId: string;
  durationSeconds: number;
  isPreview: boolean;
  videoStatus?: VideoStatus;
}

interface CurriculumItem {
  id: string;
  week: string;
  title: string;
  desc: string;
  videos: CurriculumVideo[];
}

interface ProjectCurriculumBuilderProps {
  open: boolean;
  projectId: string;
  projectName: string;
  token: string;
  onSave: () => void;
  onClose: () => void;
  embedded?: boolean;
}

let tempCounter = 0;
function nextTempId() {
  return `new_${--tempCounter}`;
}

export function ProjectCurriculumBuilder({
  open,
  projectId,
  projectName,
  token,
  onSave,
  onClose,
  embedded = false,
}: ProjectCurriculumBuilderProps) {
  const [items, setItems] = useState<CurriculumItem[]>([]);
  const [originalItems, setOriginalItems] = useState<CurriculumItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Video upload state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<{ itemId: string; videoId: string } | null>(null);

  // In-app confirm dialog — a native window.confirm() is unreliable inside
  // this admin shell (can be silently suppressed/auto-dismissed depending on
  // how the page is hosted), which was swallowing the Save click entirely.
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const [previewVideo, setPreviewVideo] = useState<{ id: string; title: string } | null>(null);
  function askConfirm(opts: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => setConfirmState({ ...opts, resolve }));
  }
  function resolveConfirm(ok: boolean) {
    confirmState?.resolve(ok);
    setConfirmState(null);
  }

  // Merges one video's fresh server state into the matching item in place —
  // used instead of a full-project refetch after an upload so other unsaved
  // local edits (new sections/videos not yet Saved) don't get wiped out from
  // under the admin by a wholesale state replace.
  function mergeVideoIntoItem(itemId: string, oldVideoId: string, fresh: Partial<CurriculumVideo> & { id: string }) {
    const apply = (list: CurriculumItem[]) => list.map((item) => {
      if (item.id !== itemId) return item;
      const prevVideo = item.videos.find((v) => v.id === oldVideoId);
      const merged: CurriculumVideo = {
        id: fresh.id,
        title: fresh.title ?? prevVideo?.title ?? "",
        vdoCipherId: fresh.vdoCipherId ?? prevVideo?.vdoCipherId ?? "",
        durationSeconds: fresh.durationSeconds ?? prevVideo?.durationSeconds ?? 0,
        isPreview: prevVideo?.isPreview ?? false,
        videoStatus: fresh.videoStatus ?? prevVideo?.videoStatus,
      };
      const withoutOld = item.videos.filter((v) => v.id !== oldVideoId && v.id !== fresh.id);
      const oldIndex = item.videos.findIndex((v) => v.id === oldVideoId);
      const videos = [...withoutOld];
      videos.splice(oldIndex === -1 ? videos.length : oldIndex, 0, merged);
      // Keep state order itself (not just the render) consistent with "preview
      // always first" — don't rely solely on the display-time sort.
      videos.sort((a, b) => (a.isPreview !== b.isPreview ? (a.isPreview ? -1 : 1) : 0));
      return { ...item, videos };
    });
    setItems(apply);
    setOriginalItems(apply);
  }

  // Polls a just-uploaded video's status until VdoCipher finishes processing
  // (or gives up), updating it in place so the Preview button appears as
  // soon as it's actually ready — without needing to close and reopen.
  function pollVideoStatus(itemId: string, videoId: string, attempt = 0) {
    if (!token || attempt > 60) return;
    setTimeout(async () => {
      try {
        const res = await fetch(`/api/projects/curriculum/videos/${videoId}/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const v = await res.json();
          mergeVideoIntoItem(itemId, videoId, v);
          if (v.videoStatus === "UPLOADING" || v.videoStatus === "PROCESSING") {
            pollVideoStatus(itemId, videoId, attempt + 1);
          }
        }
      } catch {}
    }, 5000);
  }

  // Load curriculum on open
  useEffect(() => {
    if (!open || !projectId || !token) return;
    setLoading(true);
    setFetchError(null);

    fetch(`/api/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const raw: any[] = data.curriculum || [];
        const mapped: CurriculumItem[] = raw
          .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
          .map((c: any) => ({
            id: c.id,
            week: c.week || "",
            title: c.title || "",
            desc: c.desc || "",
            videos: (c.videos || [])
              .sort((v: any, w: any) => (v.isPreview !== w.isPreview ? (v.isPreview ? -1 : 1) : (v.order ?? 0) - (w.order ?? 0)))
              .map((v: any) => ({
                id: v.id,
                title: v.title || "",
                vdoCipherId: v.vdoCipherId || "",
                durationSeconds: v.durationSeconds ?? 0,
                isPreview: v.isPreview ?? false,
                videoStatus: v.videoStatus ?? "READY",
              })),
          }));
        setItems(mapped);
        setOriginalItems(JSON.parse(JSON.stringify(mapped)));
      })
      .catch((e) => setFetchError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [open, projectId, token]);

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [saving, onClose]);

  // Auto-generate week labels
  function renumberWeeks() {
    setItems((prev) =>
      prev.map((item, i) => ({
        ...item,
        week: item.week.match(/^Week\s+\d+/i) ? `Week ${i + 1}` : item.week,
      }))
    );
  }

  // Add new curriculum item
  function addItem() {
    const newItem: CurriculumItem = {
      id: nextTempId(),
      week: `Week ${items.length + 1}`,
      title: "",
      desc: "",
      videos: [],
    };
    setItems((prev) => [...prev, newItem]);
  }

  // Remove curriculum item — persisted immediately on confirm, not left
  // waiting for the Save button (only a never-saved, local-only item has
  // nothing to delete server-side).
  async function removeItem(id: string) {
    const ok = await askConfirm({
      title: "Delete Section?",
      message: "Delete this section and ALL its videos?\nThis cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
    setOriginalItems((prev) => prev.filter((item) => item.id !== id));
    setTimeout(renumberWeeks, 0);
    if (!id.startsWith("new_") && token) {
      try {
        await fetch(`/api/projects/curriculum/sections/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
  }

  // Update curriculum item field
  function updateItem(id: string, field: keyof CurriculumItem, value: any) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  // ── Video management ──

  function addVideo(itemId: string) {
    const newVideo: CurriculumVideo = {
      id: nextTempId(),
      title: "New Video",
      vdoCipherId: "",
      durationSeconds: 0,
      isPreview: false,
    };
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, videos: [...item.videos, newVideo] }
          : item
      )
    );
  }

  // Slim "+ Add Preview Video" control: drops a single auto-preview video,
  // pinned first in the first week — creating one if none exist yet. Only
  // one preview video is allowed across the whole curriculum, so the button
  // that calls this disappears once any video has isPreview: true.
  function addPreviewVideo() {
    const newVideo: CurriculumVideo = {
      id: nextTempId(),
      title: "Free Preview Video",
      vdoCipherId: "",
      durationSeconds: 0,
      isPreview: true,
    };
    setItems((prev) => {
      if (prev.length === 0) {
        return [{ id: nextTempId(), week: "Week 1", title: "", desc: "", videos: [newVideo] }];
      }
      return prev.map((item, i) => (i === 0 ? { ...item, videos: [newVideo, ...item.videos] } : item));
    });
  }

  // Persisted immediately on confirm, not left waiting for the Save button
  // (only a never-saved, local-only video has nothing to delete server-side).
  async function removeVideo(itemId: string, videoId: string) {
    const ok = await askConfirm({
      title: "Delete Video?",
      message: "Are you sure you want to remove this video?\nThis cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    const strip = (list: CurriculumItem[]) => list.map((item) =>
      item.id === itemId ? { ...item, videos: item.videos.filter((v) => v.id !== videoId) } : item
    );
    setItems(strip);
    setOriginalItems(strip);
    if (!videoId.startsWith("new_") && token) {
      try {
        await fetch(`/api/projects/curriculum/videos/${videoId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
  }

  function updateVideo(itemId: string, videoId: string, field: keyof CurriculumVideo, value: any) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              videos: item.videos.map((v) =>
                v.id === videoId ? { ...v, [field]: value } : v
              ),
            }
          : item
      )
    );
  }

  // If the week/section is still a local-only placeholder (temp id, never
  // saved), the upload-credentials endpoint's `curriculumId` lookup 404s
  // because that row doesn't exist in the DB yet. Create the section first
  // so upload gets a real id — mirrors the same fix in CurriculumBuilder
  // (courses) for the identical issue.
  async function openUploadDialog(itemId: string, videoId: string) {
    let targetItemId = itemId;
    if (itemId.startsWith("new_") && token) {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;
      try {
        const res = await fetch(`/api/projects/${projectId}/curriculum/sections`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ week: item.week, title: item.title, desc: item.desc }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const created = await res.json();
        const realId = created.id;
        setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, id: realId } : i)));
        targetItemId = realId;
      } catch (e: any) {
        alert(e.message || "Failed to prepare section for upload");
        return;
      }
    }
    setUploadTarget({ itemId: targetItemId, videoId });
    setUploadDialogOpen(true);
  }

  // Drag handlers
  function handleDragStart(index: number) {
    setDragIndex(index);
  }
  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDragIndex(index);
  }
  function handleDragEnd() {
    setDragIndex(null);
    setTimeout(renumberWeeks, 0);
  }

  // Check if dirty
  const isDirty = JSON.stringify(items) !== JSON.stringify(originalItems);

  // Save
  async function handleSave() {
    if (!token) return;
    // Nothing pending — e.g. a video finished uploading and its own
    // upload-credentials call already persisted it, so items/originalItems
    // resynced and there's no curriculum diff left. Just close instead of
    // silently no-oping (isDirty being false here doesn't mean unsaved work).
    if (!isDirty) { onSave(); return; }
    const ok = await askConfirm({
      title: "Save Curriculum?",
      message: "Save changes to this project's curriculum?",
      confirmLabel: "Save",
      cancelLabel: "Cancel",
    });
    if (!ok) return;
    setSaving(true);
    try {
      // Save curriculum
      const payload = {
        items: items.map((item) => ({
          week: item.week,
          title: item.title,
          desc: item.desc,
          videos: item.videos.map((v) => ({
            title: v.title,
            vdoCipherId: v.vdoCipherId || undefined,
            durationSeconds: v.durationSeconds || undefined,
            isPreview: v.isPreview,
          })),
        })),
      };
      const res = await fetch(`/api/projects/${projectId}/curriculum`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      onSave();
    } catch (e: any) {
      alert(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const bodyAndFooter = (
    <>
      {/* Body */}
      <div className="p-4 overflow-y-auto flex-1">
        {loading ? (
          <div
            className="text-center py-8 font-mono text-[11px]"
            style={{ color: "var(--text3)" }}
          >
            Loading curriculum...
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <div className="font-mono text-[11px]" style={{ color: "var(--red)" }}>
              ✕ {fetchError}
            </div>
            <button
              onClick={() => {
                setFetchError(null);
                setLoading(true);
                fetch(`/api/projects/${projectId}`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                  .then((r) => r.json())
                  .then((data) => {
                    const raw: any[] = data.curriculum || [];
                    const mapped: CurriculumItem[] = raw
                      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
                      .map((c: any) => ({
                        id: c.id,
                        week: c.week || "",
                        title: c.title || "",
                        desc: c.desc || "",
                        videos: (c.videos || [])
                          .sort((v: any, w: any) => (v.isPreview !== w.isPreview ? (v.isPreview ? -1 : 1) : (v.order ?? 0) - (w.order ?? 0)))
                          .map((v: any) => ({
                            id: v.id,
                            title: v.title || "",
                            vdoCipherId: v.vdoCipherId || "",
                            durationSeconds: v.durationSeconds ?? 0,
                            isPreview: v.isPreview ?? false,
                videoStatus: v.videoStatus ?? "READY",
                          })),
                      }));
                    setItems(mapped);
                    setOriginalItems(JSON.parse(JSON.stringify(mapped)));
                  })
                  .catch((e) => setFetchError(e.message))
                  .finally(() => setLoading(false));
              }}
              className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded cursor-pointer"
              style={{
                border: "1px solid var(--border)",
                color: "var(--btn-text, var(--text2))",
                background: "var(--btn-bg, var(--surface))",
              }}
            >
              ↻ Retry
            </button>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>
                {items.length} week{items.length !== 1 ? "s" : ""} ·{" "}
                {items.reduce((sum, i) => sum + i.videos.length, 0)} videos
                {isDirty && (
                  <span className="ml-2" style={{ color: "var(--orange)" }}>
                    ● unsaved
                  </span>
                )}
              </div>
            </div>

            {/* Add Preview Video — slim, disappears once a preview video exists */}
            {!items.some((item) => item.videos.some((v) => v.isPreview)) && (
              <button
                onClick={addPreviewVideo}
                title="Adds a single video pinned first in the curriculum, playable publicly without login or enrollment."
                className="font-mono text-[10px] font-semibold inline-flex items-center gap-1 py-1 mb-2 cursor-pointer"
                style={{ color: "var(--btn-text, var(--green))", background: "var(--btn-bg, transparent)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "none"; }}
              >
                🎬 + Add Preview Video
              </button>
            )}

            {/* Items list */}
            {items.length === 0 ? (
              <div className="text-center py-8 font-mono text-[11px]" style={{ color: "var(--text3)" }}>
                No curriculum items yet. Click &quot;+ Add Section / Week&quot; below to start.
              </div>
            ) : (
              items.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className="rounded mb-2.5 overflow-hidden"
                  style={{ border: "1px solid var(--border)", opacity: dragIndex === index ? 0.5 : 1 }}
                >
                  {/* Section head */}
                  <div className="flex items-center gap-2 px-3 py-2" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
                    <span className="cursor-grab text-[11px] select-none shrink-0" style={{ color: "var(--text3)" }} title="Drag to reorder">⠿</span>
                    <span className="font-mono text-[9px] font-bold shrink-0" style={{ color: "var(--orange)", width: 22 }}>{String(index + 1).padStart(2, "0")}</span>
                    <input
                      value={item.week}
                      onChange={(e) => updateItem(item.id, "week", e.target.value)}
                      placeholder="Week 1"
                      className="font-mono text-[11px] font-bold rounded px-1.5 py-0.5 outline-none w-[90px] shrink-0"
                      style={{ color: "var(--text)", background: "transparent", border: "1px solid transparent" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                    />
                    <input
                      value={item.title}
                      onChange={(e) => updateItem(item.id, "title", e.target.value)}
                      placeholder="Title (e.g. Project setup & data modeling)"
                      className="flex-1 text-[12px] font-bold rounded px-1.5 py-0.5 outline-none min-w-0"
                      style={{ color: "var(--text)", background: "transparent", border: "1px solid transparent" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                    />
                    <span className="font-mono text-[9px]" style={{ color: "var(--text3)", whiteSpace: "nowrap" }}>
                      {item.videos.length} video{item.videos.length !== 1 ? "s" : ""}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => removeItem(item.id)}
                        className="flex items-center justify-center w-[20px] h-[20px] rounded text-[10px] cursor-pointer"
                        style={{ color: "var(--btn-text, var(--text3))", background: "var(--btn-bg, transparent)" }} title="Remove Section"
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--btn-text, var(--red))"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--btn-text, var(--text3))"; }}>🗑</button>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="px-3 pt-1.5">
                    <textarea
                      value={item.desc}
                      onChange={(e) => updateItem(item.id, "desc", e.target.value)}
                      placeholder="Description of what's covered this week..."
                      rows={2}
                      className="w-full text-[11px] px-1.5 py-1 rounded outline-none resize-none"
                      style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text2)" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--orange)"; e.currentTarget.style.background = "var(--surface)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg)"; }}
                    />
                  </div>

                  {/* Videos */}
                  <div className="px-3 py-1.5">
                    {item.videos.length === 0 ? (
                      <div className="text-center py-3 font-mono text-[10px]" style={{ color: "var(--text3)" }}>No videos yet</div>
                    ) : (
                      [...item.videos]
                        .sort((a, b) => a.isPreview !== b.isPreview ? (a.isPreview ? -1 : 1) : 0)
                        .map((video, vi) => {
                        const isPlaceholder = !video.vdoCipherId;
                        const vStatus = video.videoStatus ?? "READY";
                        const uploadLabel = isPlaceholder
                          ? "📤 Upload"
                          : vStatus === "UPLOADING" ? "⏳ Uploading…"
                          : vStatus === "PROCESSING" ? "⚙️ Processing…"
                          : vStatus === "FAILED" ? "⚠️ Retry Upload"
                          : "🔁 Replace";
                        const uploadDisabled = !isPlaceholder && (vStatus === "UPLOADING" || vStatus === "PROCESSING");
                        return (
                      <div key={video.id}>
                          <div className="grid gap-2 items-center py-1 px-1.5 rounded" style={video.isPreview
                            ? { gridTemplateColumns: "24px 1.6fr auto auto 28px", background: "var(--green-d, rgba(34,197,94,.1))", border: "1px solid rgba(34,197,94,.3)" }
                            : { gridTemplateColumns: "24px 1.6fr auto auto 28px" }}>
                            <span className="font-mono text-[9px] text-center" style={{ color: "var(--text3)" }}>{vi + 1}</span>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <input
                                value={video.title}
                                onChange={(e) => updateVideo(item.id, video.id, "title", e.target.value)}
                                className="flex-1 min-w-0 text-[11px] px-1.5 py-1 rounded outline-none"
                                style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--orange)"; e.currentTarget.style.background = "var(--surface)"; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg)"; }}
                                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                                placeholder="Lesson name"
                              />
                              {video.isPreview && (
                                <span
                                  className="shrink-0 font-mono text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                                  style={{ color: "var(--green)", background: "var(--green-d, rgba(34,197,94,.12))", border: "1px solid rgba(34,197,94,.3)" }}
                                  title="Playable publicly, without login or enrollment — this is always the first video and cannot be changed."
                                >
                                  🎬 Free Preview
                                </span>
                              )}
                            </div>
                            <button
                              disabled={uploadDisabled}
                              onClick={() => openUploadDialog(item.id, video.id)}
                              className="font-mono text-[9px] font-semibold px-2.5 py-1 rounded cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ background: "var(--btn-bg, var(--orange-d))", color: "var(--btn-text, var(--orange))", border: "1px solid var(--btn-bg, rgba(240,90,26,.2))" }}
                              onMouseEnter={(e) => { if (uploadDisabled) return; (e.currentTarget as HTMLElement).style.background = "var(--btn-bg-hover, var(--orange))"; (e.currentTarget as HTMLElement).style.color = "var(--btn-text, #fff)"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--btn-bg, var(--orange-d))"; (e.currentTarget as HTMLElement).style.color = "var(--btn-text, var(--orange))"; }}
                            >{uploadLabel}</button>
                            {!isPlaceholder && vStatus === "READY" ? (
                              <button
                                onClick={() => setPreviewVideo({ id: video.id, title: video.title })}
                                className="font-mono text-[9px] font-semibold px-2.5 py-1 rounded cursor-pointer whitespace-nowrap"
                                style={{ background: "var(--btn-bg, var(--blue-d))", color: "var(--btn-text, var(--blue))", border: "1px solid var(--btn-bg, rgba(37,99,235,.2))" }}
                              >▶ Preview</button>
                            ) : (
                              <span className="font-mono text-[9px] px-2.5 py-1" />
                            )}
                            <button onClick={() => removeVideo(item.id, video.id)}
                              className="flex items-center justify-center text-[10px] cursor-pointer"
                              style={{ color: "var(--btn-text, var(--text3))", background: "var(--btn-bg, transparent)" }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--btn-text, var(--red))"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--btn-text, var(--text3))"; }}
                              title="Remove Lesson">🗑</button>
                          </div>
                          {video.isPreview && (
                            <div className="font-mono text-[9px] px-1.5 pb-1" style={{ color: "var(--green)" }}>
                              ⓘ This video is visible to everyone — playable publicly, without login or enrollment.
                            </div>
                          )}
                        </div>
                        );
                      })
                    )}
                    <div className="flex gap-2 mt-1.5">
                      <button onClick={() => addVideo(item.id)}
                        className="font-mono text-[10px] font-semibold inline-flex items-center gap-1 py-1 cursor-pointer"
                        style={{ color: "var(--btn-text, var(--green))", background: "var(--btn-bg, transparent)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "none"; }}>+ Add Video</button>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Add Section */}
            <button onClick={addItem}
              className="w-full py-2.5 rounded font-mono text-[11px] font-semibold text-center cursor-pointer"
              style={{ border: "1.5px dashed var(--btn-bg, var(--border2))", color: "var(--btn-text, var(--text3))", background: "var(--btn-bg, var(--panel))" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--btn-bg-hover, var(--orange))"; (e.currentTarget as HTMLElement).style.color = "var(--btn-text, var(--orange))"; (e.currentTarget as HTMLElement).style.background = "var(--btn-bg-hover, var(--orange-d))"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--btn-bg, var(--border2))"; (e.currentTarget as HTMLElement).style.color = "var(--btn-text, var(--text3))"; (e.currentTarget as HTMLElement).style.background = "var(--btn-bg, var(--panel))"; }}
            >+ Add Section / Week</button>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 px-4 py-3 shrink-0" style={{ borderTop: "1px solid var(--border)", background: "var(--panel)" }}>
        <button
          onClick={handleClose}
          disabled={saving}
          className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer disabled:opacity-40"
          style={{ border: "1px solid var(--border)", color: "var(--btn-text, var(--text2))", background: "var(--btn-bg, var(--surface))" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
        >Close</button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer disabled:opacity-40"
          style={{ background: "var(--btn-bg, var(--orange))", color: "var(--btn-text, #fff)", border: "1px solid var(--btn-bg, var(--orange))" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
        >{saving ? "Saving..." : "💾 Save Curriculum"}</button>
      </div>
    </>
  );

  const extras = (
    <>
      {/* Video Upload Dialog */}
      {uploadTarget && (
        <VideoUploadDialog
          isOpen={uploadDialogOpen}
          onClose={() => {
            setUploadDialogOpen(false);
            setUploadTarget(null);
          }}
          sectionId={uploadTarget.itemId}
          token={token}
          initialTitle={items
            .find((i) => i.id === uploadTarget.itemId)
            ?.videos.find((v) => v.id === uploadTarget.videoId)?.title || ""}
          uploadEndpoint={`/api/projects/${projectId}/curriculum/videos/upload-credentials`}
          uploadBody={{
            curriculumId: uploadTarget.itemId,
            title: items
              .find((i) => i.id === uploadTarget.itemId)
              ?.videos.find((v) => v.id === uploadTarget.videoId)?.title || "",
            filename: "",
            contentType: "",
            ...(uploadTarget.videoId && !uploadTarget.videoId.startsWith("new_") ? { videoId: uploadTarget.videoId } : {}),
          }}
          onUpload={async (_file: any, _metadata: any, videoId: string) => {
            // Merge just this one video's real server state into its item in
            // place — a full-project refetch here would wipe out any other
            // local edits (new sections/videos) not yet Saved.
            const { itemId, videoId: oldVideoId } = uploadTarget;
            // The upload-credentials endpoint creates the real
            // ProjectCurriculumVideo row itself, completely bypassing
            // projects.service's isPreview logic — it always comes back
            // isPreview:false. If the local placeholder had been flagged as a
            // preview, carry that over now with an explicit PATCH (this also
            // forces it to the front and clears any other preview), since
            // this is the only place that ever learns the real video id.
            const wasPreview = !!items
              .find((i) => i.id === itemId)
              ?.videos.find((v) => v.id === oldVideoId)?.isPreview;
            if (wasPreview) {
              try { await fetch(`/api/projects/curriculum/videos/${videoId}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ isPreview: true }) }); } catch {}
            }
            try {
              const res = await fetch(`/api/projects/curriculum/videos/${videoId}/status`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const v = await res.json();
                mergeVideoIntoItem(itemId, oldVideoId, v);
                if (v.videoStatus === "UPLOADING" || v.videoStatus === "PROCESSING") {
                  pollVideoStatus(itemId, videoId);
                }
              }
            } catch {}
            return { videoId: "", vdoCipherId: "" };
          }}
        />
      )}

      {/* Video Preview */}
      {previewVideo && (
        <VideoPreviewModal
          videoId={previewVideo.id}
          title={previewVideo.title}
          onClose={() => setPreviewVideo(null)}
          otpEndpoint={`/api/projects/curriculum/videos/${previewVideo.id}/preview-otp`}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmLabel={confirmState?.confirmLabel}
        cancelLabel={confirmState?.cancelLabel}
        danger={confirmState?.danger}
        onConfirm={() => resolveConfirm(true)}
        onCancel={() => resolveConfirm(false)}
      />
    </>
  );

  if (embedded) {
    return (
      <>
        {bodyAndFooter}
        {extras}
      </>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ background: "var(--overlay)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="flex flex-col rounded-lg max-w-full h-[88vh]"
        style={{
          width: 1080,
          maxWidth: "96vw",
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
          <div
            className="flex items-center gap-2 text-[13.5px] font-extrabold"
            style={{ color: "var(--text)" }}
          >
            <span
              className="w-[26px] h-[26px] rounded flex items-center justify-center text-[13px]"
              style={{ background: "var(--orange-d)", color: "var(--orange)" }}
            >
              📋
            </span>
            Project Curriculum
            {projectName ? (
              <span style={{ fontWeight: 400, color: "var(--text3)" }}>
                {" "}— {projectName}
              </span>
            ) : (
              ""
            )}
          </div>
          <button
            onClick={handleClose}
            className="flex items-center justify-center w-6 h-6 rounded text-[14px] cursor-pointer"
            style={{
              color: "var(--btn-text, var(--text3))",
              background: "var(--btn-bg, transparent)",
            }}
          >
            ✕
          </button>
        </div>

        {bodyAndFooter}
      </div>

      {extras}
    </div>
  );
}
