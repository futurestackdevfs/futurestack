import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { articleMarkdownComponents, readingTime } from "@/lib/article-markdown";

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
  page: number;
  limit: number;
  totalPages: number;
}

const BACKEND = process.env.API_URL ?? "http://localhost:3002";

const TAG_PALETTE = ["--orange", "--blue", "--purple", "--pink", "--amber", "--green"] as const;
function tagColor(tag: string) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  return TAG_PALETTE[h % TAG_PALETTE.length];
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function TagChip({ tag }: { tag: string }) {
  const c = tagColor(tag);
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wide break-words max-w-full"
      style={{ background: `var(${c}-d)`, color: `var(${c})` }}
    >
      {tag}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-5 md:px-8 py-16 sm:py-20 md:py-24 text-center">
      <div
        className="mx-auto w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-xl sm:text-2xl mb-4"
        style={{ background: "var(--orange-d)" }}
      >
        📰
      </div>
      <p className="text-[13.5px] sm:text-[14px] font-medium break-words" style={{ color: "var(--text2)" }}>{message}</p>
    </div>
  );
}

export default async function ArticlesPage() {
  const res = await fetch(`${BACKEND}/articles?limit=20`, { next: { revalidate: 60 } });

  if (!res.ok) {
    return (
      <>
        <PageHero />
        <EmptyState message="Failed to load articles. Please try again later." />
      </>
    );
  }

  const body: ArticlesResponse = await res.json();
  const data: BlogPost[] = Array.isArray(body) ? body : body?.data ?? [];

  if (!data || data.length === 0) {
    return (
      <>
        <PageHero />
        <EmptyState message="No articles published yet — check back soon." />
      </>
    );
  }

  const [latest, ...rest] = data;
  const recent = rest.slice(0, 4);

  // The list endpoint doesn't return full body content (keeps the listing
  // payload small) — fetch the latest article's full content separately so
  // it can be read in full right here, instead of just a teaser + link.
  const featuredRes = await fetch(`${BACKEND}/articles/${latest.slug}`, { next: { revalidate: 60 } });
  const featured: BlogPost = featuredRes.ok ? await featuredRes.json() : latest;
  const featuredDate = featured.publishedAt ? formatDate(featured.publishedAt) : formatDate(featured.createdAt);

  // Full class strings (not built dynamically) so Tailwind can detect them.
  // 1 col on mobile → 2 cols from sm → final column count depends on how many cards exist.
  const recentGridCols =
    recent.length >= 4
      ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
      : recent.length === 3
        ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2";

  return (
    <>
      <PageHero count={body.total ?? data.length} />

      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-5 md:px-8 pb-12 sm:pb-16 md:pb-20 overflow-x-hidden">
        {/* ── Latest article, shown in full ────────────────────────── */}
        <div
          className="rounded-2xl sm:rounded-3xl overflow-hidden relative mb-8 sm:mb-10 md:mb-14 w-full max-w-full"
          style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}
        >
          <div
            className="h-2"
            style={{ background: "linear-gradient(90deg, var(--orange), var(--orange2))" }}
          />
          <div className="p-4 sm:p-6 md:p-10 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-4">
              <span
                className="px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider text-white"
                style={{ background: "var(--orange)" }}
              >
                Latest
              </span>
              {featured.tags?.slice(0, 3).map((tag) => <TagChip key={tag} tag={tag} />)}
            </div>

            <h2
              className="text-[22px] sm:text-[28px] md:text-[36px] font-bold leading-tight mb-4 break-words"
              style={{ color: "var(--text)" }}
            >
              {featured.title}
            </h2>

            <div
              className="flex items-center flex-wrap gap-x-4 gap-y-2 text-[12px] sm:text-[12.5px] font-medium pb-5 sm:pb-6 mb-6 sm:mb-8"
              style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}
            >
              <span className="inline-flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
                </svg>
                {featuredDate}
              </span>
              {featured.content && (
                <>
                  <span className="w-1 h-1 rounded-full" style={{ background: "var(--border2)" }} />
                  <span className="inline-flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {readingTime(featured.content)} min read
                  </span>
                </>
              )}
            </div>

            {featured.content ? (
              <div className="min-w-0 max-w-full break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_img]:max-w-full [&_img]:h-auto [&_iframe]:max-w-full [&_video]:max-w-full">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={articleMarkdownComponents}>
                  {featured.content}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-[14px] md:text-[15.5px] leading-relaxed max-w-[720px] break-words" style={{ color: "var(--text2)" }}>
                {featured.metaDescription}
              </p>
            )}
          </div>
        </div>

        {/* ── Recent: next 4 ───────────────────────────────────────── */}
        {recent.length > 0 && (
          <>
            <div className="flex items-center gap-3 mb-5 sm:mb-6">
              <h3 className="text-[16px] sm:text-[18px] font-bold" style={{ color: "var(--text)" }}>Recent articles</h3>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            </div>

            <div className={`grid ${recentGridCols} gap-4 sm:gap-5`}>
              {recent.map((post) => (
                <Link
                  key={post.id}
                  href={`/articles/${post.slug}`}
                  className="group flex flex-col min-w-0 rounded-2xl overflow-hidden transition-all hover:-translate-y-1"
                  style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}
                >
                  <div className="h-1" style={{ background: `var(${tagColor(post.tags?.[0] ?? post.slug)})` }} />
                  <div className="p-4 sm:p-5 flex flex-col gap-3 flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1.5">
                      {post.tags?.slice(0, 2).map((tag) => <TagChip key={tag} tag={tag} />)}
                    </div>
                    <h4
                      className="text-[15px] font-bold leading-snug line-clamp-2 break-words transition-colors group-hover:text-[var(--orange)]"
                      style={{ color: "var(--text)" }}
                    >
                      {post.title}
                    </h4>
                    <p className="text-[12.5px] leading-relaxed line-clamp-2 break-words" style={{ color: "var(--text3)" }}>
                      {post.metaDescription}
                    </p>
                    <div className="mt-auto pt-2 flex items-center gap-1.5 text-[11px] font-medium" style={{ color: "var(--muted)" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
                      </svg>
                      {post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function PageHero({ count }: { count?: number }) {
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{ background: "radial-gradient(ellipse 900px 400px at 50% -10%, var(--orange-d), transparent)" }}
      />
      <div className="mx-auto max-w-[1240px] px-4 sm:px-5 md:px-8 pt-10 pb-8 sm:pt-14 sm:pb-10 md:pt-20 md:pb-14 text-center">
        <span
          className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-4"
          style={{ background: "var(--orange-d)", color: "var(--orange)" }}
        >
          FutureStack Blog
        </span>
        <h1
          className="text-[26px] sm:text-[30px] md:text-[44px] font-bold leading-tight mb-3 break-words"
          style={{ color: "var(--text)" }}
        >
          Articles &amp; Engineering Notes
        </h1>
        <p className="text-[14px] md:text-[15.5px] max-w-[560px] mx-auto leading-relaxed" style={{ color: "var(--text2)" }}>
          Practical, no-fluff writing on software engineering — for working and aspiring developers.
          {typeof count === "number" && count > 0 && (
            <span style={{ color: "var(--muted)" }}> {count} article{count === 1 ? "" : "s"} and counting.</span>
          )}
        </p>
      </div>
    </section>
  );
}