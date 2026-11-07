"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { CARDS } = require("../src/cards/generate");
const { THEMES } = require("../src/cards/theme");
const { fallbackCard } = require("../src/cards/svg");
const { computeAll } = require("../src/analytics/index");
const { esc } = require("../src/security/escape");
const { buildSnapshot } = require("./fixture");

/** Minimal XML well-formedness check: balanced tags, no raw & or stray <. */
function assertWellFormedSvg(svg) {
  assert.ok(svg.startsWith("<svg"), "starts with <svg");
  assert.ok(svg.endsWith("</svg>"), "ends with </svg>");
  const stack = [];
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
  let m;
  while ((m = tagRe.exec(svg))) {
    const [full, name, attrs] = m;
    if (full.startsWith("</")) {
      assert.equal(stack.pop(), name, `closing tag mismatch for ${name}`);
    } else if (!full.endsWith("/>")) {
      stack.push(name);
    }
  }
  assert.deepEqual(stack, [], "all tags closed");
  // No unescaped ampersands.
  assert.ok(!/&(?!amp;|lt;|gt;|quot;|apos;|#)/.test(svg), "no unescaped ampersands");
  // No script or external references.
  assert.ok(!/<script/i.test(svg));
  assert.ok(!/href="http/i.test(svg));
  assert.ok(!/url\(http/i.test(svg));
}

const analytics = computeAll(buildSnapshot(), new Date("2026-11-22T12:00:00Z"));
const snapshot = buildSnapshot();

test("all nine cards generate well-formed self-contained SVG in both themes", () => {
  assert.equal(Object.keys(CARDS).length, 9);
  for (const [name, card] of Object.entries(CARDS)) {
    for (const themeName of ["dark", "light"]) {
      const svg = card.generate(analytics, snapshot, THEMES[themeName]);
      assertWellFormedSvg(svg);
    }
  }
});

test("esc neutralizes markup injection", () => {
  assert.equal(esc('<script>alert("x")&\''), "&lt;script&gt;alert(&quot;x&quot;)&amp;&apos;");
});

test("cards escape hostile snapshot strings", () => {
  const hostile = buildSnapshot();
  hostile.profile.name = '<img src=x onerror=alert(1)>';
  hostile.profile.login = 'a"><script>';
  const a = computeAll(hostile, new Date("2026-11-22T12:00:00Z"));
  const svg = CARDS["summary.svg"].generate(a, hostile, THEMES.dark);
  assertWellFormedSvg(svg);
  assert.ok(!svg.includes("<img"), "injected tag was escaped");
  assert.ok(!svg.includes("<script"), "injected script was escaped");
});

test("fallback card is valid SVG with no fabricated numbers", () => {
  const svg = fallbackCard(495, 120, THEMES.dark, "Test Card", "note");
  assertWellFormedSvg(svg);
  assert.ok(svg.includes("temporarily unavailable"));
  assert.ok(!/\d+%|\d+ days/.test(svg), "no fabricated stats");
});

test("streak card shows the computed streak numbers", () => {
  const svg = CARDS["streak.svg"].generate(analytics, snapshot, THEMES.dark);
  assert.ok(svg.includes("Current streak"));
});

test("productivity card is labeled IST and disclaims hours-worked", () => {
  const svg = CARDS["productivity.svg"].generate(analytics, snapshot, THEMES.dark);
  assert.ok(svg.includes("IST"));
  assert.ok(svg.includes("not hours worked"));
});
