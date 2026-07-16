import Link from "next/link";

export function ResumeLearning() {
  return (
    <div>
      <div className="font-['Syne'] text-[14px] font-bold text-[var(--text)] flex justify-between items-center mb-3">
        <span>Resume Learning</span>
        <Link href="/my-dashboard" className="text-[11px] font-semibold text-[var(--blue)] font-['DM_Sans'] no-underline">View All</Link>
      </div>

      <div className="mb-2 flex cursor-pointer gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 shadow-[var(--shadow)] hover:border-[var(--orange)]">
        <div className="flex h-11 w-[52px] flex-shrink-0 items-center justify-center rounded text-xl" style={{ background: "linear-gradient(135deg,#0d1f3c,#0a2a1a)" }}>⚛️</div>
        <div className="resume-info">
          <div className="text-xs font-bold text-[var(--text)]">MERN Stack Development</div>
          <div className="mb-1.5 text-[10px] text-[var(--muted)]">React Components &amp; Props</div>
          <div className="mb-1 h-1 rounded-full bg-[var(--border)]">
            <div className="h-full rounded-full bg-[var(--orange)]" style={{ width: "65%" }}></div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[var(--muted)]">
            <span>65% Complete</span>
            <button className="rounded border-none bg-[var(--blue)] px-3 py-1 text-[10px] font-bold text-white hover:opacity-85">Continue</button>
          </div>
        </div>
      </div>

      <div className="mb-2 flex cursor-pointer gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 shadow-[var(--shadow)] hover:border-[var(--orange)]">
        <div className="flex h-11 w-[52px] flex-shrink-0 items-center justify-center rounded text-xl" style={{ background: "linear-gradient(135deg,#1a1a0d,#0d1a2e)" }}>🐍</div>
        <div className="resume-info">
          <div className="text-xs font-bold text-[var(--text)]">Python Programming</div>
          <div className="mb-1.5 text-[10px] text-[var(--muted)]">Functions &amp; Modules</div>
          <div className="mb-1 h-1 rounded-full bg-[var(--border)]">
            <div className="h-full rounded-full bg-[var(--blue)]" style={{ width: "30%" }}></div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[var(--muted)]">
            <span>30% Complete</span>
            <button className="rounded border-none bg-[var(--blue)] px-3 py-1 text-[10px] font-bold text-white hover:opacity-85">Continue</button>
          </div>
        </div>
      </div>
    </div>
  );
}
