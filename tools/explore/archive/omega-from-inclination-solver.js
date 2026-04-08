// ═══════════════════════════════════════════════════════════════
// Ω(t) FROM INCLINATION — derivation under continuous vector balance
//
// We now derive Ω_i(t) from the inclinations + conservation of
// angular momentum, instead of fitting it as a free parameter.
//
// The causal chain (per the simpler hypothesis):
//   ICRF perihelion ϖ(t) → inclination i(t) → vector balance →
//     forced ascending node Ω(t)
//
// MATHEMATICAL SETUP (linearized about the J2000 state)
// ─────────────────────────────────────────────────────
// Write Ω_i(t) = Ω_i^(0) + ω·t + δΩ_i(t)
// where ω = 360°/(−H/5) is the shared linear precession rate
// (Earth's observed value), and δΩ_i(t) is the unknown wobble.
//
// To first order in small perturbations, V(t) = 0 becomes
// (using s_i = sin ī_i, c_i = cos ī_i, θ_i(t) = Ω_i^(0) + ω·t):
//
//   Σ_i L_i s_i sin θ_i(t) · δΩ_i(t) = +Σ_i L_i c_i cos θ_i(t) · δi_i(t)   ...(1)
//   Σ_i L_i s_i cos θ_i(t) · δΩ_i(t) = −Σ_i L_i c_i sin θ_i(t) · δi_i(t)   ...(2)
//
// Two real equations, eight unknown δΩ_i(t) values. The system is
// under-determined (6 DOF). We pick the unique min-norm solution
// at each time:
//
//   δΩ(t) = M^T (M M^T)^{−1} r(t)
//
// where M is the 2×8 constraint matrix and r the 2-vector RHS.
// This gives the smallest possible δΩ that satisfies the constraint
// — i.e., the closest the system can come to a rigid rotation.
//
// The user requested a frequency-domain interpretation: after
// solving for δΩ_i(t) on a long time grid, we FFT each planet's
// trajectory and report the dominant frequency components.
//
// OUTPUTS
// ───────
// 1. Validation: max |V(t)| with the corrected Ω_i(t) (should be
//    ~rounding-noise small, confirming the constraint is enforced).
// 2. Per-planet δΩ amplitude (peak |δΩ_i|, in degrees).
// 3. Per-planet emergent dΩ_i/dt at J2000 (linear part −H/5 + the
//    instantaneous derivative of δΩ_i at t=0). This is the model's
//    PREDICTED total ascending-node rate for each planet.
// 4. Frequency-domain decomposition of δΩ_i(t): dominant periods.
//
// Usage: node tools/explore/omega-from-inclination-solver.js
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// ─── Time grid: 8H spans the Grand Holistic Octave (one full
// return), but ±200 kyr is enough to see the structure cleanly.
const T_RANGE = 200000;
const T_STEP  = 200;
const TIMES = [];
for (let y = 2000 - T_RANGE; y <= 2000 + T_RANGE; y += T_STEP) TIMES.push(y);
const N_T = TIMES.length;
const SHARED_PERIOD = -H / 5;
const sharedRate = 360 / SHARED_PERIOD;  // deg/yr

// ─── Config #1 with Phase B optimal phases for the 5 working planets ───
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

// ─── Build planet data ───
const genPrecRate = 1 / (H / 13);
function buildData() {
  const d = {};
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
    // Mean derived from J2000 constraint
    const cosJ2000 = Math.cos((p.longitudePerihelion - cfg.phase) * DEG2RAD);
    const mean = p.invPlaneInclinationJ2000 - antiSign * amp * cosJ2000;
    d[key] = {
      L: C.massFraction[key] * Math.sqrt(a * (1 - e * e)),
      periLongJ2000: p.longitudePerihelion,
      omegaJ2000: p.ascendingNodeInvPlane,
      icrfRate: 360 / icrfPeriod,
      icrfPeriod,
      mean, amp, antiSign, phase: cfg.phase,
    };
  }
  d.earth = {
    L: C.massFraction.earth * Math.sqrt(1.0 * (1 - C.eccJ2000.earth ** 2)),
    omegaJ2000: C.ASTRO_REFERENCE.earthAscendingNodeInvPlane,
    earthMean: C.earthInvPlaneInclinationMean,
    earthAmp:  C.earthInvPlaneInclinationAmplitude,
    earthPhaseAngle: C.ASTRO_REFERENCE.earthInclinationPhaseAngle,
    periLongJ2000:   C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000,
    icrfRate: 360 / (H / 3),
    icrfPeriod: H / 3,
    isEarth: true,
  };
  return d;
}
const data = buildData();

function inclAt(key, year) {
  const pl = data[key];
  if (pl.isEarth) {
    const peri = pl.periLongJ2000 + pl.icrfRate * (year - 2000);
    return pl.earthMean + pl.earthAmp * Math.cos((peri - pl.earthPhaseAngle) * DEG2RAD);
  }
  const peri = pl.periLongJ2000 + pl.icrfRate * (year - 2000);
  return pl.mean + pl.antiSign * pl.amp * Math.cos((peri - pl.phase) * DEG2RAD);
}
function meanInclOf(key) {
  const pl = data[key];
  return pl.isEarth ? pl.earthMean : pl.mean;
}

// ─── Linear-trend Ω_i(t) (= Ω_i^(0) + ω·t) ───
function thetaOf(key, year) {
  return (data[key].omegaJ2000 + sharedRate * (year - 2000)) * DEG2RAD;
}

// ─── Pre-compute mean inclinations and L·s, L·c per planet ───
const meanI  = {};   // mean inclination (deg)
const Ls     = {};   // L · sin(mean i)
const Lc     = {};   // L · cos(mean i)
for (const key of ALL) {
  meanI[key] = meanInclOf(key);
  const m = meanI[key] * DEG2RAD;
  Ls[key] = data[key].L * Math.sin(m);
  Lc[key] = data[key].L * Math.cos(m);
}

// ─── At each time, compute δi_i(t) (in radians) and solve min-norm δΩ ───
const dOmegaSeries = Object.fromEntries(ALL.map(k => [k, new Float64Array(N_T)]));
const VxAfter = new Float64Array(N_T);
const VyAfter = new Float64Array(N_T);
const totalLsinIAfter = new Float64Array(N_T);

for (let k = 0; k < N_T; k++) {
  const year = TIMES[k];

  // δi_i(t) in radians, and θ_i(t) for each planet
  const di = {}, sinT = {}, cosT = {};
  for (const key of ALL) {
    const i_t = inclAt(key, year);
    di[key] = (i_t - meanI[key]) * DEG2RAD;
    const th = thetaOf(key, year);
    sinT[key] = Math.sin(th);
    cosT[key] = Math.cos(th);
  }

  // Build M (2×8) and r (2×1)
  // M_1i = L_i s_i sin θ_i ; M_2i = L_i s_i cos θ_i
  // r_1  =  Σ L_i c_i cos θ_i · δi_i
  // r_2  = -Σ L_i c_i sin θ_i · δi_i
  let r1 = 0, r2 = 0;
  let MMa = 0, MMb = 0, MMc = 0;
  for (const key of ALL) {
    const m1 = Ls[key] * sinT[key];
    const m2 = Ls[key] * cosT[key];
    MMa += m1 * m1;
    MMb += m1 * m2;
    MMc += m2 * m2;
    r1 += Lc[key] * cosT[key] * di[key];
    r2 -= Lc[key] * sinT[key] * di[key];
  }
  const det = MMa * MMc - MMb * MMb;
  // Inverse of [[MMa, MMb], [MMb, MMc]] = (1/det) [[MMc, −MMb], [−MMb, MMa]]
  const lambda1 = ( MMc * r1 - MMb * r2) / det;
  const lambda2 = (-MMb * r1 + MMa * r2) / det;

  // δΩ_i = M_1i · λ_1 + M_2i · λ_2 = L_i s_i (sin θ_i · λ_1 + cos θ_i · λ_2)
  //   (in radians)
  let Vx = 0, Vy = 0, totLsi = 0;
  for (const key of ALL) {
    const dOm = Ls[key] * (sinT[key] * lambda1 + cosT[key] * lambda2);
    dOmegaSeries[key][k] = dOm * RAD2DEG;   // store in degrees
    // Verify: compute V with corrected Ω = θ + dOm (radians)
    const i_t = (meanI[key] + di[key] * RAD2DEG) * DEG2RAD;
    const Om  = thetaOf(key, year) + dOm;
    const Lsi = data[key].L * Math.sin(i_t);
    Vx += Lsi * Math.cos(Om);
    Vy += Lsi * Math.sin(Om);
    totLsi += Math.abs(Lsi);
  }
  VxAfter[k] = Vx;
  VyAfter[k] = Vy;
  totalLsinIAfter[k] = totLsi;
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

let maxRelAfter = 0, j2000Idx = 0;
for (let k = 0; k < N_T; k++) {
  const rel = Math.sqrt(VxAfter[k] ** 2 + VyAfter[k] ** 2) / totalLsinIAfter[k];
  if (rel > maxRelAfter) maxRelAfter = rel;
  if (TIMES[k] === 2000) j2000Idx = k;
}
const j2000Rel = Math.sqrt(VxAfter[j2000Idx] ** 2 + VyAfter[j2000Idx] ** 2) / totalLsinIAfter[j2000Idx];

console.log('═══════════════════════════════════════════════════════════════');
console.log('  Ω(t) FROM INCLINATION — solver and frequency analysis');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Time grid: ±${T_RANGE/1000} kyr, step ${T_STEP} yr (${N_T} samples)`);
console.log(`  Linear part: rigid rotation at −H/5 = ${SHARED_PERIOD.toFixed(0)} yr`);
console.log(`  Solver: pointwise min-norm projection of δΩ onto V(t)=0 plane`);
console.log('');
console.log('  ─── VALIDATION ─────────────────────────────────────────────');
console.log(`  Max |V|/Σ|L sin i| WITH corrected Ω: ${(maxRelAfter * 100).toExponential(3)} %`);
console.log(`  Same at J2000:                       ${(j2000Rel * 100).toExponential(3)} %`);
console.log(`  (Should be tiny — rounding noise — confirming the constraint is satisfied)`);
console.log('');

// ═══════════════════════════════════════════════════════════════
// PER-PLANET δΩ STATISTICS
// ═══════════════════════════════════════════════════════════════

console.log('  ─── PER-PLANET δΩ STATISTICS ───────────────────────────────');
console.log('  Planet   │ peak |δΩ| (deg) │ rms |δΩ| (deg) │ at J2000 (deg)');
console.log('  ─────────┼──────────────────┼─────────────────┼──────────────');
for (const key of ALL) {
  let mx = 0, sumSq = 0;
  for (let k = 0; k < N_T; k++) {
    const v = Math.abs(dOmegaSeries[key][k]);
    if (v > mx) mx = v;
    sumSq += v * v;
  }
  const rms = Math.sqrt(sumSq / N_T);
  const j2k = dOmegaSeries[key][j2000Idx];
  console.log(
    '  ' + key.padEnd(8) + ' │ ' +
    mx.toFixed(6).padStart(15) + '  │ ' +
    rms.toFixed(6).padStart(14) + '  │ ' +
    (j2k >= 0 ? '+' : '') + j2k.toFixed(6).padStart(13)
  );
}
console.log('');

// ═══════════════════════════════════════════════════════════════
// EMERGENT dΩ_i/dt AT J2000 (linear + δΩ derivative)
// ═══════════════════════════════════════════════════════════════
//
// Use a centered finite difference of δΩ_i at t=2000.
// Total emergent rate = sharedRate + dδΩ_i/dt at J2000.
// Convert to arcsec/century for direct comparison with JPL.

console.log('  ─── EMERGENT dΩ/dt AT J2000 ────────────────────────────────');
console.log('  Total dΩ/dt = (linear −H/5 trend) + d(δΩ_i)/dt at J2000');
console.log('');
console.log('  Planet   │ Linear part   │ δΩ contribution │ Total emergent  │ Total /century');
console.log('  ─────────┼───────────────┼─────────────────┼─────────────────┼────────────────');
const linearArcsecPerCentury = sharedRate * 3600 * 100;  // deg/yr × 3600 × 100
for (const key of ALL) {
  // Centered FD of δΩ at j2000Idx
  const delta = (dOmegaSeries[key][j2000Idx + 1] - dOmegaSeries[key][j2000Idx - 1]) / (2 * T_STEP);  // deg/yr
  const linearDegPerYr = sharedRate;
  const totalDegPerYr  = linearDegPerYr + delta;
  const totalArcsecPerCy = totalDegPerYr * 3600 * 100;
  console.log(
    '  ' + key.padEnd(8) + ' │ ' +
    (linearDegPerYr.toFixed(8) + ' °/yr').padStart(13) + ' │ ' +
    ((delta >= 0 ? '+' : '') + delta.toExponential(3) + ' °/yr').padStart(15) + ' │ ' +
    ((totalDegPerYr >= 0 ? '+' : '') + totalDegPerYr.toFixed(8) + ' °/yr').padStart(15) + ' │ ' +
    ((totalArcsecPerCy >= 0 ? '+' : '') + totalArcsecPerCy.toFixed(2) + ' ″/cy').padStart(14)
  );
}
console.log('');

// ═══════════════════════════════════════════════════════════════
// FREQUENCY-DOMAIN DECOMPOSITION (dominant periods)
// ═══════════════════════════════════════════════════════════════
//
// Brute-force projection onto the 7 ICRF frequencies + a few
// combinations. For each candidate frequency f, compute the
// amplitude (a, b) such that δΩ_i(t) ≈ a cos(2π f t) + b sin(2π f t)
// via simple inner products on the time grid.

const candidates = [
  { name: 'H/3 (Earth ICRF)',  period: H / 3 },
  { name: 'H/8 (Jupiter ICRF)',  period: data.jupiter.icrfPeriod },
  { name: 'H/5 (Saturn ICRF)',  period: data.saturn.icrfPeriod },
  { name: 'H/16 (Uranus ICRF)', period: data.uranus.icrfPeriod },
  { name: '2H/25 (Venus ICRF)', period: data.venus.icrfPeriod },
  { name: '8H/93 (Mercury ICRF)', period: data.mercury.icrfPeriod },
  { name: '8H/69 (Mars ICRF)',  period: data.mars.icrfPeriod },
  { name: '2H/25 (Neptune ICRF)', period: data.neptune.icrfPeriod },
];
const dt = T_STEP;
const totalT = N_T * dt;

function project(series, period) {
  let aSum = 0, bSum = 0, ccSum = 0, ssSum = 0, csSum = 0;
  const omega = (2 * Math.PI) / period;
  for (let k = 0; k < N_T; k++) {
    const t = TIMES[k] - 2000;
    const c = Math.cos(omega * t);
    const s = Math.sin(omega * t);
    aSum += series[k] * c;
    bSum += series[k] * s;
    ccSum += c * c;
    ssSum += s * s;
    csSum += c * s;
  }
  // Solve [[ccSum, csSum],[csSum, ssSum]] · [a; b] = [aSum; bSum]
  const det = ccSum * ssSum - csSum * csSum;
  const a = (ssSum * aSum - csSum * bSum) / det;
  const b = (-csSum * aSum + ccSum * bSum) / det;
  return { a, b, amp: Math.sqrt(a * a + b * b) };
}

console.log('  ─── FREQUENCY DECOMPOSITION OF δΩ_i(t) ─────────────────────');
console.log('  Projection onto each planet\'s ICRF frequency.');
console.log('  Amplitude = √(a² + b²) where δΩ ⊃ a cos(ωt) + b sin(ωt)');
console.log('');
const headerCand = candidates.map(c => `| ${c.name.padEnd(18)}`).join(' ');
console.log('  Planet   ' + headerCand);
console.log('  ─────────' + candidates.map(() => '┴────────────────────').join(''));
for (const key of ALL) {
  let line = '  ' + key.padEnd(8) + ' ';
  for (const cand of candidates) {
    const r = project(dOmegaSeries[key], cand.period);
    line += '| ' + (r.amp.toExponential(3) + '°').padStart(18) + ' ';
  }
  console.log(line);
}
console.log('');
console.log('  (Each column = projected amplitude of δΩ_i at that frequency)');
console.log('');
