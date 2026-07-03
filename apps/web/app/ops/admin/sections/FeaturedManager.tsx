"use client";

import { useState, useEffect } from "react";

const SLOT_COUNT = 5;

interface Item {
  id: string;
  title: string;
  isFeatured: boolean;
  displayOrder: number;
}

async function apiCall(token: string, endpoint: string, options?: RequestInit) {
  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return res.json();
}

type SectionKey = "courses" | "tracks";

interface FeaturedManagerProps {
  token: string;
}

export default function FeaturedManager({ token }: FeaturedManagerProps) {
  const [allCourses, setAllCourses] = useState<Item[]>([]);
  const [featuredCourses, setFeaturedCourses] = useState<Item[]>([]);
  const [allTracks, setAllTracks] = useState<Item[]>([]);
  const [featuredTracks, setFeaturedTracks] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [openSlot, setOpenSlot] = useState<{ section: SectionKey; index: number } | null>(null);
  const [search, setSearch] = useState("");
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "danger" }[]>([]);

  function addToast(msg: string, type: "success" | "danger" = "success") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  function load() {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiCall(token, "/courses/public/featured-courses").catch(() => []),
      apiCall(token, "/courses").catch(() => []),
      apiCall(token, "/courses/public/featured-tracks").catch(() => []),
      apiCall(token, "/courses/tracks").catch(() => []),
    ]).then(([fc, all, ft, allT]) => {
      const mk = (arr: any[], featured: boolean) =>
        (Array.isArray(arr) ? arr : []).map((x) => ({
          id: x.id, title: x.title || "", isFeatured: featured ? true : x.isFeatured ?? false,
          displayOrder: x.displayOrder ?? 0,
        }));
      setFeaturedCourses(mk(fc, true).sort((a, b) => a.displayOrder - b.displayOrder));
      setAllCourses(mk(all, false));
      setFeaturedTracks(mk(ft, true).sort((a, b) => a.displayOrder - b.displayOrder));
      setAllTracks(mk(allT, false));
    }).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  function getFeatured(section: SectionKey) {
    return section === "courses" ? featuredCourses : featuredTracks;
  }
  function setFeatured(section: SectionKey, items: Item[]) {
    if (section === "courses") setFeaturedCourses(items);
    else setFeaturedTracks(items);
  }
  function getAvailable(section: SectionKey) {
    const featuredIds = new Set(getFeatured(section).map((f) => f.id));
    const all = section === "courses" ? allCourses : allTracks;
    return all.filter((item) => !featuredIds.has(item.id));
  }
  function featureEndpoint(section: SectionKey, id: string) {
    return section === "courses" ? `/courses/${id}/feature` : `/courses/tracks/${id}/feature`;
  }
  function reorderEndpoint(section: SectionKey) {
    return section === "courses" ? "/courses/reorder-featured" : "/courses/tracks/reorder-featured";
  }

  async function saveOrder(section: SectionKey, items: Item[]) {
    const ordered = items.map((item, i) => ({ ...item, displayOrder: i }));
    setFeatured(section, ordered);
    await apiCall(token, reorderEndpoint(section), {
      method: "POST",
      body: JSON.stringify({ items: ordered.map((it) => ({ id: it.id, displayOrder: it.displayOrder })) }),
    });
  }

  async function assignSlot(section: SectionKey, index: number, item: Item) {
    setActing(true);
    try {
      await apiCall(token, featureEndpoint(section, item.id), {
        method: "PATCH",
        body: JSON.stringify({ isFeatured: true, displayOrder: index }),
      });
      const updated = [...getFeatured(section), { ...item, isFeatured: true, displayOrder: index }];
      updated.sort((a, b) => a.displayOrder - b.displayOrder);
      setFeatured(section, updated);
      addToast(`"${item.title}" added`);
    } catch (e: any) {
      addToast(e.message, "danger");
    }
    setActing(false);
    setOpenSlot(null);
    setSearch("");
  }

  async function replaceSlot(section: SectionKey, index: number, newItem: Item) {
    setActing(true);
    try {
      const current = getFeatured(section);
      const oldItem = current.find((f) => f.displayOrder === index);
      if (oldItem) {
        await apiCall(token, featureEndpoint(section, oldItem.id), {
          method: "PATCH",
          body: JSON.stringify({ isFeatured: false }),
        });
      }
      await apiCall(token, featureEndpoint(section, newItem.id), {
        method: "PATCH",
        body: JSON.stringify({ isFeatured: true, displayOrder: index }),
      });
      const updated = current.filter((f) => f.id !== oldItem?.id);
      updated.push({ ...newItem, isFeatured: true, displayOrder: index });
      updated.sort((a, b) => a.displayOrder - b.displayOrder);
      setFeatured(section, updated);
      addToast(`"${newItem.title}" added`);
    } catch (e: any) {
      addToast(e.message, "danger");
    }
    setActing(false);
    setOpenSlot(null);
    setSearch("");
  }

  async function removeSlot(section: SectionKey, item: Item) {
    setActing(true);
    try {
      await apiCall(token, featureEndpoint(section, item.id), {
        method: "PATCH",
        body: JSON.stringify({ isFeatured: false }),
      });
      setFeatured(section, getFeatured(section).filter((f) => f.id !== item.id));
      addToast(`"${item.title}" removed`);
    } catch (e: any) {
      addToast(e.message, "danger");
    }
    setActing(false);
  }

  async function move(section: SectionKey, index: number, dir: -1 | 1) {
    const list = getFeatured(section);
    const current = list.find(f => f.displayOrder === index);
    const neighbor = list.find(f => f.displayOrder === index + dir);
    if (!current || !neighbor) return;
    setActing(true);
    try {
      await apiCall(token, reorderEndpoint(section), {
        method: "POST",
        body: JSON.stringify({
          items: [
            { id: current.id, displayOrder: index + dir },
            { id: neighbor.id, displayOrder: index },
          ],
        }),
      });
      const updated = list.map(f => {
        if (f.id === current.id) return { ...f, displayOrder: index + dir };
        if (f.id === neighbor.id) return { ...f, displayOrder: index };
        return f;
      });
      updated.sort((a, b) => a.displayOrder - b.displayOrder);
      setFeatured(section, updated);
    } catch (e: any) {
      addToast(e.message, "danger");
    }
    setActing(false);
  }

   function renderSection(section: SectionKey, label: string, emoji: string) {
    const featured = getFeatured(section);
    const slots: (Item | null)[] = Array.from({ length: SLOT_COUNT }, (_, i) => featured.find(f => f.displayOrder === i) ?? null);
    const available = getAvailable(section).filter((i) =>
      i.title.toLowerCase().includes(search.toLowerCase()),
    );

    function handlePick(item: Item) {
      const slot = openSlot!;
      if (slots[slot.index]) {
        replaceSlot(slot.section, slot.index, item);
      } else {
        assignSlot(slot.section, slot.index, item);
      }
    }

    return (
      <div className="mb-6">
        <div className="flex items-baseline gap-2.5 mb-2.5">
          <span className="text-[14px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
            {emoji} {label}
          </span>
          <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>
            {featured.length}/{SLOT_COUNT} slots filled — shown on homepage in this order
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5">
          {slots.map((item, i) => (
            <div key={i} className="relative">
              {item ? (
                <div
                  className="rounded-lg p-2.5 flex flex-col gap-2 min-h-[120px]"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-mono text-[10px] font-semibold shrink-0" style={{ color: "var(--text3)" }}>#{i + 1}</span>
                    <div className="flex items-center gap-1">
                      <button
                        disabled={acting}
                        onClick={() => setOpenSlot({ section, index: i })}
                        className="size-[26px] flex items-center justify-center rounded-md cursor-pointer disabled:opacity-40 hover:bg-[var(--blue-dim)] transition-colors text-[13px] leading-none"
                        style={{ color: "var(--blue)" }}
                        title="Replace"
                      >🔄</button>
                      <button
                        disabled={acting}
                        onClick={() => removeSlot(section, item)}
                        className="size-[26px] flex items-center justify-center rounded-md cursor-pointer disabled:opacity-40 hover:bg-red-50 transition-colors text-[13px] leading-none"
                        style={{ color: "var(--red)" }}
                        title="Remove from homepage"
                      >✕</button>
                    </div>
                  </div>
                  <span className="text-[12px] font-semibold leading-tight line-clamp-3 flex-1" style={{ color: "var(--text)" }}>
                    {item.title}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      disabled={!featured.find(f => f.displayOrder === i - 1) || acting}
                      onClick={() => move(section, i, -1)}
                      className="flex-1 h-[26px] rounded-md text-[11px] cursor-pointer disabled:opacity-30 hover:bg-[var(--panel)] transition-colors font-semibold"
                      style={{ color: "var(--text3)", border: "1px solid var(--border)", background: "var(--surface)" }}
                      title="Move left"
                    >◀</button>
                    <button
                      disabled={!featured.find(f => f.displayOrder === i + 1) || acting}
                      onClick={() => move(section, i, 1)}
                      className="flex-1 h-[26px] rounded-md text-[11px] cursor-pointer disabled:opacity-30 hover:bg-[var(--panel)] transition-colors font-semibold"
                      style={{ color: "var(--text3)", border: "1px solid var(--border)", background: "var(--surface)" }}
                      title="Move right"
                    >▶</button>
                  </div>
                </div>
              ) : (
                <button
                  disabled={acting}
                  onClick={() => setOpenSlot({ section, index: i })}
                  className="w-full min-h-[120px] rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                  style={{ border: "1.5px dashed var(--border2, var(--border))", color: "var(--text3)", background: "transparent" }}
                >
                  <span className="text-[22px] leading-none font-light">+</span>
                  <span className="font-mono text-[10px] font-semibold" style={{ color: "var(--text3)" }}>Slot #{i + 1}</span>
                </button>
              )}

              {openSlot && openSlot.section === section && openSlot.index === i && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => { setOpenSlot(null); setSearch(""); }} />
                  <div
                    className="absolute z-50 top-full mt-1 left-0 w-[220px] rounded-lg overflow-hidden"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,.18)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      autoFocus
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search..."
                      className="w-full px-3 py-2.5 text-[12px] outline-none"
                      style={{ background: "var(--panel)", color: "var(--text)", borderBottom: "1px solid var(--border)" }}
                    />
                    <div className="max-h-[240px] overflow-y-auto">
                      {available.length === 0 ? (
                        <div className="py-5 text-center font-mono text-[11px]" style={{ color: "var(--text3)" }}>
                          Nothing available
                        </div>
                      ) : (
                        available.map((opt) => (
                          <div
                            key={opt.id}
                            onClick={() => handlePick(opt)}
                            className="px-3 py-2.5 text-[12px] cursor-pointer hover:bg-[var(--panel)] transition-colors"
                            style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}
                          >
                            {opt.title}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center font-mono text-[11px]" style={{ color: "var(--text3)" }}>
        Loading featured content...
      </div>
    );
  }

  return (
    <div className="p-4 pb-7">
      <div className="flex items-baseline gap-2.5 mb-4">
        <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
          ⭐ Homepage Layout
        </span>
        <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
          fill the slots below to control what students see on the homepage
        </span>
      </div>

      {renderSection("courses", "Popular Courses", "📚")}
      {renderSection("tracks", "Career Paths", "🎯")}

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
