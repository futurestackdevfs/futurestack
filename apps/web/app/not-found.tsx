import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 16 }}>
      <h1 style={{ fontSize: 48, fontWeight: 700 }}>404</h1>
      <p style={{ color: "var(--muted)" }}>Page not found</p>
      <Link href="/students" className="inline-flex items-center gap-1.5 px-6 py-2 rounded-[9px] text-[12px] font-bold border-none shadow-[0_4px_12px_rgba(0,0,0,.15)] hover:opacity-90 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(0,0,0,.22)] bg-[var(--blue)] text-white" style={{ textDecoration: "none" }}>
        Go Home
      </Link>
    </div>
  );
}
