"use client";

import { useRouter } from "next/navigation";

interface RoleCard {
  icon: string;
  label: string;
  bg: string;
  color: string;
  href: string;
}

const ROLES: RoleCard[] = [
  { icon: "📞", label: "Sales", bg: "var(--orange-d)", color: "var(--orange)", href: "/ops/sales" },
  { icon: "🗂", label: "Coordinator", bg: "var(--blue-d)", color: "var(--blue)", href: "/ops/coordinator" },
  { icon: "🎧", label: "Support / Trainer / Admin", bg: "var(--green-d)", color: "var(--green)", href: "/ops/support" },
  { icon: "🎓", label: "Trainer", bg: "var(--purple-d)", color: "var(--purple)", href: "/ops/trainer" },
  { icon: "⚙", label: "Platform Admin", bg: "rgba(219,39,119,.1)", color: "#db2777", href: "/ops/admin" },
];

interface NavItem {
  icon: string;
  label: string;
}

interface OpsSidebarProps {
  activeRole: string;
  navItems: { group: string; items: NavItem[] }[];
  version?: string;
}

export function OpsSidebar({ activeRole, navItems,   version = "v1.0.0 · BUILD 2026.06.17" }: OpsSidebarProps) {
  const router = useRouter();

  return (
    <aside
      style={{ width: 208, background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      className="shrink-0 overflow-y-auto flex flex-col"
    >
      <div style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="font-mono text-[9px] font-semibold uppercase tracking-widest px-3.5 pt-2.5 pb-1" style={{ color: "var(--text3)" }}>
          Role Consoles
        </div>
        <div className="px-2 pb-1.5">
          {ROLES.map((r) => (
            <div
              key={r.href}
              onClick={() => router.push(r.href)}
              className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer mb-0.5"
              style={{ background: activeRole === r.href ? "var(--orange-d)" : "transparent" }}
              onMouseEnter={(e) => { if (activeRole !== r.href) (e.currentTarget as HTMLElement).style.background = "var(--panel)"; }}
              onMouseLeave={(e) => { if (activeRole !== r.href) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <div className="w-6 h-6 rounded flex items-center justify-center text-[12px] shrink-0" style={{ background: r.bg, color: r.color }}>{r.icon}</div>
              <span className="text-[10.8px] font-semibold" style={{ color: activeRole === r.href ? "var(--orange)" : "var(--text2)" }}>{r.label}</span>
            </div>
          ))}
        </div>
      </div>

      {navItems.map((group, gi) => (
        <div key={gi} style={gi < navItems.length - 1 ? { borderBottom: "1px solid var(--border)" } : {}}>
          <div className="font-mono text-[9px] font-semibold uppercase tracking-widest px-3.5 pt-2.5 pb-1" style={{ color: "var(--text3)" }}>
            {group.group}
          </div>
          {group.items.map((item, ii) => (
            <div key={ii}
              className="flex items-center gap-2 px-3.5 py-1.5 text-[11.5px] font-medium cursor-pointer"
              style={{ color: "var(--text2)", borderLeft: "2px solid transparent" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--panel)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text2)"; }}
            >
              <span style={{ width: 14, textAlign: "center", fontSize: 12 }} className="shrink-0">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
            </div>
          ))}
        </div>
      ))}

      <div className="mt-auto px-3.5 py-2.5 font-mono text-[9px]" style={{ color: "var(--text3)", borderTop: "1px solid var(--border)" }}>
        {version}
      </div>
    </aside>
  );
}
