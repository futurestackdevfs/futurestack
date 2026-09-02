"use client";

import { useState, useEffect } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { EntityTable, type ColumnDef } from "./EntityTable";
import { showToast } from "@/lib/toast";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  metaDescription: string;
  tags: string[];
  sourceTopic?: string | null;
  status: string;
  publishedAt?: string | null;
  createdAt: string;
}

function useBlogData() {
  const [token, setToken] = useState<string | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      const t = await (await import("@/app/auth/lib/token-store")).loadStaffToken().catch(() => null);
      setToken(t);
      if (!t) {
        window.location.href = "/auth/staff-login";
      }
    })();
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function fetchData() {
      try {
        const res = await opsFetch("/api/articles/admin?all=true", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        if (!cancelled) setPosts(result);
      } catch (e: any) {
        if (!cancelled) showToast(`Failed to load blog posts: ${e.message}`);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [token, refreshKey]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function refresh() {
      try {
        const res = await opsFetch("/api/articles/admin?all=true", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        if (!cancelled) setPosts(result);
      } catch (e: any) {
        if (!cancelled) showToast(`Failed to refresh: ${e.message}`);
      }
    }
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token, refreshKey]);

  return { token, posts, refreshKey, setRefreshKey };
}

const COLUMNS: ColumnDef[] = [
  { key: "title", label: "Title", strong: true },
  {
    key: "status",
    label: "Status",
    render: (val: any, row: any) => {
      const statusText = row.status === "published" ? "Published" : "Draft";
      return (
        <span className="px-2 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider"
          style={{
            background: row.status === "published" ? "var(--green-d)" : "var(--orange-d)",
            color: row.status === "published" ? "var(--green)" : "var(--orange)",
          }}>
          {statusText}
        </span>
      );
    },
  },
  { key: "sourceTopic", label: "Source Topic" },
  { key: "createdAt", label: "Created", render: (val: any, row: any) => new Date(val).toLocaleDateString() },
  { key: "publishedAt", label: "Published", render: (val: any, row: any) => (val ? new Date(val).toLocaleDateString() : "—") },
] as const;

export default function BlogManager() {
  const { token, posts, refreshKey, setRefreshKey } = useBlogData();

  if (!token) return null;

  function handleNavRefresh() {
    setRefreshKey((k) => k + 1);
    showToast(`Refreshed blog dashboard`);
  }

  return (
    <EntityTable
      columns={COLUMNS}
      data={posts}
      emptyMessage={`No blog posts found.`}
      onEdit={() => {}}
      onDelete={() => {}}
    />
  );
}