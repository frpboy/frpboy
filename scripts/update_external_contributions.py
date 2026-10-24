#!/usr/bin/env python3
"""Refresh the external-contributions section of the frpboy profile README."""

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


def get_json(url: str) -> dict:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": f"{USERNAME}-profile-contributions-updater",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"GitHub API returned HTTP {error.code} for {url}: {body[:500]}") from error
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Could not retrieve valid GitHub API data from {url}: {error}") from error


def search_items(endpoint: str, query: str) -> list[dict]:
    collected: list[dict] = []
    first_page_url = "https://api.github.com/search/" + endpoint
    sort_field = "committer-date" if endpoint == "commits" else "updated"
    pages_data = []
    for page in range(1, MAX_PAGES_PER_QUERY + 1):
        params = urllib.parse.urlencode(
            {"q": query, "sort": sort_field, "order": "desc", "per_page": 100, "page": page}
        )
        data = get_json(f"{first_page_url}?{params}")
        pages_data.append(data)
        collected.extend(data.get("items", []))
        total_count = int(data.get("total_count", len(collected)))
        if page * 100 >= total_count or len(data.get("items", [])) < 100:
            break
    return collected


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
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return datetime.min.replace(tzinfo=timezone.utc)


def issue_number(url: str) -> str:
    match = re.search(r"/(\d+)(?:$|[?#])", url)
    return match.group(1) if match else "link"


def add_items(groups: dict, items: list[dict], endpoint: str, category: str) -> None:
    for item in items:
        full_name = repository_full_name(item, endpoint)
        if not full_name or "/" not in full_name:
            continue
        owner = full_name.split("/", 1)[0]
        # The section intentionally excludes every repository owned by the profile user.
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
        }
        if endpoint == "commits":
            group["commits"].append(entry)
        else:
            group[category].append(entry)


def unique_newest(items: list[dict]) -> list[dict]:
    by_url = {item["url"]: item for item in items if item.get("url")}
    return sorted(by_url.values(), key=lambda item: parse_timestamp(item.get("date", "")), reverse=True)


def linked_items(items: list[dict], label: str, limit: int = 2) -> str:
    items = unique_newest(items)
    if not items:
        return ""
    links = []
    for item in items[:limit]:
        item_label = f"{label} #{item['number']}" if label != "commit" else f"commit {item['sha']}"
        links.append(f"[{item_label}]({item['url']})")
    suffix = f" +{len(items) - limit} more" if len(items) > limit else ""
    count_label = f"{len(items)} {label}{'s' if len(items) != 1 else ''}"
    return f"{count_label}: " + " · ".join(links) + suffix


def render_markdown(groups: dict) -> str:
    populated = []
    for full_name, group in groups.items():
        evidence = []
        for key, label in (
            ("merged_prs", "merged PR"),
            ("open_prs", "open PR"),
            ("closed_prs", "closed PR"),
            ("commits", "commit"),
            ("issues", "issue"),
            ("discussions", "discussion"),
        ):
            rendered = linked_items(group[key], label)
            if rendered:
                evidence.append(rendered)
        if evidence:
            populated.append((group["latest_date"], full_name, group, "<br>".join(evidence)))

    populated.sort(key=lambda row: row[0], reverse=True)
    populated = populated[:30]

    total_repos = len(populated)
    merged_prs = sum(len(unique_newest(row[2]["merged_prs"])) for row in populated)
    open_prs = sum(len(unique_newest(row[2]["open_prs"])) for row in populated)
    commits = sum(len(unique_newest(row[2]["commits"])) for row in populated)

    lines = [
        START_MARKER,
        "## 🌐 Open Source & Community Contributions",
        "",
        "> Public repositories beyond my own where I have contributed code, submitted pull requests, opened issues, or participated in discussions. Repository links and activity records are discovered automatically from GitHub.",
        "",
    ]
    if populated:
        lines.extend(
            [
                f"**Recent public activity found:** {total_repos} external repositories in this snapshot · {merged_prs} merged PR records · {open_prs} open PR records · {commits} commit records.",
                "",
                "| Repository | Contribution / participation evidence | Latest activity (IST) |",
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
                "Repositories owned by frpboy are intentionally excluded.",
            ]
        )

    lines.extend(
        [
            "",
            "<sub>Automatically refreshed by GitHub Actions. This is a search-based snapshot of public activity, not an exhaustive all-time contribution count. Public search cannot reliably identify private collaboration access, and a contribution does not imply collaborator permissions or acceptance by a maintainer.</sub>",
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

    # Complete every API request before touching the README. A failed request leaves it intact.
    groups: dict = defaultdict(
        lambda: {
            "url": "",
            "latest_date": datetime.min.replace(tzinfo=timezone.utc),
            "merged_prs": [],
            "open_prs": [],
            "closed_prs": [],
            "commits": [],
            "issues": [],
            "discussions": [],
        }
    )

    queries = [
        ("issues", f"author:{USERNAME} is:pr is:merged", "merged_prs"),
        ("issues", f"author:{USERNAME} is:pr is:open", "open_prs"),
        ("issues", f"author:{USERNAME} is:pr is:closed -is:merged", "closed_prs"),
        ("issues", f"author:{USERNAME} is:issue", "issues"),
        ("issues", f"commenter:{USERNAME}", "discussions"),
        ("commits", f"author:{USERNAME}", "commits"),
    ]

    for endpoint, query, category in queries:
        print(f"Searching GitHub {endpoint}: {query}")
        items = search_items(endpoint, query)
        add_items(groups, items, endpoint, category)

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

    replacement = render_markdown(groups)
    updated = original[:start] + replacement + original[end:]
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
