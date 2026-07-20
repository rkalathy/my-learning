import { useState, useRef, useEffect } from "react";
import {
  downloadMarkdown,
  downloadJSON,
  downloadLessonPdf,
  downloadLessonDocx,
  downloadPracticeZip,
  downloadAllDifficultiesPdf,
  downloadAllDifficultiesDocx,
} from "../lib/export.js";
import { generatePractice, teachTopic } from "../lib/api.js";

const OTHER_DIFFICULTIES = { eli12: ["standard", "deep"], standard: ["eli12", "deep"], deep: ["eli12", "standard"] };

export default function DownloadMenu({ lesson, difficulty = "standard" }) {
  const [open, setOpen] = useState(false);
  const [generatingZip, setGeneratingZip] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(null); // "pdf" | "docx" | null
  const [error, setError] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handlePracticeZip() {
    setError(null);
    setGeneratingZip(true);
    try {
      const practice = await generatePractice(lesson.topic, lesson.steps);
      await downloadPracticeZip(lesson.topic, practice);
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingZip(false);
      setOpen(false);
    }
  }

  // Fetches the two difficulty levels not currently on screen (via the
  // normal client/server-cached teachTopic — never a dedicated extra
  // call) and combines all three into one document.
  async function handleAllDifficulties(format) {
    setError(null);
    setGeneratingAll(format);
    try {
      const others = OTHER_DIFFICULTIES[difficulty] ?? ["eli12", "deep"];
      const results = await Promise.all(others.map((d) => teachTopic(lesson.topic, d)));
      const byDifficulty = { [difficulty]: lesson };
      others.forEach((d, i) => {
        byDifficulty[d] = results[i].lesson;
      });
      if (format === "pdf") await downloadAllDifficultiesPdf(lesson.topic, byDifficulty);
      else await downloadAllDifficultiesDocx(lesson.topic, byDifficulty);
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingAll(null);
      setOpen(false);
    }
  }

  const items = [
    { label: "📄 PDF", action: () => downloadLessonPdf(lesson) },
    { label: "📝 Word (.docx)", action: () => downloadLessonDocx(lesson) },
    { label: "🔡 Markdown", action: () => downloadMarkdown(lesson) },
    { label: "{ } JSON", action: () => downloadJSON(lesson) },
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
  ];
  if (lesson.is_code_relevant) {
    items.push({ label: generatingZip ? "⏳ Building ZIP…" : "🧪 Practice ZIP (code + dataset)", action: handlePracticeZip, disabled: generatingZip });
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
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
          {items.map((item) => (
            <button
              key={item.label}
              disabled={item.disabled}
              onClick={() => {
                item.action();
                if (!item.disabled && item.label !== "⏳ Building ZIP…") setOpen(false);
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
