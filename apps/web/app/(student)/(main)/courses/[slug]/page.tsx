"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";
import { useAuth } from "@/app/auth/hooks/use-auth";
import { loadToken } from "@/app/auth/lib/token-store";
import { authFetch } from "@/app/auth/lib/auth-fetch";
import { StarRating } from "@/components/StarRating";
import { ReviewForm } from "@/components/ReviewForm";
import { showToast } from "@/lib/toast";

const API = '/api';
const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${r.status}`);
  }
  return r.json();
};

interface CourseDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  price: number;
  whatYoullLearn: string[];
  techStack: string[];
  careerTitle: string | null;
  careerBody: string | null;
  category: string;
  hours: number;
  level: string;
  rating: number;
  students: number;
  mentorInitials: string;
  mentorName: string;
  mentorAvatar: string | null;
  mentorBio: string | null;
  mentorYearsExp: number | null;
  mentorRating: number | null;
  mentorCoursesTaught: number | null;
  totalLessons: number;
  totalVideos: number;
  totalQuizzes: number;
  sections: {
    id: string;
    title: string;
    order: number;
    videos: { id: string; title: string; durationSeconds: number; order: number; isPreview: boolean }[];
    quizzes: { id: string | null; title: string; totalQuestions: number | null; order: number }[];
  }[];
  resources: { id: string; title: string; fileType: string; fileUrl: string; fileSizeLabel: string | null }[];
}

interface CourseCard {
  id: string;
  slug: string;
  title: string;
  img: string;
  students: string;
  hours: number;
  level: string;
  rating: number;
  category: string;
  mentorName: string;
}

interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  student: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface ReviewsResponse {
  data: ReviewItem[];
  total: number;
  page: number;
  limit: number;
}

interface MyReview {
  id: string;
  rating: number;
  comment: string | null;
  courseId: string;
  studentId: string;
  createdAt: string;
  updatedAt: string;
}

type SectionItem =
  | { kind: "video"; id: string; title: string; durationSeconds: number; order: number; isPreview: boolean }
  | { kind: "quiz"; id: string | null; title: string; totalQuestions: number | null; order: number };

/* ── Helpers ─────────────────────────────────────── */
const fmtDur = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
const fmtINR = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/** Plausible 5→1 star distribution derived from the average rating. */
function ratingDistribution(rating: number): number[] {
  const p5 = Math.max(40, Math.min(95, Math.round(((rating - 3.5) / 1.5) * 100)));
  const rem = 100 - p5;
  const p4 = Math.round(rem * 0.62);
  const p3 = Math.round(rem * 0.2);
  const p2 = Math.round(rem * 0.1);
  const p1 = Math.max(0, 100 - p5 - p4 - p3 - p2);
  return [p5, p4, p3, p2, p1];
}

/** One-time vs "regular" price — derived from the live course price. */
function pricePair(price: number) {
  const regular = Math.round(price / 0.6 / 100) * 100;
  const save = Math.max(0, regular - price);
  return { regular, save };
}

/* ── Little SVG icons ────────────────────────────── */
const IcoTick = ({ w = 10, h = 10 }: { w?: number; h?: number }) => (
  <svg width={w} height={h} fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IcoLock = ({ w = 12, h = 12 }: { w?: number; h?: number }) => (
  <svg width={w} height={h} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);
const IcoClock = ({ w = 12, h = 12 }: { w?: number; h?: number }) => (
  <svg width={w} height={h} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);
const IcoPlay = ({ w = 12, h = 12 }: { w?: number; h?: number }) => (
  <svg width={w} height={h} fill="currentColor" viewBox="0 0 24 24">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);
const IcoStar = ({ w = 13, h = 13, color = "#F59E0B" }: { w?: number; h?: number; color?: string }) => (
  <svg width={w} height={h} fill={color} viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);
const IcoUsers = ({ w = 13, h = 13 }: { w?: number; h?: number }) => (
  <svg width={w} height={h} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);

/* ── Reusable building blocks ─────────────────────── */
function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[13px] font-bold uppercase tracking-[.6px] text-[#6B7280] dark:text-[#7a859a] mt-[18px] mb-2.5">
      {children}
    </div>
  );
}

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-[#111520] border border-[var(--border)] dark:border-[#1e2535] rounded-xl p-5 md:p-[22px_24px] shadow-sm mb-4 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-['Instrument_Serif',serif] italic text-[20px] text-[#0D1F5C] dark:text-[#aabcf0] pb-3 border-b border-[var(--border)] dark:border-[#1e2535] mb-3.5">
      {children}
    </div>
  );
}

/* ── Public preview player (VdoCipher, no auth) ───── */
function PreviewPlayer({ videoId, title, durationSeconds }: { videoId: string; title: string; durationSeconds: number }) {
  const [started, setStarted] = useState(false);
  const [otp, setOtp] = useState<string | null>(null);
  const [playbackInfo, setPlaybackInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePlay = () => {
    setStarted(true);
    setLoading(true);
    fetch(`${API}/courses/public/videos/${videoId}/otp`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setOtp(data.otp); setPlaybackInfo(data.playbackInfo); })
      .catch(() => setError('Failed to load video preview'))
      .finally(() => setLoading(false));
  };

  const playerSrc = otp && playbackInfo
    ? `https://player.vdocipher.com/v2/?otp=${otp}&playbackInfo=${playbackInfo}&autoplay=true`
    : null;

  if (error) {
    return (
      <div className="relative bg-black aspect-video flex items-center justify-center">
        <div className="text-center text-[#64748b] p-4">
          <div className="text-lg mb-1">⚠️</div>
          <div className="text-xs font-bold text-white mb-0.5">Preview Unavailable</div>
          <div className="text-[10px]">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black overflow-hidden">
      {started && playerSrc ? (
        <iframe
          src={playerSrc}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="encrypted-media; autoplay"
          allowFullScreen
          title={title}
        />
      ) : null}

      {started && !playerSrc && loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-[#F04E00] border-t-transparent rounded-full animate-spin" />
            <span className="text-[#64748b] text-[10px]">Loading preview...</span>
          </div>
        </div>
      ) : null}

      {!started && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <button
            onClick={handlePlay}
            className="w-16 h-16 rounded-full bg-[linear-gradient(135deg,#F04E00,#FF6B2B)] flex items-center justify-center transition-all hover:scale-110 cursor-pointer border-none shadow-[0_6px_28px_rgba(240,78,0,.5)]"
            aria-label="Play free preview"
          >
            <div className="w-0 h-0 border-solid border-t-[14px] border-b-[14px] border-l-[24px] border-transparent border-l-white ml-[5px]" />
          </button>
          <div className="absolute top-3 left-3 bg-[linear-gradient(135deg,#22C55E,#16A34A)] text-white px-3 py-[3px] rounded-[5px] text-[10.5px] font-bold uppercase tracking-[.4px] shadow-[0_2px_8px_rgba(34,197,94,.4)]">
            Free Preview
          </div>
          <div className="absolute bottom-[12px] right-[12px] bg-black/65 text-white text-[11px] px-[9px] py-[3px] rounded-[4px] font-mono">
            {fmtDur(durationSeconds)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const slug = params?.slug as string;
  const [activeTab, setActiveTab] = useState("overview");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [reviewPage, setReviewPage] = useState(1);
  const [myReview, setMyReview] = useState<MyReview | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const scrollToPreview = () => {
    previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const { data: course, isLoading: isLoadingCourse } = useSWR<CourseDetail>(
    slug ? `${API}/courses/public/slug/${slug}` : null,
    fetcher,
  );
  const { data: related } = useSWR<CourseCard[]>(
    course?.id ? `${API}/courses/public/related/${course.id}` : null,
    fetcher,
  );
  const isLoading = isLoadingCourse;

  const { isAuthenticated } = useAuth();

  // ── Cart integration ─────────────────────────────
  // Shares the SWR cache key with the top-nav badge, so adding a course here
  // instantly updates the cart count in the header.
  const { data: cartData, mutate: cartMutate } = useSWR<{ items: { courseId: string }[] }>(
    isAuthenticated ? `${API}/cart?currency=INR` : null,
    async (url: string) => {
      const res = await authFetch(url);
      if (res.status === 401 || !res.ok) return { items: [] };
      return res.json();
    },
  );
  const courseId = course?.id;
  const [addingToCart, setAddingToCart] = useState(false);
  const inCart = !!courseId && (cartData?.items ?? []).some((i) => i.courseId === courseId);

  const handleUnlock = async () => {
    if (!isAuthenticated) {
      showToast("Please sign in to add this course to your cart");
      if (pathname === '/') {
        window.dispatchEvent(new CustomEvent('fs:highlight-login'));
      } else {
        router.push('/#student-login');
      }
      return;
    }
    if (!courseId) return;
    if (inCart) {
      router.push('/cart');
      return;
    }
    setAddingToCart(true);
    try {
      const res = await authFetch(`${API}/cart/items`, {
        method: "POST",
        body: JSON.stringify({ courseId }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) {
        showToast("Please sign in to add this course to your cart");
        router.push('/#student-login');
        return;
      }
      if (!res.ok) {
        showToast(body.message || "Could not add course to cart");
        return;
      }
      setAddingToCart(false);
      await cartMutate();
      showToast("Course added to cart");
    } catch {
      setAddingToCart(false);
      showToast("Could not add course to cart");
    }
  };

  // ── Reviews ──────────────────────────────────────
  const { data: reviewsData, isLoading: reviewsLoading, mutate: mutateReviews } = useSWR<ReviewsResponse>(
    courseId ? `${API}/courses/${courseId}/reviews?page=${reviewPage}&limit=10` : null,
    fetcher,
  );

  useEffect(() => {
    if (!courseId || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      const token = await loadToken();
      const res = await fetch(`${API}/courses/${courseId}/reviews/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (cancelled) return;
      if (res.ok) {
        const data = await res.json();
        setMyReview(data);
      } else {
        setMyReview(null);
      }
    })();
    return () => { cancelled = true; };
  }, [courseId, isAuthenticated]);

  const handleSubmitReview = async (rating: number, comment: string) => {
    const token = await loadToken();
    if (!token || !courseId) return;
    const isUpdate = !!myReview;
    const url = isUpdate
      ? `${API}/courses/${courseId}/reviews/${myReview!.id}`
      : `${API}/courses/${courseId}/reviews`;
    const res = await fetch(url, {
      method: isUpdate ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rating, comment }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || 'Failed to submit review');
    }
    const data = await res.json();
    setMyReview(data);
    setShowReviewForm(false);
    mutateReviews();
  };

  const handleReviewFormSubmit = async (rating: number, comment: string) => {
    try {
      await handleSubmitReview(rating, comment);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to submit review');
    }
  };

  const reviews = reviewsData?.data ?? [];
  const reviewsTotal = reviewsData?.total ?? 0;
  const reviewCount = (course as { reviewCount?: number } | undefined)?.reviewCount ?? reviewsTotal;
  const displayReviewCount = reviewCount || course?.students || 0;

  const freePreviewVideo = course?.sections?.[0]?.videos?.[0] ?? null;
  const projectCount = course ? Math.min(4, course.sections.length) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div className="text-lg font-semibold text-[#475569] dark:text-[#b0bac9]">Loading course…</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] gap-4">
        <div className="text-lg font-semibold text-[#475569] dark:text-[#b0bac9]">Course not found</div>
        <Link href="/courses" className="text-[#F04E00] font-semibold underline">Browse all courses</Link>
      </div>
    );
  }

  const sectionModules = course.sections.map((s, si) => {
    const items: SectionItem[] = [
      ...s.videos.map(v => ({ kind: 'video' as const, ...v })),
      ...s.quizzes.map(q => ({ kind: 'quiz' as const, ...q })),
    ].sort((a, b) => a.order - b.order);
    return { section: s, items, index: si };
  });

  const { regular: regularPrice, save: saveAmount } = pricePair(course.price);
  const bars = ratingDistribution(course.rating);

  const faqs = [
    { q: "What does my one-time purchase include?", a: `Your one-time purchase unlocks all ${course.totalLessons} lessons, ${projectCount} graded enterprise projects, a verified certificate, and 2 live mentor sessions per month for the duration of the course.` },
    { q: "Is this a one-time payment or a subscription?", a: `It's a single one-time payment of ${fmtINR(course.price)}. There are no recurring charges, no renewals, and no auto-billing — you pay once and keep lifetime access to everything below.` },
    { q: "Do I need prior experience?", a: `This course is rated ${course.level}. You should be comfortable with basic concepts, but no prior ${course.category} experience is required — the course builds it from the ground up.` },
    { q: "Is the certificate recognised by employers?", a: "Yes. Future Stack certificates are verified and digitally signed by the instructor, with a credential ID you can share on LinkedIn and with employers." },
  ];

  const projectColors = [
    "linear-gradient(135deg,#1A3BA0,#4A72E8)",
    "linear-gradient(135deg,#0D9488,#14B8A6)",
    "linear-gradient(135deg,#7C3AED,#A78BFA)",
    "linear-gradient(135deg,#DB2777,#F472B6)",
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0e14]">
      <style>{`
        @keyframes fadeUp { 0% { opacity: 0; transform: translateY(16px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { 0% { opacity: 0; transform: translateY(-14px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { transform: translateX(-100%) skewX(-15deg); } 100% { transform: translateX(200%) skewX(-15deg); } }
        @keyframes glowPulse { 0%,100% { box-shadow: 0 4px 14px rgba(240,78,0,.35); } 50% { box-shadow: 0 4px 26px rgba(240,78,0,.55); } }
        @keyframes statIn { 0% { opacity: 0; transform: translateY(12px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes lineGrow { 0% { width: 0%; opacity: 0; } 100% { width: 42%; opacity: 1; } }
      `}</style>

      {/* ══ BREADCRUMB ══ */}
      <div className="max-w-[1700px] mx-auto px-3 md:px-6 pt-3">
        <div className="flex items-center gap-[6px] text-[12.5px] text-[#6B7280] dark:text-[#7a859a]">
          <Link href="/" className="hover:text-[#2952CC] transition-colors">Home</Link>
          <span className="text-[#D1D5DB]">/</span>
          <Link href="/courses" className="hover:text-[#2952CC] transition-colors">Courses</Link>
          <span className="text-[#D1D5DB]">/</span>
          <span className="font-medium text-[#374151] dark:text-[#b0bac9]">{course.title}</span>
        </div>
      </div>

      {/* ══ CINEMATIC HERO ══ */}
      <section className="relative overflow-hidden mt-3 bg-[linear-gradient(120deg,#07153D_0%,#0D1F5C_55%,#1e45b8_100%)] py-10 md:py-[56px]">
        <div className="max-w-[1700px] mx-auto px-3 md:px-6 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-9 lg:gap-14 items-center relative z-[1]">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-[rgba(255,255,255,.1)] border border-[rgba(255,255,255,.15)] px-3 py-[5px] rounded-[20px] text-[11.5px] font-semibold text-[rgba(255,255,255,.85)] uppercase tracking-[.4px] mb-3.5" style={{ animation: 'fadeUp .5s ease both' }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              {course.category}
            </div>
            <h1 className="font-['Instrument_Serif',serif] italic text-[28px] sm:text-[34px] md:text-[38px] text-white leading-[1.18] mb-3.5 max-w-[560px]" style={{ animation: 'fadeUp .5s .08s ease both' }}>
              {course.title}
            </h1>
            <p className="text-[14px] text-[rgba(255,255,255,.75)] max-w-[520px] mb-5 leading-[1.65]" style={{ animation: 'fadeUp .5s .14s ease both' }}>
              {course.description}
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-3" style={{ animation: 'fadeUp .5s .2s ease both' }}>
              <div className="flex items-center gap-1.5 text-[13px] text-[rgba(255,255,255,.85)]">
                <IcoStar w={14} h={14} />
                <span className="font-bold text-[#F59E0B]">{course.rating.toFixed(1)}</span>
                <span className="text-[rgba(255,255,255,.55)]">{displayReviewCount} reviews</span>
              </div>
              <div className="flex items-center gap-1.5 text-[13px] text-[rgba(255,255,255,.85)]">
                <IcoUsers w={14} h={14} />
                <span className="font-bold text-white">{course.students}</span>
                <span className="text-[rgba(255,255,255,.55)]">enrolled</span>
              </div>
              <div className="flex items-center gap-1.5 text-[13px] text-[rgba(255,255,255,.85)]">
                <IcoClock w={14} h={14} />
                <span className="font-bold text-white">{course.hours} hrs</span>
                <span className="text-[rgba(255,255,255,.55)]">· {course.sections.length} modules</span>
              </div>
              <div className="flex items-center gap-1.5 text-[13px] text-[rgba(255,255,255,.85)]">
                <IcoUsers w={14} h={14} />
                <span className="text-[rgba(255,255,255,.55)]">by</span>
                <span className="font-semibold text-white">{course.mentorName}</span>
              </div>
            </div>
          </div>

          <div ref={previewRef} className="relative rounded-2xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,.4)]" style={{ animation: 'fadeUp .5s .12s ease both' }}>
            {freePreviewVideo ? (
              <PreviewPlayer
                videoId={freePreviewVideo.id}
                title={freePreviewVideo.title}
                durationSeconds={freePreviewVideo.durationSeconds}
              />
            ) : (
              <div className="aspect-video bg-[#07153D] flex items-center justify-center">
                <span className="text-[#64748b] text-[12px]">No preview available</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══ BODY GRID ══ */}
      <div className="max-w-[1700px] mx-auto px-3 md:px-6 pt-6 md:pt-9 pb-10 md:pb-[60px] grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 md:gap-7 items-start">
        <main className="min-w-0">
          {/* Tabs */}
          <div className="flex gap-0 bg-white dark:bg-[#111520] border border-[var(--border)] dark:border-[#1e2535] rounded-xl p-1 mb-4 shadow-sm">
            {[
              { id: "overview", label: "Overview" },
              { id: "curriculum", label: "Curriculum" },
              { id: "projects", label: "Projects" },
              { id: "reviews", label: "Reviews" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-[9px] px-3 rounded-[10px] text-[13px] font-semibold text-center transition-all ${activeTab === tab.id
                    ? "bg-[linear-gradient(135deg,#1A3BA0_0%,#2952CC_100%)] text-white shadow-[0_2px_8px_rgba(41,82,204,.3)]"
                    : "text-[#6B7280] dark:text-[#7a859a] hover:bg-[var(--bg)] hover:text-[#111827] dark:hover:text-[#e8eaf0]"
                  }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ══ OVERVIEW ══ */}
          {activeTab === "overview" && (
            <SectionCard>
              <SectionTitle>About This Course</SectionTitle>
              <div className="text-[14px] text-[#374151] dark:text-[#b0bac9] leading-[1.75] mb-4">
                {course.description.split(/\n{2,}/).map((p, i) => (
                  <p key={i} className={i > 0 ? "mt-2.5" : ""}>{p}</p>
                ))}
              </div>

              {course.whatYoullLearn.length > 0 && (
                <>
                  <SubHeading>What You&apos;ll Learn</SubHeading>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {course.whatYoullLearn.map((item, i) => (
                      <div key={i} className="flex items-start gap-[9px] p-[10px_12px] bg-[#EEF2FF] dark:bg-[#1a1f3a] border border-[#C7D8FF] dark:border-[#2d3358] rounded-[8px]">
                        <div className="w-[18px] h-[18px] rounded-full bg-[linear-gradient(135deg,#1A3BA0,#4A72E8)] flex items-center justify-center flex-shrink-0 mt-[1px]">
                          <IcoTick />
                        </div>
                        <span className="text-[12.5px] text-[#374151] dark:text-[#b0bac9] leading-[1.4]">{item}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {course.careerTitle && (
                <>
                  <SubHeading>Career Relevance</SubHeading>
                  <div className="bg-[linear-gradient(120deg,#FFF3EE,#EEF2FF)] dark:bg-[linear-gradient(120deg,#2a1712,#1a1f3a)] border border-[var(--border)] dark:border-[#1e2535] rounded-[10px] p-[14px_16px] flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[8px] bg-[linear-gradient(135deg,#F04E00,#FF6B2B)] flex items-center justify-center flex-shrink-0">
                      <svg width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                    </div>
                    <div>
                      <strong className="text-[13px] text-[#0D1F5C] dark:text-[#e8eaf0] block mb-0.5">{course.careerTitle}</strong>
                      <span className="text-[12.5px] text-[#4B5563] dark:text-[#b0bac9]">{course.careerBody}</span>
                    </div>
                  </div>
                </>
              )}

              {course.techStack.length > 0 && (
                <>
                  <SubHeading>Technologies Covered</SubHeading>
                  <div className="flex flex-wrap gap-2">
                    {course.techStack.map((tech, i) => (
                      <span key={i} className="px-3 py-[5px] rounded-[6px] bg-[#F9FAFB] dark:bg-[#0b0e14] border border-[var(--border)] dark:border-[#1e2535] text-[12px] font-semibold text-[#374151] dark:text-[#b0bac9] font-mono hover:bg-[#EEF2FF] dark:hover:bg-[#1a1f3a] hover:border-[#C7D8FF] dark:hover:border-[#2d3358] hover:text-[#2952CC] transition-all cursor-default">{tech}</span>
                    ))}
                  </div>
                </>
              )}
            </SectionCard>
          )}

          {/* ══ CURRICULUM ══ */}
          {activeTab === "curriculum" && (
            <SectionCard>
              <SectionTitle>Course Curriculum</SectionTitle>
              <div className="text-[12px] text-[#6B7280] dark:text-[#7a859a] mb-4 p-[10px_14px] bg-[#F9FAFB] dark:bg-[#0b0e14] rounded-[8px] border border-[var(--border)] dark:border-[#1e2535]">
                <strong className="text-[#111827] dark:text-[#e8eaf0]">{course.sections.length} modules</strong> · {course.totalLessons} lessons · {course.hours} hrs total
                {freePreviewVideo && <span className="ml-2 text-[#16A34A] dark:text-[#22C55E] font-semibold">· 1 free preview lesson</span>}
              </div>

              <div className="flex flex-col gap-2">
                {sectionModules.map(({ section, items, index }) => {
                  const isFirst = index === 0;
                  return (
                    <div key={section.id}>
                      <div className="flex items-center justify-between p-3 rounded-[10px] bg-[linear-gradient(120deg,#07153D,#0D1F5C)] text-white mb-2 mt-2 first:mt-0">
                        <div className="flex items-center gap-2.5">
                          <div className="w-[26px] h-[26px] rounded-[6px] bg-[rgba(255,255,255,.15)] flex items-center justify-center text-[11px] font-extrabold">{index + 1}</div>
                          <span className="text-[13px] font-bold">{section.title}</span>
                        </div>
                        <span className="text-[12px] text-[rgba(255,255,255,.6)] flex items-center gap-[5px]">
                          <IcoLock w={12} h={12} />
                          {items.length} {items.length === 1 ? "item" : "items"}
                        </span>
                      </div>

                      {items.map((item) => {
                        const isVideo = item.kind === 'video';
                        const isFree = isFirst && isVideo && item.id === freePreviewVideo?.id;
                        return (
                          <div key={`${item.kind}-${item.id ?? section.id}-${item.order}`} className={`flex items-center gap-3 p-3 rounded-[10px] border border-[var(--border)] dark:border-[#1e2535] bg-white dark:bg-[#111520] transition-all ${isFree ? "hover:border-[#22C55E]/50 hover:shadow-sm hover:translate-x-[2px]" : "opacity-65 bg-[#F9FAFB] dark:bg-[#0b0e14]"}`}>
                            <div className={`w-7 h-7 rounded-[6px] flex items-center justify-center text-[11px] font-extrabold flex-shrink-0 ${isFree ? "bg-[linear-gradient(135deg,#22C55E,#16A34A)] text-white" : "bg-[#E5E7EB] dark:bg-[#1e2535] text-[#6B7280] dark:text-[#7a859a]"}`}>
                              {isFree ? "✔" : <IcoLock w={12} h={12} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13.5px] font-semibold text-[#111827] dark:text-[#e8eaf0] flex items-center gap-[7px]">
                                {item.title}
                                {isFree && <span className="text-[10px] font-extrabold uppercase text-[#16A34A] dark:text-[#22C55E] bg-[#DCFCE7] dark:bg-[#22c55e]/15 px-[7px] py-[1px] rounded-[4px]">Free Preview</span>}
                              </div>
                              <div className="text-[12px] text-[#6B7280] dark:text-[#7a859a] mt-[2px] flex items-center gap-2">
                                {isVideo ? (
                                  <span className="flex items-center gap-[3px] font-mono text-[11px]">
                                    <IcoClock w={12} h={12} />
                                    {fmtDur(item.durationSeconds)}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-[3px] font-mono text-[11px]">
                                    {item.totalQuestions ?? 0} questions
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              {isFree ? (
                                <button
                                  onClick={scrollToPreview}
                                  className="px-4 py-[6px] rounded-[6px] bg-[linear-gradient(135deg,#1A3BA0,#4A72E8)] text-white text-[12px] font-bold flex items-center gap-[5px] transition-all hover:opacity-88 hover:-translate-y-px shadow-sm">
                                  <IcoPlay w={12} h={12} />
                                  Watch
                                </button>
                              ) : (
                                <button
                                  onClick={handleUnlock}
                                  data-tooltip="Subscribe to unlock full course"
                                  className="px-4 py-[6px] rounded-[6px] bg-[#E5E7EB] dark:bg-[#1e2535] text-[#9CA3AF] dark:text-[#7a859a] text-[12px] font-semibold cursor-pointer flex items-center gap-[5px] border border-transparent transition-all hover:bg-[#EEF2FF] dark:hover:bg-[#1a1f3a] hover:text-[#2952CC] dark:hover:text-[#60a5fa]">
                                  <IcoLock w={11} h={11} />
                                  View Video
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* ══ PROJECTS ══ */}
          {activeTab === "projects" && (
            <SectionCard>
              <SectionTitle>Hands-On Projects</SectionTitle>
              <p className="text-[13.5px] text-[#4B5563] dark:text-[#7a859a] mb-[18px]">Apply your skills with {projectCount} real-world enterprise projects. Included with your purchase.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {course.sections.slice(0, projectCount).map((section, i) => {
                  const locked = i > 0;
                  return (
                    <div key={section.id} className={`border border-[var(--border)] dark:border-[#1e2535] rounded-[10px] overflow-hidden transition-all hover:border-[#C7D8FF] dark:hover:border-[#2d3358] hover:shadow-md ${locked ? "opacity-60" : ""}`}>
                      <div className="h-[90px] relative overflow-hidden">
                        <div className={`w-full h-full ${locked ? "blur-[4px] scale-105" : ""}`} style={{ background: projectColors[i % projectColors.length] }}></div>
                        {locked && (
                          <div className="absolute inset-0 bg-[rgba(7,21,61,.6)] flex items-center justify-center">
                            <svg width="28" height="28" fill="none" stroke="#fff" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="text-[13px] font-bold text-[#111827] dark:text-[#e8eaf0]">Project: {section.title}</div>
                        <div className="text-[12px] text-[#6B7280] dark:text-[#7a859a] leading-[1.5] mt-1">Build a real-world {section.title.toLowerCase()} implementation.</div>
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          <span className="text-[11px] px-2 py-[2px] rounded-[4px] bg-[#F3F4F6] dark:bg-[#0b0e14] text-[#4B5563] dark:text-[#7a859a] font-mono">{locked ? "🔒 Subscriber" : "Free"}</span>
                          <span className="text-[11px] px-2 py-[2px] rounded-[4px] bg-[#F3F4F6] dark:bg-[#0b0e14] text-[#4B5563] dark:text-[#7a859a] font-mono">{course.level}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* ══ REVIEWS ══ */}
          {activeTab === "reviews" && (
            <SectionCard>
              <SectionTitle>Student Reviews</SectionTitle>

              <div className="flex flex-col sm:flex-row gap-5 items-center mb-5 p-4 bg-[#F9FAFB] dark:bg-[#0b0e14] rounded-[10px] border border-[var(--border)] dark:border-[#1e2535]">
                <div className="text-center flex-shrink-0">
                  <div className="text-[42px] font-extrabold text-[#0D1F5C] dark:text-[#e8eaf0] leading-none font-['Instrument_Serif',serif] italic">{course.rating.toFixed(1)}</div>
                  <StarRating value={course.rating} size={12} />
                  <div className="text-[12px] text-[#6B7280] dark:text-[#7a859a] mt-1">{displayReviewCount} reviews</div>
                </div>
                <div className="flex-1 w-full max-w-[340px]">
                  {[5, 4, 3, 2, 1].map((star, idx) => (
                    <div key={star} className="flex items-center gap-2 mb-[5px]">
                      <span className="text-[12px] text-[#4B5563] dark:text-[#7a859a] w-[12px] text-right">{star}</span>
                      <div className="flex-1 h-[6px] bg-[#E5E7EB] dark:bg-[#1e2535] rounded-[3px] overflow-hidden">
                        <div className="h-full bg-[linear-gradient(90deg,#F59E0B,#FBBF24)] rounded-[3px]" style={{ width: `${bars[idx]}%` }}></div>
                      </div>
                      <span className="text-[11px] text-[#6B7280] dark:text-[#7a859a] w-[30px]">{bars[idx]}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {isAuthenticated && (
                <>
                  {myReview && !showReviewForm ? (
                    <div className="border border-[var(--border)] dark:border-[#1e2535] rounded-2xl p-4 mb-4 bg-[#F9FAFB] dark:bg-[#0b0e14]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <StarRating value={myReview.rating} size={14} />
                          <span className="text-[12px] font-bold text-[#111827] dark:text-[#e8eaf0]">Your Review</span>
                        </div>
                        <button onClick={() => setShowReviewForm(true)} className="text-[11px] font-bold text-white bg-[linear-gradient(135deg,#0D1F5C,#2952CC)] px-3 py-[3px] rounded-[6px] cursor-pointer transition-all hover:shadow-md hover:-translate-y-px shadow-sm">Edit</button>
                      </div>
                      {myReview.comment && <div className="text-[13px] text-[#4B5563] dark:text-[#b0bac9] leading-[1.6]">{myReview.comment}</div>}
                    </div>
                  ) : showReviewForm ? (
                    <ReviewForm
                      initialRating={myReview?.rating ?? 5}
                      initialComment={myReview?.comment ?? ''}
                      isEditing={!!myReview}
                      onSubmit={handleReviewFormSubmit}
                      onCancel={() => setShowReviewForm(false)}
                    />
                  ) : (
                    <button onClick={() => setShowReviewForm(true)} className="w-full mb-4 py-[10px] rounded-[10px] bg-[linear-gradient(135deg,#1A3BA0,#2952CC)] text-white text-[13px] font-bold cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 shadow-sm">
                      ✍ Write a Review
                    </button>
                  )}
                </>
              )}

              {reviewsLoading ? (
                <div className="text-center py-8 text-[#6B7280] dark:text-[#7a859a] text-[13px]">Loading reviews…</div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8 text-[#6B7280] dark:text-[#7a859a] text-[13px]">No reviews yet. Be the first!</div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {reviews.map((review) => (
                    <div key={review.id} className="border border-[var(--border)] dark:border-[#1e2535] rounded-[10px] p-4 bg-white dark:bg-[#111520] transition-colors hover:border-[#C7D8FF] dark:hover:border-[#2d3358]">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-full bg-[linear-gradient(135deg,#1A3BA0,#2952CC)] flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0">
                          {review.student.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-bold text-[#111827] dark:text-[#e8eaf0] truncate">{review.student.name}</div>
                          <div className="flex items-center gap-2">
                            <StarRating value={review.rating} size={11} />
                            <span className="text-[11px] text-[#9CA3AF] dark:text-[#7a859a]">{new Date(review.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                      {review.comment && <div className="text-[13px] text-[#4B5563] dark:text-[#b0bac9] leading-[1.65] ml-[45px]">{review.comment}</div>}
                    </div>
                  ))}
                </div>
              )}

              {reviewsTotal > 10 && (
                <div className="flex items-center justify-center gap-2 mt-5">
                  <button disabled={reviewPage <= 1} onClick={() => setReviewPage((p) => p - 1)} className="px-3 py-[6px] rounded-[8px] bg-[#F9FAFB] dark:bg-[#1e2535] border border-[var(--border)] dark:border-[#1e2535] text-[12px] font-semibold text-[#4B5563] dark:text-[#b0bac9] cursor-pointer disabled:opacity-40 transition-all hover:bg-[#EEF2FF] dark:hover:bg-[#1a1f3a]">Previous</button>
                  <span className="text-[12px] text-[#6B7280] dark:text-[#7a859a]">Page {reviewPage} of {Math.ceil(reviewsTotal / 10)}</span>
                  <button disabled={reviewPage >= Math.ceil(reviewsTotal / 10)} onClick={() => setReviewPage((p) => p + 1)} className="px-3 py-[6px] rounded-[8px] bg-[#F9FAFB] dark:bg-[#1e2535] border border-[var(--border)] dark:border-[#1e2535] text-[12px] font-semibold text-[#4B5563] dark:text-[#b0bac9] cursor-pointer disabled:opacity-40 transition-all hover:bg-[#EEF2FF] dark:hover:bg-[#1a1f3a]">Next</button>
                </div>
              )}
            </SectionCard>
          )}
        </main>

        {/* ══ RIGHT SIDEBAR ══ */}
        <aside className="lg:sticky lg:top-[76px] flex flex-col gap-4">
          {/* Pricing */}
          <div className="bg-white dark:bg-[#111520] border border-[var(--border)] dark:border-[#1e2535] rounded-2xl overflow-hidden shadow-[var(--shadow-lg)] dark:shadow-[var(--shadow-lg)]">
            <div className="p-5 pb-4 border-b border-[var(--border)] dark:border-[#1e2535]">
              <div className="text-[13px] text-[#9CA3AF] dark:text-[#7a859a] line-through mb-0.5">{fmtINR(regularPrice)} <span className="not-italic text-[#9CA3AF]">one-time</span></div>
              <div className="flex items-end gap-1.5 mb-1">
                <span className="text-[36px] font-extrabold text-[#0D1F5C] dark:text-[#e8eaf0] font-['Instrument_Serif',serif] leading-none">{fmtINR(course.price)}</span>
              </div>
              {saveAmount > 0 && <div className="text-[12px] font-bold text-[#16A34A] dark:text-[#22C55E]">✓ Save {fmtINR(saveAmount)} — limited-time price</div>}
            </div>

            <div className="p-4 border-b border-[var(--border)] dark:border-[#1e2535]">
              <div className="text-[11.5px] uppercase tracking-[.6px] text-[#6B7280] dark:text-[#7a859a] font-bold mb-3">Everything Included</div>
              {[
                { title: `Full course access — all ${course.totalLessons} lessons`, sub: "Instant unlock across all devices" },
                { title: `${projectCount} real-world enterprise projects`, sub: "Graded with mentor feedback" },
                { title: "Verified digital certificate", sub: "LinkedIn & resume ready" },
                { title: "Live mentor sessions — 2 per month", sub: `Direct Q&A with ${course.mentorName}` },
                { title: "Lifetime access", sub: "Pay once, no renewals, no auto-billing" },
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-[9px] mb-2.5">
                  <div className="w-[18px] h-[18px] rounded-full bg-[linear-gradient(135deg,#22C55E,#16A34A)] flex items-center justify-center flex-shrink-0 mt-[1px]">
                    <IcoTick w={10} h={10} />
                  </div>
                  <div className="text-[13px] text-[#374151] dark:text-[#b0bac9]">{f.title}<small className="block text-[11.5px] text-[#6B7280] dark:text-[#7a859a]">{f.sub}</small></div>
                </div>
              ))}
            </div>

            <div className="p-4">
              <button
                onClick={handleUnlock}
                disabled={addingToCart}
                className="w-full py-3.5 rounded-[10px] bg-[linear-gradient(135deg,#F04E00_0%,#FF6B2B_100%)] text-white text-[15px] font-extrabold shadow-[0_4px_20px_rgba(240,78,0,.35)] hover:shadow-[0_6px_28px_rgba(240,78,0,.45)] hover:-translate-y-0.5 transition-all mb-2.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                style={{ animation: 'glowPulse 3s ease-in-out infinite' }}
              >
                {addingToCart ? "Adding…" : inCart ? "✓ Added to Cart — View Cart" : "🔓 Unlock Full Course — Pay Once"}
              </button>
              <button onClick={scrollToPreview} className="w-full py-2.5 rounded-[10px] bg-[#EEF2FF] dark:bg-[#1a1f3a] border-[1.5px] border-[#C7D8FF] dark:border-[#2d3358] text-[#2952CC] dark:text-[#60a5fa] text-[13.5px] font-bold hover:bg-[#E0E9FF] dark:hover:bg-[#141a30] transition-all">▶ Start Free Preview</button>
              <div className="text-[11.5px] text-[#6B7280] dark:text-[#7a859a] text-center mt-2.5 leading-[1.5]">One-time payment. Lifetime access.<br />Prices in INR · GST applicable · Secure checkout</div>
            </div>
          </div>

          {/* Mentor */}
          <div className="bg-white dark:bg-[#111520] border border-[var(--border)] dark:border-[#1e2535] rounded-xl p-4 shadow-sm">
            <div className="text-[11px] uppercase tracking-[.6px] text-[#6B7280] dark:text-[#7a859a] font-bold mb-3">Your Instructor</div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[linear-gradient(135deg,#1A3BA0,#4A72E8)] flex items-center justify-center text-[14px] font-extrabold text-white flex-shrink-0">{course.mentorInitials}</div>
              <div>
                <div className="text-[14px] font-bold text-[#111827] dark:text-[#e8eaf0]">{course.mentorName}</div>
                <div className="text-[12px] text-[#6B7280] dark:text-[#7a859a]">{course.mentorBio ?? "Senior Instructor"}</div>
              </div>
            </div>
            <div className="flex gap-3 mt-3">
              <div className="flex-1 text-center p-2 bg-[#F9FAFB] dark:bg-[#0b0e14] rounded-[8px]">
                <div className="text-base font-extrabold text-[#0D1F5C] dark:text-[#e8eaf0]">{course.mentorYearsExp ?? "-"}+</div>
                <div className="text-[11px] text-[#6B7280] dark:text-[#7a859a]">Years Exp.</div>
              </div>
              <div className="flex-1 text-center p-2 bg-[#F9FAFB] dark:bg-[#0b0e14] rounded-[8px]">
                <div className="text-base font-extrabold text-[#0D1F5C] dark:text-[#e8eaf0]">{course.mentorCoursesTaught ?? "-"}</div>
                <div className="text-[11px] text-[#6B7280] dark:text-[#7a859a]">Courses</div>
              </div>
              <div className="flex-1 text-center p-2 bg-[#F9FAFB] dark:bg-[#0b0e14] rounded-[8px]">
                <div className="text-base font-extrabold text-[#0D1F5C] dark:text-[#e8eaf0]">{course.mentorRating ? course.mentorRating.toFixed(1) : "-"}★</div>
                <div className="text-[11px] text-[#6B7280] dark:text-[#7a859a]">Rating</div>
              </div>
            </div>
            {isAuthenticated && (
              <button onClick={() => { setActiveTab('reviews'); setShowReviewForm(true); }} className="mt-3 pt-3 border-t border-[var(--border)] dark:border-[#1e2535] w-full flex items-center justify-center gap-[5px] text-[10px] font-bold text-white bg-[linear-gradient(135deg,#1A3BA0,#2952CC)] cursor-pointer transition-all py-[6px] rounded-[6px] shadow-sm hover:shadow-md hover:-translate-y-px">
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                Write a Review
              </button>
            )}
          </div>

          {/* Progress */}
          <div className="bg-white dark:bg-[#111520] border border-[var(--border)] dark:border-[#1e2535] rounded-xl p-[14px_16px] shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[12px] font-bold uppercase tracking-[.5px] text-[#374151] dark:text-[#b0bac9]">Your Progress</div>
              <div className="text-[12px] font-bold text-[#F04E00] dark:text-[#FF6B2B]">0%</div>
            </div>
            <div className="h-[6px] bg-[#F3F4F6] dark:bg-[#0b0e14] rounded-[3px] overflow-hidden">
              <div className="h-full w-0 bg-[linear-gradient(90deg,#F04E00,#FF6B2B)] rounded-[3px]"></div>
            </div>
            <div className="text-[11.5px] text-[#6B7280] dark:text-[#7a859a] mt-2"><span className="text-[#F04E00] dark:text-[#FF6B2B] font-semibold">0 of {course.totalLessons} lessons</span> completed · Unlock to continue</div>
          </div>

          {/* Certificate */}
          <div className="bg-white dark:bg-[#111520] border-[1.5px] border-[#C7D8FF] dark:border-[#2d3358] rounded-xl p-4 shadow-sm relative overflow-hidden">
            <div className="absolute right-[-10px] bottom-[-14px] text-[60px] font-extrabold text-[#EEF2FF] dark:text-[#2d3358]/40 tracking-[-2px] leading-none pointer-events-none font-['Instrument_Serif',serif] select-none">CERTIFICATE</div>
            <div className="flex items-center gap-2.5 mb-3 relative z-[1]">
              <div className="w-9 h-9 rounded-[8px] bg-[linear-gradient(135deg,#c9a84c,#e8c96a)] flex items-center justify-center flex-shrink-0 shadow-[0_2px_8px_rgba(201,168,76,.35)]">
                <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
              </div>
              <div>
                <div className="text-[13px] font-bold text-[#0D1F5C] dark:text-[#e8eaf0]">Industry Certificate Included</div>
                <div className="text-[11.5px] text-[#6B7280] dark:text-[#7a859a]">Issued upon course completion</div>
              </div>
            </div>
            <div className="relative z-[1] bg-[#fdfbf6] rounded-[8px] overflow-hidden">
              <div className="m-[7px] border-[2px] border-[#c9a84c] rounded-[6px] px-4 py-3 text-center relative">
                <div className="absolute top-[-2px] left-[-2px] w-[14px] h-[14px] border-t-[2px] border-l-[2px] border-[#8b6914] rounded-tl-[6px]" />
                <div className="absolute top-[-2px] right-[-2px] w-[14px] h-[14px] border-t-[2px] border-r-[2px] border-[#8b6914] rounded-tr-[6px]" />
                <div className="absolute bottom-[-2px] left-[-2px] w-[14px] h-[14px] border-b-[2px] border-l-[2px] border-[#8b6914] rounded-bl-[6px]" />
                <div className="absolute bottom-[-2px] right-[-2px] w-[14px] h-[14px] border-b-[2px] border-r-[2px] border-[#8b6914] rounded-br-[6px]" />
                <div className="font-['Inter_Tight',sans-serif] text-[9px] font-[800] uppercase tracking-[.24em] text-[#8b6914] mb-[2px]">FutureStack Academy</div>
                <div className="font-['Instrument_Serif',Georgia,serif] text-[15px] italic text-[#5a4008] leading-[1.25]">Certificate of Completion</div>
                <div className="font-['Inter_Tight',sans-serif] text-[12px] font-[800] text-[#0d1f3c] mt-[4px] leading-[1.3]">{course.title}</div>
                <div className="text-[10px] text-[#8b7340] mt-[3px] tracking-[.02em]">Future Stack · Verified by {course.mentorName}</div>
              </div>
            </div>
          </div>

          {/* Guarantee */}
          <div className="flex items-center gap-2.5 mt-1 p-3 rounded-[10px] bg-[linear-gradient(120deg,#f0fdf4,#dcfce7)] dark:bg-[linear-gradient(120deg,#052e16,#0a3d1a)] border border-[#bbf7d0] dark:border-[#166534]">
            <svg width="22" height="22" fill="none" stroke="#166534" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <div className="text-[12px] font-semibold text-[#166534] dark:text-[#22C55E]">7-Day Money-Back Guarantee<small className="block font-normal opacity-80">Full refund if you&apos;re not satisfied — no questions asked</small></div>
          </div>
        </aside>
      </div>

      {/* ══ BOTTOM SECTIONS ══ */}
      <div className="max-w-[1700px] mx-auto px-3 md:px-6 pb-10 md:pb-[60px]">

        {/* Outcomes strip */}
        <div className="relative overflow-hidden bg-[linear-gradient(120deg,#07153D,#0D1F5C_60%,#1e45b8)] rounded-2xl p-6 md:p-8 mb-6 grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 80% 50%, rgba(240,78,0,.12) 0%, transparent 60%)' }} />
          {[
            { num: "92%", lbl: "Placement Rate" },
            { num: "₹22L+", lbl: "Avg. Starting Salary" },
            { num: course.students.toString(), lbl: "Students Enrolled" },
            { num: `${course.rating.toFixed(1)}★`, lbl: "Course Rating" },
          ].map((stat, i) => (
            <div key={i} className="text-center relative z-[1]">
              <div className="text-[28px] md:text-[32px] font-bold text-white font-['Instrument_Serif',serif] italic leading-none">
                <span className="text-[#FF6B2B]">{stat.num}</span>
              </div>
              <div className="text-[12.5px] text-[rgba(255,255,255,.65)] mt-1.5">{stat.lbl}</div>
            </div>
          ))}
        </div>

        {related && related.length > 0 && (
          <SectionCard>
            <SectionTitle>Related Courses</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {related.map((rc) => (
                <Link key={rc.id} href={`/courses/${rc.slug}`} className="border border-[var(--border)] dark:border-[#1e2535] rounded-xl overflow-hidden cursor-pointer transition-all hover:border-[#C7D8FF] dark:hover:border-[#2d3358] hover:shadow-md hover:-translate-y-[3px] bg-white dark:bg-[#111520] no-underline group">
                  <div className="relative aspect-[21/8] overflow-hidden bg-[#F3F4F6] dark:bg-[#0b0e14]">
                    {rc.img ? (
                      <Image src={rc.img} alt={rc.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[linear-gradient(135deg,#1A3BA0,#4A72E8)]"></div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-[11px] font-bold uppercase tracking-[.5px] text-[#F04E00]">{rc.category}</div>
                    <div className="text-[13px] font-bold text-[#111827] dark:text-[#e8eaf0] leading-[1.35] mt-1">{rc.title}</div>
                    <div className="flex items-center gap-2 text-[12px] text-[#6B7280] dark:text-[#7a859a] mt-1.5"><IcoStar w={12} h={12} /> {rc.rating.toFixed(1)} · {rc.hours}h · {rc.level}</div>
                  </div>
                </Link>
              ))}
            </div>
          </SectionCard>
        )}

        {/* FAQ */}
        <SectionCard>
          <SectionTitle>Frequently Asked Questions</SectionTitle>
          {faqs.map((faq, i) => {
            const open = openFaq === i;
            return (
              <div key={i} className={`border border-[var(--border)] dark:border-[#1e2535] rounded-[10px] mb-2 overflow-hidden transition-all ${open ? "border-[#C7D8FF] dark:border-[#2d3358]" : ""}`}>
                <div className="flex items-center justify-between p-[14px_18px] text-[13.5px] font-semibold text-[#111827] dark:text-[#e8eaf0] cursor-pointer select-none hover:bg-[#F9FAFB] dark:hover:bg-[#0b0e14] transition-all"
                  onClick={() => setOpenFaq(open ? null : i)}>
                  {faq.q}
                  <span className={`text-base text-[#9CA3AF] dark:text-[#7a859a] flex-shrink-0 transition-transform ${open ? "rotate-45 text-[#2952CC]" : ""}`}>+</span>
                </div>
                <div className={`overflow-hidden transition-all ${open ? "max-h-[200px] px-[18px] pb-4" : "max-h-0 px-[18px]"}`}>
                  <div className="text-[13.5px] text-[#4B5563] dark:text-[#b0bac9] leading-[1.7]">{faq.a}</div>
                </div>
              </div>
            );
          })}
        </SectionCard>
      </div>
    </div>
  );
}
