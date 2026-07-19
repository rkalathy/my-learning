import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import LessonCard from "../components/LessonCard.jsx";
import QuizMode from "../components/QuizMode.jsx";
import { teachTopic } from "../lib/api.js";
import { saveToLibrary } from "../lib/store.js";
import { todayISO } from "../lib/srs.js";

const LOADING_MESSAGES = [
  "Digging up a great analogy…",
  "Building a tiny worked example…",
  "Thinking of a memory hook…",
  "Lining up interview questions…",
  "Mapping the learning path…",
];

export default function LessonPage() {
  const { topicSlug } = useParams();
  const [searchParams] = useSearchParams();
  const topic = searchParams.get("topic") ?? topicSlug;

  const [difficulty, setDifficulty] = useState("standard");
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [cacheHit, setCacheHit] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  const load = useCallback(
    async (mode = "generate", nextDifficulty = difficulty) => {
      setError(null);
      setProgress(0);
      setCacheHit(false);
      if (mode === "regenerate") setRegenerating(true);
      else setLoading(true);

      try {
        const { lesson: result } = await teachTopic(topic, nextDifficulty, {
          mode,
          onProgress: (chars, source) => {
            if (source === "server_cache") setCacheHit(true);
            if (chars != null) setProgress(chars);
          },
        });
        setLesson(result);
        saveToLibrary(
          { topic, tags: result.tags, isCodeRelevant: result.is_code_relevant, difficulty: nextDifficulty },
          todayISO()
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        setRegenerating(false);
      }
    },
    [topic, difficulty]
  );

  useEffect(() => {
    load("generate", "standard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => setLoadingMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length), 1800);
    return () => clearInterval(interval);
  }, [loading]);

  function handleDifficultyChange(next) {
    setDifficulty(next);
    load("generate", next);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-line py-20 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }}
          className="h-12 w-12 rounded-full border-4 border-brand-pink/20 border-t-brand-pink"
        />
        <p className="font-heading text-lg font-bold text-ink">Teaching you "{topic}"…</p>
        <p className="text-sm text-ink-soft">{LOADING_MESSAGES[loadingMsgIndex]}</p>
        {progress > 0 && <p className="text-xs text-ink-soft/70">{progress} characters generated so far</p>}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border-2 border-sec-confusions/40 bg-sec-confusions/8 p-8 text-center">
        <p className="font-heading text-lg font-bold text-sec-confusions">Couldn't generate this lesson</p>
        <p className="mt-2 text-sm text-ink-soft">{error}</p>
        <button
          onClick={() => load("generate", difficulty)}
          className="mt-4 rounded-full bg-sec-confusions px-4 py-2 text-sm font-bold text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <div>
      {cacheHit && (
        <p className="mb-3 rounded-lg bg-sec-action/10 px-3 py-2 text-center text-xs font-medium text-sec-action">
          ⚡ Loaded instantly from cache — zero API tokens used.
        </p>
      )}
      <LessonCard
        lesson={lesson}
        difficulty={difficulty}
        onDifficultyChange={handleDifficultyChange}
        onRegenerate={() => load("regenerate", difficulty)}
        onQuizMe={() => setShowQuiz(true)}
        regenerating={regenerating}
      />
      {showQuiz && <QuizMode topic={lesson.topic} onClose={() => setShowQuiz(false)} />}
    </div>
  );
}
