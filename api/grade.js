import Anthropic from "@anthropic-ai/sdk";
import { MODEL, GRADING_MAX_TOKENS, QUIZ_GRADING_SYSTEM_PROMPT } from "./_prompts.js";
import { createJsonCompletion } from "./_util.js";

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

  const { topic, answers } = body || {};
  // answers: [{ id, q, a }] — the learner's typed answer per question.
  if (!topic || !Array.isArray(answers) || answers.length === 0) {
    res.status(400).json({ error: "topic and answers[] are required" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
    return;
  }

  const client = new Anthropic({ apiKey });
  // All answers graded in ONE call, not one call per question — see
  // "Quiz efficiency" in CLAUDE.md/PROMPT.md.
  const userMessage = `Topic: ${topic}\n\nQuestions and the learner's answers:\n${answers
    .map((a) => `${a.id}. Q: ${a.q}\nLearner's answer: ${a.a || "(left blank)"}`)
    .join("\n\n")}`;

  try {
    const { parsed, usage } = await createJsonCompletion({
      client,
      model: MODEL,
      maxTokens: GRADING_MAX_TOKENS,
      systemPrompt: QUIZ_GRADING_SYSTEM_PROMPT,
      userMessage,
    });
    res.status(200).json({
      ...parsed,
      usage: {
        input_tokens: usage?.input_tokens ?? 0,
        output_tokens: usage?.output_tokens ?? 0,
        cache_read_input_tokens: usage?.cache_read_input_tokens ?? 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to grade quiz" });
  }
}
