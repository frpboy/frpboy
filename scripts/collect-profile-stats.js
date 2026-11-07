"use strict";

/**
 * GitHub Actions entry point: collect the public profile statistics snapshot
 * and write data/profile-stats.json (plus a trimmed copy of the event ledger
 * inside it). Git commit/push is handled by the workflow shell steps, which
 * push to the `stats-data` branch only when the content actually changed.
 */

const fs = require("fs");
const path = require("path");
const { collect } = require("../src/github/collect");
const { validateExclusionsConfig, makeRedactor, assertSnapshotClean, usablePreviousSnapshot } = require("../src/github/exclusions");
const { validateSnapshot } = require("../src/analytics/index");

const DATA_DIR = path.join(process.cwd(), "data");
const SNAPSHOT_PATH = path.join(DATA_DIR, "profile-stats.json");
const RAW_SNAPSHOT_URL = "https://raw.githubusercontent.com/frpboy/frpboy/stats-data/data/profile-stats.json";

async function loadPrevious() {
  if (fs.existsSync(SNAPSHOT_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
    } catch (e) {
      console.warn("Local snapshot unreadable, falling back to raw fetch:", e.message);
    }
  }
  try {
    const res = await fetch(RAW_SNAPSHOT_URL, { headers: { "Cache-Control": "no-cache" } });
    if (res.ok) return await res.json();
    console.log(`No previous snapshot yet (HTTP ${res.status}); starting fresh`);
  } catch (e) {
    console.warn("Previous snapshot fetch failed; starting fresh:", e.message);
  }
  return null;
}

async function main() {
  const token = process.env.PROFILE_ACTIVITY_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new Error("No GitHub token available (expected GITHUB_TOKEN in Actions)");

  const previous = await loadPrevious();
  // contributionCalendar: GitHub's own per-day contribution calendar, fetched
  // anonymously. It is the SAME all-visible aggregate the profile graph shows
  // (it can include anonymized private contributions) and is always labeled
  // that way on cards; the events ledger stays the public-only dataset. The
  // two are presented separately and never summed or subtracted.
  //
  // PROFILE_EXCLUDE_REPOS: REQUIRED comma-separated owner/repo slugs bound
  // from an Actions secret. Excluded repos are filtered out of the repo list,
  // language bytes, and every search query before anything is aggregated.
  // The values are treated as opaque: only the COUNT is ever logged, never
  // the slugs themselves, and nothing about the configuration reaches the
  // snapshot.
  //
  // FAIL CLOSED: missing, empty, or malformed configuration aborts the run
  // before any collection - publishing unfiltered statistics is worse than
  // publishing none. Error text is redacted before printing so individual
  // slugs (which GitHub's secret masking does NOT cover inside query
  // strings) can never reach public Actions logs.
  const cfg = validateExclusionsConfig(process.env.PROFILE_EXCLUDE_REPOS);
  if (cfg.empty || cfg.slugs.length === 0) {
    throw new Error("PROFILE_EXCLUDE_REPOS is required (at least one owner/repo slug); refusing to collect unfiltered.");
  }
  if (cfg.invalidCount > 0) {
    throw new Error(`PROFILE_EXCLUDE_REPOS has ${cfg.invalidCount} malformed entr${cfg.invalidCount === 1 ? "y" : "ies"}; refusing to collect.`);
  }
  const excludeRepos = cfg.slugs;
  // A snapshot built without exclusions (or before the current exclusion
  // configuration) can contain excluded activity with its attribution
  // already stripped; never merge from it. The workflow sets
  // PROFILE_FORCE_REBUILD=1 when the private configuration fingerprint
  // changes or is unrecorded.
  const forceRebuild = process.env.PROFILE_FORCE_REBUILD === "1";
  const usablePrevious = usablePreviousSnapshot(previous, { exclusionsConfigured: true, forceRebuild });
  if (previous && !usablePrevious) {
    console.log(`Starting fresh (no history merge): ${forceRebuild ? "exclusion configuration changed or unrecorded" : "previous snapshot predates exclusion configuration"}`);
  }
  const snapshot = await collect(usablePrevious, { token, contributionCalendar: true, excludeRepos });
  // Last line of defense: the published snapshot must not contain any
  // excluded name anywhere.
  assertSnapshotClean(snapshot, excludeRepos);

  const invalid = validateSnapshot(snapshot);
  if (invalid) throw new Error(`Refusing to write invalid snapshot: ${invalid}`);

  // Never regress history: if the new snapshot lost days the old one had, keep the old one.
  // Only merges from a snapshot that was itself built with exclusions.
  if (usablePrevious && usablePrevious.activity && usablePrevious.activity.days) {
    const oldDays = Object.keys(usablePrevious.activity.days).length;
    const newDays = Object.keys(snapshot.activity.days).length;
    if (newDays < oldDays - 5) {
      console.warn(`New snapshot has ${newDays} active days vs previous ${oldDays}; merging old days in (no history loss).`);
      snapshot.activity.days = { ...snapshot.activity.days, ...usablePrevious.activity.days, ...snapshot.activity.days };
      assertSnapshotClean(snapshot, excludeRepos);
    }
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + "\n");
  const bytes = fs.statSync(SNAPSHOT_PATH).size;
  console.log(`Snapshot written: ${SNAPSHOT_PATH} (${bytes} bytes, ${Object.keys(snapshot.activity.days).length} active days, ${snapshot.totals.commits_collected} commits)`);
}

main().catch((e) => {
  // Redact before printing: errors can embed search query strings, and
  // GitHub masks only the whole secret value, not individual slugs.
  const redact = makeRedactor(validateExclusionsConfig(process.env.PROFILE_EXCLUDE_REPOS).slugs);
  console.error(redact(String((e && e.stack) || e)));
  process.exit(1);
});
