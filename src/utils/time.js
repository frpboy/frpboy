"use strict";

/**
 * Asia/Kolkata (IST, UTC+05:30, no DST) time helpers.
 * All profile statistics day boundaries and hour bucketing use IST.
 */

const IST_OFFSET_MINUTES = 330; // +05:30, fixed, no daylight saving
const DAY_MS = 24 * 60 * 60 * 1000;

/** Convert a Date/timestamp to its IST calendar date string YYYY-MM-DD. */
function istDateString(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${input}`);
  const ist = new Date(d.getTime() + IST_OFFSET_MINUTES * 60000);
  return ist.toISOString().slice(0, 10);
}

/** IST hour (0-23) of a timestamp. */
function istHour(input) {
  const d = input instanceof Date ? input : new Date(input);
  const ist = new Date(d.getTime() + IST_OFFSET_MINUTES * 60000);
  return ist.getUTCHours();
}

/** IST weekday (0=Sunday..6=Saturday) of a timestamp or IST date string. */
function istWeekday(input) {
  const d = input instanceof Date ? input : new Date(input);
  const ist = new Date(d.getTime() + IST_OFFSET_MINUTES * 60000);
  return ist.getUTCDay();
}

/** Today's IST date string. */
function istToday(now = new Date()) {
  return istDateString(now);
}

/** Parse an IST date string (YYYY-MM-DD) into a UTC ms value for day arithmetic. */
function istDayMs(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Add n days to an IST date string. */
function addDays(dateStr, n) {
  return new Date(istDayMs(dateStr) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days between two IST date strings (b - a). */
function daysBetween(a, b) {
  return Math.round((istDayMs(b) - istDayMs(a)) / DAY_MS);
}

/** List every IST date string from start to end inclusive. */
function dateRange(start, end) {
  const out = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Month key (YYYY-MM) of an IST date string. */
function monthOf(dateStr) {
  return dateStr.slice(0, 7);
}

/** First day (IST date) of a YYYY-MM month. */
function monthStart(month) {
  return `${month}-01`;
}

/** Last day (IST date) of a YYYY-MM month; correct for 30/31-day months and leap years. */
function monthEnd(month) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)); // day 0 of next month = last day of this month
  return last.toISOString().slice(0, 10);
}

/** Previous month key. */
function prevMonth(month) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return d.toISOString().slice(0, 7);
}

/** Format an IST date string like "07 Nov 2026" for display. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function istDisplay(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

module.exports = {
  IST_OFFSET_MINUTES,
  istDateString,
  istHour,
  istWeekday,
  istToday,
  istDayMs,
  addDays,
  daysBetween,
  dateRange,
  monthOf,
  monthStart,
  monthEnd,
  prevMonth,
  istDisplay,
};
