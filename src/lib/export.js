import { SECTIONS } from "./sections.js";

// Per-lesson Markdown/JSON export was removed (PDF/Word cover the same
// content, better presented) — the library-wide JSON backup on the
// Library page is a different feature and still uses downloadTextFile()
// below, so that helper stays.
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

// jsPDF's built-in fonts (helvetica/courier) only support WinAnsi/Latin-1
// glyphs. Claude's output regularly includes arrows, em-dashes, curly
// quotes, bullets, and emoji — feeding those straight into pdf.text()
// doesn't throw, it silently mis-measures glyph widths and renders as
// garbled, letter-spaced text (caught during real testing on a step
// containing "→"). Swap the common offenders for ASCII equivalents, then
// drop anything else outside Latin-1 rather than let it corrupt the line.
function sanitizeForPdf(text) {
  if (typeof text !== "string") return text;
  return text
    .replace(/→/g, "->")
    .replace(/⇒/g, "=>")
    .replace(/←/g, "<-")
    .replace(/[–—]/g, "-")
    .replace(/[''']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/…/g, "...")
    .replace(/[•●▪]/g, "-")
    .replace(/×/g, "x")
    .replace(/≈/g, "~=")
    .replace(/≠/g, "!=")
    .replace(/[≤]/g, "<=")
    .replace(/[≥]/g, ">=")
    .replace(/[^ -ÿ]/g, "");
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
    const lines = pdf.splitTextToSize(sanitizeForPdf(text), maxWidth);
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
    pdf.text(sanitizeForPdf(title), margin + 8, y + 2);
    y += 10;
  };

  // Cover
  pdf.setFillColor(139, 92, 246);
  pdf.rect(0, 0, pageWidth, 45, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text(sanitizeForPdf(lesson.topic), margin, 26);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(sanitizeForPdf((lesson.tags ?? []).join("  ·  ")), margin, 36);
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
    const codeLines = pdf.splitTextToSize(sanitizeForPdf(lesson.action), maxWidth - 6);
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
  pdf.text("My Learning - Study Book", 15, 30);
  pdf.setFontSize(11);
  pdf.setTextColor(80, 80, 80);
  pdf.text(`${lessons.length} topics - generated ${new Date().toLocaleDateString()}`, 15, 40);
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
    pdf.text(sanitizeForPdf(`${i + 1}. ${lesson.topic}`), 20, y);
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

// ---- Combined "all 3 difficulty levels" document ----
// Reuses buildLessonPdf/buildLessonDocxSections per difficulty (each
// draws its own full cover band + all 9 sections), just labeling the
// topic with the difficulty so the combined doc's pages/TOC read clearly.
// The caller (DownloadMenu) is responsible for fetching the two
// difficulties that aren't currently on screen — via teachTopic(), so
// this still goes through the normal client/server cache, never a
// dedicated extra endpoint.

export const DIFFICULTY_LABELS = { eli12: "Explain Like I'm 12", standard: "Standard", deep: "Deep Dive" };
export const DIFFICULTY_ORDER = ["eli12", "standard", "deep"];

export async function downloadAllDifficultiesPdf(topic, lessonsByDifficulty) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  let firstPage = true;
  for (const difficulty of DIFFICULTY_ORDER) {
    const lesson = lessonsByDifficulty[difficulty];
    if (!lesson) continue;
    if (!firstPage) pdf.addPage();
    firstPage = false;
    // eslint-disable-next-line no-await-in-loop
    await buildLessonPdf(pdf, { ...lesson, topic: `${topic} — ${DIFFICULTY_LABELS[difficulty]}` });
  }
  pdf.save(`${slugify(topic)}-all-difficulties.pdf`);
}

export async function downloadAllDifficultiesDocx(topic, lessonsByDifficulty) {
  const { Document, Packer, Paragraph, HeadingLevel, PageBreak } = await import("docx");
  const allChildren = [
    new Paragraph({ text: topic, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: "All three difficulty levels, combined", spacing: { after: 300 } }),
  ];
  let first = true;
  for (const difficulty of DIFFICULTY_ORDER) {
    const lesson = lessonsByDifficulty[difficulty];
    if (!lesson) continue;
    if (!first) allChildren.push(new Paragraph({ children: [new PageBreak()] }));
    first = false;
    // eslint-disable-next-line no-await-in-loop
    allChildren.push(...(await buildLessonDocxSections({ ...lesson, topic: `${topic} — ${DIFFICULTY_LABELS[difficulty]}` })));
  }
  const doc = new Document({ sections: [{ children: allChildren }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(topic)}-all-difficulties.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Interview Prep — combined Interview Corner across all 3 difficulties ----
// A focused companion to "All 3 Difficulties": just the Q&As + curveball
// per level, for someone cramming interview prep rather than re-reading
// full lessons. Reuses the same already-fetched lessonsByDifficulty map.

async function buildInterviewPrepPdf(pdf, topic, lessonsByDifficulty) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let y = 56;

  const ensureSpace = (needed) => {
    if (y + needed > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };
  const writeParagraph = (text, { fontSize = 10.5, style = "normal", color = [30, 27, 46], gapAfter = 5 } = {}) => {
    pdf.setFont("helvetica", style);
    pdf.setFontSize(fontSize);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(sanitizeForPdf(text), maxWidth);
    ensureSpace(lines.length * (fontSize * 0.5) + gapAfter);
    pdf.text(lines, margin, y);
    y += lines.length * (fontSize * 0.5) + gapAfter;
  };
  const writeDifficultyHeading = (label) => {
    ensureSpace(16);
    pdf.setFillColor(236, 72, 153);
    pdf.rect(margin, y - 6, maxWidth, 11, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(255, 255, 255);
    pdf.text(sanitizeForPdf(label), margin + 3, y + 2);
    y += 13;
  };

  pdf.setFillColor(139, 92, 246);
  pdf.rect(0, 0, pageWidth, 45, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text(`Interview Prep`, margin, 24);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text(sanitizeForPdf(topic), margin, 34);

  for (const difficulty of DIFFICULTY_ORDER) {
    const lesson = lessonsByDifficulty[difficulty];
    if (!lesson) continue;
    writeDifficultyHeading(DIFFICULTY_LABELS[difficulty]);
    lesson.interview_qa.forEach((qa, i) => {
      writeParagraph(`Q${i + 1}. ${qa.q}`, { style: "bold", gapAfter: 2 });
      writeParagraph(qa.a, { gapAfter: 5 });
    });
    if (lesson.interview_curveball) {
      writeParagraph(`Curveball: ${lesson.interview_curveball.q}`, { style: "bold", gapAfter: 2 });
      writeParagraph(lesson.interview_curveball.a, { gapAfter: 5 });
    }
  }
}

export async function downloadInterviewPrepPdf(topic, lessonsByDifficulty) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  await buildInterviewPrepPdf(pdf, topic, lessonsByDifficulty);
  pdf.save(`${slugify(topic)}-interview-prep.pdf`);
}

export async function downloadInterviewPrepDocx(topic, lessonsByDifficulty) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
  const children = [
    new Paragraph({ text: `Interview Prep — ${topic}`, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: "Interview Corner across all three difficulty levels.", spacing: { after: 300 } }),
  ];
  for (const difficulty of DIFFICULTY_ORDER) {
    const lesson = lessonsByDifficulty[difficulty];
    if (!lesson) continue;
    children.push(new Paragraph({ text: DIFFICULTY_LABELS[difficulty], heading: HeadingLevel.HEADING_1 }));
    lesson.interview_qa.forEach((qa, i) => {
      children.push(new Paragraph({ children: [new TextRun({ text: `Q${i + 1}. ${qa.q}`, bold: true })] }));
      children.push(new Paragraph({ text: qa.a, spacing: { after: 150 } }));
    });
    if (lesson.interview_curveball) {
      children.push(new Paragraph({ children: [new TextRun({ text: `Curveball: ${lesson.interview_curveball.q}`, bold: true, italics: true })] }));
      children.push(new Paragraph({ text: lesson.interview_curveball.a, spacing: { after: 150 } }));
    }
  }
  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(topic)}-interview-prep.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Practice ZIP (topic-practice.zip: script + requirements.txt + dataset + SETUP_GUIDE.pdf) ----

// De-dupes requirements across the 3 difficulty levels by package name
// (text before the first version operator), keeping the first pinned
// version seen — the notebook runs all 3 exercises in ONE kernel/venv, so
// there's exactly one requirements.txt, not one per difficulty.
function mergeRequirements(practicesByDifficulty) {
  const seen = new Map();
  for (const difficulty of DIFFICULTY_ORDER) {
    const practice = practicesByDifficulty[difficulty];
    for (const req of practice?.requirements ?? []) {
      const name = req.split(/[=<>~!]/)[0].trim().toLowerCase();
      if (!seen.has(name)) seen.set(name, req);
    }
  }
  return [...seen.values()];
}

// The beginner setup guide is templated here, NOT written by the LLM —
// the venv/Jupyter/troubleshooting steps are static boilerplate that
// doesn't vary per topic, so generating them fresh every time would just
// be wasted tokens (and a reliability risk: an LLM asked to reproduce
// these instructions correctly every single time is a worse bet than a
// fixed template). Per-difficulty specifics (expected output, setup
// notes) live in practice.ipynb's own markdown cells instead of being
// duplicated here — this guide only covers getting the notebook running.
async function buildSetupGuidePdf(topic, practicesByDifficulty) {
  const requirements = mergeRequirements(practicesByDifficulty);
  const setupNotes = DIFFICULTY_ORDER.map((d) => practicesByDifficulty[d]?.setup_notes).filter(Boolean);

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let y = 56;

  const ensureSpace = (needed) => {
    if (y + needed > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };
  const heading = (text) => {
    ensureSpace(12);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(139, 92, 246);
    pdf.text(sanitizeForPdf(text), margin, y);
    y += 8;
  };
  const paragraph = (text, { code = false } = {}) => {
    pdf.setFont(code ? "courier" : "helvetica", "normal");
    pdf.setFontSize(code ? 9.5 : 10.5);
    const lines = pdf.splitTextToSize(sanitizeForPdf(text), maxWidth - (code ? 6 : 0));
    if (code) {
      ensureSpace(lines.length * 4.8 + 6);
      pdf.setFillColor(30, 27, 46);
      pdf.rect(margin, y - 4, maxWidth, lines.length * 4.8 + 4, "F");
      pdf.setTextColor(230, 230, 250);
      pdf.text(lines, margin + 3, y);
      y += lines.length * 4.8 + 8;
    } else {
      ensureSpace(lines.length * 5.2 + 4);
      pdf.setTextColor(30, 27, 46);
      pdf.text(lines, margin, y);
      y += lines.length * 5.2 + 4;
    }
  };
  const bullet = (text) => paragraph(`•  ${text}`);

  pdf.setFillColor(139, 92, 246);
  pdf.rect(0, 0, pageWidth, 45, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(`Setup & How to Run`, margin, 24);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text(sanitizeForPdf(`${topic} — practice.ipynb (3 difficulty levels)`), margin, 34);

  heading("1. Prerequisites");
  bullet("Install Python 3.10+: https://www.python.org/downloads/");
  bullet('Verify it installed — run "python --version" in a terminal; you should see a version number.');
  setupNotes.forEach((note) => bullet(`Extra setup: ${note}`));

  heading("2. Create a virtual environment");
  paragraph("python -m venv venv", { code: true });
  paragraph("Activate it — Windows (PowerShell): venv\\Scripts\\Activate.ps1   |   Mac/Linux: source venv/bin/activate");

  heading("3. Install Jupyter and dependencies");
  paragraph(`pip install jupyter${requirements.length ? "\npip install -r requirements.txt" : ""}`, { code: true });
  paragraph(
    requirements.length
      ? `requirements.txt installs: ${requirements.join(", ")}.`
      : "None of the three exercises need external packages — requirements.txt is empty, nothing else to install.",
  );

  heading("4. Open and run the notebook");
  paragraph("jupyter notebook practice.ipynb", { code: true });
  paragraph(
    "This opens practice.ipynb in your browser. Use \"Run All\" (or Shift+Enter through each cell, top to bottom). The notebook has one section per difficulty level — Explain Like I'm 12, Standard, Deep Dive — each with a markdown cell right above its code cell showing the exact expected output, so you can confirm it worked.",
  );
  paragraph("Prefer VS Code? Open practice.ipynb directly — its built-in Jupyter support runs the same way (pick this venv as the kernel first).");

  heading("5. Troubleshooting");
  bullet('"jupyter: command not found" — your virtual environment isn\'t activated, or step 3 wasn\'t run.');
  bullet("An import/module error inside a cell — re-run step 3 to confirm requirements.txt installed inside THIS venv, not a different Python install.");
  bullet("A file-not-found error mentioning a dataset CSV — launch Jupyter from inside the unzipped folder (the same directory as practice.ipynb), not from somewhere else.");

  return pdf.output("arraybuffer");
}

function nbLines(text) {
  const lines = String(text ?? "").split("\n");
  return lines.map((line, i) => (i < lines.length - 1 ? line + "\n" : line));
}

function nbMarkdownCell(text) {
  return { cell_type: "markdown", metadata: {}, source: nbLines(text) };
}

function nbCodeCell(code) {
  return { cell_type: "code", execution_count: null, metadata: {}, outputs: [], source: nbLines(code) };
}

// One .ipynb with 3 sections (eli12/standard/deep), each a markdown intro
// (what it demonstrates + expected output) followed by its code cell —
// meant to be opened once and run top to bottom in a single Python kernel.
function buildNotebook(topic, codeByDifficulty) {
  const cells = [
    nbMarkdownCell(
      `# Practice: ${topic}\n\nOne exercise per difficulty level. Run the cells top to bottom — each section is self-contained.`,
    ),
  ];
  for (const difficulty of DIFFICULTY_ORDER) {
    const entry = codeByDifficulty[difficulty];
    if (!entry) continue;
    const { practice, code } = entry;
    const introLines = [
      `## ${DIFFICULTY_LABELS[difficulty]}`,
      "",
      "**Expected output:**",
      "```",
      practice.expected_output ?? "",
      "```",
    ];
    cells.push(nbMarkdownCell(introLines.join("\n")));
    cells.push(nbCodeCell(code));
  }
  return {
    cells,
    metadata: {
      kernelspec: { display_name: "Python 3", language: "python", name: "python3" },
      language_info: { name: "python", pygments_lexer: "ipython3" },
    },
    nbformat: 4,
    nbformat_minor: 5,
  };
}

/**
 * practicesByDifficulty: { eli12?, standard?, deep? } each a practice
 * object from api/practice.js (called once per difficulty — see
 * DownloadMenu's handleCombinedPractice). Produces one ZIP:
 * practice.ipynb (all 3 exercises), requirements.txt (merged), any
 * dataset CSVs (namespaced per difficulty to avoid filename collisions),
 * and SETUP_GUIDE.pdf.
 */
export async function downloadPracticeZip(topic, practicesByDifficulty) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const codeByDifficulty = {};
  for (const difficulty of DIFFICULTY_ORDER) {
    const practice = practicesByDifficulty[difficulty];
    if (!practice) continue;
    let code = practice.code;
    if (practice.needs_dataset && practice.dataset_csv && practice.dataset_filename) {
      const namespacedFilename = `${difficulty}_${practice.dataset_filename}`;
      code = code.split(practice.dataset_filename).join(namespacedFilename);
      zip.file(namespacedFilename, practice.dataset_csv);
    }
    codeByDifficulty[difficulty] = { practice, code };
  }

  zip.file("practice.ipynb", JSON.stringify(buildNotebook(topic, codeByDifficulty), null, 1));

  const requirements = mergeRequirements(practicesByDifficulty);
  zip.file("requirements.txt", requirements.length ? requirements.join("\n") + "\n" : "");
  zip.file("SETUP_GUIDE.pdf", await buildSetupGuidePdf(topic, practicesByDifficulty));

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(topic)}-practice.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

export { slugify };
export { SECTIONS };
