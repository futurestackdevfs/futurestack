'use client';

import { useState } from 'react';
import { StarRating } from './StarRating';

type Props = {
  initialRating?: number;
  initialComment?: string;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onCancel?: () => void;
  isEditing?: boolean;
};

export function ReviewForm({ initialRating = 5, initialComment = '', onSubmit, onCancel, isEditing }: Props) {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(rating, comment);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 mb-4">
      <div className="text-[14px] font-bold text-[var(--text)] mb-3">
        {isEditing ? 'Edit Your Review' : 'Write a Review'}
      </div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[12px] text-[var(--muted)] font-medium">Rating:</span>
        <StarRating value={rating} onChange={setRating} size={22} interactive />
        <span className="text-[12px] font-bold text-[var(--text)]">{rating}/5</span>
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="What did you think of this course? (optional)"
        rows={3}
        maxLength={1000}
        className="w-full border border-[var(--border)] rounded-[8px] bg-[var(--card)] text-[13px] text-[var(--text)] p-3 outline-none resize-none focus:border-[var(--blue)] transition-colors placeholder:text-[var(--muted)]"
      />
      <div className="flex items-center justify-between mt-3">
        <span className="text-[11px] text-[var(--muted)]">{comment.length}/1000</span>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-[7px] rounded-[8px] border border-[var(--border)] bg-[var(--card)] text-[12px] font-semibold text-[var(--muted)] cursor-pointer hover:text-[var(--text)] transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-[7px] rounded-[8px] border-none bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white text-[12px] font-bold cursor-pointer disabled:opacity-60 transition-all hover:opacity-90"
          >
            {submitting ? 'Submitting…' : isEditing ? 'Update Review' : 'Submit Review'}
          </button>
        </div>
      </div>
    </form>
  );
}
