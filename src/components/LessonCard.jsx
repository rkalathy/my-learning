import { SECTIONS, DIFFICULTIES } from "../lib/sections.js";
import SectionCard from "./SectionCard.jsx";
import RelatedChips from "./RelatedChips.jsx";
import CopyButton from "./CopyButton.jsx";

function StepsList({ steps }) {
  return (
    <ol className="list-inside list-decimal space-y-2">
      {steps.map((step, i) => (
        <li key={i} className="pl-1">
          {step}
        </li>
      ))}
    </ol>
  );
}

function ActionBlock({ lesson }) {
  if (lesson.action_lang) {
    return (
      <div className="relative">
        <pre>
          <code>{lesson.action}</code>
        </pre>
        <CopyButton text={lesson.action} className="absolute top-2 right-2 bg-ink/80 text-white hover:bg-ink" />
      </div>
    );
  }
  return <p>{lesson.action}</p>;
}

function ConfusionsList({ confusions }) {
  return (
    <ul className="space-y-2">
      {confusions.map((c, i) => (
        <li key={i} className="rounded-lg bg-sec-confusions/10 p-2.5">
          <span className="font-bold">{c.a}:</span> {c.b}
        </li>
      ))}
    </ul>
  );
}

function InterviewCorner({ interview_qa, interview_curveball }) {
  return (
    <div className="space-y-3">
      {interview_qa.map((qa, i) => (
        <div key={i}>
          <p className="font-bold text-ink">
            Q{i + 1}. {qa.q}
          </p>
          <p className="mt-1 text-ink-soft">{qa.a}</p>
        </div>
      ))}
      {interview_curveball && (
        <div className="rounded-lg border-2 border-dashed border-sec-interview/40 p-2.5">
          <p className="font-bold text-sec-interview">🌶️ Curveball: {interview_curveball.q}</p>
          <p className="mt-1 text-ink-soft">{interview_curveball.a}</p>
        </div>
      )}
    </div>
  );
}

// M2 version — the full colorful 9-section renderer, difficulty toggle,
// and regenerate control. Quiz Me and Download land in M3/M4/M7 as
// additions to the header action row below, without touching the
// section-rendering logic here.
export default function LessonCard({ lesson, difficulty, onDifficultyChange, onRegenerate, regenerating }) {
  const bySections = {
    one_line: <p className="text-lg font-semibold">{lesson.one_line}</p>,
    analogy: <p>{lesson.analogy}</p>,
    why: <p>{lesson.why}</p>,
    steps: <StepsList steps={lesson.steps} />,
    action: <ActionBlock lesson={lesson} />,
    confusions: <ConfusionsList confusions={lesson.confusions} />,
    interview: <InterviewCorner interview_qa={lesson.interview_qa} interview_curveball={lesson.interview_curveball} />,
    memory_hook: (
      <p className="rounded-lg bg-sec-memory/12 p-3 text-base font-bold text-ink italic">📌 {lesson.memory_hook}</p>
    ),
    related: (
      <RelatedChips related={{ before: lesson.related_before, next: lesson.related_next, paired: lesson.related_paired }} />
    ),
  };

  return (
    <div className="space-y-5">
      <div className="animate-fade-slide-up rounded-3xl bg-gradient-to-br from-brand-violet via-brand-pink to-brand-orange p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-extrabold sm:text-3xl">{lesson.topic}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(lesson.tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                  style={{ backgroundColor: "rgba(255,255,255,0.22)" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full bg-white/20 p-1">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => onDifficultyChange(d.id)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    difficulty === d.id ? "bg-white text-brand-violet" : "text-white/90 hover:bg-white/10"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="rounded-full border-2 border-white/70 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            {regenerating ? "Regenerating…" : "↻ Regenerate"}
          </button>
        </div>
      </div>

      {SECTIONS.map((section, i) => (
        <SectionCard key={section.key} section={section} index={i} defaultCollapsed={section.collapsedByDefault}>
          {bySections[section.key]}
        </SectionCard>
      ))}
    </div>
  );
}
