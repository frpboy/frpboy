"use strict";

/**
 * /api/health - service health for the profile statistics system and the
 * pre-existing contribution inventory watchdog. No secrets are reported.
 */

const { loadSnapshot } = require("../src/cache/snapshot");

const README_URL = "https://raw.githubusercontent.com/frpboy/frpboy/main/README.md";

module.exports = async function handler(req, res) {
  const now = Date.now();
  const checks = {};

  // Statistics snapshot state.
  const { snapshot, stale, source, error } = await loadSnapshot();
  checks.statistics_snapshot = snapshot
    ? {
        status: stale ? "degraded_serving_stale" : "healthy",
        generated_at: snapshot.generated_at,
        age_minutes: Math.round((now - Date.parse(snapshot.generated_at)) / 60000),
        source,
        history_complete: snapshot.completeness && snapshot.completeness.history_complete,
      }
    : { status: "never_initialized", error: error || null };

  // Existing contribution inventory: verify the README markers still update.
  try {
    const res = await fetch(README_URL, { headers: { "Cache-Control": "no-cache" } });
    if (!res.ok) throw new Error(`README HTTP ${res.status}`);
    const readme = await res.text();
    const match = readme.match(/SELECTED-CONTRIBUTIONS-REFRESH-DATE:START -->([^<]+)<!-- SELECTED-CONTRIBUTIONS-REFRESH-DATE:END/);
    const hasSection = readme.includes("<!-- EXTERNAL-CONTRIBUTIONS:START -->");
    checks.contribution_inventory = {
      status: match && hasSection ? "healthy" : "degraded",
      readme_snapshot_date: match ? match[1].trim() : null,
      external_contributions_section: hasSection ? "present" : "missing",
    };
  } catch (e) {
    checks.contribution_inventory = { status: "unknown", error: e.message };
  }

  const degraded = Object.values(checks).some((c) => c.status !== "healthy");
  return res.status(degraded ? 207 : 200).json({ ok: !degraded, checked_at: new Date(now).toISOString(), checks });
};
