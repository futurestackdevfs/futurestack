"use client";

import type { SalesDashboard } from "../lib/types";
import { KpiRow, Panel, ViewHeader, Pill } from "../sections/ui";
import RevenueChart from "./RevenueChart";

function fmtL(n: number): string {
  return "₹" + (n / 100000).toLocaleString("en-IN", { maximumFractionDigits: 1 }) + "L";
}

function fmtRupee(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function RevenueView({ dashboard }: { dashboard: SalesDashboard }) {
  const { kpi, revenue } = dashboard;

  return (
    <div className="p-4">
      <ViewHeader icon="💰" title="Revenue" meta="MTD · YTD" />

      <KpiRow items={[
        { label: "Revenue MTD", value: fmtRupee(kpi.revenueMtd), delta: `${kpi.revenueMtdDelta >= 0 ? "+" : ""}${kpi.revenueMtdDelta}% vs last month`, color: "var(--green)" },
        { label: "Online (6mo)", value: fmtL(revenue.monthly.onlineTotal), delta: `${revenue.monthly.onlineShare}% of revenue`, color: "var(--blue)" },
        { label: "Offline (6mo)", value: fmtL(revenue.monthly.offlineTotal), delta: `${100 - revenue.monthly.onlineShare}% of revenue`, color: "var(--purple)" },
        { label: "Total (6mo)", value: fmtL(revenue.monthly.combined), delta: "online + offline", color: "var(--text)" },
      ]} />

      <Panel title="Revenue Analytics" count="ONLINE vs OFFLINE" action={<Pill value={revenue.monthly.onlineShare >= 50 ? "Online" : "Offline"} />}>
        <div className="p-3">
          <RevenueChart monthly={revenue.monthly} yearly={revenue.yearly} />
        </div>
      </Panel>
    </div>
  );
}