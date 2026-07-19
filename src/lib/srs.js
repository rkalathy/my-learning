// Pure spaced-repetition functions — no Date.now(), no localStorage, no
// side effects. Every function takes "today" as an explicit ISO date
// string parameter so tests (and the app) can simulate any point in time
// without mocking the system clock.

export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 21];

export function todayISO(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function addDays(dateISO, days) {
  const d = new Date(dateISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Called once when a lesson is first learned. First review is due 1 day later. */
export function createSchedule(learnedDateISO) {
  return {
    stage: 0, // index into REVIEW_INTERVALS_DAYS of the review just completed (0 = none yet)
    learnedDate: learnedDateISO,
    nextReviewDate: addDays(learnedDateISO, REVIEW_INTERVALS_DAYS[0]),
    mastered: false,
    reviewHistory: [], // [{ date, passed }]
  };
}

export function isDue(schedule, todayDateISO) {
  if (!schedule || schedule.mastered) return false;
  return schedule.nextReviewDate <= todayDateISO;
}

/**
 * Advances the schedule after a review. A passed review (score from the
 * 2-question mini-quiz) moves to the next interval, scheduled from TODAY
 * (the actual review date), not the original learn date — standard SRS
 * behavior. A failed review resets to stage 0 (review again tomorrow)
 * rather than advancing, since the point is reinforcement, not a
 * checkbox. After the last interval (21 days) is passed, the topic is
 * marked mastered and drops out of the review queue.
 */
export function advanceSchedule(schedule, todayDateISO, passed) {
  const reviewHistory = [...schedule.reviewHistory, { date: todayDateISO, passed }];

  if (!passed) {
    return {
      ...schedule,
      stage: 0,
      nextReviewDate: addDays(todayDateISO, 1),
      mastered: false,
      reviewHistory,
    };
  }

  const nextStage = schedule.stage + 1;
  if (nextStage >= REVIEW_INTERVALS_DAYS.length) {
    return { ...schedule, stage: nextStage, mastered: true, nextReviewDate: null, reviewHistory };
  }
  return {
    ...schedule,
    stage: nextStage,
    nextReviewDate: addDays(todayDateISO, REVIEW_INTERVALS_DAYS[nextStage]),
    mastered: false,
    reviewHistory,
  };
}

/** Filters a { topicId: schedule } map down to the ids due today or overdue. */
export function dueTopicIds(schedules, todayDateISO) {
  return Object.entries(schedules)
    .filter(([, schedule]) => isDue(schedule, todayDateISO))
    .map(([topicId]) => topicId);
}
