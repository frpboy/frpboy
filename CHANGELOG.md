# Changelog

## 2026-11-07 - Self-hosted profile statistics backend

### Added

- Nine self-hosted SVG cards served from the existing Vercel project:
  `stats`, `streak`, `languages`, `productivity`, `summary`, `repositories`,
  `infrastructure`, `trophies`, `activity` (`/api/cards/<name>.svg`, dark and
  light themes).
- JSON datasets over the same snapshot: `/api/github/{profile,stats,
  repositories,languages,contributions,streak,productivity,activity,health}`.
- `api/health.js`, `/api/cards/health`, and `/api/github/health` for snapshot
  freshness monitoring.
- `api/stats-refresh.js`: authenticated on-demand refresh dispatch, mirroring
  the existing `profile-refresh` auth model (`CRON_SECRET`).
- Two clearly labeled activity datasets, always kept separate and never
  summed: GitHub's own contribution calendar (anonymous fetch, per-year
  backfill, markup-drift detection, date-bounds clipping) shown as "all
  visible (incl. anonymized private contributions)", and the public-only
  events ledger shown as "public events". Cards present both side by side;
  on calendar failure they fall back to the ledger with a visible
  "public-events approximation" label.
- Languages and repository cards list every detected language/group with no
  top-N cutoff and no "Other" aggregation (byte shares via GitHub Linguist,
  repo counts by primary language; both public-only).
- Hourly collection workflow (`.github/workflows/profile-stats.yml`, at `:43`)
  that tests, collects public GitHub data, and commits
  `data/profile-stats.json` to the orphan branch `stats-data` when changed.
- Incremental backfill: one older month per run with half-month refinement for
  high-volume months, tracked by per-month completeness flags.
- Snapshot loader with 5-minute in-function cache, validation, and
  last-known-good stale fallback; cards never fabricate numbers.
- `vercel.json` `ignoreCommand`: skip deployments for data-only pushes;
  builds always proceed on command error so code/README deploys are safe.
- Test suite (`tests/`, `node --test`): escaping, analytics, snapshot
  validation, cache fallback, card rendering, calendar parsing/backfill,
  ledger totals/dedupe consistency, and private-repository exclusion.
- Documentation: `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DEPLOYMENT.md`,
  `docs/DATA-SOURCES.md`.

### Changed

- `package.json` added (no runtime dependencies; `test` and `collect`
  scripts). The deployment remains plain CommonJS serverless functions.

### Preserved

- `api/profile-refresh.js`, the external-contributions workflow, and the snake
  workflow are untouched.
- GitScore and Engineering Humor cards continue to use their external
  services.
- No new secrets are required; collection uses the built-in `GITHUB_TOKEN`
  over public data only.
