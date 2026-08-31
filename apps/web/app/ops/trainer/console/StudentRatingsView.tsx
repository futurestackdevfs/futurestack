'use client';

import { useState, useEffect, useMemo } from 'react';
import { opsFetch } from '@/app/ops/lib/ops-fetch';
import { StarRating } from '@/components/StarRating';
import { KpiRow, Panel, Th, Td, ViewHeader } from '../sections/ui';

interface TrainerReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  studentName: string;
  studentAvatar: string | null;
  courseTitle: string;
}

function initials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function StudentRatingsView({ searchQuery }: { searchQuery: string }) {
  const [reviews, setReviews] = useState<TrainerReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await opsFetch('/api/trainer/reviews').then((r) => r.ok ? r.json() : []);
        if (!cancelled) setReviews(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setReviews([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery) return reviews;
    const q = searchQuery.toLowerCase();
    return reviews.filter((r) =>
      [r.studentName, r.courseTitle, r.comment].some((v) => v?.toLowerCase().includes(q))
    );
  }, [reviews, searchQuery]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '—';
  const uniqueStudents = new Set(reviews.map((r) => r.studentName)).size;

  const distribution = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach((r) => { dist[r.rating - 1]++; });
    return dist.reverse();
  }, [reviews]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 font-mono text-[11px]" style={{ color: 'var(--text3)' }}>
        Loading course reviews…
      </div>
    );
  }

  return (
    <div className="p-4 pb-7">
      <ViewHeader icon="⭐" title="Course Reviews" meta={`role::trainer · ${reviews.length} reviews`} />

      <KpiRow items={[
        { label: "Total Reviews", value: reviews.length, delta: `by ${uniqueStudents} students`, color: "var(--green)" },
        { label: "Average Rating", value: avgRating, delta: "out of 5", color: "var(--amber)" },
        { label: "5-Star Reviews", value: distribution[0], delta: `${reviews.length > 0 ? Math.round(distribution[0] / reviews.length * 100) : 0}%`, color: "var(--purple)" },
      ]} />

      {/* Rating distribution */}
      <div className="mb-4 p-4 rounded" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="font-mono text-[10.5px] font-bold mb-3" style={{ color: "var(--text2)" }}>RATING DISTRIBUTION</div>
        {distribution.map((count, i) => {
          const star = 5 - i;
          const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[10px] w-6 text-right" style={{ color: "var(--text3)" }}>{star}★</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--panel)" }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--amber)" }} />
              </div>
              <span className="font-mono text-[10px] w-8" style={{ color: "var(--text3)" }}>{count}</span>
            </div>
          );
        })}
      </div>

      <Panel title="⭐ Course Reviews" count={`${filtered.length} reviews`}>
        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((r) => (
              <div key={r.id} className="p-3 rounded" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4db33d] to-[#2d7ef7] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                    {initials(r.studentName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[11px] font-bold" style={{ color: "var(--text)" }}>{r.studentName}</div>
                    <div className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>
                      {r.courseTitle} · {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <StarRating value={r.rating} size={13} />
                </div>
                {r.comment && (
                  <p className="text-[11px] leading-[1.6]" style={{ color: "var(--text2)" }}>{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 font-mono text-[11px]" style={{ color: "var(--text3)" }}>
            No course reviews yet
          </div>
        )}
      </Panel>
    </div>
  );
}
