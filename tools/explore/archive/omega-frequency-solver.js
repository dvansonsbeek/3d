// ═══════════════════════════════════════════════════════════════
// FREQUENCY-RESTRICTED Ω WOBBLE SOLVER
//
// The pointwise min-norm wobble solver gave physically arbitrary
// answers because at each time step it could pick any of the
// 6 DOF in the constraint manifold. The wobble preset search
// then showed: with min-norm wobble, NO preset gets all 7 JPL
// directions correct, even at huge wobble amplitudes.
//
// The fix: restrict the wobble to a finite-frequency ansatz
// physically motivated by the inclination model itself. Each
// planet's inclination oscillates at its OWN ICRF perihelion
// frequency. Real gravitational dynamics couples these — every
// planet's Ω carries Fourier components at every other planet's
// inclination frequency.
//
// Ansatz:
//
//   δΩ_i(t) = Σ_j [P_ij cos(ω_j t) + Q_ij sin(ω_j t)]
//
// where j runs over the 8 planet ICRF frequencies (i.e. each
// planet's Ω wobble is a Fourier sum over those 8 modes).
// 8 planets × 8 modes × 2 (cos+sin) = 128 unknowns total.
//
// The vector-balance constraint V(t) = 0 is enforced (in the
// linearized form) at K = 200 time samples over ±150 kyr,
// giving 2K = 400 linear equations on 128 unknowns. The system
// is overdetermined; solve in least-squares sense.
//
// This restricts the solution space dramatically (vs. unconstrained
// min-norm projection at every time point) and forces the wobble
// to look like the gravitational eigenmode structure rather than
// arbitrary noise that locally satisfies the constraint.
//
// Output: per-planet peak |δΩ|, wobble-corrected JPL trend errors,
// and direct comparison to the min-norm solver from the previous
// experiment.
//
// Usage: node tools/explore/omega-frequency-solver.js
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

const T_RANGE = 150000;
const T_STEP  = 1500;
const TIMES = [];
for (let y = 2000 - T_RANGE; y <= 2000 + T_RANGE; y += T_STEP) TIMES.push(y);
const N_T = TIMES.length;
const J2000_IDX = TIMES.indexOf(2000);

const SHARED_PERIOD = -H / 5;
const sharedRate = 360 / SHARED_PERIOD;     // deg/yr

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
    icrfAngFreq: 2 * Math.PI / icrfPeriod,    // rad/yr
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
  icrfAngFreq: 2 * Math.PI / (H / 3),
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

// Frequencies (rad/yr) — one per UNIQUE ICRF rate
// (Venus and Neptune happen to share 2H/25 in this model, so dedupe.)
const N = ALL.length;                // 8 planets
const allFreqs = ALL.map(k => data[k].icrfAngFreq);
const FREQS = [];
const FREQ_LABELS = [];
for (let i = 0; i < allFreqs.length; i++) {
  const f = allFreqs[i];
  if (!FREQS.some(g => Math.abs(g - f) < 1e-12)) {
    FREQS.push(f);
    FREQ_LABELS.push(ALL[i]);
  }
}
const NF = FREQS.length;

// ═══════════════════════════════════════════════════════════════
// BUILD CONSTRAINT SYSTEM
// ═══════════════════════════════════════════════════════════════
//
// At each time step k, two equations:
//   Σ_i L_i sin(i_i(t_k)) sin(θ_i^lin(t_k)) · δΩ_i(t_k) = +Σ_i L_i sin(i_i(t_k)) cos(θ_i^lin(t_k))   [eq for V_x = 0]
//   Σ_i L_i sin(i_i(t_k)) cos(θ_i^lin(t_k)) · δΩ_i(t_k) = -Σ_i L_i sin(i_i(t_k)) sin(θ_i^lin(t_k))   [eq for V_y = 0]
//
// With ansatz δΩ_i(t_k) = Σ_j [P_{ij} cos(ω_j t_k) + Q_{ij} sin(ω_j t_k)], expand.
// Unknown index: x[i*NF*2 + j*2 + 0] = P_{ij}, x[i*NF*2 + j*2 + 1] = Q_{ij}
// Total unknowns NU = N*NF*2 = 8*8*2 = 128.

const NU = N * NF * 2;
function unknownIdx(i, j, type) { return i * NF * 2 + j * 2 + type; }

// Pre-compute time-dependent quantities at each sample
const Lsi = new Array(N_T);                // Lsi[k][n] = L_n sin(i_n(t_k))
const sinTheta = new Array(N_T);           // sinTheta[k][n]
const cosTheta = new Array(N_T);           // cosTheta[k][n]
const cosFreq = new Array(N_T);            // cosFreq[k][j] = cos(ω_j t_k)
const sinFreq = new Array(N_T);            // sinFreq[k][j] = sin(ω_j t_k)

for (let k = 0; k < N_T; k++) {
  const year = TIMES[k];
  const dt = year - 2000;
  Lsi[k] = new Float64Array(N);
  sinTheta[k] = new Float64Array(N);
  cosTheta[k] = new Float64Array(N);
  cosFreq[k] = new Float64Array(NF);
  sinFreq[k] = new Float64Array(NF);
  for (let n = 0; n < N; n++) {
    const key = ALL[n];
    Lsi[k][n] = data[key].L * Math.sin(inclAt(key, year) * DEG2RAD);
    const th = thetaLinearAt(key, year);
    sinTheta[k][n] = Math.sin(th);
    cosTheta[k][n] = Math.cos(th);
  }
  for (let j = 0; j < NF; j++) {
    cosFreq[k][j] = Math.cos(FREQS[j] * dt);
    sinFreq[k][j] = Math.sin(FREQS[j] * dt);
  }
}

// Form M^T M and M^T c directly (avoid storing the full 2K × NU matrix).
// Each time step contributes 2 rows to M.
// For each row, we add row * row^T to M^T M and row * RHS to M^T c.
const MtM = new Float64Array(NU * NU);
const Mtc = new Float64Array(NU);

for (let k = 0; k < N_T; k++) {
  // Row 1 (V_x equation): coefficient of P_{ij} is Lsi[k][i] * sinTheta[k][i] * cosFreq[k][j]
  //                       coefficient of Q_{ij} is Lsi[k][i] * sinTheta[k][i] * sinFreq[k][j]
  // RHS_1 = Σ_i Lsi[k][i] * cosTheta[k][i]
  // Row 2 (V_y equation): coefficient of P_{ij} is Lsi[k][i] * cosTheta[k][i] * cosFreq[k][j]
  //                       coefficient of Q_{ij} is Lsi[k][i] * cosTheta[k][i] * sinFreq[k][j]
  // RHS_2 = -Σ_i Lsi[k][i] * sinTheta[k][i]
  let rhs1 = 0, rhs2 = 0;
  for (let n = 0; n < N; n++) {
    rhs1 += Lsi[k][n] * cosTheta[k][n];
    rhs2 -= Lsi[k][n] * sinTheta[k][n];
  }
  // Build the two rows
  const row1 = new Float64Array(NU);
  const row2 = new Float64Array(NU);
  for (let i = 0; i < N; i++) {
    const lsiSinT = Lsi[k][i] * sinTheta[k][i];
    const lsiCosT = Lsi[k][i] * cosTheta[k][i];
    for (let j = 0; j < NF; j++) {
      const cf = cosFreq[k][j];
      const sf = sinFreq[k][j];
      row1[unknownIdx(i, j, 0)] = lsiSinT * cf;
      row1[unknownIdx(i, j, 1)] = lsiSinT * sf;
      row2[unknownIdx(i, j, 0)] = lsiCosT * cf;
      row2[unknownIdx(i, j, 1)] = lsiCosT * sf;
    }
  }
  // Accumulate row^T row into MtM, row^T rhs into Mtc
  for (let p = 0; p < NU; p++) {
    if (row1[p] !== 0) {
      Mtc[p] += row1[p] * rhs1;
      for (let q = p; q < NU; q++) MtM[p * NU + q] += row1[p] * row1[q];
    }
    if (row2[p] !== 0) {
      Mtc[p] += row2[p] * rhs2;
      for (let q = p; q < NU; q++) MtM[p * NU + q] += row2[p] * row2[q];
    }
  }
}
// Mirror upper triangle to lower
for (let p = 0; p < NU; p++) {
  for (let q = 0; q < p; q++) MtM[p * NU + q] = MtM[q * NU + p];
}

// ═══════════════════════════════════════════════════════════════
// SOLVE NU × NU SYSTEM via Gauss-Jordan (with light Tikhonov)
// ═══════════════════════════════════════════════════════════════

// Tikhonov ridge scaled to the matrix diagonal: forces small ||x||
let maxDiag = 0;
for (let p = 0; p < NU; p++) {
  if (MtM[p * NU + p] > maxDiag) maxDiag = MtM[p * NU + p];
}
const RIDGE_FRAC = 1e-3;
const RIDGE = RIDGE_FRAC * maxDiag;
for (let p = 0; p < NU; p++) MtM[p * NU + p] += RIDGE;

function solveLinear(A, b, n) {
  // A is row-major n*n, b is length n. In-place Gauss-Jordan with partial pivoting.
  const M = new Float64Array((n + 1) * n);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) M[r * (n + 1) + c] = A[r * n + c];
    M[r * (n + 1) + n] = b[r];
  }
  for (let col = 0; col < n; col++) {
    // Pivot
    let pivot = col;
    let pivVal = Math.abs(M[col * (n + 1) + col]);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(M[r * (n + 1) + col]);
      if (v > pivVal) { pivVal = v; pivot = r; }
    }
    if (pivot !== col) {
      // Swap rows col and pivot
      for (let c = 0; c <= n; c++) {
        const tmp = M[col * (n + 1) + c];
        M[col * (n + 1) + c] = M[pivot * (n + 1) + c];
        M[pivot * (n + 1) + c] = tmp;
      }
    }
    if (Math.abs(M[col * (n + 1) + col]) < 1e-18) return null;
    // Eliminate below
    for (let r = col + 1; r < n; r++) {
      const factor = M[r * (n + 1) + col] / M[col * (n + 1) + col];
      for (let c = col; c <= n; c++) {
        M[r * (n + 1) + c] -= factor * M[col * (n + 1) + c];
      }
    }
  }
  // Back-substitute
  const x = new Float64Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let sum = M[r * (n + 1) + n];
    for (let c = r + 1; c < n; c++) sum -= M[r * (n + 1) + c] * x[c];
    x[r] = sum / M[r * (n + 1) + r];
  }
  return x;
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('  FREQUENCY-RESTRICTED Ω WOBBLE SOLVER');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Time grid: ±${T_RANGE/1000} kyr step ${T_STEP} yr (${N_T} samples → 2*${N_T} = ${2*N_T} equations)`);
console.log(`  Ansatz: 8 planets × 8 ICRF frequencies × (cos, sin) = ${NU} unknowns`);
console.log(`  Ridge regularization: ${RIDGE}`);
console.log(`  Solving ${NU}×${NU} normal-equation system...`);
console.log('');

const t0 = Date.now();
const xSol = solveLinear(MtM, Mtc, NU);
const t1 = Date.now();
if (!xSol) {
  console.log('  ✗ Linear system singular.');
  process.exit(1);
}
console.log(`  Solved in ${t1 - t0} ms`);
console.log('');

// ═══════════════════════════════════════════════════════════════
// RECONSTRUCT δΩ_i(t)
// ═══════════════════════════════════════════════════════════════

const dOmegaSeries = Object.fromEntries(ALL.map(k => [k, new Float64Array(N_T)]));
for (let k = 0; k < N_T; k++) {
  for (let i = 0; i < N; i++) {
    let dom = 0;
    for (let j = 0; j < NF; j++) {
      dom += xSol[unknownIdx(i, j, 0)] * cosFreq[k][j];
      dom += xSol[unknownIdx(i, j, 1)] * sinFreq[k][j];
    }
    dOmegaSeries[ALL[i]][k] = dom * RAD2DEG;
  }
}

// ─── Validate: max |V|/Σ|L sin i| with corrected Ω ───
let maxRel = 0, j2000Rel = 0;
for (let k = 0; k < N_T; k++) {
  let Vx = 0, Vy = 0, totLsi = 0;
  for (let n = 0; n < N; n++) {
    const key = ALL[n];
    const i = inclAt(key, TIMES[k]) * DEG2RAD;
    const Om = thetaLinearAt(key, TIMES[k]) + dOmegaSeries[key][k] * DEG2RAD;
    const Lsiv = data[key].L * Math.sin(i);
    Vx += Lsiv * Math.cos(Om);
    Vy += Lsiv * Math.sin(Om);
    totLsi += Math.abs(Lsiv);
  }
  const rel = Math.sqrt(Vx*Vx + Vy*Vy) / totLsi;
  if (rel > maxRel) maxRel = rel;
  if (k === J2000_IDX) j2000Rel = rel;
}

console.log('  ─── VALIDATION ─────────────────────────────────────────────');
console.log(`  Max |V|/Σ|L sin i| with frequency-restricted wobble: ${(maxRel * 100).toExponential(3)} %`);
console.log(`  Same at J2000:                                       ${(j2000Rel * 100).toExponential(3)} %`);
console.log(`  (Linearization error sets the floor; lower is better.)`);
console.log('');

// ─── Per-planet δΩ statistics ───
console.log('  ─── PER-PLANET δΩ STATISTICS ───────────────────────────────');
console.log('  Planet   │ peak |δΩ| (°) │ rms |δΩ| (°) │ at J2000 (°)');
console.log('  ─────────┼───────────────┼──────────────┼─────────────');
for (const key of ALL) {
  let mx = 0, sumSq = 0;
  for (let k = 0; k < N_T; k++) {
    const v = Math.abs(dOmegaSeries[key][k]);
    if (v > mx) mx = v;
    sumSq += v * v;
  }
  console.log(
    '  ' + key.padEnd(8) + ' │ ' +
    mx.toFixed(4).padStart(13) + ' │ ' +
    Math.sqrt(sumSq / N_T).toFixed(4).padStart(12) + ' │ ' +
    ((dOmegaSeries[key][J2000_IDX] >= 0 ? '+' : '') + dOmegaSeries[key][J2000_IDX].toFixed(4)).padStart(11)
  );
}
console.log('');

// ─── Compare to min-norm solver result ───
console.log('  ─── COMPARISON TO MIN-NORM SOLVER (omega-nonlinear-solver.js) ─');
console.log('  Planet   │ Min-norm peak │ Frequency-restricted peak │ Δ');
console.log('  ─────────┼───────────────┼───────────────────────────┼──────');
const minNormPeaks = {
  mercury: 0.0879, venus: 0.6191, earth: 0.3308, mars: 0.2497,
  jupiter: 11.7615, saturn: 13.4423, uranus: 4.1761, neptune: 26.5290,
};
for (const key of ALL) {
  let mx = 0;
  for (let k = 0; k < N_T; k++) {
    const v = Math.abs(dOmegaSeries[key][k]);
    if (v > mx) mx = v;
  }
  const mn = minNormPeaks[key];
  const d = mx - mn;
  console.log(
    '  ' + key.padEnd(8) + ' │ ' +
    mn.toFixed(4).padStart(13) + ' │ ' +
    mx.toFixed(4).padStart(25) + ' │ ' +
    ((d >= 0 ? '+' : '') + d.toFixed(4))
  );
}
console.log('');

// ─── Wobble-corrected JPL trends ───
console.log('  ─── WOBBLE-CORRECTED JPL TREND CHECK ───────────────────────');
console.log('  Planet   │ Trend (°/cy)  │ JPL          │ Err(″/cy) │ Dir');
console.log('  ─────────┼───────────────┼──────────────┼───────────┼─────');
function eclInclWobble(key, year) {
  const f = (year - TIMES[0]) / T_STEP;
  const k0 = Math.floor(f);
  const t = f - k0;
  if (k0 < 0 || k0 + 1 >= N_T) return null;
  const dpInterp = dOmegaSeries[key][k0] * (1 - t) + dOmegaSeries[key][k0 + 1] * t;
  const deInterp = dOmegaSeries.earth[k0] * (1 - t) + dOmegaSeries.earth[k0 + 1] * t;
  const planetI = inclAt(key, year) * DEG2RAD;
  const earthI = inclAt('earth', year) * DEG2RAD;
  const planetOm = thetaLinearAt(key, year) + dpInterp * DEG2RAD;
  const earthOm = thetaLinearAt('earth', year) + deInterp * DEG2RAD;
  const pnx = Math.sin(planetI) * Math.sin(planetOm);
  const pny = Math.sin(planetI) * Math.cos(planetOm);
  const pnz = Math.cos(planetI);
  const enx = Math.sin(earthI) * Math.sin(earthOm);
  const eny = Math.sin(earthI) * Math.cos(earthOm);
  const enz = Math.cos(earthI);
  return Math.acos(Math.max(-1, Math.min(1, pnx*enx + pny*eny + pnz*enz))) * RAD2DEG;
}
let totalErr = 0, dirCount = 0;
for (const key of PLANETS) {
  const e1900 = eclInclWobble(key, 1900);
  const e2100 = eclInclWobble(key, 2100);
  const trend = (e2100 - e1900) / 2;
  const jpl = jplTrends[key];
  const err = Math.abs(trend - jpl) * 3600;
  const dir = (trend >= 0) === (jpl >= 0);
  if (dir) dirCount++;
  totalErr += err;
  console.log(
    '  ' + key.padEnd(8) + ' │ ' +
    ((trend >= 0 ? '+' : '') + trend.toFixed(6)).padStart(13) + ' │ ' +
    ((jpl >= 0 ? '+' : '') + jpl.toFixed(5)).padStart(12) + ' │ ' +
    err.toFixed(2).padStart(8) + '  │ ' + (dir ? '✓' : '✗')
  );
}
console.log('  ─────────┴───────────────┴──────────────┴───────────┴─────');
console.log(`  Total trend error: ${totalErr.toFixed(2)}″/cy   Direction matches: ${dirCount}/7`);
console.log('');
