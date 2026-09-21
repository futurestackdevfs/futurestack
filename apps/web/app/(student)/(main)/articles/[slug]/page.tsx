import ReactMarkdown from "react-markdown";
import { notFound } from "next/navigation";
import { Metadata } from "next";

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

type PageProps = { params: Promise<{ slug: string }> };

async function fetchPost(slug: string): Promise<BlogPost | null> {
  const res = await fetch(`${BACKEND}/articles/${slug}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
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
  const post = await fetchPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="prose max-w-none text-[var(--text)] antialiased">
      <h1 className="text-4xl font-bold text-[var(--text)] mb-4">{post.title}</h1>

      {post.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6 text-[11px] text-[var(--text2)]">
          {post.tags.map((tag) => (
            <span key={tag} className="border rounded px-2 py-1 bg-[var(--bg)]">
              {tag}
            </span>
          ))}
        </div>
      )}

      {post.publishedAt && (
        <p className="text-[11px] text-[var(--text3)] mb-6">
          · {new Date(post.publishedAt).toLocaleDateString()}
        </p>
      )}

      <p className="text-[12px] text-[var(--text3)] mb-8">
        {post.metaDescription}
      </p>

      <ReactMarkdown>{post.content}</ReactMarkdown>
    </div>
  );
}
