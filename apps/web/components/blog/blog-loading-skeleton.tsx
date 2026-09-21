export function BlogCardSkeleton() {
  return (
    <article
      className="group border rounded-xl overflow-hidden hover:shadow-[0_4px_12px_rgba(0,0,0,.15)] transition-shadow animate-pulse"
    >
      <h3 className="text-[16px] font-medium text-[var(--text)] truncated line-clamp-2 group-hover:line-clamp-3 animate-pulse" />

      <p className="text-[12px] text-[var(--text3)] line-clamp-3 mt-1 animate-pulse" />

      <div className="flex items-center gap-2 mt-2 text-[11px] text-[var(--text2)] animate-pulse">
        <span className="border rounded px-1.5 py-0.5 bg-[var(--bg)]" />
        <span>· HH MM, YYYY</span>
      </div>
    </article>
  );
}

export function BlogDetailSkeleton() {
  return (
    <div className="prose prose-invert light:prose max-w-none antialiased">
      <h1 className="text-4xl font-bold text-[var(--text)] mb-4 animate-pulse" />
      <div className="flex flex-wrap gap-2 mb-6 text-[11px] text-[var(--text2)] animate-pulse">
        <span className="border rounded px-2 py-1 bg-[var(--bg)]" />
      </div>
      <p className="text-[12px] text-[var(--text3)] mb-8 animate-pulse" />
      <div className="prose prose-invert light:prose">Loading...</div>
    </div>
  );
}