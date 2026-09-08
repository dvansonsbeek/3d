/**
 * vsop87.cjs — K8: the STANDARD-MODEL reference evaluator (VSOP87A).
 *
 * Evaluates the truncated VSOP87A series (Bretagnon & Francou 1988, CDS
 * VI/81): heliocentric rectangular XYZ in the dynamical ecliptic and
 * equinox of J2000, in AU. coord(t) = Σ_n t^n Σ_i A·cos(B + C·t) with
 * t = (JD − 2451545)/365250 — the epoch and time unit are the THEORY'S
 * OWN definition, not model constants.
 *
 * DATA: the single home is data/vsop87a-truncated.json (tracked,
 * PROVENANCE-covered; source, truncation budget and raw checksums in its
 * meta — written by tools/pipeline/import-vsop87.js). This module
 * requires it directly; there is no embedded copy.
 *
 * ONE-WAY BOUNDARY (the K2 doctrine, K8): this package exists so the
 * simulator can display the Sun and planets AS THE CURRENT SCIENTIFIC
 * MODEL predicts them, next to the model's own bodies, with a live Δ
 * readout. It is REFERENCE-ONLY — nothing in the model chain (engines,
 * laws, fitters, artifacts) may import from it. Comparison surfaces and
 * tests only. Delivered accuracy is measured by
 * tools/explore/k8-vsop-probe.mjs against the JPL Horizons cache.
 */

'use strict';

const VSOP87A_ARTIFACT = require('../../../data/vsop87a-truncated.json');
const VSOP87A = VSOP87A_ARTIFACT.bodies;
const VSOP87A_META = VSOP87A_ARTIFACT.meta;

const J2000_JD = 2451545.0;   // the theory's own epoch (VSOP87 definition)

/** @typedef {[number, number, number]} Vec3AU */

/**
 * Heliocentric ecliptic-J2000 position of a body, in AU.
 * @param {string} body - mercury|venus|earth|mars|jupiter|saturn|uranus|neptune
 * @param {number} jd - Julian day (TDB-class; the display convention)
 * @returns {Vec3AU} [x, y, z] AU, ecliptic and equinox J2000
 */
function vsop87HelioEclipticAU(body, jd) {
  const series = /** @type {Record<string, Record<string, number[][][]>>} */ (VSOP87A)[body];
  if (!series) throw new Error(`vsop87: unknown body "${body}"`);
  const t = (jd - J2000_JD) / 365250;   // thousands of Julian years (theory definition)
  /** @type {Vec3AU} */
  const out = [0, 0, 0];
  let ci = 0;
  for (const coord of ['x', 'y', 'z']) {
    let sum = 0;
    let tPow = 1;
    const powers = series[coord];
    for (let n = 0; n < powers.length; n++) {
      const terms = powers[n];
      let s = 0;
      for (let i = 0; i < terms.length; i++) {
        const term = terms[i];
        s += term[0] * Math.cos(term[1] + term[2] * t);
      }
      sum += s * tPow;
      tPow *= t;
    }
    out[ci++] = sum;
  }
  return out;
}

/**
 * Geocentric ecliptic-J2000 position of a body (or 'sun'), in AU —
 * geometric (no light-time; the caller owns that convention).
 * @param {string} body - sun|mercury|…|neptune
 * @param {number} jd - Julian day
 * @returns {Vec3AU} [x, y, z] AU, ecliptic and equinox J2000
 */
function vsop87GeoEclipticAU(body, jd) {
  const e = vsop87HelioEclipticAU('earth', jd);
  if (body === 'sun') return [-e[0], -e[1], -e[2]];
  const p = vsop87HelioEclipticAU(body, jd);
  return [p[0] - e[0], p[1] - e[1], p[2] - e[2]];
}

/**
 * ASTROMETRIC geocentric position (the Horizons quantity-1 convention):
 * the body at the retarded time t − τ, EARTH AT RECEPTION TIME t —
 * r_body(t−τ) − r_earth(t), one light-time iteration. The Sun sits at
 * the heliocentric origin, so its astrometric direction is exactly
 * −r_earth(t) with no retardation. (Retarding Earth too is the classic
 * mistake and injects a spurious v_E·τ ≈ 20″ term — measured by the
 * probe before this shipped.)
 * @param {string} body - sun|mercury|…|neptune
 * @param {number} jd - Julian day (reception time)
 * @param {number} lightDaysPerAU - light-time per AU in days (the
 *   caller supplies it from its own c/AU homes; ≈ 0.005775518)
 * @returns {Vec3AU} [x, y, z] AU, ecliptic and equinox J2000
 */
function vsop87AstrometricGeoEclipticAU(body, jd, lightDaysPerAU) {
  const e = vsop87HelioEclipticAU('earth', jd);
  if (body === 'sun') return [-e[0], -e[1], -e[2]];
  let p = vsop87HelioEclipticAU(body, jd);
  const tau = Math.hypot(p[0] - e[0], p[1] - e[1], p[2] - e[2]) * lightDaysPerAU;
  p = vsop87HelioEclipticAU(body, jd - tau);
  return [p[0] - e[0], p[1] - e[1], p[2] - e[2]];
}

module.exports = { vsop87HelioEclipticAU, vsop87GeoEclipticAU, vsop87AstrometricGeoEclipticAU, VSOP87A_META };
