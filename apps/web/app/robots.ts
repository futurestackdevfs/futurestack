import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Served at /robots.txt. Blocks only areas that have no search value or are
 * not public (API, staff console, auth callbacks, payment pages). Account pages
 * (dashboard, cart, order history, profile) are NOT blocked here on purpose:
 * they carry `noindex`, and a crawler can only honour `noindex` on a page it is
 * allowed to fetch.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/ops/", "/auth/", "/pay/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
