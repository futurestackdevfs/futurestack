"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { StarRating } from "@/components/StarRating";
import { ReviewForm } from "@/components/ReviewForm";
import { useAuth } from "@/app/auth/hooks/use-auth";
import { showToast } from "@/lib/toast";

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
  rating?: number;
  reviewCount?: number;
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

interface ProjectReview {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  student: { id: string; name: string; avatarUrl?: string | null };
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

type Tab = "overview" | "curriculum" | "reviews";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const projectId = params?.id as string;

  // Buy flow — mirrors the courses page: signed-out users get a friendly
  // prompt + the login form highlighted instead of an "Unauthorized" wall.
  const handleBuy = useCallback(() => {
    if (!isAuthenticated) {
      showToast("Please sign in to buy this project");
      if (pathname === "/") {
        window.dispatchEvent(new CustomEvent("fs:highlight-login"));
      } else {
        router.push("/#student-login");
      }
      return;
    }
    router.push(`/cart?project=${projectId}`);
  }, [isAuthenticated, pathname, projectId, router]);

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Reviews state
  const [reviews, setReviews] = useState<ProjectReview[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [myReview, setMyReview] = useState<ProjectReview | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);

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

  const fetchReviews = useCallback(async (page: number = 1) => {
    if (!projectId) return;
    setReviewsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/reviews?page=${page}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.data ?? []);
        setReviewsTotal(data.total ?? 0);
        setReviewsPage(data.page ?? 1);
      }
    } catch {} finally {
      setReviewsLoading(false);
    }
  }, [projectId]);

  const fetchMyReview = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/reviews/me`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMyReview(data);
      } else {
        setMyReview(null);
      }
    } catch {
      setMyReview(null);
    }
  }, [projectId]);

  useEffect(() => {
    if (activeTab === "reviews") {
      fetchReviews(1);
      fetchMyReview();
    }
  }, [activeTab, fetchReviews, fetchMyReview]);

  async function handleSubmitReview(rating: number, comment: string) {
    const method = myReview ? "PUT" : "POST";
    const url = myReview
      ? `/api/projects/${projectId}/reviews/${myReview.id}`
      : `/api/projects/${projectId}/reviews`;
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ rating, comment }),
    });
    if (res.ok) {
      setShowReviewForm(false);
      fetchMyReview();
      fetchReviews(1);
      // Refresh project data for updated rating
      fetch(`/api/projects/${projectId}`).then((r) => r.ok && r.json()).then(setProject).catch(() => {});
    }
  }

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
  const avgRating = p.rating ?? 0;
  const totalReviews = p.reviewCount ?? 0;

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "curriculum", label: "Curriculum" },
    { key: "reviews", label: `Reviews${totalReviews > 0 ? ` (${totalReviews})` : ""}` },
  ];

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
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 sm:p-6 z-10">
            <h1 className="text-[20px] sm:text-[24px] md:text-[28px] font-extrabold text-white mb-1.5 sm:mb-2 drop-shadow-[0_2px_8px_rgba(0,0,0,.5)]">
              {p.name}
            </h1>
            {p.shortDesc && (
              <p className="text-[11px] sm:text-[12px] md:text-[13px] text-white/80 max-w-[500px]">{p.shortDesc}</p>
            )}
            {/* Rating display on hero */}
            {avgRating > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <StarRating value={avgRating} size={14} />
                <span className="text-[12px] font-bold text-white">{avgRating.toFixed(1)}</span>
                <span className="text-[11px] text-white/70">({totalReviews} reviews)</span>
              </div>
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

        {/* Tab navigation */}
        <div className="flex gap-1 border-b border-[var(--border)] mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-4 py-2.5 text-[12px] font-semibold border-b-2 transition-colors cursor-pointer bg-transparent"
              style={activeTab === tab.key
                ? { color: "var(--orange)", borderColor: "var(--orange)" }
                : { color: "var(--muted)", borderColor: "transparent" }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "overview" && (
          <>
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
          </>
        )}

        {activeTab === "curriculum" && (
          <>
            {p.curriculum && p.curriculum.length > 0 ? (
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
            ) : (
              <div className="text-center py-12 text-[13px] text-[var(--muted)]">No curriculum available</div>
            )}
          </>
        )}

        {activeTab === "reviews" && (
          <>
            {/* Rating summary */}
            <div className="flex items-center gap-4 mb-6 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-[10px]">
              <div className="text-center">
                <div className="text-[32px] font-extrabold text-[var(--text)]">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</div>
                <StarRating value={avgRating} size={16} />
                <div className="text-[11px] text-[var(--muted)] mt-1">{totalReviews} review{totalReviews !== 1 ? "s" : ""}</div>
              </div>
            </div>

            {/* Write review button / form */}
            {showReviewForm ? (
              <ReviewForm
                initialRating={myReview?.rating ?? 5}
                initialComment={myReview?.comment ?? ""}
                onSubmit={handleSubmitReview}
                onCancel={() => setShowReviewForm(false)}
                isEditing={!!myReview}
              />
            ) : (
              <button
                onClick={() => setShowReviewForm(true)}
                className="mb-4 px-4 py-2 rounded-[8px] text-[12px] font-bold cursor-pointer border-none text-white"
                style={{ background: "var(--orange)" }}
              >
                {myReview ? "✎ Edit Your Review" : "✍ Write a Review"}
              </button>
            )}

            {/* My review */}
            {myReview && !showReviewForm && (
              <div className="mb-4 p-4 bg-[var(--surface)] border border-[var(--orange)] rounded-[10px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-bold text-[var(--text)]">Your Review</span>
                  <StarRating value={myReview.rating} size={14} />
                </div>
                {myReview.comment && (
                  <p className="text-[12px] text-[var(--text2)] leading-[1.6]">{myReview.comment}</p>
                )}
              </div>
            )}

            {/* Reviews list */}
            {reviewsLoading ? (
              <div className="py-8 text-center text-[12px] text-[var(--muted)]">Loading reviews...</div>
            ) : reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-[10px]">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4db33d] to-[#2d7ef7] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                        {initials(r.student.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold text-[var(--text)]">{r.student.name}</div>
                        <div className="text-[10px] text-[var(--muted)]">{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                      </div>
                      <StarRating value={r.rating} size={13} />
                    </div>
                    {r.comment && (
                      <p className="text-[12px] text-[var(--text2)] leading-[1.6]">{r.comment}</p>
                    )}
                  </div>
                ))}
                {reviewsTotal > 10 && (
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      disabled={reviewsPage <= 1}
                      onClick={() => fetchReviews(reviewsPage - 1)}
                      className="px-3 py-1.5 rounded text-[11px] font-semibold cursor-pointer disabled:opacity-40"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                    >← Prev</button>
                    <span className="text-[11px] text-[var(--muted)] py-1.5">Page {reviewsPage}</span>
                    <button
                      disabled={reviews.length < 10}
                      onClick={() => fetchReviews(reviewsPage + 1)}
                      className="px-3 py-1.5 rounded text-[11px] font-semibold cursor-pointer disabled:opacity-40"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                    >Next →</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-[12px] text-[var(--muted)]">No reviews yet. Be the first to review!</div>
            )}
          </>
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
              onClick={handleBuy}
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
