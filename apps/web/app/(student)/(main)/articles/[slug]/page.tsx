import React from "react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
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

export async function generateParams() {
  return []; 
}

export async function generateMetadata(
  params: { slug: string }
): Promise<Metadata> {
  const res = await fetch(`/api/articles/${params.slug}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    notFound();
  }

  const post = await res.json();

  return {
    title: post.title,
    description: post.metaDescription,
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com'}/articles/${post.slug}`,
    },
    twitter: {
      card: "summary",
      title: post.title,
      description: post.metaDescription,
    },
  };
}

export default async function BlogPostPage(
  params: { slug: string }
) {
  const res = await fetch(`/api/articles/${params.slug}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    notFound();
  }

  const post: BlogPost = await res.json();

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

      <ReactMarkdown
        components={{}}
      >
        {post.content}
      </ReactMarkdown>
    </div>
  );
}