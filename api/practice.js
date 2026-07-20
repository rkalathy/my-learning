import Anthropic from "@anthropic-ai/sdk";
import { MODEL, PRACTICE_MAX_TOKENS, PRACTICE_SYSTEM_PROMPT } from "./_prompts.js";
import { cacheKey, quizCache, createJsonCompletion } from "./_util.js";

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { topic, difficulty = "standard", steps } = body || {};
  if (!topic) {
    res.status(400).json({ error: "topic is required" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
    return;
  }

  // Reuses the generic quizCache LRU (keyed distinctly via "practice" kind)
  // rather than a fourth cache instance — same lifetime/eviction policy is
  // fine for this call volume. Keyed by difficulty too: the combined
  // practice notebook calls this once per difficulty level, and an
  // eli12/standard/deep exercise for the same topic are meaningfully
  // different, not interchangeable cache hits.
  const key = cacheKey({ kind: "practice", topic: topic.trim().toLowerCase(), difficulty });
  const cached = quizCache.get(key);
  if (cached) {
    res.status(200).json({ practice: cached, cached: true });
    return;
  }

  const client = new Anthropic({ apiKey });
  const stepsContext = Array.isArray(steps) && steps.length > 0 ? `\n\nLesson's walkthrough steps (mirror these):\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}` : "";

  try {
    const { parsed: practice, usage } = await createJsonCompletion({
      client,
      model: MODEL,
      maxTokens: PRACTICE_MAX_TOKENS,
      systemPrompt: PRACTICE_SYSTEM_PROMPT,
      userMessage: `Topic: ${topic.trim()}\nDifficulty: ${difficulty}${stepsContext}`,
    });
    quizCache.set(key, practice);
    res.status(200).json({
      practice,
      cached: false,
      usage: {
        input_tokens: usage?.input_tokens ?? 0,
        output_tokens: usage?.output_tokens ?? 0,
        cache_read_input_tokens: usage?.cache_read_input_tokens ?? 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to generate practice exercise" });
  }
}
