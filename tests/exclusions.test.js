"use strict";

/**
 * Private repository exclusions, FAIL CLOSED. Placeholder slugs only
 * ("frpboy/alpha", "example/placeholder-one"): real configured values live in
 * a secret and must never appear in code, docs, fixtures, tests, logs, or the
 * snapshot.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { collect } = require("../src/github/collect");
const {
  validateExclusionsConfig,
  makeExcluder,
  makeRedactor,
  assertSnapshotClean,
  usablePreviousSnapshot,
  MAX_SEARCH_QUERY_CHARS,
} = require("../src/github/exclusions");
const { makeFakeGitHub } = require("./fakegithub");

const OPTS = { token: "fake", paceMs: 0, now: new Date("2026-11-07T12:00:00Z") };
const EXCLUDE = ["frpboy/alpha"];

test("validateExclusionsConfig: empty detection, normalization, malformed counting", () => {
  assert.deepEqual(validateExclusionsConfig(""), { slugs: [], invalidCount: 0, empty: true });
  assert.equal(validateExclusionsConfig(null).empty, true);
  assert.equal(validateExclusionsConfig("   ").empty, true);
  assert.deepEqual(validateExclusionsConfig("frpboy/Alpha, frpboy/alpha  example/Placeholder-One").slugs, [
    "frpboy/alpha",
    "example/placeholder-one",
  ]);
  const bad = validateExclusionsConfig("no-slash, bad!, frpboy/alpha");
  assert.equal(bad.slugs.length, 1);
  assert.equal(bad.invalidCount, 2);
});

test("makeExcluder matches repos under the fixed account, case-insensitive", () => {
  const x = makeExcluder(["frpboy/ALPHA"], "frpboy");
  assert.equal(x.count, 1);
  assert.ok(x.isExcludedRepo("Alpha"));
  assert.ok(!x.isExcludedRepo("beta"));
  assert.ok(x.isExcludedSlug("frpboy/alpha"));
  assert.equal(x.queryFragment(), "+-repo:frpboy/alpha");
});

test("guardQueryLength fails closed over the limit without echoing the query", () => {
  const slugs = Array.from({ length: 20 }, (_, i) => `example/placeholder-slug-number-${i}`);
  const x = makeExcluder(slugs, "frpboy");
  const q = `author:frpboy+type:pr${x.queryFragment()}`;
  assert.ok(q.length > MAX_SEARCH_QUERY_CHARS);
  assert.throws(() => x.guardQueryLength(q), /length limit/);
  try {
    x.guardQueryLength(q);
  } catch (e) {
    assert.ok(!e.message.includes("placeholder-slug"), "error must not echo slugs");
  }
  // Under the limit it passes the query through unchanged.
  const short = makeExcluder(EXCLUDE, "frpboy");
  const ok = `author:frpboy+type:pr${short.queryFragment()}`;
  assert.equal(short.guardQueryLength(ok), ok);
});

test("makeRedactor strips full slug, bare name, and URL-encoded form", () => {
  const redact = makeRedactor(EXCLUDE);
  const out = redact("error for /search/commits?q=author:frpboy+-repo:frpboy%2Falpha and repo alpha failed");
  assert.ok(!out.toLowerCase().includes("alpha"));
  assert.equal(makeRedactor([])("unchanged"), "unchanged");
});

test("assertSnapshotClean fails closed on contaminated output with a generic message", () => {
  const dirty = { repos: { list: [{ name: "alpha" }] } };
  assert.throws(() => assertSnapshotClean(dirty, EXCLUDE), /refusing to publish/);
  try {
    assertSnapshotClean(dirty, EXCLUDE);
  } catch (e) {
    assert.ok(!e.message.toLowerCase().includes("alpha"));
  }
  assert.doesNotThrow(() => assertSnapshotClean({ repos: { list: [{ name: "beta" }] } }, EXCLUDE));
  assert.doesNotThrow(() => assertSnapshotClean(dirty, []));
});

test("collect drops an excluded repo from list, stars, and language bytes; marker set", async () => {
  const { fetchImpl } = makeFakeGitHub();
  const logs = [];
  const snap = await collect(null, {
    ...OPTS,
    fetchImpl,
    log: (m) => logs.push(String(m)),
    excludeRepos: EXCLUDE,
  });
  assert.equal(snap.exclusions_applied, true);
  assert.deepEqual(snap.repos.list.map((r) => r.name), ["beta"]);
  assert.equal(snap.totals.stars_received, 3);
  assert.deepEqual(snap.languages.bytes, { Python: 500 });
  assert.equal(snap.languages.repos_covered, 1);
  // The excluded name appears nowhere in the snapshot and nowhere in logs.
  assert.ok(!JSON.stringify(snap).toLowerCase().includes("alpha"));
  assert.ok(!logs.join("\n").toLowerCase().includes("alpha"));
  // Only the count is logged.
  assert.ok(logs.some((m) => m.includes("Repository exclusions configured: 1")));
  assert.ok(logs.some((m) => m.includes("1 excluded by configuration")));
});

test("every search query carries the -repo: qualifiers", async () => {
  const { fetchImpl } = makeFakeGitHub();
  const urls = [];
  const recording = async (url) => {
    urls.push(url);
    return fetchImpl(url);
  };
  await collect(null, { ...OPTS, fetchImpl: recording, log: () => {}, excludeRepos: ["frpboy/alpha", "example/placeholder-one"] });
  const searches = urls.filter((u) => new URL(u).pathname.startsWith("/search/"));
  assert.ok(searches.length >= 7, "commits + 6 issue/PR searches expected");
  for (const u of searches) {
    const q = new URL(u).searchParams.get("q");
    assert.ok(q.includes("-repo:frpboy/alpha"), `missing qualifier in ${q}`);
    assert.ok(q.includes("-repo:example/placeholder-one"), `missing qualifier in ${q}`);
  }
});

test("fail closed when the commits API returns an excluded repo (qualifiers ignored)", async () => {
  const { fetchImpl } = makeFakeGitHub({
    commits: [{ sha: "aaa", date: "2026-11-06T20:00:00Z", repo: "frpboy/alpha" }],
  });
  await assert.rejects(
    () => collect(null, { ...OPTS, fetchImpl, log: () => {}, excludeRepos: EXCLUDE }),
    (e) => {
      assert.match(e.message, /refusing to collect/);
      assert.ok(!e.message.toLowerCase().includes("alpha"), "error must not name the repo");
      return true;
    }
  );
});

test("fail closed when the issues API returns an excluded repo (qualifiers ignored)", async () => {
  const { fetchImpl } = makeFakeGitHub({
    prItems: [{ id: 11, created_at: "2026-11-05T08:00:00Z", repository_url: "https://api.github.com/repos/frpboy/alpha" }],
  });
  await assert.rejects(
    () => collect(null, { ...OPTS, fetchImpl, log: () => {}, excludeRepos: EXCLUDE }),
    (e) => {
      assert.match(e.message, /refusing to collect/);
      assert.ok(!e.message.toLowerCase().includes("alpha"), "error must not name the repo");
      return true;
    }
  );
});

test("previous snapshot without the marker is discarded; events rebuild fresh", async () => {
  const { fetchImpl } = makeFakeGitHub();
  // Previous collected WITHOUT exclusions: marker false.
  const previous = await collect(null, { ...OPTS, fetchImpl, log: () => {} });
  assert.equal(previous.exclusions_applied, false);
  previous.events.push({ type: "commit", id: "commit:zzz", date: "1999-01-01T00:00:00Z" });
  const logs = [];
  const snap = await collect(previous, { ...OPTS, fetchImpl, log: (m) => logs.push(String(m)), excludeRepos: EXCLUDE });
  assert.equal(snap.exclusions_applied, true);
  assert.equal(snap.activity.days["1999-01-01"], undefined, "unattributable history must be dropped");
  assert.ok(logs.some((m) => m.includes("rebuilding the events ledger")));
});

test("previous snapshot with the marker keeps its filtered history", async () => {
  const { fetchImpl } = makeFakeGitHub();
  const previous = await collect(null, { ...OPTS, fetchImpl, log: () => {}, excludeRepos: EXCLUDE });
  assert.equal(previous.exclusions_applied, true);
  previous.events.push({ type: "commit", id: "commit:zzz", date: "1999-01-01T00:00:00Z" });
  const snap = await collect(previous, { ...OPTS, fetchImpl, log: () => {}, excludeRepos: EXCLUDE });
  assert.equal(snap.activity.days["1999-01-01"], 1, "filtered history is retained");
});

test("exclusions force a fresh repos/languages collection even inside the 12h cache window", async () => {
  const { fetchImpl } = makeFakeGitHub();
  const previous = await collect(null, { ...OPTS, fetchImpl, log: () => {}, excludeRepos: EXCLUDE });
  previous.repos_collected_at = new Date().toISOString(); // inside the freshness window
  const urls = [];
  const recording = async (url) => {
    urls.push(url);
    return fetchImpl(url);
  };
  const snap = await collect(previous, { ...OPTS, fetchImpl: recording, log: () => {}, excludeRepos: EXCLUDE });
  const langFetches = urls.filter((u) => new URL(u).pathname.endsWith("/languages"));
  assert.ok(langFetches.length > 0, "languages must be re-collected, never served from a possibly contaminated cache");
  assert.deepEqual(snap.repos.list.map((r) => r.name), ["beta"]);
});

test("client errors redact exclusion slugs from query-bearing paths", async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 422,
    headers: { get: () => null },
    text: async () => "Validation Failed for query author:frpboy -repo:frpboy/alpha",
  });
  await assert.rejects(
    () => collect(null, { ...OPTS, fetchImpl, log: () => {}, excludeRepos: EXCLUDE }),
    (e) => {
      assert.ok(!e.message.toLowerCase().includes("alpha"), `leaked slug in: ${e.message}`);
      assert.ok(e.message.includes("[excluded]"));
      return true;
    }
  );
});

test("usablePreviousSnapshot enforces the transition and rebuild policy", () => {
  const filtered = { exclusions_applied: true };
  const legacy = { exclusions_applied: false };
  const bare = {};
  // Forced rebuild (config fingerprint changed/unrecorded) discards even a filtered previous.
  assert.equal(usablePreviousSnapshot(filtered, { exclusionsConfigured: true, forceRebuild: true }), null);
  // A pre-exclusions previous is never reused while exclusions are configured.
  assert.equal(usablePreviousSnapshot(legacy, { exclusionsConfigured: true, forceRebuild: false }), null);
  assert.equal(usablePreviousSnapshot(bare, { exclusionsConfigured: true, forceRebuild: false }), null);
  // A filtered previous is reused when the configuration is unchanged.
  assert.equal(usablePreviousSnapshot(filtered, { exclusionsConfigured: true, forceRebuild: false }), filtered);
  // Without exclusions the previous is used as-is.
  assert.equal(usablePreviousSnapshot(bare, { exclusionsConfigured: false, forceRebuild: false }), bare);
  assert.equal(usablePreviousSnapshot(null, { exclusionsConfigured: true, forceRebuild: false }), null);
});

test("no exclusions configured: marker false, behavior unchanged", async () => {
  const { fetchImpl } = makeFakeGitHub();
  const snap = await collect(null, { ...OPTS, fetchImpl, log: () => {}, excludeRepos: [] });
  assert.equal(snap.exclusions_applied, false);
  assert.equal(snap.repos.list.length, 2);
  assert.deepEqual(snap.languages.bytes, { TypeScript: 1000, Python: 500 });
});
