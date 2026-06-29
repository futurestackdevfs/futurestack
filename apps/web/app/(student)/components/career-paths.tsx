export function CareerPaths() {
  const paths = [
    { name: "Full Stack Developer", meta: "12 Courses · 6 Months", icon: "🌐", iconClass: "bg-[rgba(37,99,235,.1)] dark:bg-[rgba(59,130,246,.15)]" },
    { name: "Data Scientist", meta: "10 Courses · 5 Months", icon: "📊", iconClass: "bg-[rgba(124,58,237,.1)] dark:bg-[rgba(168,85,247,.15)]" },
    { name: "DevOps Engineer", meta: "8 Courses · 4 Months", icon: "🔧", iconClass: "bg-[rgba(22,163,74,.1)] dark:bg-[rgba(34,197,94,.15)]" },
    { name: "AI/ML Engineer", meta: "9 Courses · 5 Months", icon: "🧠", iconClass: "bg-[rgba(240,90,26,.1)] dark:bg-[rgba(255,106,26,.15)]" },
    { name: "Frontend Developer", meta: "7 Courses · 4 Months", icon: "🎨", iconClass: "bg-[rgba(245,158,11,.1)] dark:bg-[rgba(250,204,21,.15)]" },
  ];

  return (
    <section className="[animation:fadeUp_.5s_.18s_ease_both]">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="font-['Syne'] text-[17px] font-bold text-[var(--text)]">Career Paths</h2>
        <a className="text-[12px] font-semibold text-[var(--blue)] hover:text-[var(--orange)]" href="#">View All</a>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {paths.map((p) => (
          <div key={p.name} className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3.5 flex items-center gap-2.5 cursor-pointer shadow-[var(--shadow)] hover:border-[var(--orange)] hover:bg-[var(--card-hover)] hover:-translate-y-0.5">
            <div className={`size-9 rounded-lg flex items-center justify-center text-[18px] shrink-0 ${p.iconClass}`}>{p.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-bold text-[var(--text)] truncate">{p.name}</div>
              <div className="text-[10px] text-[var(--muted)]">{p.meta}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
