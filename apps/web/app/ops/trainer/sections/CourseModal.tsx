"use client";

import { useState, useRef, useMemo } from "react";

export interface CourseFormValues {
  title: string;
  category: string;
  careerPath: string;
  level: string;
  price: string;
  description: string;
  whatYoullLearn: string;
  techStack: string;
  careerTitle: string;
  careerBody: string;
  thumbnailUrl: string;
  status: string;
  duration: string;
  modules: string;
  totalLessons: string;
  totalHours: string;
  isFeatured: boolean;
}

interface CourseModalProps {
  open: boolean;
  editing: boolean;
  data?: Partial<CourseFormValues>;
  onSave: (values: CourseFormValues) => void;
  onClose: () => void;
}

const CATEGORIES = ["Full Stack", "Data Science", "AI / ML", "DevOps", "Cybersecurity", "Programming", "Cloud"];
const CAREER_PATHS = ["Full Stack Developer", "Frontend Developer", "Backend Developer", "Data Scientist", "DevOps Engineer", "AI / ML Engineer", "Cybersecurity Specialist", "Mobile Developer", "Cloud Architect"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"];

const FIELDS: {
  key: keyof CourseFormValues;
  label: string;
  placeholder: string;
  required?: boolean;
  full?: boolean;
  type?: "text" | "textarea" | "number" | "select" | "file" | "duration";
  options?: string[];
  allowCustom?: boolean;
}[] = [
  { key: "title", label: "Course Name", type: "text", required: true, placeholder: "e.g. MERN Stack Development", full: true },
  { key: "category", label: "Category", type: "select", required: true, placeholder: "Select category", options: CATEGORIES, allowCustom: true, full: true },
  { key: "careerPath", label: "Career Path", type: "select", placeholder: "Select career path", options: CAREER_PATHS, allowCustom: true, full: true },
  { key: "level", label: "Level", type: "select", required: true, placeholder: "Select level", options: LEVELS },
  { key: "price", label: "Price (₹)", type: "number", required: true, placeholder: "e.g. 45000" },
  { key: "description", label: "About This Course", type: "textarea", required: true, full: true, placeholder: "Long-form description shown on the course detail page…" },
  { key: "whatYoullLearn", label: "What You'll Learn (one per line)", type: "textarea", required: true, full: true, placeholder: "Build production-grade full-stack apps…" },
  { key: "techStack", label: "Technologies Covered (comma separated)", type: "text", required: true, full: true, placeholder: "MongoDB, Express.js, React.js, Node.js" },
  { key: "careerTitle", label: "Career Relevance — Headline", type: "text", required: true, full: true, placeholder: "e.g. High-demand skill — average salary ₹18L – ₹40L/yr" },
  { key: "careerBody", label: "Career Relevance — Body", type: "textarea", required: true, full: true, placeholder: "Companies that hire for this skill, salary context…" },
  { key: "thumbnailUrl", label: "Thumbnail Image", type: "file", required: false, full: true, placeholder: "Upload image" },
  { key: "status", label: "Status", type: "select", required: true, placeholder: "Select status", options: STATUSES },
  { key: "duration", label: "Duration", type: "duration", placeholder: "e.g. 16" },
  { key: "modules", label: "Total Modules", type: "number", placeholder: "e.g. 20" },
  { key: "totalLessons", label: "Total Lessons", type: "number", placeholder: "e.g. 96" },
  { key: "totalHours", label: "Total Duration (hours)", type: "number", placeholder: "e.g. 80" },
];

function buildInitial(data?: Partial<CourseFormValues>): CourseFormValues {
  return {
    title: data?.title ?? "",
    category: data?.category ?? "",
    careerPath: data?.careerPath ?? "",
    level: data?.level ?? "",
    price: data?.price ?? "",
    description: data?.description ?? "",
    whatYoullLearn: data?.whatYoullLearn ?? "",
    techStack: data?.techStack ?? "",
    careerTitle: data?.careerTitle ?? "",
    careerBody: data?.careerBody ?? "",
    thumbnailUrl: data?.thumbnailUrl ?? "",
    status: data?.status ?? "DRAFT",
    duration: data?.duration ?? "",
    modules: data?.modules ?? "",
    totalLessons: data?.totalLessons ?? "",
    totalHours: data?.totalHours ?? "",
    isFeatured: data?.isFeatured ?? false,
  };
}

function CourseForm({ editing, data, onSave, onClose }: Omit<CourseModalProps, "open">) {
  const [form, setForm] = useState<CourseFormValues>(() => buildInitial(data));
  const [errors, setErrors] = useState<Partial<Record<keyof CourseFormValues, string>>>({});
  const [customMode, setCustomMode] = useState<Record<string, boolean>>(
    () => ({
      category: !!data?.category && !CATEGORIES.includes(data.category),
      careerPath: !!data?.careerPath && !CAREER_PATHS.includes(data.careerPath),
    }),
  );
  const [units, setUnits] = useState<Record<string, "hr" | "min">>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleChange(key: keyof CourseFormValues, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }

  function handleFileUpload(file: File) {
    handleChange("thumbnailUrl", URL.createObjectURL(file));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof CourseFormValues, string>> = {};
    for (const field of FIELDS) {
      if (field.required && !form[field.key as keyof CourseFormValues]) {
        next[field.key as keyof CourseFormValues] = `${field.label} is required`;
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (validate()) onSave(form);
  }

  return (
    <>
      <div className="p-4 overflow-y-auto flex-1">
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map((field) => (
            <div
              key={field.key}
              data-field-key={field.key}
              className={field.full ? "col-span-2 flex flex-col gap-1" : "flex flex-col gap-1"}
            >
              <label
                className="font-mono text-[9.5px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text3)" }}
              >
                {field.label}
                {field.required && <span style={{ color: "var(--red)" }}> *</span>}
              </label>

              {field.type === "textarea" ? (
                <textarea
                  value={form[field.key] as string}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full text-[12px] px-2.5 py-1.5 rounded outline-none resize-vertical"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    border: errors[field.key] ? "1px solid var(--red)" : "1px solid var(--border)",
                    background: "var(--bg)",
                    color: "var(--text)",
                    minHeight: 60,
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--green)"; e.currentTarget.style.background = "var(--surface)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = errors[field.key] ? "var(--red)" : "var(--border)"; e.currentTarget.style.background = "var(--bg)"; }}
                />
              ) : field.type === "select" ? (
                <div className={`relative ${customMode[field.key] ? "flex gap-1.5 items-center" : ""}`}>
                  <select
                    value={customMode[field.key] ? "__other__" : (form[field.key] as string)}
                    onChange={(e) => {
                      if (e.target.value === "__other__") {
                        setCustomMode((prev) => ({ ...prev, [field.key]: true }));
                        handleChange(field.key, "");
                      } else {
                        setCustomMode((prev) => ({ ...prev, [field.key]: false }));
                        handleChange(field.key, e.target.value);
                      }
                    }}
                    className={`text-[12px] px-2.5 py-1.5 rounded outline-none cursor-pointer ${customMode[field.key] ? "w-[55%] shrink-0" : "w-full"}`}
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      border: errors[field.key] ? "1px solid var(--red)" : "1px solid var(--border)",
                      background: "var(--bg)",
                      color: form[field.key] ? "var(--text)" : "var(--text3)",
                      appearance: "none",
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                      paddingRight: 26,
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--green)"; e.currentTarget.style.background = "var(--surface)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = errors[field.key] ? "var(--red)" : "var(--border)"; e.currentTarget.style.background = "var(--bg)"; }}
                  >
                    <option value="">Select {field.label}…</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                    {field.allowCustom && <option value="__other__">Others…</option>}
                  </select>
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px]" style={{ color: "var(--text3)" }}>▼</span>
                  {field.allowCustom && customMode[field.key] && (
                    <input
                      type="text"
                      autoFocus
                      value={form[field.key] as string}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={`New ${field.label.toLowerCase()}…`}
                      className="flex-1 min-w-0 text-[12px] px-2.5 py-1.5 rounded outline-none"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        border: errors[field.key] ? "1px solid var(--red)" : "1px solid var(--green)",
                        background: "var(--bg)",
                        color: "var(--text)",
                      }}
                      onFocus={(e) => { e.currentTarget.style.background = "var(--surface)"; }}
                      onBlur={(e) => { e.currentTarget.style.background = "var(--bg)"; }}
                    />
                  )}
                </div>
              ) : field.type === "duration" ? (
                <div className="flex gap-1.5 items-center">
                  <input
                    type="number"
                    value={form[field.key] as string}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="flex-1 text-[12px] px-2.5 py-1.5 rounded outline-none"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      border: errors[field.key] ? "1px solid var(--red)" : "1px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--text)",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--green)"; e.currentTarget.style.background = "var(--surface)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = errors[field.key] ? "var(--red)" : "var(--border)"; e.currentTarget.style.background = "var(--bg)"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setUnits((prev) => ({ ...prev, [field.key]: prev[field.key] === "min" ? "hr" : "min" }))}
                    className="font-mono text-[10px] font-bold px-2 py-1.5 rounded cursor-pointer shrink-0"
                    style={{ border: "1px solid var(--border)", background: "var(--btn-bg, var(--panel))", color: "var(--btn-text, var(--green))", minWidth: 36 }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--btn-bg-hover, var(--green-d))"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--btn-bg, var(--panel))"; }}
                  >
                    {units[field.key] || "hr"}
                  </button>
                </div>
              ) : field.type === "file" ? (
                <div className="flex flex-col gap-1.5">
                  {form[field.key] ? (
                    <div className="relative w-full rounded overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg)", maxHeight: 120 }}>
                      <img src={form[field.key] as string} alt="Thumbnail" className="w-full h-full object-cover" style={{ maxHeight: 120 }} />
                      <button
                        type="button"
                        onClick={() => handleChange(field.key, "")}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] cursor-pointer"
                        style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
                      >✕</button>
                    </div>
                  ) : null}
                  <label
                    className="cursor-pointer inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded"
                    style={{ border: "1px dashed var(--border2)", color: "var(--text2)", background: "var(--panel)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--green)"; (e.currentTarget as HTMLElement).style.color = "var(--green)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; (e.currentTarget as HTMLElement).style.color = "var(--text2)"; }}
                  >
                    {form[field.key] ? "Change Image" : "Choose Image"}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); e.target.value = ""; }}
                    />
                  </label>
                </div>
              ) : (
                <input
                  type={field.type ?? "text"}
                  value={form[field.key] as string}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full text-[12px] px-2.5 py-1.5 rounded outline-none"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    border: errors[field.key] ? "1px solid var(--red)" : "1px solid var(--border)",
                    background: "var(--bg)",
                    color: "var(--text)",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--green)"; e.currentTarget.style.background = "var(--surface)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = errors[field.key] ? "var(--red)" : "var(--border)"; e.currentTarget.style.background = "var(--bg)"; }}
                />
              )}

              {errors[field.key] && (
                <span className="text-[9.5px]" style={{ color: "var(--red)" }}>{errors[field.key]}</span>
              )}
            </div>
          ))}

          {/* Featured toggle */}
          <div className="col-span-2 flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => handleChange("isFeatured", !form.isFeatured)}
              className="w-9 h-5 rounded-full relative cursor-pointer transition-colors"
              style={{ background: form.isFeatured ? "var(--green)" : "var(--panel)", border: "1px solid var(--border)" }}
            >
              <span className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all" style={{ left: form.isFeatured ? 18 : 2 }} />
            </button>
            <span className="font-mono text-[9.5px] uppercase tracking-wider" style={{ color: "var(--text3)" }}>Mark as Featured</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 px-4 py-3 shrink-0" style={{ borderTop: "1px solid var(--border)", background: "var(--panel)" }}>
        <button
          onClick={onClose}
          className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer"
          style={{ border: "1px solid var(--border)", color: "var(--btn-text, var(--text2))", background: "var(--btn-bg, var(--surface))" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer"
          style={{ background: "var(--btn-bg, var(--green))", color: "var(--btn-text, #fff)", border: "1px solid var(--btn-bg, var(--green))" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
        >
          💾 {editing ? "Update Course" : "Save Course"}
        </button>
      </div>
    </>
  );
}

export function CourseModal({ open, editing, data, onSave, onClose }: CourseModalProps) {
  const formKey = useMemo(() => (data ? JSON.stringify(data) : "new"), [data]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ background: "var(--overlay)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex flex-col rounded-lg max-w-full max-h-[88vh]"
        style={{ width: 600, background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}
      >
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 text-[13.5px] font-extrabold" style={{ color: "var(--text)" }}>
            <span className="w-[26px] h-[26px] rounded flex items-center justify-center text-[13px]" style={{ background: "var(--green-d)", color: "var(--green)" }}>📚</span>
            {editing ? "Edit Course" : "Add Course"}
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-6 h-6 rounded text-[14px] cursor-pointer"
            style={{ color: "var(--btn-text, var(--text3))", background: "var(--btn-bg, transparent)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--btn-bg-hover, var(--panel))"; (e.currentTarget as HTMLElement).style.color = "var(--btn-text, var(--text))"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--btn-bg, transparent)"; (e.currentTarget as HTMLElement).style.color = "var(--btn-text, var(--text3))"; }}
          >
            ✕
          </button>
        </div>

        <CourseForm key={formKey} editing={editing} data={data} onSave={onSave} onClose={onClose} />
      </div>
    </div>
  );
}
