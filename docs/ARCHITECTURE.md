# Architecture

Self-hosted GitHub profile statistics for the `frpboy` profile README, running on
the existing Vercel project `frpboy-profile-watchdog` (Hobby plan) alongside the
pre-existing contribution-inventory watchdog. No new paid services, no databases,
no new secrets.

## Components

| Component | Location | Role |
| --- | --- | --- |
| Collector | `src/github/collect.js` + `scripts/collect-profile-stats.js` | Gathers public GitHub data into one JSON snapshot. |
| Calendar | `src/github/calendar.js` | Fetches GitHub's contribution calendar anonymously (no token): the same all-visible aggregate the profile graph shows (can include anonymized private contributions; always labeled as such on cards). Kept strictly separate from the public-only events ledger; degrades to it on failure. |
| Snapshot store | `data/profile-stats.json` on the orphan branch `stats-data` | Durable, append-only history of snapshots; read via raw.githubusercontent.com. |
| Refresh workflow | `.github/workflows/profile-stats.yml` | Hourly (`:43`) GitHub Actions run: tests, collect, commit to `stats-data` when changed. |
| Card API | `api/cards/[...path].js` | Serves 9 SVG cards from the snapshot. One catch-all function. |
| JSON API | `api/github/[...path].js` | Serves the same analytics as JSON datasets. One catch-all function. |
| Health | `api/health.js`, `/api/cards/health`, `/api/github/health` | Snapshot freshness and per-card status. |
| Snapshot loader | `src/cache/snapshot.js` | In-function cache + validation + stale fallback. |
| Analytics | `src/analytics/index.js` | Pure functions: streaks, languages, productivity, repos, achievements, activity series. |
| Card rendering | `src/cards/{theme,svg,generate}.js` | SVG generation, dark and light themes, all dynamic text escaped. |

## Data flow

```
GitHub REST + Search APIs (public data, GITHUB_TOKEN)
(contribution calendar route implemented but disabled - see DATA-SOURCES.md)
        |
        v
scripts/collect-profile-stats.js  (GitHub Actions, hourly)
        |  writes on change only
        v
stats-data branch: data/profile-stats.json
        |  raw.githubusercontent.com (no credential)
        v
api/cards/* and api/github/*  (5-minute in-function cache)
        |
        v
README <img> tags + JSON consumers
```

Data-only pushes to `stats-data` do not trigger Vercel builds: `vercel.json`
`ignoreCommand` exits 0 (skip) when the files changed in `HEAD` are exclusively
`data/**`, and exits 1 (build) on any error or empty diff so code and README
deploys are never skipped. It uses `git show --pretty= --name-only HEAD`, which
also works on an orphan branch's first commit, so seeding `stats-data` builds
nothing at all.

## Why a dedicated snapshot branch

The pre-existing snake workflow (`snake.yml`) force-pushes the `output` branch
every 12 hours via `peaceiris/actions-gh-pages`. Snapshot history therefore
cannot live on `output`, and must not live on `main` (it would pollute README
history and fire deploys). The orphan branch `stats-data` holds only
`data/profile-stats.json`; the refresh workflow commits with a concurrency group
(`profile-stats-data`, no cancel-in-progress) and a rebase-retry on push
conflict, so concurrent writes cannot lose history.

## Function budget

Hobby deployments have a limited number of serverless functions per deployment.
This change adds three functions and keeps the total at five:

1. `api/profile-refresh.js` (existing, unchanged)
2. `api/stats-refresh.js` (authenticated manual refresh trigger, mirrors `profile-refresh`)
3. `api/health.js`
4. `api/cards/[...path].js` (all 9 cards behind one catch-all)
5. `api/github/[...path].js` (all JSON datasets behind one catch-all)

Per-card functions would have added nine; the catch-all routing keeps the
deployment well inside the budget.

## Caching and fallback

`src/cache/snapshot.js` per warm function instance:

1. In-memory snapshot younger than 5 minutes: serve it (`source: memory`).
2. Otherwise fetch the raw snapshot and validate it (`source: raw`).
3. If the fetch or validation fails, serve the last good in-memory snapshot and
   flag it stale (`source: memory-stale`).
4. If nothing was ever loaded, cards render a neutral "temporarily unavailable"
   SVG and JSON routes return `503`. No fabricated numbers, ever.

Cold-start durability comes from the `stats-data` branch itself; the in-memory
fallback only bridges transient raw.githubusercontent.com or GitHub outages.

SVG responses send `Cache-Control: public, max-age=300, stale-while-revalidate=3600`
so GitHub's Camo proxy and browsers cache briefly and tolerate staleness.

## Incremental collection and backfill

Each run collects the events ledger (the contribution-calendar route is
implemented but disabled for privacy - see DATA-SOURCES.md):

- Profile fields and public repo metadata (repos/languages refresh at most
  every 12 hours; reused otherwise).
- Recent commits via the Search API (current partial month is always refreshed).
- PR and issue counts via the Search API.
- One older month of commits per run, walking backwards from the previous month
  to the account-creation month. A month that exceeds the 300-item page cap is
  marked `partial` and refined next run as two half-month queries; a half that
  still exceeds the cap stays `partial` and its count is a documented lower
  bound.

`completeness.history_complete` flips to `true` only when every month back to
account creation is `complete`. Until then, cards print "history backfilling"
and totals carry a footnote instead of claiming full-history precision.

## What this does not replace

- The contribution-inventory watchdog (`api/profile-refresh.js`,
  `external-contributions.yml`, `scripts/update_external_contributions.py`) is
  untouched.
- The snake animation workflow is untouched.
- GitScore and Engineering Humor cards stay on their external services.

## Security

- No new secrets. The collector uses the built-in Actions `GITHUB_TOKEN`
  (public data only). An optional user-scoped `PROFILE_ACTIVITY_TOKEN` raises
  rate limits; the collector still queries public endpoints only.
- All dynamic values in SVGs pass through XML escaping (`src/security/escape.js`).
- `/api/stats-refresh` requires the existing `CRON_SECRET` bearer token, same
  as `/api/profile-refresh`.
- Only public repository data is collected. Private repositories (including
  client work) contribute nothing: no names, no counts, no metadata. The repo
  listing endpoint used is public-only, and the collector additionally drops
  any record flagged `private`.
