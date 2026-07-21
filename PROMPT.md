# PROMPT.md — Disaster recovery

If this codebase is ever lost, this file has everything needed to rebuild
it: (a) the complete original build prompt, verbatim; (b) the exact
teaching system prompt as shipped in `api/_prompts.js`; (c) the
quiz-generation and quiz-grading prompts; (d) the JSON response schemas;
(e) a short "how to rebuild" note.

**Keep this file updated whenever any prompt in the code changes** — the
copies below are frozen text, not generated from the source, so they will
silently drift out of sync with `api/_prompts.js` unless you edit both in
the same commit. If you're ever unsure which is current, `api/_prompts.js`
is the source of truth for what's actually running; treat a mismatch here
as a bug to fix, not a real behavior difference.

---

## (e) How to rebuild

1. Paste section (a) below into a coding agent (Claude Code, Cursor, etc.)
   in an empty project folder named `My Learning`.
2. Once the agent has scaffolded the app, replace whatever teaching/quiz/
   grading/practice prompts it generated with the exact text in sections
   (b), (c), and (d) below — the agent's first draft will be close but not
   necessarily byte-identical to what was actually shipped and tuned.
3. Provide an `ANTHROPIC_API_KEY` (as a Vercel environment variable, never
   committed) and verify the acceptance checklist at the bottom of this
   file before considering the rebuild complete.

---

## (a) The complete original build prompt, verbatim

Build "My Learning" — An AI-Powered Learn-Anything Website

Copy everything below this line into your AI coding tool (Claude Code, Cursor, etc.).

Role

You are a senior full-stack engineer and learning-science expert. Build a complete web application called My Learning, a personal learning companion.

Project location: create the entire project inside a folder named My Learning in my current VS Code workspace (mkdir "My Learning" && cd "My Learning" before scaffolding anything). All code, the Git repo, and config files live under this folder. I type any topic, word, or concept I don't understand (e.g., "tokenization", "embedding", "OAuth", "normalization") and the app returns a clear, structured, memorable explanation designed so the concept sticks in my mind and I can answer it confidently in interviews.

Core user flow

I type a topic into a large search box (with suggestions from my past topics) and hit "Teach Me".
The app calls an LLM API with a carefully engineered teaching prompt (below) and streams the answer.
The explanation renders as a structured, beautifully formatted lesson card (sections below).
The lesson is automatically saved to My Library so I can revisit, and the app schedules it for spaced-repetition review.
A "Quiz Me" button generates interview-style questions on that topic and checks my answers.

The lesson structure (this is the heart of the product)

Every explanation MUST be generated in this exact structure, each as a visually distinct section:

In One Line — the concept in a single plain-English sentence a 12-year-old could repeat.
The Analogy 🧠 — one vivid real-world analogy (this is what makes it stick). E.g., tokenization = "cutting a sentence into Lego bricks before building".
Why It Exists — what problem it solves; what breaks without it.
Step-by-Step: How It Actually Works — a numbered walkthrough with a tiny concrete worked example (real input → each transformation → real output). For "tokenization": take the sentence "I love ice-cream", show it becoming ["I", "love", "ice", "-", "cream"] and then token IDs.
See It In Action — a runnable/copyable code snippet or concrete calculation when the topic is technical; a worked scenario otherwise.
Common Confusions ⚠️ — 2–3 things people mix up (e.g., tokenization vs embedding), each corrected in one line.
Interview Corner 🎯 — 3 likely interview questions with crisp model answers (30-second spoken length), plus one "curveball" follow-up. On screen this section is collapsed by default (optional to expand — not forced on the reader), but it is ALWAYS generated and ALWAYS included in the downloaded PDF/Word document.
Memory Hook 📌 — a one-line mnemonic, mental image, or rhyme to recall the concept months later.
Related Topics & Learning Path 🔗 — for learning continuity, every lesson ends with three groups of clickable related topics: Learn Before (2 prerequisites — if you struggled with this topic, learn these first), Learn Next (3 natural next concepts that build on this one), and Often Paired With (2–3 sibling concepts frequently asked together in interviews, e.g., tokenization → embedding, attention, vector database). Each item carries a one-line "why this connects" note.

The teaching system prompt (embed this in the app)

When calling the LLM, use a system prompt equivalent to:

"You are a world-class teacher who explains any concept so clearly it becomes unforgettable. Always answer in the 9-section structure: In One Line / The Analogy / Why It Exists / Step-by-Step with a tiny worked example using real values / See It In Action / Common Confusions / Interview Corner (3 Q&As + 1 curveball) / Memory Hook / Related Topics & Learning Path (Learn Before, Learn Next, Often Paired With — each with a one-line reason). Use simple words first, precise terminology second. Every abstract claim must be followed by a concrete example. Prefer small numbers and short strings in examples so the reader can verify each step mentally. Return the answer ONLY as JSON matching the provided schema so the UI can render each section."

Have the LLM return structured JSON (one key per section) and render each section into its own styled card component.

Features

MUST:

Topic search with streaming AI response and graceful loading/error states.
The 9-section lesson renderer with icons, code highlighting, and copy buttons.
My Library: every lesson auto-saved locally; list with search, tags (auto-tagged by subject: AI/ML, Web, Data, Finance, ...), date learned, and re-open.
Quiz Me mode: generates 5 interview questions for a saved topic; I type answers; the LLM grades each (score + what I missed + model answer).
Spaced repetition: each topic gets review dates (1 day, 3 days, 7 days, 21 days after learning). A "Due for Review" section on the home screen lists topics to revisit today; reviewing = passing a 2-question mini-quiz, which advances the schedule.
Difficulty toggle: Explain Like I'm 12 / Standard / Deep Dive — regenerates the lesson at that depth.
Related-topic chips & Learning Path (continuity engine): the Learn Before / Learn Next / Often Paired With chips are clickable — one click launches that topic's lesson and records the journey. Chips show a ✓ badge if the topic is already in My Library (so I instantly see what I've covered and what's missing). A Learning Path view draws my journey as a visual breadcrumb/map (e.g., tokenization → embedding → attention), and a "Continue Learning" card on the home screen suggests the next unlearned topic from my most recent lesson's Learn Next list — so there is always an obvious next step and the learning never dead-ends.
Export any lesson or the whole library as Markdown and JSON.
Download as PDF / Word (user reference): every lesson has a "Download" button offering PDF and Word (.docx) formats, generated client-side (jsPDF or pdf-lib for PDF; the docx npm package for Word). The document is nicely styled (cover title, section headings, colours, code blocks) and contains ALL sections — including the full Interview Q&A even if it was collapsed on screen. When the topic involves tools, libraries, or code, the document must also include a "Setup & How to Run" chapter — a numbered, beginner-proof installation and execution guide (see requirements below). Also offer "Download entire Library" as one combined PDF/Word study book with a table of contents.
Practice code + dataset download: when a topic is code-relevant (e.g., tokenization, embedding, normalization), the lesson additionally generates a runnable practice file (Python script or Jupyter notebook with commented steps mirroring the lesson's walkthrough) and, if the exercise needs data, a small sample dataset (CSV/TXT, ≤ 50 rows) generated to fit the exercise. Offer these as individual downloads and as a single ZIP (topic-practice.zip containing practice.py / practice.ipynb, dataset.csv, and SETUP_GUIDE.md). Non-technical topics skip this gracefully.
Step-by-step Setup & Run guide (required in every code download): the SETUP_GUIDE.md inside the ZIP (and the "Setup & How to Run" chapter in the PDF/Word) must be a complete, numbered walkthrough a beginner can follow on Windows and Mac/Linux, covering: (1) prerequisites with exact install steps and download links (e.g., install Python 3.x, VS Code, or Node — with how to verify via python --version); (2) creating a virtual environment (python -m venv venv + the OS-specific activate command); (3) installing dependencies with the exact command (pip install -r requirements.txt — and include that requirements.txt with pinned versions in the ZIP); (4) how to run it (python practice.py, or how to open and run the notebook in Jupyter/VS Code, cell by cell); (5) the expected output shown verbatim so I can confirm it worked; and (6) a short Troubleshooting list of the 3 most likely errors (module not found, wrong Python version, file path issues) with fixes. Where a topic requires other tooling (e.g., a database, an API key), include those setup steps too, clearly marked.

SHOULD:

Compare mode: "tokenization vs embedding" input renders a side-by-side comparison table plus when-to-use-which.
Streak counter and "topics mastered" stats on the dashboard.
Dark mode.
Voice input for the search box (Web Speech API).

COULD:

Flashcard view (front = Memory Hook / question, back = In One Line) with swipe UI.
Share a lesson as a public read-only link.

Tech stack

Frontend: React (Vite) + Tailwind CSS. Design must be colourful, vibrant, and attractive — not a plain corporate look: a cheerful gradient hero (e.g., violet → pink → orange), each of the 9 lesson sections in its own distinctly coloured card with its icon, colour-coded topic tags, playful micro-animations (cards fade/slide in, confetti burst on completing a quiz, animated streak flame), rounded corners, soft shadows, and a friendly font (e.g., Nunito/Poppins for headings). Fully responsive, with dark mode keeping the colour identity. It should feel like a fun learning app (Duolingo-level energy), while keeping text highly readable.
AI: Anthropic API (claude-sonnet-4-6) via /v1/messages, streaming enabled, with the teaching system prompt above and a JSON response schema. Put the API key in an environment variable (VITE_-free — proxy through a tiny serverless function on Vercel so the key is never exposed in the browser).
Storage: localStorage for v1 (library, quiz scores, review schedule) behind a small store.js module with a clean interface, so it can be swapped for Firebase/Supabase later without touching the UI.
Hosting: Vercel (serverless function for the AI proxy + static frontend).

Architecture

api/teach.js — Vercel serverless function: receives { topic, difficulty, mode }, calls the Anthropic API with the teaching prompt, streams JSON back.
src/components/ — SearchBar, LessonCard (9 section subcomponents), Library, QuizMode, ReviewQueue, CompareView, DownloadMenu.
src/lib/store.js — save/load lessons, quiz results, spaced-repetition schedule.
src/lib/srs.js — pure functions for the 1/3/7/21-day review scheduling.
src/lib/export.js — PDF (jsPDF/pdf-lib), Word (docx), Markdown/JSON exports, and the practice-ZIP builder (JSZip).
Robust JSON parsing of the model reply (strip code fences, retry once on invalid JSON).

Required documentation files (create all three in the project root)

README.md — project overview, screenshots, features, setup steps (clone → install → env var → run → deploy), architecture diagram, caching design, and troubleshooting.
CLAUDE.md — instructions for Claude Code / AI assistants working on this repo: project purpose, folder structure, coding conventions, key commands (npm run dev, npm run build, vercel --prod), where the teaching prompt lives, the caching rules that must not be broken, and "do not commit secrets".
PROMPT.md — the disaster-recovery file: store the complete prompts needed to rebuild this website from scratch if it is ever lost. It must contain (a) this entire build prompt verbatim, (b) the final teaching system prompt exactly as shipped in api/teach.js, (c) the quiz-generation and quiz-grading prompts, (d) the JSON response schemas, and (e) a short "How to rebuild" note (paste section (a) into an AI coding tool, then restore prompts b–d). Keep PROMPT.md updated whenever any prompt in the code changes — they must never drift apart.

Token efficiency & caching (required — keep API costs minimal)

Minimize token usage on every LLM call, in this order of impact:

Anthropic prompt caching: the teaching system prompt and the JSON schema are identical on every call — send them as a system block with cache_control: { type: "ephemeral" } so repeated calls hit the prompt cache (~90% cheaper input tokens after the first call). Same for the Quiz-grading prompt.
Lesson cache (never regenerate what we already have): before calling the API, check the local library — if the same topic + difficulty + mode was already generated, load it from storage instantly with zero API calls. Add a small "Regenerate ↻" button for when I explicitly want a fresh version. Also cache lessons in the serverless function (in-memory LRU + optional Vercel KV) keyed by hash(topic|difficulty|mode) so even a new device/browser gets a cache hit without an LLM call.
Lean prompts: keep the system prompt tight (no redundant instructions); send only {topic, difficulty, mode} as the user message — never conversation history, since each lesson is independent.
Capped outputs: set sensible max_tokens per mode (ELI12 ≈ 800, Standard ≈ 1500, Deep Dive ≈ 2500; quiz grading ≈ 600). Instruct the model to be concise: short sentences, no filler, examples with small values.
Compact JSON: short snake_case keys in the response schema (one_line, analogy, steps, ...), no markdown fences, no repeated topic name in every section.
Quiz efficiency: grade all 5 answers in ONE call (send Q&A pairs together), not 5 separate calls.
Metrics: log input/output token counts and cache-hit rate per request (visible in a small dev "Usage" panel) so I can see the savings.

Git & GitHub & deployment (required)

Inside the My Learning folder: git init, incremental commits per milestone: M1 UI shell + search + AI proxy → M2 lesson renderer (colourful design system) → M3 library + Markdown/JSON export → M4 quiz mode → M5 spaced repetition + review queue → M6 caching + token metrics → M7 PDF/Word download + practice code/dataset ZIP → M8 docs (README.md, CLAUDE.md, PROMPT.md) + compare mode + polish.
Publish to GitHub: create a repository named my-learning and push (gh repo create my-learning --public --source=. --push, or ask me for an existing repo URL and git remote add origin ... && git push -u origin main). Every milestone gets pushed.
.gitignore (node_modules, .env, .vercel); README.md, CLAUDE.md, and PROMPT.md as specified above.
Deploy to Vercel by connecting the GitHub repo (auto-deploy on push) or vercel --prod; give me the live URL and the GitHub repo URL at the end.

Acceptance checklist (verify before you say you're done)

Typing "tokenization" returns a lesson with all 9 sections, including a worked example showing an actual sentence becoming actual tokens.
Typing "embedding" afterwards shows both topics in My Library, and "tokenization vs embedding" works in compare mode.
Quiz Me generates 5 interview questions, grades my typed answers, and stores the score.
A learned topic appears in "Due for Review" the next day (test by faking the clock in srs.js tests).
Difficulty toggle regenerates the same topic at a different depth.
The "tokenization" lesson shows Learn Before / Learn Next / Often Paired With chips; clicking "embedding" from there opens its lesson, the Learning Path shows tokenization → embedding, already-learned chips display a ✓, and the home screen's "Continue Learning" card suggests the next unlearned topic.
The API key is never visible in browser dev tools (network calls go to /api/teach only).
Library survives a page reload; export produces valid Markdown and JSON.
Requesting the SAME topic + difficulty twice makes ZERO API calls the second time (served from cache; verify in the Usage panel and network tab).
The Anthropic prompt-cache headers are present on API calls, and the Usage panel shows cache-hit token savings after the first lesson.
Downloading the "tokenization" lesson as PDF and as Word produces a styled document containing all 9 sections including the full Interview Q&A, even when that section was collapsed on screen.
A code-relevant topic offers a practice ZIP containing a runnable script/notebook, a requirements.txt, a SETUP_GUIDE.md with numbered install + run steps for Windows and Mac/Linux, expected output, and troubleshooting — and, where the exercise needs it, a matching sample dataset; following the guide from a clean environment, the script runs successfully and produces the documented expected output. The same Setup & How to Run chapter appears in the PDF/Word download for that topic.
README.md, CLAUDE.md, and PROMPT.md exist in the repo root, and PROMPT.md matches the prompts actually shipped in the code (spot-check the teaching prompt).
The UI is colourful and attractive per the design brief (gradient hero, coloured section cards, animations), verified in both light and dark mode.
The whole project lives under the My Learning folder, is pushed to the GitHub repo with a clean incremental commit history, and is live on Vercel.

Work milestone by milestone; run and verify after each before committing. Ask me for my Anthropic API key setup (I will add it as a Vercel environment variable myself — never commit it).

---

## (b) The teaching system prompt, exactly as shipped

Lives in `api/_prompts.js` as `TEACHING_SYSTEM_PROMPT`, used by `api/teach.js`.

```
You are a world-class teacher who explains any concept so clearly it becomes unforgettable. Always answer in this exact 9-part structure: In One Line / The Analogy / Why It Exists / Step-by-Step with a tiny worked example using real values / See It In Action / Common Confusions / Interview Corner (3 Q&As + 1 curveball) / Memory Hook / Related Topics & Learning Path (Learn Before, Learn Next, Often Paired With — each with a one-line reason).

Rules:
- Use simple words first, precise terminology second.
- Every abstract claim must be followed by a concrete example.
- Prefer small numbers and short strings in examples so the reader can verify each step mentally (e.g. tokenizing "I love ice-cream", not a paragraph).
- Be concise: short sentences, no filler, no repeated preamble, no restating the topic name in every section.
- Adjust depth to the requested difficulty: eli12 = plain language, everyday analogies only, skip heavy notation; standard = normal technical depth for a working professional; deep = precise terminology, edge cases, and trade-offs, still with concrete examples.
- Return ONLY a single valid JSON object matching this exact shape — no markdown fences, no commentary, no preamble:
{LESSON_JSON_SHAPE — see section (d) below}
```

The user message sent alongside it is just `Topic: {topic}\nDifficulty: {difficulty}` (or, on a JSON-parse retry, the same plus one corrective sentence asking for raw JSON only) — never conversation history, per the token-efficiency requirement.

Called with prompt caching:

```js
system: [{ type: "text", text: TEACHING_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }]
```

Model: `claude-haiku-4-5` (switched from `claude-sonnet-4-6` — see the "Model choice" note in CLAUDE.md's build-status section for why, and `validateLessonShape()` in `api/_prompts.js` for the safety net that made the switch safe). `max_tokens` per difficulty: eli12 = 2600, standard = 3400, deep = 4400. This is the SECOND increase — the original spec's ~800/1500/2500 estimates were raised once to 1600/2400/3600, which still truncated in later real-usage reports (verbose topics like "transformers"/"vector databases" hit the ceiling on every tier, including eli12 — a conceptually rich topic needs a full set of steps/confusions/interview questions regardless of reading level). If this recurs again, don't nudge the number from the one failing case in hand — test a spread of verbose real topics per tier and raise with real margin above the worst observed `output_tokens`. `max_tokens` is a ceiling, not a cost — Anthropic bills actual output tokens produced — so err generous here rather than re-tuning tightly.

---

## (c) Quiz generation and grading prompts

Both live in `api/_prompts.js`, used by `api/quiz.js` and `api/grade.js` respectively — also sent with `cache_control: { type: "ephemeral" }`.

### Quiz generation (`QUIZ_GENERATION_SYSTEM_PROMPT`)

```
You write interview-style practice questions for a given topic. Generate exactly 5 questions ranging from fundamentals to applied/edge-case, the way a technical interviewer would actually ask them. Prefer questions with a concrete, checkable correct answer over pure opinion. Return ONLY a JSON object of this shape, no markdown fences, no commentary:
{
  "questions": [{ "id": number, "q": string }] (exactly 5 items, ids 1-5)
}
```

### Quiz grading (`QUIZ_GRADING_SYSTEM_PROMPT`)

All 5 (or 2, for a review mini-quiz) answers are graded in **one** call, never one call per question:

```
You are grading a learner's typed answers to interview-style questions about a topic, one topic per request. For EACH answer, judge it the way a fair but rigorous technical interviewer would: does it demonstrate real understanding, not just keyword matching? Be encouraging but honest — a vague or incorrect answer must not score well.

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
}
```

`max_tokens`: quiz generation = 800, grading = 1600 (raised from the original ~500/700 estimates — grading especially truncated in real testing, since 5 questions each need a score/missed/model_answer). Both, plus practice generation, now go through `createJsonCompletion()` in `api/_util.js`, the same "strip fences, retry once on invalid JSON" helper `api/teach.js` already used — originally only the lesson call had this retry; real testing surfaced a truncation failure on `/api/grade` that a retry (and the raised ceiling) both needed to fix.

### Practice-exercise generation (`PRACTICE_SYSTEM_PROMPT`)

Used by `api/practice.js`, called **once per difficulty level** (eli12/standard/deep) **only on-demand** (the user clicks "Download Practice Notebook" for a code-relevant topic) — never as part of the main teaching call, so every lesson generation stays cheap regardless of whether the notebook is ever downloaded. The three calls are combined client-side into a single `practice.ipynb` (`buildNotebook()` in `src/lib/export.js`) — that's also why the prompt forces Python regardless of topic: three difficulty sections share one Jupyter kernel, so a per-call language choice would produce a file that can't run top-to-bottom. Deliberately does not ask the model to write the beginner setup guide's steps — those are a static template in `src/lib/export.js`'s `buildSetupGuidePdf()`, since that's both cheaper and more reliable than trusting the model to reproduce environment-setup instructions correctly every time.

```
You write a small, runnable Python practice exercise for a technical topic, mirroring the numbered walkthrough a lesson already gave the learner at a specific difficulty level. Keep it short and focused on ONE concept, with comments explaining each step. Use only well-known, stable libraries.

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
}
```

`max_tokens: 4000` (raised 1800->3000->4000 — the "deep" tier's edge-case requirement routinely produced more code + expected_output than earlier ceilings could hold; a topic-spread test found "quantum computing" landing at 2730/3000, 91% of the then-ceiling, too close to trust).

The retry-on-invalid-JSON behavior (`createJsonCompletion()` in `api/_util.js`, used by quiz/grade/practice) now distinguishes WHY the first attempt failed: if the response was cut off by `max_tokens` (checked via `stop_reason`), the retry asks for a more concise answer instead of repeating the same request in the same budget — the original retry just asked for "valid JSON," which reproduces an identical truncation when the real problem was length, not format. `api/teach.js`'s streaming retry got the equivalent fix.

The user message sent alongside it is `Topic: {topic}\nDifficulty: {difficulty}` plus the current lesson's walkthrough steps for that difficulty, so the exercise mirrors what the learner actually read.

---

## (d) JSON response schemas

### Lesson shape (`LESSON_JSON_SHAPE` in `api/_prompts.js`)

```json
{
  "topic": "string (the topic, title-cased)",
  "tags": ["string (1-2 of: AI/ML, Web, Data, Systems, Security, Finance, Math, Cloud/DevOps, Databases, General)"],
  "is_code_relevant": "boolean",
  "one_line": "string",
  "analogy": "string",
  "why": "string",
  "steps": ["string, ... numbered walkthrough with a tiny worked example using real values"],
  "action_lang": "string | null (e.g. python, javascript, sql — null if not code)",
  "action": "string (runnable code snippet, or a worked scenario in prose for non-technical topics)",
  "confusions": [{ "a": "string (the two things confused)", "b": "string (one-line correction)" }],
  "interview_qa": [{ "q": "string", "a": "string" }],
  "interview_curveball": { "q": "string", "a": "string" },
  "memory_hook": "string",
  "related_before": [{ "topic": "string", "why": "string" }],
  "related_next": [{ "topic": "string", "why": "string" }],
  "related_paired": [{ "topic": "string", "why": "string" }]
}
```

`confusions` has 2-3 items; `interview_qa` has exactly 3; `related_before` has exactly 2; `related_next` has exactly 3; `related_paired` has 2-3.

### Quiz question shape

```json
{ "questions": [{ "id": 1, "q": "string" }] }
```

exactly 5 items, ids 1-5.

### Quiz grading result shape

```json
{
  "results": [{ "id": 1, "score": 85, "missed": "string", "model_answer": "string" }],
  "overall_score": 85,
  "summary": "string"
}
```

### Practice exercise shape

See section (c) above — identical to `api/practice.js`'s response.

---

## Acceptance checklist status (updated as milestones land)

See `CLAUDE.md` for the current build status. Do not mark an item complete
here without actually re-running it — this file is a spec/log, not a
progress-theater document.
