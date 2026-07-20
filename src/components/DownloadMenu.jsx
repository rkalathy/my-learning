import { useState, useRef, useEffect } from "react";
import {
  downloadLessonPdf,
  downloadLessonDocx,
  downloadPracticeZip,
  downloadAllDifficultiesPdf,
  downloadAllDifficultiesDocx,
  downloadInterviewPrepPdf,
  downloadInterviewPrepDocx,
  DIFFICULTY_ORDER,
} from "../lib/export.js";
import { generatePractice, teachTopic } from "../lib/api.js";

const OTHER_DIFFICULTIES = { eli12: ["standard", "deep"], standard: ["eli12", "deep"], deep: ["eli12", "standard"] };

export default function DownloadMenu({ lesson, difficulty = "standard" }) {
  const [open, setOpen] = useState(false);
  const [generatingZip, setGeneratingZip] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(null); // "pdf" | "docx" | null
  const [generatingInterview, setGeneratingInterview] = useState(null); // "pdf" | "docx" | null
  const [error, setError] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Fetches the two difficulty levels not currently on screen (via the
  // normal client/server-cached teachTopic — never a dedicated extra
  // call) and returns all three lessons keyed by difficulty. Shared by
  // every "combined" download below.
  async function fetchAllDifficultyLessons() {
    const others = OTHER_DIFFICULTIES[difficulty] ?? ["eli12", "deep"];
    const results = await Promise.all(others.map((d) => teachTopic(lesson.topic, d)));
    const byDifficulty = { [difficulty]: lesson };
    others.forEach((d, i) => {
      byDifficulty[d] = results[i].lesson;
    });
    return byDifficulty;
  }

  async function handleAllDifficulties(format) {
    setError(null);
    setGeneratingAll(format);
    try {
      const byDifficulty = await fetchAllDifficultyLessons();
      if (format === "pdf") await downloadAllDifficultiesPdf(lesson.topic, byDifficulty);
      else await downloadAllDifficultiesDocx(lesson.topic, byDifficulty);
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingAll(null);
      setOpen(false);
    }
  }

  async function handleInterviewPrep(format) {
    setError(null);
    setGeneratingInterview(format);
    try {
      const byDifficulty = await fetchAllDifficultyLessons();
      if (format === "pdf") await downloadInterviewPrepPdf(lesson.topic, byDifficulty);
      else await downloadInterviewPrepDocx(lesson.topic, byDifficulty);
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingInterview(null);
      setOpen(false);
    }
  }

  // One exercise per difficulty level, combined into a single
  // practice.ipynb (see downloadPracticeZip in export.js) — generatePractice
  // is itself client/server-cached per topic+difficulty, so re-downloading
  // costs nothing once each difficulty has been generated once.
  async function handleCombinedPractice() {
    setError(null);
    setGeneratingZip(true);
    try {
      const byDifficulty = await fetchAllDifficultyLessons();
      const practicesByDifficulty = {};
      for (const d of DIFFICULTY_ORDER) {
        const l = byDifficulty[d];
        if (!l) continue;
        // eslint-disable-next-line no-await-in-loop
        practicesByDifficulty[d] = await generatePractice(lesson.topic, d, l.steps);
      }
      await downloadPracticeZip(lesson.topic, practicesByDifficulty);
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingZip(false);
      setOpen(false);
    }
  }

  const items = [
    { label: "📄 PDF", action: () => downloadLessonPdf(lesson) },
    { label: "📝 Word (.docx)", action: () => downloadLessonDocx(lesson) },
    {
      label: generatingAll === "pdf" ? "⏳ Combining…" : "📚 All 3 Difficulties (PDF)",
      action: () => handleAllDifficulties("pdf"),
      disabled: Boolean(generatingAll),
    },
    {
      label: generatingAll === "docx" ? "⏳ Combining…" : "📚 All 3 Difficulties (Word)",
      action: () => handleAllDifficulties("docx"),
      disabled: Boolean(generatingAll),
    },
    {
      label: generatingInterview === "pdf" ? "⏳ Combining…" : "🎯 Interview Prep — All Levels (PDF)",
      action: () => handleInterviewPrep("pdf"),
      disabled: Boolean(generatingInterview),
    },
    {
      label: generatingInterview === "docx" ? "⏳ Combining…" : "🎯 Interview Prep — All Levels (Word)",
      action: () => handleInterviewPrep("docx"),
      disabled: Boolean(generatingInterview),
    },
  ];
  if (lesson.is_code_relevant) {
    items.push({
      label: generatingZip ? "⏳ Building notebook…" : "🧪 Practice Notebook (.ipynb, all 3 levels)",
      action: handleCombinedPractice,
      disabled: generatingZip,
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full border-2 border-white/70 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
      >
        ⬇ Download
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 max-h-[70vh] w-72 overflow-y-auto rounded-2xl border border-line bg-surface shadow-xl">
          {items.map((item) => (
            <button
              key={item.label}
              disabled={item.disabled}
              onClick={() => {
                item.action();
                if (!item.disabled) setOpen(false);
              }}
              className="block w-full px-4 py-2.5 text-left text-sm font-medium text-ink transition hover:bg-bg disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
          {error && <p className="border-t border-line px-4 py-2 text-xs text-sec-confusions">{error}</p>}
        </div>
      )}
    </div>
  );
}
