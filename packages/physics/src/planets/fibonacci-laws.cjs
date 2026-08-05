/**
 * The Fibonacci Laws — THE shared implementation (Phase 8.3, layer L2).
 *
 * The scientific heart of the model: the closed derivation loop
 *   ψ → inclination amplitude/mean → wobble period → obliquity mean →
 *   K → eccentricity amplitude → phase → base
 * that turns per-body Fibonacci divisors and mass fractions into every
 * planet's inclination and eccentricity structure (docs/37, doc 99).
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
 *    is calibration convention (doc 25) — switching Earth to SYSTEM shifts
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

/**
 * Wobble period: beat of axial precession and perihelion ICRF precession.
 * @param {number} periEclYr @param {number} axialYr @param {number} H
 * @returns {number} years */
function computeWobblePeriodYears(periEclYr, axialYr, H) {
  const H13 = H / 13;
  const inclICRF = (periEclYr * H13) / (H13 - periEclYr);
  if (Math.abs(axialYr) > 8 * H) return Math.abs(inclICRF);
  const wobbleRate = Math.abs(1 / Math.abs(axialYr) - 1 / Math.abs(inclICRF));
  return 1 / wobbleRate;
}

/**
 * Obliquity cycle with the Venus/Neptune fallback: the record's cycle if
 * present, else |ICRF| (tidally damped — the two-component obliquity
 * formula cancels exactly, constant tilt).
 * @param {number | null | undefined} obliquityCycleYears
 * @param {number} periEclYr @param {number} H @returns {number} */
function resolveObliquityCycleYears(obliquityCycleYears, periEclYr, H) {
  if (obliquityCycleYears !== undefined && obliquityCycleYears !== null) return obliquityCycleYears;
  return Math.abs(1 / (1 / periEclYr - 13 / H));
}

/**
 * Mean obliquity, SNAPSHOT form (the load-time law both engines ship):
 * mean = tiltJ2000 + amp·cos(ωᵢ·t₂₀₀₀) − amp·cos(ωₒ·t₂₀₀₀).
 * @param {{ axialTiltJ2000: number, invPlaneInclinationAmplitude: number,
 *   perihelionEclipticYears: number }} b
 * @param {number | null | undefined} obliqCycleYears — falsy ⇒ static tilt
 * @param {{ H: number, t2000: number }} env — t2000 = 2000 − eccentricity
 *   anchor (balancedYear − systemResetN·H)
 * @returns {number} degrees */
function computeObliquityMeanSnapshot(b, obliqCycleYears, env) {
  if (!obliqCycleYears) return b.axialTiltJ2000;
  const amp = b.invPlaneInclinationAmplitude;
  const genPrecRate = 1 / (env.H / 13);
  const icrfPeriod = 1 / (1 / b.perihelionEclipticYears - genPrecRate);
  return b.axialTiltJ2000 + amp * Math.cos(2 * Math.PI * env.t2000 / icrfPeriod)
                          - amp * Math.cos(2 * Math.PI * env.t2000 / obliqCycleYears);
}

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
  computePsiConstant, computeInclinationLaw, computeWobblePeriodYears,
  resolveObliquityCycleYears, computeObliquityMeanSnapshot,
  computeKConstant, computeEccentricityLaw,
};
