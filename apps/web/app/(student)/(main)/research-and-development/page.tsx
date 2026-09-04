"use client";

import { useState } from "react";

const FOCUS_AREAS = [
  {
    index: "01",
    title: "Artificial Intelligence",
    desc: "Applied ML systems, from predictive models to generative copilots, built to solve a real operating problem rather than demo well once.",
    tags: ["Computer vision", "LLMs & RAG", "Predictive ML"],
    img: "https://images.pexels.com/photos/17483874/pexels-photo-17483874.jpeg?auto=compress&cs=tinysrgb&w=700",
  },
  {
    index: "02",
    title: "Industrial IoT",
    desc: "Sensor networks and edge devices that give factory floors real-time visibility into machine health and process performance.",
    tags: ["Edge computing", "Sensor networks", "Predictive maintenance"],
    img: "https://images.pexels.com/photos/34207359/pexels-photo-34207359.jpeg?auto=compress&cs=tinysrgb&w=700",
  },
  {
    index: "03",
    title: "Embedded Systems",
    desc: "Custom firmware, PCB design and low-level systems work for products that need to run reliably on real hardware, not just in the cloud.",
    tags: ["PCB design", "Firmware", "RTOS"],
    img: "https://images.pexels.com/photos/2182863/pexels-photo-2182863.jpeg?auto=compress&cs=tinysrgb&w=700",
  },
  {
    index: "04",
    title: "Digital Twin",
    desc: "Live virtual replicas of physical machines, used to simulate and monitor performance before touching the real production line.",
    tags: ["3D simulation", "Live telemetry", "Process modeling"],
    img: "https://images.pexels.com/photos/30482193/pexels-photo-30482193.jpeg?auto=compress&cs=tinysrgb&w=700",
  },
  {
    index: "05",
    title: "Machine Development",
    desc: "End-to-end design of new machines and automation equipment, combining mechanical design with the control software that drives it.",
    tags: ["CAD & simulation", "Controls", "Automation"],
    img: "https://images.pexels.com/photos/34194567/pexels-photo-34194567.jpeg?auto=compress&cs=tinysrgb&w=700",
  },
  {
    index: "06",
    title: "Emerging Technology",
    desc: "An always-on exploration bench for whatever comes next — robotics, AR/VR and new materials, kept close to production teams.",
    tags: ["Robotics", "AR/VR", "Materials R&D"],
    img: "https://images.pexels.com/photos/3520697/pexels-photo-3520697.jpeg?auto=compress&cs=tinysrgb&w=700",
  },
];

const PROCESS_STEPS = [
  { num: "01", title: "Discovery call", desc: "We understand your problem, constraints and timeline in a no-obligation call." },
  { num: "02", title: "Scoping & NDA", desc: "We sign an NDA and jointly define scope, milestones and IP terms." },
  { num: "03", title: "Prototype & build", desc: "Our engineers design, prototype and iterate with you in tight feedback loops." },
  { num: "04", title: "Handover & support", desc: "You get full documentation, source files and optional ongoing support." },
];

const CAPABILITIES = [
  { title: "Compute cluster", desc: "GPU nodes for AI/ML training", img: "https://images.pexels.com/photos/5480781/pexels-photo-5480781.jpeg?auto=compress&cs=tinysrgb&w=200" },
  { title: "PCB fabrication", desc: "In-house prototyping & assembly", img: "https://images.pexels.com/photos/343457/pexels-photo-343457.jpeg?auto=compress&cs=tinysrgb&w=200" },
  { title: "3D printing", desc: "Rapid mechanical prototyping", img: "https://images.pexels.com/photos/26969660/pexels-photo-26969660.jpeg?auto=compress&cs=tinysrgb&w=200" },
  { title: "Sensor test rigs", desc: "IIoT & embedded validation", img: "https://images.pexels.com/photos/18471441/pexels-photo-18471441.jpeg?auto=compress&cs=tinysrgb&w=200" },
];

const CASE_STUDIES = [
  {
    domain: "Artificial Intelligence",
    title: "Defect-detection copilot for a PCB line",
    desc: "A vision model that flags soldering defects in real time, cutting manual inspection time on a partner's line by more than half.",
    partner: "Manufacturing partner",
    duration: "8 weeks",
    img: "https://images.pexels.com/photos/17483874/pexels-photo-17483874.jpeg?auto=compress&cs=tinysrgb&w=700",
  },
  {
    domain: "Industrial IoT",
    title: "Retrofit sensor kit for legacy machinery",
    desc: "A drop-in vibration and temperature sensor kit that brought 15-year-old presses onto a modern monitoring dashboard.",
    partner: "Industrial client",
    duration: "10 weeks",
    img: "https://images.pexels.com/photos/34207359/pexels-photo-34207359.jpeg?auto=compress&cs=tinysrgb&w=700",
  },
  {
    domain: "Digital Twin",
    title: "Live twin for a packaging line",
    desc: "A simulated replica of a packaging line used to trial layout changes before touching a single physical machine.",
    partner: "Internal product",
    duration: "6 weeks",
    img: "https://images.pexels.com/photos/20341728/pexels-photo-20341728.jpeg?auto=compress&cs=tinysrgb&w=700",
  },
];

export default function RndInnovationLabPage() {
  const [email, setEmail] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setExpanded(true);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/contact/rnd-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), details: details.trim() || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Couldn't send your message — please try again.");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send your message — please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden py-14 md:py-20">
        <div className="mx-auto max-w-[1240px] px-5 md:px-8 grid grid-cols-1 lg:grid-cols-[1.05fr_.95fr] gap-12 lg:gap-14 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-[var(--blue)] bg-[var(--blue-d)] border border-[var(--blue)]/30 rounded-full px-3.5 py-1.5 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--orange)] animate-pulse" />
              One shared lab, every discipline
            </span>
            <h1 className="text-[clamp(28px,4.6vw,52px)] font-bold leading-[1.08] mb-5 max-w-[640px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Where bold thinking becomes working hardware.
            </h1>
            <p className="text-[15px] leading-[1.75] text-[var(--text2)] max-w-[520px] mb-8">
              Future Stack R&D turns early ideas into working prototypes — across AI, industrial IoT, embedded systems and digital twins. Borrow the bench, or let us build alongside your team.
            </p>
            <div className="flex gap-3 flex-wrap mb-10">
              <a href="#focus" className="inline-flex items-center gap-2 font-semibold text-[13.5px] px-6 py-3 rounded-[10px] text-white bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] shadow-[0_10px_28px_-10px_rgba(255,106,26,.35)] hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-10px_rgba(255,106,26,.35)] transition-all">
                See our focus areas
              </a>
              <a href="#contact" className="inline-flex items-center gap-2 font-semibold text-[13.5px] px-6 py-3 rounded-[10px] text-[var(--text)] bg-transparent border border-[var(--border2)] hover:border-[var(--blue)] hover:bg-[var(--blue-d)] transition-all">
                Bring us a problem
              </a>
            </div>
            <div className="flex gap-8 flex-wrap border-t border-[var(--border)] pt-6">
              <div><b className="block text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>4+</b><span className="text-[11.5px] text-[var(--muted)]">Projects delivered</span></div>
              <div><b className="block text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>1</b><span className="text-[11.5px] text-[var(--muted)]">Industry partners</span></div>
              <div><b className="block text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>6</b><span className="text-[11.5px] text-[var(--muted)]">Research domains</span></div>
              <div><b className="block text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>3.2 wks</b><span className="text-[11.5px] text-[var(--muted)]">Avg. concept-to-prototype</span></div>
            </div>
          </div>

          {/* Hero visual — digital twin SVG illustration */}
          <div className="relative">
            <div className="relative rounded-[22px] overflow-hidden border border-white/10 shadow-[var(--shadow-lg)] bg-gradient-to-br from-[#0c1220] to-[#141024]" style={{ aspectRatio: "4/4.6" }}>
              <svg viewBox="0 0 400 460" preserveAspectRatio="xMidYMid slice" className="w-full h-full" aria-hidden="true">
                <defs>
                  <linearGradient id="hvPanel" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0c1220" />
                    <stop offset="100%" stopColor="#141024" />
                  </linearGradient>
                  <linearGradient id="hvBrand" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fdbc18" />
                    <stop offset="45%" stopColor="#ff7a1f" />
                    <stop offset="100%" stopColor="#1c86d6" />
                  </linearGradient>
                  <radialGradient id="hvCore" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffc862" stopOpacity=".95" />
                    <stop offset="55%" stopColor="#ff7a1f" stopOpacity=".5" />
                    <stop offset="100%" stopColor="#ff7a1f" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="hvCoreBlue" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#7fd8f7" stopOpacity=".9" />
                    <stop offset="100%" stopColor="#1c86d6" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="beamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                    <stop offset="15%" stopColor="#bfe3ff" stopOpacity=".9" />
                    <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
                    <stop offset="85%" stopColor="#bfe3ff" stopOpacity=".9" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>
                  <filter id="beamBlur" x="-200%" y="-20%" width="500%" height="140%">
                    <feGaussianBlur stdDeviation="7" />
                  </filter>
                </defs>

                <rect width="400" height="460" fill="url(#hvPanel)" />
                <circle cx="70" cy="90" r="130" fill="url(#hvCore)" />
                <circle cx="330" cy="360" r="150" fill="url(#hvCoreBlue)" />

                {/* dot grid */}
                <g opacity=".18" fill="#ffffff">
                  {[20, 60, 100, 140, 180, 220, 260, 300, 340, 380].map((x) => (
                    <g key={x}>
                      <circle cx={x} cy={20} r="1" />
                      <circle cx={x} cy={60} r="1" />
                    </g>
                  ))}
                </g>

                {/* side labels */}
                <rect x="26" y="34" width="122" height="26" rx="13" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.14)" />
                <text x="87" y="51" fontSize="9.5" fontWeight="600" fill="#ffffff" fillOpacity=".6" textAnchor="middle" fontFamily="Inter, sans-serif">Physical machine</text>
                <rect x="252" y="34" width="122" height="26" rx="13" fill="rgba(28,134,214,.12)" stroke="rgba(63,205,240,.4)" />
                <text x="313" y="51" fontSize="9.5" fontWeight="700" fill="#bfe9ff" textAnchor="middle" fontFamily="Inter, sans-serif">Digital twin</text>

                {/* physical machine */}
                <g fill="#4b5563">
                  <rect x="50" y="290" width="110" height="70" rx="8" />
                  <rect x="75" y="192" width="22" height="100" rx="6" fill="#3f4753" />
                  <rect x="60" y="167" width="50" height="30" rx="6" fill="#5b6472" />
                  <rect x="132" y="308" width="30" height="46" rx="6" fill="#3f4753" />
                  <rect x="138" y="315" width="18" height="13" rx="2" fill="#232a33" />
                  <rect x="58" y="358" width="12" height="14" fill="#333a44" />
                  <rect x="140" y="358" width="12" height="14" fill="#333a44" />
                </g>
                <rect x="30" y="400" width="130" height="24" rx="12" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.1)" />
                <text x="95" y="416" fontSize="8.5" fill="#ffffff" fillOpacity=".45" textAnchor="middle" fontFamily="Inter, sans-serif">Manual logbook only</text>

                {/* digital twin wireframe */}
                <g fill="none" stroke="url(#hvBrand)" strokeWidth="2">
                  <rect x="250" y="290" width="110" height="70" rx="8" />
                  <rect x="275" y="192" width="22" height="100" rx="6" />
                  <rect x="260" y="167" width="50" height="30" rx="6" />
                  <rect x="332" y="308" width="30" height="46" rx="6" strokeWidth="1.5" />
                </g>
                <rect x="338" y="315" width="18" height="13" rx="2" fill="#3fcdf0" opacity=".55" />
                <circle cx="285" cy="182" r="4" fill="#3fcdf0" filter="url(#beamBlur)" className="animate-pulse" />
                <circle cx="347" cy="325" r="3.5" fill="#ffc233" filter="url(#beamBlur)" className="animate-pulse" style={{ animationDelay: ".9s" }} />

                <rect x="240" y="400" width="130" height="24" rx="12" fill="rgba(63,205,240,.1)" stroke="rgba(63,205,240,.3)" />
                <text x="305" y="416" fontSize="8.5" fontWeight="600" fill="#bfe9ff" textAnchor="middle" fontFamily="Inter, sans-serif">Synced 40ms ago</text>

                {/* center beam */}
                <rect x="196" y="15" width="8" height="430" fill="url(#beamGrad)" filter="url(#beamBlur)" />
                <rect x="198" y="15" width="4" height="430" fill="url(#beamGrad)" />
              </svg>

              {/* sync icon */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 backdrop-blur-[16px] border border-white/10 shadow-[var(--shadow-lg),0_0_24px_-4px_rgba(28,134,214,.3)] flex items-center justify-center z-10">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" style={{ animationDuration: "5s" }}>
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
              </div>

              {/* badge */}
              <div className="absolute top-5 right-5 z-10 bg-white/10 backdrop-blur-[16px] border border-white/10 rounded-full px-3.5 py-[7px] flex items-center gap-[7px] text-[11px] font-semibold text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--orange)] animate-pulse" />
                Digital twin live
              </div>

              {/* chip */}
              <div className="absolute bottom-5 left-5 z-10 bg-white/10 backdrop-blur-[16px] border border-white/10 rounded-[14px] p-3.5 flex items-center gap-3 shadow-[var(--shadow-lg)] max-w-[260px]">
                <div className="w-[38px] h-[38px] rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "conic-gradient(from 0deg, #ff7a1f, #1c86d6, #ff7a1f)", animation: "spin 8s linear infinite" }}>
                  <div className="w-[34px] h-[34px] rounded-full bg-[var(--surface)] flex items-center justify-center">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="13" height="13" rx="2" />
                      <path d="M21 8v11a2 2 0 0 1-2 2H8" />
                    </svg>
                  </div>
                </div>
                <div>
                  <b className="block text-[12.5px] font-bold text-white">Digital twin · Mill 04</b>
                  <span className="text-[10.5px] text-white/70">Physical and virtual state in sync</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOCUS AREAS ═══ */}
      <section id="focus" className="py-16 md:py-24">
        <div className="mx-auto max-w-[1240px] px-5 md:px-8">
          <div className="max-w-[620px] mb-11">
            <div className="inline-flex items-center gap-2.5 text-[13px] font-semibold text-[var(--blue)] mb-3">
              <span className="w-[22px] h-[2px] rounded-sm bg-gradient-to-r from-[var(--orange)] to-[var(--blue)]" />
              What we research
            </div>
            <h2 className="text-[clamp(22px,3vw,30px)] font-bold mb-2.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Six domains, one engineering bench</h2>
            <p className="text-[14.5px] text-[var(--text2)] max-w-[520px]">Each area pairs software and hardware engineers so a concept can move from a whiteboard to a working rig without changing teams.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {FOCUS_AREAS.map((area) => (
              <article key={area.index} className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] overflow-hidden shadow-[var(--shadow)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lg)] hover:border-[var(--border2)]">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <span className="absolute top-3 left-3 z-10 text-[11px] font-semibold text-white bg-black/50 backdrop-blur-md border border-white/15 rounded-full px-2.5 py-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{area.index}</span>
                  <img src={area.img} alt={area.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <div className="p-5 pb-6">
                  <h3 className="text-[16px] font-bold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{area.title}</h3>
                  <p className="text-[12.8px] text-[var(--text2)] leading-[1.65] mb-4">{area.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {area.tags.map((tag) => (
                      <span key={tag} className="text-[10.5px] font-semibold text-[var(--text2)] bg-[var(--bg)] border border-[var(--border)] rounded-md px-2.5 py-[3px]">{tag}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ R&D AS A SERVICE ═══ */}
      <section id="raas" className="py-16 md:py-24 pt-0">
        <div className="mx-auto max-w-[1240px] px-5 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[.82fr_1.18fr] gap-11 items-stretch">
            {/* photo */}
            <div className="relative rounded-[20px] overflow-hidden border border-[var(--border)] min-h-[420px]">
              <img src="https://images.pexels.com/photos/3862135/pexels-photo-3862135.jpeg?auto=compress&cs=tinysrgb&w=800" alt="Engineers reviewing a project blueprint together" className="w-full h-full object-cover absolute inset-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 z-10 text-white">
                <b className="block text-[15px] font-bold mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Discovery call, week one</b>
                <span className="text-[11.5px] text-white/75">Scoping a sensor retrofit for a partner&apos;s assembly line</span>
              </div>
            </div>
            {/* content */}
            <div className="flex flex-col justify-center">
              <div className="inline-flex items-center gap-2.5 text-[13px] font-semibold text-[var(--blue)] mb-3">
                <span className="w-[22px] h-[2px] rounded-sm bg-gradient-to-r from-[var(--orange)] to-[var(--blue)]" />
                Work with the lab
              </div>
              <h2 className="text-[clamp(22px,2.8vw,28px)] font-bold mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Borrow our R&D bench for your project</h2>
              <p className="text-[14.5px] text-[var(--text2)] leading-[1.75] mb-5 max-w-[520px]">
                We don&apos;t only build our own products — we lend the same engineers, prototyping lab and process to companies who need R&D firepower without hiring a full in-house team.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 list-none">
                {[
                  "Dedicated engineers across AI, embedded and mechanical design",
                  "In-house prototyping lab — PCB fab, 3D printing, sensor rigs",
                  "NDA-first engagement with clear client IP ownership",
                  "Flexible models — fixed scope, staff augmentation or retainer",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px] text-[var(--text2)] leading-[1.5]">
                    <span className="shrink-0 w-[18px] h-[18px] rounded-md bg-[var(--blue-d)] text-[var(--blue)] flex items-center justify-center text-[11px] font-bold mt-px">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <a href="#contact" className="self-start inline-flex items-center gap-2 font-semibold text-[13.5px] px-6 py-3 rounded-[10px] text-white bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] shadow-[0_10px_28px_-10px_rgba(255,106,26,.35)] hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-10px_rgba(255,106,26,.35)] transition-all">
                Start a partnership conversation
              </a>
            </div>
          </div>

          {/* process */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-16">
            {PROCESS_STEPS.map((step) => (
              <div key={step.num} className="p-5 border border-[var(--border)] rounded-[16px] bg-[var(--card)]">
                <div className="text-[26px] font-bold text-[var(--border2)] mb-3.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{step.num}</div>
                <h4 className="text-[13.5px] font-bold mb-1.5">{step.title}</h4>
                <p className="text-[12px] text-[var(--muted)] leading-[1.6]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CAPABILITIES ═══ */}
      <section id="capabilities" className="py-16 md:py-24 pt-0">
        <div className="mx-auto max-w-[1240px] px-5 md:px-8">
          <div className="max-w-[620px] mb-11">
            <div className="inline-flex items-center gap-2.5 text-[13px] font-semibold text-[var(--blue)] mb-3">
              <span className="w-[22px] h-[2px] rounded-sm bg-gradient-to-r from-[var(--orange)] to-[var(--blue)]" />
              Inside the lab
            </div>
            <h2 className="text-[clamp(22px,3vw,30px)] font-bold mb-2.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>What the bench is built with</h2>
            <p className="text-[14.5px] text-[var(--text2)]">The equipment our engineers reach for on any given week.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--border)] border border-[var(--border)] rounded-[16px] overflow-hidden">
            {CAPABILITIES.map((cap) => (
              <div key={cap.title} className="bg-[var(--card)] p-5 flex items-center gap-3.5">
                <div className="w-[52px] h-[52px] rounded-[12px] overflow-hidden flex-shrink-0 border border-white/10">
                  <img src={cap.img} alt={cap.title} className="w-full h-full object-cover" />
                </div>
                <div>
                  <b className="block text-[13px] font-bold mb-0.5">{cap.title}</b>
                  <span className="text-[11px] text-[var(--muted)]">{cap.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CASE STUDIES ═══ */}
      <section id="cases" className="py-16 md:py-24 pt-0">
        <div className="mx-auto max-w-[1240px] px-5 md:px-8">
          <div className="flex items-end justify-between gap-6 flex-wrap mb-8">
            <div className="max-w-[620px]">
              <div className="inline-flex items-center gap-2.5 text-[13px] font-semibold text-[var(--blue)] mb-3">
                <span className="w-[22px] h-[2px] rounded-sm bg-gradient-to-r from-[var(--orange)] to-[var(--blue)]" />
                Recent work
              </div>
              <h2 className="text-[clamp(22px,3vw,30px)] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Innovation in action</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {CASE_STUDIES.map((cs) => (
              <article key={cs.title} className="rounded-[18px] overflow-hidden border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lg)]">
                <div className="relative aspect-[16/11] overflow-hidden">
                  <span className="absolute bottom-3 left-3.5 z-10 text-[10.5px] font-bold text-white bg-black/55 border border-white/15 rounded-full px-2.5 py-1 backdrop-blur-md">{cs.domain}</span>
                  <img src={cs.img} alt={cs.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                </div>
                <div className="p-5">
                  <h3 className="text-[15px] font-bold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{cs.title}</h3>
                  <p className="text-[12.5px] text-[var(--text2)] leading-[1.6] mb-3.5">{cs.desc}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] text-[11px] text-[var(--muted)]">
                    <span>{cs.partner}</span>
                    <b className="text-[var(--blue)] font-bold">{cs.duration}</b>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section id="contact" className="py-16 md:py-24 pt-0">
        <div className="mx-auto max-w-[1240px] px-5 md:px-8">
          <div className="relative rounded-[26px] overflow-hidden p-7 sm:p-10 md:p-14 bg-gradient-to-br from-[#0c1120] to-[#141024] border border-white/10">
            <div className="absolute inset-0 bg-[radial-gradient(480px_280px_at_90%_0%,rgba(255,106,26,.35),transparent_65%),radial-gradient(420px_260px_at_5%_100%,rgba(28,134,214,.30),transparent_60%)]" />
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.12) 1px, transparent 1px)", backgroundSize: "26px 26px", maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, #000 20%, transparent 85%)" }} />
            <div className={`relative z-10 flex gap-8 ${expanded && !submitted ? "flex-col" : "flex-col sm:flex-row sm:items-center sm:justify-between"}`}>
              <div className="min-w-0">
                <h2 className="text-white text-[clamp(22px,2.8vw,30px)] font-bold mb-2 max-w-[480px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Have an R&D problem worth solving?</h2>
                <p className="text-white/65 text-[13.5px] max-w-[420px]">Tell us what you&apos;re stuck on. We&apos;ll reply within two business days to set up a discovery call — no obligation, no sales deck.</p>
              </div>

              {submitted ? (
                <div className="inline-flex items-center gap-2 font-semibold text-[13.5px] px-6 py-3 rounded-[10px] text-white bg-[var(--green)] shrink-0">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Sent — we&apos;ll be in touch
                </div>
              ) : !expanded ? (
                <form onSubmit={handleStart} className="flex flex-col sm:flex-row gap-2.5 shrink-0 w-full sm:w-auto">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="bg-white/8 border border-white/18 rounded-[10px] px-4 py-3 text-[13px] text-white outline-none w-full sm:min-w-[220px] placeholder:text-white/45 focus:border-[var(--blue)] transition-colors"
                  />
                  <button type="submit" className="inline-flex items-center justify-center gap-2 font-semibold text-[13.5px] px-6 py-3 rounded-[10px] text-white bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] shadow-[0_10px_28px_-10px_rgba(255,106,26,.35)] hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-10px_rgba(255,106,26,.35)] transition-all cursor-pointer whitespace-nowrap">
                    Start the conversation
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSend} className="w-full max-w-[560px]">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/85 bg-white/8 border border-white/18 rounded-full pl-1 pr-3 py-1">
                      <span className="w-5 h-5 rounded-full bg-[var(--blue)] text-white flex items-center justify-center text-[9px] font-bold">✓</span>
                      {email}
                    </span>
                    <button type="button" onClick={() => setExpanded(false)} className="text-[11.5px] font-semibold text-white/50 hover:text-white/80 cursor-pointer">change</button>
                  </div>
                  <label htmlFor="rnd-details" className="block text-[11.5px] font-semibold text-white/60 mb-1.5">Add additional details <span className="font-normal text-white/40">(optional)</span></label>
                  <textarea
                    id="rnd-details"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="What are you stuck on? Timeline, domain, what you've already tried…"
                    rows={4}
                    className="w-full bg-white/8 border border-white/18 rounded-[10px] px-4 py-3 text-[13px] text-white outline-none placeholder:text-white/40 focus:border-[var(--blue)] transition-colors resize-none"
                  />
                  {error && <p className="text-[12px] text-[#ff8a8a] mt-2">{error}</p>}
                  <div className="flex justify-end mt-3">
                    <button type="submit" disabled={sending} className="inline-flex items-center justify-center gap-2 font-semibold text-[13.5px] px-6 py-3 rounded-[10px] text-white bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] shadow-[0_10px_28px_-10px_rgba(255,106,26,.35)] hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-10px_rgba(255,106,26,.35)] transition-all cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:hover:translate-y-0">
                      {sending ? "Sending…" : "Start the conversation"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
