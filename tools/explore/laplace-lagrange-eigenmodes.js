// ═══════════════════════════════════════════════════════════════════════════
// LAPLACE-LAGRANGE EIGENMODE COMPUTATION FROM FIRST PRINCIPLES
// ═══════════════════════════════════════════════════════════════════════════
//
// Computes the secular perturbation B-matrix for the inclination-node system
// directly from planetary masses and semi-major axes. Then:
//   1. Find eigenvalues (→ eigenfrequencies sᵢ)
//   2. Find eigenvectors (→ relative amplitudes per planet per mode)
//   3. Fit to J2000 observations (→ absolute amplitudes and phases)
//   4. Verify vector balance in eigenmode space
//   5. Compare eigenfrequencies with Fibonacci periods
//
// Theory: Murray & Dermott (1999) "Solar System Dynamics" §7.5
//
// Usage: node tools/explore/laplace-lagrange-eigenmodes.js
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const SUPER_PERIOD = 8 * H;
const balancedYear = C.balancedYear;
const PLANET_KEYS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const N = 8; // number of planets

// ═══════════════════════════════════════════════════════════════════════════
// PLANETARY DATA
// ═══════════════════════════════════════════════════════════════════════════

const planets = PLANET_KEYS.map(key => {
  const mass = C.massFraction[key]; // m/M_sun
  const sma = key === 'earth' ? 1.0 : C.derived[key].orbitDistance; // AU
  const ecc = C.eccJ2000[key];
  const inclJ2000 = key === 'earth'
    ? C.ASTRO_REFERENCE.earthInclinationJ2000_deg
    : C.planets[key].invPlaneInclinationJ2000;
  const omegaJ2000 = key === 'earth'
    ? C.ASTRO_REFERENCE.earthAscendingNodeInvPlane
    : C.planets[key].ascendingNodeInvPlane;
  // Mean motion in rad/yr: n = 2π / P, where P in years = a^(3/2) (Kepler's 3rd)
  const period = Math.pow(sma, 1.5); // years (solar masses = 1)
  const n = 2 * Math.PI / period;
  const L = mass * Math.sqrt(sma * (1 - ecc * ecc)); // angular momentum proxy

  return { key, mass, sma, ecc, n, period, L, inclJ2000, omegaJ2000 };
});

// ═══════════════════════════════════════════════════════════════════════════
// LAPLACE COEFFICIENT b_{3/2}^{(1)}(α)
// ═══════════════════════════════════════════════════════════════════════════

function laplaceCoeff(alpha) {
  // b_{3/2}^{(1)}(α) = (2/π) ∫₀^π cos(θ) / (1 - 2α cos(θ) + α²)^(3/2) dθ
  // Simpson's rule with 10000 intervals
  const M = 10000;
  const h = Math.PI / M;
  let sum = 0;
  for (let i = 0; i <= M; i++) {
    const theta = h * i;
    const denom = Math.pow(1 - 2 * alpha * Math.cos(theta) + alpha * alpha, 1.5);
    const f = Math.cos(theta) / denom;
    const w = (i === 0 || i === M) ? 1 : (i % 2 === 0) ? 2 : 4;
    sum += w * f;
  }
  return (2 / Math.PI) * sum * h / 3;
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD THE B-MATRIX
// ═══════════════════════════════════════════════════════════════════════════

function buildBMatrix() {
  const B = Array.from({ length: N }, () => Array(N).fill(0));

  for (let j = 0; j < N; j++) {
    for (let k = 0; k < N; k++) {
      if (j === k) continue;
      const alpha = Math.min(planets[j].sma, planets[k].sma) /
                    Math.max(planets[j].sma, planets[k].sma);
      const b = laplaceCoeff(alpha);
      // Off-diagonal: B_jk = (n_j / 4) × (m_k) × α × b_{3/2}^{(1)}(α)
      // (m_k is already m/M_sun, and we're using M_sun = 1)
      B[j][k] = (planets[j].n / 4) * planets[k].mass * alpha * b;
    }
    // Diagonal: B_jj = -Σ_{k≠j} B_jk
    B[j][j] = 0;
    for (let k = 0; k < N; k++) {
      if (k !== j) B[j][j] -= B[j][k];
    }
  }
  return B;
}

// ═══════════════════════════════════════════════════════════════════════════
// EIGENVALUE/EIGENVECTOR SOLVER (QR Algorithm for real matrix)
// ═══════════════════════════════════════════════════════════════════════════

// Simple QR decomposition using Gram-Schmidt
function qrDecompose(A) {
  const n = A.length;
  const Q = Array.from({ length: n }, () => Array(n).fill(0));
  const R = Array.from({ length: n }, () => Array(n).fill(0));

  for (let j = 0; j < n; j++) {
    // Start with column j of A
    const v = A.map(row => row[j]);

    // Subtract projections onto previous Q columns
    for (let i = 0; i < j; i++) {
      let dot = 0;
      for (let k = 0; k < n; k++) dot += Q[k][i] * v[k];
      R[i][j] = dot;
      for (let k = 0; k < n; k++) v[k] -= dot * Q[k][i];
    }

    // Normalize
    let norm = 0;
    for (let k = 0; k < n; k++) norm += v[k] * v[k];
    norm = Math.sqrt(norm);
    R[j][j] = norm;
    if (norm > 1e-15) {
      for (let k = 0; k < n; k++) Q[k][j] = v[k] / norm;
    }
  }
  return { Q, R };
}

function matMul(A, B) {
  const n = A.length;
  const C = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      for (let k = 0; k < n; k++)
        C[i][j] += A[i][k] * B[k][j];
  return C;
}

function qrAlgorithm(A, maxIter = 500) {
  const n = A.length;
  let Ak = A.map(row => [...row]);
  let eigvecAccum = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => i === j ? 1 : 0));

  for (let iter = 0; iter < maxIter; iter++) {
    const { Q, R } = qrDecompose(Ak);
    Ak = matMul(R, Q);
    eigvecAccum = matMul(eigvecAccum, Q);

    // Check convergence: off-diagonal elements should be small
    let offDiag = 0;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        if (i !== j) offDiag += Ak[i][j] * Ak[i][j];
    if (Math.sqrt(offDiag) < 1e-20) break;
  }

  // Eigenvalues are the diagonal of Ak
  const eigenvalues = Ak.map((row, i) => row[i]);
  // Eigenvectors are the columns of eigvecAccum
  const eigenvectors = [];
  for (let j = 0; j < n; j++) {
    eigenvectors.push(eigvecAccum.map(row => row[j]));
  }

  return { eigenvalues, eigenvectors };
}

// ═══════════════════════════════════════════════════════════════════════════
// SOLVE FOR AMPLITUDES AND PHASES FROM J2000 CONDITIONS
// ═══════════════════════════════════════════════════════════════════════════

function fitToJ2000(eigenvalues, eigenvectors) {
  // J2000 initial conditions in the invariable plane frame
  const p0 = []; // sin(I) × sin(Ω)
  const q0 = []; // sin(I) × cos(Ω)

  for (const pl of planets) {
    const I_rad = pl.inclJ2000 * DEG2RAD;
    const O_rad = pl.omegaJ2000 * DEG2RAD;
    p0.push(Math.sin(I_rad) * Math.sin(O_rad));
    q0.push(Math.sin(I_rad) * Math.cos(O_rad));
  }

  // For each eigenmode i (excluding the zero eigenvalue):
  // p_j(t) = Σᵢ Aᵢ × eᵢⱼ × sin(sᵢt + γᵢ)
  // q_j(t) = Σᵢ Aᵢ × eᵢⱼ × cos(sᵢt + γᵢ)
  //
  // At t=0:
  // p_j(0) = Σᵢ Aᵢ × eᵢⱼ × sin(γᵢ) = Σᵢ Sᵢ × eᵢⱼ
  // q_j(0) = Σᵢ Aᵢ × eᵢⱼ × cos(γᵢ) = Σᵢ Cᵢ × eᵢⱼ
  //
  // where Sᵢ = Aᵢ sin(γᵢ), Cᵢ = Aᵢ cos(γᵢ)
  //
  // This is a linear system: E × S = p0, E × C = q0
  // where E is the eigenvector matrix (columns = eigenvectors)

  // Build eigenvector matrix E (columns = eigenvectors)
  const E = Array.from({ length: N }, (_, j) =>
    Array.from({ length: N }, (_, i) => eigenvectors[i][j])
  );

  // Solve E × S = p0 and E × C = q0
  // Using simple least squares (since E should be invertible for non-degenerate case)
  const S = solveLinear(E, p0);
  const Cv = solveLinear(E, q0);

  // Extract amplitudes and phases
  const amplitudes = [];
  const phases = [];
  for (let i = 0; i < N; i++) {
    const A = Math.sqrt(S[i] * S[i] + Cv[i] * Cv[i]);
    const gamma = Math.atan2(S[i], Cv[i]) * RAD2DEG;
    amplitudes.push(A);
    phases.push(((gamma % 360) + 360) % 360);
  }

  return { amplitudes, phases, S, C: Cv };
}

// Simple Gaussian elimination
function solveLinear(A, b) {
  const n = A.length;
  // Augmented matrix
  const M = A.map((row, i) => [...row, b[i]]);

  // Forward elimination with partial pivoting
  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxVal = 0, maxRow = col;
    for (let row = col; row < n; row++) {
      if (Math.abs(M[row][col]) > maxVal) {
        maxVal = Math.abs(M[row][col]);
        maxRow = row;
      }
    }
    // Swap rows
    [M[col], M[maxRow]] = [M[maxRow], M[col]];

    // Eliminate below
    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / M[col][col];
      for (let j = col; j <= n; j++) M[row][j] -= factor * M[col][j];
    }
  }

  // Back substitution
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n];
    for (let j = i + 1; j < n; j++) x[i] -= M[i][j] * x[j];
    x[i] /= M[i][i];
  }
  return x;
}

// ═══════════════════════════════════════════════════════════════════════════
// VECTOR BALANCE COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════

function computeMultiModeState(eigenvalues, eigenvectors, amplitudes, phases, year) {
  const t = year - 2000;
  const result = [];

  for (let j = 0; j < N; j++) {
    let p = 0, q = 0;
    for (let i = 0; i < N; i++) {
      const freq = eigenvalues[i]; // rad/yr
      const angle = freq * t + phases[i] * DEG2RAD;
      p += amplitudes[i] * eigenvectors[i][j] * Math.sin(angle);
      q += amplitudes[i] * eigenvectors[i][j] * Math.cos(angle);
    }
    const sinI = Math.sqrt(p * p + q * q);
    const I = Math.asin(Math.min(1, sinI)) * RAD2DEG;
    const Omega = Math.atan2(p, q) * RAD2DEG;
    result.push({ p, q, I, Omega: ((Omega % 360) + 360) % 360 });
  }
  return result;
}

function vectorBalance(states) {
  let sumX = 0, sumY = 0, totalMag = 0;
  for (let j = 0; j < N; j++) {
    const Lj = planets[j].L;
    const x = Lj * states[j].p;
    const y = Lj * states[j].q;
    sumX += x;
    sumY += y;
    totalMag += Math.sqrt(x * x + y * y);
  }
  const residual = Math.sqrt(sumX * sumX + sumY * sumY);
  return totalMag > 0 ? (1 - residual / totalMag) * 100 : 100;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║     LAPLACE-LAGRANGE EIGENMODE COMPUTATION FROM FIRST PRINCIPLES        ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝');
console.log('');

// Step 1: Build B-matrix
console.log('Step 1: Building B-matrix from planetary masses and semi-major axes...');
const B = buildBMatrix();

console.log('');
console.log('B-matrix (×10⁶, rad/yr):');
console.log('         ' + PLANET_KEYS.map(k => k.substring(0,4).padStart(8)).join(''));
for (let j = 0; j < N; j++) {
  const row = B[j].map(v => (v * 1e6).toFixed(2).padStart(8)).join('');
  console.log(PLANET_KEYS[j].substring(0,4).padStart(4) + '    ' + row);
}

// Step 2: Find eigenvalues and eigenvectors
console.log('');
console.log('Step 2: Computing eigenvalues and eigenvectors (QR algorithm)...');

const { eigenvalues, eigenvectors } = qrAlgorithm(B);

// Sort by eigenvalue (most negative first)
const sorted = eigenvalues.map((v, i) => ({ val: v, idx: i }))
  .sort((a, b) => a.val - b.val);

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('EIGENFREQUENCIES: COMPUTED vs KNOWN (Laskar 1990)');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const knownS = [-26.350, -18.851, -17.635, -7.060, -5.610, -2.993, -0.692, 0];
const knownLabels = ['s₆', 's₃', 's₄', 's₂', 's₁', 's₇', 's₈', 's₅'];

console.log('Rank │ Computed (″/yr) │ Known (″/yr)  │ Label │ Δ (″/yr)  │ Period (yr)   │ ≈ 8H/N');
console.log('─────┼─────────────────┼───────────────┼───────┼───────────┼───────────────┼────────');

for (let i = 0; i < N; i++) {
  const ev = sorted[i].val;
  const evArcsec = ev * RAD2DEG * 3600; // convert rad/yr to arcsec/yr
  const known = knownS[i];
  const delta = evArcsec - known;
  const period = Math.abs(evArcsec) > 0.001 ? Math.abs(360 * 3600 / evArcsec) : Infinity;
  const cyclesIn8H = period < Infinity ? SUPER_PERIOD / period : 0;
  const nearestN = Math.round(cyclesIn8H);

  console.log(
    (i + 1).toString().padStart(4) + ' │ ' +
    evArcsec.toFixed(3).padStart(15) + ' │ ' +
    known.toFixed(3).padStart(13) + ' │ ' +
    knownLabels[i].padStart(5) + ' │ ' +
    (delta >= 0 ? '+' : '') + delta.toFixed(3).padStart(8) + ' │ ' +
    (period < 1e8 ? Math.round(period).toLocaleString() : '∞').padStart(13) + ' │ ' +
    (nearestN > 0 ? `8H/${nearestN}` : '-')
  );
}

// Step 3: Show eigenvectors (relative amplitudes per planet)
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('EIGENVECTORS (relative amplitudes per planet, normalized)');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

console.log('Mode     │' + PLANET_KEYS.map(k => k.substring(0,4).padStart(9)).join('') + ' │ Dominant');
console.log('─────────┼' + '─────────'.repeat(8) + '─┼──────────');

for (let i = 0; i < N; i++) {
  const idx = sorted[i].idx;
  const ev = eigenvectors[idx];

  // Normalize by maximum absolute value
  const maxAbs = Math.max(...ev.map(Math.abs));
  const norm = ev.map(v => v / maxAbs);

  // Find dominant planet
  let maxPlanet = 0;
  for (let j = 1; j < N; j++) {
    if (Math.abs(norm[j]) > Math.abs(norm[maxPlanet])) maxPlanet = j;
  }

  const label = i < knownLabels.length ? knownLabels[i] : '?';
  console.log(
    (label + ' ').padEnd(8) + ' │' +
    norm.map(v => (v >= 0 ? '+' : '') + v.toFixed(4)).map(s => s.padStart(9)).join('') +
    ' │ ' + PLANET_KEYS[maxPlanet]
  );
}

// Step 4: Fit to J2000
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('FIT TO J2000: Amplitudes and Phases');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

// Reorder eigenvectors according to sorted eigenvalues
const sortedEigenvectors = sorted.map(s => eigenvectors[s.idx]);
const sortedEigenvalues = sorted.map(s => s.val);

const { amplitudes, phases } = fitToJ2000(sortedEigenvalues, sortedEigenvectors);

console.log('Mode │ Eigenfreq (″/yr) │ Amplitude (″) │ Phase (°)  │ Known phase (°)');
console.log('─────┼──────────────────┼───────────────┼────────────┼────────────────');

const knownPhases = [127.3, 255.6, 296.9, 315.6, 348.1, 315.6, 202.8, 107.6]; // s6,s3,s4,s2,s1,s7,s8,s5

for (let i = 0; i < N; i++) {
  const evArcsec = sortedEigenvalues[i] * RAD2DEG * 3600;
  const ampArcsec = amplitudes[i] * RAD2DEG * 3600;
  console.log(
    knownLabels[i].padStart(4) + ' │ ' +
    evArcsec.toFixed(3).padStart(16) + ' │ ' +
    ampArcsec.toFixed(1).padStart(13) + ' │ ' +
    phases[i].toFixed(1).padStart(10) + ' │ ' +
    (knownPhases[i] !== undefined ? knownPhases[i].toFixed(1) : '?').padStart(14)
  );
}

// Step 5: Verify J2000 reconstruction
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('J2000 RECONSTRUCTION VERIFICATION');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const statesJ2000 = computeMultiModeState(sortedEigenvalues, sortedEigenvectors, amplitudes, phases, 2000);

console.log('Planet     │ Reconstructed I │ Observed I   │ Δ (″)    │ Recon Ω    │ Obs Ω     │ ΔΩ (°)');
console.log('───────────┼─────────────────┼──────────────┼──────────┼────────────┼───────────┼────────');

for (let j = 0; j < N; j++) {
  const recon = statesJ2000[j];
  const obs = planets[j];
  const deltaI = (recon.I - obs.inclJ2000) * 3600;
  const deltaO = ((recon.Omega - obs.omegaJ2000 + 180) % 360 + 360) % 360 - 180;

  console.log(
    obs.key.charAt(0).toUpperCase() + obs.key.slice(1).padEnd(9) + ' │ ' +
    (recon.I.toFixed(4) + '°').padStart(15) + ' │ ' +
    (obs.inclJ2000.toFixed(4) + '°').padStart(12) + ' │ ' +
    deltaI.toFixed(1).padStart(8) + ' │ ' +
    (recon.Omega.toFixed(1) + '°').padStart(10) + ' │ ' +
    (obs.omegaJ2000.toFixed(1) + '°').padStart(9) + ' │ ' +
    deltaO.toFixed(1).padStart(6)
  );
}

// Step 6: Per-eigenmode angular momentum balance
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('PER-EIGENMODE ANGULAR MOMENTUM BALANCE (signed eigenvectors)');
console.log('Σⱼ Lⱼ × eᵢⱼ must = 0 for each mode (angular momentum conservation)');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

console.log('Mode │ Σ Lⱼ×eᵢⱼ       │ Σ |Lⱼ×eᵢⱼ|    │ Balance %    │ Cancellation');
console.log('─────┼─────────────────┼────────────────┼──────────────┼─────────────');

for (let i = 0; i < N; i++) {
  const idx = sorted[i].idx;
  const ev = eigenvectors[idx];
  let sum = 0, absSum = 0;
  for (let j = 0; j < N; j++) {
    const contrib = planets[j].L * ev[j];
    sum += contrib;
    absSum += Math.abs(contrib);
  }
  const balance = absSum > 0 ? (1 - Math.abs(sum) / absSum) * 100 : 0;
  const cancel = balance > 99 ? '★ PERFECT' : balance > 90 ? '✓ Good' : balance > 50 ? '~ Partial' : '✗ Poor';

  console.log(
    knownLabels[i].padStart(4) + ' │ ' +
    sum.toExponential(4).padStart(15) + ' │ ' +
    absSum.toExponential(4).padStart(14) + ' │ ' +
    balance.toFixed(4).padStart(12) + ' │ ' +
    cancel
  );
}

// Step 7: Vector balance over time
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('VECTOR BALANCE OVER TIME (multi-mode from B-matrix eigenvectors)');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const testYears = [
  { y: balancedYear, label: 'Balanced year' },
  { y: -100000, label: '-100,000' },
  { y: 0, label: '0 AD' },
  { y: 2000, label: 'J2000' },
  { y: 10000, label: '10,000 AD' },
  { y: 50000, label: '50,000 AD' },
  { y: balancedYear + H, label: 'BY + H' },
];

console.log('Year            │ Vec balance │ Notes');
console.log('────────────────┼─────────────┼──────────────────');

for (const { y, label } of testYears) {
  const states = computeMultiModeState(sortedEigenvalues, sortedEigenvectors, amplitudes, phases, y);
  const bal = vectorBalance(states);
  console.log(label.padEnd(16) + ' │ ' + bal.toFixed(4).padStart(11) + ' │');
}

// Full 8H scan
let minBal = 100, maxBal = 0, sumBal = 0;
const nSamples = 500;
for (let i = 0; i <= nSamples; i++) {
  const year = balancedYear + i * SUPER_PERIOD / nSamples;
  const states = computeMultiModeState(sortedEigenvalues, sortedEigenvectors, amplitudes, phases, year);
  const bal = vectorBalance(states);
  sumBal += bal;
  if (bal < minBal) minBal = bal;
  if (bal > maxBal) maxBal = bal;
}

console.log('');
console.log(`Over 8H: min=${minBal.toFixed(4)}%, max=${maxBal.toFixed(4)}%, mean=${(sumBal/(nSamples+1)).toFixed(4)}%, var=${(maxBal-minBal).toFixed(4)} pp`);

// Step 8: Fibonacci connections
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('FIBONACCI CONNECTIONS');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

for (let i = 0; i < N; i++) {
  const evArcsec = sortedEigenvalues[i] * RAD2DEG * 3600;
  if (Math.abs(evArcsec) < 0.001) continue;
  const period = Math.abs(360 * 3600 / evArcsec);
  const cyclesIn8H = SUPER_PERIOD / period;
  const nearestN = Math.round(cyclesIn8H);
  const fibPeriod = SUPER_PERIOD / nearestN;
  const match = (1 - Math.abs(period - fibPeriod) / fibPeriod) * 100;

  console.log(`  ${knownLabels[i]}: period ${Math.round(period).toLocaleString()} yr ≈ 8H/${nearestN} = ${Math.round(fibPeriod).toLocaleString()} yr (${match.toFixed(1)}% match)`);
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('CONCLUSION');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('The B-matrix eigenvectors provide the SIGNED amplitudes that create');
console.log('per-eigenmode angular momentum cancellation. If the balance is near');
console.log('100% for each mode, the multi-mode model achieves perfect vector');
console.log('balance at all times — confirming the theoretical prediction.');
console.log('');
