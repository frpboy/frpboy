"use strict";

/**
 * GitHub's own public contribution calendar, fetched anonymously from the
 * profile contributions page. No token is needed and the anonymous view
 * excludes private contributions by construction, so private work cannot
 * appear here.
 *
 * This is an unofficial, undocumented endpoint. If GitHub changes the markup,
 * parsing throws; the collector converts that into a flagged fallback to the
 * events-based ledger instead of fabricating numbers.
 *
 * Day boundaries are GitHub's own (the same days the profile contribution
 * graph shows). They are not recomputed into IST; cards that use this data
 * say "public contributions" without an IST claim.
 */

const ACCOUNT = "frpboy";

function calendarUrl(from, to) {
  return `https://github.com/users/${ACCOUNT}/contributions?from=${from}&to=${to}`;
}

/** Parse one contributions page into { "YYYY-MM-DD": count }. Throws on markup drift. */
function parseCalendarHtml(html) {
  if (typeof html !== "string" || html.length < 1000) {
    throw new Error("calendar page response too small");
  }
  const id2date = {};
  const cellRe = /<td\b[^>]*class="[^"]*ContributionCalendar-day[^"]*"[^>]*>/g;
  let m;
  while ((m = cellRe.exec(html))) {
    const tag = m[0];
    const id = /id="(contribution-day-component-[\d-]+)"/.exec(tag);
    const date = /data-date="(\d{4}-\d{2}-\d{2})"/.exec(tag);
    if (id && date) id2date[id[1]] = date[1];
  }
  const cellCount = Object.keys(id2date).length;
  if (cellCount === 0) throw new Error("no calendar day cells found; markup may have changed");

  const days = {};
  let tipCount = 0;
  const tipRe = /<tool-tip\b[^>]*for="(contribution-day-component-[\d-]+)"[^>]*>([^<]*)<\/tool-tip>/g;
  while ((m = tipRe.exec(html))) {
    const date = id2date[m[1]];
    if (!date) continue;
    const label = m[2].trim();
    let n = null;
    if (/^No contributions/.test(label)) {
      n = 0;
    } else {
      const c = /^([\d,]+) contributions? on /.exec(label);
      if (c) n = parseInt(c[1].replace(/,/g, ""), 10);
    }
    if (n == null || !Number.isFinite(n)) {
      throw new Error(`unparseable calendar tooltip: "${label.slice(0, 60)}"`);
    }
    days[date] = n;
    tipCount += 1;
  }
  if (tipCount < cellCount * 0.95) {
    throw new Error(`only ${tipCount}/${cellCount} calendar day tooltips parsed`);
  }
  return days;
}

/** Fetch one calendar year of GitHub's public contribution graph. */
async function fetchCalendarYear(year, { fetchImpl = fetch } = {}) {
  const res = await fetchImpl(calendarUrl(`${year}-01-01`, `${year}-12-31`), {
    headers: { "User-Agent": "frpboy-profile-stats" },
  });
  if (!res.ok) throw new Error(`calendar HTTP ${res.status}`);
  const days = parseCalendarHtml(await res.text());
  if (Object.keys(days).length < 300) throw new Error(`calendar year ${year} returned only ${Object.keys(days).length} days`);
  return days;
}

/**
 * Merge GitHub's calendar into the snapshot state. The current year is
 * refetched every run; one missing older year is backfilled per run until the
 * account-creation year is covered. Prior years already fetched are reused
 * from the previous snapshot (GitHub's historical calendar does not change).
 */
async function collectCalendar({ accountYear, currentYear, previous, log = () => {}, fetchImpl = fetch, sleep = () => Promise.resolve(), firstDate, lastDate } = {}) {
  const prior = (previous && previous.contributions) || null;
  const days = {};
  // Explicit date bounds: year pages include grid-overlap days from adjacent
  // years and zero-filled future days. Clip everything outside [firstDate,
  // lastDate] so no future-day or pre-account artifacts can leak into stats.
  const inRange = (d) => (!firstDate || d >= firstDate) && (!lastDate || d <= lastDate);
  for (const [d, n] of Object.entries((prior && prior.days) || {})) {
    if (inRange(d)) days[d] = n;
  }
  const years = { ...((prior && prior.years) || {}) };
  const notes = [];
  const merge = (fetched) => {
    for (const [d, n] of Object.entries(fetched)) if (inRange(d)) days[d] = n;
  };

  try {
    merge(await fetchCalendarYear(currentYear, { fetchImpl }));
    years[currentYear] = "current";
    log(`Contribution calendar: refreshed ${currentYear}`);
  } catch (e) {
    if (!prior || !prior.days || Object.keys(prior.days).length === 0) throw e;
    notes.push(`Contribution calendar refresh failed for ${currentYear} (${e.message}); keeping previous calendar.`);
  }

  for (let y = currentYear - 1; y >= accountYear; y--) {
    if (years[y]) continue;
    await sleep();
    try {
      merge(await fetchCalendarYear(y, { fetchImpl }));
      years[y] = "complete";
      log(`Contribution calendar: backfilled ${y}`);
    } catch (e) {
      // Leave the year unset so a later run retries; note the gap.
      notes.push(`Contribution calendar backfill failed for ${y} (${e.message}); will retry next run.`);
    }
    break; // at most one older year per run
  }

  const historyComplete = (() => {
    for (let y = accountYear; y < currentYear; y++) if (years[y] !== "complete") return false;
    return Boolean(years[currentYear]);
  })();

  return {
    source: "github-contribution-calendar",
    days,
    years,
    history_complete: historyComplete,
    fetched_at: new Date().toISOString(),
    notes,
  };
}

module.exports = { calendarUrl, parseCalendarHtml, fetchCalendarYear, collectCalendar };
