"use client";

const paths = [
  { name: "Full Stack Developer", meta: "12 Courses · 6 Months", icon: "🌐", color: "#2563eb", desc: "Master frontend and backend development with MongoDB, Express, React, and Node.js." },
  { name: "Data Scientist", meta: "10 Courses · 5 Months", icon: "📊", color: "#7c3aed", desc: "Learn Python, statistics, machine learning, and deep learning." },
  { name: "DevOps Engineer", meta: "8 Courses · 4 Months", icon: "🔧", color: "#ef4444", desc: "Master CI/CD, Docker, Kubernetes, and cloud infrastructure." },
  { name: "AI/ML Engineer", meta: "9 Courses · 5 Months", icon: "🧠", color: "#ec4899", desc: "Dive into neural networks, NLP, computer vision, and intelligent systems." },
  { name: "Frontend Developer", meta: "7 Courses · 4 Months", icon: "🎨", color: "#f59e0b", desc: "Master HTML, CSS, JavaScript, React, and modern frontend frameworks." },
  { name: "Mobile Developer", meta: "8 Courses · 5 Months", icon: "📱", color: "#14b8a6", desc: "Build cross-platform mobile apps with React Native and Flutter." },
  { name: "Cloud Architect", meta: "10 Courses · 6 Months", icon: "☁️", color: "#3b82f6", desc: "Design and manage cloud infrastructure on AWS, Azure, and GCP." },
  { name: "Cybersecurity Analyst", meta: "9 Courses · 5 Months", icon: "🛡️", color: "#22c55e", desc: "Learn network security, ethical hacking, and penetration testing." },
];

export default function PathsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <h1 className="mb-1 font-['Syne'] text-2xl font-bold text-[var(--text)]">Career Paths</h1>
        <p className="mb-6 text-sm text-[var(--muted)]">Choose a path and build skills for your dream career</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paths.map((p) => (
            <div key={p.name} className="group cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)] transition-all hover:-translate-y-1 hover:border-[var(--orange)] hover:shadow-[var(--shadow-lg)]">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg text-xl" style={{ background: `${p.color}15` }}>{p.icon}</div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-[var(--text)]">{p.name}</div>
                  <div className="text-[10px] text-[var(--muted)]">{p.meta}</div>
                </div>
              </div>
              <p className="mb-4 text-[11.5px] leading-relaxed text-[var(--muted)]">{p.desc}</p>
              <button className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] py-2 text-[11px] font-semibold text-[var(--text)] transition-all hover:border-[var(--orange)] hover:text-[var(--orange)]">
                View Path →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
