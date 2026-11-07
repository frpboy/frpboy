"use strict";

/**
 * /api/cards/<name>.svg - self-hosted GitHub profile cards.
 * One serverless function (catch-all) keeps the deployment inside the Hobby
 * function budget; every card renders independently from the same snapshot.
 *
 * Guarantees: always returns image/svg+xml (never an HTML error page),
 * serves last-known-good data when refresh fails, and never fabricates stats.
 */

const { CARDS } = require("../../src/cards/generate");
const { THEMES } = require("../../src/cards/theme");
const { fallbackCard } = require("../../src/cards/svg");
const { computeAll } = require("../../src/analytics/index");
const { loadSnapshot } = require("../../src/cache/snapshot");
const { oneOf } = require("../../src/security/escape");

const CARD_HEADERS = {
  "Content-Type": "image/svg+xml; charset=utf-8",
  "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
};

module.exports = async function handler(req, res) {
  const segments = [].concat(req.query.path || []);
  const name = segments.join("/");

  if (name === "health") {
    const { snapshot, stale, source, error } = await loadSnapshot();
    const cards = {};
    if (snapshot) {
      const analytics = computeAll(snapshot);
      for (const key of Object.keys(CARDS)) {
        cards[key] = analytics.ok ? "ok" : "unavailable";
      }
    } else {
      for (const key of Object.keys(CARDS)) cards[key] = "no_snapshot";
    }
    return res.status(200).json({
      ok: Boolean(snapshot),
      cards,
      snapshot: snapshot
        ? { generated_at: snapshot.generated_at, stale, source, history_complete: snapshot.completeness && snapshot.completeness.history_complete }
        : { error: error || "no snapshot" },
    });
  }

  // Vercel may pass the catch-all segment with or without the .svg suffix;
  // accept both so /api/cards/streak and /api/cards/streak.svg resolve alike.
  const card = CARDS[name] || CARDS[name + ".svg"];
  if (!card) {
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    const theme = THEMES.dark;
    return res.status(404).send(fallbackCard(495, 120, theme, "Unknown card", "This card does not exist. Check the README for valid card URLs."));
  }

  const theme = THEMES[oneOf(req.query.theme, Object.keys(THEMES), "dark")];

  try {
    const { snapshot, stale, error } = await loadSnapshot();
    if (!snapshot) {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
      return res.status(200).send(fallbackCard(card.width, card.height, theme, card.name, error ? `Refresh pending (${String(error).slice(0, 80)})` : undefined));
    }
    const analytics = computeAll(snapshot);
    if (!analytics.ok) throw new Error(analytics.error);
    const svg = card.generate(analytics, snapshot, theme);
    for (const [k, v] of Object.entries(CARD_HEADERS)) res.setHeader(k, v);
    res.setHeader("X-Snapshot-Date", snapshot.generated_at || "unknown");
    if (stale) res.setHeader("X-Data-Stale", "true");
    return res.status(200).send(svg);
  } catch (error) {
    console.error(`card ${name} failed:`, error);
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(fallbackCard(card.width, card.height, theme, card.name, "Rendering failed safely; last-known-good will return after the next successful refresh."));
  }
};
