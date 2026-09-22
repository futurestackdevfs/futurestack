"use client";

interface ContentManagerSidebarProps {
  activeView: string;
  onSwitchView: (view: string) => void;
  badges?: Record<string, number>;
  open?: boolean;
  onClose?: () => void;
}

interface NavItem {
  icon: string;
  label: string;
  view: string;
  badgeKey?: string;
  badgeColor?: { color: string; bg: string };
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: "Content",
    items: [
      { icon: "▣", label: "Dashboard", view: "dashboard" },
    ],
  },
  {
    group: "Data",
    items: [
      { icon: "🗄", label: "Master Data", view: "master-data", badgeKey: "courses", badgeColor: { color: "var(--blue)", bg: "var(--blue-d)" } },
    ],
  },
  {
    group: "Curriculum",
    items: [
      { icon: "📖", label: "Course Builder", view: "curriculum" },
      { icon: "🛠", label: "Project Builder", view: "project-builder" },
      { icon: "📦", label: "Resources", view: "resources" },
      { icon: "🎬", label: "Media", view: "media" },
    ],
  },
  {
    group: "Trainers",
    items: [
      { icon: "👨‍🏫", label: "Approvals", view: "trainer-approvals", badgeKey: "pendingTrainers", badgeColor: { color: "var(--amber)", bg: "var(--amber-d)" } },
      { icon: "📋", label: "All Trainers", view: "all-trainers" },
    ],
  },
  {
    group: "Moderation",
    items: [
      { icon: "💬", label: "Discussions", view: "discussions" },
    ],
  },
];

export function ContentManagerSidebar({ activeView, onSwitchView, badges = {}, open = false, onClose }: ContentManagerSidebarProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          style={{ background: "rgba(0,0,0,.4)" }}
          onClick={onClose}
        />
      )}

    <aside
      style={{ width: 208, background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      className={`fixed inset-y-0 left-0 z-40 shrink-0 overflow-y-auto flex flex-col transition-transform duration-200
        ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static md:z-auto`}
    >
      <div style={{ borderBottom: "1px solid var(--border)" }} className="px-3.5 py-2.5 flex items-center gap-2">
        <div className="w-6 h-6 rounded flex items-center justify-center text-[12px] shrink-0" style={{ background: "var(--amber-d)", color: "var(--amber)" }}>📝</div>
        <div>
          <div className="text-[10.8px] font-semibold" style={{ color: "var(--text)" }}>Content Manager</div>
          <div className="font-mono text-[8.5px]" style={{ color: "var(--text3)" }}>role::content_manager</div>
        </div>
        <button onClick={onClose} className="ml-auto w-6 h-6 flex items-center justify-center rounded md:hidden" style={{ color: "var(--text3)" }} aria-label="Close menu">✕</button>
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
                onClick={() => { onSwitchView(item.view); onClose?.(); }}
                className="flex items-center gap-2 px-3.5 py-1.5 text-[11.5px] font-medium cursor-pointer"
                style={{
                  color: isActive ? "var(--amber)" : "var(--text2)",
                  background: isActive ? "var(--amber-d)" : "transparent",
                  borderLeft: isActive ? "2px solid var(--amber)" : "2px solid transparent",
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
        v1.0.0 · BUILD 2026.08.29
      </div>
    </aside>
    </>
  );
}
