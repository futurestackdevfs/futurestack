"use client";

interface AdminSidebarProps {
  activeView: string;
  onSwitchView: (view: string) => void;
}

interface NavItem {
  icon: string;
  label: string;
  badge?: { text: string; color: string; bg: string };
  view?: string;
}

interface RoleCard {
  icon: string;
  label: string;
  bg: string;
  color: string;
  view: string;
}

const roles: RoleCard[] = [
  { icon: "📞", label: "Sales", bg: "var(--orange-d)", color: "var(--orange)", view: "sales" },
  { icon: "🗂", label: "Coordinator", bg: "var(--blue-d)", color: "var(--blue)", view: "coordinator" },
  { icon: "🎧", label: "Support", bg: "var(--green-d)", color: "var(--green)", view: "support" },
  { icon: "🎓", label: "Trainer", bg: "var(--purple-d)", color: "var(--purple)", view: "trainer" },
  { icon: "📝", label: "Content Manager", bg: "var(--pink-d)", color: "var(--pink)", view: "content-manager" },
  { icon: "⚙", label: "Platform Admin", bg: "rgba(219,39,119,.1)", color: "#db2777", view: "admin-dashboard" },
];

const adminNav: NavItem[] = [
  { icon: "▣", label: "Dashboard", view: "admin-dashboard" },
  { icon: "👤", label: "User Accounts", view: "users" },
  { icon: "🖥", label: "System Health" },
  { icon: "🚨", label: "Escalations", badge: { text: "2", color: "var(--red)", bg: "var(--red-d)" } },
  { icon: "💾", label: "Backups" },
  { icon: "🔌", label: "Integrations" },
];

const configNav: NavItem[] = [
  { icon: "🗄", label: "Master Data", badge: { text: "6", color: "var(--orange)", bg: "var(--orange-d)" }, view: "master-data" },
  { icon: "⭐", label: "Featured Content", view: "featured" },
  { icon: "⚙", label: "Payment Settings", view: "payment-settings" },
];

const reportNav: NavItem[] = [
  { icon: "▦", label: "Audit Log" },
  { icon: "▧", label: "Data Reports" },
];

export function AdminSidebar({ activeView, onSwitchView }: AdminSidebarProps) {
  return (
    <aside
      style={{ width: 208, background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      className="shrink-0 overflow-y-auto flex flex-col"
    >
      {/* Role Consoles */}
      <div style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="font-mono text-[9px] font-semibold uppercase tracking-widest px-3.5 pt-2.5 pb-1" style={{ color: "var(--text3)" }}>
          Role Consoles
        </div>
        <div className="px-2 pb-1.5">
          {roles.map((r) => {
            const isActive = activeView === r.view;
            return (
              <div key={r.view}
                onClick={() => onSwitchView(r.view)}
                className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer mb-0.5"
                style={{ background: isActive ? "var(--orange-d)" : "transparent" }}
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--panel)"; }}
                onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <div className="w-6 h-6 rounded flex items-center justify-center text-[12px] shrink-0" style={{ background: r.bg, color: r.color }}>{r.icon}</div>
                <span className="text-[10.8px] font-semibold" style={{ color: isActive ? "var(--orange)" : "var(--text2)" }}>{r.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin Console */}
      <div style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="font-mono text-[9px] font-semibold uppercase tracking-widest px-3.5 pt-2.5 pb-1" style={{ color: "var(--text3)" }}>
          Admin Console
        </div>
        {adminNav.map((item, i) => {
          const isActive = activeView === item.view;
          return (
            <div key={i}
              onClick={() => item.view && onSwitchView(item.view)}
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
              {item.badge && (
                <span className="font-mono text-[8.5px] font-bold px-1 py-0.5 rounded-[2px]" style={{ background: item.badge.bg, color: item.badge.color }}>{item.badge.text}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Configuration */}
      <div style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="font-mono text-[9px] font-semibold uppercase tracking-widest px-3.5 pt-2.5 pb-1" style={{ color: "var(--text3)" }}>
          Configuration
        </div>
        {configNav.map((item, i) => {
          const isActive = activeView === item.view;
          return (
            <div key={i}
              onClick={() => item.view && onSwitchView(item.view)}
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
              {item.badge && (
                <span className="font-mono text-[8.5px] font-bold px-1 py-0.5 rounded-[2px]" style={{ background: item.badge.bg, color: item.badge.color }}>{item.badge.text}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Reports */}
      <div>
        <div className="font-mono text-[9px] font-semibold uppercase tracking-widest px-3.5 pt-2.5 pb-1" style={{ color: "var(--text3)" }}>
          Reports
        </div>
        {reportNav.map((item, i) => (
          <div key={i}
            className="flex items-center gap-2 px-3.5 py-1.5 text-[11.5px] font-medium"
            style={{ color: "var(--text2)", borderLeft: "2px solid transparent", cursor: "default" }}
          >
            <span style={{ width: 14, textAlign: "center", fontSize: 12 }} className="shrink-0">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-auto px-3.5 py-2.5 font-mono text-[9px]" style={{ color: "var(--text3)", borderTop: "1px solid var(--border)" }}>
        v1.0.0 · BUILD 2026.06.17
      </div>
    </aside>
  );
}
