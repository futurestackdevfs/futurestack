"use client";

import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface FeaturedTrack {
  id: string;
  title: string;
  description: string | null;
  displayOrder: number;
  _count: { courses: number };
}

const icons = ["🌐", "📊", "🔧", "🧠", "🎨"];
const iconClasses = [
  "bg-[rgba(37,99,235,.1)] dark:bg-[rgba(59,130,246,.15)]",
  "bg-[rgba(124,58,237,.1)] dark:bg-[rgba(168,85,247,.15)]",
  "bg-[rgba(22,163,74,.1)] dark:bg-[rgba(34,197,94,.15)]",
  "bg-[rgba(240,90,26,.1)] dark:bg-[rgba(255,106,26,.15)]",
  "bg-[rgba(245,158,11,.1)] dark:bg-[rgba(250,204,21,.15)]",
];

export function CareerPaths() {
  const router = useRouter();
  const { data, isLoading } = useSWR<FeaturedTrack[]>("/api/courses/public/featured-tracks", {
    revalidateIfStale: false,
    dedupingInterval: 300_000,
  });
  const paths = (Array.isArray(data) ? data : []).slice(0, 10);

  if (!isLoading && paths.length === 0) return null;

  return (
    <section className="[animation:fadeUp_.5s_.18s_ease_both]">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="font-['Syne'] text-[17px] font-bold text-[var(--text)]">Career Paths</h2>
        <Link className="text-[12px] font-semibold text-[var(--blue)] hover:text-[var(--orange)]" href="/courses">View All</Link>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3.5 flex items-center gap-2.5 animate-pulse">
                <div className="size-9 rounded-lg bg-[var(--border)] shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 rounded bg-[var(--border)]" />
                  <div className="h-2.5 w-1/2 rounded bg-[var(--border)]" />
                </div>
              </div>
            ))
          : paths.map((p, i) => (
              <div
                key={p.id}
                onClick={() => router.push(`/courses?track=${encodeURIComponent(p.title)}`)}
                className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3.5 flex items-center gap-2.5 cursor-pointer shadow-[var(--shadow)] hover:border-[var(--orange)] hover:bg-[var(--card-hover)] hover:-translate-y-0.5"
              >
                <div className={`size-9 rounded-lg flex items-center justify-center text-[18px] shrink-0 ${iconClasses[i % iconClasses.length]}`}>
                  {icons[i % icons.length]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-bold text-[var(--text)] truncate">{p.title}</div>
                  <div className="text-[10px] text-[var(--muted)]">{p._count.courses} Course{p._count.courses === 1 ? "" : "s"}</div>
                </div>
              </div>
            ))}
      </div>
    </section>
  );
}
