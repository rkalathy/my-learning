import Anthropic from "@anthropic-ai/sdk";
import { MODEL, MAX_TOKENS_BY_DIFFICULTY, TEACHING_SYSTEM_PROMPT } from "./_prompts.js";
import { extractJson, cacheKey, lessonCache } from "./_util.js";

export const config = { runtime: "nodejs" };

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured on the server. Add it as a Vercel environment variable.");
  }
  return new Anthropic({ apiKey });
}

function send(res, event) {
  res.write(JSON.stringify(event) + "\n");
}

/**
 * Streams one lesson generation from Claude. Raw JSON text deltas are NOT
 * forwarded to the client verbatim (half-formed JSON isn't renderable) —
 * instead each delta bumps a `progress` event (running character count)
 * so the UI can show real streaming feedback (a growing progress bar)
 * without trying to render invalid JSON mid-stream. The full text is only
 * parsed once the stream completes.
 */
async function streamLesson(client, res, topic, difficulty, correction) {
  const maxTokens = MAX_TOKENS_BY_DIFFICULTY[difficulty] ?? MAX_TOKENS_BY_DIFFICULTY.standard;
  const userMessage = correction ? `Topic: ${topic}\nDifficulty: ${difficulty}\n\n${correction}` : `Topic: ${topic}\nDifficulty: ${difficulty}`;

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    // The teaching system prompt + JSON shape are identical on every call
    // — cache_control lets repeated calls reuse Anthropic's prompt cache
    // (~90% cheaper input tokens after the first call in a session).
    system: [{ type: "text", text: TEACHING_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMessage }],
  });

  let charCount = 0;
  stream.on("text", (delta) => {
    charCount += delta.length;
    send(res, { type: "progress", chars: charCount });
  });

  const finalMessage = await stream.finalMessage();
  const textBlock = finalMessage.content.find((b) => b.type === "text");
  const raw = textBlock ? textBlock.text : "";
  return { raw, usage: finalMessage.usage, truncated: finalMessage.stop_reason === "max_tokens" };
}

// A retry that just repeats "return valid JSON" only helps when the model
// wandered off-format — if the first attempt actually ran out of
// max_tokens mid-string, asking for the SAME content in the SAME budget
// just reproduces the identical truncation. When that's what happened,
// ask for a more concise answer instead.
function retryCorrection(truncated) {
  return truncated
    ? "Your previous response was cut off before completing valid JSON — it ran too long for the available length. This time, write MORE CONCISELY (shorter paragraphs, fewer words per field, trim the least essential steps/confusions) while still including every required field with real content, so the complete JSON fits. Return ONLY the raw JSON object — no markdown fences, no extra text."
    : "Your previous response did not parse as valid JSON matching the required shape. Return ONLY the raw JSON object this time — no markdown fences, no extra text.";
}

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

  const { topic, difficulty = "standard", mode = "generate" } = body || {};
  if (!topic || typeof topic !== "string" || !topic.trim()) {
    res.status(400).json({ error: "topic is required" });
    return;
  }
  const normalizedTopic = topic.trim();
  const key = cacheKey({ topic: normalizedTopic.toLowerCase(), difficulty });

  res.writeHead(200, {
    "Content-Type": "application/x-ndjson",
    "Cache-Control": "no-cache",
  });

  // Server-side cache: even a device/browser with an empty local library
  // gets a zero-token response for a topic+difficulty this warm instance
  // has already generated — unless the client explicitly asked to
  // regenerate (the "Regenerate ↻" button sets mode: "regenerate").
  if (mode !== "regenerate") {
    const cached = lessonCache.get(key);
    if (cached) {
      send(res, { type: "cache_hit", source: "server_lru" });
      send(res, { type: "result", lesson: cached, usage: { cached: true } });
      res.end();
      return;
    }
  }

  let client;
  try {
    client = getClient();
  } catch (err) {
    send(res, { type: "error", message: err.message });
    res.end();
    return;
  }

  try {
    let { raw, usage, truncated } = await streamLesson(client, res, normalizedTopic, difficulty, null);
    let lesson;
    try {
      lesson = JSON.parse(extractJson(raw));
    } catch {
      // One retry, per the "robust JSON parsing" requirement — the
      // correction differs depending on whether the first attempt was
      // cut off by max_tokens (ask for brevity) or just malformed (ask
      // for strict JSON), see retryCorrection() above.
      ({ raw, usage } = await streamLesson(client, res, normalizedTopic, difficulty, retryCorrection(truncated)));
      lesson = JSON.parse(extractJson(raw));
    }

    lessonCache.set(key, lesson);

    send(res, {
      type: "result",
      lesson,
      usage: {
        input_tokens: usage?.input_tokens ?? 0,
        output_tokens: usage?.output_tokens ?? 0,
        cache_read_input_tokens: usage?.cache_read_input_tokens ?? 0,
        cache_creation_input_tokens: usage?.cache_creation_input_tokens ?? 0,
        cached: false,
      },
    });
  } catch (err) {
    send(res, { type: "error", message: err instanceof Error ? err.message : "Failed to generate lesson" });
  } finally {
    res.end();
  }
}
