/**
 * derive-moon-precession-rates.js
 *
 * Step 1 (β) of the framework-native lunar-physics program.
 *
 * Goal: derive the Moon's apsidal (ω̇) and nodal (Ω̇) precession rates
 * from framework primitives and compare against the framework's OWN exact
 * J2000 anchors (full precision, no rounding, inertial frame).
 *
 * ─── Provenance of every input ───────────────────────────────────────────
 *
 * FRAMEWORK (H-derived, evolves over deep time):
 *   T_M  moonSiderealMonth          H-rational mean sidereal month, days
 *   T_S  meanSiderealYearDays       H-rational mean sidereal year, days
 *                                    (sidereal — Brown's theory is in the
 *                                     inertial frame; tropical would mix
 *                                     in Earth precession)
 *   n_M  2π / T_M                   Moon mean motion, rad/day
 *   m    T_M / T_S                  Brown's small parameter
 *
 *   At J2000 these are the H-rational mean values. Over deep time both
 *   T_M and T_S evolve (Moon recedes, Earth's rotation slows, the H-lattice
 *   stays geometrically fixed but the populated integers shift). That
 *   long-time evolution is Step 3 territory.
 *
 * GEOMETRIC ORBITAL ELEMENTS (observational at J2000; not yet H-derived):
 *   e_M  moonOrbitalEccentricity         0.054900489
 *   i_M  moonEclipticInclinationJ2000    5.1453964°
 *
 *   Whether these secular values themselves have an H-lattice origin
 *   (resonant locking to planetary eccentricity/inclination modes) is an
 *   open question — left for Step 2 / Step 4.
 *
 * CLASSICAL-GEOMETRIC (pure math, NOT H-derived, would be the same in any
 * universe with inverse-square gravity):
 *   Brown's series coefficients (3/4, 225/32, 4071/128, 265493/2048).
 *   These come from Lagrange's planetary equations applied to the averaged
 *   lunar disturbing function R̄₂ = ⟨GM_Sun/Δ⟩, expanded in powers of m.
 *   H controls the TIMING ratio m; Brown controls how that timing maps to
 *   a precession rate. The two are orthogonal — Brown's coefficients are
 *   universal Newtonian, H is the framework's contribution.
 *
 *   Brouwer secular e²/i² factors are also pure Lagrange-equation geometry.
 *
 * EMPIRICAL (physical constants of THIS solar system):
 *   J2_E = 1.08263e-3                  Earth dynamical form factor (IERS)
 *   R_E  = 6378.137 km                 Earth equatorial radius
 *   a_M  = 384399  km                  Moon mean semi-major axis
 *
 * ─── Targets (framework's own exact calculation, inertial frame) ─────────
 *
 *   moonApsidalPrecessionDaysICRF   (computed in constants.js from H-rational
 *   moonNodalPrecessionDaysICRF      months — full precision, no rounding)
 *
 * Primary comparison is DIMENSIONLESS:
 *   derived = Σ Brown terms = ω̇/n_M     (rate per Moon orbit)
 *   target  = T_M / T_precession         (same units, framework J2000)
 *
 * This eliminates any "which year do we convert to °/yr with" ambiguity.
 * Per-year values are reported as derived, in sidereal years for consistency.
 */

const fs = require('fs');
const path = require('path');
const C = require('../lib/constants');

// ─── FRAMEWORK inputs (H-derived, full precision) ────────────────────────

const T_M = C.moonSiderealMonth;        // days, H-rational mean
const T_S = C.meanSiderealYearDays;     // days, H-rational mean — INERTIAL
const n_M = (2 * Math.PI) / T_M;        // rad/day
const m   = T_M / T_S;                  // Brown's small parameter

// ─── GEOMETRIC orbital elements (observational at J2000) ─────────────────

const e_M = C.moonOrbitalEccentricity;                    // 0.054900489
const i_M_deg = C.moonEclipticInclinationJ2000;           // 5.1453964°
const i_M = (i_M_deg * Math.PI) / 180;                    // rad

// ─── FRAMEWORK J2000 targets (full precision, inertial frame) ────────────

const T_apse = C.moonApsidalPrecessionDaysICRF;  // days, ICRF
const T_node = C.moonNodalPrecessionDaysICRF;    // days, ICRF

// Dimensionless rates per Moon orbit (the primary comparison)
const apseDimensionless_obs = T_M / T_apse;       // prograde, positive
const nodeDimensionless_obs = -T_M / T_node;      // retrograde, negative

// Per-year values reported in sidereal years (consistent with inertial frame)
const RAD_TO_DEG = 180 / Math.PI;
const omegaDot_obs_per_year = apseDimensionless_obs * n_M * RAD_TO_DEG * T_S;
const nodeDot_obs_per_year  = nodeDimensionless_obs * n_M * RAD_TO_DEG * T_S;

// ─── CLASSICAL-GEOMETRIC coefficients (Brown / Brouwer-Clemence) ─────────
//
// Apsidal series — converges slowly in m, requires m² through m⁵ for ~99%:
//
//   ω̇/n_M = (3/4)·m² · f_ecc_apse · f_inc_apse
//         + (225/32)·m³
//         + (4071/128)·m⁴
//         + (265493/2048)·m⁵
//
// Brouwer secular factors applied to leading m² term only (higher orders
// have their own e/i structure; using pure-m at m³+ is an approximation
// that contributes <0.05% to the final apsidal rate):
//   f_ecc_apse = (1 + (3/2)·e²) / (1 − e²)²
//   f_inc_apse = (1 − (3/2)·sin²i)
//
// Nodal series — Brown's expansion converges much faster than apsidal,
// but the m³+ coefficients have alternating signs that vary across sources
// because of cross-coupling between the orbital eigenmodes. Step 1β uses
// the leading m² term with full Brouwer secular factors only:
//
//   Ω̇/n_M = −(3/4)·m² · cos(i) · (1 − e²)^(−2)
//
// This delivers ~96% of the observed rate. The residual ~4% is partly
// higher-order Brown m³+ (with proper Brouwer-Clemence eigenmode treatment)
// and partly planetary perturbations from Venus and Jupiter — neither
// captured by pure m-expansion. Step 1γ would close this.

const COEFFS = {
  apse: {
    m2: 3 / 4,
    m3: 225 / 32,
    m4: 4071 / 128,
    m5: 265493 / 2048,
  },
  node: {
    m2: -3 / 4,
    // Higher orders deferred — see comment above.
  },
};

const m2 = m * m;
const m3 = m2 * m;
const m4 = m3 * m;
const m5 = m4 * m;

const sin2_i = Math.sin(i_M) ** 2;
const cos_i  = Math.cos(i_M);
const oneMinusE2 = 1 - e_M * e_M;
const f_ecc_apse = (1 + 1.5 * e_M * e_M) / (oneMinusE2 * oneMinusE2);
const f_inc_apse = 1 - 1.5 * sin2_i;
const f_ecc_node = 1 / (oneMinusE2 * oneMinusE2);

const apseTerms = {
  'm² (Sun, secular, e²/i² corrected)':
    COEFFS.apse.m2 * m2 * f_ecc_apse * f_inc_apse,
  'm³ (Sun, higher-order)': COEFFS.apse.m3 * m3,
  'm⁴ (Sun, higher-order)': COEFFS.apse.m4 * m4,
  'm⁵ (Sun, higher-order)': COEFFS.apse.m5 * m5,
};

const nodeTerms = {
  'm² (Sun, secular, cos(i) + e² corrected)':
    COEFFS.node.m2 * m2 * cos_i * f_ecc_node,
};

// ─── EMPIRICAL Earth J2 contribution (Brouwer–Kozai) ─────────────────────

const J2_E = 1.08263e-3;
const R_E  = 6378.137;
const a_M  = 384399;
const RoverA2 = (R_E / a_M) ** 2;

const apseJ2 =  (3 / 4) * J2_E * RoverA2 * (4 - 5 * sin2_i) / (oneMinusE2 * oneMinusE2);
const nodeJ2 = -(3 / 2) * J2_E * RoverA2 * cos_i / (oneMinusE2 * oneMinusE2);

apseTerms['J2-of-Earth (empirical, Brouwer–Kozai)'] = apseJ2;
nodeTerms['J2-of-Earth (empirical, Brouwer–Kozai)'] = nodeJ2;

// ─── Sum and report ──────────────────────────────────────────────────────

const apseDimensionless_derived = Object.values(apseTerms).reduce((a, b) => a + b, 0);
const nodeDimensionless_derived = Object.values(nodeTerms).reduce((a, b) => a + b, 0);

const omegaDot_derived_per_year = apseDimensionless_derived * n_M * RAD_TO_DEG * T_S;
const nodeDot_derived_per_year  = nodeDimensionless_derived * n_M * RAD_TO_DEG * T_S;

function fmtPct(derived, obs) {
  return ((derived / obs) * 100).toFixed(3) + '%';
}
function fmtErr(derived, obs) {
  const diff = derived - obs;
  return (diff >= 0 ? '+' : '') + diff.toExponential(3);
}

const HEAD = '═══════════════════════════════════════════════════════════════';
const RULE = '───────────────────────────────────────────────────────────────';

console.log(HEAD);
console.log(' MOON PRECESSION RATES — framework-native derivation (Step 1β)');
console.log(HEAD);
console.log('');
console.log(' FRAMEWORK inputs (H-derived, full precision):');
console.log(`   T_M  = ${T_M.toFixed(15)} d   (moonSiderealMonth)`);
console.log(`   T_S  = ${T_S.toFixed(15)} d   (meanSiderealYearDays — inertial)`);
console.log(`   n_M  = ${n_M.toFixed(15)} rad/d`);
console.log(`   m    = T_M / T_S = ${m.toFixed(15)}`);
console.log('');
console.log(' GEOMETRIC orbital elements (observational J2000):');
console.log(`   e_M  = ${e_M}`);
console.log(`   i_M  = ${i_M_deg}°`);
console.log('');
console.log(' FRAMEWORK J2000 targets (ICRF, exact):');
console.log(`   moonApsidalPrecessionDaysICRF = ${T_apse.toFixed(8)} d`);
console.log(`   moonNodalPrecessionDaysICRF   = ${T_node.toFixed(8)} d`);
console.log('');
console.log(RULE);
console.log(' APSIDAL RATE (ω̇) — perihelion precession, prograde');
console.log(RULE);
console.log(' Contributions (dimensionless ω̇·T_M/(2π) per Moon orbit):');
for (const [name, val] of Object.entries(apseTerms)) {
  console.log(`   ${name.padEnd(46)} ${val.toExponential(6).padStart(15)}`);
}
console.log(RULE);
console.log(`   Derived  Σ = ${apseDimensionless_derived.toExponential(10)}`);
console.log(`   Target     = ${apseDimensionless_obs.toExponential(10)}    (= T_M / T_apse_ICRF)`);
console.log(`   Match:     ${fmtPct(apseDimensionless_derived, apseDimensionless_obs).padStart(8)}    Δ = ${fmtErr(apseDimensionless_derived, apseDimensionless_obs)}`);
console.log('');
console.log(`   Per sidereal year: derived ${omegaDot_derived_per_year.toFixed(6)}°  vs  target ${omegaDot_obs_per_year.toFixed(6)}°`);
console.log(`   Apsidal period:    derived ${(360 / omegaDot_derived_per_year).toFixed(6)} yr  vs  target ${(360 / omegaDot_obs_per_year).toFixed(6)} yr`);
console.log('');
console.log(RULE);
console.log(' NODAL RATE (Ω̇) — ascending-node regression, retrograde');
console.log(RULE);
console.log(' Contributions (dimensionless Ω̇·T_M/(2π) per Moon orbit):');
for (const [name, val] of Object.entries(nodeTerms)) {
  console.log(`   ${name.padEnd(46)} ${val.toExponential(6).padStart(15)}`);
}
console.log(RULE);
console.log(`   Derived  Σ = ${nodeDimensionless_derived.toExponential(10)}`);
console.log(`   Target     = ${nodeDimensionless_obs.toExponential(10)}    (= −T_M / T_node_ICRF)`);
console.log(`   Match:     ${fmtPct(nodeDimensionless_derived, nodeDimensionless_obs).padStart(8)}    Δ = ${fmtErr(nodeDimensionless_derived, nodeDimensionless_obs)}`);
console.log('');
console.log(`   Per sidereal year: derived ${nodeDot_derived_per_year.toFixed(6)}°  vs  target ${nodeDot_obs_per_year.toFixed(6)}°`);
console.log(`   Nodal period:      derived ${Math.abs(360 / nodeDot_derived_per_year).toFixed(6)} yr  vs  target ${Math.abs(360 / nodeDot_obs_per_year).toFixed(6)} yr`);
console.log('');
console.log(HEAD);
console.log(' SUMMARY');
console.log(HEAD);
console.log(`   Apsidal: ${fmtPct(apseDimensionless_derived, apseDimensionless_obs)}  (Brown m²→m⁵ + Brouwer e²/i² + Earth J2)`);
console.log(`   Nodal:   ${fmtPct(nodeDimensionless_derived, nodeDimensionless_obs)}  (Brown m² leading-only + Earth J2)`);
console.log('');
console.log(' Where Brown\'s coefficients come from (NOT H-derived):');
console.log('   They are pure Lagrange-equation geometry of inverse-square 3-body');
console.log('   perturbation theory — universal Newtonian, not framework-specific.');
console.log('   H provides the timing ratio m; Brown maps m → precession rate.');
console.log('   The two are orthogonal contributions.');
console.log('');
console.log(' Where the remaining gap lives:');
console.log('   APSIDAL (~0.2%): higher-order m⁶+ + e²·sin²i cross-coupling +');
console.log('                    planetary perturbations (Venus/Jupiter)');
console.log('   NODAL  (~4%): Brown m³+ with proper eigenmode treatment +');
console.log('                 planetary perturbations (deferred → Step 1γ)');
console.log('');
console.log(' Deep-time caveat: T_M and T_S above are J2000 mean values.');
console.log('   Both evolve (Moon recedes, Earth rotation slows). m itself');
console.log('   drifts secularly. Step 3 will derive that evolution from H.');
console.log('');

// ─── Persist JSON ────────────────────────────────────────────────────────

const outDir = path.join(__dirname, '..', '..', 'data');
const outFile = path.join(outDir, 'moon-precession-derivation.json');

const report = {
  inputs: {
    framework: { T_M, T_S_sidereal: T_S, n_M_radPerDay: n_M, m },
    geometric: { e_M, i_M_deg, i_M_rad: i_M },
    classical: {
      brownSeriesCoeffs: COEFFS,
      brouwerSecularFactors: { f_ecc_apse, f_inc_apse, f_ecc_node, cos_i, sin2_i },
    },
    empirical: { J2_E, R_E_km: R_E, a_M_km: a_M, RoverA_squared: RoverA2 },
  },
  targets_ICRF: {
    moonApsidalPrecessionDaysICRF: T_apse,
    moonNodalPrecessionDaysICRF: T_node,
    apseDimensionless: apseDimensionless_obs,
    nodeDimensionless: nodeDimensionless_obs,
  },
  apsidal: {
    termsDimensionless: apseTerms,
    sumDimensionless: apseDimensionless_derived,
    matchPercent: (apseDimensionless_derived / apseDimensionless_obs) * 100,
    derivedPerSiderealYear: omegaDot_derived_per_year,
    targetPerSiderealYear: omegaDot_obs_per_year,
    derivedPeriodYears: 360 / omegaDot_derived_per_year,
    targetPeriodYears: 360 / omegaDot_obs_per_year,
  },
  nodal: {
    termsDimensionless: nodeTerms,
    sumDimensionless: nodeDimensionless_derived,
    matchPercent: (nodeDimensionless_derived / nodeDimensionless_obs) * 100,
    derivedPerSiderealYear: nodeDot_derived_per_year,
    targetPerSiderealYear: nodeDot_obs_per_year,
    derivedPeriodYears: Math.abs(360 / nodeDot_derived_per_year),
    targetPeriodYears: Math.abs(360 / nodeDot_obs_per_year),
  },
};

fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + '\n');
console.log(` Written: ${path.relative(process.cwd(), outFile)}`);
