import { useMemo, useState } from "react";
import { getSchedules, getLibrary, setSchedule } from "../lib/store.js";
import { dueTopicIds, todayISO, advanceSchedule, REVIEW_INTERVALS_DAYS } from "../lib/srs.js";
import QuizMode from "../components/QuizMode.jsx";

function nextIntervalLabel(schedule) {
  if (schedule.mastered) return "Mastered!";
  const days = REVIEW_INTERVALS_DAYS[schedule.stage] ?? REVIEW_INTERVALS_DAYS[0];
  return `Next review in ${days} day${days === 1 ? "" : "s"}`;
}

export default function ReviewPage() {
  const [reviewingTopic, setReviewingTopic] = useState(null);
  const [justAdvanced, setJustAdvanced] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  const { dueItems, allSchedules, library } = useMemo(() => {
    const schedules = getSchedules();
    const lib = getLibrary();
    const ids = dueTopicIds(schedules, todayISO());
    return {
      dueItems: ids.map((id) => ({ id, topic: lib[id]?.topic ?? id, schedule: schedules[id] })),
      allSchedules: schedules,
      library: lib,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  function handleReviewComplete(topicIdKey, score) {
    const passed = score >= 60; // a 2-question mini-quiz — a clear majority-correct bar
    const schedule = allSchedules[topicIdKey];
    const updated = advanceSchedule(schedule, todayISO(), passed);
    setSchedule(library[topicIdKey]?.topic ?? topicIdKey, updated);
    setJustAdvanced((prev) => ({ ...prev, [topicIdKey]: { passed, updated } }));
  }

  const mastered = Object.values(allSchedules).filter((s) => s.mastered).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">Review Queue</h1>
        <p className="text-sm text-ink-soft">
          Spaced repetition: 1 → 3 → 7 → 21 days. Pass a 2-question mini-quiz to advance. {mastered} topic{mastered === 1 ? "" : "s"} mastered so far.
        </p>
      </div>

      {dueItems.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-sec-action/30 bg-sec-action/6 p-8 text-center">
          <p className="text-2xl">🎉</p>
          <p className="mt-1 text-sm font-semibold text-ink">Nothing due right now — you're all caught up!</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {dueItems.map(({ id, topic, schedule }) => {
            const advanced = justAdvanced[id];
            return (
              <div key={id} className="rounded-2xl border border-line bg-surface p-4">
                <p className="font-heading font-bold text-ink">{topic}</p>
                <p className="mt-1 text-xs text-ink-soft">
                  {advanced ? (advanced.passed ? "✅ Passed — " : "↩️ Try again tomorrow — ") : "Due today — "}
                  {advanced ? nextIntervalLabel(advanced.updated) : nextIntervalLabel(schedule)}
                </p>
                {!advanced && (
                  <button
                    onClick={() => setReviewingTopic({ id, topic })}
                    className="mt-3 rounded-full bg-gradient-to-r from-brand-violet to-brand-pink px-4 py-1.5 text-xs font-bold text-white"
                  >
                    Review now
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {reviewingTopic && (
        <QuizMode
          topic={reviewingTopic.topic}
          questionCount={2}
          onComplete={(score) => handleReviewComplete(reviewingTopic.id, score)}
          onClose={() => {
            setReviewingTopic(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
