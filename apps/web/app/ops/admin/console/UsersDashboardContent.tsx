"use client";

import { useState, useEffect, useMemo } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";

interface User {
  id: string;
  name: string;
  email: string;
  companyId: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  avatarUrl: string | null;
  approvalStatus: string | null;
  trainerSharePercent: number | null;
  createdAt: string;
  lastLoginAt: string | null;
  _count: { enrollments: number; coursesTaught: number };
}

const ROLE_COLORS: Record<string, string> = {
  STUDENT: "var(--blue)",
  TRAINER: "var(--purple)",
  ADMIN: "var(--orange)",
  COORDINATOR: "var(--green)",
  SUPPORT: "var(--cyan)",
  CONTENT_MANAGER: "var(--pink)",
  SALES: "var(--amber)",
};

const ROLE_BGS: Record<string, string> = {
  STUDENT: "var(--blue-d)",
  TRAINER: "var(--purple-d)",
  ADMIN: "var(--orange-d)",
  COORDINATOR: "var(--green-d)",
  SUPPORT: "var(--cyan-d)",
  CONTENT_MANAGER: "var(--pink-d)",
  SALES: "var(--amber-d)",
};

const PER_PAGE = 15;

export default function UsersDashboardContent({ searchQuery = "" }: { searchQuery?: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [savingCut, setSavingCut] = useState<string | null>(null);
  const [selected, setSelected] = useState<User | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regeneratedPwd, setRegeneratedPwd] = useState<{ pwd: string | null; email: string } | null>(null);

  async function copyValue(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function regeneratePassword(u: User) {
    setRegenerating(true);
    setRegeneratedPwd(null);
    try {
      const res = await opsFetch(`/api/admin/users/${u.id}/regenerate-password`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
      setRegeneratedPwd({ pwd: body.tempPassword ?? null, email: u.email });
    } catch {
      /* keep silent — button just stays idle */
    } finally {
      setRegenerating(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    opsFetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => { if (!cancelled && Array.isArray(data)) setUsers(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter === "active" && !u.isActive) return false;
      if (statusFilter === "inactive" && u.isActive) return false;
      const q = search.trim().toLowerCase();
      const eq = searchQuery.trim().toLowerCase();
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (eq && !u.name.toLowerCase().includes(eq) && !u.email.toLowerCase().includes(eq)) return false;
      return true;
    });
  }, [users, search, searchQuery, roleFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  function handleFilterChange(setter: (v: string) => void, value: string) {
    setter(value);
    setCurrentPage(1);
  }

  async function saveTrainerShare(id: string, current: number | null, inputEl: HTMLInputElement | null) {
    const raw = Number(inputEl?.value);
    const pct = Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : null;
    if (pct === current) return;
    setSavingCut(id);
    try {
      const res = await opsFetch(`/api/admin/trainers/${id}/share`, {
        method: "PATCH",
        body: JSON.stringify({ trainerSharePercent: pct }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }
      const updated = await res.json();
      const share = typeof updated?.trainerSharePercent === "number" ? updated.trainerSharePercent : pct;
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, trainerSharePercent: share } : u)));
    } catch {
      if (inputEl) inputEl.value = String(current ?? "");
    } finally {
      setSavingCut(null);
    }
  }

  function getPageNumbers() {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }

  const stats = useMemo(() => {
    const total = users.length;
    const roles: Record<string, number> = {};
    for (const u of users) {
      roles[u.role] = (roles[u.role] || 0) + 1;
    }
    return { total, roles, active: users.filter((u) => u.isActive).length };
  }, [users]);

  return (
    <div className="p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>👤 User Accounts</span>
          <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>
            role::administrator · {stats.total} total users
          </span>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-6 gap-2">
        <div className="rounded px-3 py-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="font-mono text-[18px] font-extrabold" style={{ color: "var(--text)" }}>{stats.total}</div>
          <div className="font-mono text-[8.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text3)" }}>Total Users</div>
        </div>
        <div className="rounded px-3 py-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="font-mono text-[18px] font-extrabold" style={{ color: "var(--green)" }}>{stats.active}</div>
          <div className="font-mono text-[8.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text3)" }}>Active</div>
        </div>
        <div className="rounded px-3 py-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="font-mono text-[18px] font-extrabold" style={{ color: "var(--blue)" }}>{stats.roles["STUDENT"] || 0}</div>
          <div className="font-mono text-[8.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text3)" }}>Students</div>
        </div>
        <div className="rounded px-3 py-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="font-mono text-[18px] font-extrabold" style={{ color: "var(--purple)" }}>{stats.roles["TRAINER"] || 0}</div>
          <div className="font-mono text-[8.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text3)" }}>Trainers</div>
        </div>
        <div className="rounded px-3 py-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="font-mono text-[18px] font-extrabold" style={{ color: "var(--orange)" }}>{stats.roles["ADMIN"] || 0}</div>
          <div className="font-mono text-[8.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text3)" }}>Admins</div>
        </div>
        <div className="rounded px-3 py-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="font-mono text-[18px] font-extrabold" style={{ color: "var(--green)" }}>{(stats.roles["COORDINATOR"] || 0) + (stats.roles["SUPPORT"] || 0) + (stats.roles["CONTENT_MANAGER"] || 0) + (stats.roles["SALES"] || 0)}</div>
          <div className="font-mono text-[8.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text3)" }}>Other Staff</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-[300px]">
          <svg className="absolute left-[10px] top-1/2 -translate-y-1/2" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--text3)" }}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full py-[7px] pl-7 pr-3 rounded border text-[11px] outline-none"
            style={{ border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
          />
        </div>
        <select value={roleFilter} onChange={(e) => handleFilterChange(setRoleFilter, e.target.value)}
          className="py-[7px] px-2.5 rounded border text-[11px] outline-none cursor-pointer"
          style={{ border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text2)" }}>
          <option value="all">All Roles</option>
          <option value="STUDENT">Student</option>
          <option value="TRAINER">Trainer</option>
          <option value="ADMIN">Admin</option>
          <option value="COORDINATOR">Coordinator</option>
          <option value="SUPPORT">Support</option>
          <option value="CONTENT_MANAGER">Content Manager</option>
          <option value="SALES">Sales</option>
        </select>
        <select value={statusFilter} onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
          className="py-[7px] px-2.5 rounded border text-[11px] outline-none cursor-pointer"
          style={{ border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text2)" }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>{filtered.length} users</span>
      </div>

      {/* Table */}
      <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {loading ? (
          <div className="py-8 text-center font-mono text-[10px]" style={{ color: "var(--text3)" }}>Loading users...</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center font-mono text-[10px]" style={{ color: "var(--text3)" }}>No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--panel)" }}>
                  {["User", "Email", "Role", "Status", "Joined", "Last Login", "Trainer Share", "Activity"].map((h) => (
                    <th key={h} className="font-mono text-[9px] font-bold uppercase tracking-wider text-left px-3 py-2" style={{ color: "var(--text3)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-[var(--panel)] transition-colors cursor-pointer" onClick={() => setSelected(u)}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[u.role] || "var(--text3)"}, ${ROLE_COLORS[u.role] || "var(--text3)"}cc)` }}>
                          {u.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <span className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>{u.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-[10.5px]" style={{ color: "var(--text2)" }}>{u.email}</td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-[9px] font-bold px-1.5 py-[3px] rounded" style={{
                        background: ROLE_BGS[u.role] || "var(--bg)",
                        color: ROLE_COLORS[u.role] || "var(--text2)",
                      }}>{u.role}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-[9px] font-bold px-1.5 py-[3px] rounded" style={{
                        background: u.isActive ? "var(--green-d)" : "var(--red-d)",
                        color: u.isActive ? "var(--green)" : "var(--red)",
                      }}>{u.isActive ? "Active" : "Inactive"}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{u.createdAt?.slice(0, 10) || "—"}</td>
                    <td className="px-3 py-2 font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{u.lastLoginAt?.slice(0, 10) || "Never"}</td>
                    <td className="px-3 py-2">
                      {u.role === "TRAINER" ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            defaultValue={u.trainerSharePercent ?? ""}
                            placeholder="default"
                            disabled={savingCut === u.id}
                            className="font-mono text-[10px] px-1.5 py-0.5 rounded w-[52px] text-right outline-none"
                            style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}
                            id={`cut-${u.id}`}
                          />
                          <span className="text-[9px]" style={{ color: "var(--text3)" }}>%</span>
                          <button
                            disabled={savingCut === u.id}
                            onClick={() => saveTrainerShare(u.id, u.trainerSharePercent, document.getElementById(`cut-${u.id}`) as HTMLInputElement | null)}
                            className="font-mono text-[8.5px] font-semibold px-2 py-0.5 rounded cursor-pointer disabled:opacity-50"
                            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
                          >
                            {savingCut === u.id ? "…" : "Set"}
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text3)" }}>—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2 font-mono text-[9px]" style={{ color: "var(--text3)" }}>
                        {u.role === "STUDENT" && <span>{u._count.enrollments} enrollments</span>}
                        {u.role === "TRAINER" && <span>{u._count.coursesTaught} courses</span>}
                        {u.role !== "STUDENT" && u.role !== "TRAINER" && <span style={{ color: "var(--text3)" }}>—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-[6px] px-3 py-3" style={{ borderTop: "1px solid var(--border)" }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="w-[30px] h-[30px] rounded border text-[11px] font-semibold flex items-center justify-center cursor-pointer disabled:opacity-40 transition-all"
              style={{ borderColor: "var(--border)", color: "var(--text2)", background: "var(--surface)" }}
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            {getPageNumbers().map((p, i) => p === "..." ? (
              <span key={`e${i}`} className="px-1 text-[11px]" style={{ color: "var(--muted)" }}>…</span>
            ) : (
              <button
                key={p}
                onClick={() => setCurrentPage(p as number)}
                className="w-[30px] h-[30px] rounded border text-[11px] font-semibold flex items-center justify-center cursor-pointer transition-all"
                style={{
                  background: currentPage === p ? "var(--blue)" : "var(--surface)",
                  color: currentPage === p ? "#fff" : "var(--text2)",
                  borderColor: currentPage === p ? "var(--blue)" : "var(--border)",
                }}
              >{p}</button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="w-[30px] h-[30px] rounded border text-[11px] font-semibold flex items-center justify-center cursor-pointer disabled:opacity-40 transition-all"
              style={{ borderColor: "var(--border)", color: "var(--text2)", background: "var(--surface)" }}
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* Staff detail popup */}
      {selected && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[selected.role] || "var(--text3)"}, ${ROLE_COLORS[selected.role] || "var(--text3)"}cc)` }}>
                {selected.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[14px] font-bold truncate" style={{ color: "var(--text)" }}>{selected.name}</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[9px] font-bold px-1.5 py-[3px] rounded" style={{ background: ROLE_BGS[selected.role] || "var(--bg)", color: ROLE_COLORS[selected.role] || "var(--text2)" }}>{selected.role}</span>
                  <span className="font-mono text-[9px] font-bold px-1.5 py-[3px] rounded" style={{ background: selected.isActive ? "var(--green-d)" : "var(--red-d)", color: selected.isActive ? "var(--green)" : "var(--red)" }}>{selected.isActive ? "Active" : "Inactive"}</span>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="flex items-center justify-center w-7 h-7 rounded-lg border-none bg-transparent cursor-pointer hover:bg-[var(--panel)] transition-colors"
                style={{ color: "var(--text3)" }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="rounded-xl p-4 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">Login Email</span>
                  {selected.companyId ? (
                    <button
                      onClick={() => copyValue("login", selected.companyId!)}
                      className="font-mono text-[9px] font-bold px-2.5 py-1 rounded cursor-pointer"
                      style={{ border: "1px solid var(--border)", color: copiedKey === "login" ? "var(--green)" : "var(--blue)", background: "var(--surface)" }}
                    >
                      {copiedKey === "login" ? "✓ Copied" : "Copy"}
                    </button>
                  ) : null}
                </div>
                <div className="font-mono text-[13px] font-bold truncate" style={{ color: "var(--blue)" }}>
                  {selected.companyId ?? <span style={{ color: "var(--text3)", fontStyle: "italic" }}>No company login</span>}
                </div>
              </div>

              <div className="rounded-xl p-4 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">Password</span>
                  <button
                    onClick={() => regeneratePassword(selected)}
                    disabled={regenerating}
                    className="font-mono text-[9px] font-bold px-2.5 py-1 rounded cursor-pointer disabled:opacity-50"
                    style={{ border: "1px solid var(--orange)", color: "var(--orange)", background: "var(--surface)" }}
                  >
                    {regenerating ? "…" : "↻ Regenerate"}
                  </button>
                </div>
                {regeneratedPwd ? (
                  <div className="space-y-1">
                    {regeneratedPwd.pwd && (
                      <div className="font-mono text-[13px] font-bold truncate" style={{ color: "var(--orange)" }}>{regeneratedPwd.pwd}</div>
                    )}
                    <div className="text-[10px]" style={{ color: "var(--green)" }}>
                      {regeneratedPwd.pwd ? "✓ New password emailed to " : "✓ Password reset link emailed to "}
                      {regeneratedPwd.email}
                    </div>
                    {regeneratedPwd.pwd ? (
                      <div className="text-[9.5px]" style={{ color: "var(--text3)" }}>Valid for 10 minutes — user must set their own on first login.</div>
                    ) : (
                      <div className="text-[9.5px]" style={{ color: "var(--text3)" }}>Valid for 1 hour — student sets a new password via the link.</div>
                    )}
                  </div>
                ) : (
                  <div className="text-[10.5px]" style={{ color: "var(--text3)" }}>No active reset. Regenerate emails a temporary password or a reset link by role.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
