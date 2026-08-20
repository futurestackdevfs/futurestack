"use client";

import { useCallback, useEffect, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import type { CoordinatorEscalation } from "../lib/types";
import { Panel, Th, Td, Pill, ViewHeader, ActionBtn } from "../sections/ui";

export default function EscalationsView({ onToast, refreshSignal, onMutate }: {
  onToast: (msg: string, type?: "success" | "danger") => void;
  refreshSignal?: number;
  onMutate?: () => void;
}) {
  const [escalations, setEscalations] = useState<CoordinatorEscalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<CoordinatorEscalation | null>(null);
  const [resolution, setResolution] = useState("");

  const loadEscalations = useCallback(async () => {
    try {
      const r = await opsFetch("/api/coordinator/escalations");
      if (!r.ok) throw new Error(`Failed to load escalations (${r.status})`);
      const data = await r.json();
      setEscalations(Array.isArray(data) ? data : []);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Failed to load escalations", "danger");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => { loadEscalations(); }, [refreshSignal, loadEscalations]);

  async function handleResolve() {
    if (!resolving || !resolution.trim()) return;
    try {
      const r = await opsFetch(`/api/coordinator/escalations/${resolving.id}`, {
        method: "PATCH",
        body: JSON.stringify({ resolution: resolution.trim() }),
      });
      if (!r.ok) throw new Error("Failed to resolve");
      onToast(`Escalation resolved for ${resolving.name}`, "success");
      setResolving(null);
      setResolution("");
      loadEscalations();
      onMutate?.();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Failed to resolve", "danger");
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading escalations…</div>;

  return (
    <div className="p-4">
      <ViewHeader
        icon="🚩"
        title="Escalations"
        meta={`${escalations.length} PENDING · EDITABLE`}
      />

      <Panel title="Flagged Students" count={`${escalations.length} PENDING`}>
        {escalations.length === 0 ? (
          <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>
            No pending escalations — all clear!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Student</Th><Th>Contact</Th><Th>Courses</Th>
                  <Th>Flag</Th><Th>Note</Th><Th>Flagged</Th><Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {escalations.map((e, i) => (
                  <tr key={e.id} style={{ background: i % 2 === 0 ? "var(--surface)" : "var(--panel)" }}>
                    <Td>
                      <div className="font-semibold" style={{ color: "var(--text)" }}>{e.name}</div>
                      <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{e.email}</div>
                    </Td>
                    <Td mono>{e.phone ?? "—"}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {e.courses.map((c, ci) => (
                          <span key={ci} className="font-mono text-[7.5px] px-1 rounded" style={{ background: "var(--panel)", color: "var(--text3)" }}>{c}</span>
                        ))}
                      </div>
                    </Td>
                    <Td><Pill value={e.flag} /></Td>
                    <Td mono>{e.note ?? "—"}</Td>
                    <Td mono>{e.flaggedAt ? new Date(e.flaggedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}</Td>
                    <Td>
                      <ActionBtn color="var(--green)" solid onClick={() => { setResolving(e); setResolution(""); }}>RESOLVE</ActionBtn>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {resolving && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center" style={{ background: "rgba(0,0,0,.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setResolving(null); }}>
          <div className="rounded w-[400px] max-w-[95vw] p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
            <div className="text-[13px] font-extrabold mb-1" style={{ color: "var(--text)" }}>Resolve: {resolving.name}</div>
            <div className="font-mono text-[9.5px] mb-3" style={{ color: "var(--text3)" }}>
              Flag: <Pill value={resolving.flag} /> {resolving.note && `— ${resolving.note}`}
            </div>
            <textarea value={resolution} onChange={(e) => setResolution(e.target.value)}
              placeholder="Resolution notes…"
              className="w-full px-2 py-1.5 rounded font-mono text-[10px] outline-none resize-none mb-3"
              style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", height: 80 }}
            />
            <div className="flex gap-2">
              <button onClick={() => setResolving(null)}
                className="flex-1 py-1.5 rounded font-mono text-[9.5px] font-bold cursor-pointer"
                style={{ background: "var(--panel)", color: "var(--text2)", border: "1px solid var(--border)" }}
              >CANCEL</button>
              <button onClick={handleResolve} disabled={!resolution.trim()}
                className="flex-1 py-1.5 rounded font-mono text-[9.5px] font-bold cursor-pointer disabled:opacity-40"
                style={{ background: "var(--green)", color: "#fff", border: "1px solid var(--green)" }}
              >RESOLVE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
