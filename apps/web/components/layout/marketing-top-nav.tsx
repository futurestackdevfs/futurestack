"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function TopNav() {
  const [isDark, setIsDark] = useState(false);
  const [animate] = useState(() => {
    if (typeof window !== "undefined") {
      const v = sessionStorage.getItem("fs-nav-animated");
      if (!v) { sessionStorage.setItem("fs-nav-animated", "true"); return true; }
    }
    return false;
  });

  useEffect(() => {
    const html = document.documentElement;
    setIsDark(html.getAttribute("data-theme") === "dark");
  }, []);

  function toggleTheme() {
    const html = document.documentElement;
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    setIsDark(next === "dark");
    try {
      localStorage.setItem("fs-theme", next);
    } catch {}
  }

  return (
    <nav className={`flex items-center gap-5 px-6 h-14 bg-[var(--surface)] border-b border-[var(--border)] fixed top-0 left-0 right-0 z-[999] shadow-[var(--shadow)] ${animate ? "[animation:slideDown_.4s_ease_both]" : ""}`}>
      <Link href="/students" className="flex items-center gap-2.5 shrink-0 no-underline">
        <img src="/images/logo.png" alt="FutureStack" style={{ height: 35 }} />
      </Link>

      <div className="flex-1 max-w-[320px] flex items-center bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 gap-2 h-[34px] transition-[border-color,box-shadow] duration-200 focus-within:border-[var(--blue2)] focus-within:shadow-[0_0_0_3px_var(--blue-d)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[var(--muted)]"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Search courses, topics, or skills…" className="bg-transparent border-none outline-none text-[var(--text)] text-[13px] w-full placeholder:text-[var(--muted)]" />
        <span className="text-[10px] text-[var(--muted)] border border-[var(--border)] rounded px-[5px] py-[1px] shrink-0">Ctrl+K</span>
      </div>

      <ul className="flex items-center gap-0.5 list-none">
        {[
          { href: "/students/courses", label: "Courses" },
          { href: "/students/paths", label: "Career Paths" },
          { href: "/students/certificates", label: "Certifications" },
          { href: "/students/live-classes", label: "Live Classes" },
          { href: "/students/jobs", label: "R&D Services" },
          { href: "/students/my-dashboard", label: "My Dashboard" },
        ].map((link, i) => (
          <li key={link.label} style={animate ? { animation: `fadeUp .35s ${.08 + i * .05}s ease both` } : {}}>
            <Link href={link.href} className="px-2.5 py-1.5 rounded-md text-[13px] font-medium flex items-center gap-1 transition-all duration-150 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]">{link.label}</Link>
          </li>
        ))}
      </ul>

      <div className="ml-auto flex items-center gap-2.5">
        <button className="relative w-[52px] h-7 bg-transparent border-none p-0 shrink-0" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle dark/light mode">
          <div className="w-[52px] h-7 rounded-[99px] bg-[var(--border2)] border border-[var(--border)] relative cursor-pointer flex items-center px-1 transition-[background] duration-300 dark:bg-[#2d3a56] dark:border-[#3b4f72]">
            <div className="flex justify-between items-center w-full px-0.5 pointer-events-none">
              <span className="text-[12px] leading-none">☀️</span>
              <span className="text-[12px] leading-none">🌙</span>
            </div>
            <div className="size-5 rounded-full bg-[var(--surface)] shadow-[0_1px_4px_rgba(0,0,0,.2)] absolute left-1 transition-[transform,background] duration-300 dark:translate-x-6 dark:bg-[#3b82f6]"></div>
          </div>
        </button>

        <Link href="/cart" className="bg-transparent border-none text-[var(--muted)] p-1.5 rounded-md flex relative cursor-pointer transition-all duration-150 hover:text-[var(--text)] hover:bg-[var(--bg)]" title="Cart">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        </Link>

        <div className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg pl-1.5 pr-3 py-1 text-[13px] cursor-pointer">
          <div className="size-7 rounded-full bg-[linear-gradient(135deg,var(--blue)_0%,var(--orange)_100%)] flex items-center justify-center text-[12px] font-bold text-white shrink-0">H</div>
          <div>
            <div className="font-semibold text-[12px] leading-[1.2]">Hi, Learner</div>
            <div className="text-[10px] text-[var(--orange)] font-medium leading-[1.2]">Beginner</div>
          </div>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 4, color: "var(--muted)" }}><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
    </nav>
  );
}
