"use client";

import { useWishlist } from "@/app/(student)/hooks/use-wishlist";

/**
 * Heart toggle that saves / unsaves a course to the student's wishlist.
 * Clicks are stopped from bubbling so it can sit inside a clickable card.
 */
export function WishlistHeart({ courseId, className = "" }: { courseId: string; className?: string }) {
  const { ids, toggle, busy } = useWishlist();
  const saved = ids.has(courseId);
  const label = saved ? "Remove from wishlist" : "Save to wishlist";

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={saved}
      title={label}
      disabled={busy === courseId}
      onClick={(e) => {
        e.stopPropagation();
        toggle(courseId);
      }}
      onKeyDown={(e) => e.stopPropagation()}
      className={`flex h-8 w-8 items-center justify-center rounded-full border-none bg-black/45 backdrop-blur-sm cursor-pointer transition-[transform,background-color] duration-150 hover:scale-110 hover:bg-black/60 active:scale-95 disabled:opacity-60 ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        fill={saved ? "#EF4444" : "none"} stroke={saved ? "#EF4444" : "#fff"}>
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    </button>
  );
}
