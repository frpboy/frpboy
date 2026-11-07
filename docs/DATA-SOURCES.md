# Data Sources

Everything the cards and JSON APIs show comes from public GitHub data about the
`frpboy` account, collected by `src/github/collect.js`. No private repository
contributes anything: names, counts, bytes, and dates all come from public
sources.

The system publishes two distinct measures, from two different sources, and
never sums them together:

1. **Contributions** - GitHub's own public contribution calendar: the same
   per-day counts the profile contribution graph shows. Feeds the streak card,
   the activity wave, the summary's active days, and the streak/day
   achievements.
2. **Commits / PRs / issues** - the collected-events ledger built from the
   GitHub Search API. Feeds the statistics card totals, the productivity
   (hour/weekday) card, and the commit infrastructure card. A PR and its
   commits are separate event types by design; the two measures overlap
   conceptually but are labeled separately everywhere.

## Source 1: GitHub's contribution calendar (ENABLED)

`GET https://github.com/users/frpboy/contributions?from=<year>-01-01&to=<year>-12-31`

**What this data is:** the same all-visible aggregate the public profile
contribution graph shows. Depending on the owner's GitHub settings (Profile >
Contribution settings), it can include anonymized private and internal
repository activity. It contains no repository names or private details, and
it is exactly what every visitor to the profile already sees. Every card
that uses it labels it "all visible (incl. anonymized private
contributions)".

**Separation rule:** the calendar ("contributions") and the public events
ledger ("public events") are different measures from different sources. They
are presented side by side, never summed, and never subtracted to infer a
private-only figure. Private repository names, languages, and per-repo
details are never collected or published.

How it is collected:

- Fetched **anonymously**. No token, no secret, no account session.
- Day boundaries and contribution definitions are GitHub's own (the same days
  and counts the profile page renders). Days are clipped to the range
  [account creation, today] so grid-overlap and future-day artifacts from the
  year pages never enter the stats.
- One request per calendar year. The current year is refetched every run; one
  older year is backfilled per run until the account-creation year (2023) is
  covered. Historical years already fetched are reused from the previous
  snapshot.
- This endpoint is unofficial. If GitHub changes the markup, the parser
  throws, the run keeps its previous calendar, and the streak/activity cards
  fall back to the public events ledger with a `source: "events-fallback"`
  flag in the JSON meta and a visible "public-events approximation" label on
  the affected cards. Nothing is fabricated, and a stale calendar is never
  carried into a failed refresh.

## Source 2: REST + Search API events ledger

| Endpoint | Used for | Notes |
| --- | --- | --- |
| `GET /users/frpboy` | Profile fields, public repo count, followers, account creation date | REST, 1 call/run. |
| `GET /users/frpboy/repos` | Public repo metadata (language, stars, forks, archived) | Public-only endpoint; the collector additionally drops any repo flagged `private`. Refreshed at most every 12 h. |
| `GET /repos/frpboy/<repo>/languages` | Language byte shares | Public repos only. |
| `GET /search/commits` | Commit events, recent window and monthly backfill | Paced under 30 req/min; months over the 300-item page cap are refined as two half-month queries; still-capped months stay `partial` and are lower bounds. |
| `GET /search/issues` | PR and issue counts (authored, merged, open) | `type:pr` / `type:issue` queries; all-time coverage. |

### Search scope: default branch only, totals are lower bounds

GitHub's Search API indexes each repository's **default branch** only.
Commits that exist solely on other branches (unmerged feature branches,
abandoned spikes) are not indexed and therefore not counted. All Search-derived
totals (commits, PRs, issues) are exact for default-branch history and a lower
bound for overall activity. Combined with the per-month page-cap rule above,
every number the cards print is a floor, never an inflation.

### Commit timestamps: committer date vs author date

Commit events are searched and bucketed by **committer date**
(`committer-date`), the timestamp recording when the commit entered its
current branch - this is the date GitHub's own search and contribution tools
count. The author date (when the change was originally written) can differ
after rebases, cherry-picks, and amended commits. The productivity card's
hour-of-day histogram therefore reflects when commits landed, in IST, not
when work was originally drafted; the card also states "Git activity, not
hours worked."

## Snapshot schema

`data/profile-stats.json` on the `stats-data` branch:

- `schema_version`, `generated_at`, `timezone` (`Asia/Kolkata`).
- `profile`: public profile fields and account creation date.
- `totals`: collected counts (`commits_collected`, PRs, issues, stars, forks).
- `repos`: public repo metadata list with `collected_at` freshness.
- `languages`: byte shares with coverage (`repos_covered`, `failed_repos`).
- `activity.days`: per-day event counts (all event types, IST buckets).
- `activity.commit_days`: per-day commit-only counts (IST buckets) for the
  infrastructure card.
- `contributions`: GitHub's calendar: `days` (per-day contribution counts,
  GitHub's day boundaries), per-year status, `history_complete`, `source`.
- `completeness`: events-ledger `history_complete`, per-month status
  (`current` / `complete` / `partial`), `oldest_complete_month`, and human
  `notes` explaining any lower bounds.
- `data_scope`: records `public_only: true`.

`validateSnapshot` in `src/analytics/index.js` rejects malformed snapshots; the
API layer falls back to the last good snapshot rather than serving bad data.

## Private repository exclusions (required, fail closed)

A required exclusion list removes specific repositories from every published
statistic. Configuration lives in the `PROFILE_EXCLUDE_REPOS` Actions secret
(comma-separated `owner/repo` slugs) so the configured values never enter the
repo, workflow logs, docs, tests, or the snapshot; logs report only the count.

The collector FAILS CLOSED - it aborts and publishes nothing when:

- the configuration is missing, empty, or has any malformed entry (no silent
  "no exclusions" fallback);
- a search query with its `-repo:` qualifiers would exceed GitHub's query
  length limit (256 characters; GitHub answers over-long queries with 422
  "Validation failed", never silent truncation, and we guard before the
  request is even made);
- any search result item is attributable to an excluded repository (catches
  the API ignoring the `-repo:` qualifiers, which GitHub documents as
  standard logical-NOT qualifier syntax);
- the finished snapshot contains any excluded name (scanned before publish).

Error text is redacted before printing: GitHub's secret masking covers only
the whole secret value, not individual slugs embedded in a query string, so
client errors and the entry point both pass messages through a redactor.

Where exclusions apply, before any aggregation:

- The repo list (`repos.list`) and its star/fork totals.
- Language byte aggregates (excluded repos are never fetched).
- Every search query (commits, PRs, issues) via `-repo:` qualifiers, so
  excluded activity never enters the events ledger or totals.

Transition safety:

- Snapshots built with exclusions carry a non-identifying
  `exclusions_applied: true` marker. A previous snapshot WITHOUT the marker
  is never reused or merged: the events ledger carries no per-repo
  attribution, so unfiltered history cannot be cleaned after the fact and is
  rebuilt from scratch instead.
- Configuration CHANGES between filtered snapshots are detected with a
  salted SHA-256 fingerprint of the normalized exclusion list, stored only
  in the private Actions cache (never in the repo, snapshot, or logs). The
  salt (a second secret, `PROFILE_EXCLUDE_SALT`) makes the fingerprint
  immune to dictionary attacks over the account's public repository names.
  A changed or unrecorded fingerprint forces a full filtered rebuild
  (`PROFILE_FORCE_REBUILD=1`); a missing/evicted cache fails closed into a
  rebuild as well. The new fingerprint is recorded only after a successful
  publish.
- Cached language byte aggregates cannot be un-mixed per repository, so any
  run with exclusions configured re-collects repos/languages fresh rather
  than reusing the 12h cache.

Limits to be transparent about:

- Source 1 (GitHub's own contribution calendar) is a fixed all-visible
  aggregate that GitHub does not allow filtering per repository. It can still
  include excluded repositories' activity as anonymized numbers, exactly as
  the public profile graph does. Cards label this source accordingly.
- The query length limit bounds the practical number of exclusions; each one
  adds a `-repo:` qualifier to every search query.

## Refresh cadence

- Workflow: hourly at `:43` (`profile-stats.yml`), offset from the existing
  `:37` contribution workflows.
- Contribution calendar: current year every run, one older year per run.
- Recent commit window: every run; the current month is always re-collected.
- Commit backfill: one older month per run (half-month refinement for capped
  months) until the account-creation month.
- Repos/languages: every 12 hours.
- Card/JSON cache: 5 minutes in-function plus HTTP
  `max-age=300, stale-while-revalidate=3600`.
