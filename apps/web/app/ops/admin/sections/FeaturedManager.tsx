"use client";

import { useState, useEffect } from "react";

const MAX_SLOT_COUNT = 10;
const HERO_SLOT_COUNT = 3;

interface Item {
  id: string;
  title: string;
  isFeatured: boolean;
  displayOrder: number;
}

interface HeroSlideItem {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
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

type SectionKey = "courses" | "tracks" | "hero-slides";

interface FeaturedManagerProps {
  token: string;
}

export default function FeaturedManager({ token }: FeaturedManagerProps) {
  const [allCourses, setAllCourses] = useState<Item[]>([]);
  const [featuredCourses, setFeaturedCourses] = useState<Item[]>([]);
  const [allTracks, setAllTracks] = useState<Item[]>([]);
  const [featuredTracks, setFeaturedTracks] = useState<Item[]>([]);
  const [allHeroSlides, setAllHeroSlides] = useState<HeroSlideItem[]>([]);
  const [featuredHeroSlides, setFeaturedHeroSlides] = useState<HeroSlideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [openSlot, setOpenSlot] = useState<{ section: SectionKey; index: number } | null>(null);
  const [dropdownPos, setDropdownPos] = useState<"down" | "up">("down");
  const [search, setSearch] = useState("");
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "danger" }[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [newSlideTitles, setNewSlideTitles] = useState<Record<number, string>>({});
  const [newSlideLinks, setNewSlideLinks] = useState<Record<number, string>>({});
  const [pendingReplace, setPendingReplace] = useState<{ index: number; file: File } | null>(null);

  useEffect(() => {
    if (openSlot) {
      setDropdownPos("down");
      const timer = setTimeout(() => {
        const el = document.getElementById("featured-dropdown");
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.bottom > window.innerHeight) {
            setDropdownPos("up");
          }
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [openSlot]);

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
      apiCall(token, "/courses/public/featured-hero-slides").catch(() => []),
      apiCall(token, "/courses/hero-slides").catch(() => []),
    ]).then(([fc, all, ft, allT, fhs, allHS]) => {
      const mk = (arr: any[], featured: boolean) =>
        (Array.isArray(arr) ? arr : []).map((x) => ({
          id: x.id, title: x.title || "", isFeatured: featured ? true : x.isFeatured ?? false,
          displayOrder: x.displayOrder ?? 0,
        }));
      setFeaturedCourses(mk(fc, true).sort((a, b) => a.displayOrder - b.displayOrder));
      setAllCourses(mk(all, false));
      setFeaturedTracks(mk(ft, true).sort((a, b) => a.displayOrder - b.displayOrder));
      setAllTracks(mk(allT, false));
      const mkHS = (arr: any[]) => (Array.isArray(arr) ? arr : []).map((x) => ({
        id: x.id, title: x.title || "", imageUrl: x.imageUrl || "",
        linkUrl: x.linkUrl || null, isFeatured: x.isFeatured ?? false, displayOrder: x.displayOrder ?? 0,
      }));
      setFeaturedHeroSlides(mkHS(fhs).sort((a, b) => a.displayOrder - b.displayOrder));
      setAllHeroSlides(mkHS(allHS));
    }).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  function getFeatured(section: SectionKey) {
    if (section === "courses") return featuredCourses;
    if (section === "tracks") return featuredTracks;
    return featuredHeroSlides;
  }
  function setFeatured(section: SectionKey, items: any[]) {
    if (section === "courses") setFeaturedCourses(items);
    else if (section === "tracks") setFeaturedTracks(items);
    else setFeaturedHeroSlides(items);
  }
  function getAvailable(section: SectionKey) {
    const featuredIds = new Set(getFeatured(section).map((f: any) => f.id));
    const all = section === "courses" ? allCourses : section === "tracks" ? allTracks : allHeroSlides;
    return all.filter((item: any) => !featuredIds.has(item.id));
  }
  function featureEndpoint(section: SectionKey, id: string) {
    if (section === "courses") return `/courses/${id}/feature`;
    if (section === "tracks") return `/courses/tracks/${id}/feature`;
    return `/courses/hero-slides/${id}/feature`;
  }
  function reorderEndpoint(section: SectionKey) {
    if (section === "courses") return "/courses/reorder-featured";
    if (section === "tracks") return "/courses/tracks/reorder-featured";
    return "/courses/hero-slides/reorder-featured";
  }

  async function saveOrder(section: SectionKey, items: any[]) {
    const ordered = items.map((item, i) => ({ ...item, displayOrder: i }));
    setFeatured(section, ordered);
    await apiCall(token, reorderEndpoint(section), {
      method: "POST",
      body: JSON.stringify({ items: ordered.map((it: any) => ({ id: it.id, displayOrder: it.displayOrder })) }),
    });
  }

  async function assignSlot(section: SectionKey, index: number, item: any) {
    setActing(true);
    try {
      await apiCall(token, featureEndpoint(section, item.id), {
        method: "PATCH",
        body: JSON.stringify({ isFeatured: true, displayOrder: index }),
      });
      const updated = [...getFeatured(section), { ...item, isFeatured: true, displayOrder: index }];
      updated.sort((a: any, b: any) => a.displayOrder - b.displayOrder);
      setFeatured(section, updated);
      addToast(`"${item.title}" added`);
    } catch (e: any) {
      addToast(e.message, "danger");
    }
    setActing(false);
    setOpenSlot(null);
    setSearch("");
  }

  async function replaceSlot(section: SectionKey, index: number, newItem: any) {
    setActing(true);
    try {
      const current = getFeatured(section);
      const oldItem = current.find((f: any) => f.displayOrder === index);
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
      const updated = current.filter((f: any) => f.id !== oldItem?.id);
      updated.push({ ...newItem, isFeatured: true, displayOrder: index });
      updated.sort((a: any, b: any) => a.displayOrder - b.displayOrder);
      setFeatured(section, updated);
      addToast(`"${newItem.title}" added`);
    } catch (e: any) {
      addToast(e.message, "danger");
    }
    setActing(false);
    setOpenSlot(null);
    setSearch("");
  }

  async function removeSlot(section: SectionKey, item: any) {
    setActing(true);
    try {
      await apiCall(token, featureEndpoint(section, item.id), {
        method: "PATCH",
        body: JSON.stringify({ isFeatured: false }),
      });
      setFeatured(section, getFeatured(section).filter((f: any) => f.id !== item.id));
      addToast(`"${item.title}" removed`);
    } catch (e: any) {
      addToast(e.message, "danger");
    }
    setActing(false);
  }

  async function move(section: SectionKey, index: number, dir: -1 | 1) {
    const list = getFeatured(section);
    const current = list.find((f: any) => f.displayOrder === index);
    const neighbor = list.find((f: any) => f.displayOrder === index + dir);
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
      const updated = list.map((f: any) => {
        if (f.id === current.id) return { ...f, displayOrder: index + dir };
        if (f.id === neighbor.id) return { ...f, displayOrder: index };
        return f;
      });
      updated.sort((a: any, b: any) => a.displayOrder - b.displayOrder);
      setFeatured(section, updated);
    } catch (e: any) {
      addToast(e.message, "danger");
    }
    setActing(false);
  }

  async function uploadHeroSlideImage(index: number, file: File) {
    setUploadingIndex(index);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/upload/image?folder=banners`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Upload failed (${res.status})`);
      }
      const data = await res.json();
      const title = newSlideTitles[index] || "Hero Slide";
      const linkUrl = newSlideLinks[index] || "";
      const created = await apiCall(token, "/courses/hero-slides", {
        method: "POST",
        body: JSON.stringify({ title, imageUrl: data.url, linkUrl: linkUrl || undefined }),
      });
      await apiCall(token, featureEndpoint("hero-slides", created.id), {
        method: "PATCH",
        body: JSON.stringify({ isFeatured: true, displayOrder: index }),
      });
      setFeaturedHeroSlides((prev) => {
        const withoutSlot = prev.filter((f) => f.displayOrder !== index);
        const updated = [...withoutSlot, { ...created, isFeatured: true, displayOrder: index }];
        updated.sort((a, b) => a.displayOrder - b.displayOrder);
        return updated;
      });
      setAllHeroSlides((prev) => [...prev, created]);
      setNewSlideTitles((prev) => ({ ...prev, [index]: "" }));
      setNewSlideLinks((prev) => ({ ...prev, [index]: "" }));
      addToast("Hero slide added");
    } catch (e: any) {
      addToast(e.message, "danger");
    }
    setUploadingIndex(null);
  }

  async function confirmReplace() {
    if (!pendingReplace) return;
    const { index, file } = pendingReplace;
    setPendingReplace(null);
    const existing = featuredHeroSlides.find((f) => f.displayOrder === index);
    if (existing) {
      setActing(true);
      try {
        await apiCall(token, `/courses/hero-slides/${existing.id}`, { method: "DELETE" });
        setFeaturedHeroSlides((prev) => prev.filter((f) => f.id !== existing.id));
        setAllHeroSlides((prev) => prev.filter((f) => f.id !== existing.id));
      } catch (e: any) {
        addToast(e.message, "danger");
        setActing(false);
        return;
      }
      setActing(false);
    }
    await uploadHeroSlideImage(index, file);
  }

  function triggerUpload(index: number) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const existing = featuredHeroSlides.find((f) => f.displayOrder === index);
      if (existing) {
        setPendingReplace({ index, file });
      } else {
        uploadHeroSlideImage(index, file);
      }
    };
    input.click();
  }

  function renderSection(section: SectionKey, label: string, emoji: string, maxSlots: number = MAX_SLOT_COUNT) {
    const featured = getFeatured(section);
    const slots: (any | null)[] = Array.from({ length: maxSlots }, (_, i) => featured.find((f: any) => f.displayOrder === i) ?? null);
    const available = getAvailable(section).filter((i: any) =>
      i.title.toLowerCase().includes(search.toLowerCase()),
    );

    function handlePick(item: any) {
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
            {featured.length}/{maxSlots} slots filled — shown on homepage in this order
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
                    <span className="font-mono text-[10px] font-semibold shrink-0" style={{ color: "var(--text3)" }}>{i + 1}</span>
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
                      disabled={!featured.find((f: any) => f.displayOrder === i - 1) || acting}
                      onClick={() => move(section, i, -1)}
                      className="flex-1 h-[26px] rounded-md text-[11px] cursor-pointer disabled:opacity-30 hover:bg-[var(--panel)] transition-colors font-semibold"
                      style={{ color: "var(--text3)", border: "1px solid var(--border)", background: "var(--surface)" }}
                      title="Move left"
                    >◀</button>
                    <button
                      disabled={!featured.find((f: any) => f.displayOrder === i + 1) || acting}
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
                  <span className="font-mono text-[10px] font-semibold" style={{ color: "var(--text3)" }}>Slot {i + 1}</span>
                </button>
              )}

              {openSlot && openSlot.section === section && openSlot.index === i && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => { setOpenSlot(null); setSearch(""); }} />
                  <div
                    id="featured-dropdown"
                    className={`absolute z-50 left-0 w-[220px] rounded-lg overflow-hidden ${dropdownPos === "up" ? "bottom-full mb-1" : "top-full mt-1"}`}
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
                        available.map((opt: any) => (
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

  function renderHeroSlidesSection() {
    const slots: (HeroSlideItem | null)[] = Array.from(
      { length: HERO_SLOT_COUNT },
      (_, i) => featuredHeroSlides.find((f) => f.displayOrder === i) ?? null,
    );

    return (
      <div className="mb-6">
        <div className="flex items-baseline gap-2.5 mb-2.5">
          <span className="text-[14px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
            🖼 Hero Slides
          </span>
          <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>
            {featuredHeroSlides.length}/{HERO_SLOT_COUNT} filled — auto-slides every 5s on homepage
          </span>
          <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>
            Best: 1920 × 400px · landscape
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {slots.map((item, i) => (
            <div key={i} className="rounded-lg p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] font-semibold" style={{ color: "var(--text3)" }}>Slide {i + 1}</span>
                {item && (
                  <button
                    disabled={acting}
                    onClick={() => removeSlot("hero-slides", item)}
                    className="size-[26px] flex items-center justify-center rounded-md cursor-pointer disabled:opacity-40 hover:bg-red-50 transition-colors text-[13px] leading-none"
                    style={{ color: "var(--red)" }}
                    title="Remove"
                  >✕</button>
                )}
              </div>

              <div
                className="w-full rounded-lg mb-2 flex items-center justify-center overflow-hidden cursor-pointer"
                style={{ aspectRatio: "16/7", background: "var(--bg2)", border: "1px dashed var(--border2, var(--border))" }}
                onClick={() => triggerUpload(i)}
              >
                {item?.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[20px] leading-none font-light" style={{ color: "var(--text3)" }}>
                      {uploadingIndex === i ? "⏳" : "+"}
                    </span>
                    <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>Upload Image</span>
                  </div>
                )}
              </div>
              <div className="font-mono text-[8.5px] text-center mb-1.5" style={{ color: "var(--text3)" }}>
                Best: 1920 × 400px · landscape
              </div>

              <input
                value={item?.title ?? newSlideTitles[i] ?? ""}
                onChange={(e) => setNewSlideTitles((prev) => ({ ...prev, [i]: e.target.value }))}
                placeholder="Slide title (optional)"
                className="w-full px-2.5 py-1.5 rounded text-[11px] outline-none mb-1.5"
                style={{ background: "var(--panel)", color: "var(--text)", border: "1px solid var(--border)" }}
              />
              <input
                value={item?.linkUrl ?? newSlideLinks[i] ?? ""}
                onChange={(e) => setNewSlideLinks((prev) => ({ ...prev, [i]: e.target.value }))}
                placeholder="Link URL (optional)"
                className="w-full px-2.5 py-1.5 rounded text-[11px] outline-none"
                style={{ background: "var(--panel)", color: "var(--text)", border: "1px solid var(--border)" }}
              />

              {item && (
                <div className="flex gap-1.5 mt-2">
                  <button
                    disabled={!slots[i - 1] || acting}
                    onClick={() => move("hero-slides", i, -1)}
                    className="flex-1 h-[26px] rounded-md text-[11px] cursor-pointer disabled:opacity-30 hover:bg-[var(--panel)] transition-colors font-semibold"
                    style={{ color: "var(--text3)", border: "1px solid var(--border)", background: "var(--surface)" }}
                    title="Move left"
                  >◀</button>
                  <button
                    disabled={!slots[i + 1] || acting}
                    onClick={() => move("hero-slides", i, 1)}
                    className="flex-1 h-[26px] rounded-md text-[11px] cursor-pointer disabled:opacity-30 hover:bg-[var(--panel)] transition-colors font-semibold"
                    style={{ color: "var(--text3)", border: "1px solid var(--border)", background: "var(--surface)" }}
                    title="Move right"
                  >▶</button>
                </div>
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
    <div className="p-4 pb-64">
      <div className="flex items-baseline gap-2.5 mb-4">
        <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
          ⭐ Homepage Layout
        </span>
        <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
          fill the slots below to control what students see on the homepage
        </span>
      </div>

      {renderHeroSlidesSection()}
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

      {pendingReplace && (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPendingReplace(null)}
        >
          <div
            className="rounded-xl p-5 max-w-sm w-full"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 12px 32px rgba(0,0,0,.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-2.5 mb-2">
              <span className="text-[20px] leading-none" style={{ color: "var(--red)" }}>⚠️</span>
              <span className="font-extrabold text-[14px] tracking-tight" style={{ color: "var(--text)" }}>
                Replace this slide?
              </span>
            </div>
            <div className="text-[12px] leading-relaxed mb-4" style={{ color: "var(--text3)" }}>
              This slot already has an image. Uploading a new one will <b style={{ color: "var(--red)" }}>delete the current slide image permanently</b> and replace it with the new upload. Continue?
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPendingReplace(null)}
                className="px-3 py-1.5 rounded text-[12px] font-semibold cursor-pointer"
                style={{ background: "var(--panel)", color: "var(--text3)", border: "1px solid var(--border)" }}
              >
                Cancel
              </button>
              <button
                disabled={acting}
                onClick={confirmReplace}
                className="px-3 py-1.5 rounded text-[12px] font-semibold cursor-pointer disabled:opacity-40"
                style={{ background: "var(--red)", color: "#fff" }}
              >
                Delete & Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
