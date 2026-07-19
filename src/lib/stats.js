import { getJourney, getSchedules } from "./store.js";
import { addDays } from "./srs.js";

/** Consecutive-day streak of activity (any lesson viewed/learned), ending today or yesterday. */
export function computeStreak(todayISO) {
  const dates = new Set(getJourney().map((j) => j.timestamp.slice(0, 10)));
  let cursor = dates.has(todayISO) ? todayISO : addDays(todayISO, -1);
  let streak = 0;
  while (dates.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function topicsMasteredCount() {
  return Object.values(getSchedules()).filter((s) => s.mastered).length;
}
