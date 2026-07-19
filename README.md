# My Learning ✦

Type any word or concept you don't understand — get back a structured,
colorful, memorable explanation designed to actually stick, not just a
wall of text. Then quiz yourself on it, and let spaced repetition bring
it back right before you'd otherwise forget it.

> **Status:** built per [`PROMPT.md`](./PROMPT.md)'s full spec — see
> `CLAUDE.md`'s "Current build status" for exactly what's shipped.

## What it does

1. Type a topic ("tokenization", "OAuth", "normalization") into the
   search box and hit **Teach Me**.
2. Claude streams back a lesson in nine distinct, color-coded sections —
   see below.
3. The lesson auto-saves to **My Library** and gets scheduled for
   spaced-repetition review (1 → 3 → 7 → 21 days out).
4. Hit **Quiz Me** for 5 interview-style questions, graded with what you
   missed and a model answer for each.
5. Click any **Related Topic** chip to keep going — the home screen's
   **Continue Learning** card always suggests where to go next, so
   learning never dead-ends.

## The 9-section lesson

| Section | What it is |
|---|---|
| 💡 In One Line | The concept in one plain-English sentence |
| 🧠 The Analogy | One vivid real-world comparison |
| ❓ Why It Exists | The problem it solves; what breaks without it |
| 🔢 Step-by-Step | A numbered walkthrough with a tiny worked example (real values, not abstractions) |
| ⚡ See It In Action | A runnable code snippet, or a worked scenario for non-technical topics |
| ⚠️ Common Confusions | 2-3 things people mix this up with, corrected in one line each |
| 🎯 Interview Corner | 3 interview Q&As + one curveball follow-up (collapsed on screen, always in the downloads) |
| 📌 Memory Hook | A one-line mnemonic to recall it months later |
| 🔗 Related Topics & Learning Path | Learn Before / Learn Next / Often Paired With, each with a one-line reason, clickable, ✓ marked if already learned |

## Screenshots

_(Add screenshots of the home page, a lesson, and Quiz Me here once you
have a deployed instance to capture — light and dark mode.)_

## Setup

```bash
git clone <your-repo-url>
cd "My Learning"
npm install
cp .env.example .env
```

Fill in `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Running locally

The app has two dev modes:

```bash
npm run dev        # Vite only — fast, but /api/* routes 404
npm run dev:full    # vercel dev — serves the full app including /api/*
```

Use `npm run dev:full` for anything involving lessons, quizzes, or
practice downloads (i.e., almost everything) — `npm run dev` is only
useful for pure layout/styling iteration where you don't need live data.

Open [http://localhost:3001](http://localhost:3001) (the port
`dev:full` listens on).

## Architecture

```
Browser (React + Vite)
  │
  ├─ /api/teach     (POST) ──▶ Claude, streamed, prompt-cached ──▶ 9-section lesson JSON
  ├─ /api/quiz      (POST) ──▶ Claude ──▶ 5 interview questions
  ├─ /api/grade     (POST) ──▶ Claude, ALL answers in one call ──▶ per-question scores
  └─ /api/practice  (POST) ──▶ Claude, on-demand only ──▶ runnable script + dataset + setup notes

localStorage (src/lib/store.js — the only module that touches it)
  ├─ library     (one row per topic: tags, difficulty, learned date)
  ├─ cache       (topic+difficulty -> full lesson JSON — "never regenerate what we have")
  ├─ schedules   (topic -> spaced-repetition state)
  ├─ quizResults, journey (visit history), usage (token metrics), theme
```

Nothing in `src/` imports the Anthropic SDK directly — every model call
goes through one of the four `/api/*.js` serverless functions, so the
API key never reaches the browser.

## Caching design (why API costs stay low)

Three layers, checked in this order, on every lesson request:

1. **Client-side cache** (`src/lib/store.js` + `src/lib/api.js`) — if
   this exact topic+difficulty was generated before, it loads from
   `localStorage` instantly with **zero network calls**.
2. **Server-side in-memory LRU** (`api/_util.js`, used by
   `api/teach.js`/`api/quiz.js`/`api/practice.js`) — catches a cache
   miss on the client (new browser/device) that a *different* user of
   the same warm serverless instance already generated.
3. **Anthropic prompt caching** — the teaching/quiz/grading/practice
   system prompts are identical on every call, sent with
   `cache_control: { type: "ephemeral" }`, so even a genuine cache miss
   pays Anthropic's cached-read rate (~10% of normal input cost) for the
   system prompt portion after the first call.

A small **Usage panel** (bottom-right corner of every page) shows live
request counts, cache-hit rate, and token totals so you can see this
working. Regenerating a lesson on purpose (the ↻ button) explicitly
bypasses both caches.

Quiz grading always sends all 5 (or 2, for a review) answers in **one**
API call, never one per question. Practice-exercise generation (the
code/dataset ZIP) only happens when you explicitly click the download —
it's not part of the base lesson generation, so browsing lessons never
pays for a practice exercise you don't ask for.

## Spaced repetition

Learning a topic schedules its first review for **1 day later**. Passing
a 2-question mini-quiz on the **Review** page advances it to **3 → 7 →
21 days**; after 21 days it's marked **mastered** and drops out of the
queue. Failing a review resets it to review-again-tomorrow rather than
advancing. The scheduling math lives in `src/lib/srs.js` as pure
functions (no dates computed from `Date.now()` internally) — see
`srs.test.js` for how the logic is verified against a simulated clock.

## Exporting

- **Markdown / JSON** — one click, client-side, instant.
- **PDF / Word** — generated client-side (`jsPDF` / `docx`), fully
  styled, and always include the complete Interview Corner even though
  it's collapsed on screen.
- **Download entire Library** — the same PDF/Word builders, run over
  every cached lesson, with a table of contents.
- **Practice ZIP** (code-relevant topics only) — a runnable script,
  `requirements.txt`, a small dataset if the exercise needs one, and a
  `SETUP_GUIDE.md` with numbered Windows/Mac install-and-run
  instructions, expected output, and troubleshooting.

## Deploying

```bash
vercel --prod
```

or connect the GitHub repo in the Vercel dashboard for auto-deploy on
push to `main`. Set `ANTHROPIC_API_KEY` as a Vercel project environment
variable (Production and Preview) first — the app will 500 on any
lesson/quiz request without it, with a clear error message, not a silent
failure.

## Troubleshooting

- **"ANTHROPIC_API_KEY is not configured on the server"** — you're
  running `npm run dev` (Vite only) instead of `npm run dev:full`
  (`vercel dev`, which actually serves `/api/*`), or you deployed
  without setting the Vercel environment variable.
- **A lesson never finishes loading** — check the browser console and
  the Usage panel; a malformed response triggers one automatic retry
  server-side before surfacing an error, so a stuck loading state past
  ~20-30 seconds usually means both the original call and the retry
  failed (rate limit, network issue) — the UI's error state has a "Try
  again" button.
- **PDF/Word download looks empty or throws** — these run entirely in
  the browser (no server round-trip); check the console for an error
  from `jsPDF`/`docx` and confirm the lesson object actually has all 9
  fields populated (a lesson from an old cache before a schema change
  could be missing a newer field).
- **Streak shows 0 even though you learned something today** — the
  streak is timezone-sensitive (`todayISO()` in `src/lib/srs.js` uses
  the browser's local date); this is expected if you're testing across a
  midnight boundary.

## Privacy

Everything except the Claude API call itself stays in your browser's
`localStorage` — there's no database, no accounts, no sign-in. Clearing
your browser data clears your library.

## Rebuilding

[`PROMPT.md`](./PROMPT.md) is the complete disaster-recovery spec: the
full original build prompt verbatim, the exact prompts shipped in
`api/_prompts.js`, every JSON schema, and a short rebuild note.

---

Built with Vite + React, deployed on Vercel.
