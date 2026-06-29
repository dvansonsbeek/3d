/**
 * solve-moon-elements-for-fixed-N.js
 *
 * Consistency check: under Brown's lunar theory, what would the Moon's
 * orbital eccentricity e_M(t) and inclination i_M(t) need to be at deep
 * time, in order for Brown's formula to reproduce the framework's
 * fixed-N prediction (N_apsidalI = 37900, N_nodalI = 18015 always)?
 *
 * Two constraints (apsidal and nodal), two unknowns (e, i).
 *
 * Brown's APSIDAL (leading m² with Brouwer e²/i², + m³ + m⁴ + m⁵):
 *
 *   ω̇/n_M = (3/4)·m² · [(1+1.5e²)/(1−e²)²] · [1 − 1.5 sin²i]
 *         + (225/32)·m³ + (4071/128)·m⁴ + (265493/2048)·m⁵
 *
 * Brown's NODAL (leading m² with Brouwer cos(i)/(1−e²)²):
 *
 *   |Ω̇|/n_M = (3/4)·m² · cos(i) / (1−e²)²
 *
 * Framework requires:
 *   ω̇/n_M_required   = T_M / T_apsidal_FW = T_M × N_apsidalI / (H × T_S)
 *   |Ω̇|/n_M_required = T_M / T_nodal_FW   = T_M × N_nodalI   / (H × T_S)
 *
 * Solve: do any physically plausible (e, i) satisfy both constraints?
 *
 * If YES: the framework's fixed-N prescription is consistent with Brown
 *         under specific e(t)/i(t) evolution.
 * If NO:  the framework makes a prediction genuinely outside Newton+Brown.
 */

const fs = require('fs');
const path = require('path');

const A_TODAY_KM = 384399;
const T_M_TODAY_S = 27.32166156 * 86400;
const R_E_KM = 6378.137;
const J2_EARTH = 1.08263e-3;

const N_APSIDAL_I_FIXED = 37900;
const N_NODAL_I_FIXED   = 18015;

const EPOCHS = [
  { t_Ma:   0, label: 'Today (J2000)',     a_km: 384399, T_S_s: 31558149.764, H_yr: 335317 },
  { t_Ma:  90, label: '90 Mya (Pannella)', a_km: 379950, T_S_s: 31558119.0,   H_yr: 329156 },
  { t_Ma: 200, label: '200 Mya (Triassic)',a_km: 376730, T_S_s: 31558081.4,   H_yr: 321186 },
  { t_Ma: 300, label: '300 Mya (Permian)', a_km: 373950, T_S_s: 31558047.3,   H_yr: 314361 },
  { t_Ma: 380, label: '380 Mya (Devonian)',a_km: 371314, T_S_s: 31558020.0,   H_yr: 309083 },
  { t_Ma: 650, label: '650 Mya (Ediacaran)',a_km: 361540,T_S_s: 31557929.5,   H_yr: 291988 },
];

function brownApseSum(m, e, i_rad, a_km) {
  const m2 = m * m, m3 = m2 * m, m4 = m3 * m, m5 = m4 * m;
  const e2 = e * e;
  const oneMinusE2 = 1 - e2;
  const sin2_i = Math.sin(i_rad) ** 2;
  const f_ecc = (1 + 1.5 * e2) / (oneMinusE2 * oneMinusE2);
  const f_inc = 1 - 1.5 * sin2_i;
  const leading = (3 / 4) * m2 * f_ecc * f_inc;
  const higher  = (225/32)*m3 + (4071/128)*m4 + (265493/2048)*m5;
  const RoverA2 = Math.pow(R_E_KM / a_km, 2);
  const j2 = (3 / 4) * J2_EARTH * RoverA2 * (4 - 5 * sin2_i) / (oneMinusE2 * oneMinusE2);
  return leading + higher + j2;
}

function brownNodeSum(m, e, i_rad, a_km) {
  const m2 = m * m;
  const e2 = e * e;
  const oneMinusE2 = 1 - e2;
  const cos_i = Math.cos(i_rad);
  const sin2_i = Math.sin(i_rad) ** 2;
  const leading = (3 / 4) * m2 * cos_i / (oneMinusE2 * oneMinusE2);
  const RoverA2 = Math.pow(R_E_KM / a_km, 2);
  const j2 = (3 / 2) * J2_EARTH * RoverA2 * cos_i / (oneMinusE2 * oneMinusE2);
  return leading + j2;
}

// Joint solve via 2-D Newton with bracketing
function solveEandI(m, a_km, apseTarget, nodeTarget) {
  // Use the nodal equation to express e² as a function of i, then plug into
  // the apsidal equation and 1-D solve for i. That keeps the search well-
  // conditioned.
  //
  // Nodal: (3/4)·m²·cos(i)/(1−e²)² + J2_node = nodeTarget
  //     ⇒ (1−e²)² = (3/4)·m²·cos(i) / (nodeTarget − J2_node)
  //
  // Then plug into apsidal residual, 1-D search for i in [0, 80°].

  function eSquaredFromI(i_rad) {
    const m2 = m * m;
    const cos_i = Math.cos(i_rad);
    const RoverA2 = Math.pow(R_E_KM / a_km, 2);
    const j2_node = (3 / 2) * J2_EARTH * RoverA2 * cos_i;     // approx, ignoring (1−e²)² factor for the J2 piece (small)
    const denom = nodeTarget - j2_node;
    if (denom <= 0) return null;
    const oneMinusE2Sq = (3 / 4) * m2 * cos_i / denom;
    if (oneMinusE2Sq <= 0 || oneMinusE2Sq > 1) return null;
    const oneMinusE2 = Math.sqrt(oneMinusE2Sq);
    return 1 - oneMinusE2;
  }

  function apsidalResidual(i_rad) {
    const e2 = eSquaredFromI(i_rad);
    if (e2 === null || e2 < 0 || e2 > 0.98) return null;
    const e = Math.sqrt(e2);
    const sum = brownApseSum(m, e, i_rad, a_km);
    return sum - apseTarget;
  }

  // Try a wide grid for sign-change bracketing, then bisect
  const grid = [];
  for (let deg = 0; deg <= 80; deg += 0.5) {
    const i_rad = deg * Math.PI / 180;
    const res = apsidalResidual(i_rad);
    grid.push({ deg, res });
  }

  let bracket = null;
  for (let k = 0; k < grid.length - 1; k++) {
    const a = grid[k], b = grid[k + 1];
    if (a.res === null || b.res === null) continue;
    if (a.res * b.res < 0) { bracket = [a.deg, b.deg]; break; }
  }
  if (!bracket) {
    return { solved: false, reason: 'no sign change in apsidal residual over i ∈ [0°, 80°]', grid };
  }

  let [lo, hi] = bracket;
  for (let iter = 0; iter < 80; iter++) {
    const mid = (lo + hi) / 2;
    const res = apsidalResidual(mid * Math.PI / 180);
    const resLo = apsidalResidual(lo * Math.PI / 180);
    if (res === null) return { solved: false, reason: 'null residual mid-bisection' };
    if (res * resLo < 0) hi = mid; else lo = mid;
  }
  const i_deg = (lo + hi) / 2;
  const i_rad = i_deg * Math.PI / 180;
  const e2 = eSquaredFromI(i_rad);
  const e = Math.sqrt(e2);

  return {
    solved: true,
    i_deg,
    e,
    apsidalCheck: brownApseSum(m, e, i_rad, a_km),
    nodalCheck:   brownNodeSum(m, e, i_rad, a_km),
    apseTarget,
    nodeTarget,
  };
}

// ─── Per-epoch solve ─────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════════════════════════');
console.log(' WHAT e_M AND i_M WOULD BE NEEDED AT DEEP TIME FOR FRAMEWORK FIXED-N TO BE BROWN-CONSISTENT');
console.log('═══════════════════════════════════════════════════════════════════════════════════');
console.log('');
console.log(' Today\'s observed values: e_M = 0.0549, i_M = 5.145°');
console.log(' The Moon\'s eccentricity secularly oscillates ~0.04-0.07; inclination is essentially constant.');
console.log('');
console.log(' Framework constraint at each epoch:');
console.log('   ω̇/n_M_required = T_M × N_apsidalI / (H × T_S),   N_apsidalI = 37900');
console.log('   |Ω̇|/n_M_required = T_M × N_nodalI / (H × T_S),   N_nodalI   = 18015');
console.log('');

const results = [];
for (const ep of EPOCHS) {
  const T_M_s = T_M_TODAY_S * Math.pow(ep.a_km / A_TODAY_KM, 1.5);
  const m = T_M_s / ep.T_S_s;
  const H_s = ep.H_yr * ep.T_S_s;
  const apseTarget = T_M_s * N_APSIDAL_I_FIXED / H_s;
  const nodeTarget = T_M_s * N_NODAL_I_FIXED   / H_s;

  const sol = solveEandI(m, ep.a_km, apseTarget, nodeTarget);
  results.push({ ep, m, apseTarget, nodeTarget, sol });
}

console.log('───────────────────────────────────────────────────────────────────────────────────');
console.log(' SOLVED (e, i) AT EACH EPOCH — joint solution of Brown apsidal + nodal');
console.log('───────────────────────────────────────────────────────────────────────────────────');
console.log(' Epoch                    m        Required ω̇/n_M   |Ω̇|/n_M       Solved e     Solved i°');
for (const r of results) {
  if (r.sol.solved) {
    console.log(`   ${r.ep.label.padEnd(22)}${r.m.toFixed(6).padStart(10)}${r.apseTarget.toExponential(4).padStart(16)}${r.nodeTarget.toExponential(4).padStart(13)}${r.sol.e.toFixed(5).padStart(13)}${r.sol.i_deg.toFixed(3).padStart(13)}`);
  } else {
    console.log(`   ${r.ep.label.padEnd(22)}${r.m.toFixed(6).padStart(10)}${r.apseTarget.toExponential(4).padStart(16)}${r.nodeTarget.toExponential(4).padStart(13)}    NO SOLUTION (${r.sol.reason})`);
  }
}
console.log('');

console.log('───────────────────────────────────────────────────────────────────────────────────');
console.log(' INDEPENDENT SINGLE-CONSTRAINT SOLVES (sanity)');
console.log('───────────────────────────────────────────────────────────────────────────────────');
console.log(' If we hold i = 5.145° fixed (today\'s value), what e satisfies apsidal alone?');
console.log(' What e satisfies nodal alone?  (Should match if joint solution exists.)');
console.log('');
console.log(' Epoch                  apsidal-only e   nodal-only e   Δ');

for (const r of results) {
  const m = r.m;
  const i_rad = 5.145 * Math.PI / 180;

  // Apsidal-only: solve (3/4)·m²·[(1+1.5e²)/(1-e²)²·f_inc] + higher = apseTarget
  let eAps = null;
  for (let testE = 0.001; testE < 0.95; testE += 0.0001) {
    const v = brownApseSum(m, testE, i_rad, r.ep.a_km);
    if (v >= r.apseTarget) { eAps = testE; break; }
  }
  // Nodal-only: (3/4)·m²·cos(i)/(1-e²)² + j2 = nodeTarget
  let eNod = null;
  for (let testE = 0.001; testE < 0.95; testE += 0.0001) {
    const v = brownNodeSum(m, testE, i_rad, r.ep.a_km);
    if (v >= r.nodeTarget) { eNod = testE; break; }
  }
  const eAps_str = eAps === null ? 'no soln' : eAps.toFixed(4);
  const eNod_str = eNod === null ? 'no soln' : eNod.toFixed(4);
  const d_str = (eAps !== null && eNod !== null) ? (eAps - eNod).toFixed(4) : '—';
  console.log(`   ${r.ep.label.padEnd(22)}${eAps_str.padStart(15)}${eNod_str.padStart(15)}${d_str.padStart(11)}`);
}
console.log('');

console.log('═══════════════════════════════════════════════════════════════════════════════════');
console.log(' PHYSICAL PLAUSIBILITY CHECK');
console.log('═══════════════════════════════════════════════════════════════════════════════════');
console.log('');
console.log(' Today the Moon\'s e secularly oscillates roughly 0.04-0.07 (around 0.0549 mean).');
console.log(' Inclination is essentially constant at 5.145° on Myr timescales.');
console.log(' Tidal damping reduces e on Gyr timescales — past e is expected SLIGHTLY larger,');
console.log(' not by orders of magnitude. Cuk & Stewart 2012 model post-formation Moon at e~0.2-0.3.');
console.log('');
console.log(' Secondary constraints on past e_M:');
console.log('   • Lunar volcanism ended ~3 Gya — high e would have driven tidal heating, kept volcanism');
console.log('     alive. Cessation by 3 Gya argues for low e by then, certainly by 380 Mya.');
console.log('   • Devonian tidal rhythmites show regular monthly cycles — high e (>0.15) would have');
console.log('     created strong amplitude modulation visible in the record. Not observed.');
console.log('   • Earth-Moon angular momentum is fixed; high e past would change L_orbital significantly,');
console.log('     conflicting with Farhat\'s a_past from L-conservation.');

// JSON output
const outFile = path.join(__dirname, '..', '..', 'data', 'moon-elements-solve-for-fixed-N.json');
fs.writeFileSync(outFile, JSON.stringify(results, null, 2) + '\n');
console.log('');
console.log(` Written: ${path.relative(process.cwd(), outFile)}`);
