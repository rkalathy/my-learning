import Hero from "../components/Hero.jsx";
import DueForReviewTeaser from "../components/DueForReviewTeaser.jsx";
import ContinueLearningCard from "../components/ContinueLearningCard.jsx";
import { getLibraryList } from "../lib/store.js";
import { topicsMasteredCount, computeStreak } from "../lib/stats.js";
import { todayISO } from "../lib/srs.js";

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-2xl border p-4 text-center" style={{ backgroundColor: `${accent}12`, borderColor: `${accent}33` }}>
      <p className="text-2xl font-extrabold" style={{ color: accent }}>
        {value}
      </p>
      <p className="text-xs font-medium text-ink-soft">{label}</p>
    </div>
  );
}

export default function HomePage() {
  const library = getLibraryList();
  const mastered = topicsMasteredCount();
  const streak = computeStreak(todayISO());

  return (
    <div className="space-y-6">
      <Hero />
      <DueForReviewTeaser />
      <ContinueLearningCard />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Topics learned" value={library.length} accent="#8b5cf6" />
        <StatCard label="Topics mastered" value={mastered} accent="#10b981" />
        <StatCard label="Day streak" value={streak} accent="#f97316" />
      </div>

      {library.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-line p-8 text-center text-sm text-ink-soft">
          Your library is empty — search for your first topic above to get started!
        </div>
      )}
    </div>
  );
}
