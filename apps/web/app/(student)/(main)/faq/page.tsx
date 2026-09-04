"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

interface QA {
  q: string;
  a: string;
}
interface FaqGroup {
  id: string;
  icon: string;
  label: string;
  items: QA[];
}

const FAQ: FaqGroup[] = [
  {
    id: "start",
    icon: "🚀",
    label: "Getting started",
    items: [
      {
        q: "What is FutureStack?",
        a: "FutureStack is a learning platform for software engineers. We offer self-paced video courses, mentor-guided Live Projects, live classes, and certification tracks — all built around actually shipping real, production-style work rather than just watching lectures.",
      },
      {
        q: "How do the courses work?",
        a: "Each course is broken into modules and lessons (video + notes + quizzes). You watch at your own pace, your progress is saved automatically, and you can resume from where you left off on any device. Some lessons have hands-on labs and downloadable starter code.",
      },
      {
        q: "Do I need to install anything?",
        a: "Only the tools the course teaches (e.g. Node.js, VS Code, Docker). Every course lists its exact setup steps and prerequisites on its overview page before you enrol. The platform itself runs entirely in your browser.",
      },
      {
        q: "What's the difference between a Course, a Live Project, and a Live Class?",
        a: "A Course is self-paced video learning. A Live Project is a multi-week guided build where you ship a real application with one-to-one mentor sessions and code reviews. A Live Class is a scheduled instructor-led session (recorded, so you can catch up if you miss it).",
      },
      {
        q: "What is a Career Path / Track?",
        a: "A Track bundles related courses into an ordered roadmap for a specific role — e.g. Full-Stack Engineer, AI/ML Engineer, Data Analyst. Following a track keeps your learning sequenced instead of picking courses at random.",
      },
    ],
  },
  {
    id: "enroll",
    icon: "🎓",
    label: "Enrolment & access",
    items: [
      {
        q: "How do I enrol in a course?",
        a: "Open the course page, click Buy / Add to cart, complete checkout, and the course unlocks on your dashboard immediately after a successful payment.",
      },
      {
        q: "I paid but the course is still locked — what do I do?",
        a: "First refresh the page or sign out and back in. If it's still locked after a successful payment, raise a ticket from the Help Center with your Order ID and we'll restore access right away.",
      },
      {
        q: "Do I get lifetime access?",
        a: "Yes — once you've bought a self-paced course, it stays on your account with no expiry. Live Projects and Live Classes run on a fixed schedule, so those are tied to their cohort dates.",
      },
      {
        q: "Can I use one account on multiple devices?",
        a: "Yes. Sign in with the same account on your laptop, tablet or phone — your progress syncs across all of them.",
      },
      {
        q: "Can I get a preview before buying?",
        a: "Most courses have at least one free preview lesson on the course page so you can judge the teaching style and depth before enrolling.",
      },
    ],
  },
  {
    id: "billing",
    icon: "💳",
    label: "Payments & billing",
    items: [
      {
        q: "What payment methods are accepted?",
        a: "Payments are processed securely through Razorpay — UPI, credit/debit cards, net banking and popular wallets for domestic (INR) payments. International cards are supported where enabled.",
      },
      {
        q: "Is this a one-time payment or a subscription?",
        a: "Courses are a one-time purchase — no recurring subscription. You pay once and keep the course.",
      },
      {
        q: "Do I get a GST invoice?",
        a: "Yes. Every paid order has a downloadable GST invoice on your Order History page.",
      },
      {
        q: "My payment failed / I was charged but got no confirmation.",
        a: "Failed and pending payments are automatically reversed by the bank within 5–7 working days — you don't need to do anything for that refund. If money left your account and the course didn't unlock, raise a ticket with your Order ID.",
      },
      {
        q: "I was charged twice.",
        a: "Only one charge is valid; the duplicate is usually auto-reversed within 5–7 working days. If it hasn't reversed, contact support with your Order ID and we'll raise the refund manually.",
      },
    ],
  },
  {
    id: "refunds",
    icon: "↩️",
    label: "Refunds",
    items: [
      {
        q: "What is the refund policy?",
        a: "Refunds are considered as per our refund policy — typically within 7 days of purchase and before a significant portion of the course has been consumed. Live Projects and Live Classes have their own cohort-based terms.",
      },
      {
        q: "How do I request a refund?",
        a: "Open the Help Center, choose Refund request, pick the order, and tell us the reason. The support team reviews each request and replies by email.",
      },
      {
        q: "How long does a refund take?",
        a: "Once approved, refunds are credited to your original payment method within 5–7 business days.",
      },
    ],
  },
  {
    id: "certs",
    icon: "📜",
    label: "Certificates",
    items: [
      {
        q: "When do I get my certificate?",
        a: "A certificate is issued automatically once every lesson and quiz in the course is complete — i.e. your progress hits 100%.",
      },
      {
        q: "My name is wrong on the certificate.",
        a: "Update your name in Profile settings, then contact support so we can re-issue the certificate with the corrected name.",
      },
      {
        q: "Is the certificate verifiable / shareable?",
        a: "Yes — each certificate has a unique verification link you can add to your LinkedIn profile or share with recruiters.",
      },
    ],
  },
  {
    id: "projects",
    icon: "🛠️",
    label: "Live Projects & mentors",
    items: [
      {
        q: "What exactly is a Live Project?",
        a: "A guided, multi-week build where you ship a real, production-style application. You get a starter repo, a structured curriculum, one-to-one mentor sessions, and code reviews against industry best practices.",
      },
      {
        q: "How do mentor sessions work?",
        a: "Sessions are scheduled with your assigned mentor through the project dashboard. Each project lists how many sessions are included.",
      },
      {
        q: "What do I get at the end?",
        a: "A finished project in your GitHub, a deployment, and a project-completion certificate — plus code-review feedback you can actually talk about in interviews.",
      },
    ],
  },
  {
    id: "classes",
    icon: "🎥",
    label: "Live classes",
    items: [
      {
        q: "I missed a live class — is there a recording?",
        a: "Yes, live classes are recorded and the recording is added to your dashboard usually within a day.",
      },
      {
        q: "What timezone are live classes in?",
        a: "Class times are shown in IST on the schedule. Convert to your local timezone before joining.",
      },
    ],
  },
  {
    id: "account",
    icon: "🔐",
    label: "Account & login",
    items: [
      {
        q: "How do I sign up?",
        a: "Use the Sign in / Sign up option in the top navigation. You can register with an email and password, or continue with Google.",
      },
      {
        q: "I can't log in.",
        a: "Use 'Forgot password' on the login page to reset it. If you originally signed up with Google, use 'Continue with Google' instead of a password.",
      },
      {
        q: "Can I change my registered email?",
        a: "Contact support with your current and new email — we'll verify and switch it for you.",
      },
      {
        q: "How do I delete my account?",
        a: "Raise a ticket from the Help Center under Account & login. Note that deleting your account also removes access to any courses on it.",
      },
    ],
  },
  {
    id: "tech",
    icon: "⚙️",
    label: "Technical issues",
    items: [
      {
        q: "A video won't play or keeps buffering.",
        a: "Most playback issues are network or browser related. Try a different browser, disable ad-blockers / VPN, and check your connection. If one specific lesson is broken, tell support which course and lesson.",
      },
      {
        q: "Which browsers are supported?",
        a: "The latest versions of Chrome, Edge, Firefox and Safari on desktop and mobile.",
      },
      {
        q: "My progress isn't saving.",
        a: "Make sure you're signed in and not in a private/incognito window. If it still doesn't save, contact support with the course name.",
      },
    ],
  },
  {
    id: "trainer",
    icon: "🧑‍🏫",
    label: "Teaching on FutureStack",
    items: [
      {
        q: "How do I become a trainer?",
        a: "Register with the trainer option from the sign-up screen. Your application goes into review, and you can start creating courses once an admin approves your account.",
      },
      {
        q: "How does trainer revenue work?",
        a: "Trainers earn a revenue share on enrolments in their courses. Your share and payout history are visible in the trainer dashboard.",
      },
    ],
  },
];

export default function FaqPage() {
  const [activeId, setActiveId] = useState(FAQ[0].id);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const q = search.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return null;
    const hits: { group: FaqGroup; item: QA }[] = [];
    for (const g of FAQ)
      for (const it of g.items)
        if (it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q)) hits.push({ group: g, item: it });
    return hits;
  }, [q]);

  const active = FAQ.find((g) => g.id === activeId)!;

  return (
    <main className="relative min-h-[calc(100vh-56px)] bg-[#f6f7fb] dark:bg-[#080b12] overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-100"
        style={{ background: "radial-gradient(600px 300px at 15% -5%, rgba(240,90,26,.10), transparent 60%), radial-gradient(700px 340px at 100% 0%, rgba(37,99,235,.12), transparent 55%)" }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 dark:opacity-[0.05] opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(#8891a5 1px,transparent 1px),linear-gradient(90deg,#8891a5 1px,transparent 1px)", backgroundSize: "44px 44px" }} />

      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* header */}
        <div className="mb-7">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#f05a1a]">Help Center</div>
          <h1 className="text-[26px] sm:text-[32px] font-extrabold tracking-tight text-[#0f1420] dark:text-[#e9edf6] mt-1">
            Frequently asked questions
          </h1>
          <p className="text-[13px] text-[#6b7280] dark:text-[#8b93a7] mt-1.5 max-w-[560px]">
            Everything about courses, payments, certificates, projects and your account. Can't find it? Our team is one click away.
          </p>
          <div className="relative mt-5 max-w-[560px]">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]">⌕</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search the FAQ…"
              className="w-full pl-10 pr-4 py-3 rounded-xl text-[13.5px] outline-none bg-white dark:bg-[#0e131d] border border-[#e4e7ef] dark:border-white/10 text-[#0f1420] dark:text-[#e9edf6] focus:border-[#f05a1a] transition-colors" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 lg:gap-8 items-start">
          {/* left rail */}
          <aside className="lg:sticky lg:top-[76px]">
            <div className="rounded-2xl border border-[#e4e7ef] dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm p-2">
              {FAQ.map((g) => {
                const on = !q && activeId === g.id;
                return (
                  <button key={g.id} onClick={() => { setActiveId(g.id); setSearch(""); setOpen(null); }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12.5px] font-medium transition-all"
                    style={{
                      background: on ? "linear-gradient(90deg,rgba(240,90,26,.12),transparent)" : "transparent",
                      color: on ? "#f05a1a" : "#4b5563",
                      boxShadow: on ? "inset 2px 0 0 #f05a1a" : "none",
                    }}>
                    <span className="text-[15px]">{g.icon}</span>
                    <span className="dark:text-[#aeb7c7] flex-1 text-left">{g.label}</span>
                    <span className="text-[10px] text-[#9ca3af]">{g.items.length}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl border border-[#e4e7ef] dark:border-white/[0.08] bg-gradient-to-br from-[#fff4ec] to-[#eef2ff] dark:from-[#1a130d] dark:to-[#111a2e] p-4">
              <div className="text-[12.5px] font-extrabold text-[#0f1420] dark:text-[#e9edf6]">Still stuck?</div>
              <p className="text-[11px] text-[#6b7280] dark:text-[#8b93a7] mt-1 leading-snug">
                Raise a ticket and our support team will get back to you by email.
              </p>
              <Link href="/support" className="mt-3 inline-block text-white text-[11.5px] font-bold px-3.5 py-2 rounded-lg"
                style={{ background: "linear-gradient(135deg,#f05a1a,#ff7a3c)" }}>
                Contact support →
              </Link>
            </div>
          </aside>

          {/* content */}
          <section className="min-w-0">
            {results ? (
              <div>
                <div className="text-[12px] text-[#6b7280] dark:text-[#8b93a7] mb-3">
                  {results.length} result{results.length === 1 ? "" : "s"} for “{search.trim()}”
                </div>
                {results.length === 0 ? (
                  <Panel>
                    <p className="text-[13px] text-[#374151] dark:text-[#aeb7c7]">
                      Nothing matched. Try different words, or{" "}
                      <Link href="/support" className="font-semibold text-[#2563eb] hover:underline">contact support</Link>.
                    </p>
                  </Panel>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {results.map(({ group, item }, i) => (
                      <Accordion key={group.id + i} tag={group.label} qa={item}
                        isOpen={open === group.id + i} onToggle={() => setOpen(open === group.id + i ? null : group.id + i)} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[24px]">{active.icon}</span>
                  <h2 className="text-[18px] font-extrabold text-[#0f1420] dark:text-[#e9edf6]">{active.label}</h2>
                </div>
                <div className="flex flex-col gap-2.5">
                  {active.items.map((qa, i) => (
                    <Accordion key={i} qa={qa} isOpen={open === active.id + i}
                      onToggle={() => setOpen(open === active.id + i ? null : active.id + i)} />
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#e4e7ef] dark:border-white/[0.08] bg-white/90 dark:bg-white/[0.03] backdrop-blur-sm p-5">
      {children}
    </div>
  );
}

function Accordion({ qa, tag, isOpen, onToggle }: { qa: QA; tag?: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className={`rounded-2xl border bg-white/90 dark:bg-white/[0.03] backdrop-blur-sm overflow-hidden transition-colors ${
      isOpen ? "border-[#f05a1a]" : "border-[#e4e7ef] dark:border-white/[0.08]"
    }`}>
      <button onClick={onToggle} className="w-full flex items-start gap-3 px-4 sm:px-5 py-3.5 text-left">
        <span className="mt-0.5 text-[15px] font-bold transition-transform shrink-0"
          style={{ color: isOpen ? "#f05a1a" : "#9ca3af", transform: isOpen ? "rotate(45deg)" : "none" }}>+</span>
        <span className="flex-1">
          <span className="block text-[13px] font-bold text-[#0f1420] dark:text-[#e9edf6]">{qa.q}</span>
          {tag && !isOpen && <span className="text-[10px] text-[#9ca3af] mt-0.5 block">{tag}</span>}
        </span>
      </button>
      {isOpen && (
        <div className="px-4 sm:px-5 pb-4 pl-[46px] sm:pl-[52px]">
          {tag && <div className="text-[10px] font-bold uppercase tracking-wide text-[#f05a1a] mb-2">{tag}</div>}
          <p className="text-[12.5px] leading-relaxed text-[#374151] dark:text-[#aeb7c7]">{qa.a}</p>
        </div>
      )}
    </div>
  );
}
