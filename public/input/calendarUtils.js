// === Constants ===
export const GREGORIAN_START_JD = 2299161;         // 1582-10-15
export const PERIHELION_EPOCH_JD = 2176142;        // 1245-12-14
export const STARTMODEL_JD = 2451717;              // 2000-06-21

// === Date → Julian Day ===
export function dateToJulianDay(dateStr) {
  const parts = dateStr.split("-");
  let y = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);
  let d = parseInt(parts[2], 10);

  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);

  const jd = Math.floor(365.25 * (y + 4716)) +
             Math.floor(30.6001 * (m + 1)) +
             d + B - 1524.5;

  return Math.floor(jd);
}

// === Julian Day → Date ===
export function julianDayToDate(jd) {
  let Z = Math.floor(jd + 0.5);
  let A = Z;

  if (Z >= GREGORIAN_START_JD) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }

  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);

  const day = B - D - Math.floor(30.6001 * E);
  const month = (E < 14) ? E - 1 : E - 13;
  let year = (month > 2) ? C - 4716 : C - 4715;

  const yStr = year < 0 ? `-${String(Math.abs(year)).padStart(4, '0')}` : String(year).padStart(4, '0');
  const mStr = String(month).padStart(2, '0');
  const dStr = String(day).padStart(2, '0');

  return `${yStr}-${mStr}-${dStr}`;
}

// === General Offset Calculation ===
export function dateToDaysSince(dateStr, epochJD) {
  return dateToJulianDay(dateStr) - epochJD;
}

export function daysSinceToDate(days, epochJD) {
  return julianDayToDate(epochJD + days);
}

// === Perihelion Calendar Conversion ===
export function dateToPerihelionCalendar(dateStr) {
  return daysSinceToDate(dateToDaysSince(dateStr, PERIHELION_EPOCH_JD), 0);
}

export function perihelionCalendarToDate(periDateStr) {
  const days = dateToDaysSince(periDateStr, 0);
  return julianDayToDate(PERIHELION_EPOCH_JD + days);
}

// === RA and Dec Conversions ===
export function raToRadians(raStr) {
  const [hh, mm, ss] = raStr.split(":").map(Number);
  return ((hh + mm / 60 + ss / 3600) * 15) * (Math.PI / 180);
}

export function radiansToRa(rad) {
  if (rad < 0) rad += 2 * Math.PI;
  const totalHours = rad * 12 / Math.PI;
  const hh = Math.floor(totalHours);
  const mm = Math.floor((totalHours - hh) * 60);
  const ss = Math.round(((totalHours - hh) * 60 - mm) * 60);
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
}

export function decToRadians(decStr) {
  const [deg, min, sec] = decStr.split(':').map(Number);
  const sign = Math.sign(deg);
  return sign * Math.abs(deg + min / 60 + sec / 3600) * (Math.PI / 180);
}

export function radiansToDec(rad) {
  const deg = rad * 180 / Math.PI;
  const sign = deg < 0 ? '-' : '';
  const absDeg = Math.abs(deg);
  const d = Math.floor(absDeg);
  const m = Math.floor((absDeg - d) * 60);
  const s = Math.round(((absDeg - d) * 60 - m) * 60);
  return `${sign}${String(d).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// === Utilities ===
export function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

export function isValidDate(value) {
  let aDate = value.split("-");
  if (aDate.length > 3) aDate.shift(); // Assume minus sign

  if (aDate.length !== 3) return false;
  const [y, m, d] = aDate.map(Number);
  if (!isNumeric(y) || !isNumeric(m) || !isNumeric(d)) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;

  const daysInMonth = [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (d > daysInMonth[m - 1]) return false;

  if (y === 1582 && m === 10 && d > 4 && d < 15) return false; // calendar switch gap
  return true;
}
