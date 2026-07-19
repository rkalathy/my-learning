import { useState } from "react";

export default function CopyButton({ text, className = "" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition hover:border-ink-soft hover:text-ink ${className}`}
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}
