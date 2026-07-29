"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import { useAuth } from "@/app/auth/hooks/use-auth";
import { loadToken } from "@/app/auth/lib/token-store";
import { StarRating } from "@/components/StarRating";
import { ReviewForm } from "@/components/ReviewForm";

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
    videos: { id: string; title: string; vdoCipherId: string; durationSeconds: number; order: number }[];
    quizzes: { id: string; title: string; totalQuestions: number | null; order: number }[];
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

/** Public preview player — same UI as VdoCipherVideoPlayer but without auth/watermark */
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
        <div className="text-center text-[#64748b] dark:text-[#7a859a] p-4">
          <div className="text-lg mb-1">⚠️</div>
          <div className="text-xs font-bold text-[#0f172a] dark:text-[#e8eaf0] mb-0.5">Preview Unavailable</div>
          <div className="text-[10px]">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[16/9] bg-black overflow-hidden min-h-[202px]">
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
            <div className="w-6 h-6 border-2 border-[#ea580c] dark:border-[#f97316] border-t-transparent rounded-full animate-spin" />
            <span className="text-[#64748b] dark:text-[#7a859a] text-[10px]">Loading preview...</span>
          </div>
        </div>
      ) : null}

      {!started && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <button
            onClick={handlePlay}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-[#ea580c] to-[#f97316] flex items-center justify-center transition-all hover:scale-110 cursor-pointer border-none shadow-[0_6px_28px_rgba(240,90,26,.55)]"
          >
            <div className="w-0 h-0 border-solid border-t-[14px] border-b-[14px] border-l-[24px] border-transparent border-l-white ml-[5px]" />
          </button>
          <div className="absolute top-3 left-3 bg-[#16a34a] text-white px-3 py-[3px] rounded-[4px] text-[10px] font-bold uppercase tracking-[.4px]">
            Free Preview
          </div>
          <div className="absolute bottom-[12px] right-[12px] bg-black/65 text-white text-[11px] px-[9px] py-[3px] rounded-[4px]">
            {Math.floor(durationSeconds / 60)}:{(durationSeconds % 60).toString().padStart(2, "0")}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CourseDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [activeTab, setActiveTab] = useState("overview");
  const [plan, setPlan] = useState("annual");
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [reviewPage, setReviewPage] = useState(1);
  const [myReview, setMyReview] = useState<MyReview | null>(null);
  const [myReviewLoading, setMyReviewLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [leftReviewForm, setLeftReviewForm] = useState(false);
  const [leftReviewRating, setLeftReviewRating] = useState(5);
  const [leftReviewComment, setLeftReviewComment] = useState('');
  const [leftReviewSubmitting, setLeftReviewSubmitting] = useState(false);
  const [leftReviewError, setLeftReviewError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  const scrollToPreview = () => {
    previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const scrollToPricing = () => {
    pricingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setLeftReviewError(null);
  };

  const { data: course, isLoading: isLoadingCourse } = useSWR<CourseDetail>(
    slug ? `${API}/courses/public/slug/${slug}` : null,
    fetcher,
  );
  const { data: allCards } = useSWR<{ data: CourseCard[] }>(`${API}/courses/public/cards`, fetcher);
  const related = (allCards?.data ?? []).filter((c) => c.id !== course?.id).slice(0, 3);
  const isLoading = isLoadingCourse;

  const { user, isAuthenticated } = useAuth();

  // Fetch reviews
  const courseId = course?.id;
  const { data: reviewsData, isLoading: reviewsLoading, mutate: mutateReviews } = useSWR<ReviewsResponse>(
    courseId ? `${API}/courses/${courseId}/reviews?page=${reviewPage}&limit=10` : null,
    fetcher,
  );

  // Fetch my review if authenticated
  useEffect(() => {
    if (!courseId || !isAuthenticated) return;
    let cancelled = false;
    setMyReviewLoading(true);
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
      setMyReviewLoading(false);
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

  const handleLeftBarSubmit = async () => {
    setLeftReviewSubmitting(true);
    try {
      await handleSubmitReview(leftReviewRating, leftReviewComment);
      setLeftReviewForm(false);
      setLeftReviewError(null);
    } catch (e: any) {
      setLeftReviewError(e.message || 'Failed to submit review');
    } finally {
      setLeftReviewSubmitting(false);
    }
  };

  const handleReviewFormSubmit = async (rating: number, comment: string) => {
    try {
      await handleSubmitReview(rating, comment);
    } catch (e: any) {
      setLeftReviewError(e.message || 'Failed to submit review');
    }
  };

  const reviews = reviewsData?.data ?? [];
  const reviewsTotal = reviewsData?.total ?? 0;
  const reviewCount = (course as any)?.reviewCount ?? reviewsTotal;
  const displayReviewCount = reviewCount || course?.students || 0;

  // First video of first section = free preview (backend always exposes its id)
  const freePreviewVideo = course?.sections?.[0]?.videos?.[0] ?? null;

  const totalDuration = course?.sections?.reduce(
    (sum, s) => sum + s.videos.reduce((vSum, v) => vSum + v.durationSeconds, 0), 0
  ) ?? 0;

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
        <Link href="/courses" className="text-[#ea580c] dark:text-[#f97316] font-semibold underline">Browse all courses</Link>
      </div>
    );
  }

  const sectionModules = course.sections.map((s, si) => {
    const items = [...s.videos, ...s.quizzes].sort((a, b) => a.order - b.order);
    return { section: s, items, index: si };
  });

  const faqs = [
    { q: "What does the subscription include?", a: `Your subscription unlocks all ${course.totalLessons} lessons, graded enterprise projects, verified certificate, 2 live mentor sessions per month, and access to the full Future Stack catalog of 150+ courses across all technology tracks.` },
    { q: "How long do I have access to the course?", a: "For as long as your subscription is active. If you choose annual billing, you have 12 months of access to all content. You can also download resources and project templates for offline use." },
    { q: "Do I need prior experience?", a: `This course is rated ${course.level} which means you should be comfortable with basic concepts. No prior ${course.category} experience is required — the course builds it from the ground up.` },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0e14]">


      {/* Breadcrumb */}
      <div className="max-w-[1700px] mx-auto px-3 md:px-6">
        <div className="flex items-center gap-[6px] py-2 text-[12.5px] text-[#64748b] dark:text-[#7a859a]">
          <Link href="/" className="hover:text-[#2563eb] dark:hover:text-[#60a5fa] transition-colors">Home</Link>
          <span className="text-gray-300 dark:text-[#2a3347]">/</span>
          <Link href="/courses" className="hover:text-[#2563eb] dark:hover:text-[#60a5fa] transition-colors">Courses</Link>
          <span className="text-gray-300 dark:text-[#2a3347]">/</span>
          <span className="font-medium text-[#475569] dark:text-[#b0bac9]">{course.title}</span>
        </div>
      </div>

      {/* Hero */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(18px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes glowPulse {
           0%, 100% { box-shadow: 0 4px 14px rgba(10,10,20,.4); }
          50% { box-shadow: 0 4px 28px rgba(10,10,20,.6); }
        }
        @keyframes lineGrow {
          0% { width: 0%; opacity: 0; }
          100% { width: 40%; opacity: 1; }
        }
        @keyframes statIn {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .hero-shimmer::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,.04) 50%, transparent 100%);
          animation: shimmer 4s ease-in-out infinite;
          pointer-events: none;
        }
      `}</style>
      <div className="bg-gradient-to-br from-[#050a16] via-[#080d1a] to-[#0a1120] py-4 md:py-6 relative overflow-hidden hero-shimmer">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23fff\' fill-opacity=\'1\'%3E%3Cpath d=\'M0 0h2v2H0z\'/%3E%3C/g%3E%3C/svg%3E")' }} />
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 25% 40%, #2563eb 0%, transparent 55%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(37,99,235,.02) 50%, transparent 100%)' }} />
        <div className="max-w-[1700px] mx-auto px-3 md:px-6 flex flex-col md:flex-row items-center gap-4 md:gap-5 relative z-[1]">
          <div className="flex-1 w-full md:w-auto flex flex-col gap-0">
            <div className="flex items-center gap-2 bg-[rgba(37,99,235,.12)] border border-[rgba(37,99,235,.2)] px-3 py-1.5 rounded-[6px] text-[11px] font-semibold text-[#93c5fd] uppercase tracking-[.6px] mb-4 w-fit transition-all duration-300 hover:scale-105 hover:bg-[rgba(37,99,235,.18)]" style={{ animation: 'fadeUp .5s ease both' }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
              {course.category}
            </div>
            <div className="relative inline-block" style={{ animation: 'fadeUp .5s .1s ease both' }}>
              <h1 className="text-[22px] md:text-[32px] font-bold font-['Syne',sans-serif] text-white leading-[1.2] md:leading-[1.15] mb-2 max-w-[650px]">{course.title}</h1>
              <div className="absolute -bottom-1 left-0 h-[3px] bg-gradient-to-r from-[#2563eb] to-transparent rounded-full" style={{ animation: 'lineGrow .8s .4s ease both' }}></div>
            </div>
            <div className="flex items-center gap-0 flex-wrap mt-4 text-[12.5px] text-[rgba(255,255,255,.65)]">
              <span className="flex items-center gap-1.5 mr-3.5" style={{ animation: 'statIn .4s .2s ease both' }}>
                <svg width="13" height="13" fill="#F59E0B" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                <span className="font-bold text-[#F59E0B]">{Math.floor(course.rating)}</span>
                <span className="text-[rgba(255,255,255,.5)]">({displayReviewCount})</span>
              </span>
              <span className="flex items-center gap-1.5 mr-3.5" style={{ animation: 'statIn .4s .3s ease both' }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
                {course.students} enrolled
              </span>
              <span className="flex items-center gap-1.5 mr-3.5" style={{ animation: 'statIn .4s .4s ease both' }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                {course.hours}h · {course.totalLessons} lessons
              </span>
              <span className="flex items-center gap-1.5" style={{ animation: 'statIn .4s .5s ease both' }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                <span className="text-[rgba(255,255,255,.5)] font-normal">by</span>
                <span className="text-white font-semibold">{course.mentorName}</span>
              </span>
            </div>
          </div>
          <div className="flex-shrink-0 flex flex-row md:flex-col gap-2 md:gap-2 items-center md:items-end w-full md:w-auto justify-center md:justify-end pt-0 md:pt-0" style={{ animation: 'fadeUp .5s .15s ease both' }}>
            <span className="bg-gradient-to-r from-[#0f1f3d] to-[#03050a] text-white px-3.5 py-[7px] rounded-[6px] text-[10.5px] font-extrabold uppercase tracking-[.6px]" style={{ animation: 'glowPulse 2.5s ease-in-out infinite' }}>🔥 HOT COURSE</span>
            <span className="bg-[rgba(255,255,255,.06)] border border-[rgba(255,255,255,.1)] px-3 py-[5px] rounded-[6px] text-[11px] text-[rgba(255,255,255,.75)] font-medium transition-all duration-200 hover:bg-[rgba(255,255,255,.12)]">{course.level}</span>
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="max-w-[1700px] mx-auto px-3 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr_308px] gap-5 py-4 md:py-6 items-start" style={{ alignItems: "start" }}>
          {/* LEFT */}
          <aside className="flex flex-col gap-4 lg:sticky top-[72px]">
            <div ref={previewRef} className="bg-white dark:bg-[#111520] border border-gray-200 dark:border-[#1e2535] rounded-2xl overflow-hidden shadow-sm">
              {freePreviewVideo ? (
                <>
                  <PreviewPlayer
                    videoId={freePreviewVideo.id}
                    title={freePreviewVideo.title}
                    durationSeconds={freePreviewVideo.durationSeconds}
                  />
                  <div className="p-3.5 border-t border-gray-200 dark:border-[#1e2535]">
                    <div className="text-[13px] font-bold text-[#0f172a] dark:text-[#e8eaf0]">{freePreviewVideo.title}</div>
                    <div className="text-[12px] text-[#64748b] dark:text-[#7a859a] flex items-center gap-1 mt-1">
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                      Watch free · No login required
                    </div>
                  </div>
                </>
              ) : (
                <div className="aspect-video bg-black flex items-center justify-center">
                  <span className="text-[#64748b] dark:text-[#7a859a] text-[10px]">No preview available</span>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-[#111520] border border-gray-200 dark:border-[#1e2535] rounded-2xl p-4 shadow-sm">
              <div className="text-[11px] uppercase tracking-[.6px] text-[#64748b] dark:text-[#7a859a] font-bold mb-3">Your Instructor</div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#0f1f3d] to-[#03050a] flex items-center justify-center text-[14px] font-bold text-white flex-shrink-0">{course.mentorInitials}</div>
                <div>
                  <div className="text-[14px] font-bold text-[#0f172a] dark:text-[#e8eaf0]">{course.mentorName}</div>
                  <div className="text-[12px] text-[#64748b] dark:text-[#7a859a]">{course.mentorBio ?? "Senior Instructor"}</div>
                </div>
              </div>
              <div className="flex gap-3 mt-3">
                <div className="flex-1 text-center p-2 bg-[#f8fafc] dark:bg-[#0b0e14] rounded-[10px]">
                  <div className="text-base font-extrabold text-[#0f172a] dark:text-[#e8eaf0]">{course.mentorYearsExp ?? "-"}+</div>
                  <div className="text-[11px] text-[#64748b] dark:text-[#7a859a]">Years Exp.</div>
                </div>
                <div className="flex-1 text-center p-2 bg-[#f8fafc] dark:bg-[#0b0e14] rounded-[10px]">
                  <div className="text-base font-extrabold text-[#0f172a] dark:text-[#e8eaf0]">{course.mentorCoursesTaught ?? "-"}</div>
                  <div className="text-[11px] text-[#64748b] dark:text-[#7a859a]">Courses</div>
                </div>
                <div className="flex-1 text-center p-2 bg-[#f8fafc] dark:bg-[#0b0e14] rounded-[10px]">
                  <div className="text-base font-extrabold text-[#0f172a] dark:text-[#e8eaf0]">{course.mentorRating ? Math.floor(course.mentorRating) : "-"}★</div>
                  <div className="text-[11px] text-[#64748b] dark:text-[#7a859a]">Rating</div>
                </div>
              </div>

              {myReview && !leftReviewForm ? (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-[#1e2535]">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-[6px]">
                      <span className="inline-flex items-center gap-[3px] text-[9px] font-bold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40 px-[7px] py-[2px] rounded-[4px] border border-green-300 dark:border-green-700">✓ Reviewed</span>
                      <StarRating value={myReview.rating} size={11} />
                    </div>
                    <button onClick={() => { setLeftReviewRating(myReview.rating); setLeftReviewComment(myReview.comment ?? ''); setLeftReviewForm(true); }}
                      className="text-[9px] font-bold text-white bg-gradient-to-r from-[#0f1f3d] to-[#03050a] rounded-[4px] px-[7px] py-[2px] cursor-pointer transition-all hover:shadow-[0_2px_6px_rgba(10,10,20,.45)] hover:-translate-y-px">Edit</button>
                  </div>
                  {myReview.comment && (
                    <div className="text-[11px] text-[#475569] dark:text-[#b0bac9] leading-[1.6] mt-[2px]">{myReview.comment}</div>
                  )}
                </div>
              ) : leftReviewForm ? (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-[#1e2535]">
                  <div className="flex items-center gap-[5px] mb-2">
                    <span className="text-[9px] font-bold text-[#64748b] dark:text-[#7a859a] uppercase tracking-[.04em]">Rate</span>
                    <div className="flex items-center gap-[2px] ml-1">
                      {[1,2,3,4,5].map(s => (
                        <button key={s} type="button" onClick={() => setLeftReviewRating(s)}
                          className="w-[18px] h-[18px] border-none bg-transparent cursor-pointer p-0 transition-transform hover:scale-110">
                          <svg viewBox="0 0 20 20" width="18" height="18">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" fill={s <= leftReviewRating ? "#F59E0B" : "#D1D5DB"}/>
                          </svg>
                        </button>
                      ))}
                    </div>
                    <span className="text-[9px] font-bold text-[#0f172a] dark:text-[#e8eaf0] ml-[2px]">{leftReviewRating}/5</span>
                  </div>
                  <textarea
                    value={leftReviewComment}
                    onChange={e => setLeftReviewComment(e.target.value)}
                    placeholder="How was this course?"
                    rows={2}
                    maxLength={1000}
                    className="w-full border border-gray-200 dark:border-[#1e2535] rounded-[10px] bg-white dark:bg-[#111520] text-[11px] text-[#0f172a] dark:text-[#e8eaf0] p-[10px] outline-none resize-none focus:border-[#ea580c]/50 dark:focus:border-[#f97316]/50 focus:ring-1 focus:ring-[#ea580c]/20 dark:focus:ring-[#f97316]/20 transition-all placeholder:text-[#64748b] dark:placeholder:text-[#7a859a]"
                  />
                  <div className="flex items-center justify-between mt-[10px]">
                    <span className="text-[8px] text-[#64748b] dark:text-[#7a859a]">{leftReviewComment.length}/1000</span>
                    <div className="flex items-center gap-[6px]">
                      <button onClick={() => setLeftReviewForm(false)}
                        className="px-[10px] py-[5px] rounded-[6px] bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9] dark:from-[#1e2535] dark:to-[#0b0e14] border border-gray-200 dark:border-[#1e2535] text-[9px] font-semibold text-[#475569] dark:text-[#b0bac9] cursor-pointer hover:from-[#f1f5f9] hover:to-[#e2e8f0] dark:hover:from-[#2a3347] dark:hover:to-[#1e2535] transition-all shadow-sm">Cancel</button>
                      <button onClick={handleLeftBarSubmit} disabled={leftReviewSubmitting}
                        className="px-[14px] py-[5px] rounded-[6px] border-none bg-gradient-to-r from-[#0f1f3d] to-[#03050a] text-white text-[9px] font-bold cursor-pointer transition-all hover:shadow-[0_3px_10px_rgba(10,10,20,.45)] hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">{leftReviewSubmitting ? '…' : myReview ? 'Update' : 'Submit'}</button>
                    </div>
                  </div>
                </div>
              ) : isAuthenticated ? (
                <button onClick={() => { setLeftReviewRating(5); setLeftReviewComment(''); setLeftReviewForm(true); }}
                  className="mt-3 pt-3 border-t border-gray-200 dark:border-[#1e2535] w-full flex items-center justify-center gap-[5px] text-[10px] font-bold text-white bg-gradient-to-r from-[#0f1f3d] to-[#03050a] border-x-0 border-b-0 cursor-pointer transition-all py-[6px] rounded-[6px] shadow-sm hover:shadow-[0_2px_8px_rgba(10,10,20,.45)] hover:-translate-y-px">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                  Write a Review
                </button>
              ) : null}
            </div>

            <div className="bg-white dark:bg-[#111520] border border-gray-200 dark:border-[#1e2535] rounded-2xl p-[14px_16px] shadow-sm">
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-[12px] font-bold uppercase tracking-[.5px] text-[#475569] dark:text-[#b0bac9]">Your Progress</div>
                <div className="text-[12px] font-bold text-[#ea580c] dark:text-[#f97316]">0%</div>
              </div>
              <div className="h-[6px] bg-gray-100 dark:bg-[#0b0e14] rounded-[3px] overflow-hidden">
                <div className="h-full w-0 bg-gradient-to-r from-[#ea580c] to-[#f97316] rounded-[3px] transition-[width_.6s_ease]"></div>
              </div>
              <div className="text-[11.5px] text-[#64748b] dark:text-[#7a859a] mt-2"><span className="text-[#ea580c] dark:text-[#f97316] font-semibold">0 of {course.totalLessons} lessons</span> completed · Subscribe to continue</div>
            </div>
          </aside>

          {/* CENTER */}
          <main className="min-w-0">
            <div className="flex gap-0 bg-white dark:bg-[#111520] border border-gray-200 dark:border-[#1e2535] rounded-2xl p-1 mb-4 shadow-sm">
              {["overview", "curriculum", "projects", "reviews"].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-[9px] px-3 rounded-[10px] text-[13px] font-semibold text-center transition-all ${activeTab === tab
                       ? "bg-gradient-to-r from-[#0f1f3d] to-[#03050a] text-white shadow-[0_2px_8px_rgba(10,10,20,.45)]"
                      : "text-[#64748b] dark:text-[#7a859a] hover:bg-[#f8fafc] dark:hover:bg-[#0b0e14] hover:text-[#0f172a] dark:hover:text-[#e8eaf0]"
                    }`}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Overview */}
            {activeTab === "overview" && (
              <div className="bg-white dark:bg-[#111520] border border-gray-200 dark:border-[#1e2535] rounded-2xl p-4 md:p-[22px_24px] shadow-sm mb-4">
                <div className="font-['Syne',sans-serif] text-[18px] md:text-[20px] font-bold text-[#0f172a] dark:text-[#e8eaf0] pb-3 border-b border-gray-200 dark:border-[#1e2535] mb-3.5">About This Course</div>
                <div className="text-[14px] text-[#475569] dark:text-[#b0bac9] leading-[1.75] mb-4">{course.description}</div>

                {course.whatYoullLearn.length > 0 && (
                  <>
                    <div className="text-[13px] font-bold uppercase tracking-[.6px] text-[#64748b] dark:text-[#7a859a] mb-2.5 mt-4">What You'll Learn</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                      {course.whatYoullLearn.map((item, i) => (
                        <div key={i} className="flex items-start gap-[9px] p-[10px_12px] bg-gradient-to-br from-[#eef2ff] to-[#e0e7ff] dark:from-[#1a1f3a] dark:to-[#141a30] border border-[#c7d2fe]/50 dark:border-[#2d3358]/50 rounded-[10px]">
                          <div className="w-[18px] h-[18px] rounded-full bg-gradient-to-br from-[#0f1f3d] to-[#03050a] flex items-center justify-center flex-shrink-0 mt-[1px]">
                            <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                          </div>
                          <span className="text-[12.5px] text-[#475569] dark:text-[#b0bac9] leading-[1.4]">{item}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {course.careerTitle && (
                  <>
                    <div className="text-[13px] font-bold uppercase tracking-[.6px] text-[#64748b] dark:text-[#7a859a] mb-2.5 mt-4">Career Relevance</div>
                    <div className="bg-gradient-to-r from-[#ea580c]/5 to-[#2563eb]/5 border border-gray-200 dark:border-[#1e2535] rounded-[10px] p-[14px_16px] flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-[8px] bg-gradient-to-br from-[#ea580c] to-[#f97316] flex items-center justify-center flex-shrink-0">
                        <svg width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                      </div>
                      <div>
                        <strong className="text-[13px] text-[#0f172a] dark:text-[#e8eaf0] block mb-0.5">{course.careerTitle}</strong>
                        <span className="text-[12.5px] text-[#475569] dark:text-[#b0bac9]">{course.careerBody}</span>
                      </div>
                    </div>
                  </>
                )}

                {course.techStack.length > 0 && (
                  <>
                    <div className="text-[13px] font-bold uppercase tracking-[.6px] text-[#64748b] dark:text-[#7a859a] mb-2.5 mt-4">Technologies Covered</div>
                    <div className="flex flex-wrap gap-2">
                      {course.techStack.map((tech, i) => (
                        <span key={i} className="px-3 py-[5px] rounded-[8px] bg-[#f8fafc] dark:bg-[#0b0e14] border border-gray-200 dark:border-[#1e2535] text-[12px] font-semibold text-[#475569] dark:text-[#b0bac9] font-mono hover:bg-[#eef2ff] dark:hover:bg-[#1a1f3a] hover:border-[#c7d2fe] dark:hover:border-[#2d3358] hover:text-[#2563eb] dark:hover:text-[#60a5fa] transition-all cursor-default">{tech}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Curriculum */}
            {activeTab === "curriculum" && (
              <div className="bg-white dark:bg-[#111520] border border-gray-200 dark:border-[#1e2535] rounded-2xl p-4 md:p-[22px_24px] shadow-sm mb-4">
                <div className="font-['Syne',sans-serif] text-[18px] md:text-[20px] font-bold text-[#0f172a] dark:text-[#e8eaf0] pb-3 border-b border-gray-200 dark:border-[#1e2535] mb-3.5">Course Curriculum</div>
                <div className="text-[12px] text-[#64748b] dark:text-[#7a859a] mb-4 p-[10px_14px] bg-[#f8fafc] dark:bg-[#0b0e14] rounded-[10px] border border-gray-200 dark:border-[#1e2535]">
                  <strong className="text-[#0f172a] dark:text-[#e8eaf0]">{course.sections.length} modules</strong> · {course.totalLessons} lessons · {course.hours}h total
                  {freePreviewVideo && <span className="ml-2 text-[#16a34a] dark:text-[#22c55e] font-semibold">· 1 free preview</span>}
                </div>

                <div className="flex flex-col gap-3">
                  {sectionModules.map(({ section, items, index }) => {
                    const isFirstModule = index === 0;
                    return (
                      <div key={section.id}>
                        <div className="flex items-center justify-between p-3 rounded-[10px] bg-gradient-to-r from-[#0a1628] via-[#0f1f3d] to-[#1a2d5a] text-white mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-[26px] h-[26px] rounded-[6px] bg-[rgba(255,255,255,.15)] flex items-center justify-center text-[11px] font-extrabold">{index + 1}</div>
                            <span className="text-[13px] font-bold">{section.title}</span>
                          </div>
                          <span className="text-[12px] text-[rgba(255,255,255,.55)] flex items-center gap-[5px]">
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                            {items.length} items
                          </span>
                        </div>

                        {items.map((item, vi) => {
                          const isVideo = "vdoCipherId" in item;
                          const isFree = isFirstModule && vi === 0 && !!freePreviewVideo;
                          return (
                            <div key={item.id ?? `s${section.id}-${item.order}`} className={`flex items-center gap-3 p-3 rounded-[10px] border border-gray-200 dark:border-[#1e2535] bg-white dark:bg-[#111520] transition-all ${isFree ? "hover:border-[#16a34a]/50 dark:hover:border-[#22c55e]/50 hover:shadow-sm hover:translate-x-[2px]" : "opacity-65 bg-[#f8fafc] dark:bg-[#0b0e14]"}`}>
                              <div className={`w-7 h-7 rounded-[8px] flex items-center justify-center text-[11px] font-extrabold flex-shrink-0 ${isFree ? "bg-[#16a34a] text-white" : "bg-gray-200 dark:bg-[#1e2535] text-[#64748b] dark:text-[#7a859a]"}`}>
                                {isFree ? "✔" : <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[13.5px] font-semibold text-[#0f172a] dark:text-[#e8eaf0] flex items-center gap-[7px]">
                                  {item.title}
                                  {isFree && <span className="text-[10px] font-extrabold uppercase text-[#16a34a] dark:text-[#22c55e] bg-[#16a34a]/10 dark:bg-[#22c55e]/10 px-[7px] py-[1px] rounded-[4px]">Free</span>}
                                </div>
                                {isVideo && (
                                  <div className="text-[12px] text-[#64748b] dark:text-[#7a859a] mt-[2px] flex items-center gap-2">
                                    <span className="flex items-center gap-[3px] font-mono text-[11px]">
                                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                                      {Math.floor((item as any).durationSeconds / 60)}:{(item as any).durationSeconds % 60}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-shrink-0">
                                {isFree ? (
                                  <button
                                    onClick={scrollToPreview}
                                    className="px-4 py-[6px] rounded-[8px] bg-gradient-to-r from-[#0f1f3d] to-[#03050a] text-white text-[12px] font-bold flex items-center gap-[5px] transition-all hover:shadow-[0_4px_12px_rgba(10,10,20,.45)] hover:-translate-y-px shadow-sm"
                                  >
                                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                    Watch
                                  </button>
                                ) : (
                                  <button className="px-4 py-[6px] rounded-[8px] bg-gradient-to-b from-gray-100 to-gray-50 dark:from-[#1e2535] dark:to-[#0b0e14] text-[#64748b] dark:text-[#7a859a] text-[12px] font-semibold cursor-not-allowed flex items-center gap-[5px] border border-gray-200 dark:border-[#1e2535] shadow-sm">
                                    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                                    Locked
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
              </div>
            )}

            {/* Projects */}
            {activeTab === "projects" && (
              <div className="bg-white dark:bg-[#111520] border border-gray-200 dark:border-[#1e2535] rounded-2xl p-4 md:p-[22px_24px] shadow-sm mb-4">
                <div className="font-['Syne',sans-serif] text-[18px] md:text-[20px] font-bold text-[#0f172a] dark:text-[#e8eaf0] pb-3 border-b border-gray-200 dark:border-[#1e2535] mb-3.5">Hands-On Projects</div>
                <p className="text-[13.5px] text-[#475569] dark:text-[#b0bac9] mb-[18px]">Apply your skills with real-world projects. Included with subscription.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {course.sections.slice(0, 4).map((section, i) => (
                    <div key={section.id} className={`border border-gray-200 dark:border-[#1e2535] rounded-[10px] overflow-hidden ${i > 0 ? "opacity-60" : ""}`}>
                      <div className="h-[90px] relative overflow-hidden">
                        <div className={`w-full h-full ${i > 0 ? "blur-[4px] scale-105" : ""}`} style={{ background: `hsl(${i * 60 + 200}, 50%, ${i === 0 ? "70%" : "85%"})` }}></div>
                        {i > 0 && (
                          <div className="absolute inset-0 bg-[rgba(11,14,20,.6)] flex items-center justify-center">
                            <svg width="28" height="28" fill="none" stroke="#fff" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="text-[13px] font-bold text-[#0f172a] dark:text-[#e8eaf0]">Project: {section.title}</div>
                        <div className="text-[12px] text-[#64748b] dark:text-[#7a859a] leading-[1.5] mt-1">Build a real-world {section.title.toLowerCase()} implementation.</div>
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          <span className="text-[11px] px-2 py-[2px] rounded-[4px] bg-[#f8fafc] dark:bg-[#0b0e14] text-[#64748b] dark:text-[#7a859a] font-mono">{i === 0 ? "Free" : "🔒 Subscriber"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {activeTab === "reviews" && (
              <div className="bg-white dark:bg-[#111520] border border-gray-200 dark:border-[#1e2535] rounded-2xl p-4 md:p-[22px_24px] shadow-sm mb-4">
                <div className="font-['Syne',sans-serif] text-[18px] md:text-[20px] font-bold text-[#0f172a] dark:text-[#e8eaf0] pb-3 border-b border-gray-200 dark:border-[#1e2535] mb-3.5">Student Reviews</div>

                {/* Aggregate Rating */}
                <div className="flex gap-5 items-center mb-5 p-4 bg-[#f8fafc] dark:bg-[#0b0e14] rounded-[10px] border border-gray-200 dark:border-[#1e2535]">
                  <div className="text-center flex-shrink-0">
                    <div className="text-[42px] font-extrabold text-[#0f172a] dark:text-[#e8eaf0] leading-none font-['Syne',sans-serif]">{Math.floor(course.rating)}</div>
                    <StarRating value={course.rating} size={12} />
                    <div className="text-[12px] text-[#64748b] dark:text-[#7a859a] mt-1">{displayReviewCount} reviews</div>
                  </div>
                </div>

                {/* My Review or Write Review Button */}
                {isAuthenticated && (
                  <>
                    {myReview && !showReviewForm ? (
                      <div className="border border-gray-200 dark:border-[#1e2535] rounded-2xl p-4 mb-4 bg-[#f8fafc] dark:bg-[#0b0e14]">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <StarRating value={myReview.rating} size={14} />
                            <span className="text-[12px] font-bold text-[#0f172a] dark:text-[#e8eaf0]">Your Review</span>
                          </div>
                          <button
                            onClick={() => setShowReviewForm(true)}
                            className="text-[11px] font-bold text-white bg-gradient-to-r from-[#0f1f3d] to-[#03050a] px-3 py-[3px] rounded-[6px] cursor-pointer transition-all hover:shadow-[0_2px_6px_rgba(10,10,20,.45)] hover:-translate-y-px shadow-sm"
                          >
                            Edit
                          </button>
                        </div>
                        {myReview.comment && (
                          <div className="text-[13px] text-[#475569] dark:text-[#b0bac9] leading-[1.6]">{myReview.comment}</div>
                        )}
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
                      <button
                        onClick={() => setShowReviewForm(true)}
                        className="w-full mb-4 py-[10px] rounded-[12px] bg-gradient-to-r from-[#0f1f3d] to-[#03050a] text-white text-[13px] font-bold cursor-pointer transition-all hover:shadow-[0_4px_14px_rgba(10,10,20,.45)] hover:-translate-y-0.5 shadow-sm"
                      >
                        ✍ Write a Review
                      </button>
                    )}
                  </>
                )}

                {/* Reviews List */}
                {reviewsLoading ? (
                  <div className="text-center py-8 text-[#64748b] dark:text-[#7a859a] text-[13px]">Loading reviews…</div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-8 text-[#64748b] dark:text-[#7a859a] text-[13px]">No reviews yet. Be the first!</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {reviews.map((review) => (
                      <div key={review.id} className="border border-gray-200 dark:border-[#1e2535] rounded-2xl p-4 bg-white dark:bg-[#111520]">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0f1f3d] to-[#03050a] flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0">
                            {review.student.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-bold text-[#0f172a] dark:text-[#e8eaf0] truncate">{review.student.name}</div>
                            <div className="flex items-center gap-2">
                              <StarRating value={review.rating} size={11} />
                              <span className="text-[11px] text-[#64748b] dark:text-[#7a859a]">{new Date(review.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                            </div>
                          </div>
                        </div>
                        {review.comment && (
                          <div className="text-[13px] text-[#475569] dark:text-[#b0bac9] leading-[1.65] ml-[45px]">{review.comment}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {reviewsTotal > 10 && (
                  <div className="flex items-center justify-center gap-2 mt-5">
                    <button
                      disabled={reviewPage <= 1}
                      onClick={() => setReviewPage((p) => p - 1)}
                      className="px-3 py-[6px] rounded-[8px] bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9] dark:from-[#1e2535] dark:to-[#0b0e14] border border-gray-200 dark:border-[#1e2535] text-[12px] font-semibold text-[#475569] dark:text-[#b0bac9] cursor-pointer disabled:opacity-40 transition-all hover:from-[#eef2ff] hover:to-[#e0e7ff] dark:hover:from-[#1a1f3a] dark:hover:to-[#141a30] hover:border-[#c7d2fe] dark:hover:border-[#2d3358] shadow-sm"
                    >
                      Previous
                    </button>
                    <span className="text-[12px] text-[#64748b] dark:text-[#7a859a]">
                      Page {reviewPage} of {Math.ceil(reviewsTotal / 10)}
                    </span>
                    <button
                      disabled={reviewPage >= Math.ceil(reviewsTotal / 10)}
                      onClick={() => setReviewPage((p) => p + 1)}
                      className="px-3 py-[6px] rounded-[8px] bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9] dark:from-[#1e2535] dark:to-[#0b0e14] border border-gray-200 dark:border-[#1e2535] text-[12px] font-semibold text-[#475569] dark:text-[#b0bac9] cursor-pointer disabled:opacity-40 transition-all hover:from-[#eef2ff] hover:to-[#e0e7ff] dark:hover:from-[#1a1f3a] dark:hover:to-[#141a30] hover:border-[#c7d2fe] dark:hover:border-[#2d3358] shadow-sm"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>

          {/* RIGHT */}
<<<<<<< HEAD
          <aside ref={pricingRef} className="sticky top-[72px]">
=======
          <aside className="sticky top-[72px]">
>>>>>>> b4e5ca54d4ece6de2bdab5a0d1ac7e8cc204d8e0
            <div className="bg-white dark:bg-[#111520] border border-gray-200 dark:border-[#1e2535] rounded-2xl overflow-hidden shadow-sm">
              <div className="flex p-3 border-b border-gray-200 dark:border-[#1e2535] gap-2">
                {(["monthly", "annual"] as const).map((p) => (
                  <button key={p} onClick={() => setPlan(p)}
                    className={`flex-1 py-2 rounded-[10px] text-center text-[13px] font-semibold transition-all relative shadow-sm ${plan === p
                        ? "bg-gradient-to-r from-[#0f1f3d] to-[#03050a] text-white shadow-[0_2px_10px_rgba(10,10,20,.45)]"
                        : "text-[#475569] dark:text-[#b0bac9] bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9] dark:from-[#1e2535] dark:to-[#0b0e14] border border-gray-200 dark:border-[#1e2535] hover:from-[#eef2ff] hover:to-[#e0e7ff] dark:hover:from-[#1a1f3a] dark:hover:to-[#141a30]"
                      }`}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                    {p === "annual" && (
                      <span className="absolute -top-[10px] right-1 bg-gradient-to-r from-[#0f1f3d] to-[#03050a] text-white text-[9.5px] font-extrabold px-1.5 py-[2px] rounded-[4px] uppercase tracking-[.3px] shadow-sm">Save 40%</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="p-5 pb-4 border-b border-gray-200 dark:border-[#1e2535]">
                {plan === "monthly" ? (
                  <div className="flex items-end gap-1.5 mb-2">
                    <span className="text-[36px] font-extrabold text-[#0f172a] dark:text-[#e8eaf0] font-['Syne',sans-serif] leading-none">₹3,999</span>
                    <span className="text-[14px] text-[#64748b] dark:text-[#7a859a] pb-1">/month</span>
                  </div>
                ) : (
                  <>
                    <div className="text-[13px] text-[#64748b] dark:text-[#7a859a] line-through mb-0.5">₹3,999/mo</div>
                    <div className="flex items-end gap-1.5 mb-1">
                      <span className="text-[36px] font-extrabold text-[#0f172a] dark:text-[#e8eaf0] font-['Syne',sans-serif] leading-none">₹1,999</span>
                      <span className="text-[14px] text-[#64748b] dark:text-[#7a859a] pb-1">/month</span>
                    </div>
                    <div className="text-[12px] font-bold text-[#16a34a] dark:text-[#22c55e]">✓ Save ₹24,000/yr — billed ₹23,988/yr</div>
                  </>
                )}
              </div>

              <div className="p-4 border-b border-gray-200 dark:border-[#1e2535]">
                <div className="text-[11.5px] uppercase tracking-[.6px] text-[#64748b] dark:text-[#7a859a] font-bold mb-3">Everything Included</div>
                {[
                  { title: `Full course access — all ${course.totalLessons} lessons`, sub: "Instant unlock across all devices" },
                  { title: "Real-world enterprise projects", sub: "Graded with mentor feedback" },
                  { title: "Verified digital certificate", sub: "LinkedIn & resume ready" },
                  { title: "Live mentor sessions — 2 per month", sub: `Direct Q&A with ${course.mentorName}` },
                  { title: "Access to 150+ courses across all tracks", sub: "Full platform — not just this course" },
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-[9px] mb-2.5">
                    <div className="w-[18px] h-[18px] rounded-full bg-[#16a34a] flex items-center justify-center flex-shrink-0 mt-[1px]">
                      <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <div className="text-[13px] text-[#475569] dark:text-[#b0bac9]">{f.title}<small className="block text-[11.5px] text-[#64748b] dark:text-[#7a859a]">{f.sub}</small></div>
                  </div>
                ))}
              </div>

              <div className="p-4">
                <button className="w-full py-3.5 rounded-[12px] bg-gradient-to-r from-[#0f1f3d] to-[#03050a] text-white text-[15px] font-extrabold shadow-[0_4px_20px_rgba(10,10,20,.45)] hover:shadow-[0_6px_28px_rgba(37,99,235,.45)] hover:-translate-y-0.5 transition-all mb-2.5">🔓 Unlock Full Course</button>
                <button
                  onClick={scrollToPreview}
                  className="w-full py-2.5 rounded-[12px] bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9] dark:from-[#1e2535] dark:to-[#0b0e14] border border-gray-200 dark:border-[#1e2535] text-[#475569] dark:text-[#b0bac9] text-[13.5px] font-bold hover:from-[#eef2ff] hover:to-[#e0e7ff] dark:hover:from-[#1a1f3a] dark:hover:to-[#141a30] hover:text-[#2563eb] dark:hover:text-[#60a5fa] hover:border-[#c7d2fe] dark:hover:border-[#2d3358] transition-all shadow-sm"
                >▶ Start Free Preview</button>
                <div className="text-[11.5px] text-[#64748b] dark:text-[#7a859a] text-center mt-2.5 leading-[1.5]">No commitment. Cancel anytime.<br />Prices in INR · GST applicable</div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#111520] border border-[#c7d2fe]/50 dark:border-[#2d3358]/50 rounded-2xl p-4 mt-4 shadow-sm relative overflow-hidden">
              <div className="text-[60px] font-extrabold text-[#c7d2fe]/20 dark:text-[#2d3358]/20 right-[-10px] bottom-[-14px] absolute tracking-[-2px] leading-none pointer-events-none font-['Syne',sans-serif] select-none">CERTIFICATE</div>
              <div className="flex items-center gap-2.5 mb-3 relative z-[1]">
                <div className="w-9 h-9 rounded-[8px] bg-gradient-to-r from-[#0f1f3d] to-[#03050a] flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" /></svg>
                </div>
                <div>
                  <div className="text-[13px] font-bold text-[#0f172a] dark:text-[#e8eaf0]">Industry Certificate Included</div>
                  <div className="text-[11.5px] text-[#64748b] dark:text-[#7a859a]">Issued upon course completion</div>
                </div>
              </div>
              <div className="border border-dashed border-[#c7d2fe]/50 dark:border-[#2d3358]/50 rounded-[10px] p-3 text-center bg-[#eef2ff]/10 dark:bg-[#1a1f3a]/10 relative z-[1]">
                <div className="font-['Syne',sans-serif] text-[14px] font-bold text-[#0f172a] dark:text-[#e8eaf0]">Certificate of Completion</div>
                <div className="text-[11px] text-[#475569] dark:text-[#b0bac9] my-1">{course.title}</div>
                <div className="text-[11px] text-[#64748b] dark:text-[#7a859a]">Future Stack · Verified by {course.mentorName}</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 mt-3 p-3 rounded-[10px] bg-gradient-to-b from-[#f0fdf4] to-[#dcfce7] dark:from-[#052e16] dark:to-[#0a3d1a] border border-[#bbf7d0] dark:border-[#166534]">
              <svg width="22" height="22" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              <div className="text-[12px] font-semibold text-[#16a34a] dark:text-[#22c55e]">7-Day Money-Back Guarantee<small className="block font-normal opacity-80">Full refund if you're not satisfied</small></div>
            </div>
          </aside>
        </div>
      </div>

      {/* Bottom Sections */}
      <div className="max-w-[1700px] mx-auto px-3 md:px-6 pb-6 md:pb-[60px]">
        <div className="bg-gradient-to-r from-[#0a1628] via-[#0f1f3d] to-[#1a2d5a] rounded-2xl p-6 md:p-8 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6 relative overflow-hidden">
          {[
            { num: "92%", lbl: "Placement Rate" },
            { num: "₹22L+", lbl: "Avg. Starting Salary" },
            { num: course.students.toString(), lbl: "Students Enrolled" },
            { num: `${Math.floor(course.rating)}★`, lbl: "Course Rating" },
          ].map((stat, i) => (
            <div key={i} className="text-center relative z-[1]">
              <div className="text-[32px] font-bold text-white font-['Syne',sans-serif] leading-none">
                <span className="text-[#ea580c] dark:text-[#f97316]">{stat.num}</span>
              </div>
              <div className="text-[12.5px] text-[rgba(255,255,255,.55)] mt-1">{stat.lbl}</div>
            </div>
          ))}
        </div>

        {related.length > 0 && (
          <div className="bg-white dark:bg-[#111520] border border-gray-200 dark:border-[#1e2535] rounded-2xl p-4 md:p-[22px_24px] shadow-sm mb-4">
            <div className="font-['Syne',sans-serif] text-[18px] md:text-[20px] font-bold text-[#0f172a] dark:text-[#e8eaf0] pb-3 border-b border-gray-200 dark:border-[#1e2535] mb-3.5">Related Courses</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {related.map((rc) => (
                <Link key={rc.id} href={`/courses/${rc.slug}`}
                  className="border border-gray-200 dark:border-[#1e2535] rounded-2xl overflow-hidden cursor-pointer transition-all hover:border-[#c7d2fe] dark:hover:border-[#2d3358] hover:shadow-sm hover:-translate-y-[3px] bg-white dark:bg-[#111520] no-underline">
                  <div className="aspect-[16/7] overflow-hidden bg-[#f1f5f9] dark:bg-[#0b0e14]">
                    <img src={rc.img} alt={rc.title} className="w-full h-full object-cover transition-transform hover:scale-105" />
                  </div>
                  <div className="p-3">
                    <div className="text-[11px] font-bold uppercase tracking-[.5px] text-[#ea580c] dark:text-[#f97316]">{rc.category}</div>
                    <div className="text-[13px] font-bold text-[#0f172a] dark:text-[#e8eaf0] leading-[1.35] mt-1">{rc.title}</div>
                    <div className="flex items-center gap-2 text-[12px] text-[#64748b] dark:text-[#7a859a] mt-1.5">⭐ {Math.floor(rc.rating)} · {rc.hours}h · {rc.level}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-[#111520] border border-gray-200 dark:border-[#1e2535] rounded-2xl p-4 md:p-[22px_24px] shadow-sm">
          <div className="font-['Syne',sans-serif] text-[18px] md:text-[20px] font-bold text-[#0f172a] dark:text-[#e8eaf0] pb-3 border-b border-gray-200 dark:border-[#1e2535] mb-4">Frequently Asked Questions</div>
          {faqs.map((faq, i) => (
            <div key={i} className={`border border-gray-200 dark:border-[#1e2535] rounded-[10px] mb-2 overflow-hidden transition-all ${openFaq === faq.q ? "border-[#ea580c] dark:border-[#f97316]" : ""}`}>
              <div className="flex items-center justify-between p-[14px_18px] text-[13.5px] font-semibold text-[#0f172a] dark:text-[#e8eaf0] cursor-pointer select-none hover:bg-[#f8fafc] dark:hover:bg-[#0b0e14] transition-all"
                onClick={() => setOpenFaq(openFaq === faq.q ? null : faq.q)}>
                {faq.q}
                <span className={`text-base text-[#64748b] dark:text-[#7a859a] flex-shrink-0 transition-transform ${openFaq === faq.q ? "rotate-45 text-[#ea580c] dark:text-[#f97316]" : ""}`}>+</span>
              </div>
              <div className={`overflow-hidden transition-all ${openFaq === faq.q ? "max-h-[200px] px-[18px] pb-4" : "max-h-0 px-[18px]"}`}>
                <div className="text-[13.5px] text-[#475569] dark:text-[#b0bac9] leading-[1.7]">{faq.a}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {leftReviewError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.45)" }}>
          <div className="bg-white dark:bg-[#111520] border border-gray-200 dark:border-[#1e2535] rounded-[14px] p-[24px_28px] max-w-[360px] w-full shadow-[0_12px_40px_rgba(0,0,0,.2)]" style={{ animation: "slideUp .3s ease both" }}>
            <div className="w-[40px] h-[40px] rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-[18px] mb-[12px]">🔒</div>
            <div className="font-['Syne',sans-serif] text-[15px] font-bold text-[#0f172a] dark:text-[#e8eaf0] mb-[6px]">Enrollment Required</div>
            <div className="text-[11px] text-[#475569] dark:text-[#b0bac9] leading-[1.6] mb-[16px]">{leftReviewError}</div>
            <div className="flex items-center gap-[8px]">
<<<<<<< HEAD
              <button onClick={scrollToPricing}
                className="flex-1 px-[16px] py-[9px] rounded-[10px] text-[11px] font-bold text-white bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] no-underline shadow-[0_3px_10px_rgba(37,99,235,.45)] hover:shadow-[0_5px_16px_rgba(37,99,235,.55)] hover:-translate-y-[1px] transition-all cursor-pointer border-none">
                Enroll Now
              </button>
=======
              <Link href="/courses" onClick={() => setLeftReviewError(null)}
                className="flex-1 text-center px-[16px] py-[9px] rounded-[10px] text-[11px] font-bold text-white bg-gradient-to-r from-[#0f1f3d] to-[#03050a] no-underline shadow-[0_3px_10px_rgba(10,10,20,.45)] hover:shadow-[0_5px_16px_rgba(37,99,235,.45)] hover:-translate-y-[1px] transition-all">
                Browse Courses
              </Link>
>>>>>>> b4e5ca54d4ece6de2bdab5a0d1ac7e8cc204d8e0
              <button onClick={() => setLeftReviewError(null)}
                className="px-[14px] py-[9px] rounded-[10px] text-[11px] font-semibold text-[#475569] dark:text-[#b0bac9] bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9] dark:from-[#1e2535] dark:to-[#0b0e14] border border-gray-200 dark:border-[#1e2535] cursor-pointer hover:from-[#eef2ff] hover:to-[#e0e7ff] dark:hover:from-[#1a1f3a] dark:hover:to-[#141a30] hover:text-[#2563eb] dark:hover:text-[#60a5fa] transition-all shadow-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
