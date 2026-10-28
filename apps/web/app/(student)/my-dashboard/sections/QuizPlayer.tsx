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

/** Per-question grading detail returned by the submit endpoint. */
interface BreakdownItem {
  questionId: string;
  question: string;
  options: string[];
  selectedIndices: number[];
  correctIndices: number[];
  isCorrect: boolean;
  explanation: string | null;
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
  // Answer review after submit. Only available for an attempt made in this
  // session — a reloaded, already-completed quiz has just the saved score.
  const [breakdown, setBreakdown] = useState<BreakdownItem[] | null>(null);
  // null = result summary; a number = reviewing that question.
  const [reviewIdx, setReviewIdx] = useState<number | null>(null);

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
        setBreakdown(Array.isArray(data.breakdown) ? data.breakdown : null);
        setReviewIdx(null);
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
      <div className="px-4 sm:px-6 py-2 border-b border-[var(--border)] flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[18px]">📝</span>
          <div className="text-[14px] font-bold text-[var(--text)] truncate">{title}</div>
          <div className="text-[11px] text-[var(--text3)] whitespace-nowrap">
            {totalQuestions} questions
            {passingScore != null && ` · ${passingScore}% to pass`}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3 min-w-0">
          {submitted && finalScore !== null && (
            <div
              className={`px-3 py-1 rounded-[6px] text-[12px] font-bold whitespace-nowrap ${
                passed
                  ? "bg-green-500/15 text-green-600"
                  : "bg-red-500/15 text-red-500"
              }`}
            >
              {passed ? "✓ Passed" : "✗ Failed"} — {finalScore}%
            </div>
          )}
          {/* Progress dots */}
          <div className="flex gap-1.5 overflow-x-auto justify-end">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setCurrentQ(i);
                if (showResult && breakdown) setReviewIdx(i);
              }}
              className={`w-6 h-6 rounded-[5px] text-[10px] font-bold cursor-pointer border-none transition-all shrink-0 ${
                showResult && breakdown
                  ? `text-white ${breakdown[i]?.isCorrect ? "bg-[var(--green)]" : "bg-red-500"} ${
                      reviewIdx === i ? "ring-2 ring-offset-1 ring-[var(--orange)] ring-offset-[var(--surface)]" : ""
                    }`
                  : i === currentQ
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
      </div>

      {/* Question */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {showResult && breakdown && reviewIdx !== null && breakdown[reviewIdx] ? (
          <AnswerReview
            item={breakdown[reviewIdx]}
            index={reviewIdx}
            total={breakdown.length}
            optionOrder={questions.find((qq) => qq.id === breakdown[reviewIdx].questionId)?.optionOrder}
            onPrev={() => { setReviewIdx(reviewIdx - 1); setCurrentQ(reviewIdx - 1); }}
            onNext={() => { setReviewIdx(reviewIdx + 1); setCurrentQ(reviewIdx + 1); }}
            onBack={() => setReviewIdx(null)}
          />
        ) : showResult ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="text-[44px] leading-none">{passed ? "🎉" : "📚"}</div>
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
            <div className="grid grid-cols-2 gap-3 w-full max-w-[420px]">
              <div className="text-center py-3 px-4 bg-[var(--bg2)] rounded-[8px]">
                <div className="text-[28px] font-bold text-[var(--text)]">{finalScore}%</div>
                <div className="text-[10px] text-[var(--text3)] uppercase tracking-[.06em] mt-1">Score</div>
              </div>
              <div className="text-center py-3 px-4 bg-[var(--bg2)] rounded-[8px]">
                <div className="text-[28px] font-bold" style={{ color: passed ? "var(--green)" : "var(--orange)" }}>
                  {passed ? "✓" : "✗"}
                </div>
                <div className="text-[10px] text-[var(--text3)] uppercase tracking-[.06em] mt-1">Status</div>
              </div>
            </div>
            {breakdown ? (
              <div className="flex flex-col items-center gap-2 mt-1">
                <button
                  onClick={() => { setReviewIdx(0); setCurrentQ(0); }}
                  className="px-5 py-2 rounded-[7px] text-[12px] font-bold bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white border-none cursor-pointer hover:opacity-90"
                >
                  Review your answers
                </button>
                <div className="text-[11px] text-[var(--text3)]">
                  {breakdown.filter((b) => b.isCorrect).length} of {breakdown.length} correct · or tap a question number above
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-[var(--text3)] text-center max-w-[340px]">
                Retake the quiz to see your answers and the correct ones question by question.
              </div>
            )}
          </div>
        ) : q ? (
          <div className="max-w-[760px] mx-auto">
            <div className="text-[10px] font-bold text-[var(--text3)] uppercase tracking-[.1em] mb-2 flex items-center gap-2">
              <span>Question {currentQ + 1} of {totalQuestions}</span>
              {q.isMultiSelect && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--orange-d)] text-[var(--orange)] normal-case tracking-normal">Select all that apply</span>
              )}
            </div>
            <div className="text-[16px] font-bold text-[var(--text)] mb-4 leading-[1.4]">
              {q.question}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.optionOrder.map((originalIdx, displayIdx) => {
                const selected = (answers[currentQ] ?? []).includes(originalIdx);
                return (
                  <button
                    key={originalIdx}
                    onClick={() => handleAnswer(originalIdx)}
                    className={`text-left px-3 py-2.5 rounded-[8px] border transition-all cursor-pointer text-[13px] flex items-start gap-2.5 ${
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
      <div className="px-4 sm:px-6 py-1.5 border-t border-[var(--border)] flex items-center gap-3">
        <div className="text-[11px] font-semibold text-[var(--text3)]">
          {submitted
            ? `Score: ${finalScore}%`
            : `${answered}/${totalQuestions} answered`}
        </div>
        <div className={`flex gap-2 ${submitted ? "" : "ml-auto"}`}>
          {!submitted && currentQ > 0 && (
            <button
              onClick={() => setCurrentQ((p) => p - 1)}
              className="px-3 py-1 rounded-[6px] text-[11px] font-semibold bg-[var(--bg2)] text-[var(--text2)] border border-[var(--border)] cursor-pointer hover:bg-[var(--card-h)]"
            >
              ← Previous
            </button>
          )}
          {!submitted && currentQ < totalQuestions - 1 && (
            <button
              onClick={() => setCurrentQ((p) => p + 1)}
              className="px-3 py-1 rounded-[6px] text-[11px] font-semibold bg-[var(--bg2)] text-[var(--text2)] border border-[var(--border)] cursor-pointer hover:bg-[var(--card-h)]"
            >
              Next →
            </button>
          )}
          {!submitted && answered === totalQuestions && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-1 rounded-[6px] text-[11px] font-bold bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white border-none cursor-pointer hover:opacity-90 disabled:opacity-50"
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
                setBreakdown(null);
                setReviewIdx(null);
                loadQuestions(); // re-fetch + re-shuffle options for a fresh attempt
              }}
              className="px-3 py-1 rounded-[6px] text-[11px] font-semibold bg-[var(--bg2)] text-[var(--text2)] border border-[var(--border)] cursor-pointer hover:bg-[var(--card-h)]"
            >
              Retake
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AnswerReview({
  item,
  index,
  total,
  optionOrder,
  onPrev,
  onNext,
  onBack,
}: {
  item: BreakdownItem;
  index: number;
  total: number;
  optionOrder?: number[];
  onPrev: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  // Same option order the student saw while answering.
  const order =
    optionOrder && optionOrder.length === item.options.length
      ? optionOrder
      : item.options.map((_, i) => i);
  const multi = item.correctIndices.length > 1;
  const unanswered = item.selectedIndices.every((i) => i < 0);
  const navBtn =
    "px-3 py-1 rounded-[6px] text-[11px] font-semibold bg-[var(--bg2)] text-[var(--text2)] border border-[var(--border)] cursor-pointer hover:bg-[var(--card-h)]";

  return (
    <div className="max-w-[760px] mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-bold text-[var(--text3)] uppercase tracking-[.1em] flex items-center gap-2">
          <span>Question {index + 1} of {total}</span>
          {multi && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--orange-d)] text-[var(--orange)] normal-case tracking-normal">Select all that apply</span>
          )}
        </div>
        <span
          className={`px-3 py-1 rounded-full text-[11px] font-bold ${
            item.isCorrect ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-500"
          }`}
        >
          {item.isCorrect ? "✓ Correct" : "✗ Incorrect"}
        </span>
      </div>

      <div className="text-[16px] font-bold text-[var(--text)] mb-4 leading-[1.4]">{item.question}</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {order.map((originalIdx, displayIdx) => {
          const isCorrectOpt = item.correctIndices.includes(originalIdx);
          const picked = item.selectedIndices.includes(originalIdx);
          const style = isCorrectOpt
            ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400 font-semibold"
            : picked
              ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-semibold"
              : "border-[var(--border)] bg-[var(--bg)] text-[var(--text2)]";
          return (
            <div key={originalIdx} className={`px-3 py-2.5 rounded-[8px] border text-[13px] flex items-start gap-2.5 ${style}`}>
              <span className="shrink-0 mt-0.5 w-4 text-center font-bold">
                {isCorrectOpt ? "✓" : picked ? "✗" : ""}
              </span>
              <span className="flex-1">
                <span className="font-bold mr-2 opacity-70">{String.fromCharCode(65 + displayIdx)}.</span>
                {item.options[originalIdx]}
                {(isCorrectOpt || picked) && (
                  <span className="block mt-1 text-[10px] font-bold uppercase tracking-[.06em] opacity-80">
                    {isCorrectOpt && picked ? "Your answer · Correct" : isCorrectOpt ? "Correct answer" : "Your answer"}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {unanswered && (
        <div className="mt-4 text-[12px] text-[var(--text3)]">You didn&apos;t answer this question.</div>
      )}

      {item.explanation && (
        <div className="mt-3 px-3 py-2.5 rounded-[8px] bg-[var(--bg2)] border border-[var(--border)]">
          <div className="text-[10px] font-bold uppercase tracking-[.08em] text-[var(--text3)] mb-1.5">Feedback</div>
          <div className="text-[13px] text-[var(--text2)] leading-[1.6]">{item.explanation}</div>
        </div>
      )}

      <div className="flex items-center justify-between mt-4">
        <button onClick={onBack} className={navBtn}>← Back to result</button>
        <div className="flex gap-2">
          {index > 0 && <button onClick={onPrev} className={navBtn}>← Previous</button>}
          {index < total - 1 && <button onClick={onNext} className={navBtn}>Next →</button>}
        </div>
      </div>
    </div>
  );
}
