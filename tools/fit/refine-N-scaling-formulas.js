/**
 * refine-N-scaling-formulas.js
 *
 * Question: can we add a clean second/third-order correction to
 *   N(t) = N_today × (H(t)/H_today)²
 * to close the 0.73% gap with Brown across Phanerozoic time?
 *
 * Test five candidate forms ranked by accuracy + physical justification:
 *
 *   F1.  Pure H²                              — leading m², simplest
 *   F2.  H^x with best-fit exponent           — empirical fit
 *   F3.  H² · series(m_today)/series(m(t))    — explicit Brown series correction
 *   F4.  H² · (T_M_today/T_M(t))              — explicit T_M correction (no series)
 *   F5.  Direct Brown evaluation              — no scaling, perfect by construction
 *
 * For each: report N(t), T_apsidal(t), and deviation from Brown direct.
 */

const fs = require('fs');
const path = require('path');

const A_TODAY_KM = 384399;
const T_M_TODAY_S = 27.32166156 * 86400;
const R_E_KM = 6378.137;
const J2_EARTH = 1.08263e-3;

const e_M = 0.054900489;
const i_M_deg = 5.1453964;
const i_M = (i_M_deg * Math.PI) / 180;
const N_APSIDAL_TODAY = 37900;

const EPOCHS = [
  { t_Ma:   0, label: 'Today (J2000)',     a_km: 384399, T_S_s: 31558149.764, H_yr: 335317 },
  { t_Ma:  90, label: '90 Mya (Pannella)', a_km: 379950, T_S_s: 31558119.0,   H_yr: 329156 },
  { t_Ma: 200, label: '200 Mya (Triassic)',a_km: 376730, T_S_s: 31558081.4,   H_yr: 321186 },
  { t_Ma: 300, label: '300 Mya (Permian)', a_km: 373950, T_S_s: 31558047.3,   H_yr: 314361 },
  { t_Ma: 380, label: '380 Mya (Devonian)',a_km: 371314, T_S_s: 31558020.0,   H_yr: 309083 },
  { t_Ma: 650, label: '650 Mya (Ediacaran)',a_km: 361540,T_S_s: 31557929.5,   H_yr: 291988 },
];

const sin2_i = Math.sin(i_M) ** 2;
const oneMinusE2 = 1 - e_M * e_M;
const f_ecc_apse = (1 + 1.5 * e_M * e_M) / (oneMinusE2 * oneMinusE2);
const f_inc_apse = 1 - 1.5 * sin2_i;

// Brown's apsidal dimensionless rate
function brownApseDim(m, a_km) {
  const m2 = m*m, m3 = m2*m, m4 = m3*m, m5 = m4*m;
  const RoverA2 = Math.pow(R_E_KM / a_km, 2);
  return (3/4)*m2*f_ecc_apse*f_inc_apse + (225/32)*m3 + (4071/128)*m4
       + (265493/2048)*m5
       + (3/4)*J2_EARTH*RoverA2*(4 - 5*sin2_i)/(oneMinusE2*oneMinusE2);
}

// Brown's series factor: series(m) = (3/4)·m² / total_dim
// Then T_apse = T_M / total_dim = (T_S²/T_M) · (1 / [(3/4)·series⁻¹])
function brownSeriesFactor(m, a_km) {
  const total = brownApseDim(m, a_km);
  return ((3/4)*m*m*f_ecc_apse*f_inc_apse) / total;   // ratio leading/full
}

// ─── Compute baseline (Brown direct) at each epoch ────────────────────────

const rows = EPOCHS.map(ep => {
  const T_M_s = T_M_TODAY_S * Math.pow(ep.a_km / A_TODAY_KM, 1.5);
  const m = T_M_s / ep.T_S_s;
  const apseDim = brownApseDim(m, ep.a_km);
  const T_apse_s = T_M_s / apseDim;
  const T_apse_yr = T_apse_s / ep.T_S_s;
  const N_brown = ep.H_yr / T_apse_yr;
  const seriesFactor = brownSeriesFactor(m, ep.a_km);
  return { ...ep, T_M_s, m, T_apse_yr_Brown: T_apse_yr, N_Brown: N_brown, seriesFactor };
});

const today = rows[0];

// ─── Best-fit exponent for F2 ─────────────────────────────────────────────
let num = 0, den = 0;
for (let k = 1; k < rows.length; k++) {
  const lx = Math.log(rows[k].H_yr / today.H_yr);
  const ly = Math.log(rows[k].N_Brown / today.N_Brown);
  num += lx * ly;
  den += lx * lx;
}
const x_fit = num / den;

// ─── Evaluate each formula ────────────────────────────────────────────────

function evaluateForms(r) {
  // F1: pure H²
  const N_F1 = N_APSIDAL_TODAY * Math.pow(r.H_yr / today.H_yr, 2);
  // F2: H^x_fit
  const N_F2 = N_APSIDAL_TODAY * Math.pow(r.H_yr / today.H_yr, x_fit);
  // F3: H² × series correction
  const N_F3 = N_APSIDAL_TODAY * Math.pow(r.H_yr / today.H_yr, 2)
             * (r.seriesFactor / today.seriesFactor);
  // F4: H² × T_M correction (no series)
  const N_F4 = N_APSIDAL_TODAY * Math.pow(r.H_yr / today.H_yr, 2)
             * (today.T_M_s / r.T_M_s);
  // F5: Brown direct
  const N_F5 = r.N_Brown;

  return { N_F1, N_F2, N_F3, N_F4, N_F5 };
}

const results = rows.map(r => {
  const ns = evaluateForms(r);
  return {
    ...r,
    N: ns,
    T_apsidal_yr: {
      F1: r.H_yr / ns.N_F1,
      F2: r.H_yr / ns.N_F2,
      F3: r.H_yr / ns.N_F3,
      F4: r.H_yr / ns.N_F4,
      F5: r.H_yr / ns.N_F5,  // = T_apse_yr_Brown
    },
  };
});

// Compute max deviation vs Brown direct
function maxDev(key) {
  return Math.max(...results.map(r =>
    Math.abs(r.T_apsidal_yr[key] / r.T_apsidal_yr.F5 - 1)
  )) * 100;
}

const devs = {
  F1: maxDev('F1'),
  F2: maxDev('F2'),
  F3: maxDev('F3'),
  F4: maxDev('F4'),
  F5: maxDev('F5'),
};

// ─── Report ───────────────────────────────────────────────────────────────

const HEAD = '═══════════════════════════════════════════════════════════════════════════════════';
const RULE = '───────────────────────────────────────────────────────────────────────────────────';

console.log(HEAD);
console.log(' REFINING N-SCALING FORMULAS — can we close the 0.73% gap?');
console.log(HEAD);
console.log('');
console.log(' Five candidate forms ranked by accuracy + cleanliness:');
console.log('   F1: N(t) = N_today × (H/H_today)²                              [simplest]');
console.log(`   F2: N(t) = N_today × (H/H_today)^${x_fit.toFixed(3)}                          [best-fit exponent]`);
console.log('   F3: F1 × [series(m_today) / series(m(t))]                       [Brown series correction]');
console.log('   F4: F1 × [T_M_today / T_M(t)]                                   [T_M correction]');
console.log('   F5: Brown direct (no scaling formula, evaluated per epoch)     [exact baseline]');
console.log('');

console.log(RULE);
console.log(' T_APSIDAL (sidereal years) under each formula');
console.log(RULE);
console.log(' Epoch                    F1        F2        F3        F4        F5(Brown)');
for (const r of results) {
  console.log(`   ${r.label.padEnd(22)}${r.T_apsidal_yr.F1.toFixed(4).padStart(10)}${r.T_apsidal_yr.F2.toFixed(4).padStart(10)}${r.T_apsidal_yr.F3.toFixed(4).padStart(10)}${r.T_apsidal_yr.F4.toFixed(4).padStart(10)}${r.T_apsidal_yr.F5.toFixed(4).padStart(14)}`);
}
console.log('');

console.log(RULE);
console.log(' DEVIATION FROM BROWN (max over 0-650 Mya)');
console.log(RULE);
console.log(`   F1 (pure H²):          ${devs.F1.toFixed(3)}%`);
console.log(`   F2 (H^${x_fit.toFixed(3)}):           ${devs.F2.toFixed(3)}%`);
console.log(`   F3 (H² × series corr): ${devs.F3.toFixed(3)}%`);
console.log(`   F4 (H² × T_M corr):    ${devs.F4.toFixed(3)}%`);
console.log(`   F5 (Brown direct):      ${devs.F5.toFixed(3)}%  (zero by definition)`);
console.log('');

console.log(RULE);
console.log(' CONSEQUENCE: predicted T_apsidal at 380 Mya');
console.log(RULE);
const dev = results.find(r => r.t_Ma === 380);
console.log(`   F1 (pure H²):                ${dev.T_apsidal_yr.F1.toFixed(4)} yr`);
console.log(`   F2 (best-fit exponent):      ${dev.T_apsidal_yr.F2.toFixed(4)} yr`);
console.log(`   F3 (H² × series correction): ${dev.T_apsidal_yr.F3.toFixed(4)} yr`);
console.log(`   F4 (H² × T_M correction):    ${dev.T_apsidal_yr.F4.toFixed(4)} yr`);
console.log(`   F5 (Brown direct):           ${dev.T_apsidal_yr.F5.toFixed(4)} yr  ← truth`);
console.log('');

console.log(HEAD);
console.log(' INTERPRETATION');
console.log(HEAD);
console.log('');
console.log(' F1 (pure H²): structurally cleanest — "T·H = constant".');
console.log('   Origin: Brown leading m² + framework L-conservation coupling.');
console.log('   Accuracy: 0.73% over 650 Myr — physical noise level.');
console.log('');
console.log(' F2 (H^x_fit): empirically tighter but exponent is non-integer.');
console.log(`   x = ${x_fit.toFixed(3)} doesn't correspond to any known physics constant.`);
console.log('   It\'s a fit, not a derivation.');
console.log('');
console.log(' F3 (H² × series corr): adds Brown\'s explicit m³/m⁴/m⁵ corrections.');
console.log('   Physically motivated (it IS Brown\'s higher orders).');
console.log('   But requires evaluating series(m) at each epoch — loses structural simplicity.');
console.log('');
console.log(' F4 (H² × T_M corr): adds explicit T_M factor.');
console.log('   Captures the L-conservation coupling explicitly rather than implicitly via H.');
console.log('   Equivalent to "T_apse ∝ T_S²/T_M" in original Brown form.');
console.log('');
console.log(' F5 (Brown direct): no structural statement; need full Brown eval per epoch.');
console.log('   Most rigorous but loses framework\'s "structural law" character.');
console.log('');

console.log(' RECOMMENDATION:');
console.log('   • If the framework wants a CLEAN STRUCTURAL LAW: use F1 (H²), accept 0.73%.');
console.log('   • If the framework wants MAXIMUM ACCURACY without losing simplicity: use F4.');
console.log('   • F2/F3 are intermediate — better accuracy but messier than F1, less rigorous than F5.');
console.log('   • F5 only if you accept losing the structural "T·H = const" statement.');

// JSON output
const outFile = path.join(__dirname, '..', '..', 'data', 'N-scaling-refinements.json');
fs.writeFileSync(outFile, JSON.stringify({ x_fit, deviations: devs, epochs: results }, null, 2) + '\n');
console.log('');
console.log(` Written: ${path.relative(process.cwd(), outFile)}`);
