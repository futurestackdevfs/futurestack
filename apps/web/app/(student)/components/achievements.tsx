'use client';

import Link from "next/link";
import useSWR from "swr";

interface AchievementItem {
  initial: string;
  name: string;
  action: string;
  time: string;
  gradient: string;
}

export function Achievements() {
  const { data } = useSWR<AchievementItem[]>('/api/certificates/recent');
  const items = data ?? [];

  if (items.length === 0) return null;

  return (
    <div>
      <div className="font-['Syne'] text-[14px] font-bold text-[var(--text)] flex justify-between items-center mb-3">
        <span>Student Achievements</span>
        <Link href="/my-dashboard" className="text-[11px] font-semibold text-[var(--blue)] font-['DM_Sans'] no-underline">View All</Link>
      </div>
      {items.map((item) => (
        <div key={item.name} className="flex items-start gap-2.5 border-b border-[var(--border)] py-2 last:border-b-0">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: item.gradient }}>
            {item.initial}
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--text)]">{item.name}</div>
            <div className="text-[10px] text-[var(--muted)]">{item.action}</div>
            <div className="mt-0.5 text-[10px] text-[var(--muted)]">{item.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
