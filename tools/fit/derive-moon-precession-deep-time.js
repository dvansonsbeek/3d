/**
 * derive-moon-precession-deep-time.js
 *
 * Apply Step 1β Brown derivation across geologic time, using the
 * framework's own deep-time anchors (Farhat-fitted Moon distance →
 * Kepler T_M; angular-momentum conservation → LOD; minor solar
 * mass-loss correction → year_s).
 *
 * Goal: answer "what does Brown's theory say about T_apsidal and
 * T_nodal at 380 Mya, given the framework's own T_M(t) and T_S(t)?"
 *
 * Everything dimensional is in SECONDS. We convert to past-days,
 * current-days, and sidereal-years at the report stage.
 */

const fs = require('fs');
const path = require('path');

// ─── Framework anchor at today (Kepler-relative scaling) ────────────────
//
// Rather than use an approximate GM_EM (which would make our T_M_today
// drift ~0.1% from the framework anchor), we scale T_M(t) directly from
// today's framework values via Kepler's 3rd law: T ∝ a^(3/2). This gives
// exact T_M_today = framework value, and exact scaling at deep time.

const A_TODAY_KM = 384399;                              // framework moonDistance
const T_M_TODAY_S = 27.32166156 * 86400;                // framework moonSiderealMonthInput × LOD
function moonSiderealMonthSecondsFromKepler(a_km) {
  return T_M_TODAY_S * Math.pow(a_km / A_TODAY_KM, 1.5);
}

const R_E_KM = 6378.137;
const J2_EARTH = 1.08263e-3;

const e_M = 0.054900489;                       // moonOrbitalEccentricityBase
const i_M_deg = 5.1453964;                     // moonEclipticInclinationJ2000
const i_M = (i_M_deg * Math.PI) / 180;

// ─── Framework deep-time anchors (from doc 99 + script.js _dtMoon chain) ─
//
// Today (J2000) values are the framework's exact constants. Past values
// at t_Ma > 0 are from doc 99 §92-100 (Farhat-anchored proper-physics).
// All sourced from `meanMoonDistanceMetresAtAge`, `meanLodSecondsAtAge`,
// `meanSiderealYearSecondsAtAge` in src/script.js at the listed epochs.

const EPOCHS = [
  { t_Ma:   0, label: 'Today (J2000)',     a_km: 384399, LOD_s: 86400.000, T_S_s: 31558149.764, H_yr: 335317 },
  { t_Ma:  90, label: '90 Mya (Pannella)', a_km: 379950, LOD_s: 84812.4,   T_S_s: 31558119.0,   H_yr: 329156 },
  { t_Ma: 200, label: '200 Mya (Triassic)',a_km: 376730, LOD_s: 82758.3,   T_S_s: 31558081.4,   H_yr: 321186 },
  { t_Ma: 300, label: '300 Mya (Permian)', a_km: 373950, LOD_s: 80999.2,   T_S_s: 31558047.3,   H_yr: 314361 },
  { t_Ma: 380, label: '380 Mya (Devonian)',a_km: 371314, LOD_s: 79632.0,   T_S_s: 31558020.0,   H_yr: 309083 },
  { t_Ma: 650, label: '650 Mya (Ediacaran)',a_km: 361540,LOD_s: 75240.0,   T_S_s: 31557929.5,   H_yr: 291988 },
];

// ─── Framework fixed-N lattice constants (the user's proposal) ───────────
// User claims Moon precessions are H-lattice integers, FIXED across epochs:
//   N_apsidalI = 37900 (apsidal cycles per H, ICRF frame)
//   N_apsidalE = 37887 (apsidal cycles per H, Earth frame)  = 37900 − 13
//   N_nodalI   = 18015 (nodal cycles per H, ICRF frame)
//   N_nodalE   = 18028 (nodal cycles per H, Earth frame)    = 18015 + 13
// ⇒ T_apsidal(t) = H(t) / 37900 yr (linear scaling with H)
// ⇒ T_nodal(t)   = H(t) / 18015 yr (linear scaling with H)
const N_APSIDAL_I_FIXED = 37900;
const N_NODAL_I_FIXED   = 18015;

// ─── Brown's lunar theory coefficients (same as Step 1β) ─────────────────

const COEFFS_APSE = {
  m2: 3 / 4,
  m3: 225 / 32,
  m4: 4071 / 128,
  m5: 265493 / 2048,
};

const sin2_i = Math.sin(i_M) ** 2;
const cos_i  = Math.cos(i_M);
const oneMinusE2 = 1 - e_M * e_M;
const f_ecc_apse = (1 + 1.5 * e_M * e_M) / (oneMinusE2 * oneMinusE2);
const f_inc_apse = 1 - 1.5 * sin2_i;
const f_ecc_node = 1 / (oneMinusE2 * oneMinusE2);

function brownRates(T_M_s, T_S_s, a_km) {
  const m  = T_M_s / T_S_s;
  const m2 = m * m;
  const m3 = m2 * m;
  const m4 = m3 * m;
  const m5 = m4 * m;

  // Apsidal: Brown m²→m⁵ + Brouwer e²/i² on leading
  const apseSun =
      COEFFS_APSE.m2 * m2 * f_ecc_apse * f_inc_apse
    + COEFFS_APSE.m3 * m3
    + COEFFS_APSE.m4 * m4
    + COEFFS_APSE.m5 * m5;

  // Nodal: leading m² + Brouwer cos(i)·(1−e²)⁻² (Step 1β convention)
  const nodeSun = -(3 / 4) * m2 * cos_i * f_ecc_node;

  // Earth J2 (Brouwer–Kozai)
  const RoverA2 = Math.pow(R_E_KM / a_km, 2);
  const apseJ2  =  (3 / 4) * J2_EARTH * RoverA2 * (4 - 5 * sin2_i) / (oneMinusE2 * oneMinusE2);
  const nodeJ2  = -(3 / 2) * J2_EARTH * RoverA2 * cos_i / (oneMinusE2 * oneMinusE2);

  const apseDimensionless = apseSun + apseJ2;
  const nodeDimensionless = nodeSun + nodeJ2;

  return {
    m, apseSun, nodeSun, apseJ2, nodeJ2,
    apseDimensionless,
    nodeDimensionless,
    T_apsidal_s: T_M_s / apseDimensionless,
    T_nodal_s:   T_M_s / Math.abs(nodeDimensionless),
  };
}

// ─── Per-epoch computation ───────────────────────────────────────────────

const rows = [];
for (const ep of EPOCHS) {
  const T_M_s = moonSiderealMonthSecondsFromKepler(ep.a_km);
  const T_M_pastDays = T_M_s / ep.LOD_s;
  const T_M_currentDays = T_M_s / 86400;
  const daysPerYear = ep.T_S_s / ep.LOD_s;

  // ───── BROWN prediction (Newtonian + Brown m² + corrections) ─────
  const r = brownRates(T_M_s, ep.T_S_s, ep.a_km);

  // ───── FRAMEWORK prediction (fixed N apsidal/nodal per H) ─────
  // T_apsidal(t) = H(t) / N_apsidalI, where N_apsidalI = 37900 always
  const T_apsidal_FW_yr = ep.H_yr / N_APSIDAL_I_FIXED;          // sidereal years
  const T_nodal_FW_yr   = ep.H_yr / N_NODAL_I_FIXED;
  const T_apsidal_FW_s  = T_apsidal_FW_yr * ep.T_S_s;            // SI seconds
  const T_nodal_FW_s    = T_nodal_FW_yr * ep.T_S_s;

  // ───── Kinematic-derived months under BOTH models ─────
  // Anomalistic month T_ano from sidereal + apsidal:
  //   1/T_ano = 1/T_M − 1/T_apsidalE   (Earth frame, perigee advances)
  // Nodal month T_nod from sidereal + nodal:
  //   1/T_nod = 1/T_M + 1/T_nodalE     (Earth frame, node regresses)
  function anomFromApsidal(T_M, T_apse) { return 1 / (1 / T_M - 1 / T_apse); }
  function nodFromNodal  (T_M, T_node) { return 1 / (1 / T_M + 1 / T_node); }

  const T_apsidalE_Brown_s = r.T_apsidal_s;     // Brown's value is implicitly Earth-frame in this calc
  const T_nodalE_Brown_s   = r.T_nodal_s;
  const T_apsidalE_FW_s    = ep.H_yr * ep.T_S_s / (N_APSIDAL_I_FIXED - 13);    // Earth-frame
  const T_nodalE_FW_s      = ep.H_yr * ep.T_S_s / (N_NODAL_I_FIXED + 13);

  const T_ano_Brown_s = anomFromApsidal(T_M_s, T_apsidalE_Brown_s);
  const T_ano_FW_s    = anomFromApsidal(T_M_s, T_apsidalE_FW_s);
  const T_nod_Brown_s = nodFromNodal(T_M_s, T_nodalE_Brown_s);
  const T_nod_FW_s    = nodFromNodal(T_M_s, T_nodalE_FW_s);

  rows.push({
    ...ep,
    T_M_s, T_M_pastDays, T_M_currentDays, daysPerYear,
    m: r.m,
    // Brown
    apse_Brown_s: r.T_apsidal_s,
    apse_Brown_pd: r.T_apsidal_s / ep.LOD_s,
    apse_Brown_cd: r.T_apsidal_s / 86400,
    apse_Brown_yr: r.T_apsidal_s / ep.T_S_s,
    nod_Brown_s:  r.T_nodal_s,
    nod_Brown_pd: r.T_nodal_s / ep.LOD_s,
    nod_Brown_cd: r.T_nodal_s / 86400,
    nod_Brown_yr: r.T_nodal_s / ep.T_S_s,
    ano_Brown_pd: T_ano_Brown_s / ep.LOD_s,
    nodM_Brown_pd: T_nod_Brown_s / ep.LOD_s,
    // Framework (fixed N)
    apse_FW_s: T_apsidal_FW_s,
    apse_FW_pd: T_apsidal_FW_s / ep.LOD_s,
    apse_FW_cd: T_apsidal_FW_s / 86400,
    apse_FW_yr: T_apsidal_FW_yr,
    nod_FW_s:  T_nodal_FW_s,
    nod_FW_pd: T_nodal_FW_s / ep.LOD_s,
    nod_FW_cd: T_nodal_FW_s / 86400,
    nod_FW_yr: T_nodal_FW_yr,
    ano_FW_pd: T_ano_FW_s / ep.LOD_s,
    nodM_FW_pd: T_nod_FW_s / ep.LOD_s,
  });
}

// ─── Report ──────────────────────────────────────────────────────────────

const HEAD = '═══════════════════════════════════════════════════════════════════════════════════';
const RULE = '───────────────────────────────────────────────────────────────────────────────────';

console.log(HEAD);
console.log(' MOON PRECESSION ACROSS GEOLOGIC TIME — Brown applied to framework deep-time chain');
console.log(HEAD);
console.log('');
console.log(' Inputs per epoch:');
console.log('   a_km        — Moon semi-major axis from Farhat-fitted polynomial (framework)');
console.log('   LOD_s       — Length-of-day from angular-momentum conservation (framework)');
console.log('   T_S_s       — Sidereal year in SI seconds (framework + solar mass loss)');
console.log(' Derived per epoch:');
console.log('   T_M_s       — Kepler-scaled from today: T_M_today × (a/a_today)^(3/2)');
console.log('   m           — Brown\'s small parameter, T_M/T_S (dimensionless)');
console.log('   T_apsidal   — Brown m²→m⁵ + Brouwer e²/i² + Earth J2');
console.log('   T_nodal     — Brown m² leading + Brouwer cos(i)(1−e²)⁻² + Earth J2');
console.log('');

console.log(RULE);
console.log(' T_M ACROSS EPOCHS');
console.log(RULE);
console.log(' Epoch                 a (km)    LOD (s)   T_M (past-d)   T_M (cur-d)   days/yr');
for (const r of rows) {
  console.log(`   ${r.label.padEnd(22)}${String(r.a_km).padStart(8)}${r.LOD_s.toFixed(1).padStart(10)}${r.T_M_pastDays.toFixed(6).padStart(15)}${r.T_M_currentDays.toFixed(6).padStart(13)}${r.daysPerYear.toFixed(3).padStart(10)}`);
}
console.log('');

console.log(RULE);
console.log(' BROWN SMALL PARAMETER m = T_M/T_S');
console.log(RULE);
console.log(' Epoch                       m              m² (×10⁻³)     Δm vs today');
const m_today = rows[0].m;
for (const r of rows) {
  const dm_pct = ((r.m - m_today) / m_today * 100);
  const sign = dm_pct >= 0 ? '+' : '';
  console.log(`   ${r.label.padEnd(22)}${r.m.toFixed(8).padStart(14)}${(r.m * r.m * 1000).toFixed(5).padStart(18)}    ${sign}${dm_pct.toFixed(3)}%`);
}
console.log('');

console.log(RULE);
console.log(' T_APSIDAL: BROWN vs FRAMEWORK (fixed N = 37900)  — sidereal years');
console.log(RULE);
console.log(' Epoch                 Brown (yr)   Framework (yr)   Δ (yr)    Δ %');
for (const r of rows) {
  const d = r.apse_Brown_yr - r.apse_FW_yr;
  console.log(`   ${r.label.padEnd(22)}${r.apse_Brown_yr.toFixed(4).padStart(11)}${r.apse_FW_yr.toFixed(4).padStart(16)}${d.toFixed(4).padStart(11)}    ${((d/r.apse_FW_yr)*100).toFixed(2)}%`);
}
console.log('');

console.log(RULE);
console.log(' T_NODAL: BROWN vs FRAMEWORK (fixed N = 18015)  — sidereal years');
console.log(RULE);
console.log(' Epoch                 Brown (yr)   Framework (yr)   Δ (yr)    Δ %');
for (const r of rows) {
  const d = r.nod_Brown_yr - r.nod_FW_yr;
  console.log(`   ${r.label.padEnd(22)}${r.nod_Brown_yr.toFixed(4).padStart(11)}${r.nod_FW_yr.toFixed(4).padStart(16)}${d.toFixed(4).padStart(11)}    ${((d/r.nod_FW_yr)*100).toFixed(2)}%`);
}
console.log('');

console.log(RULE);
console.log(' IMPLIED MONTHS under each model  — past-days');
console.log(' (anomalistic = kinematic from T_M + T_apsidal; nodal-month = T_M + T_nodal)');
console.log(RULE);
console.log(' Epoch              T_M       Anom-Brown  Anom-FW  | Nod-Brown  Nod-FW    | Δ_ano  Δ_nod');
for (const r of rows) {
  const dAno = r.ano_Brown_pd - r.ano_FW_pd;
  const dNod = r.nodM_Brown_pd - r.nodM_FW_pd;
  console.log(`   ${r.label.padEnd(20)}${r.T_M_pastDays.toFixed(4).padStart(9)}${r.ano_Brown_pd.toFixed(4).padStart(13)}${r.ano_FW_pd.toFixed(4).padStart(10)}    ${r.nodM_Brown_pd.toFixed(4).padStart(9)}${r.nodM_FW_pd.toFixed(4).padStart(10)}      ${dAno.toFixed(4).padStart(8)}${dNod.toFixed(4).padStart(8)}`);
}
console.log('');

console.log(HEAD);
console.log(' 380 Mya FOCUS — Brown vs Framework');
console.log(HEAD);
const dev = rows.find(r => r.t_Ma === 380);
console.log('');
console.log(' Inputs at 380 Mya (both models agree on these):');
console.log(`   a            = ${dev.a_km} km   LOD = ${dev.LOD_s.toFixed(0)} s = ${(dev.LOD_s/3600).toFixed(3)} hr`);
console.log(`   T_M          = ${dev.T_M_s.toFixed(1)} s = ${dev.T_M_pastDays.toFixed(6)} past-days = ${dev.T_M_currentDays.toFixed(6)} current-days`);
console.log(`   days/year    = ${dev.daysPerYear.toFixed(3)}     H = ${dev.H_yr} yr (vs today ${rows[0].H_yr})`);
console.log(`   m            = ${dev.m.toFixed(8)}  (today ${m_today.toFixed(8)}, Δ = ${(((dev.m / m_today) - 1) * 100).toFixed(2)}%)`);
console.log('');
console.log(RULE);
console.log(' BROWN (Newton + m² + Brouwer + J2):');
console.log(`   T_apsidal = ${dev.apse_Brown_yr.toFixed(4)} sid-yr = ${dev.apse_Brown_pd.toFixed(2)} past-days = ${dev.apse_Brown_cd.toFixed(2)} current-days`);
console.log(`   T_nodal   = ${dev.nod_Brown_yr.toFixed(4)} sid-yr = ${dev.nod_Brown_pd.toFixed(2)} past-days = ${dev.nod_Brown_cd.toFixed(2)} current-days`);
console.log('');
console.log(' FRAMEWORK (fixed N = H/37900 apsidal, H/18015 nodal):');
console.log(`   T_apsidal = ${dev.apse_FW_yr.toFixed(4)} sid-yr = ${dev.apse_FW_pd.toFixed(2)} past-days = ${dev.apse_FW_cd.toFixed(2)} current-days`);
console.log(`   T_nodal   = ${dev.nod_FW_yr.toFixed(4)} sid-yr = ${dev.nod_FW_pd.toFixed(2)} past-days = ${dev.nod_FW_cd.toFixed(2)} current-days`);
console.log('');
console.log(' DIVERGENCE at 380 Mya:');
console.log(`   T_apsidal Brown − FW = ${(dev.apse_Brown_yr - dev.apse_FW_yr).toFixed(4)} yr  (${((dev.apse_Brown_yr/dev.apse_FW_yr - 1)*100).toFixed(2)}%)`);
console.log(`   T_nodal   Brown − FW = ${(dev.nod_Brown_yr - dev.nod_FW_yr).toFixed(4)} yr  (${((dev.nod_Brown_yr/dev.nod_FW_yr - 1)*100).toFixed(2)}%)`);
console.log('');
console.log(' Direction: Brown predicts LONGER periods in past (slower precession,');
console.log(' because m smaller → ω̇/n_M ~ m² smaller). Framework predicts SHORTER');
console.log(' periods in past (because H shrinks, and T scales linearly with H).');
console.log(' These are OPPOSITE signs of evolution.');
console.log('');
console.log(' Implied months (anomalistic, nodal):');
console.log(`   T_anomalistic Brown = ${dev.ano_Brown_pd.toFixed(4)} past-d   FW = ${dev.ano_FW_pd.toFixed(4)} past-d   Δ = ${(dev.ano_Brown_pd - dev.ano_FW_pd).toFixed(5)} past-d`);
console.log(`   T_nodalMonth  Brown = ${dev.nodM_Brown_pd.toFixed(4)} past-d   FW = ${dev.nodM_FW_pd.toFixed(4)} past-d   Δ = ${(dev.nodM_Brown_pd - dev.nodM_FW_pd).toFixed(5)} past-d`);
console.log(' → Implied months agree to ~0.01-0.05% between the two models (T_M');
console.log('   dominates; apsidal/nodal is a tiny correction in absolute terms).');
console.log('');

// JSON output
const outFile = path.join(__dirname, '..', '..', 'data', 'moon-precession-deep-time.json');
fs.writeFileSync(outFile, JSON.stringify({
  constants: { A_TODAY_KM, T_M_TODAY_S, R_E_KM, J2_EARTH, e_M, i_M_deg },
  epochs: rows,
}, null, 2) + '\n');
console.log(` Written: ${path.relative(process.cwd(), outFile)}`);
