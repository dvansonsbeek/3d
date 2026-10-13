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
// (plan 09: the three year-length combs TROPICAL/SIDEREAL/ANOMALISTIC_YEAR_
// HARMONICS and YEAR_LENGTH_J2000_ANCHOR are deleted — the year lengths of
// date are the one-family laws over the kinematic day of date)
// (plan 09 step 4: PERI_HARMONICS_RAW / PERI_OFFSET — the 25-term perihelion
// comb on H-divisors — are deleted; Earth's perihelion of date is the series'
// ϖ, createModel().earth.perihelionLongitudeDeg)
// (plan 09: SOLSTICE_OBLIQUITY_MEAN_FITTED / SOLSTICE_OBLIQUITY_HARMONICS retired —
// the obliquity of date is the hybrid ε of the one-source movement)
// (plan 09 step 5a: SUN_LONGITUDE_MEAN / SUN_LONGITUDE_HARMONICS — the Step-0
// Sun comb, retired from the Sun node at plan 06 R4 — are deleted with the fitter)
const CARDINAL_POINT_HARMONICS = data.CARDINAL_POINT_HARMONICS;
const CARDINAL_POINT_ANCHORS_ADJUSTED = data.CARDINAL_POINT_ANCHORS_ADJUSTED || null;
// §10 (Phase D) — equation-of-centre braiding terms ({order, sin, cos}, NOT
// the [div, sin, cos] harmonic shape) and the fit-calibrated lincoef + H(c)
// model. The runtime must reuse these VERBATIM, never recompute (§10c,
// §10e-quinquies: recomputing lincoef from the 1-year anchor injects a
// −12,276 s ramp).
const CARDINAL_POINT_ECC_TERMS = data.CARDINAL_POINT_ECC_TERMS || null;
const CARDINAL_POINT_DERIVED = data.CARDINAL_POINT_DERIVED || null;
// §10g — quadrature-locked joint sidebands, SHARED across the four points:
// phase = order·λ_X − 2π·div·cycles (COUNTER-rotating; the sign is
// load-bearing — see the fitter). {quadratureDeg, terms:[{order,div,sin,cos}]}.
const CARDINAL_POINT_JOINT_TERMS = data.CARDINAL_POINT_JOINT_TERMS || null;
const SOLSTICE_JD_HARMONICS = CARDINAL_POINT_HARMONICS.SS;  // Legacy alias


// (The require-time factory `buildFittedCoefficients` — the perihelion comb's
// divisor-to-period expansion on H, and before plan 09 the solstice-obliquity
// mean — left with the combs. Nothing fitted depends on the model parameters.)


module.exports = {
  // Static fitted arrays (the cardinal record and the RA day offset)
  CARDINAL_POINT_HARMONICS,
  CARDINAL_POINT_ANCHORS_ADJUSTED,
  CARDINAL_POINT_ECC_TERMS,
  CARDINAL_POINT_DERIVED,
  RA_DAY_OFFSET_MS: data.RA_DAY_OFFSET_MS,   // plan 07 R10: the RA day offset's lines, phase from J2000 (were literals)
  CARDINAL_POINT_JOINT_TERMS,
  SOLSTICE_JD_HARMONICS,
};
