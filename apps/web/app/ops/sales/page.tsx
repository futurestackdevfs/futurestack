"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo, useCallback } from "react";
import { authApi } from "@/app/auth/lib/auth-api";
import { loadStaffToken, clearStaffToken } from "@/app/auth/lib/token-store";
import { OpsStatusbar } from "@/app/ops/components/OpsStatusbar";
import { RoleGate } from "@/app/ops/components/RoleGate";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { SalesTopbar } from "./sections/SalesTopbar";
import { SalesSidebar } from "./sections/SalesSidebar";
import { SaleModal } from "./sections/SaleModal";
import DashboardView from "./console/DashboardView";
import LeadsView from "./console/LeadsView";
import FollowupsView from "./console/FollowupsView";
import ConvertedView from "./console/ConvertedView";
import RevenueView from "./console/RevenueView";
import type { SalesDashboard } from "./lib/types";

const EMPTY_DASHBOARD: SalesDashboard = {
  kpi: {
    revenueMtd: 0, revenueMtdDelta: 0, pipeline: 0, pipelineNew: 0,
    converted: 0, convertedWeek: 0, demosScheduled: 0, callsMade: 0,
    convRate: 0, convDelta: 0,
  },
  revenue: {
    monthly: { labels: [], online: [], offline: [], onlineTotal: 0, offlineTotal: 0, combined: 0, onlineShare: 0 },
    yearly: { labels: [], online: [], offline: [], onlineTotal: 0, offlineTotal: 0, combined: 0, onlineShare: 0 },
  },
  pipeline: [],
  followUps: [],
  snapshot: { newLeads: 0, interested: 0, converted: 0, dropped: 0 },
  staff: [],
  pipelineCount: 0,
  targetPct: 0,
};

export default function SalesConsolePage() {
  const [view, setView] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string; initials: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [dashboard, setDashboard] = useState<SalesDashboard>(EMPTY_DASHBOARD);
  const [saleOpen, setSaleOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "danger" }[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  /* ── session + user auth ── */
  useEffect(() => {
    (async () => {
      const t = await loadStaffToken().catch(() => null);
      if (!t) { window.location.href = "/auth/staff-login"; return; }
      setToken(t);
      try {
        const u = await authApi.me(t);
        setUser({
          id: u.id!, name: u.name, email: u.email, role: u.role,
          initials: u.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "S",
        });
      } catch { window.location.href = "/auth/staff-login"; }
      finally { setSessionLoading(false); }
    })();
  }, []);

  const addToast = useCallback((msg: string, type: "success" | "danger" = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  /* ── fetch dashboard ── */
  const loadDashboard = useCallback(async () => {
    try {
      const r = await opsFetch("/api/sales/dashboard");
      if (!r.ok) {
        const e = await r.json().catch(() => ({ message: `${r.status}` }));
        throw new Error(e.message ?? "Failed to load dashboard");
      }
      const data = await r.json();
      setDashboard({ ...EMPTY_DASHBOARD, ...data, revenue: { ...EMPTY_DASHBOARD.revenue, ...data.revenue } });
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to load dashboard", "danger");
    } finally {
      setDataLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!token || !user) return;
    (async () => { await loadDashboard(); })();
  }, [token, user, loadDashboard]);

  /* ── any lead/sale mutation → refresh dashboard + all lead lists ── */
  const onMutate = useCallback(() => {
    setRefreshKey((k) => k + 1);
    loadDashboard();
  }, [loadDashboard]);

  const badges = useMemo(() => ({
    leads: dashboard.snapshot.newLeads + dashboard.snapshot.interested,
    followups: dashboard.pipeline.filter((p) => p.status === "Interested").length,
    converted: dashboard.kpi.converted,
  }), [dashboard]);

  if (sessionLoading) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", color: "var(--text3)" }} className="font-mono text-[11px]">Checking session…</div>;
  if (!user) return null;

  return (
    <RoleGate role="SALES">
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <SalesTopbar
        user={user}
        currentView={view}
        onSearch={setSearchQuery}
        onNewSale={() => setSaleOpen(true)}
        onSignOut={async () => {
          await clearStaffToken();
          await fetch("/api/auth/set-token-staff", { method: "DELETE" });
          setUser(null);
          window.location.href = "/auth/staff-login";
        }}
      />

      <div className="flex" style={{ flex: 1, overflow: "hidden" }}>
        <SalesSidebar activeView={view} onSwitchView={setView} badges={badges} />

        <main className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
          {dataLoading ? (
            <div className="flex items-center justify-center h-full font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading data…</div>
          ) : (
            <>
              {view === "dashboard" && (
                <DashboardView dashboard={dashboard} onNewSale={() => setSaleOpen(true)} onRefresh={loadDashboard} />
              )}
              {view === "leads" && (
                <LeadsView searchQuery={searchQuery} onNewSale={() => setSaleOpen(true)} onToast={addToast} refreshSignal={refreshKey} onMutate={onMutate} />
              )}
              {view === "followups" && (
                <FollowupsView searchQuery={searchQuery} onNewSale={() => setSaleOpen(true)} onToast={addToast} refreshSignal={refreshKey} onMutate={onMutate} />
              )}
              {view === "converted" && (
                <ConvertedView pipeline={dashboard.pipeline} searchQuery={searchQuery} refreshSignal={refreshKey} onToast={addToast} />
              )}
              {view === "revenue" && (
                <RevenueView dashboard={dashboard} />
              )}
              {view === "targets" && (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="text-[22px] font-bold" style={{ color: "var(--text)" }}>Coming Soon</div>
                    <div className="font-mono text-[11px]" style={{ color: "var(--text3)" }}>Sales targets are in the works</div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <OpsStatusbar leftItems={[
        "CRM_SYNC: OK",
        `PIPELINE: ${dashboard.pipelineCount} ACTIVE`,
        `TARGET: ${dashboard.targetPct}% MTD`,
        dataLoading ? "LOADING…" : "LIVE",
      ]} sessionEmail={user.email} />

      <SaleModal
        open={saleOpen}
        onClose={() => setSaleOpen(false)}
        onComplete={(msg) => { addToast(msg, "success"); onMutate(); }}
        onError={(msg) => addToast(msg, "danger")}
      />

      {/* Toasts */}
      <div className="fixed bottom-9 right-4 flex flex-col gap-2 z-[300]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded text-[11.5px] font-semibold min-w-[220px]"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 8px 24px rgba(0,0,0,.18)",
              color: "var(--text)",
              borderLeft: `3px solid ${t.type === "success" ? "var(--green)" : "var(--red)"}`,
              animation: "toast-in .2s ease",
            }}
          >
            <span style={{ fontSize: 13 }}>{t.type === "success" ? "✓" : "✕"}</span>
            {t.msg}
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
    </RoleGate>
  );
}