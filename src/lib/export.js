// M3: Markdown + JSON export only. PDF, Word, and the practice-code ZIP
// (which need jsPDF/docx/jszip and a fair amount more logic) are added in
// M7 as additions to this same file — the slugify()/downloadTextFile()
// helpers below are written so M7 can reuse them directly.

export function lessonToMarkdown(lesson) {
  const lines = [`# ${lesson.topic}`, "", `_Tags: ${(lesson.tags ?? []).join(", ")}_`, ""];
  lines.push("## In One Line", lesson.one_line, "");
  lines.push("## The Analogy 🧠", lesson.analogy, "");
  lines.push("## Why It Exists", lesson.why, "");
  lines.push("## Step-by-Step: How It Actually Works");
  lesson.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  lines.push("");
  lines.push("## See It In Action");
  if (lesson.action_lang) lines.push("```" + lesson.action_lang, lesson.action, "```");
  else lines.push(lesson.action);
  lines.push("");
  lines.push("## Common Confusions ⚠️");
  lesson.confusions.forEach((c) => lines.push(`- **${c.a}:** ${c.b}`));
  lines.push("");
  lines.push("## Interview Corner 🎯");
  lesson.interview_qa.forEach((qa, i) => lines.push(`**Q${i + 1}. ${qa.q}**`, "", qa.a, ""));
  if (lesson.interview_curveball) {
    lines.push(`**🌶️ Curveball: ${lesson.interview_curveball.q}**`, "", lesson.interview_curveball.a, "");
  }
  lines.push("## Memory Hook 📌", lesson.memory_hook, "");
  lines.push("## Related Topics & Learning Path 🔗");
  lines.push("**Learn Before:**");
  (lesson.related_before ?? []).forEach((r) => lines.push(`- ${r.topic} — ${r.why}`));
  lines.push("", "**Learn Next:**");
  (lesson.related_next ?? []).forEach((r) => lines.push(`- ${r.topic} — ${r.why}`));
  lines.push("", "**Often Paired With:**");
  (lesson.related_paired ?? []).forEach((r) => lines.push(`- ${r.topic} — ${r.why}`));
  return lines.join("\n");
}

export function lessonToJSON(lesson) {
  return JSON.stringify(lesson, null, 2);
}

export function downloadTextFile(filename, content, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function slugify(topic) {
  return topic.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function downloadMarkdown(lesson) {
  downloadTextFile(`${slugify(lesson.topic)}.md`, lessonToMarkdown(lesson), "text/markdown");
}

export function downloadJSON(lesson) {
  downloadTextFile(`${slugify(lesson.topic)}.json`, lessonToJSON(lesson), "application/json");
}
