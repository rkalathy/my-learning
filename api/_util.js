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
