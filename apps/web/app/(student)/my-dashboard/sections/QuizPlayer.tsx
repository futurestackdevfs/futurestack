"use client";

import { useState, useCallback, useEffect } from "react";

interface Props {
  quizId: string;
  title: string;
  totalQuestions: number;
  passingScore?: number | null;
  previousScore?: number | null;
  isCompleted?: boolean;
  onComplete?: (score: number) => void;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  isMultiSelect: boolean;
  /** Shuffled display order — each entry is an index into `options` (the real/original index used for grading). Randomized per load/retake. */
  optionOrder: number[];
}

function shuffledIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function QuizPlayer({
  quizId,
  title,
  passingScore,
  previousScore,
  isCompleted = false,
  onComplete,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [hasQuestions, setHasQuestions] = useState(true);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  // Per-question list of selected ORIGINAL option indices (not display position) — [] means unanswered.
  const [answers, setAnswers] = useState<number[][]>([]);
  const [submitted, setSubmitted] = useState(isCompleted);
  const [submitting, setSubmitting] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(previousScore ?? null);
  const [showResult, setShowResult] = useState(isCompleted);

  const loadQuestions = useCallback(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/student/quizzes/${quizId}/questions`, { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data && data.hasQuestions) {
          const qs: QuizQuestion[] = data.questions.map((q: any) => ({
            id: q.id,
            question: q.question,
            options: q.options,
            isMultiSelect: !!q.isMultiSelect,
            optionOrder: shuffledIndices(q.options.length),
          }));
          setQuestions(qs);
          setAnswers(qs.map(() => []));
          setHasQuestions(true);
        } else {
          setHasQuestions(false);
        }
      })
      .catch(() => {
        if (active) setHasQuestions(false);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [quizId]);

  useEffect(() => loadQuestions(), [loadQuestions]);

  const totalQuestions = questions.length;
  const q = questions[currentQ];
  const answered = answers.filter((a) => a.length > 0).length;

  const handleAnswer = (originalIdx: number) => {
    if (submitted || !q) return;
    setAnswers((prev) => {
      const next = [...prev];
      const current = next[currentQ] ?? [];
      if (q.isMultiSelect) {
        next[currentQ] = current.includes(originalIdx)
          ? current.filter((i) => i !== originalIdx)
          : [...current, originalIdx];
      } else {
        next[currentQ] = [originalIdx];
      }
      return next;
    });
  };

  const handleSubmit = useCallback(async () => {
    if (submitting || submitted) return;
    setSubmitting(true);

    const payloadAnswers = questions.map((question, i) => ({
      questionId: question.id,
      selectedIndices: answers[i]?.length ? answers[i] : [-1],
    }));

    try {
      const res = await fetch(`/api/student/quizzes/${quizId}/submit`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payloadAnswers }),
      });

      if (res.ok) {
        const data = await res.json();
        setFinalScore(data.score);
        setSubmitted(true);
        setShowResult(true);
        onComplete?.(data.score);
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  }, [quizId, answers, questions, submitting, submitted, onComplete]);

  const passed =
    finalScore !== null && passingScore !== null && passingScore !== undefined
      ? finalScore >= passingScore
      : finalScore !== null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--surface)] text-[13px] text-[var(--text3)]">
        Loading quiz…
      </div>
    );
  }

  if (!hasQuestions) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--surface)] gap-3 text-center px-8">
        <div className="text-[40px]">📝</div>
        <div className="text-[15px] font-bold text-[var(--text)]">{title}</div>
        <div className="text-[13px] text-[var(--text3)] max-w-[380px]">
          This quiz has no questions configured yet.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--surface)]">
      {/* Header */}
      <div className="px-5 sm:px-8 py-5 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-[26px]">📝</span>
            <div>
              <div className="text-[16px] font-bold text-[var(--text)]">{title}</div>
              <div className="text-[11px] text-[var(--text3)]">
                {totalQuestions} questions
                {passingScore != null && ` · ${passingScore}% to pass`}
              </div>
            </div>
          </div>
          {submitted && finalScore !== null && (
            <div
              className={`px-4 py-2 rounded-[8px] text-[13px] font-bold ${
                passed
                  ? "bg-green-500/15 text-green-600"
                  : "bg-red-500/15 text-red-500"
              }`}
            >
              {passed ? "✓ Passed" : "✗ Failed"} — {finalScore}%
            </div>
          )}
        </div>
        {/* Progress dots */}
        <div className="flex gap-2 overflow-x-auto justify-end">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={`w-7 h-7 rounded-[6px] text-[10px] font-bold cursor-pointer border-none transition-all shrink-0 ${
                i === currentQ
                  ? "bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white"
                  : answers[i]?.length
                    ? "bg-[var(--green)] text-white"
                    : "bg-[var(--bg2)] text-[var(--text3)] border border-[var(--border)]"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-8">
        {showResult ? (
          <div className="flex flex-col items-center justify-center h-full gap-5">
            <div className="text-[64px]">{passed ? "🎉" : "📚"}</div>
            <div className="text-[22px] font-bold text-[var(--text)]">
              {passed ? "Congratulations!" : "Keep Learning!"}
            </div>
            <div className="text-[14px] text-[var(--text3)] text-center max-w-[420px]">
              {passed
                ? `You scored ${finalScore}% and passed the quiz.`
                : `You scored ${finalScore}%. ${
                    passingScore != null
                      ? `You need ${passingScore}% to pass.`
                      : "Review the material and try again."
                  }`}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-2 w-full max-w-[420px]">
              <div className="text-center p-5 bg-[var(--bg2)] rounded-[10px]">
                <div className="text-[28px] font-bold text-[var(--text)]">{finalScore}%</div>
                <div className="text-[10px] text-[var(--text3)] uppercase tracking-[.06em] mt-1">Score</div>
              </div>
              <div className="text-center p-5 bg-[var(--bg2)] rounded-[10px]">
                <div className="text-[28px] font-bold" style={{ color: passed ? "var(--green)" : "var(--orange)" }}>
                  {passed ? "✓" : "✗"}
                </div>
                <div className="text-[10px] text-[var(--text3)] uppercase tracking-[.06em] mt-1">Status</div>
              </div>
            </div>
          </div>
        ) : q ? (
          <div className="max-w-[760px] mx-auto">
            <div className="text-[10px] font-bold text-[var(--text3)] uppercase tracking-[.1em] mb-4 flex items-center gap-2">
              <span>Question {currentQ + 1} of {totalQuestions}</span>
              {q.isMultiSelect && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--orange-d)] text-[var(--orange)] normal-case tracking-normal">Select all that apply</span>
              )}
            </div>
            <div className="text-[18px] font-bold text-[var(--text)] mb-7 leading-[1.5]">
              {q.question}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {q.optionOrder.map((originalIdx, displayIdx) => {
                const selected = (answers[currentQ] ?? []).includes(originalIdx);
                return (
                  <button
                    key={originalIdx}
                    onClick={() => handleAnswer(originalIdx)}
                    className={`text-left p-4 rounded-[10px] border transition-all cursor-pointer text-[13px] flex items-start gap-2.5 ${
                      selected
                        ? "border-[var(--orange)] bg-[var(--orange-d)] text-[var(--orange)] font-semibold"
                        : "border-[var(--border)] bg-[var(--bg)] text-[var(--text2)] hover:border-[var(--border2)] hover:bg-[var(--card-h)]"
                    }`}
                  >
                    <span
                      className={`shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center text-[9px] font-bold border ${
                        q.isMultiSelect ? "rounded-[4px]" : "rounded-full"
                      } ${selected ? "bg-[var(--orange)] border-[var(--orange)] text-white" : "border-[var(--border2)] text-transparent"}`}
                    >
                      ✓
                    </span>
                    <span>
                      <span className="font-bold mr-2 text-[var(--text3)]">
                        {String.fromCharCode(65 + displayIdx)}.
                      </span>
                      {q.options[originalIdx]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between">
        <div className="text-[10px] text-[var(--text3)]">
          {submitted
            ? `Score: ${finalScore}%`
            : `${answered}/${totalQuestions} answered`}
        </div>
        <div className="flex gap-2">
          {!submitted && currentQ > 0 && (
            <button
              onClick={() => setCurrentQ((p) => p - 1)}
              className="px-4 py-2 rounded-[7px] text-[11px] font-semibold bg-[var(--bg2)] text-[var(--text2)] border border-[var(--border)] cursor-pointer hover:bg-[var(--card-h)]"
            >
              ← Previous
            </button>
          )}
          {!submitted && currentQ < totalQuestions - 1 && (
            <button
              onClick={() => setCurrentQ((p) => p + 1)}
              className="px-4 py-2 rounded-[7px] text-[11px] font-semibold bg-[var(--bg2)] text-[var(--text2)] border border-[var(--border)] cursor-pointer hover:bg-[var(--card-h)]"
            >
              Next →
            </button>
          )}
          {!submitted && answered === totalQuestions && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 rounded-[7px] text-[11px] font-bold bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white border-none cursor-pointer hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit Quiz"}
            </button>
          )}
          {submitted && (
            <button
              onClick={() => {
                setSubmitted(false);
                setShowResult(false);
                setCurrentQ(0);
                setFinalScore(null);
                loadQuestions(); // re-fetch + re-shuffle options for a fresh attempt
              }}
              className="px-4 py-2 rounded-[7px] text-[11px] font-semibold bg-[var(--bg2)] text-[var(--text2)] border border-[var(--border)] cursor-pointer hover:bg-[var(--card-h)]"
            >
              Retake
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
