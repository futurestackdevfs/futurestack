"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { Panel, Th, Td, ViewHeader } from "../../sales/sections/ui";

interface Trainer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  city: string | null;
  qualification: string | null;
  yearsExperience: number | null;
  rating: number | null;
  avatarUrl: string | null;
  skills: string[];
  createdAt: string;
  _count?: { coursesTaught: number; projectsTaught: number };
}

export default function AllTrainersView({ searchQuery, refreshSignal, onToast }: {
  searchQuery: string;
  refreshSignal?: number;
  onToast: (msg: string, type?: "success" | "danger") => void;
}) {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Trainer | null>(null);
  const PER_PAGE = 15;

  const load = useCallback(async () => {
    try {
      const r = await opsFetch("/api/admin/trainers/approved");
      if (r.ok) {
        const data = await r.json();
        setTrainers(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshSignal]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return trainers.filter((t) => !q || [t.name, t.email, t.city, t.phone].some((v) => v && v.toLowerCase().includes(q)));
  }, [trainers, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  function initials(name: string) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "T";
  }

  return (
    <div className="p-4 pb-7">
      <ViewHeader icon="📋" title="All Trainers" meta={`${filtered.length} TRAINERS`} />

      <Panel title="Approved Trainers" count={`${filtered.length} MEMBERS`}>
        {loading ? (
          <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-10 font-mono text-[11px]" style={{ color: "var(--text3)" }}>No trainers found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Trainer</Th>
                  <Th>Phone</Th>
                  <Th>City</Th>
                  <Th>Courses</Th>
                  <Th>Projects</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((t) => (
                  <tr key={t.id}>
                    <Td>
                      <div className="font-semibold" style={{ color: "var(--text)" }}>{t.name}</div>
                      <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>{t.email}</div>
                    </Td>
                    <Td mono>{t.phone || "—"}</Td>
                    <Td>{t.city || "—"}</Td>
                    <Td mono>{t._count?.coursesTaught ?? 0}</Td>
                    <Td mono>{t._count?.projectsTaught ?? 0}</Td>
                    <Td>
                      <button
                        onClick={() => setSelected(t)}
                        className="font-mono text-[9px] font-bold px-2 py-1 rounded cursor-pointer"
                        style={{ background: "var(--blue-d)", color: "var(--blue)", border: "1px solid var(--blue)" }}
                      >VIEW</button>
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
            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}>← PREV</button>
          <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{safePage} / {totalPages}</span>
          <button onClick={() => setPage(safePage + 1)} disabled={safePage >= totalPages}
            className="font-mono text-[9px] font-bold px-2.5 py-1 rounded cursor-pointer disabled:opacity-40"
            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}>NEXT →</button>
        </div>
      )}

      {/* Trainer Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center" style={{ background: "rgba(0,0,0,.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="rounded w-[520px] max-w-[95vw] max-h-[85vh] overflow-y-auto" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
            {/* Header */}
            <div className="px-5 py-4 flex items-center gap-4" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-[18px] font-extrabold shrink-0" style={{ background: "var(--blue-d)", color: "var(--blue)" }}>
                {selected.avatarUrl ? (
                  <img src={selected.avatarUrl} alt={selected.name} className="w-14 h-14 rounded-full object-cover" />
                ) : initials(selected.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-extrabold" style={{ color: "var(--text)" }}>{selected.name}</div>
                <div className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>TRAINER · ID {selected.id.slice(0, 8)}</div>
              </div>
              <button onClick={() => setSelected(null)} className="text-[18px] cursor-pointer px-2" style={{ color: "var(--text3)" }}>✕</button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Contact Info */}
              <Section title="Contact Information">
                <FieldRow icon="📧" label="Email">
                  <a href={`mailto:${selected.email}`} className="font-mono text-[10.5px] underline" style={{ color: "var(--blue)" }}>{selected.email}</a>
                </FieldRow>
                <FieldRow icon="📱" label="Phone">
                  {selected.phone ? (
                    <a href={`tel:${selected.phone}`} className="font-mono text-[10.5px] underline" style={{ color: "var(--blue)" }}>{selected.phone}</a>
                  ) : (
                    <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>—</span>
                  )}
                </FieldRow>
                <FieldRow icon="📍" label="City">
                  <span className="font-mono text-[10.5px]" style={{ color: "var(--text2)" }}>{selected.city || "—"}</span>
                </FieldRow>
              </Section>

              {/* Professional Info */}
              <Section title="Professional Details">
                <FieldRow icon="🎓" label="Qualification">
                  <span className="font-mono text-[10.5px]" style={{ color: "var(--text2)" }}>{selected.qualification || "—"}</span>
                </FieldRow>
                <FieldRow icon="📅" label="Experience">
                  <span className="font-mono text-[10.5px]" style={{ color: "var(--text2)" }}>{selected.yearsExperience != null ? `${selected.yearsExperience} years` : "—"}</span>
                </FieldRow>
                <FieldRow icon="⭐" label="Rating">
                  <span className="font-mono text-[10.5px]" style={{ color: "var(--amber)" }}>{selected.rating != null ? selected.rating.toFixed(1) : "—"}</span>
                </FieldRow>
                <FieldRow icon="📅" label="Joined">
                  <span className="font-mono text-[10.5px]" style={{ color: "var(--text2)" }}>{fmtDate(selected.createdAt)}</span>
                </FieldRow>
              </Section>

              {/* Bio */}
              {selected.bio && (
                <Section title="Bio">
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--text2)" }}>{selected.bio}</p>
                </Section>
              )}

              {/* Skills */}
              {selected.skills && selected.skills.length > 0 && (
                <Section title="Skills">
                  <div className="flex flex-wrap gap-1.5">
                    {selected.skills.map((skill) => (
                      <span key={skill} className="font-mono text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: "var(--purple-d)", color: "var(--purple)" }}>{skill}</span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Stats */}
              <Section title="Teaching Stats">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Courses" value={selected._count?.coursesTaught ?? 0} color="var(--blue)" />
                  <StatCard label="Projects" value={selected._count?.projectsTaught ?? 0} color="var(--purple)" />
                </div>
              </Section>

              {/* Contact CTA */}
              <div className="flex gap-2 pt-1">
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} className="flex-1 text-center py-2 rounded font-mono text-[10px] font-bold cursor-pointer" style={{ background: "var(--green-d)", color: "var(--green)", border: "1px solid var(--green)" }}>📞 Call</a>
                )}
                <a href={`mailto:${selected.email}`} className="flex-1 text-center py-2 rounded font-mono text-[10px] font-bold cursor-pointer" style={{ background: "var(--blue-d)", color: "var(--blue)", border: "1px solid var(--blue)" }}>✉ Email</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text3)" }}>{title}</div>
      <div className="rounded px-3 py-2.5 space-y-2" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
        {children}
      </div>
    </div>
  );
}

function FieldRow({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[12px] shrink-0">{icon}</span>
      <span className="font-mono text-[9px] w-24 shrink-0" style={{ color: "var(--text3)" }}>{label}</span>
      {children}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded px-3 py-2 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="font-mono text-[18px] font-bold" style={{ color }}>{value}</div>
      <div className="font-mono text-[8px] uppercase tracking-wider" style={{ color: "var(--text3)" }}>{label}</div>
    </div>
  );
}
