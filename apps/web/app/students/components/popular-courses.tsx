const thumbGradients: Record<string, string> = {
  "thumb-mern": "linear-gradient(135deg,#0d1f3c,#0a2a1a)",
  "thumb-python": "linear-gradient(135deg,#1a1a0d,#0d1a2e)",
  "thumb-ds": "linear-gradient(135deg,#0d0d2e,#1a0d2e)",
  "thumb-devops": "linear-gradient(135deg,#0d1a2e,#1a0a0a)",
  "thumb-fe": "linear-gradient(135deg,#1a0d2e,#0d1a3a)",
};

export function PopularCourses() {
  const courses = [
    {
      name: "MERN Stack",
      sub: "MongoDB, Express, React & Node",
      stars: 4.9,
      count: 540,
      weeks: 10,
      badge: "HOT",
      badgeClass: "bg-[#ef4444] text-white",
      thumbClass: "thumb-mern",
      img: "C1.png",
    },
    {
      name: "Python Programming",
      sub: "From Basics to Advanced",
      stars: 4.8,
      count: 600,
      weeks: 6,
      badge: "BEGINNER",
      badgeClass: "bg-blue-600 text-white",
      thumbClass: "thumb-python",
      img: "C2.png",
    },
    {
      name: "Data Science & AI",
      sub: "ML, NLP & Deep Learning",
      stars: 4.9,
      count: 210,
      weeks: 12,
      badge: "NEW",
      badgeClass: "bg-[#16a34a] text-white",
      thumbClass: "thumb-ds",
      img: "C3.png",
    },
    {
      name: "DevOps Engineering",
      sub: "AWS, Docker, K8s & CI/CD",
      stars: 4.7,
      count: 380,
      weeks: 9,
      badge: "POPULAR",
      badgeClass: "bg-[var(--orange)] text-white",
      thumbClass: "thumb-devops",
      img: "C4.png",
    },
    {
      name: "Frontend Development",
      sub: "HTML, CSS, JS & React",
      stars: 4.8,
      count: 450,
      weeks: 8,
      badge: "TRENDING",
      badgeClass: "bg-purple-600 text-white",
      thumbClass: "thumb-fe",
      img: "C5.png",
    },
  ];

  return (
    <section className="[animation:fadeUp_.5s_.13s_ease_both]">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="font-['Syne'] text-[17px] font-bold text-[var(--text)]">Popular Courses</h2>
        <a className="text-[12px] font-semibold text-[var(--blue)] hover:text-[var(--orange)]" href="#">View All</a>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {courses.map((c) => (
          <div key={c.name} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden cursor-pointer shadow-[var(--shadow)] hover:-translate-y-1 hover:border-[rgba(37,99,235,.3)] hover:shadow-[var(--shadow-lg)] group">
            <div className="relative aspect-[28/9] w-full overflow-hidden rounded-[18px_18px_0_0]" style={{ background: thumbGradients[c.thumbClass] }}>
              <div className="absolute inset-0">
                <img src={`/images/${c.img}`} alt={c.name} className="h-full w-full object-cover transition-transform duration-[0.45s] group-hover:scale-[1.06]" />
              </div>
              <span className={`text-[9px] font-bold tracking-[.06em] uppercase px-2 py-[3px] rounded absolute top-2 left-2 ${c.badgeClass}`}>{c.badge}</span>
            </div>
            <div className="p-3">
              <div className="text-[13px] font-bold text-[var(--text)] mb-[3px]">{c.name}</div>
              <div className="text-[11px] text-[var(--muted)] mb-2">{c.sub}</div>
              <div className="flex items-center gap-1">
                <span className="text-amber-500 text-[11px]">★</span>
                <span className="text-xs font-bold text-amber-600">{c.stars}</span>
                <span className="text-[10px] text-[var(--muted)]">({c.count})</span>
              </div>
              <div className="flex justify-between mt-2 pt-2 border-t border-[var(--border)] text-[10px] text-[var(--muted)]">
                <span>{c.weeks} weeks</span>
                <span className="text-[9px] bg-[var(--blue-dim)] text-[var(--blue)] px-1.5 py-0.5 rounded font-semibold dark:bg-[rgba(59,130,246,.15)]">Certificate</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
