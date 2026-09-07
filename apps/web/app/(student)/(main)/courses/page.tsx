"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import { useAuth } from "@/app/auth/hooks/use-auth";
import { loadToken } from "@/app/auth/lib/token-store";
import { showToast } from "@/lib/toast";

interface CourseCard {
  id: string;
  slug: string;
  category: string;
  title: string;
  description: string;
  hours: number;
  students: string;
  level: string;
  rating: number;
  reviews: string;
  badge: string | null;
  badgeClass: string;
  mentor: string;
  mentorName: string;
  mentorColor: string;
  img: string;
  mode: string;
  goal: string;
  tech: string;
  duration: string;
  price: number;
  originalPrice: number | null;
  offPct: number;
  hasDiscount: boolean;
  techStack: string[];
  whatYoullLearn: string[];
  careerTitle: string | null;
  careerBody: string | null;
}

interface FacetOption {
  value: string;
  count: number;
}

interface Facet {
  key: string;
  title: string;
  options: FacetOption[];
}

interface CardsResponse {
  data: CourseCard[];
  total: number;
  page: number;
  perPage: number;
  facets: Facet[];
}

function buildFilters(selectedFilters: Set<string>) {
  const filters: Record<string, string[]> = {};
  for (const key of selectedFilters) {
    const [section, ...rest] = key.split("-");
    const value = rest.join("-");
    if (!filters[section]) filters[section] = [];
    filters[section].push(value);
  }
  return filters;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

interface FacetPanelProps {
  facets: Facet[];
  selectedFilters: Set<string>;
  openSection: string | null;
  onToggleSection: (key: string) => void;
  onToggleFilter: (key: string) => void;
  onClearAll: () => void;
  showClearAll: boolean;
}

function FacetPanel({
  facets,
  selectedFilters,
  openSection,
  onToggleSection,
  onToggleFilter,
  onClearAll,
  showClearAll,
}: FacetPanelProps) {
  return (
    <>
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--text2)] tracking-[.3px]">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /></svg>
          Filters
        </div>
        {showClearAll && (
          <button onClick={onClearAll} className="text-[11.5px] font-semibold text-[var(--orange)] hover:opacity-75">Clear All</button>
        )}
      </div>

      {facets.length === 0 && (
        <div className="px-1 py-2 text-[12px] text-[var(--muted)]">Loading filters…</div>
      )}

      {facets.map((s) => {
        const hasActive = [...selectedFilters].some((f) => f.startsWith(s.key + "-"));
        const open = openSection === s.key;
        return (
          <div
            key={s.key}
            className={`mb-2 overflow-hidden rounded-xl border transition-colors ${
              hasActive ? "border-[#C7D8FF]" : "border-[var(--border)]"
            }`}
            style={{ background: hasActive ? "var(--blue-dim)" : "var(--card)" }}
          >
            <button
              onClick={() => onToggleSection(s.key)}
              className={`flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left ${hasActive ? "text-[var(--blue)]" : "text-[var(--text2)]"}`}
            >
              <span className="text-[12px] font-bold uppercase tracking-[.5px]">{s.title}</span>
              <svg
                className={`h-3.5 w-3.5 shrink-0 text-[var(--muted)] transition-transform ${open ? "" : "-rotate-90"}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {open && (
              <div className="flex max-h-[240px] flex-col gap-1 overflow-y-auto overscroll-contain px-2 pb-2.5">
                {s.options.map((opt) => {
                  const key = `${s.key}-${opt.value}`;
                  const checked = selectedFilters.has(key);
                  return (
                    <div
                      key={opt.value}
                      onClick={() => onToggleFilter(key)}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${
                        checked ? "bg-[var(--blue-dim)]" : "hover:bg-[var(--bg)]"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-all ${
                          checked ? "border-[var(--blue)] bg-[var(--blue)]" : "border-[var(--border2)] bg-[var(--bg)]"
                        }`}
                      >
                        {checked && (
                          <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                        )}
                      </span>
                      <span className="flex-1 text-[13px] text-[var(--text2)]">{opt.value}</span>
                      <span className="rounded-full bg-[var(--bg)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--muted)]">{opt.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

export default function CoursesPage() {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set());
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams?.get("search");

  const [search, setSearch] = useState(urlSearch ?? "");

  useEffect(() => {
    const val = urlSearch ?? "";
    if (val !== search) {
      setSearch(val);
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearch]);
  const { mutate } = useSWRConfig();
  const [sort, setSort] = useState("Most Popular");
  const [currentPage, setCurrentPage] = useState(1);
  const [inCart, setInCart] = useState<Set<string>>(new Set());
  const [cartAction, setCartAction] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const perPage = 12;

  const seedRef = useRef(false);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(currentPage));
    p.set("perPage", String(perPage));
    if (search.trim()) p.set("search", search);
    if (sort !== "Most Popular") p.set("sort", sort);
    const filters = buildFilters(selectedFilters);
    if (Object.keys(filters).length > 0) p.set("filters", JSON.stringify(filters));
    return p.toString();
  }, [currentPage, search, sort, selectedFilters]);

  const { data, isLoading } = useSWR<CardsResponse>(
    `/api/courses/public/cards?${params}`,
    {
      keepPreviousData: true,
      // Seed filters from the URL on first load so a deep link already shows a
      // narrowed list:
      //   /courses?category=ai-ml  (dashboard "Explore" links)
      //   /courses?track=Full Stack Developer  (career paths page)
      onSuccess: (d) => {
        if (seedRef.current) return;
        const qs = new URLSearchParams(window.location.search);
        const next = new Set<string>();
        const cat = qs.get("category");
        if (cat) {
          const catFacet = d?.facets.find((f) => f.key === "category");
          const match = catFacet?.options.find((o) => {
            const a = slugify(o.value);
            const b = slugify(cat);
            return a === b || a.includes(b) || b.includes(a);
          });
          if (match) next.add(`category-${match.value}`);
        }
        const track = qs.get("track");
        if (track) {
          const trackFacet = d?.facets.find((f) => f.key === "track");
          const match = trackFacet?.options.find((o) => {
            const a = slugify(o.value);
            const b = slugify(track);
            return a === b || a.includes(b) || b.includes(a);
          });
          if (match) next.add(`track-${match.value}`);
        }
        if (next.size > 0) {
          setSelectedFilters((prev) => new Set([...prev, ...next]));
          setCurrentPage(1);
          seedRef.current = true;
        }
      },
    }
  );
  const allCourses: CourseCard[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const facets: Facet[] = data?.facets ?? [];

  const toggleFilter = (key: string) => {
    setSelectedFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSelectedFilters(new Set());
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(total / perPage);

  const activeTrackKey = [...selectedFilters].find((f) => f.startsWith("track-"));
  const activeTrackName = activeTrackKey?.slice("track-".length);

  const { isAuthenticated } = useAuth();

  // Load which courses are already in the student's cart so the Enroll button
  // shows a state-aware "In Cart" label on first paint for signed-in users.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      const token = await loadToken();
      if (!token || cancelled) return;
      const res = await fetch("/api/cart", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (!res.ok) return;
      const data = await res.json();
      setInCart(new Set((data?.items ?? []).map((i: { courseId: string }) => i.courseId)));
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const handleEnroll = useCallback(async (id: string) => {
    const token = await loadToken();
    if (!token || !isAuthenticated) {
      showToast("Please sign in to enroll");
      return;
    }
    const alreadyInCart = inCart.has(id);
    setCartAction(id);
    try {
      const { authFetch } = await import("@/app/auth/lib/auth-fetch");
      const res = await authFetch(alreadyInCart ? `/api/cart/items/${id}` : "/api/cart/items", {
        method: alreadyInCart ? "DELETE" : "POST",
        body: alreadyInCart ? undefined : JSON.stringify({ courseId: id }),
      });
      if (res.status === 401) {
        showToast("Please sign in to enroll");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast(body.message || "Could not update cart");
        return;
      }
      setInCart((prev) => {
        const next = new Set(prev);
        if (alreadyInCart) next.delete(id); else next.add(id);
        return next;
      });
      mutate("/api/cart?currency=INR");
      showToast(alreadyInCart ? "Removed from cart" : "Added to cart");
    } catch {
      showToast("Could not update cart");
    } finally {
      setCartAction(null);
    }
  }, [inCart, isAuthenticated]);

  const renderStars = (rating: number, courseId: string) => {
    const full = Math.floor(rating);
    return Array.from({ length: 5 }, (_, i) => (
      <svg key={`${courseId}-star-${i}`} className="w-[11px] h-[11px]" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" fill={i < full ? "#F59E0B" : "#D1D5DB"} />
      </svg>
    ));
  };

  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar filters */}
      <aside className="sticky top-[56px] h-[calc(100vh-56px)] w-[252px] shrink-0 overflow-y-auto border-r border-[var(--border)] bg-[var(--card)] p-4 pb-8 max-lg:hidden">
        <FacetPanel
          facets={facets}
          selectedFilters={selectedFilters}
          openSection={openSection}
          onToggleSection={(key) => setOpenSection((prev) => (prev === key ? null : key))}
          onToggleFilter={toggleFilter}
          onClearAll={clearAllFilters}
          showClearAll={selectedFilters.size > 0}
        />
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-[var(--bg)]">
        {/* Page header */}
        <div className="relative overflow-hidden border-b border-[var(--border)] bg-[var(--card)]">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(240,78,0,.10) 0%, transparent 70%)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-24 left-1/3 h-60 w-60 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(37,99,235,.10) 0%, transparent 70%)" }}
          />
          <div className="relative z-[1] flex flex-col gap-3.5 px-4 py-5 md:px-7 md:py-6">
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[.35em] text-[var(--orange)]">
                <span className="h-[3px] w-7 rounded-full bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)]" />
                {activeTrackName ? "Career Track" : "Learning Library"}
              </div>
              <h1 className="font-['Syne',sans-serif] text-[24px] font-extrabold tracking-[-.3px] text-[var(--text)] md:text-[30px]">
                {activeTrackName ?? "All Courses"}
              </h1>
              <p className="mt-1 max-w-2xl text-[13.5px] text-[var(--muted)]">
                {activeTrackName
                  ? `All courses in the ${activeTrackName} track — clear the filter to browse everything`
                  : "Browse the full catalog and find your next course — filter by track, level, category and more."}
              </p>
            </div>
          </div>
        </div>

        {/* Sticky toolbar */}
        <div className="sticky top-[56px] z-30 border-b border-[var(--border)] bg-[var(--card)]">
          <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 md:px-7">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                router.push(`/courses?${params}`);
              }}
              className="relative w-full max-w-[360px] flex-1 max-md:max-w-full max-md:basis-full"
            >
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              <input
                type="text"
                placeholder="Search courses, skills, mentors…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--bg)] py-2.5 pl-9 pr-3 text-[13px] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--muted)] focus:border-[var(--blue)] focus:bg-[var(--card)] focus:shadow-[0_0_0_3px_rgba(37,99,235,.12)]"
              />
            </form>

            <div className="ml-auto flex items-center gap-2">
              {/* Mobile filters toggle */}
              <button
                onClick={() => setMobileFilterOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[12.5px] font-bold text-[var(--text2)] transition-colors hover:border-[var(--blue)] hover:text-[var(--blue)] lg:hidden"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M8 12h8M11 18h2" strokeLinecap="round" /></svg>
                Filters
                {selectedFilters.size > 0 && (
                  <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: "linear-gradient(135deg, var(--orange), var(--orange2))" }}>{selectedFilters.size}</span>
                )}
              </button>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="cursor-pointer rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[12.5px] font-semibold text-[var(--text2)] outline-none transition-colors hover:border-[var(--blue)] focus:border-[var(--blue)]"
              >
                <option>Most Popular</option>
                <option>Highest Rated</option>
                <option>Lowest Rated</option>
                <option>Newest First</option>
                <option>Duration: Shortest</option>
              </select>

              <div className="flex overflow-hidden rounded-xl border-[1.5px] border-[var(--border)]">
                <button
                  aria-label="Grid view"
                  className={`flex items-center justify-center border-none p-2 transition-colors ${viewMode === "grid" ? "bg-[var(--blue-dim)] text-[var(--blue)]" : "bg-transparent text-[var(--muted)] hover:bg-[var(--bg)]"}`}
                  onClick={() => setViewMode("grid")}
                >
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                </button>
                <button
                  aria-label="List view"
                  className={`flex items-center justify-center border-none p-2 transition-colors ${viewMode === "list" ? "bg-[var(--blue-dim)] text-[var(--blue)]" : "bg-transparent text-[var(--muted)] hover:bg-[var(--bg)]"}`}
                  onClick={() => setViewMode("list")}
                >
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Active filter chips */}
        {selectedFilters.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-4 pt-3 md:px-7">
            {[...selectedFilters].map((key) => {
              const label = key.includes("-") ? key.substring(key.indexOf("-") + 1) : key;
              return (
                <span key={key} onClick={() => toggleFilter(key)} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[#C7D8FF] bg-[var(--blue-dim)] px-3 py-1 text-[12px] font-semibold text-[var(--blue)] transition-colors hover:border-[var(--blue)] hover:bg-[#dde8ff]">
                  {label}
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </span>
              );
            })}
            <button onClick={clearAllFilters} className="flex cursor-pointer items-center gap-1 rounded-full border border-[#ffd0bb] bg-[var(--orange-pale,#FFF0EA)] px-3 py-1 text-[12px] font-semibold text-[var(--orange)] transition-colors hover:bg-[#ffe0cc]">
              ✕ Clear All
            </button>
          </div>
        )}

        {/* Content */}
        <div className="px-4 pb-12 pt-5 md:px-7">
          {isLoading ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
                  <div className="aspect-[16/9] animate-pulse bg-[var(--border2)]" />
                  <div className="space-y-2.5 p-4">
                    <div className="h-3 w-1/3 animate-pulse rounded bg-[var(--border2)]" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--border2)]" />
                    <div className="h-3 w-full animate-pulse rounded bg-[var(--border2)]" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--border2)]" />
                    <div className="flex items-center justify-between pt-2">
                      <div className="h-7 w-7 animate-pulse rounded-full bg-[var(--border2)]" />
                      <div className="h-8 w-20 animate-pulse rounded-lg bg-[var(--border2)]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : allCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border2)] bg-[var(--card)] px-6 py-16 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--blue-dim)] text-[var(--blue)]">
                <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              </div>
              <p className="text-lg font-bold text-[var(--text2)]">No courses found</p>
              <p className="mt-1 text-[13.5px] text-[var(--muted)]">Try adjusting your search or clearing the filters.</p>
              <button onClick={clearAllFilters} className="mt-5 rounded-lg px-5 py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90" style={{ background: "linear-gradient(135deg, var(--orange), var(--orange2))" }}>Clear Filters</button>
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: viewMode === "list" ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {allCourses.map((course) => (
                <article
                  key={course.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(`/courses/${course.slug}`)}
                  onKeyDown={(e) => { if (e.key === "Enter") router.push(`/courses/${course.slug}`); }}
                  className={`group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow)] transition-all duration-[220ms] ease-[cubic-bezier(.34,1.56,.64,1)] hover:-translate-y-1 hover:border-[#C7D8FF] hover:shadow-[var(--shadow-lg)] ${viewMode === "list" ? "md:flex-row" : ""}`}
                >
                  <div className={`relative overflow-hidden bg-[var(--bg2)] ${viewMode === "list" ? "md:w-[200px] md:h-full md:min-h-[120px]" : "aspect-[21/8]"}`}>
                    <Image src={course.img} alt={course.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[rgba(13,31,92,.5)] via-transparent to-transparent" />
                    {course.badge && (
                      <span className={`absolute left-3 top-3 rounded-full px-2.5 py-[3px] text-[10px] font-extrabold uppercase tracking-[.4px] text-white shadow-[0_2px_10px_rgba(0,0,0,.25)] ${course.badgeClass}`}>{course.badge}</span>
                    )}
                    <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-[3px] text-[10px] font-bold text-white backdrop-blur-sm">{course.duration}</span>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-1 flex-col p-4">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="text-[10.5px] font-bold uppercase tracking-[.5px] text-[var(--orange)]">{course.category}</span>
                        <span className="flex items-center gap-1 text-[11.5px]">
                          <span className="flex items-center gap-[1px]">{renderStars(course.rating, course.id)}</span>
                          <span className="font-bold text-[var(--text)]">{Math.floor(course.rating)}</span>
                          <span className="text-[11px] text-[var(--muted)]">({course.reviews})</span>
                        </span>
                      </div>
                      <h3 className="font-['Syne',sans-serif] text-[15px] font-bold leading-[1.35] text-[var(--text)] line-clamp-2">{course.title}</h3>
                      <p className="mt-1.5 line-clamp-2 text-[12px] leading-[1.55] text-[var(--muted)]">{course.description}</p>

                      {course.techStack.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {course.techStack.slice(0, 3).map((t) => (
                            <span key={t} className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text2)]">{t}</span>
                          ))}
                          {course.techStack.length > 3 && (
                            <span className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">+{course.techStack.length - 3}</span>
                          )}
                        </div>
                      )}

                      <div className="mt-auto flex items-center gap-4 pt-3 text-[11.5px] text-[var(--muted)]">
                        <span className="flex items-center gap-1.5">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                          {course.hours} hrs
                        </span>
                        <span className="flex items-center gap-1.5">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
                          {course.students}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20V10M18 20V4M6 20v-4" /></svg>
                          {course.level}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white bg-gradient-to-br ${course.mentorColor}`}>{course.mentor}</div>
                        <div className="min-w-0">
                          <div className="truncate text-[12px] font-semibold text-[var(--text2)]">{course.mentorName}</div>
                        </div>
                      </div>
                      <button
                        className="rounded-lg px-4 py-2 text-[11.5px] font-bold text-white shadow-[0_2px_8px_rgba(240,78,0,.22)] transition-[opacity,transform] duration-[180ms] hover:opacity-[.9] active:scale-[.96] disabled:cursor-not-allowed disabled:opacity-60"
                        style={{ background: inCart.has(course.id) ? "linear-gradient(135deg,#22C55E,#16A34A)" : "linear-gradient(135deg,var(--orange),var(--orange2))" }}
                        disabled={cartAction === course.id}
                        onClick={(e) => { e.stopPropagation(); handleEnroll(course.id); }}
                      >
                        {cartAction === course.id ? "…" : inCart.has(course.id) ? "✓ In Cart" : "Enroll →"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-9 flex items-center justify-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border-[1.5px] border-[var(--border)] bg-[var(--card)] text-[var(--text2)] transition-all hover:border-[var(--blue)] hover:bg-[var(--blue-dim)] hover:text-[var(--blue)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              {getPageNumbers().map((p, i) => p === "..." ? (
                <span key={`e${i}`} className="px-1 text-[var(--muted)]">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p as number)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border-[1.5px] text-[13px] font-bold transition-all ${currentPage === p ? "border-[var(--blue)] bg-[var(--blue)] text-white shadow-[0_4px_12px_rgba(37,99,235,.3)]" : "border-[var(--border)] bg-[var(--card)] text-[var(--text2)] hover:border-[var(--blue)] hover:bg-[var(--blue-dim)] hover:text-[var(--blue)]"}`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border-[1.5px] border-[var(--border)] bg-[var(--card)] text-[var(--text2)] transition-all hover:border-[var(--blue)] hover:bg-[var(--blue-dim)] hover:text-[var(--blue)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          )}

          {/* CTA */}
          <div className="relative mt-10 overflow-hidden rounded-2xl border border-[var(--border)]" style={{ background: "linear-gradient(120deg, var(--blue-dim) 0%, var(--orange-pale, #FFF0EA) 100%)" }}>
            <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full" style={{ background: "radial-gradient(circle, rgba(240,78,0,.10) 0%, transparent 70%)" }} />
            <div className="pointer-events-none absolute -bottom-16 left-[30%] h-44 w-44 rounded-full" style={{ background: "radial-gradient(circle, rgba(41,82,204,.09) 0%, transparent 70%)" }} />
            <div className="relative z-[1] flex flex-col items-start justify-between gap-6 p-6 md:flex-row md:items-center md:p-8">
              <div>
                <h2 className="font-['Syne',sans-serif] text-lg font-extrabold text-[var(--text)]">Not sure which course is right for you?</h2>
                <p className="mt-1 max-w-[500px] text-[13.5px] text-[var(--muted)]">Talk to a Future Stack Career Advisor — get a personalized learning roadmap aligned to your goals, skills, and dream role. Free 30-minute session, no commitment.</p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <button className="rounded-lg px-5 py-2.5 text-[13.5px] font-bold text-white transition-[opacity,transform] hover:-translate-y-0.5 hover:opacity-90" style={{ background: "linear-gradient(135deg, var(--orange) 0%, var(--orange2) 100%)", boxShadow: "0 4px 14px rgba(240,78,0,.28)" }}>Book a Free Session</button>
                <button className="rounded-lg border-2 border-[var(--blue)] bg-transparent px-5 py-2.5 text-[13.5px] font-bold text-[var(--blue)] transition-colors hover:bg-[var(--blue-dim)]">Take the Quiz →</button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile filter overlay */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex flex-col lg:hidden" style={{ background: "rgba(0,0,0,.35)" }}>
          <div className="flex-1" onClick={() => setMobileFilterOpen(false)} />
          <div className="max-h-[78vh] overflow-y-auto rounded-t-2xl bg-[var(--card)] px-4 pb-8 pt-4 shadow-[0_-8px_30px_rgba(0,0,0,.12)]">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[13px] font-bold text-[var(--text2)]">Filter Courses</div>
              <button onClick={() => setMobileFilterOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--text)]">
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <FacetPanel
              facets={facets}
              selectedFilters={selectedFilters}
              openSection={openSection}
              onToggleSection={(key) => setOpenSection((prev) => (prev === key ? null : key))}
              onToggleFilter={toggleFilter}
              onClearAll={clearAllFilters}
              showClearAll={selectedFilters.size > 0}
            />
            <button onClick={() => setMobileFilterOpen(false)} className="mt-3 w-full rounded-xl py-3 text-[13px] font-bold text-white transition-opacity hover:opacity-90" style={{ background: "linear-gradient(135deg, var(--orange), var(--orange2))" }}>Show Results{selectedFilters.size > 0 ? ` (${selectedFilters.size})` : ""}</button>
          </div>
        </div>
      )}
    </div>
  );
}