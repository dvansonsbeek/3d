// ═══════════════════════════════════════════════════════════════
// EARTH Ω CALIBRATION SWEEP
//
// The model uses Earth's J2000 ascending node Ω_e as the FIXED
// anchor for the invariable plane. Each planet's "verified" Ω is
// then derived by optimizing it so that the calculated J2000
// ecliptic inclination (= angle between planet plane and Earth
// plane) matches JPL exactly.
//
// Currently Ω_e = 284.51° (from Souami & Souchay 2012, possibly
// with epoch ambiguity). The full calibration chain is:
//
//   Ω_e (input)
//     → Earth orbital plane normal at J2000
//     → solve Ω_p for each planet so calculated ecliptic inclination
//        matches JPL target (uses planet's INVARIABLE plane inclination
//        and the spherical-law-of-cosines formula)
//     → 7 "verified" Ω_p values (one per fitted planet)
//     → vector balance residual at J2000 = Σ L_i sin(i_i)·(cos Ω_i, sin Ω_i)
//
// This script sweeps Ω_e over a wide range, re-runs the calibration
// at each step, and reports the resulting J2000 vector residual.
// The minimum identifies the Ω_e value that is most self-consistent
// with the angular momentum conservation constraint.
//
// If a better Ω_e exists, it would simultaneously:
//   (a) close (or shrink) the 0.42% J2000 vector residual gap
//   (b) shift every planet's verified Ω, possibly improving JPL
//       trend matching downstream
//
// Usage: node tools/explore/earth-omega-calibration-sweep.js
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// ─── Static inputs (do not depend on Ω_e) ───
const FITTED = ['mercury','venus','mars','jupiter','saturn','uranus','neptune'];
const ALL = ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];

// JPL J2000 ecliptic inclinations (TARGETS — these define the calibration)
const jplEclipticJ2000 = {
  mercury: 7.00497902,
  venus:   3.39467605,
  mars:    1.84969142,
  jupiter: 1.30439695,
  saturn:  2.48599187,
  uranus:  0.77263783,
  neptune: 1.77004347,
};

// Souami & Souchay 2012 starting nodes (used as initial guess for the optimizer)
const ssNodes = {
  mercury: 32.22, venus: 52.31, mars: 352.95,
  jupiter: 306.92, saturn: 122.27, uranus: 308.44, neptune: 189.28,
};

// Earth J2000 inclination (FIXED — comes from astronomy, not from Ω_e)
const earthInclJ2000 = C.ASTRO_REFERENCE.earthInclinationJ2000_deg;

// Per-planet invariable plane inclination at J2000 + L weight
const planetData = {};
for (const key of FITTED) {
  const p = C.planets[key];
  const a = C.derived[key].orbitDistance;
  const e = C.eccJ2000[key];
  planetData[key] = {
    invIncl: p.invPlaneInclinationJ2000,
    L: C.massFraction[key] * Math.sqrt(a * (1 - e * e)),
  };
}
const earthL = C.massFraction.earth * Math.sqrt(1.0 * (1 - C.eccJ2000.earth ** 2));

// ─── Compute apparent ecliptic inclination from plane normals ───
function eclInclFromNormals(planetIncl, planetOmega, earthIncl, earthOmega) {
  const pI = planetIncl * DEG2RAD;
  const pO = planetOmega * DEG2RAD;
  const eI = earthIncl * DEG2RAD;
  const eO = earthOmega * DEG2RAD;
  const dot =
    Math.sin(pI) * Math.sin(eI) * (Math.sin(pO) * Math.sin(eO) + Math.cos(pO) * Math.cos(eO)) +
    Math.cos(pI) * Math.cos(eI);
  return Math.acos(Math.max(-1, Math.min(1, dot))) * RAD2DEG;
}

// ─── Solve for planet Ω that gives target ecliptic inclination ───
//
// The constraint:
//   target = acos[cos(i_p)cos(i_e) + sin(i_p)sin(i_e) cos(Ω_p − Ω_e)]
//
// → cos(target) = cos(i_p)cos(i_e) + sin(i_p)sin(i_e) cos(ΔΩ)
// → cos(ΔΩ)   = (cos(target) − cos(i_p)cos(i_e)) / (sin(i_p) sin(i_e))
//
// Two solutions: ΔΩ = ±acos(...). Pick the one closest to the S&S
// starting node (this matches the existing "verified" calibration).
function solveOmega(planetIncl, targetEcl, earthIncl, earthOmega, ssGuess) {
  const pI = planetIncl * DEG2RAD;
  const eI = earthIncl * DEG2RAD;
  const tgt = targetEcl * DEG2RAD;
  const denom = Math.sin(pI) * Math.sin(eI);
  if (Math.abs(denom) < 1e-12) return null;
  let cosDelta = (Math.cos(tgt) - Math.cos(pI) * Math.cos(eI)) / denom;
  cosDelta = Math.max(-1, Math.min(1, cosDelta));
  const dAbs = Math.acos(cosDelta) * RAD2DEG;
  const cand1 = ((earthOmega + dAbs) % 360 + 360) % 360;
  const cand2 = ((earthOmega - dAbs) % 360 + 360) % 360;
  // Pick the one closest to SS starting guess
  function dist(a, b) { let d = (a - b) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return Math.abs(d); }
  return dist(cand1, ssGuess) < dist(cand2, ssGuess) ? cand1 : cand2;
}

// ─── Compute J2000 vector residual given Ω_e ───
function computeResidual(earthOmega) {
  const omegas = { earth: earthOmega };
  for (const key of FITTED) {
    omegas[key] = solveOmega(
      planetData[key].invIncl,
      jplEclipticJ2000[key],
      earthInclJ2000,
      earthOmega,
      ssNodes[key]
    );
  }
  // Compute V
  let Vx = 0, Vy = 0, sumLsi = 0;
  for (const key of ALL) {
    const i = key === 'earth' ? earthInclJ2000 : planetData[key].invIncl;
    const Om = omegas[key];
    const L  = key === 'earth' ? earthL : planetData[key].L;
    const Lsi = L * Math.sin(i * DEG2RAD);
    Vx += Lsi * Math.cos(Om * DEG2RAD);
    Vy += Lsi * Math.sin(Om * DEG2RAD);
    sumLsi += Math.abs(Lsi);
  }
  return {
    Vx, Vy,
    mag: Math.sqrt(Vx * Vx + Vy * Vy),
    rel: Math.sqrt(Vx * Vx + Vy * Vy) / sumLsi,
    omegas,
  };
}

// ═══════════════════════════════════════════════════════════════
// SWEEP
// ═══════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  EARTH Ω CALIBRATION SWEEP');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  Sweeping Ω_e over [0°, 360°) and re-solving the verified');
console.log('  ascending nodes for all 7 fitted planets at each step.');
console.log('  Goal: find Ω_e minimizing the J2000 vector residual.');
console.log('');

// Coarse sweep [0, 360) at 0.1°
let best = { Om: 0, rel: Infinity, res: null };
let worst = { Om: 0, rel: 0 };
for (let Om = 0; Om < 360; Om += 0.1) {
  const r = computeResidual(Om);
  if (r.rel < best.rel) best = { Om, rel: r.rel, res: r };
  if (r.rel > worst.rel) worst = { Om, rel: r.rel };
}

// Fine sweep ±2° around best at 0.001°
const center = best.Om;
for (let d = -2; d <= 2; d += 0.001) {
  const Om = ((center + d) % 360 + 360) % 360;
  const r = computeResidual(Om);
  if (r.rel < best.rel) best = { Om, rel: r.rel, res: r };
}

// Reference: current Ω_e = 284.51
const current = computeResidual(284.51);

console.log('  ─── REFERENCE: current Ω_e = 284.51° ─────────────────────────');
console.log(`    Vector residual:  ${(current.rel * 100).toFixed(4)} %`);
console.log(`    Verified Ω values (re-derived for cross-check):`);
for (const key of FITTED) {
  const stored = C.planets[key].ascendingNodeInvPlane;
  const fresh  = current.omegas[key];
  const d = fresh - stored;
  console.log(`      ${key.padEnd(8)} fresh=${fresh.toFixed(3)}°  stored=${stored.toFixed(3)}°  Δ=${(d>=0?'+':'')+d.toFixed(3)}°`);
}
console.log('');

console.log('  ─── BEST Ω_e FROM SWEEP ──────────────────────────────────────');
console.log(`    Ω_e = ${best.Om.toFixed(4)}°`);
console.log(`    Vector residual:  ${(best.rel * 100).toFixed(6)} %`);
console.log(`    Δ from 284.51:    ${(best.Om - 284.51 >= 0 ? '+' : '') + (best.Om - 284.51).toFixed(4)}°`);
console.log('');
console.log(`    Re-derived verified Ω values:`);
for (const key of FITTED) {
  const stored = C.planets[key].ascendingNodeInvPlane;
  const fresh  = best.res.omegas[key];
  let d = fresh - stored;
  if (d > 180) d -= 360; else if (d < -180) d += 360;
  console.log(`      ${key.padEnd(8)} fresh=${fresh.toFixed(3)}°  stored=${stored.toFixed(3)}°  Δ=${(d>=0?'+':'')+d.toFixed(3)}°`);
}
console.log('');

console.log('  ─── CONTEXT: how sensitive is the residual to Ω_e? ──────────');
console.log(`    Worst residual in sweep: ${(worst.rel * 100).toFixed(4)} %  at Ω_e = ${worst.Om.toFixed(2)}°`);
console.log(`    Best residual in sweep:  ${(best.rel * 100).toFixed(4)} %  at Ω_e = ${best.Om.toFixed(2)}°`);
console.log(`    Ratio worst/best:        ${(worst.rel / best.rel).toFixed(2)}×`);
console.log('');

// Print residual at sample Ω_e values around current
console.log('  ─── LOCAL CURVE (Ω_e ± 5° in 0.5° steps): ───────────────────');
console.log('     Ω_e      │ residual (%)');
console.log('     ─────────┼─────────────');
for (let d = -5; d <= 5; d += 0.5) {
  const Om = 284.51 + d;
  const r = computeResidual(Om);
  const mark = Math.abs(d) < 0.001 ? '   ← current' : '';
  console.log(`     ${Om.toFixed(2).padStart(7)}°  │  ${(r.rel * 100).toFixed(4)}%${mark}`);
}
console.log('');
