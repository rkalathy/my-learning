import { useEffect, useState } from "react";
import { generateQuiz, gradeQuiz } from "../lib/api.js";
import { saveQuizResult } from "../lib/store.js";
import ConfettiBurst from "./ConfettiBurst.jsx";

function scoreColor(score) {
  if (score >= 80) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

/**
 * Reused for both the full 5-question "Quiz Me" flow (lesson page) and the
 * 2-question review mini-quiz (Review page) — `questionCount` controls how
 * many of the generated questions are actually asked, `onComplete(score)`
 * lets the Review page advance the spaced-repetition schedule.
 */
export default function QuizMode({ topic, onClose, questionCount = 5, onComplete }) {
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    generateQuiz(topic)
      .then((qs) => {
        setQuestions(qs.slice(0, questionCount));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  async function submit() {
    setGrading(true);
    setError(null);
    try {
      const payload = questions.map((q) => ({ id: q.id, q: q.q, a: answers[q.id] ?? "" }));
      const data = await gradeQuiz(topic, payload);
      setResults(data);
      saveQuizResult({ topic, date: new Date().toISOString(), overallScore: data.overall_score, results: data.results });
      if (data.overall_score >= 70) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 1300);
      }
      onComplete?.(data.overall_score);
    } catch (err) {
      setError(err.message);
    } finally {
      setGrading(false);
    }
  }

  const allAnswered = questions?.every((q) => (answers[q.id] ?? "").trim().length > 0);

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm sm:items-center">
      {showConfetti && <ConfettiBurst />}
      <div className="my-8 w-full max-w-2xl rounded-3xl bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-xl font-extrabold text-ink">🎯 Quiz: {topic}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-ink-soft hover:bg-bg">
            ✕
          </button>
        </div>

        {loading && <p className="py-10 text-center text-sm text-ink-soft">Generating questions…</p>}
        {error && <p className="rounded-lg bg-sec-confusions/10 p-3 text-sm text-sec-confusions">{error}</p>}

        {questions && !results && (
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={q.id}>
                <p className="mb-1.5 text-sm font-semibold text-ink">
                  {i + 1}. {q.q}
                </p>
                <textarea
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  rows={2}
                  placeholder="Type your answer…"
                  className="w-full rounded-xl border border-line bg-bg p-3 text-sm text-ink outline-none focus:border-brand-pink"
                />
              </div>
            ))}
            <button
              onClick={submit}
              disabled={!allAnswered || grading}
              className="w-full rounded-full bg-gradient-to-r from-brand-violet via-brand-pink to-brand-orange py-2.5 text-sm font-bold text-white disabled:opacity-40"
            >
              {grading ? "Grading…" : "Submit answers"}
            </button>
          </div>
        )}

        {results && (
          <div className="space-y-4">
            <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: `${scoreColor(results.overall_score)}14` }}>
              <p className="text-3xl font-extrabold" style={{ color: scoreColor(results.overall_score) }}>
                {Math.round(results.overall_score)}%
              </p>
              <p className="mt-1 text-sm text-ink-soft">{results.summary}</p>
            </div>
            {results.results.map((r, i) => (
              <div key={r.id} className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">Q{i + 1}</p>
                  <span className="text-sm font-bold" style={{ color: scoreColor(r.score) }}>
                    {r.score}%
                  </span>
                </div>
                {r.missed && <p className="mt-1 text-xs text-sec-confusions">Missed: {r.missed}</p>}
                <p className="mt-1 text-xs text-ink-soft">
                  <span className="font-semibold">Model answer:</span> {r.model_answer}
                </p>
              </div>
            ))}
            <button onClick={onClose} className="w-full rounded-full border border-line py-2.5 text-sm font-bold text-ink">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
