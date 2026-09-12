"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { formatDateTimeIST } from "@/lib/format-date";

interface AuditRow {
  id: string;
  actorId: string;
  actorRole: string;
  actorEmail: string | null;
  actorName: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  changes: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

const PAGE_SIZE = 25;

const ACTIONS = ["", "CREATE", "UPDATE", "DELETE", "DEACTIVATE", "APPROVE", "REJECT", "REFUND"];
const ENTITIES = ["", "Coupon", "Course", "Track", "HeroSlide", "Enrollment", "Refund", "PaymentSettings", "Trainer", "Staff", "User"];

const ACTION_COLOR: Record<string, { fg: string; bg: string }> = {
  CREATE: { fg: "var(--green)", bg: "var(--green-d)" },
  UPDATE: { fg: "var(--blue)", bg: "var(--blue-d)" },
  DELETE: { fg: "var(--red)", bg: "var(--red-d)" },
  DEACTIVATE: { fg: "var(--orange)", bg: "var(--orange-d)" },
  APPROVE: { fg: "var(--green)", bg: "var(--green-d)" },
  REJECT: { fg: "var(--red)", bg: "var(--red-d)" },
  REFUND: { fg: "var(--purple)", bg: "var(--purple-d)" },
};

function actionColor(a: string) {
  return ACTION_COLOR[a] ?? { fg: "var(--text2)", bg: "var(--bg)" };
}

/** One-line summary of the `changes` blob for the table cell. */
function changesSummary(changes: Record<string, unknown> | null): string {
  if (!changes) return "—";
  const after = (changes.after ?? changes.requested) as Record<string, unknown> | undefined;
  const before = changes.before as Record<string, unknown> | undefined;
  if (after && typeof after === "object") {
    const keys = Object.keys(after);
    if (keys.length === 0) return "—";
    return keys
      .slice(0, 4)
      .map((k) => {
        const to = after[k];
        const from = before?.[k];
        return from !== undefined && from !== to
          ? `${k}: ${fmt(from)} → ${fmt(to)}`
          : `${k}: ${fmt(to)}`;
      })
      .join("  ·  ") + (keys.length > 4 ? "  …" : "");
  }
  return "—";
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// ─── detail modal ───────────────────────────────────────────────────────────

function DetailRow({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
      <span className="text-[11px] shrink-0" style={{ color: "var(--text3)" }}>{label}</span>
      <span
        className={`text-[11px] text-right break-all ${mono ? "font-mono text-[10.5px]" : ""}`}
        style={{ color: "var(--text)" }}
      >
        {value}
      </span>
    </div>
  );
}

function ChangesBlock({ changes }: { changes: Record<string, unknown> | null }) {
  if (!changes || Object.keys(changes).length === 0) {
    return <div className="text-[11px] py-1.5" style={{ color: "var(--text3)" }}>No field changes recorded.</div>;
  }
  const before = changes.before as Record<string, unknown> | undefined;
  const after = (changes.after ?? changes.requested) as Record<string, unknown> | undefined;
  const label = changes.requested ? "requested" : "after";

  if (!after) {
    return (
      <pre
        className="mt-1 p-2.5 rounded font-mono text-[9.5px] overflow-x-auto"
        style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text2)" }}
      >
        {JSON.stringify(changes, null, 2)}
      </pre>
    );
  }

  const keys = Object.keys(after);
  return (
    <div className="mt-1 rounded overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="grid grid-cols-[1fr_1fr_1fr] font-mono text-[8.5px] font-bold uppercase tracking-wider" style={{ background: "var(--panel)", color: "var(--text3)" }}>
        <div className="px-2 py-1">Field</div>
        <div className="px-2 py-1">Before</div>
        <div className="px-2 py-1">{label}</div>
      </div>
      {keys.map((k) => (
        <div key={k} className="grid grid-cols-[1fr_1fr_1fr] font-mono text-[9.5px]" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="px-2 py-1 break-all" style={{ color: "var(--text2)" }}>{k}</div>
          <div className="px-2 py-1 break-all" style={{ color: "var(--text3)" }}>{before ? fmt(before[k]) : "—"}</div>
          <div className="px-2 py-1 break-all" style={{ color: "var(--text)" }}>{fmt(after[k])}</div>
        </div>
      ))}
    </div>
  );
}

function AuditDetailModal({ row, onClose }: { row: AuditRow; onClose: () => void }) {
  const c = actionColor(row.action);
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,.5)" }}
      onClick={onClose}
    >
      <div
        className="rounded-xl w-[520px] max-w-full max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 24px 48px rgba(0,0,0,.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-[14px] font-bold" style={{ color: "var(--text)" }}>Audit entry</span>
          <button onClick={onClose} className="text-[18px] cursor-pointer" style={{ color: "var(--text3)", background: "none", border: "none" }}>✕</button>
        </div>

        <div className="px-5 py-4">
          <div className="mb-3">
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: c.bg, color: c.fg }}>{row.action}</span>
            <span className="text-[11px] ml-2" style={{ color: "var(--text2)" }}>
              {row.entityType ?? "—"}{row.entityId ? ` · ${row.entityId}` : ""}
            </span>
          </div>

          <div className="font-mono text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>When</div>
          <DetailRow label="Timestamp" value={formatDateTimeIST(row.createdAt)} />
          <DetailRow label="ISO" value={row.createdAt} mono />

          <div className="font-mono text-[9px] font-bold uppercase tracking-wider mt-3 mb-1" style={{ color: "var(--text3)" }}>Actor</div>
          <DetailRow label="Name" value={row.actorName || "—"} />
          <DetailRow label="Email" value={row.actorEmail || "—"} />
          <DetailRow label="Role" value={row.actorRole} />
          <DetailRow label="User ID" value={row.actorId} mono />
          <DetailRow label="IP address" value={row.ipAddress || "—"} mono />
          <DetailRow label="User agent" value={row.userAgent || "—"} mono />

          <div className="font-mono text-[9px] font-bold uppercase tracking-wider mt-3 mb-1" style={{ color: "var(--text3)" }}>Target</div>
          <DetailRow label="Entity type" value={row.entityType || "—"} />
          <DetailRow label="Entity ID" value={row.entityId || "—"} mono />

          <div className="font-mono text-[9px] font-bold uppercase tracking-wider mt-3 mb-1" style={{ color: "var(--text3)" }}>Changes</div>
          <ChangesBlock changes={row.changes} />

          {row.meta && Object.keys(row.meta).length > 0 && (
            <>
              <div className="font-mono text-[9px] font-bold uppercase tracking-wider mt-3 mb-1" style={{ color: "var(--text3)" }}>Context</div>
              {Object.entries(row.meta).map(([k, v]) => (
                <DetailRow key={k} label={k} value={fmt(v)} mono />
              ))}
            </>
          )}

          <div className="font-mono text-[9px] font-bold uppercase tracking-wider mt-3 mb-1" style={{ color: "var(--text3)" }}>Entry</div>
          <DetailRow label="Log ID" value={row.id} mono />

          <details className="mt-3">
            <summary className="text-[10px] cursor-pointer" style={{ color: "var(--text3)" }}>Raw JSON</summary>
            <pre
              className="mt-1.5 p-2.5 rounded font-mono text-[9.5px] overflow-x-auto"
              style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text2)" }}
            >
              {JSON.stringify(row, null, 2)}
            </pre>
          </details>
        </div>

        <div className="flex justify-end px-5 py-3" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={onClose}
            className="font-mono text-[10px] font-semibold px-4 py-1.5 rounded cursor-pointer"
            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── main ───────────────────────────────────────────────────────────────────

export default function AuditLogManager() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [selected, setSelected] = useState<AuditRow | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), perPage: String(PAGE_SIZE) });
      if (action) params.set("action", action);
      if (entityType) params.set("entityType", entityType);
      const res = await opsFetch(`/api/admin/audit-logs?${params}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setPageCount(data.pageCount ?? 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load audit log");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, action, entityType]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { setPage(1); }, [action, entityType]);

  const selectStyle = { border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" };

  return (
    <div className="p-4 pb-7">
      <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>🗒 Audit Log</span>
          <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
            admin · {total} {total === 1 ? "entry" : "entries"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select value={action} onChange={(e) => setAction(e.target.value)} className="font-mono text-[10px] px-2.5 py-1.5 rounded outline-none cursor-pointer" style={selectStyle}>
            {ACTIONS.map((a) => <option key={a} value={a}>{a || "All actions"}</option>)}
          </select>
          <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="font-mono text-[10px] px-2.5 py-1.5 rounded outline-none cursor-pointer" style={selectStyle}>
            {ENTITIES.map((e) => <option key={e} value={e}>{e || "All entities"}</option>)}
          </select>
          <button onClick={fetchRows} className="font-mono text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}>↻ Refresh</button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg px-3 py-2 mb-3 font-mono text-[10px]" style={{ background: "var(--red-d)", color: "var(--red)", border: "1px solid var(--red)" }}>{error}</div>
      )}

      <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr>
              {["Time", "Actor", "Action", "Entity", "Changes", "IP"].map((h) => (
                <th key={h} className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5" style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-2.5 py-4 text-center font-mono text-[10px]" style={{ color: "var(--text3)" }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-2.5 py-4 text-center font-mono text-[10px]" style={{ color: "var(--text3)" }}>{error ? "—" : "No audit entries yet"}</td></tr>
            ) : (
              rows.map((r, idx) => {
                const c = actionColor(r.action);
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    style={{ background: idx % 2 === 0 ? "var(--surface)" : "var(--panel)", cursor: "pointer" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-h)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? "var(--surface)" : "var(--panel)"; }}
                  >
                    <td className="px-2.5 py-1.5 font-mono text-[9px] whitespace-nowrap" style={{ color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>
                      {formatDateTimeIST(r.createdAt)}
                    </td>
                    <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                      <div className="font-semibold" style={{ color: "var(--text)" }}>{r.actorName || r.actorEmail || r.actorId}</div>
                      <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{r.actorRole}</div>
                    </td>
                    <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: c.bg, color: c.fg }}>{r.action}</span>
                    </td>
                    <td className="px-2.5 py-1.5 font-mono text-[9px]" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>
                      {r.entityType ?? "—"}
                      {r.entityId ? <span style={{ color: "var(--text3)" }}> · {r.entityId.slice(0, 10)}…</span> : null}
                    </td>
                    <td className="px-2.5 py-1.5 font-mono text-[9px]" style={{ color: "var(--text3)", borderBottom: "1px solid var(--border)", maxWidth: 320 }}>
                      <div className="truncate">{changesSummary(r.changes)}</div>
                    </td>
                    <td className="px-2.5 py-1.5 font-mono text-[9px]" style={{ color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>{r.ipAddress || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {pageCount > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
            <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>{total} rows</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="font-mono text-[10px] px-2 py-1 rounded cursor-pointer disabled:opacity-40" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}>‹</button>
              <span className="font-mono text-[10px] font-bold px-2" style={{ color: "var(--text)" }}>{page}/{pageCount}</span>
              <button onClick={() => setPage(Math.min(pageCount, page + 1))} disabled={page >= pageCount} className="font-mono text-[10px] px-2 py-1 rounded cursor-pointer disabled:opacity-40" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}>›</button>
            </div>
          </div>
        )}
      </div>

      {selected && <AuditDetailModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
