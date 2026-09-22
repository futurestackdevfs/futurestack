"use client";

import Link from "next/link";
import useSWR from "swr";
import type { ReactNode, CSSProperties } from "react";
import type { DashboardUser, EnrolledCourse } from "../../hooks/student-dashboard";

interface Props {
  user: DashboardUser | null;
  enrolledCourses: EnrolledCourse[];
  isLoading: boolean;
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

function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ".");
}

function SectionHeader({ tag, title, action }: { tag: string; title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="flex items-center gap-1.5 font-['JetBrains_Mono',monospace] text-[9px] font-bold uppercase tracking-[.16em] text-[var(--orange)]">
        <span className="w-[5px] h-[5px] rounded-full bg-[var(--orange)] shadow-[0_0_8px_var(--orange)]" />
        {tag}
      </span>
      <h2 className="font-['Syne',sans-serif] text-[14px] font-bold text-[var(--text)] m-0 tracking-tight">{title}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-[var(--border2)] to-transparent"></div>
      {action}
    </div>
  );
}

function GlowCard({ children, className = "", accent = "orange", style }: { children: ReactNode; className?: string; accent?: keyof typeof GLOW; style?: CSSProperties }) {
  const g = GLOW[accent];
  return (
    <div
      className={`group relative overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-[3px] hover:border-[var(--border2)] ${className}`}
      style={{ boxShadow: "0 1px 0 rgba(255,255,255,.02) inset", ...style }}
    >
      <div
        className="pointer-events-none absolute -top-10 -right-10 w-[120px] h-[120px] rounded-full blur-[38px] opacity-0 group-hover:opacity-60 transition-opacity duration-500"
        style={{ background: g.ring }}
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

function CourseRecommendations({ courses, isLoading, size = "compact" }: { courses: FeaturedCourse[]; isLoading: boolean; size?: "compact" | "large" }) {
  const visible = size === "large" ? courses.slice(0, 8) : courses.slice(0, 5);
  const gridCols = size === "large" ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5";
  if (isLoading) {
    return (
      <div className={`grid gap-3 ${gridCols}`}>
        {Array.from({ length: size === "large" ? 8 : 5 }).map((_, i) => (
          <div key={i} className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] overflow-hidden animate-pulse p-3 flex flex-col gap-2">
            <div className="h-2.5 bg-[var(--border)] rounded w-4/5" />
            <div className="h-2 bg-[var(--border)] rounded w-full" />
            <div className="h-2 bg-[var(--border)] rounded w-2/3" />
            <div className="h-2.5 bg-[var(--border)] rounded w-1/3 mt-1" />
          </div>
        ))}
      </div>
    );
  }
  if (visible.length === 0) return null;
  return (
    <div className={`grid gap-3 ${gridCols}`} style={{ animation: "fadeUp .35s ease both" }}>
      {visible.map((c, i) => (
        <Link
          key={c.id}
          href={`/courses/${slugify(c.title)}`}
          className="group relative overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--card)] no-underline flex flex-col p-3 gap-1.5 transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(240,90,26,.4)] hover:shadow-[0_12px_28px_rgba(240,90,26,.18)]"
          style={{ animation: `fadeUp .35s ${i * 0.04}s ease both` }}
        >
          <span className="text-[11px] font-semibold text-[var(--text)] leading-[1.3] line-clamp-2">{c.title}</span>
          <span className="text-[9.5px] text-[var(--text3)] leading-[1.4] line-clamp-2">{c.description}</span>

          {c.techStack && c.techStack.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {c.techStack.slice(0, 3).map((t) => (
                <span key={t} className="font-['JetBrains_Mono',monospace] text-[7.5px] font-semibold px-1.5 py-[2px] rounded-full" style={{ background: "var(--blue-d)", color: "var(--blue2)" }}>{t}</span>
              ))}
            </div>
          )}

          <span className="font-['JetBrains_Mono',monospace] text-[8.5px] text-[var(--text3)] mt-0.5 pt-1.5 border-t border-[var(--border)]">{c.durationHours}h · {c.totalVideos} videos</span>
        </Link>
      ))}
    </div>
  );
}

export default function OverviewSection({ user, enrolledCourses, isLoading }: Props) {
  const { data: certData, isLoading: certLoading } = useSWR<CertificatesResponse>(user ? "/api/certificates/my" : null);
  const { data: featuredCourses, isLoading: featuredLoading } = useSWR<FeaturedCourse[]>("/api/courses/public/featured-courses");
  const { data: orders, isLoading: ordersLoading } = useSWR<Order[]>(user ? "/api/student/orders" : null);
  const successfulOrders = (orders ?? []).filter((o) => o.status === "PAID");

  const firstName = user?.name.split(" ")[0] ?? (isLoading ? "…" : "there");
  const slug = user ? nameToSlug(user.name) : "student";

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

  const continueLabel = firstCourse
    ? `Continue ${firstCourse.title}`
    : allCoursesCompleted
      ? "View Certificates"
      : "Browse Courses";
  const continueHref = firstCourse
    ? `/my-dashboard?courseId=${firstCourse.courseId}`
    : allCoursesCompleted
      ? "/my-dashboard?tab=certificates"
      : "/courses";

  return (
    <div className="flex flex-col gap-5 relative shrink-0 overflow-x-clip [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* ambient page glow, sits behind everything */}
      <div className="pointer-events-none absolute -top-6 left-1/4 w-[320px] h-[320px] rounded-full blur-[110px] opacity-[0.06] -z-10" style={{ background: "var(--orange)" }} />
      <div className="pointer-events-none absolute top-1/3 right-0 w-[280px] h-[280px] rounded-full blur-[110px] opacity-[0.05] -z-10" style={{ background: "var(--blue2)" }} />

      {/* ═══ HERO ═══ */}
      <div
        className="relative overflow-hidden rounded-[18px] border border-[var(--border)] shrink-0 w-full min-w-0 min-h-[120px] sm:min-h-[140px] flex"
        style={{ background: "radial-gradient(120% 140% at 0% 0%, rgba(240,90,26,.10), transparent 55%), radial-gradient(100% 120% at 100% 0%, rgba(59,130,246,.10), transparent 55%), var(--surface)" }}
      >
        {/* animated grid + scanline backdrop */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.35]"
          style={{ backgroundImage: "linear-gradient(rgba(127,140,170,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(127,140,170,.06) 1px,transparent 1px)", backgroundSize: "26px 26px" }}
        />
        <div className="absolute -top-16 -left-10 w-[220px] h-[220px] rounded-full blur-[70px] opacity-50 pointer-events-none" style={{ background: "rgba(240,90,26,.35)" }} />
        <div className="absolute -bottom-20 -right-10 w-[240px] h-[240px] rounded-full blur-[80px] opacity-40 pointer-events-none" style={{ background: "rgba(59,130,246,.3)" }} />

        <div className="relative z-[1] flex flex-col lg:flex-row flex-1 min-w-0 w-full">
          <div className="p-[16px_16px_14px] sm:p-[12px_24px] flex-1 min-w-0 flex flex-col justify-center">
            <h1 className="font-['Syne',sans-serif] text-[20px] sm:text-[26px] lg:text-[30px] break-words font-extrabold text-[var(--text)] leading-[1.15] mb-2 m-0 tracking-tight">
              Welcome to <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg,var(--orange),#ff9a5c)" }}>FutureStack</span>, {firstName} 👋
            </h1>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-2.5 mt-3 sm:mt-4">
              <Link
                href={continueHref}
                className="group inline-flex items-center gap-2 px-4 sm:px-5 py-[10px] sm:py-[9px] rounded-[9px] text-white text-[12px] sm:text-[11.5px] font-bold no-underline transition-all duration-300 hover:-translate-y-[2px] w-full sm:w-auto sm:max-w-full min-w-0 justify-center sm:justify-start"
                style={{ background: "linear-gradient(135deg,var(--orange),#ff8a4c)", boxShadow: "0 4px 18px rgba(240,90,26,.4)" }}
              >
                <span className="text-[13px] transition-transform group-hover:translate-x-0.5 shrink-0">▶</span> <span className="truncate">{continueLabel}</span>
              </Link>
              <Link
                href="/courses"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-[10px] sm:py-[9px] rounded-[9px] bg-transparent text-[var(--text2)] border border-[var(--border2)] text-[12px] sm:text-[11.5px] w-full sm:w-auto font-semibold hover:border-[var(--blue2)] hover:text-[var(--blue2)] hover:bg-[var(--blue-d)] transition-all no-underline whitespace-nowrap"
              >
                🧭 Browse More Courses
              </Link>
            </div>
          </div>

          {hasEnrollments && (
            <div className="p-[12px_16px] sm:p-[10px_24px] flex items-center justify-center gap-4 relative border-t lg:border-t-0 lg:border-l border-[var(--border)]/60">
              <div className="relative w-[76px] h-[76px] sm:w-[92px] sm:h-[92px] shrink-0 mx-auto lg:mx-0" role="img" aria-label={`Current course progress: ${isLoading ? "loading" : `${ringPct} percent`}`}>
                <div className="absolute inset-0 rounded-full blur-[16px] opacity-60" style={{ background: "conic-gradient(from 0deg, rgba(240,90,26,.5), transparent 70%)" }} />
                <svg viewBox="0 0 80 80" className="rotate-[-90deg] relative z-[1] w-full h-full" aria-hidden="true">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="var(--border)" strokeWidth="5" />
                  <circle
                    cx="40" cy="40" r="36" fill="none" stroke="url(#ringGrad)" strokeWidth="5"
                    strokeDasharray={ringCirc} strokeDashoffset={ringOffset} strokeLinecap="round"
                    style={{ filter: "drop-shadow(0 0 6px rgba(240,90,26,.55))", transition: "stroke-dashoffset .8s ease" }}
                  />
                  <defs>
                    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--orange)" />
                      <stop offset="100%" stopColor="#ff9a5c" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center z-[1]">
                  <div className="font-['Syne',sans-serif] text-base font-extrabold text-[var(--text)]">{isLoading ? "…" : `${ringPct}%`}</div>
                  <div className="font-['JetBrains_Mono',monospace] text-[7.5px] uppercase tracking-wide text-[var(--text3)]">Progress</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] font-['JetBrains_Mono',monospace] text-[10px] text-[var(--text3)] shrink-0">
        <span>futurestack</span><span className="text-[var(--border2)]">/</span>
        <span>my-dashboard</span><span className="text-[var(--border2)]">/</span>
        <span className="text-[var(--text2)]">{slug}</span>
      </div>

      {hasEnrollments ? (
        <>
          {/* ═══ KPI ROW ═══ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ animation: "fadeUp .35s ease both" }}>
            {([
              { icon: "📚", num: isLoading ? "…" : activeCourseCount.toString(), lbl: "Active Courses", accent: "orange" },
              { icon: "🏁", num: isLoading ? "…" : completedCourseCount.toString(), lbl: "Courses Completed", accent: "green" },
              { icon: "✅", num: isLoading ? "…" : totalCompleted.toString(), lbl: "Modules Done", accent: "blue" },
              { icon: "🎓", num: certLoading ? "…" : earnedCerts.length.toString(), lbl: "Certificates Earned", accent: "purple" },
            ] as const).map((k, i) => (
              <GlowCard key={k.lbl} accent={k.accent} className="p-[12px] sm:p-[16px]" style={{ animation: `fadeUp .3s ${i * 0.05}s ease both` }}>
                <div className="flex items-start gap-2 sm:gap-3">
                  <div
                    className="w-[32px] h-[32px] sm:w-[38px] sm:h-[38px] rounded-[9px] sm:rounded-[10px] flex items-center justify-center text-[14px] sm:text-[17px] shrink-0 border"
                    style={{ background: GLOW[k.accent].tint, borderColor: GLOW[k.accent].ring, boxShadow: `0 0 0 3px ${GLOW[k.accent].tint}` }}
                    aria-hidden="true"
                  >
                    {k.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="font-['Syne',sans-serif] text-[18px] sm:text-[24px] font-extrabold text-[var(--text)] leading-none tracking-tight">{k.num}</div>
                    <div className="text-[9.5px] sm:text-[10.5px] text-[var(--text2)] mt-1 sm:mt-1.5 font-medium leading-snug">{k.lbl}</div>
                  </div>
                </div>
              </GlowCard>
            ))}
          </div>

          {/* ═══ CONTINUE LEARNING + CERTIFICATES ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <SectionHeader tag="continue" title="Continue Learning" />
              <div className="flex flex-col gap-2">
                {resumeCourses.length === 0 ? (
                  <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-4 text-center font-['JetBrains_Mono',monospace] text-[10.5px] text-[var(--text3)]">
                    🎉 All caught up — every enrolled course is complete.
                  </div>
                ) : (
                  resumeCourses.map((c, i) => (
                    <Link
                      key={c.courseId}
                      href={`/my-dashboard?courseId=${c.courseId}`}
                      className="group relative overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-2.5 flex items-center gap-3 no-underline transition-all duration-300 hover:-translate-y-[2px] hover:border-[rgba(240,90,26,.4)] hover:shadow-[0_10px_24px_rgba(240,90,26,.14)]"
                      style={{ animation: `fadeUp .3s ${i * 0.05}s ease both` }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[11.5px] font-semibold text-[var(--text)] truncate">{c.title}</div>
                        <div className="font-['JetBrains_Mono',monospace] text-[9px] text-[var(--text3)] truncate mt-0.5">
                          {c.nextVideo?.title ? `▶ Next: ${c.nextVideo.title}` : "Ready to start"}
                        </div>
                        <div className="h-[3px] bg-[var(--border)] rounded-full overflow-hidden mt-1.5">
                          <div className="h-full rounded-full" style={{ width: `${c.progressPercent}%`, background: "linear-gradient(90deg,var(--orange),#ff9a5c)", boxShadow: "0 0 6px rgba(240,90,26,.5)" }} />
                        </div>
                      </div>
                      <span className="font-['Syne',sans-serif] text-[13px] font-extrabold text-[var(--orange)] shrink-0">{c.progressPercent}%</span>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div>
              <SectionHeader
                tag="certs"
                title="Recently Earned"
                action={<Link href="/my-dashboard?tab=certificates" className="font-['JetBrains_Mono',monospace] text-[9.5px] font-semibold text-[var(--blue2)] no-underline whitespace-nowrap">View all →</Link>}
              />
              {certLoading ? (
                <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-4 animate-pulse h-[110px]" />
              ) : earnedCerts.length === 0 ? (
                <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-4 text-center font-['JetBrains_Mono',monospace] text-[10.5px] text-[var(--text3)] leading-[1.6]">
                  🏅 Finish a course to earn your first certificate.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {earnedCerts.slice(0, 3).map((cert, i) => (
                    <div key={cert.courseId} className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-2.5 flex items-center gap-3" style={{ animation: `fadeUp .3s ${i * 0.05}s ease both` }}>
                      <div className="w-[36px] h-[36px] rounded-[9px] flex items-center justify-center text-[16px] shrink-0 border" style={{ background: "var(--green-d)", borderColor: "rgba(34,197,94,.4)" }} aria-hidden="true">🎓</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold text-[var(--text)] truncate">{cert.courseTitle}</div>
                        <div className="font-['JetBrains_Mono',monospace] text-[8.5px] text-[var(--text3)] mt-0.5">
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
              title="Order History"
              action={successfulOrders.length > 5 ? <span className="font-['JetBrains_Mono',monospace] text-[9px] text-[var(--text3)] whitespace-nowrap">{successfulOrders.length} total</span> : undefined}
            />
            {ordersLoading ? (
              <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-4 animate-pulse h-[90px]" />
            ) : successfulOrders.length === 0 ? (
              <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-4 text-center font-['JetBrains_Mono',monospace] text-[10.5px] text-[var(--text3)]">
                No successful orders yet.
              </div>
            ) : (
              <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                {successfulOrders.slice(0, 5).map((order, i) => {
                  const label = order.items.map((it) => it.course?.title ?? it.project?.name ?? "Item").join(", ");
                  return (
                    <div
                      key={order.id}
                      className="flex items-center flex-wrap gap-x-3 gap-y-1.5 px-3 sm:px-3.5 py-2.5 border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[var(--bg2)]"
                      style={{ animation: `fadeUp .3s ${i * 0.04}s ease both` }}
                    >
                      <div className="w-[28px] h-[28px] sm:w-[30px] sm:h-[30px] rounded-[8px] flex items-center justify-center text-[12px] sm:text-[13px] shrink-0 border" style={{ background: "var(--green-d)", borderColor: "rgba(34,197,94,.4)" }} aria-hidden="true">✓</div>
                      <div className="flex-1 min-w-[120px]">
                        <div className="text-[11px] font-semibold text-[var(--text)] truncate">{label}</div>
                        <div className="font-['JetBrains_Mono',monospace] text-[8.5px] text-[var(--text3)] mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-auto shrink-0 pl-[36px] sm:pl-0">
                        <span className="font-['Syne',sans-serif] text-[12px] sm:text-[12.5px] font-extrabold text-[var(--green)] whitespace-nowrap">{formatMoney(order.totalAmount, order.currency)}</span>
                        <span className="font-['JetBrains_Mono',monospace] text-[8px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: "var(--green-d)", color: "var(--green)" }}>Paid</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ═══ KEEP EXPLORING ═══ */}
          <div>
            <SectionHeader tag="explore" title="Keep Exploring" action={<Link href="/courses" className="font-['JetBrains_Mono',monospace] text-[9.5px] font-semibold text-[var(--blue2)] no-underline whitespace-nowrap">Full Catalog →</Link>} />
            <CourseRecommendations courses={featuredCourses ?? []} isLoading={featuredLoading} size="compact" />
          </div>
        </>
      ) : (
        <>
          {/* ═══ GET STARTED — zero-enrollment onboarding ═══ */}
          <div>
            <SectionHeader tag="start" title="Get Started" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                { step: "1", icon: "🔍", title: "Pick a course", desc: "Browse our catalog and find a course that matches your goals.", accent: "orange" },
                { step: "2", icon: "🎟️", title: "Enroll", desc: "Sign up for the course — instant access to all videos and quizzes.", accent: "blue" },
                { step: "3", icon: "📈", title: "Track progress", desc: "Come back here to resume lessons and see your progress grow.", accent: "green" },
              ] as const).map((s, i) => (
                <GlowCard key={s.step} accent={s.accent} className="p-4" >
                  <div style={{ animation: `fadeUp .35s ${i * 0.06}s ease both` }}>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span
                        className="w-[26px] h-[26px] rounded-full font-['JetBrains_Mono',monospace] text-[10.5px] font-bold flex items-center justify-center shrink-0 border"
                        style={{ background: GLOW[s.accent].tint, color: GLOW[s.accent].accent, borderColor: GLOW[s.accent].ring }}
                        aria-hidden="true"
                      >
                        {s.step}
                      </span>
                      <span className="text-[14px]" aria-hidden="true">{s.icon}</span>
                      <span className="text-[12px] font-bold text-[var(--text)]">{s.title}</span>
                    </div>
                    <div className="text-[10.5px] text-[var(--text3)] leading-[1.55]">{s.desc}</div>
                  </div>
                </GlowCard>
              ))}
            </div>
          </div>

          {/* Certificates you could earn */}
          {!certLoading && lockedCerts.length > 0 && (
            <div>
              <SectionHeader tag="certs" title="Certificates You Could Earn" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {lockedCerts.slice(0, 6).map((cert, i) => (
                  <div
                    key={cert.courseId}
                    className="relative overflow-hidden rounded-[12px] border border-dashed border-[var(--border2)] bg-[var(--card)] p-3.5 flex flex-col items-center text-center gap-1.5 transition-all hover:border-[var(--orange)] hover:-translate-y-0.5"
                    style={{ animation: `fadeUp .3s ${i * 0.05}s ease both` }}
                  >
                    <div className="text-[22px] opacity-80" aria-hidden="true">🔒</div>
                    <div className="text-[10.5px] font-semibold text-[var(--text2)] leading-[1.3]">{cert.courseTitle}</div>
                    <div className="font-['JetBrains_Mono',monospace] text-[8px] uppercase tracking-wide text-[var(--text3)]">{cert.category}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended courses — primary content for empty state */}
          <div>
            <SectionHeader tag="recommended" title="Popular Courses to Start With" action={<Link href="/courses" className="font-['JetBrains_Mono',monospace] text-[9.5px] font-semibold text-[var(--blue2)] no-underline whitespace-nowrap">Full Catalog →</Link>} />
            {!featuredLoading && (featuredCourses ?? []).length === 0 ? (
              <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-6 text-center font-['JetBrains_Mono',monospace] text-[10.5px] text-[var(--text3)]">
                No featured courses right now — <Link href="/courses" className="text-[var(--blue2)]">browse the full catalog →</Link>
              </div>
            ) : (
              <CourseRecommendations courses={featuredCourses ?? []} isLoading={featuredLoading} size="large" />
            )}
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
