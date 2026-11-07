"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { istDateString, istHour, istWeekday, monthEnd, addDays, daysBetween, dateRange, istToday } = require("../src/utils/time");

test("IST conversion crosses the date boundary at 05:30, not at UTC midnight", () => {
  // 2026-11-07 00:30 UTC = 06:00 IST same day.
  assert.equal(istDateString("2026-11-07T00:30:00Z"), "2026-11-07");
  // 18:29:59 UTC = 23:59:59 IST same day.
  assert.equal(istDateString("2026-11-07T18:29:59Z"), "2026-11-07");
  // 18:30:00 UTC = 00:00:00 IST NEXT day.
  assert.equal(istDateString("2026-11-07T18:30:00Z"), "2026-11-08");
});

test("IST hour is the local hour, not UTC+5.5 applied to a localized date", () => {
  assert.equal(istHour("2026-11-07T18:30:00Z"), 0);
  assert.equal(istHour("2026-11-07T17:00:00Z"), 22);
  assert.equal(istHour("2026-11-07T04:00:00Z"), 9);
});

test("weekday uses the IST calendar day", () => {
  // 2026-11-07 is a Saturday (IST). 2026-11-07T18:30Z is already Sunday in IST.
  assert.equal(istWeekday("2026-11-07T10:00:00Z"), 6);
  assert.equal(istWeekday("2026-11-07T18:30:00Z"), 0);
});

test("monthEnd handles 30/31-day months and leap years", () => {
  assert.equal(monthEnd("2026-02"), "2026-02-28");
  assert.equal(monthEnd("2024-02"), "2024-02-29");
  assert.equal(monthEnd("2026-04"), "2026-04-30");
  assert.equal(monthEnd("2026-01"), "2026-01-31");
});

test("day arithmetic across month and year boundaries", () => {
  assert.equal(addDays("2026-01-31", 1), "2026-02-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(daysBetween("2026-01-01", "2026-12-31"), 364);
  assert.deepEqual(dateRange("2026-02-27", "2026-03-02"), ["2026-02-27", "2026-02-28", "2026-03-01", "2026-03-02"]);
});

test("istToday is deterministic for a given instant", () => {
  assert.equal(istToday(new Date("2026-11-07T18:30:00Z")), "2026-11-08");
});
