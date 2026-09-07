"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useViewParam } from "@/lib/use-view-param";
import { authApi } from "@/app/auth/lib/auth-api";
import { loadStaffToken, clearStaffToken } from "@/app/auth/lib/token-store";
import { OpsStatusbar } from "@/app/ops/components/OpsStatusbar";
import { RoleGate } from "@/app/ops/components/RoleGate";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { CoordinatorTopbar } from "./sections/CoordinatorTopbar";
import { CoordinatorSidebar } from "./sections/CoordinatorSidebar";
import DashboardView from "./console/DashboardView";
import PaymentsView from "./console/PaymentsView";
import LeadsView from "./console/LeadsView";
import StudentsView from "./console/StudentsView";
import BatchesView from "./console/BatchesView";
import TrainerActivityView from "./console/TrainerActivityView";
import EscalationsView from "./console/EscalationsView";
import type { CoordinatorDashboard } from "./lib/types";

const EMPTY_DASHBOARD: CoordinatorDashboard = {
  kpi: {
    totalStudents: 0, activeBatches: 0, totalEnrolled: 0,
    revenueMtd: 0, revenueDelta: 0, pipeline: 0, newLeadsWeek: 0,
    conversionRate: 0, pendingEscalations: 0, trainerCount: 0,
  },
  recentOrders: [],
};

export default function CoordinatorConsolePage() {
  const [view, setView] = useViewParam("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string; initials: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [dashboard, setDashboard] = useState<CoordinatorDashboard>(EMPTY_DASHBOARD);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "danger" }[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      const t = await loadStaffToken().catch(() => null);
      if (!t) { window.location.href = "/auth/staff-login"; return; }
      setToken(t);
      try {
        const u = await authApi.me(t);
        setUser({
          id: u.id!, name: u.name, email: u.email, role: u.role,
          initials: u.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "C",
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

  const loadDashboard = useCallback(async () => {
    try {
      const r = await opsFetch("/api/coordinator/dashboard");
      if (!r.ok) {
        const e = await r.json().catch(() => ({ message: `${r.status}` }));
        throw new Error(e.message ?? "Failed to load dashboard");
      }
      const data = await r.json();
      setDashboard({ ...EMPTY_DASHBOARD, ...data });
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

  const onMutate = useCallback(() => {
    setRefreshKey((k) => k + 1);
    loadDashboard();
  }, [loadDashboard]);

  const badges = useMemo(() => ({
    leads: dashboard.kpi.pipeline,
    escalations: dashboard.kpi.pendingEscalations,
  }), [dashboard]);

  if (sessionLoading) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", color: "var(--text3)" }} className="font-mono text-[11px]">Checking session…</div>;
  if (!user) return null;

  return (
    <RoleGate role="COORDINATOR">
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <CoordinatorTopbar
        user={user}
        currentView={view}
        onSearch={setSearchQuery}
        onSignOut={async () => {
          await clearStaffToken();
          await fetch("/api/auth/set-token-staff", { method: "DELETE" });
          setUser(null);
          window.location.href = "/auth/staff-login";
        }}
      />

      <div className="flex" style={{ flex: 1, overflow: "hidden" }}>
        <CoordinatorSidebar activeView={view} onSwitchView={setView} badges={badges} />

        <main className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
          {dataLoading ? (
            <div className="flex items-center justify-center h-full font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading data…</div>
          ) : (
            <>
              {view === "dashboard" && (
                <DashboardView dashboard={dashboard} onRefresh={loadDashboard} />
              )}
              {view === "payments" && (
                <PaymentsView searchQuery={searchQuery} refreshSignal={refreshKey} onToast={addToast} />
              )}
              {view === "leads" && (
                <LeadsView searchQuery={searchQuery} onToast={addToast} refreshSignal={refreshKey} onMutate={onMutate} />
              )}
              {view === "students" && (
                <StudentsView searchQuery={searchQuery} onToast={addToast} refreshSignal={refreshKey} onMutate={onMutate} />
              )}
              {view === "batches" && (
                <BatchesView searchQuery={searchQuery} refreshSignal={refreshKey} onToast={addToast} />
              )}
              {view === "trainers" && (
                <TrainerActivityView searchQuery={searchQuery} refreshSignal={refreshKey} onToast={addToast} />
              )}
              {view === "escalations" && (
                <EscalationsView onToast={addToast} refreshSignal={refreshKey} onMutate={onMutate} />
              )}
            </>
          )}
        </main>
      </div>

      <OpsStatusbar leftItems={[
        "COORDINATOR_CONSOLE: ACTIVE",
        `STUDENTS: ${dashboard.kpi.totalStudents}`,
        `BATCHES: ${dashboard.kpi.activeBatches}`,
        dataLoading ? "LOADING…" : "LIVE",
      ]} sessionEmail={user.email} />

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
