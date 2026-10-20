/** The first Gregorian calendar day, as a calendar date. */
export const GREGORIAN_START: Readonly<{
    year: 1582;
    month: 10;
    day: 15;
}>;
/** The first Gregorian calendar day, as a JD (00:00 UT). */
export const GREGORIAN_START_JD: 2299160.5;
/**
 * Calendar date → Julian Day (Meeus 7.1). The calendar is decided by the
 * date itself: Julian before 1582-10-15, Gregorian from it on.
 * @param {number} year astronomical year (0 = 1 BC)
 * @param {number} month 1–12
 * @param {number} day 1–31, may carry a fraction
 * @param {number} [dayFraction=0] added to the day (e.g. hour/24)
 * @returns {number} JD
 */
export function calendarToJD(year: number, month: number, day: number, dayFraction?: number): number;
/**
 * Julian Day → calendar date (Meeus ch. 7 inverse). Gregorian for
 * JD ≥ 2299160.5, Julian before.
 * @param {number} jd
 * @returns {{year: number, month: number, day: number, dayFrac: number, calendar: 'Julian'|'Gregorian'}}
 *   day the integer day of month, dayFrac in [0, 1) the fraction since 00:00
 */
export function jdToCalendar(jd: number): {
    year: number;
    month: number;
    day: number;
    dayFrac: number;
    calendar: "Julian" | "Gregorian";
};
/**
 * Julian Day → decimal year: the year plus the elapsed fraction of that
 * calendar year (Julian or Gregorian leap rule as the date's calendar has
 * it). Jan 1 00:00 → year exactly. The S3-aligned coordinate of the Sun's
 * secular deviations and the browser's `julianDateToDecimalYear`.
 * @param {number} jd
 * @returns {number}
 */
export function jdToDecimalYear(jd: number): number;
/**
 * The day fraction as hours, minutes and whole seconds (floored, as the
 * browser's date strings always did).
 * @param {number} dayFrac in [0, 1)
 * @returns {{hour: number, minute: number, second: number}}
 */
export function dayFractionToHMS(dayFrac: number): {
    hour: number;
    minute: number;
    second: number;
};
