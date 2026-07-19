// localStorage-backed persistence, behind a small, explicit interface.
// Every other module (components, srs integration) calls THESE functions,
// never `localStorage` directly — that's what lets this be swapped for
// Firebase/Supabase later by rewriting only this file. Keys are
// versioned ("ml_v1_*") so a future schema change can migrate cleanly
// instead of silently misreading old data.

import { createSchedule } from "./srs.js";

const KEYS = {
  library: "ml_v1_library", // { [topicId]: { topic, tags, isCodeRelevant, currentDifficulty, learnedDate, lastViewedDate } }
  cache: "ml_v1_cache", // { [topicId::difficulty]: lessonJSON } — "never regenerate what we already have"
  schedules: "ml_v1_schedules", // { [topicId]: srsSchedule }
  quizResults: "ml_v1_quiz_results", // [{ topicId, topic, date, overallScore, results }]
  journey: "ml_v1_journey", // [{ topicId, topic, timestamp }] — most recent last
  usage: "ml_v1_usage", // [{ timestamp, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens, cached }]
  theme: "ml_v1_theme", // "light" | "dark"
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable (private browsing) — fail silently,
    // the app still works for the current session, just doesn't persist.
  }
}

export function topicId(topic) {
  return topic.trim().toLowerCase().replace(/\s+/g, " ");
}

function cacheEntryKey(topic, difficulty) {
  return `${topicId(topic)}::${difficulty}`;
}

// ---- Lesson cache (topic+difficulty -> full lesson JSON) ----

export function getCachedLesson(topic, difficulty) {
  const cache = read(KEYS.cache, {});
  return cache[cacheEntryKey(topic, difficulty)] ?? null;
}

export function setCachedLesson(topic, difficulty, lesson) {
  const cache = read(KEYS.cache, {});
  cache[cacheEntryKey(topic, difficulty)] = lesson;
  write(KEYS.cache, cache);
}

// ---- Library (one row per topic) ----

export function getLibrary() {
  return read(KEYS.library, {});
}

export function getLibraryList() {
  return Object.values(getLibrary()).sort((a, b) => b.lastViewedDate.localeCompare(a.lastViewedDate));
}

export function isInLibrary(topic) {
  const library = getLibrary();
  return Boolean(library[topicId(topic)]);
}

/** Records/updates a topic in the library and (for brand-new topics) starts its review schedule. */
export function saveToLibrary({ topic, tags, isCodeRelevant, difficulty }, todayISO) {
  const id = topicId(topic);
  const library = getLibrary();
  const existing = library[id];

  library[id] = {
    id,
    topic: existing?.topic ?? topic.trim(),
    tags: tags ?? existing?.tags ?? [],
    isCodeRelevant: isCodeRelevant ?? existing?.isCodeRelevant ?? false,
    currentDifficulty: difficulty,
    learnedDate: existing?.learnedDate ?? todayISO,
    lastViewedDate: todayISO,
  };
  write(KEYS.library, library);

  if (!existing) {
    const schedules = read(KEYS.schedules, {});
    schedules[id] = createSchedule(todayISO);
    write(KEYS.schedules, schedules);
  }

  recordJourneyStep(topic);
  return library[id];
}

// ---- Review schedules ----

export function getSchedules() {
  return read(KEYS.schedules, {});
}

export function setSchedule(topic, schedule) {
  const schedules = read(KEYS.schedules, {});
  schedules[topicId(topic)] = schedule;
  write(KEYS.schedules, schedules);
}

// ---- Quiz results ----

export function getQuizResults() {
  return read(KEYS.quizResults, []);
}

export function saveQuizResult(entry) {
  const results = read(KEYS.quizResults, []);
  results.push(entry);
  write(KEYS.quizResults, results);
}

// ---- Journey (visit history, drives Learning Path breadcrumb + Continue Learning) ----

export function getJourney() {
  return read(KEYS.journey, []);
}

export function recordJourneyStep(topic) {
  const journey = read(KEYS.journey, []);
  journey.push({ topicId: topicId(topic), topic: topic.trim(), timestamp: new Date().toISOString() });
  // Keep the journey from growing unbounded — the last 200 steps is plenty
  // for "Continue Learning" and the breadcrumb view.
  write(KEYS.journey, journey.slice(-200));
}

export function getMostRecentTopic() {
  const journey = getJourney();
  return journey.length > 0 ? journey[journey.length - 1] : null;
}

// ---- Usage / token metrics (drives the dev Usage panel) ----

export function getUsageLog() {
  return read(KEYS.usage, []);
}

export function logUsage(entry) {
  const log = read(KEYS.usage, []);
  log.push({ timestamp: new Date().toISOString(), ...entry });
  write(KEYS.usage, log.slice(-500));
}

// ---- Theme ----

export function getTheme() {
  return read(KEYS.theme, null); // null = follow system preference
}

export function setTheme(theme) {
  write(KEYS.theme, theme);
}

// ---- Export helpers ----

export function exportLibraryAsJSON() {
  return JSON.stringify(
    {
      library: getLibrary(),
      lessons: read(KEYS.cache, {}),
      schedules: getSchedules(),
      quizResults: getQuizResults(),
    },
    null,
    2
  );
}
