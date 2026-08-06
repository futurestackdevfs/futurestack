"use client";

import { useEffect, useMemo, useState } from "react";

type DiscountType = "PERCENT" | "FLAT";
type Currency = "INR" | "USD";

interface Coupon {
  id: string;
  code: string;
  discountType: DiscountType;
  value: number;
  currency: Currency | null;
  applicableCourseIds: string[];
  minOrderAmount: number | null;
  maxUses: number | null;
  perUserLimit: number;
  isActive: boolean;
  validFrom: string | null;
  validUntil: string | null;
  usedCount: number;
  createdAt: string;
}

function formatMoney(n: number | null | undefined, c?: Currency | null) {
  if (n == null) return "—";
  if (c === "USD") return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2 });
  return "₹" + n.toLocaleString("en-IN");
}

const fieldCls =
  "w-full h-9 rounded-lg bg-[transparent] border border-[var(--border)] px-2.5 text-[12px] text-[var(--text)] outline-none focus:border-[var(--blue)] placeholder:text-[var(--text3)]";
const labelClsMini = "block text-[10px] font-mono font-semibold uppercase tracking-wider mb-1" + " ";

export default function CouponsManager({ token }: { token: string }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState<{ id: string; title: string; trainer: string }[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState("");
  const [coursesSearch, setCoursesSearch] = useState("");
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "danger" }[]>([]);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("PERCENT");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState<Currency>("INR");
  const [minOrder, setMinOrder] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [perUserLimit, setPerUserLimit] = useState("1");
  const [isActive, setIsActive] = useState(true);
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [scopeMode, setScopeMode] = useState<"all" | "selected">("all");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  function req(path: string, method: "GET" | "POST" | "PATCH" = "GET", body?: unknown) {
    return fetch(`/api${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }

  function addToast(msg: string, type: "success" | "danger" = "success") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  async function load() {
    if (!token) return;
    try {
      const res = await req("/admin/coupons?perPage=200");
      if (!res.ok) throw new Error("Failed to load coupons");
      const data = await res.json();
      setCoupons(Array.isArray(data.items) ? data.items : []);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : "Failed to load coupons", "danger");
    }
  }

  async function loadCourses() {
    if (!token) return;
    try {
      const res = await req("/courses/public/cards?perPage=200");
      if (!res.ok) throw new Error("Failed to load courses");
      const body = await res.json();
      const arr = Array.isArray(body) ? body : body?.data;
      setCourses((Array.isArray(arr) ? arr : []).map((c: { id?: string; title?: string; name?: string; mentorName?: string; trainer?: { name?: string } }) => ({
        id: c.id || "",
        title: c.title || c.name || "",
        trainer: c.mentorName || c.trainer?.name || "",
      })));
      setCoursesError("");
    } catch (e: unknown) {
      setCoursesError(e instanceof Error ? e.message : "Failed to load courses");
    } finally {
      setCoursesLoading(false);
    }
  }

  useEffect(() => {
    let done = false;
    (async () => {
      await load();
      if (!done) setLoading(false);
    })();
    (async () => {
      await loadCourses();
    })();
    return () => {
      done = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const scopeLabel = useMemo<string>(() => {
    if (scopeMode === "all") return "All courses";
    if (selectedCourses.length === 0) return "No courses selected";
    return `${selectedCourses.length} course${selectedCourses.length > 1 ? "s" : ""}`;
  }, [scopeMode, selectedCourses]);

  async function createCoupon() {
    if (!token || saving) return;
    const trimmed = code.trim();
    if (trimmed.length < 3) return addToast("Coupon code must be at least 3 characters", "danger");
    const val = parseFloat(value);
    if (!Number.isFinite(val) || val < 0) return addToast("Enter a valid discount value", "danger");
    if (discountType === "PERCENT" && (val < 0 || val > 100)) return addToast("Percent value must be between 0 and 100", "danger");

    const payload: Record<string, unknown> = {
      code: trimmed.toUpperCase(),
      discountType,
      value: val,
      currency: discountType === "FLAT" ? currency : null,
      applicableCourseIds: scopeMode === "selected" ? selectedCourses : [],
      perUserLimit: perUserLimit ? parseInt(perUserLimit, 10) : 1,
      isActive,
    };
    if (minOrder) payload.minOrderAmount = parseFloat(minOrder);
    if (maxUses) payload.maxUses = parseInt(maxUses, 10);
    if (validFrom) payload.validFrom = new Date(validFrom).toISOString();
    if (validUntil) payload.validUntil = new Date(validUntil).toISOString();

    setSaving(true);
    try {
      const res = await req("/admin/coupons", "POST", payload);
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(body.message || "Failed to create coupon");
      addToast(`Coupon ${payload.code} created`);
      setCode(""); setValue(""); setValidFrom(""); setValidUntil(""); setMinOrder(""); setMaxUses("");
      setSelectedCourses([]); setScopeMode("all"); setPerUserLimit("1");
      await load();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : "Failed to create coupon", "danger");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id: string) {
    if (!token) return;
    try {
      const res = await req(`/admin/coupons/${id}/deactivate`, "PATCH");
      if (!res.ok) throw new Error("Failed to deactivate coupon");
      addToast("Coupon deactivated");
      await load();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : "Failed to deactivate coupon", "danger");
    }
  }

  async function reactivate(id: string) {
    if (!token) return;
    try {
      const res = await req(`/admin/coupons/${id}`, "PATCH", { isActive: true });
      if (!res.ok) throw new Error("Failed to reactivate coupon");
      addToast("Coupon reactivated");
      await load();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : "Failed to reactivate coupon", "danger");
    }
  }

  const discountLabel = (c: Coupon) =>
    c.discountType === "PERCENT" ? `${c.value}%` : formatMoney(c.value, c.currency);

  return (
    <>
      <div className="mt-6 mb-4 flex items-baseline gap-2.5">
        <span className="text-[15px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
          🎟 Discounts &amp; Coupons
        </span>
        <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
          codes students can apply at checkout
        </span>
      </div>

      <div className="rounded-xl p-4 mb-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="text-[12px] font-bold mb-3" style={{ color: "var(--text)" }}>+ New coupon</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div>
            <label className={labelClsMini}>Code</label>
            <input className={fieldCls} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. SUMMER50" />
          </div>
          <div>
            <label className={labelClsMini}>Discount type</label>
            <select className={fieldCls} value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
              <option value="PERCENT">Percent (%)</option>
              <option value="FLAT">Fixed amount</option>
            </select>
          </div>
          <div>
            <label className={labelClsMini}>Value</label>
            <input className={fieldCls} value={value} onChange={(e) => setValue(e.target.value)}
              placeholder={discountType === "PERCENT" ? "e.g. 10" : "e.g. 500"} inputMode="decimal" />
          </div>
          <div>
            <label className={labelClsMini}>Currency</label>
            <select className={fieldCls} value={currency} disabled={discountType === "PERCENT"}
              onChange={(e) => setCurrency(e.target.value as Currency)}>
              <option value="INR">₹ INR</option>
              <option value="USD">$ USD</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div>
            <label className={labelClsMini}>Min order</label>
            <input className={fieldCls} value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="optional" inputMode="decimal" />
          </div>
          <div>
            <label className={labelClsMini}>Max uses</label>
            <input className={fieldCls} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="unlimited" inputMode="numeric" />
          </div>
          <div>
            <label className={labelClsMini}>Per user limit</label>
            <input className={fieldCls} value={perUserLimit} onChange={(e) => setPerUserLimit(e.target.value)} placeholder="1" inputMode="numeric" />
          </div>
          <div>
            <label className={labelClsMini}>Active</label>
            <button onClick={() => setIsActive(!isActive)} className="w-full h-9 rounded-lg cursor-pointer text-[11px] font-bold border"
              style={{ background: isActive ? "var(--green-d)" : "var(--bg2)", color: isActive ? "var(--green)" : "var(--text3)", borderColor: "var(--border)" }}>
              {isActive ? "✓ Active" : "Inactive"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className={labelClsMini}>Valid from</label>
            <input type="datetime-local" className={fieldCls} value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
          </div>
          <div>
            <label className={labelClsMini}>Valid until</label>
            <input type="datetime-local" className={fieldCls} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
        </div>

        <div className="mb-3">
          <label className={labelClsMini}>Applies to</label>
          <div className="flex items-center gap-4 mb-2 text-[11.5px]">
            <label className="flex items-center gap-1.5 cursor-pointer" style={{ color: "var(--text2)" }}>
              <input type="radio" checked={scopeMode === "all"} onChange={() => { setScopeMode("all"); setSelectedCourses([]); }} /> All courses
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer" style={{ color: "var(--text2)" }}>
              <input type="radio" checked={scopeMode === "selected"} onChange={() => setScopeMode("selected")} /> Only selected
            </label>
            <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>{scopeLabel}</span>
          </div>

          <div className="flex items-center bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 gap-2 h-[34px] mb-2 transition-all duration-300 focus-within:border-[var(--blue2)] focus-within:shadow-[0_0_0_3px_var(--blue-d)] hover:border-[var(--border2)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[var(--muted)]"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              type="text"
              placeholder="Search courses, topics, or skills…"
              className="bg-transparent border-none outline-none text-[var(--text)] text-[13px] w-full placeholder:text-[var(--muted)]"
              value={coursesSearch}
              onChange={(e) => setCoursesSearch(e.target.value)}
            />
            <span className="text-[9.5px] text-[var(--text3)] border border-[var(--border)] rounded px-[5px] py-[1px] shrink-0 hidden sm:inline font-mono bg-[var(--bg)]">{courses.length}</span>
          </div>

          {coursesLoading ? (
            <div className="border border-[var(--border)] rounded-lg p-3 text-center font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>Loading courses…</div>
          ) : coursesError ? (
            <div className="border border-[var(--border)] rounded-lg p-3 text-center font-mono text-[10.5px]" style={{ color: "var(--red)" }}>
              {coursesError}
              <button onClick={() => { setCoursesLoading(true); loadCourses(); }} className="ml-2 underline cursor-pointer bg-transparent border-none">Retry</button>
            </div>
          ) : (
            scopeMode === "selected" && (
              <div className="border border-[var(--border)] rounded-lg p-2 max-h-[180px] overflow-y-auto">
                {courses.length === 0 ? (
                  <div className="text-[11px] p-2" style={{ color: "var(--text3)" }}>No courses loaded.</div>
                ) : (
                  (() => {
                    const q = coursesSearch.trim().toLowerCase();
                    const filtered = q
                      ? courses.filter((c) => c.title.toLowerCase().includes(q) || c.trainer.toLowerCase().includes(q))
                      : courses;
                    if (filtered.length === 0) {
                      return (
                        <div className="text-[11px] p-2" style={{ color: "var(--text3)" }}>
                          No courses match &quot;{coursesSearch.trim()}&quot;
                        </div>
                      );
                    }
                    return filtered.map((c) => {
                      const checked = selectedCourses.includes(c.id);
                      return (
                        <label key={c.id} className="flex items-center gap-2 px-1.5 py-1 rounded cursor-pointer hover:bg-[#ffffff08] text-[11.5px]" style={{ color: "var(--text2)" }}>
                          <input type="checkbox" checked={checked} onChange={() =>
                            setSelectedCourses((prev) => (checked ? prev.filter((x) => x !== c.id) : [...prev, c.id]))
                          } />
                          <span className="truncate">
                            {c.title || c.id}
                            {c.trainer && <span style={{ color: "var(--text3)" }}> — {c.trainer}</span>}
                          </span>
                        </label>
                      );
                    });
                  })()
                )}
              </div>
            )
          )}
        </div>

        <button onClick={createCoupon} disabled={saving}
          className="px-4 py-2 rounded-md font-mono text-[11px] font-bold cursor-pointer disabled:opacity-50"
          style={{ background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }}>
          {saving ? "⏳ Creating…" : "+ Create coupon"}
        </button>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
          <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
            {coupons.length} coupon{coupons.length !== 1 ? "s" : ""}
          </span>
          <button onClick={load} className="font-mono text-[10.5px] font-semibold px-2.5 py-1 rounded cursor-pointer"
            style={{ border: "1px solid var(--border)", color: "var(--text2)" }}>
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-center font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading coupons…</div>
        ) : coupons.length === 0 ? (
          <div className="p-6 text-center font-mono text-[11px]" style={{ color: "var(--text3)" }}>
            No coupons yet — create one above.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {coupons.map((c) => {
              const scope = c.applicableCourseIds.length === 0 ? "All courses" : `${c.applicableCourseIds.length} course(s)`;
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12.5px] font-bold" style={{ color: "var(--text)" }}>{c.code}</span>
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: c.discountType === "PERCENT" ? "var(--blue-d)" : "var(--green-d)", color: c.discountType === "PERCENT" ? "var(--blue)" : "var(--green)" }}>
                        {c.discountType}
                      </span>
                      <span className="font-mono text-[9.5px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: c.isActive ? "var(--green-d)" : "var(--red-d)", color: c.isActive ? "var(--green)" : "var(--red)" }}>
                        {c.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                    <div className="font-mono text-[10.5px] mt-1" style={{ color: "var(--text3)" }}>
                      {discountLabel(c)} · {scope} · {c.usedCount} used{c.maxUses ? ` / ${c.maxUses}` : ""}
                      {c.minOrderAmount != null && ` · min ${formatMoney(c.minOrderAmount, c.currency)}`}
                    </div>
                  </div>
                  <button onClick={() => (c.isActive ? deactivate(c.id) : reactivate(c.id))}
                    className="font-mono text-[10.5px] font-bold px-2.5 py-1.5 rounded cursor-pointer shrink-0"
                    style={c.isActive
                      ? { border: "1px solid var(--border)", color: "var(--red)" }
                      : { background: "var(--green-d)", color: "var(--green)", border: "1px solid transparent" }}>
                    {c.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed bottom-9 right-4 flex flex-col gap-2 z-[300]">
        {toasts.map((t) => (
          <div key={t.id} className="flex items-center gap-2 px-3.5 py-2.5 rounded text-[11.5px] font-semibold min-w-[220px]"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,.18)", color: "var(--text)", borderLeft: `3px solid ${t.type === "success" ? "var(--green)" : "var(--red)"}` }}>
            <span style={{ fontSize: 13 }}>{t.type === "success" ? "✓" : "✕"}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </>
  );
}