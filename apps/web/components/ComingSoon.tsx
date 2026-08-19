import Link from "next/link";

export function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-screen bg-[var(--bg)] text-center px-4">
      <h1 className="text-[28px] font-bold text-[var(--text)]">Coming Soon</h1>
      <Link
        href="/"
        className="text-[13px] font-semibold text-[var(--blue)] hover:text-[var(--orange)] underline underline-offset-2 transition-colors"
        style={{ textDecoration: "none" }}
      >
        ← Go to Home
      </Link>
    </div>
  );
}