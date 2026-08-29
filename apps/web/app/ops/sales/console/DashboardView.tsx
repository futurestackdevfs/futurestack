"use client";

import { useState } from "react";
import type { SalesDashboard } from "../lib/types";
import { KpiRow, Panel, Th, Td, Pill, ActionBtn, ViewHeader, ProgressBar } from "../sections/ui";
import RevenueChart from "./RevenueChart";

function fmtRupee(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function DashboardView({ dashboard, onNewSale, onRefresh }: {
  dashboard: SalesDashboard;
  onNewSale: () => void;
  onRefresh?: () => void;
}) {
  const { kpi, revenue, pipeline, snapshot, followUps = [] } = dashboard;
  const [staffFilter, setStaffFilter] = useState<string | null>(null);

  const visiblePipeline = staffFilter
    ? pipeline.filter((p) => p.salespersonId === staffFilter)
    : pipeline;

  const convDeltaColor = kpi.convDelta >= 0 ? "var(--green)" : "var(--red)";

  function exportPipeline() {
    if (visiblePipeline.length === 0) return;
    const header = ["Lead", "Course Interest", "Status", "Last Contact", "Budget", "Score", "Salesperson"];
    const rows = visiblePipeline.map((l) => [
      l.name,
      l.course,
      l.status,
      l.lastContact,
      String(l.budget),
      String(l.score),
      dashboard.staff.find((s) => s.id === l.salespersonId)?.name ?? "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pipeline-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4">
      <ViewHeader
        icon="📊"
        title="Sales Person Responsibility"
        meta="OVERVIEW · LIVE"
        action={
          <div className="flex items-center gap-2">
            <ActionBtn color="var(--blue)" onClick={() => onRefresh?.()}>REFRESH</ActionBtn>
            <ActionBtn solid color="var(--orange)" onClick={onNewSale}>＋ NEW SALE</ActionBtn>
          </div>
        }
      />

      {/* KPI strip */}
      <KpiRow items={[
        { label: "Revenue MTD", value: fmtRupee(kpi.revenueMtd), delta: `${kpi.revenueMtdDelta >= 0 ? "+" : ""}${kpi.revenueMtdDelta}% vs last month`, color: "var(--green)" },
        { label: "Pipeline", value: kpi.pipeline, delta: `+${kpi.pipelineNew} new this week`, color: "var(--blue)" },
        { label: "Converted", value: kpi.converted, delta: `+${kpi.convertedWeek} this week`, color: "var(--green)" },
        { label: "Conv. Rate", value: `${kpi.convRate}%`, delta: `${kpi.convDelta >= 0 ? "+" : ""}${kpi.convDelta} pts`, color: convDeltaColor },
        { label: "Follow-ups", value: followUps.length, delta: "upcoming this week", color: "var(--amber)" },
        { label: "Pipeline ₹", value: fmtRupee(visiblePipeline.filter((l) => l.status !== "Dropped").reduce((s, l) => s + l.budget, 0)), delta: `${visiblePipeline.length} active`, color: "var(--purple)" },
      ]} />

      <div className="flex gap-4">
        {/* Main column */}
        <div className="flex-1 min-w-0">
          {/* Revenue analytics */}
          <Panel title="Revenue Analytics" count="ONLINE vs OFFLINE" action={<Pill value={revenue.monthly.onlineShare >= 50 ? "Online" : "Offline"} />}>
            <div className="p-3">
              <RevenueChart monthly={revenue.monthly} yearly={revenue.yearly} />
            </div>
          </Panel>

          {/* Active lead pipeline */}
          <Panel title="Active Lead Pipeline" count={`${visiblePipeline.length} LEADS`} action={<ActionBtn color="var(--blue)" onClick={exportPipeline}>EXPORT</ActionBtn>}>
            {visiblePipeline.length === 0 ? (
              <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>0 records — pipeline will populate from orders</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <Th>Lead</Th>
                      <Th>Course Interest</Th>
                      <Th>Status</Th>
                      <Th>Last Contact</Th>
                      <Th>Budget</Th>
                      <Th>Score</Th>
                      <Th>Salesperson</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePipeline.slice(0, 8).map((lead) => (
                      <tr key={lead.id}>
                        <Td mono>{lead.name}</Td>
                        <Td>{lead.course}</Td>
                        <Td><Pill value={lead.status} /></Td>
                        <Td mono>{lead.lastContact}</Td>
                        <Td mono color="var(--text)">{fmtRupee(lead.budget)}</Td>
                        <Td><ProgressBar pct={lead.score} /></Td>
                        <Td mono>
                          {dashboard.staff.find((s) => s.id === lead.salespersonId)?.name ?? "—"}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        {/* Right column */}
        <div className="w-[300px] shrink-0">
          {/* Pipeline snapshot */}
          <Panel title="Pipeline Snapshot" count="NOW">
            <div className="p-3 flex flex-col gap-2">
              {[
                { label: "New Leads", value: snapshot.newLeads, color: "var(--blue)" },
                { label: "Interested", value: snapshot.interested, color: "var(--amber)" },
                { label: "Converted", value: snapshot.converted, color: "var(--green)" },
                { label: "Dropped", value: snapshot.dropped, color: "var(--red)" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{row.label.toUpperCase()}</span>
                  <span className="font-mono text-[12px] font-bold" style={{ color: row.color }}>{row.value}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid var(--border)" }} className="mt-1 pt-2 flex items-center justify-between">
                <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>TOTAL</span>
                <span className="font-mono text-[12px] font-bold" style={{ color: "var(--text)" }}>{dashboard.pipelineCount}</span>
              </div>
            </div>
          </Panel>

          {/* Sales staff attribution */}
          <Panel title="Sales Team" count={`${dashboard.staff.length} MEMBERS`}>
            <div className="p-2 flex flex-col">
              {dashboard.staff.length === 0 ? (
                <div className="py-3 text-center font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>No sales staff yet</div>
              ) : (
                dashboard.staff.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStaffFilter(staffFilter === s.id ? null : s.id)}
                    className="flex items-center justify-between px-1.5 py-1.5 rounded cursor-pointer text-left"
                    style={{
                      background: staffFilter === s.id ? "var(--orange-d)" : "transparent",
                      border: "1px solid transparent",
                    }}
                  >
                    <div>
                      <div className="text-[10.5px] font-semibold" style={{ color: "var(--text)" }}>{s.name}</div>
                      <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{s.companyId ?? s.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[10px] font-bold" style={{ color: "var(--orange)" }}>{s.leadsCount} leads</div>
                      <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{fmtRupee(s.totalValue)}</div>
                    </div>
                  </button>
                ))
              )}
              {staffFilter && (
                <button
                  onClick={() => setStaffFilter(null)}
                  className="mt-1 font-mono text-[8.5px] font-bold cursor-pointer"
                  style={{ color: "var(--blue)", background: "none", border: "none", textAlign: "left" }}
                >
                  ✕ Clear filter ({dashboard.staff.find((s) => s.id === staffFilter)?.name})
                </button>
              )}
            </div>
          </Panel>

          {/* Upcoming follow-ups (real lead data) */}
          <Panel title="Upcoming Follow-ups" count="SCHEDULE">
            {followUps.length === 0 ? (
              <div className="p-3 text-center font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>No follow-ups scheduled</div>
            ) : (
              <div className="p-2 flex flex-col gap-1">
                {followUps.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 px-1.5 py-1.5 rounded" style={{ background: "var(--panel)" }}>
                    <span style={{ fontSize: 13 }}>📞</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10.5px] font-semibold truncate" style={{ color: "var(--text)" }}>{f.name}</div>
                      <div className="font-mono text-[8.5px] truncate" style={{ color: "var(--text3)" }}>{f.course ?? "Not sure yet"}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-[8.5px] font-bold" style={{ color: "var(--amber)" }}>{fmtDateTime(f.nextFollowUp)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}