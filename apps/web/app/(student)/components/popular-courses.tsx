"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";

interface FeaturedCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  price: number;
  techStack: string[];
  displayOrder: number;
  trainer: { name: string } | null;
  totalVideos: number;
  durationHours: number;
  careerTitle: string | null;
  careerBody: string | null;
  badge: string | null;
  badgeClass: string;
}

const fallbackGradient = "linear-gradient(135deg,#0d1f3c,#0a2a1a)";

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function PopularCourses() {
  const router = useRouter();
  const { data, isLoading } = useSWR<FeaturedCourse[]>("/api/courses/public/featured-courses");
  const courses = (Array.isArray(data) ? data : []).slice(0, 10);

  if (!isLoading && courses.length === 0) return null;

  return (
    <section className="[animation:fadeUp_.5s_.13s_ease_both]">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="font-['Syne'] text-[17px] font-bold text-[var(--text)]">Popular Courses</h2>
        <a className="text-[12px] font-semibold text-[var(--blue)] hover:text-[var(--orange)]" href="/courses">View All</a>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-[28/9] w-full" style={{ background: fallbackGradient }} />
                <div className="p-3 space-y-2">
                  <div className="h-3 w-2/3 rounded bg-[var(--border)]" />
                  <div className="h-2.5 w-1/2 rounded bg-[var(--border)]" />
                </div>
              </div>
            ))
          : courses.map((c) => (
              <div key={c.id} onClick={() => router.push(`/courses/${slugify(c.title)}`)} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden cursor-pointer shadow-[var(--shadow)] hover:-translate-y-1 hover:border-[rgba(37,99,235,.3)] hover:shadow-[var(--shadow-lg)] group">
                <div className="relative aspect-[16/7] w-full overflow-hidden rounded-[18px_18px_0_0] bg-[var(--bg2)]">
                  {c.thumbnailUrl ? (
                    <div className="absolute inset-0">
                      <img src={c.thumbnailUrl} alt={c.title} className="h-full w-full object-cover transition-transform duration-[0.45s] group-hover:scale-[1.06]" />
                    </div>
                  ) : <div className="absolute inset-0" style={{ background: fallbackGradient }} />}
                  {c.badge && (
                    <span className={`text-[9px] font-extrabold tracking-[.06em] uppercase px-2 py-[3px] rounded-[20px] absolute top-2 left-2 text-white shadow-[0_2px_10px_rgba(0,0,0,.25)] ${c.badgeClass}`}>
                      {c.badge}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-[13px] font-bold text-[var(--text)] mb-[3px] truncate">{c.title}</div>
                  {c.techStack?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {c.techStack.slice(0, 3).map((t) => (
                        <span key={t} className="text-[9px] font-semibold px-1.5 py-[2px] rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text2)]">{t}</span>
                      ))}
                    </div>
                  )}
                  {c.careerTitle && (
                    <div className="text-[10px] font-semibold text-[var(--blue)] mb-2 line-clamp-1">🎯 {c.careerTitle}</div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-[var(--border)] text-[10px] text-[var(--muted)]">
                    <span>{c.durationHours} hr{c.durationHours === 1 ? "" : "s"}</span>
                    <span className="text-[9px] bg-[var(--blue-dim)] text-[var(--blue)] px-1.5 py-0.5 rounded font-semibold dark:bg-[rgba(59,130,246,.15)]">
                      Certificate
                    </span>
                  </div>
                </div>
              </div>
            ))}
      </div>
    </section>
  );
}
