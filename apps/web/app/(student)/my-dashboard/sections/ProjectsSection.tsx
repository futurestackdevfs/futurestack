"use client";

import Link from "next/link";

const projects = [
  {
    id: 1, emoji: "🛒", bannerBg: "linear-gradient(135deg,#040c1a 0%,#071822 55%,#081008 100%)", status: "Live", statusCls: "bg-[rgba(34,197,94,.2)] text-[#86efac] border border-[rgba(34,197,94,.3)]",
    course: "MERN Stack Development · Project 1", name: "Full-Stack E-Commerce Platform",
    desc: "Complete shopping platform with product catalogue, cart, Stripe checkout, JWT auth, and admin panel.",
    tech: ["React", "Node.js", "MongoDB", "Stripe", "JWT"],
    tags: [{ cls: "bg-[var(--green-d)] text-[var(--green)]", lbl: "Deployed · Vercel" }, { cls: "bg-[var(--bg2)] text-[var(--text3)] border border-[var(--border)]", lbl: "Score: 96%" }, { cls: "bg-[var(--blue-d)] text-[var(--blue2)]", lbl: "Portfolio Ready" }],
    progress: -1, date: "📅 Apr 10, 2025", gh: "⬡ View on GitHub", actions: [{ cls: "bg-[var(--green-d)] text-[var(--green)] border border-[rgba(22,163,74,.2)]", lbl: "🚀 Live Demo" }, { cls: "bg-transparent text-[var(--text2)] border border-[var(--border2)] hover:border-[var(--blue)] hover:text-[var(--blue)]", lbl: "Code" }],
  },
  {
    id: 2, emoji: "💬", bannerBg: "linear-gradient(135deg,#08041a 0%,#041020 55%,#0a0416 100%)", status: "Live", statusCls: "bg-[rgba(34,197,94,.2)] text-[#86efac] border border-[rgba(34,197,94,.3)]",
    course: "MERN Stack Development · Project 2", name: "Real-Time Chat Application",
    desc: "Group & private chat with Socket.io, online presence, typing indicators, and message history.",
    tech: ["React", "Socket.io", "Node.js", "MongoDB"],
    tags: [{ cls: "bg-[var(--green-d)] text-[var(--green)]", lbl: "Deployed · Railway" }, { cls: "bg-[var(--bg2)] text-[var(--text3)] border border-[var(--border)]", lbl: "Score: 92%" }, { cls: "bg-[var(--blue-d)] text-[var(--blue2)]", lbl: "Portfolio Ready" }],
    progress: -1, date: "📅 May 18, 2025", gh: "⬡ View on GitHub", actions: [{ cls: "bg-[var(--green-d)] text-[var(--green)] border border-[rgba(22,163,74,.2)]", lbl: "🚀 Live Demo" }, { cls: "bg-transparent text-[var(--text2)] border border-[var(--border2)] hover:border-[var(--blue)] hover:text-[var(--blue)]", lbl: "Code" }],
  },
  {
    id: 3, emoji: "🔌", bannerBg: "linear-gradient(135deg,#0d0c04 0%,#041018 55%,#040c14 100%)", status: "In Progress", statusCls: "bg-[rgba(240,90,26,.2)] text-[#ffb89a] border border-[rgba(240,90,26,.3)]",
    course: "MERN Stack Development · Project 3", name: "Production REST API with Docs",
    desc: "Rate-limited, versioned REST API with JWT auth, Swagger documentation, and Jest test suite.",
    tech: ["Node.js", "Express", "Swagger", "Jest"],
    tags: [{ cls: "bg-[var(--orange-d)] text-[var(--orange)]", lbl: "In Progress" }, { cls: "bg-[var(--bg2)] text-[var(--text3)] border border-[var(--border)]", lbl: "Advanced" }],
    progress: 55, progressColor: "linear-gradient(90deg,var(--orange),var(--orange2))", date: "📅 Due Jun 25", actions: [{ cls: "bg-[var(--orange)] text-white shadow-[0_2px_8px_rgba(240,90,26,.3)] hover:bg-[var(--orange2)]", lbl: "Continue →" }, { cls: "bg-transparent text-[var(--text2)] border border-[var(--border2)] hover:border-[var(--blue)] hover:text-[var(--blue)]", lbl: "View Brief" }],
  },
  {
    id: 4, emoji: "📰", bannerBg: "linear-gradient(135deg,#04100c 0%,#08041a 55%,#041018 100%)", status: "In Progress", statusCls: "bg-[rgba(240,90,26,.2)] text-[#ffb89a] border border-[rgba(240,90,26,.3)]",
    course: "MERN Stack Development · Project 4", name: "Blog Platform with CMS",
    desc: "Full blog platform with rich text editor, tagging, SEO meta management, and author dashboard.",
    tech: ["React", "TipTap", "MongoDB", "Express"],
    tags: [{ cls: "bg-[var(--orange-d)] text-[var(--orange)]", lbl: "In Progress" }, { cls: "bg-[var(--bg2)] text-[var(--text3)] border border-[var(--border)]", lbl: "Intermediate" }],
    progress: 22, progressColor: "linear-gradient(90deg,var(--blue),var(--blue2))", date: "📅 Due Jul 15", actions: [{ cls: "bg-[var(--orange)] text-white shadow-[0_2px_8px_rgba(240,90,26,.3)] hover:bg-[var(--orange2)]", lbl: "Continue →" }, { cls: "bg-transparent text-[var(--text2)] border border-[var(--border2)] hover:border-[var(--blue)] hover:text-[var(--blue)]", lbl: "View Brief" }],
  },
  {
    id: 5, emoji: "🔒", bannerBg: "linear-gradient(135deg,#08080c,#0c0c14)", status: "locked", lockedTitle: "UNLOCK WITH MODULE 16+",
    course: "MERN Stack Development · Project 5", name: "Analytics Dashboard with Charts",
    desc: "KPI dashboard with Recharts, date-range filters, real MongoDB data, and export to PDF.",
    tech: ["React", "Recharts", "MongoDB"],
    tags: [], progress: -1, date: "🔒 Complete Module 15 to unlock", gh: "", actions: [{ cls: "bg-[var(--bg2)] text-[var(--text3)] border border-[var(--border)] cursor-default", lbl: "Locked" }],
  },
  {
    id: 6, emoji: "🔒", bannerBg: "linear-gradient(135deg,#08080c,#0c0c14)", status: "locked", lockedTitle: "UNLOCK WITH MODULE 20",
    course: "MERN Stack Development · Final Project", name: "Dockerized AWS Deployment",
    desc: "Containerise the full MERN app, push to ECR, deploy on EC2 with Nginx reverse proxy and CI/CD.",
    tech: ["Docker", "AWS EC2", "Nginx", "GitHub Actions"],
    tags: [], progress: -1, date: "🔒 Complete Module 20 to unlock", gh: "", actions: [{ cls: "bg-[var(--bg2)] text-[var(--text3)] border border-[var(--border)] cursor-default", lbl: "Locked" }],
  },
];

export default function ProjectsSection() {
  return (
    <div className="flex flex-col gap-4 px-[18px] py-4">
      {/* STATS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { ico: "🚀", num: "2", lbl: "Deployed", icoBg: "var(--green-d)", numColor: "var(--green)" },
          { ico: "🔨", num: "2", lbl: "In Progress", icoBg: "var(--orange-d)", numColor: "var(--orange)" },
          { ico: "🔒", num: "5", lbl: "Locked", icoBg: "var(--blue-d)", numColor: "var(--text)" },
          { ico: "⭐", num: "94", lbl: "Avg. Score", icoBg: "var(--purple-d)", numColor: "var(--purple)" },
        ].map(s => (
          <div key={s.lbl} className="bg-[var(--card)] border border-[var(--border)] rounded-[10px] px-[15px] py-[13px] flex items-center gap-3 transition-transform duration-200 hover:-translate-y-[2px] hover:shadow-[var(--sh)]">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[17px] flex-shrink-0" style={{ background: s.icoBg }}>{s.ico}</div>
            <div>
              <div className="font-['Syne',sans-serif] text-[22px] font-[800] leading-none" style={{ color: s.numColor }}>{s.num}</div>
              <div className="text-[10.5px] text-[var(--text3)] mt-[2px]">{s.lbl}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ACTIVE PROJECTS */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[var(--text3)]">{"// active"}</span>
          <span className="font-['Syne',sans-serif] text-[13.5px] font-bold text-[var(--text)]">Active Projects</span>
          <span className="flex-1 h-[1px] bg-[var(--border)]" />
          <Link href="https://github.com" className="font-['JetBrains_Mono',monospace] text-[9.5px] font-semibold text-[var(--blue2)] px-2 py-[2px] border border-[rgba(59,130,246,.25)] rounded-[4px] transition-all duration-[0.15s] whitespace-nowrap hover:bg-[var(--blue-d)] hover:border-[var(--blue2)] no-underline" target="_blank" rel="noopener noreferrer">GitHub Portfolio →</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(p => {
            const locked = p.status === "locked";
            return (
              <div
                key={p.id}
                className={`bg-[var(--card)] border border-[var(--border)] rounded-[14px] overflow-hidden transition-all duration-[0.22s] cursor-pointer flex flex-col relative [animation:fadeUp_.3s_ease_both] hover:-translate-y-[4px] hover:shadow-[var(--sh-lg)] hover:border-[var(--border2)] ${locked ? "opacity-60" : ""}`}
              >
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--border)] z-[1] transition-[background] duration-300 hover:bg-[linear-gradient(90deg,var(--orange),var(--blue2))]" />
                {/* BANNER */}
                <div className="h-[90px] flex-shrink-0 flex items-center justify-between px-[18px] relative overflow-hidden" style={{ background: locked ? "linear-gradient(135deg,#08080c,#0c0c14)" : p.bannerBg }}>
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 90" preserveAspectRatio="none">
                    <defs><pattern id={`pp${p.id}`} width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="rgba(255,255,255,.04)" strokeWidth=".7" /></pattern></defs>
                    <rect width="400" height="90" fill={`url(#pp${p.id})`} />
                    {!locked && <polyline points="0,65 80,50 160,58 240,30 320,42 400,18" fill="none" stroke="rgba(34,197,94,.45)" strokeWidth="1.5" />}
                    {!locked && <polyline points="0,78 100,70 200,62 300,50 400,38" fill="none" stroke="rgba(59,130,246,.3)" strokeWidth="1" />}
                  </svg>
                  {locked ? (
                    <div className="flex flex-col items-center justify-center gap-1.5 w-full">
                      <div className="text-[28px]">{p.emoji}</div>
                      <div className="font-['JetBrains_Mono',monospace] text-[9px] text-[rgba(255,255,255,.35)] tracking-[.06em]">{p.lockedTitle}</div>
                    </div>
                  ) : (
                    <>
                      <div className="text-[36px] relative z-[1] drop-shadow-[0_3px_8px_rgba(0,0,0,.5)]">{p.emoji}</div>
                      <span className={`relative z-[1] font-['JetBrains_Mono',monospace] text-[8px] font-bold px-[10px] py-[3px] rounded-[20px] uppercase tracking-[.06em] backdrop-blur-[8px] ${p.statusCls}`}>{`● ${p.status}`}</span>
                    </>
                  )}
                </div>
                {/* BODY */}
                <div className="px-[15px] py-[13px] flex-1 flex flex-col">
                  {!locked && <div className="font-['JetBrains_Mono',monospace] text-[8.5px] text-[var(--text3)] uppercase tracking-[.06em] mb-[4px]">{p.course}</div>}
                  {locked && <div className="font-['JetBrains_Mono',monospace] text-[8.5px] text-[var(--text3)] uppercase tracking-[.06em] mb-[4px]">{p.course}</div>}
                  <div className="font-['Syne',sans-serif] text-[14px] font-[800] text-[var(--text)] mb-[4px] leading-[1.3]">{p.name}</div>
                  {!locked && <div className="text-[11.5px] text-[var(--text3)] leading-[1.55] mb-[11px] line-clamp-2">{p.desc}</div>}

                  {/* tech badges */}
                  <div className="flex gap-[5px] flex-wrap mb-[10px]">
                    {p.tech.map(t => (
                      <span key={t} className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold px-[8px] py-[2px] rounded-[4px] bg-[var(--bg2)] border border-[var(--border)] text-[var(--text3)]">{t}</span>
                    ))}
                  </div>

                  {/* tags */}
                  {p.tags.length > 0 && (
                    <div className="flex gap-[5px] flex-wrap mb-3">
                      {p.tags.map((t, i) => (
                        <span key={i} className={`font-['JetBrains_Mono',monospace] text-[8px] font-bold px-[7px] py-[2px] rounded-[3px] tracking-[.04em] ${t.cls}`}>{t.lbl}</span>
                      ))}
                    </div>
                  )}

                  {/* progress bar */}
                  {p.progress >= 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between font-['JetBrains_Mono',monospace] text-[9px] text-[var(--text3)] mb-[4px]">
                        <span>Build progress</span>
                        <span className="font-bold text-[var(--orange)]">{p.progress}%</span>
                      </div>
                      <div className="h-[5px] bg-[var(--border)] rounded-[99px] overflow-hidden">
                        <div className="h-full rounded-[99px] transition-[width] duration-[0.8s]" style={{ width: `${p.progress}%`, background: p.progressColor }} />
                      </div>
                    </div>
                  )}

                  {/* footer */}
                  <div className="mt-auto flex items-center justify-between pt-[11px] border-t border-[var(--border)] gap-2">
                    <div className="flex gap-2.5">
                      <span className="font-['JetBrains_Mono',monospace] text-[9px] text-[var(--text3)] flex items-center gap-[3px]">{p.date}</span>
                      {p.gh && <span className="font-['JetBrains_Mono',monospace] text-[9px] text-[var(--blue2)] flex items-center gap-[4px]">{p.gh}</span>}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {p.actions.map((a, i) => (
                        <button key={i} className={`px-3 py-[5px] rounded-[6px] text-[11px] font-semibold transition-all duration-[0.15s] whitespace-nowrap ${a.cls}`}>{a.lbl}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
