"use client";

export interface EntityTab {
  key: string;
  icon: string;
  label: string;
  count: number;
}

interface EntityTabsProps {
  tabs: EntityTab[];
  active: string;
  onSwitch: (key: string) => void;
}

export function EntityTabs({ tabs, active, onSwitch }: EntityTabsProps) {
  return (
    <div
      className="flex gap-0.5 rounded p-0.5 mb-4 overflow-x-auto"
      style={{
        background: "var(--border)",
        border: "1px solid var(--border)",
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onSwitch(tab.key)}
          className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-all duration-150"
          style={{
            flex: 1,
            color: active === tab.key ? "#fff" : "var(--text3)",
            background: active === tab.key ? "var(--orange)" : "var(--surface)",
          }}
          onMouseEnter={(e) => {
            if (active !== tab.key) {
              (e.currentTarget as HTMLElement).style.color = "var(--text2)";
            }
          }}
          onMouseLeave={(e) => {
            if (active !== tab.key) {
              (e.currentTarget as HTMLElement).style.color = "var(--text3)";
            }
          }}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
          <span
            className="font-mono text-[9px] px-1 rounded-full"
            style={{
              opacity: 0.75,
              background: active === tab.key ? "rgba(255,255,255,.22)" : "rgba(0,0,0,.08)",
            }}
          >
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}
