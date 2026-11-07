"use strict";

/**
 * HTTP-level tests for /api/cards/[...path].js.
 *
 * Regression coverage for the preview-deploy defect where the unknown-card
 * branch passed "image/svg+xml" as a header NAME (Node ERR_INVALID_HTTP_TOKEN
 * -> FUNCTION_INVOCATION_FAILED), and for Vercel's catch-all query shapes
 * (array vs string, with or without the .svg suffix).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const handler = require("../api/cards/[...path].js");
const { _resetCache } = require("../src/cache/snapshot");

// Same token rule Node enforces for header names; any violation throws here
// instead of slipping through a lenient mock.
const HEADER_NAME_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) {
      assert.ok(HEADER_NAME_RE.test(name), `invalid HTTP header name: ${JSON.stringify(name)}`);
      assert.ok(typeof value === "string" && value.length > 0, "header value must be a non-empty string");
      this.headers[name] = value;
      return this;
    },
    send(body) { this.body = String(body); return this; },
    end(body) { if (body !== undefined) this.body = String(body); return this; },
    json(obj) { this.body = JSON.stringify(obj); return this; },
  };
}

// Snapshot fetch always misses: the stats-data branch need not exist for the
// fallback paths under test.
const notFoundResponse = async () => ({
  ok: false,
  status: 404,
  statusText: "Not Found",
  headers: new Map(),
  async json() { throw new Error("not json"); },
  async text() { return "404: Not Found"; },
});

const realFetch = globalThis.fetch;
test.beforeEach(() => {
  _resetCache();
  globalThis.fetch = notFoundResponse;
});
test.after(() => {
  globalThis.fetch = realFetch;
});

test("array catch-all query shape serves the card SVG", async () => {
  const res = mockRes();
  await handler({ query: { path: ["streak.svg"] }, method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.headers["Content-Type"], /^image\/svg\+xml/);
  assert.ok(res.body.startsWith("<svg"), "SVG body");
  assert.ok(res.body.includes("Contribution Streak"), "fallback card keeps its title");
});

test("string catch-all query shape serves the card SVG", async () => {
  const res = mockRes();
  await handler({ query: { path: "streak.svg" }, method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.startsWith("<svg"), "SVG body");
});

test("extensionless card name resolves to the .svg card", async () => {
  const res = mockRes();
  await handler({ query: { path: ["streak"] }, method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.headers["Content-Type"], /^image\/svg\+xml/);
  assert.ok(res.body.includes("Contribution Streak"), "same card as streak.svg");
});

test("unknown card returns a 404 SVG fallback with only valid headers", async () => {
  const res = mockRes();
  await handler({ query: { path: ["does-not-exist"] }, method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 404);
  assert.match(res.headers["Content-Type"], /^image\/svg\+xml/);
  assert.ok(res.body.startsWith("<svg"), "fallback is SVG, never an HTML error page");
  assert.ok(res.body.includes("Unknown card"), "fallback names the problem");
});

test("cards health branch reports no_snapshot before the first refresh", async () => {
  const res = mockRes();
  await handler({ query: { path: ["health"] }, method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, false);
  assert.equal(body.cards["streak.svg"], "no_snapshot");
  assert.equal(Object.keys(body.cards).length, 9);
});
