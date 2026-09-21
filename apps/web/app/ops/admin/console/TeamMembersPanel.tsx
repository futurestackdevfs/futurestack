"use client";

import { useEffect, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

function fmt(iso: string | null): string {
  if (!iso) return "Never";
  return iso.slice(0, 16).replace("T", " ");
}

/**
 * Real staff-member listing scoped to one role — embedded directly inside
 * each role console (Trainer/Coordinator/Support/Content Manager) so admins
 * don't have to jump to the central "User Accounts" page to see who's on
 * that team, when they last logged in, and when their account last changed.
 * Backed by the same GET /admin/users endpoint as User Accounts, filtered
 * client-side to this one role.
 */
export function TeamMembersPanel({ role, label }: { role: string; label: string }) {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    opsFetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setUsers(list.filter((u: TeamUser) => u.role === role));
      })
      .catch(() => { if (!cancelled) setUsers([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [role]);

  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
        <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>👥 {label} Team</span>
        <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{activeCount} active / {users.length} total</span>
      </div>
      {loading ? (
        <div className="py-6 text-center font-mono text-[10px]" style={{ color: "var(--text3)" }}>Loading team…</div>
      ) : users.length === 0 ? (
        <div className="py-6 text-center font-mono text-[10px]" style={{ color: "var(--text3)" }}>No {label.toLowerCase()} accounts yet.</div>
      ) : (
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr>{["Name", "Email", "Status", "Last Login", "Last Updated", "Joined"].map((h) => (
              <th key={h} className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5"
                style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {users.map((u, idx) => (
              <tr key={u.id} style={{ background: idx % 2 === 0 ? "var(--surface)" : "var(--panel)" }}>
                <td className="px-2.5 py-1.5 font-semibold" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{u.name}</td>
                <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{u.email}</td>
                <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{ background: u.isActive ? "var(--green-d)" : "var(--red-d)", color: u.isActive ? "var(--green)" : "var(--red)" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: u.isActive ? "var(--green)" : "var(--red)" }} />
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-2.5 py-1.5 font-mono text-[9.5px] whitespace-nowrap" style={{ color: "var(--text3)" }}>{fmt(u.lastLoginAt)}</td>
                <td className="px-2.5 py-1.5 font-mono text-[9.5px] whitespace-nowrap" style={{ color: "var(--text3)" }}>{fmt(u.updatedAt)}</td>
                <td className="px-2.5 py-1.5 font-mono text-[9.5px] whitespace-nowrap" style={{ color: "var(--text3)" }}>{u.createdAt?.slice(0, 10) || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
