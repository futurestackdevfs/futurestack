"use client";

import { useState, useEffect, useMemo } from "react";

interface Trainer {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  yearsExperience: number | null;
  rating: number | null;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  isActive: boolean;
  createdAt: string;
  coursesTaught: number;
  totalStudents: number;
}

interface CreateTrainerForm {
  name: string;
  email: string;
  password: string;
}

const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  APPROVED: { bg: "var(--green-d)", fg: "var(--green)" },
  PENDING: { bg: "var(--amber-d)", fg: "var(--amber)" },
  REJECTED: { bg: "var(--red-d)", fg: "var(--red)" },
};

export default function TrainerDashboardContent() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateTrainerForm>({ name: "", email: "", password: "" });
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/admin/trainers")
      .then((r) => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.json(); })
      .then((data) => { if (!cancelled && Array.isArray(data)) setTrainers(data); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleCreateTrainer(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...createForm, role: "TRAINER" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `${res.status} ${res.statusText}`);
      }
      setCreateOpen(false);
      setCreateForm({ name: "", email: "", password: "" });
      // Refresh list after creation
      fetch("/api/admin/trainers")
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setTrainers(data); })
        .catch(() => {});
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search) return trainers;
    const q = search.toLowerCase();
    return trainers.filter((t) =>
      [t.name, t.email, t.bio, t.approvalStatus].some((v) => v?.toLowerCase().includes(q))
    );
  }, [trainers, search]);

  const kpi = useMemo(() => ({
    total: trainers.length,
    approved: trainers.filter((t) => t.approvalStatus === "APPROVED").length,
    pending: trainers.filter((t) => t.approvalStatus === "PENDING").length,
    rejected: trainers.filter((t) => t.approvalStatus === "REJECTED").length,
    avgRating: trainers.length > 0
      ? (trainers.reduce((s, t) => s + (t.rating ?? 0), 0) / trainers.length).toFixed(1)
      : "—",
  }), [trainers]);

  async function setStatus(id: string, status: "APPROVED" | "REJECTED") {
    setActing(id);
    setActionError(null);
    // Optimistic update — change status immediately
    const previous = trainers;
    setTrainers((prev) => prev.map((t) => t.id === id ? { ...t, approvalStatus: status } : t));
    try {
      const res = await fetch(
        `/api/admin/trainers/${id}/${status === "APPROVED" ? "approve" : "reject"}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: status === "REJECTED" ? JSON.stringify({ reason: "Rejected by admin" }) : undefined,
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `${res.status} ${res.statusText}`);
      }
    } catch (e: any) {
      // Rollback on failure
      setTrainers(previous);
      setActionError(e.message);
    } finally {
      setActing(null);
    }
  }

  if (loading) return (
    <div className="p-4 font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading trainers…</div>
  );

  if (error) return (
    <div className="p-4 font-mono text-[11px]" style={{ color: "var(--red)" }}>Failed to load trainers: {error}</div>
  );

  return (
    <div className="p-4 pb-7">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>🎓 Trainer Management</span>
          <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>role::admin · {trainers.length} trainers</span>
        </div>
        <div className="flex items-center gap-2">
          <input placeholder="Search trainers…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="font-mono text-[10.5px] px-2.5 py-1.5 rounded outline-none w-48"
            style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }} />
          <button onClick={() => setCreateOpen(true)}
            className="font-mono text-[10.5px] font-semibold px-3 py-1.5 rounded cursor-pointer"
            style={{ background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >+ Add Trainer</button>
        </div>
      </div>

      <div className="grid grid-cols-5 rounded overflow-hidden mb-4" style={{ border: "1px solid var(--border)", background: "var(--border)", gap: 1 }}>
        {[
          { label: "Total Trainers", value: kpi.total, color: "var(--blue)" },
          { label: "Approved", value: kpi.approved, color: "var(--green)" },
          { label: "Pending Review", value: kpi.pending, color: "var(--amber)" },
          { label: "Rejected", value: kpi.rejected, color: "var(--red)" },
          { label: "Avg Rating", value: kpi.avgRating, color: "var(--purple)" },
        ].map((k, i) => (
          <div key={i} style={{ background: "var(--surface)" }} className="px-3.5 py-2.5">
            <div className="font-mono text-[8.5px] uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>{k.label}</div>
            <div className="font-mono text-[19px] font-bold leading-none" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-3 py-2" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>👤 All Trainers</span>
          <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{filtered.length} trainers</span>
        </div>
        {actionError && (
          <div className="px-3 py-1.5 font-mono text-[10px]" style={{ background: "var(--red-d)", color: "var(--red)", borderBottom: "1px solid var(--border)" }}>
            {actionError}
          </div>
        )}
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr>{["Name", "Email", "Experience", "Rating", "Courses", "Students", "Status", "Joined", "Actions"].map((h) => (
              <th key={h} className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5"
                style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map((t, idx) => {
              const st = STATUS_STYLES[t.approvalStatus] || STATUS_STYLES.PENDING;
              return (
                <tr key={t.id}
                  style={{ background: idx % 2 === 0 ? "var(--surface)" : "var(--panel)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-h)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? "var(--surface)" : "var(--panel)"; }}
                >
                  <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                    <div className="font-semibold" style={{ color: "var(--text)" }}>{t.name}</div>
                    {t.bio && <div className="font-mono text-[9px] truncate max-w-[160px]" style={{ color: "var(--text3)" }}>{t.bio}</div>}
                  </td>
                  <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{t.email}</td>
                  <td className="px-2.5 py-1.5 font-mono" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{t.yearsExperience ?? "—"} yrs</td>
                  <td className="px-2.5 py-1.5 font-mono font-semibold" style={{ color: "var(--purple)", borderBottom: "1px solid var(--border)" }}>{t.rating ? `${t.rating} ⭐` : "—"}</td>
                  <td className="px-2.5 py-1.5 font-mono" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{t.coursesTaught}</td>
                  <td className="px-2.5 py-1.5 font-mono" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{t.totalStudents}</td>
                  <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                      style={{ background: st.bg, color: st.fg }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.fg }} />
                      {t.approvalStatus}
                    </span>
                  </td>
                  <td className="px-2.5 py-1.5 font-mono text-[10px]" style={{ color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>{t.createdAt?.slice(0, 10)}</td>
                  <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                    {t.approvalStatus === "PENDING" ? (
                      <div className="flex gap-1">
                        <button onClick={() => setStatus(t.id, "APPROVED")}
                          disabled={acting === t.id}
                          className="font-mono text-[8px] font-bold px-2 py-0.5 rounded border-none"
                          style={{ background: "var(--green)", color: "#fff", cursor: acting === t.id ? "not-allowed" : "pointer", opacity: acting === t.id ? 0.6 : 1 }}
                          onMouseEnter={(e) => { if (acting !== t.id) (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = acting === t.id ? "0.6" : "1"; }}
                        >{acting === t.id ? "…" : "✓ Approve"}</button>
                        <button onClick={() => setStatus(t.id, "REJECTED")}
                          disabled={acting === t.id}
                          className="font-mono text-[8px] font-bold px-2 py-0.5 rounded border-none"
                          style={{ background: "var(--red)", color: "#fff", cursor: acting === t.id ? "not-allowed" : "pointer", opacity: acting === t.id ? 0.6 : 1 }}
                          onMouseEnter={(e) => { if (acting !== t.id) (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = acting === t.id ? "0.6" : "1"; }}
                        >✕ Reject</button>
                      </div>
                    ) : (
                      <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>
                        {t.approvalStatus === "APPROVED" ? "Active" : "—"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center font-mono text-[11px] py-6" style={{ color: "var(--text3)" }}>No trainers found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Trainer Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setCreateOpen(false); }}
        >
          <div className="rounded-lg p-5 w-full max-w-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-extrabold text-[13px]" style={{ color: "var(--text)" }}>Create Trainer Account</span>
              <button onClick={() => setCreateOpen(false)} className="font-mono text-[12px] cursor-pointer border-none bg-transparent" style={{ color: "var(--text3)" }}>✕</button>
            </div>
            <form onSubmit={handleCreateTrainer} className="flex flex-col gap-3">
              {[
                { key: "name", label: "Full Name", type: "text", placeholder: "e.g. Aakash Verma" },
                { key: "email", label: "Email", type: "email", placeholder: "trainer@futurestack.in" },
                { key: "password", label: "Password", type: "password", placeholder: "Min 8 characters" },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key}>
                  <label className="font-mono text-[9.5px] uppercase tracking-wider mb-1 block" style={{ color: "var(--text3)" }}>{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={createForm[key as keyof CreateTrainerForm]}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    required
                    minLength={key === "password" ? 8 : 2}
                    className="w-full font-mono text-[11px] px-2.5 py-1.5 rounded outline-none"
                    style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}
                  />
                </div>
              ))}
              {createError && (
                <div className="font-mono text-[10px]" style={{ color: "var(--red)" }}>{createError}</div>
              )}
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setCreateOpen(false)}
                  className="flex-1 font-mono text-[10.5px] font-semibold py-1.5 rounded cursor-pointer"
                  style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--panel)" }}
                >Cancel</button>
                <button type="submit" disabled={creating}
                  className="flex-1 font-mono text-[10.5px] font-semibold py-1.5 rounded cursor-pointer"
                  style={{ background: "var(--orange)", color: "#fff", border: "none", opacity: creating ? 0.7 : 1 }}
                >{creating ? "Creating…" : "Create Trainer"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
