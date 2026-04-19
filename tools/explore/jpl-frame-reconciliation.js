// ═══════════════════════════════════════════════════════════════
// JPL FRAME RECONCILIATION
//
// We've been computing ecliptic inclination as the angle between
// each planet's CURRENT orbital plane and EARTH'S CURRENT orbital
// plane — both of which are dynamic. JPL's published dI/dt values,
// by contrast, are measured against the FIXED J2000 ecliptic
// (Earth's plane frozen at J2000 forever).
//
// Over a 200-year span (1900–2100), Earth's plane moves by
// ~0.005–0.01° relative to J2000 (amp 0.636°, period H/3 = 112 kyr,
// → ~6° advance over 200 yr × small sine derivative). This is
// COMPARABLE TO the trend values we've been trying to fit for
// Saturn (7″/cy) and Neptune (1″/cy). The frame mismatch could
// fully explain the residual.
//
// This script computes both:
//   (a) Trend vs MOVING Earth (model's ecliptic-of-date)
//   (b) Trend vs FIXED J2000 Earth (JPL's convention)
// and shows that (b) is the correct comparison for JPL's dI/dt.
//
// RESULT: With the current asc-node integers (fit to JPL J2000-fixed
// frame), the fixed-frame comparison gives ~4.3″/cy total error with
// 7/7 direction matches. The moving-frame gives different values that
// should NOT be compared to JPL directly.
//
// Usage: node tools/explore/jpl-frame-reconciliation.js
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

const PLANETS = ['mercury','venus','mars','jupiter','saturn','uranus','neptune'];

const jplTrends = {
  mercury: -0.00595, venus: -0.00079, mars: -0.00813,
  jupiter: -0.00184, saturn: +0.00194, uranus: -0.00243, neptune: +0.00035,
};

const genPrecRate = 1 / (H / 13);
const data = {};
for (const key of PLANETS) {
  const p = C.planets[key];
  const eclP = p.perihelionEclipticYears;
  const icrfPeriod = 1 / (1 / eclP - genPrecRate);
  const d = p.fibonacciD;
  const sqrtM = Math.sqrt(C.massFraction[key]);
  const amp = PSI / (d * sqrtM);
  const antiSign = p.antiPhase ? -1 : 1;
  const phase = p.inclinationCycleAnchor;
  const cosJ2000 = Math.cos((p.longitudePerihelion - phase) * DEG2RAD);
  const mean = p.invPlaneInclinationJ2000 - antiSign * amp * cosJ2000;
  const ascNodeRate = p.ascendingNodeCyclesIn8H
    ? -360 * p.ascendingNodeCyclesIn8H / (8 * H)
    : 360 / (-H / 5);  // Earth fallback
  data[key] = {
    periLongJ2000: p.longitudePerihelion,
    omegaJ2000: p.ascendingNodeInvPlane,
    icrfRate: 360 / icrfPeriod,
    ascNodeRate,
    mean, amp, antiSign, phase,
  };
}
data.earth = {
  omegaJ2000: C.ASTRO_REFERENCE.earthAscendingNodeInvPlane,
  inclJ2000: C.ASTRO_REFERENCE.earthInclinationJ2000_deg,
  earthMean: C.earthInvPlaneInclinationMean,
  earthAmp:  C.earthInvPlaneInclinationAmplitude,
  earthPhaseAngle: C.ASTRO_REFERENCE.earthInclinationCycleAnchor,
  periLongJ2000: C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000,
  icrfRate: 360 / (H / 3),
  ascNodeRate: -360 * 40 / (8 * H),  // Earth: -8H/40 = -H/5
};

function planetInclAt(key, year) {
  const pl = data[key];
  const peri = pl.periLongJ2000 + pl.icrfRate * (year - 2000);
  return pl.mean + pl.antiSign * pl.amp * Math.cos((peri - pl.phase) * DEG2RAD);
}
function earthInclAt(year) {
  const pl = data.earth;
  const peri = pl.periLongJ2000 + pl.icrfRate * (year - 2000);
  return pl.earthMean + pl.earthAmp * Math.cos((peri - pl.earthPhaseAngle) * DEG2RAD);
}
function omegaAt(key, year) {
  return data[key].omegaJ2000 + data[key].ascNodeRate * (year - 2000);
}

// Spherical-law-of-cosines: angle between two planes given their (i, Ω)
function planeAngle(iA, omA, iB, omB) {
  const iAr = iA * DEG2RAD, iBr = iB * DEG2RAD;
  const dom = (omA - omB) * DEG2RAD;
  const dot = Math.cos(iAr) * Math.cos(iBr) + Math.sin(iAr) * Math.sin(iBr) * Math.cos(dom);
  return Math.acos(Math.max(-1, Math.min(1, dot))) * RAD2DEG;
}

// (a) Moving-Earth trend (current model convention)
function trendMovingEarth(key) {
  const e1900 = planeAngle(planetInclAt(key, 1900), omegaAt(key, 1900),
                           earthInclAt(1900),       omegaAt('earth', 1900));
  const e2100 = planeAngle(planetInclAt(key, 2100), omegaAt(key, 2100),
                           earthInclAt(2100),       omegaAt('earth', 2100));
  return (e2100 - e1900) / 2;
}

// (b) Fixed-J2000-Earth trend (JPL convention)
// Earth's plane is FROZEN at J2000: inclination = 1.5787°, Ω = 284.51°
// (Both in invariable-plane reference frame.)
function trendFixedJ2000Earth(key) {
  const eIfixed = data.earth.inclJ2000;
  const eOmFixed = data.earth.omegaJ2000;
  const e1900 = planeAngle(planetInclAt(key, 1900), omegaAt(key, 1900), eIfixed, eOmFixed);
  const e2100 = planeAngle(planetInclAt(key, 2100), omegaAt(key, 2100), eIfixed, eOmFixed);
  return (e2100 - e1900) / 2;
}

// (c) For sanity: also report Earth-Earth angle change (how much Earth's
// plane moves between 1900 and 2100). This is the magnitude of the frame
// effect we're testing.
function earthSelfDrift() {
  return planeAngle(earthInclAt(1900), omegaAt('earth', 1900),
                    earthInclAt(2100), omegaAt('earth', 2100));
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('  JPL FRAME RECONCILIATION');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  Model: Config #1, per-planet asc-node rates (8H/N).');
console.log('  All trends are slope between 1900 and 2100, in deg/century.');
console.log('');

console.log(`  Earth\'s own plane drift between 1900 and 2100: ${earthSelfDrift().toFixed(6)}°`);
console.log(`  ( = how much Earth\'s plane moves in 200 yr; sets the frame-mismatch scale )`);
console.log('');

console.log('  ─── COMPARISON ─────────────────────────────────────────────');
console.log('  Planet   │ Moving Earth  │ Fixed J2000   │ JPL          │ MovErr  │ FixErr  │ Better');
console.log('  ─────────┼───────────────┼───────────────┼──────────────┼─────────┼─────────┼───────');
let totalMov = 0, totalFix = 0, dirMov = 0, dirFix = 0;
for (const key of PLANETS) {
  const tMov = trendMovingEarth(key);
  const tFix = trendFixedJ2000Earth(key);
  const jpl = jplTrends[key];
  const eMov = Math.abs(tMov - jpl) * 3600;
  const eFix = Math.abs(tFix - jpl) * 3600;
  totalMov += eMov;
  totalFix += eFix;
  if ((tMov >= 0) === (jpl >= 0)) dirMov++;
  if ((tFix >= 0) === (jpl >= 0)) dirFix++;
  const better = eFix < eMov ? 'FIXED' : 'moving';
  console.log(
    '  ' + key.padEnd(8) + ' │ ' +
    ((tMov >= 0 ? '+' : '') + tMov.toFixed(6)).padStart(13) + ' │ ' +
    ((tFix >= 0 ? '+' : '') + tFix.toFixed(6)).padStart(13) + ' │ ' +
    ((jpl >= 0 ? '+' : '') + jpl.toFixed(5)).padStart(12) + ' │ ' +
    eMov.toFixed(2).padStart(7) + ' │ ' +
    eFix.toFixed(2).padStart(7) + ' │ ' +
    better
  );
}
console.log('  ─────────┴───────────────┴───────────────┴──────────────┴─────────┴─────────┴───────');
console.log(`  Total trend err: moving = ${totalMov.toFixed(2)}″/cy   fixed = ${totalFix.toFixed(2)}″/cy`);
console.log(`  Direction matches: moving = ${dirMov}/7   fixed = ${dirFix}/7`);
console.log('');

console.log('  ─── INTERPRETATION ─────────────────────────────────────────');
if (totalFix < totalMov * 0.5) {
  console.log('  The fixed-J2000 frame fits JPL DRAMATICALLY better.');
  console.log('  → The model has been computing the wrong observable. JPL\'s reported');
  console.log('    dI/dt is to the J2000 ecliptic, but we\'ve been comparing to a');
  console.log('    moving-Earth angle. Switching frame likely fixes Saturn/Neptune.');
} else if (totalFix < totalMov) {
  console.log('  Fixed-J2000 frame fits modestly better.');
  console.log('  → Frame is part of the issue but not the whole story.');
} else {
  console.log('  Fixed-J2000 frame is NOT better. Frame mismatch is not the cause.');
  console.log('  → The discrepancy must come from elsewhere in the model.');
}
console.log('');

// ─── Additional check: rebuild Earth as truly fixed in EVERY direction ───
// We're doing the angle calculation against (i_e, Ω_e) frozen at J2000.
// This corresponds to "what JPL ecliptic_inclination(t) means: angle between
// the planet's CURRENT plane and Earth's J2000 plane (which IS the J2000
// ecliptic by definition)".
//
// For completeness, let's also check the EXACT JPL definition: inclination
// is computed in J2000 ecliptic coordinates, where the planet's i and Ω are
// expressed against the J2000 ecliptic plane. In our invariable-plane model,
// this is equivalent to the spherical angle we just computed in path (b).
//
// So path (b) IS the correct JPL-comparable observable.
console.log('  ─── METHOD NOTE ─────────────────────────────────────────────');
console.log('  Path (b) computes angle(planet plane(t), Earth plane(J2000))');
console.log('  which equals the JPL ecliptic inclination at year t, since the');
console.log('  J2000 ecliptic IS Earth\'s J2000 orbital plane by definition.');
console.log('  This is the correct quantity to compare against JPL dI/dt.');
console.log('');
