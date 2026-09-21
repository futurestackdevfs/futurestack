"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import SkillTestPlayer from "./SkillTestPlayer";
import type { EnrolledCourse } from "../../hooks/student-dashboard";

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

export default function SkillTestsSection({ enrolledCourses, onOpenCourse }: { enrolledCourses: EnrolledCourse[]; onOpenCourse: (courseId: string) => void }) {
  const [tests, setTests] = useState<SkillTestSummary[]>([]);
  const [attempts, setAttempts] = useState<SkillTestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const { data: cards } = useSWR<{ data: { id: string; title: string; category: string; quizCount?: number; questionCount?: number }[] }>("/api/courses/public/cards?page=1&perPage=100");
  const enrolledById = new Map(enrolledCourses.map((c) => [c.courseId, c]));
  // Only courses that actually have tests; enrolled ones lead.
  const courseTiles = (cards?.data ?? [])
    .filter((c) => (c.quizCount ?? 0) > 0)
    .sort((a, b) => Number(enrolledById.has(b.id)) - Number(enrolledById.has(a.id)));

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

        {courseTiles.length === 0 ? (
          <div className="px-4 py-10 text-center font-['JetBrains_Mono',monospace] text-[11px] text-[var(--text3)]">No courses with skill tests yet.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {courseTiles.map((c) => {
              const enrolled = enrolledById.get(c.id);
              const locked = !enrolled;
              const questions = c.questionCount ?? 0;
              const tests = c.quizCount ?? 0;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={locked}
                  onClick={() => enrolled && onOpenCourse(enrolled.courseId)}
                  className={`w-full text-left bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 flex items-center gap-3 transition-all duration-[0.15s] ${locked ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-[var(--orange)] hover:shadow-[var(--sh)]"}`}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[17px] flex-shrink-0" style={{ background: locked ? "var(--panel)" : "var(--orange-d)" }}>{locked ? "🔒" : "🧪"}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-[var(--text)] truncate">{c.title}</div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-[3px] font-['JetBrains_Mono',monospace] text-[9.5px] text-[var(--text3)]">
                      <span className="uppercase tracking-[.05em]">{c.category}</span>
                      <span>📝 {questions} question{questions !== 1 ? "s" : ""}</span>
                      <span>🧪 {tests} test{tests !== 1 ? "s" : ""}</span>
                      {enrolled && <span>{enrolled.progressPercent}% done</span>}
                    </div>
                    {enrolled && (
                      <div className="h-[3px] bg-[var(--border)] rounded-full overflow-hidden mt-2 max-w-[260px]">
                        <div className="h-full rounded-full bg-[var(--orange)]" style={{ width: `${enrolled.progressPercent}%` }} />
                      </div>
                    )}
                  </div>
                  <span className={`shrink-0 font-['JetBrains_Mono',monospace] text-[10px] font-bold ${locked ? "text-[var(--text3)]" : "text-[var(--orange)]"}`}>
                    {locked ? "🔒 Enroll to unlock" : enrolled.progressPercent > 0 ? "Continue →" : "Start →"}
                  </span>
                </button>
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
