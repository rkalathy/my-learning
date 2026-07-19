import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getCachedLesson, getMostRecentTopic, isInLibrary, topicId } from "../lib/store.js";

/**
 * Suggests the next unlearned topic from the most recently viewed
 * lesson's "Learn Next" list — this is what keeps learning from
 * dead-ending at "okay, now what?" after finishing a lesson.
 */
export default function ContinueLearningCard() {
  const suggestion = useMemo(() => {
    const recent = getMostRecentTopic();
    if (!recent) return null;
    // We don't know the difficulty the recent lesson was viewed at, so
    // check all three — whichever is cached tells us related_next.
    for (const difficulty of ["standard", "eli12", "deep"]) {
      const lesson = getCachedLesson(recent.topic, difficulty);
      if (lesson?.related_next) {
        const next = lesson.related_next.find((r) => !isInLibrary(r.topic));
        if (next) return { fromTopic: recent.topic, next };
      }
    }
    return null;
  }, []);

  const navigate = useNavigate();
  if (!suggestion) return null;

  return (
    <button
      onClick={() =>
        navigate(`/lesson/${encodeURIComponent(topicId(suggestion.next.topic))}?topic=${encodeURIComponent(suggestion.next.topic)}`)
      }
      className="w-full rounded-2xl border-2 border-sec-related/30 bg-sec-related/8 p-4 text-left transition hover:border-sec-related/60"
    >
      <p className="text-xs font-bold tracking-wide text-sec-related uppercase">Continue Learning</p>
      <p className="mt-1 text-sm text-ink">
        After <span className="font-semibold">{suggestion.fromTopic}</span>, try{" "}
        <span className="font-semibold text-sec-related">{suggestion.next.topic}</span> next →
      </p>
      <p className="mt-0.5 text-xs text-ink-soft">{suggestion.next.why}</p>
    </button>
  );
}
