import { useState } from "react";

const VARIANTS = {
  // Default: sits on a light card background.
  light: "border border-line bg-surface text-ink-soft hover:border-ink-soft hover:text-ink",
  // For code blocks, which always render on a dark background regardless
  // of app theme — needs its own fixed light-on-dark colors, not the
  // theme-aware ink/surface tokens (those flip in dark mode and can land
  // light-text-on-light-button, which is how this went invisible before).
  dark: "border border-white/20 bg-white/10 text-white hover:bg-white/20",
};

export default function CopyButton({ text, className = "", variant = "light" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${VARIANTS[variant]} ${className}`}
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}
