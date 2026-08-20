"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import type { CoordinatorBatch } from "../lib/types";
import { KpiRow, Panel, Th, Td, ViewHeader } from "../sections/ui";

function fmtRupee(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function BatchesView({ searchQuery, refreshSignal, onToast }: {
  searchQuery: string;
  refreshSignal?: number;
  onToast: (msg: string, type?: "success" | "danger") => void;
}) {
  const [batches, setBatches] = useState<CoordinatorBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<CoordinatorBatch | null>(null);

  const loadBatches = useCallback(async () => {
    try {
      const r = await opsFetch("/api/coordinator/batches");
      if (!r.ok) throw new Error(`Failed to load batches (${r.status})`);
      const data = await r.json();
      setBatches(Array.isArray(data) ? data : []);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Failed to load batches", "danger");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => { loadBatches(); }, [refreshSignal, loadBatches]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return batches;
    return batches.filter((b) =>
      [b.title, b.trainer?.name].some((v) => v && v.toLowerCase().includes(q))
    );
  }, [batches, searchQuery]);

  const totalEnrolled = batches.reduce((s, b) => s + b.enrolledCount, 0);
  const totalSections = batches.reduce((s, b) => s + b.totalSections, 0);

  if (loading) return <div className="flex items-center justify-center h-full font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading batches…</div>;

  return (
    <div className="p-4">
      <ViewHeader
        icon="📅"
        title="Batches"
        meta={`${batches.length} ACTIVE COURSES · READ-ONLY`}
      />

      <KpiRow items={[
        { label: "Total Courses", value: batches.length, delta: "active", color: "var(--purple)" },
        { label: "Total Enrolled", value: totalEnrolled, delta: "students", color: "var(--blue)" },
        { label: "Total Sections", value: totalSections, delta: "curriculum", color: "var(--green)" },
        { label: "Avg Fill Rate", value: batches.length > 0 ? `${Math.round(totalEnrolled / batches.length)}` : "0", delta: "students/course", color: "var(--amber)" },
      ]} />

      <Panel title="Active Batches" count={`${filtered.length} COURSES`}>
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>No batches found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Course</Th><Th>Trainer</Th><Th>Price</Th>
                  <Th>Enrolled</Th><Th>Sections</Th><Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => (
                  <tr key={b.id} style={{ background: i % 2 === 0 ? "var(--surface)" : "var(--panel)" }}>
                    <Td>
                      <div className="font-semibold" style={{ color: "var(--text)" }}>{b.title}</div>
                      {b.code && <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{b.code}</div>}
                    </Td>
                    <Td mono>{b.trainer?.name ?? "—"}</Td>
                    <Td mono color="var(--green)">{fmtRupee(b.price)}</Td>
                    <Td>
                      <span className="font-mono text-[10px] font-bold" style={{ color: "var(--blue)" }}>{b.enrolledCount}</span>
                      <span className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}> ({b.activeStudents} active)</span>
                    </Td>
                    <Td mono>{b.totalSections}</Td>
                    <Td>
                      <button onClick={() => setDetail(b)}
                        className="font-mono text-[8.5px] font-bold px-2 py-0.5 rounded cursor-pointer"
                        style={{ background: "transparent", color: "var(--blue)", border: "1px solid var(--blue)" }}
                      >VIEW</button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {detail && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center" style={{ background: "rgba(0,0,0,.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setDetail(null); }}>
          <div className="rounded w-[520px] max-w-[95vw] p-4 max-h-[80vh] overflow-y-auto" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[13px] font-extrabold" style={{ color: "var(--text)" }}>{detail.title}</div>
              <button onClick={() => setDetail(null)} className="text-[14px] cursor-pointer" style={{ color: "var(--text3)" }}>✕</button>
            </div>
            <div className="font-mono text-[10px] flex flex-col gap-1.5 mb-3" style={{ color: "var(--text2)" }}>
              <div>Trainer: {detail.trainer?.name ?? "—"}</div>
              <div>Price: {fmtRupee(detail.price)}</div>
              <div>Enrolled: {detail.enrolledCount} ({detail.activeStudents} active)</div>
              <div>Sections: {detail.totalSections}</div>
            </div>
            {detail.students.length > 0 && (
              <>
                <div className="text-[11px] font-bold mb-1" style={{ color: "var(--text)" }}>Students</div>
                <div className="flex flex-col gap-1">
                  {detail.students.map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-2 py-1 rounded" style={{ background: "var(--panel)" }}>
                      <div>
                        <div className="text-[10px] font-semibold" style={{ color: "var(--text)" }}>{s.name}</div>
                        <div className="font-mono text-[8px]" style={{ color: "var(--text3)" }}>{s.email}</div>
                      </div>
                      <span className="font-mono text-[8px] px-1 rounded" style={{
                        background: s.status === "active" ? "var(--green-d)" : "var(--panel)",
                        color: s.status === "active" ? "var(--green)" : "var(--text3)",
                      }}>{s.status}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
