#!/usr/bin/env python3
"""Refresh public external-contribution evidence in the frpboy profile README.

Only the section between the dedicated README markers is changed. Public search
results are evidence of activity, not proof of collaborator permissions.
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

USERNAME = os.environ.get("GITHUB_USERNAME", "frpboy").strip()
TOKEN = os.environ.get("GITHUB_TOKEN", "").strip()
README_PATH = os.environ.get("README_PATH", "README.md")
START_MARKER = "<!-- EXTERNAL-CONTRIBUTIONS:START -->"
END_MARKER = "<!-- EXTERNAL-CONTRIBUTIONS:END -->"
MAX_PAGES_PER_QUERY = 3
IST = ZoneInfo("Asia/Kolkata")
API_HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}


def request_json(url: str, payload: dict | None = None) -> dict:
    headers = {
        **API_HEADERS,
        "User-Agent": f"{USERNAME}-profile-contributions-updater",
    }
    data = None
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"GitHub API returned HTTP {error.code} for {url}: {body[:500]}"
        ) from error
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Could not retrieve valid GitHub API data from {url}: {error}") from error


def search_items(endpoint: str, query: str) -> list[dict]:
    """Search issues/PRs or commits, following bounded pagination."""
    collected: list[dict] = []
    base_url = f"https://api.github.com/search/{endpoint}"
    sort_field = "committer-date" if endpoint == "commits" else "updated"
    for page in range(1, MAX_PAGES_PER_QUERY + 1):
        params = urllib.parse.urlencode(
            {
                "q": query,
                "sort": sort_field,
                "order": "desc",
                "per_page": 100,
                "page": page,
            }
        )
        result = request_json(f"{base_url}?{params}")
        items = result.get("items", [])
        collected.extend(items)
        total_count = int(result.get("total_count", len(collected)))
        if page * 100 >= total_count or len(items) < 100:
            break
    return collected


def search_actual_discussions() -> list[dict]:
    """Use GraphQL Discussion nodes, never PR/issue comments mislabeled as discussions."""
    if not TOKEN:
        print("GITHUB_TOKEN missing; skipping actual GitHub Discussions.", file=sys.stderr)
        return []

    query_template = """
    query($q: String!, $cursor: String) {
      search(query: $q, type: DISCUSSION, first: 100, after: $cursor) {
        nodes {
          ... on Discussion {
            title
            url
            updatedAt
            repository {
              nameWithOwner
              owner { login }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
    """
    records_by_url: dict[str, dict] = {}
    for qualifier in (f"author:{USERNAME}", f"commenter:{USERNAME}"):
        cursor = None
        for _ in range(MAX_PAGES_PER_QUERY):
            variables = {"q": qualifier, "cursor": cursor}
            try:
                data = request_json(
                    "https://api.github.com/graphql",
                    {"query": query_template, "variables": variables},
                )
            except RuntimeError as error:
                print(
                    f"Could not query actual Discussions ({qualifier}); leaving them out: {error}",
                    file=sys.stderr,
                )
                break

            if data.get("errors"):
                print(
                    f"GitHub GraphQL did not return Discussions for {qualifier}; "
                    f"leaving them out: {str(data['errors'])[:300]}",
                    file=sys.stderr,
                )
                break

            search = (data.get("data") or {}).get("search") or {}
            for node in search.get("nodes", []):
                if not node or not node.get("url") or not node.get("repository"):
                    continue
                repo = node["repository"]
                full_name = repo.get("nameWithOwner", "")
                if not full_name:
                    continue
                if full_name.split("/", 1)[0].casefold() == USERNAME.casefold():
                    continue
                records_by_url[node["url"]] = {
                    "repository_full_name": full_name,
                    "url": node["url"],
                    "title": node.get("title", "GitHub Discussion"),
                    "updated_at": node.get("updatedAt", ""),
                }

            page_info = search.get("pageInfo") or {}
            if not page_info.get("hasNextPage"):
                break
            cursor = page_info.get("endCursor")
            if not cursor:
                break

    return list(records_by_url.values())


def repository_full_name(item: dict, endpoint: str) -> str | None:
    repository = item.get("repository") or {}
    full_name = repository.get("full_name")
    if full_name:
        return str(full_name)
    repository_url = item.get("repository_url", "")
    match = re.search(r"/repos/([^/]+/[^/]+)$", repository_url)
    if match:
        return match.group(1)
    if endpoint == "commits":
        match = re.search(r"github\.com/([^/]+/[^/]+)/commit/", item.get("html_url", ""))
        if match:
            return match.group(1)
    return None


def timestamp_for(item: dict, endpoint: str) -> str:
    if endpoint == "commits":
        commit = item.get("commit") or {}
        author = commit.get("author") or {}
        committer = commit.get("committer") or {}
        return author.get("date") or committer.get("date") or ""
    return item.get("updated_at") or item.get("created_at") or ""


def parse_timestamp(value: str) -> datetime:
    if not value:
        return datetime.min.replace(tzinfo=timezone.utc)
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return datetime.min.replace(tzinfo=timezone.utc)


def issue_number(url: str) -> str:
    match = re.search(r"/(\d+)(?:$|[?#])", url)
    return match.group(1) if match else "link"


def new_group() -> dict:
    return {
        "url": "",
        "latest_date": datetime.min.replace(tzinfo=timezone.utc),
        "merged_prs": [],
        "open_prs": [],
        "closed_prs": [],
        "reviewed_prs": [],
        "pr_comments": [],
        "issues": [],
        "issue_comments": [],
        "discussions": [],
        "commits": [],
    }


def add_items(groups: dict, items: list[dict], endpoint: str, category: str) -> None:
    for item in items:
        full_name = repository_full_name(item, endpoint)
        if not full_name or "/" not in full_name:
            continue
        owner = full_name.split("/", 1)[0]
        # This section deliberately excludes every repository owned by the profile user.
        if owner.casefold() == USERNAME.casefold():
            continue
        url = item.get("html_url", "")
        if not url.startswith("https://github.com/"):
            continue

        group = groups[full_name]
        group["url"] = f"https://github.com/{full_name}"
        date_value = timestamp_for(item, endpoint)
        date = parse_timestamp(date_value)
        if date > group["latest_date"]:
            group["latest_date"] = date
        entry = {
            "url": url,
            "date": date_value,
            "number": issue_number(url),
            "sha": str(item.get("sha", ""))[:7],
            "title": item.get("title", ""),
        }
        if endpoint == "commits":
            group["commits"].append(entry)
        else:
            group[category].append(entry)


def add_discussions(groups: dict, discussions: list[dict]) -> None:
    for item in discussions:
        full_name = item.get("repository_full_name", "")
        url = item.get("url", "")
        if not full_name or "/" not in full_name or not url.startswith("https://github.com/"):
            continue
        if full_name.split("/", 1)[0].casefold() == USERNAME.casefold():
            continue
        group = groups[full_name]
        group["url"] = f"https://github.com/{full_name}"
        date_value = item.get("updated_at", "")
        date = parse_timestamp(date_value)
        if date > group["latest_date"]:
            group["latest_date"] = date
        group["discussions"].append(
            {
                "url": url,
                "date": date_value,
                "number": issue_number(url),
                "sha": "",
                "title": item.get("title", ""),
            }
        )


def unique_newest(items: list[dict]) -> list[dict]:
    by_url = {item["url"]: item for item in items if item.get("url")}
    return sorted(
        by_url.values(),
        key=lambda item: parse_timestamp(item.get("date", "")),
        reverse=True,
    )


def linked_items(items: list[dict], label: str, limit: int = 2) -> str:
    records = unique_newest(items)
    if not records:
        return ""
    links = []
    for item in records[:limit]:
        if label == "commit":
            item_label = f"commit {item['sha']}"
        else:
            item_label = f"{label} #{item['number']}"
        links.append(f"[{item_label}]({item['url']})")
    suffix = f" +{len(records) - limit} more" if len(records) > limit else ""
    count_label = f"{len(records)} {label}{'s' if len(records) != 1 else ''}"
    return f"{count_label}: " + " · ".join(links) + suffix


def render_markdown(groups: dict) -> str:
    categories = (
        ("merged_prs", "merged PR"),
        ("open_prs", "open PR"),
        ("closed_prs", "closed PR"),
        ("reviewed_prs", "PR review"),
        ("pr_comments", "PR comment"),
        ("issues", "issue opened"),
        ("issue_comments", "issue comment"),
        ("discussions", "Discussion"),
        ("commits", "commit"),
    )
    populated = []
    for full_name, group in groups.items():
        evidence = [
            rendered
            for key, label in categories
            if (rendered := linked_items(group[key], label))
        ]
        if evidence:
            populated.append((group["latest_date"], full_name, group, "<br>".join(evidence)))

    populated.sort(key=lambda row: row[0], reverse=True)
    populated = populated[:30]

    total_repos = len(populated)
    merged_prs = sum(len(unique_newest(row[2]["merged_prs"])) for row in populated)
    open_prs = sum(len(unique_newest(row[2]["open_prs"])) for row in populated)
    commits = sum(len(unique_newest(row[2]["commits"])) for row in populated)
    reviewed_prs = sum(len(unique_newest(row[2]["reviewed_prs"])) for row in populated)

    lines = [
        START_MARKER,
        "## 🌐 Open Source & Community Contributions",
        "",
        "> Public repositories beyond my own where I have contributed code, submitted PRs, reviewed pull requests, opened issues, commented, or participated in actual GitHub Discussions. Only public, discoverable records are shown.",
        "",
    ]
    if populated:
        lines.extend(
            [
                f"**Public activity snapshot:** {total_repos} external repositories · {merged_prs} merged PR records · {open_prs} open PR records · {reviewed_prs} PR review records · {commits} commit records.",
                "",
                "| External repository | Verified public activity | Most recent record update (IST) |",
                "| --- | --- | --- |",
            ]
        )
        for date, full_name, group, evidence in populated:
            latest = date.astimezone(IST).strftime("%d %b %Y") if date.year > 1 else "—"
            safe_name = full_name.replace("|", "\\|")
            lines.append(f"| [{safe_name}]({group['url']}) | {evidence} | {latest} |")
    else:
        lines.extend(
            [
                "No qualifying public contribution or participation records were returned by GitHub search during this run.",
                "",
                f"Repositories owned by {USERNAME} are intentionally excluded.",
            ]
        )

    lines.extend(
        [
            "",
            "<sub>Updated automatically by GitHub Actions. Search-based snapshot, not an exhaustive all-time count. Record update dates can reflect repository activity after the original contribution. Public activity does not prove collaborator access or maintainer acceptance. Private repositories are excluded.</sub>",
            END_MARKER,
        ]
    )
    return "\n".join(lines)


def main() -> int:
    if not USERNAME:
        print("GITHUB_USERNAME must not be empty.", file=sys.stderr)
        return 2
    if not os.path.isfile(README_PATH):
        print(f"README not found: {README_PATH}", file=sys.stderr)
        return 2

    groups: dict = defaultdict(new_group)
    queries = [
        ("issues", f"author:{USERNAME} is:pr is:merged", "merged_prs"),
        ("issues", f"author:{USERNAME} is:pr is:open", "open_prs"),
        ("issues", f"author:{USERNAME} is:pr is:closed -is:merged", "closed_prs"),
        ("issues", f"reviewed-by:{USERNAME} is:pr", "reviewed_prs"),
        ("issues", f"commenter:{USERNAME} is:pr", "pr_comments"),
        ("issues", f"author:{USERNAME} is:issue", "issues"),
        ("issues", f"commenter:{USERNAME} is:issue", "issue_comments"),
        ("commits", f"author:{USERNAME}", "commits"),
    ]

    # Do not touch the README until public search requests have completed.
    for endpoint, query, category in queries:
        print(f"Searching GitHub {endpoint}: {query}")
        add_items(groups, search_items(endpoint, query), endpoint, category)

    # GraphQL returns true Discussion nodes; failures skip only this optional category.
    add_discussions(groups, search_actual_discussions())

    with open(README_PATH, "r", encoding="utf-8", newline="") as file:
        original = file.read()

    if original.count(START_MARKER) != 1 or original.count(END_MARKER) != 1:
        print(
            "README must contain exactly one external-contributions start and end marker. "
            "No changes were written.",
            file=sys.stderr,
        )
        return 2

    start = original.index(START_MARKER)
    end = original.index(END_MARKER) + len(END_MARKER)
    if end <= start:
        print("External-contributions markers are out of order. No changes were written.", file=sys.stderr)
        return 2

    updated = original[:start] + render_markdown(groups) + original[end:]
    if updated == original:
        print("External-contributions section is already up to date.")
        return 0

    temporary_path = README_PATH + ".tmp"
    with open(temporary_path, "w", encoding="utf-8", newline="") as file:
        file.write(updated)
    os.replace(temporary_path, README_PATH)
    print(f"Updated only the marked section in {README_PATH}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
