"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface ProjectDetail {
  id: string;
  name: string;
  image?: string | null;
  techLabel?: string;
  tech?: string;
  shortDesc?: string;
  overview?: string;
  thumbGradient?: string;
  level?: string;
  badge?: string;
  duration?: string;
  sessions?: string;
  seats?: number;
  price?: number;
  originalPrice?: number;
  category?: string;
  stack?: string[];
  highlights?: string[];
  prereqs?: string[];
  includes?: string[];
  industryUse?: string;
  tools?: string[];
  setupSteps?: string[];
  demoVideoUrl?: string | null;
  walkthroughVideoUrl?: string | null;
  trainer?: {
    id: string;
    name: string;
    email?: string;
    bio?: string;
    careerPath?: string;
    avatarUrl?: string;
    yearsExperience?: number;
    rating?: number;
  } | null;
  curriculum?: {
    id: string;
    week: string;
    title: string;
    desc: string;
    order: number;
    videos?: {
      id: string;
      title: string;
      vdoCipherId?: string | null;
      durationSeconds?: number;
    }[];
  }[];
}

function badgeColor(level?: string) {
  switch (level) {
    case "ADVANCED": return "bg-[rgba(239,68,68,.15)] text-[#ef4444]";
    case "INTERMEDIATE": return "bg-[rgba(245,158,11,.15)] text-[#f59e0b]";
    case "BEGINNER": return "bg-[rgba(34,197,94,.15)] text-[#22c55e]";
    default: return "bg-[rgba(34,197,94,.15)] text-[#22c55e]";
  }
}

function initials(name?: string) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetch(`/api/projects/${projectId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setProject(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || "Failed to load project");
        setLoading(false);
      });
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="flex items-center gap-3">
          <span className="inline-block w-5 h-5 border-2 border-[var(--border)] border-t-[var(--orange)] rounded-full animate-spin" />
          <span className="text-[13px] text-[var(--muted)]">Loading project...</span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: "var(--bg)" }}>
        <div className="text-[14px] text-[var(--red)] text-center">{error || "Project not found"}</div>
        <button
          onClick={() => router.push("/live-projects")}
          className="text-[12px] text-[var(--orange)] hover:underline cursor-pointer"
        >
          ← Back to Projects
        </button>
      </div>
    );
  }

  const p = project;
  const off = p.originalPrice && p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-[840px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back button */}
        <button
          onClick={() => router.push("/live-projects")}
          className="mb-4 sm:mb-6 text-[12px] text-[var(--muted)] hover:text-[var(--orange)] cursor-pointer flex items-center gap-1"
        >
          ← Back to Projects
        </button>

        {/* Hero */}
        <div
          className="relative h-[160px] sm:h-[200px] md:h-[240px] rounded-[12px] sm:rounded-[16px] overflow-hidden mb-6 sm:mb-8 flex items-center justify-center"
          style={{ background: p.thumbGradient || "linear-gradient(135deg,#0d1f3c,#0a2a1a)" }}
        >
          {p.badge && (
            <span className={`absolute top-3 left-3 sm:top-4 sm:left-4 text-[9px] sm:text-[10px] font-bold tracking-widest uppercase px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-[5px] sm:rounded-[6px] z-10 ${badgeColor(p.level)}`}>
              {p.badge}
            </span>
          )}
          {p.image ? (
            <img src={p.image} alt={p.name} className="min-w-full min-h-full object-cover opacity-30" />
          ) : (
            <span className="text-[48px] sm:text-[56px] md:text-[64px] drop-shadow-[0_4px_10px_rgba(0,0,0,.4)]">🚀</span>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 sm:p-6 z-10">
            <h1 className="text-[20px] sm:text-[24px] md:text-[28px] font-extrabold text-white mb-1.5 sm:mb-2 drop-shadow-[0_2px_8px_rgba(0,0,0,.5)]">
              {p.name}
            </h1>
            {p.shortDesc && (
              <p className="text-[11px] sm:text-[12px] md:text-[13px] text-white/80 max-w-[500px]">{p.shortDesc}</p>
            )}
          </div>
        </div>

        {/* Quick info */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-8">
          {p.duration && (
            <div className="flex items-center gap-1.5 sm:gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] sm:rounded-[10px] px-2.5 sm:px-3 py-1.5 sm:py-2">
              <span className="text-[var(--orange)] text-[12px] sm:text-[14px]">⏱</span>
              <span className="text-[11px] sm:text-[12px] text-[var(--text)]">{p.duration}</span>
            </div>
          )}
          {p.sessions && (
            <div className="flex items-center gap-1.5 sm:gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] sm:rounded-[10px] px-2.5 sm:px-3 py-1.5 sm:py-2">
              <span className="text-[var(--orange)] text-[12px] sm:text-[14px]">👨‍🏫</span>
              <span className="text-[11px] sm:text-[12px] text-[var(--text)]">{p.sessions}</span>
            </div>
          )}
          {p.seats != null && (
            <div className="flex items-center gap-1.5 sm:gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] sm:rounded-[10px] px-2.5 sm:px-3 py-1.5 sm:py-2">
              <span className="text-[var(--orange)] text-[12px] sm:text-[14px]">💺</span>
              <span className="text-[11px] sm:text-[12px] text-[var(--text)]">{p.seats} seats left</span>
            </div>
          )}
          {p.level && (
            <div className="flex items-center gap-1.5 sm:gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] sm:rounded-[10px] px-2.5 sm:px-3 py-1.5 sm:py-2">
              <span className="text-[var(--orange)] text-[12px] sm:text-[14px]">📊</span>
              <span className="text-[11px] sm:text-[12px] text-[var(--text)]">{p.level}</span>
            </div>
          )}
        </div>

        {/* Tech stack */}
        {p.stack && p.stack.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <h3 className="text-[13px] sm:text-[14px] font-bold text-[var(--text)] mb-2.5 sm:mb-3">Tech Stack</h3>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {p.stack.map((s) => (
                <span key={s} className="text-[10px] sm:text-[11px] font-semibold bg-[var(--blue-dim)] text-[var(--blue)] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[5px] sm:rounded-[6px]">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Overview */}
        {p.overview && (
          <div className="mb-6 sm:mb-8">
            <h3 className="text-[13px] sm:text-[14px] font-bold text-[var(--text)] mb-2.5 sm:mb-3">Overview</h3>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] sm:rounded-[12px] p-4 sm:p-5">
              <p className="text-[12px] sm:text-[13px] text-[var(--text2)] leading-[1.7]">{p.overview}</p>
            </div>
          </div>
        )}

        {/* What You'll Build */}
        {p.highlights && p.highlights.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <h3 className="text-[13px] sm:text-[14px] font-bold text-[var(--text)] mb-2.5 sm:mb-3">🎯 What You&apos;ll Build</h3>
            <div className="flex flex-col gap-1.5 sm:gap-2">
              {p.highlights.map((h, i) => (
                <div key={i} className="flex gap-2 text-[12px] sm:text-[13px] text-[var(--text2)] items-start leading-[1.6]">
                  <span className="text-[var(--green)] font-bold shrink-0">✓</span>
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prerequisites */}
        {p.prereqs && p.prereqs.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <h3 className="text-[13px] sm:text-[14px] font-bold text-[var(--text)] mb-2.5 sm:mb-3">✅ Prerequisites</h3>
            <div className="flex flex-col gap-1.5 sm:gap-2">
              {p.prereqs.map((h, i) => (
                <div key={i} className="flex gap-2 text-[12px] sm:text-[13px] text-[var(--text2)] items-start leading-[1.6]">
                  <span className="text-[var(--green)] font-bold shrink-0">✓</span>
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Demo Video */}
        {p.demoVideoUrl && (
          <div className="mb-6 sm:mb-8">
            <h3 className="text-[13px] sm:text-[14px] font-bold text-[var(--text)] mb-2.5 sm:mb-3">🎬 Demo Video</h3>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] sm:rounded-[12px] overflow-hidden">
              <iframe
                src={p.demoVideoUrl}
                className="w-full aspect-video"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title="Project Demo Video"
              />
            </div>
          </div>
        )}

        {/* Curriculum */}
        {p.curriculum && p.curriculum.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <h3 className="text-[13px] sm:text-[14px] font-bold text-[var(--text)] mb-2.5 sm:mb-3">🗓 Project Curriculum</h3>
            <div className="flex flex-col gap-2 sm:gap-2.5">
              {p.curriculum
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((c, i) => (
                  <div key={i} className="flex gap-2.5 sm:gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] sm:rounded-[10px] p-2.5 sm:p-3">
                    <span className="shrink-0 text-[9px] sm:text-[10px] font-bold text-[var(--orange)] bg-[var(--orange-d)] rounded-[5px] sm:rounded-[6px] px-1.5 sm:px-2 py-0.5 sm:py-1 h-fit whitespace-nowrap">
                      {c.week}
                    </span>
                    <div className="flex-1 min-w-0">
                      <b className="text-[12px] sm:text-[13px] text-[var(--text)] block mb-0.5">{c.title}</b>
                      <span className="text-[11px] sm:text-[12px] text-[var(--muted)] leading-[1.6]">{c.desc}</span>
                      {c.videos && c.videos.length > 0 && (
                        <div className="mt-1.5 sm:mt-2 flex flex-col gap-0.5 sm:gap-1">
                          {c.videos
                            .sort((a, b) => (a as any).order ?? 0 - ((b as any).order ?? 0))
                            .map((v, vi) => (
                              <div key={vi} className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-[var(--text2)]">
                                <span className="text-[var(--blue)]">📹</span>
                                <span className="truncate">{v.title}</span>
                                {v.durationSeconds ? (
                                  <span className="text-[var(--muted)] shrink-0">({Math.floor(v.durationSeconds / 60)}:{(v.durationSeconds % 60).toString().padStart(2, "0")})</span>
                                ) : null}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Industry Use */}
        {p.industryUse && (
          <div className="mb-6 sm:mb-8">
            <h3 className="text-[13px] sm:text-[14px] font-bold text-[var(--text)] mb-2.5 sm:mb-3">🏭 Why It Matters in the Industry</h3>
            <div className="bg-gradient-to-br from-[rgba(37,99,235,.06)] to-[rgba(240,90,26,.06)] border border-[var(--border)] rounded-[10px] sm:rounded-[12px] p-4 sm:p-5">
              <p className="text-[12px] sm:text-[13px] text-[var(--text2)] leading-[1.7]">{p.industryUse}</p>
            </div>
          </div>
        )}

        {/* Tools & Setup */}
        {p.tools && p.tools.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <h3 className="text-[13px] sm:text-[14px] font-bold text-[var(--text)] mb-2.5 sm:mb-3">🛠 Development Environment Setup</h3>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              {p.tools.map((t, i) => (
                <span key={i} className="text-[11px] sm:text-[12px] font-semibold text-[var(--text2)] bg-[var(--surface)] border border-[var(--border)] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[6px] sm:rounded-[8px]">
                  {t}
                </span>
              ))}
            </div>
            {p.setupSteps && p.setupSteps.length > 0 && (
              <div className="flex flex-col gap-2 sm:gap-2.5">
                {p.setupSteps.map((s, i) => (
                  <div key={i} className="flex gap-2.5 sm:gap-3 items-start">
                    <span className="shrink-0 w-[20px] sm:w-[24px] h-[20px] sm:h-[24px] rounded-[5px] sm:rounded-[6px] bg-[var(--orange-d)] text-[var(--orange)] text-[10px] sm:text-[11px] font-extrabold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-[12px] sm:text-[13px] text-[var(--text2)] leading-[1.6]">{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Trainer */}
        {p.trainer && (
          <div className="mb-6 sm:mb-8">
            <h3 className="text-[13px] sm:text-[14px] font-bold text-[var(--text)] mb-2.5 sm:mb-3">🧑‍🏫 Your Trainer</h3>
            <div className="flex gap-3 sm:gap-4 bg-[var(--surface)] border border-[var(--border)] rounded-[10px] sm:rounded-[12px] p-3.5 sm:p-4 items-start">
              <div className="w-[40px] sm:w-[50px] h-[40px] sm:h-[50px] rounded-full bg-gradient-to-br from-[#4db33d] to-[#2d7ef7] flex items-center justify-center text-[13px] sm:text-[16px] font-bold text-white shrink-0">
                {initials(p.trainer.name)}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] sm:text-[14px] font-bold text-[var(--text)]">{p.trainer.name}</div>
                {p.trainer.careerPath && (
                  <div className="text-[11px] sm:text-[12px] text-[var(--orange)] font-semibold mb-1 sm:mb-1.5">{p.trainer.careerPath}</div>
                )}
                {p.trainer.bio && (
                  <div className="text-[11px] sm:text-[12px] text-[var(--text2)] leading-[1.65]">{p.trainer.bio}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* What's Included */}
        {p.includes && p.includes.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <h3 className="text-[13px] sm:text-[14px] font-bold text-[var(--text)] mb-2.5 sm:mb-3">📦 What&apos;s Included</h3>
            <div className="flex flex-col gap-1 sm:gap-1.5">
              {p.includes.map((item, i) => (
                <div key={i} className="flex gap-2 text-[12px] sm:text-[13px] text-[var(--text2)] items-start">
                  <span className="text-[var(--green)] font-bold shrink-0">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price bar */}
        <div className="sticky bottom-0 bg-[var(--surface)] border border-[var(--border)] rounded-[12px] sm:rounded-[14px] p-3 sm:p-5 mt-6 sm:mt-8">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-[18px] sm:text-[22px] font-extrabold text-[var(--text)]">₹{(p.price || 0).toLocaleString("en-IN")}</span>
                {p.originalPrice && p.originalPrice > (p.price || 0) && (
                  <>
                    <span className="text-[11px] sm:text-[13px] text-[var(--muted)] line-through">₹{p.originalPrice.toLocaleString("en-IN")}</span>
                    <span className="text-[10px] sm:text-[12px] font-bold text-[var(--green)]">{off}% off</span>
                  </>
                )}
              </div>
              {p.seats != null && (
                <div className="text-[9px] sm:text-[11px] text-[var(--muted)] mt-0.5">{p.seats} seats left at this price</div>
              )}
            </div>
            <button
              onClick={() => router.push(`/cart?project=${p.id}`)}
              className="shrink-0 bg-[var(--orange)] text-white border-none py-2 sm:py-3 px-4 sm:px-6 rounded-[8px] sm:rounded-[10px] font-bold text-[12px] sm:text-[14px] cursor-pointer hover:bg-[var(--orange2)] transition-all"
            >
              Buy Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
