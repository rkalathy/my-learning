import { useState, useRef, useEffect } from "react";
import { downloadMarkdown, downloadJSON } from "../lib/export.js";

// M3 version — Markdown/JSON only. PDF, Word, and the practice ZIP are
// added to this same menu in M7 without changing the open/close/outside
// -click plumbing below.
export default function DownloadMenu({ lesson }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const items = [
    { label: "🔡 Markdown", action: () => downloadMarkdown(lesson) },
    { label: "{ } JSON", action: () => downloadJSON(lesson) },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full border-2 border-white/70 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
      >
        ⬇ Download
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                item.action();
                setOpen(false);
              }}
              className="block w-full px-4 py-2.5 text-left text-sm font-medium text-ink transition hover:bg-bg"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
