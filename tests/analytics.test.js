"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { computeStreak, computeLanguages, computeProductivity, computeAchievements, computeAll, validateSnapshot } = require("../src/analytics/index");
const { buildSnapshot } = require("./fixture");

test("streak: current streak requires today or yesterday activity", () => {
  const days = { "2026-11-05": 1, "2026-11-06": 2, "2026-11-07": 1, "2026-11-01": 5 };
  // "now" = 2026-11-07 12:00 UTC (17:30 IST, still Nov 7 IST).
  const s = computeStreak(days, new Date("2026-11-07T12:00:00Z"));
  assert.equal(s.current, 3);
  assert.equal(s.longest, 3);
  assert.equal(s.total_contributions, 9);
});

test("streak: today without activity does not break the current streak yet", () => {
  const days = { "2026-11-05": 1, "2026-11-06": 2 };
  const s = computeStreak(days, new Date("2026-11-07T12:00:00Z"));
  assert.equal(s.current, 2);
});

test("streak: a gap ends the run; longest picks the best run", () => {
  const days = { "2026-11-01": 1, "2026-11-02": 1, "2026-11-03": 1, "2026-11-05": 1, "2026-11-06": 1 };
  const s = computeStreak(days, new Date("2026-11-07T12:00:00Z"));
  assert.equal(s.current, 2);
  assert.equal(s.longest, 3);
  assert.deepEqual(s.longest_range, { from: "2026-11-01", to: "2026-11-03" });
});

test("streak: empty series is zeros, not an error", () => {
  const s = computeStreak({}, new Date());
  assert.deepEqual([s.current, s.longest, s.total_days], [0, 0, 0]);
});

test("languages: percentages are byte-based and sum roughly to 100", () => {
  const l = computeLanguages({ bytes: { A: 300, B: 100, C: 100 }, repos_covered: 3, repos_without_language: 0 });
  assert.equal(l.items[0].name, "A");
  assert.equal(l.items[0].percent, 60);
  const sum = l.items.reduce((s, i) => s + i.percent, 0);
  assert.ok(Math.abs(sum - 100) < 1.5);
});

test("languages: empty bytes is unavailable, not a crash", () => {
  assert.equal(computeLanguages({ bytes: {} }).available, false);
  assert.equal(computeLanguages(null).available, false);
});

test("productivity: buckets partition the 24 hours into IST dayparts", () => {
  const p = computeProductivity({ by_hour: Array.from({ length: 24 }, (_, h) => (h === 22 ? 10 : h === 10 ? 5 : 0)), by_weekday: [0, 15, 0, 0, 0, 0, 0], sample_commits: 15, window_from: "2026-01-01", window_to: "2026-02-01" });
  assert.equal(p.best_hour, 22);
  assert.equal(p.best_weekday, "Monday");
  assert.equal(p.buckets.night, 10);
  assert.equal(p.buckets.morning, 5);
});

test("achievements: tiers reflect thresholds, no fake badges", () => {
  const s = buildSnapshot();
  const analytics = computeAll(s, new Date("2026-11-22T12:00:00Z"));
  assert.ok(analytics.ok);
  const repos = analytics.achievements.find((x) => x.label === "Repository Builder");
  assert.equal(repos.tier, "Silver"); // 30 public repos: >=25, <50
  const stars = analytics.achievements.find((x) => x.label === "Star Collector");
  assert.equal(stars.tier, "Silver"); // 55 stars
});

test("validateSnapshot rejects wrong account and bad schema", () => {
  assert.ok(validateSnapshot(null));
  assert.ok(validateSnapshot({ schema_version: 99 }));
  assert.ok(validateSnapshot({ schema_version: 1, account: "someone-else" }));
  assert.equal(validateSnapshot(buildSnapshot()), null);
});

test("computeAll marks fixture analytics ok and derives all sections", () => {
  const a = computeAll(buildSnapshot(), new Date("2026-11-22T12:00:00Z"));
  assert.ok(a.ok);
  for (const key of ["profile", "totals", "streak", "languages", "productivity", "repositories", "achievements", "activity", "meta"]) {
    assert.ok(a[key], `missing ${key}`);
  }
  assert.equal(a.repositories.forks, 1);
  assert.equal(a.repositories.archived, 1);
});
