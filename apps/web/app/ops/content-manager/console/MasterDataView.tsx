"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { MasterDataModal, type FieldDef } from "../../admin/sections/MasterDataModal";
import { CurriculumBuilder } from "../../admin/sections/CurriculumBuilder";
import { ProjectCurriculumBuilder } from "../../admin/sections/ProjectCurriculumBuilder";
import { ResourceManagerModal } from "../../admin/sections/ResourceManagerModal";
import { Panel, Th, Td, ViewHeader, ActionBtn } from "../../sales/sections/ui";

/* ── Helpers ── */
function fmtRupee(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { fg: string; bg: string }> = {
    Active: { fg: "var(--green)", bg: "var(--green-d)" },
    Draft: { fg: "var(--amber)", bg: "var(--amber-d)" },
    Archived: { fg: "var(--text3)", bg: "var(--panel)" },
  };
  const s = map[status] ?? map.Draft;
  return (
    <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1"
      style={{ background: s.bg, color: s.fg }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.fg }} />
      {status}
    </span>
  );
}

/* ── Skill Level Enum ── */
const SKILL_LEVEL_LABELS: Record<string, string> = { BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced" };
const SKILL_LEVEL_ENUM: Record<string, string> = Object.fromEntries(Object.entries(SKILL_LEVEL_LABELS).map(([k, v]) => [v, k]));

const CAREER_PATHS = [
  "Full Stack Developer", "Frontend Developer", "Backend Developer", "Data Scientist",
  "DevOps Engineer", "AI / ML Engineer", "Cybersecurity Specialist", "Mobile Developer", "Cloud Architect",
];

/* ── Field Schemas ── */
const COURSE_FIELDS: FieldDef[] = [
  { key: "title", label: "Course Name", type: "text", required: true, placeholder: "e.g. MERN Stack Development", full: true },
  { key: "category", label: "Category", type: "select", required: true, options: ["Full Stack", "Data Science", "AI / ML", "DevOps", "Cybersecurity", "Programming", "Cloud"], allowCustom: true, full: true },
  { key: "careerPath", label: "Career Path", type: "select", options: CAREER_PATHS, allowCustom: true, full: true, defaultEmpty: true, placeholder: "Select career path" },
  { key: "level", label: "Level", type: "select", required: true, options: ["Beginner", "Intermediate", "Advanced"] },
  { key: "price", label: "Price (₹)", type: "number", required: true, placeholder: "e.g. 45000" },
  { key: "discountPercent", label: "Discount (%)", type: "discount", placeholder: "e.g. 90", full: true },
  { key: "description", label: "About This Course", type: "textarea", required: true, full: true, placeholder: "Long-form description…" },
  { key: "whatYoullLearn", label: "What You'll Learn (one per line)", type: "textarea", required: true, full: true, placeholder: "Line 1\nLine 2" },
  { key: "techStack", label: "Technologies (comma separated)", type: "text", required: true, full: true, placeholder: "React, Node.js, MongoDB" },
  { key: "careerTitle", label: "Career Relevance — Headline", type: "text", required: true, full: true, placeholder: "e.g. High-demand skill" },
  { key: "careerBody", label: "Career Relevance — Body", type: "textarea", required: true, full: true, placeholder: "Companies that hire…" },
  { key: "trainerId", label: "Primary Instructor", type: "select", required: true, optionsFrom: "instructors" },
  { key: "thumbnailUrl", label: "Thumbnail Image", type: "file", full: true },
  { key: "status", label: "Status", type: "select", required: true, options: ["DRAFT", "ACTIVE", "ARCHIVED"] },
  // { key: "duration", label: "Duration", type: "duration", placeholder: "e.g. 16" },
  // { key: "modules", label: "Total Modules", type: "number", placeholder: "e.g. 20" },
  // { key: "totalLessons", label: "Total Lessons", type: "number", placeholder: "e.g. 96" },
  // { key: "totalHours", label: "Total Duration (hours)", type: "number", placeholder: "e.g. 80" },
];

const PROJECT_FIELDS: FieldDef[] = [
  { key: "name", label: "Project Name", type: "text", required: true, placeholder: "e.g. Full-Stack E-Commerce", full: true },
  { key: "image", label: "Project Image", type: "file", full: true },
  { key: "techLabel", label: "Tech Label", type: "text", required: true, placeholder: "e.g. MERN Stack", full: true },
  { key: "tech", label: "Tech Filter Key", type: "select", required: true, options: ["mern", "java", "frontend", "node", "python", "data", "aiml", "devops", "cloud", "iot"], allowCustom: true },
  { key: "category", label: "Category", type: "select", options: ["Web Development", "Data Science", "AI / ML", "DevOps", "Cloud", "Emerging Tech"], allowCustom: true },
  { key: "level", label: "Level", type: "select", required: true, options: ["Beginner", "Intermediate", "Advanced"] },
  { key: "shortDesc", label: "Short Description", type: "textarea", required: true, full: true, placeholder: "One-liner shown on card…" },
  { key: "overview", label: "Full Overview", type: "textarea", required: true, full: true, placeholder: "Detailed description…" },
  { key: "stack", label: "Tech Stack (comma separated)", type: "text", full: true, placeholder: "React, Node.js, MongoDB" },
  { key: "highlights", label: "What You'll Build (one per line)", type: "textarea", full: true },
  { key: "prereqs", label: "Prerequisites (one per line)", type: "textarea", full: true },
  { key: "includes", label: "What's Included (one per line)", type: "textarea", full: true },
  { key: "industryUse", label: "Industry Relevance", type: "textarea", full: true },
  { key: "tools", label: "Dev Tools (comma separated)", type: "text", full: true },
  { key: "setupSteps", label: "Setup Steps (one per line)", type: "textarea", full: true },
  { key: "seats", label: "Available Seats", type: "number", placeholder: "e.g. 10" },
  { key: "price", label: "Price (₹)", type: "number", required: true, placeholder: "e.g. 6999" },
  { key: "discountPercent", label: "Discount (%)", type: "discount", full: true },
  { key: "trainerId", label: "Trainer", type: "select", required: true, optionsFrom: "instructors" },
  { key: "status", label: "Status", type: "select", required: true, options: ["DRAFT", "ACTIVE", "ARCHIVED"] },
];

export default function MasterDataView({ searchQuery, refreshSignal, onToast }: {
  searchQuery: string;
  refreshSignal?: number;
  onToast: (msg: string, type?: "success" | "danger") => void;
}) {
  const [activeTab, setActiveTab] = useState<"courses" | "projects">("courses");
  const [courses, setCourses] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [cbOpen, setCbOpen] = useState(false);
  const [cbCourse, setCbCourse] = useState<{ code: string; name: string; id: string } | null>(null);
  const [pbOpen, setPbOpen] = useState(false);
  const [pbProject, setPbProject] = useState<{ name: string; id: string } | null>(null);
  const [rmOpen, setRmOpen] = useState(false);
  const [rmCourse, setRmCourse] = useState<{ code: string; name: string; id: string } | null>(null);
  const [deleting, setDeleting] = useState<any>(null);

  // Load token
  useEffect(() => {
    import("@/app/auth/lib/token-store").then(({ loadStaffToken }) => {
      loadStaffToken().then(setToken).catch(() => {});
    });
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, pRes, tRes] = await Promise.all([
        opsFetch("/api/courses"),
        opsFetch("/api/projects/admin/all"),
        opsFetch("/api/admin/trainers/approved"),
      ]);
      if (cRes.ok) { const d = await cRes.json(); setCourses(Array.isArray(d) ? d : []); }
      if (pRes.ok) { const d = await pRes.json(); setProjects(Array.isArray(d) ? d : []); }
      if (tRes.ok) { const d = await tRes.json(); setTrainers(Array.isArray(d) ? d : []); }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData, refreshSignal]);

  // Filtered data
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = activeTab === "courses" ? courses : projects;
    if (!q) return list;
    return list.filter((r: any) => {
      const fields = activeTab === "courses"
        ? [r.title, r.code, r.category, r.description, r.trainer?.name]
        : [r.name, r.techLabel, r.category, r.shortDesc];
      return fields.some((v) => v && String(v).toLowerCase().includes(q));
    });
  }, [activeTab, courses, projects, searchQuery]);

  // Extra options for trainer select
  const extraOptions = useMemo(() => ({
    instructors: trainers.map((t: any) => ({ label: `${t.name}`, value: t.id })),
  }), [trainers]);

  // Default form values
  function getDefaultForm(entity: string): Record<string, any> {
    const fields = entity === "courses" ? COURSE_FIELDS : PROJECT_FIELDS;
    const defaults: Record<string, any> = {};
    for (const field of fields) {
      if (field.type === "select" && field.options && !field.defaultEmpty) {
        defaults[field.key] = field.options[0];
      } else {
        defaults[field.key] = "";
      }
    }
    return defaults;
  }

  // Modal handlers
  function openAddModal() {
    setEditingRecord({ ...getDefaultForm(activeTab), id: null });
    setModalOpen(true);
  }

  function openEditModal(record: any) {
    if (activeTab === "courses") {
      setEditingRecord({
        id: record.id,
        title: record.title || "",
        price: record.price ?? 0,
        discountPercent: record.originalPrice != null && Number(record.originalPrice) > Number(record.price ?? 0)
          ? String(Math.round(((Number(record.originalPrice) - Number(record.price ?? 0)) / Number(record.originalPrice)) * 100)) : "",
        trainerId: record.trainerId || "",
        description: record.description || "",
        whatYoullLearn: Array.isArray(record.whatYoullLearn) ? record.whatYoullLearn.join("\n") : (record.whatYoullLearn || ""),
        techStack: Array.isArray(record.techStack) ? record.techStack.join(", ") : (record.techStack || ""),
        careerTitle: record.careerTitle || "",
        careerBody: record.careerBody || "",
        careerPath: record.careerPath || "",
        thumbnailUrl: record.thumbnailUrl || "",
        status: record.status || "DRAFT",
        category: record.category || "",
        level: record.level || "",
        // duration: record.duration || "",
        // totalLessons: record.totalLessons || "",
        // totalHours: record.totalHours || "",
        // modules: record.modules || "",
      });
    } else {
      setEditingRecord({ ...record });
    }
    setModalOpen(true);
  }

  async function saveRecord(formData: Record<string, any>): Promise<{ success: boolean; error?: string } | void> {
    if (activeTab === "courses" && token) {
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      const persistCareerPath = async (courseId: string) => {
        if (formData.careerPath === undefined) return;
        try {
          await fetch(`/api/courses/${courseId}/career-path`, {
            method: "PUT", headers, body: JSON.stringify({ title: formData.careerPath || null }),
          });
        } catch {}
      };

      let whatYoullLearn: string[] | undefined;
      if (typeof formData.whatYoullLearn === "string") whatYoullLearn = formData.whatYoullLearn.split("\n").filter(Boolean);
      let techStack: string[] | undefined;
      if (typeof formData.techStack === "string") techStack = formData.techStack.split(",").map((s: string) => s.trim()).filter(Boolean);

      const body: Record<string, any> = {};
      if (formData.title !== undefined) body.title = formData.title;
      if (formData.price !== undefined) body.price = Number(formData.price);
      if (formData.discountPercent !== undefined) {
        const pct = Number(formData.discountPercent);
        const price = Number(formData.price);
        if (Number.isFinite(pct) && pct > 0 && pct < 100 && Number.isFinite(price) && price > 0) {
          body.originalPrice = Math.round((price / (1 - pct / 100)) / 100) * 100;
        } else { body.originalPrice = null; }
      }
      if (!formData.id || formData.trainerId !== editingRecord?.trainerId) {
        if (formData.trainerId) body.trainerId = formData.trainerId;
      }
      if (formData.description !== undefined) body.description = formData.description;
      if (whatYoullLearn !== undefined) body.whatYoullLearn = whatYoullLearn;
      if (techStack !== undefined) body.techStack = techStack;
      if (formData.careerTitle !== undefined) body.careerTitle = formData.careerTitle;
      if (formData.careerBody !== undefined) body.careerBody = formData.careerBody;
      if (formData.thumbnailUrl !== undefined) body.thumbnailUrl = formData.thumbnailUrl;
      if (formData.status !== undefined) body.status = formData.status;
      if (formData.category) body.category = formData.category;
      if (formData.level && SKILL_LEVEL_ENUM[formData.level]) body.skillLevel = SKILL_LEVEL_ENUM[formData.level];

      try {
        const url = formData.id ? `/api/courses/${formData.id}` : "/api/courses";
        const method = formData.id ? "PATCH" : "POST";
        const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: `${res.status}` }));
          return { success: false, error: err.message || "Save failed" };
        }
        const saved = await res.json();
        if (!formData.id) await persistCareerPath(saved.id);
        await loadData();
        onToast(formData.id ? "Course updated" : "Course created", "success");
        setModalOpen(false);
        return { success: true };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Save failed" };
      }
    }

    if (activeTab === "projects" && token) {
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      const body: Record<string, any> = {};
      for (const key of Object.keys(formData)) {
        if (key === "id" || key === "discountPercent") continue;
        if (key === "stack" || key === "highlights" || key === "prereqs" || key === "includes" || key === "tools" || key === "setupSteps") {
          const val = formData[key];
          body[key] = typeof val === "string" ? val.split("\n").map((s: string) => s.trim()).filter(Boolean) : val;
        } else if (key === "level" && SKILL_LEVEL_ENUM[formData[key]]) {
          body.skillLevel = SKILL_LEVEL_ENUM[formData[key]];
        } else if (formData[key] !== undefined && formData[key] !== "") {
          body[key] = formData[key];
        }
      }
      if (formData.discountPercent !== undefined) {
        const pct = Number(formData.discountPercent);
        const price = Number(formData.price);
        if (Number.isFinite(pct) && pct > 0 && pct < 100 && Number.isFinite(price) && price > 0) {
          body.originalPrice = Math.round((price / (1 - pct / 100)) / 100) * 100;
        } else { body.originalPrice = null; }
      }

      try {
        const url = formData.id ? `/api/projects/${formData.id}` : "/api/projects";
        const method = formData.id ? "PATCH" : "POST";
        const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: `${res.status}` }));
          return { success: false, error: err.message || "Save failed" };
        }
        await loadData();
        onToast(formData.id ? "Project updated" : "Project created", "success");
        setModalOpen(false);
        return { success: true };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Save failed" };
      }
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      const url = activeTab === "courses" ? `/api/courses/${deleting.id}` : `/api/projects/${deleting.id}`;
      const r = await opsFetch(url, { method: "DELETE" });
      if (r.ok) {
        if (activeTab === "courses") setCourses((prev) => prev.filter((c) => c.id !== deleting.id));
        else setProjects((prev) => prev.filter((p) => p.id !== deleting.id));
        onToast(`${activeTab === "courses" ? "Course" : "Project"} deleted`, "success");
      } else {
        onToast("Delete failed", "danger");
      }
    } catch { onToast("Delete failed", "danger"); }
    setDeleting(null);
  }

  function handleSaveCurriculum() {
    loadData();
    onToast("Curriculum saved", "success");
  }

  return (
    <div className="p-4 pb-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>🗄 Master Data</span>
          <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
            {courses.length} courses · {projects.length} projects
          </span>
        </div>
        <div className="flex gap-1.5">
          <button onClick={loadData}
            className="font-mono text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer"
            style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}>↻ Refresh</button>
          <button onClick={openAddModal}
            className="font-mono text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer"
            style={{ background: "var(--amber)", color: "#fff", border: "1px solid var(--amber)" }}>+ Add New</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-3">
        {([
          { key: "courses" as const, icon: "📚", label: "Courses", count: courses.length },
          { key: "projects" as const, icon: "🚀", label: "Projects", count: projects.length },
        ]).map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-1.5 font-mono text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer"
            style={{
              background: activeTab === tab.key ? "var(--amber)" : "var(--panel)",
              color: activeTab === tab.key ? "#fff" : "var(--text2)",
              border: `1px solid ${activeTab === tab.key ? "var(--amber)" : "var(--border)"}`,
            }}>
            {tab.icon} {tab.label}
            <span className="font-mono text-[8px] px-1 py-0.5 rounded" style={{
              background: activeTab === tab.key ? "rgba(255,255,255,.2)" : "var(--surface)",
              color: activeTab === tab.key ? "#fff" : "var(--text3)",
            }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-3 py-2" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>
            {activeTab === "courses" ? "📚 Courses & Curriculum" : "🚀 Projects & Curriculum"}
          </span>
          <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{filtered.length} records</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>No records found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ fontSize: 11 }}>
              <thead>
                <tr>
                  {activeTab === "courses" ? (
                    <>
                      <Th>Code</Th><Th>Name</Th><Th>Category</Th><Th>Level</Th><Th>Trainer</Th><Th>Price</Th><Th>Status</Th><Th>Actions</Th>
                    </>
                  ) : (
                    <>
                      <Th>Name</Th><Th>Tech</Th><Th>Level</Th><TrainerTh /><Th>Price</Th><Th>Status</Th><Th>Actions</Th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((record: any, idx: number) => (
                  <tr key={record.id}
                    style={{ background: idx % 2 === 0 ? "var(--surface)" : "var(--panel)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-h)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? "var(--surface)" : "var(--panel)"; }}
                  >
                    {activeTab === "courses" ? (
                      <>
                        <td className="px-2.5 py-1.5 font-mono text-[10px] font-semibold" style={{ color: "var(--blue)", borderBottom: "1px solid var(--border)" }}>{record.code ?? "—"}</td>
                        <td className="px-2.5 py-1.5 font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{record.title}</td>
                        <td className="px-2.5 py-1.5" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{record.category ?? "—"}</td>
                        <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}><StatusBadge status={record.skillLevel ?? "BEGINNER"} /></td>
                        <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{record.trainer?.name || "—"}</td>
                        <td className="px-2.5 py-1.5 font-mono text-[10.5px]" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{fmtRupee(record.price)}</td>
                        <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}><StatusBadge status={record.status === "ACTIVE" ? "Active" : record.status === "DRAFT" ? "Draft" : "Archived"} /></td>
                      </>
                    ) : (
                      <>
                        <td className="px-2.5 py-1.5 font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{record.name}</td>
                        <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: "var(--blue)", borderBottom: "1px solid var(--border)" }}>{record.techLabel ?? "—"}</td>
                        <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}><StatusBadge status={record.skillLevel ?? "BEGINNER"} /></td>
                        <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{record.trainer?.name || "—"}</td>
                        <td className="px-2.5 py-1.5 font-mono text-[10.5px]" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{fmtRupee(record.price)}</td>
                        <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}><StatusBadge status={record.status === "ACTIVE" ? "Active" : record.status === "DRAFT" ? "Draft" : "Archived"} /></td>
                      </>
                    )}
                    <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                      <div className="flex items-center gap-1">
                        <ActionBtn color="var(--orange)" onClick={() => openEditModal(record)}>EDIT</ActionBtn>
                        {activeTab === "courses" ? (
                          <>
                            <ActionBtn color="var(--blue)" onClick={() => setCbOpen(true) || setCbCourse({ id: record.id, code: record.code, name: record.title })}>CURRICULUM</ActionBtn>
                            <ActionBtn color="var(--green)" onClick={() => setRmOpen(true) || setRmCourse({ id: record.id, code: record.code, name: record.title })}>RESOURCES</ActionBtn>
                          </>
                        ) : (
                          <ActionBtn color="var(--blue)" onClick={() => setPbOpen(true) || setPbProject({ id: record.id, name: record.name })}>CURRICULUM</ActionBtn>
                        )}
                        <ActionBtn color="var(--red)" onClick={() => setDeleting(record)}>✕</ActionBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Master Data Modal */}
      <MasterDataModal
        open={modalOpen}
        entity={activeTab}
        icon={activeTab === "courses" ? "📚" : "🚀"}
        title={activeTab === "courses" ? "Course" : "Project"}
        fields={activeTab === "courses" ? COURSE_FIELDS : PROJECT_FIELDS}
        data={editingRecord || {}}
        editing={!!editingRecord?.id}
        extraOptions={extraOptions}
        token={token || ""}
        onSave={saveRecord}
        onClose={() => { setModalOpen(false); setEditingRecord(null); }}
      />

      {/* Curriculum Builder */}
      <CurriculumBuilder
        open={cbOpen}
        courseId={cbCourse?.id || ""}
        courseName={cbCourse?.name || ""}
        courseCode={cbCourse?.code || ""}
        token={token || ""}
        onSave={handleSaveCurriculum}
        onClose={() => { setCbOpen(false); setCbCourse(null); }}
      />

      {/* Project Curriculum Builder */}
      <ProjectCurriculumBuilder
        open={pbOpen}
        projectId={pbProject?.id || ""}
        projectName={pbProject?.name || ""}
        token={token || ""}
        onSave={handleSaveCurriculum}
        onClose={() => { setPbOpen(false); setPbProject(null); }}
      />

      {/* Resource Manager */}
      <ResourceManagerModal
        open={rmOpen}
        courseId={rmCourse?.id || ""}
        courseName={rmCourse?.name || ""}
        token={token || ""}
        onClose={() => { setRmOpen(false); setRmCourse(null); }}
      />

      {/* Delete Confirm */}
      {deleting && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center" style={{ background: "rgba(0,0,0,.5)" }} onClick={(e) => { if (e.target === e.currentTarget) setDeleting(null); }}>
          <div className="rounded w-[380px] max-w-[95vw] p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
            <div className="text-[13px] font-extrabold mb-1" style={{ color: "var(--text)" }}>Delete {activeTab === "courses" ? "course" : "project"}?</div>
            <div className="font-mono text-[9.5px] mb-4" style={{ color: "var(--text3)" }}>
              This permanently removes <span className="font-bold" style={{ color: "var(--text)" }}>{deleting.title || deleting.name}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleting(null)} className="flex-1 py-1.5 rounded font-mono text-[9.5px] font-bold cursor-pointer" style={{ background: "var(--panel)", color: "var(--text2)", border: "1px solid var(--border)" }}>CANCEL</button>
              <button onClick={handleDelete} className="flex-1 py-1.5 rounded font-mono text-[9.5px] font-bold cursor-pointer" style={{ background: "var(--red)", color: "#fff", border: "1px solid var(--red)" }}>DELETE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrainerTh() {
  return <Th>Trainer</Th>;
}
