"use client";

const certificates = [
  { emoji: "🎨", bg: "bg-green-500/10", name: "HTML & CSS Mastery", meta: "Earned Apr 14, 2025", tag: "Earned", tagCls: "bg-green-500/10 text-[#16a34a] dark:text-[#22c55e]" },
  { emoji: "⚛️", bg: "bg-orange-500/10", name: "MERN Stack Development", meta: "65% complete", tag: "In Progress", tagCls: "bg-orange-500/10 text-[#f05a1a] dark:text-[#ff6a1a]" },
  { emoji: "📊", bg: "bg-[#f0f2f7] dark:bg-[#10141e]", name: "Data Science with Pandas", meta: "25% complete", tag: "Locked", tagCls: "bg-[#f0f2f7] dark:bg-[#10141e] text-[#6b7280] dark:text-[#7a859a] border border-[#e2e6ef] dark:border-[#1e2535]" },
  { emoji: "🐍", bg: "bg-[#f0f2f7] dark:bg-[#10141e]", name: "Python Programming", meta: "30% complete", tag: "Locked", tagCls: "bg-[#f0f2f7] dark:bg-[#10141e] text-[#6b7280] dark:text-[#7a859a] border border-[#e2e6ef] dark:border-[#1e2535]" },
];

const schedule = [
  { day: 18, dow: "WED", name: "MERN — React Hooks Live Q&A", meta: "10:00 AM · Aakash Verma · 90 min", tag: "Live", tagCls: "bg-green-500/10 text-[#16a34a] dark:text-[#22c55e]" },
  { day: 20, dow: "FRI", name: "Python — Chapter 6 Quiz", meta: "Due by 11:59 PM · 15 questions", tag: "Quiz", tagCls: "bg-orange-500/10 text-[#f05a1a] dark:text-[#ff6a1a]" },
  { day: 22, dow: "SUN", name: "Data Science — Assignment 2", meta: "Submit by midnight · Pandas project", tag: "Submit", tagCls: "bg-blue-500/10 text-[#2563eb] dark:text-[#3b82f6]" },
  { day: 25, dow: "WED", name: "Python — OOP Deep Dive Live", meta: "7:00 PM · Priya Joshi · 60 min", tag: "Live", tagCls: "bg-green-500/10 text-[#16a34a] dark:text-[#22c55e]" },
];

export default function CommonPanel() {
  return (
    <div className="flex flex-col bg-white dark:bg-[#161b27] border border-[#e2e6ef] dark:border-[#1e2535] rounded-[12px] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e6ef] dark:border-[#1e2535] bg-[#eef0f5] dark:bg-[#0f1219]">
        <span className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[#6b7280] dark:text-[#7a859a]">// certificates</span>
        <a href="#" className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold text-[#2563eb] dark:text-[#3b82f6] hover:underline">View all →</a>
      </div>
      {certificates.map((cert, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-[11px] border-b border-[#e2e6ef] dark:border-[#1e2535] last:border-b-0 hover:bg-[#f8f9fc] dark:hover:bg-[#1b2133] transition-colors cursor-pointer">
          <div className={`w-[30px] h-[30px] rounded-[8px] flex items-center justify-center text-[14px] shrink-0 ${cert.bg}`}>{cert.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[11.5px] font-semibold text-[#111827] dark:text-[#e8eaf0] truncate">{cert.name}</div>
            <div className="font-['JetBrains_Mono',monospace] text-[8.5px] text-[#6b7280] dark:text-[#7a859a] mt-px">{cert.meta}</div>
          </div>
          <span className={`font-['JetBrains_Mono',monospace] text-[8px] font-bold px-[8px] py-[2px] rounded-[20px] shrink-0 ${cert.tagCls}`}>{cert.tag}</span>
        </div>
      ))}

      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e6ef] dark:border-[#1e2535] bg-[#eef0f5] dark:bg-[#0f1219]">
        <span className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[#6b7280] dark:text-[#7a859a]">// schedule</span>
        <a href="#" className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold text-[#2563eb] dark:text-[#3b82f6] hover:underline">View all →</a>
      </div>
      {schedule.map((s, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-[11px] border-b border-[#e2e6ef] dark:border-[#1e2535] last:border-b-0 hover:bg-[#f8f9fc] dark:hover:bg-[#1b2133] transition-colors cursor-pointer">
          <div className="text-center shrink-0 w-[36px]">
            <div className="font-['Syne',sans-serif] text-[15px] font-bold text-[#111827] dark:text-[#e8eaf0] leading-none">{s.day}</div>
            <div className="font-['JetBrains_Mono',monospace] text-[7.5px] text-[#6b7280] dark:text-[#7a859a] uppercase">{s.dow}</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11.5px] font-semibold text-[#111827] dark:text-[#e8eaf0] truncate">{s.name}</div>
            <div className="font-['JetBrains_Mono',monospace] text-[8.5px] text-[#6b7280] dark:text-[#7a859a] mt-px">{s.meta}</div>
          </div>
          <span className={`font-['JetBrains_Mono',monospace] text-[8px] font-bold px-[8px] py-[2px] rounded-[20px] shrink-0 ${s.tagCls}`}>{s.tag}</span>
        </div>
      ))}
    </div>
  );
}
