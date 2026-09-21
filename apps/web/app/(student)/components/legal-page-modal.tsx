"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/app/auth/hooks/use-auth";
import { showToast } from "@/lib/toast";

/**
 * Global legal/info document popup. Mounted once in the root layout so it's
 * reachable from both student pages and the staff-login page. Opens when any
 * `<a href="#legal:<slug>">` on the page is clicked, e.g. `#legal:terms`.
 */

interface LegalPageData {
  slug: string;
  title: string;
  content: string;
  updatedAt: string;
}

// The sitemap is a static, hand-maintained index of real site routes — not
// admin-editable content, so it never hits the backend or renders as markdown.
// Update this list when top-level routes change.
interface SitemapLink { label: string; href: string; desc: string; authRequired?: boolean }
interface SitemapSection { title: string; icon: string; accent: "orange" | "blue" | "green" | "purple"; links: SitemapLink[] }

const SITEMAP_SECTIONS: SitemapSection[] = [
  {
    title: "Main", icon: "🧭", accent: "orange",
    links: [
      { label: "Home", href: "/", desc: "Landing page" },
      { label: "Courses", href: "/courses", desc: "Full catalog" },
      { label: "Live Projects", href: "/live-projects", desc: "Hands-on builds" },
      { label: "About", href: "/about", desc: "Who we are" },
      { label: "Articles", href: "/articles", desc: "Blog & guides" },
    ],
  },
  {
    title: "Student", icon: "🎓", accent: "blue",
    links: [
      { label: "My Dashboard", href: "/my-dashboard", desc: "Your learning hub", authRequired: true },
      { label: "Certificates", href: "/certificates", desc: "Earned & in-progress", authRequired: true },
      { label: "Order History", href: "/order-history", desc: "Past purchases", authRequired: true },
      { label: "Profile", href: "/profile", desc: "Account settings", authRequired: true },
      { label: "Cart", href: "/cart", desc: "Checkout", authRequired: true },
    ],
  },
  {
    title: "Company", icon: "🏢", accent: "purple",
    links: [
      { label: "Careers", href: "/careers", desc: "Join the team" },
      { label: "Research & Development", href: "/research-and-development", desc: "What we're building" },
    ],
  },
  {
    title: "Support", icon: "🆘", accent: "green",
    links: [
      { label: "Help Center", href: "/support", desc: "Get assistance" },
      { label: "FAQs", href: "/faq", desc: "Common questions" },
    ],
  },
];

const GLOW: Record<SitemapSection["accent"], { fg: string; tint: string; ring: string }> = {
  orange: { fg: "var(--orange)", tint: "var(--orange-d)", ring: "rgba(240,90,26,.45)" },
  blue: { fg: "var(--blue2)", tint: "var(--blue-d)", ring: "rgba(59,130,246,.45)" },
  green: { fg: "var(--green)", tint: "var(--green-d)", ring: "rgba(34,197,94,.4)" },
  purple: { fg: "var(--purple)", tint: "var(--purple-d)", ring: "rgba(167,139,250,.45)" },
};

const STATIC_PAGES: Record<string, LegalPageData> = {
  sitemap: { slug: "sitemap", title: "Sitemap", content: "", updatedAt: "" },
};

function SitemapGrid({ onNavigate, isAuthenticated, onBlocked }: { onNavigate: () => void; isAuthenticated: boolean; onBlocked: () => void }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -top-4 left-1/4 w-[220px] h-[220px] rounded-full blur-[90px] opacity-[0.08] -z-10" style={{ background: "var(--orange)" }} />
      <div className="pointer-events-none absolute top-1/3 right-0 w-[200px] h-[200px] rounded-full blur-[90px] opacity-[0.07] -z-10" style={{ background: "var(--blue2)" }} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SITEMAP_SECTIONS.map((section, si) => {
          const g = GLOW[section.accent];
          return (
            <div
              key={section.title}
              className="group relative overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-[3px] hover:border-[var(--border2)]"
              style={{ animation: `legal-fade-up .35s ${si * 0.06}s ease both` }}
            >
              <div className="pointer-events-none absolute -top-10 -right-10 w-[120px] h-[120px] rounded-full blur-[38px] opacity-0 group-hover:opacity-60 transition-opacity duration-500" style={{ background: g.ring }} />
              <div className="relative z-[1] p-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <span
                    className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center text-[14px] shrink-0 border"
                    style={{ background: g.tint, borderColor: g.ring }}
                    aria-hidden="true"
                  >
                    {section.icon}
                  </span>
                  <span className="font-['Syne',sans-serif] text-[13.5px] font-bold tracking-tight" style={{ color: "var(--text)" }}>{section.title}</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-[var(--border2)] to-transparent" />
                </div>
                <div className="flex flex-col gap-1">
                  {section.links.map((link) => {
                    const locked = link.authRequired && !isAuthenticated;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={(e) => {
                          if (locked) {
                            e.preventDefault();
                            onBlocked();
                            return;
                          }
                          onNavigate();
                        }}
                        className="group/link flex items-center justify-between gap-2 px-2.5 py-2 rounded-[8px] no-underline transition-all hover:bg-[var(--bg2)]"
                        style={locked ? { opacity: 0.6 } : undefined}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="text-[12px] font-semibold truncate" style={{ color: "var(--text)" }}>{link.label}</div>
                            {locked && <span className="text-[9px] shrink-0" aria-hidden="true">🔒</span>}
                          </div>
                          <div className="font-['JetBrains_Mono',monospace] text-[9px] truncate" style={{ color: "var(--text3)" }}>
                            {locked ? "Login required" : link.desc}
                          </div>
                        </div>
                        <span
                          className="shrink-0 text-[11px] opacity-0 group-hover/link:opacity-100 group-hover/link:translate-x-0.5 transition-all"
                          style={{ color: g.fg }}
                          aria-hidden="true"
                        >
                          →
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes legal-fade-up { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  );
}

export function LegalPageModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [page, setPage] = useState<LegalPageData | null>(null);
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href^="#legal:"]') as HTMLAnchorElement | null;
      if (!a) return;
      e.preventDefault();
      const href = a.getAttribute("href") || "";
      const slug = href.slice("#legal:".length);
      if (!slug) return;

      const staticPage = STATIC_PAGES[slug];
      if (staticPage) {
        setOpen(true);
        setLoading(false);
        setNotFound(false);
        setPage(staticPage);
        return;
      }

      setOpen(true);
      setLoading(true);
      setNotFound(false);
      setPage(null);

      fetch(`/api/legal-pages/${slug}`)
        .then(async (res) => {
          if (res.status === 404) {
            setNotFound(true);
            return;
          }
          if (!res.ok) throw new Error("Failed to load page");
          const data = (await res.json()) as LegalPageData;
          setPage(data);
        })
        .catch(() => setNotFound(true))
        .finally(() => setLoading(false));
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const isSitemap = page?.slug === "sitemap";

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-[rgba(6,10,20,.6)] p-4 backdrop-blur-[3px]"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div
        className="flex flex-col overflow-hidden rounded-[18px] shadow-[var(--shadow-lg)]"
        style={{
          width: "80vw",
          maxWidth: "96vw",
          maxHeight: "80vh",
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="relative overflow-hidden px-6 pb-4 pt-6 text-white shrink-0" style={{ background: "linear-gradient(135deg, #0b1120 0%, #1a1030 100%)" }}>
          <div className="pointer-events-none absolute -right-5 -top-10 h-[160px] w-[160px] rounded-full" style={{ background: "radial-gradient(circle, rgba(255,106,26,.4) 0%, transparent 70%)" }} />
          <div className="pointer-events-none absolute -left-10 bottom-[-40px] h-[140px] w-[140px] rounded-full" style={{ background: "radial-gradient(circle, rgba(59,130,246,.3) 0%, transparent 70%)" }} />
          <button
            onClick={() => setOpen(false)}
            className="absolute right-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-[14px] text-white"
            aria-label="Close"
          >
            ✕
          </button>
          <h2 className="relative text-[19px] font-bold leading-[1.25] mb-1">
            {page?.title ?? (loading ? "Loading…" : "Document")}
          </h2>
          {isSitemap ? (
            <p className="relative text-[12px] leading-[1.5]" style={{ color: "#9ba8be" }}>
              Every section of FutureStack, one click away
            </p>
          ) : page?.updatedAt ? (
            <p className="relative text-[12px] leading-[1.5]" style={{ color: "#9ba8be" }}>
              Last updated {new Date(page.updatedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            </p>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <p className="text-[13px] text-[var(--muted)]">Loading…</p>
          ) : notFound ? (
            <p className="text-[13px] text-[var(--muted)]">This page hasn&apos;t been published yet.</p>
          ) : isSitemap ? (
            <SitemapGrid
              onNavigate={() => setOpen(false)}
              isAuthenticated={isAuthenticated}
              onBlocked={() => {
                showToast("Please log in to access this page");
                setOpen(false);
                router.push("/");
              }}
            />
          ) : page ? (
            <div className="prose prose-sm max-w-none text-[13px] leading-[1.7] text-[var(--text)]">
              <ReactMarkdown>{page.content}</ReactMarkdown>
            </div>
          ) : null}
        </div>

        <div className="px-6 py-4 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={() => setOpen(false)}
            className="h-10 px-6 rounded-lg bg-[var(--bg2)] border border-[var(--border)] text-[13px] font-semibold text-[var(--text)] hover:border-[var(--border2)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
