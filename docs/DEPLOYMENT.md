# Deployment

## Prerequisites

- Merge access to `frpboy/frpboy` (the profile README repository).
- The Vercel project `frpboy-profile-watchdog` is already connected to this
  repository and deploys `main` to production automatically.
- Hobby plan constraints that shaped this design:
  - 100 deployments per day (rolling 86400 s). Data-only pushes are skipped by
    `ignoreCommand`, so the hourly snapshot commits do not consume this.
  - Cron jobs run at most once per day on Hobby, and more frequent expressions
    fail the deployment. Refresh therefore runs in GitHub Actions
    (`.github/workflows/profile-stats.yml`, hourly at `:43`), not Vercel cron.
    The existing daily Vercel cron for `/api/profile-refresh` is unchanged.
  - Serverless functions per deployment are limited; this system uses two
    catch-all functions for all cards and datasets (five functions total).

## Steps

1. Merge the feature branch into `main`. Vercel deploys production
   automatically. Watch the deployment go ready before continuing.
2. Seed the first snapshot: run the `Profile Statistics Refresh` workflow
   manually (Actions > Profile Statistics Refresh > Run workflow). The first
   run creates the orphan `stats-data` branch and backfills the current and
   previous months.
3. Verify:
   - `curl -s https://frpboy-profile-watchdog.vercel.app/api/health`
   - `curl -s https://frpboy-profile-watchdog.vercel.app/api/cards/health`
   - Open `https://frpboy-profile-watchdog.vercel.app/api/cards/stats.svg`
     in a browser.
   - `curl -s https://frpboy-profile-watchdog.vercel.app/api/github/stats`
4. Switch the README stats section to the self-hosted URLs only after the cards
   render correctly (the README change is a normal commit and deploy).
5. Let the hourly schedule run. `history_complete` flips to `true` after the
   backfill reaches the account-creation month (one month per run; months with
   heavy commit volume take an extra run for half-month refinement).

## Required: private repository exclusions

The collector refuses to run (fail closed, nothing is published) without
two repository secrets:

- `PROFILE_EXCLUDE_REPOS`: comma-separated `owner/repo` slugs that must not
  appear in any published statistic. Missing, empty, or malformed values
  abort the run with a generic error.
- `PROFILE_EXCLUDE_SALT`: a random string (32+ characters) used solely to
  salt the private configuration fingerprint so it cannot be
  dictionary-attacked. Any random value works; rotating it forces one full
  filtered rebuild.

Changing `PROFILE_EXCLUDE_REPOS` is detected automatically via the
fingerprint cache and forces a full filtered rebuild of the events ledger;
no manual cleanup is needed. See `docs/DATA-SOURCES.md` for the fail-closed
rules and the limits of the mechanism.

## Optional: higher rate limits

The collector defaults to the built-in Actions `GITHUB_TOKEN`, which is
sufficient for this account's public volume. To add headroom, create a
fine-grained PAT with read access to public data only and store it as the
repository secret `PROFILE_ACTIVITY_TOKEN`; the workflow prefers it when
present. The collector queries public endpoints regardless of token.

## Rollback

- Code/API: revert the merge commit on `main`, or use Vercel's instant
  rollback to the previous production deployment. The pre-existing
  `profile-refresh` function was not modified.
- README: revert the README commit to restore the previous external card URLs.
- Data: the `stats-data` branch is append-only and independent of `main`;
  deleting it and re-running the workflow rebuilds history from scratch.
- Removing the system entirely: revert the merge, delete the
  `stats-data` branch, and disable the `Profile Statistics Refresh` workflow.

## Cost

Nothing new is billed. GitHub Actions minutes for the hourly workflow are the
only consumed resource (a few minutes per run within the free tier for public
repositories; public repos have no Actions minutes charge).
