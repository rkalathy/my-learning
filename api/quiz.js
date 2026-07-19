import Anthropic from "@anthropic-ai/sdk";
import { MODEL, QUIZ_MAX_TOKENS, QUIZ_GENERATION_SYSTEM_PROMPT } from "./_prompts.js";
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

  const { topic } = body || {};
  if (!topic || typeof topic !== "string" || !topic.trim()) {
    res.status(400).json({ error: "topic is required" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
    return;
  }

  const key = cacheKey({ kind: "quiz", topic: topic.trim().toLowerCase() });
  const cached = quizCache.get(key);
  if (cached) {
    res.status(200).json({ questions: cached, cached: true });
    return;
  }

  const client = new Anthropic({ apiKey });

  try {
    const { parsed, usage } = await createJsonCompletion({
      client,
      model: MODEL,
      maxTokens: QUIZ_MAX_TOKENS,
      systemPrompt: QUIZ_GENERATION_SYSTEM_PROMPT,
      userMessage: `Topic: ${topic.trim()}`,
    });
    quizCache.set(key, parsed.questions);
    res.status(200).json({
      questions: parsed.questions,
      cached: false,
      usage: {
        input_tokens: usage?.input_tokens ?? 0,
        output_tokens: usage?.output_tokens ?? 0,
        cache_read_input_tokens: usage?.cache_read_input_tokens ?? 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to generate quiz" });
  }
}
