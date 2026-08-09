"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/app/auth/hooks/use-auth";
import { authFetch } from "@/app/auth/lib/auth-fetch";
import { showToast } from "@/lib/toast";

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function TopNav() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Live cart count for the cart icon badge — only when signed in. Shares the
  // SWR cache with the cart page key so removing/adding items keeps it in sync.
  const { data: cartData } = useSWR(
    isAuthenticated ? "/api/cart?currency=INR" : null,
    async (url: string) => {
      const res = await authFetch(url);
      if (res.status === 401 || !res.ok) return { items: [] };
      return res.json();
    }
  );
  const cartCount = Array.isArray(cartData?.items) ? cartData.items.length : 0;
  const [animate, setAnimate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ slug: string; title: string; category: string }[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestIdx, setSuggestIdx] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

  const [coursesMegaOpen, setCoursesMegaOpen] = useState(false);
  const [pathsMegaOpen, setPathsMegaOpen] = useState(false);
  const [activeCourseCat, setActiveCourseCat] = useState("web-dev");
  const [activePathCat, setActivePathCat] = useState("");
  const [showAllPathCourses, setShowAllPathCourses] = useState(false);
  const coursesMegaRef = useRef<HTMLDivElement>(null);
  const pathsMegaRef = useRef<HTMLDivElement>(null);
  const coursesMegaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathsMegaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const v = sessionStorage.getItem("fs-nav-animated");
    if (!v) {
      sessionStorage.setItem("fs-nav-animated", "true");
      setAnimate(true);
    }
  }, []);

  // Auto-close dropdown on successful login
  useEffect(() => {
    if (isAuthenticated) setProfileOpen(false);
  }, [isAuthenticated]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSearchQuery("");
        setSuggestOpen(false);
        searchRef.current?.blur();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setSuggestions([]); setSuggestOpen(false); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/courses/public/cards?search=${encodeURIComponent(searchQuery.trim())}&perPage=5`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions((data.data ?? []).map((c: any) => ({ slug: c.slug, title: c.title, category: c.category })));
          setSuggestOpen(true);
          setSuggestIdx(-1);
        }
      } catch { }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node) &&
        searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSuggestOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const [courseCatsData, setCourseCatsData] = useState<{ id: string; label: string; icon: string; count: number }[]>([]);
  const [coursesByCat, setCoursesByCat] = useState<Record<string, { title: string; desc: string; level: string; duration: string; slug: string; icon: string }[]>>({});
  const [coursesLoading, setCoursesLoading] = useState(false);

  const [tracksData, setTracksData] = useState<{ id: string; title: string; description: string; courseCount: number }[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [trackCourses, setTrackCourses] = useState<{ id: string; title: string; techStack?: string[]; hours?: number }[]>([]);
  const [trackCoursesLoading, setTrackCoursesLoading] = useState(false);
  const [allCards, setAllCards] = useState<{ title: string; level: string; duration: string; slug: string; category: string; techStack?: string[]; hours?: number }[]>([]);

  const categoryIcons: Record<string, string> = {
    'Web Development': '🌐', 'Data & AI': '🧠', 'Cloud & DevOps': '☁️', 'Emerging Tech': '⚡', 'Mobile Development': '📱', 'Cybersecurity': '🔒', 'General': '📚',
  };

  useEffect(() => {
    let cancelled = false;
    async function fetchCourses() {
      setCoursesLoading(true);
      try {
        const res = await fetch('/api/courses/public/cards?perPage=200');
        if (!res.ok) throw new Error('Failed');
        const json = await res.json();
        const cards = json.data ?? [];
        const groups: Record<string, { title: string; desc: string; level: string; duration: string; slug: string; icon: string }[]> = {};
        const counts: Record<string, number> = {};
        for (const c of cards) {
          const cat = c.category || c.tech || 'General';
          if (!groups[cat]) { groups[cat] = []; counts[cat] = 0; }
          counts[cat]++;
          if (groups[cat].length < 6) {
            groups[cat].push({
              title: c.title,
              desc: c.description || '',
              level: c.level || 'All Levels',
              duration: c.duration || 'Self-Paced',
              slug: c.slug || c.id,
              icon: categoryIcons[cat] || '📖',
            });
          }
        }
        const cats = Object.entries(counts).map(([label, count]) => ({
          id: label,
          label,
          icon: categoryIcons[label] || '📖',
          count,
        }));
        if (!cancelled) { setCourseCatsData(cats); setCoursesByCat(groups); setAllCards(cards.map((c: any) => ({ title: c.title, level: c.level || 'All Levels', duration: c.duration || 'Self-Paced', slug: c.slug || c.id, category: c.category || c.tech || 'General', techStack: c.techStack ?? [], hours: c.hours ?? 0 }))); if (cats.length > 0) setActiveCourseCat(cats[0].id); }
      } catch { /* use fallback */ }
      if (!cancelled) setCoursesLoading(false);
    }
    fetchCourses();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchTracks() {
      setTracksLoading(true);
      try {
        const res = await fetch('/api/courses/public/featured-tracks');
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        const tracks = (data.data ?? data ?? []).map((t: any) => ({
          id: t.id || t.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          title: t.title,
          description: t.description || '',
          courseCount: t._count?.courses ?? t.courseCount ?? 0,
        }));
        if (!cancelled) { setTracksData(tracks); if (tracks.length > 0 && !activePathCat) setActivePathCat(tracks[0].id); }
      } catch { /* use fallback */ }
      if (!cancelled) setTracksLoading(false);
    }
    fetchTracks();
    return () => { cancelled = true; };
  }, []);

  function startCoursesTimer() {
    if (coursesMegaTimer.current) clearTimeout(coursesMegaTimer.current);
    coursesMegaTimer.current = setTimeout(() => setCoursesMegaOpen(false), 250);
  }

  function startPathsTimer() {
    if (pathsMegaTimer.current) clearTimeout(pathsMegaTimer.current);
    pathsMegaTimer.current = setTimeout(() => setPathsMegaOpen(false), 250);
  }

  function clearCoursesTimer() {
    if (coursesMegaTimer.current) { clearTimeout(coursesMegaTimer.current); coursesMegaTimer.current = null; }
  }

  function clearPathsTimer() {
    if (pathsMegaTimer.current) { clearTimeout(pathsMegaTimer.current); pathsMegaTimer.current = null; }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setCoursesMegaOpen(false);
        setPathsMegaOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (coursesMegaOpen && coursesMegaRef.current && !coursesMegaRef.current.contains(e.target as Node)) {
        setCoursesMegaOpen(false);
      }
      if (pathsMegaOpen && pathsMegaRef.current && !pathsMegaRef.current.contains(e.target as Node)) {
        setPathsMegaOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [coursesMegaOpen, pathsMegaOpen]);

  useEffect(() => {
    if (!activePathCat || !tracksData.find((t) => t.id === activePathCat)) return;
    let cancelled = false;
    async function loadTrackCourses() {
      setTrackCoursesLoading(true);
      try {
        const res = await fetch(`/api/courses/public/tracks/${activePathCat}/courses`);
        if (res.ok) {
          const data = await res.json();
          const courses = (data.data ?? data.courses ?? data ?? []).slice(0, 12).map((c: any) => ({ id: c.slug ?? c.id, title: c.title, techStack: c.techStack ?? [], hours: (c.hours ?? allCards.find((a) => a.slug === (c.slug ?? c.id))?.hours) ?? 0 }));
          if (!cancelled) { setTrackCourses(courses); setTrackCoursesLoading(false); return; }
        }
      } catch { }
      const track = tracksData.find((t) => t.id === activePathCat);
      if (track && allCards.length > 0) {
        const trackCatMap: Record<string, string> = {
          'Full Stack Developer': 'Web Development',
          'Frontend Developer': 'Web Development',
          'Data Scientist': 'Data & AI',
          'AI/ML Engineer': 'Data & AI',
          'DevOps Engineer': 'Cloud & DevOps',
          'Cloud Architect': 'Cloud & DevOps',
          'Mobile Developer': 'Mobile Development',
          'Cybersecurity Analyst': 'Cybersecurity',
        };
        const cat = trackCatMap[track.title];
        const filtered = cat ? allCards.filter((c) => c.category === cat).slice(0, 12).map((c) => ({ id: c.slug, title: c.title, techStack: c.techStack, hours: c.hours })) : allCards.slice(0, 6).map((c) => ({ id: c.slug, title: c.title, techStack: c.techStack, hours: c.hours }));
        if (!cancelled) setTrackCourses(filtered);
      }
      if (!cancelled) setTrackCoursesLoading(false);
    }
    loadTrackCourses();
    return () => { cancelled = true; };
  }, [activePathCat, tracksData, allCards]);

  useEffect(() => { setShowAllPathCourses(false); }, [activePathCat]);

  function navigateToCourse(slug: string) {
    router.push(`/courses/${slug}`);
    setSearchQuery("");
    setSuggestOpen(false);
    setMobileOpen(false);
  }

  function handleSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSuggestIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSuggestIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter') {
      if (suggestIdx >= 0 && suggestions[suggestIdx]) {
        navigateToCourse(suggestions[suggestIdx].slug);
      } else if (searchQuery.trim()) {
        router.push(`/courses?search=${encodeURIComponent(searchQuery.trim())}`);
        setSearchQuery("");
        setSuggestOpen(false);
        setMobileOpen(false);
      }
    }
  }

  function highlightMatch(text: string, query: string) {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>{text.slice(0, idx)}<strong className="text-[var(--text)] font-bold">{text.slice(idx, idx + query.length)}</strong>{text.slice(idx + query.length)}</>
    );
  }

  function toggleTheme() {
    const html = document.documentElement;
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    try { localStorage.setItem("fs-theme", next); } catch { }
  }

  const handleLogout = useCallback(async () => {
    setProfileOpen(false);
    await logout();
    showToast("You've been signed out successfully.");
    router.push("/");
  }, [logout, router]);

  return (<>
    <nav className={`flex items-center gap-3 md:gap-5 px-3 md:px-6 h-14 bg-[var(--surface)]/80 backdrop-blur-lg border-b border-[var(--border)] fixed top-0 left-0 right-0 z-[999] shadow-[var(--shadow)] ${animate ? "[animation:slideDown_.4s_ease_both]" : ""}`}>
      <Link href="/" className="flex items-center gap-2.5 shrink-0 no-underline group">
        <img src="/images/logo.png" alt="FutureStack" style={{ height: 42 }} className="transition-transform duration-300 group-hover:scale-105" />
      </Link>

      <div className="hidden md:flex flex-1 max-w-[320px] relative">
        <div className="flex-1 flex items-center bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 gap-2 h-[34px] transition-all duration-300 focus-within:border-[var(--blue2)] focus-within:shadow-[0_0_0_3px_var(--blue-d),0_0_20px_rgba(59,130,246,.15)] hover:border-[var(--border2)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[var(--muted)]"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input ref={searchRef} type="text" placeholder="Search courses, topics, or skills…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={handleSearchKey} className="bg-transparent border-none outline-none text-[var(--text)] text-[14px] w-full placeholder:text-[var(--muted)]" />
          <span className="text-[9.5px] text-[var(--text3)] border border-[var(--border)] rounded px-[5px] py-[1px] shrink-0 hidden sm:inline font-mono bg-[var(--bg)]">⌘K</span>
        </div>
        {suggestOpen && (
          <div ref={suggestRef} className="absolute top-full left-0 right-0 mt-1 bg-[var(--card)]/95 backdrop-blur-xl border border-[var(--border)] rounded-lg shadow-[0_8px_32px_rgba(0,0,0,.15)] overflow-hidden z-50 [animation:slideUp_.2s_ease_both]">
            {suggestions.length > 0 ? (
              <>
                {suggestions.map((s, i) => (
                  <button key={s.slug} onClick={() => navigateToCourse(s.slug)}
                    onMouseEnter={() => setSuggestIdx(i)}
                    className={`w-full flex items-center gap-2 px-3 py-[9px] text-left border-none cursor-pointer transition-all duration-200 hover:bg-[var(--bg)] hover:pl-4 ${i === suggestIdx ? 'bg-[var(--bg)] pl-4' : 'bg-transparent'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[var(--text)] truncate">{highlightMatch(s.title, searchQuery)}</div>
                      <div className="text-[9px] text-[var(--text3)] truncate">{s.category}</div>
                    </div>
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0 text-[var(--muted)]"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </button>
                ))}
                <button onClick={() => { router.push(`/courses?search=${encodeURIComponent(searchQuery.trim())}`); setSearchQuery(""); setSuggestOpen(false); setMobileOpen(false); }}
                  className="w-full flex items-center justify-center gap-1 px-3 py-[10px] text-[11px] font-semibold text-[var(--blue2)] bg-transparent border-t border-[var(--border)] cursor-pointer hover:bg-[var(--bg)] hover:text-[var(--blue)] transition-all duration-200 group">
                  <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="group-hover:translate-x-[2px] transition-transform duration-200"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  See all results for "{searchQuery}"
                </button>
              </>
            ) : (
              <div className="px-3 py-[14px] text-center">
                <div className="text-[13px] text-[var(--muted)]">No courses found for "{searchQuery}"</div>
                <div className="text-[10px] text-[var(--text3)] mt-1">Try different keywords or browse all courses</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop nav links */}
      <ul className="hidden md:flex items-center gap-0.5 list-none">
        <li className="relative group" style={animate ? { animation: `fadeUp .35s .08s ease both` } : {}}>
          <button
            onMouseEnter={() => { clearCoursesTimer(); setCoursesMegaOpen(true); }}
            onMouseLeave={startCoursesTimer}
            className={`px-2.5 py-1.5 rounded-md text-[15px] font-medium flex items-center gap-1 transition-all duration-200 cursor-pointer bg-transparent border-none ${coursesMegaOpen ? 'text-[var(--text)]' : 'text-[var(--text)] hover:text-[var(--blue)]'}`}
          >
            Courses
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform duration-200" style={{ transform: coursesMegaOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <span className="absolute bottom-0 left-2.5 right-2.5 h-[2px] bg-gradient-to-r from-[var(--blue)] to-[var(--orange)] rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-1000 ease-out origin-left" />
        </li>
        <li className="relative group" style={animate ? { animation: `fadeUp .35s ${.08 + 1 * .05}s ease both` } : {}}>
          <button
            onMouseEnter={() => { clearPathsTimer(); setPathsMegaOpen(true); }}
            onMouseLeave={startPathsTimer}
            className={`px-2.5 py-1.5 rounded-md text-[15px] font-medium flex items-center gap-1 transition-all duration-200 cursor-pointer bg-transparent border-none ${pathsMegaOpen ? 'text-[var(--text)]' : 'text-[var(--text)] hover:text-[var(--blue)]'}`}
          >
            Career Paths
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform duration-200" style={{ transform: pathsMegaOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <span className="absolute bottom-0 left-2.5 right-2.5 h-[2px] bg-gradient-to-r from-[var(--blue)] to-[var(--orange)] rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-1000 ease-out origin-left" />
        </li>
        {[
          { href: "/certificates", label: "Certifications" },
          { href: "/live-projects", label: "Live Projects" },
          { href: "/r-and-d", label: "R&D Services" },
          { href: "/my-dashboard", label: "My Dashboard", requiresAuth: true },
        ].map((link, i) => {
          const locked = link.requiresAuth && !isAuthenticated && !isLoading;
          return (
            <li key={link.label} style={animate ? { animation: `fadeUp .35s ${.08 + (i + 2) * .05}s ease both` } : {}}>
              {locked ? (
                <button
                  onClick={() => {
                    if (pathname === '/') {
                      window.dispatchEvent(new CustomEvent('fs:highlight-login'));
                    } else {
                      router.push('/#student-login');
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-md text-[15px] font-medium flex items-center gap-1 transition-all duration-150 text-[var(--text)] cursor-not-allowed select-none border-none bg-transparent"
                  title="Sign in to view your dashboard"
                >
                  {link.label}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </button>
              ) : (
                <Link href={link.href} className="relative px-2.5 py-1.5 rounded-md text-[15px] font-medium flex items-center gap-1 transition-all duration-300 text-[var(--text)] hover:text-[var(--blue)] group">
                  {link.label}
                  <span className="absolute bottom-0 left-2.5 right-2.5 h-[2px] bg-gradient-to-r from-[var(--blue)] to-[var(--orange)] rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-1000 ease-out origin-left" />
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <div className="ml-auto flex items-center gap-2.5">
        {/* Theme toggle — desktop only */}
        <button className="relative w-[52px] h-7 bg-transparent border-none p-0 shrink-0 hidden md:block hover:scale-110 active:scale-95 transition-transform duration-200" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle dark/light mode">
          <div className="w-[52px] h-7 rounded-[99px] bg-[var(--border2)] border border-[var(--border)] relative cursor-pointer flex items-center px-1 transition-all duration-300 dark:bg-[#2d3a56] dark:border-[#3b4f72] hover:shadow-[0_0_12px_rgba(59,130,246,.2)]">
            <div className="flex justify-between items-center w-full px-0.5 pointer-events-none">
              <span className="text-[12px] leading-none">☀️</span>
              <span className="text-[12px] leading-none">🌙</span>
            </div>
            <div className="size-5 rounded-full bg-[var(--surface)] shadow-[0_1px_4px_rgba(0,0,0,.2)] absolute left-1 transition-[transform,background] duration-300 dark:translate-x-6 dark:bg-[#3b82f6]"></div>
          </div>
        </button>

        {/* Cart — desktop only */}
        <Link href="/cart" className="bg-transparent border-none text-[var(--muted)] p-1.5 rounded-md flex relative cursor-pointer transition-all duration-200 hover:text-[var(--text)] hover:bg-[var(--bg)] hover:scale-110 active:scale-95 hidden md:flex" title="Cart">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
          {cartCount > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[9.5px] font-extrabold flex items-center justify-center"
              style={{ background: "var(--orange)", color: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.25)" }}
            >
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </Link>

        {/* Profile tab */}
        <div className="relative hidden md:block" ref={profileRef}>
          <button
            onClick={() => {
              if (!isAuthenticated) {
                if (pathname === '/') {
                  window.dispatchEvent(new CustomEvent('fs:highlight-login'));
                } else {
                  router.push('/#student-login');
                }
                return;
              }
              setProfileOpen((prev) => !prev);
            }}
            className={`flex items-center gap-2 bg-[var(--bg)] border rounded-lg pl-1.5 pr-3 py-1 text-[13px] cursor-pointer transition-all duration-200 hover:border-[var(--blue2)] hover:shadow-[0_0_0_3px_var(--blue-d)] ${profileOpen ? "border-[var(--blue2)] shadow-[0_0_0_3px_var(--blue-d)]" : "border-[var(--border)]"
              }`}
          >
            {/* Avatar */}
            {isLoading ? (
              <div className="size-7 rounded-full bg-[var(--border)] animate-pulse shrink-0" />
            ) : isAuthenticated && user ? (
              user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="size-7 rounded-full object-cover shrink-0" />
              ) : (
                <div className="size-7 rounded-full bg-[linear-gradient(135deg,var(--blue)_0%,var(--orange)_100%)] flex items-center justify-center text-[12px] font-bold text-white shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )
            ) : (
              <div className="size-7 rounded-full bg-[var(--border)] flex items-center justify-center shrink-0 text-[var(--muted)]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 1 0-16 0" /></svg>
              </div>
            )}

            {/* Label */}
            <div className="hidden sm:block">
              {!isLoading && isAuthenticated && user ? (
                <>
                  <div className="font-semibold text-[12px] leading-[1.2] text-[var(--text)]">
                    Hi, {user.name.split(" ")[0]}
                  </div>
                  <div className="text-[10px] text-[var(--orange)] font-medium leading-[1.2] capitalize">
                    {user.role.toLowerCase()}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-semibold text-[12px] leading-[1.2] text-[var(--text)]">Sign In</div>
                  <div className="text-[10px] text-[var(--muted)] font-medium leading-[1.2]">or Sign Up</div>
                </>
              )}
            </div>

            {/* Chevron */}
            <svg
              width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{
                marginLeft: 4,
                color: "var(--muted)",
                transform: profileOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Dropdown panel */}
          {profileOpen && (
            <div className="absolute right-0 top-[calc(100%+10px)] z-50">
              {isAuthenticated && user && (
                <div className="w-[260px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
                  <div className="p-4 border-b border-[var(--border)] bg-gradient-to-br from-blue-500/5 to-orange-500/5">
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="size-11 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="size-11 rounded-full bg-[linear-gradient(135deg,var(--blue),var(--orange))] flex items-center justify-center text-white font-bold text-lg shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-[13px] text-[var(--text)] truncate">{user.name}</div>
                        <div className="text-[11px] text-[var(--muted)] truncate">{user.email}</div>
                        <span className="mt-1 inline-block px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 text-[9px] font-bold uppercase tracking-widest">
                          {user.role}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="py-1">
                    <Link href="/my-dashboard" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--bg)] transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>
                      My Dashboard
                    </Link>
                    <Link href="/courses" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--bg)] transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                      My Courses
                    </Link>
                    <Link href="/certificates" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--bg)] transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" /></svg>
                      Certificates
                    </Link>
                  </div>
                  <div className="border-t border-[var(--border)] py-1">
                    <Link href="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--bg)] transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                      Profile
                    </Link>
                  </div>
                  <div className="border-t border-[var(--border)] py-1">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hamburger — mobile */}
        <button
          onClick={() => setMobileOpen(p => !p)}
          className="md:hidden flex items-center justify-center size-8 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-all border-none bg-transparent cursor-pointer shrink-0"
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileOpen ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>}
          </svg>
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 top-14 z-50 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile menu panel */}
      <div className={`fixed top-14 right-0 z-50 w-[260px] h-[calc(100vh-56px)] bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl md:hidden overflow-y-auto transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "translate-x-full"}`}>
        {/* Mobile search */}
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2.5 gap-1.5 h-[32px] focus-within:border-[var(--blue2)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[var(--muted)]"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input type="text" placeholder="Search courses…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={handleSearchKey} className="bg-transparent border-none outline-none text-[var(--text)] text-[12px] w-full placeholder:text-[var(--muted)]" />
          </div>
        </div>

        {/* Nav links */}
        <div className="py-1">
          {[
            { href: "/courses", label: "Courses" },
            { href: "/paths", label: "Career Paths" },
            { href: "/certificates", label: "Certifications" },
            { href: "/live-classes", label: "Live Classes" },
            { href: "/jobs", label: "Jobs" },
            { href: "/my-dashboard", label: "My Dashboard", requiresAuth: true },
          ].map((link) => {
            const locked = link.requiresAuth && !isAuthenticated && !isLoading;
            return (
              <div key={link.label} className="px-2">
                {locked ? (
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      if (pathname === '/') {
                        window.dispatchEvent(new CustomEvent('fs:highlight-login'));
                      } else {
                        router.push('/#student-login');
                      }
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[12.5px] font-medium text-[var(--muted)] opacity-50 cursor-not-allowed select-none border-none bg-transparent text-left"
                    title="Sign in to view your dashboard"
                  >
                    {link.label}
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 ml-auto"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  </button>
                ) : (
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[12.5px] font-medium text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
                  >
                    {link.label}
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-[var(--border)] mx-3" />

        {/* Cart + Theme */}
        <div className="px-3 py-1 flex flex-col gap-0.5">
          <Link href="/cart" onClick={() => setMobileOpen(false)} className="px-2.5 py-1.5 rounded-md text-[12.5px] font-medium text-[var(--text)] hover:bg-[var(--bg)] transition-colors no-underline">
            Cart
          </Link>
          <button onClick={toggleTheme} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12.5px] font-medium text-[var(--text)] hover:bg-[var(--bg)] transition-colors border-none bg-transparent cursor-pointer w-full">
            <div className="relative w-[42px] h-[22px] rounded-[99px] bg-[var(--border2)] border border-[var(--border)] flex items-center px-0.5 transition-[background] duration-300 dark:bg-[#2d3a56] dark:border-[#3b4f72]">
              <div className="flex justify-between items-center w-full px-0.5 pointer-events-none text-[10px] leading-none">
                <span>☀️</span>
                <span>🌙</span>
              </div>
              <div className="size-[18px] rounded-full bg-[var(--surface)] shadow-[0_1px_4px_rgba(0,0,0,.2)] absolute left-[2px] transition-[transform,background] duration-300 dark:translate-x-5 dark:bg-[#3b82f6]"></div>
            </div>
            Theme
          </button>
        </div>

        <div className="border-t border-[var(--border)] mx-3" />

        {/* Profile (signed in) */}
        {!isLoading && isAuthenticated && user && (
          <div className="px-3 py-1.5">
            <div className="flex items-center gap-2.5 px-2.5 py-1.5 mb-1">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="size-8 rounded-full object-cover shrink-0" />
              ) : (
                <div className="size-8 rounded-full bg-[linear-gradient(135deg,var(--blue),var(--orange))] flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-semibold text-[12px] text-[var(--text)] truncate">{user.name}</div>
                <div className="text-[9px] text-[var(--muted)] truncate">{user.email}</div>
              </div>
            </div>
            <Link href="/my-dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[var(--text)] hover:bg-[var(--bg)] transition-colors no-underline">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>
              My Dashboard
            </Link>
            <Link href="/courses" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[var(--text)] hover:bg-[var(--bg)] transition-colors no-underline">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
              My Courses
            </Link>
            <Link href="/certificates" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[var(--text)] hover:bg-[var(--bg)] transition-colors no-underline">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" /></svg>
              Certificates
            </Link>
            <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[var(--text)] hover:bg-[var(--bg)] transition-colors no-underline">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
              Profile
            </Link>
            <button onClick={() => { setMobileOpen(false); handleLogout(); }} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer border-none bg-transparent text-left">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              Sign Out
            </button>
          </div>
        )}

        {/* Sign in (not authenticated) */}
        {!isLoading && !isAuthenticated && (
          <div className="px-3 py-1.5">
            <button
              onClick={() => {
                setMobileOpen(false);
                if (pathname === '/') {
                  window.dispatchEvent(new CustomEvent('fs:highlight-login'));
                } else {
                  router.push('/#student-login');
                }
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12.5px] font-medium text-[var(--text)] hover:bg-[var(--bg)] transition-colors border-none bg-transparent cursor-pointer text-left"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 1 0-16 0" /></svg>
              Sign In
            </button>
          </div>
        )}
      </div>
    </nav>

    {/* ── Courses Mega Menu ── */}
    {coursesMegaOpen && (
      <div
        ref={coursesMegaRef}
        onMouseEnter={clearCoursesTimer}
        onMouseLeave={startCoursesTimer}
        className="[animation:fadeIn_.2s_ease]"
      >
        <div id="coursesMega" className="fixed top-14 left-0 right-0 z-[100] bg-[var(--surface)] border-t border-b border-[var(--border2)] shadow-[var(--shadow-lg)] overflow-hidden">
          <div className="flex w-full" style={{ height: '380px' }}>
            {/* ── Left Rail ── */}
            <div className="w-[240px] shrink-0 bg-black/[0.02] dark:bg-white/[0.03] border-r border-[var(--border2)] p-2.5 overflow-hidden">
              <div className="flex items-center gap-2 px-3 pb-3 mb-1 text-[11.5px] font-bold uppercase tracking-[.04em] text-[var(--text3)]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                Domains
              </div>
              {coursesLoading ? (
                <div className="px-3 py-6 text-center text-[12px] text-[var(--text3)]">Loading...</div>
              ) : courseCatsData.length === 0 ? (
                <div className="px-3 py-6 text-center text-[12px] text-[var(--text3)]">No categories found</div>
              ) : (
                courseCatsData.map((cat, idx) => {
                  const colors = ['#6366f1', '#8b5cf6', '#0d9488', '#db2777', '#0284c7', '#d97706'];
                  const catColor = colors[idx % colors.length];
                  const active = activeCourseCat === cat.id;
                  return (
                    <button
                      key={cat.id}
                      data-cat={cat.id}
                      onMouseEnter={() => setActiveCourseCat(cat.id)}
                      onClick={() => setActiveCourseCat(cat.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 mb-0.5 rounded-lg text-left border-l-4 border-l-transparent cursor-pointer transition-all duration-200 hover:bg-[var(--surface)]"
                      style={active ? { background: 'var(--surface)', borderLeftColor: catColor, boxShadow: 'var(--shadow)', outline: '1px solid var(--border2)', outlineOffset: '-1px' } : undefined}
                    >
                      {cat.label}
                      <span className="ml-auto text-[15px] leading-none text-[var(--muted)]" style={active ? { color: catColor } : undefined}>›</span>
                    </button>
                  );
                })
              )}
            </div>

            {/* ── Right Content ── */}
            <div className="flex-1 px-5 py-3 overflow-hidden flex flex-col">
              {coursesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !coursesByCat[activeCourseCat] || coursesByCat[activeCourseCat].length === 0 ? (
                <div className="flex items-center justify-center h-full text-[13px] text-[var(--text3)]">No courses in this category</div>
              ) : (
                <>
                  <div className="flex items-baseline justify-between mb-3.5 pb-3 border-b border-[var(--border2)]">
                    <h4 className="text-sm font-bold text-[var(--text)]">{courseCatsData.find(c => c.id === activeCourseCat)?.label || ''}</h4>
                    <a href="#" onClick={(e) => { e.preventDefault(); router.push('/courses'); }} className="flex items-center gap-1 text-[12.5px] font-bold text-[var(--orange)] hover:underline">
                      <span>{courseCatsData.find(c => c.id === activeCourseCat)?.count || 0} courses</span>
                      <span className="text-[15px] leading-none">›</span>
                    </a>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 flex-1 content-start" key={activeCourseCat}>
                    {coursesByCat[activeCourseCat]?.map((course) => {
                      const idx = courseCatsData.findIndex(c => c.id === activeCourseCat);
                      const colors = ['#6366f1', '#8b5cf6', '#0d9488', '#db2777', '#0284c7', '#d97706'];
                      const catColor = colors[idx % colors.length];
                      return (
                        <a
                          key={course.slug}
                          href="#"
                          onClick={(e) => { e.preventDefault(); setCoursesMegaOpen(false); router.push(`/courses/${course.slug}`); }}
                          className="flex items-center justify-between gap-2.5 px-2.5 py-[6px] rounded-lg text-[13px] font-semibold text-[var(--text)] border border-transparent cursor-pointer transition-all duration-200 hover:bg-[var(--bg)] hover:border-[var(--border2)]"
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0 opacity-55" style={{ background: catColor }}></span>
                            {course.title}
                          </span>
                          <span className="text-[10.5px] font-semibold text-[var(--muted)] shrink-0">{course.duration}</span>
                        </a>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-7 py-3 text-[11.5px] text-[var(--muted)] border-t border-[var(--border2)] bg-black/[0.02] dark:bg-white/[0.025]">
            <span>{courseCatsData.reduce((s, c) => s + c.count, 0)}+ courses across {courseCatsData.length} domains</span>
            <Link href="/courses" onClick={() => setCoursesMegaOpen(false)} className="flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--blue)] hover:text-[var(--orange)]">
              View All Courses
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          </div>
        </div>
      </div>
    )}

    {/* ── Paths Mega Menu ── */}
    {pathsMegaOpen && (
      <div
        ref={pathsMegaRef}
        onMouseEnter={clearPathsTimer}
        onMouseLeave={startPathsTimer}
        className="[animation:fadeIn_.2s_ease]"
      >
        <div id="pathsMega" className="fixed top-14 left-0 right-0 z-[100] bg-[var(--surface)] border-t border-b border-[var(--border2)] shadow-[var(--shadow-lg)] overflow-hidden">
          <div className="flex w-full" style={{ height: '380px' }}>
            {/* ── Left Rail ── */}
            <div className="w-[280px] shrink-0 bg-black/[0.02] dark:bg-white/[0.03] border-r border-[var(--border2)] p-2.5 overflow-y-auto">
              <div className="flex items-center gap-2 px-3 pb-3 mb-1 text-[11.5px] font-bold uppercase tracking-[.04em] text-[var(--text3)]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M3 3v18h18" /><path d="M18 17V9M13 17V5M8 17v-4" /></svg>
                Career Paths
              </div>
              {tracksLoading ? (
                <div className="px-3 py-6 text-center text-[12px] text-[var(--text3)]">Loading...</div>
              ) : tracksData.length === 0 ? (
                <div className="px-3 py-6 text-center text-[12px] text-[var(--text3)]">No paths available</div>
              ) : (
                tracksData.map((p, idx) => {
                  const colors = ['#6366f1', '#8b5cf6', '#0d9488', '#db2777', '#0284c7', '#d97706'];
                  const catColor = colors[idx % colors.length];
                  const active = activePathCat === p.id;
                  return (
                    <button
                      key={p.id}
                      data-path={p.id}
                      onMouseEnter={() => setActivePathCat(p.id)}
                      onClick={() => setActivePathCat(p.id)}
                      className="w-full flex flex-col items-start gap-0.5 px-3 py-1.5 mb-0.5 rounded-lg text-left border-l-4 border-l-transparent cursor-pointer transition-all duration-200 hover:bg-[var(--surface)]"
                      style={active ? { background: 'var(--surface)', borderLeftColor: catColor, boxShadow: 'var(--shadow)', outline: '1px solid var(--border2)', outlineOffset: '-1px' } : undefined}
                    >
                      <span className="flex items-center gap-2.5 w-full text-[13px] font-semibold text-[var(--text)]">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: active ? catColor : 'var(--muted)' }} className="w-[18px] h-[18px] shrink-0"><path d="M12 2l10 6v8l-10 6L2 16V8z" /></svg>
                        {p.title}
                      </span>
                      <span className="text-[10.5px] text-[var(--muted)] pl-7">{p.courseCount} Courses</span>
                    </button>
                  );
                })
              )}
            </div>

            {/* ── Right Content ── */}
            <div className="flex-1 px-5 py-3 overflow-hidden" key={activePathCat}>
              {(() => {
                const track = tracksData.find((t) => t.id === activePathCat);
                if (!track) return (
                  <div className="flex items-center justify-center h-full text-[13px] text-[var(--text3)]">Select a path</div>
                );
                const title = track.title;
                const desc = track.description || 'A guided learning path to master this career track.';
                const level = track.courseCount >= 8 ? "Advanced" : track.courseCount >= 5 ? "Intermediate" : "Beginner Friendly";
                const idx = tracksData.findIndex((t) => t.id === activePathCat);
                const colors = ['#6366f1', '#8b5cf6', '#0d9488', '#db2777', '#0284c7', '#d97706'];
                const catColor = colors[idx % colors.length];
                return (
                  <div className="min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-[15px] font-bold text-[var(--text)]">{title}</h4>
                      <span className="text-[10px] font-bold uppercase tracking-[.04em] px-2.5 py-[3px] rounded-full text-[#4f46e5] bg-[rgba(99,102,241,.12)] dark:bg-[rgba(129,140,248,.18)] dark:text-[#a5b4fc]">{level}</span>
                    </div>
                    <div className="text-[11.5px] text-[var(--muted)] mb-3.5">{track.courseCount} Courses · {(() => { const total = trackCourses.reduce((s, c) => s + (c.hours ?? 0), 0); return total > 0 ? `${total}+ hrs` : 'Self-Paced'; })()} · Certificate on completion</div>
                    <p className="text-[12.5px] leading-[1.55] text-[var(--text2)] mb-2.5 line-clamp-2">{desc}</p>
                    {trackCourses[0]?.techStack?.length ? (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {trackCourses[0].techStack.slice(0, 5).map((t) => (
                          <span key={t} className="text-[10.5px] font-semibold px-2.5 py-[3px] rounded-full text-[var(--muted)] bg-[var(--bg)] border border-[var(--border2)]">{t}</span>
                        ))}
                      </div>
                    ) : null}
                    <div className="border-t border-[var(--border2)] pt-3 pb-3">
                      <h6 className="text-[10.5px] uppercase tracking-[.05em] font-bold text-[var(--muted)] mb-4">Courses in this Path</h6>
                      {trackCoursesLoading ? (
                        <div className="text-[11px] text-[var(--text3)]">Loading...</div>
                      ) : trackCourses.length === 0 ? (
                        <div className="text-[11px] text-[var(--muted)]">{track.courseCount} courses</div>
                      ) : (
                        <div className="flex gap-x-8 h-[112px] overflow-hidden">
                          {(() => {
                            const shown = showAllPathCourses ? trackCourses : trackCourses.slice(0, 5);
                            const remaining = trackCourses.length - shown.length;
                            const canMore = !showAllPathCourses && remaining > 0;
                            const col1 = shown.slice(0, 3);
                            const col2 = shown.slice(3);
                            const renderRow = (c: { id: string; title: string }) => (
                              <button
                                key={c.id}
                                onClick={() => { setPathsMegaOpen(false); router.push(`/courses/${slugify(c.title)}`); }}
                                className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-lg text-[13px] font-semibold text-left text-[var(--text)] border border-transparent cursor-pointer transition-all duration-200 hover:bg-[var(--bg)] hover:border-[var(--border2)]"
                              >
                                <span className="w-1.5 h-1.5 rounded-full shrink-0 opacity-55" style={{ background: catColor }}></span>
                                <span className="truncate">{c.title}</span>
                              </button>
                            );
                            return (
                              <>
                                <div className="flex-1 flex flex-col gap-y-1">
                                  {col1.map((c) => renderRow(c))}
                                </div>
                                <div className="flex-1 flex flex-col gap-y-1">
                                  {col2.map((c) => renderRow(c))}
                                  {canMore && (
                                    <button
                                      onClick={() => setShowAllPathCourses(true)}
                                      className="flex items-center gap-2 px-2.5 py-[6px] rounded-lg text-[13px] font-bold text-left text-[var(--orange)] border border-dashed border-[var(--border2)] cursor-pointer transition-all duration-200 hover:bg-[var(--bg)] hover:border-[var(--orange)]/50"
                                    >
                                      +{remaining} more
                                    </button>
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPathsMegaOpen(false);
                        router.push('/paths');
                      }}
                      className="group w-full flex items-center justify-start gap-2 mt-1 text-[12.5px] font-bold text-white px-4 py-2 rounded-lg cursor-pointer shadow-[0_4px_16px_rgba(240,90,26,.3)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(240,90,26,.4)] hover:-translate-y-[1px] active:translate-y-0"
                      style={{ background: catColor }}
                    >
                      View Path Details
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-[13px] h-[13px] transition-transform duration-200 group-hover:translate-x-[2px]"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </a>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    )}
  </>);
}
