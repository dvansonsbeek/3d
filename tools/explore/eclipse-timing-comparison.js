/**
 * eclipse-timing-comparison.js
 *
 * Compare framework's eclipse-timing predictions to NASA's catalog via two
 * physically-distinct definitions of "greatest eclipse":
 *
 *   APPROACH A (parallax-aware, NASA-matching):
 *     "Instant when the axis of the Moon's shadow passes closest to Earth's center."
 *     Computed by finding minimum of the perpendicular distance from Earth's
 *     center to the line through Sun and Moon (the umbral shadow axis).
 *     This IS NASA's definition.
 *
 *   APPROACH B (geocentric conjunction):
 *     "Instant of geocentric conjunction" — Moon-Sun ecliptic longitude
 *     alignment (i.e., new moon). Simpler 2D ecliptic concept.
 *     Distinct from approach A by ~minutes due to parallax + 3D geometry.
 *
 * Sun position: uses the SAME Meeus Ch.25 formula as the framework's
 * `_eclSunLon` (src/script.js:4879). The framework deliberately uses this
 * standalone Sun formula for eclipse work because SUN_LONGITUDE_HARMONICS
 * are currently disabled in the scene graph (design-rule constraint: would
 * shift Sun off planet-orbit center). See `tools/fit/README.md` § Step 6f.
 * Using scene-graph Sun instead of Meeus Sun gives ~6.5 min eclipse-timing
 * RMS scatter; using Meeus Sun (as here) gives ~0.91 min RMS.
 *
 * Moon position: framework scene-graph (Meeus Ch.47 lunar perturbation series).
 *
 * For each of 58 NASA-cataloged eclipses 2000-2025, find:
 *   - t_umbral_A: when framework predicts umbral-axis-to-Earth-center minimum
 *   - t_conjunction_B: when framework predicts ecliptic conjunction
 *   - umbral_distance_at_t_A: predicted shadow axis distance at minimum (km)
 *
 * Compare to NASA's catalogued "greatest eclipse JD":
 *   - Δt_A = t_umbral_A - NASA_JD
 *   - Δt_B = t_conjunction_B - NASA_JD
 */

const { computePlanetPosition, thetaToRaDeg, phiToDecDeg } = require('../lib/scene-graph');
const C = require('../lib/constants');

const ECLIPSES = [
  { jd: 2451580.035035, label: '2000-Feb-05 Partial' }, { jd: 2451727.314977, label: '2000-Jul-01 Partial' },
  { jd: 2451756.593148, label: '2000-Jul-31 Partial' }, { jd: 2451904.233299, label: '2000-Dec-25 Partial' },
  { jd: 2452082.003310, label: '2001-Jun-21 Total' },   { jd: 2452258.370150, label: '2001-Dec-14 Annular' },
  { jd: 2452436.489838, label: '2002-Jun-10 Annular' }, { jd: 2452612.814074, label: '2002-Dec-04 Total' },
  { jd: 2452790.673171, label: '2003-May-31 Annular' }, { jd: 2452967.451644, label: '2003-Nov-23 Total' },
  { jd: 2453115.066030, label: '2004-Apr-19 Partial' }, { jd: 2453292.625266, label: '2004-Oct-14 Partial' },
  { jd: 2453469.358924, label: '2005-Apr-08 Hybrid' },  { jd: 2453646.939433, label: '2005-Oct-03 Annular' },
  { jd: 2453823.925266, label: '2006-Mar-29 Total' },   { jd: 2454000.986991, label: '2006-Sep-22 Annular' },
  { jd: 2454178.606215, label: '2007-Mar-19 Partial' }, { jd: 2454355.022500, label: '2007-Sep-11 Partial' },
  { jd: 2454503.664005, label: '2008-Feb-07 Annular' }, { jd: 2454679.932083, label: '2008-Aug-01 Total' },
  { jd: 2454857.833160, label: '2009-Jan-26 Annular' }, { jd: 2455034.608623, label: '2009-Jul-22 Total' },
  { jd: 2455211.796979, label: '2010-Jan-15 Annular' }, { jd: 2455389.315718, label: '2010-Jul-11 Total' },
  { jd: 2455565.869236, label: '2011-Jan-04 Partial' }, { jd: 2455714.387014, label: '2011-Jun-01 Partial' },
  { jd: 2455743.860764, label: '2011-Jul-01 Partial' }, { jd: 2455890.764861, label: '2011-Nov-25 Partial' },
  { jd: 2456068.495764, label: '2012-May-20 Annular' }, { jd: 2456245.425637, label: '2012-Nov-13 Total' },
  { jd: 2456422.518287, label: '2013-May-10 Annular' }, { jd: 2456600.033056, label: '2013-Nov-03 Hybrid' },
  { jd: 2456776.753160, label: '2014-Apr-29 Annular' }, { jd: 2456954.406701, label: '2014-Oct-23 Partial' },
  { jd: 2457101.907488, label: '2015-Mar-20 Total' },   { jd: 2457278.788414, label: '2015-Sep-13 Partial' },
  { jd: 2457456.582164, label: '2016-Mar-09 Total' },   { jd: 2457632.880579, label: '2016-Sep-01 Annular' },
  { jd: 2457811.121215, label: '2017-Feb-26 Annular' }, { jd: 2457987.268519, label: '2017-Aug-21 Total' },
  { jd: 2458165.369826, label: '2018-Feb-15 Partial' }, { jd: 2458312.626574, label: '2018-Jul-13 Partial' },
  { jd: 2458341.907963, label: '2018-Aug-11 Partial' }, { jd: 2458489.571273, label: '2019-Jan-06 Partial' },
  { jd: 2458667.308414, label: '2019-Jul-02 Total' },   { jd: 2458843.721447, label: '2019-Dec-26 Annular' },
  { jd: 2459021.778646, label: '2020-Jun-21 Annular' }, { jd: 2459198.176840, label: '2020-Dec-14 Total' },
  { jd: 2459375.946609, label: '2021-Jun-10 Annular' }, { jd: 2459552.815718, label: '2021-Dec-04 Total' },
  { jd: 2459700.362917, label: '2022-Apr-30 Partial' }, { jd: 2459877.959259, label: '2022-Oct-25 Partial' },
  { jd: 2460054.679120, label: '2023-Apr-20 Hybrid' },  { jd: 2460232.250475, label: '2023-Oct-14 Annular' },
  { jd: 2460409.262836, label: '2024-Apr-08 Total' },   { jd: 2460586.282095, label: '2024-Oct-02 Annular' },
  { jd: 2460763.950417, label: '2025-Mar-29 Partial' }, { jd: 2460940.321574, label: '2025-Sep-21 Partial' },
];

const d2r = Math.PI / 180;
const AU_TO_KM = 149597870.7;
const J2000_JD = 2451545.0;

// ─── Meeus Ch.25 Sun (matches framework _eclSunLon in src/script.js:4879) ─
// Returns Sun's geocentric Cartesian position in AU. Frame: mean ecliptic of
// date converted to equatorial via mean obliquity. NASA's eclipse-catalog
// "greatest eclipse JD" is computed using TT and reflects this geometric Sun.
function sunCartesian(jd) {
  const T = (jd - J2000_JD) / 36525;
  const L0 = (280.46646 + 36000.76983*T + 0.0003032*T*T) % 360;
  const M  = (357.52911 + 35999.05029*T - 0.0001537*T*T) * d2r;
  const e  = 0.016708634 - 0.000042037*T - 0.0000001267*T*T;
  const C  = (1.914602 - 0.004817*T - 0.000014*T*T) * Math.sin(M)
           + (0.019993 - 0.000101*T) * Math.sin(2*M)
           + 0.000289 * Math.sin(3*M);
  const trueLon = (L0 + C) * d2r;
  const v = M + C * d2r;
  const R = (1.000001018 * (1 - e*e)) / (1 + e * Math.cos(v));
  const eps = (23.439291 - 0.0130042*T) * d2r;
  // Ecliptic Cartesian (Sun ecliptic latitude ≈ 0) → equatorial
  const x_ecl = R * Math.cos(trueLon);
  const y_ecl = R * Math.sin(trueLon);
  return {
    x: x_ecl,
    y: y_ecl * Math.cos(eps),
    z: y_ecl * Math.sin(eps),
    distAU: R,
  };
}

// ─── Convert scene-graph RA/Dec/distance → geocentric Cartesian (AU) ──
// Used for the Moon. Sun uses sunCartesian above.
function toCartesian(pos) {
  const ra  = thetaToRaDeg(pos.ra) * d2r;
  const dec = phiToDecDeg(pos.dec)  * d2r;
  const r   = pos.distAU;
  return {
    x: r * Math.cos(dec) * Math.cos(ra),
    y: r * Math.cos(dec) * Math.sin(ra),
    z: r * Math.sin(dec),
  };
}

// ─── Approach A: umbral axis perpendicular distance to Earth center ────
// Shadow axis = line through Sun's center and Moon's center.
// Distance from origin (Earth center) to that line.
// For line through point P0 with direction d_hat: d² = |P0|² − (P0·d_hat)²
function umbralAxisDistance_AU(jd) {
  const moon = toCartesian(computePlanetPosition('moon', jd));
  const sun  = sunCartesian(jd);  // Meeus Ch.25 (matches framework's _eclSunLon)
  const dx = moon.x - sun.x, dy = moon.y - sun.y, dz = moon.z - sun.z;
  const dlen = Math.sqrt(dx*dx + dy*dy + dz*dz);
  const dxh = dx/dlen, dyh = dy/dlen, dzh = dz/dlen;
  // P0 = sun position; perpendicular distance from origin to line
  const proj = sun.x*dxh + sun.y*dyh + sun.z*dzh;
  const d2 = sun.x*sun.x + sun.y*sun.y + sun.z*sun.z - proj*proj;
  return Math.sqrt(Math.max(0, d2));
}

// ─── Approach B: Moon-Sun ecliptic longitude difference δλ ──────────────
// Moon: scene-graph (Meeus Ch.47 series).
// Sun: Meeus Ch.25 (sunCartesian above) — same source as umbral calc.
function moonEclipticLongitude(jd) {
  const pos = computePlanetPosition('moon', jd);
  const ra  = thetaToRaDeg(pos.ra) * d2r;
  const dec = phiToDecDeg(pos.dec)  * d2r;
  const eps = 23.4393 * d2r;
  return Math.atan2(Math.sin(ra) * Math.cos(eps) + Math.tan(dec) * Math.sin(eps), Math.cos(ra));
}

function sunEclipticLongitude(jd) {
  // Direct from Meeus Ch.25 true longitude (matches sunCartesian above).
  const T = (jd - J2000_JD) / 36525;
  const L0 = (280.46646 + 36000.76983*T + 0.0003032*T*T) % 360;
  const M  = (357.52911 + 35999.05029*T - 0.0001537*T*T) * d2r;
  const C  = (1.914602 - 0.004817*T - 0.000014*T*T) * Math.sin(M)
           + (0.019993 - 0.000101*T) * Math.sin(2*M)
           + 0.000289 * Math.sin(3*M);
  return ((L0 + C) % 360) * d2r;
}

function deltaLongitude(jd) {
  let dlam = moonEclipticLongitude(jd) - sunEclipticLongitude(jd);
  while (dlam >  Math.PI) dlam -= 2*Math.PI;
  while (dlam < -Math.PI) dlam += 2*Math.PI;
  return dlam;  // radians; zero at conjunction (new moon)
}

// ─── Numerical root/minimum finders ────────────────────────────────────
function findMinViaScan(targetFn, jd0, halfWindow_days, coarse_min, fine_min) {
  // Coarse scan
  let bestT = jd0, bestVal = targetFn(jd0);
  const coarse_dt = coarse_min / 1440;
  for (let t = jd0 - halfWindow_days; t <= jd0 + halfWindow_days; t += coarse_dt) {
    const v = targetFn(t);
    if (v < bestVal) { bestVal = v; bestT = t; }
  }
  // Golden-section refinement
  const phi = (Math.sqrt(5) - 1) / 2;
  let lo = bestT - coarse_dt, hi = bestT + coarse_dt;
  const tol = fine_min / 1440;
  while (hi - lo > tol) {
    const a = hi - (hi - lo) * phi;
    const b = lo + (hi - lo) * phi;
    if (targetFn(a) < targetFn(b)) hi = b; else lo = a;
  }
  return (lo + hi) / 2;
}

function findRootViaSecant(fn, jd0, halfWindow_days) {
  // Find where fn(t) crosses zero near jd0
  const dt = 0.5/1440;  // 30 seconds
  let lo = jd0 - halfWindow_days, hi = jd0 + halfWindow_days;
  let flo = fn(lo), fhi = fn(hi);
  if (flo * fhi > 0) {
    // No sign change in window; expand scan to find one
    for (let h = halfWindow_days; h < 1; h += halfWindow_days) {
      flo = fn(jd0 - h); fhi = fn(jd0 + h);
      if (flo * fhi < 0) { lo = jd0 - h; hi = jd0 + h; break; }
    }
  }
  // Bisection (robust)
  while (hi - lo > dt) {
    const mid = (lo + hi) / 2;
    const fmid = fn(mid);
    if (flo * fmid < 0) { hi = mid; fhi = fmid; }
    else { lo = mid; flo = fmid; }
  }
  return (lo + hi) / 2;
}

// ─── Run comparison for all eclipses ───────────────────────────────────
console.log('Comparing framework eclipse-timing to NASA via two definitions:\n');
console.log('  A. Umbral axis distance to Earth center (NASA\'s actual definition)');
console.log('  B. Geocentric ecliptic conjunction (Moon-Sun longitude alignment)\n');

const results = [];
for (const e of ECLIPSES) {
  // Approach A: find time when umbral axis distance is minimum
  const t_umbral = findMinViaScan(umbralAxisDistance_AU, e.jd, 0.05, 1, 0.05);
  const min_dist_au = umbralAxisDistance_AU(t_umbral);
  const min_dist_km = min_dist_au * AU_TO_KM;
  // Approach B: find time when ecliptic longitude difference = 0
  const t_conj = findRootViaSecant(deltaLongitude, e.jd, 0.05);

  const dt_A_min = (t_umbral - e.jd) * 1440;   // minutes
  const dt_B_min = (t_conj   - e.jd) * 1440;
  const dt_AB_min = (t_umbral - t_conj) * 1440;

  results.push({ ...e, t_umbral, t_conj, dt_A_min, dt_B_min, dt_AB_min, min_dist_km });
}

console.log('Per-eclipse results (first 15 of 58):');
console.log('Eclipse                    Δt_A (min)   Δt_B (min)   Δt(A−B)    UmbralDist(km)');
console.log('─'.repeat(85));
for (const r of results.slice(0, 15)) {
  console.log(`${r.label.padEnd(25)} ${r.dt_A_min.toFixed(2).padStart(9)}    ${r.dt_B_min.toFixed(2).padStart(9)}    ${r.dt_AB_min.toFixed(2).padStart(7)}    ${r.min_dist_km.toFixed(0).padStart(8)}`);
}

function stats(arr) {
  const n = arr.length;
  const mean = arr.reduce((a, x) => a + x, 0) / n;
  const rms = Math.sqrt(arr.reduce((a, x) => a + x*x, 0) / n);
  const max = arr.reduce((a, x) => Math.max(a, Math.abs(x)), 0);
  return { mean, rms, max };
}

const sA  = stats(results.map(r => r.dt_A_min));
const sB  = stats(results.map(r => r.dt_B_min));
const sAB = stats(results.map(r => r.dt_AB_min));
console.log('');
console.log('Statistics across all 58 eclipses:');
console.log('                            mean         RMS         max(|x|)');
console.log(`  Δt_A (umbral - NASA):  ${sA.mean.toFixed(3).padStart(8)}  ${sA.rms.toFixed(3).padStart(8)}    ${sA.max.toFixed(3).padStart(8)}  (minutes)`);
console.log(`  Δt_B (conj   - NASA):  ${sB.mean.toFixed(3).padStart(8)}  ${sB.rms.toFixed(3).padStart(8)}    ${sB.max.toFixed(3).padStart(8)}  (minutes)`);
console.log(`  Δt(A − B):             ${sAB.mean.toFixed(3).padStart(8)}  ${sAB.rms.toFixed(3).padStart(8)}    ${sAB.max.toFixed(3).padStart(8)}  (minutes, umbral vs conjunction)`);
console.log('');
console.log('Min umbral distance (geocentric):');
const distStats = stats(results.map(r => r.min_dist_km));
console.log(`  mean=${distStats.mean.toFixed(0)} km, RMS=${distStats.rms.toFixed(0)} km, max=${distStats.max.toFixed(0)} km`);
console.log(`  (Earth radius: 6378 km. If min_dist < 6378 km, eclipse is geocentric central)`);
console.log('');
console.log('Interpretation:');
console.log('  - If Δt_A RMS < 1 min: framework agrees with NASA on umbral-axis greatest-eclipse moment ✓');
console.log('  - If Δt_B differs from Δt_A by minutes: that is the umbral-vs-conjunction definitional offset');
console.log('  - Min umbral distance compared to NASA gamma (impact parameter / 6378) gives geometric agreement');
