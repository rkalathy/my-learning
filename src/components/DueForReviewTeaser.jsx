import { useMemo } from "react";
import { Link } from "react-router-dom";
import { getSchedules, getLibrary } from "../lib/store.js";
import { dueTopicIds, todayISO } from "../lib/srs.js";

export default function DueForReviewTeaser() {
  const due = useMemo(() => {
    const schedules = getSchedules();
    const library = getLibrary();
    return dueTopicIds(schedules, todayISO()).map((id) => library[id]?.topic ?? id);
  }, []);

  if (due.length === 0) return null;

  return (
    <Link
      to="/review"
      className="block w-full rounded-2xl border-2 border-sec-confusions/30 bg-sec-confusions/8 p-4 transition hover:border-sec-confusions/60"
    >
      <p className="text-xs font-bold tracking-wide text-sec-confusions uppercase">Due for Review</p>
      <p className="mt-1 text-sm text-ink">
        {due.length} topic{due.length === 1 ? "" : "s"} ready for a quick refresh:{" "}
        <span className="font-semibold">{due.slice(0, 3).join(", ")}</span>
        {due.length > 3 ? ` +${due.length - 3} more` : ""} →
      </p>
    </Link>
  );
}
