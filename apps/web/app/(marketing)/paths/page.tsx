const paths = [
  { name: "Full Stack Developer", meta: "12 Courses · 6 Months", icon: "🌐", iconClass: "bg-[rgba(37,99,235,.1)] dark:bg-[rgba(59,130,246,.15)]", desc: "Master frontend and backend development with MongoDB, Express, React, and Node.js. Build complete web applications from scratch." },
  { name: "Data Scientist", meta: "10 Courses · 5 Months", icon: "📊", iconClass: "bg-[rgba(124,58,237,.1)] dark:bg-[rgba(168,85,247,.15)]", desc: "Learn Python, statistics, machine learning, and deep learning. Turn raw data into actionable insights." },
  { name: "DevOps Engineer", meta: "8 Courses · 4 Months", icon: "🔧", iconClass: "bg-[rgba(22,163,74,.1)] dark:bg-[rgba(34,197,94,.15)]", desc: "Master CI/CD pipelines, containerization with Docker, orchestration with Kubernetes, and cloud infrastructure." },
  { name: "AI/ML Engineer", meta: "9 Courses · 5 Months", icon: "🧠", iconClass: "bg-[rgba(240,90,26,.1)] dark:bg-[rgba(255,106,26,.15)]", desc: "Dive into artificial intelligence, neural networks, NLP, and computer vision. Build intelligent systems." },
  { name: "Frontend Developer", meta: "7 Courses · 4 Months", icon: "🎨", iconClass: "bg-[rgba(245,158,11,.1)] dark:bg-[rgba(250,204,21,.15)]", desc: "Master HTML, CSS, JavaScript, React, and modern frontend frameworks. Create beautiful, responsive UIs." },
  { name: "Mobile Developer", meta: "8 Courses · 5 Months", icon: "📱", iconClass: "bg-[rgba(37,99,235,.1)] dark:bg-[rgba(59,130,246,.15)]", desc: "Build cross-platform mobile apps with React Native and Flutter. Deploy to both iOS and Android." },
  { name: "Cloud Architect", meta: "10 Courses · 6 Months", icon: "☁️", iconClass: "bg-[rgba(22,163,74,.1)] dark:bg-[rgba(34,197,94,.15)]", desc: "Design and manage cloud infrastructure on AWS, Azure, and GCP. Master distributed systems." },
  { name: "Cybersecurity Analyst", meta: "9 Courses · 5 Months", icon: "🛡️", iconClass: "bg-[rgba(124,58,237,.1)] dark:bg-[rgba(168,85,247,.15)]", desc: "Learn network security, ethical hacking, penetration testing, and security compliance." },
];

export default function PathsPage() {
  return (
    <div style={{ paddingBottom: 40 }}>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-['Syne'] text-[22px] font-bold text-[var(--text)]">Career Paths</h1>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{paths.length} paths available</span>
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {paths.map((p) => (
          <div key={p.name} className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 flex flex-col items-start gap-3 cursor-pointer shadow-[var(--shadow)] hover:border-[var(--orange)] hover:bg-[var(--card-hover)] hover:-translate-y-0.5">
            <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
              <div className={`size-10 rounded-lg flex items-center justify-center text-[20px] shrink-0 ${p.iconClass}`}>{p.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold text-[var(--text)]">{p.name}</div>
                <div className="text-[10px] text-[var(--muted)]">{p.meta}</div>
              </div>
            </div>
            <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>{p.desc}</p>
            <button className="inline-flex items-center gap-1.5 px-[14px] py-[6px] rounded-[9px] text-[11px] font-bold border-none shadow-[0_4px_12px_rgba(0,0,0,.15)] hover:opacity-90 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(0,0,0,.22)] bg-[var(--blue)] text-white" style={{ alignSelf: "flex-start" }}>
              View Path <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 11, height: 11 }}><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
