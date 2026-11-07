"use strict";

/** A synthetic snapshot fixture for tests. No real user data. */

function buildSnapshot(overrides = {}) {
  const days = {};
  const seq = ["2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"];
  seq.forEach((d, i) => (days[d] = i + 1));
  days["2026-11-20"] = 1;
  days["2026-11-21"] = 2;
  days["2026-11-22"] = 3;

  const byHour = new Array(24).fill(0);
  byHour[22] = 30;
  byHour[23] = 20;
  byHour[10] = 10;
  byHour[14] = 5;
  const byWeekday = new Array(7).fill(0);
  byWeekday[1] = 25;
  byWeekday[3] = 15;
  byWeekday[6] = 20;

  return {
    schema_version: 1,
    generated_at: "2026-11-22T08:00:00.000Z",
    account: "frpboy",
    timezone: "Asia/Kolkata",
    data_scope: "public",
    completeness: { public_only: true, history_complete: true, oldest_complete_month: "2021-01", first_event_date: "2021-01-05", notes: [], months: {} },
    profile: { login: "frpboy", name: "Test Person", created_at: "2021-01-01T00:00:00Z", followers: 42, following: 10, public_repos: 30 },
    totals: { repos_public: 30, stars_received: 55, forks_received: 12, commits_collected: 480, prs: 90, prs_merged: 60, prs_open: 5, issues: 25 },
    languages: { bytes: { TypeScript: 500000, JavaScript: 250000, Python: 125000, Dart: 125000 }, repos_covered: 28, repos_without_language: 2, failed_repos: [] },
    repos: {
      collected_at: "2026-11-22T08:00:00.000Z",
      list: [
        { name: "alpha", fork: false, archived: false, language: "TypeScript", stars: 30, forks: 4, pushed_at: "2026-11-20T00:00:00Z" },
        { name: "beta", fork: false, archived: false, language: "TypeScript", stars: 20, forks: 3, pushed_at: "2026-11-19T00:00:00Z" },
        { name: "gamma", fork: true, archived: false, language: "Python", stars: 5, forks: 5, pushed_at: "2026-10-01T00:00:00Z" },
        { name: "delta", fork: false, archived: true, language: null, stars: 0, forks: 0, pushed_at: "2024-01-01T00:00:00Z" },
      ],
    },
    activity: { days },
    productivity: { by_hour: byHour, by_weekday: byWeekday, sample_commits: 65, window_from: "2021-01-05", window_to: "2026-11-22" },
    events: [],
    ...overrides,
  };
}

module.exports = { buildSnapshot };
