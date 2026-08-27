"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { VideoUploadDialog } from "./VideoUploadDialog";

interface CurriculumVideo {
  id: string;
  title: string;
  vdoCipherId: string;
  durationSeconds: number;
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
}: ProjectCurriculumBuilderProps) {
  const [demoVideoUrl, setDemoVideoUrl] = useState("");
  const [items, setItems] = useState<CurriculumItem[]>([]);
  const [originalItems, setOriginalItems] = useState<CurriculumItem[]>([]);
  const [originalDemoUrl, setOriginalDemoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Video upload state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<{ itemId: string; videoId: string } | null>(null);

  // Demo video upload state
  const [demoUploading, setDemoUploading] = useState(false);
  const [demoUploadProgress, setDemoUploadProgress] = useState(0);
  const demoFileInputRef = useRef<HTMLInputElement>(null);

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
        setDemoVideoUrl(data.demoVideoUrl || "");
        setOriginalDemoUrl(data.demoVideoUrl || "");
        const raw: any[] = data.curriculum || [];
        const mapped: CurriculumItem[] = raw
          .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
          .map((c: any) => ({
            id: c.id,
            week: c.week || "",
            title: c.title || "",
            desc: c.desc || "",
            videos: (c.videos || [])
              .sort((v: any, w: any) => (v.order ?? 0) - (w.order ?? 0))
              .map((v: any) => ({
                id: v.id,
                title: v.title || "",
                vdoCipherId: v.vdoCipherId || "",
                durationSeconds: v.durationSeconds ?? 0,
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

  // Remove curriculum item
  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setTimeout(renumberWeeks, 0);
  }

  // Update curriculum item field
  function updateItem(id: string, field: keyof CurriculumItem, value: any) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  // Move curriculum item
  function moveItem(fromIndex: number, direction: -1 | 1) {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setTimeout(renumberWeeks, 0);
  }

  // ── Video management ──

  function addVideo(itemId: string) {
    const newVideo: CurriculumVideo = {
      id: nextTempId(),
      title: "New Video",
      vdoCipherId: "",
      durationSeconds: 0,
    };
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, videos: [...item.videos, newVideo] }
          : item
      )
    );
  }

  function removeVideo(itemId: string, videoId: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, videos: item.videos.filter((v) => v.id !== videoId) }
          : item
      )
    );
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

  function moveVideo(itemId: string, fromIndex: number, direction: -1 | 1) {
    const toIndex = fromIndex + direction;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const vids = [...item.videos];
        if (toIndex < 0 || toIndex >= vids.length) return item;
        const [moved] = vids.splice(fromIndex, 1);
        vids.splice(toIndex, 0, moved);
        return { ...item, videos: vids };
      })
    );
  }

  function openUploadDialog(itemId: string, videoId: string) {
    setUploadTarget({ itemId, videoId });
    setUploadDialogOpen(true);
  }

  // ── Demo video upload ──

  async function handleDemoVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setDemoUploading(true);
    setDemoUploadProgress(0);

    try {
      // Step 1: Get upload credentials
      const credRes = await fetch(
        `/api/projects/${projectId}/demo-video/upload-credentials?title=${encodeURIComponent(file.name)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!credRes.ok) {
        throw new Error(`Failed to get upload credentials: ${credRes.status}`);
      }

      const credData = await credRes.json();

      // Step 2: Upload file directly to VdoCipher S3
      const formDataToSend = new FormData();
      Object.entries(credData.uploadCredentials).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formDataToSend.append(key, value as string);
        }
      });
      formDataToSend.append("file", file);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setDemoUploadProgress(percent);
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status === 201) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });
        xhr.addEventListener("error", () => reject(new Error("Upload error")));
        xhr.open("POST", credData.uploadUrl);
        xhr.send(formDataToSend);
      });

      setDemoUploadProgress(100);

      // Step 3: Mark upload complete and save vdoCipherId
      const completeRes = await fetch(`/api/projects/${projectId}/demo-video/complete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ vdoCipherId: credData.vdoCipherId }),
      });

      if (!completeRes.ok) {
        throw new Error("Failed to save demo video");
      }

      const completeData = await completeRes.json();
      // Update local state with the playback URL from backend
      setDemoVideoUrl(completeData.demoVideoUrl);

      // Brief pause so user sees 100%
      await new Promise((r) => setTimeout(r, 600));
    } catch (err: any) {
      alert(err.message || "Failed to upload demo video");
    } finally {
      setDemoUploading(false);
      setDemoUploadProgress(0);
      if (demoFileInputRef.current) {
        demoFileInputRef.current.value = "";
      }
    }
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
  const isDirty =
    JSON.stringify(items) !== JSON.stringify(originalItems) ||
    demoVideoUrl !== originalDemoUrl;

  // Save
  async function handleSave() {
    if (!token || !isDirty) return;
    setSaving(true);
    try {
      // Save demo video URL
      if (demoVideoUrl !== originalDemoUrl) {
        await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ demoVideoUrl: demoVideoUrl || null }),
        });
      }

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

  function formatDuration(seconds: number): string {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ background: "var(--overlay)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="flex flex-col rounded-lg max-w-full max-h-[88vh]"
        style={{
          width: 880,
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
                      setDemoVideoUrl(data.demoVideoUrl || "");
                      setOriginalDemoUrl(data.demoVideoUrl || "");
                      const raw: any[] = data.curriculum || [];
                      const mapped: CurriculumItem[] = raw
                        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
                        .map((c: any) => ({
                          id: c.id,
                          week: c.week || "",
                          title: c.title || "",
                          desc: c.desc || "",
                          videos: (c.videos || [])
                            .sort((v: any, w: any) => (v.order ?? 0) - (w.order ?? 0))
                            .map((v: any) => ({
                              id: v.id,
                              title: v.title || "",
                              vdoCipherId: v.vdoCipherId || "",
                              durationSeconds: v.durationSeconds ?? 0,
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
              {/* Demo Video URL */}
              <div className="mb-4 p-3 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <label className="text-[11px] font-semibold block mb-1.5" style={{ color: "var(--text2)" }}>
                  Demo Video URL (optional)
                </label>
                <div className="flex gap-2">
                  <input
                    value={demoVideoUrl}
                    onChange={(e) => setDemoVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/embed/... or VdoCipher URL"
                    className="flex-1 text-[12px] px-2.5 py-2 rounded"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                  />
                  <input
                    type="file"
                    ref={demoFileInputRef}
                    accept="video/*"
                    onChange={handleDemoVideoUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => demoFileInputRef.current?.click()}
                    disabled={demoUploading}
                    className="font-mono text-[10px] font-semibold px-3 py-2 rounded cursor-pointer disabled:opacity-50 shrink-0"
                    style={{
                      background: demoUploading ? "var(--text3)" : "var(--blue)",
                      color: "#fff",
                      border: "1px solid var(--blue)",
                    }}
                  >
                    {demoUploading ? `${demoUploadProgress}%` : "📤 Upload"}
                  </button>
                </div>
                {demoUploading && (
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${demoUploadProgress}%`,
                        background: "var(--blue)",
                      }}
                    />
                  </div>
                )}
                <p className="text-[10px] mt-1" style={{ color: "var(--text3)" }}>
                  Public demo video shown on the project detail page. Upload or paste URL.
                </p>
              </div>

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
                <button
                  onClick={addItem}
                  className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded cursor-pointer"
                  style={{
                    background: "var(--orange)",
                    color: "#fff",
                    border: "1px solid var(--orange)",
                  }}
                >
                  + Add Week
                </button>
              </div>

              {/* Items list */}
              <div className="flex flex-col gap-3">
                {items.length === 0 && (
                  <div
                    className="text-center py-8 font-mono text-[11px]"
                    style={{ color: "var(--text3)" }}
                  >
                    No curriculum items yet. Click &quot;+ Add Week&quot; to start.
                  </div>
                )}
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className="rounded-lg overflow-hidden"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      opacity: dragIndex === index ? 0.5 : 1,
                    }}
                  >
                    {/* Week header */}
                    <div className="flex gap-2 p-3 items-start">
                      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                        <span
                          className="cursor-grab text-[11px] select-none"
                          style={{ color: "var(--text3)" }}
                          title="Drag to reorder"
                        >
                          ⠿
                        </span>
                        <span
                          className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{
                            background: "var(--orange-d)",
                            color: "var(--orange)",
                          }}
                        >
                          {index + 1}
                        </span>
                      </div>

                      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                        <div className="flex gap-2">
                          <input
                            value={item.week}
                            onChange={(e) => updateItem(item.id, "week", e.target.value)}
                            placeholder="Week 1"
                            className="font-mono text-[11px] font-semibold px-2 py-1.5 rounded w-[100px] shrink-0"
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              color: "var(--text)",
                            }}
                          />
                          <input
                            value={item.title}
                            onChange={(e) => updateItem(item.id, "title", e.target.value)}
                            placeholder="Title (e.g. Project setup & data modeling)"
                            className="text-[12px] font-semibold px-2 py-1.5 rounded flex-1 min-w-0"
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              color: "var(--text)",
                            }}
                          />
                        </div>
                        <textarea
                          value={item.desc}
                          onChange={(e) => updateItem(item.id, "desc", e.target.value)}
                          placeholder="Description of what's covered this week..."
                          rows={2}
                          className="text-[11px] px-2 py-1.5 rounded resize-none"
                          style={{
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            color: "var(--text2)",
                          }}
                        />
                      </div>

                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => moveItem(index, -1)}
                          disabled={index === 0}
                          className="w-5 h-5 flex items-center justify-center rounded text-[10px] cursor-pointer disabled:opacity-30"
                          style={{
                            color: "var(--text3)",
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveItem(index, 1)}
                          disabled={index === items.length - 1}
                          className="w-5 h-5 flex items-center justify-center rounded text-[10px] cursor-pointer disabled:opacity-30"
                          style={{
                            color: "var(--text3)",
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-5 h-5 flex items-center justify-center rounded text-[10px] cursor-pointer"
                          style={{ color: "var(--red)" }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Videos section */}
                    <div
                      className="px-3 pb-3 pt-0 ml-[34px]"
                      style={{ borderTop: "1px solid var(--border)" }}
                    >
                      <div className="flex items-center justify-between mt-2 mb-2">
                        <span className="font-mono text-[9px] font-semibold" style={{ color: "var(--text3)" }}>
                          VIDEOS ({item.videos.length})
                        </span>
                        <button
                          onClick={() => addVideo(item.id)}
                          className="font-mono text-[9px] font-semibold px-2 py-0.5 rounded cursor-pointer"
                          style={{
                            color: "var(--blue)",
                            background: "var(--blue-dim)",
                            border: "1px solid var(--blue)",
                          }}
                        >
                          + Add Video
                        </button>
                      </div>

                      {item.videos.length === 0 ? (
                        <div
                          className="text-center py-3 font-mono text-[10px] rounded"
                          style={{ color: "var(--text3)", background: "var(--surface)", border: "1px dashed var(--border)" }}
                        >
                          No videos yet
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {item.videos.map((video, vi) => (
                            <div
                              key={video.id}
                              className="flex items-center gap-2 px-2 py-1.5 rounded"
                              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                            >
                              <span className="font-mono text-[9px] shrink-0" style={{ color: "var(--text3)" }}>
                                {vi + 1}.
                              </span>
                              <input
                                value={video.title}
                                onChange={(e) => updateVideo(item.id, video.id, "title", e.target.value)}
                                placeholder="Video title"
                                className="text-[11px] px-1.5 py-1 rounded flex-1 min-w-0"
                                style={{
                                  background: "var(--bg)",
                                  border: "1px solid var(--border)",
                                  color: "var(--text)",
                                }}
                              />
                              <span className="font-mono text-[9px] shrink-0" style={{ color: video.vdoCipherId ? "var(--green)" : "var(--text3)" }}>
                                {video.vdoCipherId ? `✓ ${formatDuration(video.durationSeconds)}` : "not uploaded"}
                              </span>
                              <button
                                onClick={() => openUploadDialog(item.id, video.id)}
                                className="font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded cursor-pointer shrink-0"
                                style={{
                                  color: "var(--blue)",
                                  background: "var(--blue-dim)",
                                  border: "1px solid var(--blue)",
                                }}
                              >
                                {video.vdoCipherId ? "Re-upload" : "Upload"}
                              </button>
                              <button
                                onClick={() => moveVideo(item.id, vi, -1)}
                                disabled={vi === 0}
                                className="w-4 h-4 flex items-center justify-center rounded text-[8px] cursor-pointer disabled:opacity-30"
                                style={{ color: "var(--text3)" }}
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => moveVideo(item.id, vi, 1)}
                                disabled={vi === item.videos.length - 1}
                                className="w-4 h-4 flex items-center justify-center rounded text-[8px] cursor-pointer disabled:opacity-30"
                                style={{ color: "var(--text3)" }}
                              >
                                ↓
                              </button>
                              <button
                                onClick={() => removeVideo(item.id, video.id)}
                                className="w-4 h-4 flex items-center justify-center rounded text-[8px] cursor-pointer"
                                style={{ color: "var(--red)" }}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>
            {items.length} item{items.length !== 1 ? "s" : ""} ·{" "}
            {items.reduce((sum, i) => sum + i.videos.length, 0)} videos · Full
            replace on save
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              disabled={saving}
              className="font-mono text-[10px] font-semibold px-3 py-1.5 rounded cursor-pointer disabled:opacity-50"
              style={{
                border: "1px solid var(--border)",
                color: "var(--btn-text, var(--text2))",
                background: "var(--btn-bg, var(--surface))",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="font-mono text-[10px] font-semibold px-3 py-1.5 rounded cursor-pointer disabled:opacity-50"
              style={{
                background: saving ? "var(--text3)" : "var(--orange)",
                color: "#fff",
                border: "1px solid var(--orange)",
              }}
            >
              {saving ? "Saving..." : "Save Curriculum"}
            </button>
          </div>
        </div>
      </div>

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
          onUpload={async (_file: any, _metadata: any) => {
            // After upload, refresh curriculum from API to get real IDs
            try {
              const res = await fetch(`/api/projects/${projectId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const data = await res.json();
                const raw: any[] = data.curriculum || [];
                const mapped: CurriculumItem[] = raw
                  .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
                  .map((c: any) => ({
                    id: c.id,
                    week: c.week || "",
                    title: c.title || "",
                    desc: c.desc || "",
                    videos: (c.videos || [])
                      .sort((v: any, w: any) => (v.order ?? 0) - (w.order ?? 0))
                      .map((v: any) => ({
                        id: v.id,
                        title: v.title || "",
                        vdoCipherId: v.vdoCipherId || "",
                        durationSeconds: v.durationSeconds ?? 0,
                      })),
                  }));
                setItems(mapped);
                setOriginalItems(JSON.parse(JSON.stringify(mapped)));
              }
            } catch {}
            return { videoId: "", vdoCipherId: "" };
          }}
        />
      )}
    </div>
  );
}
