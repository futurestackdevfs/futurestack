"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { loadToken } from "@/app/auth/lib/token-store";
import { StarRating } from "@/components/StarRating";
import ProjectLearningView from "./ProjectLearningView";

interface StudentProject {
  id: string;
  name: string;
  image?: string | null;
  shortDesc?: string;
  tech?: string[];
  level?: string;
  badge?: string;
  duration?: string;
  trainer?: string;
  trainerRole?: string;
  progressPercent: number;
  completedVideos: number;
  totalVideos: number;
  status: string;
  pricePaid: number;
  purchasedAt: string;
}

function badgeColor(level?: string) {
  switch (level) {
    case "ADVANCED": return "bg-[rgba(239,68,68,.2)] text-[#fca5a5] border border-[rgba(239,68,68,.3)]";
    case "INTERMEDIATE": return "bg-[rgba(245,158,11,.2)] text-[#fcd34d] border border-[rgba(245,158,11,.3)]";
    case "BEGINNER": return "bg-[rgba(34,197,94,.2)] text-[#86efac] border border-[rgba(34,197,94,.3)]";
    default: return "bg-[rgba(34,197,94,.2)] text-[#86efac] border border-[rgba(34,197,94,.3)]";
  }
}

function statusColor(status: string, progress: number) {
  if (progress >= 100) return { cls: "bg-[rgba(34,197,94,.2)] text-[#86efac] border border-[rgba(34,197,94,.3)]", label: "Completed" };
  if (progress > 0) return { cls: "bg-[rgba(240,90,26,.2)] text-[#ffb89a] border border-[rgba(240,90,26,.3)]", label: "In Progress" };
  return { cls: "bg-[rgba(59,130,246,.2)] text-[#93c5fd] border border-[rgba(59,130,246,.3)]", label: "Not Started" };
}

export default function ProjectsSection() {
  const [projects, setProjects] = useState<StudentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [reviewIds, setReviewIds] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await loadToken();
      if (!token) { setLoading(false); return; }
      try {
        const res = await fetch("/api/student/my-projects", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setProjects(data);

        const reviewed = new Set<string>();
        const idMap = new Map<string, string>();
        await Promise.all(
          data.map(async (p: StudentProject) => {
            try {
              const r = await fetch(`/api/projects/${p.id}/reviews/me`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (r.ok) {
                const body = await r.json();
                if (body && body.id) {
                  reviewed.add(p.id);
                  idMap.set(p.id, body.id);
                }
              }
            } catch {}
          })
        );
        if (!cancelled) {
          setReviewedIds(reviewed);
          setReviewIds(idMap);
        }
      } catch (e: any) {
        setError(e.message || "Failed to load projects");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // If a project is selected, show learning view
  if (activeProjectId) {
    return (
      <ProjectLearningView
        projectId={activeProjectId}
        onBack={() => setActiveProjectId(null)}
      />
    );
  }

  async function submitReview(projectId: string) {
    const token = await loadToken();
    if (!token) return;
    setReviewSubmitting(true);
    try {
      const existingReviewId = reviewIds.get(projectId);
      const url = existingReviewId
        ? `/api/projects/${projectId}/reviews/${existingReviewId}`
        : `/api/projects/${projectId}/reviews`;
      const res = await fetch(url, {
        method: existingReviewId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          setReviewIds((prev) => new Map(prev).set(projectId, data.id));
        }
        setReviewedIds((prev) => new Set(prev).add(projectId));
        setReviewingId(null);
        setReviewComment("");
      }
    } catch {} finally {
      setReviewSubmitting(false);
    }
  }

  const deployed = projects.filter((p) => p.progressPercent >= 100).length;
  const inProgress = projects.filter((p) => p.progressPercent > 0 && p.progressPercent < 100).length;
  const avgScore = projects.length > 0
    ? Math.round(projects.reduce((sum, p) => sum + p.progressPercent, 0) / projects.length)
    : 0;

  return (
    <div className="flex flex-col gap-4 px-[18px] py-4">
      {/* STATS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { ico: "🚀", num: String(deployed), lbl: "Completed", icoBg: "var(--green-d)", numColor: "var(--green)" },
          { ico: "🔨", num: String(inProgress), lbl: "In Progress", icoBg: "var(--orange-d)", numColor: "var(--orange)" },
          { ico: "📦", num: String(projects.length), lbl: "Total Projects", icoBg: "var(--blue-d)", numColor: "var(--text)" },
          { ico: "⭐", num: String(avgScore), lbl: "Avg. Progress", icoBg: "var(--purple-d)", numColor: "var(--purple)" },
        ].map((s) => (
          <div key={s.lbl} className="bg-[var(--card)] border border-[var(--border)] rounded-[10px] px-[15px] py-[13px] flex items-center gap-3 transition-transform duration-200 hover:-translate-y-[2px] hover:shadow-[var(--shadow)]">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[17px] shrink-0" style={{ background: s.icoBg }}>{s.ico}</div>
            <div>
              <div className="font-['Syne',sans-serif] text-[22px] font-[800] leading-none" style={{ color: s.numColor }}>{s.num}</div>
              <div className="text-[10.5px] text-[var(--text3)] mt-[2px]">{s.lbl}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ACTIVE PROJECTS */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[var(--text3)]">{"// active"}</span>
          <span className="font-['Syne',sans-serif] text-[13.5px] font-bold text-[var(--text)]">Active Projects</span>
          <span className="flex-1 h-[1px] bg-[var(--border)]" />
          <Link href="/live-projects" className="font-['JetBrains_Mono',monospace] text-[9.5px] font-semibold text-[var(--blue2)] px-2 py-[2px] border border-[rgba(59,130,246,.25)] rounded-[4px] transition-all duration-[0.15s] whitespace-nowrap hover:bg-[var(--blue-d)] hover:border-[var(--blue2)] no-underline">Browse Live Projects →</Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-3">
            <span className="inline-block w-5 h-5 border-2 border-[var(--border)] border-t-[var(--orange)] rounded-full animate-spin" />
            <span className="text-[13px] text-[var(--muted)]">Loading projects…</span>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-[13px] text-[var(--red)]">{error}</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-[36px] mb-3">📦</div>
            <div className="text-[13px] text-[var(--text3)] mb-2">No projects yet</div>
            <Link href="/live-projects" className="text-[12px] text-[var(--orange)] hover:underline">Browse Live Projects →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((p) => {
              const st = statusColor(p.status, p.progressPercent);
              const progressColor = p.progressPercent >= 100
                ? "linear-gradient(90deg,var(--green),#22c55e)"
                : p.progressPercent > 0
                  ? "linear-gradient(90deg,var(--orange),var(--orange2))"
                  : "linear-gradient(90deg,var(--blue),var(--blue2))";
              const isReviewing = reviewingId === p.id;
              const isReviewed = reviewedIds.has(p.id);

              return (
                <div
                  key={p.id}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-[14px] overflow-hidden transition-all duration-[0.22s] flex flex-col relative [animation:fadeUp_.3s_ease_both] hover:-translate-y-[4px] hover:shadow-[var(--shadow-lg)] hover:border-[var(--border2)]"
                >
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--border)] z-[1] transition-[background] duration-300 hover:bg-[linear-gradient(90deg,var(--orange),var(--blue2))]" />
                  {/* BANNER */}
                  <div className="h-[90px] shrink-0 flex items-center justify-between px-[18px] relative overflow-hidden" style={{ background: p.image ? undefined : "linear-gradient(135deg,#0d1f3c,#0a2a1a)" }}>
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 90" preserveAspectRatio="none">
                      <defs><pattern id={`pp${p.id}`} width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="rgba(255,255,255,.04)" strokeWidth=".7" /></pattern></defs>
                      <rect width="400" height="90" fill={`url(#pp${p.id})`} />
                      <polyline points="0,65 80,50 160,58 240,30 320,42 400,18" fill="none" stroke="rgba(34,197,94,.45)" strokeWidth="1.5" />
                      <polyline points="0,78 100,70 200,62 300,50 400,38" fill="none" stroke="rgba(59,130,246,.3)" strokeWidth="1" />
                    </svg>
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="absolute inset-0 w-full h-full object-cover opacity-40" />
                    ) : (
                      <div className="text-[36px] relative z-[1] drop-shadow-[0_3px_8px_rgba(0,0,0,.5)]">🚀</div>
                    )}
                    <span className={`relative z-[1] font-['JetBrains_Mono',monospace] text-[8px] font-bold px-[10px] py-[3px] rounded-[20px] uppercase tracking-[.06em] backdrop-blur-[8px] ${st.cls}`}>{`● ${st.label}`}</span>
                  </div>
                  {/* BODY */}
                  <div className="px-[15px] py-[13px] flex-1 flex flex-col" onClick={() => { if (!isReviewing) setActiveProjectId(p.id); }}>
                    <div className="font-['JetBrains_Mono',monospace] text-[8.5px] text-[var(--text3)] uppercase tracking-[.06em] mb-[4px]">{p.trainer} · {p.trainerRole}</div>
                    <div className="font-['Syne',sans-serif] text-[14px] font-[800] text-[var(--text)] mb-[4px] leading-[1.3]">{p.name}</div>
                    {p.shortDesc && <div className="text-[11.5px] text-[var(--text3)] leading-[1.55] mb-[11px] line-clamp-2">{p.shortDesc}</div>}

                    {/* tech badges */}
                    {p.tech && p.tech.length > 0 && (
                      <div className="flex gap-[5px] flex-wrap mb-[10px]">
                        {p.tech.map((t) => (
                          <span key={t} className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold px-[8px] py-[2px] rounded-[4px] bg-[var(--bg2)] border border-[var(--border)] text-[var(--text3)]">{t}</span>
                        ))}
                      </div>
                    )}

                    {/* tags */}
                    <div className="flex gap-[5px] flex-wrap mb-3">
                      {p.badge && (
                        <span className={`font-['JetBrains_Mono',monospace] text-[8px] font-bold px-[7px] py-[2px] rounded-[3px] tracking-[.04em] ${badgeColor(p.level)}`}>{p.badge}</span>
                      )}
                      <span className="font-['JetBrains_Mono',monospace] text-[8px] font-bold px-[7px] py-[2px] rounded-[3px] tracking-[.04em] bg-[var(--bg2)] text-[var(--text3)] border border-[var(--border)]">
                        {p.completedVideos}/{p.totalVideos} videos
                      </span>
                    </div>

                    {/* progress bar */}
                    <div className="mb-3">
                      <div className="flex justify-between font-['JetBrains_Mono',monospace] text-[9px] text-[var(--text3)] mb-[4px]">
                        <span>Build progress</span>
                        <span className="font-bold text-[var(--orange)]">{p.progressPercent}%</span>
                      </div>
                      <div className="h-[5px] bg-[var(--border)] rounded-[99px] overflow-hidden">
                        <div className="h-full rounded-[99px] transition-[width] duration-[0.8s]" style={{ width: `${p.progressPercent}%`, background: progressColor }} />
                      </div>
                    </div>

                    {/* INLINE REVIEW FORM */}
                    {isReviewing && (
                      <div className="mb-3 p-3 rounded-[8px] border border-[var(--orange)] bg-[var(--bg)]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2 mb-2">
                          <StarRating value={reviewRating} onChange={setReviewRating} size={18} interactive />
                          <span className="text-[10px] font-bold text-[var(--text)]">{reviewRating}/5</span>
                        </div>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Write a comment... (optional)"
                          rows={2}
                          maxLength={1000}
                          className="w-full text-[10px] px-2 py-1.5 rounded-[5px] border border-[var(--border)] bg-[var(--card)] text-[var(--text)] outline-none resize-none mb-2 placeholder:text-[var(--text3)]"
                        />
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => { setReviewingId(null); setReviewComment(""); }}
                            className="flex-1 px-2 py-[5px] rounded-[5px] text-[9px] font-semibold border border-[var(--border)] bg-[var(--card)] text-[var(--text3)] cursor-pointer"
                          >Cancel</button>
                          <button
                            onClick={() => submitReview(p.id)}
                            disabled={reviewSubmitting}
                            className="flex-1 px-2 py-[5px] rounded-[5px] text-[9px] font-bold border-none text-white cursor-pointer disabled:opacity-50"
                            style={{ background: "var(--orange)" }}
                          >{reviewSubmitting ? "…" : isReviewed ? "Update" : "Submit"}</button>
                        </div>
                      </div>
                    )}

                    {/* footer */}
                    <div className="mt-auto flex items-center justify-between pt-[11px] border-t border-[var(--border)] gap-2">
                      {isReviewed ? (
                        <span className="text-[9.5px] font-semibold text-[var(--green)]">✓ Reviewed</span>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setReviewingId(isReviewing ? null : p.id); setReviewRating(5); setReviewComment(""); }}
                          className="text-[9.5px] font-semibold text-[var(--muted)] hover:text-[var(--orange)] transition-colors cursor-pointer bg-transparent border-none p-0"
                        >★ Write a Review</button>
                      )}
                      <div className="flex gap-1.5 shrink-0">
                        {p.progressPercent >= 100 ? (
                          <span className="px-3 py-[5px] rounded-[6px] text-[11px] font-semibold bg-[var(--green-d)] text-[var(--green)] border border-[rgba(22,163,74,.2)]">
                            ✓ Completed
                          </span>
                        ) : p.progressPercent > 0 ? (
                          <span className="px-3 py-[5px] rounded-[6px] text-[11px] font-semibold bg-[var(--orange)] text-white shadow-[0_2px_8px_rgba(240,90,26,.3)]">
                            Continue →
                          </span>
                        ) : (
                          <span className="px-3 py-[5px] rounded-[6px] text-[11px] font-semibold bg-[var(--blue-d)] text-[var(--blue)]">
                            Start →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
