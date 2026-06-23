const projects = [
  { title: "E-Commerce Platform", tech: "MERN Stack", slots: "12/20", status: "In Progress", difficulty: "Intermediate", icon: "🛒", color: "#2563eb" },
  { title: "Real-time Chat App", tech: "Socket.io, React", slots: "8/15", status: "Open", difficulty: "Beginner", icon: "💬", color: "#16a34a" },
  { title: "AI Image Classifier", tech: "Python, TensorFlow", slots: "6/10", status: "Open", difficulty: "Advanced", icon: "🧠", color: "#7c3aed" },
  { title: "DevOps Pipeline", tech: "Docker, K8s, Jenkins", slots: "5/12", status: "In Progress", difficulty: "Advanced", icon: "🔧", color: "#ef4444" },
  { title: "Social Media Dashboard", tech: "React, D3.js", slots: "15/20", status: "In Progress", difficulty: "Intermediate", icon: "📊", color: "#f59e0b" },
  { title: "Weather Forecast App", tech: "React Native", slots: "10/15", status: "Open", difficulty: "Beginner", icon: "🌤️", color: "#14b8a6" },
];

export default function LiveProjectsPage() {
  return (
    <div style={{ paddingBottom: 40 }}>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-['Syne'] text-[22px] font-bold text-[var(--text)]">Live Projects</h1>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Build real-world projects with teams</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {projects.map((p) => (
          <div key={p.title} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden cursor-pointer shadow-[var(--shadow)] hover:-translate-y-1 hover:border-[rgba(37,99,235,.3)] hover:shadow-[var(--shadow-lg)]" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `${p.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{p.icon}</div>
              <div style={{ flex: 1 }}>
                <div className="text-[14px] font-bold text-[var(--text)] mb-0.5">{p.title}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{p.tech}</div>
              </div>
              <span className={`text-[9px] font-bold tracking-[.06em] uppercase px-2 py-[3px] rounded ${p.status === "In Progress" ? "bg-[#ef4444] text-white" : "bg-[#16a34a] text-white"}`} style={{ position: "static" }}>{p.status}</span>
            </div>

            <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--muted)", marginBottom: 14 }}>
              <span>👥 {p.slots} seats</span>
              <span>📊 {p.difficulty}</span>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="flex-1 inline-flex items-center justify-center gap-1.5 px-[14px] py-[8px] rounded-[9px] text-[11px] font-bold border-none shadow-[0_4px_12px_rgba(0,0,0,.15)] hover:opacity-90 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(0,0,0,.22)] bg-[var(--blue)] text-white">
                {p.status === "Open" ? "Join Project" : "View Progress"}
              </button>
              <button style={{ padding: "8px 12px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 11, cursor: "pointer" }}>
                Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
