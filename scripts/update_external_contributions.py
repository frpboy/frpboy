#!/usr/bin/env python3
"""Generate a conservative, clearly scoped external-contribution index.

GitHub Search is an index, not an event ledger. This generator therefore:
- exhausts available search pages up to GitHub's 1,000-result search cap;
- fails rather than silently publishing when a query hits the cap;
- uses creation/merge dates for contribution events, not last-updated dates;
- keeps PRs, reviews, comments, issues, discussions and commits separate;
- avoids presenting incomplete all-time counts as authoritative.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

USERNAME = os.environ.get("GITHUB_USERNAME", "frpboy").strip()
TOKEN = os.environ.get("GITHUB_TOKEN", "").strip()
README_PATH = os.environ.get("README_PATH", "README.md")
START_MARKER = "<!-- EXTERNAL-CONTRIBUTIONS:START -->"
END_MARKER = "<!-- EXTERNAL-CONTRIBUTIONS:END -->"
REFRESH_DATE_START_MARKER = "<!-- SELECTED-CONTRIBUTIONS-REFRESH-DATE:START -->"
REFRESH_DATE_END_MARKER = "<!-- SELECTED-CONTRIBUTIONS-REFRESH-DATE:END -->"
MAX_SEARCH_RESULTS = 1000
PER_PAGE = 100
IST = ZoneInfo("Asia/Kolkata")
API_HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}

def request_json(url: str, payload: dict | None = None) -> dict:
    headers = {**API_HEADERS, "User-Agent": f"{USERNAME}-profile-contributions-updater"}
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    if data is not None:
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")
            if error.code in (403, 429) and attempt < 3:
                retry_after = error.headers.get("Retry-After")
                reset_at = error.headers.get("X-RateLimit-Reset")
                remaining = error.headers.get("X-RateLimit-Remaining")

                if retry_after and retry_after.isdigit():
                    delay = int(retry_after)
                elif remaining == "0" and reset_at and reset_at.isdigit():
                    delay = max(1, int(reset_at) - int(time.time()) + 1)
                else:
                    delay = min(2 ** (attempt + 1), 30)

                # Search API limits normally reset quickly. Do not burn most of
                # the job timeout waiting for an installation-wide hourly reset;
                # fail with an actionable message so a higher-limit token can be used.
                if delay > 120:
                    raise RuntimeError(
                        "GitHub API rate limit is exhausted and resets in about "
                        f"{delay} seconds. Configure the optional PROFILE_ACTIVITY_TOKEN "
                        f"repository secret with a fine-grained token, then retry. "
                        f"Last response: {body[:300]}"
                    ) from error

                time.sleep(delay)
                continue
            raise RuntimeError(f"GitHub API HTTP {error.code} for {url}: {body[:500]}") from error
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            if attempt == 3:
                raise RuntimeError(f"GitHub API request failed for {url}: {error}") from error
            time.sleep(2 ** attempt)
    raise RuntimeError(f"GitHub API request failed after retries: {url}")

def search_items(endpoint: str, query: str) -> list[dict]:
    """Fetch every matching result, partitioning date ranges when Search hits its cap."""
    base = f"https://api.github.com/search/{endpoint}"
    date_field = "author-date" if endpoint == "commits" else "created"
    sort_field = "author-date" if endpoint == "commits" else "updated"
    today = datetime.now(timezone.utc).date()

    def fetch_partition(start: date | None = None,
                        end: date | None = None) -> list[dict]:
        partition_query = query
        if start is not None and end is not None:
            partition_query = f"{query} {date_field}:{start.isoformat()}..{end.isoformat()}"
        params_base = {
            "q": partition_query,
            "sort": sort_field,
            "order": "desc",
            "per_page": PER_PAGE,
        }
        first_url = f"{base}?{urllib.parse.urlencode({**params_base, 'page': 1})}"
        first = request_json(first_url)
        total = int(first.get("total_count", 0))

        if total >= MAX_SEARCH_RESULTS:
            range_start = start or date(2008, 1, 1)
            range_end = end or today
            if range_start >= range_end:
                raise RuntimeError(
                    f"GitHub Search still reaches its {MAX_SEARCH_RESULTS}-result cap "
                    f"for {partition_query!r} on {range_start}; unable to guarantee completeness."
                )
            midpoint = range_start + (range_end - range_start) // 2
            right_start = midpoint + timedelta(days=1)
            return fetch_partition(range_start, midpoint) + fetch_partition(right_start, range_end)

        collected = list(first.get("items", []))
        pages = (total + PER_PAGE - 1) // PER_PAGE
        for page in range(2, pages + 1):
            url = f"{base}?{urllib.parse.urlencode({**params_base, 'page': page})}"
            result = request_json(url)
            collected.extend(result.get("items", []))
        return collected

    return fetch_partition()

def parse_timestamp(value: str) -> datetime:
    if not value:
        return datetime.min.replace(tzinfo=timezone.utc)
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return datetime.min.replace(tzinfo=timezone.utc)

def item_repo(item: dict, endpoint: str) -> str | None:
    repository = item.get("repository") or {}
    full_name = repository.get("full_name") or repository.get("nameWithOwner")
    if full_name:
        return str(full_name)
    repo_url = item.get("repository_url", "")
    match = re.search(r"/repos/([^/]+/[^/]+)$", repo_url)
    if match:
        return match.group(1)
    if endpoint == "commits":
        match = re.search(r"github\.com/([^/]+/[^/]+)/commit/", item.get("html_url", ""))
        if match:
            return match.group(1)
    return None

def contribution_date(item: dict, category: str, endpoint: str) -> str:
    # Event dates, not updated_at: a later comment from someone else must not
    # make the contributor's original action appear newly authored.
    if category == "merged_prs":
        return item.get("pull_request", {}).get("merged_at") or item.get("created_at", "")
    if endpoint == "commits":
        commit = item.get("commit") or {}
        author = commit.get("author") or {}
        return author.get("date") or (commit.get("committer") or {}).get("date", "")
    return item.get("created_at", "")

def new_group() -> dict:
    return {
        "url": "",
        "latest_date": datetime.min.replace(tzinfo=timezone.utc),
        "records": defaultdict(dict),
    }

def add_items(groups: dict, items: list[dict], endpoint: str, category: str) -> None:
    for item in items:
        full_name = item_repo(item, endpoint)
        url = item.get("html_url", "")
        if not full_name or "/" not in full_name or not url.startswith("https://github.com/"):
            continue
        if full_name.split("/", 1)[0].casefold() == USERNAME.casefold():
            continue
        date_value = contribution_date(item, category, endpoint)
        date = parse_timestamp(date_value)
        record = {
            "url": url,
            "date": date_value,
            "title": item.get("title", ""),
            "sha": str(item.get("sha", ""))[:7],
        }
        groups[full_name]["url"] = f"https://github.com/{full_name}"
        groups[full_name]["records"][category][url] = record
        if date > groups[full_name]["latest_date"]:
            groups[full_name]["latest_date"] = date

def add_discussions(groups: dict, discussions: list[dict]) -> None:
    for item in discussions:
        full_name, url = item.get("repository_full_name", ""), item.get("url", "")
        if not full_name or "/" not in full_name or not url.startswith("https://github.com/"):
            continue
        if full_name.split("/", 1)[0].casefold() == USERNAME.casefold():
            continue
        date_value = item.get("created_at") or item.get("updated_at", "")
        date = parse_timestamp(date_value)
        group = groups[full_name]
        group["url"] = f"https://github.com/{full_name}"
        group["records"]["discussions"][url] = {
            "url": url, "date": date_value, "title": item.get("title", ""), "sha": ""
        }
        if date > group["latest_date"]:
            group["latest_date"] = date

def search_actual_discussions() -> list[dict]:
    if not TOKEN:
        print("GITHUB_TOKEN missing; actual Discussions are omitted.", file=sys.stderr)
        return []
    query = """
    query($q: String!, $cursor: String) {
      search(query: $q, type: DISCUSSION, first: 100, after: $cursor) {
        nodes { ... on Discussion {
          title url createdAt updatedAt
          repository { nameWithOwner }
        }}
        pageInfo { hasNextPage endCursor }
      }
    }
    """
    found = {}
    for qualifier in (f"author:{USERNAME}", f"commenter:{USERNAME}"):
        cursor = None
        while True:
            data = request_json("https://api.github.com/graphql", {
                "query": query, "variables": {"q": qualifier, "cursor": cursor}
            })
            if data.get("errors"):
                raise RuntimeError(f"GitHub Discussions query failed: {data['errors']}")
            search = data.get("data", {}).get("search", {})
            for node in search.get("nodes", []):
                repo = node.get("repository") or {}
                if repo.get("nameWithOwner") and node.get("url"):
                    found[node["url"]] = {
                        "repository_full_name": repo["nameWithOwner"],
                        "url": node["url"],
                        "title": node.get("title", ""),
                        "created_at": node.get("createdAt", ""),
                        "updated_at": node.get("updatedAt", ""),
                    }
            info = search.get("pageInfo") or {}
            if not info.get("hasNextPage"):
                break
            cursor = info.get("endCursor")
            if not cursor:
                raise RuntimeError("Discussions pagination returned hasNextPage without endCursor.")
    return list(found.values())

def sorted_records(records: dict) -> list[dict]:
    return sorted(records.values(), key=lambda x: parse_timestamp(x.get("date", "")), reverse=True)

def render_links(records: dict, label: str) -> str:
    items = sorted_records(records)
    if not items:
        return ""

    pr_categories = {"merged PR", "open PR", "closed PR", "reviewed PR", "PR comment"}
    issue_categories = {"issue opened", "issue comment"}
    # Every PR number is displayed. Non-PR activity keeps a compact sample to
    # prevent commit/comment-heavy repositories from overwhelming the README.
    selected = items if label in pr_categories else items[:3]
    links = []
    for item in selected:
        url = item["url"]
        if label == "commit":
            name = f"commit {item['sha']}"
        elif label in pr_categories:
            match = re.search(r"/pull/(\d+)(?:$|[?#])", url)
            name = f"PR #{match.group(1)}" if match else "PR"
        elif label in issue_categories:
            match = re.search(r"/issues/(\d+)(?:$|[?#])", url)
            name = f"Issue #{match.group(1)}" if match else "Issue"
        else:
            title = item.get("title", "")
            name = f"Discussion — {title[:48]}" if title else "Discussion"
        links.append(f"[{name}]({url})")

    extra = len(items) - len(selected)
    suffix = f" · +{extra} more" if extra else ""
    return f"{len(items)} {label}{'s' if len(items) != 1 else ''}: " + " · ".join(links) + suffix

def render_markdown(groups: dict) -> str:
    labels = (
        ("merged_prs", "merged PR"),
        ("open_prs", "open PR"),
        ("closed_prs", "closed PR"),
        ("reviewed_prs", "reviewed PR"),
        ("pr_comments", "PR comment"),
        ("issues", "issue opened"),
        ("issue_comments", "issue comment"),
        ("discussions", "Discussion"),
        ("commits", "commit"),
    )
    rows = []
    for full_name, group in groups.items():
        evidence = [
            rendered for key, label in labels
            if (rendered := render_links(group["records"][key], label))
        ]
        if evidence:
            rows.append((group["latest_date"], full_name, group, "<br>".join(evidence)))
    rows.sort(key=lambda row: row[0], reverse=True)
    repo_count = len(rows)
    merged = sum(len(row[2]["records"]["merged_prs"]) for row in rows)
    opened = sum(len(row[2]["records"]["open_prs"]) for row in rows)
    closed = sum(len(row[2]["records"]["closed_prs"]) for row in rows)
    reviewed = sum(len(row[2]["records"]["reviewed_prs"]) for row in rows)
    commits = sum(len(row[2]["records"]["commits"]) for row in rows)

    lines = [
        START_MARKER,
        "## 🌐 Open Source & Community Contributions",
        "",
        "> Complete indexed public activity in repositories not owned by this account. Every discovered repository is listed, and every PR number is shown individually. Reviews, comments, issues, discussions and commits remain separate activity types; none implies maintainer acceptance or collaborator access.",
        "",
        f"**Indexed activity:** {repo_count} external repositories · {merged} merged PRs · {opened} open PRs · {closed} closed PRs (not merged) · {reviewed} reviewed PRs · {commits} authored commit records.",
        "",
        "| External repository | Public activity evidence | Most recent contribution event (IST) |",
        "| --- | --- | --- |",
    ]
    for date, full_name, group, evidence in rows:
        latest = date.astimezone(IST).strftime("%d %b %Y") if date.year > 1 else "—"
        safe_name = full_name.replace("|", "\\|")
        lines.append(f"| [{safe_name}]({group['url']}) | {evidence} | {latest} |")
    lines.extend([
        "",
        "<sub>Generated automatically from GitHub Search and Discussions APIs. Searches are partitioned by creation/author date when they approach GitHub's 1,000-result cap. All discovered external repositories and all PR numbers are displayed; non-PR records may be summarized to keep the table readable. GitHub indexing limitations still apply. Repositories owned by this account and private activity are excluded. Latest dates use contribution event dates, not later edits by other users.</sub>",
        END_MARKER,
    ])
    return "\n".join(lines)

def main() -> int:
    if not USERNAME:
        raise RuntimeError("GITHUB_USERNAME must not be empty.")
    if not os.path.isfile(README_PATH):
        raise RuntimeError(f"README not found: {README_PATH}")

    groups: dict = defaultdict(new_group)
    # Exclude repositories owned by this account at the API query level,
    # rather than downloading thousands of personal-repo records and discarding them.
    external_scope = f"-user:{USERNAME}"
    queries = [
        ("issues", f"author:{USERNAME} {external_scope} is:pr is:merged", "merged_prs"),
        ("issues", f"author:{USERNAME} {external_scope} is:pr is:open", "open_prs"),
        ("issues", f"author:{USERNAME} {external_scope} is:pr is:closed -is:merged", "closed_prs"),
        ("issues", f"reviewed-by:{USERNAME} {external_scope} is:pr", "reviewed_prs"),
        ("issues", f"commenter:{USERNAME} {external_scope} is:pr", "pr_comments"),
        ("issues", f"author:{USERNAME} {external_scope} is:issue", "issues"),
        ("issues", f"commenter:{USERNAME} {external_scope} is:issue", "issue_comments"),
        ("commits", f"author:{USERNAME} {external_scope}", "commits"),
    ]
    # All required queries must succeed before touching README.
    for endpoint, query, category in queries:
        print(f"Searching {endpoint}: {query}", flush=True)
        add_items(groups, search_items(endpoint, query), endpoint, category)
    add_discussions(groups, search_actual_discussions())

    with open(README_PATH, "r", encoding="utf-8", newline="") as file:
        original = file.read()
    if original.count(REFRESH_DATE_START_MARKER) != 1 or original.count(REFRESH_DATE_END_MARKER) != 1:
        raise RuntimeError("README must contain exactly one selected-contributions refresh marker pair.")
    date_start = original.index(REFRESH_DATE_START_MARKER) + len(REFRESH_DATE_START_MARKER)
    date_end = original.index(REFRESH_DATE_END_MARKER)
    if date_end < date_start:
        raise RuntimeError("Selected-contributions refresh markers are out of order.")
    refresh_date = datetime.now(IST).strftime("%d %B %Y")
    working = original[:date_start] + refresh_date + original[date_end:]

    if working.count(START_MARKER) != 1 or working.count(END_MARKER) != 1:
        raise RuntimeError("README must contain exactly one external-contributions marker pair.")
    start = working.index(START_MARKER)
    end = working.index(END_MARKER) + len(END_MARKER)
    if end <= start:
        raise RuntimeError("External-contributions markers are out of order.")
    updated = working[:start] + render_markdown(groups) + working[end:]
    if updated == original:
        print("Profile contribution data is already up to date.", flush=True)
        return 0

    temporary = README_PATH + ".tmp"
    with open(temporary, "w", encoding="utf-8", newline="") as file:
        file.write(updated)
    os.replace(temporary, README_PATH)
    print("Updated only the generated README sections.", flush=True)
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Contribution snapshot failed closed: {error}", file=sys.stderr)
        raise SystemExit(1)
