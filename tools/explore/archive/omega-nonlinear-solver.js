// ═══════════════════════════════════════════════════════════════
// NONLINEAR Ω(t) FROM INCLINATION SOLVER
//
// The hypothesis we're testing:
//
//   All 8 planets share ONE secular Ω regression rate (Earth's
//   −H/5). Each planet's Ω(t) carries a periodic compensator
//   δΩ_i(t) that absorbs the inclination oscillations and keeps
//   the vector residual V(t) = Σ L_i sin(i_i)(cos Ω_i, sin Ω_i)
//   at zero at every instant.
//
// Phase B's failure for Saturn/Neptune was diagnosed under the
// LINEARIZED solver: small δΩ assumption broke down for the
// outer giants. This solver uses iterative Newton-Raphson to
// find the EXACT δΩ_i(t) at each time step, with no small-angle
// approximation. The previous step's solution seeds the next step
// for smoothness.
//
// Once we have the corrected Ω_i(t), we can ask:
//
//   1. Does max |V(t)| approach zero (vs the linearized solver's
//      1.86%)? Validates the math.
//
//   2. What is each planet's INSTANTANEOUS dΩ_i/dt at J2000
//      (= shared linear rate + d(δΩ_i)/dt at t=0)? This is the
//      observable rate JPL would measure over a few decades.
//
//   3. With the corrected Ω_i(t), what is each planet's ecliptic
//      inclination trend over 1900–2100? Does it match JPL?
//
// If question (3) succeeds for Saturn and Neptune (the planets
// the rigid-rotation single-rate model couldn't fix), the
// hypothesis is fully vindicated.
//
// Usage: node tools/explore/omega-nonlinear-solver.js
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// ─── Time grid ───
const T_RANGE = 200000;
const T_STEP  = 200;
const TIMES = [];
for (let y = 2000 - T_RANGE; y <= 2000 + T_RANGE; y += T_STEP) TIMES.push(y);
const N_T = TIMES.length;
const J2000_IDX = TIMES.indexOf(2000);

const SHARED_PERIOD = -H / 5;
const sharedRate = 360 / SHARED_PERIOD;   // deg/yr

// ─── Config #1 with Phase B optimal phases ───
const config = {
  mercury: { d: 21, antiPhase: false, phase: 108.0 },
  venus:   { d: 34, antiPhase: false, phase:  41.5 },
  mars:    { d:  5, antiPhase: false, phase: 122.5 },
  jupiter: { d:  5, antiPhase: false, phase: 104.5 },
  saturn:  { d:  3, antiPhase: true,  phase: 182.0 },
  uranus:  { d: 21, antiPhase: false, phase: 260.5 },
  neptune: { d: 34, antiPhase: false, phase: 316.0 },
};
const PLANETS = ['mercury','venus','mars','jupiter','saturn','uranus','neptune'];
const ALL = ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];

const jplTrends = {
  mercury: -0.00595, venus: -0.00079, mars: -0.00813,
  jupiter: -0.00184, saturn: +0.00194, uranus: -0.00243, neptune: +0.00035,
};

// ─── Build planet data ───
const genPrecRate = 1 / (H / 13);
const data = {};
for (const key of PLANETS) {
  const p = C.planets[key];
  const eclP = p.perihelionEclipticYears;
  const icrfPeriod = 1 / (1 / eclP - genPrecRate);
  const cfg = config[key];
  const a = C.derived[key].orbitDistance;
  const e = C.eccJ2000[key];
  const sqrtM = Math.sqrt(C.massFraction[key]);
  const amp = PSI / (cfg.d * sqrtM);
  const antiSign = cfg.antiPhase ? -1 : 1;
  const cosJ2000 = Math.cos((p.longitudePerihelion - cfg.phase) * DEG2RAD);
  const mean = p.invPlaneInclinationJ2000 - antiSign * amp * cosJ2000;
  data[key] = {
    L: C.massFraction[key] * Math.sqrt(a * (1 - e * e)),
    periLongJ2000: p.longitudePerihelion,
    omegaJ2000: p.ascendingNodeInvPlane,
    icrfRate: 360 / icrfPeriod,
    mean, amp, antiSign, phase: cfg.phase,
  };
}
data.earth = {
  L: C.massFraction.earth * Math.sqrt(1.0 * (1 - C.eccJ2000.earth ** 2)),
  omegaJ2000: C.ASTRO_REFERENCE.earthAscendingNodeInvPlane,
  earthMean: C.earthInvPlaneInclinationMean,
  earthAmp:  C.earthInvPlaneInclinationAmplitude,
  earthPhaseAngle: C.ASTRO_REFERENCE.earthInclinationPhaseAngle,
  periLongJ2000: C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000,
  icrfRate: 360 / (H / 3),
  isEarth: true,
};

function inclAt(key, year) {
  const pl = data[key];
  if (pl.isEarth) {
    const peri = pl.periLongJ2000 + pl.icrfRate * (year - 2000);
    return pl.earthMean + pl.earthAmp * Math.cos((peri - pl.earthPhaseAngle) * DEG2RAD);
  }
  const peri = pl.periLongJ2000 + pl.icrfRate * (year - 2000);
  return pl.mean + pl.antiSign * pl.amp * Math.cos((peri - pl.phase) * DEG2RAD);
}
function thetaLinearAt(key, year) {
  return (data[key].omegaJ2000 + sharedRate * (year - 2000)) * DEG2RAD;
}

// ═══════════════════════════════════════════════════════════════
// NEWTON SOLVER FOR δΩ AT ONE TIME STEP
// ═══════════════════════════════════════════════════════════════
//
// Find δΩ ∈ R^8 such that:
//   Σ_i L_i sin(i_i) (cos(θ_i + δΩ_i), sin(θ_i + δΩ_i)) = (0, 0)
//
// Two equations, 8 unknowns → 6 DOF. We pick the min-norm
// solution (smallest possible δΩ vector).
//
// Iteration: Gauss-Newton with min-norm linear update.
// ─────────────────────────────────────────────────────
function solveDeltaOmega(year, dOmegaInit) {
  // Pre-compute per-planet (Lsi, theta) at this time
  const N = ALL.length;
  const Lsi = new Float64Array(N);
  const theta = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    const key = ALL[n];
    Lsi[n] = data[key].L * Math.sin(inclAt(key, year) * DEG2RAD);
    theta[n] = thetaLinearAt(key, year);
  }
  // Initial guess
  const dOm = new Float64Array(N);
  for (let n = 0; n < N; n++) dOm[n] = dOmegaInit ? dOmegaInit[n] : 0;

  const TOL = 1e-14;
  const MAX_ITER = 50;
  for (let it = 0; it < MAX_ITER; it++) {
    let Vx = 0, Vy = 0;
    for (let n = 0; n < N; n++) {
      const ang = theta[n] + dOm[n];
      Vx += Lsi[n] * Math.cos(ang);
      Vy += Lsi[n] * Math.sin(ang);
    }
    if (Vx * Vx + Vy * Vy < TOL) break;

    // Jacobian (2×N): ∂V_x/∂δΩ_n = -Lsi_n sin(θ_n+δΩ_n)
    //                ∂V_y/∂δΩ_n =  Lsi_n cos(θ_n+δΩ_n)
    // We want J · Δ = -V (= (-Vx, -Vy))
    // Min-norm: Δ = J^T (J J^T)^{-1} (-V)
    let MMa = 0, MMb = 0, MMc = 0;
    const J1 = new Float64Array(N);
    const J2 = new Float64Array(N);
    for (let n = 0; n < N; n++) {
      const ang = theta[n] + dOm[n];
      J1[n] = -Lsi[n] * Math.sin(ang);
      J2[n] =  Lsi[n] * Math.cos(ang);
      MMa += J1[n] * J1[n];
      MMb += J1[n] * J2[n];
      MMc += J2[n] * J2[n];
    }
    const det = MMa * MMc - MMb * MMb;
    if (Math.abs(det) < 1e-30) break;
    // (J J^T)^{-1} (-V) = (1/det) [[MMc, -MMb], [-MMb, MMa]] · [-Vx, -Vy]
    const lambda1 = ( MMc * (-Vx) - MMb * (-Vy)) / det;
    const lambda2 = (-MMb * (-Vx) + MMa * (-Vy)) / det;
    for (let n = 0; n < N; n++) {
      dOm[n] += J1[n] * lambda1 + J2[n] * lambda2;
    }
  }
  return dOm;
}

// ═══════════════════════════════════════════════════════════════
// SWEEP TIME, WALKING FROM J2000 OUTWARD WITH WARM STARTS
// ═══════════════════════════════════════════════════════════════

const dOmegaSeries = Object.fromEntries(ALL.map(k => [k, new Float64Array(N_T)]));
const VxAfter = new Float64Array(N_T);
const VyAfter = new Float64Array(N_T);
const totLsiAfter = new Float64Array(N_T);

// J2000 first
const dJ2000 = solveDeltaOmega(2000, null);
for (let n = 0; n < ALL.length; n++) dOmegaSeries[ALL[n]][J2000_IDX] = dJ2000[n] * RAD2DEG;

// Walk forward from J2000
let prev = new Float64Array(dJ2000);
for (let k = J2000_IDX + 1; k < N_T; k++) {
  const sol = solveDeltaOmega(TIMES[k], prev);
  for (let n = 0; n < ALL.length; n++) dOmegaSeries[ALL[n]][k] = sol[n] * RAD2DEG;
  prev = sol;
}
// Walk backward from J2000
prev = new Float64Array(dJ2000);
for (let k = J2000_IDX - 1; k >= 0; k--) {
  const sol = solveDeltaOmega(TIMES[k], prev);
  for (let n = 0; n < ALL.length; n++) dOmegaSeries[ALL[n]][k] = sol[n] * RAD2DEG;
  prev = sol;
}

// Validation: compute V(t) with the corrected Ω
for (let k = 0; k < N_T; k++) {
  const year = TIMES[k];
  let Vx = 0, Vy = 0, totLsi = 0;
  for (const key of ALL) {
    const i = inclAt(key, year) * DEG2RAD;
    const Om = thetaLinearAt(key, year) + dOmegaSeries[key][k] * DEG2RAD;
    const Lsi = data[key].L * Math.sin(i);
    Vx += Lsi * Math.cos(Om);
    Vy += Lsi * Math.sin(Om);
    totLsi += Math.abs(Lsi);
  }
  VxAfter[k] = Vx; VyAfter[k] = Vy; totLsiAfter[k] = totLsi;
}

let maxRelAfter = 0;
for (let k = 0; k < N_T; k++) {
  const rel = Math.sqrt(VxAfter[k] ** 2 + VyAfter[k] ** 2) / totLsiAfter[k];
  if (rel > maxRelAfter) maxRelAfter = rel;
}
const j2000RelAfter = Math.sqrt(VxAfter[J2000_IDX] ** 2 + VyAfter[J2000_IDX] ** 2) / totLsiAfter[J2000_IDX];

console.log('═══════════════════════════════════════════════════════════════');
console.log('  NONLINEAR Ω(t) SOLVER — full vector balance enforcement');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Time grid: ±${T_RANGE/1000} kyr step ${T_STEP} yr (${N_T} samples)`);
console.log(`  Linear part: ALL 8 planets at −H/5 = ${SHARED_PERIOD.toFixed(0)} yr`);
console.log(`  Solver: Gauss-Newton min-norm at each step, warm-start from previous`);
console.log('');

console.log('  ─── VALIDATION ─────────────────────────────────────────────');
console.log(`  Max |V|/Σ|L sin i| WITH corrected Ω: ${(maxRelAfter * 100).toExponential(3)} %`);
console.log(`  Same at J2000:                       ${(j2000RelAfter * 100).toExponential(3)} %`);
console.log(`  (Should be ~10⁻¹⁰ — Newton converged. If higher, J2000 baseline 0.42% remains.)`);
console.log('');

// ═══════════════════════════════════════════════════════════════
// PER-PLANET δΩ STATISTICS
// ═══════════════════════════════════════════════════════════════

console.log('  ─── PER-PLANET δΩ STATISTICS (over ±200 kyr) ───────────────');
console.log('  Planet   │ peak |δΩ| (°) │ rms |δΩ| (°) │ at J2000 (°)');
console.log('  ─────────┼───────────────┼──────────────┼─────────────');
for (const key of ALL) {
  let mx = 0, sumSq = 0;
  for (let k = 0; k < N_T; k++) {
    const v = Math.abs(dOmegaSeries[key][k]);
    if (v > mx) mx = v;
    sumSq += v * v;
  }
  const rms = Math.sqrt(sumSq / N_T);
  console.log(
    '  ' + key.padEnd(8) + ' │ ' +
    mx.toFixed(4).padStart(13) + ' │ ' +
    rms.toFixed(4).padStart(12) + ' │ ' +
    ((dOmegaSeries[key][J2000_IDX] >= 0 ? '+' : '') + dOmegaSeries[key][J2000_IDX].toFixed(4)).padStart(11)
  );
}
console.log('');

// ═══════════════════════════════════════════════════════════════
// EMERGENT INSTANTANEOUS dΩ/dt AT J2000
// ═══════════════════════════════════════════════════════════════
//
// Total Ω_i(t) = Ω_i^(J2000) + ω·(t−2000) + δΩ_i(t)
// dΩ_i/dt at t=2000 = ω + d(δΩ_i)/dt at t=2000
// Use centered finite difference of δΩ.

console.log('  ─── EMERGENT TOTAL dΩ_i/dt at J2000 ─────────────────────────');
console.log('  (Linear shared rate + δΩ slope at t=0)');
console.log('');
console.log('  Planet   │ Linear (″/cy) │ δΩ slope (″/cy) │ Total (″/cy)   │ Total (deg/cy)');
console.log('  ─────────┼───────────────┼─────────────────┼────────────────┼────────────────');
const totalRates = {};
for (const key of ALL) {
  const dDelta = (dOmegaSeries[key][J2000_IDX + 1] - dOmegaSeries[key][J2000_IDX - 1]) / (2 * T_STEP); // deg/yr
  const linearArcsecCy = sharedRate * 3600 * 100;       // ≈ -1933 ″/cy
  const deltaArcsecCy = dDelta * 3600 * 100;
  const totalArcsecCy = linearArcsecCy + deltaArcsecCy;
  totalRates[key] = totalArcsecCy / 3600 / 100; // deg/yr
  console.log(
    '  ' + key.padEnd(8) + ' │ ' +
    linearArcsecCy.toFixed(2).padStart(13) + ' │ ' +
    ((deltaArcsecCy >= 0 ? '+' : '') + deltaArcsecCy.toFixed(2)).padStart(15) + ' │ ' +
    ((totalArcsecCy >= 0 ? '+' : '') + totalArcsecCy.toFixed(2)).padStart(13) + ' │ ' +
    (totalRates[key] * 100 >= 0 ? '+' : '') + (totalRates[key] * 100).toFixed(5).padStart(13)
  );
}
console.log('');

// ═══════════════════════════════════════════════════════════════
// JPL DI/DT TREND CHECK USING THE WOBBLE-CORRECTED Ω
// ═══════════════════════════════════════════════════════════════
//
// Compute ecl_inc(year) using the WOBBLE-CORRECTED Ω_i(t),
// then take the slope between 1900 and 2100. Compare to JPL.
// This is the falsification test.
// ─────────────────────────────────────────────────────────
function eclInclAtYearWithWobble(planetKey, year) {
  // Find nearest k in TIMES (or interpolate). For simplicity, use linear interpolation.
  // We have samples every T_STEP years.
  const fIdx = (year - TIMES[0]) / T_STEP;
  const k0 = Math.floor(fIdx);
  const f = fIdx - k0;
  if (k0 < 0 || k0 + 1 >= N_T) return null;
  const dpInterp = dOmegaSeries[planetKey][k0] * (1 - f) + dOmegaSeries[planetKey][k0 + 1] * f;
  const deInterp = dOmegaSeries.earth[k0] * (1 - f) + dOmegaSeries.earth[k0 + 1] * f;
  const planetI = inclAt(planetKey, year) * DEG2RAD;
  const earthI  = inclAt('earth', year) * DEG2RAD;
  const planetOm = thetaLinearAt(planetKey, year) + dpInterp * DEG2RAD;
  const earthOm  = thetaLinearAt('earth', year) + deInterp * DEG2RAD;
  const pnx = Math.sin(planetI) * Math.sin(planetOm);
  const pny = Math.sin(planetI) * Math.cos(planetOm);
  const pnz = Math.cos(planetI);
  const enx = Math.sin(earthI) * Math.sin(earthOm);
  const eny = Math.sin(earthI) * Math.cos(earthOm);
  const enz = Math.cos(earthI);
  return Math.acos(Math.max(-1, Math.min(1, pnx*enx + pny*eny + pnz*enz))) * RAD2DEG;
}

console.log('  ─── JPL TREND CHECK WITH WOBBLE-CORRECTED Ω ────────────────');
console.log('  Compare 1900–2100 ecliptic inclination slope to JPL.');
console.log('  This tests whether the wobble fixes the trend mismatch we');
console.log('  observed for Saturn and Neptune in earlier searches.');
console.log('');
console.log('  Planet   │ Wobble trend  │ JPL trend     │ Δ (″/cy) │ Dir match');
console.log('  ─────────┼───────────────┼───────────────┼──────────┼──────────');
for (const key of PLANETS) {
  const ecl1900 = eclInclAtYearWithWobble(key, 1900);
  const ecl2100 = eclInclAtYearWithWobble(key, 2100);
  const trend = (ecl2100 - ecl1900) / 2;
  const jpl = jplTrends[key];
  const errAsec = Math.abs(trend - jpl) * 3600;
  const dir = (trend >= 0) === (jpl >= 0);
  console.log(
    '  ' + key.padEnd(8) + ' │ ' +
    ((trend >= 0 ? '+' : '') + trend.toFixed(6)).padStart(13) + ' │ ' +
    ((jpl >= 0 ? '+' : '') + jpl.toFixed(5)).padStart(12) + '  │ ' +
    errAsec.toFixed(2).padStart(8) + ' │   ' + (dir ? '✓' : '✗')
  );
}
console.log('');

// ═══════════════════════════════════════════════════════════════
// COMPARISON TO RIGID-ROTATION TREND (NO WOBBLE)
// ═══════════════════════════════════════════════════════════════

function eclInclRigid(planetKey, year) {
  const planetI = inclAt(planetKey, year) * DEG2RAD;
  const earthI  = inclAt('earth', year) * DEG2RAD;
  const planetOm = thetaLinearAt(planetKey, year);
  const earthOm  = thetaLinearAt('earth', year);
  const pnx = Math.sin(planetI) * Math.sin(planetOm);
  const pny = Math.sin(planetI) * Math.cos(planetOm);
  const pnz = Math.cos(planetI);
  const enx = Math.sin(earthI) * Math.sin(earthOm);
  const eny = Math.sin(earthI) * Math.cos(earthOm);
  const enz = Math.cos(earthI);
  return Math.acos(Math.max(-1, Math.min(1, pnx*enx + pny*eny + pnz*enz))) * RAD2DEG;
}

console.log('  ─── RIGID-ROTATION TRENDS (for comparison) ─────────────────');
console.log('  Planet   │ Rigid trend   │ Δ from JPL (″/cy)');
console.log('  ─────────┼───────────────┼──────────────────');
for (const key of PLANETS) {
  const ecl1900 = eclInclRigid(key, 1900);
  const ecl2100 = eclInclRigid(key, 2100);
  const trend = (ecl2100 - ecl1900) / 2;
  const jpl = jplTrends[key];
  const errAsec = Math.abs(trend - jpl) * 3600;
  const dir = (trend >= 0) === (jpl >= 0);
  console.log(
    '  ' + key.padEnd(8) + ' │ ' +
    ((trend >= 0 ? '+' : '') + trend.toFixed(6)).padStart(13) + ' │ ' +
    errAsec.toFixed(2).padStart(8) + ' ' + (dir ? '✓' : '✗')
  );
}
console.log('');
