import { SECTIONS } from "./sections.js";

// ---- Markdown ----

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

function slugify(topic) {
  return topic.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function downloadMarkdown(lesson) {
  downloadTextFile(`${slugify(lesson.topic)}.md`, lessonToMarkdown(lesson), "text/markdown");
}

export function downloadJSON(lesson) {
  downloadTextFile(`${slugify(lesson.topic)}.json`, lessonToJSON(lesson), "application/json");
}

// ---- PDF (jsPDF) ----

const SECTION_HEX = {
  one_line: "#6366f1",
  analogy: "#8b5cf6",
  why: "#14b8a6",
  steps: "#f97316",
  action: "#10b981",
  confusions: "#f59e0b",
  interview: "#ec4899",
  memory_hook: "#eab308",
  related: "#06b6d4",
};

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

async function buildLessonPdf(pdf, lesson, { startY = 20 } = {}) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let y = startY;

  const ensureSpace = (needed) => {
    if (y + needed > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  const writeParagraph = (text, { fontSize = 11, style = "normal", color = [30, 27, 46], gapAfter = 6 } = {}) => {
    pdf.setFont("helvetica", style);
    pdf.setFontSize(fontSize);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, maxWidth);
    ensureSpace(lines.length * (fontSize * 0.5) + gapAfter);
    pdf.text(lines, margin, y);
    y += lines.length * (fontSize * 0.5) + gapAfter;
  };

  const writeSectionHeading = (title, hex) => {
    ensureSpace(14);
    const [r, g, b] = hexToRgb(hex);
    pdf.setFillColor(r, g, b);
    pdf.roundedRect(margin, y - 5, 4, 10, 1, 1, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(r, g, b);
    pdf.text(title, margin + 8, y + 2);
    y += 10;
  };

  // Cover
  pdf.setFillColor(139, 92, 246);
  pdf.rect(0, 0, pageWidth, 45, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text(lesson.topic, margin, 26);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text((lesson.tags ?? []).join("  ·  "), margin, 36);
  y = 56;

  writeSectionHeading("In One Line", SECTION_HEX.one_line);
  writeParagraph(lesson.one_line, { fontSize: 12, style: "bold" });

  writeSectionHeading("The Analogy", SECTION_HEX.analogy);
  writeParagraph(lesson.analogy);

  writeSectionHeading("Why It Exists", SECTION_HEX.why);
  writeParagraph(lesson.why);

  writeSectionHeading("Step-by-Step: How It Actually Works", SECTION_HEX.steps);
  lesson.steps.forEach((s, i) => writeParagraph(`${i + 1}. ${s}`, { gapAfter: 4 }));

  writeSectionHeading("See It In Action", SECTION_HEX.action);
  if (lesson.action_lang) {
    const codeLines = pdf.splitTextToSize(lesson.action, maxWidth - 6);
    ensureSpace(codeLines.length * 4.5 + 6);
    pdf.setFillColor(30, 27, 46);
    pdf.rect(margin, y - 4, maxWidth, codeLines.length * 4.5 + 4, "F");
    pdf.setFont("courier", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(230, 230, 250);
    pdf.text(codeLines, margin + 3, y);
    y += codeLines.length * 4.5 + 8;
  } else {
    writeParagraph(lesson.action);
  }

  writeSectionHeading("Common Confusions", SECTION_HEX.confusions);
  lesson.confusions.forEach((c) => writeParagraph(`${c.a}: ${c.b}`, { gapAfter: 4 }));

  // Interview Corner — always fully included, even though collapsed on screen.
  writeSectionHeading("Interview Corner", SECTION_HEX.interview);
  lesson.interview_qa.forEach((qa, i) => {
    writeParagraph(`Q${i + 1}. ${qa.q}`, { style: "bold", gapAfter: 2 });
    writeParagraph(qa.a, { gapAfter: 5 });
  });
  if (lesson.interview_curveball) {
    writeParagraph(`Curveball: ${lesson.interview_curveball.q}`, { style: "bold", gapAfter: 2 });
    writeParagraph(lesson.interview_curveball.a, { gapAfter: 5 });
  }

  writeSectionHeading("Memory Hook", SECTION_HEX.memory_hook);
  writeParagraph(lesson.memory_hook, { style: "bolditalic" });

  writeSectionHeading("Related Topics & Learning Path", SECTION_HEX.related);
  writeParagraph("Learn Before: " + (lesson.related_before ?? []).map((r) => r.topic).join(", "), { gapAfter: 3 });
  writeParagraph("Learn Next: " + (lesson.related_next ?? []).map((r) => r.topic).join(", "), { gapAfter: 3 });
  writeParagraph("Often Paired With: " + (lesson.related_paired ?? []).map((r) => r.topic).join(", "), { gapAfter: 3 });

  return y;
}

export async function downloadLessonPdf(lesson) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  await buildLessonPdf(pdf, lesson);
  pdf.save(`${slugify(lesson.topic)}.pdf`);
}

export async function downloadLibraryPdf(lessons) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.setTextColor(139, 92, 246);
  pdf.text("My Learning — Study Book", 15, 30);
  pdf.setFontSize(11);
  pdf.setTextColor(80, 80, 80);
  pdf.text(`${lessons.length} topics · generated ${new Date().toLocaleDateString()}`, 15, 40);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  let y = 55;
  pdf.text("Table of Contents", 15, y);
  y += 8;
  lessons.forEach((lesson, i) => {
    if (y > 280) {
      pdf.addPage();
      y = 20;
    }
    pdf.text(`${i + 1}. ${lesson.topic}`, 20, y);
    y += 6;
  });

  for (const lesson of lessons) {
    pdf.addPage();
    // eslint-disable-next-line no-await-in-loop
    await buildLessonPdf(pdf, lesson);
  }
  pdf.save("my-learning-study-book.pdf");
}

// ---- Word (.docx) ----

async function buildLessonDocxSections(lesson) {
  const { Paragraph, TextRun, HeadingLevel } = await import("docx");
  const children = [
    new Paragraph({ text: lesson.topic, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: (lesson.tags ?? []).join(" · "), spacing: { after: 300 } }),

    new Paragraph({ text: "In One Line", heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ children: [new TextRun({ text: lesson.one_line, bold: true })] }),

    new Paragraph({ text: "The Analogy 🧠", heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: lesson.analogy }),

    new Paragraph({ text: "Why It Exists", heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: lesson.why }),

    new Paragraph({ text: "Step-by-Step: How It Actually Works", heading: HeadingLevel.HEADING_1 }),
    ...lesson.steps.map((s, i) => new Paragraph({ text: `${i + 1}. ${s}` })),

    new Paragraph({ text: "See It In Action", heading: HeadingLevel.HEADING_1 }),
    new Paragraph({
      children: [new TextRun({ text: lesson.action, font: "Consolas" })],
      shading: { fill: "1E1B2E" },
    }),

    new Paragraph({ text: "Common Confusions ⚠️", heading: HeadingLevel.HEADING_1 }),
    ...lesson.confusions.map((c) => new Paragraph({ children: [new TextRun({ text: `${c.a}: `, bold: true }), new TextRun({ text: c.b })] })),

    new Paragraph({ text: "Interview Corner 🎯", heading: HeadingLevel.HEADING_1 }),
    ...lesson.interview_qa.flatMap((qa, i) => [
      new Paragraph({ children: [new TextRun({ text: `Q${i + 1}. ${qa.q}`, bold: true })] }),
      new Paragraph({ text: qa.a, spacing: { after: 150 } }),
    ]),
    ...(lesson.interview_curveball
      ? [
          new Paragraph({ children: [new TextRun({ text: `Curveball: ${lesson.interview_curveball.q}`, bold: true, italics: true })] }),
          new Paragraph({ text: lesson.interview_curveball.a }),
        ]
      : []),

    new Paragraph({ text: "Memory Hook 📌", heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ children: [new TextRun({ text: lesson.memory_hook, bold: true, italics: true })] }),

    new Paragraph({ text: "Related Topics & Learning Path 🔗", heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ children: [new TextRun({ text: "Learn Before: ", bold: true }), new TextRun({ text: (lesson.related_before ?? []).map((r) => r.topic).join(", ") })] }),
    new Paragraph({ children: [new TextRun({ text: "Learn Next: ", bold: true }), new TextRun({ text: (lesson.related_next ?? []).map((r) => r.topic).join(", ") })] }),
    new Paragraph({ children: [new TextRun({ text: "Often Paired With: ", bold: true }), new TextRun({ text: (lesson.related_paired ?? []).map((r) => r.topic).join(", ") })] }),
  ];
  return children;
}

export async function downloadLessonDocx(lesson) {
  const { Document, Packer } = await import("docx");
  const children = await buildLessonDocxSections(lesson);
  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(lesson.topic)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadLibraryDocx(lessons) {
  const { Document, Packer, Paragraph, HeadingLevel, PageBreak } = await import("docx");
  const allChildren = [
    new Paragraph({ text: "My Learning — Study Book", heading: HeadingLevel.TITLE }),
    new Paragraph({ text: `${lessons.length} topics · generated ${new Date().toLocaleDateString()}` }),
    new Paragraph({ text: "Table of Contents", heading: HeadingLevel.HEADING_1 }),
    ...lessons.map((l, i) => new Paragraph({ text: `${i + 1}. ${l.topic}` })),
  ];
  for (const lesson of lessons) {
    allChildren.push(new Paragraph({ children: [new PageBreak()] }));
    // eslint-disable-next-line no-await-in-loop
    allChildren.push(...(await buildLessonDocxSections(lesson)));
  }
  const doc = new Document({ sections: [{ children: allChildren }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "my-learning-study-book.docx";
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Practice ZIP (topic-practice.zip: script + requirements.txt + dataset + SETUP_GUIDE.md) ----

// The beginner setup guide is templated here, NOT written by the LLM —
// the OS-specific venv/activate/troubleshooting steps are static
// boilerplate that doesn't vary per topic, so generating them fresh every
// time would just be wasted tokens (and a reliability risk: an LLM asked
// to reproduce Windows vs. Mac/Linux commands correctly every single time
// is a worse bet than a fixed template). Only the topic-specific pieces —
// filename, run command, expected output, extra setup notes — come from
// the practice-generation API call.
function buildSetupGuide(topic, practice) {
  const isPython = practice.language !== "javascript";
  const runtimeName = isPython ? "Python 3.10+" : "Node.js 18+";
  const runtimeCheck = isPython ? "python --version" : "node --version";
  const runtimeLink = isPython ? "https://www.python.org/downloads/" : "https://nodejs.org/";

  const lines = [
    `# Setup & How to Run — ${topic}`,
    "",
    `This is a generated practice exercise for **${topic}**. Follow these steps from a clean environment — they work on both Windows and Mac/Linux (OS-specific commands are marked).`,
    "",
    "## 1. Prerequisites",
    "",
    `- Install **${runtimeName}**: ${runtimeLink}`,
    `- Verify it installed: open a terminal and run \`${runtimeCheck}\` — you should see a version number, not "command not found".`,
    "- (Recommended, not required) [VS Code](https://code.visualstudio.com/) for editing/running the file.",
    practice.setup_notes ? `- **Extra setup for this exercise:** ${practice.setup_notes}` : "",
    "",
  ];

  if (isPython) {
    lines.push(
      "## 2. Create a virtual environment",
      "",
      "```bash",
      "python -m venv venv",
      "```",
      "",
      "Activate it:",
      "",
      "- **Windows (PowerShell):** `venv\\Scripts\\Activate.ps1`",
      "- **Mac/Linux:** `source venv/bin/activate`",
      "",
      "Your terminal prompt should now start with `(venv)`.",
      "",
      "## 3. Install dependencies",
      "",
      "```bash",
      "pip install -r requirements.txt",
      "```",
      "",
      practice.requirements?.length
        ? `This installs: ${practice.requirements.join(", ")}.`
        : "This exercise has no external dependencies — requirements.txt is empty and this step is a no-op, but running it is still safe.",
      ""
    );
  } else {
    lines.push(
      "## 2. Install dependencies",
      "",
      practice.requirements?.length
        ? "```bash\nnpm install " + practice.requirements.join(" ") + "\n```"
        : "This exercise has no external dependencies — nothing to install.",
      ""
    );
  }

  lines.push(
    `## ${isPython ? "4" : "3"}. Run it`,
    "",
    "```bash",
    practice.run_command,
    "```",
    "",
    `${isPython ? "5" : "4"}. Expected output`,
    "",
    "You should see exactly this (small formatting differences like extra whitespace are fine):",
    "",
    "```",
    practice.expected_output,
    "```",
    "",
    `## ${isPython ? "6" : "5"}. Troubleshooting`,
    "",
    isPython
      ? [
          `- **"ModuleNotFoundError" / "command not found"** — your virtual environment isn't activated (step 2), or step 3 wasn't run. Re-activate and re-run \`pip install -r requirements.txt\`.`,
          `- **"python: command not found" or a very old version prints** — some systems use \`python3\` instead of \`python\`. Try \`python3 -m venv venv\` and \`python3 ${practice.filename}\`.`,
          `- **A file-not-found error mentioning "${practice.dataset_filename ?? "a data file"}"** — run the script from inside the unzipped folder (the same directory as \`${practice.filename}\`), not from somewhere else.`,
        ].join("\n")
      : [
          `- **"command not found: node"** — Node.js isn't installed or isn't on your PATH; reinstall from the link above and restart your terminal.`,
          `- **"Cannot find module ..."** — dependencies weren't installed; re-run the npm install command from step 2.`,
          `- **A file-not-found error mentioning "${practice.dataset_filename ?? "a data file"}"** — run the script from inside the unzipped folder, not from somewhere else.`,
        ].join("\n"),
    ""
  );

  return lines.filter((l) => l !== "").join("\n").replace(/\n\n\n+/g, "\n\n");
}

export async function downloadPracticeZip(topic, practice) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  zip.file(practice.filename, practice.code);
  if (practice.language !== "javascript") {
    zip.file("requirements.txt", (practice.requirements ?? []).join("\n") + (practice.requirements?.length ? "\n" : ""));
  }
  if (practice.needs_dataset && practice.dataset_csv) {
    zip.file(practice.dataset_filename ?? "dataset.csv", practice.dataset_csv);
  }
  zip.file("SETUP_GUIDE.md", buildSetupGuide(topic, practice));

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(topic)}-practice.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

export { buildSetupGuide };
export { slugify };
export { SECTIONS };
