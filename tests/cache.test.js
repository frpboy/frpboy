"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadSnapshot, _resetCache } = require("../src/cache/snapshot");
const { buildSnapshot } = require("./fixture");

function fakeFetchOk(snapshot, delayMs = 0) {
  return async () => ({ ok: true, json: async () => JSON.parse(JSON.stringify(snapshot)) });
}
function fakeFetchFail() {
  return async () => ({ ok: false, status: 500 });
}

test("fresh fetch is cached for the TTL window", async () => {
  _resetCache();
  let calls = 0;
  const f = async () => { calls += 1; return { ok: true, json: async () => buildSnapshot() }; };
  const t0 = 1000000;
  const r1 = await loadSnapshot({ fetchImpl: f, now: t0 });
  const r2 = await loadSnapshot({ fetchImpl: f, now: t0 + 60000 });
  assert.equal(r1.source, "raw");
  assert.equal(r2.source, "memory");
  assert.equal(calls, 1);
});

test("failed refresh serves last-known-good and flags stale", async () => {
  _resetCache();
  const t0 = 1000000;
  await loadSnapshot({ fetchImpl: fakeFetchOk(buildSnapshot()), now: t0 });
  const r = await loadSnapshot({ fetchImpl: fakeFetchFail(), now: t0 + 10 * 60 * 1000 });
  assert.equal(r.source, "memory-stale");
  assert.equal(r.stale, true);
  assert.ok(r.snapshot, "still has a snapshot");
});

test("no snapshot and failed fetch returns none, never fabricated data", async () => {
  _resetCache();
  const r = await loadSnapshot({ fetchImpl: fakeFetchFail(), now: 1000000 });
  assert.equal(r.snapshot, null);
  assert.equal(r.source, "none");
});

test("invalid snapshot body is rejected and stale cache kept", async () => {
  _resetCache();
  const t0 = 1000000;
  await loadSnapshot({ fetchImpl: fakeFetchOk(buildSnapshot()), now: t0 });
  const badFetch = async () => ({ ok: true, json: async () => ({ schema_version: 99, junk: true }) });
  const r = await loadSnapshot({ fetchImpl: badFetch, now: t0 + 10 * 60 * 1000 });
  assert.equal(r.stale, true);
  assert.equal(r.snapshot.schema_version, 1, "old valid snapshot retained");
});
