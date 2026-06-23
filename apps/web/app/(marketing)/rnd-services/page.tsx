const services = [
  { title: "Custom Web Development", desc: "We build scalable, production-ready web applications using modern frameworks like React, Next.js, Node.js, and more. From MVP to enterprise-grade solutions.", icon: "🌐", color: "#2563eb" },
  { title: "Mobile App Development", desc: "Cross-platform mobile applications built with React Native and Flutter. Delivering native-like experiences on both iOS and Android.", icon: "📱", color: "#7c3aed" },
  { title: "Cloud Infrastructure & DevOps", desc: "Design, deploy, and manage cloud infrastructure on AWS, Azure, and GCP. CI/CD pipeline setup, containerization, and monitoring.", icon: "☁️", color: "#f59e0b" },
  { title: "AI/ML Solutions", desc: "Custom machine learning models, NLP solutions, computer vision systems, and intelligent automation for your business needs.", icon: "🧠", color: "#ec4899" },
  { title: "API Development & Integration", desc: "RESTful and GraphQL API design, third-party integrations, microservices architecture, and legacy system modernization.", icon: "🔌", color: "#16a34a" },
  { title: "UI/UX Design & Consulting", desc: "User research, wireframing, prototyping, and design systems. Creating intuitive and engaging user experiences.", icon: "🎨", color: "#f97316" },
  { title: "Security Audit & Consulting", desc: "Vulnerability assessment, penetration testing, security code review, and compliance consulting for your applications.", icon: "🛡️", color: "#ef4444" },
  { title: "Technical Training & Workshops", desc: "Custom corporate training programs, technical workshops, and team upskilling in modern technologies and best practices.", icon: "👨‍🏫", color: "#14b8a6" },
];

export default function RndServicesPage() {
  return (
    <div style={{ paddingBottom: 40 }}>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-['Syne'] text-[22px] font-bold text-[var(--text)]">R&amp;D Services</h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24, maxWidth: 600 }}>
        Leverage our expertise in cutting-edge technologies to accelerate your product development and innovation.
      </p>

      <div className="grid grid-cols-2 gap-4 [animation:fadeUp_.5s_.23s_ease_both]">
        {services.map((s) => {
          const cardType = s.title.includes("Security") ? "cta-certs" : s.title.includes("Mobile") ? "cta-proj" : "cta-jobs";
          const cardTypeStyles: Record<string, string> = {
            "cta-certs": "bg-[linear-gradient(135deg,#f5f0ff_0%,#ede9fe_100%)] border-[1.5px] border-[#c4b5fd] before:bg-[radial-gradient(circle,#a855f7,transparent_70%)] dark:bg-[linear-gradient(135deg,#1a1040,#2d1a6e)] dark:border-[rgba(168,85,247,.35)]",
            "cta-proj": "bg-[linear-gradient(135deg,#eff6ff_0%,#dbeafe_100%)] border-[1.5px] border-[#93c5fd] before:bg-[radial-gradient(circle,#2563eb,transparent_70%)] dark:bg-[linear-gradient(135deg,#0d1f3c,#0a3060)] dark:border-[rgba(59,130,246,.35)]",
            "cta-jobs": "bg-[linear-gradient(135deg,#f0fdf4_0%,#dcfce7_100%)] border-[1.5px] border-[#86efac] before:bg-[radial-gradient(circle,#16a34a,transparent_70%)] dark:bg-[linear-gradient(135deg,#0f2a1a,#1a4030)] dark:border-[rgba(34,197,94,.35)]",
          };
          return (
          <div key={s.title} className={`rounded-2xl p-7 overflow-hidden relative shadow-[0_2px_8px_rgba(0,0,0,.05)] transition-[transform,box-shadow] duration-[250ms] ease-out cursor-default hover:-translate-y-1.5 hover:shadow-[0_18px_40px_rgba(0,0,0,.16)] before:content-[''] before:absolute before:w-[140px] before:h-[140px] before:rounded-full before:-top-[50px] before:-right-[40px] before:pointer-events-none before:blur-[30px] before:opacity-50 before:transition-opacity before:duration-300 hover:before:opacity-80 after:content-[''] after:absolute after:inset-0 after:pointer-events-none after:bg-[radial-gradient(circle,rgba(255,255,255,.5)_1px,transparent_1px)] after:bg-[length:14px_14px] after:opacity-0 after:[mask-image:linear-gradient(135deg,black,transparent_60%)] after:transition-opacity after:duration-300 hover:after:opacity-50 ${cardTypeStyles[cardType]}`}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, width: "100%", position: "relative", zIndex: 1 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0, boxShadow: "0 6px 16px rgba(0,0,0,.12)" }}>
                {s.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div className="font-extrabold text-[var(--text)] tracking-[-.01em]" style={{ fontSize: 15, marginBottom: 6 }}>{s.title}</div>
                <div className="text-[var(--muted)] leading-[1.55]" style={{ fontSize: 12 }}>{s.desc}</div>
                <button className="inline-flex items-center gap-1.5 rounded-[9px] text-[12px] font-bold border-none shadow-[0_4px_12px_rgba(0,0,0,.15)] hover:opacity-90 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(0,0,0,.22)]" style={{ background: s.color, color: "#fff", fontSize: 11, padding: "7px 16px", marginTop: 8 }}>
                  Learn More <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 11, height: 11 }}><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </button>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
