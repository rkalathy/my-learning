import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { teachTopic } from "../lib/api.js";
import { saveToLibrary } from "../lib/store.js";
import { todayISO } from "../lib/srs.js";

function Column({ lesson }) {
  return (
    <div className="min-w-0 flex-1 space-y-3">
      <h2 className="font-heading text-lg font-extrabold text-ink">{lesson.topic}</h2>
      <div>
        <p className="text-xs font-bold text-sec-one-line uppercase">In one line</p>
        <p className="text-sm text-ink">{lesson.one_line}</p>
      </div>
      <div>
        <p className="text-xs font-bold text-sec-why uppercase">Why it exists</p>
        <p className="text-sm text-ink">{lesson.why}</p>
      </div>
      <div>
        <p className="text-xs font-bold text-sec-steps uppercase">Key step</p>
        <p className="text-sm text-ink">{lesson.steps?.[0]}</p>
      </div>
      <div>
        <p className="text-xs font-bold text-sec-confusions uppercase">Watch out for</p>
        <p className="text-sm text-ink">{lesson.confusions?.[0]?.b}</p>
      </div>
    </div>
  );
}

// Compare mode intentionally reuses the two topics' already-generated
// lessons (One Line / Why / first Step / a Confusion) rather than adding a
// dedicated third LLM call — a good-enough "when to use which" reads
// clearly from each topic's own "Why It Exists" placed side by side, and
// this keeps the SHOULD-priority Compare feature at zero extra token cost
// beyond the two lessons themselves (both of which are cached after the
// first view anyway). See PROMPT.md.
export default function ComparePage() {
  const { topicA, topicB } = useParams();
  const [lessons, setLessons] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLessons(null);
    setError(null);
    Promise.all([teachTopic(topicA, "standard"), teachTopic(topicB, "standard")])
      .then(([a, b]) => {
        setLessons([a.lesson, b.lesson]);
        saveToLibrary({ topic: topicA, tags: a.lesson.tags, isCodeRelevant: a.lesson.is_code_relevant, difficulty: "standard" }, todayISO());
        saveToLibrary({ topic: topicB, tags: b.lesson.tags, isCodeRelevant: b.lesson.is_code_relevant, difficulty: "standard" }, todayISO());
      })
      .catch((err) => setError(err.message));
  }, [topicA, topicB]);

  if (error) return <p className="rounded-2xl bg-sec-confusions/10 p-6 text-center text-sm text-sec-confusions">{error}</p>;
  if (!lessons) return <p className="p-10 text-center text-sm text-ink-soft">Comparing "{topicA}" and "{topicB}"…</p>;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-brand-violet via-brand-pink to-brand-orange p-5 text-center text-white shadow-lg">
        <h1 className="font-heading text-xl font-extrabold sm:text-2xl">
          {lessons[0].topic} <span className="opacity-70">vs</span> {lessons[1].topic}
        </h1>
      </div>
      <div className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-5 sm:flex-row sm:divide-x sm:divide-line">
        <Column lesson={lessons[0]} />
        <div className="sm:pl-5">
          <Column lesson={lessons[1]} />
        </div>
      </div>
    </div>
  );
}
