"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { parseCalendarHtml, collectCalendar, calendarUrl } = require("../src/github/calendar");

/** Synthetic contributions page matching GitHub's real markup shape. */
function calendarHtml(year, counts = {}) {
  const daysInYear = [];
  const start = new Date(Date.UTC(year, 0, 1));
  for (let d = new Date(start); d.getUTCFullYear() === year; d.setUTCDate(d.getUTCDate() + 1)) {
    daysInYear.push(d.toISOString().slice(0, 10));
  }
  let cells = "";
  let tips = "";
  daysInYear.forEach((date, i) => {
    const id = `contribution-day-component-${i}-1`;
    cells += `<td tabindex="0" data-ix="1" style="width: 10px" data-date="${date}" id="${id}" data-level="0" role="gridcell" data-view-component="true" class="ContributionCalendar-day"></td>\n`;
    const n = counts[date] || 0;
    const label = n === 0 ? `No contributions on ${date}.` : `${n} contribution${n === 1 ? "" : "s"} on ${date}.`;
    tips += `<tool-tip style="pointer-events: none;" id="tooltip-${i}" for="${id}" popover="manual">${label}</tool-tip>\n`;
  });
  return `<div class="js-yearly-contributions"><table>${cells}</table>${tips}</div>`;
}

test("parseCalendarHtml extracts per-day counts from real-shaped markup", () => {
  const html = calendarHtml(2026, { "2026-11-05": 73, "2026-11-06": 12 });
  const days = parseCalendarHtml(html);
  assert.equal(Object.keys(days).length, 365);
  assert.equal(days["2026-11-05"], 73);
  assert.equal(days["2026-11-06"], 12);
  assert.equal(days["2026-01-01"], 0);
});

test("parseCalendarHtml handles comma-formatted counts and attribute order", () => {
  const html = (
    '<div class="js-yearly-contributions"><table>' +
    '<td id="contribution-day-component-0-0" class="ContributionCalendar-day" data-date="2026-11-05"></td>' +
    "</table>" +
    '<tool-tip for="contribution-day-component-0-0">1,234 contributions on November 5th.</tool-tip>' +
    "<td data-date=\"2026-11-06\" class=\"ContributionCalendar-day\" id=\"contribution-day-component-1-0\"></td>" +
    '<tool-tip for="contribution-day-component-1-0">No contributions on November 6th.</tool-tip>'
  ).padEnd(1200, " ");
  const days = parseCalendarHtml(html);
  assert.equal(days["2026-11-05"], 1234);
  assert.equal(days["2026-11-06"], 0);
});

test("parseCalendarHtml throws on markup drift instead of returning garbage", () => {
  assert.throws(() => parseCalendarHtml("<html><body>totally different</body></html>".padEnd(1200, " ")), /day cells/);
  const noTips = '<div><td class="ContributionCalendar-day" data-date="2026-01-01" id="contribution-day-component-0-0"></td></div>'.padEnd(1200, " ");
  assert.throws(() => parseCalendarHtml(noTips), /tooltips/);
});

test("collectCalendar refetches the current year and backfills one older year per run", async () => {
  const fetches = [];
  const fetchImpl = async (url) => {
    fetches.push(url);
    const m = /[?&]from=(\d{4})-/.exec(url);
    const year = Number(m[1]);
    return { ok: true, text: async () => calendarHtml(year, { [`${year}-03-04`]: 2 }) };
  };
  const out = await collectCalendar({ accountYear: 2021, currentYear: 2026, previous: null, fetchImpl, log: () => {} });
  assert.equal(out.source, "github-contribution-calendar");
  assert.equal(out.years["2026"], "current");
  assert.equal(out.years["2025"], "complete", "one older year backfilled");
  assert.equal(out.years["2024"], undefined, "only one older year per run");
  assert.equal(out.history_complete, false);
  assert.equal(out.days["2026-03-04"], 2);
  assert.equal(out.days["2025-03-04"], 2);
  assert.equal(fetches.length, 2);
  assert.ok(fetches.every((u) => u.startsWith(calendarUrl("2021-01-01", "2021-12-31").split("?")[0])));
});

test("collectCalendar completes history and preserves prior years", async () => {
  const previous = {
    contributions: {
      source: "github-contribution-calendar",
      days: { "2021-05-05": 3, "2022-01-01": 0, "2023-01-01": 0, "2024-01-01": 0, "2025-01-01": 0 },
      years: { "2021": "complete", "2022": "complete", "2023": "complete", "2024": "complete", "2025": "complete" },
      history_complete: false,
    },
  };
  const fetchImpl = async (url) => {
    const year = Number(/[?&]from=(\d{4})-/.exec(url)[1]);
    return { ok: true, text: async () => calendarHtml(year, { "2026-11-07": 5 }) };
  };
  const out = await collectCalendar({ accountYear: 2021, currentYear: 2026, previous, fetchImpl, log: () => {} });
  assert.equal(out.history_complete, true);
  assert.equal(out.days["2021-05-05"], 3, "prior year data preserved");
  assert.equal(out.days["2026-11-07"], 5, "current year refreshed");
});

test("collectCalendar keeps the previous calendar when the refresh fails", async () => {
  const previous = { contributions: { source: "github-contribution-calendar", days: { "2026-11-01": 4 }, years: { "2026": "current" }, history_complete: false } };
  const fetchImpl = async () => ({ ok: false, status: 500, text: async () => "" });
  const out = await collectCalendar({ accountYear: 2021, currentYear: 2026, previous, fetchImpl, log: () => {} });
  assert.equal(out.days["2026-11-01"], 4, "stale calendar preserved");
  assert.ok(out.notes.some((n) => n.includes("keeping previous calendar")));
  await assert.rejects(() => collectCalendar({ accountYear: 2021, currentYear: 2026, previous: null, fetchImpl, log: () => {} }));
});

test("collectCalendar clips days outside [firstDate, lastDate] (future days and grid overlap)", async () => {
  const fetchImpl = async (url) => {
    const year = Number(/[?&]from=(\d{4})-/.exec(url)[1]);
    return { ok: true, text: async () => calendarHtml(year, { "2026-01-01": 1, "2026-06-01": 2, "2026-12-31": 9, "2025-12-31": 4 }) };
  };
  const out = await collectCalendar({
    accountYear: 2025, currentYear: 2026, previous: null, fetchImpl, log: () => {},
    firstDate: "2026-01-15", lastDate: "2026-11-07",
  });
  assert.equal(out.days["2026-01-01"], undefined, "before firstDate dropped");
  assert.equal(out.days["2026-12-31"], undefined, "future day dropped");
  assert.equal(out.days["2025-12-31"], undefined, "prior-year overlap day dropped");
  assert.equal(out.days["2026-06-01"], 2, "in-range day kept");
  for (const d of Object.keys(out.days)) {
    assert.ok(d >= "2026-01-15" && d <= "2026-11-07", `day ${d} in bounds`);
  }
});

test("collectCalendar drops out-of-range days carried in the previous snapshot", async () => {
  const previous = { contributions: { source: "github-contribution-calendar", days: { "2026-11-08": 3, "2026-11-06": 2 }, years: { "2026": "current" }, history_complete: false } };
  const fetchImpl = async (url) => {
    const year = Number(/[?&]from=(\d{4})-/.exec(url)[1]);
    return { ok: true, text: async () => calendarHtml(year, { "2026-11-06": 2 }) };
  };
  const out = await collectCalendar({
    accountYear: 2026, currentYear: 2026, previous, fetchImpl, log: () => {},
    firstDate: "2026-01-01", lastDate: "2026-11-07",
  });
  assert.equal(out.days["2026-11-08"], undefined, "stale future day removed");
  assert.equal(out.days["2026-11-06"], 2);
});

test("overlapping year pages dedupe by date with the fresh fetch winning", async () => {
  const previous = { contributions: { source: "github-contribution-calendar", days: { "2025-12-31": 1 }, years: { "2025": "complete", "2026": "current" }, history_complete: true } };
  const fetchImpl = async (url) => {
    const year = Number(/[?&]from=(\d{4})-/.exec(url)[1]);
    return { ok: true, text: async () => calendarHtml(year, { "2025-12-31": 7 }) };
  };
  const out = await collectCalendar({
    accountYear: 2025, currentYear: 2026, previous, fetchImpl, log: () => {},
    firstDate: "2025-01-01", lastDate: "2026-11-07",
  });
  // 2025 page is not refetched (already complete), so prior value survives.
  assert.equal(out.days["2025-12-31"], 1);
  assert.equal(Object.keys(out.days).filter((d) => d === "2025-12-31").length, 1);
});
