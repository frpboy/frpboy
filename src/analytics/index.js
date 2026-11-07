"use strict";

/**
 * Pure analytics over a collected snapshot. No network access here.
 * All day math uses IST boundaries. Nothing here invents data: every number
 * traces to the snapshot, and incomplete coverage is surfaced as flags.
 */

const { istToday, addDays, daysBetween, dateRange, istDisplay } = require("../utils/time");

/** Validate a snapshot's minimum viable shape. */
function validateSnapshot(s) {
  if (!s || typeof s !== "object") return "snapshot is not an object";
  if (s.schema_version !== 1) return "unsupported schema_version";
  if (s.account !== "frpboy") return "unexpected account";
  if (!s.profile || typeof s.profile.followers !== "number") return "missing profile";
  if (!s.activity || typeof s.activity.days !== "object") return "missing activity days";
  if (!s.totals) return "missing totals";
  return null;
}

/** Current/longest streak over a day-count series. Today counts only if it has activity. Zero-count days are inactive. */
function computeStreak(days, now = new Date()) {
  const today = istToday(now);
  const dates = Object.keys(days).filter((d) => days[d] > 0).sort();
  if (dates.length === 0) return { current: 0, longest: 0, total_days: 0, total_contributions: 0, first_day: null, last_day: null };

  let total = 0;
  for (const d of dates) total += days[d];

  // Longest run over the whole series.
  let longest = 0;
  let runStart = dates[0];
  let bestStart = dates[0];
  let bestEnd = dates[0];
  let prev = dates[0];
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    if (daysBetween(prev, dates[i]) === 1) {
      run += 1;
    } else {
      if (run > longest) { longest = run; bestStart = runStart; bestEnd = prev; }
      run = 1;
      runStart = dates[i];
    }
    prev = dates[i];
  }
  if (run > longest) { longest = run; bestStart = runStart; bestEnd = prev; }

  // Current streak: consecutive active days ending today (or yesterday if today has none yet).
  let current = 0;
  let cursor = days[today] ? today : addDays(today, -1);
  while (days[cursor]) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return {
    current,
    longest,
    longest_range: { from: bestStart, to: bestEnd },
    total_days: dates.length,
    total_contributions: total,
    first_day: dates[0],
    last_day: dates[dates.length - 1],
  };
}

/** Language distribution from byte counts. Percentages are byte-based, never repo-count-based. */
function computeLanguages(languages) {
  if (!languages || !languages.bytes) return { available: false, items: [], total_bytes: 0 };
  const entries = Object.entries(languages.bytes).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  // Every detected language is listed; no top-N cutoff and no "Other" bucket.
  const items = entries.map(([name, bytes]) => ({
    name,
    bytes,
    percent: total > 0 ? Math.round((bytes / total) * 1000) / 10 : 0,
  }));
  return {
    available: total > 0,
    items,
    total_bytes: total,
    repos_covered: languages.repos_covered,
    repos_without_language: languages.repos_without_language,
  };
}

/** Productivity distribution in IST. Commit counts describe Git activity, not hours worked. */
function computeProductivity(p) {
  if (!p || !Array.isArray(p.by_hour)) return { available: false };
  const hourMax = Math.max(0, ...p.by_hour);
  const dayMax = Math.max(0, ...p.by_weekday);
  const bestHour = p.by_hour.indexOf(hourMax);
  const bestDay = p.by_weekday.indexOf(dayMax);
  const buckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  p.by_hour.forEach((n, h) => {
    if (h >= 5 && h < 12) buckets.morning += n;
    else if (h >= 12 && h < 17) buckets.afternoon += n;
    else if (h >= 17 && h < 22) buckets.evening += n;
    else buckets.night += n;
  });
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return {
    available: p.sample_commits > 0,
    by_hour: p.by_hour,
    by_weekday: p.by_weekday,
    best_hour: hourMax > 0 ? bestHour : null,
    best_weekday: dayMax > 0 ? DAY_NAMES[bestDay] : null,
    buckets,
    sample_commits: p.sample_commits,
    window: { from: p.window_from, to: p.window_to },
  };
}

/** Repository distribution by primary language (repo COUNTS, distinct from byte shares). */
function computeRepositories(repos) {
  if (!repos || !Array.isArray(repos.list)) return { available: false };
  const counts = {};
  let forks = 0;
  let archived = 0;
  for (const r of repos.list) {
    if (r.fork) forks += 1;
    if (r.archived) archived += 1;
    const lang = r.language || "No language";
    counts[lang] = (counts[lang] || 0) + 1;
  }
  // Every primary-language group is listed; no top-N cutoff.
  const items = Object.entries(counts).sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, percent: Math.round((count / repos.list.length) * 1000) / 10 }));
  const topStarred = [...repos.list].sort((a, b) => (b.stars || 0) - (a.stars || 0)).slice(0, 5)
    .map((r) => ({ name: r.name, stars: r.stars || 0, language: r.language }));
  return { available: true, total: repos.list.length, forks, archived, items, top_starred: topStarred };
}

/** Achievement milestones from verifiable snapshot numbers. No fake official badges. */
function computeAchievements(snapshot, streak) {
  const t = snapshot.totals;
  const out = [];
  const tier = (value, steps) => (value >= steps[2] ? 3 : value >= steps[1] ? 2 : value >= steps[0] ? 1 : 0);
  const defs = [
    { key: "repos", label: "Repository Builder", value: t.repos_public, steps: [10, 25, 50], unit: ["public repo", "public repos"] },
    { key: "stars", label: "Star Collector", value: t.stars_received || 0, steps: [10, 50, 100], unit: ["star received", "stars received"] },
    { key: "forks", label: "Fork Magnet", value: t.forks_received || 0, steps: [5, 25, 50], unit: ["fork received", "forks received"] },
    { key: "prs", label: "Pull Request Pilot", value: t.prs || 0, steps: [25, 75, 150], unit: ["public PR", "public PRs"] },
    { key: "merged", label: "Merge Machine", value: t.prs_merged || 0, steps: [10, 50, 100], unit: ["merged PR", "merged PRs"] },
    { key: "streak", label: "Consistency Streak", value: streak.longest, steps: [7, 30, 100], unit: ["day best streak", "day best streak"] },
    { key: "days", label: "Active Days", value: streak.total_days, steps: [100, 365, 1000], unit: ["active day", "active days"] },
    { key: "years", label: "Veteran", value: Math.floor(daysBetween(snapshot.profile.created_at.slice(0, 10), istToday()) / 365), steps: [1, 3, 5], unit: ["year on GitHub", "years on GitHub"] },
  ];
  const TIER_NAMES = ["Locked", "Bronze", "Silver", "Gold"];
  for (const d of defs) {
    const lvl = tier(d.value, d.steps);
    out.push({ label: d.label, tier: TIER_NAMES[lvl], tier_level: lvl, value: d.value, unit: d.value === 1 ? d.unit[0] : d.unit[1], next: lvl < 3 ? d.steps[lvl] : null });
  }
  return out;
}

/** Daily activity series for the wave graph; fills empty days with zero inside the window. */
function computeActivitySeries(days, windowDays = 90, now = new Date()) {
  const today = istToday(now);
  const from = addDays(today, -(windowDays - 1));
  const series = dateRange(from, today).map((d) => ({ date: d, count: days[d] || 0 }));
  const max = Math.max(1, ...series.map((p) => p.count));
  return { from, to: today, max, points: series };
}

function computeAll(snapshot, now = new Date()) {
  const err = validateSnapshot(snapshot);
  if (err) return { ok: false, error: err };
  // Two distinct day-count datasets, always kept separate:
  //  - calendar: GitHub's own contribution calendar (fetched anonymously).
  //    The same all-visible aggregate the profile graph shows; depending on
  //    the owner's GitHub settings it can include anonymized private
  //    contributions. Cards label it "all visible".
  //  - events: the collected public-events ledger. Public-only. Cards label
  //    it "public events". Also the source for hour/weekday productivity,
  //    which needs timestamps the calendar does not have.
  // They are different measures: presented side by side, never summed, and
  // never subtracted to infer a private-only figure.
  const calendarDays =
    snapshot.contributions && snapshot.contributions.days && Object.keys(snapshot.contributions.days).length > 0
      ? snapshot.contributions.days
      : null;
  const streakEvents = computeStreak(snapshot.activity.days, now);
  streakEvents.source = "events";
  const streakCalendar = calendarDays ? computeStreak(calendarDays, now) : null;
  if (streakCalendar) streakCalendar.source = "github-calendar";
  // Primary series: the all-visible calendar when available (GitHub parity),
  // otherwise the public events ledger.
  const streak = streakCalendar || streakEvents;
  streak.source = streakCalendar ? "github-calendar" : "events-fallback";
  return {
    ok: true,
    profile: snapshot.profile,
    totals: snapshot.totals,
    streak,
    streak_events: streakEvents,
    streak_all_visible: streakCalendar,
    languages: computeLanguages(snapshot.languages),
    productivity: computeProductivity(snapshot.productivity),
    repositories: computeRepositories(snapshot.repos),
    achievements: computeAchievements(snapshot, streak),
    activity: computeActivitySeries(streakCalendar ? calendarDays : snapshot.activity.days, 90, now),
    activity_events: computeActivitySeries(snapshot.activity.days, 90, now),
    meta: {
      generated_at: snapshot.generated_at,
      account: snapshot.account,
      timezone: snapshot.timezone,
      data_scope: snapshot.data_scope,
      completeness: snapshot.completeness,
      coverage: {
        contributions_source: streak.source,
        contributions_history_complete: snapshot.contributions ? snapshot.contributions.history_complete : null,
        // "contributions" (GitHub's calendar, all-visible aggregate) and
        // "commits/PRs/issues/events" (the public ledger) are different
        // measures from different sources; they are shown separately and are
        // never summed or subtracted.
        events_note: "commit/PR/issue counts come from the GitHub Search API over public data",
      },
    },
  };
}

module.exports = { validateSnapshot, computeStreak, computeLanguages, computeProductivity, computeRepositories, computeAchievements, computeActivitySeries, computeAll, istDisplay };
