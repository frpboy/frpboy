"use strict";

/**
 * Resolve the catch-all route name ("streak.svg", "a/b") for a request.
 *
 * Vercel's runtime does not reliably populate req.query.path for catch-all
 * functions (observed empty on Node.js 26.x preview deployments: every card
 * resolved to the unknown fallback). The original request URL always carries
 * the real path, so prefer it and fall back to the query param for the
 * internally-rewritten shape ("/api/cards/[...path]?path=streak.svg").
 */

function routeName(req, prefix) {
  const url = req && typeof req.url === "string" ? req.url : "";
  const pathname = url.split("?")[0].split("#")[0];
  if (pathname.startsWith(prefix)) {
    const rest = pathname.slice(prefix.length).replace(/\/+$/, "");
    if (rest && !rest.includes("[")) {
      try {
        return decodeURIComponent(rest);
      } catch {
        return rest;
      }
    }
  }
  const segments = [].concat((req && req.query && req.query.path) || []);
  return segments.join("/");
}

module.exports = { routeName };
