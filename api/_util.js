import { createHash } from "node:crypto";

/** Strips markdown fences / leading-trailing prose and extracts the JSON object body. */
export function extractJson(raw) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) return raw.slice(start, end + 1);
  return raw.trim();
}

export function cacheKey(parts) {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

// A retry that just repeats "return valid JSON" only helps when the
// model wandered off-format (added commentary, wrong shape) — if the
// failure was actually running out of max_tokens mid-string (stop_reason
// "max_tokens"), asking for the SAME content in the SAME budget just
// reproduces the identical truncation. Raising max_tokens ceilings has
// needed repeated correction as real usage found richer and richer
// topics (see the comment on MAX_TOKENS_BY_DIFFICULTY in _prompts.js) —
// this is the structural complement: when a retry is triggered BY a
// truncation, ask for a more concise answer instead of just repeating
// the request, so the retry has a real chance of fitting even if this
// particular ceiling turns out tight for this particular topic.
//
// `issue` is a human-readable description of what's actually wrong —
// either a JSON.parse error message, or a message from the caller's
// `validate()` (see createJsonCompletion below). Passing the SPECIFIC
// problem back to the model (not just "try again") is what makes the
// second attempt meaningfully more likely to succeed than the first —
// found necessary after switching to a cheaper/faster model that
// sometimes returns syntactically valid JSON silently missing required
// fields (no parse error, so nothing would have caught it without this).
function retryInstruction(userMessage, truncated, issue) {
  const correction = truncated
    ? "Your previous response was cut off before completing valid JSON — it ran too long for the available length. This time, write MORE CONCISELY (shorter paragraphs, fewer words per field) while still including every required field with real content, so the complete JSON fits. Return ONLY the raw JSON object — no markdown fences, no extra text."
    : `Your previous response was invalid or incomplete (${issue}). Return a COMPLETE, valid JSON object matching the required shape exactly — every field present, no markdown fences, no extra text.`;
  return `${userMessage}\n\n${correction}`;
}

/**
 * One non-streaming Claude call that must return JSON matching a shape,
 * with the "retry once on invalid JSON" behavior PROMPT.md requires
 * uniformly (originally only implemented in teach.js's streaming path —
 * quiz.js/grade.js/practice.js need it too, since any of them can truncate
 * or wander off-format just like the lesson call can).
 *
 * `validate(parsed)` is optional: return a short string describing what's
 * wrong (missing/malformed field) to trigger the same retry path as a
 * JSON.parse failure, or null/undefined if the shape is acceptable.
 * Without this, a syntactically valid but incomplete response (e.g.
 * missing a required field) would silently pass through and only fail
 * later, deep in a component that assumes the field exists.
 */
export async function createJsonCompletion({ client, model, maxTokens, systemPrompt, userMessage, validate }) {
  async function attempt(message) {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: message }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    return { raw: textBlock ? textBlock.text : "", usage: response.usage, truncated: response.stop_reason === "max_tokens" };
  }

  function parse(raw) {
    const parsed = JSON.parse(extractJson(raw));
    const issue = validate?.(parsed);
    if (issue) throw new Error(issue);
    return parsed;
  }

  let { raw, usage, truncated } = await attempt(userMessage);
  try {
    return { parsed: parse(raw), usage };
  } catch (err) {
    ({ raw, usage } = await attempt(retryInstruction(userMessage, truncated, err.message)));
    return { parsed: parse(raw), usage };
  }
}

/**
 * Minimal in-memory LRU, keyed by hash(topic|difficulty|...). Lives for the
 * lifetime of a warm serverless instance — a real hit rate booster across
 * requests that land on the same warm function, though (unlike Vercel KV)
 * it does NOT survive a cold start or share state across instances. Swap
 * for Vercel KV (`@vercel/kv`) if cross-instance/cross-device cache hits
 * become worth the extra provisioned resource — see PROMPT.md.
 */
export class LRUCache {
  constructor(maxEntries = 200) {
    this.maxEntries = maxEntries;
    this.map = new Map();
  }
  get(key) {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value); // refresh recency
    return value;
  }
  set(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }
}

// Module-level singletons — persist across requests within one warm
// serverless instance (not across instances/cold starts).
export const lessonCache = new LRUCache(200);
export const quizCache = new LRUCache(200);
