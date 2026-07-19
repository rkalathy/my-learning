import { useNavigate } from "react-router-dom";
import { isInLibrary, topicId } from "../lib/store.js";

function ChipGroup({ title, items, onNavigate }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold tracking-wide text-ink-soft uppercase">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const learned = isInLibrary(item.topic);
          return (
            <button
              key={item.topic}
              onClick={() => onNavigate(item.topic)}
              title={item.why}
              className="group flex items-center gap-1.5 rounded-full border border-sec-related/40 bg-sec-related/8 px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-sec-related hover:bg-sec-related/15"
            >
              {learned && <span className="text-sec-action">✓</span>}
              {item.topic}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function RelatedChips({ related }) {
  const navigate = useNavigate();
  if (!related) return null;

  const onNavigate = (topic) => navigate(`/lesson/${encodeURIComponent(topicId(topic))}?topic=${encodeURIComponent(topic)}`);

  return (
    <div className="space-y-4">
      <ChipGroup title="Learn Before" items={related.before} onNavigate={onNavigate} />
      <ChipGroup title="Learn Next" items={related.next} onNavigate={onNavigate} />
      <ChipGroup title="Often Paired With" items={related.paired} onNavigate={onNavigate} />
      <p className="text-[11px] text-ink-soft">✓ = already in your library. Hover a chip to see why it connects.</p>
    </div>
  );
}
