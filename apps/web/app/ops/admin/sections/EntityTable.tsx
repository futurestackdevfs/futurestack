"use client";

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
  emptyMessage?: string;
}

export function EntityTable({
  columns,
  data,
  onEdit,
  onDelete,
  onManageCurriculum,
  emptyMessage,
}: EntityTableProps) {
  if (data.length === 0) {
    return (
      <div
        className="py-8 text-center font-mono text-[11px]"
        style={{ color: "var(--text3)" }}
      >
        {emptyMessage || "No records found."}
      </div>
    );
  }

  return (
    <table className="w-full border-collapse" style={{ fontSize: 11 }}>
      <thead>
        <tr>
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
        {data.map((row, idx) => (
          <tr
            key={row.id || idx}
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
              <div className="flex gap-1 whitespace-nowrap">
                {onManageCurriculum && (
                  <button
                    onClick={() => onManageCurriculum(row)}
                    className="flex items-center justify-center w-[22px] h-[22px] rounded text-[11px] cursor-pointer"
                    style={{
                      color: "var(--text3)",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                    }}
                    title="Manage Curriculum"
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "var(--orange)";
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--orange)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "var(--text3)";
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                    }}
                  >
                    📋
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => onEdit(row)}
                    className="flex items-center justify-center w-[22px] h-[22px] rounded text-[11px] cursor-pointer"
                    style={{
                      color: "var(--text3)",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                    }}
                    title="Edit"
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "var(--text)";
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "var(--text3)";
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                    }}
                  >
                    ✏
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(row)}
                    className="flex items-center justify-center w-[22px] h-[22px] rounded text-[11px] cursor-pointer"
                    style={{
                      color: "var(--text3)",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                    }}
                    title="Delete"
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "var(--red)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(200,30,58,.35)";
                      (e.currentTarget as HTMLElement).style.background = "var(--red-d)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "var(--text3)";
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLElement).style.background = "var(--surface)";
                    }}
                  >
                    🗑
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
