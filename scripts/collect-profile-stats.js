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
  const snapshot = await collect(previous, { token, contributionCalendar: true });

  const invalid = validateSnapshot(snapshot);
  if (invalid) throw new Error(`Refusing to write invalid snapshot: ${invalid}`);

  // Never regress history: if the new snapshot lost days the old one had, keep the old one.
  if (previous && previous.activity && previous.activity.days) {
    const oldDays = Object.keys(previous.activity.days).length;
    const newDays = Object.keys(snapshot.activity.days).length;
    if (newDays < oldDays - 5) {
      console.warn(`New snapshot has ${newDays} active days vs previous ${oldDays}; merging old days in (no history loss).`);
      snapshot.activity.days = { ...snapshot.activity.days, ...previous.activity.days, ...snapshot.activity.days };
    }
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + "\n");
  const bytes = fs.statSync(SNAPSHOT_PATH).size;
  console.log(`Snapshot written: ${SNAPSHOT_PATH} (${bytes} bytes, ${Object.keys(snapshot.activity.days).length} active days, ${snapshot.totals.commits_collected} commits)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
