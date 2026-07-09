"use client";

/**
 * Shared micro-components for the Trainer console views.
 * Same visual language as the admin console (KpiStrip / EntityTable).
 */

export interface KpiItem {
  label: string;
  value: string | number;
  delta?: string;
  color: string;
}

export function KpiRow({ items }: { items: KpiItem[] }) {
  return (
    <div
      className="grid rounded overflow-hidden mb-4"
      style={{
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        border: "1px solid var(--border)",
        background: "var(--border)",
        gap: 1,
      }}
    >
      {items.map((item, i) => (
        <div key={i} style={{ background: "var(--surface)" }} className="px-3.5 py-2.5">
          <div className="font-mono text-[8.5px] uppercase tracking-wider mb-1" style={{ color: "var(--text3)" }}>{item.label}</div>
          <div className="font-mono text-[19px] font-bold leading-none" style={{ color: item.color }}>{item.value}</div>
          {item.delta && <div className="font-mono text-[8.5px] mt-0.5" style={{ color: "var(--text3)" }}>{item.delta}</div>}
        </div>
      ))}
    </div>
  );
}

export function Panel({ title, count, action, children }: { title: string; count?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded overflow-hidden mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
        <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text2)" }}>{title}</span>
        <div className="flex items-center gap-2">
          {count && <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{count}</span>}
          {action}
        </div>
      </div>
      {children}
    </div>
  );
}

export function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="text-left font-mono text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1.5"
      style={{ color: "var(--text3)", borderBottom: "1px solid var(--border2)", background: "var(--panel)" }}
    >
      {children}
    </th>
  );
}

export function Td({ children, mono, color }: { children: React.ReactNode; mono?: boolean; color?: string }) {
  return (
    <td
      className={`px-2.5 py-1.5 ${mono ? "font-mono text-[10px]" : ""}`}
      style={{ color: color || "var(--text2)", borderBottom: "1px solid var(--border)" }}
    >
      {children}
    </td>
  );
}

const PILL_STYLES: Record<string, { bg: string; fg: string }> = {
  // batches / sessions
  "Running": { bg: "var(--green-d)", fg: "var(--green)" },
  "Upcoming": { bg: "var(--blue-d)", fg: "var(--blue)" },
  "Completed": { bg: "var(--panel)", fg: "var(--text3)" },
  "Scheduled": { bg: "var(--blue-d)", fg: "var(--blue)" },
  "In Progress": { bg: "var(--amber-d)", fg: "var(--amber)" },
  "Cancelled": { bg: "var(--red-d)", fg: "var(--red)" },
  // students
  "On Track": { bg: "var(--green-d)", fg: "var(--green)" },
  "Falling Behind": { bg: "var(--red-d)", fg: "var(--red)" },
  "Ready for Next Module": { bg: "var(--blue-d)", fg: "var(--blue)" },
  "Needs Re-attempt": { bg: "var(--amber-d)", fg: "var(--amber)" },
  // submissions
  "New": { bg: "var(--purple-d)", fg: "var(--purple)" },
  "Pending Review": { bg: "var(--amber-d)", fg: "var(--amber)" },
  "Revision Requested": { bg: "var(--red-d)", fg: "var(--red)" },
  "Approved": { bg: "var(--green-d)", fg: "var(--green)" },
  // doubts
  "Open": { bg: "var(--red-d)", fg: "var(--red)" },
  "Session Scheduled": { bg: "var(--blue-d)", fg: "var(--blue)" },
  "Resolved": { bg: "var(--green-d)", fg: "var(--green)" },
  // feedback
  "Draft": { bg: "var(--panel)", fg: "var(--text3)" },
  "Submitted": { bg: "var(--blue-d)", fg: "var(--blue)" },
  "Acknowledged": { bg: "var(--green-d)", fg: "var(--green)" },
  // payments
  "Paid": { bg: "var(--green-d)", fg: "var(--green)" },
  "Pending": { bg: "var(--amber-d)", fg: "var(--amber)" },
  "Full": { bg: "var(--green-d)", fg: "var(--green)" },
  "EMI": { bg: "var(--blue-d)", fg: "var(--blue)" },
  // feedback kinds
  "Outdated Material": { bg: "var(--red-d)", fg: "var(--red)" },
  "Confusing Topic": { bg: "var(--amber-d)", fg: "var(--amber)" },
  "Content Suggestion": { bg: "var(--blue-d)", fg: "var(--blue)" },
  // doubt kinds
  "Ticket": { bg: "var(--panel)", fg: "var(--text3)" },
  "1-on-1 Request": { bg: "var(--purple-d)", fg: "var(--purple)" },
  "Group Session": { bg: "var(--blue-d)", fg: "var(--blue)" },
  // priority
  "High": { bg: "var(--red-d)", fg: "var(--red)" },
  "Medium": { bg: "var(--amber-d)", fg: "var(--amber)" },
  "Low": { bg: "var(--panel)", fg: "var(--text3)" },
};

export function Pill({ value }: { value: string }) {
  const st = PILL_STYLES[value] || { bg: "var(--panel)", fg: "var(--text3)" };
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded whitespace-nowrap"
      style={{ background: st.bg, color: st.fg }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.fg }} />
      {value}
    </span>
  );
}

export function ActionBtn({ children, onClick, color = "var(--orange)", solid }: { children: React.ReactNode; onClick?: () => void; color?: string; solid?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="font-mono text-[8.5px] font-bold px-2 py-0.5 rounded cursor-pointer whitespace-nowrap"
      style={solid
        ? { background: color, color: "#fff", border: `1px solid ${color}` }
        : { background: "transparent", color, border: `1px solid ${color}` }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.8"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
    >
      {children}
    </button>
  );
}

export function ViewHeader({ icon, title, meta, action }: { icon: string; title: string; meta: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3.5">
      <div className="flex items-baseline gap-2.5">
        <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>{icon} {title}</span>
        <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>{meta}</span>
      </div>
      {action}
    </div>
  );
}

export function ProgressBar({ pct, color }: { pct: number; color?: string }) {
  const c = color || (pct >= 60 ? "var(--green)" : pct >= 30 ? "var(--amber)" : "var(--red)");
  return (
    <div className="flex items-center gap-1.5" style={{ minWidth: 90 }}>
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, background: "var(--panel)", border: "1px solid var(--border)" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: c }} />
      </div>
      <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>{pct}%</span>
    </div>
  );
}
