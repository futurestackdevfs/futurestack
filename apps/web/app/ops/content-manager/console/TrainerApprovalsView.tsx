"use client";

import { useCallback, useEffect, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { ViewHeader } from "../../sales/sections/ui";

interface Trainer {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  phone: string | null;
  dob: string | null;
  city: string | null;
  qualification: string | null;
  bio: string | null;
  experience: string | null;
  careerPath: string | null;
  skills: string[];
  yearsExperience: number | null;
  approvalStatus: string;
  profileSubmittedAt: string | null;
  createdAt: string;
}

export default function TrainerApprovalsView({ refreshSignal, onToast, onMutate }: {
  refreshSignal?: number;
  onToast: (msg: string, type?: "success" | "danger") => void;
  onMutate?: () => void;
}) {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await opsFetch("/api/admin/trainers/pending");
      if (r.ok) {
        const data = await r.json();
        setTrainers(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshSignal]);

  async function handleApprove(trainerId: string) {
    setProcessingId(trainerId);
    try {
      const r = await opsFetch(`/api/admin/trainers/${trainerId}/approve`, { method: "POST" });
      if (r.ok) {
        setTrainers((prev) => prev.filter((t) => t.id !== trainerId));
        onToast("Trainer approved", "success");
        onMutate?.();
      } else {
        onToast("Failed to approve trainer", "danger");
      }
    } catch {
      onToast("Failed to approve trainer", "danger");
    } finally { setProcessingId(null); }
  }

  async function handleReject(trainerId: string) {
    if (!confirm("Reject this trainer?")) return;
    setProcessingId(trainerId);
    try {
      const r = await opsFetch(`/api/admin/trainers/${trainerId}/reject`, { method: "POST" });
      if (r.ok) {
        setTrainers((prev) => prev.filter((t) => t.id !== trainerId));
        onToast("Trainer rejected", "success");
        onMutate?.();
      } else {
        onToast("Failed to reject trainer", "danger");
      }
    } catch {
      onToast("Failed to reject trainer", "danger");
    } finally { setProcessingId(null); }
  }

  return (
    <div className="p-4 pb-7">
      <ViewHeader
        icon="👨‍🏫"
        title="Trainer Approvals"
        meta={`${trainers.length} PENDING`}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading pending trainers…</div>
      ) : trainers.length === 0 ? (
        <div className="flex items-center justify-center py-16 font-mono text-[11px]" style={{ color: "var(--text3)" }}>
          ✓ No pending trainer approvals
        </div>
      ) : (
        <div className="grid gap-3">
          {trainers.map((t) => (
            <div key={t.id} className="rounded p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  {t.avatarUrl ? (
                    <img src={t.avatarUrl} alt={t.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0" style={{ background: "var(--amber-d)", color: "var(--amber)" }}>
                      {t.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold truncate" style={{ color: "var(--text)" }}>{t.name}</div>
                    <div className="font-mono text-[9.5px] truncate" style={{ color: "var(--text3)" }}>{t.email}</div>
                    {t.phone && <div className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{t.phone}</div>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleApprove(t.id)} disabled={processingId === t.id}
                    className="flex-1 sm:flex-none font-mono text-[9.5px] font-bold px-3 py-1.5 rounded cursor-pointer disabled:opacity-50"
                    style={{ background: "var(--green)", color: "#fff", border: "1px solid var(--green)" }}>
                    {processingId === t.id ? "…" : "✓ APPROVE"}
                  </button>
                  <button onClick={() => handleReject(t.id)} disabled={processingId === t.id}
                    className="flex-1 sm:flex-none font-mono text-[9.5px] font-bold px-3 py-1.5 rounded cursor-pointer disabled:opacity-50"
                    style={{ border: "1px solid var(--red)", color: "var(--red)", background: "transparent" }}>
                    ✕ REJECT
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1.5 mb-2.5 font-mono text-[9.5px]" style={{ color: "var(--text2)" }}>
                {t.city && <div><span style={{ color: "var(--text3)" }}>City: </span>{t.city}</div>}
                {t.dob && <div><span style={{ color: "var(--text3)" }}>DOB: </span>{new Date(t.dob).toLocaleDateString("en-IN")}</div>}
                {t.qualification && <div className="col-span-2"><span style={{ color: "var(--text3)" }}>Qualification: </span>{t.qualification}</div>}
                {t.careerPath && <div className="col-span-2"><span style={{ color: "var(--text3)" }}>Career path: </span>{t.careerPath}</div>}
                {t.yearsExperience != null && <div><span style={{ color: "var(--text3)" }}>Years exp: </span>{t.yearsExperience}</div>}
              </div>

              {t.bio && <div className="text-[10.5px] mb-2" style={{ color: "var(--text2)" }}>{t.bio}</div>}
              <div className="flex flex-wrap gap-1.5">
                {t.experience && <span className="font-mono text-[8.5px] px-1.5 py-0.5 rounded" style={{ background: "var(--panel)", color: "var(--text3)" }}>Level: {t.experience}</span>}
                {t.skills.map((s, i) => <span key={i} className="font-mono text-[8.5px] px-1.5 py-0.5 rounded" style={{ background: "var(--blue-d)", color: "var(--blue)" }}>{s}</span>)}
              </div>
              <div className="font-mono text-[8.5px] mt-2" style={{ color: "var(--text3)" }}>
                Submitted: {t.profileSubmittedAt ? new Date(t.profileSubmittedAt).toLocaleDateString("en-IN") : new Date(t.createdAt).toLocaleDateString("en-IN")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
