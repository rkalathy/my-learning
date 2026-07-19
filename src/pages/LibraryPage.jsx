import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLibraryList, getCachedLesson, exportLibraryAsJSON } from "../lib/store.js";
import { downloadLibraryPdf, downloadLibraryDocx, downloadTextFile } from "../lib/export.js";
import { tagColor } from "../lib/sections.js";

export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [busy, setBusy] = useState(null);
  const navigate = useNavigate();

  const library = useMemo(() => getLibraryList(), []);
  const allTags = useMemo(() => [...new Set(library.flatMap((l) => l.tags ?? []))].sort(), [library]);

  const filtered = library.filter((l) => {
    if (tagFilter !== "all" && !l.tags?.includes(tagFilter)) return false;
    if (search.trim() && !l.topic.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  function collectLessons() {
    return library.map((l) => getCachedLesson(l.topic, l.currentDifficulty)).filter(Boolean);
  }

  async function downloadAll(format) {
    setBusy(format);
    try {
      const lessons = collectLessons();
      if (lessons.length === 0) {
        alert("No cached lessons to export yet.");
        return;
      }
      if (format === "pdf") await downloadLibraryPdf(lessons);
      else if (format === "docx") await downloadLibraryDocx(lessons);
      else if (format === "json") downloadTextFile("my-learning-library.json", exportLibraryAsJSON(), "application/json");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-ink">My Library</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => downloadAll("pdf")}
            disabled={busy === "pdf"}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:border-ink-soft disabled:opacity-50"
          >
            {busy === "pdf" ? "Building…" : "⬇ Study book (PDF)"}
          </button>
          <button
            onClick={() => downloadAll("docx")}
            disabled={busy === "docx"}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:border-ink-soft disabled:opacity-50"
          >
            {busy === "docx" ? "Building…" : "⬇ Study book (Word)"}
          </button>
          <button
            onClick={() => downloadAll("json")}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:border-ink-soft"
          >
            ⬇ JSON
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your topics…"
          className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-pink"
        />
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
        >
          <option value="all">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-line p-8 text-center text-sm text-ink-soft">
          {library.length === 0 ? "You haven't learned any topics yet." : "No topics match your search."}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((l) => (
            <button
              key={l.id}
              onClick={() => navigate(`/lesson/${encodeURIComponent(l.id)}?topic=${encodeURIComponent(l.topic)}`)}
              className="rounded-2xl border border-line bg-surface p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="font-heading font-bold text-ink">{l.topic}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {(l.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ backgroundColor: `${tagColor(tag)}18`, color: tagColor(tag) }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-soft">
                Learned {new Date(l.learnedDate).toLocaleDateString()} · {l.currentDifficulty}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
