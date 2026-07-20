import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLibraryList, topicId } from "../lib/store.js";

const COMPARE_PATTERN = /^(.+?)\s+vs\.?\s+(.+)$/i;

export default function SearchBar({ autoFocus = false, compact = false }) {
  const [value, setValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [listening, setListening] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const pastTopics = useMemo(() => getLibraryList().map((l) => l.topic), []);
  const suggestions = useMemo(() => {
    if (!value.trim()) return pastTopics.slice(0, 6);
    const q = value.trim().toLowerCase();
    return pastTopics.filter((t) => t.toLowerCase().includes(q)).slice(0, 6);
  }, [value, pastTopics]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function go(topic) {
    const trimmed = topic.trim();
    if (!trimmed) return;
    const compareMatch = COMPARE_PATTERN.exec(trimmed);
    if (compareMatch) {
      navigate(`/compare/${encodeURIComponent(compareMatch[1].trim())}/${encodeURIComponent(compareMatch[2].trim())}`);
      return;
    }
    navigate(`/lesson/${encodeURIComponent(topicId(trimmed))}?topic=${encodeURIComponent(trimmed)}`);
  }

  function startVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input isn't supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setValue(transcript);
    };
    recognition.start();
  }

  return (
    <div className={compact ? "relative w-full max-w-xs" : "relative mx-auto w-full max-w-2xl"}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
          if (compact) setValue("");
        }}
        className={
          compact
            ? "flex items-center gap-1.5 rounded-full border border-line bg-bg px-3 py-1.5 focus-within:border-brand-pink"
            : "flex items-center gap-2 rounded-2xl border-2 border-line bg-surface p-2 shadow-lg focus-within:border-brand-pink"
        }
      >
        <span className={compact ? "text-sm text-ink-soft" : "pl-2 text-xl"}>🔍</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={compact ? "Search a new topic…" : "Type any topic — tokenization, OAuth, normalization…"}
          className={
            compact
              ? "w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft/70"
              : "flex-1 bg-transparent px-1 py-2 text-base text-ink outline-none placeholder:text-ink-soft/70"
          }
        />
        {!compact && (
          <button
            type="button"
            onClick={startVoice}
            title="Voice input"
            className={`rounded-full p-2.5 text-lg transition ${listening ? "animate-pulse bg-sec-confusions/20" : "hover:bg-bg"}`}
          >
            🎤
          </button>
        )}
        <button
          type="submit"
          className={
            compact
              ? "rounded-full bg-gradient-to-r from-brand-violet via-brand-pink to-brand-orange px-3 py-1 text-xs font-bold text-white shadow-sm transition hover:opacity-90"
              : "rounded-xl bg-gradient-to-r from-brand-violet via-brand-pink to-brand-orange px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
          }
        >
          {compact ? "Go" : "Teach Me"}
        </button>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-20 mt-2 w-full min-w-64 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
          <p className="px-4 pt-3 pb-1 text-[11px] font-bold tracking-wide text-ink-soft uppercase">
            {value.trim() ? "Matching topics you've learned" : "Continue learning"}
          </p>
          {suggestions.map((t) => (
            <button
              key={t}
              onMouseDown={() => go(t)}
              className="block w-full px-4 py-2 text-left text-sm text-ink hover:bg-bg"
            >
              {t}
            </button>
          ))}
        </div>
      )}
      {!compact && (
        <p className="mt-2 text-center text-xs text-ink-soft">
          Tip: type <span className="font-semibold">"tokenization vs embedding"</span> for a side-by-side comparison.
        </p>
      )}
    </div>
  );
}
