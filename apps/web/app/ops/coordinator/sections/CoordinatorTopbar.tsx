"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface CoordinatorTopbarProps {
  user: { name: string; email: string; role: string; initials: string };
  currentView?: string;
  onSearch?: (q: string) => void;
  onSignOut?: () => void;
}

const VIEW_LABELS: Record<string, string> = {
  "dashboard": "coordinator / dashboard",
  "payments": "coordinator / payments",
  "leads": "coordinator / leads",
  "students": "coordinator / students",
  "batches": "coordinator / batches",
  "trainers": "coordinator / trainer-activity",
  "escalations": "coordinator / escalations",
};

export function CoordinatorTopbar({ user, currentView, onSearch, onSignOut }: CoordinatorTopbarProps) {
  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark",
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const profileRef = useRef<HTMLDivElement>(null);

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
    try { localStorage.setItem("fs-theme", next); } catch { }
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    onSearch?.(e.target.value);
  }

  return (
    <div
      style={{ height: 42, background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
      className="flex items-center px-3.5 gap-2.5 shrink-0"
    >
      <div className="flex items-center gap-2 font-extrabold text-[13px] shrink-0 tracking-wide">
        <Image src="/images/logo.png" alt="FutureStack" width={120} height={28} style={{ height: 38, width: "auto" }} />
        <span style={{ color: "var(--border2)" }}>/</span>
        <span style={{ color: "var(--text3)", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em" }} className="uppercase">
          OPS CONSOLE
        </span>
      </div>

      <div
        style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--text3)", borderLeft: "1px solid var(--border)", paddingLeft: 8 }}
        className="flex items-center gap-1.5"
      >
        {VIEW_LABELS[currentView || "dashboard"]?.split("/").map((part, i, arr) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span>/</span>}
            <b style={{ color: i === arr.length - 1 ? "var(--text2)" : "var(--text3)", fontWeight: i === arr.length - 1 ? 600 : 400 }}>{part.trim()}</b>
          </span>
        ))}
      </div>

      <div
        className="flex items-center gap-1.5 px-2 rounded flex-1 max-w-[320px]"
        style={{ background: "var(--panel)", border: "1px solid var(--border)", height: 26 }}
      >
        <span style={{ color: "var(--text3)", fontSize: 11 }}>⌕</span>
        <input
          value={search}
          onChange={handleSearch}
          placeholder="Search students, leads, payments…"
          className="w-full bg-transparent outline-none font-mono text-[10px]"
          style={{ color: "var(--text)" }}
        />
      </div>

      <span
        className="flex items-center gap-1.5 font-mono text-[8.5px] font-bold px-1.5 py-0.5 rounded"
        style={{ background: "var(--green-d)", color: "var(--green)" }}
      >
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--green)", animation: "pulse 1.5s infinite" }} />
        LIVE
      </span>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="w-7 h-7 rounded flex items-center justify-center cursor-pointer text-[13px]"
          style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text2)" }}
          title="Toggle theme"
        >
          {isDark ? "☀" : "●"}
        </button>

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-1.5 cursor-pointer rounded px-1 py-0.5"
            style={{ background: "var(--panel)", border: "1px solid var(--border)" }}
          >
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-[9.5px] font-bold" style={{ background: "var(--blue-d)", color: "var(--blue)" }}>
              {user.initials}
            </span>
            <span className="text-[11px] font-semibold max-w-[110px] truncate" style={{ color: "var(--text)" }}>{user.name}</span>
          </button>

          {profileOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 rounded overflow-hidden z-50 min-w-[190px]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 10px 30px rgba(0,0,0,.16)" }}
            >
              <div className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)", background: "var(--panel)" }}>
                <div className="text-[12px] font-bold" style={{ color: "var(--text)" }}>{user.name}</div>
                <div className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>{user.email}</div>
                <div className="font-mono text-[9px] mt-0.5" style={{ color: "var(--blue)" }}>role :: {user.role.toLowerCase()}</div>
              </div>
              <button
                onClick={() => { setProfileOpen(false); onSignOut?.(); }}
                className="w-full text-left px-3 py-2 text-[11px] font-semibold cursor-pointer"
                style={{ color: "var(--red)", background: "var(--surface)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--panel)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface)"; }}
              >
                ⏻ Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .35; }
        }
      `}</style>
    </div>
  );
}
