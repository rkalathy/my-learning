import Anthropic from "@anthropic-ai/sdk";
import { MODEL, QUIZ_GENERATION_SYSTEM_PROMPT } from "./_prompts.js";
import { extractJson, cacheKey, quizCache } from "./_util.js";

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
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: [{ type: "text", text: QUIZ_GENERATION_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: `Topic: ${topic.trim()}` }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    const parsed = JSON.parse(extractJson(textBlock ? textBlock.text : ""));
    quizCache.set(key, parsed.questions);
    res.status(200).json({
      questions: parsed.questions,
      cached: false,
      usage: {
        input_tokens: message.usage?.input_tokens ?? 0,
        output_tokens: message.usage?.output_tokens ?? 0,
        cache_read_input_tokens: message.usage?.cache_read_input_tokens ?? 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to generate quiz" });
  }
}
