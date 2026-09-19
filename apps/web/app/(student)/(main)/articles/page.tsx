import Link from "next/link";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  metaDescription: string;
  tags: string[];
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

export default async function ArticlesPage() {
  const res = await fetch(`${BACKEND}/articles?limit=20`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return (
      <div className="py-12 text-center text-[var(--text3)]">
        Failed to load blog posts. Please try again later.
      </div>
    );
  }

  const body: ArticlesResponse = await res.json();
  const data: BlogPost[] = Array.isArray(body) ? body : body?.data ?? [];

  if (!data || data.length === 0) {
    return (
      <div className="py-12 text-center text-[var(--text3)]">
        No blog posts found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
      {data.map((post: BlogPost) => {
        return (
          <article
            key={post.id}
            className="group border rounded-xl overflow-hidden hover:shadow-[0_4px_12px_rgba(0,0,0,.15)] transition-shadow"
          >
            <h3 className="text-[16px] font-medium text-[var(--text)] truncate line-clamp-2 group-hover:line-clamp-3">
              <Link
                href={`/articles/${post.slug}`}
                className="text-[var(--text)] hover:underline transition-colors"
              >
                {post.title}
              </Link>
            </h3>

            <p className="text-[12px] text-[var(--text3)] line-clamp-3 mt-1">
              {post.metaDescription}
            </p>

            <div className="flex items-center gap-2 mt-2 text-[11px] text-[var(--text2)]">
              {post.tags?.map((tag) => (
                <span key={tag} className="border rounded px-1.5 py-0.5 bg-[var(--bg)]">{tag}</span>
              ))}
              {post.publishedAt && (
                <span>
                  · {new Date(post.publishedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}