'use client';

import { useState, useEffect } from 'react';
import { opsFetch } from '@/app/ops/lib/ops-fetch';
import { StarRating } from '@/components/StarRating';

interface TrainerReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  studentName: string;
  studentAvatar: string | null;
  courseTitle: string;
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

  const filtered = searchQuery
    ? reviews.filter((r) =>
        r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.courseTitle.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : reviews;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 font-mono text-[11px]" style={{ color: 'var(--text3)' }}>
        Loading ratings…
      </div>
    );
  }

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[16px] font-bold text-[var(--text)]">Student Ratings</h2>
          <p className="text-[12px] text-[var(--muted)] mt-[2px]">Reviews & feedback from enrolled students</p>
        </div>
        <div className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-2">
          <div className="text-[22px] font-extrabold text-[var(--text)]">{avgRating}</div>
          <div className="flex flex-col items-start gap-[1px]">
            <StarRating value={Number(avgRating) || 0} size={11} />
            <span className="text-[10px] text-[var(--muted)]">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-[13px] text-[var(--muted)]">
          {searchQuery ? 'No reviews match your search' : 'No reviews yet'}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((review) => (
            <div key={review.id} className="border border-[var(--border)] rounded-xl p-4 bg-[var(--card)]">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--blue)] to-[var(--blue-dim)] flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0">
                    {review.studentName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-[var(--text)] truncate">{review.studentName}</div>
                    <div className="flex items-center gap-2">
                      <StarRating value={review.rating} size={11} />
                      <span className="text-[11px] text-[var(--muted)]">
                        {new Date(review.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-[var(--blue)] bg-[var(--blue-dim)]/30 px-2.5 py-[3px] rounded-[6px] whitespace-nowrap ml-3">
                  {review.courseTitle}
                </span>
              </div>
              {review.comment && (
                <div className="text-[13px] text-[var(--text2)] leading-[1.65] ml-[45px]">{review.comment}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
