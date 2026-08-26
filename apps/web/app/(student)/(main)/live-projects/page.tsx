"use client";

import { useState, useCallback, useEffect, useRef } from "react";

/* ─── DATA ──────────────────────────────────────────────────────── */

interface Project {
  id: string;
  tech: string;
  techLabel: string;
  name: string;
  image: string | null;
  thumbGradient: string;
  shortDesc: string;
  overview: string;
  stack: string[];
  highlights: string[];
  prereqs: string[];
  curriculum: { week: string; title: string; desc: string }[];
  trainer: string;
  trainerRole: string;
  trainerBio: string;
  level: "beginner" | "inter" | "advanced";
  badge: string;
  duration: string;
  sessions: string;
  seats: number;
  rating: number;
  reviews: number;
  price: number;
  oldPrice: number;
  includes: string[];
  industryUse: string;
  tools: string[];
  setupSteps: string[];
}

function mapApiProject(p: any): Project {
  const levelMap: Record<string, "beginner" | "inter" | "advanced"> = {
    Beginner: "beginner",
    Intermediate: "inter",
    Advanced: "advanced",
  };
  return {
    id: p.id,
    tech: p.tech || "",
    techLabel: p.techLabel || "",
    name: p.name || "",
    image: p.image || null,
    thumbGradient: p.thumbGradient || "linear-gradient(135deg,#0d1f3c,#0a2a1a)",
    shortDesc: p.shortDesc || "",
    overview: p.overview || "",
    stack: Array.isArray(p.stack) ? p.stack : [],
    highlights: Array.isArray(p.highlights) ? p.highlights : [],
    prereqs: Array.isArray(p.prereqs) ? p.prereqs : [],
    curriculum: Array.isArray(p.curriculum)
      ? p.curriculum.map((c: any) => ({ week: c.week || "", title: c.title || "", desc: c.desc || "" }))
      : [],
    trainer: p.trainer?.name || "TBD",
    trainerRole: p.trainer
      ? `${p.trainer.role === "TRAINER" ? "Trainer" : ""} · ${p.trainer.yearsExperience ?? 0} yrs exp.`
      : "",
    trainerBio: p.trainer?.bio || "",
    level: levelMap[p.level] || "inter",
    badge: p.level || "Intermediate",
    duration: p.duration || "",
    sessions: p.sessions || "",
    seats: p.seats ?? 0,
    rating: p.rating ?? 0,
    reviews: p.reviewCount ?? 0,
    price: p.price ?? 0,
    oldPrice: p.originalPrice ?? p.price ?? 0,
    includes: Array.isArray(p.includes) ? p.includes : [],
    industryUse: p.industryUse || "",
    tools: Array.isArray(p.tools) ? p.tools : [],
    setupSteps: Array.isArray(p.setupSteps) ? p.setupSteps : [],
  };
}

/* ─── HELPERS ───────────────────────────────────────────────────── */

const TECH_FILTERS = [
  { key: "all", label: "All" },
  { key: "mern", label: "MERN Stack" },
  { key: "java", label: "Java / Spring Boot" },
  { key: "frontend", label: "Frontend / React" },
  { key: "node", label: "Node.js" },
  { key: "python", label: "Python" },
  { key: "data", label: "Data Science" },
  { key: "aiml", label: "AI / ML" },
  { key: "devops", label: "DevOps" },
  { key: "cloud", label: "Cloud (AWS)" },
  { key: "iot", label: "IoT" },
];

/* ─── HELPERS ───────────────────────────────────────────────────── */

function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function badgeColor(level: string) {
  if (level === "beginner") return "bg-[var(--blue)] text-white";
  if (level === "advanced") return "bg-[var(--purple)] text-white";
  return "bg-[var(--orange)] text-white";
}

function mdInline(str: string) {
  return str.replace(/`([^`]+)`/g, '<code class="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-px text-[11px] text-[var(--text)] font-mono">$1</code>');
}

/* ─── COMPONENT ─────────────────────────────────────────────────── */

export default function LiveProjectsPage() {
  const [activeTech, setActiveTech] = useState("all");
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [buyProject, setBuyProject] = useState<Project | null>(null);
  const [toast, setToast] = useState({ show: false, msg: "" });
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects?status=ACTIVE")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.projects || [];
        setProjects(list.map(mapApiProject));
      })
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeTech === "all"
    ? projects
    : projects.filter((p) => p.tech === activeTech);

  const openDetail = useCallback((id: string) => {
    setDetailProject(projects.find((p) => p.id === id) ?? null);
    document.body.style.overflow = "hidden";
  }, [projects]);

  const closeDetail = useCallback(() => {
    setDetailProject(null);
    document.body.style.overflow = "";
  }, []);

  const openBuy = useCallback((id: string) => {
    closeDetail();
    setTimeout(() => {
      setBuyProject(projects.find((p) => p.id === id) ?? null);
      document.body.style.overflow = "hidden";
    }, 100);
  }, [closeDetail, projects]);

  const closeBuy = useCallback(() => {
    setBuyProject(null);
    document.body.style.overflow = "";
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: "" }), 2600);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto max-w-[1520px] p-4 md:p-5">
        {/* ── HEADER ── */}
        <div className="mb-4 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)]">Live Projects</h1>
            <p className="mt-0.5 text-[12.5px] text-[var(--muted)]">Pick a technology, buy a real-world project, and build it with 1:1 mentorship from an industry trainer.</p>
          </div>
          <div className="text-[12px] text-[var(--muted)] whitespace-nowrap">
            <b className="text-[var(--text)]">{filtered.length}</b> project{filtered.length === 1 ? "" : "s"} available
          </div>
        </div>

        {/* ── FILTER BAR ── */}
        <div className="mb-4 flex gap-2 flex-wrap items-center">
          {TECH_FILTERS.map((t) => {
            const count = t.key === "all" ? projects.length : projects.filter((p) => p.tech === t.key).length;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTech(t.key)}
                className={`rounded-full border px-4 py-[7px] text-[12.5px] font-semibold transition-all shadow-[var(--shadow)] flex items-center gap-1.5 cursor-pointer ${
                  activeTech === t.key
                    ? "bg-[var(--orange)] border-[var(--orange)] text-white"
                    : "bg-[var(--card)] border-[var(--border)] text-[var(--text2)] hover:border-[var(--orange)] hover:text-[var(--text)]"
                }`}
              >
                {t.label}
                {t.key === "all" && <span className="text-[10px] opacity-80">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* ── PROJECTS GRID ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <span className="inline-block w-5 h-5 border-2 border-[var(--border)] border-t-[var(--orange)] rounded-full animate-spin" />
            <span className="text-[13px] text-[var(--muted)]">Loading projects…</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-10">
            {filtered.map((p) => (
              <ProjectCard key={p.id} project={p} onDetail={openDetail} onBuy={openBuy} />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12 text-[var(--muted)] text-[13px]">
                No projects found for this technology yet — check back soon.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── DETAIL MODAL ── */}
      {detailProject && (
        <DetailModal project={detailProject} onClose={closeDetail} onBuy={openBuy} />
      )}

      {/* ── BUY MODAL ── */}
      {buyProject && (
        <BuyModal project={buyProject} onClose={closeBuy} onSuccess={showToast} />
      )}

      {/* ── TOAST ── */}
      <div
        className={`fixed bottom-6 right-6 bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-lg)] rounded-[10px] px-[18px] py-3 text-[12.5px] font-semibold text-[var(--text)] flex items-center gap-2 z-[1100] transition-all duration-300 ${
          toast.show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5 pointer-events-none"
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-[var(--green)]" />
        <span>{toast.msg}</span>
      </div>
    </div>
  );
}

/* ─── PROJECT CARD ──────────────────────────────────────────────── */

function ProjectCard({ project: p, onDetail, onBuy }: { project: Project; onDetail: (id: string) => void; onBuy: (id: string) => void }) {
  const off = Math.round((1 - p.price / p.oldPrice) * 100);
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[13px] overflow-hidden shadow-[var(--shadow)] flex flex-col transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[var(--shadow-lg)] hover:border-[rgba(37,99,235,.3)]">
      {/* Thumb */}
      <div className="relative h-[92px] flex items-center justify-center overflow-hidden" style={{ background: p.thumbGradient }}>
        <span className={`absolute top-2 left-2 text-[9px] font-bold tracking-widest uppercase px-2 py-[3px] rounded-[4px] z-10 ${badgeColor(p.level)}`}>{p.badge}</span>
        <span className="absolute top-2 right-2 text-[9px] font-bold bg-black/55 text-[#ffd9b0] px-2 py-[3px] rounded-[4px] z-10">{p.seats} seats left</span>
        {p.image ? (
          <img src={p.image} alt={p.name} className="min-w-full min-h-full object-cover" />
        ) : (
          <span className="text-[28px] drop-shadow-[0_4px_10px_rgba(0,0,0,.4)]">🚀</span>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <button onClick={() => onDetail(p.id)} className="text-left bg-transparent border-none p-0 cursor-pointer text-[13.5px] font-bold text-[var(--text)] leading-[1.35] hover:text-[var(--orange)] hover:underline transition-colors font-inherit">
          {p.name}
        </button>
        <p className="text-[11px] text-[var(--muted)] leading-[1.5]">{p.shortDesc}</p>

        {/* Tech chips */}
        <div className="flex flex-wrap gap-[5px]">
          {p.stack.map((s) => (
            <span key={s} className="text-[9.5px] font-semibold bg-[var(--blue-dim)] text-[var(--blue)] px-[7px] py-[2px] rounded-[5px] dark:bg-[rgba(59,130,246,.15)]">{s}</span>
          ))}
        </div>

        {/* Trainer */}
        <div className="flex items-center gap-[7px] pt-[7px] border-t border-[var(--border)]">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#4db33d] to-[#2d7ef7] flex items-center justify-center text-[9.5px] font-bold text-white shrink-0">{initials(p.trainer)}</div>
          <div>
            <div className="text-[11px] font-semibold text-[var(--text)]">{p.trainer}</div>
            <div className="text-[9.5px] text-[var(--muted)]">{p.trainerRole.split(" · ")[0]}</div>
          </div>
        </div>

        {/* Meta */}
        <div className="flex justify-between text-[9.5px] text-[var(--muted)]">
          <span>⏱ {p.duration}</span>
          <span>👨‍🏫 {p.sessions}</span>
        </div>

        {/* Stars */}
        <div className="flex items-center gap-1">
          <span className="text-[11.5px] font-bold text-[var(--amber)]">{p.rating}</span>
          <span className="text-[var(--amber)] text-[10.5px]">★</span>
          <span className="text-[9.5px] text-[var(--muted)]">({p.reviews})</span>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between mt-auto pt-[9px] border-t border-[var(--border)]">
          <div className="flex items-baseline gap-[5px]">
            <span className="text-[15.5px] font-extrabold text-[var(--text)]">₹{p.price.toLocaleString("en-IN")}</span>
            <span className="text-[10.5px] text-[var(--muted)] line-through">₹{p.oldPrice.toLocaleString("en-IN")}</span>
          </div>
          <button onClick={() => onBuy(p.id)} className="bg-[var(--orange)] text-white border-none py-[7px] px-3 rounded-[8px] font-bold text-[11.5px] shadow-[0_4px_14px_rgba(255,106,26,.3)] cursor-pointer hover:bg-[var(--orange2)] hover:-translate-y-[1px] transition-all">
            Buy Project
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── DETAIL MODAL ──────────────────────────────────────────────── */

function DetailModal({ project: p, onClose, onBuy }: { project: Project; onClose: () => void; onBuy: (id: string) => void }) {
  const off = Math.round((1 - p.price / p.oldPrice) * 100);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-5 bg-black/60 backdrop-blur-[3px] opacity-100 pointer-events-auto transition-opacity" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[var(--surface)] rounded-[18px] w-[860px] max-w-full max-h-[90vh] overflow-y-auto shadow-[var(--shadow-lg)] border border-[var(--border)] transform translate-y-0 transition-transform">
        {/* Hero */}
        <div className="relative p-6 pb-5 text-white overflow-hidden" style={{ background: p.thumbGradient }}>
          {p.image && (
            <img src={p.image} alt="" className="absolute inset-0 w-full h-full min-w-full min-h-full object-cover opacity-30" />
          )}
          <button onClick={onClose} className="absolute top-3.5 right-3.5 w-[30px] h-[30px] rounded-[8px] border border-white/25 bg-white/10 text-white text-[15px] flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors z-10">✕</button>
          <div className="flex gap-2 mb-2.5">
            <span className={`text-[9px] font-bold tracking-widest uppercase px-[9px] py-[3px] rounded-[5px] ${badgeColor(p.level)}`}>{p.badge}</span>
            <span className="text-[10.5px] font-bold bg-white/12 text-white/75 px-[9px] py-[3px] rounded-[5px]">{p.techLabel}</span>
          </div>
          <h2 className="text-[21px] font-extrabold leading-[1.25] mb-2 max-w-[520px]">{p.name}</h2>
          <p className="text-[12.5px] text-white/75 leading-[1.6] max-w-[540px]">{p.shortDesc}</p>
          <div className="flex gap-[22px] mt-4 flex-wrap">
            <div><b className="block text-[15px] font-extrabold">{p.duration}</b><span className="text-[10px] text-white/60">Duration</span></div>
            <div><b className="block text-[15px] font-extrabold">{p.sessions}</b><span className="text-[10px] text-white/60">Mentor Sessions</span></div>
            <div><b className="block text-[15px] font-extrabold">★ {p.rating}</b><span className="text-[10px] text-white/60">Rating</span></div>
            <div><b className="block text-[15px] font-extrabold">{p.seats}</b><span className="text-[10px] text-white/60">Seats Left</span></div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-[22px]">
          {/* Overview */}
          <section>
            <h3 className="text-[13px] font-bold text-[var(--text)] mb-2.5 flex items-center gap-[7px]">📖 Project Overview</h3>
            <p className="text-[12.5px] text-[var(--text2)] leading-[1.65]">{p.overview}</p>
          </section>

          {/* Two-col grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[22px]">
            <section>
              <h3 className="text-[13px] font-bold text-[var(--text)] mb-2.5">🎯 What You&apos;ll Build</h3>
              <div className="flex flex-col gap-2">
                {p.highlights.map((h, i) => (
                  <div key={i} className="flex gap-2 text-[12px] text-[var(--text2)] items-start leading-[1.5]">
                    <span className="text-[var(--green)] font-bold shrink-0">✓</span>
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <h3 className="text-[13px] font-bold text-[var(--text)] mb-2.5">✅ Prerequisites</h3>
              <div className="flex flex-col gap-2">
                {p.prereqs.map((h, i) => (
                  <div key={i} className="flex gap-2 text-[12px] text-[var(--text2)] items-start leading-[1.5]">
                    <span className="text-[var(--green)] font-bold shrink-0">✓</span>
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Curriculum */}
          <section>
            <h3 className="text-[13px] font-bold text-[var(--text)] mb-2.5">🗓 Project Curriculum</h3>
            <div className="flex flex-col gap-2.5">
              {p.curriculum.map((c, i) => (
                <div key={i} className="flex gap-3 bg-[var(--bg)] border border-[var(--border)] rounded-[10px] p-3">
                  <span className="shrink-0 text-[10px] font-bold text-[var(--orange)] bg-[var(--orange-d)] rounded-[6px] px-2 py-1 h-fit whitespace-nowrap">{c.week}</span>
                  <div>
                    <b className="text-[12px] text-[var(--text)] block mb-0.5">{c.title}</b>
                    <span className="text-[11px] text-[var(--muted)] leading-[1.5]">{c.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Industry Use */}
          <section>
            <h3 className="text-[13px] font-bold text-[var(--text)] mb-2.5">🏭 Why It Matters in the Industry</h3>
            <div className="bg-gradient-to-br from-[rgba(37,99,235,.06)] to-[rgba(240,90,26,.06)] dark:from-[rgba(59,130,246,.08)] dark:to-[rgba(255,106,26,.08)] border border-[var(--border)] rounded-[12px] p-4">
              <p className="text-[12.5px] text-[var(--text2)] leading-[1.65]">{p.industryUse}</p>
            </div>
          </section>

          {/* Tools & Setup */}
          <section>
            <h3 className="text-[13px] font-bold text-[var(--text)] mb-2.5">🛠 Development Environment Setup</h3>
            <div className="flex flex-wrap gap-[6px] mb-3.5">
              {p.tools.map((t, i) => (
                <span key={i} className="text-[11px] font-semibold text-[var(--text2)] bg-[var(--bg)] border border-[var(--border)] px-2.5 py-1 rounded-[7px]">{t}</span>
              ))}
            </div>
            <div className="flex flex-col gap-2.5">
              {p.setupSteps.map((s, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="shrink-0 w-[22px] h-[22px] rounded-[6px] bg-[var(--orange-d)] text-[var(--orange)] text-[11px] font-extrabold flex items-center justify-center mt-px">{i + 1}</span>
                  <span className="text-[12px] text-[var(--text2)] leading-[1.55]" dangerouslySetInnerHTML={{ __html: mdInline(s) }} />
                </div>
              ))}
            </div>
          </section>

          {/* Trainer */}
          <section>
            <h3 className="text-[13px] font-bold text-[var(--text)] mb-2.5">🧑‍🏫 Your Trainer</h3>
            <div className="flex gap-3 bg-[var(--bg)] border border-[var(--border)] rounded-[12px] p-3.5 items-start">
              <div className="w-[46px] h-[46px] rounded-full bg-gradient-to-br from-[#4db33d] to-[#2d7ef7] flex items-center justify-center text-[15px] font-bold text-white shrink-0">{initials(p.trainer)}</div>
              <div>
                <div className="text-[13px] font-bold text-[var(--text)]">{p.trainer}</div>
                <div className="text-[11px] text-[var(--orange)] font-semibold mb-1.5">{p.trainerRole}</div>
                <div className="text-[11.5px] text-[var(--text2)] leading-[1.6]">{p.trainerBio}</div>
              </div>
            </div>
          </section>

          {/* What's Included */}
          <section>
            <h3 className="text-[13px] font-bold text-[var(--text)] mb-2.5">📦 What&apos;s Included</h3>
            <div className="flex flex-col gap-1.5">
              {p.includes.map((item, i) => (
                <div key={i} className="flex gap-2 text-[11.5px] text-[var(--text2)] items-start">
                  <span className="text-[var(--green)] font-bold shrink-0">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sticky price bar */}
        <div className="sticky bottom-0 bg-[var(--surface)] border-t border-[var(--border)] mx-[-26px] mb-[-26px] px-[26px] py-3.5 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-[20px] font-extrabold text-[var(--text)]">₹{p.price.toLocaleString("en-IN")}</span>
              <span className="text-[12px] text-[var(--muted)] line-through">₹{p.oldPrice.toLocaleString("en-IN")}</span>
              <span className="text-[11px] font-bold text-[var(--green)]">{off}% off</span>
            </div>
            <div className="text-[10.5px] text-[var(--muted)]">{p.seats} seats left at this price</div>
          </div>
          <button onClick={() => onBuy(p.id)} className="bg-[var(--orange)] text-white border-none py-2.5 px-5 rounded-[8px] font-bold text-[13px] cursor-pointer hover:bg-[var(--orange2)] transition-all">
            Buy Project
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── BUY MODAL ─────────────────────────────────────────────────── */

function BuyModal({ project: p, onClose, onSuccess }: { project: Project; onClose: () => void; onSuccess: (msg: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !/\S+@\S+\.\S+/.test(email)) {
      alert("Please fill in your name, phone and a valid email.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const order = {
        id: "ORD-" + Date.now().toString().slice(-8),
        projectId: p.id, projectName: p.name,
        trainer: p.trainer, price: p.price,
        name, phone, email, purchasedAt: new Date().toISOString(),
      };
      const existing = JSON.parse(localStorage.getItem("fs-project-orders") || "[]");
      existing.unshift(order);
      localStorage.setItem("fs-project-orders", JSON.stringify(existing));
      setLoading(false);
      setDone(true);
      onSuccess(`"${p.name}" purchased successfully`);
    }, 1000);
  };

  const off = Math.round((1 - p.price / p.oldPrice) * 100);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-5 bg-black/60 backdrop-blur-[3px] opacity-100 pointer-events-auto" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[var(--surface)] rounded-[16px] w-[440px] max-w-full max-h-[88vh] overflow-y-auto shadow-[var(--shadow-lg)] border border-[var(--border)] transform translate-y-0 transition-transform">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-[15px] font-bold text-[var(--text)]">Buy: {p.name}</h3>
          <button onClick={onClose} className="bg-transparent border-none text-[var(--muted)] text-[18px] leading-none p-1 cursor-pointer hover:text-[var(--text)]">✕</button>
        </div>

        {!done ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 p-5">
            {/* Order summary */}
            <div className="flex gap-3 items-center bg-[var(--bg)] border border-[var(--border)] rounded-[10px] p-3">
              <div className="w-[44px] h-[44px] rounded-[8px] shrink-0 flex items-center justify-center text-[18px] overflow-hidden" style={{ background: p.thumbGradient }}>
                {p.image ? (
                  <img src={p.image} alt={p.name} className="min-w-full min-h-full object-cover" />
                ) : (
                  <span>🚀</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[12.5px] font-bold text-[var(--text)]">{p.name}</h4>
                <p className="text-[10.5px] text-[var(--muted)] mt-0.5">Mentor: {p.trainer}</p>
              </div>
              <span className="text-[var(--orange)] font-extrabold text-[15px] shrink-0">₹{p.price.toLocaleString("en-IN")}</span>
            </div>

            {/* Includes */}
            <div className="flex flex-col gap-1.5">
              {p.includes.slice(0, 4).map((item, i) => (
                <div key={i} className="flex gap-2 text-[11.5px] text-[var(--text2)] items-start">
                  <span className="text-[var(--green)] font-bold shrink-0">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* Form */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[var(--text2)]">Full Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aditi Sharma" required className="bg-[var(--bg)] border border-[var(--border)] rounded-[8px] px-3 py-2.5 text-[13px] text-[var(--text)] outline-none focus:border-[var(--orange)] transition-colors" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[var(--text2)]">Phone Number</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" required className="bg-[var(--bg)] border border-[var(--border)] rounded-[8px] px-3 py-2.5 text-[13px] text-[var(--text)] outline-none focus:border-[var(--orange)] transition-colors" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[var(--text2)]">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@email.com" required className="bg-[var(--bg)] border border-[var(--border)] rounded-[8px] px-3 py-2.5 text-[13px] text-[var(--text)] outline-none focus:border-[var(--orange)] transition-colors" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="mt-3 w-full bg-[var(--orange)] text-white border-none py-3 rounded-[10px] font-bold text-[13px] flex items-center justify-center gap-2 cursor-pointer hover:bg-[var(--orange2)] disabled:opacity-70 disabled:cursor-default transition-all">
              {loading ? (
                <><span className="inline-block w-[14px] h-[14px] border-2 border-white/40 border-t-white rounded-full animate-spin" />Processing…</>
              ) : (
                <>Confirm & Pay</>
              )}
            </button>
          </form>
        ) : (
          <div className="p-9 text-center">
            <div className="w-14 h-14 rounded-full bg-[var(--green-d)] text-[var(--green)] flex items-center justify-center text-[26px] mx-auto mb-3.5">✓</div>
            <h3 className="text-[16px] font-bold text-[var(--text)] mb-1.5">You&apos;re in!</h3>
            <p className="text-[12px] text-[var(--muted)] mb-4.5 leading-[1.6]">
              Your purchase of &quot;{p.name}&quot; is confirmed. {p.trainer} will reach out within 24 hours to schedule your first session.
            </p>
            <button onClick={onClose} className="w-full bg-[var(--orange)] text-white border-none py-2.5 px-5 rounded-[8px] font-semibold text-[13px] cursor-pointer hover:bg-[var(--orange2)] transition-all">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
