"use client";

import { useState, useEffect } from "react";

export interface FieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "email" | "date" | "textarea";
  required?: boolean;
  placeholder?: string;
  full?: boolean;
  options?: string[];
  optionsFrom?: string;
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
  onSave: (formData: Record<string, any>) => void;
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
  onSave,
  onClose,
}: MasterDataModalProps) {
  const [form, setForm] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm({ ...data });
    setErrors({});
  }, [data, open]);

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
      if (field.required && !form[field.key]) {
        newErrors[field.key] = `${field.label} is required`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (validate()) {
      onSave(form);
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
          width: 560,
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
            style={{ color: "var(--text3)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--panel)";
              (e.currentTarget as HTMLElement).style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--text3)";
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            {fields.map((field) => (
              <div
                key={field.key}
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
                  <select
                    value={form[field.key] ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
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
                  >
                    <option value="">Select {field.label}...</option>
                    {getOptions(field).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
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
              color: "var(--text2)",
              background: "var(--surface)",
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
              background: "var(--orange)",
              color: "#fff",
              border: "1px solid var(--orange)",
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
