/**
 * Plan 13 B1 — the one-home calendar and angle helpers against the copies
 * they replace (a fixture row per function). Pure functions, so the test is
 * the legacy bodies themselves, kept here verbatim as the reference:
 *
 *   - the Node twin's `jdToCalendar` / `calendarToJD` (tools/lib/constants/utils.js, pre-B1),
 *   - the browser's `dateToJulianDay` / `dayToDate` / `julianDateToDecimalYear` /
 *     `jdToDateString` / `_hiCalendarFromJD` (src/script.js, pre-B1),
 *   - the browser's always-Julian `julianJD` of the NASA-canon diagnostics.
 *
 * The one behaviour difference B1 settles is asserted explicitly: the
 * always-Julian converters place a post-reform date (1654 Aug 12) ten days
 * late, and the Node twin's no-reform `calendarToJD` places a pre-reform
 * date early; the one-home function applies the reform.
 *
 *   node packages/physics/test/calendar-angles.test.mjs
 */
// @ts-nocheck — the legacy bodies are kept verbatim (untyped, as they were in the browser).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const cal = require('../src/time/calendar.cjs');
const ang = require('../src/math/angles.cjs');

let fail = 0;
const check = (name, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); if (!ok) fail++; };

// ── legacy bodies (verbatim) ────────────────────────────────────────────────
function legacyDateToJulianDay(Y, M, D) {
  let y = Y, m = M; if (m <= 2) { y -= 1; m += 12; }
  const before = Y < 1582 || (Y === 1582 && (M < 10 || (M === 10 && D < 15)));
  let B; if (before) B = 0; else { const A = Math.floor(y / 100); B = 2 - A + Math.floor(A / 4); }
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + D + B - 1524.5;
}
function legacyDayToDate(jd) {
  const J = jd + 0.5, Z = Math.floor(J), F = J - Z;
  const isGregorian = jd >= 2299160.5;
  let A; if (!isGregorian) A = Z; else { const alpha = Math.floor((Z - 1867216.25) / 36524.25); A = Z + 1 + alpha - Math.floor(alpha / 4); }
  const B = A + 1524, C = Math.floor((B - 122.1) / 365.25), D = Math.floor(365.25 * C), E = Math.floor((B - D) / 30.6001);
  const dayWithFrac = B - D - Math.floor(30.6001 * E) + F; const day = Math.floor(dayWithFrac); const fracDay = dayWithFrac - day;
  const month = (E < 14) ? E - 1 : E - 13; const year = (month > 2) ? C - 4716 : C - 4715;
  return { year, month, day, fracDay, calendar: isGregorian ? 'Gregorian' : 'Julian' };
}
function legacyJulianDateToDecimalYear(jd) {
  const J = jd + 0.5, Z = Math.floor(J), F = J - Z; let A = Z;
  if (Z >= 2299161) { const alpha = Math.floor((Z - 1867216.25) / 36524.25); A = Z + 1 + alpha - Math.floor(alpha / 4); }
  const B = A + 1524, C = Math.floor((B - 122.1) / 365.25), D = Math.floor(365.25 * C), E = Math.floor((B - D) / 30.6001);
  const day = B - D - Math.floor(30.6001 * E) + F; const month = (E < 14) ? E - 1 : E - 13; const year = (month > 2) ? C - 4716 : C - 4715;
  const isGregorian = (Z >= 2299161);
  const isLeap = isGregorian ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) : (year % 4 === 0);
  const monthLengths = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let dayOfYear = day; for (let m = 0; m < month - 1; m++) dayOfYear += monthLengths[m];
  return year + (dayOfYear - 1) / (isLeap ? 366 : 365);
}
function legacyJdToDateString(jd) {
  const z = Math.floor(jd + 0.5), f = jd + 0.5 - z; let a = z;
  if (z >= 2299161) { const alpha = Math.floor((z - 1867216.25) / 36524.25); a = z + 1 + alpha - Math.floor(alpha / 4); }
  const b = a + 1524, c = Math.floor((b - 122.1) / 365.25), d = Math.floor(365.25 * c), e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e); const month = e < 14 ? e - 1 : e - 13; const year = month > 2 ? c - 4716 : c - 4715;
  const totalHours = f * 24, hours = Math.floor(totalHours), mins = Math.floor((totalHours - hours) * 60), secs = Math.floor(((totalHours - hours) * 60 - mins) * 60);
  return { date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, time: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}` };
}
function legacyNodeJdToCalendar(jd) {
  const z = Math.floor(jd + 0.5), f = (jd + 0.5) - z; let a;
  if (z < 2299161) a = z; else { const alpha = Math.floor((z - 1867216.25) / 36524.25); a = z + 1 + alpha - Math.floor(alpha / 4); }
  const b = a + 1524, c = Math.floor((b - 122.1) / 365.25), d = Math.floor(365.25 * c), e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e) + f; const month = (e < 14) ? e - 1 : e - 13; const year = (month > 2) ? c - 4716 : c - 4715;
  return { year, month, day: Math.floor(day), dayFrac: day - Math.floor(day) };
}
function legacyNodeCalendarToJD(year, month, day) {   // NO reform: Gregorian correction at every date
  let y = year, m = month; if (m <= 2) { y -= 1; m += 12; }
  const a = Math.floor(y / 100); const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
}
function legacyAlwaysJulianJD(Y, M, D, hour) {       // the NASA-canon diagnostics' converter
  let y = Y, m = M; if (m <= 2) { y -= 1; m += 12; }
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + D - 1524.5 + hour / 24;
}

// ── the grid: pre/post reform, BCE, the reform day, leap days, fractions ───
const dates = [[-4712, 1, 1], [-2000, 3, 15], [-584, 5, 28], [-135, 4, 15], [0, 2, 29], [1, 1, 1], [1000, 6, 30], [1582, 10, 4], [1582, 10, 15], [1600, 2, 29], [1654, 8, 12], [1900, 2, 28], [2000, 1, 1], [2000, 2, 29], [2024, 12, 31], [2100, 3, 1], [12000, 7, 4]];
const fractions = [0, 0.25, 0.5, 0.999];

let n = 0; const bad = [];
for (const [Y, M, D] of dates) {
  if (cal.calendarToJD(Y, M, D) !== legacyDateToJulianDay(Y, M, D)) bad.push(`calendarToJD ${Y}-${M}-${D}`);
  n++;
  for (const fr of fractions) {
    const jd = legacyDateToJulianDay(Y, M, D) + fr;
    const a = cal.jdToCalendar(jd), b = legacyDayToDate(jd), c = legacyNodeJdToCalendar(jd);
    if (a.year !== b.year || a.month !== b.month || a.day !== b.day || a.dayFrac !== b.fracDay || a.calendar !== b.calendar) bad.push(`jdToCalendar vs dayToDate @${jd}`);
    if (a.year !== c.year || a.month !== c.month || a.day !== c.day || a.dayFrac !== c.dayFrac) bad.push(`jdToCalendar vs node copy @${jd}`);
    if (cal.jdToDecimalYear(jd) !== legacyJulianDateToDecimalYear(jd)) bad.push(`jdToDecimalYear @${jd}`);
    const s = legacyJdToDateString(jd), h = cal.dayFractionToHMS(a.dayFrac);
    const mine = { date: `${a.year}-${String(a.month).padStart(2, '0')}-${String(a.day).padStart(2, '0')}`, time: `${String(h.hour).padStart(2, '0')}:${String(h.minute).padStart(2, '0')}:${String(h.second).padStart(2, '0')}` };
    if (mine.date !== s.date || mine.time !== s.time) bad.push(`date string @${jd}: ${mine.date} ${mine.time} vs ${s.date} ${s.time}`);
    n += 4;
  }
}
check(`calendar: ${n} comparisons against the five legacy bodies, bit-identical`, bad.length === 0, bad.slice(0, 4).join('; '));

// round trip on a dense JD sweep across the reform
let rt = 0; for (let jd = 2299150.5; jd <= 2299175.5; jd += 1) { const c = cal.jdToCalendar(jd); if (cal.calendarToJD(c.year, c.month, c.day) !== jd) rt++; }
check('calendar: JD → date → JD round trip across the 1582 reform (26 days)', rt === 0, `${rt} mismatches`);
check('calendar: 1582-10-04 and 1582-10-15 are consecutive days', cal.calendarToJD(1582, 10, 15) - cal.calendarToJD(1582, 10, 4) === 1);
check('calendar: GREGORIAN_START_JD is 1582-10-15 00:00', cal.calendarToJD(1582, 10, 15) === cal.GREGORIAN_START_JD && cal.GREGORIAN_START_JD === 2299160.5);

// the two settled behaviour differences, stated
const d1654 = cal.calendarToJD(1654, 8, 12, 0.5) - legacyAlwaysJulianJD(1654, 8, 12, 12);
check('settled: the always-Julian converter placed 1654 Aug 12 ten days late', d1654 === -10, `one-home − always-Julian = ${d1654} d`);
const dBce = legacyNodeCalendarToJD(-584, 5, 28) - cal.calendarToJD(-584, 5, 28);
check('settled: the Node twin\'s no-reform converter placed −584 May 28 six days LATE (B = 2 − a + ⌊a/4⌋ = +6 for a = −6)', dBce === 6, `no-reform − one-home = ${dBce} d`);
check('settled: pre-reform dates agree between the always-Julian converter and the one-home function', dates.filter(([Y]) => Y < 1582).every(([Y, M, D]) => cal.calendarToJD(Y, M, D, 0.5) === legacyAlwaysJulianJD(Y, M, D, 12)));

// ── angles ─────────────────────────────────────────────────────────────────
check('angles: DEG2RAD·RAD2DEG = 1 to 1 ulp', Math.abs(ang.DEG2RAD * ang.RAD2DEG - 1) < 3e-16);
check('angles: ARCSEC_PER_RAD = 206264.806…', Math.abs(ang.ARCSEC_PER_RAD - 206264.80624709636) < 1e-9 && ang.ARCSEC_PER_TURN === 1296000);
const legacyWrap360 = (x) => ((x % 360) + 360) % 360;
const legacyWrap180A = (d) => ((d + 540) % 360 + 360) % 360 - 180;
const legacyWrap180B = (d) => { const x = ((d % 360) + 360) % 360; return x > 180 ? x - 360 : x; };
const legacyWrap180C = (x) => ((x % 360) + 540) % 360 - 180;
const xs = [-1e6, -720.5, -540, -360, -180.25, -180, -1e-9, 0, 1e-9, 90, 179.999, 180, 180.001, 359.999, 360, 540, 1e6, 12345.678];
check('angles: wrap360 ≡ the browser form', xs.every((x) => ang.wrap360(x) === legacyWrap360(x)));
check('angles: wrap180 ≡ form A ((x+540)%360…) at every probe', xs.every((x) => ang.wrap180(x) === legacyWrap180A(x)));
check('angles: wrap180Closed ≡ form B (x>180 ? x−360)', xs.every((x) => ang.wrap180Closed(x) === legacyWrap180B(x)));
const diffAC = xs.filter((x) => legacyWrap180A(x) !== legacyWrap180C(x));
check('angles: form C ((x%360)+540)%360−180 ≡ form A at every probe (the third browser form is the same convention)', diffAC.length === 0, `differs at ${diffAC.join(', ')}`);
check('angles: wrap180 and wrap180Closed differ exactly at ±180', ang.wrap180(180) === -180 && ang.wrap180Closed(180) === 180 && xs.filter((x) => ang.wrap180(x) !== ang.wrap180Closed(x)).every((x) => Math.abs(legacyWrap360(x) - 180) < 1e-12));
check('angles: wrap2pi / wrapPi ranges', [-10, -Math.PI, 0, Math.PI, 10, 100].every((x) => { const a = ang.wrap2pi(x), b = ang.wrapPi(x); return a >= 0 && a < 2 * Math.PI && b >= -Math.PI && b < Math.PI && Math.abs(Math.sin(a) - Math.sin(x)) < 1e-12 && Math.abs(Math.sin(b) - Math.sin(x)) < 1e-12; }));

console.log(fail === 0 ? '\ncalendar-angles: PASS' : `\ncalendar-angles: FAIL (${fail})`);
process.exit(fail === 0 ? 0 : 1);
