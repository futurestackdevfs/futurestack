"use client";

import { useState, useCallback } from "react";

interface Props {
  quizId: string;
  title: string;
  totalQuestions: number;
  passingScore?: number | null;
  previousScore?: number | null;
  isCompleted?: boolean;
  onComplete?: (score: number) => void;
}

const SAMPLE_TOPICS = [
  "What is the primary purpose of this concept?",
  "Which of the following best describes this topic?",
  "In which scenario would you apply this pattern?",
  "What is a key benefit of this approach?",
  "Which statement about this topic is correct?",
  "What problem does this solve?",
  "How does this differ from the alternative?",
  "What is the expected outcome?",
];

const SAMPLE_OPTIONS = [
  ["Data persistence", "User authentication", "State management", "API routing"],
  ["Performance", "Scalability", "Readability", "All of the above"],
  ["Frontend only", "Backend only", "Full stack", "DevOps pipeline"],
  ["Faster builds", "Better UX", "Lower latency", "All of the above"],
  ["It's optional", "It's required", "It depends on context", "None of the above"],
  ["Memory leaks", "Race conditions", "Complexity", "All of the above"],
  ["Speed", "Architecture", "Cost", "Team size"],
  ["Revenue", "User satisfaction", "Code quality", "All of the above"],
];

function getQuizQuestions(count: number, quizTitle: string) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const topicIdx = i % SAMPLE_TOPICS.length;
    const optIdx = i % SAMPLE_OPTIONS.length;
    questions.push({
      question: `${SAMPLE_TOPICS[topicIdx]} (Context: ${quizTitle})`,
      options: SAMPLE_OPTIONS[optIdx],
      correctIndex: Math.floor(Math.random() * 4),
    });
  }
  return questions;
}

export default function QuizPlayer({
  quizId,
  title,
  totalQuestions,
  passingScore,
  previousScore,
  isCompleted = false,
  onComplete,
}: Props) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => new Array(totalQuestions).fill(null),
  );
  const [submitted, setSubmitted] = useState(isCompleted);
  const [submitting, setSubmitting] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(previousScore ?? null);
  const [showResult, setShowResult] = useState(isCompleted);

  const questions = getQuizQuestions(totalQuestions, title);
  const q = questions[currentQ];
  const answered = answers.filter((a) => a !== null).length;

  const handleAnswer = (optIdx: number) => {
    if (submitted) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQ] = optIdx;
      return next;
    });
  };

  const handleSubmit = useCallback(async () => {
    if (submitting || submitted) return;
    setSubmitting(true);

    // Calculate score
    let correct = 0;
    questions.forEach((question, i) => {
      if (answers[i] === question.correctIndex) correct++;
    });
    const score = Math.round((correct / questions.length) * 100);

    try {
      const res = await fetch(`/api/student/quizzes/${quizId}/submit`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score }),
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

  return (
    <div className="flex flex-col h-full bg-[var(--surface)]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[20px]">📝</span>
            <div>
              <div className="text-[14px] font-bold text-[var(--text)]">{title}</div>
              <div className="text-[10px] text-[var(--text3)]">
                {totalQuestions} questions
                {passingScore != null && ` · ${passingScore}% to pass`}
              </div>
            </div>
          </div>
          {submitted && finalScore !== null && (
            <div
              className={`px-3 py-1.5 rounded-[8px] text-[12px] font-bold ${
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
        <div className="flex gap-1.5 mt-2">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={`w-6 h-6 rounded-[5px] text-[9px] font-bold cursor-pointer border-none transition-all ${
                i === currentQ
                  ? "bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white"
                  : answers[i] !== null
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
      <div className="flex-1 overflow-y-auto p-5">
        {showResult ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="text-[52px]">{passed ? "🎉" : "📚"}</div>
            <div className="text-[18px] font-bold text-[var(--text)]">
              {passed ? "Congratulations!" : "Keep Learning!"}
            </div>
            <div className="text-[13px] text-[var(--text3)] text-center max-w-[300px]">
              {passed
                ? `You scored ${finalScore}% and passed the quiz.`
                : `You scored ${finalScore}%. ${
                    passingScore != null
                      ? `You need ${passingScore}% to pass.`
                      : "Review the material and try again."
                  }`}
            </div>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div className="text-center p-3 bg-[var(--bg2)] rounded-[8px]">
                <div className="text-[22px] font-bold text-[var(--text)]">{finalScore}%</div>
                <div className="text-[9px] text-[var(--text3)] uppercase tracking-[.06em]">Score</div>
              </div>
              <div className="text-center p-3 bg-[var(--bg2)] rounded-[8px]">
                <div className="text-[22px] font-bold text-[var(--text)]">
                  {answers.filter((a, i) => a === questions[i].correctIndex).length}/{totalQuestions}
                </div>
                <div className="text-[9px] text-[var(--text3)] uppercase tracking-[.06em]">Correct</div>
              </div>
              <div className="text-center p-3 bg-[var(--bg2)] rounded-[8px]">
                <div className="text-[22px] font-bold" style={{ color: passed ? "var(--green)" : "var(--orange)" }}>
                  {passed ? "✓" : "✗"}
                </div>
                <div className="text-[9px] text-[var(--text3)] uppercase tracking-[.06em]">Status</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-[480px] mx-auto">
            <div className="text-[9px] font-bold text-[var(--text3)] uppercase tracking-[.1em] mb-3">
              Question {currentQ + 1} of {totalQuestions}
            </div>
            <div className="text-[14px] font-bold text-[var(--text)] mb-5 leading-[1.5]">
              {q.question}
            </div>
            <div className="flex flex-col gap-2.5">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className={`text-left p-3.5 rounded-[8px] border transition-all cursor-pointer text-[12px] ${
                    answers[currentQ] === i
                      ? "border-[var(--orange)] bg-[var(--orange-d)] text-[var(--orange)] font-semibold"
                      : "border-[var(--border)] bg-[var(--bg)] text-[var(--text2)] hover:border-[var(--border2)] hover:bg-[var(--card-h)]"
                  }`}
                >
                  <span className="font-bold mr-2 text-[var(--text3)]">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}
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
                setAnswers(new Array(totalQuestions).fill(null));
                setCurrentQ(0);
                setFinalScore(null);
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
