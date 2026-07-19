// The 9 lesson sections, defined once. LessonCard, the PDF/Word export,
// and the practice-ZIP builder all read from this list rather than
// hardcoding section order, titles, or colors — change a section here and
// every renderer picks it up.
export const SECTIONS = [
  { key: "one_line", title: "In One Line", icon: "💡", color: "var(--color-sec-one-line)", collapsedByDefault: false },
  { key: "analogy", title: "The Analogy", icon: "🧠", color: "var(--color-sec-analogy)", collapsedByDefault: false },
  { key: "why", title: "Why It Exists", icon: "❓", color: "var(--color-sec-why)", collapsedByDefault: false },
  { key: "steps", title: "Step-by-Step: How It Actually Works", icon: "🔢", color: "var(--color-sec-steps)", collapsedByDefault: false },
  { key: "action", title: "See It In Action", icon: "⚡", color: "var(--color-sec-action)", collapsedByDefault: false },
  { key: "confusions", title: "Common Confusions", icon: "⚠️", color: "var(--color-sec-confusions)", collapsedByDefault: false },
  // Always generated and always included in downloads, but collapsed by
  // default on screen per the spec — it's a lot of dense Q&A text that
  // shouldn't force-scroll the reader past the parts they came for.
  { key: "interview", title: "Interview Corner", icon: "🎯", color: "var(--color-sec-interview)", collapsedByDefault: true },
  { key: "memory_hook", title: "Memory Hook", icon: "📌", color: "var(--color-sec-memory)", collapsedByDefault: false },
  { key: "related", title: "Related Topics & Learning Path", icon: "🔗", color: "var(--color-sec-related)", collapsedByDefault: false },
];

export const DIFFICULTIES = [
  { id: "eli12", label: "Explain Like I'm 12" },
  { id: "standard", label: "Standard" },
  { id: "deep", label: "Deep Dive" },
];

export const TAG_COLORS = {
  "AI/ML": "#8b5cf6",
  Web: "#3b82f6",
  Data: "#10b981",
  Systems: "#f97316",
  Security: "#ef4444",
  Finance: "#eab308",
  Math: "#06b6d4",
  "Cloud/DevOps": "#ec4899",
  Databases: "#14b8a6",
  General: "#6b7280",
};

export function tagColor(tag) {
  return TAG_COLORS[tag] ?? TAG_COLORS.General;
}
