"use strict";

/**
 * /api/stats-refresh - protected trigger for the profile-stats GitHub
 * workflow. Mirrors the existing /api/profile-refresh watchdog: Vercel cron
 * (or a manual call) authenticates with CRON_SECRET, and the function
 * dispatches the workflow with PROFILE_DISPATCH_TOKEN. Collection itself
 * runs in GitHub Actions; this endpoint never holds data or credentials.
 */

const OWNER = "frpboy";
const REPO = "frpboy";
const WORKFLOW = "profile-stats.yml";
const BRANCH = "main";
const DISPATCH_URL = `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/dispatches`;

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });
  const cronSecret = process.env.CRON_SECRET;
  const githubToken = process.env.PROFILE_DISPATCH_TOKEN;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  if (!githubToken) return res.status(503).json({ ok: false, error: "PROFILE_DISPATCH_TOKEN is not configured" });
  try {
    const dispatch = await fetch(DISPATCH_URL, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: BRANCH }),
    });
    if (dispatch.status !== 204) {
      throw new Error(`GitHub dispatch failed: HTTP ${dispatch.status} ${(await dispatch.text()).slice(0, 500)}`);
    }
    return res.status(202).json({ ok: true, action: "dispatched", workflow: WORKFLOW });
  } catch (error) {
    console.error("Stats refresh dispatch failed:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};
