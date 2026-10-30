"use client";

import Link from "next/link";
import useSWR from "swr";
import type { ReactNode, CSSProperties } from "react";
import type { DashboardUser, EnrolledCourse } from "../../hooks/student-dashboard";

interface Props {
  user: DashboardUser | null;
  enrolledCourses: EnrolledCourse[];
  isLoading: boolean;
  onOpenCourse: (courseId: string) => void;
  onNavigateTab: (tab: string) => void;
}

interface EarnedCert {
  courseId: string;
  courseTitle: string;
  credentialId: string;
  issuedAt: string;
}
interface LockedCert {
  courseId: string;
  courseTitle: string;
  category: string;
  price: number | null;
}
interface CertificatesResponse {
  earned: EarnedCert[];
  inProgress: unknown[];
  locked: LockedCert[];
}

interface FeaturedCourse {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  price: number;
  originalPrice: number | null;
  techStack: string[] | null;
  totalVideos: number;
  durationHours: number;
}

interface OrderItem {
  id: string;
  priceAtPurchase: number;
  currency: string;
  course: { id: string; title: string; thumbnailUrl: string | null } | null;
  project: { id: string; name: string } | null;
}
interface Order {
  id: string;
  currency: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

const CURRENCY_SYMBOL: Record<string, string> = { INR: "₹", USD: "$" };

function formatMoney(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOL[currency] ?? currency + " ";
  return `${sym}${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

const GLOW = {
  orange: { accent: "var(--orange)", tint: "var(--orange-d)", ring: "rgba(240,90,26,.45)" },
  blue: { accent: "var(--blue2)", tint: "var(--blue-d)", ring: "rgba(59,130,246,.45)" },
  green: { accent: "var(--green)", tint: "var(--green-d)", ring: "rgba(34,197,94,.4)" },
  purple: { accent: "var(--purple)", tint: "var(--purple-d)", ring: "rgba(167,139,250,.45)" },
} as const;

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function SectionHeader({ tag, title, action }: { tag: string; title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="flex items-center gap-1.5 font-['JetBrains_Mono',monospace] text-[10px] font-bold uppercase tracking-[.18em] text-[var(--orange)]">
        <span className="w-[6px] h-[6px] rounded-full bg-[var(--orange)] shadow-[0_0_10px_var(--orange)]" />
        {tag}
      </span>
      <h2 className="font-['Syne',sans-serif] text-[17px] sm:text-[19px] font-bold text-[var(--text)] m-0 tracking-tight">{title}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-[var(--border2)] to-transparent" />
      {action}
    </div>
  );
}

function ViewAll({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-['JetBrains_Mono',monospace] text-[10.5px] font-semibold text-[var(--blue2)] no-underline whitespace-nowrap hover:underline">
      {children}
    </Link>
  );
}

function GlowCard({ children, className = "", accent = "orange", style }: { children: ReactNode; className?: string; accent?: keyof typeof GLOW; style?: CSSProperties }) {
  const g = GLOW[accent];
  return (
    <div
      className={`group relative overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-md transition-all duration-300 hover:-translate-y-[3px] hover:border-[var(--border2)] ${className}`}
      style={{ boxShadow: "0 1px 0 rgba(255,255,255,.03) inset", ...style }}
    >
      {/* neon top edge */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${g.accent}, transparent)` }} />
      <div
        className="pointer-events-none absolute -top-12 -right-12 w-[150px] h-[150px] rounded-full blur-[44px] opacity-0 group-hover:opacity-60 transition-opacity duration-500"
        style={{ background: g.ring }}
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

function Chip({ children, tone = "orange" }: { children: ReactNode; tone?: keyof typeof GLOW }) {
  const g = GLOW[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 font-['JetBrains_Mono',monospace] text-[10px] font-bold uppercase tracking-[.14em] px-2.5 py-1 rounded-full border"
      style={{ background: g.tint, color: g.accent, borderColor: g.ring }}
    >
      {children}
    </span>
  );
}

function CourseRecommendations({ courses, isLoading, size = "compact" }: { courses: FeaturedCourse[]; isLoading: boolean; size?: "compact" | "large" }) {
  const visible = size === "large" ? courses.slice(0, 8) : courses.slice(0, 4);
  const gridCols = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
  if (isLoading) {
    return (
      <div className={`grid gap-4 ${gridCols}`}>
        {Array.from({ length: size === "large" ? 8 : 4 }).map((_, i) => (
          <div key={i} className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] overflow-hidden animate-pulse">
            <div className="h-[110px] bg-[var(--border)]" />
            <div className="p-4 flex flex-col gap-2">
              <div className="h-3 bg-[var(--border)] rounded w-4/5" />
              <div className="h-2.5 bg-[var(--border)] rounded w-full" />
              <div className="h-2.5 bg-[var(--border)] rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (visible.length === 0) return null;
  const tones = ["orange", "blue", "purple", "green"] as const;
  return (
    <div className={`grid gap-4 ${gridCols}`} style={{ animation: "fadeUp .35s ease both" }}>
      {visible.map((c, i) => {
        const g = GLOW[tones[i % tones.length]];
        return (
          <Link
            key={c.id}
            href={`/courses/${slugify(c.title)}`}
            className="group relative overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--card)] no-underline flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:border-[var(--border2)] hover:shadow-[0_16px_36px_rgba(0,0,0,.25)]"
            style={{ animation: `fadeUp .35s ${i * 0.05}s ease both` }}
          >
            <div
              className="relative h-[110px] sm:h-[120px] overflow-hidden"
              style={{
                background: c.thumbnailUrl
                  ? `linear-gradient(180deg, transparent 40%, var(--card)), url(${c.thumbnailUrl}) center/cover`
                  : `radial-gradient(120% 140% at 0% 0%, ${g.ring}, transparent 60%), linear-gradient(135deg, ${g.tint}, var(--card))`,
              }}
            >
              {!c.thumbnailUrl && (
                <span className="absolute right-3 bottom-1 font-['Syne',sans-serif] text-[64px] font-extrabold leading-none opacity-20 select-none" style={{ color: g.accent }}>
                  {c.title.charAt(0)}
                </span>
              )}
            </div>
            <div className="p-4 flex flex-col gap-2 flex-1">
              <span className="font-['Syne',sans-serif] text-[14px] font-bold text-[var(--text)] leading-[1.3] line-clamp-2 transition-colors group-hover:text-[var(--orange)]">{c.title}</span>
              <span className="text-[11.5px] text-[var(--text3)] leading-[1.5] line-clamp-2">{c.description}</span>
              {c.techStack && c.techStack.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
                  {c.techStack.slice(0, 3).map((t) => (
                    <span key={t} className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold px-2 py-[3px] rounded-full" style={{ background: "var(--blue-d)", color: "var(--blue2)" }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

const PRIMARY_BTN =
  "group inline-flex items-center gap-2.5 px-5 sm:px-6 py-3 rounded-[12px] text-white text-[13px] font-bold no-underline transition-all duration-300 hover:-translate-y-[2px] w-full sm:w-auto sm:max-w-full min-w-0 justify-center border-none cursor-pointer";
const PRIMARY_BG = { background: "linear-gradient(135deg,var(--orange),#ff8a4c)", boxShadow: "0 8px 26px rgba(240,90,26,.42)" } as const;
const GHOST_BTN =
  "inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[12px] bg-[var(--card)]/40 backdrop-blur-md text-[var(--text2)] border border-[var(--border2)] text-[13px] w-full sm:w-auto font-semibold hover:border-[var(--blue2)] hover:text-[var(--blue2)] hover:bg-[var(--blue-d)] transition-all no-underline whitespace-nowrap";

export default function OverviewSection({ user, enrolledCourses, isLoading, onOpenCourse, onNavigateTab }: Props) {
  const { data: certData, isLoading: certLoading } = useSWR<CertificatesResponse>(user ? "/api/certificates/my" : null);
  const { data: featuredCourses, isLoading: featuredLoading } = useSWR<FeaturedCourse[]>("/api/courses/public/featured-courses");
  const { data: orders, isLoading: ordersLoading } = useSWR<Order[]>(user ? "/api/student/orders" : null);
  const successfulOrders = (orders ?? []).filter((o) => o.status === "PAID");

  const firstName = user?.name.split(" ")[0] ?? (isLoading ? "…" : "there");

  const hasEnrollments = enrolledCourses.length > 0;
  const firstCourse = [...enrolledCourses].filter((c) => c.progressPercent < 100).sort((a, b) => b.progressPercent - a.progressPercent)[0] ?? null;
  const ringPct = firstCourse?.progressPercent ?? 0;
  const ringCirc = 226.2; // 2 * PI * 36
  const ringOffset = Number((ringCirc * (1 - ringPct / 100)).toFixed(1));

  const activeCourseCount = enrolledCourses.filter((c) => c.progressPercent < 100).length;
  const completedCourseCount = enrolledCourses.filter((c) => c.progressPercent === 100).length;
  const totalCompleted = enrolledCourses.reduce((sum, c) => sum + c.completedVideos, 0);
  const earnedCerts = certData?.earned ?? [];
  const lockedCerts = certData?.locked ?? [];
  const resumeCourses = [...enrolledCourses].filter((c) => c.progressPercent < 100).sort((a, b) => b.progressPercent - a.progressPercent).slice(0, 4);

  // Three distinct states, not two — a returning student who finished every
  // enrolled course is neither "in progress" nor "brand new", and was
  // previously falling into the "new user" copy below by accident.
  const allCoursesCompleted = hasEnrollments && !firstCourse;

  return (
    <div className="flex flex-col gap-6 relative shrink-0 overflow-x-clip [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* ambient page glow, sits behind everything */}
      <div className="pointer-events-none absolute -top-6 left-1/4 w-[360px] h-[360px] rounded-full blur-[120px] opacity-[0.08] -z-10" style={{ background: "var(--orange)" }} />
      <div className="pointer-events-none absolute top-1/3 right-0 w-[320px] h-[320px] rounded-full blur-[120px] opacity-[0.07] -z-10" style={{ background: "var(--blue2)" }} />

      {/* ═══ HERO ═══ */}
      <div
        className="relative overflow-hidden rounded-[22px] border border-[var(--border2)] shrink-0 w-full min-w-0 flex"
        style={{
          background: hasEnrollments
            ? "radial-gradient(120% 140% at 0% 0%, rgba(240,90,26,.16), transparent 55%), radial-gradient(100% 120% at 100% 100%, rgba(59,130,246,.14), transparent 55%), var(--surface)"
            : "radial-gradient(120% 150% at 0% 0%, rgba(167,139,250,.18), transparent 55%), radial-gradient(100% 120% at 100% 0%, rgba(240,90,26,.16), transparent 55%), var(--surface)",
        }}
      >
        {/* grid backdrop + neon edge */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.4]"
          style={{
            backgroundImage: "linear-gradient(rgba(127,140,170,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(127,140,170,.07) 1px,transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(ellipse at 30% 40%, #000 20%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at 30% 40%, #000 20%, transparent 75%)",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px pointer-events-none" style={{ background: "linear-gradient(90deg, transparent, var(--orange), var(--blue2), transparent)" }} />
        <div className="absolute -top-20 -left-12 w-[260px] h-[260px] rounded-full blur-[80px] opacity-50 pointer-events-none" style={{ background: "rgba(240,90,26,.35)" }} />
        <div className="absolute -bottom-24 -right-12 w-[280px] h-[280px] rounded-full blur-[90px] opacity-40 pointer-events-none" style={{ background: hasEnrollments ? "rgba(59,130,246,.35)" : "rgba(167,139,250,.35)" }} />

        <div className="relative z-[1] flex flex-col lg:flex-row flex-1 min-w-0 w-full">
          {/* ── left: greeting + action ── */}
          <div className="p-5 sm:p-8 lg:p-10 flex-1 min-w-0 flex flex-col justify-center gap-4">
            {!hasEnrollments && (
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone="purple"><span className="w-[6px] h-[6px] rounded-full bg-[var(--purple)] shadow-[0_0_8px_var(--purple)]" style={{ animation: "pulse 2s infinite" }} />New here</Chip>
              </div>
            )}

            <h1 className="font-['Syne',sans-serif] text-[26px] sm:text-[34px] lg:text-[42px] break-words font-extrabold text-[var(--text)] leading-[1.08] m-0 tracking-tight">
              {hasEnrollments ? (
                <>
                  Welcome back,{" "}
                  <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg,var(--orange),#ff9a5c)" }}>{firstName}</span> 👋
                </>
              ) : (
                <>
                  Start building your{" "}
                  <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg,var(--purple),var(--orange))" }}>future</span>, {firstName}
                </>
              )}
            </h1>

            <p className="text-[13.5px] sm:text-[15px] text-[var(--text2)] leading-[1.6] max-w-[560px] m-0">
              {firstCourse
                ? "Pick up right where you left off. Your next lesson is ready."
                : allCoursesCompleted
                  ? "Every enrolled course is complete. Claim your certificates or explore what's next."
                  : "Pick a course, enroll, and learn with video lessons, quizzes and real projects. Everything you start shows up right here."}
            </p>

            {/* in-progress focus card (enrolled only) */}
            {firstCourse && (
              <button
                type="button"
                onClick={() => onOpenCourse(firstCourse.courseId)}
                className="group text-left w-full max-w-[560px] rounded-[14px] border border-[var(--border2)] bg-[var(--card)]/60 backdrop-blur-md p-3.5 transition-all duration-300 hover:border-[rgba(240,90,26,.5)] hover:-translate-y-[2px] cursor-pointer"
              >
                <div className="font-['JetBrains_Mono',monospace] text-[9.5px] font-bold uppercase tracking-[.16em] text-[var(--orange)] mb-1">Currently learning</div>
                <div className="font-['Syne',sans-serif] text-[15px] font-bold text-[var(--text)] truncate">{firstCourse.title}</div>
                <div className="font-['JetBrains_Mono',monospace] text-[10.5px] text-[var(--text3)] truncate mt-0.5">
                  {firstCourse.nextVideo?.title ? `▶ Next: ${firstCourse.nextVideo.title}` : "Ready to start"}
                </div>
                <div className="h-[5px] bg-[var(--border)] rounded-full overflow-hidden mt-2.5">
                  <div className="h-full rounded-full" style={{ width: `${firstCourse.progressPercent}%`, background: "linear-gradient(90deg,var(--orange),#ff9a5c)", boxShadow: "0 0 10px rgba(240,90,26,.6)" }} />
                </div>
              </button>
            )}

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5 mt-1">
              {firstCourse ? (
                <button type="button" onClick={() => onOpenCourse(firstCourse.courseId)} className={PRIMARY_BTN} style={PRIMARY_BG}>
                  <span className="text-[14px] transition-transform group-hover:translate-x-0.5 shrink-0">▶</span>
                  <span className="truncate">Continue learning</span>
                </button>
              ) : allCoursesCompleted ? (
                <button type="button" onClick={() => onNavigateTab("certificates")} className={PRIMARY_BTN} style={PRIMARY_BG}>
                  <span className="text-[14px] shrink-0">🎓</span>
                  <span className="truncate">View certificates</span>
                </button>
              ) : (
                <Link href="/courses" className={PRIMARY_BTN} style={PRIMARY_BG}>
                  <span className="text-[14px] transition-transform group-hover:translate-x-0.5 shrink-0">🚀</span>
                  <span className="truncate">Explore courses</span>
                </Link>
              )}
              {hasEnrollments && (
                <Link href="/courses" className={GHOST_BTN}>🧭 Browse more courses</Link>
              )}
            </div>
          </div>

          {/* ── right panel ── */}
          {hasEnrollments ? (
            <div className="p-5 sm:p-8 lg:px-12 flex flex-col items-center justify-center gap-4 relative border-t lg:border-t-0 lg:border-l border-[var(--border)]/60 lg:min-w-[260px]">
              <div className="relative w-[120px] h-[120px] sm:w-[148px] sm:h-[148px] shrink-0" role="img" aria-label={`Current course progress: ${isLoading ? "loading" : `${ringPct} percent`}`}>
                <div className="absolute inset-0 rounded-full blur-[22px] opacity-60" style={{ background: "conic-gradient(from 0deg, rgba(240,90,26,.55), transparent 70%)" }} />
                <svg viewBox="0 0 80 80" className="rotate-[-90deg] relative z-[1] w-full h-full" aria-hidden="true">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="var(--border)" strokeWidth="5" />
                  <circle
                    cx="40" cy="40" r="36" fill="none" stroke="url(#ringGrad)" strokeWidth="5"
                    strokeDasharray={ringCirc} strokeDashoffset={ringOffset} strokeLinecap="round"
                    style={{ filter: "drop-shadow(0 0 6px rgba(240,90,26,.6))", transition: "stroke-dashoffset .8s ease" }}
                  />
                  <defs>
                    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--orange)" />
                      <stop offset="100%" stopColor="#ff9a5c" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center z-[1]">
                  <div className="font-['Syne',sans-serif] text-[28px] sm:text-[34px] font-extrabold text-[var(--text)] leading-none">{isLoading ? "…" : `${ringPct}%`}</div>
                  <div className="font-['JetBrains_Mono',monospace] text-[9px] uppercase tracking-[.16em] text-[var(--text3)] mt-1">Progress</div>
                </div>
              </div>
              <div className="font-['JetBrains_Mono',monospace] text-[10.5px] text-[var(--text3)] text-center">
                {completedCourseCount} of {enrolledCourses.length} course{enrolledCourses.length === 1 ? "" : "s"} complete
              </div>
            </div>
          ) : (
            <div className="p-5 sm:p-8 lg:px-10 flex flex-col justify-center relative border-t lg:border-t-0 lg:border-l border-[var(--border)]/60 lg:min-w-[320px]">
              <div className="font-['JetBrains_Mono',monospace] text-[10px] font-bold uppercase tracking-[.18em] text-[var(--text3)] mb-4">Your learning journey</div>
              <div className="relative flex flex-col gap-4">
                <div className="absolute left-[19px] top-5 bottom-5 w-px" style={{ background: "linear-gradient(180deg, var(--orange), var(--blue2), var(--green))", opacity: 0.55 }} />
                {([
                  { icon: "🔍", t: "Pick a course", d: "Find one that fits your goals", tone: "orange" },
                  { icon: "🎟️", t: "Enroll", d: "Instant access to every lesson", tone: "blue" },
                  { icon: "🎬", t: "Learn & practice", d: "Videos, quizzes and skill tests", tone: "purple" },
                  { icon: "🏅", t: "Get certified", d: "Prove what you've built", tone: "green" },
                ] as const).map((f, i) => (
                  <div key={f.t} className="relative flex items-center gap-3.5" style={{ animation: `fadeUp .4s ${0.1 + i * 0.08}s ease both` }}>
                    <span
                      className="relative z-[1] w-[40px] h-[40px] rounded-[12px] flex items-center justify-center text-[18px] shrink-0 border backdrop-blur-md"
                      style={{ background: GLOW[f.tone].tint, borderColor: GLOW[f.tone].ring, boxShadow: `0 0 18px ${GLOW[f.tone].tint}` }}
                      aria-hidden="true"
                    >
                      {f.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-bold text-[var(--text)] leading-tight">{f.t}</div>
                      <div className="text-[11.5px] text-[var(--text3)] mt-0.5">{f.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {hasEnrollments ? (
        <>
          {/* ═══ KPI ROW ═══ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" style={{ animation: "fadeUp .35s ease both" }}>
            {([
              { icon: "📚", num: isLoading ? "…" : activeCourseCount.toString(), lbl: "Active courses", accent: "orange" },
              { icon: "🏁", num: isLoading ? "…" : completedCourseCount.toString(), lbl: "Courses completed", accent: "green" },
              { icon: "✅", num: isLoading ? "…" : totalCompleted.toString(), lbl: "Modules done", accent: "blue" },
              { icon: "🎓", num: certLoading ? "…" : earnedCerts.length.toString(), lbl: "Certificates earned", accent: "purple" },
            ] as const).map((k, i) => (
              <GlowCard key={k.lbl} accent={k.accent} className="p-4 sm:p-5" style={{ animation: `fadeUp .3s ${i * 0.05}s ease both` }}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div
                    className="w-[38px] h-[38px] sm:w-[42px] sm:h-[42px] rounded-[11px] flex items-center justify-center text-[18px] sm:text-[20px] shrink-0 border"
                    style={{ background: GLOW[k.accent].tint, borderColor: GLOW[k.accent].ring, boxShadow: `0 0 18px ${GLOW[k.accent].tint}` }}
                    aria-hidden="true"
                  >
                    {k.icon}
                  </div>
                  <div className="h-[3px] w-10 rounded-full" style={{ background: GLOW[k.accent].accent, boxShadow: `0 0 10px ${GLOW[k.accent].ring}` }} />
                </div>
                <div className="font-['Syne',sans-serif] text-[30px] sm:text-[38px] font-extrabold text-[var(--text)] leading-none tracking-tight">{k.num}</div>
                <div className="text-[11px] sm:text-[12px] text-[var(--text2)] mt-2 font-medium leading-snug">{k.lbl}</div>
              </GlowCard>
            ))}
          </div>

          {/* ═══ CONTINUE LEARNING + CERTIFICATES ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
            <div>
              <SectionHeader tag="continue" title="Continue learning" />
              <div className="flex flex-col gap-3">
                {resumeCourses.length === 0 ? (
                  <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-6 text-center font-['JetBrains_Mono',monospace] text-[12px] text-[var(--text3)]">
                    🎉 All caught up — every enrolled course is complete.
                  </div>
                ) : (
                  resumeCourses.map((c, i) => (
                    <button
                      key={c.courseId}
                      type="button"
                      onClick={() => onOpenCourse(c.courseId)}
                      className="group relative overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-4 flex items-center gap-4 no-underline transition-all duration-300 hover:-translate-y-[2px] hover:border-[rgba(240,90,26,.45)] hover:shadow-[0_12px_28px_rgba(240,90,26,.16)] w-full text-left cursor-pointer"
                      style={{ animation: `fadeUp .3s ${i * 0.05}s ease both` }}
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: "linear-gradient(180deg,var(--orange),#ff9a5c)" }} />
                      <div className="flex-1 min-w-0 pl-1">
                        <div className="font-['Syne',sans-serif] text-[14px] font-bold text-[var(--text)] truncate">{c.title}</div>
                        <div className="font-['JetBrains_Mono',monospace] text-[10.5px] text-[var(--text3)] truncate mt-1">
                          {c.nextVideo?.title ? `▶ Next: ${c.nextVideo.title}` : "Ready to start"}
                        </div>
                        <div className="h-[5px] bg-[var(--border)] rounded-full overflow-hidden mt-3">
                          <div className="h-full rounded-full" style={{ width: `${c.progressPercent}%`, background: "linear-gradient(90deg,var(--orange),#ff9a5c)", boxShadow: "0 0 8px rgba(240,90,26,.55)" }} />
                        </div>
                      </div>
                      <span className="font-['Syne',sans-serif] text-[20px] font-extrabold text-[var(--orange)] shrink-0">{c.progressPercent}%</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div>
              <SectionHeader tag="certs" title="Recently earned" action={<ViewAll href="/my-dashboard?tab=certificates">View all →</ViewAll>} />
              {certLoading ? (
                <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-4 animate-pulse h-[130px]" />
              ) : earnedCerts.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-[var(--border2)] bg-[var(--card)] p-6 text-center flex flex-col items-center gap-2">
                  <span className="text-[26px]" aria-hidden="true">🏅</span>
                  <span className="font-['JetBrains_Mono',monospace] text-[12px] text-[var(--text3)] leading-[1.6]">Finish a course to earn your first certificate.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {earnedCerts.slice(0, 3).map((cert, i) => (
                    <div key={cert.courseId} className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-3.5 flex items-center gap-3.5" style={{ animation: `fadeUp .3s ${i * 0.05}s ease both` }}>
                      <div className="w-[44px] h-[44px] rounded-[12px] flex items-center justify-center text-[20px] shrink-0 border" style={{ background: "var(--green-d)", borderColor: "rgba(34,197,94,.4)", boxShadow: "0 0 16px rgba(34,197,94,.18)" }} aria-hidden="true">🎓</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-[var(--text)] truncate">{cert.courseTitle}</div>
                        <div className="font-['JetBrains_Mono',monospace] text-[10px] text-[var(--text3)] mt-1">
                          Issued {new Date(cert.issuedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ═══ ORDER HISTORY — successful purchases only ═══ */}
          <div>
            <SectionHeader
              tag="orders"
              title="Order history"
              action={successfulOrders.length > 5 ? <span className="font-['JetBrains_Mono',monospace] text-[10px] text-[var(--text3)] whitespace-nowrap">{successfulOrders.length} total</span> : undefined}
            />
            {ordersLoading ? (
              <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-4 animate-pulse h-[100px]" />
            ) : successfulOrders.length === 0 ? (
              <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-5 text-center font-['JetBrains_Mono',monospace] text-[12px] text-[var(--text3)]">
                No successful orders yet.
              </div>
            ) : (
              <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                {successfulOrders.slice(0, 5).map((order, i) => {
                  const label = order.items.map((it) => it.course?.title ?? it.project?.name ?? "Item").join(", ");
                  return (
                    <div
                      key={order.id}
                      className="flex items-center flex-wrap gap-x-4 gap-y-2 px-4 py-3.5 border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[var(--bg2)]"
                      style={{ animation: `fadeUp .3s ${i * 0.04}s ease both` }}
                    >
                      <div className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-[14px] shrink-0 border" style={{ background: "var(--green-d)", borderColor: "rgba(34,197,94,.4)" }} aria-hidden="true">✓</div>
                      <div className="flex-1 min-w-[140px]">
                        <div className="text-[13px] font-semibold text-[var(--text)] truncate">{label}</div>
                        <div className="font-['JetBrains_Mono',monospace] text-[10px] text-[var(--text3)] mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 ml-auto shrink-0">
                        <span className="font-['Syne',sans-serif] text-[14px] font-extrabold text-[var(--green)] whitespace-nowrap">{formatMoney(order.totalAmount, order.currency)}</span>
                        <span className="font-['JetBrains_Mono',monospace] text-[9px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: "var(--green-d)", color: "var(--green)" }}>Paid</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ═══ KEEP EXPLORING ═══ */}
          <div>
            <SectionHeader tag="explore" title="Keep exploring" action={<ViewAll href="/courses">Full catalog →</ViewAll>} />
            <CourseRecommendations courses={featuredCourses ?? []} isLoading={featuredLoading} size="compact" />
          </div>
        </>
      ) : (
        <>
          {/* ═══ EXPLORE BY TOPIC — zero-enrollment onboarding ═══ */}
          <div>
            <SectionHeader tag="start" title="Explore by topic" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {([
                { icon: "🧠", title: "AI / ML", desc: "Models, data and automation", href: "/courses?category=ai-ml", accent: "purple" },
                { icon: "🌐", title: "Full Stack", desc: "Build complete web apps", href: "/courses?category=full-stack", accent: "blue" },
                { icon: "🔧", title: "DevOps", desc: "Ship and scale with confidence", href: "/courses?category=devops", accent: "orange" },
                { icon: "📊", title: "Data Science", desc: "Turn data into decisions", href: "/courses?category=data-science", accent: "green" },
              ] as const).map((c, i) => (
                <Link key={c.title} href={c.href} className="no-underline block" style={{ animation: `fadeUp .35s ${i * 0.06}s ease both` }}>
                  <GlowCard accent={c.accent} className="p-4 sm:p-5 h-full">
                    <div
                      className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[22px] border mb-4"
                      style={{ background: GLOW[c.accent].tint, borderColor: GLOW[c.accent].ring, boxShadow: `0 0 20px ${GLOW[c.accent].tint}` }}
                      aria-hidden="true"
                    >
                      {c.icon}
                    </div>
                    <div className="font-['Syne',sans-serif] text-[15px] sm:text-[16px] font-bold text-[var(--text)] mb-1">{c.title}</div>
                    <div className="text-[12px] text-[var(--text3)] leading-[1.5] mb-3">{c.desc}</div>
                    <span className="font-['JetBrains_Mono',monospace] text-[10.5px] font-semibold transition-transform duration-300 group-hover:translate-x-1 inline-block" style={{ color: GLOW[c.accent].accent }}>
                      Explore →
                    </span>
                  </GlowCard>
                </Link>
              ))}
            </div>
          </div>

          {/* Recommended courses — primary content for empty state */}
          <div>
            <SectionHeader tag="recommended" title="Popular courses to start with" action={<ViewAll href="/courses">Full catalog →</ViewAll>} />
            {!featuredLoading && (featuredCourses ?? []).length === 0 ? (
              <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-8 text-center font-['JetBrains_Mono',monospace] text-[12px] text-[var(--text3)]">
                No featured courses right now — <Link href="/courses" className="text-[var(--blue2)]">browse the full catalog →</Link>
              </div>
            ) : (
              <CourseRecommendations courses={featuredCourses ?? []} isLoading={featuredLoading} size="large" />
            )}
          </div>

          {/* Certificates you could earn */}
          {!certLoading && lockedCerts.length > 0 && (
            <div>
              <SectionHeader tag="certs" title="Certificates you could earn" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {lockedCerts.slice(0, 6).map((cert, i) => (
                  <div
                    key={cert.courseId}
                    className="relative overflow-hidden rounded-[16px] border border-dashed border-[var(--border2)] bg-[var(--card)] p-4 flex flex-col items-center text-center gap-2 transition-all hover:border-[var(--orange)] hover:-translate-y-0.5"
                    style={{ animation: `fadeUp .3s ${i * 0.05}s ease both` }}
                  >
                    <div className="text-[26px] opacity-80" aria-hidden="true">🔒</div>
                    <div className="text-[12px] font-semibold text-[var(--text2)] leading-[1.3]">{cert.courseTitle}</div>
                    <div className="font-['JetBrains_Mono',monospace] text-[9px] uppercase tracking-wide text-[var(--text3)]">{cert.category}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            className="relative overflow-hidden rounded-[20px] border border-[var(--border2)] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5"
            style={{ background: "radial-gradient(120% 160% at 0% 0%, rgba(240,90,26,.16), transparent 55%), radial-gradient(100% 140% at 100% 100%, rgba(167,139,250,.16), transparent 55%), var(--surface)" }}
          >
            <div className="absolute inset-x-0 top-0 h-px pointer-events-none" style={{ background: "linear-gradient(90deg, transparent, var(--orange), var(--purple), transparent)" }} />
            <div className="flex-1 min-w-0">
              <div className="font-['Syne',sans-serif] text-[20px] sm:text-[24px] font-extrabold text-[var(--text)] leading-tight tracking-tight">Ready to start your first course?</div>
              <p className="text-[13px] text-[var(--text2)] leading-[1.6] mt-1.5 mb-0">Choose a course and your progress, certificates and orders will show up on this dashboard.</p>
            </div>
            <Link href="/courses" className={PRIMARY_BTN} style={PRIMARY_BG}>
              <span className="text-[14px] shrink-0">🚀</span>
              <span className="truncate">Browse all courses</span>
            </Link>
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100% { opacity:1; box-shadow:0 0 0 0 rgba(240,90,26,.5) } 50% { opacity:.6; box-shadow:0 0 0 4px rgba(240,90,26,0) } }
      `}</style>
    </div>
  );
}
