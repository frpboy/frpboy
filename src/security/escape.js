"use strict";

/**
 * XML/SVG escaping for every dynamic value rendered into a card.
 * Anything not run through esc() must be a numeric literal we generated.
 */
function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Coerce to a finite number or return the fallback; protects SVG geometry from NaN/Injection. */
function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Allow-list check for enum-like values (themes, card names). */
function oneOf(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

module.exports = { esc, num, oneOf };
