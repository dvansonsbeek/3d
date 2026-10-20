/**
 * The civil calendar ↔ Julian Day — ONE home (holisticuniverse plan 13 B1).
 *
 * Meeus, Astronomical Algorithms ch. 7, with the Gregorian reform at
 * 1582-10-15 (JD 2299160.5): a calendar date before the reform is a Julian
 * calendar date, on or after it a Gregorian one, and a JD converts back
 * under the same rule — the convention of the NASA eclipse canons and of
 * every historical record the model is gated on. Astronomical year
 * numbering throughout (year 0 = 1 BC).
 *
 * Before plan 13 B1 the browser carried eighteen copies of these two
 * formulas and the Node twin two more; seven of the browser's date → JD
 * copies were deliberately proleptic-Julian for NASA canon dates and two
 * of their event tables also held a post-reform date (1654 Aug 12), which
 * those copies placed ten days late. The one-home function applies the
 * reform; the measured consequence is recorded in plan 13 §7.
 *
 * Pure functions, no model dependencies.
 */

'use strict';

/** The first Gregorian calendar day, as a calendar date. */
const GREGORIAN_START = Object.freeze({ year: 1582, month: 10, day: 15 });
/** The first Gregorian calendar day, as a JD (00:00 UT). */
const GREGORIAN_START_JD = 2299160.5;

/**
 * Calendar date → Julian Day (Meeus 7.1). The calendar is decided by the
 * date itself: Julian before 1582-10-15, Gregorian from it on.
 * @param {number} year astronomical year (0 = 1 BC)
 * @param {number} month 1–12
 * @param {number} day 1–31, may carry a fraction
 * @param {number} [dayFraction=0] added to the day (e.g. hour/24)
 * @returns {number} JD
 */
function calendarToJD(year, month, day, dayFraction = 0) {
  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const beforeGregorian = year < GREGORIAN_START.year
    || (year === GREGORIAN_START.year && (month < GREGORIAN_START.month
      || (month === GREGORIAN_START.month && day < GREGORIAN_START.day)));
  let b = 0;
  if (!beforeGregorian) { const a = Math.floor(y / 100); b = 2 - a + Math.floor(a / 4); }
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5 + dayFraction;
}

/**
 * Julian Day → calendar date (Meeus ch. 7 inverse). Gregorian for
 * JD ≥ 2299160.5, Julian before.
 * @param {number} jd
 * @returns {{year: number, month: number, day: number, dayFrac: number, calendar: 'Julian'|'Gregorian'}}
 *   day the integer day of month, dayFrac in [0, 1) the fraction since 00:00
 */
function jdToCalendar(jd) {
  const J = jd + 0.5;
  const Z = Math.floor(J);
  const F = J - Z;
  let A = Z;
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const dayFull = B - D - Math.floor(30.6001 * E) + F;
  const month = (E < 14) ? E - 1 : E - 13;
  const year = (month > 2) ? C - 4716 : C - 4715;
  const day = Math.floor(dayFull);
  return { year, month, day, dayFrac: dayFull - day, calendar: Z >= 2299161 ? 'Gregorian' : 'Julian' };
}

/**
 * Julian Day → decimal year: the year plus the elapsed fraction of that
 * calendar year (Julian or Gregorian leap rule as the date's calendar has
 * it). Jan 1 00:00 → year exactly. The S3-aligned coordinate of the Sun's
 * secular deviations and the browser's `julianDateToDecimalYear`.
 * @param {number} jd
 * @returns {number}
 */
function jdToDecimalYear(jd) {
  const J = jd + 0.5;
  const Z = Math.floor(J);
  const F = J - Z;
  let A = Z;
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const day = B - D - Math.floor(30.6001 * E) + F;
  const month = (E < 14) ? E - 1 : E - 13;
  const year = (month > 2) ? C - 4716 : C - 4715;
  const isGregorian = (Z >= 2299161);
  const isLeap = isGregorian
    ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0))
    : (year % 4 === 0);
  const monthLengths = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let dayOfYear = day;
  for (let m = 0; m < month - 1; m++) dayOfYear += monthLengths[m];
  const daysInYear = isLeap ? 366 : 365;
  return year + (dayOfYear - 1) / daysInYear;
}

/**
 * The day fraction as hours, minutes and whole seconds (floored, as the
 * browser's date strings always did).
 * @param {number} dayFrac in [0, 1)
 * @returns {{hour: number, minute: number, second: number}}
 */
function dayFractionToHMS(dayFrac) {
  const totalHours = dayFrac * 24;
  const hour = Math.floor(totalHours);
  const minute = Math.floor((totalHours - hour) * 60);
  const second = Math.floor(((totalHours - hour) * 60 - minute) * 60);
  return { hour, minute, second };
}

module.exports = { GREGORIAN_START, GREGORIAN_START_JD, calendarToJD, jdToCalendar, jdToDecimalYear, dayFractionToHMS };
