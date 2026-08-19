"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import type { LeadRecord } from "../lib/types";
import { Panel, Th, Td, Pill, ActionBtn, ViewHeader, ProgressBar } from "../sections/ui";
import { LeadModal } from "../sections/LeadModal";
import { LeadDetailModal } from "../sections/LeadDetailModal";

const STATUS_FILTERS = ["All", "New", "Interested", "Converted", "Dropped"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function fmtRupee(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function LeadsView({ searchQuery, onNewSale, onToast, refreshSignal, onMutate }: {
  searchQuery: string;
  onNewSale: () => void;
  onToast: (msg: string, type?: "success" | "danger") => void;
  refreshSignal?: number;
  onMutate?: () => void;
}) {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [detail, setDetail] = useState<LeadRecord | null>(null);
  const [editing, setEditing] = useState<LeadRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<LeadRecord | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 25;

  const loadLeads = useCallback(async () => {
    try {
      const r = await opsFetch("/api/sales/leads");
      if (!r.ok) throw new Error(`Failed to load leads (${r.status})`);
      const data = await r.json();
      setLeads(Array.isArray(data) ? data : []);
      setPage(1);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Failed to load leads", "danger");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await opsFetch("/api/sales/leads");
        if (!r.ok) throw new Error(`Failed to load leads (${r.status})`);
        const data = await r.json();
        if (active) setLeads(Array.isArray(data) ? data : []);
      } catch (err) {
        if (active) onToast(err instanceof Error ? err.message : "Failed to load leads", "danger");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [onToast, refreshSignal]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { New: 0, Interested: 0, Converted: 0, Dropped: 0 };
    for (const l of leads) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [leads]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== "All" && l.status !== statusFilter) return false;
      if (!q) return true;
      return [l.name, l.email, l.phone, l.course, l.city].some((v) => v && v.toLowerCase().includes(q));
    });
  }, [leads, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  async function handleDelete(lead: LeadRecord) {
    setDeleting(null);
    setDetail(null);
    try {
      const r = await opsFetch(`/api/sales/leads/${lead.id}`, { method: "DELETE" });
      if (!r.ok) {
        const e = await r.json().catch(() => ({ message: `${r.status}` }));
        throw new Error(e.message ?? "Delete failed");
      }
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      onToast(`Lead deleted — ${lead.name}`);
      onMutate?.();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Delete failed", "danger");
    }
  }

  async function handleConvert(lead: LeadRecord) {
    setDetail(null);
    try {
      const r = await opsFetch(`/api/sales/leads/${lead.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Converted", score: 100 }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({ message: `${r.status}` }));
        throw new Error(e.message ?? "Convert failed");
      }
      const updated = await r.json();
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      onToast(`Lead converted — ${updated.name}`, "success");
      onMutate?.();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Convert failed", "danger");
    }
  }

  function handleSaved(msg: string) {
    setCreating(false);
    setEditing(null);
    setDetail(null);
    onToast(msg, "success");
    loadLeads();
    onMutate?.();
  }

  return (
    <div className="p-4">
      <ViewHeader
        icon="👥"
        title="My Leads"
        meta={`${filtered.length} LEADS · DYNAMIC`}
        action={
          <div className="flex items-center gap-2">
            <ActionBtn solid color="var(--orange)" onClick={() => setCreating(true)}>＋ NEW LEAD</ActionBtn>
            <ActionBtn color="var(--blue)" onClick={onNewSale}>＋ NEW SALE</ActionBtn>
          </div>
        }
      />

      {/* Status filter strip */}
      <div className="flex items-center gap-1.5 mb-3">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className="font-mono text-[8.5px] font-bold px-2 py-1 rounded cursor-pointer"
            style={{
              background: statusFilter === s ? "var(--orange)" : "var(--panel)",
              color: statusFilter === s ? "#fff" : "var(--text2)",
              border: `1px solid ${statusFilter === s ? "var(--orange)" : "var(--border)"}`,
            }}
          >
            {s === "All" ? "ALL" : s.toUpperCase()} {s === "All" ? `(${leads.length})` : `(${counts[s] ?? 0})`}
          </button>
        ))}
      </div>

      <Panel title="Lead Records" count={`${filtered.length} RECORDS`}>
        {loading ? (
          <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading leads…</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>
            {leads.length === 0
              ? "0 records — create your first lead with ＋ NEW LEAD"
              : "No leads match your filter/search"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Lead</Th>
                  <Th>Contact</Th>
                  <Th>Course Interest</Th>
                  <Th>Status</Th>
                  <Th>Next Follow-up</Th>
                  <Th>Budget</Th>
                  <Th>Score</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((lead) => (
                  <tr key={lead.id} className="cursor-pointer" onClick={() => setDetail(lead)}>
                    <Td mono>
                      <div>{lead.name}</div>
                      {lead.email && <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{lead.email}</div>}
                    </Td>
                    <Td mono>
                      {lead.phone ?? "—"}
                      {lead.city && <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{lead.city}</div>}
                    </Td>
                    <Td>{lead.course ?? "Not sure yet"}</Td>
                    <Td><Pill value={lead.status} /></Td>
                    <Td mono>{fmtDate(lead.nextFollowUp)}</Td>
                    <Td mono color="var(--text)">{lead.budget > 0 ? fmtRupee(lead.budget) : "—"}</Td>
                    <Td><ProgressBar pct={lead.score} /></Td>
                    <Td>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <ActionBtn color="var(--blue)" onClick={() => setDetail(lead)}>VIEW</ActionBtn>
                        <ActionBtn color="var(--orange)" onClick={() => setEditing(lead)}>EDIT</ActionBtn>
                        <ActionBtn color="var(--red)" onClick={() => setDeleting(lead)}>✕</ActionBtn>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Pagination */}
      {!loading && filtered.length > PER_PAGE && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <button
            onClick={() => setPage(safePage - 1)}
            disabled={safePage <= 1}
            className="font-mono text-[9px] font-bold px-2.5 py-1 rounded cursor-pointer disabled:opacity-40"
            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
          >
            ← PREV
          </button>
          <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>
            {((safePage - 1) * PER_PAGE) + 1}–{Math.min(safePage * PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <button
            onClick={() => setPage(safePage + 1)}
            disabled={safePage >= totalPages}
            className="font-mono text-[9px] font-bold px-2.5 py-1 rounded cursor-pointer disabled:opacity-40"
            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
          >
            NEXT →
          </button>
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <LeadDetailModal
          lead={detail}
          onClose={() => setDetail(null)}
          onEdit={(l) => { setDetail(null); setEditing(l); }}
          onDelete={(l) => { setDetail(null); setDeleting(l); }}
          onConvert={handleConvert}
        />
      )}

      {/* Create / edit modal */}
      {(creating || editing) && (
        <LeadModal
          open
          lead={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={handleSaved}
          onError={(msg) => onToast(msg, "danger")}
        />
      )}

      {/* Delete confirm */}
      {deleting && (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleting(null); }}
        >
          <div className="rounded w-[380px] max-w-[95vw] p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
            <div className="text-[13px] font-extrabold mb-1" style={{ color: "var(--text)" }}>Delete lead?</div>
            <div className="font-mono text-[9.5px] mb-4" style={{ color: "var(--text3)" }}>
              This permanently removes <span className="font-bold" style={{ color: "var(--text)" }}>{deleting.name}</span> from your leads.
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDeleting(null)}
                className="flex-1 py-1.5 rounded font-mono text-[9.5px] font-bold cursor-pointer"
                style={{ background: "var(--panel)", color: "var(--text2)", border: "1px solid var(--border)" }}
              >
                CANCEL
              </button>
              <button
                onClick={() => handleDelete(deleting)}
                className="flex-1 py-1.5 rounded font-mono text-[9.5px] font-bold cursor-pointer"
                style={{ background: "var(--red)", color: "#fff", border: "1px solid var(--red)" }}
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}