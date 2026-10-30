import Link from "next/link";
import { readingTime } from "@/lib/article-markdown";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Articles",
  description:
    "Practical guides and articles on web development, data, cloud and careers from the FutureStack team.",
  path: "/articles",
});

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content?: string;
  metaDescription: string;
  tags: string[];
  sourceTopic?: string | null;
  publishedAt?: string | null;
  createdAt: string;
}

interface ArticlesResponse {
  data: BlogPost[];
  total: number;
}

type PageProps = { searchParams: Promise<{ tag?: string }> };

const BACKEND = process.env.API_URL ?? "http://localhost:3002";

// Full-width shell: fluid with generous gutters instead of a narrow fixed column.
const SHELL = "mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-10 2xl:px-14";

const TAG_PALETTE = ["--orange", "--blue", "--purple", "--pink", "--amber", "--green"] as const;
function tagColor(tag: string) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  return TAG_PALETTE[h % TAG_PALETTE.length];
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function postDate(p: BlogPost) {
  return formatDate(p.publishedAt ?? p.createdAt);
}

function TagChip({ tag }: { tag: string }) {
  const c = tagColor(tag);
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wide break-words max-w-full"
      style={{ background: `var(${c}-d)`, color: `var(${c})` }}
    >
      {tag}
    </span>
  );
}

function CalendarIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className={`${SHELL} py-20 md:py-28 text-center`}>
      <div
        className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4"
        style={{ background: "var(--orange-d)" }}
      >
        📰
      </div>
      <p className="text-[14px] font-medium break-words" style={{ color: "var(--text2)" }}>{message}</p>
    </div>
  );
}

export default async function ArticlesPage({ searchParams }: PageProps) {
  const { tag: activeTag } = await searchParams;

  const res = await fetch(`${BACKEND}/articles?limit=100`, { next: { revalidate: 60 } }).catch(() => null);

  if (!res || !res.ok) {
    return (
      <>
        <PageHero />
        <EmptyState message="Failed to load articles. Please try again later." />
      </>
    );
  }

  const body: ArticlesResponse | BlogPost[] = await res.json();
  const all: BlogPost[] = Array.isArray(body) ? body : body?.data ?? [];

  if (all.length === 0) {
    return (
      <>
        <PageHero />
        <EmptyState message="No articles published yet — check back soon." />
      </>
    );
  }

  // Tags sorted by popularity for the filter bar.
  const tagCounts = new Map<string, number>();
  for (const p of all) for (const t of p.tags ?? []) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const tags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);

  const filtered = activeTag ? all.filter((p) => p.tags?.includes(activeTag)) : all;
  // The featured hero is only used on the unfiltered view.
  const featured = activeTag ? null : filtered[0];
  const grid = featured ? filtered.slice(1) : filtered;

  return (
    <>
      <PageHero count={all.length} />

      <div className={`${SHELL} pb-14 sm:pb-20`}>
        {/* ── Tag filter ───────────────────────────────────────────── */}
        {tags.length > 0 && (
          <nav aria-label="Filter by topic" className="hidden md:flex flex-wrap items-center gap-2 mt-4 sm:mt-6 mb-6 sm:mb-8">
            <FilterPill href="/articles" label="All" active={!activeTag} />
            {tags.slice(0, 14).map((t) => (
              <FilterPill key={t} href={`/articles?tag=${encodeURIComponent(t)}`} label={t} active={activeTag === t} />
            ))}
          </nav>
        )}

        {/* ── Featured article ─────────────────────────────────────── */}
        {featured && <FeaturedCard post={featured} />}

        {/* ── All articles grid ────────────────────────────────────── */}
        {grid.length > 0 ? (
          <>
            <div className="flex items-center gap-3 mb-5 sm:mb-6">
              <h2 className="text-[17px] sm:text-[20px] font-bold" style={{ color: "var(--text)" }}>
                {activeTag ? `Articles tagged “${activeTag}”` : "More articles"}
              </h2>
              <span className="text-[12px] font-semibold" style={{ color: "var(--muted)" }}>{grid.length}</span>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
              {grid.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </>
        ) : (
          !featured && <EmptyState message={`No articles found for “${activeTag}”.`} />
        )}
      </div>
    </>
  );
}

function FilterPill({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-colors hover:opacity-85"
      style={
        active
          ? { background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }
          : { background: "var(--card)", color: "var(--text2)", border: "1px solid var(--border)" }
      }
    >
      {label}
    </Link>
  );
}

function FeaturedCard({ post }: { post: BlogPost }) {
  const accent = tagColor(post.tags?.[0] ?? post.slug);
  return (
    <Link
      href={`/articles/${post.slug}`}
      className="group grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] rounded-2xl sm:rounded-3xl overflow-hidden mb-10 sm:mb-14 transition-all hover:-translate-y-1"
      style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}
    >
      {/* Visual panel */}
      <div
        className="relative min-h-[180px] sm:min-h-[260px] lg:min-h-[340px] flex items-end p-6 sm:p-8 order-1 lg:order-2"
        style={{
          background: `radial-gradient(circle at 25% 20%, var(${accent}-d), transparent 60%), linear-gradient(135deg, var(${accent}-d), var(--card))`,
        }}
      >
        <span
          className="absolute top-5 right-5 sm:top-6 sm:right-6 text-[56px] sm:text-[88px] leading-none opacity-80 select-none"
          aria-hidden
        >
          ✍️
        </span>
        <span
          className="px-3 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider text-white"
          style={{ background: `var(${accent})` }}
        >
          Latest article
        </span>
      </div>

      {/* Text panel */}
      <div className="p-5 sm:p-8 lg:p-12 flex flex-col justify-center min-w-0 order-2 lg:order-1">
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags?.slice(0, 3).map((t) => <TagChip key={t} tag={t} />)}
        </div>
        <h2
          className="text-[22px] sm:text-[30px] xl:text-[38px] font-bold leading-tight mb-4 break-words transition-colors group-hover:text-[var(--orange)]"
          style={{ color: "var(--text)" }}
        >
          {post.title}
        </h2>
        <p
          className="text-[14px] sm:text-[15.5px] leading-relaxed mb-6 line-clamp-4 break-words"
          style={{ color: "var(--text2)" }}
        >
          {post.metaDescription}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] font-medium mb-6" style={{ color: "var(--muted)" }}>
          <span className="inline-flex items-center gap-1.5"><CalendarIcon />{postDate(post)}</span>
          {post.content && (
            <span className="inline-flex items-center gap-1.5"><ClockIcon />{readingTime(post.content)} min read</span>
          )}
        </div>
        <span className="inline-flex items-center gap-2 text-[13.5px] font-bold" style={{ color: "var(--orange)" }}>
          Read article
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </span>
      </div>
    </Link>
  );
}

function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/articles/${post.slug}`}
      className="group flex flex-col min-w-0 rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg"
      style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}
    >
      <div className="h-1.5" style={{ background: `var(${tagColor(post.tags?.[0] ?? post.slug)})` }} />
      <div className="p-5 sm:p-6 flex flex-col gap-3 flex-1 min-w-0">
        <div className="flex flex-wrap gap-1.5">
          {post.tags?.slice(0, 2).map((t) => <TagChip key={t} tag={t} />)}
        </div>
        <h3
          className="text-[16px] sm:text-[17px] font-bold leading-snug line-clamp-2 break-words transition-colors group-hover:text-[var(--orange)]"
          style={{ color: "var(--text)" }}
        >
          {post.title}
        </h3>
        <p className="text-[13px] leading-relaxed line-clamp-3 break-words" style={{ color: "var(--text3)" }}>
          {post.metaDescription}
        </p>
        <div
          className="mt-auto pt-4 flex items-center justify-between text-[11.5px] font-medium"
          style={{ color: "var(--muted)", borderTop: "1px solid var(--border)" }}
        >
          <span className="inline-flex items-center gap-1.5"><CalendarIcon size={12} />{postDate(post)}</span>
          <span className="font-bold transition-transform group-hover:translate-x-1" style={{ color: "var(--orange)" }}>
            Read →
          </span>
        </div>
      </div>
    </Link>
  );
}

function PageHero({ count }: { count?: number }) {
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{ background: "radial-gradient(ellipse 1200px 420px at 50% -10%, var(--orange-d), transparent)" }}
      />
      <div className={`${SHELL} pt-5 pb-4 sm:pt-7 sm:pb-5 md:pt-8 md:pb-6 text-center`}>
        <span
          className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2"
          style={{ background: "var(--orange-d)", color: "var(--orange)" }}
        >
          FutureStack Articles
        </span>
        <h1
          className="text-[28px] sm:text-[36px] md:text-[52px] font-bold leading-tight mb-1.5 break-words"
          style={{ color: "var(--text)" }}
        >
          Articles &amp; Engineering Notes
        </h1>
        <p className="hidden md:block text-[14px] md:text-[16px] max-w-[640px] mx-auto leading-relaxed" style={{ color: "var(--text2)" }}>
          Practical, no-fluff writing on software engineering — for working and aspiring developers.
          {typeof count === "number" && count > 0 && (
            <span style={{ color: "var(--muted)" }}> {count} article{count === 1 ? "" : "s"} and counting.</span>
          )}
        </p>
      </div>
    </section>
  );
}
