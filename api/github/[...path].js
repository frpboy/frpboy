"use strict";

/**
 * /api/github/<dataset> - JSON views over the same snapshot the cards use.
 * Consistent envelope: { ok, data, meta }. No private data exists in the
 * snapshot, so nothing private can leak here.
 */

const { computeAll } = require("../../src/analytics/index");
const { loadSnapshot } = require("../../src/cache/snapshot");
const { routeName } = require("../../src/http/route-name");

module.exports = async function handler(req, res) {
  const name = routeName(req, "/api/github/");
  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");

  const { snapshot, stale, source, error } = await loadSnapshot();
  if (!snapshot) {
    return res.status(503).json({ ok: false, error: "No successful snapshot yet", detail: error || null });
  }
  const analytics = computeAll(snapshot);
  if (!analytics.ok) return res.status(500).json({ ok: false, error: analytics.error });

  const meta = { ...analytics.meta, stale, source };

  switch (name) {
    case "profile":
      return res.status(200).json({ ok: true, data: analytics.profile, meta });
    case "stats":
      return res.status(200).json({ ok: true, data: analytics.totals, meta });
    case "repositories":
      return res.status(200).json({ ok: true, data: analytics.repositories, meta });
    case "languages":
      return res.status(200).json({ ok: true, data: analytics.languages, meta });
    case "contributions":
    case "streak":
      return res.status(200).json({ ok: true, data: analytics.streak, meta });
    case "productivity":
      return res.status(200).json({ ok: true, data: analytics.productivity, meta });
    case "activity":
      return res.status(200).json({ ok: true, data: analytics.activity, meta });
    case "health":
      return res.status(200).json({
        ok: true,
        data: {
          snapshot_generated_at: snapshot.generated_at,
          stale,
          source,
          history_complete: snapshot.completeness && snapshot.completeness.history_complete,
          notes: snapshot.completeness ? snapshot.completeness.notes : [],
        },
        meta,
      });
    default:
      return res.status(404).json({ ok: false, error: `Unknown dataset: ${name}`, datasets: ["profile", "stats", "repositories", "languages", "contributions", "streak", "productivity", "activity", "health"] });
  }
};
