"use client";

import { useEffect, useRef, useState } from "react";

interface TestQuestion {
  id: string;
  question: string;
  options: string[];
}

interface TestDetail {
  quizId: string;
  title: string;
  passingScore: number | null;
  hasQuestions: boolean;
  questions: TestQuestion[];
}

interface QuestionBreakdown {
  questionId: string;
  question: string;
  options: string[];
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  explanation: string | null;
}

interface SubmitResult {
  score: number;
  totalQuestions: number;
  correctCount: number;
  passed: boolean | null;
  passingScore: number | null;
  breakdown?: QuestionBreakdown[];
}

interface SkillTestPlayerProps {
  skillTestId: string;
  onExit: () => void;
}

// Plays a standalone Quiz (sectionId === null) — formerly a "SkillTest".
// Backed by the Quiz APIs under /api/student/quizzes/:quizId/*.
export default function SkillTestPlayer({ skillTestId, onExit }: SkillTestPlayerProps) {
  const [test, setTest] = useState<TestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/student/quizzes/${skillTestId}/questions`, { credentials: "same-origin" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load test");
        return r.json();
      })
      .then((data: TestDetail) => {
        setTest(data);
      })
      .catch(() => setError("Failed to load this skill test. Please try again."))
      .finally(() => setLoading(false));
  }, [skillTestId]);

  async function handleSubmit() {
    if (!test || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const payload = {
        answers: test.questions.map((q) => ({
          questionId: q.id,
          selectedIndex: answers[q.id] ?? -1,
        })),
      };
      const res = await fetch(`/api/student/quizzes/${skillTestId}/submit`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Submit failed");
      const data: SubmitResult = await res.json();
      setResult(data);
    } catch {
      setError("Failed to submit the test. Please try again.");
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  function selectOption(questionId: string, idx: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: idx }));
  }

  function retake() {
    setResult(null);
    setAnswers({});
    setCurrent(0);
    submittedRef.current = false;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-[60px] px-6 text-center">
        <div className="font-mono text-[11px]" style={{ color: "var(--text3)" }}>Loading test…</div>
      </div>
    );
  }

  if (error && !test) {
    return (
      <div className="flex flex-col items-center justify-center py-[60px] px-6 text-center gap-3">
        <div className="text-[13px] font-semibold" style={{ color: "#dc2626" }}>{error}</div>
        <button onClick={onExit} className="px-4 py-[8px] rounded-[6px] text-[12px] font-semibold text-white bg-[var(--orange)] hover:bg-[var(--orange2)] transition-all cursor-pointer">
          ← Back to Skill Tests
        </button>
      </div>
    );
  }

  if (!test) return null;

  if (result) {
    return (
      <div className="flex flex-col gap-4 px-[18px] py-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-6 py-8 flex flex-col items-center text-center gap-3">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-[28px]"
            style={{ background: result.passed ? "var(--green-d)" : "var(--orange-d)" }}
          >
            {result.passed ? "🏆" : "📊"}
          </div>
          <div className="font-['Syne',sans-serif] text-[26px] font-[800]" style={{ color: result.passed ? "var(--green)" : "var(--orange)" }}>
            {result.score}%
          </div>
          <div className="text-[14px] font-bold" style={{ color: "var(--text)" }}>
            {result.passed ? "You passed! 🎉" : "Not quite — keep practicing"}
          </div>
          <div className="font-mono text-[11px]" style={{ color: "var(--text3)" }}>
            {result.correctCount} / {result.totalQuestions} correct
            {result.passingScore != null ? ` · Passing score: ${result.passingScore}%` : ""}
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={retake} className="px-4 py-[8px] rounded-[6px] text-[12px] font-semibold text-white bg-[var(--orange)] hover:bg-[var(--orange2)] transition-all cursor-pointer">
              ↻ Retake Test
            </button>
            <button onClick={onExit} className="px-4 py-[8px] rounded-[6px] text-[12px] font-semibold border border-[var(--border2)] text-[var(--text2)] hover:border-[var(--blue)] hover:text-[var(--blue)] transition-all cursor-pointer">
              ← Back to Skill Tests
            </button>
          </div>
        </div>

        {result.breakdown && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-['JetBrains_Mono',monospace] text-[9px] font-semibold uppercase tracking-[.1em] text-[var(--text3)]">{"// review"}</span>
              <span className="font-['Syne',sans-serif] text-[13.5px] font-bold text-[var(--text)]">Answer Breakdown</span>
              <span className="flex-1 h-[1px] bg-[var(--border)]" />
            </div>
            <div className="flex flex-col gap-2.5">
              {result.breakdown.map((q, i) => (
                <div
                  key={q.questionId}
                  className={`bg-[var(--card)] border rounded-xl px-4 py-[14px] ${q.isCorrect ? "border-l-[3px] border-l-[var(--green)]" : "border-l-[3px] border-l-[#dc2626]"}`}
                  style={{ borderTopColor: "var(--border)", borderRightColor: "var(--border)", borderBottomColor: "var(--border)" }}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span className="font-['JetBrains_Mono',monospace] text-[9px] font-bold shrink-0 mt-[2px]" style={{ color: "var(--text3)" }}>Q{i + 1}</span>
                    <div className="text-[12.5px] font-semibold" style={{ color: "var(--text)" }}>{q.question}</div>
                  </div>
                  <div className="flex flex-col gap-1.5 ml-[22px]">
                    {q.options.map((opt, oi) => {
                      const isSelected = oi === q.selectedIndex;
                      const isCorrectOpt = oi === q.correctIndex;
                      return (
                        <div
                          key={oi}
                          className="text-[11px] px-2.5 py-[6px] rounded-[6px] flex items-center gap-2"
                          style={{
                            background: isCorrectOpt ? "var(--green-d)" : isSelected ? "rgba(220,38,38,.08)" : "var(--panel)",
                            color: isCorrectOpt ? "var(--green)" : isSelected ? "#dc2626" : "var(--text2)",
                          }}
                        >
                          <span>{isCorrectOpt ? "✓" : isSelected ? "✕" : "○"}</span>
                          <span>{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && (
                    <div className="ml-[22px] mt-2 text-[10.5px] font-mono" style={{ color: "var(--text3)" }}>
                      💡 {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const q = test.questions[current];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="flex flex-col gap-4 px-[18px] py-4">
      <div className="flex items-center justify-between gap-2">
        <button onClick={onExit} className="font-mono text-[9.5px] font-semibold cursor-pointer bg-transparent border-none flex items-center gap-1" style={{ color: "var(--text3)" }}>
          ← Exit Test
        </button>
      </div>

      <div>
        <div className="text-[15px] font-bold" style={{ color: "var(--text)" }}>{test.title}</div>
        <div className="font-mono text-[9.5px] mt-1" style={{ color: "var(--text3)" }}>
          Question {current + 1} of {test.questions.length} · {answeredCount} answered
        </div>
        <div className="h-[4px] bg-[var(--border)] rounded-[99px] overflow-hidden mt-2">
          <div
            className="h-full rounded-[99px] bg-[var(--orange)]"
            style={{ width: `${((current + 1) / test.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {q && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-5 py-5 flex flex-col gap-3">
          <div className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>{q.question}</div>
          <div className="flex flex-col gap-2">
            {q.options.map((opt, oi) => {
              const selected = answers[q.id] === oi;
              return (
                <button
                  key={oi}
                  onClick={() => selectOption(q.id, oi)}
                  className="text-left px-3.5 py-[10px] rounded-[8px] text-[12.5px] font-medium transition-all cursor-pointer border"
                  style={{
                    background: selected ? "var(--orange-d)" : "var(--panel)",
                    borderColor: selected ? "var(--orange)" : "var(--border)",
                    color: selected ? "var(--orange)" : "var(--text2)",
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="px-4 py-[8px] rounded-[6px] text-[12px] font-semibold border border-[var(--border2)] text-[var(--text2)] hover:border-[var(--blue)] hover:text-[var(--blue)] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          ← Previous
        </button>
        <div className="flex gap-1.5 flex-wrap justify-center">
          {test.questions.map((qq, i) => (
            <button
              key={qq.id}
              onClick={() => setCurrent(i)}
              className="w-[22px] h-[22px] rounded-[5px] font-mono text-[9px] font-bold cursor-pointer"
              style={{
                background: i === current ? "var(--orange)" : answers[qq.id] != null ? "var(--green-d)" : "var(--panel)",
                color: i === current ? "#fff" : answers[qq.id] != null ? "var(--green)" : "var(--text3)",
                border: "1px solid var(--border)",
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
        {current < test.questions.length - 1 ? (
          <button
            onClick={() => setCurrent((c) => Math.min(test.questions.length - 1, c + 1))}
            className="px-4 py-[8px] rounded-[6px] text-[12px] font-semibold text-white bg-[var(--orange)] hover:bg-[var(--orange2)] transition-all cursor-pointer"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-[8px] rounded-[6px] text-[12px] font-semibold text-white bg-[var(--orange)] hover:bg-[var(--orange2)] transition-all disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Submitting…" : "Submit Test ✓"}
          </button>
        )}
      </div>
      {error && (
        <div className="text-center font-mono text-[10.5px]" style={{ color: "#dc2626" }}>{error}</div>
      )}
    </div>
  );
}
