"use client";

import { useCallback, useEffect, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { ViewHeader } from "../../sales/sections/ui";

interface Trainer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  experience: string | null;
  skills: string[];
  approvalStatus: string;
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
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold" style={{ background: "var(--amber-d)", color: "var(--amber)" }}>
                    {t.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-[13px] font-bold" style={{ color: "var(--text)" }}>{t.name}</div>
                    <div className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{t.email}</div>
                    {t.phone && <div className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{t.phone}</div>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(t.id)} disabled={processingId === t.id}
                    className="font-mono text-[9.5px] font-bold px-3 py-1.5 rounded cursor-pointer disabled:opacity-50"
                    style={{ background: "var(--green)", color: "#fff", border: "1px solid var(--green)" }}>
                    {processingId === t.id ? "…" : "✓ APPROVE"}
                  </button>
                  <button onClick={() => handleReject(t.id)} disabled={processingId === t.id}
                    className="font-mono text-[9.5px] font-bold px-3 py-1.5 rounded cursor-pointer disabled:opacity-50"
                    style={{ border: "1px solid var(--red)", color: "var(--red)", background: "transparent" }}>
                    ✕ REJECT
                  </button>
                </div>
              </div>
              {t.bio && <div className="text-[10.5px] mb-2" style={{ color: "var(--text2)" }}>{t.bio}</div>}
              <div className="flex flex-wrap gap-1.5">
                {t.experience && <span className="font-mono text-[8.5px] px-1.5 py-0.5 rounded" style={{ background: "var(--panel)", color: "var(--text3)" }}>Exp: {t.experience}</span>}
                {t.skills.map((s, i) => <span key={i} className="font-mono text-[8.5px] px-1.5 py-0.5 rounded" style={{ background: "var(--blue-d)", color: "var(--blue)" }}>{s}</span>)}
              </div>
              <div className="font-mono text-[8.5px] mt-2" style={{ color: "var(--text3)" }}>Applied: {new Date(t.createdAt).toLocaleDateString("en-IN")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
