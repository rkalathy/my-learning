# CLAUDE.md

Guidance for Claude Code (and other AI coding tools) working in this
repository.

## What this is

**My Learning** is a personal learning companion: type any topic and get
a structured, memorable 9-section explanation (In One Line, The Analogy,
Why It Exists, Step-by-Step, See It In Action, Common Confusions,
Interview Corner, Memory Hook, Related Topics & Learning Path), generated
by Claude and rendered as colorful cards. It also has a Quiz Me mode,
spaced-repetition review scheduling, and PDF/Word/practice-ZIP export.

The full build spec — every requirement, the exact prompts, JSON schemas,
and a disaster-recovery "how to rebuild" note — lives in
[`PROMPT.md`](./PROMPT.md). Read it before touching a prompt or the
teach/quiz/grade/practice API routes.

## Commands

- `npm run dev` — Vite frontend only (no `/api/*` routes; fine for
  UI-only work)
- `npm run dev:full` — `vercel dev`, serves both the frontend AND the
  `/api/*` serverless functions locally. **Use this for anything that
  touches teach/quiz/grade/practice.** Needs `ANTHROPIC_API_KEY` in
  `.env` (copy `.env.example`).
- `npm run build` — production build
- `npm run test` — runs `src/lib/srs.js`'s unit tests (Node's built-in
  test runner, no extra dependency)
- `npm run lint` — oxlint
- `vercel --prod` — deploy

## Where things live

```
api/
  _prompts.js      EVERY prompt sent to Claude, in one place — teaching,
                    quiz generation, quiz grading, practice generation.
                    Never duplicate a prompt string into a route handler.
  _util.js          extractJson() (strip fences, robust parse), the
                    in-memory LRU cache (lessonCache, quizCache)
  teach.js          streams a lesson; checks the server LRU cache first;
                    one retry on invalid JSON
  quiz.js           generates 5 interview questions for a topic
  grade.js          grades ALL answers in one call (never one call per question)
  practice.js       on-demand practice script + dataset generation
src/
  lib/
    srs.js          pure spaced-repetition functions (1/3/7/21-day
                     intervals) — no Date.now(), no localStorage; see
                     srs.test.js for how to test against a fake "today"
    store.js         the ONLY module allowed to touch localStorage —
                      library, lesson cache, schedules, quiz results,
                      journey, usage log, theme. Swap this file's guts
                      for Firebase/Supabase later without touching any
                      component.
    api.js            client-side fetch wrappers; teachTopic() checks the
                       LOCAL cache before ever hitting the network
    sections.js        the 9 section definitions (title/icon/color) — the
                        single source of truth LessonCard, export.js, and
                        the PDF/Word builders all read from
    export.js          Markdown/JSON/PDF/Word export + the practice-ZIP
                        builder (includes the templated SETUP_GUIDE.md)
    stats.js            streak + topics-mastered calculations
    theme.js            dark mode toggle (class-based, not just
                        prefers-color-scheme)
  components/         SearchBar, LessonCard (+ SectionCard, RelatedChips,
                       ConfettiBurst, CopyButton), DownloadMenu, QuizMode,
                       UsagePanel, Header, Hero, ContinueLearningCard,
                       DueForReviewTeaser
  pages/              HomePage, LessonPage, LibraryPage, ReviewPage,
                       ComparePage — one per route in App.jsx
```

## Conventions

- **Every prompt lives in `api/_prompts.js`, nowhere else.** If you're
  about to write a system prompt string inside a route handler, stop —
  it belongs in `_prompts.js`, imported from there. This is what keeps
  `PROMPT.md` checkable against the actual source (see its top note).
- **`PROMPT.md` and `api/_prompts.js` must be edited together.** Changing
  a prompt without updating `PROMPT.md` in the same commit is a bug, not
  a shortcut — `PROMPT.md` is the disaster-recovery copy and it silently
  goes stale otherwise.
- **The lesson JSON schema uses short snake_case keys** (`one_line`, not
  `explanationInOneLine`) and no per-section repetition of the topic
  name — this is a deliberate token-efficiency choice, not a style
  preference. Don't "clean up" the schema into more verbose keys.
- **Caching discipline, checked in this order, never skipped:**
  1. `teachTopic()` in `src/lib/api.js` checks `store.getCachedLesson()`
     (localStorage) FIRST — a cache hit never touches the network.
  2. `api/teach.js` checks its in-memory LRU (`lessonCache`) next —
     unless the client explicitly requests `mode: "regenerate"`.
  3. Only then does it call Claude, and it does so with
     `system: [{ type: "text", text: ..., cache_control: { type: "ephemeral" } }]`
     so Anthropic's own prompt cache kicks in for the system prompt
     across calls.
  If you add a new LLM-backed feature, give it the same three-layer
  treatment (or explicitly justify skipping a layer in a comment) — see
  `api/quiz.js`/`api/grade.js`/`api/practice.js` for the pattern at
  smaller scale.
- **Quiz questions and practice exercises are ALSO client-cached by
  topic** (`store.getCachedQuiz`/`setCachedQuiz`,
  `getCachedPractice`/`setCachedPractice`, checked first in
  `generateQuiz()`/`generatePractice()` in `src/lib/api.js`) — added
  after real usage showed every "Quiz Me" retry regenerating fresh
  questions even for an already-quizzed topic, since the server-side LRU
  alone doesn't reliably survive Vercel cold starts. Grading itself
  (`api/grade.js`) is intentionally NOT cached — answers differ every
  attempt, so there's nothing to reuse.
- **Quiz grading is always ONE API call for all answers**, never one
  call per question. `api/grade.js` takes the full `answers[]` array.
  `QuizMode.jsx` is reused for both the 5-question "Quiz Me" flow and
  the 2-question review mini-quiz (`questionCount` prop) — don't fork it
  into two components.
- **Every non-streaming Claude call (`quiz.js`, `grade.js`, `practice.js`)
  goes through `createJsonCompletion()` in `api/_util.js`**, which strips
  markdown fences and retries once on invalid JSON — the same robustness
  `teach.js` has for its streaming path. Don't call
  `client.messages.create()` directly in a new route; real testing
  already caught `/api/grade` truncating mid-response with no retry
  before this helper existed.
- **Practice-exercise generation is on-demand only**, triggered by
  clicking "Download Practice Notebook" — never as part of the main
  teaching call. This keeps every lesson generation's `max_tokens`
  (1600/2400/3600 by difficulty — see `api/_prompts.js` for why these are
  higher than the original spec's estimate) cheap regardless of whether a
  notebook is ever requested.
- **The practice download is ONE `.ipynb` covering all 3 difficulty
  levels, not one script per difficulty.** `api/practice.js` is called
  once per difficulty (eli12/standard/deep — each cached separately, by
  `topic+difficulty`, in both the client cache and the server LRU) and
  always generates Python, even for JS-flavored topics, specifically
  because all three exercises must run in one Jupyter kernel —
  `buildNotebook()` in `src/lib/export.js` combines them into
  `practice.ipynb` with one markdown+code cell pair per difficulty.
  `mergeRequirements()` dedupes `requirements.txt` by package name across
  all three; if a difficulty needs a dataset, its filename is namespaced
  (`<difficulty>_<filename>`) and the matching string is rewritten inside
  that difficulty's code cell to keep them in sync — don't rename one
  without the other.
- **`SETUP_GUIDE.pdf` inside the practice ZIP is templated in
  `src/lib/export.js`'s `buildSetupGuidePdf()`, not written by the LLM.**
  It only covers environment setup (Python, venv, Jupyter, requirements) —
  per-difficulty expected output lives in the notebook's own markdown
  cells, not duplicated here. Don't ask the model to generate the whole
  guide — that's both more expensive and less reliable for exact
  step-by-step instructions.
- **Per-lesson Markdown/JSON export was removed** (PDF/Word cover the
  same content). Don't re-add a "Markdown" or "JSON" item to
  `DownloadMenu` without checking this was a deliberate choice, not an
  oversight — see the "Post-launch fixes" note below. The Library page's
  whole-library JSON backup (`exportLibraryAsJSON` in `store.js`) is a
  different, unrelated feature and stays.
- **Compare mode reuses the two topics' already-fetched lessons**
  (`ComparePage.jsx` pulls `one_line`/`why`/first `step`/first
  `confusion` from each) rather than a dedicated third LLM call. This is
  a deliberate scope/cost trade-off for a SHOULD-priority feature — see
  the comment at the top of `ComparePage.jsx` before "improving" it into
  a new API route without reconsidering the cost.
- **`journey` records every lesson view** (`recordJourneyStep()` in
  `store.js`), not just new ones — it drives both the streak calculation
  (`stats.js`, distinct days with any activity) and "Continue Learning"
  (`ContinueLearningCard.jsx`, reads the most recent journey entry's
  cached `related_next`). Don't gate journey recording on "is this a new
  topic" or both of those break.

## Guardrails

- **Never commit secrets.** `ANTHROPIC_API_KEY` lives in `.env` locally
  (git-ignored) and as a Vercel project environment variable in
  production — never in a file that gets committed, never logged, never
  sent to the client. All four `api/*.js` routes read it from
  `process.env` only.
- **The API key must never reach the browser.** Every Claude call goes
  through `/api/teach`, `/api/quiz`, `/api/grade`, or `/api/practice` —
  there is no client-side Anthropic SDK usage anywhere in `src/`. If you
  ever see `@anthropic-ai/sdk` imported from a file under `src/`, that's
  a bug.
- **`localStorage` access is centralized in `store.js`.** Don't call
  `localStorage.getItem`/`setItem` from a component — go through a
  `store.js` function, even if it means adding a one-line wrapper. This
  is what the spec's "swap for Firebase/Supabase later without touching
  the UI" requirement depends on.
- **`srs.js` stays pure.** No `Date.now()`, no `localStorage`, no
  side effects inside `src/lib/srs.js` — every function takes "today" as
  an explicit parameter. This is what makes `srs.test.js` able to fake
  the clock without a mocking library. `store.js` is the layer that
  wires real dates and persistence around these pure functions.

## Environment variables

| Variable | Used in | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | `api/teach.js`, `api/quiz.js`, `api/grade.js`, `api/practice.js` | Claude Messages API calls |

Copy `.env.example` to `.env` for local dev (`vercel dev` loads it
automatically). Set the same variable as a Vercel project environment
variable (Production and Preview) before deploying — the user adds this
themselves; never commit a real key or ask to see one you don't already
have a git-ignored place to put.

## Current build status

M1-M8 (see `PROMPT.md`'s milestone list) are implemented: UI shell +
search + streaming AI proxy, the 9-section colorful lesson renderer,
library + Markdown/JSON export, Quiz Me, spaced repetition + review
queue, three-layer caching + a Usage metrics panel, PDF/Word +
practice-ZIP download, and this documentation trio. Compare mode and
voice input (SHOULD-priority) are also built. Flashcard swipe view and
public share links (COULD-priority) are not built.

Post-launch fixes from real usage: `/api/teach` and `/api/grade`
`max_tokens` raised (both were truncating mid-JSON); `quiz.js`/
`grade.js`/`practice.js` gained the same retry-once-on-invalid-JSON
behavior `teach.js` already had; Compare page's two-column layout fixed
(a flex-sizing bug collapsed the left column to 1px); quiz/practice
generation gained client-side caching by topic (previously only lessons
were client-cached — every quiz retry was a wasted API call); the
practice ZIP's `SETUP_GUIDE.md` became a real `SETUP_GUIDE.pdf` (jsPDF,
not LLM-generated, same as before); a PDF text sanitizer
(`sanitizeForPdf` in `src/lib/export.js`) strips/replaces Unicode
characters jsPDF's standard fonts can't render (arrows, em-dashes, curly
quotes) — apply it to any new raw `pdf.text()`/`splitTextToSize()` call;
`CopyButton` gained a `variant` prop after a class-concatenation bug made
its text invisible on dark code blocks; the page background got a subtle
colorful gradient wash and section cards got tinted backgrounds; the
Header now embeds a persistent compact `SearchBar` on every page, not
just Home; and `DownloadMenu` gained a combined "All 3 Difficulties"
PDF/Word export (fetches the two off-screen difficulties via the normal
cached `teachTopic()`, then reuses `buildLessonPdf`/
`buildLessonDocxSections` per difficulty).

Second round of post-launch fixes: per-lesson Markdown/JSON export
removed from `DownloadMenu` (PDF/Word cover the same content); added a
combined "Interview Prep — All Levels" PDF/Word export (Interview Corner
only, across all 3 difficulties); the practice download is now ONE
`practice.ipynb` covering all 3 difficulty levels (previously a single
`.py`/`.js` script for whichever difficulty was on screen) — see
`buildNotebook()`/`mergeRequirements()` in `src/lib/export.js` and the
practice-generation notes above; `PRACTICE_MAX_TOKENS` raised 1800->3000
after the new difficulty-aware prompt's "deep" tier (which explicitly
asks for edge-case handling) started truncating mid-JSON at the old
ceiling — same failure class as the teach/grade fixes above.

Third round: `MAX_TOKENS_BY_DIFFICULTY` raised AGAIN — 1600/2400/3600 ->
2600/3400/4400 — after a user-reported truncation on `/api/teach` led to
testing a spread of verbose real topics (transformers, vector databases,
OAuth2, CAP theorem, microservices, distributed consensus) across all
three tiers: every tier truncated on at least one topic, including
eli12, which had been assumed safer since it's "simpler" — a
conceptually rich topic still needs a full 9-section shape regardless of
reading level. This also explains part of the "token usage feels high"
reports: a truncated attempt AND its automatic retry both burn full
output tokens for zero usable result, so fixing truncation directly cuts
that wasted spend. See the comment on `MAX_TOKENS_BY_DIFFICULTY` in
`api/_prompts.js` for how to re-diagnose if this recurs a third time —
don't just nudge the number from the one failing case in hand.

Fourth round: another user-reported truncation ("Unterminated string")
prompted a full stress sweep of all four JSON-emitting endpoints
(teach ×12 topic/difficulty combos, quiz ×6, grade with realistic
long-form answers, practice ×3 at "deep") rather than guessing which one
was at fault. Teach and grade held up fine; quiz held up fine; practice
was the culprit — "quantum computing" at "deep" landed at 2730/3000
(91%), raised to `PRACTICE_MAX_TOKENS = 4000`. Also added a structural
fix beyond raising numbers: `createJsonCompletion()` in `api/_util.js`
and `streamLesson()`'s retry in `api/teach.js` now check the failed
attempt's `stop_reason` — if it was `"max_tokens"`, the retry asks for a
MORE CONCISE answer instead of repeating the identical request in the
identical budget, which previously guaranteed the retry would truncate
the same way. If a truncation report recurs again, check whether it's
still a raw ceiling problem (stress-test a topic spread per endpoint,
same as this round) before assuming the concise-retry alone will save it.
