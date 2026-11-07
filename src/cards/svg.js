"use strict";

/**
 * SVG primitives shared by all cards. Every dynamic string passes esc();
 * every coordinate passes num(). Output is self-contained valid SVG: no
 * external fonts, scripts, images or references, so it renders through
 * GitHub's camo image proxy.
 */

const { esc, num } = require("../security/escape");

const FONT = "font-family=\"'Segoe UI', Ubuntu, 'Helvetica Neue', Arial, sans-serif\"";

function openSvg(width, height, theme, titleText, descText) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${num(width)}" height="${num(height)}" viewBox="0 0 ${num(width)} ${num(height)}" role="img" aria-labelledby="title desc">` +
    `<title id="title">${esc(titleText)}</title><desc id="desc">${esc(descText)}</desc>` +
    `<rect x="0.5" y="0.5" width="${num(width) - 1}" height="${num(height) - 1}" rx="8" fill="${theme.bg}" stroke="${theme.border}"/>`
  );
}

function text(x, y, content, { size = 12, fill, weight = "normal", anchor = "start", opacity = 1 } = {}) {
  return `<text x="${num(x)}" y="${num(y)}" ${FONT} font-size="${num(size)}" font-weight="${esc(weight)}" fill="${esc(fill)}" text-anchor="${esc(anchor)}" opacity="${num(opacity, 1)}">${esc(content)}</text>`;
}

function cardTitle(x, y, content, theme) {
  return text(x, y, content, { size: 14, fill: theme.title, weight: "600" });
}

/** Horizontal bar row: label, track, filled portion, value. */
function barRow(x, y, width, label, valueText, ratio, color, theme, { trackHeight = 8 } = {}) {
  const r = Math.max(0, Math.min(1, num(ratio)));
  return (
    text(x, y - 4, label, { size: 11, fill: theme.text }) +
    text(x + width, y - 4, valueText, { size: 11, fill: theme.muted, anchor: "end" }) +
    `<rect x="${num(x)}" y="${num(y)}" width="${num(width)}" height="${num(trackHeight)}" rx="4" fill="${theme.bar_bg}"/>` +
    (r > 0 ? `<rect x="${num(x)}" y="${num(y)}" width="${num(Math.max(4, width * r))}" height="${num(trackHeight)}" rx="4" fill="${esc(color)}"/>` : "")
  );
}

/** Donut chart segments from [{value, color}]. Returns paths around (cx, cy, r). */
function donut(cx, cy, r, stroke, segments) {
  const total = segments.reduce((s, seg) => s + num(seg.value), 0);
  if (total <= 0) return `<circle cx="${num(cx)}" cy="${num(cy)}" r="${num(r)}" fill="none" stroke="${esc(segments[0] ? segments[0].color : "#333")}" stroke-width="${num(stroke)}" opacity="0.15"/>`;
  let angle = -Math.PI / 2;
  let out = "";
  for (const seg of segments) {
    const frac = num(seg.value) / total;
    if (frac <= 0) continue;
    const a0 = angle;
    const a1 = angle + frac * Math.PI * 2;
    angle = a1;
    const large = frac > 0.5 ? 1 : 0;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    if (frac >= 0.999) {
      out += `<circle cx="${num(cx)}" cy="${num(cy)}" r="${num(r)}" fill="none" stroke="${esc(seg.color)}" stroke-width="${num(stroke)}"/>`;
    } else {
      out += `<path d="M ${num(x0, 0)} ${num(y0, 0)} A ${num(r)} ${num(r)} 0 ${large} 1 ${num(x1, 0)} ${num(y1, 0)}" fill="none" stroke="${esc(seg.color)}" stroke-width="${num(stroke)}"/>`;
    }
  }
  return out;
}

/** Smooth area/line chart from [{x, y}] pixel points already computed. */
function areaPath(points, baseY) {
  if (points.length < 2) return "";
  let d = `M ${num(points[0].x, 0)} ${num(points[0].y, 0)}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const mx = (p0.x + p1.x) / 2;
    d += ` C ${num(mx, 0)} ${num(p0.y, 0)}, ${num(mx, 0)} ${num(p1.y, 0)}, ${num(p1.x, 0)} ${num(p1.y, 0)}`;
  }
  const line = d;
  const area = `${d} L ${num(points[points.length - 1].x, 0)} ${num(baseY, 0)} L ${num(points[0].x, 0)} ${num(baseY, 0)} Z`;
  return { line, area };
}

/** Isometric-ish cube at (x, y) with edge e and height h, three visible faces. */
function isoCube(x, y, e, h, colors) {
  const hw = e; // half-width of top rhombus horizontally
  const hh = e / 2; // half-height of top rhombus vertically
  const top = `${num(x)},${num(y - hh)} ${num(x + hw)},${num(y)} ${num(x)},${num(y + hh)} ${num(x - hw)},${num(y)}`;
  const left = `${num(x - hw)},${num(y)} ${num(x)},${num(y + hh)} ${num(x)},${num(y + hh + h)} ${num(x - hw)},${num(y + h)}`;
  const right = `${num(x + hw)},${num(y)} ${num(x)},${num(y + hh)} ${num(x)},${num(y + hh + h)} ${num(x + hw)},${num(y + h)}`;
  return (
    `<polygon points="${left}" fill="${esc(colors.left)}"/>` +
    `<polygon points="${right}" fill="${esc(colors.right)}"/>` +
    `<polygon points="${top}" fill="${esc(colors.top)}"/>`
  );
}

/** Neutral fallback card: valid SVG, no fabricated numbers. */
function fallbackCard(width, height, theme, cardName, note) {
  return (
    openSvg(width, height, theme, `${cardName} - temporarily unavailable`, "Statistics temporarily unavailable") +
    cardTitle(20, 34, cardName, theme) +
    text(20, 62, "Statistics temporarily unavailable", { size: 12, fill: theme.text }) +
    text(20, 80, note || "No successful snapshot yet. The next scheduled refresh will render this card.", { size: 11, fill: theme.muted }) +
    "</svg>"
  );
}

/** Small freshness footnote shown on every live card. */
function footer(width, height, theme, line) {
  return text(width - 14, height - 10, line, { size: 9, fill: theme.muted, anchor: "end", opacity: 0.85 });
}

module.exports = { openSvg, text, cardTitle, barRow, donut, areaPath, isoCube, fallbackCard, footer, FONT };
