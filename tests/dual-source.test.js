"use strict";

// Dual-dataset presentation: GitHub's all-visible contribution calendar and the
// public-only events ledger are shown side by side, clearly labeled, and never
// summed or subtracted. Also: language/repository listings have no cutoff and
// no "Other" aggregation.

const test = require("node:test");
const assert = require("node:assert/strict");
const { CARDS } = require("../src/cards/generate");
const { THEMES } = require("../src/cards/theme");
const { computeAll } = require("../src/analytics/index");
const { buildSnapshot } = require("./fixture");

const NOW = new Date("2026-11-22T12:00:00Z");

function withCalendar() {
  // Synthetic calendar days only; no real user data.
  const days = {};
  const seq = ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"];
  seq.forEach((d, i) => (days[d] = 10 + i));
  return buildSnapshot({
    contributions: { source: "github-contribution-calendar", history_complete: true, days, notes: [] },
  });
}

test("analytics keeps both datasets separate and never derives a private figure", () => {
  const a = computeAll(withCalendar(), NOW);
  assert.equal(a.ok, true);
  assert.equal(a.streak.source, "github-calendar");
  assert.equal(a.streak_all_visible.source, "github-calendar");
  assert.equal(a.streak_events.source, "events");
  // No field anywhere attempts a calendar-minus-ledger difference.
  const json = JSON.stringify(a);
  assert.ok(!/private_count|private_only|difference/i.test(json), "no derived private figure");
  // Events series remains available alongside the calendar series.
  assert.ok(a.activity_events.points.length > 0);
  assert.ok(a.activity.points.length > 0);
});

test("streak card labels both datasets visibly when the calendar is present", () => {
  const a = computeAll(withCalendar(), NOW);
  const svg = CARDS["streak.svg"].generate(a, buildSnapshot(), THEMES.dark);
  assert.ok(svg.includes("All visible activity"), "calendar dataset labeled");
  assert.ok(svg.includes("anonymized private contributions"), "private-inclusive nature disclosed");
  assert.ok(svg.includes("Public-only (events ledger)"), "events dataset labeled");
  assert.ok(svg.includes("never summed"), "separation stated");
  assert.ok(!svg.includes("public-events approximation"), "no fallback wording when calendar active");
});

test("streak card falls back to labeled public-events mode without a calendar", () => {
  const a = computeAll(buildSnapshot(), NOW);
  assert.equal(a.streak.source, "events-fallback");
  const svg = CARDS["streak.svg"].generate(a, buildSnapshot(), THEMES.dark);
  assert.ok(svg.includes("Contribution Streak (public activity)"));
  assert.ok(svg.includes("public-events approximation; GitHub contribution calendar not used"));
  assert.ok(svg.includes("Total public events"));
});

test("activity card draws both series with a legend when the calendar is present", () => {
  const a = computeAll(withCalendar(), NOW);
  const svg = CARDS["activity.svg"].generate(a, buildSnapshot(), THEMES.dark);
  assert.ok(svg.includes("All visible ·"), "calendar series in legend");
  assert.ok(svg.includes("Public events ·"), "events series in legend");
  assert.ok(svg.includes("each scaled to its own peak; never summed"), "scaling and separation stated");
});

test("summary card lists both 90-day measures separately", () => {
  const a = computeAll(withCalendar(), NOW);
  const svg = CARDS["summary.svg"].generate(a, buildSnapshot(), THEMES.dark);
  assert.ok(svg.includes("All visible (90d)"));
  assert.ok(svg.includes("Public events (90d)"));
  assert.ok(svg.includes("Never summed."));
});

test("trophies card states milestone scopes when the calendar is present", () => {
  const a = computeAll(withCalendar(), NOW);
  const svg = CARDS["trophies.svg"].generate(a, buildSnapshot(), THEMES.dark);
  assert.ok(svg.includes("Achievements (visible-activity milestones)"));
  assert.ok(svg.includes("public-only"), "public scope of repo/PR/star milestones stated");
});

test("languages card lists every language with no Other bucket or cutoff", () => {
  const many = {};
  for (let i = 0; i < 12; i++) many[`Lang${i}`] = (12 - i) * 10000;
  many.Tiny = 5; // far below 0.1% of the total
  const snap = buildSnapshot({ languages: { bytes: many, repos_covered: 30, repos_without_language: 0, failed_repos: [] } });
  const a = computeAll(snap, NOW);
  assert.equal(a.languages.items.length, 13, "all languages kept in analytics");
  assert.ok(!a.languages.items.some((it) => it.name === "Other"), "no Other aggregation");
  const svg = CARDS["languages.svg"].generate(a, snap, THEMES.dark);
  for (let i = 0; i < 12; i++) assert.ok(svg.includes(`Lang${i}`), `Lang${i} listed`);
  assert.ok(svg.includes("&lt;0.1%") || svg.includes("<0.1%"), "sub-0.1% share shown as <0.1%");
  assert.ok(!/>Other</.test(svg), "no Other row rendered");
  assert.ok(svg.includes("private excluded"), "scope stated");
});

test("repositories card lists every primary-language group", () => {
  const list = [];
  for (let i = 0; i < 10; i++) {
    list.push({ name: `r${i}`, fork: false, archived: false, language: `Lang${i}`, stars: 0, forks: 0, pushed_at: "2026-11-01T00:00:00Z" });
  }
  list.push({ name: "nolang", fork: false, archived: false, language: null, stars: 0, forks: 0, pushed_at: "2026-11-01T00:00:00Z" });
  const snap = buildSnapshot({ repos: { collected_at: "2026-11-22T08:00:00Z", list } });
  const a = computeAll(snap, NOW);
  assert.equal(a.repositories.items.length, 11, "every group kept, including no-language");
  const svg = CARDS["repositories.svg"].generate(a, snap, THEMES.dark);
  for (let i = 0; i < 10; i++) assert.ok(svg.includes(`Lang${i}`), `Lang${i} listed`);
  assert.ok(svg.includes("No language"), "unnamed repos labeled honestly");
  assert.ok(!svg.includes("No language det…") && !svg.includes("No language det"), "scope-relevant label not truncated");
});
