import { getCachedLesson, setCachedLesson, getCachedQuiz, setCachedQuiz, getCachedPractice, setCachedPractice, logUsage } from "./store.js";

/**
 * Fetches a lesson for a topic+difficulty. Checks the LOCAL cache first —
 * a repeat request for the same topic+difficulty never touches the
 * network at all (the biggest lever in the token-efficiency design; see
 * PROMPT.md). `onProgress(chars)` is called as the server streams text
 * (for a live progress indicator); `mode: "regenerate"` bypasses both the
 * local and server caches.
 */
export async function teachTopic(topic, difficulty, { mode = "generate", onProgress } = {}) {
  if (mode !== "regenerate") {
    const cached = getCachedLesson(topic, difficulty);
    if (cached) {
      logUsage({ topic, difficulty, cached: true, source: "client_cache", inputTokens: 0, outputTokens: 0 });
      return { lesson: cached, usage: { cached: true, source: "client_cache" } };
    }
  }

  const res = await fetch("/api/teach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, difficulty, mode }),
  });
  if (!res.ok || !res.body) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error ?? `Request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lesson = null;
  let usage = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.type === "progress") onProgress?.(event.chars);
      else if (event.type === "cache_hit") onProgress?.(null, "server_cache");
      else if (event.type === "result") {
        lesson = event.lesson;
        usage = event.usage;
      } else if (event.type === "error") {
        throw new Error(event.message);
      }
    }
  }

  if (!lesson) throw new Error("No lesson was returned.");

  setCachedLesson(topic, difficulty, lesson);
  logUsage({
    topic,
    difficulty,
    cached: Boolean(usage?.cached),
    source: usage?.cached ? "server_cache" : "api",
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
    cacheReadTokens: usage?.cache_read_input_tokens ?? 0,
    cacheCreationTokens: usage?.cache_creation_input_tokens ?? 0,
  });

  return { lesson, usage };
}

export async function generateQuiz(topic) {
  const cached = getCachedQuiz(topic);
  if (cached) {
    logUsage({ topic, kind: "quiz_generate", cached: true, source: "client_cache", inputTokens: 0, outputTokens: 0 });
    return cached;
  }

  const res = await fetch("/api/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error ?? "Failed to generate quiz");
  }
  const data = await res.json();
  setCachedQuiz(topic, data.questions);
  logUsage({
    topic,
    kind: "quiz_generate",
    cached: Boolean(data.cached),
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  });
  return data.questions;
}

export async function gradeQuiz(topic, answers) {
  const res = await fetch("/api/grade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, answers }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error ?? "Failed to grade quiz");
  }
  const data = await res.json();
  logUsage({
    topic,
    kind: "quiz_grade",
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  });
  return data;
}

/** On-demand practice-exercise generation — only called when the user clicks "Download practice ZIP". */
export async function generatePractice(topic, steps) {
  const cached = getCachedPractice(topic);
  if (cached) {
    logUsage({ topic, kind: "practice", cached: true, source: "client_cache", inputTokens: 0, outputTokens: 0 });
    return cached;
  }

  const res = await fetch("/api/practice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, steps }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error ?? "Failed to generate practice exercise");
  }
  const data = await res.json();
  setCachedPractice(topic, data.practice);
  logUsage({
    topic,
    kind: "practice",
    cached: Boolean(data.cached),
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  });
  return data.practice;
}
