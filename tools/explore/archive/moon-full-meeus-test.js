/**
 * Test full Meeus Ch. 47 longitude + latitude series against eclipses.
 *
 * Tests multiple configurations:
 * 1. Current implementation (4 long + 13 lat terms)
 * 2. Full longitude (60 terms) + 13 lat terms
 * 3. Full longitude (60 terms) + full latitude (60 terms)
 * 4. Full Meeus position (bypass hierarchy entirely)
 *
 * Goal: determine what's needed to match every solar eclipse.
 */

const { computePlanetPosition, thetaToRaDeg, phiToDecDeg, _invalidateGraph } = require('../lib/scene-graph');
const C = require('../lib/constants');

const d2r = Math.PI / 180;

// Known solar eclipses 2000-2025
const ECLIPSES = [
  { jd: 2451580.035035, label: '2000-Feb-05 Partial' },
  { jd: 2451727.314977, label: '2000-Jul-01 Partial' },
  { jd: 2451756.593148, label: '2000-Jul-31 Partial' },
  { jd: 2451904.233299, label: '2000-Dec-25 Partial' },
  { jd: 2452082.003310, label: '2001-Jun-21 Total' },
  { jd: 2452258.370150, label: '2001-Dec-14 Annular' },
  { jd: 2452436.489838, label: '2002-Jun-10 Annular' },
  { jd: 2452612.814074, label: '2002-Dec-04 Total' },
  { jd: 2452790.673171, label: '2003-May-31 Annular' },
  { jd: 2452967.451644, label: '2003-Nov-23 Total' },
  { jd: 2453115.066030, label: '2004-Apr-19 Partial' },
  { jd: 2453292.625266, label: '2004-Oct-14 Partial' },
  { jd: 2453469.358924, label: '2005-Apr-08 Hybrid' },
  { jd: 2453646.939433, label: '2005-Oct-03 Annular' },
  { jd: 2453823.925266, label: '2006-Mar-29 Total' },
  { jd: 2454000.986991, label: '2006-Sep-22 Annular' },
  { jd: 2454178.606215, label: '2007-Mar-19 Partial' },
  { jd: 2454355.022500, label: '2007-Sep-11 Partial' },
  { jd: 2454503.664005, label: '2008-Feb-07 Annular' },
  { jd: 2454679.932083, label: '2008-Aug-01 Total' },
  { jd: 2454857.833160, label: '2009-Jan-26 Annular' },
  { jd: 2455034.608623, label: '2009-Jul-22 Total' },
  { jd: 2455211.796979, label: '2010-Jan-15 Annular' },
  { jd: 2455389.315718, label: '2010-Jul-11 Total' },
  { jd: 2455565.869236, label: '2011-Jan-04 Partial' },
  { jd: 2455714.387014, label: '2011-Jun-01 Partial' },
  { jd: 2455743.860764, label: '2011-Jul-01 Partial' },
  { jd: 2455890.764861, label: '2011-Nov-25 Partial' },
  { jd: 2456068.495764, label: '2012-May-20 Annular' },
  { jd: 2456245.425637, label: '2012-Nov-13 Total' },
  { jd: 2456422.518287, label: '2013-May-10 Annular' },
  { jd: 2456600.033056, label: '2013-Nov-03 Hybrid' },
  { jd: 2456776.753160, label: '2014-Apr-29 Annular' },
  { jd: 2456954.406701, label: '2014-Oct-23 Partial' },
  { jd: 2457101.907488, label: '2015-Mar-20 Total' },
  { jd: 2457278.788414, label: '2015-Sep-13 Partial' },
  { jd: 2457456.582164, label: '2016-Mar-09 Total' },
  { jd: 2457632.880579, label: '2016-Sep-01 Annular' },
  { jd: 2457811.121215, label: '2017-Feb-26 Annular' },
  { jd: 2457987.268519, label: '2017-Aug-21 Total' },
  { jd: 2458165.369826, label: '2018-Feb-15 Partial' },
  { jd: 2458312.626574, label: '2018-Jul-13 Partial' },
  { jd: 2458341.907963, label: '2018-Aug-11 Partial' },
  { jd: 2458489.571273, label: '2019-Jan-06 Partial' },
  { jd: 2458667.308414, label: '2019-Jul-02 Total' },
  { jd: 2458843.721447, label: '2019-Dec-26 Annular' },
  { jd: 2459021.778646, label: '2020-Jun-21 Annular' },
  { jd: 2459198.176840, label: '2020-Dec-14 Total' },
  { jd: 2459375.946609, label: '2021-Jun-10 Annular' },
  { jd: 2459552.815718, label: '2021-Dec-04 Total' },
  { jd: 2459700.362917, label: '2022-Apr-30 Partial' },
  { jd: 2459877.959259, label: '2022-Oct-25 Partial' },
  { jd: 2460054.679120, label: '2023-Apr-20 Hybrid' },
  { jd: 2460232.250475, label: '2023-Oct-14 Annular' },
  { jd: 2460409.262836, label: '2024-Apr-08 Total' },
  { jd: 2460586.282095, label: '2024-Oct-02 Annular' },
  { jd: 2460763.950417, label: '2025-Mar-29 Partial' },
  { jd: 2460940.321574, label: '2025-Sep-21 Partial' },
];

// ═══════════════════════════════════════════════════════════════════════════
// FULL MEEUS CH. 47 — Compute Moon ecliptic longitude and latitude from scratch
// ═══════════════════════════════════════════════════════════════════════════

// Meeus Table 47.A — Periodic terms for Moon longitude (Sigma_l) and distance (Sigma_r)
// Columns: D, M, Mp, F, coeff_l (sin, 0.000001 deg), coeff_r (cos, 0.001 km)
const TABLE_47A = [
  [0, 0, 1, 0, 6288774, -20905355],
  [2, 0, -1, 0, 1274027, -3699111],
  [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888],
  [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158],
  [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586],
  [0, 1, -1, 0, -40923, -129620],
  [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755],
  [2, 0, 0, -2, 15327, 10321],
  [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782],
  [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636],
  [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379],
  [1, 1, 0, 0, 4987, -16675],
  [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445],
  [4, 0, 0, 0, 3861, -11650],
  [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0],
  [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322],
  [2, -2, 0, 0, 2236, -9884],
  [0, 1, 2, 0, -2120, 5751],
  [0, 2, 0, 0, -2069, 0],
  [2, -2, -1, 0, 2048, -4950],
  [2, 0, 1, -2, -1773, 4130],
  [2, 0, 0, 2, -1595, 0],
  [4, -1, -1, 0, 1215, -3958],
  [0, 0, 2, 2, -1110, 0],
  [3, 0, -1, 0, -892, 3258],
  [2, 1, 1, 0, -810, 2616],
  [4, -1, -2, 0, 759, -1897],
  [0, 2, -1, 0, -713, -2117],
  [2, 2, -1, 0, -700, 2354],
  [2, 1, -2, 0, 691, 0],
  [2, -1, 0, -2, 596, 0],
  [4, 0, 1, 0, 549, -1423],
  [0, 0, 4, 0, 537, -1117],
  [4, -1, 0, 0, 520, -1571],
  [1, 0, -2, 0, -487, -1739],
  [2, 1, 0, -2, -399, 0],
  [0, 0, 2, -2, -381, -4421],
  [1, 1, 1, 0, 351, 0],
  [3, 0, -2, 0, -340, 0],
  [4, 0, -3, 0, 330, 0],
  [2, -1, 2, 0, 327, 0],
  [0, 2, 1, 0, -323, 1165],
  [1, 1, -1, 0, 299, 0],
  [2, 0, 3, 0, 294, 0],
  [2, 0, -1, -2, 0, 8752],
];

// Meeus Table 47.B — Periodic terms for Moon latitude (Sigma_b)
// Columns: D, M, Mp, F, coeff_b (sin, 0.000001 deg)
const TABLE_47B = [
  [0, 0, 0, 1, 5128122],
  [0, 0, 1, 1, 280602],
  [0, 0, 1, -1, 277693],
  [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413],
  [2, 0, -1, -1, 46271],
  [2, 0, 0, 1, 32573],
  [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266],
  [0, 0, 2, -1, 8822],
  [2, -1, 0, -1, 8216],
  [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200],
  [2, 1, 0, -1, -3359],
  [2, -1, -1, 1, 2463],
  [2, -1, 0, 1, 2211],
  [2, -1, -1, -1, 2065],
  [0, 1, -1, -1, -1870],
  [4, 0, -1, -1, 1828],
  [0, 1, 0, 1, -1794],
  [0, 0, 0, 3, -1749],
  [0, 1, -1, 1, -1565],
  [1, 0, 0, 1, -1491],
  [0, 1, 1, 1, -1475],
  [0, 1, 1, -1, -1410],
  [0, 1, 0, -1, -1344],
  [1, 0, 0, -1, -1335],
  [0, 0, 3, 1, 1107],
  [4, 0, 0, -1, 1021],
  [4, 0, -1, 1, 833],
  [0, 0, 1, -3, 777],
  [4, 0, -2, 1, 671],
  [2, 0, 0, -3, 607],
  [2, 0, 2, -1, 596],
  [2, -1, 1, -1, 491],
  [2, 0, -2, 1, -451],
  [0, 0, 3, -1, 439],
  [2, 0, 2, 1, 422],
  [2, 0, -3, -1, 421],
  [2, 1, -1, 1, -366],
  [2, 1, 0, 1, -351],
  [4, 0, 0, 1, 331],
  [2, -1, 1, 1, 315],
  [2, -2, 0, -1, 302],
  [0, 0, 1, 3, -283],
  [2, 1, 1, -1, -229],
  [1, 1, 0, -1, 223],
  [1, 1, 0, 1, 223],
  [0, 1, -2, -1, -220],
  [2, 1, -1, -1, -220],
  [1, 0, 1, 1, -185],
  [2, -1, -2, -1, 181],
  [0, 1, 2, 1, -177],
  [4, 0, -2, -1, 176],
  [4, -1, -1, -1, 166],
  [1, 0, 1, -1, -164],
  [4, 0, 1, -1, 132],
  [1, 0, -1, -1, -119],
  [4, -1, 0, -1, 115],
  [2, -2, 0, 1, 107],
];

/**
 * Compute full Meeus Ch. 47 Moon position (ecliptic longitude and latitude).
 * Returns { lambda_deg, beta_deg } — geocentric ecliptic coordinates.
 */
function meeusFullMoon(jd) {
  const T = (jd - C.j2000JD) / C.julianCenturyDays;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;

  // Fundamental arguments (Meeus Ch. 47, degrees)
  let Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000;
  let D  = 297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000;
  let M  = 357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000;
  let Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000;
  let F  = 93.2720950 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000;

  // Additional arguments
  const A1 = (119.75 + 131.849 * T) * d2r;
  const A2 = (53.09 + 479264.290 * T) * d2r;
  const A3 = (313.45 + 481266.484 * T) * d2r;

  // E correction for Sun's mean anomaly (eccentricity of Earth's orbit)
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const E2 = E * E;

  // Convert to radians
  Lp = Lp % 360; if (Lp < 0) Lp += 360;
  D  = D  % 360; if (D  < 0) D  += 360;
  M  = M  % 360; if (M  < 0) M  += 360;
  Mp = Mp % 360; if (Mp < 0) Mp += 360;
  F  = F  % 360; if (F  < 0) F  += 360;

  const Dr = D * d2r, Mr = M * d2r, Mpr = Mp * d2r, Fr = F * d2r;

  // Sigma_l (longitude)
  let Sigma_l = 0;
  for (const [dD, dM, dMp, dF, coeff_l] of TABLE_47A) {
    if (coeff_l === 0) continue;
    const arg = dD * Dr + dM * Mr + dMp * Mpr + dF * Fr;
    let term = coeff_l * Math.sin(arg);
    // Apply E correction for terms involving M
    const absM = Math.abs(dM);
    if (absM === 1) term *= E;
    else if (absM === 2) term *= E2;
    Sigma_l += term;
  }

  // Additional corrections for longitude
  Sigma_l += 3958 * Math.sin(A1);
  Sigma_l += 1962 * Math.sin((Lp * d2r) - Fr);
  Sigma_l += 318 * Math.sin(A2);

  // Sigma_b (latitude)
  let Sigma_b = 0;
  for (const [dD, dM, dMp, dF, coeff_b] of TABLE_47B) {
    const arg = dD * Dr + dM * Mr + dMp * Mpr + dF * Fr;
    let term = coeff_b * Math.sin(arg);
    const absM = Math.abs(dM);
    if (absM === 1) term *= E;
    else if (absM === 2) term *= E2;
    Sigma_b += term;
  }

  // Additional corrections for latitude
  Sigma_b += -2235 * Math.sin((Lp * d2r));
  Sigma_b += 382 * Math.sin(A3);
  Sigma_b += 175 * Math.sin(A1 - Fr);
  Sigma_b += 175 * Math.sin(A1 + Fr);
  Sigma_b += 127 * Math.sin((Lp * d2r) - Mpr);
  Sigma_b += -115 * Math.sin((Lp * d2r) + Mpr);

  const lambda = Lp + Sigma_l * 1e-6;  // degrees
  const beta = Sigma_b * 1e-6;         // degrees

  return { lambda_deg: lambda, beta_deg: beta, T };
}

/**
 * Convert ecliptic (lambda, beta) to equatorial (RA, Dec) in degrees.
 */
function eclipticToEquatorial(lambda_deg, beta_deg, T) {
  // Mean obliquity (Meeus eq. 22.2)
  const eps = 23.4392911 - 0.0130042 * T - 1.64e-7 * T * T + 5.04e-7 * T * T * T;
  const epsR = eps * d2r;
  const lamR = lambda_deg * d2r;
  const betR = beta_deg * d2r;

  const sinLam = Math.sin(lamR), cosLam = Math.cos(lamR);
  const sinBet = Math.sin(betR), cosBet = Math.cos(betR);
  const sinEps = Math.sin(epsR), cosEps = Math.cos(epsR);

  const ra = Math.atan2(sinLam * cosEps - Math.tan(betR) * sinEps, cosLam);
  const dec = Math.asin(sinBet * cosEps + cosBet * sinEps * sinLam);

  let raDeg = ra / d2r;
  if (raDeg < 0) raDeg += 360;
  return { raDeg, decDeg: dec / d2r };
}

/**
 * Full Meeus Sun position (Meeus Ch. 25 — low accuracy method).
 */
function meeusSun(jd) {
  const T = (jd - C.j2000JD) / C.julianCenturyDays;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const Mr = M * d2r;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
          + 0.000289 * Math.sin(3 * Mr);
  let lambda = L0 + C;
  lambda = lambda % 360; if (lambda < 0) lambda += 360;

  // Sun beta is essentially 0
  return { lambda_deg: lambda, beta_deg: 0, T };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

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
  const sep = Math.sqrt((dRA * cosDec) ** 2 + dDec ** 2);
  return { sep, dRA, dDec, moonRA, moonDec, sunRA, sunDec };
}

function computeFullMeeusSeparation(jd, useMeeusSun) {
  // Moon from full Meeus
  const moonEcl = meeusFullMoon(jd);
  const moonEq = eclipticToEquatorial(moonEcl.lambda_deg, moonEcl.beta_deg, moonEcl.T);

  let sunRA, sunDec;
  if (useMeeusSun) {
    const sunEcl = meeusSun(jd);
    const sunEq = eclipticToEquatorial(sunEcl.lambda_deg, sunEcl.beta_deg, sunEcl.T);
    sunRA = sunEq.raDeg;
    sunDec = sunEq.decDeg;
  } else {
    const sun = computePlanetPosition('sun', jd);
    sunRA = thetaToRaDeg(sun.ra);
    sunDec = phiToDecDeg(sun.dec);
  }

  let dRA = moonEq.raDeg - sunRA;
  if (dRA > 180) dRA -= 360;
  if (dRA < -180) dRA += 360;
  const dDec = moonEq.decDeg - sunDec;
  const cosDec = Math.cos(sunDec * d2r);
  const sep = Math.sqrt((dRA * cosDec) ** 2 + dDec ** 2);
  return { sep, dRA, dDec, moonRA: moonEq.raDeg, moonDec: moonEq.decDeg, sunRA, sunDec };
}

function computeRMS(eclipses, sepFn) {
  let sumSep2 = 0;
  let within05 = 0;
  let maxSep = 0;
  const details = [];
  for (const e of eclipses) {
    const r = sepFn(e.jd);
    sumSep2 += r.sep * r.sep;
    if (r.sep <= 0.5) within05++;
    if (r.sep > maxSep) maxSep = r.sep;
    details.push({ ...e, ...r });
  }
  return {
    rms: Math.sqrt(sumSep2 / eclipses.length),
    within05,
    maxSep,
    details
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// RUN TESTS
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  ECLIPSE ACCURACY: Testing different Meeus configurations');
console.log('═══════════════════════════════════════════════════════════════\n');

// Test 1: Current implementation (model Moon + model Sun)
console.log('--- Test 1: Current implementation (hierarchy + 4 long + 13 lat) ---');
const test1 = computeRMS(ECLIPSES, jd => computeSeparation(jd));
console.log(`  RMS: ${test1.rms.toFixed(4)}°  |  ≤0.5°: ${test1.within05}/${ECLIPSES.length}  |  Max: ${test1.maxSep.toFixed(2)}°\n`);

// Test 2: Full Meeus Moon + model Sun
console.log('--- Test 2: Full Meeus Moon (60L + 60B + E + A1/A2/A3) + model Sun ---');
const test2 = computeRMS(ECLIPSES, jd => computeFullMeeusSeparation(jd, false));
console.log(`  RMS: ${test2.rms.toFixed(4)}°  |  ≤0.5°: ${test2.within05}/${ECLIPSES.length}  |  Max: ${test2.maxSep.toFixed(2)}°\n`);

// Test 3: Full Meeus Moon + Meeus Sun
console.log('--- Test 3: Full Meeus Moon + Full Meeus Sun ---');
const test3 = computeRMS(ECLIPSES, jd => computeFullMeeusSeparation(jd, true));
console.log(`  RMS: ${test3.rms.toFixed(4)}°  |  ≤0.5°: ${test3.within05}/${ECLIPSES.length}  |  Max: ${test3.maxSep.toFixed(2)}°\n`);

// Detailed results for Test 3 (best case)
console.log('--- Detailed results (Full Meeus Moon + Full Meeus Sun) ---');
console.log(`${'Eclipse'.padEnd(28)} Sep°    dRA°    dDec°   MoonRA    MoonDec   SunRA     SunDec`);
for (const d of test3.details) {
  const flag = d.sep <= 0.5 ? ' *' : d.sep <= 1.0 ? '  ' : ' !';
  console.log(`${d.label.padEnd(28)}${flag}${d.sep.toFixed(3).padStart(6)}  ${d.dRA.toFixed(3).padStart(7)}  ${d.dDec.toFixed(3).padStart(7)}  ${d.moonRA.toFixed(2).padStart(8)}  ${d.moonDec.toFixed(2).padStart(8)}  ${d.sunRA.toFixed(2).padStart(8)}  ${d.sunDec.toFixed(2).padStart(8)}`);
}

// Error budget analysis
console.log('\n--- Error budget: Full Meeus vs Current Implementation ---');
console.log(`${'Eclipse'.padEnd(28)}  Current  FullMeeus  Improvement`);
let improveCount = 0;
for (let i = 0; i < ECLIPSES.length; i++) {
  const cur = test1.details[i].sep;
  const full = test3.details[i].sep;
  const delta = cur - full;
  if (delta > 0) improveCount++;
  console.log(`${ECLIPSES[i].label.padEnd(28)}  ${cur.toFixed(3).padStart(6)}  ${full.toFixed(3).padStart(9)}  ${delta > 0 ? '+' : ''}${delta.toFixed(3).padStart(9)}`);
}
console.log(`\nImproved: ${improveCount}/${ECLIPSES.length} eclipses`);

// Summary
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  SUMMARY');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Config                              RMS°     ≤0.5°     Max°`);
console.log(`  Current (hierarchy+4L+13B)         ${test1.rms.toFixed(3).padStart(6)}    ${String(test1.within05).padStart(2)}/${ECLIPSES.length}    ${test1.maxSep.toFixed(2).padStart(5)}`);
console.log(`  Full Meeus Moon + model Sun        ${test2.rms.toFixed(3).padStart(6)}    ${String(test2.within05).padStart(2)}/${ECLIPSES.length}    ${test2.maxSep.toFixed(2).padStart(5)}`);
console.log(`  Full Meeus Moon + Meeus Sun        ${test3.rms.toFixed(3).padStart(6)}    ${String(test3.within05).padStart(2)}/${ECLIPSES.length}    ${test3.maxSep.toFixed(2).padStart(5)}`);
console.log();

// If full Meeus gives near-zero, that tells us the problem is in our model
// If full Meeus still has errors, the problem is Meeus accuracy itself
if (test3.rms < 0.1) {
  console.log('  CONCLUSION: Full Meeus achieves sub-0.1° — implementing all terms');
  console.log('  in the model should match every eclipse.');
} else if (test3.rms < 0.5) {
  console.log('  CONCLUSION: Full Meeus achieves sub-0.5° — good enough for visual');
  console.log('  eclipses. Most eclipses would be visually convincing.');
} else {
  console.log('  CONCLUSION: Full Meeus still has >0.5° errors. The remaining error');
  console.log('  may come from: perturbation terms beyond Meeus, nutation, or');
  console.log('  the low-accuracy Sun position from Meeus Ch. 25.');
}
