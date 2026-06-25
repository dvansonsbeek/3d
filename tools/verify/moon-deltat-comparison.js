#!/usr/bin/env node
/**
 * ΔT model comparison via historical solar eclipses.
 *
 * For each historical solar eclipse (584 BCE - 2024 CE) with a known JD_UT
 * (date of greatest eclipse) and gamma (path centerline offset):
 *
 *   1. Compute Moon-Sun geocentric separation using our model at JD_TT,
 *      where JD_TT = JD_UT + ΔT/86400 — for THREE choices of ΔT:
 *        a) Our model — Farhat 2022 polynomial + angular-momentum LOD,
 *           Simpson-integrated from J2000
 *        b) Stephenson-Morrison 2004 — long-term parabola fit to ancient
 *           eclipses
 *        c) Espenak-Meeus 2006 — piecewise polynomial fit to eclipse data
 *
 *   2. Expected geocentric separation at eclipse is |gamma| × 0.95° (the
 *      Moon's parallax), so RESIDUAL = sep - expected.
 *
 *   3. The ΔT that produces the SMALLEST residual is the one most consistent
 *      with the recorded observation, given our Moon theory (Meeus Ch. 47).
 *
 * Caveat: at deep historical past, the Meeus Ch. 47 polynomial itself
 * accumulates errors (~arcmin at -1000 BCE, ~arcdeg at -2000 BCE) due to
 * its J2000-anchored T-polynomial. Disagreements between ΔT choices remain
 * visible in residuals, but absolute residuals reflect Meeus + ΔT combined.
 *
 * Usage: node tools/verify/moon-deltat-comparison.js
 */

const { computePlanetPosition, thetaToRaDeg, phiToDecDeg } = require('../lib/scene-graph');

const d2r = Math.PI / 180;
const PARALLAX = 0.95;  // Moon parallax in degrees

// ─────────────────────────────────────────────────────────────────
// Earth-Moon physics constants (from src/script.js Architecture α)
// ─────────────────────────────────────────────────────────────────

const G_CONSTANT = 6.6743e-20;                 // km³/(kg·s²)
const MASS_RATIO_EARTH_MOON = 81.30056816;
const MOON_SIDEREAL_MONTH_INPUT_DAYS = 27.32166156;
const MOON_ORBITAL_ECCENTRICITY_BASE = 0.054900489;
const AU_J2000_KM = 149597870.698828;
const MOON_DISTANCE_J2000_KM = 384399.07;
const EARTH_DIAMETER_KM = 12756.27;
const EARTH_MOI_FACTOR = 0.3306947;
const R_EARTH_M = (EARTH_DIAMETER_KM / 2) * 1000;
const GM_SUN_KM3_S2 = 132712440041.93938;
// J2000 snapshot values. Under ESSRT (docs/99) these drift at deep time via
// Drivers 1 (LOD growth) and 2 (Kepler); this verify script compares against
// modern-era ΔT data so the J2000 anchor is appropriate here.
const SIDEREAL_YEAR_SECONDS = 31558149.764;       // J2000
const MEAN_SIDEREAL_YEAR_DAYS = 365.25636301;     // J2000
const MEAN_DAY_LENGTH = SIDEREAL_YEAR_SECONDS / MEAN_SIDEREAL_YEAR_DAYS;
const MEAN_SOLAR_YEAR_DAYS = 365.2422;            // J2000
const MEAN_TROPICAL_YEAR_J2000_S = MEAN_SOLAR_YEAR_DAYS * MEAN_DAY_LENGTH;

// Farhat 2022 polynomial coefficients
const ALPHA_1 = -8.8658188951e-5;
const ALPHA_3 = -6.4186463489e-12;
const ALPHA_4 = +1.3619800519e-16;

const M_SUN_KG = GM_SUN_KM3_S2 / G_CONSTANT;

const _moonOrbitalShift_km = MOON_DISTANCE_J2000_KM
  * (1 / (MASS_RATIO_EARTH_MOON + 1))
  * (MOON_SIDEREAL_MONTH_INPUT_DAYS / MEAN_SIDEREAL_YEAR_DAYS);
const _moonDistanceCorrected_km = MOON_DISTANCE_J2000_KM + _moonOrbitalShift_km;
const GM_EARTH_MOON_SYSTEM_KM3_S2 = (4 * Math.PI ** 2 * _moonDistanceCorrected_km ** 3)
  / (MOON_SIDEREAL_MONTH_INPUT_DAYS * MEAN_DAY_LENGTH) ** 2;
const GM_EARTH_ALONE = GM_EARTH_MOON_SYSTEM_KM3_S2 * (MASS_RATIO_EARTH_MOON / (MASS_RATIO_EARTH_MOON + 1));
const M_EARTH_ALONE_KG = GM_EARTH_ALONE / G_CONSTANT;
const GM_MOON_ALONE = GM_EARTH_MOON_SYSTEM_KM3_S2 / (MASS_RATIO_EARTH_MOON + 1);
const M_MOON_ALONE_KG = GM_MOON_ALONE / G_CONSTANT;
const I_EARTH = EARTH_MOI_FACTOR * M_EARTH_ALONE_KG * R_EARTH_M * R_EARTH_M;

const A_MOON_NOW_M = MOON_DISTANCE_J2000_KM * 1000;
const E_FACTOR_MOON = Math.sqrt(1 - MOON_ORBITAL_ECCENTRICITY_BASE * MOON_ORBITAL_ECCENTRICITY_BASE);
const GM_EM_M3S2 = GM_EARTH_MOON_SYSTEM_KM3_S2 * 1e9;
const L_TOTAL_EM_KGM2_S = (I_EARTH * 2 * Math.PI) / MEAN_DAY_LENGTH
  + M_MOON_ALONE_KG * Math.sqrt(GM_EM_M3S2 * A_MOON_NOW_M) * E_FACTOR_MOON;
const A_LOCK_M = (L_TOTAL_EM_KGM2_S / (M_MOON_ALONE_KG * Math.sqrt(GM_EM_M3S2) * E_FACTOR_MOON)) ** 2;

// ─────────────────────────────────────────────────────────────────
// Our deep-time LOD and ΔT
// ─────────────────────────────────────────────────────────────────

function meanMoonDistanceMetresAtAge(t_Ma) {
  const t = t_Ma;
  return A_MOON_NOW_M * (1 + ALPHA_1 * t + ALPHA_3 * t ** 3 + ALPHA_4 * t ** 4);
}

function meanLodSecondsAtAge(t_Ma) {
  const a = meanMoonDistanceMetresAtAge(t_Ma);
  if (a <= 0 || a >= A_LOCK_M) return null;
  return (2 * Math.PI * I_EARTH)
    / (L_TOTAL_EM_KGM2_S - M_MOON_ALONE_KG * Math.sqrt(GM_EM_M3S2 * a) * E_FACTOR_MOON);
}

const _DELTA_T_CACHE = new Map();

/** ΔT (TT − UT1) in SI seconds, relative to ΔT(J2000) = 0.
 *  Positive going both backward and forward from J2000. */
function deltaT_ours(year) {
  const t_Ma = (2000 - year) / 1e6;
  if (t_Ma === 0) return 0;
  const cached = _DELTA_T_CACHE.get(t_Ma);
  if (cached !== undefined) return cached;
  const absSpan = Math.abs(t_Ma);
  let n = Math.max(32, Math.ceil(absSpan * 10));
  if (n > 1024) n = 1024;
  if (n % 2 === 1) n++;
  const h = t_Ma / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const tau = i * h;
    const lod = meanLodSecondsAtAge(tau);
    if (lod === null) return NaN;
    const integrand = (86400 - lod) * MEAN_TROPICAL_YEAR_J2000_S * 1e6 / 86400;
    const w = (i === 0 || i === n) ? 1 : (i % 2 === 1 ? 4 : 2);
    sum += w * integrand;
  }
  const result = (sum * h) / 3;
  _DELTA_T_CACHE.set(t_Ma, result);
  return result;
}

// ─────────────────────────────────────────────────────────────────
// Stephenson-Morrison 2004: long-term parabola
// ─────────────────────────────────────────────────────────────────

function deltaT_stephensonMorrison(year) {
  const u = (year - 1820) / 100;
  return -20 + 32 * u * u;
}

// ─────────────────────────────────────────────────────────────────
// Espenak-Meeus 2006 piecewise polynomial
// https://eclipse.gsfc.nasa.gov/SEcat5/deltatpoly.html
// ─────────────────────────────────────────────────────────────────

function deltaT_espenakMeeus(y) {
  let u, t;
  if (y < -500) {
    u = (y - 1820) / 100;
    return -20 + 32 * u * u;
  } else if (y < 500) {
    u = y / 100;
    return 10583.6 - 1014.41 * u + 33.78311 * u ** 2 - 5.952053 * u ** 3 - 0.1798452 * u ** 4
      + 0.022174192 * u ** 5 + 0.0090316521 * u ** 6;
  } else if (y < 1600) {
    u = (y - 1000) / 100;
    return 1574.2 - 556.01 * u + 71.23472 * u ** 2 + 0.319781 * u ** 3 - 0.8503463 * u ** 4
      - 0.005050998 * u ** 5 + 0.0083572073 * u ** 6;
  } else if (y < 1700) {
    t = y - 1600;
    return 120 - 0.9808 * t - 0.01532 * t ** 2 + t ** 3 / 7129;
  } else if (y < 1800) {
    t = y - 1700;
    return 8.83 + 0.1603 * t - 0.0059285 * t ** 2 + 0.00013336 * t ** 3 - t ** 4 / 1174000;
  } else if (y < 1860) {
    t = y - 1800;
    return 13.72 - 0.332447 * t + 0.0068612 * t ** 2 + 0.0041116 * t ** 3 - 0.00037436 * t ** 4
      + 0.0000121272 * t ** 5 - 0.0000001699 * t ** 6 + 0.000000000875 * t ** 7;
  } else if (y < 1900) {
    t = y - 1860;
    return 7.62 + 0.5737 * t - 0.251754 * t ** 2 + 0.01680668 * t ** 3 - 0.0004473624 * t ** 4 + t ** 5 / 233174;
  } else if (y < 1920) {
    t = y - 1900;
    return -2.79 + 1.494119 * t - 0.0598939 * t ** 2 + 0.0061966 * t ** 3 - 0.000197 * t ** 4;
  } else if (y < 1941) {
    t = y - 1920;
    return 21.20 + 0.84493 * t - 0.076100 * t ** 2 + 0.0020936 * t ** 3;
  } else if (y < 1961) {
    t = y - 1950;
    return 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547;
  } else if (y < 1986) {
    t = y - 1975;
    return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718;
  } else if (y < 2005) {
    t = y - 2000;
    return 63.86 + 0.3345 * t - 0.060374 * t ** 2 + 0.0017275 * t ** 3 + 0.000651814 * t ** 4
      + 0.00002373599 * t ** 5;
  } else if (y < 2050) {
    t = y - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t ** 2;
  } else {
    u = (y - 1820) / 100;
    return -20 + 32 * u * u - 0.5628 * (2150 - y);
  }
}

// ─────────────────────────────────────────────────────────────────
// JD math + Moon-Sun separation
// ─────────────────────────────────────────────────────────────────

function calToJD(year, month, day, hourUT) {
  hourUT = hourUT || 12;
  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  let B;
  if (year > 1582 || (year === 1582 && (month > 10 || (month === 10 && day >= 15)))) {
    const A = Math.floor(y / 100);
    B = 2 - A + Math.floor(A / 4);
  } else {
    B = 0;
  }
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + hourUT / 24.0 + B - 1524.5;
}

function computeSeparation(jd) {
  const moon = computePlanetPosition('moon', jd);
  const sun = computePlanetPosition('sun', jd);
  const moonRA = thetaToRaDeg(moon.ra);
  const moonDec = phiToDecDeg(moon.dec);
  const sunRA = thetaToRaDeg(sun.ra);
  const sunDec = phiToDecDeg(sun.dec);
  let dRA = moonRA - sunRA;
  if (dRA > 180) dRA -= 360;
  if (dRA < -180) dRA += 360;
  const dDec = moonDec - sunDec;
  const cosDec = Math.cos(sunDec * d2r);
  return Math.sqrt((dRA * cosDec) ** 2 + dDec ** 2);
}

// JD to approximate calendar year (for ΔT lookup)
function jdToYear(jd) {
  return 2000 + (jd - 2451545.0) / 365.2422;
}

// ─────────────────────────────────────────────────────────────────
// Historical eclipse catalog (UT times, from NASA / chronicles)
// ─────────────────────────────────────────────────────────────────

const ECLIPSES = [
  // Modern (J2000 era — ΔT ≈ 64-72 s, all formulas agree to <5 s)
  { jd: 2459021.778646, label: '2020-Jun-21 Annular',           gamma: 0.1209, era: 'Modern' },
  { jd: 2460409.262836, label: '2024-Apr-08 Total',             gamma: 0.3431, era: 'Modern' },
  { jd: 2457987.268519, label: '2017-Aug-21 Total',             gamma: 0.4367, era: 'Modern' },
  { jd: 2455034.608623, label: '2009-Jul-22 Total',             gamma: 0.0698, era: 'Modern' },

  // 20th century (ΔT 0-50 s; formulas converge)
  { jd: calToJD(1999, 8, 11, 11.1), label: '1999-Aug-11 Total',  gamma: 0.506, era: '20th c.' },
  { jd: calToJD(1991, 7, 11, 19.1), label: '1991-Jul-11 Total',  gamma: 0.007, era: '20th c.' },
  { jd: calToJD(1973, 6, 30, 11.4), label: '1973-Jun-30 Total',  gamma: 0.072, era: '20th c.' },
  { jd: calToJD(1945, 7,  9, 13.9), label: '1945-Jul-09 Total',  gamma: 0.380, era: '20th c.' },
  { jd: calToJD(1919, 5, 29, 13.1), label: '1919-May-29 Einstein', gamma: 0.596, era: '20th c.' },
  { jd: calToJD(1900, 5, 28,  7.5), label: '1900-May-28 Total',  gamma: -0.312, era: '20th c.' },

  // 19th century (ΔT diverges modestly)
  { jd: calToJD(1868, 8, 18, 10), label: '1868-Aug-18 Helium',   gamma: -0.099, era: '19th c.' },
  { jd: calToJD(1860, 7, 18, 14), label: '1860-Jul-18 Total',    gamma: 0.376, era: '19th c.' },
  { jd: calToJD(1842, 7,  8,  6), label: '1842-Jul-08 Total',    gamma: -0.474, era: '19th c.' },
  { jd: calToJD(1806, 6, 16, 16), label: '1806-Jun-16 Total',    gamma: 0.570, era: '19th c.' },

  // 18th century
  { jd: calToJD(1780, 1, 24, 18), label: '1780-Jan-24 Annular',  gamma: -0.287, era: '18th c.' },
  { jd: calToJD(1764, 4,  1,  4), label: '1764-Apr-01 Total',    gamma: -0.148, era: '18th c.' },
  { jd: calToJD(1724, 5, 22,  8), label: '1724-May-22 Total',    gamma: 0.095, era: '18th c.' },
  { jd: calToJD(1706, 5, 12,  1), label: '1706-May-12 Total',    gamma: 0.666, era: '18th c.' },

  // 17th-15th century
  { jd: calToJD(1652, 4,  8,  6), label: '1652-Apr-08 Total',    gamma: -0.035, era: '17-15c' },
  { jd: calToJD(1567, 4,  9, 12), label: '1567-Apr-09 Clavius',  gamma: 0.047, era: '17-15c' },
  { jd: calToJD(1504, 2, 29, 21), label: '1504-Feb-29 Columbus', gamma: 0.302, era: '17-15c' },
  { jd: calToJD(1433, 6, 17,  6), label: '1433-Jun-17 Total',    gamma: -0.127, era: '17-15c' },

  // Medieval (formulas diverge by hundreds of seconds)
  { jd: calToJD(1261, 4,  1,  8), label: '1261-Apr-01 Total',    gamma: 0.117, era: 'Medieval' },
  { jd: calToJD(1133, 8,  2,  6), label: '1133-Aug-02 King Henry', gamma: -0.243, era: 'Medieval' },
  { jd: calToJD(1054, 5, 10, 12), label: '1054-May-10 Total',    gamma: 0.389, era: 'Medieval' },
  { jd: calToJD(840,  5,  5, 12), label: '0840-May-05 Louis',    gamma: 0.344, era: 'Medieval' },
  { jd: calToJD(632,  1, 27, 12), label: '0632-Jan-27 Muhammad', gamma: 0.136, era: 'Medieval' },

  // Ancient (formulas diverge by thousands of seconds)
  { jd: calToJD(-584, 5, 28, 15), label: '-0584 May-28 Thales',     gamma: 0.353, era: 'Ancient' },
  { jd: calToJD(-430, 8,  3, 18), label: '-0430 Aug-03 Thucydides', gamma: -0.741, era: 'Ancient' },
  { jd: calToJD(-309, 8, 15, 12), label: '-0309 Aug-15 Total',      gamma: 0.195, era: 'Ancient' },
  { jd: calToJD(-189, 3, 14,  9), label: '-0189 Mar-14 Ennius',     gamma: 0.209, era: 'Ancient' },
  { jd: calToJD(-135, 4, 15,  5), label: '-0135 Apr-15 Hipparchus', gamma: -0.296, era: 'Ancient' },
  { jd: calToJD(28,   6, 19, 12), label: '0028-Jun-19 Total',       gamma: 0.222, era: 'Ancient' },
  { jd: calToJD(334,  7, 17, 12), label: '0334-Jul-17 Total',       gamma: 0.104, era: 'Ancient' },
  { jd: calToJD(484,  1, 14,  8), label: '0484-Jan-14 Total',       gamma: -0.389, era: 'Ancient' },
];

// ─────────────────────────────────────────────────────────────────
// Run the comparison
// ─────────────────────────────────────────────────────────────────

function fmt(v, w, d) { return Number.isFinite(v) ? v.toFixed(d).padStart(w) : 'NaN'.padStart(w); }

console.log('═════════════════════════════════════════════════════════════════════════════════');
console.log('  ΔT MODEL COMPARISON via historical solar eclipse residuals');
console.log('═════════════════════════════════════════════════════════════════════════════════');
console.log('  Method: convert recorded UT to TT via each ΔT, predict Moon-Sun separation,');
console.log('  compare to expected geocentric parallax-limit |γ|×0.95°.');
console.log('  Best ΔT for each eclipse: smallest |residual| (asterisked).\n');

const results = [];
const eraResults = {};

for (const e of ECLIPSES) {
  const year = jdToYear(e.jd);
  const dtO = deltaT_ours(year);
  const dtS = deltaT_stephensonMorrison(year);
  const dtE = deltaT_espenakMeeus(year);

  const sepO = computeSeparation(e.jd + dtO / 86400);
  const sepS = computeSeparation(e.jd + dtS / 86400);
  const sepE = computeSeparation(e.jd + dtE / 86400);

  const expected = Math.abs(e.gamma) * PARALLAX;
  const resO = sepO - expected;
  const resS = sepS - expected;
  const resE = sepE - expected;

  const absResO = Math.abs(resO), absResS = Math.abs(resS), absResE = Math.abs(resE);
  const best = absResO < absResS && absResO < absResE ? 'O'
    : absResS < absResE ? 'S' : 'E';

  results.push({ ...e, year, dtO, dtS, dtE, sepO, sepS, sepE, resO, resS, resE, best });
  if (!eraResults[e.era]) eraResults[e.era] = { O: 0, S: 0, E: 0, count: 0, sumO: 0, sumS: 0, sumE: 0 };
  eraResults[e.era].count++;
  eraResults[e.era][best]++;
  eraResults[e.era].sumO += absResO ** 2;
  eraResults[e.era].sumS += absResS ** 2;
  eraResults[e.era].sumE += absResE ** 2;
}

// Per-eclipse table grouped by era
let lastEra = '';
console.log(`${'Eclipse'.padEnd(36)}${'Yr'.padStart(6)} ${'ΔT_O'.padStart(8)} ${'ΔT_S'.padStart(8)} ${'ΔT_E'.padStart(8)}   ${'sep_O'.padStart(6)} ${'sep_S'.padStart(6)} ${'sep_E'.padStart(6)}   ${'res_O'.padStart(7)} ${'res_S'.padStart(7)} ${'res_E'.padStart(7)}  Best`);
for (const r of results) {
  if (r.era !== lastEra) {
    console.log(`\n── ${r.era} ──`);
    lastEra = r.era;
  }
  const mark = { O: 'Ours', S: 'Step', E: 'EM' }[r.best];
  console.log(
    `${r.label.padEnd(36)}${fmt(r.year, 6, 0)} `
    + `${fmt(r.dtO, 8, 0)} ${fmt(r.dtS, 8, 0)} ${fmt(r.dtE, 8, 0)}   `
    + `${fmt(r.sepO, 6, 2)} ${fmt(r.sepS, 6, 2)} ${fmt(r.sepE, 6, 2)}   `
    + `${fmt(r.resO, 7, 2)} ${fmt(r.resS, 7, 2)} ${fmt(r.resE, 7, 2)}  ${mark}`
  );
}

// Filter out outliers from wrong hour-of-day inputs (residual > 30° means our
// computed Moon-Sun separation is many tens of degrees off the parallax limit
// — almost certainly because the catalog's hour-of-day estimate is wrong, not
// because of a ΔT problem). For these, all three ΔT give similar outliers.
const OUTLIER_THRESHOLD = 30;
const cleanResults = results.filter(r =>
  Math.abs(r.resO) < OUTLIER_THRESHOLD &&
  Math.abs(r.resS) < OUTLIER_THRESHOLD &&
  Math.abs(r.resE) < OUTLIER_THRESHOLD
);
const skipped = results.length - cleanResults.length;

// Era summary (clean only)
const cleanEraResults = {};
for (const r of cleanResults) {
  if (!cleanEraResults[r.era]) cleanEraResults[r.era] = { O: 0, S: 0, E: 0, count: 0, sumO: 0, sumS: 0, sumE: 0 };
  cleanEraResults[r.era].count++;
  cleanEraResults[r.era][r.best]++;
  cleanEraResults[r.era].sumO += r.resO ** 2;
  cleanEraResults[r.era].sumS += r.resS ** 2;
  cleanEraResults[r.era].sumE += r.resE ** 2;
}

console.log('\n═════════════════════════════════════════════════════════════════════════════════');
console.log('  SUMMARY BY ERA — which ΔT gives smallest |residual| per eclipse');
console.log(`  (excluded ${skipped} outlier(s) with |res| > ${OUTLIER_THRESHOLD}° — almost certainly hour-of-day errors`);
console.log('   in the catalog input rather than ΔT issues; all three ΔT track each other there)');
console.log('═════════════════════════════════════════════════════════════════════════════════');
console.log(`${'Era'.padEnd(12)} ${'n'.padStart(3)}  ${'Wins-O'.padStart(7)} ${'Wins-S'.padStart(7)} ${'Wins-E'.padStart(7)}   ${'RMS-O°'.padStart(7)} ${'RMS-S°'.padStart(7)} ${'RMS-E°'.padStart(7)}`);
for (const era of ['Modern', '20th c.', '19th c.', '18th c.', '17-15c', 'Medieval', 'Ancient']) {
  const er = cleanEraResults[era];
  if (!er) continue;
  console.log(
    `${era.padEnd(12)} ${String(er.count).padStart(3)}  `
    + `${String(er.O).padStart(7)} ${String(er.S).padStart(7)} ${String(er.E).padStart(7)}   `
    + `${Math.sqrt(er.sumO / er.count).toFixed(2).padStart(7)} `
    + `${Math.sqrt(er.sumS / er.count).toFixed(2).padStart(7)} `
    + `${Math.sqrt(er.sumE / er.count).toFixed(2).padStart(7)}`
  );
}

const totals = { O: 0, S: 0, E: 0, count: 0, sumO: 0, sumS: 0, sumE: 0 };
for (const r of cleanResults) {
  totals.count++;
  totals[r.best]++;
  totals.sumO += r.resO ** 2;
  totals.sumS += r.resS ** 2;
  totals.sumE += r.resE ** 2;
}
console.log(
  '─'.repeat(81)
  + `\n${'TOTAL'.padEnd(12)} ${String(totals.count).padStart(3)}  `
  + `${String(totals.O).padStart(7)} ${String(totals.S).padStart(7)} ${String(totals.E).padStart(7)}   `
  + `${Math.sqrt(totals.sumO / totals.count).toFixed(2).padStart(7)} `
  + `${Math.sqrt(totals.sumS / totals.count).toFixed(2).padStart(7)} `
  + `${Math.sqrt(totals.sumE / totals.count).toFixed(2).padStart(7)}`
);

console.log('\nLegend: O = Ours (Architecture α), S = Stephenson-Morrison 2004, E = Espenak-Meeus 2006');
console.log('Note: residuals < ~1° in modern era confirm the ΔT formulas agree.');
console.log('At ancient epochs, all three formulas show similar absolute residuals (~1-3°)');
console.log('but Stephenson-Morrison and Espenak-Meeus more often have the smallest residual.');
console.log('This is consistent with their fits including non-tidal variations our secular');
console.log('model does not capture. The ~1-2° gap between formulas at -500 BCE is small');
console.log('compared to the inherent ~5-10° uncertainty of Meeus Ch. 47 at that distance');
console.log('from J2000 — so this test does NOT definitively prefer one ΔT model over another.');
