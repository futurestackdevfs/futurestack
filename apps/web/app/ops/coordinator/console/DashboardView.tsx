"use client";

import type { CoordinatorDashboard } from "../lib/types";
import { KpiRow, Panel, ViewHeader, ActionBtn } from "../sections/ui";

function fmtRupee(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function DashboardView({ dashboard, onRefresh }: {
  dashboard: CoordinatorDashboard;
  onRefresh?: () => void;
}) {
  const { kpi, recentOrders } = dashboard;

  return (
    <div className="p-4">
      <ViewHeader
        icon="🗂"
        title="Coordinator Dashboard"
        meta="OVERVIEW · LIVE"
        action={<ActionBtn color="var(--blue)" onClick={() => onRefresh?.()}>REFRESH</ActionBtn>}
      />

      <KpiRow items={[
        { label: "Total Students", value: kpi.totalStudents, delta: "active accounts", color: "var(--blue)" },
        { label: "Active Batches", value: kpi.activeBatches, delta: `${kpi.totalEnrolled} enrolled`, color: "var(--purple)" },
        { label: "Revenue MTD", value: fmtRupee(kpi.revenueMtd), delta: `${kpi.revenueDelta >= 0 ? "+" : ""}${kpi.revenueDelta}% vs last month`, color: "var(--green)" },
        { label: "Pipeline", value: kpi.pipeline, delta: "pending orders", color: "var(--amber)" },
        { label: "New Leads", value: kpi.newLeadsWeek, delta: "this week", color: "var(--blue)" },
        { label: "Conv. Rate", value: `${kpi.conversionRate}%`, delta: "overall", color: "var(--green)" },
        { label: "Escalations", value: kpi.pendingEscalations, delta: "needs attention", color: "var(--red)" },
        { label: "Trainers", value: kpi.trainerCount, delta: "active", color: "var(--purple)" },
      ]} />

      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <Panel title="Recent Paid Orders" count={`${recentOrders.length} LATEST`}>
            {recentOrders.length === 0 ? (
              <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>No paid orders yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5" style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>Order</th>
                      <th className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5" style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>Amount</th>
                      <th className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5" style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>Mode</th>
                      <th className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5" style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o, i) => (
                      <tr key={o.id} style={{ background: i % 2 === 0 ? "var(--surface)" : "var(--panel)" }}>
                        <td className="px-2.5 py-1.5 font-mono text-[10px] font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{o.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: "var(--green)", borderBottom: "1px solid var(--border)" }}>{fmtRupee(o.amount)}</td>
                        <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{o.mode ?? "Online"}</td>
                        <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>{new Date(o.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        <div className="w-[280px] shrink-0">
          <Panel title="Quick Stats" count="NOW">
            <div className="p-3 flex flex-col gap-2.5">
              {[
                { label: "Students", value: kpi.totalStudents, color: "var(--blue)" },
                { label: "Batches", value: kpi.activeBatches, color: "var(--purple)" },
                { label: "Enrolled", value: kpi.totalEnrolled, color: "var(--green)" },
                { label: "Trainers", value: kpi.trainerCount, color: "var(--amber)" },
                { label: "Escalations", value: kpi.pendingEscalations, color: "var(--red)" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{row.label.toUpperCase()}</span>
                  <span className="font-mono text-[12px] font-bold" style={{ color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
