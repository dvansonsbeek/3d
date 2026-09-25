/**
 * The ψ/K amplitude relations + the retired law-loop constructions —
 * THE shared implementation (Phase 8.3, layer L2). Status per relation
 * (doc 10 "The Six Fibonacci Relations"; the restatement: the N-body
 * chain is the planet path):
 *  - ψ (computePsiConstant/computeInclinationLaw) and K (computeKConstant/
 *    computeEccentricityLaw's amplitude) are OPEN PREDICTIONS — untested
 *    empirical amplitude laws, derived from Earth alone, kept as stated.
 *  - The wobble beat (computeWobblePeriodYears) is kinematic frame
 *    arithmetic — the permanent class.
 *  - The obliquity-mean snapshot and the eccentricity base/phase
 *    (System-Reset construction) belong to the RETIRED law framework —
 *    today serving the legacy scene scaffolding, the no-chain bodies
 *    (Pluto/Halley/Eros) and the o.fib* diagnostics (doc 72 — the closed
 *    loop; docs/37 is archived, see docs/retired-record.md).
 *
 * Extracted VERBATIM in the BROWSER's expression forms from src/script.js
 * (the ψ loop, calcWobblePeriod, the obliquity-cycle aliases,
 * calcObliquityMean's load-time snapshot branch, the K loop), which
 * tools/lib/constants.js + constants/utils.js hand-mirrored with last-ulp
 * operation-order variants (measured: 32/42 law outputs bit-exact, 10 at
 * the 1e-11..1e-15 relative class) — those variants dissolve here.
 *
 * LOAD-BEARING conventions:
 *  - ψ = 3·A_earth·√(M_EARTH_ALONE/M_SUN): the ALONE/SYSTEM mass asymmetry
 *    is calibration convention (doc 24) — switching Earth to SYSTEM shifts
 *    ψ by 0.612% and would require re-calibrating A_earth.
 *  - Wobble = beat of |axial| and |ICRF| RATES (sign-free — Venus's
 *    prograde-axial/retrograde-ICRF case); |axial| > 8H ⇒ frozen ⇒
 *    wobble = |ICRF| exactly.
 *  - The obliquity-mean law here is the SNAPSHOT form (the browser's
 *    module-load TDZ fallback — the value both engines actually ship at
 *    load); the browser's runtime integrated path stays engine-side with
 *    its Phase-8 anchors. Note it uses 1/(H/13), where the runtime
 *    integrated form uses 13/H — historical operation orders, preserved.
 *  - K-law phase offset: 90° in-phase, 270° anti-phase (Saturn) — the n=7
 *    System Reset state (all planets at mean e, Saturn falling).
 *  - The Node mirror carried an `else` branch for bodies without a wobble
 *    period — DEAD code (the loop is fibonacciD-guarded and all seven
 *    carriers have wobble periods); dropped here, recorded in the commit.
 */

'use strict';

/**
 * ψ constant from Earth's calibration. @param {{
 *   earthInvPlaneInclinationAmplitude: number,
 *   massEarthAlone: number, massSun: number }} c @returns {number} */
function computePsiConstant(c) {
  return 3 * c.earthInvPlaneInclinationAmplitude * Math.sqrt(c.massEarthAlone / c.massSun);
}

/**
 * ψ law: invariable-plane inclination amplitude and mean.
 * @param {{ fibonacciD: number, massFrac: number,
 *   invPlaneInclinationJ2000: number, longitudePerihelion: number,
 *   inclinationCycleAnchor: number, antiPhase: boolean }} b
 * @param {number} psiConstant
 * @returns {{ amplitude: number, mean: number }} */
function computeInclinationLaw(b, psiConstant) {
  const amplitude = psiConstant / (b.fibonacciD * Math.sqrt(b.massFrac));
  const antiPhase = b.antiPhase ? -1 : 1;
  const mean = b.invPlaneInclinationJ2000
    - antiPhase * amplitude * Math.cos((b.longitudePerihelion - b.inclinationCycleAnchor) * Math.PI / 180);
  return { amplitude, mean };
}

// (The device's wobble beat of integer axial and obliquity fractions, the
// Venus/Neptune |ICRF| obliquity-cycle fallback and the snapshot "mean
// obliquity" left with plan 06 Phase 7 commit 2: the K law's cycle period is
// the chain's own g-mode beat (keplerian-chain computeSecularShape) and its
// obliquity input the derived J2000 obliquity (spin-channel
// computeObliquityJ2000Deg). docs/retired-record.md carries the record.)

/**
 * K constant from Earth's calibration. @param {{
 *   eccentricityAmplitude: number, massEarthAlone: number, massSun: number,
 *   earthTiltMeanDeg: number }} c @returns {number} */
function computeKConstant(c) {
  return c.eccentricityAmplitude * Math.sqrt(c.massEarthAlone / c.massSun)
    / (Math.sin(c.earthTiltMeanDeg * Math.PI / 180) * Math.sqrt(3));
}

/**
 * K law: eccentricity amplitude, base and J2000 phase.
 * @param {{ fibonacciD: number, massFrac: number, solarYearInput: number,
 *   orbitalEccentricityJ2000: number, antiPhase: boolean }} b
 * @param {{ kConstant: number, obliquityMeanDeg: number,
 *   wobblePeriodYears: number, t2000: number, meanSolarYearDays: number }} env
 * @returns {{ amplitude: number, base: number, phaseJ2000: number }} */
function computeEccentricityLaw(b, env) {
  const a = Math.pow(b.solarYearInput / env.meanSolarYearDays, 2 / 3);
  const amplitude = env.kConstant * Math.sin(Math.abs(env.obliquityMeanDeg) * Math.PI / 180) * Math.sqrt(b.fibonacciD)
    / (Math.sqrt(b.massFrac) * Math.pow(a, 1.5));
  const eJ2000 = b.orbitalEccentricityJ2000;
  const phaseOffset = b.antiPhase ? 270 : 90;
  const phaseDeg = (env.t2000 / env.wobblePeriodYears) * 360 + phaseOffset;
  const cosTheta = Math.cos(phaseDeg * Math.PI / 180);
  const sinTheta = Math.sin(phaseDeg * Math.PI / 180);
  const disc = eJ2000 * eJ2000 - amplitude * amplitude * sinTheta * sinTheta;
  const base = amplitude * cosTheta + Math.sqrt(Math.max(0, disc));
  return { amplitude, base, phaseJ2000: ((phaseDeg % 360) + 360) % 360 };
}

module.exports = {
  computePsiConstant, computeInclinationLaw,
  computeKConstant, computeEccentricityLaw,
};
