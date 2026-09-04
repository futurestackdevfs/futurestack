"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useAuth } from "@/app/auth/hooks/use-auth";

interface TicketRow {
  id: string;
  ref: string;
  subject: string;
  category: string;
  status: "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
  priority: string;
  lastMessageAt: string;
  createdAt: string;
}

const STATUS_META: Record<TicketRow["status"], { label: string; dot: string; text: string }> = {
  OPEN: { label: "Open", dot: "#3b82f6", text: "#2563eb" },
  PENDING: { label: "Awaiting you", dot: "#f59e0b", text: "#b45309" },
  RESOLVED: { label: "Resolved", dot: "#22c55e", text: "#16a34a" },
  CLOSED: { label: "Closed", dot: "#9ca3af", text: "#6b7280" },
};

const FILTERS = [
  { key: "", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "PENDING", label: "Awaiting you" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "CLOSED", label: "Closed" },
];

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function MyTicketsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [filter, setFilter] = useState("");
  const { data, isLoading: loading } = useSWR<{ data: TicketRow[] }>(
    isAuthenticated ? `/api/support/tickets?limit=50${filter ? `&status=${filter}` : ""}` : null,
  );
  const tickets = data?.data ?? [];

  return (
    <Shell>
      {!isLoading && !isAuthenticated ? (
        <div className="rounded-2xl border border-[#e4e7ef] dark:border-white/[0.08] bg-white/90 dark:bg-white/[0.03] p-10 text-center">
          <p className="text-[14px] text-[#374151] dark:text-[#aeb7c7] mb-4">Please sign in to view your tickets.</p>
          <Link href="/#student-login" className="inline-block text-white text-[13px] font-bold px-5 py-2.5 rounded-xl" style={{ background: "linear-gradient(135deg,#f05a1a,#ff7a3c)" }}>Sign in</Link>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h1 className="text-[24px] font-extrabold text-[#0f1420] dark:text-[#e9edf6]">Your tickets</h1>
              <Link href="/support" className="text-[12px] font-semibold text-[#6b7280] dark:text-[#8b93a7] hover:text-[#f05a1a]">← Help Center</Link>
            </div>
            <Link href="/support" className="text-white text-[12px] font-bold px-4 py-2 rounded-xl whitespace-nowrap" style={{ background: "linear-gradient(135deg,#f05a1a,#ff7a3c)" }}>+ New ticket</Link>
          </div>

          <div className="flex gap-1.5 flex-wrap mb-5">
            {FILTERS.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className="px-3.5 py-1.5 rounded-lg text-[11.5px] font-semibold border transition-colors"
                style={
                  filter === f.key
                    ? { background: "#2563eb", color: "#fff", borderColor: "#2563eb" }
                    : { background: "transparent", color: "#6b7280", borderColor: "#e4e7ef" }
                }>{f.label}</button>
            ))}
          </div>

          {loading ? (
            <p className="text-[12px] text-[#6b7280] dark:text-[#8b93a7] py-8">Loading…</p>
          ) : tickets.length === 0 ? (
            <div className="rounded-2xl border border-[#e4e7ef] dark:border-white/[0.08] bg-white/90 dark:bg-white/[0.03] p-10 text-center">
              <p className="text-[13px] text-[#6b7280] dark:text-[#8b93a7] mb-3">No tickets here yet.</p>
              <Link href="/support" className="text-[12px] font-semibold text-[#2563eb] hover:underline">Contact support →</Link>
            </div>
          ) : (
            <div className="grid gap-2.5">
              {tickets.map((t) => {
                const m = STATUS_META[t.status];
                return (
                  <Link key={t.id} href={`/support/tickets/${t.id}`}
                    className="rounded-2xl border border-[#e4e7ef] dark:border-white/[0.08] bg-white/90 dark:bg-white/[0.03] backdrop-blur-sm px-5 py-4 hover:border-[#f05a1a] hover:shadow-[0_0_0_3px_rgba(240,90,26,.08)] transition-all">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className="font-mono text-[10.5px] font-bold text-[#9ca3af]">{t.ref}</span>
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: m.text }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />{m.label}
                      </span>
                      <span className="ml-auto text-[10.5px] text-[#9ca3af]">{timeAgo(t.lastMessageAt)}</span>
                    </div>
                    <div className="text-[13.5px] font-semibold text-[#0f1420] dark:text-[#e9edf6]">{t.subject}</div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[calc(100vh-56px)] bg-[#f6f7fb] dark:bg-[#080b12] overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-100"
        style={{ background: "radial-gradient(600px 300px at 15% -5%, rgba(240,90,26,.10), transparent 60%), radial-gradient(700px 340px at 100% 0%, rgba(37,99,235,.12), transparent 55%)" }} />
      <div className="relative max-w-[860px] mx-auto px-4 sm:px-6 py-8 lg:py-10">{children}</div>
    </main>
  );
}
