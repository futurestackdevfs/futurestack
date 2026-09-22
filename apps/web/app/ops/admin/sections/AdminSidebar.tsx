"use client";

interface AdminSidebarProps {
  activeView: string;
  onSwitchView: (view: string) => void;
  open?: boolean;
  onClose?: () => void;
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
  { icon: "💵", label: "Payments", view: "payments" },
  { icon: "💸", label: "Refunds", view: "refunds" },
  { icon: "📋", label: "Enrollments", view: "enrollments" },
  { icon: "👤", label: "User Accounts", view: "users" },
  { icon: "🖥", label: "System Health", view: "system-health" },
  { icon: "🚨", label: "Escalations", badge: { text: "2", color: "var(--red)", bg: "var(--red-d)" } },
  { icon: "💾", label: "Backups" },
  { icon: "🔌", label: "Integrations", view: "integrations" },
];

const configNav: NavItem[] = [
  { icon: "🗄", label: "Master Data", badge: { text: "6", color: "var(--orange)", bg: "var(--orange-d)" }, view: "master-data" },
  { icon: "⭐", label: "Featured Content", view: "featured" },
  { icon: "⚙", label: "Payment Settings", view: "payment-settings" },
  { icon: "📄", label: "Pages", view: "pages" },
];

const reportNav: NavItem[] = [
  { icon: "▦", label: "Audit Log", view: "audit-log" },
  { icon: "▧", label: "Data Reports" },
];

export function AdminSidebar({ activeView, onSwitchView, open = false, onClose }: AdminSidebarProps) {
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
      {/* Role Consoles */}
      <div style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="font-mono text-[9px] font-semibold uppercase tracking-widest px-3.5 pt-2.5 pb-1 flex items-center justify-between" style={{ color: "var(--text3)" }}>
          Role Consoles
          <button onClick={onClose} className="w-5 h-5 flex items-center justify-center rounded md:hidden normal-case" style={{ color: "var(--text3)" }} aria-label="Close menu">✕</button>
        </div>
        <div className="px-2 pb-1.5">
          {roles.map((r) => {
            const isActive = activeView === r.view;
            return (
              <div key={r.view}
                onClick={() => { onSwitchView(r.view); onClose?.(); }}
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
              onClick={() => { if (item.view) { onSwitchView(item.view); onClose?.(); } }}
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
              onClick={() => { if (item.view) { onSwitchView(item.view); onClose?.(); } }}
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
        {reportNav.map((item, i) => {
          const isActive = activeView === item.view;
          return (
            <div key={i}
              onClick={() => item.view && onSwitchView(item.view)}
              className="flex items-center gap-2 px-3.5 py-1.5 text-[11.5px] font-medium"
              style={{
                color: isActive ? "var(--orange)" : "var(--text2)",
                background: isActive ? "var(--orange-d)" : "transparent",
                borderLeft: isActive ? "2px solid var(--orange)" : "2px solid transparent",
                fontWeight: isActive ? 700 : 500,
                cursor: item.view ? "pointer" : "default",
              }}
              onMouseEnter={(e) => { if (!isActive && item.view) { (e.currentTarget as HTMLElement).style.background = "var(--panel)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; } }}
              onMouseLeave={(e) => { if (!isActive && item.view) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text2)"; } }}
            >
              <span style={{ width: 14, textAlign: "center", fontSize: 12 }} className="shrink-0">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-auto px-3.5 py-2.5 font-mono text-[9px]" style={{ color: "var(--text3)", borderTop: "1px solid var(--border)" }}>
        v1.0.0 · BUILD 2026.06.17
      </div>
    </aside>
    </>
  );
}
