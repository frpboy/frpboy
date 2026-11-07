"use strict";

/**
 * GitHub data collection for the profile statistics snapshot.
 *
 * Identity: collects data for the fixed account below only, never for the
 * authenticated token's owner. Scope: PUBLIC data only (public repositories,
 * public commits/PRs/issues found through the search API, public profile).
 * Private repository names, counts and activity never enter the snapshot.
 *
 * Rate limits: REST budget stays well under 1,000 req/hr; search calls stay
 * under 30/min by pacing and by fetching at most one backfill month per run.
 */

const { istDateString, istHour, istWeekday, monthOf, monthStart, monthEnd, prevMonth, istToday, addDays, daysBetween } = require("../utils/time");
const { collectCalendar } = require("./calendar");
const { makeExcluder, makeRedactor } = require("./exclusions");

const ACCOUNT = "frpboy";
const API = "https://api.github.com";
const SEARCH_PACE_MS = 2100; // < 30 search requests/minute
const MAX_EVENTS_KEPT = 20000; // safety cap on stored event records
const RECENT_PAGES = 3; // 3 x 100 recent commits per run
const BACKFILL_PAGES_PER_MONTH = 3; // up to 300 commits per backfilled month
const REPO_REFRESH_MS = 12 * 60 * 60 * 1000; // repos/languages every 12h

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createClient(token, fetchImpl = fetch, paceMs = SEARCH_PACE_MS, redact = (s) => s) {
  let searchBudgetResetLog = [];
  async function request(path, { search = false } = {}, attempt = 0) {
    const url = path.startsWith("http") ? path : `${API}${path}`;
    const res = await fetchImpl(url, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "frpboy-profile-stats",
      },
    });
    if ((res.status === 403 || res.status === 429) && attempt < 3) {
      const retryAfter = Number(res.headers.get("retry-after")) || 0;
      const remaining = res.headers.get("x-ratelimit-remaining");
      const reset = Number(res.headers.get("x-ratelimit-reset")) || 0;
      let waitMs = retryAfter * 1000 || Math.min(60000, 5000 * 2 ** attempt);
      if (remaining === "0" && reset) waitMs = Math.max(waitMs, reset * 1000 - Date.now() + 1000);
      if (waitMs <= 90000) {
        await sleep(waitMs);
        return request(path, { search }, attempt + 1);
      }
      // Errors reach public Actions logs: redact the path (search query
      // strings can carry private exclusion slugs) before composing.
      throw new Error(`GitHub rate limit exceeded for ${redact(path)} (reset too far out)`);
    }
    if (res.status === 404) return { notFound: true, data: null, headers: res.headers };
    if (!res.ok) throw new Error(`GitHub API ${res.status} for ${redact(path)}: ${redact((await res.text()).slice(0, 200))}`);
    return { notFound: false, data: await res.json(), headers: res.headers };
  }

  let lastSearchAt = 0;
  async function search(path) {
    const wait = paceMs - (Date.now() - lastSearchAt);
    if (wait > 0) await sleep(wait);
    lastSearchAt = Date.now();
    const { data } = await request(path, { search: true });
    return data;
  }
  return { request, search, searchBudgetResetLog };
}

/** Fetch the public profile of the fixed account and verify identity. */
async function collectProfile(client) {
  const { data } = await client.request(`/users/${ACCOUNT}`);
  if (!data || data.login !== ACCOUNT) throw new Error(`Unexpected account identity: ${data && data.login}`);
  return {
    login: data.login,
    name: data.name || data.login,
    created_at: data.created_at,
    followers: data.followers,
    following: data.following,
    public_repos: data.public_repos,
  };
}

/** List public repos owned by the account (paginated). Configured private
 * exclusions drop repos by slug before they can reach any snapshot field. */
async function collectRepos(client, excluder) {
  const repos = [];
  let excluded = 0;
  for (let page = 1; page <= 10; page++) {
    const { data } = await client.request(`/users/${ACCOUNT}/repos?type=owner&sort=pushed&per_page=100&page=${page}`);
    if (!Array.isArray(data) || data.length === 0) break;
    for (const r of data) {
      // Defense in depth: /users/{name}/repos only ever returns public repos,
      // but drop anything flagged private so no private repo name can leak.
      if (r.private) continue;
      if (excluder.isExcludedRepo(r.name)) {
        excluded += 1;
        continue;
      }
      repos.push({
        name: r.name,
        fork: r.fork,
        archived: r.archived,
        language: r.language,
        stars: r.stargazers_count,
        forks: r.forks_count,
        pushed_at: r.pushed_at,
      });
    }
    if (data.length < 100) break;
  }
  return { list: repos, excluded };
}

/** Language byte counts per public repo. Forks are included and flagged downstream. */
async function collectLanguages(client, repos) {
  const bytes = {};
  let reposWithout = 0;
  const failures = [];
  for (const repo of repos) {
    if (repo.archived && repo.pushed_at < "2020-01-01") {
      // Long-dormant archived repos rarely change; still count them via existing totals if present.
    }
    const { notFound, data } = await client.request(`/repos/${ACCOUNT}/${encodeURIComponent(repo.name)}/languages`).catch((e) => {
      failures.push(repo.name);
      return { notFound: true, data: null };
    });
    if (notFound || !data) continue;
    const entries = Object.entries(data);
    if (entries.length === 0) {
      reposWithout += 1;
      continue;
    }
    for (const [lang, n] of entries) bytes[lang] = (bytes[lang] || 0) + n;
  }
  return { bytes, repos_covered: repos.length - reposWithout - failures.length, repos_without_language: reposWithout, failed_repos: failures };
}

function commitQuery(dateFrom, dateTo, excluder) {
  return excluder.guardQueryLength(`author:${ACCOUNT}+committer-date:${dateFrom}..${dateTo}${excluder.queryFragment()}`);
}

/** Fetch commit items (sha + committer date) for a date range, up to maxPages pages. */
async function fetchCommitItems(client, dateFrom, dateTo, maxPages, excluder) {
  const items = [];
  let capped = false;
  for (let page = 1; page <= maxPages; page++) {
    const data = await client.search(`/search/commits?q=${commitQuery(dateFrom, dateTo, excluder)}&sort=committer-date&order=desc&per_page=100&page=${page}`);
    const list = (data && data.items) || [];
    for (const item of list) {
      // Fail closed if the API returns anything attributable to an excluded
      // repo (i.e. it ignored the -repo: qualifiers). Generic message only.
      const fullName = item.repository && item.repository.full_name;
      if (fullName && excluder.isExcludedSlug(fullName)) {
        throw new Error("Search returned excluded content; refusing to collect.");
      }
      items.push({
        id: item.sha,
        date: item.commit && item.commit.committer && item.commit.committer.date,
      });
    }
    if (list.length < 100) break;
    if (page === maxPages && data.total_count > maxPages * 100) capped = true;
  }
  return { items, capped };
}

/** Count PRs and issues authored by the account (public). Returns totals + recent items.
 * Configured exclusions add -repo: qualifiers so excluded activity never enters
 * the events ledger or the totals. */
async function collectPullsAndIssues(client, excluder) {
  const qf = excluder.queryFragment();
  const q = (base) => excluder.guardQueryLength(`${base}${qf}`);
  const prData = await client.search(`/search/issues?q=${q(`author:${ACCOUNT}+type:pr`)}&per_page=1`);
  const prMerged = await client.search(`/search/issues?q=${q(`author:${ACCOUNT}+type:pr+is:merged`)}&per_page=1`);
  const prOpen = await client.search(`/search/issues?q=${q(`author:${ACCOUNT}+type:pr+is:open`)}&per_page=1`);
  const issueData = await client.search(`/search/issues?q=${q(`author:${ACCOUNT}+type:issue`)}&per_page=1`);
  const recentPrs = await client.search(`/search/issues?q=${q(`author:${ACCOUNT}+type:pr`)}&sort=created&order=desc&per_page=100`);
  const recentIssues = await client.search(`/search/issues?q=${q(`author:${ACCOUNT}+type:issue`)}&sort=created&order=desc&per_page=100`);
  const toItems = (data, type) =>
    ((data && data.items) || []).map((it) => {
      // Fail closed if the API ignored the -repo: qualifiers (repository_url
      // is https://api.github.com/repos/<owner>/<name>).
      const slug = typeof it.repository_url === "string" ? it.repository_url.split("/repos/")[1] : null;
      if (slug && excluder.isExcludedSlug(slug)) {
        throw new Error("Search returned excluded content; refusing to collect.");
      }
      return { type, id: `${ACCOUNT}#${it.id}`, date: it.created_at };
    });
  return {
    totals: {
      prs: (prData && prData.total_count) || 0,
      prs_merged: (prMerged && prMerged.total_count) || 0,
      prs_open: (prOpen && prOpen.total_count) || 0,
      issues: (issueData && issueData.total_count) || 0,
    },
    events: [...toItems(recentPrs, "pr"), ...toItems(recentIssues, "issue")],
  };
}

/**
 * Main collection entry. `previous` is the prior snapshot state (or null).
 * Returns the next snapshot state; throws only when nothing can be produced.
 */
async function collect(previous, { token, fetchImpl, paceMs, now = new Date(), log = console.log, contributionCalendar = false, excludeRepos = [] } = {}) {
  const excluder = makeExcluder(excludeRepos, ACCOUNT);
  // Redact exclusion slugs from any error text before it can reach public logs.
  const redact = makeRedactor(excludeRepos);
  const client = createClient(token, fetchImpl, paceMs, redact);
  if (excluder.count > 0) log(`Repository exclusions configured: ${excluder.count} (values kept private)`);
  const today = istToday(now);
  const notes = [];
  let state = previous && previous.schema_version === 1 ? JSON.parse(JSON.stringify(previous)) : null;
  if (excluder.count > 0 && state && !state.exclusions_applied) {
    // The events ledger carries no per-repo attribution, so a snapshot built
    // without exclusions can contain excluded activity that cannot be
    // filtered out. Fail closed: discard it and rebuild the ledger fresh.
    state = null;
    log("Previous snapshot predates exclusion configuration; rebuilding the events ledger from scratch (attribution is stripped at collection time)");
  }

  const profile = await collectProfile(client);

  // --- events ledger (commits, prs, issues) with sha/id dedupe ---
  const events = new Map(); // id -> {type, id, date}
  if (state && state.events) for (const e of state.events) events.set(e.id, e);

  // 1. Recent commits: last ~300 public commits, every run.
  const recentFrom = addDays(today, -120);
  const recent = await fetchCommitItems(client, recentFrom, today, RECENT_PAGES, excluder);
  for (const c of recent.items) if (c.date) events.set(`commit:${c.id}`, { type: "commit", id: `commit:${c.id}`, date: c.date });
  if (recent.capped) notes.push("Recent commit window exceeded 300 items; oldest recent commits may be missing this run.");

  // 2. Backfill one older month per run until the account creation month is covered.
  const accountMonth = profile.created_at.slice(0, 7);
  const completeness = (state && state.completeness) || { months: {}, oldest_complete_month: null };
  completeness.months = completeness.months || {};
  const currentMonth = monthOf(today);
  completeness.months[currentMonth] = "current";
  let backfillMonth = null;
  for (let m = currentMonth; m >= accountMonth; m = prevMonth(m)) {
    if (completeness.months[m] === "partial") { backfillMonth = m; break; }
  }
  if (!backfillMonth) {
    for (let m = prevMonth(currentMonth); m >= accountMonth; m = prevMonth(m)) {
      if (!completeness.months[m]) { backfillMonth = m; break; }
    }
  }
  if (backfillMonth) {
    const from = monthStart(backfillMonth);
    const to = monthEnd(backfillMonth);
    const prior = completeness.months[backfillMonth];
    if (prior === "partial") {
      // A full-month query already hit the page cap; refine in two half-month
      // queries so heavy months (over 300 public commits) converge.
      const mid = `${backfillMonth}-15`;
      const h1 = await fetchCommitItems(client, from, mid, BACKFILL_PAGES_PER_MONTH, excluder);
      const h2 = await fetchCommitItems(client, addDays(mid, 1), to, BACKFILL_PAGES_PER_MONTH, excluder);
      for (const c of [...h1.items, ...h2.items]) if (c.date) events.set(`commit:${c.id}`, { type: "commit", id: `commit:${c.id}`, date: c.date });
      const stillCapped = h1.capped || h2.capped;
      completeness.months[backfillMonth] = stillCapped ? "partial" : "complete";
      if (stillCapped) notes.push(`Month ${backfillMonth} still exceeds ${BACKFILL_PAGES_PER_MONTH * 100} public commits per half; counts for that month are a lower bound.`);
      log(`Refined ${backfillMonth}: ${h1.items.length}+${h2.items.length} commits${stillCapped ? " (still capped)" : ""}`);
    } else {
      const res = await fetchCommitItems(client, from, to, BACKFILL_PAGES_PER_MONTH, excluder);
      for (const c of res.items) if (c.date) events.set(`commit:${c.id}`, { type: "commit", id: `commit:${c.id}`, date: c.date });
      completeness.months[backfillMonth] = res.capped ? "partial" : "complete";
      if (res.capped) notes.push(`Month ${backfillMonth} exceeded ${BACKFILL_PAGES_PER_MONTH * 100} public commits; refining in halves next run.`);
      log(`Backfilled ${backfillMonth}: ${res.items.length} commits${res.capped ? " (capped)" : ""}`);
    }
  }
  // Only months verified "complete" count; a "partial" (page-capped) month
  // must never be reported as the oldest complete month.
  completeness.oldest_complete_month = backfillMonth
    ? Object.keys(completeness.months).filter((m) => completeness.months[m] === "complete").sort()[0] || null
    : accountMonth;
  const historyComplete = (() => {
    for (let m = prevMonth(currentMonth); m >= accountMonth; m = prevMonth(m)) {
      if (completeness.months[m] !== "complete") return false;
    }
    return true;
  })();

  // 3. PRs and issues.
  const pi = await collectPullsAndIssues(client, excluder);
  for (const e of pi.events) events.set(`${e.type}:${e.id}`, e);

  // 4. Repos + languages (12h cadence).
  let reposData = state && state.repos && Array.isArray(state.repos.list) ? state.repos.list : null;
  let languages = state && state.languages ? state.languages : null;
  const lastRepoRefresh = state && state.repos_collected_at ? Date.parse(state.repos_collected_at) : 0;
  // Cached language byte aggregates cannot be un-mixed per repo, so any run
  // with exclusions configured re-collects repos/languages fresh instead of
  // reusing a possibly contaminated cache (config changes are undetectable).
  if (excluder.count > 0 || now.getTime() - lastRepoRefresh > REPO_REFRESH_MS || !reposData) {
    const rc = await collectRepos(client, excluder);
    reposData = rc.list;
    languages = await collectLanguages(client, reposData);
    log(`Repos refreshed: ${reposData.length} public repos, ${Object.keys(languages.bytes).length} languages${rc.excluded ? `, ${rc.excluded} excluded by configuration` : ""}`);
  } else {
    reposData = reposData.filter((r) => !excluder.isExcludedRepo(r.name));
    log("Repos/languages within 12h freshness window; reusing previous snapshot values");
  }

  // 5. GitHub's own contribution calendar (anonymous fetch, enabled by the
  // workflow). This is the same all-visible aggregate the public profile
  // graph shows; depending on the owner's GitHub settings it can include
  // anonymized private contributions, so every card labels it "all visible"
  // and keeps it strictly separate from the public-only events ledger:
  // never summed, never subtracted to infer a private-only figure.
  // Failures degrade to the events ledger, never to zeros, and a stale
  // calendar is never carried into a failed refresh.
  let contributions = null;
  if (contributionCalendar) try {
    contributions = await collectCalendar({
      accountYear: Number(profile.created_at.slice(0, 4)),
      currentYear: Number(istToday(now).slice(0, 4)),
      previous: state,
      log,
      fetchImpl: fetchImpl || fetch,
      sleep: () => sleep(1500),
      firstDate: profile.created_at.slice(0, 10),
      lastDate: istToday(now),
    });
    for (const n of contributions.notes) notes.push(n);
  } catch (e) {
    notes.push(`Contribution calendar unavailable this run (${e.message}); streak/activity cards fall back to collected public events.`);
    contributions = null; // never carry a stale private-inclusive calendar into a public snapshot
  }
  if (!contributionCalendar) {
    notes.push("Contribution calendar route disabled by default (GitHub profile calendars can include anonymized private contributions); streak/activity use the public events ledger.");
  }

  // --- derive aggregates ---
  const eventList = [...events.values()]
    .filter((e) => e.date)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-MAX_EVENTS_KEPT);
  if (events.size > MAX_EVENTS_KEPT) notes.push(`Event ledger capped at ${MAX_EVENTS_KEPT} most recent records.`);

  const days = {};
  const commitDays = {};
  const byHour = new Array(24).fill(0);
  const byWeekday = new Array(7).fill(0);
  let commitCount = 0;
  for (const e of eventList) {
    const d = istDateString(e.date);
    days[d] = (days[d] || 0) + 1;
    if (e.type === "commit") {
      commitDays[d] = (commitDays[d] || 0) + 1;
      commitCount += 1;
      byHour[istHour(e.date)] += 1;
      byWeekday[istWeekday(e.date)] += 1;
    }
  }

  const totals = {
    repos_public: reposData ? reposData.length : profile.public_repos,
    stars_received: reposData ? reposData.reduce((s, r) => s + (r.stars || 0), 0) : null,
    forks_received: reposData ? reposData.reduce((s, r) => s + (r.forks || 0), 0) : null,
    commits_collected: commitCount,
    prs: pi.totals.prs,
    prs_merged: pi.totals.prs_merged,
    prs_open: pi.totals.prs_open,
    issues: pi.totals.issues,
  };

  const firstEventDate = eventList.length ? istDateString(eventList[0].date) : null;
  return {
    schema_version: 1,
    generated_at: now.toISOString(),
    account: ACCOUNT,
    timezone: "Asia/Kolkata",
    data_scope: "public",
    // Non-identifying transition marker: snapshots built with exclusions can
    // only merge with snapshots also built with exclusions.
    exclusions_applied: excluder.count > 0,
    completeness: {
      public_only: true,
      history_complete: historyComplete,
      oldest_complete_month: completeness.oldest_complete_month,
      first_event_date: firstEventDate,
      notes,
      months: completeness.months,
    },
    profile,
    totals,
    languages: languages
      ? { bytes: languages.bytes, repos_covered: languages.repos_covered, repos_without_language: languages.repos_without_language, failed_repos: languages.failed_repos }
      : null,
    repos: reposData ? { list: reposData, collected_at: now.toISOString() } : null,
    repos_collected_at: now.toISOString(),
    activity: { days, commit_days: commitDays },
    contributions,
    productivity: { by_hour: byHour, by_weekday: byWeekday, sample_commits: commitCount, window_from: firstEventDate, window_to: today },
    events: eventList,
  };
}

module.exports = { collect, ACCOUNT };
