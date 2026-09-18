"use client";

import { useEffect, useState } from "react";
import SkillTestPlayer from "./SkillTestPlayer";

// Standalone quizzes — Quiz rows with sectionId === null (formerly the
// separate SkillTest catalog). Backed by /api/student/quizzes/*.
interface SkillTestSummary {
  id: string;
  title: string;
  passingScore: number | null;
  totalQuestions: number;
}

interface SkillTestAttempt {
  id: string;
  quizId: string;
  title: string;
  score: number;
  totalQuestions: number | null;
  correctCount: number | null;
  isPassed: boolean | null;
  completedAt: string;
}

export default function SkillTestsSection() {
  const [tests, setTests] = useState<SkillTestSummary[]>([]);
  const [attempts, setAttempts] = useState<SkillTestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);

  function loadData() {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch("/api/student/quizzes/standalone", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/student/quizzes/mine", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([testsData, attemptsData]) => {
        setTests(Array.isArray(testsData) ? testsData : []);
        setAttempts(Array.isArray(attemptsData) ? attemptsData : []);
      })
      .catch(() => setError("Failed to load skill tests"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, []);

  if (activeTestId) {
    return (
      <SkillTestPlayer
        skillTestId={activeTestId}
        onExit={() => { setActiveTestId(null); loadData(); }}
      />
    );
  }

  const bestByTest = new Map<string, SkillTestAttempt>();
  for (const a of attempts) {
    const existing = bestByTest.get(a.quizId);
    if (!existing || a.score > existing.score) bestByTest.set(a.quizId, a);
  }

  return (
    <div className="flex flex-col gap-4 px-[18px] py-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { ico: "🧪", num: tests.length, lbl: "Available Tests", icoBg: "var(--orange-d)", numColor: "var(--orange)" },
          { ico: "✅", num: attempts.length, lbl: "Attempts Taken", icoBg: "var(--blue-d)", numColor: "var(--text)" },
          { ico: "🏆", num: attempts.filter((a) => a.isPassed).length, lbl: "Tests Passed", icoBg: "var(--green-d)", numColor: "var(--green)" },
          { ico: "📊", num: attempts.length ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length) + "%" : "—", lbl: "Avg Score", icoBg: "var(--panel)", numColor: "var(--text)" },
        ].map((s) => (
          <div key={s.lbl} className="bg-[var(--card)] border border-[var(--border)] rounded-[10px] px-[15px] py-[13px] flex items-center gap-3 transition-transform duration-200 hover:-translate-y-[2px] hover:shadow-[var(--sh)]">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[17px] flex-shrink-0" style={{ background: s.icoBg }}>{s.ico}</div>
            <div>
              <div className="font-['Syne',sans-serif] text-[22px] font-[800] leading-none" style={{ color: s.numColor }}>{s.num}</div>
              <div className="text-[10.5px] text-[var(--text3)] mt-[2px]">{s.lbl}</div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[var(--text3)]">{"// skill-tests"}</span>
          <span className="font-['Syne',sans-serif] text-[13.5px] font-bold text-[var(--text)]">Available Skill Tests</span>
          <span className="flex-1 h-[1px] bg-[var(--border)]" />
        </div>

        {loading ? (
          <div className="px-4 py-10 text-center font-['JetBrains_Mono',monospace] text-[11px] text-[var(--text3)]">Loading skill tests…</div>
        ) : error ? (
          <div className="px-4 py-10 text-center font-['JetBrains_Mono',monospace] text-[11px] text-[#dc2626]">{error}</div>
        ) : tests.length === 0 ? (
          <div className="px-4 py-10 text-center font-['JetBrains_Mono',monospace] text-[11px] text-[var(--text3)]">
            No skill tests are available yet. Check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {tests.map((t) => {
              const best = bestByTest.get(t.id);
              return (
                <div
                  key={t.id}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-[14px] flex flex-col gap-2.5 transition-all duration-[0.15s] hover:border-[var(--border2)] hover:shadow-[var(--sh)]"
                >
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-bold text-[var(--text)] mb-[4px] truncate">{t.title}</div>
                  </div>

                  <div className="flex items-center gap-3 font-['JetBrains_Mono',monospace] text-[9.5px] text-[var(--text3)]">
                    <span>📝 {t.totalQuestions} question{t.totalQuestions !== 1 ? "s" : ""}</span>
                    {t.passingScore != null && <span>🎯 Pass at {t.passingScore}%</span>}
                  </div>

                  {best && (
                    <div className={`flex items-center gap-1.5 font-['JetBrains_Mono',monospace] text-[9.5px] font-bold px-2.5 py-1 rounded-[6px] w-fit ${best.isPassed ? "bg-green-500/10 text-[#16a34a] dark:text-[#22c55e]" : "bg-orange-500/10 text-[#f05a1a] dark:text-[#ff6a1a]"}`}>
                      {best.isPassed ? "✓" : "•"} Best score: {best.score}%
                    </div>
                  )}

                  <button
                    onClick={() => setActiveTestId(t.id)}
                    disabled={t.totalQuestions === 0}
                    className="mt-1 px-3 py-[8px] rounded-[6px] text-[12px] font-semibold text-white bg-[var(--orange)] shadow-[0_2px_8px_rgba(240,90,26,.3)] hover:bg-[var(--orange2)] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {best ? "Retake Test →" : "Start Test →"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {attempts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[var(--text3)]">{"// history"}</span>
            <span className="font-['Syne',sans-serif] text-[13.5px] font-bold text-[var(--text)]">Past Attempts</span>
            <span className="flex-1 h-[1px] bg-[var(--border)]" />
          </div>
          <div className="flex flex-col gap-2">
            {attempts.slice(0, 10).map((a) => (
              <div key={a.id} className="bg-[var(--card)] border border-[var(--border)] rounded-[10px] px-4 py-[10px] flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-[var(--text)] truncate">{a.title}</div>
                  <div className="font-['JetBrains_Mono',monospace] text-[9px] text-[var(--text3)] mt-px">
                    {new Date(a.completedAt).toLocaleDateString()} · {a.correctCount}/{a.totalQuestions} correct
                  </div>
                </div>
                <span className={`font-['JetBrains_Mono',monospace] text-[9px] font-bold px-[8px] py-[3px] rounded-[20px] shrink-0 ${a.isPassed ? "bg-green-500/10 text-[#16a34a] dark:text-[#22c55e]" : "bg-orange-500/10 text-[#f05a1a] dark:text-[#ff6a1a]"}`}>
                  {a.score}% {a.isPassed ? "· Passed" : "· Failed"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
