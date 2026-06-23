interface WelcomeStripProps {
  name: string;
  dateLabel: string;
  currentCourse: string;
  progressPct: number;
  targetDate: string;
  xpTotal: number;
  streakDays: number;
  certificates: number;
}

export function WelcomeStrip({
  name,
  dateLabel,
  currentCourse,
  progressPct,
  targetDate,
  xpTotal,
  streakDays,
  certificates,
}: WelcomeStripProps) {
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl p-5 text-white flex items-center justify-between">
      <div>
        <p className="text-sm text-indigo-200">{dateLabel}</p>
        <h1 className="text-2xl font-bold mt-1">Welcome back, {name}!</h1>
        <p className="text-sm text-indigo-200 mt-1">
          Continue where you left off — <span className="font-semibold text-white">{currentCourse}</span>
        </p>
      </div>
      <div className="flex gap-6 text-center">
        <div>
          <p className="text-2xl font-bold">{xpTotal}</p>
          <p className="text-xs text-indigo-200">Total XP</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{streakDays}</p>
          <p className="text-xs text-indigo-200">Day Streak</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{certificates}</p>
          <p className="text-xs text-indigo-200">Certificates</p>
        </div>
      </div>
    </div>
  );
}
