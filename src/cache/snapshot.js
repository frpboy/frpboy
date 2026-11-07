"use strict";

/**
 * Runtime snapshot loader for the Vercel functions.
 *
 * Source of truth: data/profile-stats.json on the `stats-data` branch, read
 * through raw.githubusercontent.com (public repo, no credential needed).
 * Vercel deployments are skipped for data-only pushes (vercel.json
 * ignoreCommand), so raw reads are how cards stay fresh without redeploys.
 *
 * Fallback order per warm instance:
 *   1. fresh in-memory snapshot (< TTL)
 *   2. freshly fetched raw snapshot (validated)
 *   3. last good in-memory snapshot (stale, flagged)
 *   4. none -> caller renders the neutral "temporarily unavailable" card
 */

const { validateSnapshot } = require("../analytics/index");

const RAW_URL = "https://raw.githubusercontent.com/frpboy/frpboy/stats-data/data/profile-stats.json";
const TTL_MS = 5 * 60 * 1000;

let cached = null; // { snapshot, fetched_at }

async function loadSnapshot({ fetchImpl = fetch, now = Date.now(), force = false } = {}) {
  if (cached && !force && now - cached.fetched_at < TTL_MS) {
    return { snapshot: cached.snapshot, stale: false, age_ms: now - cached.fetched_at, source: "memory" };
  }
  try {
    const res = await fetchImpl(RAW_URL, { headers: { "Cache-Control": "no-cache", "User-Agent": "frpboy-profile-stats" } });
    if (!res.ok) throw new Error(`raw snapshot HTTP ${res.status}`);
    const snapshot = await res.json();
    const invalid = validateSnapshot(snapshot);
    if (invalid) throw new Error(`snapshot failed validation: ${invalid}`);
    cached = { snapshot, fetched_at: now };
    return { snapshot, stale: false, age_ms: 0, source: "raw" };
  } catch (error) {
    if (cached) {
      return { snapshot: cached.snapshot, stale: true, age_ms: now - cached.fetched_at, source: "memory-stale", error: error.message };
    }
    return { snapshot: null, stale: false, age_ms: null, source: "none", error: error.message };
  }
}

/** Test hook: reset the in-memory cache. */
function _resetCache() {
  cached = null;
}

module.exports = { loadSnapshot, _resetCache, RAW_URL, TTL_MS };
