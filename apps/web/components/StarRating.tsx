'use client';

type Props = {
  value: number;
  onChange?: (val: number) => void;
  size?: number;
  interactive?: boolean;
};

export function StarRating({ value, onChange, size = 14, interactive }: Props) {
  return (
    <div className="flex items-center gap-[1px]" style={{ gap: '1px' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} border-none bg-transparent p-0 transition-transform`}
          style={{ width: size, height: size }}
        >
          <svg viewBox="0 0 20 20" width={size} height={size}>
            <path
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              fill={star <= Math.floor(value) ? '#F59E0B' : '#D1D5DB'}
            />
          </svg>
        </button>
      ))}
    </div>
  );
}
