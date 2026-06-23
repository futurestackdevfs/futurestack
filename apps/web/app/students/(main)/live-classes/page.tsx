"use client";

const classes = [
  { title: "React Hooks Deep Dive", instructor: "Aakash Sharma", date: "Today", time: "4:00 PM", duration: "1h 30m", slots: "120/200", level: "Intermediate", color: "#2563eb" },
  { title: "Python OOP Concepts", instructor: "Priya Mehta", date: "Today", time: "6:30 PM", duration: "1h", slots: "85/150", level: "Beginner", color: "#16a34a" },
  { title: "ML Model Deployment", instructor: "Dr. Arjun Singh", date: "Tomorrow", time: "10:00 AM", duration: "2h", slots: "60/100", level: "Advanced", color: "#7c3aed" },
  { title: "Docker & Kubernetes Workshop", instructor: "Rahul Verma", date: "Tomorrow", time: "2:00 PM", duration: "2h 30m", slots: "45/80", level: "Advanced", color: "#ef4444" },
  { title: "CSS Animations Masterclass", instructor: "Sneha Patel", date: "Wed, 24 Jun", time: "11:00 AM", duration: "1h", slots: "90/150", level: "Intermediate", color: "#f59e0b" },
  { title: "Database Design Patterns", instructor: "Aakash Sharma", date: "Thu, 25 Jun", time: "5:00 PM", duration: "1h 30m", slots: "30/100", level: "Advanced", color: "#14b8a6" },
];

export default function LiveClassesPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] pt-[56px]">
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-['Syne'] text-2xl font-bold text-[var(--text)]">Live Classes</h1>
            <p className="text-sm text-[var(--muted)]">Join interactive sessions with expert instructors</p>
          </div>
          <button className="rounded-lg bg-[var(--orange)] px-4 py-2 text-xs font-bold text-white transition-all hover:opacity-90">View Schedule</button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <div key={`${c.title}-${c.date}`} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow)] transition-all hover:shadow-[var(--shadow-lg)]">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg text-lg" style={{ background: `${c.color}15` }}>📺</div>
                  <div>
                    <div className="text-sm font-bold text-[var(--text)]">{c.title}</div>
                    <div className="text-[10px] text-[var(--muted)]">{c.instructor}</div>
                  </div>
                </div>
                <span className="rounded-full bg-[var(--bg)] px-2 py-0.5 text-[9px] font-semibold text-[var(--muted)]">{c.level}</span>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg bg-[var(--bg)] p-2"><span className="block text-[9px] font-semibold text-[var(--muted)]">Date</span><span className="font-medium text-[var(--text)]">{c.date}</span></div>
                <div className="rounded-lg bg-[var(--bg)] p-2"><span className="block text-[9px] font-semibold text-[var(--muted)]">Time</span><span className="font-medium text-[var(--text)]">{c.time}</span></div>
                <div className="rounded-lg bg-[var(--bg)] p-2"><span className="block text-[9px] font-semibold text-[var(--muted)]">Duration</span><span className="font-medium text-[var(--text)]">{c.duration}</span></div>
                <div className="rounded-lg bg-[var(--bg)] p-2"><span className="block text-[9px] font-semibold text-[var(--muted)]">Seats</span><span className="font-medium text-[var(--text)]">{c.slots}</span></div>
              </div>

              <button className="w-full rounded-lg bg-[var(--blue)] py-2 text-xs font-bold text-white transition-all hover:opacity-90">Join Class</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
