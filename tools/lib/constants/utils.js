// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS — Date conversion and formatting helpers.
// Pure functions with no model dependencies (except jdToYear/yearToJD
// which are created via factory from model constants).
// ═══════════════════════════════════════════════════════════════════════════

// --- Date conversion ---

function jdToCalendar(jd) {
  // Algorithm from Meeus, Astronomical Algorithms (2nd ed.)
  const z = Math.floor(jd + 0.5);
  const f = (jd + 0.5) - z;
  let a;
  if (z < 2299161) {
    a = z; // Julian calendar
  } else {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);

  const day = b - d - Math.floor(30.6001 * e) + f;
  const month = (e < 14) ? e - 1 : e - 13;
  const year = (month > 2) ? c - 4716 : c - 4715;

  return { year, month, day: Math.floor(day), dayFrac: day - Math.floor(day) };
}

function calendarToJD(year, month, day) {
  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
}

function jdToDateString(jd) {
  const cal = jdToCalendar(jd);
  const h = cal.dayFrac * 24;
  const hour = Math.floor(h);
  const min = Math.floor((h - hour) * 60);
  return `${cal.year}-${String(cal.month).padStart(2, '0')}-${String(cal.day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * Create jdToYear/yearToJD functions bound to model constants.
 * @param {{ startmodelYear: number, startmodelJD: number, meanSolarYearDays: number }} config
 */
function createDateUtils(config) {
  return {
    jdToYear(jd) {
      return config.startmodelYear + (jd - config.startmodelJD) / config.meanSolarYearDays;
    },
    yearToJD(year) {
      return config.startmodelJD + (year - config.startmodelYear) * config.meanSolarYearDays;
    },
  };
}

// --- Formatting helpers ---

function pad(str, len) {
  str = String(str);
  return str.length >= len ? str : str + ' '.repeat(len - str.length);
}

function padLeft(str, len) {
  str = String(str);
  return str.length >= len ? str : ' '.repeat(len - str.length) + str;
}

function fmt(n, dec = 6) {
  return typeof n === 'number' ? n.toFixed(dec) : String(n);
}

function fmtInt(n) {
  return n.toLocaleString('en-US');
}

function printTable(headers, rows, colWidths) {
  const sep = colWidths.map(w => '-'.repeat(w)).join('-+-');
  const headerLine = headers.map((h, i) => pad(h, colWidths[i])).join(' | ');
  console.log(headerLine);
  console.log(sep);
  for (const row of rows) {
    console.log(row.map((c, i) => pad(String(c), colWidths[i])).join(' | '));
  }
}

// --- Derived constant helpers ---
// Pure functions that compute derived values from input parameters.
// Used by constants.js at load time to avoid hardcoding derived values.

/**
 * Compute orbit tilt components from ascending node and ecliptic inclination.
 * Formula: orbitTilta = cos((-90 - Ω) × π/180) × (-inclination)
 *          orbitTiltb = sin((-90 - Ω) × π/180) × (-inclination)
 * @param {number} ascendingNode - Longitude of ascending node (degrees)
 * @param {number} eclipticInclinationJ2000 - Ecliptic inclination at J2000 (degrees)
 * @returns {{ orbitTilta: number, orbitTiltb: number }}
 */
function computeOrbitTilt(ascendingNode, eclipticInclinationJ2000) {
  const angle = (-90 - ascendingNode) * Math.PI / 180;
  return {
    orbitTilta: Math.cos(angle) * (-eclipticInclinationJ2000),
    orbitTiltb: Math.sin(angle) * (-eclipticInclinationJ2000),
  };
}

// (Plan 07 R5: computeInvPlaneInclinationAmplitude — the ψ law's amplitude,
// PSI / (d × √m) — is deleted with the law. Plan 11 step 2:
// computeInvPlaneInclinationMean — inclJ2000 − A·cos(the K inclination phase),
// the scene's mean-inclination pose, overwritten from the chain every frame —
// is deleted with its only reader.)

// (plan 11 step 4: computeEarthRAAngle — the K-device scaffold's derived
// 2A − A²/ε, the perihelion wheel's tilt — left with the scaffold.)

module.exports = {
  jdToCalendar,
  calendarToJD,
  jdToDateString,
  createDateUtils,
  pad, padLeft, fmt, fmtInt, printTable,
  computeOrbitTilt,
};
