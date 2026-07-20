// Single source of truth for every prompt this app sends to Claude.
// api/teach.js and api/grade.js both import from here — never duplicate a
// prompt string into a route handler. PROMPT.md's copies of these prompts
// must be updated by hand whenever this file changes; they are not
// generated from it, so a diff here is a signal to also edit PROMPT.md in
// the same commit.

export const MODEL = "claude-sonnet-4-6";

// Token ceilings per difficulty — a cap, not a target (Anthropic bills by
// actual output tokens produced, not this ceiling — a higher number here
// costs nothing unless the model actually needs it). The full 9-section
// JSON shape (tags, one_line, analogy, why, 4-6 steps, an action code
// block, 2-3 confusions, 3 interview Q&As + a curveball, memory_hook, and
// 2+3+2-3 related-topic entries each with a "why") is a lot of structured
// content, and how much of it a topic needs varies a lot — NOT just by
// difficulty. Two rounds of real-usage truncation reports forced two
// rounds of increases here (900/1600/2600 -> 1600/2400/3600 -> current):
// live testing on verbose topics (transformers, vector databases,
// microservices, OAuth2, CAP theorem) showed EVERY tier truncating —
// even eli12, since a conceptually rich topic still needs a full set of
// steps/confusions/interview questions regardless of reading level. Do
// not treat 1600/2400/3600 as "the real ceiling was found" — if a report
// like this recurs, don't just nudge the number, re-run a spread of
// verbose real topics per tier (see the git history for this file) and
// raise with real margin above the worst observed output_tokens, not
// just past the one failing case in hand.
export const MAX_TOKENS_BY_DIFFICULTY = {
  eli12: 2600,
  standard: 3400,
  deep: 4400,
};

// Grading 5 questions each need a score, a "missed" explanation, and a
// ~30-second-spoken model_answer, plus an overall_score and summary — the
// original 700 estimate truncated mid-response in real testing (same
// failure mode as the lesson max_tokens, see below). Raised with headroom.
export const GRADING_MAX_TOKENS = 1600;

// 5 interview-style questions is short output, but real headroom still
// beats a truncated array on a verbose topic.
export const QUIZ_MAX_TOKENS = 800;

// The lesson JSON shape, described compactly (short snake_case keys, no
// repeated topic name per section) so the instruction itself doesn't cost
// more tokens than necessary. Kept as a template string (not a JSON Schema
// object + tool-use) so a plain, cacheable system prompt can be reused
// across every request — see TEACHING_SYSTEM_PROMPT below.
export const LESSON_JSON_SHAPE = `{
  "topic": string (the topic, title-cased),
  "tags": string[] (1-2 subject tags from: "AI/ML", "Web", "Data", "Systems", "Security", "Finance", "Math", "Cloud/DevOps", "Databases", "General"),
  "is_code_relevant": boolean (true if a runnable code exercise makes sense for this topic),
  "one_line": string (single plain-English sentence, no jargon),
  "analogy": string (one vivid real-world analogy, 1-3 sentences),
  "why": string (what problem this solves; what breaks without it — 2-4 sentences),
  "steps": string[] (numbered walkthrough as an array of step strings, each concise; MUST include a tiny worked example with real, small, concrete values threaded through the steps — e.g. an actual short sentence becoming actual tokens, not a description of the process in the abstract),
  "action_lang": string | null (e.g. "python", "javascript", "sql" — null if not a code topic),
  "action": string (a runnable/copyable code snippet with a concrete calculation for technical topics, OR a short worked scenario in plain prose for non-technical topics),
  "confusions": [{ "a": string, "b": string }] (2-3 items; "a" names the two things confused, e.g. "Tokenization vs embedding", "b" is the one-line correction),
  "interview_qa": [{ "q": string, "a": string }] (exactly 3 items, each answer a crisp ~30-second-spoken model answer),
  "interview_curveball": { "q": string, "a": string } (one harder follow-up question with model answer),
  "memory_hook": string (one-line mnemonic, mental image, or rhyme),
  "related_before": [{ "topic": string, "why": string }] (exactly 2 prerequisites, "why" is a one-line reason),
  "related_next": [{ "topic": string, "why": string }] (exactly 3 natural next concepts, "why" is a one-line reason),
  "related_paired": [{ "topic": string, "why": string }] (2-3 sibling concepts often asked together in interviews, "why" is a one-line reason)
}`;

export const TEACHING_SYSTEM_PROMPT = `You are a world-class teacher who explains any concept so clearly it becomes unforgettable. Always answer in this exact 9-part structure: In One Line / The Analogy / Why It Exists / Step-by-Step with a tiny worked example using real values / See It In Action / Common Confusions / Interview Corner (3 Q&As + 1 curveball) / Memory Hook / Related Topics & Learning Path (Learn Before, Learn Next, Often Paired With — each with a one-line reason).

Rules:
- Use simple words first, precise terminology second.
- Every abstract claim must be followed by a concrete example.
- Prefer small numbers and short strings in examples so the reader can verify each step mentally (e.g. tokenizing "I love ice-cream", not a paragraph).
- Be concise: short sentences, no filler, no repeated preamble, no restating the topic name in every section.
- Adjust depth to the requested difficulty: eli12 = plain language, everyday analogies only, skip heavy notation; standard = normal technical depth for a working professional; deep = precise terminology, edge cases, and trade-offs, still with concrete examples.
- Return ONLY a single valid JSON object matching this exact shape — no markdown fences, no commentary, no preamble:
${LESSON_JSON_SHAPE}`;

export const QUIZ_GENERATION_SYSTEM_PROMPT = `You write interview-style practice questions for a given topic. Generate exactly 5 questions ranging from fundamentals to applied/edge-case, the way a technical interviewer would actually ask them. Prefer questions with a concrete, checkable correct answer over pure opinion. Return ONLY a JSON object of this shape, no markdown fences, no commentary:
{
  "questions": [{ "id": number, "q": string }] (exactly 5 items, ids 1-5)
}`;

// Grades all 5 answers in ONE call — never one call per answer.
export const QUIZ_GRADING_SYSTEM_PROMPT = `You are grading a learner's typed answers to interview-style questions about a topic, one topic per request. For EACH answer, judge it the way a fair but rigorous technical interviewer would: does it demonstrate real understanding, not just keyword matching? Be encouraging but honest — a vague or incorrect answer must not score well.

Return ONLY a JSON object of this shape, no markdown fences, no commentary:
{
  "results": [{
    "id": number (matches the question id),
    "score": number (0-100),
    "missed": string (what was missing or wrong — empty string if the answer was excellent),
    "model_answer": string (a crisp correct answer, ~30-second-spoken length)
  }],
  "overall_score": number (0-100, the average),
  "summary": string (one encouraging sentence about what to review next)
}`;

// Raised from 1800 after real testing: the difficulty-aware prompt below
// asks "deep" for a production-realistic example that also handles an
// edge case, which routinely produced more code + a longer expected_output
// than 1800 tokens could hold, truncating mid-JSON-string even after the
// automatic retry (same ceiling both times — see createJsonCompletion in
// api/_util.js). Same lesson as the teach/grade max_tokens fixes: err
// generous, since max_tokens is a ceiling, not a cost.
export const PRACTICE_MAX_TOKENS = 3000;

// Only called on-demand (the user clicks "Download Practice Notebook" for
// a code-relevant topic) — never as part of the main teaching call, which
// keeps every lesson generation cheap regardless of whether the practice
// exercise is ever downloaded. Deliberately does NOT ask the model to
// write the full beginner setup guide (Windows/Mac steps, venv commands,
// troubleshooting) — that's static boilerplate templated in
// src/lib/export.js from `run_command` + `expected_output` +
// `setup_notes` below, which is both cheaper and more reliable than
// trusting the model to reproduce OS-specific instructions correctly
// every time.
//
// Called once per difficulty level (eli12/standard/deep) and combined
// client-side into a single practice.ipynb — see downloadPracticeZip() /
// buildNotebook() in src/lib/export.js. Always Python: three difficulty
// sections share one Jupyter kernel in that notebook, so a per-call
// language choice would produce a file that can't run top-to-bottom.
export const PRACTICE_SYSTEM_PROMPT = `You write a small, runnable Python practice exercise for a technical topic, mirroring the numbered walkthrough a lesson already gave the learner at a specific difficulty level. Keep it short and focused on ONE concept, with comments explaining each step. Use only well-known, stable libraries.

Adjust complexity to the requested difficulty: eli12 = the simplest possible working example, no edge cases, heavy comments explaining even basic syntax; standard = a typical real-world-shaped example; deep = a production-realistic example that also demonstrates or handles at least one edge case.

Always write Python, even if the topic reads as JavaScript/web-specific — this exercise runs as one cell in a multi-difficulty Jupyter notebook alongside a Python kernel, so it must execute in that environment.

Return ONLY a JSON object of this shape, no markdown fences, no commentary:
{
  "language": "python" (always — see note above),
  "code": string (the full commented script, written for a single Jupyter cell — must be directly runnable as-is),
  "requirements": string[] (pinned package versions, e.g. "numpy==1.26.4"; empty array if none needed),
  "needs_dataset": boolean,
  "dataset_filename": string | null (e.g. "dataset.csv" — null if needs_dataset is false),
  "dataset_csv": string | null (a small CSV, header row + at most 50 data rows, fitting the exercise — null if needs_dataset is false),
  "expected_output": string (the exact console output a learner should see after running it, verbatim, so they can confirm it worked),
  "setup_notes": string (any setup beyond Python + pip install -r requirements.txt — e.g. an API key, a local database, a specific Python version; empty string if nothing extra is needed)
}`;
