"use client";

import React, { useState, useEffect, useRef } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";

interface CourseResource {
  id: string;
  title: string;
  fileType: string;
  fileUrl: string;
  fileSizeLabel?: string;
  createdAt: string;
}

interface ResourceManagerModalProps {
  open: boolean;
  courseId: string;
  courseName: string;
  token: string;
  onClose: () => void;
}

export function ResourceManagerModal({ open, courseId, courseName, token, onClose }: ResourceManagerModalProps) {
  const [resources, setResources] = useState<CourseResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && courseId && token) {
      fetchResources();
    }
  }, [open, courseId, token]);

  async function fetchResources() {
    setLoading(true);
    setError(null);
    try {
      const res = await opsFetch(`/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setResources(data.resources || []);
      } else {
        setError("Failed to load resources");
      }
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploadProgress(10); // Fake progress to show activity

    try {
      // 1. Upload to S3
      const formData = new FormData();
      formData.append("file", file);
      
      // We pass ?folder=courses as an additional hint, though the endpoint might hardcode resources/
      const uploadRes = await fetch("/api/upload/resource?folder=courses", {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file to S3");
      }

      setUploadProgress(60);
      const uploadData = await uploadRes.json();
      const fileUrl = uploadData.url;

      // Determine file type from extension
      const ext = file.name.split('.').pop()?.toUpperCase() || "FILE";
      // Determine file size label
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const fileSizeLabel = `${sizeMB} MB`;

      // 2. Create resource in DB
      setUploadProgress(80);
      const createRes = await opsFetch(`/api/courses/${courseId}/resources`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: file.name,
          fileType: ext,
          fileUrl,
          fileSizeLabel,
        })
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.message || "Failed to save resource to database");
      }

      setUploadProgress(100);
      // Refresh list
      await fetchResources();

    } catch (e: any) {
      setError(e.message || "Error uploading resource");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDelete(resourceId: string, title: string) {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const res = await opsFetch(`/api/courses/resources/${resourceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        setResources(prev => prev.filter(r => r.id !== resourceId));
      } else {
        const err = await res.json();
        setError(err.message || "Failed to delete resource");
      }
    } catch (e: any) {
      setError(e.message || "Network error");
    }
  }

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }}>
      <div className="w-[500px] flex flex-col rounded shadow-2xl overflow-hidden" style={{ background: "var(--bg)", border: "1px solid var(--border)", maxHeight: "85vh" }}>
        
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <div>
            <h3 className="text-[13px] font-bold" style={{ color: "var(--text)" }}>Manage Resources</h3>
            <p className="font-mono text-[9px] mt-0.5" style={{ color: "var(--text3)" }}>{courseName}</p>
          </div>
          <button onClick={onClose} className="w-6 h-6 rounded flex items-center justify-center text-[12px] font-bold cursor-pointer hover:opacity-70 transition-opacity bg-transparent border-none" style={{ color: "var(--text2)" }}>✕</button>
        </div>

        {/* Upload Area */}
        <div className="p-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div 
            className="rounded border border-dashed flex flex-col items-center justify-center p-6 text-center"
            style={{ borderColor: "var(--border2)", background: "var(--surface)" }}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2 w-full max-w-[200px]">
                <span className="font-mono text-[10px] font-bold" style={{ color: "var(--blue)" }}>Uploading... {uploadProgress}%</span>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--panel)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: "var(--blue)" }} />
                </div>
              </div>
            ) : (
              <>
                <span className="text-[20px] mb-2">📄</span>
                <p className="font-mono text-[10px] mb-3" style={{ color: "var(--text2)" }}>Upload a new resource for this course</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="font-mono text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition-opacity text-white border-none hover:opacity-90"
                  style={{ background: "var(--orange)" }}
                >
                  Choose File
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileSelected} 
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.png,.jpg,.jpeg"
                />
              </>
            )}
          </div>
          {error && <div className="mt-3 text-[10px] font-mono font-bold px-3 py-2 rounded" style={{ background: "var(--red-d)", color: "var(--red)" }}>✕ {error}</div>}
        </div>

        {/* List Area */}
        <div className="flex-1 overflow-y-auto p-4" style={{ background: "var(--bg)" }}>
          <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text3)" }}>Existing Resources ({resources.length})</h4>
          
          {loading ? (
            <div className="text-center font-mono text-[10px] py-4" style={{ color: "var(--text3)" }}>Loading...</div>
          ) : resources.length === 0 ? (
            <div className="text-center font-mono text-[10px] py-8 rounded border border-dashed" style={{ color: "var(--text3)", borderColor: "var(--border)", background: "var(--surface)" }}>No resources added yet.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {resources.map((res) => (
                <div key={res.id} className="flex items-center gap-3 p-2.5 rounded border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "var(--panel)", color: "var(--text2)" }}>
                    {res.fileType.substring(0, 4)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold truncate" style={{ color: "var(--text)" }}>{res.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>{res.fileSizeLabel || "Unknown size"}</span>
                      <a href={res.fileUrl} target="_blank" rel="noreferrer" className="font-mono text-[9px] hover:underline" style={{ color: "var(--blue)" }}>View</a>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(res.id, res.title)}
                    className="w-6 h-6 rounded flex items-center justify-center text-[10px] shrink-0 border-none bg-transparent cursor-pointer hover:bg-[var(--red-d)] transition-colors"
                    style={{ color: "var(--red)" }}
                    title="Delete Resource"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
