"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import type { CoordinatorStudent } from "../lib/types";
import { Panel, Th, Td, Pill, ViewHeader, ActionBtn } from "../sections/ui";

const FLAG_OPTIONS = ["On Track", "Falling Behind", "Needs Attention"] as const;

export default function StudentsView({ searchQuery, onToast, refreshSignal, onMutate }: {
  searchQuery: string;
  onToast: (msg: string, type?: "success" | "danger") => void;
  refreshSignal?: number;
  onMutate?: () => void;
}) {
  const [students, setStudents] = useState<CoordinatorStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<CoordinatorStudent | null>(null);
  const [flagging, setFlagging] = useState<CoordinatorStudent | null>(null);
  const [flagNote, setFlagNote] = useState("");
  const [selectedFlag, setSelectedFlag] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 25;

  const loadStudents = useCallback(async () => {
    try {
      const r = await opsFetch("/api/coordinator/students");
      if (!r.ok) throw new Error(`Failed to load students (${r.status})`);
      const data = await r.json();
      setStudents(Array.isArray(data) ? data : []);
      setPage(1);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Failed to load students", "danger");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => { loadStudents(); }, [refreshSignal, loadStudents]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.name, s.email, s.phone, s.city].some((v) => v && v.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  async function handleFlag() {
    if (!flagging || !selectedFlag) return;
    try {
      const r = await opsFetch(`/api/coordinator/students/${flagging.id}/flag`, {
        method: "PATCH",
        body: JSON.stringify({ flag: selectedFlag, note: flagNote || undefined }),
      });
      if (!r.ok) throw new Error("Failed to set flag");
      onToast(`Flag set for ${flagging.name}: ${selectedFlag}`, "success");
      setFlagging(null);
      setSelectedFlag("");
      setFlagNote("");
      loadStudents();
      onMutate?.();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Failed to set flag", "danger");
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading students…</div>;

  return (
    <div className="p-4">
      <ViewHeader
        icon="🎓"
        title="Students"
        meta={`${filtered.length} STUDENTS · EDITABLE`}
      />

      <Panel title="Student Records" count={`${filtered.length} RECORDS`}>
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>No students found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Student</Th><Th>Contact</Th><Th>City</Th>
                  <Th>Enrollments</Th><Th>Last Login</Th><Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((s) => (
                  <tr key={s.id}>
                    <Td>
                      <div className="font-semibold" style={{ color: "var(--text)" }}>{s.name}</div>
                      <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{s.email}</div>
                    </Td>
                    <Td mono>{s.phone ?? "—"}</Td>
                    <Td>{s.city ?? "—"}</Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-[10px] font-bold" style={{ color: "var(--green)" }}>{s.activeEnrollments}</span>
                        <span className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>active / {s.totalEnrollments}</span>
                      </div>
                      {s.enrollments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {s.enrollments.slice(0, 3).map((e) => (
                            <span key={e.id} className="font-mono text-[7.5px] px-1 rounded" style={{ background: "var(--panel)", color: "var(--text3)" }}>{e.course}</span>
                          ))}
                          {s.enrollments.length > 3 && <span className="font-mono text-[7.5px]" style={{ color: "var(--text3)" }}>+{s.enrollments.length - 3}</span>}
                        </div>
                      )}
                    </Td>
                    <Td mono>{s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}</Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <ActionBtn color="var(--blue)" onClick={() => setDetail(s)}>VIEW</ActionBtn>
                        <ActionBtn color="var(--amber)" onClick={() => { setFlagging(s); setSelectedFlag(""); setFlagNote(""); }}>FLAG</ActionBtn>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {!loading && filtered.length > PER_PAGE && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <button onClick={() => setPage(safePage - 1)} disabled={safePage <= 1}
            className="font-mono text-[9px] font-bold px-2.5 py-1 rounded cursor-pointer disabled:opacity-40"
            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
          >← PREV</button>
          <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>
            {((safePage - 1) * PER_PAGE) + 1}–{Math.min(safePage * PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <button onClick={() => setPage(safePage + 1)} disabled={safePage >= totalPages}
            className="font-mono text-[9px] font-bold px-2.5 py-1 rounded cursor-pointer disabled:opacity-40"
            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
          >NEXT →</button>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center" style={{ background: "rgba(0,0,0,.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setDetail(null); }}>
          <div className="rounded w-[480px] max-w-[95vw] p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[13px] font-extrabold" style={{ color: "var(--text)" }}>{detail.name}</div>
              <button onClick={() => setDetail(null)} className="text-[14px] cursor-pointer" style={{ color: "var(--text3)" }}>✕</button>
            </div>
            <div className="font-mono text-[10px] flex flex-col gap-2 mb-3" style={{ color: "var(--text2)" }}>
              <div>Email: {detail.email}</div>
              <div>Phone: {detail.phone ?? "—"}</div>
              <div>City: {detail.city ?? "—"}</div>
              <div>Joined: {new Date(detail.createdAt).toLocaleDateString("en-IN")}</div>
            </div>
            <div className="text-[11px] font-bold mb-1" style={{ color: "var(--text)" }}>Enrollments</div>
            {detail.enrollments.length === 0 ? (
              <div className="font-mono text-[10px] mb-3" style={{ color: "var(--text3)" }}>No enrollments</div>
            ) : (
              <div className="flex flex-col gap-1 mb-3">
                {detail.enrollments.map((e) => (
                  <div key={e.id} className="flex items-center justify-between px-2 py-1 rounded" style={{ background: "var(--panel)" }}>
                    <span className="text-[10px]" style={{ color: "var(--text)" }}>{e.course}</span>
                    <Pill value={e.status} />
                  </div>
                ))}
              </div>
            )}
            <ActionBtn color="var(--amber)" onClick={() => { setDetail(null); setFlagging(detail); setSelectedFlag(""); setFlagNote(""); }}>FLAG STUDENT</ActionBtn>
          </div>
        </div>
      )}

      {flagging && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center" style={{ background: "rgba(0,0,0,.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setFlagging(null); }}>
          <div className="rounded w-[400px] max-w-[95vw] p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
            <div className="text-[13px] font-extrabold mb-1" style={{ color: "var(--text)" }}>Flag: {flagging.name}</div>
            <div className="font-mono text-[9.5px] mb-3" style={{ color: "var(--text3)" }}>Select a flag and add an optional note</div>
            <div className="flex gap-1.5 mb-3">
              {FLAG_OPTIONS.map((f) => (
                <button key={f} onClick={() => setSelectedFlag(f)}
                  className="font-mono text-[9px] font-bold px-2 py-1 rounded cursor-pointer"
                  style={{
                    background: selectedFlag === f ? "var(--amber)" : "var(--panel)",
                    color: selectedFlag === f ? "#fff" : "var(--text2)",
                    border: `1px solid ${selectedFlag === f ? "var(--amber)" : "var(--border)"}`,
                  }}
                >{f}</button>
              ))}
            </div>
            <textarea value={flagNote} onChange={(e) => setFlagNote(e.target.value)}
              placeholder="Optional note…"
              className="w-full px-2 py-1.5 rounded font-mono text-[10px] outline-none resize-none mb-3"
              style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", height: 60 }}
            />
            <div className="flex gap-2">
              <button onClick={() => setFlagging(null)}
                className="flex-1 py-1.5 rounded font-mono text-[9.5px] font-bold cursor-pointer"
                style={{ background: "var(--panel)", color: "var(--text2)", border: "1px solid var(--border)" }}
              >CANCEL</button>
              <button onClick={handleFlag} disabled={!selectedFlag}
                className="flex-1 py-1.5 rounded font-mono text-[9.5px] font-bold cursor-pointer disabled:opacity-40"
                style={{ background: "var(--amber)", color: "#fff", border: "1px solid var(--amber)" }}
              >SET FLAG</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
