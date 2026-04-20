// ═══════════════════════════════════════════════════════════════════════════
// FITTED COEFFICIENTS — Output of fitting scripts in tools/fit/.
// Loaded from public/input/fitted-coefficients.json (single source of truth).
// Fitting scripts write to the JSON file; this module reads from it.
//
// When to refit: see tools/fit/README.md for the dependency chain.
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

// Load all fitted data from JSON (single source of truth)
const data = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '..', '..', '..', 'public', 'input', 'fitted-coefficients.json'), 'utf8'));

// Static fitted arrays (from JSON)
const TROPICAL_YEAR_HARMONICS = data.TROPICAL_YEAR_HARMONICS;
const SIDEREAL_YEAR_HARMONICS = data.SIDEREAL_YEAR_HARMONICS;
const ANOMALISTIC_YEAR_HARMONICS = data.ANOMALISTIC_YEAR_HARMONICS;
const PERI_HARMONICS_RAW = data.PERI_HARMONICS_RAW;
const PERI_OFFSET = data.PERI_OFFSET;
const SOLSTICE_OBLIQUITY_MEAN_FITTED = data.SOLSTICE_OBLIQUITY_MEAN_FITTED;
const SOLSTICE_OBLIQUITY_HARMONICS = data.SOLSTICE_OBLIQUITY_HARMONICS;
const CARDINAL_POINT_HARMONICS = data.CARDINAL_POINT_HARMONICS;
const CARDINAL_POINT_ANCHORS_ADJUSTED = data.CARDINAL_POINT_ANCHORS_ADJUSTED || null;
const SOLSTICE_JD_HARMONICS = CARDINAL_POINT_HARMONICS.SS;  // Legacy alias
const PARALLAX_DEC_CORRECTION = data.PARALLAX_DEC_CORRECTION;
const PARALLAX_RA_CORRECTION = data.PARALLAX_RA_CORRECTION;
const MOON_CORRECTION = data.MOON_CORRECTION || null;
const GRAVITATION_CORRECTION = data.GRAVITATION_CORRECTION || null;
const ELONGATION_CORRECTION = data.ELONGATION_CORRECTION || null;


// ─── Dynamic fitted values ───────────────────────────────────────────────
// These depend on model parameters and are built at require-time.

/**
 * Build fitted coefficients that depend on model parameters.
 * @param {object} params - { earthtiltMean, earthInvPlaneInclinationAmplitude,
 *                            earthRAAngle, earthInvPlaneInclinationMean, planets, H }
 * @returns {{ SOLSTICE_OBLIQUITY_MEAN: number, PREDICT_PLANETS: object, PREDICT_COEFFS: object, PERI_HARMONICS: Array }}
 */
function buildFittedCoefficients(params) {
  // Pythagorean obliquity mean — derived from 3D geometry (zero fitting)
  const N = 100000;
  let sum = 0;
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const p3 = 2 * Math.PI * t * 3, p5 = 2 * Math.PI * t * 5;
    const p8 = 2 * Math.PI * t * 8, p16 = 2 * Math.PI * t * 16;
    const e = params.earthtiltMean
      - params.earthInvPlaneInclinationAmplitude * Math.cos(p3)
      + params.earthInvPlaneInclinationAmplitude * Math.cos(p8);
    const pa = params.earthRAAngle * Math.cos(p16);
    const pb = params.earthInvPlaneInclinationMean * Math.sin(p5);
    sum += Math.sqrt(e * e + pa * pa + pb * pb);
  }
  // Use data-derived solstice mean (more accurate than Pythagorean time-average),
  // fall back to Pythagorean mean if the fitted constant hasn't been generated yet.
  const SOLSTICE_OBLIQUITY_MEAN = typeof SOLSTICE_OBLIQUITY_MEAN_FITTED !== 'undefined'
    ? SOLSTICE_OBLIQUITY_MEAN_FITTED
    : sum / N;

  // Per-planet prediction configs (period, theta0, baseline rate)
  const PREDICT_PLANETS = {};
  for (const [key, p] of Object.entries(params.planets)) {
    if (!p.perihelionEclipticYears || !p.longitudePerihelion) continue;
    const absPeriod = Math.abs(p.perihelionEclipticYears);
    const sign = p.perihelionEclipticYears < 0 ? -1 : 1;
    PREDICT_PLANETS[key] = {
      period: absPeriod,
      theta0: p.longitudePerihelion,
      baseline: sign * 1296000 / absPeriod * 100,
    };
  }

  // 2421-term physical-beat coefficients per planet (from fitted-coefficients.json)
  const PREDICT_COEFFS = data.PREDICT_COEFFS_PHYSICAL || data.PREDICT_COEFFS_UNIFIED || {};

  // Perihelion harmonics — expand divisors to actual periods using H
  const PERI_HARMONICS = PERI_HARMONICS_RAW.map(([div, s, c]) => [params.H / div, s, c]);

  return { SOLSTICE_OBLIQUITY_MEAN, PREDICT_PLANETS, PREDICT_COEFFS, PERI_HARMONICS };
}


module.exports = {
  // Parallax corrections (attached to ASTRO_REFERENCE by constants.js)
  PARALLAX_DEC_CORRECTION,
  PARALLAX_RA_CORRECTION,
  MOON_CORRECTION,
  GRAVITATION_CORRECTION,
  ELONGATION_CORRECTION,

  // Static fitted arrays
  TROPICAL_YEAR_HARMONICS,
  SIDEREAL_YEAR_HARMONICS,
  ANOMALISTIC_YEAR_HARMONICS,
  PERI_HARMONICS_RAW,
  PERI_OFFSET,
  SOLSTICE_OBLIQUITY_HARMONICS,
  CARDINAL_POINT_HARMONICS,
  CARDINAL_POINT_ANCHORS_ADJUSTED,
  SOLSTICE_JD_HARMONICS,

  // Factory for dynamic values
  buildFittedCoefficients,
};
