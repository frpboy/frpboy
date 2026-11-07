"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { collect } = require("../src/github/collect");
const { makeFakeGitHub } = require("./fakegithub");

test("collect builds a snapshot from public data with IST day bucketing and sha dedupe", async () => {
  const { fetchImpl } = makeFakeGitHub();
  const snap = await collect(null, { token: "fake", fetchImpl, paceMs: 0, now: new Date("2026-11-07T12:00:00Z"), log: () => {} });
  assert.equal(snap.account, "frpboy");
  assert.equal(snap.data_scope, "public");
  // 3 unique commits: two on 2026-11-07 IST, one on 2026-10-15 IST.
  assert.equal(snap.totals.commits_collected, 3);
  assert.equal(snap.activity.days["2026-11-07"], 2);
  assert.equal(snap.activity.days["2026-10-15"], 1);
  // PR + issue also land on activity days.
  assert.equal(snap.activity.days["2026-11-05"], 1);
  assert.equal(snap.activity.days["2026-11-04"], 1);
  // Commit-only day map excludes PR/issue events.
  assert.equal(snap.activity.commit_days["2026-11-07"], 2);
  assert.equal(snap.activity.commit_days["2026-11-05"], undefined);
  // Productivity: 22:00 and 09:30 and 15:30 IST hours.
  assert.equal(snap.productivity.by_hour[1], 1);
  assert.equal(snap.productivity.by_hour[15], 1);
  assert.equal(snap.productivity.by_hour[9], 1);
  // Languages merged across repos.
  assert.deepEqual(snap.languages.bytes, { TypeScript: 1000, Python: 500 });
  assert.equal(snap.totals.stars_received, 8);
  assert.equal(snap.totals.prs, 2);
  assert.equal(snap.totals.prs_merged, 1);
});

test("collect attaches GitHub's public contribution calendar when the route is enabled", async () => {
  const { fetchImpl } = makeFakeGitHub();
  const snap = await collect(null, { token: "fake", fetchImpl, paceMs: 0, now: new Date("2026-11-07T12:00:00Z"), log: () => {}, contributionCalendar: true });
  assert.equal(snap.contributions.source, "github-contribution-calendar");
  assert.equal(snap.contributions.days["2026-11-05"], 3);
  assert.equal(snap.contributions.days["2026-11-07"], 2);
  assert.equal(snap.contributions.years["2026"], "current");
  assert.equal(snap.contributions.years["2025"], "complete", "one older year backfilled per run");
  assert.equal(snap.contributions.history_complete, false);
});

test("collect falls back to events with a note when the calendar is enabled but unavailable", async () => {
  const { fetchImpl: base } = makeFakeGitHub();
  const fetchImpl = async (url) => {
    if (new URL(url).pathname === "/users/frpboy/contributions") return { ok: false, status: 503, text: async () => "" };
    return base(url);
  };
  const snap = await collect(null, { token: "fake", fetchImpl, paceMs: 0, now: new Date("2026-11-07T12:00:00Z"), log: () => {}, contributionCalendar: true });
  assert.equal(snap.contributions, null);
  assert.ok(snap.completeness.notes.some((n) => n.includes("Contribution calendar unavailable")));
  assert.ok(Object.keys(snap.activity.days).length > 0, "events ledger still collected");
});

test("collect rejects when the API returns a different account identity", async () => {
  const fetchImpl = async () => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => ({ login: "not-frpboy" }) });
  await assert.rejects(() => collect(null, { token: "fake", fetchImpl, log: () => {} }), /identity/);
});

test("collect backfills at most one older month per run and marks months", async () => {
  const { fetchImpl } = makeFakeGitHub();
  const snap = await collect(null, { token: "fake", fetchImpl, paceMs: 0, now: new Date("2026-11-07T12:00:00Z"), log: () => {} });
  const months = snap.completeness.months;
  assert.equal(months["2026-11"], "current");
  assert.equal(months["2026-10"], "complete");
  assert.equal(months["2026-09"], undefined, "only one backfill month per run");
  assert.equal(snap.completeness.history_complete, false, "backfill not complete yet");
});

test("collect excludes private repositories even if the API returns them", async () => {
  const { fetchImpl } = makeFakeGitHub({
    repos: [
      { name: "alpha", fork: false, archived: false, language: "TypeScript", stargazers_count: 5, forks_count: 2, pushed_at: "2026-11-01T00:00:00Z" },
      { name: "secret-client-work", private: true, fork: false, archived: false, language: "TypeScript", stargazers_count: 0, forks_count: 0, pushed_at: "2026-11-01T00:00:00Z" },
    ],
  });
  const snap = await collect(null, { token: "fake", fetchImpl, paceMs: 0, now: new Date("2026-11-07T12:00:00Z"), log: () => {} });
  const names = snap.repos.list.map((r) => r.name);
  assert.deepEqual(names, ["alpha"]);
  assert.equal(snap.totals.repos_public, 1);
  assert.equal(snap.totals.stars_received, 5);
  assert.ok(!JSON.stringify(snap).includes("secret-client-work"), "no private repo fact anywhere in the snapshot");
});

test("calendar route is disabled by default so private-inclusive counts never enter the public snapshot", async () => {
  const { fetchImpl } = makeFakeGitHub();
  const snap = await collect(null, { token: "fake", fetchImpl, paceMs: 0, now: new Date("2026-11-07T12:00:00Z"), log: () => {} });
  assert.equal(snap.contributions, null);
  assert.ok(snap.completeness.notes.some((n) => n.includes("calendar route disabled")));
  assert.ok(!JSON.stringify(snap).includes("github-contribution-calendar"), "no calendar data serialized");
});
