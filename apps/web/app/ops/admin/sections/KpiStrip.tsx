"use client";

interface KpiItem {
  label: string;
  value: number;
  delta: string;
  color: string;
}

interface KpiStripProps {
  items: KpiItem[];
}

export function KpiStrip({ items }: KpiStripProps) {
  return (
    <div
      className="grid grid-cols-6 rounded overflow-hidden mb-4"
      style={{
        border: "1px solid var(--border)",
        background: "var(--border)",
        gap: 1,
      }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          style={{ background: "var(--surface)" }}
          className="px-3.5 py-2.5 relative"
        >
          <div
            className="font-mono text-[8.5px] uppercase tracking-wider mb-1"
            style={{ color: "var(--text3)" }}
          >
            {item.label}
          </div>
          <div
            className="font-mono text-[19px] font-bold leading-none"
            style={{ color: item.color }}
          >
            {item.value}
          </div>
          <div
            className="font-mono text-[8.5px] mt-0.5"
            style={{ color: "var(--text3)" }}
          >
            {item.delta}
          </div>
        </div>
      ))}
    </div>
  );
}
