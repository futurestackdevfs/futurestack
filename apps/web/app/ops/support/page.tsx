"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authApi } from "@/app/auth/lib/auth-api";
import { loadStaffToken } from "@/app/auth/lib/token-store";
import { OpsTopbar } from "@/app/ops/components/OpsTopbar";
import { OpsStatusbar } from "@/app/ops/components/OpsStatusbar";
import { RoleGate } from "@/app/ops/components/RoleGate";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { SupportSidebar } from "./sections/SupportSidebar";
import { SupportConsoleBody } from "./SupportConsoleBody";
import DashboardView from "./console/DashboardView";
import EmailView from "./console/EmailView";
import StudentsView from "./console/StudentsView";
import EnrollmentsView from "./console/EnrollmentsView";
import RatingsView from "./console/RatingsView";
import PaymentsView from "./console/PaymentsView";
import type { Ticket, TicketStats } from "./lib/types";

const BREADCRUMB: Record<string, string> = {
  dashboard: "dashboard",
  queue: "live-queue",
  pending: "awaiting-student",
  unassigned: "unassigned",
  mine: "my-tickets",
  resolved: "resolved",
  closed: "closed",
  email: "email-outbox",
  students: "students",
  enrollments: "enrollments",
  ratings: "ratings-reviews",
  payments: "payments",
};

const QUEUE_PRESETS: Record<string, { status?: string; scope?: "all" | "me" | "unassigned"; title: string }> = {
  queue: { status: "OPEN", scope: "all", title: "live queue" },
  pending: { status: "PENDING", scope: "all", title: "awaiting student" },
  unassigned: { status: "OPEN", scope: "unassigned", title: "unassigned" },
  mine: { status: "OPEN", scope: "me", title: "my tickets" },
  resolved: { status: "RESOLVED", scope: "all", title: "resolved" },
  closed: { status: "CLOSED", scope: "all", title: "closed" },
};

export default function SupportConsolePage() {
  return (
    <RoleGate role={["SUPPORT", "ADMIN"]}>
      <SupportConsoleInner />
    </RoleGate>
  );
}

function SupportConsoleInner() {
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string; initials: string } | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [view, setView] = useState("dashboard");
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);

  const [stats, setStats] = useState<TicketStats | null>(null);
  const [sample, setSample] = useState<Ticket[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);

  const addToast = useCallback((msg: string) => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);

  useEffect(() => {
    (async () => {
      const t = await loadStaffToken().catch(() => null);
      if (!t) { window.location.href = "/auth/staff-login"; return; }
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

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const statsRes = await opsFetch("/api/support/staff/stats");
      if (statsRes.ok) setStats(await statsRes.json());

      // Pull a working set for the analytics panels — most-recently-updated first.
      const acc: Ticket[] = [];
      for (let page = 1; page <= 4; page++) {
        const r = await opsFetch(`/api/support/staff/tickets?limit=50&page=${page}`);
        if (!r.ok) break;
        const body = await r.json();
        acc.push(...(body.data ?? []));
        if (!body.data || body.data.length < 50 || acc.length >= (body.total ?? 0)) break;
      }
      setSample(acc);
    } catch {
      addToast("Couldn't refresh support data");
    } finally {
      setDataLoading(false);
    }
  }, [addToast]);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  const badges = useMemo(() => {
    const active = sample.filter((t) => t.status === "OPEN" || t.status === "PENDING");
    return {
      open: stats?.OPEN ?? 0,
      pending: stats?.PENDING ?? 0,
      unassigned: active.filter((t) => !t.assignee).length,
      mine: active.filter((t) => t.assignee?.id === user?.id).length,
    };
  }, [sample, stats, user]);

  function openTicket(id: string) {
    setOpenTicketId(id);
    setView("queue");
  }

  if (sessionLoading) {
    return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", color: "var(--text3)" }} className="font-mono text-[11px]">Checking session…</div>;
  }
  if (!user) return null;

  const preset = QUEUE_PRESETS[view];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <OpsTopbar
        role={user}
        breadcrumb={{ title: "support", subtitle: BREADCRUMB[view] ?? "console" }}
      />

      <div className="flex" style={{ flex: 1, overflow: "hidden" }}>
        <SupportSidebar activeView={view} onSwitchView={(v) => { setView(v); setOpenTicketId(null); }} badges={badges} />

        <main className="flex-1" style={{ background: "var(--bg)", overflow: ["email", "students", "enrollments", "ratings", "payments"].includes(view) || preset ? "hidden" : "auto" }}>
          {view === "dashboard" && (
            <DashboardView
              stats={stats} tickets={sample} meId={user.id}
              loading={dataLoading} onRefresh={loadData}
              onOpenTicket={openTicket} onGoView={setView}
            />
          )}
          {view === "email" && <EmailView meId={user.id} onOpenTicket={openTicket} />}
          {view === "students" && <StudentsView onOpenTicket={openTicket} />}
          {view === "enrollments" && <EnrollmentsView onOpenTicket={openTicket} />}
          {view === "ratings" && <RatingsView />}
          {view === "payments" && <PaymentsView />}
          {preset && (
            <SupportConsoleBody
              key={view + (openTicketId ?? "")}
              embedded
              preset={preset}
              initialTicketId={openTicketId}
            />
          )}
        </main>
      </div>

      <OpsStatusbar
        leftItems={[
          "SUPPORT_DESK: ONLINE",
          `OPEN: ${stats?.OPEN ?? 0}`,
          `UNASSIGNED: ${badges.unassigned}`,
          dataLoading ? "SYNCING…" : "LIVE",
        ]}
        sessionEmail={user.email}
      />

      <div className="fixed bottom-9 right-4 flex flex-col gap-2 z-[300]">
        {toasts.map((t) => (
          <div key={t.id} className="flex items-center gap-2 px-3.5 py-2.5 rounded text-[11.5px] font-semibold min-w-[220px]"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,.18)", color: "var(--text)", borderLeft: "3px solid var(--red)" }}>
            <span style={{ fontSize: 13 }}>✕</span>{t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
