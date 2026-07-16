import Link from "next/link";

const actionLinks: Record<string, string> = {
  "Enroll Now": "/courses",
  "Skill Test": "/skill-tests",
  "Live Classes": "/live-classes",
  "Downloads": "/my-dashboard",
  "Certificates": "/certificates",
  "Ask Doubt": "/my-dashboard",
};

export function QuickActions() {
  const actions = [
    { icon: "📝", label: "Enroll Now" },
    { icon: "🎯", label: "Skill Test" },
    { icon: "📺", label: "Live Classes" },
    { icon: "⬇️", label: "Downloads" },
    { icon: "🏅", label: "Certificates" },
    { icon: "❓", label: "Ask Doubt" },
  ];

  return (
    <div>
      <div className="font-['Syne'] text-[14px] font-bold text-[var(--text)] flex justify-between items-center mb-3">Quick Actions</div>
      <div className="grid grid-cols-4 gap-1.5">
        {actions.map((a) => (
          <Link key={a.label} href={actionLinks[a.label]} className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-1.5 py-2.5 text-center text-[10px] font-medium text-[var(--muted)] hover:border-[var(--orange)] hover:bg-[var(--card-hover)] hover:text-[var(--text)] no-underline">
            <div className="text-lg">{a.icon}</div>
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
