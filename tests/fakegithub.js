"use strict";

/** Shared in-memory GitHub fake: REST/search API plus the public contributions page. */

function calendarHtml(year, counts = {}) {
  const dates = [];
  for (let d = new Date(Date.UTC(year, 0, 1)); d.getUTCFullYear() === year; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  let out = '<div class="js-yearly-contributions"><table>';
  const tips = [];
  dates.forEach((date, i) => {
    const id = `contribution-day-component-${i}-1`;
    out += `<td data-ix="1" style="width: 10px" data-date="${date}" id="${id}" data-level="0" role="gridcell" data-view-component="true" class="ContributionCalendar-day"></td>`;
    const n = counts[date] || 0;
    tips.push(`<tool-tip id="tooltip-${i}" for="${id}" popover="manual">${n === 0 ? "No contributions" : `${n} contribution${n === 1 ? "" : "s"}`} on ${date}.</tool-tip>`);
  });
  return out + "</table>" + tips.join("\n") + "</div>";
}

function makeFakeGitHub(overrides = {}) {
  const state = {
    commits: overrides.commits || [
      { sha: "aaa", date: "2026-11-06T20:00:00Z" }, // IST: 2026-11-07 01:30
      { sha: "bbb", date: "2026-11-07T10:00:00Z" }, // IST: 2026-11-07 15:30
      { sha: "bbb", date: "2026-11-07T10:00:00Z" }, // duplicate (same sha)
      { sha: "ccc", date: "2026-10-15T04:00:00Z" }, // IST: 2026-10-15 09:30
    ],
    repos: overrides.repos || [
      { name: "alpha", fork: false, archived: false, language: "TypeScript", stargazers_count: 5, forks_count: 2, pushed_at: "2026-11-01T00:00:00Z" },
      { name: "beta", fork: false, archived: false, language: "Python", stargazers_count: 3, forks_count: 1, pushed_at: "2026-10-01T00:00:00Z" },
    ],
    calendar: overrides.calendar || { "2026-11-05": 3, "2026-11-06": 1, "2026-11-07": 2 },
    prItems: overrides.prItems || null,
    issueItems: overrides.issueItems || null,
  };
  const headers = new Map();
  const fetchImpl = async (url) => {
    const u = new URL(url);
    const json = (data) => ({ ok: true, status: 200, headers: { get: (k) => headers.get(k) || null }, json: async () => data, text: async () => JSON.stringify(data) });
    if (u.hostname === "github.com" && u.pathname === "/users/frpboy/contributions") {
      const year = Number((u.searchParams.get("from") || "2026").slice(0, 4));
      const counts = {};
      for (const [d, n] of Object.entries(state.calendar)) {
        if (d.startsWith(String(year))) counts[d] = n;
      }
      return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({}), text: async () => calendarHtml(year, counts) };
    }
    if (u.pathname === "/users/frpboy") {
      return json({ login: "frpboy", name: "Test", created_at: "2021-01-01T00:00:00Z", followers: 1, following: 2, public_repos: 2 });
    }
    if (u.pathname === "/users/frpboy/repos") return json(state.repos.map((r) => ({ ...r })));
    if (u.pathname.startsWith("/repos/frpboy/") && u.pathname.endsWith("/languages")) {
      const repo = decodeURIComponent(u.pathname.split("/")[3]);
      return json(repo === "alpha" ? { TypeScript: 1000 } : { Python: 500 });
    }
    if (u.pathname === "/search/commits") {
      const q = u.searchParams.get("q");
      const m = q.match(/committer-date:(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})/);
      const [from, to] = m ? [m[1], m[2]] : ["0000-01-01", "9999-12-31"];
      const items = state.commits
        .filter((c) => c.date.slice(0, 10) >= from && c.date.slice(0, 10) <= to)
        .map((c) => ({ sha: c.sha, commit: { committer: { date: c.date } }, ...(c.repo ? { repository: { full_name: c.repo } } : {}) }));
      return json({ total_count: items.length, items });
    }
    if (u.pathname === "/search/issues") {
      const q = u.searchParams.get("q") || "";
      const base = { total_count: 0, items: [] };
      if (q.includes("type:pr is:merged")) return json({ total_count: 1, items: [] });
      if (q.includes("type:pr is:open")) return json({ total_count: 0, items: [] });
      if (q.includes("type:pr")) {
        const items = state.prItems || [{ id: 11, created_at: "2026-11-05T08:00:00Z" }];
        return json({ total_count: 2, items });
      }
      if (q.includes("type:issue")) {
        const items = state.issueItems || [{ id: 22, created_at: "2026-11-04T08:00:00Z" }];
        return json({ total_count: 1, items });
      }
      return json(base);
    }
    throw new Error(`Unexpected URL in fake: ${url}`);
  };
  return { fetchImpl, state };
}

module.exports = { makeFakeGitHub, calendarHtml };
