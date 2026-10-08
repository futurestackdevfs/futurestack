"use client";

import useSWR from "swr";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/auth/hooks/use-auth";
import { showToast } from "@/lib/toast";

export interface EarnedCert {
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

export interface InProgressCert {
  courseId: string;
  courseTitle: string;
  category: string;
  progressPercent: number;
  completedItems: number;
  totalItems: number;
}

export interface LockedCert {
  courseId: string;
  courseTitle: string;
  category: string;
  price: number | null;
}

export interface CertificatesResponse {
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

export function getEmoji(category: string): string {
  const key = (category ?? "").toLowerCase().trim();
  return emojiMap[key] || "📜";
}

export function getBg(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return bgGradients[Math.abs(hash) % bgGradients.length];
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatHours(h: number): string {
  return `${h}h`;
}

export function getProgressColor(pct: number): string {
  if (pct >= 80) return "var(--green)";
  if (pct >= 40) return "var(--orange)";
  return "var(--blue2)";
}

export function getProgressBg(pct: number): string {
  if (pct >= 80) return "linear-gradient(90deg,var(--green),#22c55e)";
  if (pct >= 40) return "linear-gradient(90deg,var(--orange),var(--orange2))";
  return "linear-gradient(90deg,var(--blue),var(--blue2))";
}

export async function downloadCertificatePdf(cert: EarnedCert, _studentName: string) {
  // Lazy-load PDF/image libs (~600KB combined) only on actual download.
  const [{ toPng }, { jsPDF }] = await Promise.all([
    import("html-to-image"),
    import("jspdf"),
  ]);

  await document.fonts.ready;
  // The certificate leans on Fraunces (name/headings) and Manrope (labels) —
  // force them to parse before rasterising, else the PNG (and the resulting PDF)
  // silently falls back to a system serif/sans.
  try {
    await Promise.all([
      document.fonts.load("600 44px 'Fraunces'"),
      document.fonts.load("italic 500 27px 'Fraunces'"),
      document.fonts.load("700 11px 'Manrope'"),
      document.fonts.load("600 13px 'Manrope'"),
    ]);
  } catch {
    /* non-fatal — continue with whatever is loaded */
  }

  const el = document.getElementById("certDoc");
  if (!el) throw new Error("Certificate isn’t ready yet — try again in a moment.");

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
      backgroundColor: "#FBF9F3",
      // html-to-image otherwise walks every stylesheet to inline @font-face
      // rules and throws a SecurityError on the cross-origin Google Fonts sheet
      // ("Cannot access rules"). We've already forced Fraunces/Manrope to load
      // via document.fonts.load above, so the browser renders the cloned node
      // with those faces from its own cache — skip the CSS embed entirely.
      skipFonts: true,
    });

    restore();

    const img = new Image();
    img.src = imgData;
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Failed to render the certificate image."));
    });

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
  } catch (err) {
    restore();
    throw err instanceof Error ? err : new Error("Couldn’t generate the certificate PDF.");
  }
}

export default function CertificatesSection({ embedded, enrolledCount, compactLocked }: { embedded?: boolean; enrolledCount?: number; compactLocked?: boolean }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  // `useAuth`'s state is a module-level singleton that persists for the whole
  // SPA session. SSR always renders assuming auth hasn't resolved yet (the
  // server can't see localStorage/cookies), but if the client's auth already
  // resolved on an earlier page, a fresh mount of this component (e.g. this
  // route's own server-rendered segment gets hydrated on navigation) would
  // otherwise read the already-resolved value on its very first render and
  // disagree with the SSR HTML. `mounted` forces the first client render to
  // match the SSR-safe "still resolving" assumption — see the same pattern in
  // components/layout/marketing-top-nav.tsx.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  // Only skip the fetch when embedded in the dashboard overview and we already
  // know (via enrolledCount) the student has nothing to show — avoids a wasted
  // call there. Either way, never fire the request before auth has resolved to
  // a logged-in user — an unauthenticated call would just 401.
  const skipApi = !mounted || !isAuthenticated || (embedded && (!enrolledCount || enrolledCount === 0));
  const { data, error: fetchError, isLoading: dataLoading, mutate } = useSWR<CertificatesResponse>(skipApi ? null : "/api/certificates/my");
  const isLoading = !mounted || authLoading || dataLoading;

  const earned = data?.earned ?? [];
  const inProgress = data?.inProgress ?? [];
  const locked = data?.locked ?? [];

  const [activeId, setActiveId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const selectedId = activeId ?? (earned[0]?.courseId ?? inProgress[0]?.courseId ?? locked[0]?.courseId ?? null);
  const activeEarned = earned.find((c) => c.courseId === selectedId) ?? null;
  const activeInProgress = inProgress.find((c) => c.courseId === selectedId) ?? null;

  // Same singleton-race as `isLoading`/`skipApi` above — `user` itself must be
  // gated on `mounted` too, or the very first client render can already show
  // the real name (from an already-resolved earlier page) while the SSR HTML
  // always rendered the "Student" fallback.
  const studentName = mounted && user?.name ? user.name : "Student";

  const runDownload = useCallback(async (cert: EarnedCert) => {
    setDownloadingId((cur) => cur ?? cert.courseId);
    try {
      await downloadCertificatePdf(cert, studentName);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't generate the certificate PDF.");
    } finally {
      setDownloadingId(null);
    }
  }, [studentName]);

  const requestDownload = useCallback((cert: EarnedCert) => {
    if (downloadingId) return;
    if (selectedId === cert.courseId) {
      void runDownload(cert);
    } else {
      setActiveId(cert.courseId);
    }
  }, [selectedId, downloadingId, runDownload]);

  const summaryStats = [
    { num: earned.length, lbl: "Earned", color: "var(--green)" },
    { num: inProgress.length, lbl: "In Progress", color: "var(--orange)" },
    { num: locked.length, lbl: "Locked", color: "var(--text)" },
  ];

  const content = (
    <div className="w-full">
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--orange)", borderTopColor: "transparent" }} />
              <div className="font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading certificates…</div>
            </div>
          </div>
        ) : fetchError ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3 text-center px-6">
              <div className="text-[32px]">⚠️</div>
              <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Couldn't load your certificates</div>
              <div className="text-[11.5px] max-w-[320px]" style={{ color: "var(--text3)" }}>Something went wrong talking to the server. This isn't the same as having none — try again.</div>
              <button onClick={() => mutate()} className="mt-1 font-mono text-[11px] font-semibold px-3 py-1.5 rounded cursor-pointer" style={{ background: "var(--orange)", color: "#fff" }}>
                ↻ Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]" style={{ minHeight: "70vh" }}>
            {/* ─── LEFT ─── */}
            <div className="border-r overflow-y-auto flex flex-col" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="px-5 py-[18px] border-b" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <div className="text-[18px] font-extrabold mb-[2px]" style={{ color: "var(--text)" }}>My Certificates</div>
                <div className="text-[11.5px] mb-[14px]" style={{ color: "var(--text3)" }}>Verified credentials recognised by 400+ hiring partners</div>
                <div className="grid grid-cols-3 gap-2">
                  {summaryStats.map((s) => (
                    <div key={s.lbl} className="text-center py-2.5 px-1.5 rounded-lg border" style={{ background: "var(--bg2)", borderColor: "var(--border)" }}>
                      <div className="text-[22px] font-extrabold leading-none" style={{ color: s.color }}>{s.num}</div>
                      <div className="font-mono text-[8px] uppercase tracking-[.07em] mt-[3px]" style={{ color: "var(--text3)" }}>{s.lbl}</div>
                    </div>
                  ))}
                </div>
              </div>

              {earned.length > 0 && (
                <>
                  <div className="font-mono text-[9px] font-semibold uppercase tracking-[.1em] flex items-center gap-2 px-5 pt-2.5 pb-1.5" style={{ color: "var(--text3)" }}>
                    ✦ Earned
                    <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
                  </div>
                  {earned.map((c) => (
                    <div
                      key={c.courseId}
                      onClick={() => setActiveId(c.courseId)}
                      className="flex items-center gap-3 px-5 py-3 border-b cursor-pointer transition-colors duration-100"
                      style={{
                        borderColor: "var(--border)",
                        background: selectedId === c.courseId ? "rgba(240,90,26,.05)" : undefined,
                        borderLeft: selectedId === c.courseId ? "2px solid var(--orange)" : "2px solid transparent",
                      }}
                    >
                      <div className="w-[38px] h-[38px] rounded-[10px] shrink-0 flex items-center justify-center text-[20px] shadow-[0_2px_8px_rgba(0,0,0,.15)]" style={{ background: getBg(c.courseId) }}>{getEmoji(c.category)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[8.5px] uppercase tracking-[.05em] mb-[2px]" style={{ color: "var(--text3)" }}>{c.category}</div>
                        <div className="text-[12.5px] font-bold truncate" style={{ color: selectedId === c.courseId ? "var(--orange)" : "var(--text)" }}>{c.courseTitle}</div>
                        <div className="flex items-center gap-2 mt-[3px]">
                          <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>📅 {formatDate(c.issuedAt)}</span>
                          {c.score !== null && <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>Score: {c.score}%</span>}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); requestDownload(c); }}
                          disabled={!!downloadingId}
                          className="w-[26px] h-[26px] rounded-[6px] flex items-center justify-center border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          style={{ borderColor: "var(--border)", color: "var(--text3)" }}
                          title="Download PDF"
                        >
                          {downloadingId === c.courseId ? (
                            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                          )}
                        </button>
                        <span className="font-mono text-[8px] font-bold px-2 py-[2px] rounded-[20px] tracking-[.04em] uppercase border" style={{ background: "var(--green-d)", color: "var(--green)", borderColor: "rgba(22,163,74,.2)" }}>✓ Earned</span>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {inProgress.length > 0 && (
                <>
                  <div className="font-mono text-[9px] font-semibold uppercase tracking-[.1em] flex items-center gap-2 px-5 pt-2.5 pb-1.5" style={{ color: "var(--text3)" }}>
                    ⏳ In Progress
                    <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
                  </div>
                  {inProgress.map((c) => (
                    <div
                      key={c.courseId}
                      onClick={() => setActiveId(c.courseId)}
                      className="px-5 py-3 border-b cursor-pointer"
                      style={{
                        borderColor: "var(--border)",
                        background: selectedId === c.courseId ? "rgba(240,90,26,.05)" : undefined,
                        borderLeft: selectedId === c.courseId ? "2px solid var(--orange)" : "2px solid transparent",
                      }}
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-[34px] h-[34px] rounded-[9px] shrink-0 flex items-center justify-center text-[17px]" style={{ background: getBg(c.courseId) }}>{getEmoji(c.category)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-[8.5px] uppercase tracking-[.05em]" style={{ color: "var(--text3)" }}>{c.category}</div>
                          <div className="text-[12px] font-bold" style={{ color: "var(--text)" }}>{c.courseTitle}</div>
                        </div>
                        <div className="text-[13px] font-extrabold shrink-0" style={{ color: getProgressColor(c.progressPercent) }}>{c.progressPercent}%</div>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden mb-1" style={{ background: "var(--border)" }}>
                        <div className="h-full rounded-full transition-[width] duration-[0.8s]" style={{ width: `${c.progressPercent}%`, background: getProgressBg(c.progressPercent) }} />
                      </div>
                      <div className="text-[10px] mt-1.5" style={{ color: "var(--text3)" }}>{c.completedItems} of {c.totalItems} items completed</div>
                    </div>
                  ))}
                </>
              )}

              {locked.length > 0 && (
                <>
                  <div className="font-mono text-[9px] font-semibold uppercase tracking-[.1em] flex items-center gap-2 px-5 pt-2.5 pb-1.5" style={{ color: "var(--text3)" }}>
                    🔒 Locked
                    <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
                  </div>
                  {locked.map((c) => (
                    <div
                      key={c.courseId}
                      className="flex items-center gap-3 px-5 py-2.5 border-b opacity-[.55]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="w-[34px] h-[34px] rounded-[9px] border flex items-center justify-center text-[14px] shrink-0" style={{ background: "var(--bg2)", borderColor: "var(--border)", color: "var(--text3)" }}>🔒</div>
                      <div className="flex-1">
                        <div className="text-[12px] font-semibold" style={{ color: "var(--text3)" }}>{c.courseTitle}</div>
                        <div className="font-mono text-[8.5px] mt-[2px]" style={{ color: "var(--text3)" }}>{c.category}{c.price != null ? ` · ₹${c.price.toLocaleString("en-IN")}` : ""}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {earned.length === 0 && inProgress.length === 0 && locked.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-1 px-6 py-10 text-center">
                  <div className="text-[48px] mb-3">🎓</div>
                  <div className="text-[16px] font-bold mb-1" style={{ color: "var(--text)" }}>No certificates yet</div>
                  <div className="text-[12px] max-w-[260px] leading-[1.6]" style={{ color: "var(--text3)" }}>Enroll in a course and complete all modules to earn your first certificate.</div>
                </div>
              )}
            </div>

            {/* ─── RIGHT ─── */}
            <div className="flex flex-col items-center gap-5 py-8 px-7 overflow-y-auto" style={{ background: "var(--bg)" }}>
              {activeEarned ? (
                <EarnedDetail cert={activeEarned} studentName={studentName} downloading={downloadingId === activeEarned.courseId} onDownload={() => runDownload(activeEarned)} />
              ) : activeInProgress ? (
                <div className="w-full max-w-[480px] flex flex-col gap-4">
                  <div className="text-center py-2.5">
                    <div className="text-[52px] mb-2">⏳</div>
                    <div className="text-[17px] font-extrabold mb-1" style={{ color: "var(--text)" }}>{activeInProgress.courseTitle}</div>
                    <div className="text-[11.5px]" style={{ color: "var(--text3)" }}>Complete the course to earn your verified certificate</div>
                  </div>
                  <div className="w-full rounded-xl px-[22px] py-5 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <div className="flex justify-between items-baseline mb-[14px]">
                      <span className="text-[14px] font-bold" style={{ color: "var(--text)" }}>Overall Progress</span>
                      <span className="text-[22px] font-extrabold" style={{ color: getProgressColor(activeInProgress.progressPercent) }}>{activeInProgress.progressPercent}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-full transition-[width] duration-[0.8s]" style={{ width: `${activeInProgress.progressPercent}%`, background: getProgressBg(activeInProgress.progressPercent) }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center py-2 rounded-[7px]" style={{ background: "var(--bg2)" }}>
                        <div className="text-[15px] font-extrabold leading-none" style={{ color: "var(--text)" }}>{activeInProgress.completedItems}</div>
                        <div className="font-mono text-[8px] mt-[2px] uppercase tracking-[.06em]" style={{ color: "var(--text3)" }}>Items Done</div>
                      </div>
                      <div className="text-center py-2 rounded-[7px]" style={{ background: "var(--bg2)" }}>
                        <div className="text-[15px] font-extrabold leading-none" style={{ color: "var(--text)" }}>{activeInProgress.totalItems - activeInProgress.completedItems}</div>
                        <div className="font-mono text-[8px] mt-[2px] uppercase tracking-[.06em]" style={{ color: "var(--text3)" }}>Remaining</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 gap-[14px] px-6 py-10 text-center">
                  <div className="text-[48px] opacity-50">🔍</div>
                  <div className="text-[16px] font-bold" style={{ color: "var(--text)" }}>Select a certificate</div>
                  <div className="text-[12px] max-w-[280px] leading-[1.6]" style={{ color: "var(--text3)" }}>Choose an earned certificate or an in-progress course from the left panel to view details.</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return embedded ? content : (
    <div className="bg-[var(--bg)] flex flex-col flex-1 min-h-0 overflow-y-auto">
      {content}
    </div>
  );
}

function EarnedDetail({ cert, studentName, downloading, onDownload }: { cert: EarnedCert; studentName: string; downloading: boolean; onDownload: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div id="certDoc" className="w-full bg-[#FBF9F3] shadow-[0_40px_70px_-30px_rgba(32,42,66,.4),0_10px_30px_rgba(32,42,66,.12)] relative">
        {/* inner hairline frame */}
        <div className="absolute inset-[14px] border border-[#DCD5C2] pointer-events-none z-[1]" />
        {/* corner brackets */}
        <div className="absolute top-[14px] left-[14px] w-[30px] h-[30px] border-t-2 border-l-2 border-[#202A42] z-[2]" />
        <div className="absolute top-[14px] right-[14px] w-[30px] h-[30px] border-t-2 border-r-2 border-[#202A42] z-[2]" />
        <div className="absolute bottom-[14px] left-[14px] w-[30px] h-[30px] border-b-2 border-l-2 border-[#202A42] z-[2]" />
        <div className="absolute bottom-[14px] right-[14px] w-[30px] h-[30px] border-b-2 border-r-2 border-[#202A42] z-[2]" />
        {/* soft grid + glow */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[.5]" style={{ backgroundImage: "linear-gradient(rgba(36,53,111,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(36,53,111,.04) 1px,transparent 1px)", backgroundSize: "34px 34px" }} />
        <div className="absolute -top-[60px] left-1/2 -translate-x-1/2 w-[420px] h-[220px] z-0 pointer-events-none rounded-full blur-[80px] opacity-[.25]" style={{ background: "radial-gradient(circle,#EFA23B 0%,transparent 70%)" }} />

        <div className="absolute top-[26px] right-[26px] flex items-center gap-[6px] bg-[#1E9455] text-white font-semibold text-[11px] pl-[9px] pr-[13px] py-[6px] rounded-[20px] z-[3] tracking-[.01em] shadow-[0_4px_14px_rgba(30,148,85,.35)]">
          <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3"><path d="M6 8.2L7.4 9.6L10.3 6.4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><circle cx="8" cy="8" r="7" stroke="white" strokeWidth="1.4" /></svg>
          Verified
        </div>

        <div className="relative z-[1] px-7 sm:px-[62px] pt-10 sm:pt-[58px] pb-7 sm:pb-[42px] text-center">
          <img src="/images/logo.png" alt="FutureStack" className="h-11 sm:h-[56px] w-auto mx-auto mb-3 sm:mb-[16px] object-contain" />
          <div className="font-bold text-[10px] sm:text-[12px] tracking-[.3em] text-[#E1602C] mb-1.5 sm:mb-[6px]">FUTURE STACK</div>
          <h1 className="italic font-medium text-[22px] sm:text-[30px] text-[#202A42] m-0 mb-5 sm:mb-[24px]">Certificate of Completion</h1>
          <div className="w-[60px] h-[2px] bg-[#E1602C] mx-auto mb-6 sm:mb-[30px]" />

          <img src="/images/stamp.png" alt="FutureStack Academy Seal" className="w-[96px] sm:w-[128px] h-auto mx-auto mb-5 sm:mb-[26px] block drop-shadow-[0_8px_20px_rgba(32,42,66,.18)]" />

          <p className="text-[9.5px] sm:text-[10.5px] font-bold tracking-[.18em] uppercase text-[#8B8F9C] m-0 mb-3 sm:mb-[14px]">This certifies that</p>
          <h2 className="font-semibold text-[clamp(26px,5.5vw,46px)] text-[#202A42] m-0 mb-5 sm:mb-[24px] leading-[1.1] break-words">{studentName}</h2>
          <div className="w-full max-w-[440px] mx-auto mb-6 sm:mb-[26px] h-px bg-[#DCD5C2]" />

          <p className="text-[9.5px] sm:text-[10.5px] font-bold tracking-[.18em] uppercase text-[#8B8F9C] m-0 mb-2.5 sm:mb-[12px]">Has successfully completed</p>
          <h3 className="font-semibold text-[18px] sm:text-[24px] text-[#24356F] m-0 mb-2.5 sm:mb-[12px] leading-[1.3]">{cert.courseTitle}</h3>
          {cert.description && (
            <p className="text-[12.5px] sm:text-[13.5px] text-[#4B5471] max-w-[440px] mx-auto mb-5 sm:mb-[26px] leading-[1.65]">{cert.description}</p>
          )}

          {cert.techStack && cert.techStack.length > 0 && (
            <div className="flex justify-center flex-wrap gap-[9px] mb-8 sm:mb-[44px]">
              {cert.techStack.map((s) => (
                <span key={s} className="text-[10.5px] sm:text-[11px] font-semibold text-[#24356F] border border-[#C8CEDF] bg-[#F3F5FA] px-[12px] sm:px-[13px] py-[5px] sm:py-[6px] rounded-[20px]">{s}</span>
              ))}
            </div>
          )}

          <div className="flex items-end justify-between gap-4 sm:gap-6 pt-5 sm:pt-[26px] border-t border-[#DCD5C2] text-left">
            <div className="w-[34%] min-w-0">
              <div className="italic font-medium text-[15px] sm:text-[19px] text-[#202A42] border-b border-[#202A42]/25 pb-1.5 sm:pb-[7px] mb-1.5 sm:mb-[7px] whitespace-nowrap overflow-hidden text-ellipsis">Instructor</div>
              <div className="text-[8.5px] sm:text-[9.5px] font-semibold tracking-[.1em] uppercase text-[#8B8F9C]">Course Instructor</div>
            </div>
            <img src="/images/logo.png" alt="FutureStack" className="h-5 sm:h-[26px] w-auto object-contain opacity-90 shrink-0 pb-1 sm:pb-[6px]" />
            <div className="w-[34%] text-right shrink-0 relative">
              <img src="/images/stamp.png" alt="" aria-hidden="true" className="pointer-events-none select-none absolute -top-5 sm:-top-[26px] right-[-6px] w-[70px] sm:w-[92px] h-auto object-contain grayscale opacity-[.07] mix-blend-multiply z-0" />
              <div className="relative z-[1] text-[11px] sm:text-[12px] text-[#202A42] font-semibold mb-1.5 sm:mb-2">{formatDate(cert.issuedAt)}</div>
              <div className="relative z-[1] inline-block text-[9.5px] sm:text-[10.5px] font-bold text-[#E1602C] bg-[#FBEBE1] px-[10px] sm:px-[11px] py-[4px] rounded-[20px]">
                {cert.score !== null ? `Score: ${cert.score}%` : "Completed"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 w-full">
        <button
          onClick={onDownload}
          disabled={downloading}
          className="flex-1 py-2.5 rounded-lg text-[12.5px] font-bold flex items-center justify-center gap-[7px] transition-all duration-[0.18s] bg-[var(--orange)] text-white shadow-[0_3px_12px_rgba(240,90,26,.3)] hover:bg-[var(--orange2)] hover:-translate-y-[1px] disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {downloading ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</> : <>⬇ Download PDF</>}
        </button>
        <button className="flex-1 py-2.5 rounded-lg text-[12.5px] font-bold flex items-center justify-center gap-[7px] transition-all duration-[0.18s] text-white shadow-[0_3px_12px_rgba(10,102,194,.3)] hover:opacity-[.88] hover:-translate-y-[1px]" style={{ background: "linear-gradient(135deg,#0a66c2,#1a8cff)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" /><circle cx="4" cy="4" r="2" /></svg>
          Add to LinkedIn
        </button>
      </div>

      <div className="w-full rounded-[10px] px-[18px] py-[14px] grid grid-cols-2 sm:grid-cols-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        {[
          { val: cert.score !== null ? `${cert.score}%` : "—", lbl: "Final Score" },
          { val: String(cert.totalSections), lbl: "Modules" },
          { val: formatHours(cert.totalHours), lbl: "Study Time" },
          { val: `#${cert.rank}`, lbl: "Class Rank" },
        ].map((s, i) => (
          <div key={s.lbl} className={`text-center px-2 ${i < 3 ? "border-r" : ""}`} style={{ borderColor: "var(--border)" }}>
            <div className="text-[20px] font-extrabold leading-none mb-[3px]" style={{ color: "var(--text)" }}>{s.val}</div>
            <div className="text-[8.5px] uppercase tracking-[.07em]" style={{ color: "var(--rm-muted)" }}>{s.lbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
