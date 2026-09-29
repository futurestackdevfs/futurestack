import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { articleMarkdownComponents, readingTime } from "@/lib/article-markdown";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  metaDescription: string;
  tags: string[];
  sourceTopic?: string | null;
  publishedAt?: string | null;
  createdAt: string;
}

const BACKEND = process.env.API_URL ?? "http://localhost:3002";

const TAG_PALETTE = ["--orange", "--blue", "--purple", "--pink", "--amber", "--green"] as const;
function tagColor(tag: string) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  return TAG_PALETTE[h % TAG_PALETTE.length];
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

type PageProps = { params: Promise<{ slug: string }> };

async function fetchPost(slug: string): Promise<BlogPost | null> {
  const res = await fetch(`${BACKEND}/articles/${slug}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

async function fetchMore(excludeSlug: string): Promise<BlogPost[]> {
  const res = await fetch(`${BACKEND}/articles?limit=6`, { cache: "no-store" });
  if (!res.ok) return [];
  const body = await res.json();
  const data: BlogPost[] = Array.isArray(body) ? body : body?.data ?? [];
  return data.filter((p) => p.slug !== excludeSlug).slice(0, 5);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.metaDescription,
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://your-domain.com"}/articles/${post.slug}`,
    },
    twitter: {
      card: "summary",
      title: post.title,
      description: post.metaDescription,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const [post, more] = await Promise.all([fetchPost(slug), fetchMore(slug)]);

  if (!post) {
    notFound();
  }

  const date = post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt);

  return (
    <article className="relative">
      <div
        className="absolute inset-0 -z-10 h-[320px]"
        style={{ background: "radial-gradient(ellipse 900px 320px at 50% -10%, var(--orange-d), transparent)" }}
      />

      <div className="mx-auto max-w-[1240px] px-4 sm:px-5 md:px-8 pt-8 sm:pt-10 pb-16 md:pb-20 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-8 md:gap-10 xl:gap-16 items-start">
      <div className="min-w-0 max-w-[760px] w-full mx-auto xl:mx-0">
        <Link
          href="/articles"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-8 transition-colors hover:opacity-75"
          style={{ color: "var(--orange)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All articles
        </Link>

        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wide"
                style={{ background: `var(${tagColor(tag)}-d)`, color: `var(${tagColor(tag)})` }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <h1 className="text-[24px] sm:text-[28px] md:text-[38px] font-bold leading-tight mb-5 break-words" style={{ color: "var(--text)" }}>
          {post.title}
        </h1>

        <p className="text-[14px] sm:text-[15px] md:text-[16px] leading-relaxed mb-6 break-words" style={{ color: "var(--text2)" }}>
          {post.metaDescription}
        </p>

        <div
          className="flex items-center gap-4 flex-wrap text-[12.5px] font-medium pb-7 mb-9"
          style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}
        >
          <span className="inline-flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
            </svg>
            {date}
          </span>
          <span className="w-1 h-1 rounded-full" style={{ background: "var(--border2)" }} />
          <span className="inline-flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {readingTime(post.content)} min read
          </span>
        </div>

        <div className="min-w-0">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={articleMarkdownComponents}>
            {post.content}
          </ReactMarkdown>
        </div>

        <div className="mt-14 pt-8 flex justify-center xl:hidden" style={{ borderTop: "1px solid var(--border)" }}>
          <Link
            href="/articles"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold text-white transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--orange)" }}
          >
            ← Browse more articles
          </Link>
        </div>
      </div>

      <ArticleSidebar more={more} />
      </div>
    </article>
  );
}

function ArticleSidebar({ more }: { more: BlogPost[] }) {
  return (
    <aside className="hidden xl:flex flex-col gap-6 sticky top-[76px]">
      {more.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h3 className="text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--text)" }}>More articles</h3>
          </div>
          <div className="flex flex-col">
            {more.map((p) => (
              <Link
                key={p.id}
                href={`/articles/${p.slug}`}
                className="group px-5 py-3.5 flex flex-col gap-1 transition-colors hover:bg-[var(--card-hover)]"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <span
                  className="text-[13px] font-semibold leading-snug line-clamp-2 transition-colors group-hover:text-[var(--orange)]"
                  style={{ color: "var(--text)" }}
                >
                  {p.title}
                </span>
                <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>
                  {formatDate(p.publishedAt ?? p.createdAt)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Link
        href="/articles"
        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[13px] font-bold text-white transition-transform hover:-translate-y-0.5"
        style={{ background: "var(--orange)" }}
      >
        ← Browse all articles
      </Link>
    </aside>
  );
}
