"use client";

import { useState, useEffect, useRef } from "react";

export interface FieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "email" | "date" | "textarea" | "file" | "duration" | "discount";
  required?: boolean;
  placeholder?: string;
  full?: boolean;
  options?: string[];
  optionsFrom?: string;
  // Optional selects with a default value real data already carries should
  // still start empty on the Add form (e.g. a career path stored elsewhere).
  defaultEmpty?: boolean;
  // Adds an "Others" option to a select; picking it opens a free-text input
  // next to the select so the admin can type a new value.
  allowCustom?: boolean;
}

interface MasterDataModalProps {
  open: boolean;
  entity: string;
  icon: string;
  title: string;
  fields: FieldDef[];
  data: Record<string, any>;
  editing: boolean;
  extraOptions?: Record<string, { label: string; value: string }[]>;
  token?: string;
  onSave: (formData: Record<string, any>) => Promise<{ success: boolean; error?: string } | void>;
  onClose: () => void;
}

export function MasterDataModal({
  open,
  entity,
  icon,
  title,
  fields,
  data,
  editing,
  extraOptions,
  token,
  onSave,
  onClose,
}: MasterDataModalProps) {
  const [form, setForm] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [units, setUnits] = useState<Record<string, "hr" | "min">>({});
  const [customMode, setCustomMode] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setForm({ ...data });
    setErrors({});
    setApiError(null);
    // Pre-existing values not in a custom-enabled select's options → "Others" mode
    const custom: Record<string, boolean> = {};
    for (const field of fields) {
      if (field.allowCustom && field.options && data[field.key] && !field.options.includes(data[field.key])) {
        custom[field.key] = true;
      }
    }
    setCustomMode(custom);
  }, [data, open]);

  async function handleFileUpload(fieldKey: string, file: File) {
    if (!token) return;
    setUploading((prev) => ({ ...prev, [fieldKey]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const folder = entity === "projects" ? "projects" : "courses";
      const res = await fetch(`/api/upload/image?folder=${folder}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        const result = await res.json();
        setForm((prev) => ({ ...prev, [fieldKey]: result.url }));
      }
    } catch {}
    setUploading((prev) => ({ ...prev, [fieldKey]: false }));
  }

  function handleChange(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required) {
        const val = form[field.key];
        const isEmpty = val === undefined || val === null || (typeof val === "string" && val.trim() === "");
        if (isEmpty) {
          newErrors[field.key] = `${field.label} is required`;
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    setApiError(null);
    if (!validate()) {
      setTimeout(() => {
        const firstMissing = fields.find((f) => {
          if (!f.required) return false;
          const val = form[f.key];
          return val === undefined || val === null || (typeof val === "string" && val.trim() === "");
        });
        if (firstMissing) {
          document
            .querySelector(`[data-field-key="${firstMissing.key}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 0);
      return;
    }
    const result = await onSave(form);
    if (result && !result.success && result.error) {
      setApiError(result.error);
    } else if (result && result.success) {
      onClose();
    }
  }

  function getOptions(field: FieldDef): { label: string; value: string }[] {
    if (field.options) {
      return field.options.map((o) => ({ label: o, value: o }));
    }
    if (field.optionsFrom && extraOptions?.[field.optionsFrom]) {
      return extraOptions[field.optionsFrom];
    }
    return [];
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ background: "var(--overlay)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex flex-col rounded-lg max-w-full max-h-[88vh]"
        style={{
          width: 760,
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
          <div className="flex items-center gap-2 text-[13.5px] font-extrabold" style={{ color: "var(--text)" }}>
            <span
              className="w-[26px] h-[26px] rounded flex items-center justify-center text-[13px]"
              style={{ background: "var(--orange-d)", color: "var(--orange)" }}
            >
              {icon}
            </span>
            {editing ? `Edit ${title}` : `Add ${title}`}
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-6 h-6 rounded text-[14px] cursor-pointer"
            style={{ color: "var(--btn-text, var(--text3))", background: "var(--btn-bg, transparent)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--btn-bg-hover, var(--panel))";
              (e.currentTarget as HTMLElement).style.color = "var(--btn-text, var(--text))";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--btn-bg, transparent)";
              (e.currentTarget as HTMLElement).style.color = "var(--btn-text, var(--text3))";
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1">
          {apiError && (
            <div className="mb-3 px-3 py-2 rounded text-[11px] font-semibold flex items-center gap-2" style={{ background: "var(--red-d, rgba(239,68,68,.1))", border: "1px solid var(--red)", color: "var(--red)" }}>
              <span>⚠</span>
              <span>{apiError}</span>
              <button
                onClick={() => setApiError(null)}
                className="ml-auto text-[10px] opacity-70 hover:opacity-100 cursor-pointer bg-transparent border-none"
                style={{ color: "var(--red)" }}
              >✕</button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {fields.map((field) => (
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

                {field.type === "discount" ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={form[field.key] ?? ""}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-[45%] shrink-0 text-[12px] px-2.5 py-1.5 rounded outline-none"
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          border: errors[field.key]
                            ? "1px solid var(--red)"
                            : "1px solid var(--border)",
                          background: "var(--bg)",
                          color: "var(--text)",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "var(--orange)";
                          e.currentTarget.style.background = "var(--surface)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = errors[field.key]
                            ? "var(--red)"
                            : "var(--border)";
                          e.currentTarget.style.background = "var(--bg)";
                        }}
                      />
                      <span className="text-[11px] font-semibold shrink-0" style={{ color: "var(--text3)" }}>% off</span>
                    </div>
                    {(() => {
                      const pct = Number(form[field.key]);
                      const price = Number(form.price);
                      const hasPrice = Number.isFinite(price) && price > 0;
                      const hasPct = Number.isFinite(pct) && pct > 0 && pct < 100;
                      if (hasPrice && hasPct) {
                        const orig = Math.round((price / (1 - pct / 100)) / 100) * 100;
                        return (
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px]" style={{ background: "var(--green-d)", border: "1px solid var(--border)" }}>
                            <span className="font-mono text-[var(--muted)] line-through">₹{orig.toLocaleString("en-IN")}</span>
                            <span className="font-mono font-bold" style={{ color: "var(--text)" }}>→ ₹{Math.round(price).toLocaleString("en-IN")}</span>
                            <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--green)", color: "#fff" }}>-{pct}%</span>
                            <span className="text-[9.5px] ml-auto" style={{ color: "var(--text3)" }}>list price = ₹{orig.toLocaleString("en-IN")}</span>
                          </div>
                        );
                      }
                      if (hasPrice && Number.isFinite(pct) && pct === 0) {
                        return (
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px]" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text3)" }}>
                            No discount — shows as ₹{Math.round(price).toLocaleString("en-IN")}
                          </div>
                        );
                      }
                      return (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px]" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text3)" }}>
                          Enter a discount % to preview the list price
                        </div>
                      );
                    })()}
                  </div>
                ) : field.type === "textarea" ? (
                  <textarea
                    value={form[field.key] ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full text-[12px] px-2.5 py-1.5 rounded outline-none resize-vertical"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      border: errors[field.key]
                        ? "1px solid var(--red)"
                        : "1px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--text)",
                      minHeight: 60,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--orange)";
                      e.currentTarget.style.background = "var(--surface)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = errors[field.key]
                        ? "var(--red)"
                        : "var(--border)";
                      e.currentTarget.style.background = "var(--bg)";
                    }}
                  />
                ) : field.type === "select" ? (
                  <div className="flex gap-1.5 items-center">
                  <select
                    value={customMode[field.key] ? "__other__" : (form[field.key] ?? "")}
                    onChange={(e) => {
                      if (e.target.value === "__other__") {
                        setCustomMode((prev) => ({ ...prev, [field.key]: true }));
                        handleChange(field.key, "");
                      } else {
                        setCustomMode((prev) => ({ ...prev, [field.key]: false }));
                        handleChange(field.key, e.target.value);
                      }
                    }}
                    className={`text-[12px] px-2.5 py-1.5 rounded outline-none ${customMode[field.key] ? "w-[45%] shrink-0" : "w-full"}`}
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      border: errors[field.key]
                        ? "1px solid var(--red)"
                        : "1px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--text)",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--orange)";
                      e.currentTarget.style.background = "var(--surface)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = errors[field.key]
                        ? "var(--red)"
                        : "var(--border)";
                      e.currentTarget.style.background = "var(--bg)";
                    }}
                  >
                    <option value="">Select {field.label}...</option>
                    {getOptions(field).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                    {field.allowCustom && <option value="__other__">Others…</option>}
                  </select>
                  {field.allowCustom && customMode[field.key] && (
                    <input
                      type="text"
                      autoFocus
                      value={form[field.key] ?? ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={`New ${field.label.toLowerCase()}…`}
                      className="flex-1 min-w-0 text-[12px] px-2.5 py-1.5 rounded outline-none"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        border: errors[field.key] ? "1px solid var(--red)" : "1px solid var(--orange)",
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
                      value={form[field.key] ?? ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="flex-1 text-[12px] px-2.5 py-1.5 rounded outline-none"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        border: errors[field.key]
                          ? "1px solid var(--red)"
                          : "1px solid var(--border)",
                        background: "var(--bg)",
                        color: "var(--text)",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "var(--orange)";
                        e.currentTarget.style.background = "var(--surface)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = errors[field.key]
                          ? "var(--red)"
                          : "var(--border)";
                        e.currentTarget.style.background = "var(--bg)";
                      }}
                    />
                    <button
                      onClick={() =>
                        setUnits((prev) => ({
                          ...prev,
                          [field.key]: prev[field.key] === "min" ? "hr" : "min",
                        }))
                      }
                      className="font-mono text-[10px] font-bold px-2 py-1.5 rounded cursor-pointer shrink-0"
                      style={{
                        border: "1px solid var(--border)",
                        background: "var(--btn-bg, var(--panel))",
                        color: "var(--btn-text, var(--orange))",
                        minWidth: 36,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--btn-bg-hover, var(--orange-d))"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--btn-bg, var(--panel))"; }}
                    >
                      {units[field.key] || "hr"}
                    </button>
                  </div>
                ) : field.type === "file" ? (
                  <div className="flex flex-col gap-1.5">
                    {field.key === "thumbnailUrl" && (
                      <span className="text-[9.5px]" style={{ color: "var(--text3)" }}>Recommended size: 420×160</span>
                    )}
                    {form[field.key] ? (
                      <div className="relative w-full rounded overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg)", maxHeight: 120 }}>
                        <img
                          src={form[field.key]}
                          alt="Thumbnail"
                          className="w-full h-full object-cover"
                          style={{ maxHeight: 120 }}
                        />
                        <button
                          onClick={() => setForm((prev) => ({ ...prev, [field.key]: "" }))}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] cursor-pointer"
                          style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
                        >✕</button>
                      </div>
                    ) : null}
                    <label
                      className="cursor-pointer inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded"
                      style={{
                        border: "1px dashed var(--border2)",
                        color: "var(--text2)",
                        background: "var(--panel)",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--orange)"; (e.currentTarget as HTMLElement).style.color = "var(--orange)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; (e.currentTarget as HTMLElement).style.color = "var(--text2)"; }}
                    >
                      {uploading[field.key] ? "Uploading..." : form[field.key] ? "Change Image" : "Choose Image"}
                      <input
                        ref={(el) => { fileInputRef.current[field.key] = el; }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(field.key, file);
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <input
                    type={field.type}
                    value={form[field.key] ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full text-[12px] px-2.5 py-1.5 rounded outline-none"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      border: errors[field.key]
                        ? "1px solid var(--red)"
                        : "1px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--text)",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--orange)";
                      e.currentTarget.style.background = "var(--surface)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = errors[field.key]
                        ? "var(--red)"
                        : "var(--border)";
                      e.currentTarget.style.background = "var(--bg)";
                    }}
                  />
                )}

                {errors[field.key] && (
                  <span className="text-[9.5px]" style={{ color: "var(--red)" }}>
                    {errors[field.key]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2 px-4 py-3 shrink-0"
          style={{
            borderTop: "1px solid var(--border)",
            background: "var(--panel)",
          }}
        >
          <button
            onClick={onClose}
            className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer"
            style={{
              border: "1px solid var(--border)",
              color: "var(--btn-text, var(--text2))",
              background: "var(--btn-bg, var(--surface))",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer"
            style={{
              background: "var(--btn-bg, var(--orange))",
              color: "var(--btn-text, #fff)",
              border: "1px solid var(--btn-bg, var(--orange))",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "1";
            }}
          >
            💾 Save
          </button>
        </div>
      </div>
    </div>
  );
}
