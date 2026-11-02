"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import nextDynamic from "next/dynamic";
import { useViewParam } from "@/lib/use-view-param";
import { authApi } from "@/app/auth/lib/auth-api";
import { loadStaffToken } from "@/app/auth/lib/token-store";
import { OpsTopbar } from "@/app/ops/components/OpsTopbar";
import { OpsStatusbar } from "@/app/ops/components/OpsStatusbar";
import { RoleGate } from "@/app/ops/components/RoleGate";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { SupportSidebar } from "./sections/SupportSidebar";
import type { Ticket, TicketStats } from "./lib/types";

function ViewLoading() {
  return (
    <div className="h-full flex items-center justify-center font-mono text-[11px]" style={{ color: "var(--text3)" }}>
      Loading…
    </div>
  );
}
const SupportConsoleBody = nextDynamic(() => import("./SupportConsoleBody").then((m) => m.SupportConsoleBody), { loading: ViewLoading });
const DashboardView = nextDynamic(() => import("./console/DashboardView"), { loading: ViewLoading });
const EmailView = nextDynamic(() => import("./console/EmailView"), { loading: ViewLoading });
const InboxView = nextDynamic(() => import("./console/InboxView"), { loading: ViewLoading });
const StudentsView = nextDynamic(() => import("./console/StudentsView"), { loading: ViewLoading });
const EnrollmentsView = nextDynamic(() => import("./console/EnrollmentsView"), { loading: ViewLoading });
const RatingsView = nextDynamic(() => import("./console/RatingsView"), { loading: ViewLoading });
const PaymentsView = nextDynamic(() => import("./console/PaymentsView"), { loading: ViewLoading });
const RefundsView = nextDynamic(() => import("./console/RefundsView"), { loading: ViewLoading });

const BREADCRUMB: Record<string, string> = {
  dashboard: "dashboard",
  queue: "live-queue",
  pending: "awaiting-student",
  unassigned: "unassigned",
  mine: "my-tickets",
  resolved: "resolved",
  closed: "closed",
  inbox: "inbox",
  email: "email-outbox",
  students: "students",
  enrollments: "enrollments",
  ratings: "ratings-reviews",
  payments: "payments",
  refunds: "my-refunds",
};

const QUEUE_PRESETS: Record<string, { status?: string; scope?: "all" | "me" | "unassigned"; title: string }> = {
  queue: { scope: "all", title: "live queue" },
  pending: { status: "PENDING", scope: "all", title: "awaiting student" },
  unassigned: { status: "OPEN", scope: "unassigned", title: "unassigned" },
  mine: { scope: "me", title: "my tickets" },
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

  const [view, setView] = useViewParam("dashboard");
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);

  const [stats, setStats] = useState<TicketStats | null>(null);
  const [sample, setSample] = useState<Ticket[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const sampleLoaded = useRef(false);
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Stats + the sidebar badge counts: one cheap request, needed on every screen.
  const loadStats = useCallback(async () => {
    try {
      const r = await opsFetch("/api/support/staff/stats");
      if (r.ok) setStats(await r.json());
    } catch {
      addToast("Couldn't refresh support data");
    }
  }, [addToast]);

  // The ticket sample feeds the Dashboard charts only, so it is fetched when the Dashboard is open
  // (2 pages in parallel instead of 4 requests on every screen).
  const loadSample = useCallback(async () => {
    setDataLoading(true);
    try {
      const PAGE_LIMIT = 50;
      const pages = await Promise.all(
        [1, 2].map((p) =>
          opsFetch(`/api/support/staff/tickets?limit=${PAGE_LIMIT}&page=${p}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ),
      );
      setSample(pages.flatMap((body) => body?.data ?? []));
      sampleLoaded.current = true;
    } catch {
      addToast("Couldn't refresh support data");
    } finally {
      setDataLoading(false);
    }
  }, [addToast]);

  const loadData = useCallback(async () => {
    await Promise.all([loadStats(), view === "dashboard" ? loadSample() : Promise.resolve()]);
  }, [loadStats, loadSample, view]);

  useEffect(() => { if (user) loadStats(); }, [user, loadStats]);
  useEffect(() => {
    if (user && view === "dashboard" && !sampleLoaded.current) loadSample();
    else if (view !== "dashboard") setDataLoading(false);
  }, [user, view, loadSample]);

  const badges = useMemo(
    () => ({
      open: stats?.OPEN ?? 0,
      pending: stats?.PENDING ?? 0,
      unassigned: stats?.UNASSIGNED ?? 0,
      mine: stats?.MINE ?? 0,
    }),
    [stats],
  );

  function openTicket(id: string) {
    setOpenTicketId(id);
    setView("queue");
  }

  if (sessionLoading) {
    return <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", color: "var(--text3)" }} className="font-mono text-[11px]">Checking session…</div>;
  }
  if (!user) return null;

  const preset = QUEUE_PRESETS[view];

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      <OpsTopbar
        role={user}
        breadcrumb={{ title: "support", subtitle: BREADCRUMB[view] ?? "console" }}
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="flex min-h-0" style={{ flex: 1, overflow: "hidden" }}>
        <SupportSidebar
          activeView={view}
          onSwitchView={(v) => { setView(v); setOpenTicketId(null); }}
          badges={badges}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 min-h-0" style={{ background: "var(--bg)", overflow: ["inbox", "email", "students", "enrollments", "ratings", "payments", "refunds"].includes(view) || preset ? "hidden" : "auto" }}>
          {view === "dashboard" && (
            <DashboardView
              stats={stats} tickets={sample} meId={user.id}
              loading={dataLoading} onRefresh={loadData}
              onOpenTicket={openTicket} onGoView={setView}
            />
          )}
          {view === "inbox" && <InboxView />}
          {view === "email" && <EmailView meId={user.id} onOpenTicket={openTicket} />}
          {view === "students" && <StudentsView onOpenTicket={openTicket} />}
          {view === "enrollments" && <EnrollmentsView onOpenTicket={openTicket} />}
          {view === "ratings" && <RatingsView />}
          {view === "payments" && <PaymentsView />}
          {view === "refunds" && <RefundsView onOpenTicket={openTicket} />}
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
          dataLoading && view === "dashboard" ? "SYNCING…" : "LIVE",
        ]}
        sessionEmail={user.email}
      />

      <div className="fixed bottom-9 right-3 left-3 sm:left-auto sm:right-4 flex flex-col gap-2 z-[300]">
        {toasts.map((t) => (
          <div key={t.id} className="flex items-center gap-2 px-3.5 py-2.5 rounded text-[11.5px] font-semibold sm:min-w-[220px]"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,.18)", color: "var(--text)", borderLeft: "3px solid var(--red)" }}>
            <span style={{ fontSize: 13 }}>✕</span>{t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
