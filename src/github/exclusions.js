"use strict";

/**
 * Private repository exclusion list, FAIL CLOSED everywhere.
 *
 * Configured slugs arrive via the PROFILE_EXCLUDE_REPOS environment variable
 * (bound from an Actions secret in CI) and are treated as opaque values: they
 * are never written to the snapshot, logs, cards, docs, fixtures, or tests,
 * and error messages are redacted before they can carry one. All code and
 * documentation describe this capability generically.
 *
 * Fail-closed rules enforced here and at the entry point:
 * - missing/empty/malformed configuration aborts the run (no silent
 *   "no exclusions" fallback);
 * - a search query that would exceed GitHub's length limit aborts the run
 *   (GitHub answers over-long queries with 422 "Validation failed", never
 *   silent truncation, but we guard before the request is even made);
 * - any search result item attributable to an excluded repo aborts the run
 *   (catches the API ignoring -repo: qualifiers);
 * - the finished snapshot is scanned for excluded names before publish.
 */

const MAX_SEARCH_QUERY_CHARS = 256; // docs.github.com search limitations; over-limit gets 422, never truncation

/** Parse and validate the raw config string. Never echoes values back. */
function validateExclusionsConfig(raw) {
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return { slugs: [], invalidCount: 0, empty: true };
  }
  const slugs = [];
  let invalidCount = 0;
  for (const part of raw.split(/[\s,]+/)) {
    const slug = part.trim().toLowerCase();
    if (!slug) continue;
    if (/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/.test(slug)) slugs.push(slug);
    else invalidCount += 1;
  }
  return { slugs: [...new Set(slugs)], invalidCount, empty: false };
}

/**
 * Build the exclusion helpers for one collection run. Repos are matched
 * against the fixed account as `<account>/<name>` (case-insensitive).
 */
function makeExcluder(slugs, account) {
  const set = new Set((slugs || []).map((s) => String(s).toLowerCase()));
  const acct = String(account || "").toLowerCase();
  const excluder = {
    count: set.size,
    isExcludedRepo(repoName) {
      return set.has(`${acct}/${String(repoName).toLowerCase()}`);
    },
    isExcludedSlug(fullName) {
      return set.has(String(fullName || "").toLowerCase());
    },
    /** Search API qualifier fragment: `+-repo:owner/name` per exclusion. */
    queryFragment() {
      return [...set].map((s) => `+-repo:${s}`).join("");
    },
    /**
     * Fail closed before a query leaves the process if it could exceed
     * GitHub's length limit. Counts the full decoded query conservatively.
     * The error message never carries the query itself.
     */
    guardQueryLength(decodedQuery) {
      if (decodedQuery.length > MAX_SEARCH_QUERY_CHARS) {
        throw new Error(
          "Search query with exclusions would exceed GitHub's length limit; refusing to collect unfiltered."
        );
      }
      return decodedQuery;
    },
  };
  return excluder;
}

/**
 * Build a redactor that strips every configured slug (full owner/name, its
 * URL-encoded form, and the bare repo name) from arbitrary text. Applied to
 * error messages before they can reach public Actions logs: GitHub masks the
 * whole secret value, but NOT individual slugs embedded in a query string.
 */
function makeRedactor(slugs) {
  const terms = [];
  for (const s of slugs || []) {
    const slug = String(s).toLowerCase();
    const bare = slug.split("/")[1];
    terms.push(encodeURIComponent(slug), slug, bare);
  }
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = terms.length
    ? new RegExp(terms.filter(Boolean).map(esc).join("|"), "gi")
    : null;
  return (text) => (pattern ? String(text).replace(pattern, "[excluded]") : String(text));
}

/**
 * Fail closed if the finished snapshot contains any excluded name, full slug
 * or URL-encoded form. Runs before publish; the error message is generic.
 */
function assertSnapshotClean(snapshot, slugs) {
  if (!slugs || slugs.length === 0) return;
  const redact = makeRedactor(slugs);
  const hay = JSON.stringify(snapshot);
  const redacted = redact(hay);
  if (redacted !== hay) {
    throw new Error("Snapshot contains excluded content; refusing to publish.");
  }
}

/**
 * Decide whether a loaded previous snapshot may seed the next run.
 * Returns null (fresh rebuild) when: a rebuild is forced (the exclusion
 * configuration fingerprint changed or is unrecorded), or exclusions are
 * configured but the previous snapshot predates them (its events ledger has
 * no per-repo attribution and cannot be cleaned after the fact).
 */
function usablePreviousSnapshot(previous, { exclusionsConfigured, forceRebuild }) {
  if (!previous) return null;
  if (exclusionsConfigured && forceRebuild) return null;
  if (exclusionsConfigured && !previous.exclusions_applied) return null;
  return previous;
}

module.exports = { validateExclusionsConfig, makeExcluder, makeRedactor, assertSnapshotClean, usablePreviousSnapshot, MAX_SEARCH_QUERY_CHARS };
