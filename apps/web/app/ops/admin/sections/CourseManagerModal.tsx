"use client";

import { useEffect, useState } from "react";
import { CurriculumBuilder } from "./CurriculumBuilder";
import { ResourceManagerModal } from "./ResourceManagerModal";
import { SkillTestBuilder } from "./SkillTestBuilder";
import { MasterDataModal, type FieldDef } from "./MasterDataModal";

type CourseManagerTab = "curriculum" | "resources" | "skilltest" | "edit";

interface CourseManagerModalProps {
  open: boolean;
  courseId: string;
  courseName: string;
  courseCode: string;
  token: string;
  fields: FieldDef[];
  editData: Record<string, any>;
  extraOptions?: Record<string, { label: string; value: string }[]>;
  onSaveEdit: (formData: Record<string, any>) => Promise<{ success: boolean; error?: string } | void>;
  onCurriculumSaved?: () => void;
  onClose: () => void;
}

async function apiCall(token: string, endpoint: string, options?: RequestInit) {
  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || res.statusText || `Request failed (${res.status})`);
  }
  return res.json();
}

const TABS: { key: CourseManagerTab; icon: string; label: string }[] = [
  { key: "curriculum", icon: "📋", label: "Curriculum" },
  { key: "resources", icon: "📎", label: "Resources" },
  { key: "skilltest", icon: "🧪", label: "Skill Test" },
  { key: "edit", icon: "✏", label: "Edit Details" },
];

export function CourseManagerModal({
  open, courseId, courseName, courseCode, token, fields, editData, extraOptions, onSaveEdit, onCurriculumSaved, onClose,
}: CourseManagerModalProps) {
  const [activeTab, setActiveTab] = useState<CourseManagerTab>("curriculum");
  const [skillTest, setSkillTest] = useState<{ id: string; title: string } | null>(null);
  const [skillTestLoading, setSkillTestLoading] = useState(false);

  useEffect(() => {
    if (open) setActiveTab("curriculum");
  }, [open, courseId]);

  useEffect(() => {
    if (!open || activeTab !== "skilltest" || !token || !courseId) return;
    setSkillTestLoading(true);
    apiCall(token, `/skill-tests/by-course/${courseId}`, {
      method: "POST",
      body: JSON.stringify({ defaultTitle: `${courseName || courseCode} — Skill Test` }),
    })
      .then((test) => setSkillTest({ id: test.id, title: test.title }))
      .catch(() => setSkillTest(null))
      .finally(() => setSkillTestLoading(false));
  }, [open, activeTab, token, courseId, courseName, courseCode]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ background: "var(--overlay)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex flex-col rounded-lg max-w-full max-h-[88vh]"
        style={{
          width: 940,
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
          <div className="flex items-center gap-2 text-[13.5px] font-extrabold" style={{ color: "var(--text)" }}>
            <span
              className="w-[26px] h-[26px] rounded flex items-center justify-center text-[13px]"
              style={{ background: "var(--orange-d)", color: "var(--orange)" }}
            >🗂</span>
            Manage Course{courseName ? <span style={{ fontWeight: 400, color: "var(--text3)" }}> — {courseName}</span> : ""}
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-6 h-6 rounded text-[14px] cursor-pointer"
            style={{ color: "var(--btn-text, var(--text3))", background: "var(--btn-bg, transparent)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--btn-bg-hover, var(--panel))"; (e.currentTarget as HTMLElement).style.color = "var(--btn-text, var(--text))"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--btn-bg, transparent)"; (e.currentTarget as HTMLElement).style.color = "var(--btn-text, var(--text3))"; }}
          >✕</button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1.5 px-4 pt-2.5 shrink-0" style={{ borderBottom: "1px solid var(--border)", background: "var(--panel)" }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 font-mono text-[10.5px] font-bold px-3 py-2 rounded-t cursor-pointer"
              style={{
                color: activeTab === tab.key ? "var(--orange)" : "var(--text3)",
                borderBottom: activeTab === tab.key ? "2px solid var(--orange)" : "2px solid transparent",
                background: "transparent",
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 overflow-y-auto">
          {activeTab === "curriculum" && (
            <CurriculumBuilder
              embedded
              open={true}
              courseId={courseId}
              courseName={courseName}
              courseCode={courseCode}
              token={token}
              onSave={() => { onCurriculumSaved?.(); }}
              onClose={onClose}
            />
          )}
          {activeTab === "resources" && (
            <ResourceManagerModal
              embedded
              open={true}
              courseId={courseId}
              courseName={courseName}
              token={token}
              onClose={onClose}
            />
          )}
          {activeTab === "skilltest" && (
            skillTestLoading || !skillTest ? (
              <div className="text-center py-8 font-mono text-[11px]" style={{ color: "var(--text3)" }}>
                {skillTestLoading ? "Loading skill test..." : "Failed to load skill test."}
              </div>
            ) : (
              <SkillTestBuilder
                embedded
                open={true}
                skillTestId={skillTest.id}
                skillTestTitle={skillTest.title}
                token={token}
                onSave={() => {}}
                onClose={onClose}
              />
            )
          )}
          {activeTab === "edit" && (
            <MasterDataModal
              embedded
              open={true}
              entity="courses"
              icon="📚"
              title="Course"
              fields={fields}
              data={editData}
              editing={!!editData?.id}
              extraOptions={extraOptions}
              token={token}
              onSave={onSaveEdit}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
