"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import PageContentEditorModal from "./PageContentEditorModal";
import BlogManager from "./BlogManager";
import CareersManager from "./CareersManager";

interface LegalPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  updatedAt: string;
}

/** Union of the pill types this panel can switch between — a legal doc (backed
 * by LegalPage rows), or one of the two embedded sub-panels. */
type PillEntry =
  | { kind: "legal"; slug: string; page: LegalPage }
  | { kind: "articles" }
  | { kind: "careers" };

interface PagesManagerProps {
  token: string;
  searchQuery?: string;
}

function SectionHeader({
  num,
  emoji,
  title,
  desc,
  onEdit,
}: {
  num: string;
  emoji: string;
  title: string;
  desc?: string;
  onEdit: () => void;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-md flex items-center justify-center font-mono text-[11px] font-extrabold shrink-0"
            style={{ background: "var(--blue)", color: "#fff" }}
          >
            {num}
          </span>
          <span className="text-[14px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
            {emoji} {title}
          </span>
        </div>
        {desc && (
          <div className="text-[11px] mt-1 ml-8" style={{ color: "var(--muted)" }}>
            {desc}
          </div>
        )}
      </div>
      <button
        onClick={onEdit}
        className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer shrink-0"
        style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--panel)" }}
      >
        Edit
      </button>
    </div>
  );
}

const PAGE_META: Record<string, { num: string; emoji: string }> = {
  terms: { num: "01", emoji: "📄" },
  "privacy-policy": { num: "02", emoji: "🔒" },
  "refund-policy": { num: "03", emoji: "💸" },
  "cookie-policy": { num: "04", emoji: "🍪" },
};
const PAGE_ORDER = ["terms", "privacy-policy", "refund-policy", "cookie-policy"];

export default function PagesManager({ token, searchQuery = "" }: PagesManagerProps) {
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LegalPage | null>(null);
  const [activeSection, setActiveSection] = useState<string>("terms");
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "danger" }[]>([]);

  function addToast(msg: string, type: "success" | "danger" = "success") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await opsFetch("/api/admin/legal-pages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load pages");
      const data = (await res.json()) as LegalPage[];
      setPages(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : "Failed to load pages", "danger");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const q = searchQuery.trim().toLowerCase();
  const ordered = PAGE_ORDER
    .map((slug) => pages.find((p) => p.slug === slug))
    .filter((p): p is LegalPage => !!p);
  const filtered = q ? ordered.filter((p) => p.title.toLowerCase().includes(q)) : ordered;

  // The pill list is a union of legal-doc pills plus the two embedded
  // sub-panels — "articles" (BlogManager) and "careers" (CareersManager).
  // activeSection carries either a legal slug or one of these two sentinels;
  // switching just changes which content block renders below, no scrolling.
  const entries: PillEntry[] = [
    ...filtered.map((page): PillEntry => ({ kind: "legal", slug: page.slug, page })),
    { kind: "articles" },
    { kind: "careers" },
  ];
  const activeEntry: PillEntry | null =
    entries.find((e) => (e.kind === "legal" ? e.slug === activeSection : e.kind === activeSection)) ??
    entries[0] ??
    null;
  const current = activeEntry?.kind === "legal" ? activeEntry.page : null;

  if (loading) {
    return (
      <div className="p-8 text-center font-mono text-[11px]" style={{ color: "var(--text3)" }}>
        Loading pages...
      </div>
    );
  }

  return (
    <div className="p-4 pb-16 w-full">
      <div className="flex items-baseline gap-2.5 mb-4">
        <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
          📄 Pages
        </span>
        <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
          legal / info documents, published articles and open job postings — all in one place
        </span>
      </div>

      <div className="flex flex-col gap-6 w-full">
        {/* Sticky section navigation */}
        <div
          className="sticky top-0 z-20 rounded-xl px-2 py-1.5 flex flex-wrap items-center gap-1"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 4px 12px rgba(0,0,0,.06)" }}
        >
          {ordered.map((p) => {
            const meta = PAGE_META[p.slug] ?? { num: "•", emoji: "📄" };
            const isActive = activeSection === p.slug;
            return (
              <button
                key={p.slug}
                onClick={() => setActiveSection(p.slug)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[9.5px] font-bold cursor-pointer"
                style={{
                  background: isActive ? "var(--orange-d)" : "transparent",
                  color: isActive ? "var(--orange)" : "var(--text2)",
                  border: "none",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--panel)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <span className="w-4 h-4 rounded flex items-center justify-center text-[8.5px] font-extrabold" style={{ background: isActive ? "var(--orange)" : "var(--bg2)", color: isActive ? "#fff" : "var(--text3)" }}>
                  {meta.num}
                </span>
                {meta.emoji} {p.title}
              </button>
            );
          })}

          {/* Articles / Careers sub-panel pills */}
          {([
            { kind: "articles" as const, num: "05", emoji: "📝", label: "Articles" },
            { kind: "careers" as const, num: "06", emoji: "🧑‍💼", label: "Careers" },
          ]).map((p) => {
            const isActive = activeSection === p.kind;
            return (
              <button
                key={p.kind}
                onClick={() => setActiveSection(p.kind)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[9.5px] font-bold cursor-pointer"
                style={{
                  background: isActive ? "var(--orange-d)" : "transparent",
                  color: isActive ? "var(--orange)" : "var(--text2)",
                  border: "none",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--panel)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <span className="w-4 h-4 rounded flex items-center justify-center text-[8.5px] font-extrabold" style={{ background: isActive ? "var(--orange)" : "var(--bg2)", color: isActive ? "#fff" : "var(--text3)" }}>
                  {p.num}
                </span>
                {p.emoji} {p.label}
              </button>
            );
          })}
        </div>

        {activeEntry?.kind === "articles" ? (
          <section id="page-articles">
            <div className="mb-3 flex items-center gap-2 ml-8">
              <span className="text-[14px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
                📝 Articles
              </span>
            </div>
            <div className="ml-8">
              <BlogManager />
            </div>
          </section>
        ) : activeEntry?.kind === "careers" ? (
          <section id="page-careers">
            <div className="mb-3 flex items-center gap-2 ml-8">
              <span className="text-[14px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
                🧑‍💼 Careers
              </span>
            </div>
            <div className="ml-8">
              <CareersManager token={token} />
            </div>
          </section>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl p-8 text-center font-mono text-[11px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text3)" }}>
            No pages match your search.
          </div>
        ) : current ? (
          (() => {
            const meta = PAGE_META[current.slug] ?? { num: "•", emoji: "📄" };
            return (
              <section id={`page-${current.slug}`}>
                <SectionHeader
                  num={meta.num}
                  emoji={meta.emoji}
                  title={current.title}
                  desc={current.content ? `last updated ${new Date(current.updatedAt).toLocaleString()}` : "not written yet"}
                  onEdit={() => setEditing(current)}
                />
                <div
                  className="rounded-xl p-4 ml-8"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  {current.content ? (
                    <div className="prose-legal text-[12.5px] leading-relaxed" style={{ color: "var(--text2)" }}>
                      <ReactMarkdown>{current.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-[11.5px] font-mono" style={{ color: "var(--text3)" }}>
                      No content yet — click Edit to write this page.
                    </div>
                  )}
                </div>
              </section>
            );
          })()
        ) : null}
      </div>{/* end pills+content wrapper */}

      {editing && (
        <PageContentEditorModal
          token={token}
          slug={editing.slug}
          title={editing.title}
          content={editing.content}
          updatedAt={editing.updatedAt}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
            addToast("Page saved");
          }}
        />
      )}

      <div className="fixed bottom-9 right-4 flex flex-col gap-2 z-[300]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded text-[11.5px] font-semibold min-w-[220px]"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 8px 24px rgba(0,0,0,.18)",
              color: "var(--text)",
              borderLeft: `3px solid ${t.type === "success" ? "var(--green)" : "var(--red)"}`,
              animation: "toast-in .2s ease",
            }}
          >
            <span style={{ fontSize: 13 }}>{t.type === "success" ? "✓" : "✕"}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
