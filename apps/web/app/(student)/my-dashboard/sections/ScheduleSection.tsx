"use client";

const schedule = [
  { day: 31, dn: "WED", title: "React Hooks Deep Dive", meta: "10:00 AM — 12:00 PM · by Aakash", tag: "LIVE", tc: "text-green-500 dark:text-green-400 bg-green-500/10" },
  { day: 1, dn: "THU", title: "Python Quiz · Chapter 3", meta: "Due by 11:59 PM", tag: "QUIZ", tc: "text-[#f05a1a] dark:text-[#ff6a1a] bg-orange-500/10" },
  { day: 2, dn: "FRI", title: "Node.js Auth — Live Session", meta: "2:00 PM — 4:00 PM · by Dr. Mehta", tag: "LIVE", tc: "text-green-500 dark:text-green-400 bg-green-500/10" },
  { day: 5, dn: "MON", title: "MERN Project Submission", meta: "Final deadline", tag: "SUBMIT", tc: "text-[#3b82f6] dark:text-[#60a5fa] bg-blue-500/10" },
];

const weeklySchedule = [
  { day: "Mon", events: [{ time: "10:00 AM", title: "React Hooks Deep Dive", type: "Live Class" }, { time: "2:00 PM", title: "MERN Doubt Session", type: "Office Hours" }] },
  { day: "Tue", events: [{ time: "9:00 AM", title: "Python Coding Practice", type: "Self Study" }, { time: "3:00 PM", title: "Data Science Mentor Call", type: "Mentoring" }] },
  { day: "Wed", events: [{ time: "10:00 AM", title: "Node.js Auth — Live Session", type: "Live Class" }, { time: "1:00 PM", title: "Group Project Sync", type: "Meeting" }] },
  { day: "Thu", events: [{ time: "11:59 PM", title: "Python Quiz · Chapter 3", type: "Quiz Deadline" }] },
  { day: "Fri", events: [{ time: "2:00 PM", title: "Weekend Assignment Release", type: "Assignment" }, { time: "4:00 PM", title: "Career Prep Workshop", type: "Workshop" }] },
  { day: "Sat", events: [] },
  { day: "Sun", events: [] },
];

export default function ScheduleSection() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[#6b7280] dark:text-[#7a859a]">// schedule</span>
        <span className="font-['Syne',sans-serif] text-[15px] font-bold text-[#111827] dark:text-[#e8eaf0]">Upcoming Schedule</span>
        <div className="flex-1 h-px bg-[#e2e6ef] dark:bg-[#1e2535]"></div>
      </div>

      {/* Weekly Calendar */}
      <div className="bg-white dark:bg-[#161b27] border border-[#e2e6ef] dark:border-[#1e2535] rounded-[12px] overflow-hidden">
        <div className="grid grid-cols-7 divide-x divide-[#e2e6ef] dark:divide-[#1e2535]">
          {weeklySchedule.map((day) => (
            <div key={day.day} className="min-h-[140px]">
              <div className="px-2.5 py-2 text-center font-['JetBrains_Mono',monospace] text-[10px] font-semibold text-[#6b7280] dark:text-[#7a859a] border-b border-[#e2e6ef] dark:border-[#1e2535] bg-[#f8f9fc] dark:bg-[#0f1219]">
                {day.day}
              </div>
              <div className="p-1.5 flex flex-col gap-1">
                {day.events.length === 0 && (
                  <div className="text-[9px] text-[#6b7280] dark:text-[#7a859a] text-center py-3 font-['JetBrains_Mono',monospace]">—</div>
                )}
                {day.events.map((ev, i) => (
                  <div key={i} className="bg-[#f4f6fa] dark:bg-[#0b0e14] border border-[#e2e6ef] dark:border-[#1e2535] rounded-[5px] p-1.5 cursor-pointer hover:border-[#f05a1a] dark:hover:border-[#ff6a1a] transition-all">
                    <div className="text-[9px] font-semibold text-[#111827] dark:text-[#e8eaf0] leading-tight truncate">{ev.title}</div>
                    <div className="font-['JetBrains_Mono',monospace] text-[7.5px] text-[#6b7280] dark:text-[#7a859a]">{ev.time}</div>
                    <div className="font-['JetBrains_Mono',monospace] text-[7px] text-[#3b82f6] dark:text-[#60a5fa] mt-0.5">{ev.type}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Events List */}
      <div className="bg-white dark:bg-[#161b27] border border-[#e2e6ef] dark:border-[#1e2535] rounded-[12px] overflow-hidden mt-2">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e6ef] dark:border-[#1e2535] bg-[#eef0f5] dark:bg-[#0f1219]">
          <span className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[#6b7280] dark:text-[#7a859a]">// upcoming events</span>
        </div>
        {schedule.map((s, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-[11px] border-b border-[#e2e6ef] dark:border-[#1e2535] last:border-b-0 hover:bg-[#f8f9fc] dark:hover:bg-[#1b2133] transition-colors cursor-pointer">
            <div className="text-center shrink-0 w-[36px]">
              <div className="font-['Syne',sans-serif] text-[15px] font-bold text-[#111827] dark:text-[#e8eaf0] leading-none">{s.day}</div>
              <div className="font-['JetBrains_Mono',monospace] text-[7.5px] text-[#6b7280] dark:text-[#7a859a] uppercase">{s.dn}</div>
            </div>
            <div className="w-px h-8 bg-[#e2e6ef] dark:bg-[#1e2535] shrink-0"></div>
            <div className="flex-1 min-w-0">
              <div className="text-[11.5px] font-semibold text-[#111827] dark:text-[#e8eaf0] truncate">{s.title}</div>
              <div className="font-['JetBrains_Mono',monospace] text-[8.5px] text-[#6b7280] dark:text-[#7a859a] mt-px">{s.meta}</div>
            </div>
            <span className={`font-['JetBrains_Mono',monospace] text-[8.5px] font-semibold px-[7px] py-[2px] rounded-[3px] shrink-0 ${s.tc}`}>{s.tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
