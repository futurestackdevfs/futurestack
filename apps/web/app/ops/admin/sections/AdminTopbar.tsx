"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface AdminTopbarProps {
  user: { name: string; email: string; role: string; initials: string };
  currentView?: string;
  token?: string;
  onSearch?: (q: string) => void;
  onNavigate?: (result: GlobalSearchResult) => void;
  onRefresh?: () => void;
  onMyProfile?: () => void;
  onAccountSettings?: () => void;
  onSignOut?: () => void;
}

export interface GlobalSearchResult {
  type: "course" | "user" | "trainer" | "order" | "coupon" | "lead";
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
}

interface GlobalSearchGroup {
  key: string;
  label: string;
  icon: string;
  items: GlobalSearchResult[];
}

interface GlobalSearchPayload {
  courses: { id: string; title: string; code: string; status: string; category: string; price: number | null; originalPrice: number | null }[];
  users: { id: string; name: string; email: string; role: string; companyId: string | null; isActive: boolean }[];
  trainers: { id: string; name: string; email: string; approvalStatus: string; rating: number | null }[];
  orders: { id: string; orderNo: string; status: string; totalAmount: number; currency: string; createdAt: string; studentName: string | null; studentEmail: string | null; courseTitle: string | null }[];
  coupons: { id: string; code: string; discountType: string; value: number; currency: string | null; isActive: boolean; usedCount: number }[];
  leads: { id: string; name: string; email: string | null; phone: string | null; course: string | null; status: string }[];
}

const VIEW_LABELS: Record<string, string> = {
  "admin-dashboard": "platform-admin / dashboard",
  "master-data": "platform-admin / master-data",
  "sales": "sales / dashboard",
  "trainer": "trainer / dashboard",
  "coordinator": "coordinator / dashboard",
  "support": "support / dashboard",
  "content-manager": "content / dashboard",
};

export function AdminTopbar({ user, currentView, token, onSearch, onNavigate, onRefresh, onMyProfile, onAccountSettings, onSignOut }: AdminTopbarProps) {
  const [isDark, setIsDark] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<GlobalSearchGroup[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    setIsDark(html.getAttribute("data-theme") === "dark");
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function toggleTheme() {
    const html = document.documentElement;
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    setIsDark(next === "dark");
    try { localStorage.setItem("fs-theme", next); } catch { }
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setSearch(value);
    setSearchOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value), 250);
  }

  async function runSearch(q: string) {
    const query = q.trim();
    if (!token || !query) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Search failed");
      const data = (await res.json()) as GlobalSearchPayload;
      const groups: GlobalSearchGroup[] = [];
      const push = (key: string, label: string, icon: string, items: GlobalSearchResult[]) => {
        if (items.length > 0) groups.push({ key, label, icon, items });
      };
      push("courses", "Courses", "📚", data.courses.map((c) => ({
        type: "course", id: c.id,
        title: c.title,
        subtitle: c.code,
        meta: `${c.category || ""} · ${c.status}${c.price ? ` · ₹${c.price.toLocaleString()}` : ""}`,
      })));
      push("users", "Users", "👤", data.users.map((u) => ({
        type: "user", id: u.id,
        title: u.name,
        subtitle: u.email,
        meta: `${u.role}${u.isActive ? " · active" : " · inactive"}`,
      })));
      push("trainers", "Trainers", "🎓", data.trainers.map((t) => ({
        type: "trainer", id: t.id,
        title: t.name,
        subtitle: t.email,
        meta: t.approvalStatus,
      })));
      push("orders", "Orders", "💵", data.orders.map((o) => ({
        type: "order", id: o.id,
        title: o.orderNo,
        subtitle: o.studentName || o.studentEmail || "",
        meta: `${o.status} · ${o.currency === "USD" ? "$" : "₹"}${o.totalAmount.toLocaleString()}${o.courseTitle ? ` · ${o.courseTitle}` : ""}`,
      })));
      push("coupons", "Coupons", "🎟", data.coupons.map((c) => ({
        type: "coupon", id: c.id,
        title: c.code,
        subtitle: c.discountType === "PERCENT" ? `${c.value}% off` : `${c.currency} ${c.value}`,
        meta: `${c.usedCount} used · ${c.isActive ? "active" : "inactive"}`,
      })));
      push("leads", "Leads", "📞", data.leads.map((l) => ({
        type: "lead", id: l.id,
        title: l.name,
        subtitle: l.email || l.phone || "",
        meta: `${l.course || ""} · ${l.status}`,
      })));
      setSearchResults(groups);
      setSearchLoading(false);
    } catch {
      setSearchResults([]);
      setSearchLoading(false);
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      runSearch(search);
    } else if (e.key === "Escape") {
      setSearch("");
      setSearchOpen(false);
      setSearchResults([]);
      onSearch?.("");
    }
  }

  function clearSearch() {
    setSearch("");
    setSearchOpen(false);
    setSearchResults([]);
    onSearch?.("");
  }

  function pickResult(result: GlobalSearchResult) {
    setSearch("");
    setSearchOpen(false);
    setSearchResults([]);
    onSearch?.(result.title);
    onNavigate?.(result);
  }

  return (
    <div
      style={{
        height: 42,
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}
      className="flex items-center px-3.5 gap-2.5 shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-2 font-extrabold text-[13px] shrink-0 tracking-wide">
        <Image src="/images/logo.png" alt="FutureStack" width={120} height={28} style={{ height: 38, width: "auto" }} />
        <span style={{ color: "var(--border2)" }}>/</span>
        <span style={{ color: "var(--text3)", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em" }} className="uppercase">
          OPS CONSOLE
        </span>
      </div>

      {/* Breadcrumb */}
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10.5,
          color: "var(--text3)",
          borderLeft: "1px solid var(--border)",
          paddingLeft: 8,
        }}
        className="flex items-center gap-1.5"
      >
        {VIEW_LABELS[currentView || "admin-dashboard"]?.split("/").map((part, i, arr) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span>/</span>}
            <b style={{ color: i === arr.length - 1 ? "var(--text2)" : "var(--text3)", fontWeight: i === arr.length - 1 ? 600 : 400 }}>{part.trim()}</b>
          </span>
        ))}
      </div>

      {/* Search */}
      <div ref={searchRef} className="relative flex-1 max-w-[280px] ml-2" style={{ zIndex: 60 }}>
        <div
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            height: 26,
          }}
          className="flex items-center gap-1.5 px-2"
        >
          <button
            onClick={() => runSearch(search)}
            title="Search platform"
            className="flex items-center"
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--text3)" }}
          >
            <span style={{ fontSize: 11 }}>⌕</span>
          </button>
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search platform…"
            style={{
              background: "none",
              border: "none",
              outline: "none",
              fontFamily: "var(--mono)",
              fontSize: 10.5,
              color: "var(--text)",
              width: "100%",
            }}
          />
          {search ? (
            <button
              onClick={clearSearch}
              title="Clear search"
              className="flex items-center justify-center"
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--text3)", fontSize: 12, lineHeight: 1 }}
            >
              ✕
            </button>
          ) : (
            <kbd
              style={{
                fontFamily: "var(--mono)",
                fontSize: 8.5,
                color: "var(--text3)",
                border: "1px solid var(--border2)",
                borderRadius: 3,
                padding: "1px 4px",
                whiteSpace: "nowrap",
              }}
            >
              ↵
            </kbd>
          )}
        </div>

        {searchOpen && search.trim() && (
          <div
            className="absolute left-0 top-[32px] w-[380px] max-h-[420px] overflow-y-auto rounded-xl border"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              boxShadow: "0 12px 40px rgba(0,0,0,.22)",
              zIndex: 100,
            }}
          >
            {searchLoading ? (
              <div className="p-5 text-center font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
                Searching platform…
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-5 text-center font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
                No results for “{search.trim()}”
              </div>
            ) : (
              searchResults.map((group) => (
                <div key={group.key} className="border-b border-[var(--border)] last:border-b-0">
                  <div
                    className="px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-widest"
                    style={{ background: "var(--panel)", color: "var(--text3)" }}
                  >
                    {group.icon} {group.label} ({group.items.length})
                  </div>
                  {group.items.map((item) => (
                    <button
                      key={`${group.key}-${item.id}`}
                      onClick={() => pickResult(item)}
                      className="w-full text-left px-3 py-2 flex items-start gap-2.5 cursor-pointer hover:bg-[var(--bg)]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[11.5px] font-semibold truncate" style={{ color: "var(--text)" }}>{item.title}</div>
                        {item.subtitle && (
                          <div className="font-mono text-[9px] truncate" style={{ color: "var(--text3)" }}>{item.subtitle}</div>
                        )}
                        {item.meta && (
                          <div className="font-mono text-[8.5px] truncate" style={{ color: "var(--text2)" }}>{item.meta}</div>
                        )}
                      </div>
                      <span className="shrink-0 font-mono text-[8.5px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: "var(--orange-d)", color: "var(--orange)" }}>
                        GO
                      </span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right */}
      <div className="ml-auto flex items-center gap-1.5">
        {/* Go to Website */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: "var(--text3)",
            border: "1px solid var(--border)",
            borderRadius: 3,
            background: "var(--bg)",
            height: 22,
            padding: "0 8px",
            display: "flex",
            alignItems: "center",
            gap: 4,
            textDecoration: "none",
            transition: "all .2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--orange)"; e.currentTarget.style.borderColor = "var(--orange)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text3)"; e.currentTarget.style.borderColor = "var(--border)"; }}
        >
          <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
          </svg>
          Website
          <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
          </svg>
        </a>

        {/* Live pill */}
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: "var(--text3)",
            border: "1px solid var(--border)",
            borderRadius: 3,
            background: "var(--bg)",
          }}
          className="flex items-center gap-1 px-2 py-0.5"
        >
          <span
            style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--green)" }}
          />
          LIVE
        </div>

        {/* Refresh current view */}
        <button
          onClick={onRefresh}
          title="Refresh current view"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10.5,
            color: "var(--text3)",
            border: "1px solid var(--border)",
            borderRadius: 3,
            background: "var(--bg)",
            height: 22,
            padding: "0 7px",
            cursor: "pointer",
          }}
          className="flex items-center gap-1 hover:text-[var(--text2)]"
        >
          <span className="text-[11px] leading-none">↻</span>
          Refresh
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <span
            className={`px-1.5 py-1 text-[11px] ${!isDark ? "bg-[var(--surface)] text-[var(--text)]" : "text-[var(--text3)]"}`}
          >
            ☀
          </span>
          <span
            className={`px-1.5 py-1 text-[11px] ${isDark ? "bg-[var(--surface)] text-[var(--text)]" : "text-[var(--text3)]"}`}
          >
            ●
          </span>
        </button>

        {/* Notifications */}
        <button
          title="Notifications"
          style={{
            width: 26,
            height: 26,
            color: "var(--text3)",
            borderRadius: 4,
            fontSize: 13,
          }}
          className="flex items-center justify-center hover:bg-[var(--bg)] hover:text-[var(--text2)]"
        >
          🔔
        </button>

        {/* Settings */}
        <button
          title="Settings"
          style={{
            width: 26,
            height: 26,
            color: "var(--text3)",
            borderRadius: 4,
            fontSize: 13,
          }}
          className="flex items-center justify-center hover:bg-[var(--bg)] hover:text-[var(--text2)]"
        >
          ⚙
        </button>

        {/* Profile — similar to student top nav */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((p) => !p)}
            className="flex items-center gap-1.5"
            style={{
              padding: "3px 9px 3px 4px",
              border: "1px solid var(--border)",
              borderRadius: 5,
              background: "var(--bg)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 21,
                height: 21,
                borderRadius: 3,
                background: "linear-gradient(135deg, var(--blue), var(--orange))",
              }}
              className="flex items-center justify-center font-bold text-[9.5px] text-white shrink-0 font-mono"
            >
              {user.initials}
            </div>
            <div className="text-left">
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", lineHeight: 1.1 }}>
                {user.name}
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--orange)", lineHeight: 1.1 }}>
                {user.role}
              </div>
            </div>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{
                color: "var(--muted)",
                transform: profileOpen ? "rotate(180deg)" : "",
                transition: "transform 0.2s",
                marginLeft: 4,
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <div
              className="absolute right-0 z-50"
              style={{ top: "calc(100% + 8px)" }}
            >
              <div
                className="w-[260px] rounded-2xl border overflow-hidden"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                  boxShadow: "0 8px 32px rgba(0,0,0,.18)",
                }}
              >
                {/* Header */}
                <div
                  className="p-4 border-b"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: "linear-gradient(135deg, var(--blue), var(--orange))",
                      }}
                      className="flex items-center justify-center text-white font-bold text-base shrink-0 font-mono"
                    >
                      {user.initials}
                    </div>
                    <div className="min-w-0">
                      <div
                        className="font-bold text-[13px] truncate"
                        style={{ color: "var(--text)" }}
                      >
                        {user.name}
                      </div>
                      <div
                        className="text-[11px] truncate"
                        style={{ color: "var(--muted)" }}
                      >
                        {user.email}
                      </div>
                      <span
                        className="mt-1 inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest"
                        style={{
                          background: "var(--orange-d)",
                          color: "var(--orange)",
                        }}
                      >
                        {user.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <button
                    onClick={() => { setProfileOpen(false); onMyProfile?.(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium transition-colors hover:bg-[var(--bg)]"
                    style={{ color: "var(--text)" }}
                  >
                    <span style={{ fontSize: 14 }}>👤</span>
                    My Profile
                  </button>
                  <button
                    onClick={() => { setProfileOpen(false); onAccountSettings?.(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium transition-colors hover:bg-[var(--bg)]"
                    style={{ color: "var(--text)" }}
                  >
                    <span style={{ fontSize: 14 }}>⚙</span>
                    Account Settings
                  </button>
                </div>

                <div className="border-t py-1" style={{ borderColor: "var(--border)" }}>
                  <button
                    onClick={() => { setProfileOpen(false); onSignOut?.(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium transition-colors hover:bg-[var(--bg)]"
                    style={{ color: "var(--red)" }}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
