"use client";

import Link from "next/link";
import useSWR from "swr";
import { useState } from "react";
import { useAuth } from "@/app/auth/hooks/use-auth";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

interface EarnedCert {
  courseId: string;
  courseTitle: string;
  courseCode: string;
  category: string;
  description: string;
  techStack: string[] | null;
  trainerName: string | null;
  credentialId: string;
  score: number | null;
  rank: number;
  totalSections: number;
  totalHours: number;
  issuedAt: string;
}

interface InProgressCert {
  courseId: string;
  courseTitle: string;
  category: string;
  progressPercent: number;
  completedItems: number;
  totalItems: number;
}

interface LockedCert {
  courseId: string;
  courseTitle: string;
  category: string;
  price: number | null;
}

interface CertificatesResponse {
  earned: EarnedCert[];
  inProgress: InProgressCert[];
  locked: LockedCert[];
}

const emojiMap: Record<string, string> = {
  frontend: "🎨",
  "front-end": "🎨",
  "front end": "🎨",
  backend: "⚙️",
  "back-end": "⚙️",
  "back end": "⚙️",
  fullstack: "⚛️",
  "full-stack": "⚛️",
  "full stack": "⚛️",
  programming: "🧠",
  database: "🗄️",
  data: "📊",
  "data science": "📊",
  devops: "🐳",
  mobile: "📱",
  security: "🔒",
  cloud: "☁️",
  ai: "🤖",
  "machine learning": "🤖",
};

const bgGradients = [
  "linear-gradient(135deg,#155724,#1e6b30)",
  "linear-gradient(135deg,#1e3a8a,#1d4ed8)",
  "linear-gradient(135deg,#713f12,#92400e)",
  "linear-gradient(135deg,#040c1a,#0a200e)",
  "linear-gradient(135deg,#0a0a1a,#1a0a1a)",
  "linear-gradient(135deg,#0a0420,#04100a)",
  "linear-gradient(135deg,#5c0e0e,#8b1a1a)",
  "linear-gradient(135deg,#1a0a2e,#3b1a6e)",
];

function getEmoji(category: string): string {
  const key = (category ?? "").toLowerCase().trim();
  return emojiMap[key] || "📜";
}

function getBg(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return bgGradients[Math.abs(hash) % bgGradients.length];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatHours(h: number): string {
  return `${h}h`;
}

function getProgressColor(pct: number): string {
  if (pct >= 80) return "var(--green)";
  if (pct >= 40) return "var(--orange)";
  return "var(--blue2)";
}

function getProgressBg(pct: number): string {
  if (pct >= 80) return "linear-gradient(90deg,var(--green),#22c55e)";
  if (pct >= 40) return "linear-gradient(90deg,var(--orange),var(--orange2))";
  return "linear-gradient(90deg,var(--blue),var(--blue2))";
}

async function downloadCertificatePdf(cert: EarnedCert, studentName: string) {
  await document.fonts.ready;

  const el = document.getElementById("certDoc");
  if (!el) return;

  const saved: { el: HTMLElement; key: string; val: string }[] = [];

  const save = (target: HTMLElement, key: string) => {
    saved.push({ el: target, key, val: (target.style as any)[key] });
    (target.style as any)[key] = "none";
  };

  save(el, "animation");
  save(el, "transform");
  el.querySelectorAll<HTMLElement>("*").forEach(c => {
    save(c, "animation");
    save(c, "transform");
  });

  const restore = () => saved.reverse().forEach(s => { (s.el.style as any)[s.key] = s.val; });

  try {
    const imgData = await toPng(el, {
      quality: 1.0,
      pixelRatio: 2,
      backgroundColor: "#fdfbf6",
    });

    restore();

    const img = new Image();
    img.src = imgData;
    await new Promise<void>((res) => { img.onload = () => res(); });

    const pdfW = 210;
    const pdfH = pdfW * (img.height / img.width);

    const pdf = new jsPDF({
      orientation: pdfW >= pdfH ? "landscape" : "portrait",
      unit: "mm",
      format: [pdfW, pdfH],
    });

    pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
    const filename = `FutureStack_Certificate_${cert.courseTitle.replace(/\s+/g, "-")}_${cert.credentialId}.pdf`;
    pdf.save(filename);
  } catch {
    restore();
  }
}

const staticLocked: LockedCert[] = [
  { courseId: "fs-101", courseTitle: "Full-Stack React & Node.js Mastery", category: "Full Stack", price: 4999 },
  { courseId: "ai-201", courseTitle: "Machine Learning with Python", category: "AI / ML", price: 6499 },
  { courseId: "cloud-301", courseTitle: "AWS Cloud Architecture", category: "Cloud", price: 5499 },
  { courseId: "devops-401", courseTitle: "DevOps with Docker & Kubernetes", category: "DevOps", price: 5999 },
  { courseId: "ds-501", courseTitle: "Data Science & Analytics", category: "Data Science", price: 4499 },
  { courseId: "sec-601", courseTitle: "Cybersecurity Fundamentals", category: "Security", price: 3999 },
];

function StaticCertificates({ studentName }: { studentName: string }) {
  const [activeLockedId, setActiveLockedId] = useState<string | null>(staticLocked[0]?.courseId ?? null);
  const activeLocked = staticLocked.find(c => c.courseId === activeLockedId) ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] flex-1 min-h-0 overflow-hidden">
      {/* ─── LEFT ─── */}
      <div className="border-r border-[var(--border)] overflow-y-auto bg-[var(--surface)] flex flex-col">
        <div className="px-5 py-[18px] border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="font-['Inter_Tight',sans-serif] text-[18px] font-[800] text-[var(--text)] mb-[2px]">My Certificates</div>
          <div className="text-[11.5px] text-[var(--text3)] mb-[14px]">Verified credentials recognised by 400+ hiring partners</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { num: 0, lbl: "Earned", color: "var(--green)" },
              { num: 0, lbl: "In Progress", color: "var(--orange)" },
              { num: staticLocked.length, lbl: "Locked", color: "var(--text)" },
            ].map(s => (
              <div key={s.lbl} className="text-center py-2.5 px-1.5 bg-[var(--bg2)] border border-[var(--border)] rounded-lg">
                <div className="font-['Inter_Tight',sans-serif] text-[22px] font-[800] leading-none" style={{ color: s.color }}>{s.num}</div>
                <div className="font-['JetBrains_Mono',monospace] text-[8px] uppercase tracking-[.07em] text-[var(--text3)] mt-[3px]">{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[var(--text3)] flex items-center gap-2 px-5 pt-2.5 pb-1.5">
          🔒 Locked
          <span className="flex-1 h-[1px] bg-[var(--border)]" />
        </div>

        {staticLocked.map(c => (
          <div
            key={c.courseId}
            onClick={() => setActiveLockedId(c.courseId)}
            className={`flex items-center gap-3 px-5 py-2.5 border-b border-[var(--border)] cursor-pointer transition-colors duration-100 ${activeLockedId === c.courseId ? "bg-[rgba(240,90,26,.05)] border-l-2 border-l-[var(--orange)] opacity-100" : "hover:bg-[var(--card-h)] opacity-[.55]"}`}
          >
            <div className="w-[34px] h-[34px] rounded-[9px] bg-[var(--bg2)] border border-[var(--border)] flex items-center justify-center text-[14px] flex-shrink-0 text-[var(--text3)]">🔒</div>
            <div className="flex-1">
              <div className="text-[12px] font-semibold text-[var(--text3)]">{c.courseTitle}</div>
              <div className="font-['JetBrains_Mono',monospace] text-[8.5px] text-[var(--text3)] mt-[2px]">{c.category}{c.price != null ? ` · ₹${c.price.toLocaleString("en-IN")}` : ""}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── RIGHT ─── */}
      <div className="bg-[var(--bg)] flex flex-col items-center gap-5 py-8 px-7 overflow-y-auto">
        {activeLocked ? (
          <div className="w-full max-w-[600px] bg-[#fdfbf6] rounded-lg shadow-[0_8px_32px_rgba(0,0,0,.14),0_2px_8px_rgba(0,0,0,.08)] overflow-hidden relative [animation:fadeUp_.35s_ease_both] grayscale-[.4]">
            <div className="absolute inset-0 pointer-events-none z-0 opacity-[.5]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px,rgba(201,168,76,.15) 1px,transparent 0)", backgroundSize: "14px 14px" }} />
            <div className="absolute right-[-30px] bottom-[-40px] w-[240px] h-[240px] opacity-[.05] pointer-events-none z-0 flex items-center justify-center font-['Inter_Tight',sans-serif] font-[800] text-[160px] text-[#0d1f3c] rotate-[-8deg]">FS</div>
            <div className="m-[9px] border border-[#c9a84c] rounded-[6px] relative z-[1]">
              <div className="m-[7px] border-[2.5px] border-[#c9a84c] rounded-[4px] px-9 py-[30px] pb-[26px] relative bg-transparent">
                <div className="absolute top-[-2.5px] left-[-2.5px] w-[22px] h-[22px] border-t-[2.5px] border-l-[2.5px] border-[#8b6914] rounded-tl-[4px] z-[2]" />
                <div className="absolute top-[-2.5px] right-[-2.5px] w-[22px] h-[22px] border-t-[2.5px] border-r-[2.5px] border-[#8b6914] rounded-tr-[4px] z-[2]" />
                <div className="absolute bottom-[-2.5px] left-[-2.5px] w-[22px] h-[22px] border-b-[2.5px] border-l-[2.5px] border-[#8b6914] rounded-bl-[4px] z-[2]" />
                <div className="absolute bottom-[-2.5px] right-[-2.5px] w-[22px] h-[22px] border-b-[2.5px] border-r-[2.5px] border-[#8b6914] rounded-br-[4px] z-[2]" />



                <div className="text-center border-b border-[#e8d99a] pb-4 mb-[18px] relative z-[1]">
                  <div className="font-['Inter_Tight',sans-serif] text-[10px] font-[800] uppercase tracking-[.24em] text-[#8b6914] mb-[6px]">FutureStack Academy</div>
                  <div className="font-['Instrument_Serif',Georgia,serif] text-[19px] italic text-[#5a4008] leading-[1.3]">Certificate of Completion</div>
                </div>

                <div className="relative w-[64px] h-[80px] mx-auto mb-4 z-[1]">
                  <div className="w-[64px] h-[64px] rounded-full bg-[linear-gradient(135deg,#c9a84c,#e8c96a,#c9a84c)] flex items-center justify-center text-[28px] shadow-[0_3px_14px_rgba(201,168,76,.45),inset_0_0_0_3px_rgba(255,255,255,.35)] relative z-[2]">
                    {getEmoji(activeLocked.category)}
                  </div>
                </div>

                <div className="text-[10.5px] text-[#8b7340] text-center tracking-[.08em] uppercase mb-2 relative z-[1] whitespace-nowrap">This certifies that</div>
                <div className="font-['Instrument_Serif',Georgia,serif] text-[32px] italic text-[#1a1208] text-center leading-[1.15] mb-[14px] pb-2.5 border-b border-dashed border-[#d4b96a] relative z-[1] whitespace-nowrap overflow-hidden text-ellipsis px-4">{studentName}</div>

                <div className="text-[10px] text-[#8b7340] text-center tracking-[.1em] uppercase mb-[5px] relative z-[1] whitespace-nowrap">has successfully completed</div>
                <div className="font-['Inter_Tight',sans-serif] text-[16px] font-[800] text-[#0d1f3c] text-center mb-3 leading-[1.3] relative z-[1] px-4">{activeLocked.courseTitle}</div>

                <div className="text-[11px] text-[#5a4a30] text-center leading-[1.65] max-w-[400px] mx-auto mb-[18px] relative z-[1]">Master {activeLocked.category} skills through hands-on projects and real-world scenarios to earn this credential.</div>

                <div className="flex justify-between items-end border-t border-[#e8d99a] pt-4 relative z-[1] w-full">
                  <div className="text-center w-[32%]">
                    <div className="font-['Instrument_Serif',Georgia,serif] italic text-[15px] text-[#1a1208] border-b border-[#c9a84c] pb-[5px] mb-[4px] whitespace-nowrap overflow-hidden text-ellipsis">FutureStack Faculty</div>
                    <div className="text-[8.5px] uppercase tracking-[.08em] text-[#8b7340] whitespace-nowrap">Course Instructor</div>
                  </div>
                  <div className="text-center flex flex-col items-center justify-end w-[32%]">
                    <img src="/images/logo.png" alt="FutureStack" className="h-[26px] w-auto object-contain" />
                  </div>
                  <div className="text-center w-[32%]">
                    <div className="font-['Inter',sans-serif] text-[7.5px] text-[#b09040] mb-[2px] whitespace-nowrap">ID: {activeLocked.courseId}••••</div>
                    <div className="font-['Inter',sans-serif] text-[8px] text-[#8b6914] font-semibold whitespace-nowrap">Not yet issued</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute top-[14px] right-[-2px] z-[3] bg-[linear-gradient(135deg,#6b7280,#9ca3af)] text-white font-['Inter',sans-serif] text-[8.5px] font-bold py-[4px] pl-[10px] pr-3 shadow-[0_2px_8px_rgba(107,114,128,.35)] flex items-center gap-1" style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 8px 100%, 0 50%)" }}>
              🔒 Locked
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-[14px] px-6 py-10 text-center">
            <div className="w-[72px] h-[72px] rounded-full bg-[var(--bg2)] border-2 border-[var(--border)] flex items-center justify-center text-[32px] text-[var(--text3)] shadow-[inset_0_2px_8px_rgba(0,0,0,.06)]">🔒</div>
            <div className="font-['Inter_Tight',sans-serif] text-[17px] font-[800] text-[var(--text)]">Select a course</div>
            <div className="text-[12px] text-[var(--text3)] max-w-[320px] leading-[1.7]">Pick a course from the left panel to preview its locked certificate.</div>
          </div>
        )}
        {activeLocked && (
          <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-[580px]">
            <Link href={`/courses`} className="flex-1 py-2.5 rounded-lg text-[12.5px] font-bold flex items-center justify-center gap-[7px] transition-all duration-[0.18s] bg-[var(--orange)] text-white shadow-[0_3px_12px_rgba(240,90,26,.3)] border-none hover:bg-[var(--orange2)] hover:-translate-y-[1px] no-underline">
              Enroll Now →
            </Link>
            <Link href={`/courses`} className="flex-1 py-2.5 rounded-lg text-[12.5px] font-bold flex items-center justify-center gap-[7px] transition-all duration-[0.18s] bg-transparent text-[var(--text2)] border-[1.5px] border-[var(--border2)] hover:border-[var(--blue)] hover:text-[var(--blue)] no-underline">
              View All Courses
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CertificatesSection({ embedded, enrolledCount }: { embedded?: boolean; enrolledCount?: number }) {
  const { user } = useAuth();
  const skipApi = !enrolledCount || enrolledCount === 0;
  const { data, isLoading, error } = useSWR<CertificatesResponse>(skipApi ? null : "/api/certificates/my");
  const [activeId, setActiveId] = useState<string | null>(null);

  const earned = data?.earned ?? [];
  const inProgress = data?.inProgress ?? [];
  const locked = data?.locked ?? [];

  const activeEarned = earned.find(c => c.courseId === activeId) ?? null;
  const activeInProgress = inProgress.find(c => c.courseId === activeId) ?? null;

  const activeItem = activeEarned ?? activeInProgress;
  const isEarned = !!activeEarned;

  const studentName = user?.name ?? "Student";

  const summaryStats = [
    { num: earned.length, lbl: "Earned", color: "var(--green)" },
    { num: inProgress.length, lbl: "In Progress", color: "var(--orange)" },
    { num: locked.length, lbl: "Locked", color: "var(--text)" },
  ];

  const content = (
    <div className="flex flex-col flex-1 bg-[var(--bg)]">
      {/* breadcrumb */}
      <div className="flex items-center gap-[5px] px-[18px] py-2 bg-[var(--surface)] border-b border-[var(--border)] font-['JetBrains_Mono',monospace] text-[10px] text-[var(--text3)] flex-shrink-0">
        <span>futurestack</span>
        <span className="text-[var(--border2)]">/</span>
        <span className="text-[var(--text2)]">{studentName.toLowerCase().replace(/\s+/g, ".")}</span>
        <span className="text-[var(--border2)]">/</span>
        <span className="text-[var(--orange)]">certificates</span>
        <span className="ml-auto flex items-center gap-[6px]">
          {!isLoading && (
            <>
              <span className="text-[var(--green)] text-[10px]">●</span>
              <span>{earned.length} earned · {inProgress.length} in progress · {locked.length} locked</span>
            </>
          )}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[var(--orange)] border-t-transparent rounded-full animate-spin" />
            <div className="font-['JetBrains_Mono',monospace] text-[11px] text-[var(--text3)]">Loading certificates…</div>
          </div>
        </div>
      ) : error || skipApi ? (
        <StaticCertificates studentName={studentName} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] flex-1 min-h-0 overflow-hidden">
          {/* ─── LEFT ─── */}
          <div className="border-r border-[var(--border)] overflow-y-auto bg-[var(--surface)] flex flex-col">
            <div className="px-5 py-[18px] border-b border-[var(--border)] bg-[var(--surface)]">
              <div className="font-['Inter_Tight',sans-serif] text-[18px] font-[800] text-[var(--text)] mb-[2px]">My Certificates</div>
              <div className="text-[11.5px] text-[var(--text3)] mb-[14px]">Verified credentials recognised by 400+ hiring partners</div>
              <div className="grid grid-cols-3 gap-2">
                {summaryStats.map(s => (
                  <div key={s.lbl} className="text-center py-2.5 px-1.5 bg-[var(--bg2)] border border-[var(--border)] rounded-lg">
                    <div className="font-['Inter_Tight',sans-serif] text-[22px] font-[800] leading-none" style={{ color: s.color }}>{s.num}</div>
                    <div className="font-['JetBrains_Mono',monospace] text-[8px] uppercase tracking-[.07em] text-[var(--text3)] mt-[3px]">{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-[7px] px-5 py-3 border-b border-[var(--border)] bg-[var(--bg2)]">
              <button className="flex-1 py-[7px] px-2.5 rounded-[7px] text-[11.5px] font-semibold flex items-center justify-center gap-1.5 transition-all duration-[0.15s] bg-[linear-gradient(135deg,#0a66c2,#1a8cff)] text-white border-none hover:opacity-[.88] hover:-translate-y-[1px]">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" /><circle cx="4" cy="4" r="2" /></svg>
                Share on LinkedIn
              </button>
              <button className="flex-1 py-[7px] px-2.5 rounded-[7px] text-[11.5px] font-semibold flex items-center justify-center gap-1.5 transition-all duration-[0.15s] bg-transparent text-[var(--text2)] border border-[var(--border2)] hover:border-[var(--blue)] hover:text-[var(--blue)]">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Download All
              </button>
            </div>

            {earned.length > 0 && (
              <>
                <div className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[var(--text3)] flex items-center gap-2 px-5 pt-2.5 pb-1.5">
                  ✦ Earned
                  <span className="flex-1 h-[1px] bg-[var(--border)]" />
                </div>
                {earned.map(c => (
                  <div
                    key={c.courseId}
                    onClick={() => setActiveId(c.courseId)}
                    className={`flex items-center gap-3 px-5 py-3 border-b border-[var(--border)] cursor-pointer transition-colors duration-100 relative ${activeId === c.courseId ? "bg-[rgba(240,90,26,.05)] border-l-2 border-l-[var(--orange)]" : "hover:bg-[var(--card-h)]"}`}
                  >
                    <div className="w-[38px] h-[38px] rounded-[10px] flex-shrink-0 flex items-center justify-center text-[20px] shadow-[0_2px_8px_rgba(0,0,0,.15)]" style={{ background: getBg(c.courseId) }}>{getEmoji(c.category)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-['JetBrains_Mono',monospace] text-[8.5px] text-[var(--text3)] uppercase tracking-[.05em] mb-[2px]">{c.category}</div>
                      <div className={`text-[12.5px] font-bold text-[var(--text)] truncate ${activeId === c.courseId ? "text-[var(--orange)]" : ""}`}>{c.courseTitle}</div>
                      <div className="flex items-center gap-2 mt-[3px]">
                        <span className="font-['JetBrains_Mono',monospace] text-[9px] text-[var(--text3)]">📅 {formatDate(c.issuedAt)}</span>
                        {c.score !== null && <span className="font-['JetBrains_Mono',monospace] text-[9px] text-[var(--text3)]">Score: {c.score}%</span>}
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadCertificatePdf(c, studentName); }}
                        className="w-[26px] h-[26px] rounded-[6px] flex items-center justify-center bg-transparent border border-[var(--border)] text-[var(--text3)] cursor-pointer hover:bg-[var(--orange-d)] hover:border-[var(--orange)] hover:text-[var(--orange)] transition-all"
                        title="Download PDF"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                      </button>
                      <span className="font-['JetBrains_Mono',monospace] text-[8px] font-bold px-2 py-[2px] rounded-[20px] tracking-[.04em] uppercase bg-[var(--green-d)] text-[var(--green)] border border-[rgba(22,163,74,.2)]">✓ Earned</span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {inProgress.length > 0 && (
              <>
                <div className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[var(--text3)] flex items-center gap-2 px-5 pt-2.5 pb-1.5">
                  ⏳ In Progress
                  <span className="flex-1 h-[1px] bg-[var(--border)]" />
                </div>
                {inProgress.map(c => (
                  <div
                    key={c.courseId}
                    onClick={() => setActiveId(c.courseId)}
                    className={`px-5 py-3 border-b border-[var(--border)] cursor-pointer ${activeId === c.courseId ? "bg-[rgba(240,90,26,.05)] border-l-2 border-l-[var(--orange)]" : "hover:bg-[var(--card-h)]"}`}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-[34px] h-[34px] rounded-[9px] flex-shrink-0 flex items-center justify-center text-[17px]" style={{ background: getBg(c.courseId) }}>{getEmoji(c.category)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-['JetBrains_Mono',monospace] text-[8.5px] text-[var(--text3)] uppercase tracking-[.05em]">{c.category}</div>
                        <div className="text-[12px] font-bold text-[var(--text)]">{c.courseTitle}</div>
                      </div>
                      <div className="font-['Inter_Tight',sans-serif] text-[13px] font-[800] flex-shrink-0" style={{ color: getProgressColor(c.progressPercent) }}>{c.progressPercent}%</div>
                    </div>
                    <div className="h-[4px] bg-[var(--border)] rounded-[99px] overflow-hidden mb-[4px]">
                      <div className="h-full rounded-[99px] transition-[width] duration-[0.8s]" style={{ width: `${c.progressPercent}%`, background: getProgressBg(c.progressPercent) }} />
                    </div>
                    <div className="text-[10px] text-[var(--text3)] mt-[6px]">{c.completedItems} of {c.totalItems} items completed</div>
                    {c.progressPercent < 100 && (
                      <div className="flex items-center gap-1 mt-[6px] text-[9px] text-[var(--orange)] font-semibold">
                        <span>🔒</span>
                        <span>Complete 100% to earn certificate</span>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {locked.length > 0 && (
              <>
                <div className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[var(--text3)] flex items-center gap-2 px-5 pt-2.5 pb-1.5">
                  🔒 Locked
                  <span className="flex-1 h-[1px] bg-[var(--border)]" />
                </div>
                {locked.slice(0, 3).map(c => (
                  <div key={c.courseId} className="flex items-center gap-3 px-5 py-2.5 border-b border-[var(--border)] opacity-[.55]">
                    <div className="w-[34px] h-[34px] rounded-[9px] bg-[var(--bg2)] border border-[var(--border)] flex items-center justify-center text-[14px] flex-shrink-0 text-[var(--text3)]">🔒</div>
                    <div className="flex-1">
                      <div className="text-[12px] font-semibold text-[var(--text3)]">{c.courseTitle}</div>
                      <div className="font-['JetBrains_Mono',monospace] text-[8.5px] text-[var(--text3)] mt-[2px]">{c.category}{c.price != null ? ` · ₹${c.price.toLocaleString("en-IN")}` : ""}</div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {earned.length === 0 && inProgress.length === 0 && locked.length === 0 && (
              <div className="flex flex-col items-center justify-center flex-1 px-6 py-10 text-center">
                <div className="text-[48px] mb-3">🎓</div>
                <div className="font-['Inter_Tight',sans-serif] text-[16px] font-bold text-[var(--text)] mb-[4px]">No certificates yet</div>
                <div className="text-[12px] text-[var(--text3)] max-w-[260px] leading-[1.6]">Enroll in a course and complete all modules to earn your first certificate.</div>
              </div>
            )}
          </div>

          {/* ─── RIGHT ─── */}
          <div className="bg-[var(--bg)] flex flex-col items-center gap-5 py-8 px-7 overflow-y-auto">
            {activeEarned ? (
              <>
                <div id="certDoc" className="w-full max-w-[600px] bg-[#fdfbf6] rounded-lg shadow-[0_8px_32px_rgba(0,0,0,.14),0_2px_8px_rgba(0,0,0,.08)] overflow-hidden relative [animation:fadeUp_.35s_ease_both]">
                  <div className="absolute inset-0 pointer-events-none z-0 opacity-[.5]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px,rgba(201,168,76,.15) 1px,transparent 0)", backgroundSize: "14px 14px" }} />
                  <div className="absolute right-[-30px] bottom-[-40px] w-[240px] h-[240px] opacity-[.05] pointer-events-none z-0 flex items-center justify-center font-['Inter_Tight',sans-serif] font-[800] text-[160px] text-[#0d1f3c] rotate-[-8deg]">FS</div>
                  <div className="m-[9px] border border-[#c9a84c] rounded-[6px] relative z-[1]">
                    <div className="m-[7px] border-[2.5px] border-[#c9a84c] rounded-[4px] px-9 py-[30px] pb-[26px] relative bg-transparent">
                      <div className="absolute top-[-2.5px] left-[-2.5px] w-[22px] h-[22px] border-t-[2.5px] border-l-[2.5px] border-[#8b6914] rounded-tl-[4px] z-[2]" />
                      <div className="absolute top-[-2.5px] right-[-2.5px] w-[22px] h-[22px] border-t-[2.5px] border-r-[2.5px] border-[#8b6914] rounded-tr-[4px] z-[2]" />
                      <div className="absolute bottom-[-2.5px] left-[-2.5px] w-[22px] h-[22px] border-b-[2.5px] border-l-[2.5px] border-[#8b6914] rounded-bl-[4px] z-[2]" />
                      <div className="absolute bottom-[-2.5px] right-[-2.5px] w-[22px] h-[22px] border-b-[2.5px] border-r-[2.5px] border-[#8b6914] rounded-br-[4px] z-[2]" />

                      <div className="flex items-center justify-center gap-[9px] mb-[14px] relative z-[1]">
                        <img src="/images/logo.png" alt="FutureStack" className="h-[34px] w-auto object-contain flex-shrink-0" style={{ mixBlendMode: 'multiply' }} />
                      </div>                      <div className="text-center border-b border-[#e8d99a] pb-4 mb-[18px] relative z-[1]">
                        <div className="font-['Inter_Tight',sans-serif] text-[10px] font-[800] uppercase tracking-[.24em] text-[#8b6914] mb-[6px]">FutureStack Academy</div>
                        <div className="font-['Instrument_Serif',Georgia,serif] text-[19px] italic text-[#5a4008] leading-[1.3]">Certificate of Completion</div>
                      </div>

                      <div className="relative w-[64px] h-[80px] mx-auto mb-4 z-[1]">
                        <div className="w-[64px] h-[64px] rounded-full bg-[linear-gradient(135deg,#c9a84c,#e8c96a,#c9a84c)] flex items-center justify-center text-[28px] shadow-[0_3px_14px_rgba(201,168,76,.45),inset_0_0_0_3px_rgba(255,255,255,.35)] animate-[float_3s_ease_infinite] relative z-[2]">
                          {getEmoji(activeEarned.category)}
                        </div>
                      </div>

                      <div className="text-[10.5px] text-[#8b7340] text-center tracking-[.08em] uppercase mb-2 relative z-[1] whitespace-nowrap">This certifies that</div>
                      <div className="font-['Instrument_Serif',Georgia,serif] text-[32px] italic text-[#1a1208] text-center leading-[1.15] mb-[14px] pb-2.5 border-b border-dashed border-[#d4b96a] relative z-[1] whitespace-nowrap overflow-hidden text-ellipsis px-4">{studentName}</div>

                      <div className="text-[10px] text-[#8b7340] text-center tracking-[.1em] uppercase mb-[5px] relative z-[1] whitespace-nowrap">has successfully completed</div>
                      <div className="font-['Inter_Tight',sans-serif] text-[16px] font-[800] text-[#0d1f3c] text-center mb-3 leading-[1.3] relative z-[1] px-4">{activeEarned.courseTitle}</div>

                      <div className="text-[11px] text-[#5a4a30] text-center leading-[1.65] max-w-[400px] mx-auto mb-[18px] relative z-[1]">{activeEarned.description}</div>

                      {activeEarned.techStack && activeEarned.techStack.length > 0 && (
                        <div className="flex justify-center gap-[7px] flex-wrap mb-5 relative z-[1]">
                          {activeEarned.techStack.map(s => (
                            <span key={s} className="font-['Inter',sans-serif] text-[9px] font-semibold px-3 py-[4px] rounded-[20px] border border-[#c9a84c] text-[#8b6914] bg-[rgba(201,168,76,.09)]">{s}</span>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-between items-end border-t border-[#e8d99a] pt-4 relative z-[1] w-full">
                        <div className="text-center w-[32%]">
                          <div className="font-['Instrument_Serif',Georgia,serif] italic text-[15px] text-[#1a1208] border-b border-[#c9a84c] pb-[5px] mb-[4px] whitespace-nowrap overflow-hidden text-ellipsis">{activeEarned.trainerName ?? "FutureStack Faculty"}</div>
                          <div className="text-[8.5px] uppercase tracking-[.08em] text-[#8b7340] whitespace-nowrap">Course Instructor</div>
                        </div>
                        <div className="text-center flex flex-col items-center justify-end w-[32%]">
                          <img src="/images/logo.png" alt="FutureStack" className="h-[26px] w-auto object-contain" />
                        </div>
                        <div className="text-center w-[32%]">
                          <div className="font-['Inter',sans-serif] text-[7.5px] text-[#b09040] mb-[2px] whitespace-nowrap">ID: {activeEarned.credentialId}</div>
                          <div className="font-['Inter',sans-serif] text-[8px] text-[#8b6914] font-semibold whitespace-nowrap">{formatDate(activeEarned.issuedAt)}</div>
                          {activeEarned.score !== null && (
                            <div className="inline-block bg-[linear-gradient(135deg,#c9a84c,#e8c96a)] text-[#5a3a00] font-['Inter',sans-serif] text-[8px] font-bold px-[11px] py-[3px] rounded-[20px] mt-[6px] shadow-[0_2px_6px_rgba(201,168,76,.3)] whitespace-nowrap">Score: {activeEarned.score}%</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-[14px] right-[-2px] z-[3] bg-[linear-gradient(135deg,#16a34a,#22c55e)] text-white font-['Inter',sans-serif] text-[8.5px] font-bold py-[4px] pl-[10px] pr-3 shadow-[0_2px_8px_rgba(22,163,74,.35)] flex items-center gap-1" style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 8px 100%, 0 50%)" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>Verified
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-[580px]">
                  <button
                    onClick={() => downloadCertificatePdf(activeEarned, studentName)}
                    className="flex-1 py-2.5 rounded-lg text-[12.5px] font-bold flex items-center justify-center gap-[7px] transition-all duration-[0.18s] bg-[var(--orange)] text-white shadow-[0_3px_12px_rgba(240,90,26,.3)] border-none hover:bg-[var(--orange2)] hover:-translate-y-[1px] cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    Download PDF
                  </button>
                  <button className="flex-1 py-2.5 rounded-lg text-[12.5px] font-bold flex items-center justify-center gap-[7px] transition-all duration-[0.18s] bg-[linear-gradient(135deg,#0a66c2,#1a8cff)] text-white shadow-[0_3px_12px_rgba(10,102,194,.3)] border-none hover:opacity-[.88] hover:-translate-y-[1px]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" /><circle cx="4" cy="4" r="2" /></svg>
                    Add to LinkedIn
                  </button>
                  <button className="flex-1 py-2.5 rounded-lg text-[12.5px] font-bold flex items-center justify-center gap-[7px] transition-all duration-[0.18s] bg-transparent text-[var(--text2)] border-[1.5px] border-[var(--border2)] hover:border-[var(--blue)] hover:text-[var(--blue)]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
                    Copy Link
                  </button>
                </div>

                <div className="w-full max-w-[580px] bg-[var(--surface)] border border-[var(--border)] rounded-[10px] px-[18px] py-[14px] grid grid-cols-2 sm:grid-cols-4">
                  {[
                    { val: activeEarned.score !== null ? `${activeEarned.score}%` : "—", lbl: "Final Score", color: activeEarned.score !== null ? "var(--green)" : "var(--text3)" },
                    { val: String(activeEarned.totalSections), lbl: "Modules" },
                    { val: formatHours(activeEarned.totalHours), lbl: "Study Time" },
                    { val: `#${activeEarned.rank}`, lbl: "Class Rank" },
                  ].map((s, i) => (
                    <div key={s.lbl} className={`text-center px-2 ${i < 3 ? "border-r border-[var(--border)]" : ""}`}>
                      <div className="font-['Inter_Tight',sans-serif] text-[20px] font-[800] leading-none mb-[3px]" style={{ color: s.color ?? "var(--text)" }}>{s.val}</div>
                      <div className="font-['JetBrains_Mono',monospace] text-[8.5px] uppercase tracking-[.07em] text-[var(--text3)]">{s.lbl}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : activeInProgress ? (
              <div className="w-full max-w-[480px] flex flex-col gap-4">
                <div className="text-center py-2.5">
                  <div className="text-[52px] mb-2">⏳</div>
                  <div className="font-['Inter_Tight',sans-serif] text-[17px] font-[800] text-[var(--text)] mb-[4px]">{activeInProgress.courseTitle}</div>
                  <div className="text-[11.5px] text-[var(--text3)]">Complete the course to earn your verified certificate</div>
                </div>
                <div className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-[22px] py-5">
                  <div className="flex justify-between items-baseline mb-[14px]">
                    <span className="font-['Inter_Tight',sans-serif] text-[14px] font-bold text-[var(--text)]">Overall Progress</span>
                    <span className="font-['Inter_Tight',sans-serif] text-[22px] font-[800]" style={{ color: getProgressColor(activeInProgress.progressPercent) }}>{activeInProgress.progressPercent}%</span>
                  </div>
                  <div className="h-2 bg-[var(--border)] rounded-[99px] overflow-hidden mb-3">
                    <div className="h-full rounded-[99px] transition-[width] duration-[0.8s]" style={{ width: `${activeInProgress.progressPercent}%`, background: getProgressBg(activeInProgress.progressPercent) }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: String(activeInProgress.completedItems), lbl: "Items Done" },
                      { val: String(activeInProgress.totalItems - activeInProgress.completedItems), lbl: "Remaining" },
                      { val: `${Math.round(activeInProgress.progressPercent / 20 * 7)} days`, lbl: "Est. Time Left" },
                    ].map(s => (
                      <div key={s.lbl} className="text-center py-2 bg-[var(--bg2)] rounded-[7px]">
                        <div className="font-['Inter_Tight',sans-serif] text-[15px] font-[800] text-[var(--text)] leading-none">{s.val}</div>
                        <div className="font-['JetBrains_Mono',monospace] text-[8px] text-[var(--text3)] mt-[2px] uppercase tracking-[.06em]">{s.lbl}</div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-[14px] py-2.5 rounded-lg bg-[var(--orange)] text-white text-[12.5px] font-bold shadow-[0_3px_12px_rgba(240,90,26,.3)] hover:bg-[var(--orange2)] hover:-translate-y-[1px] transition-all duration-[0.18s]">▶ Continue Learning →</button>
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] px-[18px] py-4">
                  <div className="font-['JetBrains_Mono',monospace] text-[9px] uppercase tracking-[.1em] text-[var(--text3)] mb-2.5">What you&apos;ll earn</div>
                  {[
                    { ico: "🏅", title: "Verified Digital Certificate", sub: "Shareable on LinkedIn · Unique credential ID" },
                    { ico: "🌐", title: "Industry Recognition", sub: "Recognised by 400+ hiring partners across India" },
                    { ico: "⚡", title: "+500 XP Bonus", sub: "Jump one level on completion" },
                  ].map(item => (
                    <div key={item.title} className="flex items-start gap-2.5 mb-2 last:mb-0">
                      <span className="text-[16px] flex-shrink-0">{item.ico}</span>
                      <div>
                        <div className="text-[12px] font-semibold text-[var(--text)] mb-[1px]">{item.title}</div>
                        <div className="text-[11px] text-[var(--text3)]">{item.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 gap-[14px] px-6 py-10 text-center">
                <div className="text-[48px] opacity-[.5]">🔍</div>
                <div className="font-['Inter_Tight',sans-serif] text-[16px] font-bold text-[var(--text)]">Select a certificate</div>
                <div className="text-[12px] text-[var(--text3)] max-w-[280px] leading-[1.6]">Choose an earned certificate or an in-progress course from the left panel to view details.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return embedded ? content : (
    <div className="bg-[var(--bg)] flex flex-col flex-1 min-h-0 overflow-y-auto">
      {content}
    </div>
  );
}
