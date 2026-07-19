import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { teachTopic } from "../lib/api.js";
import { saveToLibrary } from "../lib/store.js";
import { todayISO } from "../lib/srs.js";

// Minimal M1 version — streams a lesson and shows graceful loading/error
// states, per the "topic search with streaming AI response" MUST
// requirement. The structured 9-section renderer lands in M2
// (LessonCard.jsx); for now this proves the search -> streaming -> save
// pipeline end to end.
export default function LessonPage() {
  const { topicSlug } = useParams();
  const [searchParams] = useSearchParams();
  const topic = searchParams.get("topic") ?? topicSlug;

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    setProgress(0);
    try {
      const { lesson: result } = await teachTopic(topic, "standard", {
        onProgress: (chars) => {
          if (chars != null) setProgress(chars);
        },
      });
      setLesson(result);
      saveToLibrary({ topic, tags: result.tags, isCodeRelevant: result.is_code_relevant, difficulty: "standard" }, todayISO());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [topic]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-line py-20 text-center">
        <p className="font-heading text-lg font-bold text-ink">Teaching you "{topic}"…</p>
        {progress > 0 && <p className="text-xs text-ink-soft">{progress} characters generated so far</p>}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border-2 border-sec-confusions/40 bg-sec-confusions/8 p-8 text-center">
        <p className="font-heading text-lg font-bold text-sec-confusions">Couldn't generate this lesson</p>
        <p className="mt-2 text-sm text-ink-soft">{error}</p>
        <button onClick={load} className="mt-4 rounded-full bg-sec-confusions px-4 py-2 text-sm font-bold text-white">
          Try again
        </button>
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <div className="rounded-3xl border border-line bg-surface p-6">
      <h1 className="font-heading text-2xl font-extrabold text-ink">{lesson.topic}</h1>
      <p className="mt-2 text-sm text-ink">{lesson.one_line}</p>
      <p className="mt-4 text-xs text-ink-soft">Full 9-section rendering lands in the next milestone.</p>
    </div>
  );
}
