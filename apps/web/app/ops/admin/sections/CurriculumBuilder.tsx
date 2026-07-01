"use client";

import { useState, useEffect } from "react";

interface Lesson {
  id: number;
  name: string;
  type: string;
  duration: string;
}

interface Section {
  id: number;
  num: string;
  title: string;
  lessons: Lesson[];
}

interface CurriculumData {
  nextSectionId: number;
  sections: Section[];
}

interface CurriculumBuilderProps {
  open: boolean;
  courseName: string;
  courseCode: string;
  curriculum: CurriculumData;
  onSave: (curriculum: CurriculumData) => void;
  onClose: () => void;
}

let lessonIdCounter = 100;

export function CurriculumBuilder({
  open,
  courseName,
  courseCode,
  curriculum,
  onSave,
  onClose,
}: CurriculumBuilderProps) {
  const [data, setData] = useState<CurriculumData>({ nextSectionId: 1, sections: [] });

  useEffect(() => {
    setData(curriculum);
    lessonIdCounter = 100;
  }, [curriculum, open]);

  function addSection() {
    setData((prev) => {
      const secId = prev.nextSectionId;
      const num = String(secId).padStart(2, "0");
      return {
        nextSectionId: secId + 1,
        sections: [
          ...prev.sections,
          { id: secId, num, title: `New Module ${num}`, lessons: [] },
        ],
      };
    });
  }

  function updateSectionTitle(sectionId: number, title: string) {
    setData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, title } : s
      ),
    }));
  }

  function removeSection(sectionId: number) {
    setData((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== sectionId),
    }));
  }

  function addLesson(sectionId: number) {
    setData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s;
        const lid = lessonIdCounter++;
        return {
          ...s,
          lessons: [
            ...s.lessons,
            { id: lid, name: "New Lesson", type: "Video", duration: "15m" },
          ],
        };
      }),
    }));
  }

  function updateLesson(
    sectionId: number,
    lessonId: number,
    field: keyof Lesson,
    value: string
  ) {
    setData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          lessons: s.lessons.map((l) =>
            l.id === lessonId ? { ...l, [field]: value } : l
          ),
        };
      }),
    }));
  }

  function removeLesson(sectionId: number, lessonId: number) {
    setData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s;
        return { ...s, lessons: s.lessons.filter((l) => l.id !== lessonId) };
      }),
    }));
  }

  const totalLessons = data.sections.reduce(
    (sum, s) => sum + s.lessons.length,
    0
  );

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
          <div className="flex items-center gap-2 text-[13.5px] font-extrabold" style={{ color: "var(--text)" }}>
            <span
              className="w-[26px] h-[26px] rounded flex items-center justify-center text-[13px]"
              style={{ background: "var(--orange-d)", color: "var(--orange)" }}
            >
              📚
            </span>
            Manage Curriculum
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
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-3 gap-2">
            <div style={{ fontSize: 11.5, color: "var(--text2)" }}>
              <strong style={{ color: "var(--text)" }}>{courseName}</strong>
              <span className="ml-2 font-mono text-[10px]" style={{ color: "var(--text3)" }}>
                {courseCode}
              </span>
            </div>
            <div className="flex gap-3.5 font-mono text-[10px]" style={{ color: "var(--text3)" }}>
              <span>{data.sections.length} Sections</span>
              <span>{totalLessons} Lessons</span>
            </div>
          </div>

          {/* Sections */}
          {data.sections.map((section, si) => (
            <div
              key={section.id}
              className="rounded mb-2.5 overflow-hidden"
              style={{ border: "1px solid var(--border)" }}
            >
              {/* Section header */}
              <div
                className="flex items-center gap-2 px-3 py-2"
                style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}
              >
                <span
                  className="font-mono text-[9px] font-bold shrink-0"
                  style={{ color: "var(--orange)", width: 22 }}
                >
                  {section.num}
                </span>
                <input
                  value={section.title}
                  onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                  className="flex-1 text-[12px] font-bold rounded px-1.5 py-0.5 outline-none"
                  style={{
                    color: "var(--text)",
                    background: "transparent",
                    border: "1px solid transparent",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.background = "var(--surface)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "transparent";
                    e.currentTarget.style.background = "transparent";
                  }}
                />
                <span className="font-mono text-[9px]" style={{ color: "var(--text3)", whiteSpace: "nowrap" }}>
                  {section.lessons.length} lessons
                </span>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => addLesson(section.id)}
                    className="flex items-center justify-center w-[20px] h-[20px] rounded text-[10px] cursor-pointer"
                    style={{ color: "var(--green)" }}
                    title="Add Lesson"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeSection(section.id)}
                    className="flex items-center justify-center w-[20px] h-[20px] rounded text-[10px] cursor-pointer"
                    style={{ color: "var(--red)" }}
                    title="Remove Section"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Lessons */}
              <div className="px-3 py-1.5">
                {section.lessons.length === 0 ? (
                  <div
                    className="text-center py-2 font-mono text-[10px]"
                    style={{ color: "var(--text3)" }}
                  >
                    No lessons yet
                  </div>
                ) : (
                  section.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="grid gap-2 items-center py-1"
                      style={{
                        gridTemplateColumns: "24px 1.6fr 1fr 70px 28px",
                      }}
                    >
                      <span className="font-mono text-[9px] text-center" style={{ color: "var(--text3)" }}>
                        {lesson.id}
                      </span>
                      <input
                        value={lesson.name}
                        onChange={(e) =>
                          updateLesson(section.id, lesson.id, "name", e.target.value)
                        }
                        className="text-[11px] px-1.5 py-1 rounded outline-none"
                        style={{
                          border: "1px solid var(--border)",
                          background: "var(--bg)",
                          color: "var(--text)",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "var(--orange)";
                          e.currentTarget.style.background = "var(--surface)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "var(--border)";
                          e.currentTarget.style.background = "var(--bg)";
                        }}
                      />
                      <select
                        value={lesson.type}
                        onChange={(e) =>
                          updateLesson(section.id, lesson.id, "type", e.target.value)
                        }
                        className="text-[11px] px-1.5 py-1 rounded outline-none"
                        style={{
                          border: "1px solid var(--border)",
                          background: "var(--bg)",
                          color: "var(--text)",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "var(--orange)";
                          e.currentTarget.style.background = "var(--surface)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "var(--border)";
                          e.currentTarget.style.background = "var(--bg)";
                        }}
                      >
                        <option>Video</option>
                        <option>Video + Lab</option>
                        <option>Video + Docs</option>
                        <option>Quiz</option>
                        <option>Quiz + Project</option>
                        <option>Project</option>
                      </select>
                      <input
                        value={lesson.duration}
                        onChange={(e) =>
                          updateLesson(section.id, lesson.id, "duration", e.target.value)
                        }
                        className="text-[11px] px-1.5 py-1 rounded outline-none text-center"
                        style={{
                          border: "1px solid var(--border)",
                          background: "var(--bg)",
                          color: "var(--text)",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "var(--orange)";
                          e.currentTarget.style.background = "var(--surface)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "var(--border)";
                          e.currentTarget.style.background = "var(--bg)";
                        }}
                      />
                      <button
                        onClick={() => removeLesson(section.id, lesson.id)}
                        className="flex items-center justify-center text-[10px] cursor-pointer"
                        style={{ color: "var(--text3)" }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.color = "var(--red)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.color = "var(--text3)";
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  ))
                )}

                <button
                  onClick={() => addLesson(section.id)}
                  className="font-mono text-[10px] font-semibold inline-flex items-center gap-1 py-1 cursor-pointer"
                  style={{ color: "var(--blue)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.textDecoration = "underline";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.textDecoration = "none";
                  }}
                >
                  + Add Lesson
                </button>
              </div>
            </div>
          ))}

          {/* Add Section button */}
          <button
            onClick={addSection}
            className="w-full py-2.5 rounded font-mono text-[11px] font-semibold text-center cursor-pointer"
            style={{
              border: "1.5px dashed var(--border2)",
              color: "var(--text3)",
              background: "var(--panel)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--orange)";
              (e.currentTarget as HTMLElement).style.color = "var(--orange)";
              (e.currentTarget as HTMLElement).style.background = "var(--orange-d)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)";
              (e.currentTarget as HTMLElement).style.color = "var(--text3)";
              (e.currentTarget as HTMLElement).style.background = "var(--panel)";
            }}
          >
            + Add Section / Module
          </button>
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
            Close
          </button>
          <button
            onClick={() => onSave(data)}
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
            💾 Save Curriculum
          </button>
        </div>
      </div>
    </div>
  );
}
