"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { authApi } from "@/app/auth/lib/auth-api";
import { loadStaffToken, clearStaffToken } from "@/app/auth/lib/token-store";
import { OpsStatusbar } from "@/app/ops/components/OpsStatusbar";
import { RoleGate } from "@/app/ops/components/RoleGate";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { ContentManagerTopbar } from "./sections/ContentManagerTopbar";
import { ContentManagerSidebar } from "./sections/ContentManagerSidebar";
import DashboardView from "./console/DashboardView";
import MasterDataView from "./console/MasterDataView";
import CurriculumView from "./console/CurriculumView";
import ProjectBuilderView from "./console/ProjectBuilderView";
import ResourcesView from "./console/ResourcesView";
import MediaView from "./console/MediaView";
import TrainerApprovalsView from "./console/TrainerApprovalsView";
import AllTrainersView from "./console/AllTrainersView";
import DiscussionsView from "./console/DiscussionsView";

interface CmStats {
  totalCourses: number;
  activeCourses: number;
  draftCourses: number;
  totalProjects: number;
  activeProjects: number;
  totalTrainers: number;
  pendingTrainers: number;
  totalEnrollments: number;
  totalResources: number;
}

export default function ContentManagerConsolePage() {
  const [view, setView] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string; initials: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [stats, setStats] = useState<CmStats | null>(null);
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

  const loadStats = useCallback(async () => {
    try {
      const [statsRes, coursesRes, projectsRes, trainersRes] = await Promise.all([
        opsFetch("/api/admin/stats"),
        opsFetch("/api/courses"),
        opsFetch("/api/projects/admin/all"),
        opsFetch("/api/admin/trainers/pending"),
      ]);
      const statsData = statsRes.ok ? await statsRes.json() : {};
      const courses = coursesRes.ok ? await coursesRes.json() : [];
      const projects = projectsRes.ok ? await projectsRes.json() : [];
      const pending = trainersRes.ok ? await trainersRes.json() : [];
      setStats({
        totalCourses: Array.isArray(courses) ? courses.length : statsData.totalCourses ?? 0,
        activeCourses: Array.isArray(courses) ? courses.filter((c: any) => c.status === "ACTIVE").length : 0,
        draftCourses: Array.isArray(courses) ? courses.filter((c: any) => c.status === "DRAFT").length : 0,
        totalProjects: Array.isArray(projects) ? projects.length : 0,
        activeProjects: Array.isArray(projects) ? projects.filter((p: any) => p.status === "ACTIVE").length : 0,
        totalTrainers: statsData.totalTrainers ?? 0,
        pendingTrainers: Array.isArray(pending) ? pending.length : 0,
        totalEnrollments: statsData.totalEnrollments ?? 0,
        totalResources: 0,
      });
    } catch { /* ignore */ } finally { setDataLoading(false); }
  }, []);

  useEffect(() => {
    if (!token || !user) return;
    loadStats();
  }, [token, user, loadStats]);

  const onMutate = useCallback(() => {
    setRefreshKey((k) => k + 1);
    loadStats();
  }, [loadStats]);

  const badges = {
    courses: stats?.draftCourses ?? 0,
    projects: stats?.totalProjects ?? 0,
    pendingTrainers: stats?.pendingTrainers ?? 0,
  };

  if (sessionLoading) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", color: "var(--text3)" }} className="font-mono text-[11px]">Checking session…</div>;
  if (!user) return null;

  return (
    <RoleGate role="CONTENT_MANAGER">
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <ContentManagerTopbar
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
        <ContentManagerSidebar activeView={view} onSwitchView={setView} badges={badges} />

        <main className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
          {dataLoading ? (
            <div className="flex items-center justify-center h-full font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading data…</div>
          ) : (
            <>
              {view === "dashboard" && (
                <DashboardView stats={stats} onRefresh={loadStats} onNavigate={setView} />
              )}
              {view === "master-data" && (
                <MasterDataView searchQuery={searchQuery} refreshSignal={refreshKey} onToast={addToast} />
              )}
              {view === "courses" && (
                <MasterDataView searchQuery={searchQuery} refreshSignal={refreshKey} onToast={addToast} />
              )}
              {view === "projects" && (
                <MasterDataView searchQuery={searchQuery} refreshSignal={refreshKey} onToast={addToast} />
              )}
              {view === "curriculum" && (
                <CurriculumView searchQuery={searchQuery} refreshSignal={refreshKey} onToast={addToast} />
              )}
              {view === "project-builder" && (
                <ProjectBuilderView searchQuery={searchQuery} refreshSignal={refreshKey} onToast={addToast} />
              )}
              {view === "resources" && (
                <ResourcesView refreshSignal={refreshKey} onToast={addToast} />
              )}
              {view === "media" && (
                <MediaView refreshSignal={refreshKey} onToast={addToast} />
              )}
              {view === "trainer-approvals" && (
                <TrainerApprovalsView refreshSignal={refreshKey} onToast={addToast} onMutate={onMutate} />
              )}
              {view === "all-trainers" && (
                <AllTrainersView searchQuery={searchQuery} refreshSignal={refreshKey} onToast={addToast} />
              )}
              {view === "discussions" && (
                <DiscussionsView searchQuery={searchQuery} refreshSignal={refreshKey} onToast={addToast} />
              )}
            </>
          )}
        </main>
      </div>

      <OpsStatusbar leftItems={[
        "CONTENT_MGR: ACTIVE",
        `COURSES: ${stats?.totalCourses ?? 0}`,
        `PROJECTS: ${stats?.totalProjects ?? 0}`,
        `PENDING: ${stats?.pendingTrainers ?? 0}`,
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
