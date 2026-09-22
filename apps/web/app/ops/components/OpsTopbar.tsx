"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface OpsTopbarProps {
  role: { name: string; email: string; role: string; initials: string };
  breadcrumb: { title: string; subtitle: string };
  onSearch?: (q: string) => void;
  onMenuClick?: () => void;
}

export function OpsTopbar({ role, breadcrumb, onSearch, onMenuClick }: OpsTopbarProps) {
  const [isDark, setIsDark] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const html = document.documentElement;
    setIsDark(html.getAttribute("data-theme") === "dark");
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleTheme() {
    const html = document.documentElement;
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    setIsDark(next === "dark");
    try { localStorage.setItem("fs-theme", next); } catch {}
  }

  return (
    <div
      style={{ height: 42, background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
      className="flex items-center px-2.5 sm:px-3.5 gap-1.5 sm:gap-2.5 shrink-0"
    >
      {/* Menu toggle — mobile/tablet only */}
      <button
        onClick={onMenuClick}
        className="md:hidden flex items-center justify-center w-7 h-7 rounded shrink-0"
        style={{ color: "var(--text2)" }}
        aria-label="Open menu"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
      </button>

      <div className="flex items-center gap-2 font-extrabold text-[13px] shrink-0 tracking-wide">
        <Image src="/images/logo.png" alt="FutureStack" width={120} height={22} style={{ height: 38, width: "auto" }} />
        <span style={{ color: "var(--border2)" }} className="hidden sm:inline">/</span>
        <span style={{ color: "var(--text3)", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em" }} className="hidden sm:inline uppercase">
          OPS CONSOLE
        </span>
      </div>

      <div
        style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--text3)", borderLeft: "1px solid var(--border)", paddingLeft: 8 }}
        className="hidden lg:flex items-center gap-1.5"
      >
        {breadcrumb.title} <span>/</span> <b style={{ color: "var(--text2)", fontWeight: 600 }}>{breadcrumb.subtitle}</b>
      </div>

      <div
        style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, height: 26 }}
        className="hidden sm:flex flex-1 max-w-[280px] ml-2 items-center gap-1.5 px-2"
      >
        <span style={{ color: "var(--text3)", fontSize: 11 }}>⌕</span>
        <input
          type="text"
          onChange={(e) => onSearch?.(e.target.value)}
          placeholder="Search..."
          style={{ background: "none", border: "none", outline: "none", fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--text)", width: "100%" }}
        />
        <kbd style={{ fontFamily: "var(--mono)", fontSize: 8.5, color: "var(--text3)", border: "1px solid var(--border2)", borderRadius: 3, padding: "1px 4px" }}>⌘K</kbd>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <div
          style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text3)", border: "1px solid var(--border)", borderRadius: 3, background: "var(--bg)" }}
          className="hidden sm:flex items-center gap-1 px-2 py-0.5"
        >
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--green)" }} />LIVE
        </div>

        <button onClick={toggleTheme} className="flex items-center" style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
          <span className={`px-1.5 py-1 text-[11px] ${!isDark ? "bg-[var(--surface)] text-[var(--text)]" : "text-[var(--text3)]"}`}>☀</span>
          <span className={`px-1.5 py-1 text-[11px] ${isDark ? "bg-[var(--surface)] text-[var(--text)]" : "text-[var(--text3)]"}`}>●</span>
        </button>

        <button title="Notifications" style={{ width: 26, height: 26, color: "var(--text3)", borderRadius: 4, fontSize: 13 }}
          className="flex items-center justify-center hover:bg-[var(--bg)] hover:text-[var(--text2)]">🔔</button>
        <button title="Settings" style={{ width: 26, height: 26, color: "var(--text3)", borderRadius: 4, fontSize: 13 }}
          className="flex items-center justify-center hover:bg-[var(--bg)] hover:text-[var(--text2)]">⚙</button>

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((p) => !p)}
            className="flex items-center gap-1.5"
            style={{ padding: "3px 9px 3px 4px", border: "1px solid var(--border)", borderRadius: 5, background: "var(--bg)", cursor: "pointer" }}
          >
            <div
              style={{ width: 21, height: 21, borderRadius: 3, background: "linear-gradient(135deg, var(--blue), var(--orange))" }}
              className="flex items-center justify-center font-bold text-[9.5px] text-white shrink-0 font-mono"
            >{role.initials}</div>
            <div className="hidden md:block text-left">
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", lineHeight: 1.1 }}>{role.name}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--orange)", lineHeight: 1.1 }}>{role.role}</div>
            </div>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ color: "var(--muted)", transform: profileOpen ? "rotate(180deg)" : "", transition: "transform 0.2s", marginLeft: 4 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {profileOpen && (
            <div className="absolute right-0 z-50" style={{ top: "calc(100% + 8px)" }}>
              <div className="w-[260px] rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface)", boxShadow: "0 8px 32px rgba(0,0,0,.18)" }}>
                <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-3">
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: "linear-gradient(135deg, var(--blue), var(--orange))" }}
                      className="flex items-center justify-center text-white font-bold text-base shrink-0 font-mono">{role.initials}</div>
                    <div className="min-w-0">
                      <div className="font-bold text-[13px] truncate" style={{ color: "var(--text)" }}>{role.name}</div>
                      <div className="text-[11px] truncate" style={{ color: "var(--muted)" }}>{role.email}</div>
                      <span className="mt-1 inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest" style={{ background: "var(--orange-d)", color: "var(--orange)" }}>{role.role}</span>
                    </div>
                  </div>
                </div>
                <div className="py-1">
                  <button onClick={() => setProfileOpen(false)} className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium transition-colors hover:bg-[var(--bg)]" style={{ color: "var(--text)" }}><span style={{ fontSize: 14 }}>👤</span> My Profile</button>
                  <button onClick={() => setProfileOpen(false)} className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium transition-colors hover:bg-[var(--bg)]" style={{ color: "var(--text)" }}><span style={{ fontSize: 14 }}>⚙</span> Account Settings</button>
                </div>
                <div className="border-t py-1" style={{ borderColor: "var(--border)" }}>
                  <button onClick={() => { setProfileOpen(false); router.push("/auth/staff-login"); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium transition-colors hover:bg-[var(--bg)]" style={{ color: "var(--red)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
