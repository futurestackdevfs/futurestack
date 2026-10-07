"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/app/auth/hooks/use-auth";
import { showToast } from "@/lib/toast";

/** Signed-out users get a friendly prompt + the login form highlighted. */
function promptLogin(router: ReturnType<typeof useRouter>, pathname: string | null) {
  showToast("Please sign in to see your certificates");
  if (pathname === "/") {
    window.dispatchEvent(new CustomEvent("fs:highlight-login"));
  } else {
    router.push("/#student-login");
  }
}

const TECH_STACK = ["React", "Node.js", "MongoDB"];

const STATS = [
  { val: "94%", lbl: "Final Score" },
  { val: "12", lbl: "Modules" },
  { val: "48h", lbl: "Study Time" },
  { val: "#3", lbl: "Class Rank" },
];

const HIGHLIGHTS = [
  { icon: "🏅", title: "Verified & Shareable", desc: "A unique credential ID anyone can verify — add it straight to your LinkedIn profile." },
  { icon: "🏢", title: "Recognised by hiring partners", desc: "Employers across India trust FutureStack certificates as proof of real, hands-on skill." },
  { icon: "⚡", title: "Earned, not handed out", desc: "Every certificate is tied to a real score, a real project, and a real completion date." },
];

export default function CertificatesPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Hero — full-bleed, generous height */}
      <section className="relative overflow-hidden flex items-center justify-center min-h-[62vh] px-6" style={{ background: "linear-gradient(135deg,#0b1120 0%,#111a2e 55%,#1a1030 100%)" }}>
        <div
          className="absolute inset-0 pointer-events-none opacity-[.4]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)", backgroundSize: "44px 44px" }}
        />
        <div className="absolute -top-32 right-[-100px] w-[460px] h-[460px] rounded-full pointer-events-none blur-[120px] opacity-40" style={{ background: "radial-gradient(circle,var(--orange) 0%,transparent 70%)" }} />
        <div className="absolute -bottom-32 left-[-80px] w-[420px] h-[420px] rounded-full pointer-events-none blur-[120px] opacity-30" style={{ background: "radial-gradient(circle,#4f7bff 0%,transparent 70%)" }} />

        <div className="relative flex flex-col items-center gap-5 max-w-[860px] text-center">
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold tracking-[.16em] uppercase px-4 py-1.5 rounded-full" style={{ color: "var(--orange)", background: "rgba(255,106,26,.12)", border: "1px solid rgba(255,106,26,.25)" }}>
            ✦ Verified Credentials
          </span>
          <h1 className="text-[34px] sm:text-[48px] md:text-[58px] font-extrabold leading-[1.08] text-white">
            A certificate that actually gets you hired
          </h1>
          <p className="text-[14px] sm:text-[17px] leading-relaxed max-w-[620px]" style={{ color: "#aab3c5" }}>
            Finish a course end-to-end and earn a verified, shareable certificate with a unique credential ID — recognised by hiring partners across India.
          </p>
          <Link
            href="/courses"
            className="mt-3 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-[14px] font-bold text-white"
            style={{ background: "linear-gradient(135deg, var(--orange) 0%, var(--orange2) 100%)", boxShadow: "0 10px 30px rgba(240,90,26,.4)" }}
          >
            Start earning yours →
          </Link>
        </div>
      </section>

      {/* Showcase: real certificate + highlights, side by side, full-width */}
      <section className="flex-1 flex items-center">
        <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 py-16 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-20 items-center">
            {/* Certificate card */}
            <div className="relative mx-auto w-full max-w-[720px]">
              <div className="absolute -inset-4 rounded-[32px] opacity-60 blur-2xl pointer-events-none" style={{ background: "linear-gradient(135deg,var(--orange) 0%,#4f7bff 100%)" }} />
              <div className="relative w-full bg-[#FBF9F3] shadow-[0_50px_100px_-20px_rgba(0,0,0,.5)] rounded-[6px] overflow-hidden">
                <div className="absolute inset-[16px] border border-[#DCD5C2] pointer-events-none z-[1]" />
                <div className="absolute top-[16px] left-[16px] w-[32px] h-[32px] border-t-2 border-l-2 border-[#202A42] z-[2]" />
                <div className="absolute top-[16px] right-[16px] w-[32px] h-[32px] border-t-2 border-r-2 border-[#202A42] z-[2]" />
                <div className="absolute bottom-[16px] left-[16px] w-[32px] h-[32px] border-b-2 border-l-2 border-[#202A42] z-[2]" />
                <div className="absolute bottom-[16px] right-[16px] w-[32px] h-[32px] border-b-2 border-r-2 border-[#202A42] z-[2]" />
                <div className="absolute inset-0 z-0 pointer-events-none opacity-[.5]" style={{ backgroundImage: "linear-gradient(rgba(36,53,111,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(36,53,111,.04) 1px,transparent 1px)", backgroundSize: "34px 34px" }} />
                <div className="absolute -top-[60px] left-1/2 -translate-x-1/2 w-[440px] h-[220px] z-0 pointer-events-none rounded-full blur-[80px] opacity-[.22]" style={{ background: "radial-gradient(circle,#EFA23B 0%,transparent 70%)" }} />

                <div className="absolute top-[24px] right-[24px] flex items-center gap-[6px] bg-[#1E9455] text-white font-semibold text-[11px] pl-[9px] pr-[13px] py-[6px] rounded-[20px] z-[3] tracking-[.01em] shadow-[0_4px_14px_rgba(30,148,85,.35)]">
                  <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3"><path d="M6 8.2L7.4 9.6L10.3 6.4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><circle cx="8" cy="8" r="7" stroke="white" strokeWidth="1.4" /></svg>
                  Verified
                </div>

                <div className="relative z-[1] px-8 sm:px-14 pt-12 sm:pt-16 pb-8 sm:pb-11 text-center">
                  <img src="/images/logo.png" alt="FutureStack" className="h-12 sm:h-14 w-auto mx-auto mb-3.5 object-contain" />
                  <div className="font-bold text-[10px] sm:text-[12px] tracking-[.3em] text-[#E1602C] mb-2">FUTURE STACK</div>
                  <h2 className="italic font-medium text-[22px] sm:text-[27px] text-[#202A42] m-0 mb-5">Certificate of Completion</h2>
                  <div className="w-[60px] h-[2px] bg-[#E1602C] mx-auto mb-6" />

                  <p className="text-[9.5px] sm:text-[10.5px] font-bold tracking-[.18em] uppercase text-[#8B8F9C] m-0 mb-2.5">This certifies that</p>
                  <h3 className="font-semibold text-[34px] sm:text-[44px] text-[#202A42] m-0 mb-5 leading-[1.1]">Your Name Here</h3>
                  <div className="w-full max-w-[400px] mx-auto mb-6 h-px bg-[#DCD5C2]" />

                  <p className="text-[9.5px] sm:text-[10.5px] font-bold tracking-[.18em] uppercase text-[#8B8F9C] m-0 mb-2.5">Has successfully completed</p>
                  <h4 className="font-semibold text-[19px] sm:text-[23px] text-[#24356F] m-0 mb-4 leading-[1.3]">Full-Stack React &amp; Node.js Mastery</h4>

                  <div className="flex justify-center flex-wrap gap-[9px] mb-8">
                    {TECH_STACK.map((s) => (
                      <span key={s} className="text-[11px] font-semibold text-[#24356F] border border-[#C8CEDF] bg-[#F3F5FA] px-[13px] py-[5px] rounded-[20px]">{s}</span>
                    ))}
                  </div>

                  <div className="flex items-end justify-between gap-6 pt-6 border-t border-[#DCD5C2] text-left">
                    <div className="w-[34%] min-w-0">
                      <div className="italic font-medium text-[17px] text-[#202A42] border-b border-[#202A42]/25 pb-2 mb-2 whitespace-nowrap overflow-hidden text-ellipsis">Instructor</div>
                      <div className="text-[9px] font-semibold tracking-[.1em] uppercase text-[#8B8F9C]">Course Instructor</div>
                    </div>
                    <img src="/images/logo.png" alt="FutureStack" className="h-5 w-auto object-contain opacity-90 shrink-0 pb-1" />
                    <div className="w-[34%] text-right shrink-0">
                      <div className="text-[11px] text-[#202A42] font-semibold mb-2">Score: 94%</div>
                      <div className="inline-block text-[9.5px] font-bold text-[#E1602C] bg-[#FBEBE1] px-[10px] py-[4px] rounded-[20px]">Completed</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stat strip under the card */}
              <div className="relative mt-6 rounded-[14px] px-5 py-4.5 grid grid-cols-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                {STATS.map((s, i) => (
                  <div key={s.lbl} className={`text-center px-1 ${i < 3 ? "border-r" : ""}`} style={{ borderColor: "var(--border)" }}>
                    <div className="text-[20px] sm:text-[23px] font-extrabold leading-none" style={{ color: "var(--text)" }}>{s.val}</div>
                    <div className="text-[8px] sm:text-[8.5px] uppercase tracking-[.06em] mt-1.5" style={{ color: "var(--rm-muted)" }}>{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Highlights */}
            <div className="flex flex-col gap-6">
              {HIGHLIGHTS.map((h) => (
                <div key={h.title} className="flex gap-4 items-start rounded-2xl p-5 sm:p-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[22px] shrink-0" style={{ background: "var(--orange-d)" }}>{h.icon}</div>
                  <div>
                    <div className="text-[15px] font-bold mb-1.5" style={{ color: "var(--text)" }}>{h.title}</div>
                    <div className="text-[13px] leading-relaxed" style={{ color: "var(--rm-muted)" }}>{h.desc}</div>
                  </div>
                </div>
              ))}

              <div className="rounded-2xl p-6 flex flex-col gap-3" style={{ background: "linear-gradient(135deg, var(--orange-d) 0%, rgba(240,90,26,.04) 100%)", border: "1px solid rgba(240,90,26,.25)" }}>
                <div className="text-[15px] font-bold" style={{ color: "var(--text)" }}>Already a student?</div>
                <div className="text-[13px] leading-relaxed" style={{ color: "var(--rm-muted)" }}>Sign in to see your own earned, in-progress, and locked certificates on your dashboard.</div>
                {isAuthenticated ? (
                  <Link href="/my-dashboard" className="self-start inline-flex items-center gap-1.5 text-[13.5px] font-bold" style={{ color: "var(--orange)" }}>
                    Go to My Certificates →
                  </Link>
                ) : (
                  <button
                    onClick={() => promptLogin(router, pathname)}
                    className="self-start inline-flex items-center gap-1.5 text-[13.5px] font-bold cursor-pointer"
                    style={{ color: "var(--orange)" }}
                  >
                    Go to My Certificates →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA — full-bleed */}
      <section className="text-center px-6 py-16 sm:py-20" style={{ background: "var(--card)", borderTop: "1px solid var(--border)" }}>
        <div className="text-[24px] sm:text-[30px] font-extrabold mb-3" style={{ color: "var(--text)" }}>Ready to earn one of your own?</div>
        <p className="text-[13.5px] sm:text-[15px] max-w-[520px] mx-auto mb-7" style={{ color: "var(--rm-muted)" }}>Pick a course, finish every module, and your verified certificate is generated automatically — no extra steps.</p>
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-[14px] font-bold text-white"
          style={{ background: "linear-gradient(135deg, var(--orange) 0%, var(--orange2) 100%)", boxShadow: "0 10px 30px rgba(240,90,26,.35)" }}
        >
          Browse Courses →
        </Link>
      </section>
    </div>
  );
}
