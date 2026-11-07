# API Reference

Base URL: `https://frpboy-profile-watchdog.vercel.app`

All responses derive from the same snapshot (`data/profile-stats.json` on the
`stats-data` branch). Times are rendered in IST (UTC+05:30).

## SVG cards

`GET /api/cards/<name>.svg[?theme=dark|light]`

Returns `image/svg+xml` in all cases, including errors. Unknown card names
return a 404 status with an explanatory SVG; a missing snapshot returns a 503
status with a neutral "temporarily unavailable" card. Cache header:
`public, max-age=300, stale-while-revalidate=3600`.

| Card | Size | Content |
| --- | --- | --- |
| `stats.svg` | 495x195 | Stars, forks, repos, PRs, issues, followers; commit total footnoted while backfilling. |
| `streak.svg` | 495x195 | Current and longest public-activity streak (IST day boundaries), best range, first recorded activity. |
| `languages.svg` | 495x195 | Language shares by bytes across public repos. |
| `productivity.svg` | 495x195 | Commits by hour (IST), top hour/weekday, daypart totals. |
| `summary.svg` | 495x170 | Account age, active days, recent activity, top language/weekday. |
| `repositories.svg` | 495x195 | Repo counts by primary language, fork/archive counts, top starred. |
| `infrastructure.svg` | 495x208 | Last 14 days of public commits. |
| `trophies.svg` | 800x168 | Achievement tiers computed from public milestones. |
| `activity.svg` | 800x180 | 90-day daily activity wave. |

Example:

```html
<img src="https://frpboy-profile-watchdog.vercel.app/api/cards/streak.svg?theme=dark" alt="Contribution streak" />
```

`GET /api/cards/health` returns per-card status JSON:

```json
{ "ok": true, "cards": { "stats.svg": "ok", "...": "..." },
  "snapshot": { "generated_at": "...", "stale": false, "source": "raw", "history_complete": false } }
```

## JSON datasets

`GET /api/github/<dataset>` with dataset one of
`profile`, `stats`, `repositories`, `languages`, `contributions` (alias
`streak`), `productivity`, `activity`, `health`.

Envelope: `{ "ok": true, "data": ..., "meta": ... }`. `meta` carries
`stale`, `source`, and snapshot completeness flags. Errors:
`404` unknown dataset, `503` no snapshot yet, `500` analytics failure.

Example:

```bash
curl -s https://frpboy-profile-watchdog.vercel.app/api/github/stats | jq .data
```

## Authenticated refresh

`GET /api/stats-refresh` with `Authorization: Bearer $CRON_SECRET` dispatches
the refresh workflow on demand. Same auth model as the existing
`/api/profile-refresh`. Unauthenticated calls return `401`.

## Interpreting the data

- Private repositories are excluded everywhere. Two activity datasets are
  served and always labeled separately:
  - **All visible** (`meta.coverage.contributions_source: "github-calendar"`):
    GitHub's own contribution calendar, the same aggregate the public profile
    graph shows. It can include anonymized private contributions and says so
    on every card that uses it.
  - **Public events** (the collected events ledger): public-only commits,
    PRs and issues. If the calendar fetch fails, the streak/activity cards
    fall back to this dataset with a visible "public-events approximation"
    label and `contributions_source: "events-fallback"`.
- The two datasets are different measures from different sources; they are
  shown side by side, never summed, and never subtracted to infer a
  private-only figure.
- While `meta.completeness.history_complete` is `false`, lifetime commit
  totals are lower bounds that grow as the hourly backfill fills older
  months. Months over 300 public commits per half-month query are marked
  `partial` and remain lower bounds.
- Commit times are committer dates (when commits landed), bucketed in IST;
  they are Git activity, not hours worked.
