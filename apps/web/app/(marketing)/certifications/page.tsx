const certs = [
  { name: "MERN Stack Developer", level: "Professional", cost: "Free", duration: "Self-paced", icon: "⚛️", color: "#2563eb" },
  { name: "Python Programming", level: "Foundation", cost: "Free", duration: "Self-paced", icon: "🐍", color: "#16a34a" },
  { name: "Data Science Professional", level: "Expert", cost: "$49", duration: "3 Months", icon: "📊", color: "#7c3aed" },
  { name: "AWS Cloud Practitioner", level: "Professional", cost: "Free", duration: "Self-paced", icon: "☁️", color: "#f59e0b" },
  { name: "DevOps Engineering", level: "Expert", cost: "$79", duration: "4 Months", icon: "🔧", color: "#ef4444" },
  { name: "AI/ML Engineering", level: "Expert", cost: "$99", duration: "5 Months", icon: "🧠", color: "#ec4899" },
  { name: "Cybersecurity Analyst", level: "Professional", cost: "$59", duration: "3 Months", icon: "🛡️", color: "#14b8a6" },
  { name: "Frontend Development", level: "Foundation", cost: "Free", duration: "Self-paced", icon: "🎨", color: "#f97316" },
];

export default function CertificationsPage() {
  return (
    <div style={{ paddingBottom: 40 }}>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-['Syne'] text-[22px] font-bold text-[var(--text)]">Certifications</h1>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Earn industry-recognized certificates</span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {certs.map((c) => (
          <div key={c.name} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden cursor-pointer shadow-[var(--shadow)] hover:-translate-y-1 hover:border-[rgba(37,99,235,.3)] hover:shadow-[var(--shadow-lg)]" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `${c.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{c.icon}</div>
              <div>
                <div className="text-[14px] font-bold text-[var(--text)] mb-[3px]">{c.name}</div>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold" style={{ background: `${c.color}15`, color: c.color }}>{c.level}</span>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, lineHeight: 1.6 }}>
              Earn your {c.name} certification and showcase your skills to employers worldwide.
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              <span>💰 {c.cost}</span>
              <span>⏱ {c.duration}</span>
            </div>
            <button className="w-full inline-flex items-center justify-center gap-1.5 px-[14px] py-[8px] rounded-[9px] text-[11px] font-bold border-none shadow-[0_4px_12px_rgba(0,0,0,.15)] hover:opacity-90 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(0,0,0,.22)] bg-[var(--blue)] text-white" style={{ marginTop: 12 }}>
              Start Certification
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
