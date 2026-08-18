"use client";

import { useState, useEffect, useMemo } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";

const PAGE_SIZE = 10;

function usePaged<T>(rows: T[], pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;
  const goPage = (p: number) => setPage(Math.min(Math.max(1, p), pageCount));
  return { page: current, pageCount, slice: rows.slice(start, start + pageSize), setPage: goPage, total };
}

function pageWindow(page: number, pageCount: number) {
  const start = Math.max(1, page - 2);
  const end = Math.min(pageCount, page + 2);
  const items: (number | "...")[] = [];
  if (start > 1) items.push(1);
  if (start > 2) items.push("...");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < pageCount - 1) items.push("...");
  if (end < pageCount) items.push(pageCount);
  return items;
}

function PaginationBar({
  page,
  pageCount,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPage: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div
      className="flex items-center justify-between px-3 py-2 border-t"
      style={{ borderColor: "var(--border)", background: "var(--panel)" }}
    >
      <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>
        {total} rows · {PAGE_SIZE}/page
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="flex items-center justify-center w-6 h-6 rounded font-mono text-[10px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}
          aria-label="Previous page"
        >
          ‹
        </button>
        {pageWindow(page, pageCount).map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} className="font-mono text-[10px] px-0.5" style={{ color: "var(--text3)" }}>…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className="flex items-center justify-center min-w-6 h-6 px-1.5 rounded font-mono text-[10px] font-bold cursor-pointer transition-colors"
              style={
                p === page
                  ? { background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }
                  : { border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }
              }
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pageCount}
          className="flex items-center justify-center w-6 h-6 rounded font-mono text-[10px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
}

interface SalesLead {
  id: string;
  name: string;
  course: string;
  source: string;
  status: string;
  orderStatus: string;
  date: string;
  value: number;
  salespersonId: string | null;
  salespersonName?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface SalesStaff {
  id: string;
  name: string;
  email: string;
  companyId: string | null;
  isActive: boolean;
  leadsCount: number;
  convertedCount: number;
  conversionRate: number;
  successValue: number;
  totalValue: number;
  avgValue: number;
}

export default function SalesDashboardContent({ onAddStaff, addLabel }: { onAddStaff?: () => void; addLabel?: string }) {
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [publicLeads, setPublicLeads] = useState<SalesLead[]>([]);
  const [salesStaff, setSalesStaff] = useState<SalesStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<SalesStaff | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regeneratedPwd, setRegeneratedPwd] = useState<{ pwd: string; email: string } | null>(null);

  async function copyLoginEmail(staff: SalesStaff) {
    if (!staff.companyId) return;
    try {
      await navigator.clipboard.writeText(staff.companyId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function regeneratePassword(staff: SalesStaff) {
    setRegenerating(true);
    setRegeneratedPwd(null);
    try {
      const res = await opsFetch(`/api/admin/users/${staff.id}/regenerate-password`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
      setRegeneratedPwd({ pwd: body.tempPassword, email: staff.email });
    } catch {
      /* keep silent */
    } finally {
      setRegenerating(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    opsFetch("/api/admin/sales-dashboard")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data?.salesStaff)) setSalesStaff(data.salesStaff);
        if (Array.isArray(data?.leads)) setLeads(data.leads);
        if (Array.isArray(data?.publicLeads)) setPublicLeads(data.publicLeads);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const staffName = (id: string | null) =>
    salesStaff.find((s) => s.id === id)?.name ?? "—";

  const assignedPill = (lead: SalesLead) => {
    const name =
      lead.salespersonName ?? (lead.salespersonId ? staffName(lead.salespersonId) : null);
    if (name) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
          style={{ background: "var(--orange-d)", color: "var(--orange)" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--orange)" }} />
          {name}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
        style={{ background: "var(--amber-d)", color: "var(--amber)" }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--amber)" }} />
        Unassigned
      </span>
    );
  };

  const statusColor = (status: string) => {
    if (status === "Hot" || status === "Dropped") return { fg: "var(--red)", bg: "var(--red-d)" };
    if (status === "Warm" || status === "Interested") return { fg: "var(--amber)", bg: "var(--amber-d)" };
    if (status === "Converted") return { fg: "var(--green)", bg: "var(--green-d)" };
    return { fg: "var(--blue)", bg: "var(--blue-d)" };
  };

  const filtered = useMemo(() => {
    let rows = leads;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((l) => Object.values(l).some((v) => String(v).toLowerCase().includes(q)));
    }
    return rows;
  }, [leads, search]);

  const filteredPublic = useMemo(() => {
    let rows = publicLeads;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((l) => Object.values(l).some((v) => String(v).toLowerCase().includes(q)));
    }
    return rows;
  }, [publicLeads, search]);

  const staffPaged = usePaged(salesStaff);
  const pipelinePaged = usePaged(filtered);
  const publicPaged = usePaged(filteredPublic);

  const connectLinks = (lead: SalesLead) => {
    const email = lead.email ?? "";
    const phone = lead.phone ?? "";
    const whats = phone.replace(/\D/g, "");
    return {
      mailto: email
        ? `mailto:${email}?subject=${encodeURIComponent(`Career Guidance — Future Stack (${lead.name})`)}&body=${encodeURIComponent(
            `Hi ${lead.name},\n\nThanks for reaching out to Future Stack about career guidance${lead.course && lead.course !== "—" ? ` (interest: ${lead.course})` : ""}. Please reply with a convenient time for a call.\n\nRegards,\nFuture Stack Team`,
          )}`
        : null,
      whatsapp: whats
        ? `https://wa.me/${whats.length === 10 ? "91" + whats : whats}?text=${encodeURIComponent(
            `Hi ${lead.name}! I'm from Future Stack. You requested a callback${lead.course && lead.course !== "—" ? ` about ${lead.course}` : ""} — I'd love to help you pick the right course. When's a good time to talk?`,
          )}`
        : null,
    };
  };

  return (
    <div className="p-4 pb-7">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>📞 Sales Dashboard</span>
          <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>role::sales_exec · {salesStaff.length} sales staff</span>
        </div>
        <div className="flex items-center gap-2">
          {onAddStaff && (
            <button
              onClick={onAddStaff}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
              style={{ background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >
              + Add {addLabel}
            </button>
          )}
          <input placeholder="Search leads…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="font-mono text-[10.5px] px-2.5 py-1.5 rounded outline-none w-48"
            style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }} />
        </div>
      </div>

      {/* Sales staff with their lead counts + revenue */}
      <div className="rounded overflow-hidden mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-3 py-2" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>👥 Sales Staff</span>
          <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{salesStaff.length} members</span>
        </div>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr>{["Staff", "Leads", "Converted", "Conv %", "Successful ₹", "Pipeline ₹", "Avg / Lead"].map((h) => (
              <th key={h} className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5"
                style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-2.5 py-4 text-center font-mono text-[10px]" style={{ color: "var(--text3)" }}>Loading…</td>
              </tr>
            ) : salesStaff.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2.5 py-4 text-center font-mono text-[10px]" style={{ color: "var(--text3)" }}>No sales staff yet</td>
              </tr>
            ) : staffPaged.slice.map((s, idx) => (
              <tr key={s.id}
                style={{ background: idx % 2 === 0 ? "var(--surface)" : "var(--panel)", cursor: "pointer" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-h)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? "var(--surface)" : "var(--panel)"; }}
                onClick={() => setSelectedStaff(s)}
              >
                <td className="px-2.5 py-1.5 font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>
                  {s.name}
                  <div className="font-mono text-[8.5px] font-normal" style={{ color: "var(--text3)" }}>{s.companyId ?? s.email}</div>
                </td>
                <td className="px-2.5 py-1.5 font-mono font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{s.leadsCount}</td>
                <td className="px-2.5 py-1.5 font-mono font-bold" style={{ color: "var(--green)", borderBottom: "1px solid var(--border)" }}>{s.convertedCount}</td>
                <td className="px-2.5 py-1.5 font-mono" style={{ color: s.conversionRate >= 50 ? "var(--green)" : "var(--text2)", borderBottom: "1px solid var(--border)" }}>{s.conversionRate}%</td>
                <td className="px-2.5 py-1.5 font-mono" style={{ color: "var(--green)", borderBottom: "1px solid var(--border)" }}>₹{s.successValue.toLocaleString()}</td>
                <td className="px-2.5 py-1.5 font-mono" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>₹{s.totalValue.toLocaleString()}</td>
                <td className="px-2.5 py-1.5 font-mono" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>₹{s.avgValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationBar page={staffPaged.page} pageCount={staffPaged.pageCount} total={staffPaged.total} onPage={staffPaged.setPage} />
      </div>

      {/* Lead pipeline — same table as before, with salesperson column */}
      <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-3 py-2" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>📋 Lead Pipeline</span>
          <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{filtered.length} leads</span>
        </div>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr>{["Name", "Course", "Source", "Status", "Date", "Value", "Salesperson"].map((h) => (
              <th key={h} className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5"
                style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-2.5 py-4 text-center font-mono text-[10px]" style={{ color: "var(--text3)" }}>Loading leads…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2.5 py-4 text-center font-mono text-[10px]" style={{ color: "var(--text3)" }}>No leads yet</td>
              </tr>
            ) : pipelinePaged.slice.map((lead, idx) => (
              <tr key={lead.id}
                style={{ background: idx % 2 === 0 ? "var(--surface)" : "var(--panel)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-h)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? "var(--surface)" : "var(--panel)"; }}
              >
                <td className="px-2.5 py-1.5 font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{lead.name}</td>
                <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: "var(--blue)", borderBottom: "1px solid var(--border)" }}>{lead.course}</td>
                <td className="px-2.5 py-1.5" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{lead.source}</td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{ background: statusColor(lead.status).bg, color: statusColor(lead.status).fg }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: statusColor(lead.status).fg }} />
                    {lead.status}
                  </span>
                </td>
                <td className="px-2.5 py-1.5 font-mono" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{lead.date}</td>
                <td className="px-2.5 py-1.5 font-mono font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>₹{lead.value.toLocaleString()}</td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  {assignedPill(lead)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationBar page={pipelinePaged.page} pageCount={pipelinePaged.pageCount} total={pipelinePaged.total} onPage={pipelinePaged.setPage} />
      </div>

      {/* Public leads — enquiries from the website forms (career guidance, sidebar card, FAB) */}
      <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-3 py-2" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>🌐 Public Leads</span>
          <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{filteredPublic.length} enquiries · website form</span>
        </div>
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr>{["Name", "Contact", "Course", "Status", "Salesperson", "Date", "Connect"].map((h) => (
              <th key={h} className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5"
                style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-2.5 py-4 text-center font-mono text-[10px]" style={{ color: "var(--text3)" }}>Loading…</td>
              </tr>
            ) : filteredPublic.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2.5 py-4 text-center font-mono text-[10px]" style={{ color: "var(--text3)" }}>No public enquiries yet</td>
              </tr>
            ) : publicPaged.slice.map((lead, idx) => (
              <tr key={lead.id}
                style={{ background: idx % 2 === 0 ? "var(--surface)" : "var(--panel)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-h)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? "var(--surface)" : "var(--panel)"; }}
              >
                <td className="px-2.5 py-1.5 font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>
                  {lead.name}
                  {lead.source && <div className="font-mono text-[8.5px] font-normal" style={{ color: "var(--text3)" }}>{lead.source}</div>}
                </td>
                <td className="px-2.5 py-1.5 font-mono text-[9.5px]" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>
                  {lead.phone ?? "—"}
                  {lead.email && <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{lead.email}</div>}
                </td>
                <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: "var(--blue)", borderBottom: "1px solid var(--border)" }}>{lead.course}</td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{ background: statusColor(lead.status).bg, color: statusColor(lead.status).fg }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: statusColor(lead.status).fg }} />
                    {lead.status}
                  </span>
                </td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  {assignedPill(lead)}
                </td>
                <td className="px-2.5 py-1.5 font-mono" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{lead.date}</td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  {(() => {
                    const c = connectLinks(lead);
                    return (
                      <div className="flex items-center gap-1">
                        {c.mailto && (
                          <a href={c.mailto} target="_blank" rel="noopener noreferrer"
                            className="font-mono text-[8.5px] font-bold px-2 py-0.5 rounded no-underline cursor-pointer whitespace-nowrap"
                            style={{ border: "1px solid var(--blue)", color: "var(--blue)" }}>
                            ✉ EMAIL
                          </a>
                        )}
                        {c.whatsapp && (
                          <a href={c.whatsapp} target="_blank" rel="noopener noreferrer"
                            className="font-mono text-[8.5px] font-bold px-2 py-0.5 rounded no-underline cursor-pointer whitespace-nowrap"
                            style={{ border: "1px solid var(--green)", color: "var(--green)" }}>
                            🟢 WHATSAPP
                          </a>
                        )}
                      </div>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationBar page={publicPaged.page} pageCount={publicPaged.pageCount} total={publicPaged.total} onPage={publicPaged.setPage} />
      </div>

      {/* Staff detail popup */}
      {selectedStaff && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={() => setSelectedStaff(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: "linear-gradient(135deg, var(--amber), #d97706)" }}>
                {selectedStaff.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[14px] font-bold truncate" style={{ color: "var(--text)" }}>{selectedStaff.name}</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[9px] font-bold px-1.5 py-[3px] rounded" style={{ background: "var(--amber-d)", color: "var(--amber)" }}>SALES</span>
                  <span className="font-mono text-[9px] font-bold px-1.5 py-[3px] rounded" style={{ background: selectedStaff.isActive ? "var(--green-d)" : "var(--red-d)", color: selectedStaff.isActive ? "var(--green)" : "var(--red)" }}>{selectedStaff.isActive ? "Active" : "Inactive"}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedStaff(null)}
                className="flex items-center justify-center w-7 h-7 rounded-lg border-none bg-transparent cursor-pointer hover:bg-[var(--panel)] transition-colors"
                style={{ color: "var(--text3)" }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="rounded-xl p-4 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">Login Email</span>
                  {selectedStaff.companyId ? (
                    <button
                      onClick={() => copyLoginEmail(selectedStaff)}
                      className="font-mono text-[9px] font-bold px-2.5 py-1 rounded cursor-pointer"
                      style={{ border: "1px solid var(--border)", color: copied ? "var(--green)" : "var(--blue)", background: "var(--surface)" }}
                    >
                      {copied ? "✓ Copied" : "Copy"}
                    </button>
                  ) : null}
                </div>
                <div className="font-mono text-[13px] font-bold truncate" style={{ color: "var(--blue)" }}>
                  {selectedStaff.companyId ?? <span style={{ color: "var(--text3)", fontStyle: "italic" }}>No company login</span>}
                </div>
              </div>

              <div className="rounded-xl p-4 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                <div className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-1.5">Personal Email</div>
                <div className="font-mono text-[12px] font-semibold truncate" style={{ color: "var(--text2)" }}>{selectedStaff.email}</div>
              </div>

              <div className="rounded-xl p-4 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">Password</span>
                  <button
                    onClick={() => regeneratePassword(selectedStaff)}
                    disabled={regenerating}
                    className="font-mono text-[9px] font-bold px-2.5 py-1 rounded cursor-pointer disabled:opacity-50"
                    style={{ border: "1px solid var(--orange)", color: "var(--orange)", background: "var(--surface)" }}
                  >
                    {regenerating ? "…" : "↻ Regenerate"}
                  </button>
                </div>
                {regeneratedPwd ? (
                  <div className="space-y-1">
                    <div className="font-mono text-[13px] font-bold truncate" style={{ color: "var(--orange)" }}>{regeneratedPwd.pwd}</div>
                    <div className="text-[10px]" style={{ color: "var(--green)" }}>✓ New password emailed to {regeneratedPwd.email}</div>
                    <div className="text-[9.5px]" style={{ color: "var(--text3)" }}>Valid for 10 minutes — user must set their own on first login.</div>
                  </div>
                ) : (
                  <div className="text-[10.5px]" style={{ color: "var(--text3)" }}>No active reset. Regenerate sends a new temporary password by email.</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl p-3 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                  <div className="font-mono text-[16px] font-extrabold" style={{ color: "var(--text)" }}>{selectedStaff.leadsCount}</div>
                  <div className="text-[9px] font-semibold text-[var(--text3)] uppercase tracking-wider mt-0.5">Leads</div>
                </div>
                <div className="rounded-xl p-3 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                  <div className="font-mono text-[16px] font-extrabold" style={{ color: "var(--green)" }}>{selectedStaff.convertedCount}</div>
                  <div className="text-[9px] font-semibold text-[var(--text3)] uppercase tracking-wider mt-0.5">Converted</div>
                </div>
                <div className="rounded-xl p-3 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                  <div className="font-mono text-[16px] font-extrabold" style={{ color: "var(--text2)" }}>{selectedStaff.conversionRate}%</div>
                  <div className="text-[9px] font-semibold text-[var(--text3)] uppercase tracking-wider mt-0.5">Conv Rate</div>
                </div>
                <div className="rounded-xl p-3 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                  <div className="font-mono text-[16px] font-extrabold" style={{ color: "var(--green)" }}>₹{selectedStaff.successValue.toLocaleString()}</div>
                  <div className="text-[9px] font-semibold text-[var(--text3)] uppercase tracking-wider mt-0.5">Successful ₹</div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl px-4 py-2.5 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                <span className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">Pipeline Value</span>
                <span className="font-mono text-[12px] font-bold" style={{ color: "var(--text2)" }}>₹{selectedStaff.totalValue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}