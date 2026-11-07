"use strict";

/**
 * Routing regression tests: the deployed Vercel runtime (Node.js 26.x preview)
 * was observed NOT to populate req.query.path for catch-all functions - every
 * /api/cards/<name> request resolved to the unknown-card fallback. The name
 * must be recovered from the original request URL, with req.query.path kept
 * for the internally-rewritten shape and direct (test/local) invocation.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const cardsHandler = require("../api/cards/[...path].js");
const githubHandler = require("../api/github/[...path].js");
const { routeName } = require("../src/http/route-name");
const { _resetCache } = require("../src/cache/snapshot");
const { buildSnapshot } = require("./fixture");

const HEADER_NAME_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) {
      assert.ok(HEADER_NAME_RE.test(name), `invalid HTTP header name: ${JSON.stringify(name)}`);
      this.headers[name] = value;
      return this;
    },
    send(body) { this.body = String(body); return this; },
    end(body) { if (body !== undefined) this.body = String(body); return this; },
    json(obj) { this.body = JSON.stringify(obj); return this; },
  };
}

const notFoundResponse = async () => ({
  ok: false,
  status: 404,
  statusText: "Not Found",
  headers: new Map(),
  async json() { throw new Error("not json"); },
  async text() { return "404: Not Found"; },
});

const realFetch = globalThis.fetch;
test.after(() => {
  globalThis.fetch = realFetch;
});

// The observed preview case: no query.path at all, name only in req.url.
test("url-carried card name resolves without req.query.path", async () => {
  _resetCache();
  globalThis.fetch = notFoundResponse;
  const res = mockRes();
  await cardsHandler({ url: "/api/cards/streak.svg", query: {}, method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.headers["Content-Type"], /^image\/svg\+xml/);
  assert.ok(res.body.includes("Contribution Streak"), "streak card, not the unknown fallback");
});

test("url-carried health branch resolves without req.query.path", async () => {
  _resetCache();
  globalThis.fetch = notFoundResponse;
  const res = mockRes();
  await cardsHandler({ url: "/api/cards/health", query: {}, method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.cards["streak.svg"], "no_snapshot");
});

test("internally-rewritten shape falls back to req.query.path", async () => {
  _resetCache();
  globalThis.fetch = notFoundResponse;
  const res = mockRes();
  await cardsHandler(
    { url: "/api/cards/[...path]?path=streak.svg", query: { path: ["streak.svg"] }, method: "GET", headers: {} },
    res
  );
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.includes("Contribution Streak"));
});

test("url query string is stripped from the route name", async () => {
  _resetCache();
  globalThis.fetch = notFoundResponse;
  const res = mockRes();
  await cardsHandler({ url: "/api/cards/streak.svg?theme=dark", query: { theme: "dark" }, method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.includes("Contribution Streak"));
});

test("percent-encoded and malformed names cannot escape the card registry", async () => {
  _resetCache();
  globalThis.fetch = notFoundResponse;
  for (const url of ["/api/cards/stats%2Esvg", "/api/cards/%E0%A4%A", "/api/cards/..%2F..%2Fhealth"]) {
    const res = mockRes();
    await cardsHandler({ url, query: {}, method: "GET", headers: {} }, res);
    assert.match(res.headers["Content-Type"], /^image\/svg\+xml/, `${url} always SVG`);
    if (url.endsWith("%2Esvg")) assert.equal(res.statusCode, 200, "encoded stats.svg resolves");
    else assert.equal(res.statusCode, 404, `${url} stays unknown`);
  }
});

test("multi-segment card paths return the SVG unknown fallback", async () => {
  _resetCache();
  globalThis.fetch = notFoundResponse;
  const res = mockRes();
  await cardsHandler({ url: "/api/cards/a/b", query: {}, method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 404);
  assert.match(res.headers["Content-Type"], /^image\/svg\+xml/);
  assert.ok(res.body.includes("Unknown card"));
});

test("github JSON dataset resolves from req.url without req.query.path", async () => {
  _resetCache();
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: new Map(),
    async json() { return buildSnapshot(); },
    async text() { return JSON.stringify(buildSnapshot()); },
  });
  const res = mockRes();
  await githubHandler({ url: "/api/github/profile", query: {}, method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.data.login, "frpboy");
});

test("github multi-segment name reaches the unknown-dataset branch", async () => {
  _resetCache();
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: new Map(),
    async json() { return buildSnapshot(); },
    async text() { return JSON.stringify(buildSnapshot()); },
  });
  const res = mockRes();
  await githubHandler({ url: "/api/github/a/b", query: {}, method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 404);
  const body = JSON.parse(res.body);
  assert.equal(body.error, "Unknown dataset: a/b");
});

test("routeName unit edges", () => {
  assert.equal(routeName({ url: "/api/cards/streak.svg", query: {} }, "/api/cards/"), "streak.svg");
  assert.equal(routeName({ url: "/api/cards/", query: { path: ["streak.svg"] } }, "/api/cards/"), "streak.svg");
  assert.equal(routeName({ url: "/api/cards/[...path]?path=x", query: { path: ["x"] } }, "/api/cards/"), "x");
  assert.equal(routeName({ query: { path: "streak.svg" } }, "/api/cards/"), "streak.svg");
  assert.equal(routeName({ query: {} }, "/api/cards/"), "");
  assert.equal(routeName({ url: "/api/github/a/b/", query: {} }, "/api/github/"), "a/b");
});
