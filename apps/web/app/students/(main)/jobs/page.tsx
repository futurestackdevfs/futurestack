"use client";

const jobs = [
  { title: "Full Stack Developer", company: "TechCorp India", location: "Bangalore", salary: "₹12-18 LPA", type: "Full-time", skills: ["MERN", "React", "Node.js"], color: "#2563eb", posted: "2d ago" },
  { title: "Python Developer", company: "DataMinds Pvt Ltd", location: "Hyderabad", salary: "₹10-15 LPA", type: "Full-time", skills: ["Python", "Django", "SQL"], color: "#16a34a", posted: "3d ago" },
  { title: "DevOps Engineer", company: "CloudBase Solutions", location: "Pune", salary: "₹14-20 LPA", type: "Full-time", skills: ["Docker", "K8s", "AWS"], color: "#ef4444", posted: "1d ago" },
  { title: "ML Engineer", company: "AI Labs Inc", location: "Remote", salary: "₹18-25 LPA", type: "Remote", skills: ["ML", "Python", "TensorFlow"], color: "#7c3aed", posted: "5d ago" },
  { title: "Frontend Developer", company: "WebStudio Agency", location: "Mumbai", salary: "₹8-14 LPA", type: "Full-time", skills: ["React", "CSS", "TypeScript"], color: "#f59e0b", posted: "Today" },
  { title: "Data Analyst", company: "Insight Analytics", location: "Delhi", salary: "₹7-12 LPA", type: "Internship", skills: ["SQL", "Python", "Tableau"], color: "#14b8a6", posted: "4d ago" },
  { title: "Backend Developer", company: "ServerStack Tech", location: "Bangalore", salary: "₹15-22 LPA", type: "Full-time", skills: ["Node.js", "PostgreSQL", "Redis"], color: "#3b82f6", posted: "1w ago" },
  { title: "Cloud Architect", company: "NetSolutions Ltd", location: "Chennai", salary: "₹20-30 LPA", type: "Full-time", skills: ["AWS", "Azure", "Terraform"], color: "#f97316", posted: "6d ago" },
];

export default function JobsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-['Syne'] text-2xl font-bold text-[var(--text)]">Jobs</h1>
            <p className="text-sm text-[var(--muted)]">Exclusive opportunities from 2,000+ hiring partners</p>
          </div>
          <input type="text" placeholder="Search jobs..." className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-xs text-[var(--text)] outline-none focus:border-[var(--blue)]" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((j) => (
            <div key={`${j.title}-${j.company}`} className="group cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold text-white" style={{ background: j.color }}>{j.title[0]}</div>
                  <div>
                    <div className="text-sm font-bold text-[var(--text)]">{j.title}</div>
                    <div className="text-[11px] text-[var(--muted)]">{j.company} · {j.location}</div>
                  </div>
                </div>
                <span className="rounded-full bg-[var(--bg)] px-2 py-0.5 text-[9px] font-medium text-[var(--muted)]">{j.posted}</span>
              </div>

              <div className="mb-3 flex items-center gap-3 text-[11px]">
                <span className="rounded-md bg-[var(--bg)] px-2 py-1 font-semibold text-[var(--orange)]">{j.salary}</span>
                <span className="text-[var(--muted)]">{j.type}</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {j.skills.map((s) => (
                  <span key={s} className="rounded-md px-2 py-0.5 text-[10px] font-medium" style={{ background: `${j.color}12`, color: j.color }}>{s}</span>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <button className="flex-1 rounded-lg bg-[var(--blue)] py-2 text-xs font-bold text-white transition-all hover:opacity-90">Apply Now</button>
                <button className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs font-medium text-[var(--text)] transition-all hover:border-[var(--orange)]">Save</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
