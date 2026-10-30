import Link from "next/link";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 min-h-screen bg-[var(--bg)] text-center px-4">
      <p className="text-[56px] font-extrabold leading-none text-[var(--blue)]">404</p>
      <h1 className="text-[24px] font-bold text-[var(--text)]">Page not found</h1>
      <p className="max-w-sm text-[13px] text-[var(--text2)]">
        The page you are looking for doesn&apos;t exist or may have been moved.
        Check the address, or head back to the home page.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex items-center rounded-lg bg-[var(--blue)] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
        style={{ textDecoration: "none" }}
      >
        ← Go to Home
      </Link>
    </div>
  );
}
