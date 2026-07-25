"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 16 }}>
      <h1 style={{ fontSize: 24 }}>Something went wrong</h1>
      <p style={{ color: "var(--muted)" }}>An unexpected error occurred.</p>
      <button onClick={reset} className="btn-sm btn-blue" style={{ padding: "8px 24px" }}>
        Try Again
      </button>
    </div>
  );
}
