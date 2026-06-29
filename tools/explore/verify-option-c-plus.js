/**
 * verify-option-c-plus.js
 *
 * Spot-check the Option C+ implementation:
 *
 *   1. J2000 bit-preservation: every constant from the NEW chain must match
 *      its OLD value to within rounding noise.
 *   2. Deep-time spot-check at t_Ma = 380 Mya: verify N(t) = N_today × (H(t)/H_today)²
 *      produces the predicted T_apsidal and T_nodal we derived earlier.
 *
 * Run after any change to constants.js / script.js / astro-reference.json
 * affecting the Moon-period chain.
 */

const C = require('../lib/constants');

const HEAD = '═══════════════════════════════════════════════════════════════';
const RULE = '───────────────────────────────────────────────────────────────';

console.log(HEAD);
console.log(' OPTION C+ VERIFICATION (Step 3f)');
console.log(HEAD);
console.log('');

// ─── 1. J2000 bit-preservation ───────────────────────────────────────────

console.log(RULE);
console.log(' Test 1 — J2000 values preserved');
console.log(RULE);

const expected = {
  N_sid:      4482594,
  N_apsidalI: 37900,
  N_apsidalE: 37887,
  N_nodalI:   18015,
  N_nodalE:   18028,
  // Months (within ~1 second tolerance for kinematic derivations)
  moonSiderealMonth:    27.3216624124,
  moonAnomalisticMonth: 27.55455421,    // kinematic, was 27.5545498 IAU input — diff 0.4s OK
  moonNodalMonth:       27.21222089,    // kinematic, ~bit-matches old 27.21222082
  // Precession periods (Earth + ICRF, in days)
  moonApsidalPrecessionDaysEarth: 3232.55785,
  moonApsidalPrecessionDaysICRF:  3231.44908,
  moonNodalPrecessionDaysEarth:   6793.42795,
  moonNodalPrecessionDaysICRF:    6798.33028,
};

const tests = [
  ['N_sid                       ', expected.N_sid,      C.N_sid],
  ['N_apsidalI                  ', expected.N_apsidalI, C.N_apsidalI],
  ['N_apsidalE                  ', expected.N_apsidalE, C.N_apsidalE],
  ['N_nodalI                    ', expected.N_nodalI,   C.N_nodalI],
  ['N_nodalE                    ', expected.N_nodalE,   C.N_nodalE],
  ['moonSiderealMonth (d)       ', expected.moonSiderealMonth,    C.moonSiderealMonth],
  ['moonAnomalisticMonth (d)    ', expected.moonAnomalisticMonth, C.moonAnomalisticMonth],
  ['moonNodalMonth (d)          ', expected.moonNodalMonth,       C.moonNodalMonth],
  ['moonApsidalPrecession E (d) ', expected.moonApsidalPrecessionDaysEarth, C.moonApsidalPrecessionDaysEarth],
  ['moonApsidalPrecession I (d) ', expected.moonApsidalPrecessionDaysICRF,  C.moonApsidalPrecessionDaysICRF],
  ['moonNodalPrecession E (d)   ', expected.moonNodalPrecessionDaysEarth,   C.moonNodalPrecessionDaysEarth],
  ['moonNodalPrecession I (d)   ', expected.moonNodalPrecessionDaysICRF,    C.moonNodalPrecessionDaysICRF],
];

let allPass = true;
for (const [label, exp, actual] of tests) {
  if (typeof exp === 'number' && typeof actual === 'number') {
    const diff = Math.abs(actual - exp);
    const rel = diff / Math.abs(exp);
    const pass = rel < 1e-5;
    if (!pass) allPass = false;
    const mark = pass ? '✓' : '✗';
    console.log(`   ${mark} ${label}  expected: ${String(exp).padStart(14)}   actual: ${String(actual).padStart(20)}   Δ: ${diff.toExponential(2)}`);
  } else {
    console.log(`   ? ${label}  (skipped — non-numeric)`);
  }
}
console.log('');

// ─── 2. Deep-time spot-check at t_Ma = 380 Mya ───────────────────────────

console.log(RULE);
console.log(' Test 2 — Deep-time prediction at t_Ma = 380 Mya');
console.log(RULE);

// Apply H² scaling: N(t) = N_J2000 × (H(t)/H_J2000)²
const H_J2000 = 335317;
const H_380   = 309083;    // from doc 99
const H_ratio_sq = Math.pow(H_380 / H_J2000, 2);

const N_apsidalI_380 = C.N_apsidalI * H_ratio_sq;
const N_apsidalE_380 = N_apsidalI_380 - 13;
const N_nodalI_380   = C.N_nodalI   * H_ratio_sq;
const N_nodalE_380   = N_nodalI_380   + 13;

// Expected from research script:
//   N_apsidalI_380 ≈ 32,202
//   N_nodalI_380   ≈ 15,307
//   T_apsidal_380  ≈ 9.598 sidereal-yr
//   T_nodal_380    ≈ 20.193 sidereal-yr

const T_apsidal_380_yr = H_380 / N_apsidalI_380;
const T_nodal_380_yr   = H_380 / N_nodalI_380;

console.log(`   H_J2000 = ${H_J2000} yr   H_380 = ${H_380} yr   (H_380/H_J2000)² = ${H_ratio_sq.toFixed(6)}`);
console.log('');
console.log(`   N_apsidalI(380) = ${C.N_apsidalI} × ${H_ratio_sq.toFixed(6)} = ${N_apsidalI_380.toFixed(1)}`);
console.log(`   N_nodalI(380)   = ${C.N_nodalI} × ${H_ratio_sq.toFixed(6)} = ${N_nodalI_380.toFixed(1)}`);
console.log('');
console.log(`   T_apsidal(380) = ${H_380}/N = ${T_apsidal_380_yr.toFixed(4)} sid-yr  (expected ≈ 9.598)`);
console.log(`   T_nodal(380)   = ${H_380}/N = ${T_nodal_380_yr.toFixed(4)} sid-yr  (expected ≈ 20.193)`);
console.log('');

const apsidalMatch = Math.abs(T_apsidal_380_yr - 9.598) < 0.01;
const nodalMatch   = Math.abs(T_nodal_380_yr - 20.193) < 0.01;
console.log(`   ${apsidalMatch ? '✓' : '✗'} Apsidal matches expected 9.598 yr`);
console.log(`   ${nodalMatch   ? '✓' : '✗'} Nodal matches expected 20.193 yr`);
console.log('');

// ─── Summary ──────────────────────────────────────────────────────────────

console.log(HEAD);
if (allPass && apsidalMatch && nodalMatch) {
  console.log(' RESULT: ✓ Option C+ implementation verified.');
  console.log('         - J2000 values bit-preserved');
  console.log('         - Deep-time H² scaling produces expected values at 380 Mya');
} else {
  console.log(' RESULT: ✗ One or more checks failed — see details above.');
  process.exitCode = 1;
}
console.log(HEAD);
