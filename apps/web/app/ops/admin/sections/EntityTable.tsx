"use client";

import React, { useEffect, useState } from "react";

export interface ColumnDef {
  key: string;
  label: string;
  mono?: boolean;
  strong?: boolean;
  render?: (val: any, row: any) => React.ReactNode;
}

interface EntityTableProps {
  columns: ColumnDef[];
  data: any[];
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onManageCurriculum?: (row: any) => void;
  onManageResources?: (row: any) => void;
  onManageQuestions?: (row: any) => void;
  onManageSkillTest?: (row: any) => void;
  onManageCourse?: (row: any) => void;
  emptyMessage?: string;
  expandedId?: string | number | null;
  onToggleExpand?: (id: string | number) => void;
  renderExpanded?: (row: any) => React.ReactNode;
  /** Rows per page. Pagination is hidden when there is only one page. */
  pageSize?: number;
}

function ActionPill({
  label,
  tint,
  onClick,
}: {
  label: string;
  tint: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[10.5px] font-semibold cursor-pointer whitespace-nowrap transition-all"
      style={{
        color: "var(--text3)",
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
      title={label}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.color = tint;
        (e.currentTarget as HTMLElement).style.borderColor = tint;
        (e.currentTarget as HTMLElement).style.background = `color-mix(in srgb, ${tint} 12%, var(--surface))`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.color = "var(--text3)";
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.background = "var(--surface)";
      }}
    >
      {label}
    </button>
  );
}

export function EntityTable({
  columns,
  data,
  onEdit,
  onDelete,
  onManageCurriculum,
  onManageResources,
  onManageQuestions,
  onManageSkillTest,
  onManageCourse,
  emptyMessage,
  expandedId,
  onToggleExpand,
  renderExpanded,
  pageSize = 10,
}: EntityTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Defensive: callers occasionally hand us a paginated envelope ({ data, total })
  // or an error object instead of a plain array.
  const rows: any[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.data)
      ? (data as any).data
      : [];

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  // Clamp the page if the data shrinks (filtering, deletion, entity switch)
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const isEmpty = rows.length === 0;
  const colSpan = columns.length + 1 + (onToggleExpand ? 1 : 0);
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(pageStart, pageStart + pageSize);

  function getPageNumbers(): (number | "...")[] {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }

  return (
    <>
    <table className="w-full border-collapse" style={{ fontSize: 11 }}>
      <thead>
        <tr>
          {onToggleExpand && (
            <th
              className="w-[30px] text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5"
              style={{
                color: "var(--text3)",
                borderBottom: "1px solid var(--border2)",
                background: "var(--panel)",
              }}
            />
          )}
          {columns.map((col) => (
            <th
              key={col.key}
              className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5"
              style={{
                color: "var(--text3)",
                borderBottom: "1px solid var(--border2)",
                background: "var(--panel)",
              }}
            >
              {col.label}
            </th>
          ))}
          <th
            className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5"
            style={{
              color: "var(--text3)",
              borderBottom: "1px solid var(--border2)",
              background: "var(--panel)",
            }}
          >
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        {isEmpty && (
          <tr>
            <td
              colSpan={colSpan}
              className="py-8 text-center font-mono text-[11px]"
              style={{ color: "var(--text3)" }}
            >
              {emptyMessage || "No records found."}
            </td>
          </tr>
        )}
        {pageRows.map((row, i) => {
          const idx = pageStart + i;
          const isExpanded = expandedId != null && String(expandedId) === String(row.id);
          return (
            <React.Fragment key={row.id || idx}>
              <tr
                style={{
                  background: idx % 2 === 0 ? "var(--row, var(--surface))" : "var(--row-alt, var(--panel))",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--row-h, #eef3fb)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    idx % 2 === 0 ? "var(--row, var(--surface))" : "var(--row-alt, var(--panel))";
                }}
              >
                {onToggleExpand && (
                  <td className="px-2.5 py-1.5 align-middle w-[30px]" style={{ borderBottom: "1px solid var(--border)" }}>
                    <button
                      onClick={() => onToggleExpand(row.id)}
                      className="flex items-center justify-center w-[18px] h-[18px] rounded text-[9px] cursor-pointer"
                      style={{
                        color: "var(--text3)",
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                      }}
                      title={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? "▼" : "▶"}
                    </button>
                  </td>
                )}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-2.5 py-1.5 align-middle"
                    style={{
                      color: "var(--text2)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {col.render ? (
                      col.render(row[col.key], row)
                    ) : (
                      <span
                        className={col.mono ? "font-mono" : ""}
                        style={col.strong ? { fontWeight: 700, color: "var(--text)" } : {}}
                      >
                        {row[col.key] ?? "—"}
                      </span>
                    )}
                  </td>
                ))}
                <td
                  className="px-2.5 py-1.5 align-middle"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <div className="flex flex-wrap gap-1.5">
                    {onManageCourse ? (
                      <ActionPill label="Manage" tint="var(--orange)" onClick={() => onManageCourse(row)} />
                    ) : (
                      <>
                        {onManageCurriculum && (
                          <ActionPill label="Curriculum" tint="var(--orange)" onClick={() => onManageCurriculum(row)} />
                        )}
                        {onManageResources && (
                          <ActionPill label="Resources" tint="var(--green)" onClick={() => onManageResources(row)} />
                        )}
                        {onManageQuestions && (
                          <ActionPill label="Questions" tint="var(--blue)" onClick={() => onManageQuestions(row)} />
                        )}
                        {onManageSkillTest && (
                          <ActionPill label="Skill Test" tint="var(--blue)" onClick={() => onManageSkillTest(row)} />
                        )}
                        {onEdit && (
                          <ActionPill label="Edit" tint="var(--text2)" onClick={() => onEdit(row)} />
                        )}
                      </>
                    )}
                    {onDelete && (
                      <ActionPill label="Delete" tint="var(--red)" onClick={() => onDelete(row)} />
                    )}
                  </div>
                </td>
              </tr>
              {isExpanded && renderExpanded && (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="px-0 py-0"
                    style={{ borderBottom: "1px solid var(--border)", background: "var(--panel)" }}
                  >
                    {renderExpanded(row)}
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>

    {totalPages > 1 && (
      <div className="flex items-center justify-center gap-[6px] px-3 py-3" style={{ borderTop: "1px solid var(--border)" }}>
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
          className="w-[30px] h-[30px] rounded border text-[11px] font-semibold flex items-center justify-center cursor-pointer disabled:opacity-40 transition-all"
          style={{ borderColor: "var(--border)", color: "var(--text2)", background: "var(--surface)" }}
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        {getPageNumbers().map((p, i) => p === "..." ? (
          <span key={`e${i}`} className="px-1 text-[11px]" style={{ color: "var(--muted)" }}>…</span>
        ) : (
          <button
            key={p}
            onClick={() => setCurrentPage(p as number)}
            className="w-[30px] h-[30px] rounded border text-[11px] font-semibold flex items-center justify-center cursor-pointer transition-all"
            style={{
              background: currentPage === p ? "var(--blue)" : "var(--surface)",
              color: currentPage === p ? "#fff" : "var(--text2)",
              borderColor: currentPage === p ? "var(--blue)" : "var(--border)",
            }}
          >{p}</button>
        ))}
        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
          className="w-[30px] h-[30px] rounded border text-[11px] font-semibold flex items-center justify-center cursor-pointer disabled:opacity-40 transition-all"
          style={{ borderColor: "var(--border)", color: "var(--text2)", background: "var(--surface)" }}
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>
    )}
    </>
  );
}

/** Helper: render a status badge */
export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    Active: { bg: "var(--green-d)", fg: "var(--green)" },
    Draft: { bg: "var(--blue-d)", fg: "var(--blue)" },
    Archived: { bg: "var(--text3)", fg: "var(--text3)" },
    Retired: { bg: "var(--red-d)", fg: "var(--red)" },
    Inactive: { bg: "var(--text3)", fg: "var(--text3)" },
    Running: { bg: "var(--green-d)", fg: "var(--green)" },
    Upcoming: { bg: "var(--amber-d)", fg: "var(--amber)" },
    Completed: { bg: "var(--blue-d)", fg: "var(--blue)" },
    Cancelled: { bg: "var(--red-d)", fg: "var(--red)" },
    "On Leave": { bg: "var(--amber-d)", fg: "var(--amber)" },
  };
  const c = colors[status] || { bg: "var(--panel)", fg: "var(--text3)" };

  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
      style={{ background: c.bg, color: c.fg }}
    >
      <span
        style={{ width: 5, height: 5, borderRadius: "50%", background: c.fg }}
      />
      {status}
    </span>
  );
}

/** Helper: render yes/no badge */
export function YesNoBadge({ value }: { value: string }) {
  const yes = value === "Yes";
  return (
    <span
      className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded"
      style={{
        background: yes ? "var(--green-d)" : "var(--red-d)",
        color: yes ? "var(--green)" : "var(--red)",
      }}
    >
      {value}
    </span>
  );
}
