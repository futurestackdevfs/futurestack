"use client";

interface SupportSidebarProps {
  activeView: string;
  onSwitchView: (view: string) => void;
  badges?: Record<string, number>;
}

interface NavItem {
  icon: string;
  label: string;
  view: string;
  badgeKey?: string;
  badgeColor?: { color: string; bg: string };
}

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: "Overview",
    items: [{ icon: "▣", label: "Dashboard", view: "dashboard" }],
  },
  {
    group: "Inbox",
    items: [
      { icon: "🎧", label: "Live queue", view: "queue", badgeKey: "open", badgeColor: { color: "var(--blue)", bg: "var(--blue-d)" } },
      { icon: "🕓", label: "Awaiting student", view: "pending", badgeKey: "pending", badgeColor: { color: "var(--amber)", bg: "var(--amber-d)" } },
      { icon: "📥", label: "Unassigned", view: "unassigned", badgeKey: "unassigned", badgeColor: { color: "var(--red)", bg: "var(--red-d)" } },
      { icon: "👤", label: "My tickets", view: "mine", badgeKey: "mine", badgeColor: { color: "var(--orange)", bg: "var(--orange-d)" } },
    ],
  },
  {
    group: "Email",
    items: [
      { icon: "📧", label: "Email outbox", view: "email" },
    ],
  },
  {
    group: "Students",
    items: [
      { icon: "👤", label: "Students", view: "students" },
      { icon: "🎓", label: "Enrollments", view: "enrollments" },
      { icon: "⭐", label: "Ratings & reviews", view: "ratings" },
      { icon: "💳", label: "Payments", view: "payments" },
    ],
  },
  {
    group: "Archive",
    items: [
      { icon: "✅", label: "Resolved", view: "resolved" },
      { icon: "🗄", label: "Closed", view: "closed" },
    ],
  },
];

export function SupportSidebar({ activeView, onSwitchView, badges = {} }: SupportSidebarProps) {
  return (
    <aside
      style={{ width: 208, background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      className="shrink-0 overflow-y-auto flex flex-col"
    >
      <div style={{ borderBottom: "1px solid var(--border)" }} className="px-3.5 py-2.5 flex items-center gap-2">
        <div className="w-6 h-6 rounded flex items-center justify-center text-[12px] shrink-0" style={{ background: "var(--orange-d)", color: "var(--orange)" }}>🎧</div>
        <div>
          <div className="text-[10.8px] font-semibold" style={{ color: "var(--text)" }}>Support Console</div>
          <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>role::support</div>
        </div>
      </div>

      {NAV_GROUPS.map((group, gi) => (
        <div key={group.group} style={gi < NAV_GROUPS.length - 1 ? { borderBottom: "1px solid var(--border)" } : {}}>
          <div className="font-mono text-[9px] font-semibold uppercase tracking-widest px-3.5 pt-2.5 pb-1" style={{ color: "var(--text3)" }}>
            {group.group}
          </div>
          {group.items.map((item) => {
            const isActive = activeView === item.view;
            const badgeCount = item.badgeKey ? badges[item.badgeKey] ?? 0 : 0;
            return (
              <div key={item.view}
                onClick={() => onSwitchView(item.view)}
                className="flex items-center gap-2 px-3.5 py-1.5 text-[11.5px] font-medium cursor-pointer"
                style={{
                  color: isActive ? "var(--orange)" : "var(--text2)",
                  background: isActive ? "var(--orange-d)" : "transparent",
                  borderLeft: isActive ? "2px solid var(--orange)" : "2px solid transparent",
                  fontWeight: isActive ? 700 : 500,
                }}
                onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "var(--panel)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; } }}
                onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text2)"; } }}
              >
                <span style={{ width: 14, textAlign: "center", fontSize: 12 }} className="shrink-0">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {badgeCount > 0 && item.badgeColor && (
                  <span className="font-mono text-[8.5px] font-bold px-1 py-0.5 rounded-[2px]" style={{ background: item.badgeColor.bg, color: item.badgeColor.color }}>{badgeCount}</span>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <div className="mt-auto px-3.5 py-2.5 font-mono text-[9px]" style={{ color: "var(--text3)", borderTop: "1px solid var(--border)" }}>
        support-desk · v1.0.0
      </div>
    </aside>
  );
}
