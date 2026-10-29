import type { Metadata } from "next";

export const SITE_URL = "https://www.futurestack.co.in";
export const SITE_NAME = "FutureStack";
export const DEFAULT_OG_IMAGE = "/images/logo.png";

/** Search engines show roughly 155–160 characters of a description. */
export function clampDescription(text: string | null | undefined, max = 158): string | undefined {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return undefined;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.-]+$/, "") + "…";
}

interface PageMetaInput {
  title: string;
  description: string;
  /** Path starting with "/", e.g. "/courses". Becomes the canonical URL. */
  path: string;
  /** Absolute URL or site-relative path. Falls back to the site logo. */
  image?: string | null;
  /** Use the title exactly as given (no " | FutureStack" suffix). */
  absoluteTitle?: boolean;
  /** Keep the page out of search results (private / account pages). */
  noIndex?: boolean;
  ogType?: "website" | "article";
}

/**
 * One place that builds a page's title, description, canonical, Open Graph and
 * Twitter tags, so every page gets its OWN canonical instead of inheriting the
 * homepage's. (Next.js replaces — not merges — nested `openGraph`/`twitter`
 * objects, so each page must supply the whole set.)
 */
export function pageMetadata({
  title,
  description,
  path,
  image,
  absoluteTitle,
  noIndex,
  ogType = "website",
}: PageMetaInput): Metadata {
  const desc = clampDescription(description) ?? description;
  const hasOwnImage = !!image;
  const ogImage = image || DEFAULT_OG_IMAGE;
  const fullTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: desc,
    alternates: { canonical: path },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type: ogType,
      url: path,
      siteName: SITE_NAME,
      locale: "en_IN",
      title: fullTitle,
      description: desc,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: hasOwnImage ? "summary_large_image" : "summary",
      title: fullTitle,
      description: desc,
      images: [ogImage],
    },
  };
}

/** Metadata for account / checkout pages that should never appear in search. */
export function privatePageMetadata(title: string): Metadata {
  return {
    title,
    robots: { index: false, follow: false },
  };
}

/** Serialises JSON-LD safely for an inline <script> (a "<" in text can't close the tag). */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
