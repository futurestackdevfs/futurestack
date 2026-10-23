"use client";

import { useRouter } from "next/navigation";
import { Hero } from "@/app/(student)/components/hero";
import { PopularCourses } from "@/app/(student)/components/popular-courses";
import { CareerPaths } from "@/app/(student)/components/career-paths";
import { HomeSidebar } from "@/app/(student)/components/home-sidebar";
const eyebrowColors: Record<string, string> = {
  "cta-certs": "#7c3aed",
  "cta-proj": "#2563eb",
  "cta-jobs": "#16a34a",
};

const illoGradients: Record<string, string> = {
  "cta-certs": "linear-gradient(135deg,#a855f7,#7c3aed)",
  "cta-proj": "linear-gradient(135deg,#3b82f6,#2563eb)",
  "cta-jobs": "linear-gradient(135deg,#22c55e,#16a34a)",
};

const cardTailwind: Record<string, string> = {
  "cta-certs": "bg-[linear-gradient(135deg,#f5f0ff_0%,#ede9fe_100%)] border-[1.5px] border-[#c4b5fd] before:bg-[radial-gradient(circle,#a855f7,transparent_70%)] dark:bg-[linear-gradient(135deg,#1a1040,#2d1a6e)] dark:border-[rgba(168,85,247,.35)]",
  "cta-proj": "bg-[linear-gradient(135deg,#eff6ff_0%,#dbeafe_100%)] border-[1.5px] border-[#93c5fd] before:bg-[radial-gradient(circle,#2563eb,transparent_70%)] dark:bg-[linear-gradient(135deg,#0d1f3c,#0a3060)] dark:border-[rgba(59,130,246,.35)]",
  "cta-jobs": "bg-[linear-gradient(135deg,#f0fdf4_0%,#dcfce7_100%)] border-[1.5px] border-[#86efac] before:bg-[radial-gradient(circle,#16a34a,transparent_70%)] dark:bg-[linear-gradient(135deg,#0f2a1a,#1a4030)] dark:border-[rgba(34,197,94,.35)]",
};

const btnColors: Record<string, string> = {
  "btn-purple": "bg-[#7c3aed] text-white hover:bg-[#6d28d9]",
  "btn-blue": "bg-[#2563eb] text-white hover:bg-[#1d4ed8]",
  "btn-green": "bg-[#16a34a] text-white hover:bg-[#15803d]",
};

type CtaCardProps = {
  type: "cta-certs" | "cta-proj" | "cta-jobs";
  icon: string;
  eyebrow: string;
  title: string;
  desc: string;
  stats: { num: string; lbl: string }[];
  btnLabel: string;
  btnClass: "btn-purple" | "btn-blue" | "btn-green";
  link: string;
};

const ctaCards: CtaCardProps[] = [
  {
    type: "cta-certs",
    icon: "🏆",
    eyebrow: "✦ Recognized Credentials",
    title: "Earn Industry Certificates",
    desc: "Boost your career with certificates recognized by 400+ hiring partners",
    stats: [{ num: "40+", lbl: "Certs Available" }, { num: "98%", lbl: "Pass Rate" }],
    btnLabel: "Explore Certificates",
    btnClass: "btn-purple",
    link: "/certificates",
  },
  {
    type: "cta-proj",
    icon: "🛠️",
    eyebrow: "✦ Hands-on Learning",
    title: "Build Real Projects",
    desc: "Learn by shipping industry-grade projects for your portfolio",
    stats: [{ num: "50+", lbl: "Live Projects" }, { num: "12", lbl: "Domains" }],
    btnLabel: "View Projects",
    btnClass: "btn-blue",
    link: "/live-projects",
  },
  {
    type: "cta-jobs",
    icon: "💼",
    eyebrow: "✦ Career Support",
    title: "Get Placed Faster",
    desc: "Access exclusive job opportunities & dedicated placement support",
    stats: [{ num: "2K+", lbl: "Hiring Partners" }, { num: "85%", lbl: "Placement Rate" }],
    btnLabel: "View Jobs",
    btnClass: "btn-green",
    link: "/careers",
  },
];

export default function StudentPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col">
        <div className="shell-inner flex flex-col lg:flex-row gap-3 lg:gap-4 p-2 md:p-3 lg:p-3">
        <main className="flex flex-col gap-2.5 flex-[3] min-h-0 pt-1 pb-1">
          <Hero />
          <PopularCourses />
          <div className="hidden md:block"><CareerPaths /></div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 [animation:fadeUp_.5s_.23s_ease_both]">
            {ctaCards.map((card) => (
              <div key={card.type} className={`rounded-2xl p-6 pl-5.5 flex items-start gap-4 overflow-hidden cursor-pointer relative shadow-[0_2px_8px_rgba(0,0,0,.05)] transition-[transform,box-shadow] duration-[250ms] ease-out hover:-translate-y-1.5 hover:shadow-[0_18px_40px_rgba(0,0,0,.16)] before:content-[''] before:absolute before:w-[140px] before:h-[140px] before:rounded-full before:-top-[50px] before:-right-[40px] before:pointer-events-none before:blur-[30px] before:opacity-50 before:transition-opacity before:duration-300 hover:before:opacity-80 after:content-[''] after:absolute after:inset-0 after:pointer-events-none after:bg-[radial-gradient(circle,rgba(255,255,255,.5)_1px,transparent_1px)] after:bg-[length:14px_14px] after:opacity-0 after:[mask-image:linear-gradient(135deg,black,transparent_60%)] after:transition-opacity after:duration-300 hover:after:opacity-50 ${cardTailwind[card.type]} group`}>
                <div
                  className="relative z-10 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl text-[28px] shadow-[0_6px_16px_rgba(0,0,0,.12)] transition-transform duration-[0.3s] group-hover:scale-[1.1] group-hover:-rotate-4"
                  style={{ background: illoGradients[card.type] }}
                >
                  {card.icon}
                </div>
                <div className="relative z-10 flex-1">
                  <div
                    className="mb-1 flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[.08em]"
                    style={{ color: eyebrowColors[card.type] }}
                  >
                    {card.eyebrow}
                  </div>
                  <div className="font-extrabold text-[16px] text-[var(--text)] mb-[5px] tracking-[-.01em]">{card.title}</div>
                  <div className="mb-3.5 flex gap-3.5">
                    {card.stats.map((s) => (
                      <div key={s.lbl} className="flex flex-col">
                        <div className="text-[17px] font-extrabold leading-none text-[var(--text)]">{s.num}</div>
                        <div className="mt-0.5 text-[9px] text-[var(--muted)]">{s.lbl}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => router.push(card.link)} className={`inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-[9px] text-[12px] font-bold border-none shadow-[0_4px_12px_rgba(0,0,0,.15)] hover:opacity-90 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(0,0,0,.22)] ${btnColors[card.btnClass]}`}>
                    {card.btnLabel}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-[13px] transition-transform duration-200 group-hover:translate-x-0.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] shadow-[var(--shadow)] sm:grid-cols-3 lg:grid-cols-6 [animation:fadeUp_.5s_.28s_ease_both]">
            {[
              { ico: "🏅", name: "Industry Recognized", desc: "Certificates" },
              { ico: "🛠️", name: "Hands-on Projects", desc: "Real-world experience" },
              { ico: "👨‍🏫", name: "Expert Instructors", desc: "Learn from the best" },
              { ico: "☁️", name: "Lifetime Access", desc: "Learn at your pace" },
              { ico: "💼", name: "Job Assistance", desc: "Placement Support" },
              { ico: "💰", name: "Money Back", desc: "7-day guarantee" },
            ].map((t) => (
              <div key={t.name} className="flex items-center gap-2 bg-[var(--card)] p-3.5 px-3 hover:bg-[var(--card-hover)]">
                <div className="text-lg">{t.ico}</div>
                <div>
                  <div className="text-[11px] font-semibold text-[var(--text)]">{t.name}</div>
                </div>
              </div>
            ))}
          </div>
        </main>

        <HomeSidebar className="order-last" />
      </div>
    </div>
  );
}
