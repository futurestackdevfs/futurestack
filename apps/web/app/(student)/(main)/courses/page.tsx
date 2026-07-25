"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";

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

function formatTechLine(techStack: string[]): string {
  const items = techStack.slice(0, 4);
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} & ${items[items.length - 1]}`;
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

export default function CoursesPage() {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set());
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("Most Popular");
  const [currentPage, setCurrentPage] = useState(1);
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const perPage = 12;

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('search');
    if (q) setSearch(q);
  }, []);

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

  const { data, isLoading } = useSWR<CardsResponse>(`/api/courses/public/cards?${params}`, { keepPreviousData: true });
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

  const handleEnroll = (id: string) => {
    setEnrolled((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setEnrolled((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 1800);
  };

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
      <aside className="w-[252px] shrink-0 sticky top-[56px] h-[calc(100vh-56px)] overflow-y-auto border-r border-[var(--border)] bg-[var(--card)] p-4 pb-8 flex flex-col gap-1 max-lg:hidden">
        <div className="px-[13px] pb-3 text-[13px] font-bold text-[var(--text2)] tracking-[.3px]">Filters</div>
        {facets.length === 0 && (
          <div className="px-[13px] py-2 text-[12px] text-[var(--muted)]">Loading filters…</div>
        )}
        {facets.map((s) => {
          const hasActive = [...selectedFilters].some((f) => f.startsWith(s.key + "-"));
          return (
            <div key={s.key} className="border border-[var(--border)] rounded-[10px] overflow-hidden mb-2">
              <div className={`flex items-center justify-between px-[13px] py-2.5 font-bold text-[12px] tracking-[.6px] uppercase text-[var(--muted)] bg-[var(--bg)] cursor-pointer select-none hover:bg-gray-100 ${hasActive ? "text-[var(--blue)]" : ""}`} onClick={() => setOpenSection((prev) => (prev === s.key ? null : s.key))}>
                {s.title}
                <svg className={`w-3.5 h-3.5 transition-transform ${openSection === s.key ? "" : "-rotate-90"}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
              </div>
              {openSection === s.key && (
                <div className="px-[13px] py-2.5 flex flex-col gap-[7px] max-h-[240px] overflow-y-auto overscroll-contain">
                  {s.options.map((opt) => {
                    const key = `${s.key}-${opt.value}`;
                    return (
                      <div key={opt.value} className="flex items-center gap-[9px] cursor-pointer px-[7px] py-[5px] rounded-[6px] hover:bg-[var(--blue-dim)]" onClick={() => toggleFilter(key)}>
                        <input type="checkbox" checked={selectedFilters.has(key)} onChange={() => {}} className="accent-[var(--blue)] w-3.5 h-3.5 cursor-pointer pointer-events-none" />
                        <label className="flex-1 flex justify-between items-center text-[13px] text-[var(--text2)] cursor-pointer pointer-events-none">
                          {opt.value} <span className="text-[11px] text-[var(--muted)] bg-[var(--bg)] px-[6px] py-[1px] rounded-[10px]">{opt.count}</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {selectedFilters.size > 0 && (
          <button className="text-[12px] text-[var(--orange)] font-semibold pt-2 pb-0.5 text-center cursor-pointer bg-transparent border-none w-full hover:opacity-75" onClick={clearAllFilters}>✕ Clear All Filters</button>
        )}
      </aside>

      <main className="flex-1 min-w-0 flex flex-col px-6 pb-10 bg-[var(--card)] max-md:px-3.5">
        <div className="pt-2.5 pb-0 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-3.5 max-md:flex-col max-md:items-start max-md:gap-2">
            <div className="flex flex-col gap-0.5">
              <h1 className="text-[22px] font-extrabold text-[var(--text)] tracking-[-.3px]">All Courses</h1>
              <p className="text-[13px] text-[var(--muted)]">Browse our full catalog and find your next course</p>
            </div>
            <span className="bg-[var(--blue-dim)] border border-[#C7D8FF] text-[var(--blue)] text-[12px] font-bold px-3 py-1 rounded-full tracking-[.3px]">{total} Course{total !== 1 ? "s" : ""} Available</span>
          </div>

          <div className="flex items-center gap-2.5 py-3 border-b border-[var(--border)] max-md:flex-wrap">
            <div className="relative flex-1 max-w-[360px] max-md:max-w-full max-md:basis-full">
              <svg className="absolute left-[11px] top-1/2 -translate-y-1/2 text-[var(--muted)]" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input type="text" placeholder="Search courses, skills, mentors…" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="w-full py-2 pl-9 pr-3 border-[1.5px] border-[var(--border)] rounded-[7px] text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--blue)] focus:bg-[var(--card)] focus:shadow-[0_0_0_3px_rgba(37,99,235,.08)] transition-[border-color,background]" />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="py-[7px] px-3 border-[1.5px] border-[var(--border)] rounded-[7px] text-[13px] text-[var(--text2)] bg-[var(--card)] outline-none cursor-pointer hover:border-[var(--blue)] focus:border-[var(--blue)]">
                <option>Most Popular</option>
                <option>Highest Rated</option>
                <option>Lowest Rated</option>
                <option>Newest First</option>
                <option>Duration: Shortest</option>
              </select>
              <div className="flex border-[1.5px] border-[var(--border)] rounded-[7px] overflow-hidden">
                <button className={`p-[6px_10px] text-[var(--muted)] flex items-center justify-center border-none bg-transparent cursor-pointer ${viewMode === "grid" ? "bg-[var(--blue-dim)] text-[var(--blue)]" : "hover:bg-[var(--bg)]"}`} onClick={() => setViewMode("grid")}>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                </button>
                <button className={`p-[6px_10px] text-[var(--muted)] flex items-center justify-center border-none bg-transparent cursor-pointer ${viewMode === "list" ? "bg-[var(--blue-dim)] text-[var(--blue)]" : "hover:bg-[var(--bg)]"}`} onClick={() => setViewMode("list")}>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {selectedFilters.size > 0 && (
          <div className="flex items-center flex-wrap gap-[7px] pt-2 min-h-[36px]">
            {[...selectedFilters].map((key) => {
              const label = key.includes("-") ? key.substring(key.indexOf("-") + 1) : key;
              return (
                <span key={key} className="flex items-center gap-[5px] px-3 py-1 rounded-full border border-[#C7D8FF] bg-[var(--blue-dim)] text-[var(--blue)] text-[12px] font-semibold cursor-pointer hover:bg-[#dde8ff] hover:border-[var(--blue)] transition-[background,border-color]" onClick={() => toggleFilter(key)}>
                  {label} <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </span>
              );
            })}
            <span className="flex items-center gap-[5px] px-3 py-1 rounded-full border border-[#ffd0bb] bg-[var(--orange-pale,#FFF0EA)] text-[var(--orange)] text-[12px] font-semibold cursor-pointer hover:bg-[#ffe0cc] transition-[background,border-color]" onClick={clearAllFilters}>✕ Clear All</span>
          </div>
        )}

        <section className="pt-[18px]">
          {isLoading ? (
            <div className="text-center py-16 text-[var(--muted)]">
              <p className="text-lg font-semibold text-[var(--text2)]">Loading courses…</p>
            </div>
          ) : allCourses.length === 0 ? (
            <div className="text-center py-16 text-[var(--muted)]">
              <p className="text-lg font-semibold text-[var(--text2)]">No courses found</p>
              <p className="mt-1">Try adjusting your search</p>
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: viewMode === "list" ? "1fr" : "repeat(auto-fill, minmax(270px, 1fr))" }}>
              {allCourses.map((course) => (
                <article
                  key={course.id}
                  className={`group border border-[var(--border)] rounded-xl bg-[var(--card)] overflow-hidden cursor-pointer flex flex-col transition-[transform,box-shadow,border-color] duration-[220ms] ease-[cubic-bezier(.34,1.56,.64,1)] hover:-translate-y-[5px] hover:shadow-[var(--shadow-lg)] hover:border-[#C7D8FF] ${viewMode === "list" ? "md:flex-row" : ""}`}
                  onClick={() => router.push(`/courses/${course.slug}`)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") router.push(`/courses/${course.slug}`); }}
                >
                  <div className={`relative overflow-hidden ${viewMode === "list" ? "md:w-[200px] md:h-full md:min-h-[120px]" : "h-[180px]"}`}>
                    <img src={course.img} alt={course.title} className="w-full h-full object-cover transition-transform duration-[350ms] group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(13,31,92,.55)]"></div>
                    {course.badge && (
                      <span className={`absolute top-2.5 left-2.5 px-3 py-[4px] rounded-[20px] text-[10.5px] font-extrabold tracking-[.5px] uppercase text-white shadow-[0_2px_10px_rgba(0,0,0,.25)] ${course.badgeClass}`}>{course.badge}</span>
                    )}
                  </div>
                  <div className="p-[12px_15px_8px] flex-1 flex flex-col gap-[2px]">
                    <div className="text-[11px] font-semibold text-[var(--orange)] uppercase tracking-[.6px]">{course.category}</div>
                    <div className="font-['Syne',sans-serif] text-[14.5px] font-bold text-[var(--text)] leading-[1.35] line-clamp-2">{course.title}</div>
                    <div className="text-[12px] text-[var(--muted)] leading-[1.55] line-clamp-2">{course.description}</div>
                    <div className="flex items-center gap-1">
                      <div className="flex items-center gap-[1px]">{renderStars(course.rating, course.id)}</div>
                      <span className="text-[11.5px] font-bold text-[var(--text)]">{Math.floor(course.rating)}</span>
                      <span className="text-[11px] text-[var(--muted)]">({course.reviews})</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11.5px] text-[var(--muted)] mt-auto pt-1">
                      <span className="flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>{course.hours} hrs</span>
                      <span className="flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>{course.students}</span>
                      <span>{course.level}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 px-[15px] py-[8px_11px] border-t border-[var(--border)]">
                    <div className="flex items-center gap-[7px] min-w-0">
                      <div className={`w-[26px] h-[26px] rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0 bg-gradient-to-br ${course.mentorColor}`}>{course.mentor}</div>
                      <span className="text-[12px] text-[var(--text2)] font-medium truncate">{course.mentorName}</span>
                    </div>
                    <button className="px-[14px] py-[6px] rounded-[6px] border-none text-[11px] font-bold text-white shadow-[0_2px_6px_rgba(240,78,0,.2)] cursor-pointer transition-[opacity,transform] duration-[180ms] hover:opacity-[.88] active:scale-[.97] whitespace-nowrap" style={{ background: enrolled.has(course.id) ? "linear-gradient(135deg,#22C55E,#16A34A)" : "linear-gradient(135deg,var(--orange),var(--orange2))" }} onClick={(e) => { e.stopPropagation(); handleEnroll(course.id); }}>
                      {enrolled.has(course.id) ? "✓ Added!" : "Enroll →"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-[6px] mt-7">
            <button className="w-[34px] h-[34px] rounded-[7px] border-[1.5px] border-[var(--border)] text-[13px] font-semibold text-[var(--text2)] flex items-center justify-center cursor-pointer bg-[var(--card)] hover:border-[var(--blue)] hover:text-[var(--blue)] hover:bg-[var(--blue-dim)] transition-all disabled:opacity-40" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            {getPageNumbers().map((p, i) => p === "..." ? <span key={`e${i}`} className="px-1 text-[var(--muted)]">…</span> : (
              <button key={p} className={`w-[34px] h-[34px] rounded-[7px] border-[1.5px] text-[13px] font-semibold flex items-center justify-center cursor-pointer transition-all ${currentPage === p ? "bg-[var(--blue)] text-white border-[var(--blue)]" : "border-[var(--border)] text-[var(--text2)] bg-[var(--card)] hover:border-[var(--blue)] hover:text-[var(--blue)] hover:bg-[var(--blue-dim)]"}`} onClick={() => setCurrentPage(p as number)}>{p}</button>
            ))}
            <button className="w-[34px] h-[34px] rounded-[7px] border-[1.5px] border-[var(--border)] text-[13px] font-semibold text-[var(--text2)] flex items-center justify-center cursor-pointer bg-[var(--card)] hover:border-[var(--blue)] hover:text-[var(--blue)] hover:bg-[var(--blue-dim)] transition-all disabled:opacity-40" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        )}

        <div className="relative mt-8 border border-[var(--border)] rounded-xl overflow-hidden" style={{ background: "linear-gradient(120deg, var(--orange-pale, #FFF0EA) 0%, var(--blue-dim) 100%)" }}>
          <div className="absolute -right-10 -top-10 w-[200px] h-[200px] rounded-full" style={{ background: "radial-gradient(circle, rgba(240,78,0,.08) 0%, transparent 70%)" }}></div>
          <div className="absolute left-[30%] -bottom-[50px] w-[180px] h-[180px] rounded-full" style={{ background: "radial-gradient(circle, rgba(41,82,204,.07) 0%, transparent 70%)" }}></div>
          <div className="relative z-[1] p-7 md:p-[28px_32px] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h2 className="font-['Syne',sans-serif] text-lg font-extrabold text-[var(--text)] mb-1.5">Not sure which course is right for you?</h2>
              <p className="text-[13.5px] text-[var(--muted)] max-w-[500px]">Talk to a Future Stack Career Advisor — get a personalized learning roadmap aligned to your goals, skills, and dream role. Free 30-minute session, no commitment.</p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button className="px-[22px] py-2.5 rounded-lg border-none text-[13.5px] font-bold text-white cursor-pointer transition-[opacity,transform] duration-[180ms] hover:opacity-90 hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg, var(--orange) 0%, var(--orange2) 100%)", boxShadow: "0 4px 14px rgba(240,78,0,.28)" }}>Book a Free Session</button>
              <button className="px-5 py-2.5 rounded-lg border-2 border-[var(--blue)] text-[13.5px] font-bold text-[var(--blue)] cursor-pointer bg-transparent hover:bg-[var(--blue-dim)] transition-[background]">Take the Quiz →</button>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile filter FAB */}
      <button onClick={() => setMobileFilterOpen(true)} className="fixed bottom-5 right-5 z-40 lg:hidden w-[48px] h-[48px] rounded-full flex items-center justify-center cursor-pointer transition-all duration-[250ms] hover:scale-105 active:scale-95 border-none outline-none" style={{ background: "linear-gradient(135deg, #f05a1a 0%, #ff7a3c 100%)", boxShadow: "0 4px 16px rgba(240,90,26,.35), inset 0 1px 0 rgba(255,255,255,.2)" }}>
        <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M4 6h16M8 12h8M11 18h2" strokeLinecap="round" /></svg>
        {selectedFilters.size > 0 && (
          <span className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-white text-[var(--orange)] text-[9px] font-bold flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,.15)]">{selectedFilters.size}</span>
        )}
      </button>

      {/* Mobile filter overlay */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col" style={{ background: "rgba(0,0,0,.35)" }}>
          <div className="flex-1" onClick={() => setMobileFilterOpen(false)} />
          <div className="bg-[var(--card)] rounded-t-2xl max-h-[75vh] overflow-y-auto px-4 pt-4 pb-8 shadow-[0_-8px_30px_rgba(0,0,0,.12)]">
            <div className="flex items-center justify-between mb-3">
              <div className="px-[13px] text-[13px] font-bold text-[var(--text2)] tracking-[.3px]">Filters</div>
              <div className="flex items-center gap-2">
                {selectedFilters.size > 0 && (
                  <button className="text-[12px] text-[var(--orange)] font-semibold bg-transparent border-none cursor-pointer hover:opacity-75" onClick={clearAllFilters}>Clear All</button>
                )}
                <button onClick={() => setMobileFilterOpen(false)} className="w-[30px] h-[30px] rounded-full flex items-center justify-center bg-[var(--bg)] border-none cursor-pointer text-[var(--muted)] hover:text-[var(--text)]">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            </div>
            {facets.length === 0 && (
              <div className="px-[13px] py-2 text-[12px] text-[var(--muted)]">Loading filters…</div>
            )}
            {facets.map((s) => {
              const hasActive = [...selectedFilters].some((f) => f.startsWith(s.key + "-"));
              return (
                <div key={s.key} className="border border-[var(--border)] rounded-[10px] overflow-hidden mb-2">
                  <div className={`flex items-center justify-between px-[13px] py-2.5 font-bold text-[12px] tracking-[.6px] uppercase text-[var(--muted)] bg-[var(--bg)] cursor-pointer select-none hover:bg-gray-100 ${hasActive ? "text-[var(--blue)]" : ""}`} onClick={() => setOpenSection((prev) => (prev === s.key ? null : s.key))}>
                    {s.title}
                    <svg className={`w-3.5 h-3.5 transition-transform ${openSection === s.key ? "" : "-rotate-90"}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
                  </div>
                  {openSection === s.key && (
                    <div className="px-[13px] py-2.5 flex flex-col gap-[7px] max-h-[200px] overflow-y-auto overscroll-contain">
                      {s.options.map((opt) => {
                        const key = `${s.key}-${opt.value}`;
                        return (
                          <div key={opt.value} className="flex items-center gap-[9px] cursor-pointer px-[7px] py-[5px] rounded-[6px] hover:bg-[var(--blue-dim)]" onClick={() => toggleFilter(key)}>
                            <input type="checkbox" checked={selectedFilters.has(key)} onChange={() => {}} className="accent-[var(--blue)] w-3.5 h-3.5 cursor-pointer pointer-events-none" />
                            <label className="flex-1 flex justify-between items-center text-[13px] text-[var(--text2)] cursor-pointer pointer-events-none">
                              {opt.value} <span className="text-[11px] text-[var(--muted)] bg-[var(--bg)] px-[6px] py-[1px] rounded-[10px]">{opt.count}</span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={() => setMobileFilterOpen(false)} className="w-full mt-3 py-[11px] rounded-[10px] border-none text-[13px] font-bold text-white cursor-pointer transition-opacity hover:opacity-90" style={{ background: "linear-gradient(135deg, var(--orange), var(--orange2))" }}>Apply Filters</button>
          </div>
        </div>
      )}
    </div>
  );
}
