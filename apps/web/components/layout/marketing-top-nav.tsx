"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/app/auth/hooks/use-auth";
import { showToast } from "@/lib/toast";

export function TopNav() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [animate, setAnimate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ slug: string; title: string; category: string }[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestIdx, setSuggestIdx] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

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
      } catch {}
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

  return (
    <nav className={`flex items-center gap-3 md:gap-5 px-3 md:px-6 h-14 bg-[var(--surface)] border-b border-[var(--border)] fixed top-0 left-0 right-0 z-[999] shadow-[var(--shadow)] ${animate ? "[animation:slideDown_.4s_ease_both]" : ""}`}>
      <Link href="/" className="flex items-center gap-2.5 shrink-0 no-underline">
        <img src="/images/logo.png" alt="FutureStack" style={{ height: 28 }} className="max-md:!h-[22px]" />
      </Link>

      <div className="hidden md:flex flex-1 max-w-[320px] relative">
        <div className="flex-1 flex items-center bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 gap-2 h-[34px] transition-[border-color,box-shadow] duration-200 focus-within:border-[var(--blue2)] focus-within:shadow-[0_0_0_3px_var(--blue-d)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[var(--muted)]"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input ref={searchRef} type="text" placeholder="Search courses, topics, or skills…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={handleSearchKey} className="bg-transparent border-none outline-none text-[var(--text)] text-[13px] w-full placeholder:text-[var(--muted)]" />
          <span className="text-[10px] text-[var(--muted)] border border-[var(--border)] rounded px-[5px] py-[1px] shrink-0 hidden sm:inline">Ctrl+K</span>
        </div>
        {suggestOpen && suggestions.length > 0 && (
          <div ref={suggestRef} className="absolute top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-[0_8px_24px_rgba(0,0,0,.12)] overflow-hidden z-50">
            {suggestions.map((s, i) => (
              <button key={s.slug} onClick={() => navigateToCourse(s.slug)}
                onMouseEnter={() => setSuggestIdx(i)}
                className={`w-full flex items-center gap-2 px-3 py-[9px] text-left border-none cursor-pointer transition-colors ${i === suggestIdx ? 'bg-[var(--bg)]' : 'bg-transparent'}`}>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-[var(--text)] truncate">{highlightMatch(s.title, searchQuery)}</div>
                  <div className="text-[9px] text-[var(--text3)] truncate">{s.category}</div>
                </div>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0 text-[var(--muted)]"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </button>
            ))}
            <button onClick={() => { router.push(`/courses?search=${encodeURIComponent(searchQuery.trim())}`); setSearchQuery(""); setSuggestOpen(false); setMobileOpen(false); }}
              className="w-full flex items-center justify-center gap-1 px-3 py-[8px] text-[10px] font-semibold text-[var(--blue2)] bg-transparent border-t border-[var(--border)] cursor-pointer hover:bg-[var(--bg)] transition-colors">
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              See all results for "{searchQuery}"
            </button>
          </div>
        )}
      </div>

      {/* Desktop nav links */}
      <ul className="hidden md:flex items-center gap-0.5 list-none">
        {[
          { href: "/courses", label: "Courses" },
          { href: "/paths", label: "Career Paths" },
          { href: "/certificates", label: "Certifications" },
          { href: "/live-classes", label: "Live Classes" },
          { href: "/jobs", label: "Jobs" },
          { href: "/my-dashboard", label: "My Dashboard", requiresAuth: true },
        ].map((link, i) => {
          const locked = link.requiresAuth && !isAuthenticated && !isLoading;
          return (
            <li key={link.label} style={animate ? { animation: `fadeUp .35s ${.08 + i * .05}s ease both` } : {}}>
              {locked ? (
                <button
                  onClick={() => {
                    if (pathname === '/') {
                      window.dispatchEvent(new CustomEvent('fs:highlight-login'));
                    } else {
                      router.push('/#student-login');
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-md text-[13px] font-medium flex items-center gap-1 transition-all duration-150 text-[var(--muted)] opacity-50 cursor-not-allowed select-none border-none bg-transparent"
                  title="Sign in to view your dashboard"
                >
                  {link.label}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </button>
              ) : (
                <Link href={link.href} className="px-2.5 py-1.5 rounded-md text-[13px] font-medium flex items-center gap-1 transition-all duration-150 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]">{link.label}</Link>
              )}
            </li>
          );
        })}
      </ul>

      <div className="ml-auto flex items-center gap-2.5">
        {/* Theme toggle — desktop only */}
        <button className="relative w-[52px] h-7 bg-transparent border-none p-0 shrink-0 hidden md:block" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle dark/light mode">
          <div className="w-[52px] h-7 rounded-[99px] bg-[var(--border2)] border border-[var(--border)] relative cursor-pointer flex items-center px-1 transition-[background] duration-300 dark:bg-[#2d3a56] dark:border-[#3b4f72]">
            <div className="flex justify-between items-center w-full px-0.5 pointer-events-none">
              <span className="text-[12px] leading-none">☀️</span>
              <span className="text-[12px] leading-none">🌙</span>
            </div>
            <div className="size-5 rounded-full bg-[var(--surface)] shadow-[0_1px_4px_rgba(0,0,0,.2)] absolute left-1 transition-[transform,background] duration-300 dark:translate-x-6 dark:bg-[#3b82f6]"></div>
          </div>
        </button>

        {/* Cart — desktop only */}
        <Link href="/cart" className="bg-transparent border-none text-[var(--muted)] p-1.5 rounded-md flex relative cursor-pointer transition-all duration-150 hover:text-[var(--text)] hover:bg-[var(--bg)] hidden md:flex" title="Cart">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
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
                /* ── Logged-in dropdown ── */
                <div className="w-[260px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
                  {/* User header */}
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

                  {/* Menu links */}
                  <div className="py-1">
                    <Link
                      href="/my-dashboard"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
                      </svg>
                      My Dashboard
                    </Link>
                    <Link
                      href="/courses"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                      </svg>
                      My Courses
                    </Link>
                    <Link
                      href="/certificates"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="8" r="6" />
                        <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                      </svg>
                      Certificates
                    </Link>
                  </div>

                  {/* Settings */}
                  <div className="border-t border-[var(--border)] py-1">
                    <Link
                      href="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                      Settings
                    </Link>
                  </div>

                  {/* Sign out */}
                  <div className="border-t border-[var(--border)] py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
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
          <Link
            href="/cart"
            onClick={() => setMobileOpen(false)}
            className="px-2.5 py-1.5 rounded-md text-[12.5px] font-medium text-[var(--text)] hover:bg-[var(--bg)] transition-colors no-underline"
          >
            Cart
          </Link>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12.5px] font-medium text-[var(--text)] hover:bg-[var(--bg)] transition-colors border-none bg-transparent cursor-pointer w-full"
          >
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
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
              Settings
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
  );
}
