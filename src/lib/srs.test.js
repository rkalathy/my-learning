import { test } from "node:test";
import assert from "node:assert/strict";
import { createSchedule, isDue, advanceSchedule, addDays, dueTopicIds } from "./srs.js";

test("createSchedule sets the first review 1 day after learning", () => {
  const schedule = createSchedule("2026-01-01");
  assert.equal(schedule.nextReviewDate, "2026-01-02");
  assert.equal(schedule.stage, 0);
  assert.equal(schedule.mastered, false);
});

test("a topic learned yesterday is due today (simulated clock)", () => {
  const schedule = createSchedule("2026-01-01");
  assert.equal(isDue(schedule, "2026-01-01"), false); // same day — not due yet
  assert.equal(isDue(schedule, "2026-01-02"), true); // exactly 1 day later — due
  assert.equal(isDue(schedule, "2026-01-05"), true); // overdue — still due
});

test("passing a review advances to the next interval (3 days)", () => {
  const schedule = createSchedule("2026-01-01");
  const next = advanceSchedule(schedule, "2026-01-02", true);
  assert.equal(next.stage, 1);
  assert.equal(next.nextReviewDate, "2026-01-05"); // 2026-01-02 + 3 days
  assert.equal(next.mastered, false);
});

test("failing a review resets to stage 0, due again tomorrow", () => {
  const schedule = createSchedule("2026-01-01");
  const advanced = advanceSchedule(schedule, "2026-01-02", true); // pass -> stage 1
  const failed = advanceSchedule(advanced, "2026-01-05", false); // fail on the 3-day review
  assert.equal(failed.stage, 0);
  assert.equal(failed.nextReviewDate, "2026-01-06");
});

test("passing all four intervals marks the topic mastered", () => {
  let schedule = createSchedule("2026-01-01");
  schedule = advanceSchedule(schedule, "2026-01-02", true); // stage 1, due +3d
  schedule = advanceSchedule(schedule, "2026-01-05", true); // stage 2, due +7d
  schedule = advanceSchedule(schedule, "2026-01-12", true); // stage 3, due +21d
  schedule = advanceSchedule(schedule, "2026-02-02", true); // stage 4 -> mastered
  assert.equal(schedule.mastered, true);
  assert.equal(schedule.nextReviewDate, null);
  assert.equal(schedule.reviewHistory.length, 4);
});

test("mastered topics are never due again", () => {
  let schedule = createSchedule("2026-01-01");
  for (const day of ["2026-01-02", "2026-01-05", "2026-01-12", "2026-02-02"]) {
    schedule = advanceSchedule(schedule, day, true);
  }
  assert.equal(isDue(schedule, "2099-01-01"), false);
});

test("addDays handles month/year boundaries correctly", () => {
  assert.equal(addDays("2026-01-30", 3), "2026-02-02");
  assert.equal(addDays("2026-12-25", 21), "2027-01-15");
});

test("dueTopicIds filters a schedule map down to only due topics", () => {
  const schedules = {
    tokenization: createSchedule("2026-01-01"), // due 2026-01-02
    embedding: createSchedule("2026-01-10"), // due 2026-01-11
  };
  assert.deepEqual(dueTopicIds(schedules, "2026-01-02"), ["tokenization"]);
  assert.deepEqual(dueTopicIds(schedules, "2026-01-11").sort(), ["embedding", "tokenization"]);
});
