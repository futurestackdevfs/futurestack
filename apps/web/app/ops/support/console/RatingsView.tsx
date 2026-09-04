"use client";

import { useCallback, useEffect, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { showToast } from "@/lib/toast";
import type { RatingDetail, RatingSubject, RatingSubjectType } from "../lib/types";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}
function initials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}
function Stars({ n, size = 12 }: { n: number; size?: number }) {
  const full = Math.round(n);
  return (
    <span style={{ color: "var(--amber, #b45309)", letterSpacing: 1, fontSize: size }}>
      {"★".repeat(full)}<span style={{ color: "var(--border2)" }}>{"★".repeat(5 - full)}</span>
    </span>
  );
}

function DistBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[9.5px] w-[22px] shrink-0" style={{ color: "var(--text3)" }}>{star}★</span>
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: "var(--panel)", border: "1px solid var(--border)" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--amber, #b45309)" }} />
      </div>
      <span className="font-mono text-[9.5px] w-[24px] text-right shrink-0" style={{ color: "var(--text3)" }}>{count}</span>
    </div>
  );
}

export default function RatingsView() {
  const [type, setType] = useState<RatingSubjectType>("course");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<RatingSubject[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [selId, setSelId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RatingDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const p = new URLSearchParams({ type, limit: "100" });
      if (q.trim()) p.set("q", q.trim());
      const r = await opsFetch(`/api/support/staff/ratings?${p}`);
      if (r.ok) setRows((await r.json()).data ?? []);
    } finally {
      setLoadingList(false);
    }
  }, [type, q]);

  useEffect(() => { setSelId(null); loadList(); }, [loadList]);

  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const r = await opsFetch(`/api/support/staff/ratings/${type}/${id}`);
      if (r.ok) setDetail(await r.json());
      else showToast("Couldn't load reviews");
    } finally {
      setLoadingDetail(false);
    }
  }, [type]);

  useEffect(() => {
    if (selId) loadDetail(selId);
    else setDetail(null);
  }, [selId, loadDetail]);

  return (
    <div className="h-full flex" style={{ background: "var(--bg)" }}>
      {/* ── subject list (courses / projects) ── */}
      <div className="shrink-0 flex flex-col" style={{ width: 340, borderRight: "1px solid var(--border)", background: "var(--surface)" }}>
        <div className="px-3.5 py-2.5 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="text-[13px] font-extrabold" style={{ color: "var(--text)" }}>⭐ Ratings & reviews</div>
          <div className="font-mono text-[9px] mt-0.5" style={{ color: "var(--text3)" }}>{rows.length} {type === "course" ? "courses" : "projects"} with reviews</div>
        </div>

        <div className="px-3 pt-2.5 flex gap-1 shrink-0">
          {(["course", "project"] as RatingSubjectType[]).map((t) => (
            <button key={t} onClick={() => setType(t)}
              className="flex-1 px-2 py-1.5 rounded-md text-[10.5px] font-semibold cursor-pointer capitalize"
              style={{
                background: type === t ? "var(--orange)" : "var(--panel)",
                color: type === t ? "#fff" : "var(--text2)",
                border: "1px solid var(--border)",
              }}>{t === "course" ? "Courses" : "Live projects"}</button>
          ))}
        </div>

        <div className="px-3 py-2 shrink-0">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${type === "course" ? "courses" : "projects"}…`}
            className="w-full text-[10.5px] rounded-md px-2 py-1.5 outline-none"
            style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }} />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="p-4 text-[11px]" style={{ color: "var(--text3)" }}>Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-4 text-[11px]" style={{ color: "var(--text3)" }}>No {type === "course" ? "courses" : "projects"} have reviews yet.</div>
          ) : rows.map((s) => {
            const sel = selId === s.id;
            return (
              <button key={s.id} onClick={() => setSelId(s.id)}
                className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 cursor-pointer"
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: sel ? "var(--orange-d)" : "transparent",
                  borderLeft: sel ? "2px solid var(--orange)" : "2px solid transparent",
                }}>
                {s.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.image} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" style={{ border: "1px solid var(--border)" }} />
                ) : (
                  <span className="w-8 h-8 rounded-md flex items-center justify-center text-[12px] shrink-0"
                    style={{ background: "var(--panel)" }}>{type === "course" ? "🎓" : "🚀"}</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] font-semibold truncate" style={{ color: "var(--text)" }}>{s.title}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Stars n={s.rating} size={10} />
                    <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>{s.rating.toFixed(1)} · {s.reviewCount} review{s.reviewCount === 1 ? "" : "s"}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── individual reviews for the selected course/project ── */}
      <div className="flex-1 overflow-y-auto">
        {!selId ? (
          <div className="h-full flex items-center justify-center text-[12px]" style={{ color: "var(--text3)" }}>
            Select a {type === "course" ? "course" : "project"} to see its individual reviews.
          </div>
        ) : loadingDetail || !detail ? (
          <div className="h-full flex items-center justify-center text-[12px]" style={{ color: "var(--text3)" }}>Loading reviews…</div>
        ) : (
          <div>
            {/* header: subject summary */}
            <div className="px-4 py-3 flex items-start gap-3 sticky top-0 z-10"
              style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
              {detail.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={detail.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" style={{ border: "1px solid var(--border)" }} />
              ) : (
                <span className="w-12 h-12 rounded-lg flex items-center justify-center text-[18px] shrink-0" style={{ background: "var(--panel)" }}>
                  {detail.type === "course" ? "🎓" : "🚀"}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-bold truncate" style={{ color: "var(--text)" }}>{detail.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Stars n={detail.rating} size={13} />
                  <span className="text-[11px] font-semibold" style={{ color: "var(--text2)" }}>{detail.rating.toFixed(2)}</span>
                  <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>· {detail.reviewCount} review{detail.reviewCount === 1 ? "" : "s"}</span>
                </div>
              </div>
              <span className="font-mono text-[8px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0"
                style={{ background: "var(--blue-d)", color: "var(--blue)" }}>{detail.type}</span>
            </div>

            <div className="p-4 mx-auto flex gap-5" style={{ maxWidth: 780 }}>
              {/* distribution */}
              <div className="w-[220px] shrink-0">
                <div className="font-mono text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text3)" }}>Rating breakdown</div>
                <div className="rounded-lg p-3 flex flex-col gap-1.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  {([5, 4, 3, 2, 1] as const).map((star) => (
                    <DistBar key={star} star={star} count={detail.distribution[String(star) as "1"|"2"|"3"|"4"|"5"]} total={detail.reviewCount} />
                  ))}
                </div>
              </div>

              {/* individual reviews */}
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text3)" }}>
                  All reviews ({detail.reviews.length})
                </div>
                {detail.reviews.length === 0 ? (
                  <div className="text-[11px]" style={{ color: "var(--text3)" }}>No reviews yet.</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {detail.reviews.map((r) => (
                      <div key={r.id} className="rounded-lg p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-[8.5px] font-bold shrink-0"
                            style={{ background: "var(--blue-d)", color: "var(--blue)" }}>{initials(r.student.name)}</span>
                          <span className="text-[11.5px] font-semibold truncate" style={{ color: "var(--text)" }}>{r.student.name}</span>
                          <Stars n={r.rating} size={11} />
                          <span className="ml-auto font-mono text-[9px] shrink-0" style={{ color: "var(--text3)" }}>{fmtDate(r.createdAt)}</span>
                        </div>
                        {r.comment && <div className="text-[11.5px] mt-2" style={{ color: "var(--text2)" }}>{r.comment}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
