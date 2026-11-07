"use strict";

/**
 * Source-consistency tests: totals, dedupe, public-only scope, and the
 * boundary between the two measures the system publishes:
 *   - "contributions": GitHub's own public contribution calendar (per-day
 *     counts as GitHub defines them for the profile graph).
 *   - "commits / PRs / issues": the collected-events ledger from the Search
 *     API. A PR and its commits are separate event types on purpose; the two
 *     measures are never summed together and feed different cards.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { collect } = require("../src/github/collect");
const { computeAll, computeStreak } = require("../src/analytics/index");
const { makeFakeGitHub } = require("./fakegithub");

const NOW = new Date("2026-11-07T12:00:00Z");

async function buildSnap({ calendar = false } = {}) {
  const { fetchImpl } = makeFakeGitHub();
  return collect(null, { token: "fake", fetchImpl, paceMs: 0, now: NOW, log: () => {}, contributionCalendar: calendar });
}

test("events ledger totals are internally consistent and deduped", async () => {
  const snap = await buildSnap();
  const events = snap.events;
  const ids = new Set(events.map((e) => e.id));
  assert.equal(ids.size, events.length, "no duplicate event ids");

  const commitEvents = events.filter((e) => e.type === "commit");
  assert.equal(snap.totals.commits_collected, commitEvents.length);
  assert.equal(commitEvents.length, 3, "duplicate sha counted once");

  const daySum = Object.values(snap.activity.days).reduce((a, b) => a + b, 0);
  assert.equal(daySum, events.length, "activity day buckets sum to the ledger size");

  const commitDaySum = Object.values(snap.activity.commit_days).reduce((a, b) => a + b, 0);
  assert.equal(commitDaySum, commitEvents.length, "commit day buckets sum to commit total");
});

test("contributions (calendar) and events (ledger) stay separate measures", async () => {
  const snap = await buildSnap({ calendar: true });
  const a = computeAll(snap, NOW);
  assert.equal(a.ok, true);
  assert.equal(a.streak.source, "github-calendar");
  const calendarSum = Object.values(snap.contributions.days).reduce((x, y) => x + y, 0);
  assert.equal(a.streak.total_contributions, calendarSum, "streak totals come from the calendar, not the ledger");
  assert.equal(a.streak.current, 3, "calendar 2026-11-05..07 all active");
  // Ledger numbers are untouched by the calendar and vice versa.
  assert.equal(a.totals.commits_collected, 3);
  assert.equal(a.totals.prs, 2);
  assert.equal(a.meta.coverage.contributions_source, "github-calendar");
  assert.ok(a.meta.coverage.events_note.includes("Search API"));
});

test("analytics fall back to the events ledger when no calendar exists", async () => {
  const snap = await buildSnap();
  const a = computeAll(snap, NOW);
  assert.equal(a.streak.source, "events-fallback");
  assert.equal(a.meta.coverage.contributions_source, "events-fallback");
});

test("computeStreak treats zero-count days as inactive", () => {
  const days = {
    "2026-11-01": 0,
    "2026-11-02": 1,
    "2026-11-03": 2,
    "2026-11-04": 0,
    "2026-11-05": 5,
    "2026-11-06": 0,
    "2026-11-07": 0,
  };
  const st = computeStreak(days, NOW);
  assert.equal(st.longest, 2, "zero days break the run");
  assert.equal(st.longest_range.from, "2026-11-02");
  assert.equal(st.current, 0, "no activity today or yesterday");
  assert.equal(st.total_days, 3);
  assert.equal(st.total_contributions, 8);
});

test("snapshot carries public-only scope markers and no private fields", async () => {
  const snap = await buildSnap();
  assert.equal(snap.data_scope, "public");
  assert.equal(snap.completeness.public_only, true);
  for (const r of snap.repos.list) {
    assert.equal(r.private, undefined, "collector never stores a private flag value");
  }
});

test("computeStreak counts from yesterday when today has no activity yet", () => {
  const days = { "2026-11-05": 1, "2026-11-06": 2 };
  const st = computeStreak(days, NOW); // NOW is 2026-11-07 IST
  assert.equal(st.current, 2, "yesterday-anchored streak");
  const st2 = computeStreak({ ...days, "2026-11-07": 1 }, NOW);
  assert.equal(st2.current, 3, "today counts once it has activity");
});
