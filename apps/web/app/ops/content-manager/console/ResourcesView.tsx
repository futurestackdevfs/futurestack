"use client";

import { useCallback, useEffect, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { Panel, Th, Td, ViewHeader, ActionBtn } from "../../sales/sections/ui";

interface Course { id: string; title: string; }
interface Resource { id: string; title: string; fileType: string; fileUrl: string; fileSizeLabel: string | null; courseId: string; }

export default function ResourcesView({ refreshSignal, onToast }: {
  refreshSignal?: number;
  onToast: (msg: string, type?: "success" | "danger") => void;
}) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: "", fileType: "PDF", fileUrl: "", fileSizeLabel: "" });

  useEffect(() => {
    opsFetch("/api/courses").then((r) => r.ok ? r.json() : []).then((data) => {
      setCourses(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, [refreshSignal]);

  const loadResources = useCallback(async (courseId: string) => {
    if (!courseId) { setResources([]); return; }
    setLoading(true);
    try {
      const r = await opsFetch(`/api/courses/${courseId}`);
      if (!r.ok) throw new Error("Failed to load");
      const data = await r.json();
      setResources(data.resources ?? []);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Failed to load resources", "danger");
    } finally { setLoading(false); }
  }, [onToast]);

  useEffect(() => { loadResources(selectedCourseId); }, [selectedCourseId, loadResources, refreshSignal]);

  async function handleAdd() {
    if (!selectedCourseId || !form.title) return;
    setUploading(true);
    try {
      const r = await opsFetch(`/api/courses/${selectedCourseId}/resources`, {
        method: "POST",
        body: JSON.stringify({ title: form.title, fileType: form.fileType, fileUrl: form.fileUrl, fileSizeLabel: form.fileSizeLabel || null }),
      });
      if (!r.ok) throw new Error("Failed to add resource");
      const data = await r.json();
      setResources((prev) => [...prev, data]);
      setForm({ title: "", fileType: "PDF", fileUrl: "", fileSizeLabel: "" });
      onToast("Resource added", "success");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Failed to add resource", "danger");
    } finally { setUploading(false); }
  }

  async function handleDelete(resourceId: string) {
    if (!confirm("Delete this resource?")) return;
    const r = await opsFetch(`/api/courses/resources/${resourceId}`, { method: "DELETE" });
    if (r.ok) {
      setResources((prev) => prev.filter((res) => res.id !== resourceId));
      onToast("Resource deleted", "success");
    } else {
      onToast("Failed to delete resource", "danger");
    }
  }

  function fileTypeIcon(type: string) {
    switch (type) {
      case "PDF": return "📄";
      case "ZIP": return "📦";
      case "LINK": return "🔗";
      default: return "📎";
    }
  }

  return (
    <div className="p-4 pb-7">
      <ViewHeader
        icon="📦"
        title="Resources"
        meta={selectedCourseId ? `${resources.length} RESOURCES` : "SELECT A COURSE"}
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

      {/* Add Resource Form */}
      {selectedCourseId && (
        <div className="rounded p-3 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="font-mono text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text3)" }}>Add Resource</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Title" className="font-mono text-[10.5px] px-2 py-1.5 rounded outline-none"
              style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }} />
            <select value={form.fileType} onChange={(e) => setForm({ ...form, fileType: e.target.value })}
              className="font-mono text-[10.5px] px-2 py-1.5 rounded outline-none"
              style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}>
              <option>PDF</option><option>ZIP</option><option>LINK</option><option>DOC</option><option>OTHER</option>
            </select>
            <input value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
              placeholder="File URL or link" className="font-mono text-[10.5px] px-2 py-1.5 rounded outline-none"
              style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }} />
            <input value={form.fileSizeLabel} onChange={(e) => setForm({ ...form, fileSizeLabel: e.target.value })}
              placeholder="Size (e.g. 2.5 MB)" className="font-mono text-[10.5px] px-2 py-1.5 rounded outline-none"
              style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }} />
          </div>
          <button onClick={handleAdd} disabled={uploading || !form.title}
            className="font-mono text-[9.5px] font-bold px-3 py-1.5 rounded cursor-pointer disabled:opacity-50"
            style={{ background: "var(--amber)", color: "#fff", border: "1px solid var(--amber)" }}>
            {uploading ? "ADDING…" : "+ ADD RESOURCE"}
          </button>
        </div>
      )}

      {/* Resources List */}
      {selectedCourseId && (
        <Panel title="Course Resources" count={`${resources.length} RESOURCES`}>
          {loading ? (
            <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading…</div>
          ) : resources.length === 0 ? (
            <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>No resources yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>Resource</Th>
                    <Th>Type</Th>
                    <Th>Size</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((res) => (
                    <tr key={res.id}>
                      <Td>
                        <a href={res.fileUrl} target="_blank" rel="noopener noreferrer"
                          className="font-semibold no-underline" style={{ color: "var(--blue)" }}>
                          {res.title}
                        </a>
                      </Td>
                      <Td>
                        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: "var(--panel)", color: "var(--text3)" }}>
                          {fileTypeIcon(res.fileType)} {res.fileType}
                        </span>
                      </Td>
                      <Td mono>{res.fileSizeLabel ?? "—"}</Td>
                      <Td>
                        <ActionBtn color="var(--red)" onClick={() => handleDelete(res.id)}>✕ DELETE</ActionBtn>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
