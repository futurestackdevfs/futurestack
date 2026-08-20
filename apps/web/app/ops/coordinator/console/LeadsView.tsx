"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import type { LeadRecord } from "@/app/ops/sales/lib/types";
import { Panel, Th, Td, Pill, ActionBtn, ViewHeader, ProgressBar } from "../sections/ui";

const STATUS_FILTERS = ["All", "New", "Interested", "Converted", "Dropped"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function fmtRupee(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function LeadsView({ searchQuery, onToast, refreshSignal, onMutate }: {
  searchQuery: string;
  onToast: (msg: string, type?: "success" | "danger") => void;
  refreshSignal?: number;
  onMutate?: () => void;
}) {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [detail, setDetail] = useState<LeadRecord | null>(null);
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

  useEffect(() => { loadLeads(); }, [refreshSignal, loadLeads]);

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

  async function handleConvert(lead: LeadRecord) {
    setDetail(null);
    try {
      const r = await opsFetch(`/api/sales/leads/${lead.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Converted", score: 100 }),
      });
      if (!r.ok) throw new Error("Convert failed");
      const updated = await r.json();
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      onToast(`Lead converted — ${updated.name}`, "success");
      onMutate?.();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Convert failed", "danger");
    }
  }

  async function handleUpdateStatus(lead: LeadRecord, status: string) {
    setDetail(null);
    try {
      const r = await opsFetch(`/api/sales/leads/${lead.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error("Update failed");
      const updated = await r.json();
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      onToast(`Lead updated — ${updated.name}`, "success");
      onMutate?.();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Update failed", "danger");
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading leads…</div>;

  return (
    <div className="p-4">
      <ViewHeader
        icon="👥"
        title="Leads"
        meta={`${filtered.length} LEADS · EDITABLE`}
      />

      <div className="flex items-center gap-1.5 mb-3">
        {STATUS_FILTERS.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className="font-mono text-[8.5px] font-bold px-2 py-1 rounded cursor-pointer"
            style={{
              background: statusFilter === s ? "var(--blue)" : "var(--panel)",
              color: statusFilter === s ? "#fff" : "var(--text2)",
              border: `1px solid ${statusFilter === s ? "var(--blue)" : "var(--border)"}`,
            }}
          >{s === "All" ? "ALL" : s.toUpperCase()} {s === "All" ? `(${leads.length})` : `(${counts[s] ?? 0})`}</button>
        ))}
      </div>

      <Panel title="Lead Records" count={`${filtered.length} RECORDS`}>
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>No leads found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Lead</Th><Th>Contact</Th><Th>Course</Th><Th>Status</Th>
                  <Th>Follow-up</Th><Th>Budget</Th><Th>Score</Th><Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((lead) => (
                  <tr key={lead.id} className="cursor-pointer" onClick={() => setDetail(lead)}>
                    <Td mono>
                      <div>{lead.name}</div>
                      {lead.email && <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{lead.email}</div>}
                    </Td>
                    <Td mono>{lead.phone ?? "—"}{lead.city && <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{lead.city}</div>}</Td>
                    <Td>{lead.course ?? "Not sure"}</Td>
                    <Td><Pill value={lead.status} /></Td>
                    <Td mono>{fmtDate(lead.nextFollowUp)}</Td>
                    <Td mono color="var(--text)">{lead.budget > 0 ? fmtRupee(lead.budget) : "—"}</Td>
                    <Td><ProgressBar pct={lead.score} /></Td>
                    <Td>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {lead.status !== "Converted" && (
                          <ActionBtn color="var(--green)" onClick={() => handleConvert(lead)}>CONVERT</ActionBtn>
                        )}
                        <ActionBtn color="var(--blue)" onClick={() => setDetail(lead)}>VIEW</ActionBtn>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {!loading && filtered.length > PER_PAGE && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <button onClick={() => setPage(safePage - 1)} disabled={safePage <= 1}
            className="font-mono text-[9px] font-bold px-2.5 py-1 rounded cursor-pointer disabled:opacity-40"
            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
          >← PREV</button>
          <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>
            {((safePage - 1) * PER_PAGE) + 1}–{Math.min(safePage * PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <button onClick={() => setPage(safePage + 1)} disabled={safePage >= totalPages}
            className="font-mono text-[9px] font-bold px-2.5 py-1 rounded cursor-pointer disabled:opacity-40"
            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
          >NEXT →</button>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center" style={{ background: "rgba(0,0,0,.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setDetail(null); }}>
          <div className="rounded w-[480px] max-w-[95vw] p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[13px] font-extrabold" style={{ color: "var(--text)" }}>Lead: {detail.name}</div>
              <button onClick={() => setDetail(null)} className="text-[14px] cursor-pointer" style={{ color: "var(--text3)" }}>✕</button>
            </div>
            <div className="font-mono text-[10px] flex flex-col gap-2 mb-4" style={{ color: "var(--text2)" }}>
              <div>Email: {detail.email ?? "—"}</div>
              <div>Phone: {detail.phone ?? "—"}</div>
              <div>Course: {detail.course ?? "Not sure"}</div>
              <div>Status: <Pill value={detail.status} /></div>
              <div>Budget: {detail.budget > 0 ? fmtRupee(detail.budget) : "—"}</div>
              <div>Source: {detail.source ?? "—"}</div>
            </div>
            <div className="flex gap-2">
              {detail.status !== "New" && (
                <ActionBtn color="var(--blue)" onClick={() => handleUpdateStatus(detail, "New")}>SET NEW</ActionBtn>
              )}
              {detail.status !== "Interested" && (
                <ActionBtn color="var(--amber)" onClick={() => handleUpdateStatus(detail, "Interested")}>INTERESTED</ActionBtn>
              )}
              {detail.status !== "Converted" && (
                <ActionBtn color="var(--green)" solid onClick={() => handleConvert(detail)}>CONVERT</ActionBtn>
              )}
              {detail.status !== "Dropped" && (
                <ActionBtn color="var(--red)" onClick={() => handleUpdateStatus(detail, "Dropped")}>DROP</ActionBtn>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
