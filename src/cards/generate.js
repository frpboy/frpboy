"use strict";

/**
 * The nine self-hosted card generators. Each takes the computed analytics,
 * the raw snapshot (for freshness footers) and a theme, and returns a
 * complete SVG string. All numbers come from the snapshot; coverage caveats
 * are printed on the cards instead of inventing precision.
 */

const { openSvg, text, cardTitle, barRow, donut, areaPath, isoCube, footer } = require("./svg");
const { langColor } = require("./theme");
const { esc, num } = require("../security/escape");
const { istDisplay, addDays, istToday } = require("../utils/time");

function fmtInt(n) {
  if (n == null || !Number.isFinite(Number(n))) return "n/a";
  return Number(n).toLocaleString("en-US");
}

function freshnessLine(snapshot) {
  const date = snapshot.generated_at ? snapshot.generated_at.slice(0, 10) : "unknown";
  return `refreshed ${istDisplay(date)} IST`;
}

function historyNote(analytics) {
  const c = analytics.meta.completeness;
  return c && c.history_complete === false ? " · history backfilling" : "";
}

// 5.1 Achievements / trophies ------------------------------------------------
function trophiesCard(a, s, theme) {
  const W = 800, H = 168;
  const items = a.achievements.slice(0, 8);
  const colW = (W - 24) / 8;
  const cal = a.streak && a.streak.source === "github-calendar";
  let out = openSvg(W, H, theme, "GitHub achievements", "Achievement milestones computed from visible GitHub activity");
  out += cardTitle(16, 26, cal ? "Achievements (visible-activity milestones)" : "Achievements (public milestones)", theme);
  if (cal) out += text(16, 40, "streak/day milestones: all-visible calendar; repo/PR/star milestones: public-only", { size: 8.5, fill: theme.muted });
  const tierColor = { Bronze: theme.bronze, Silver: theme.silver, Gold: theme.gold, Locked: theme.locked };
  items.forEach((ach, i) => {
    const cx = 16 + colW * i + colW / 2;
    const cy = 72;
    const color = tierColor[ach.tier] || theme.bar_bg;
    out += `<circle cx="${num(cx)}" cy="${num(cy)}" r="24" fill="none" stroke="${esc(color)}" stroke-width="3"${ach.tier === "Locked" ? ' stroke-dasharray="4 4"' : ""}/>`;
    out += text(cx, cy + 5, ach.tier === "Locked" ? "–" : String(ach.tier_level), { size: 16, fill: color, anchor: "middle", weight: "700" });
    out += text(cx, cy + 42, ach.label, { size: 9.5, fill: theme.text, anchor: "middle" });
    out += text(cx, cy + 56, `${fmtInt(ach.value)} ${ach.unit}`, { size: 8.5, fill: theme.muted, anchor: "middle" });
    out += text(cx, cy + 68, ach.tier, { size: 8.5, fill: color, anchor: "middle", weight: "600" });
  });
  out += text(W - 16, 20, freshnessLine(s) + historyNote(a), { size: 9, fill: theme.muted, anchor: "end", opacity: 0.85 });
  return out + "</svg>";
}

// 5.2 Overall performance ----------------------------------------------------
function statsCard(a, s, theme) {
  const W = 495, H = 195;
  const t = a.totals;
  let out = openSvg(W, H, theme, "GitHub statistics", "Overall GitHub statistics from public data");
  out += cardTitle(20, 30, `${a.profile.login}'s GitHub Statistics`, theme);
  const left = [
    ["Total Stars Received", fmtInt(t.stars_received)],
    ["Public Repositories", fmtInt(t.repos_public)],
    ["Total PRs", fmtInt(t.prs)],
    ["  Merged / Open", `${fmtInt(t.prs_merged)} / ${fmtInt(t.prs_open)}`],
  ];
  const right = [
    ["Total Forks Received", fmtInt(t.forks_received)],
    ["Collected Public Commits", fmtInt(t.commits_collected) + (a.meta.completeness.history_complete ? "" : "*")],
    ["Total Issues", fmtInt(t.issues)],
    ["Followers / Following", `${fmtInt(a.profile.followers)} / ${fmtInt(a.profile.following)}`],
  ];
  left.forEach(([k, v], i) => {
    const y = 58 + i * 26;
    out += text(20, y, k, { size: 12, fill: theme.text });
    out += text(240, y, v, { size: 12, fill: theme.accent, weight: "600", anchor: "end" });
  });
  right.forEach(([k, v], i) => {
    const y = 58 + i * 26;
    out += text(265, y, k, { size: 12, fill: theme.text });
    out += text(478, y, v, { size: 12, fill: theme.accent, weight: "600", anchor: "end" });
  });
  if (!a.meta.completeness.history_complete) {
    out += text(20, 172, "* public commits collected so far; monthly backfill in progress, heavy months are lower bounds", { size: 9.5, fill: theme.muted });
  }
  out += footer(W, H, theme, freshnessLine(s));
  return out + "</svg>";
}

// 5.3 Contribution streak ------------------------------------------------------
function streakCard(a, s, theme) {
  const st = a.streak;
  const pub = a.streak_events;
  const fromCalendar = st.source === "github-calendar";
  const W = 495;
  const H = fromCalendar ? 242 : 195;
  let out = openSvg(W, H, theme, "Contribution streak", "Contribution streak from GitHub's all-visible calendar, with the public-only events ledger shown separately");
  out += cardTitle(20, 30, fromCalendar ? "Contribution Streak" : "Contribution Streak (public activity)", theme);
  if (fromCalendar) {
    out += text(20, 48, "All visible activity · GitHub calendar, incl. anonymized private contributions", { size: 9, fill: theme.muted });
  }
  // Single progress ring: muted track with the arc on top, identical geometry.
  const cy = fromCalendar ? 112 : 116;
  const frac = Math.min(1, st.current / Math.max(1, st.longest));
  out += `<circle cx="85" cy="${cy}" r="40" fill="none" stroke="${theme.bar_bg}" stroke-width="9"/>`;
  if (st.current > 0) {
    const c = 2 * Math.PI * 40;
    out += `<circle cx="85" cy="${cy}" r="40" fill="none" stroke="${theme.orange}" stroke-width="9" stroke-dasharray="${num(c * frac)} ${num(c)}" transform="rotate(-90 85 ${cy})" stroke-linecap="round"/>`;
  }
  out += text(85, cy - 5, fmtInt(st.current), { size: 22, fill: theme.orange, anchor: "middle", weight: "700" });
  out += text(85, cy + 14, st.current === 1 ? "day" : "days", { size: 10, fill: theme.muted, anchor: "middle" });
  out += text(85, cy + 58, "Current streak", { size: 11, fill: theme.text, anchor: "middle" });
  if (!fromCalendar) {
    out += text(20, 185, "public-events approximation; GitHub contribution calendar not used", { size: 8.5, fill: theme.muted });
  }
  const col2 = [
    ["Longest streak", `${fmtInt(st.longest)} days`],
    ["Best range", st.longest > 0 ? `${istDisplay(st.longest_range.from)} – ${istDisplay(st.longest_range.to)}` : "n/a"],
    ["Total active days", fmtInt(st.total_days)],
    [fromCalendar ? "Total contributions" : "Total public events", fmtInt(st.total_contributions)],
    [fromCalendar ? "First recorded contribution" : "First recorded event", st.first_day ? istDisplay(st.first_day) : "n/a"],
  ];
  col2.forEach(([k, v], i) => {
    const y = (fromCalendar ? 62 : 60) + i * 25;
    out += text(180, y, k, { size: 11.5, fill: theme.text });
    out += text(478, y, v, { size: 11.5, fill: theme.accent, weight: "600", anchor: "end" });
  });
  if (fromCalendar && pub) {
    // Public-only dataset, shown separately; never summed with the calendar.
    out += `<line x1="20" y1="188" x2="475" y2="188" stroke="${theme.border}"/>`;
    out += text(20, 203, "Public-only (events ledger)", { size: 10, fill: theme.text, weight: "600" });
    out += text(478, 203, `current ${fmtInt(pub.current)}d · longest ${fmtInt(pub.longest)}d`, { size: 9.5, fill: theme.accent, anchor: "end", weight: "600" });
    out += text(20, 215, `${fmtInt(pub.total_contributions)} public events since ${pub.first_day ? istDisplay(pub.first_day) : "n/a"} · separate sources, never summed`, { size: 8.5, fill: theme.muted });
  }
  out += footer(W, H, theme, freshnessLine(s) + historyNote(a));
  return out + "</svg>";
}

// 5.4 Languages ----------------------------------------------------------------
function languagesCard(a, s, theme) {
  const W = 495;
  const lang = a.languages;
  const items = lang.available ? lang.items : [];
  const cols = 3;
  const colW = (W - 40) / cols;
  const rows = Math.max(1, Math.ceil(items.length / cols));
  const legendY = 84, rowH = 20;
  const H = legendY + rows * rowH + 52;
  let out = openSvg(W, H, theme, "Language proportions", "Every detected language by byte share across public repositories; no cutoff");
  out += cardTitle(20, 30, `Languages (all ${items.length}, public repos, by bytes)`, theme);
  if (!lang.available) {
    out += text(20, 60, "Language data not collected yet.", { size: 12, fill: theme.muted });
    return out + footer(W, H, theme, freshnessLine(s)) + "</svg>";
  }
  // Stacked bar: every language in proportion, nothing aggregated away.
  const barX = 20, barY = 44, barW = W - 40, barH = 16;
  let x = barX;
  items.forEach((item) => {
    const w = (item.percent / 100) * barW;
    if (w <= 0) return;
    out += `<rect x="${num(x)}" y="${barY}" width="${num(w)}" height="${barH}" fill="${esc(langColor(item.name, theme))}"${x === barX ? ' rx="3"' : ""}/>`;
    x += w;
  });
  // Full legend: every language named, 3 columns, percent rounded to 0.1%.
  items.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const lx = 20 + col * colW;
    const ly = legendY + row * rowH;
    const name = item.name.length > 15 ? item.name.slice(0, 14) + "…" : item.name;
    const pct = item.percent === 0 && item.bytes > 0 ? "<0.1%" : `${item.percent}%`;
    out += `<circle cx="${num(lx + 4)}" cy="${num(ly - 3.5)}" r="4" fill="${esc(langColor(item.name, theme))}"/>`;
    out += text(lx + 13, ly, name, { size: 9.5, fill: theme.text });
    out += text(lx + colW - 6, ly, pct, { size: 9.5, fill: theme.muted, anchor: "end" });
  });
  const fy = legendY + rows * rowH + 14;
  out += text(20, fy, `GitHub Linguist bytes across ${fmtInt(lang.repos_covered)} public repos (forks included, private excluded; vendored/generated excluded by GitHub).`, { size: 8.5, fill: theme.muted });
  out += text(20, fy + 12, "Percents rounded to 0.1%; may not sum to 100.", { size: 8.5, fill: theme.muted });
  out += footer(W, H, theme, freshnessLine(s));
  return out + "</svg>";
}

// 5.5 Productivity (IST) -------------------------------------------------------
function productivityCard(a, s, theme) {
  const W = 495, H = 195;
  let out = openSvg(W, H, theme, "Peak productivity IST", "Commit activity by hour, Asia/Kolkata timezone");
  out += cardTitle(20, 30, "Peak Productivity (IST +05:30)", theme);
  const p = a.productivity;
  if (!p.available) {
    out += text(20, 60, "Commit timing data not collected yet.", { size: 12, fill: theme.muted });
    return out + footer(W, H, theme, freshnessLine(s)) + "</svg>";
  }
  const chartX = 20, chartY = 46, chartW = 300, chartH = 100;
  const max = Math.max(1, ...p.by_hour);
  const bw = chartW / 24;
  p.by_hour.forEach((n, h) => {
    const bh = (n / max) * chartH;
    const isBest = h === p.best_hour;
    out += `<rect x="${num(chartX + h * bw + 1)}" y="${num(chartY + chartH - bh)}" width="${num(bw - 2)}" height="${num(Math.max(1, bh))}" rx="2" fill="${isBest ? theme.orange : theme.accent}"${isBest ? "" : ' opacity="0.75"'}/>`;
    if (h % 6 === 0) out += text(chartX + h * bw + bw / 2, chartY + chartH + 14, `${h}:00`, { size: 8.5, fill: theme.muted, anchor: "middle" });
  });
  const right = [
    ["Top hour", p.best_hour != null ? `${String(p.best_hour).padStart(2, "0")}:00–${String((p.best_hour + 1) % 24).padStart(2, "0")}:00` : "n/a"],
    ["Top weekday", p.best_weekday || "n/a"],
    ["Morning", fmtInt(p.buckets.morning)],
    ["Afternoon", fmtInt(p.buckets.afternoon)],
    ["Evening", fmtInt(p.buckets.evening)],
    ["Night", fmtInt(p.buckets.night)],
  ];
  right.forEach(([k, v], i) => {
    const y = 52 + i * 20;
    out += text(340, y, k, { size: 10.5, fill: theme.text });
    out += text(478, y, v, { size: 10.5, fill: theme.accent, weight: "600", anchor: "end" });
  });
  out += text(340, 168, "05–12 / 12–17 / 17–22 / 22–05 IST", { size: 8.5, fill: theme.muted });
  out += text(20, 170, `${fmtInt(p.sample_commits)} public commits · ${p.window.from ? istDisplay(p.window.from) : "?"} – ${p.window.to ? istDisplay(p.window.to) : "?"}`, { size: 8.5, fill: theme.muted });
  out += text(20, 182, "Git activity, not hours worked.", { size: 8.5, fill: theme.muted });
  out += footer(W, H, theme, freshnessLine(s));
  return out + "</svg>";
}

// 5.6 Summary ------------------------------------------------------------------
function summaryCard(a, s, theme) {
  const st = a.streak;
  const fromCalendar = st.source === "github-calendar";
  const W = 495, H = fromCalendar ? 198 : 170;
  let out = openSvg(W, H, theme, "GitHub profile summary", "Concise GitHub profile summary; all-visible and public-only activity shown separately");
  out += cardTitle(20, 30, `${a.profile.name} · GitHub Summary`, theme);
  const topLang = a.languages.available && a.languages.items.length ? a.languages.items[0].name : "n/a";
  const rows = [
    ["On GitHub since", istDisplay(a.profile.created_at.slice(0, 10))],
    ["Public repos", fmtInt(a.totals.repos_public)],
    [fromCalendar ? "Active days (all visible)" : "Active days", `${fmtInt(st.total_days)} (best streak ${fmtInt(st.longest)})`],
    ["Top language", topLang],
    [fromCalendar ? "Public events (90d)" : "Recent activity (90d)", `${fmtInt(a.activity_events.points.reduce((sum, p) => sum + p.count, 0))} public events`],
    ["Most active weekday", a.productivity.best_weekday || "n/a"],
  ];
  if (fromCalendar) {
    rows.push(["All visible (90d)", `${fmtInt(a.activity.points.reduce((sum, p) => sum + p.count, 0))} contributions`]);
  }
  rows.forEach(([k, v], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 20 + col * 250;
    const y = 58 + row * 28;
    out += text(x, y, k, { size: 11, fill: theme.muted });
    out += text(x, y + 15, v, { size: 12.5, fill: theme.text, weight: "600" });
  });
  if (fromCalendar) {
    out += text(20, H - 22, "All visible = GitHub calendar, incl. anonymized private contributions. Public events = public-only ledger. Never summed.", { size: 8.5, fill: theme.muted });
  }
  out += footer(W, H, theme, freshnessLine(s));
  return out + "</svg>";
}

// 5.7 Repository breakdown -------------------------------------------------------
function repositoriesCard(a, s, theme) {
  const W = 495;
  const r = a.repositories;
  const items = r.available ? r.items : [];
  const cols = 3;
  const colW = (W - 40) / cols;
  const rows = Math.max(1, Math.ceil(items.length / cols));
  const legendY = 178, rowH = 19;
  const H = legendY + rows * rowH + 40;
  let out = openSvg(W, H, theme, "Repository breakdown", "Public repository distribution by primary language; every language group listed");
  out += cardTitle(20, 30, "Repository Breakdown (public repos, by count)", theme);
  if (!r.available) {
    out += text(20, 60, "Repository data not collected yet.", { size: 12, fill: theme.muted });
    return out + footer(W, H, theme, freshnessLine(s)) + "</svg>";
  }
  const segments = items.map((it) => ({ value: it.count, color: langColor(it.name, theme) }));
  out += donut(85, 100, 42, 20, segments);
  out += text(85, 96, fmtInt(r.total), { size: 20, fill: theme.text, anchor: "middle", weight: "700" });
  out += text(85, 112, "repos", { size: 10, fill: theme.muted, anchor: "middle" });
  out += text(370, 54, `Forks: ${fmtInt(r.forks)}`, { size: 11, fill: theme.text });
  out += text(370, 76, `Archived: ${fmtInt(r.archived)}`, { size: 11, fill: theme.text });
  out += text(370, 98, "Counts, not code bytes.", { size: 9.5, fill: theme.muted });
  if (r.top_starred.length && r.top_starred[0].stars > 0) {
    out += text(370, 116, "Top starred:", { size: 10, fill: theme.muted });
    r.top_starred.slice(0, 3).forEach((repo, i) => {
      out += text(370, 131 + i * 15, `${repo.name} ★${fmtInt(repo.stars)}`, { size: 9.5, fill: theme.text });
    });
  }
  // Full legend: every primary-language group, no cutoff.
  items.forEach((it, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const lx = 20 + col * colW;
    const ly = legendY + row * rowH;
    const name = it.name.length > 16 ? it.name.slice(0, 15) + "…" : it.name;
    out += `<circle cx="${num(lx + 4)}" cy="${num(ly - 3.5)}" r="4" fill="${esc(langColor(it.name, theme))}"/>`;
    out += text(lx + 13, ly, name, { size: 9.5, fill: theme.text });
    out += text(lx + colW - 6, ly, `${it.count} (${it.percent}%)`, { size: 9.5, fill: theme.muted, anchor: "end" });
  });
  out += text(20, legendY + rows * rowH + 12, "Primary language per repo; complete repo listing (paginated). Private repos excluded.", { size: 8.5, fill: theme.muted });
  out += footer(W, H, theme, freshnessLine(s));
  return out + "</svg>";
}

// 5.8 Commit infrastructure (isometric) ------------------------------------------
function infrastructureCard(a, s, theme) {
  const W = 495, H = 208;
  let out = openSvg(W, H, theme, "Commit infrastructure", "Isometric blocks of recent public GitHub activity");
  out += cardTitle(20, 30, "Commit Infrastructure (14 days)", theme);
  const today = istToday();
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(today, -i);
    days.push({ date: d, count: (s.activity.commit_days || {})[d] || 0 });
  }
  const max = Math.max(1, ...days.map((d) => d.count));
  // Two rows of 7 iso cubes on a grid.
  days.forEach((d, i) => {
    const row = Math.floor(i / 7);
    const col = i % 7;
    const cx = 70 + col * 60 + row * 30;
    const cy = 92 + row * 42;
    const h = d.count === 0 ? 2 : 6 + (d.count / max) * 26;
    const intensity = d.count / max;
    const top = d.count === 0 ? theme.bar_bg : intensity > 0.66 ? theme.green : intensity > 0.33 ? theme.accent : theme.purple;
    out += isoCube(cx, cy, 16, num(h), { top, left: theme.border, right: theme.bar_bg });
    out += text(cx, cy + h + 16, `${d.count}`, { size: 9, fill: d.count ? theme.text : theme.muted, anchor: "middle" });
    if (row === 0 && (col === 0 || col === 6)) out += text(cx, cy + h + 28, d.date.slice(5), { size: 8, fill: theme.muted, anchor: "middle" });
  });
  out += text(W - 16, 20, "Block height = public commits that day (IST)", { size: 9, fill: theme.muted, anchor: "end", opacity: 0.85 });
  out += footer(W, H, theme, freshnessLine(s));
  return out + "</svg>";
}

// 5.9 Activity wave --------------------------------------------------------------
function activityCard(a, s, theme) {
  const W = 800, H = 196;
  const fromCalendar = a.streak.source === "github-calendar";
  let out = openSvg(W, H, theme, "Activity wave", "Daily GitHub activity over the last 90 days; all-visible calendar and public events shown as separate series");
  out += cardTitle(20, 30, fromCalendar ? "Activity Wave (90 days, IST)" : "Activity Wave (90 days, IST)", theme);
  const pts = a.activity.points;
  const chartX = 30, chartY = 54, chartW = W - 60, chartH = 88;
  const max = a.activity.max;
  const px = pts.map((p, i) => ({
    x: chartX + (i / Math.max(1, pts.length - 1)) * chartW,
    y: chartY + chartH - (p.count / max) * chartH,
  }));
  const paths = areaPath(px, chartY + chartH);
  if (paths) {
    out += `<path d="${paths.area}" fill="${theme.accent}" opacity="0.15"/>`;
    out += `<path d="${paths.line}" fill="none" stroke="${theme.accent}" stroke-width="2"/>`;
  }
  let total = pts.reduce((sum, p) => sum + p.count, 0);
  let activeDays = pts.filter((p) => p.count > 0).length;
  if (fromCalendar && a.activity_events) {
    // Second series: public-only events ledger, normalized to its own peak.
    const ePts = a.activity_events.points;
    const eMax = a.activity_events.max;
    const ex = ePts.map((p, i) => ({
      x: chartX + (i / Math.max(1, ePts.length - 1)) * chartW,
      y: chartY + chartH - (p.count / eMax) * chartH,
    }));
    const ePaths = areaPath(ex, chartY + chartH);
    if (ePaths) out += `<path d="${ePaths.line}" fill="none" stroke="${theme.orange}" stroke-width="1.5"/>`;
    const eTotal = ePts.reduce((sum, p) => sum + p.count, 0);
    out += `<rect x="430" y="18" width="9" height="9" fill="${theme.accent}" rx="2"/>`;
    out += text(444, 26, `All visible · ${fmtInt(total)} contributions · peak ${max}/day`, { size: 9.5, fill: theme.muted });
    out += `<rect x="430" y="32" width="9" height="9" fill="${theme.orange}" rx="2"/>`;
    out += text(444, 40, `Public events · ${fmtInt(eTotal)} · peak ${eMax}/day`, { size: 9.5, fill: theme.muted });
    out += text(30, 172, "Two separate measures, each scaled to its own peak; never summed.", { size: 8.5, fill: theme.muted });
  } else {
    out += text(W - 20, 30, `${fmtInt(total)} public events · ${activeDays} active days · peak ${max}/day`, { size: 10.5, fill: theme.muted, anchor: "end" });
    out += text(30, 172, "public-events approximation (IST); GitHub contribution calendar not used", { size: 8.5, fill: theme.muted });
  }
  out += `<line x1="${chartX}" y1="${num(chartY + chartH)}" x2="${num(chartX + chartW)}" y2="${num(chartY + chartH)}" stroke="${theme.border}"/>`;
  out += text(chartX, chartY + chartH + 16, istDisplay(a.activity.from), { size: 9, fill: theme.muted });
  out += text(chartX + chartW, chartY + chartH + 16, istDisplay(a.activity.to), { size: 9, fill: theme.muted, anchor: "end" });
  out += footer(W, H, theme, freshnessLine(s) + historyNote(a));
  return out + "</svg>";
}

const CARDS = {
  "trophies.svg": { name: "Achievements", generate: trophiesCard, width: 800, height: 168 },
  "stats.svg": { name: "GitHub Statistics", generate: statsCard, width: 495, height: 195 },
  // width/height are placeholder dimensions for the error fallback card only;
  // several cards size dynamically with the data (languages, repositories,
  // streak/summary when the calendar dataset is present).
  "streak.svg": { name: "Contribution Streak", generate: streakCard, width: 495, height: 218 },
  "languages.svg": { name: "Languages", generate: languagesCard, width: 495, height: 380 },
  "productivity.svg": { name: "Peak Productivity", generate: productivityCard, width: 495, height: 195 },
  "summary.svg": { name: "GitHub Summary", generate: summaryCard, width: 495, height: 198 },
  "repositories.svg": { name: "Repository Breakdown", generate: repositoriesCard, width: 495, height: 300 },
  "infrastructure.svg": { name: "Commit Infrastructure", generate: infrastructureCard, width: 495, height: 208 },
  "activity.svg": { name: "Activity Wave", generate: activityCard, width: 800, height: 196 },
};

module.exports = { CARDS };
