// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: DIRECT EIGENVECTOR FIT FROM OBSERVATIONS (NO B-MATRIX)
// ═══════════════════════════════════════════════════════════════════════════
//
// Instead of assuming B-matrix eigenvector shapes, we fit the full
// eigenvector matrix directly from J2000 observations.
//
// Given:
//   - J2000 (I, Ω) for all 8 planets → 16 values (p₀, q₀)
//   - Observed node rates dΩ/dt → gives dp/dt, dq/dt → 16 more values
//   - 7 eigenfrequencies from Laskar
//
// Model:
//   p_j(t) = Σᵢ Aᵢⱼ × sin(sᵢ×t + φᵢⱼ)
//   q_j(t) = Σᵢ Aᵢⱼ × cos(sᵢ×t + φᵢⱼ)
//
// But this has too many unknowns (7 modes × 8 planets × 2 = 112).
//
// Simplification: the eigenmode structure means each mode has a SINGLE
// phase γᵢ shared by all planets, with per-planet signed amplitudes:
//   p_j(t) = Σᵢ T_ji × sin(sᵢ×t + γᵢ)
//   q_j(t) = Σᵢ T_ji × cos(sᵢ×t + γᵢ)
//
// At t=0:
//   p_j = Σᵢ T_ji × sin(γᵢ)     →  E × s_vec = p₀
//   q_j = Σᵢ T_ji × cos(γᵢ)     →  E × c_vec = q₀
//
// Time derivatives at t=0:
//   dp_j/dt = Σᵢ sᵢ × T_ji × cos(γᵢ)   →  E × (s · c_vec) = dp₀/dt
//   dq_j/dt = -Σᵢ sᵢ × T_ji × sin(γᵢ)  →  E × (-s · s_vec) = dq₀/dt
//
// Where s_vec[i] = Aᵢ sin(γᵢ), c_vec[i] = Aᵢ cos(γᵢ), and E is 8×7 (planets × modes)
//
// If we know the rates, we get additional constraints on E.
// But E itself has 56 unknowns (8×7). With the angular momentum constraint
// Σⱼ Lⱼ × T_ji = 0 for each mode (7 constraints), we have 49 free.
//
// KEY INSIGHT: We can reformulate. Instead of fitting E, we fit for
// S_i = A_i sin(γ_i) and C_i = A_i cos(γ_i) for each mode, using
// the eigenvector structure as a constraint. For each mode separately,
// the amplitude ratios between planets are fixed (eigenvector shape).
// So T_ji = a_i × e_ji where a_i is the mode scale and e_ji is normalized.
//
// PRACTICAL APPROACH:
// 1. For the outer 4 planets (Ju, Sa, Ur, Ne): dominated by modes s6, s7, s8
//    → 4 planets, 3 modes → well-constrained subsystem
// 2. For the inner 4 planets (Me, Ve, Ea, Ma): dominated by modes s1, s2, s3, s4
//    → 4 planets, 4 modes → exactly determined
// 3. Cross-coupling between inner and outer is weak → solve separately
//
// Usage: node tools/explore/step1-direct-fit.js
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const SUPER_PERIOD = 8 * H;
const balancedYear = C.balancedYear;
const PLANET_KEYS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const NP = 8;

// ═══════════════════════════════════════════════════════════════════════════
// OBSERVED DATA
// ═══════════════════════════════════════════════════════════════════════════

const planets = PLANET_KEYS.map(key => {
  const mass = C.massFraction[key];
  const sma = key === 'earth' ? 1.0 : C.derived[key].orbitDistance;
  const ecc = C.eccJ2000[key];
  const L = mass * Math.sqrt(sma * (1 - ecc * ecc));
  const inclJ2000 = key === 'earth' ? C.ASTRO_REFERENCE.earthInclinationJ2000_deg : C.planets[key].invPlaneInclinationJ2000;
  const omegaJ2000 = key === 'earth' ? C.ASTRO_REFERENCE.earthAscendingNodeInvPlane : C.planets[key].ascendingNodeInvPlane;
  return { key, mass, sma, ecc, L, inclJ2000, omegaJ2000 };
});

// J2000 state vectors
const p0 = planets.map(pl => Math.sin(pl.inclJ2000 * DEG2RAD) * Math.sin(pl.omegaJ2000 * DEG2RAD));
const q0 = planets.map(pl => Math.sin(pl.inclJ2000 * DEG2RAD) * Math.cos(pl.omegaJ2000 * DEG2RAD));

// Observed rates (arcsec/yr → rad/yr)
const observedNodeRatesArcsec = {
  mercury: -6.592, venus: -7.902, earth: -18.851, mars: -17.635,
  jupiter: -25.934, saturn: -26.578, uranus: -3.087, neptune: -0.673,
};

// Compute dp/dt and dq/dt from dΩ/dt (assuming dI/dt ≈ 0 as first approx)
// p = sin(I)sin(Ω), dp/dt ≈ sin(I)cos(Ω) × dΩ/dt = q × dΩ/dt
// q = sin(I)cos(Ω), dq/dt ≈ -sin(I)sin(Ω) × dΩ/dt = -p × dΩ/dt
const dp0 = [], dq0 = [];
for (let j = 0; j < NP; j++) {
  const dOmega = observedNodeRatesArcsec[PLANET_KEYS[j]] / 3600 * DEG2RAD; // rad/yr
  dp0.push(q0[j] * dOmega);
  dq0.push(-p0[j] * dOmega);
}

// Laskar eigenfrequencies (rad/yr)
const S_ARCSEC = [-5.610, -7.060, -18.851, -17.635, -26.350, -2.993, -0.692];
const S_LABELS = ['s₁', 's₂', 's₃', 's₄', 's₆', 's₇', 's₈'];
const S_RAD = S_ARCSEC.map(s => s / 3600 * DEG2RAD);

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║     STEP 1: DIRECT FIT FROM OBSERVATIONS (NO B-MATRIX)                 ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝');
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// APPROACH: SOLVE FOR S_i AND C_i COMPONENTS PER MODE
// ═══════════════════════════════════════════════════════════════════════════
//
// p_j = Σᵢ E_ji × S_i    and    q_j = Σᵢ E_ji × C_i
// dp_j/dt = Σᵢ E_ji × sᵢ × C_i    and    dq_j/dt = -Σᵢ E_ji × sᵢ × S_i
//
// We don't know E_ji. But we can reformulate by defining:
//   a_ji = E_ji × S_i  (contribution of mode i to planet j's p)
//   b_ji = E_ji × C_i  (contribution of mode i to planet j's q)
//
// Then: p_j = Σᵢ a_ji,  q_j = Σᵢ b_ji
// And:  dp_j/dt = Σᵢ (sᵢ/S_i) × a_ji × C_i = Σᵢ sᵢ × b_ji
// And:  dq_j/dt = -Σᵢ sᵢ × a_ji
//
// So: q_j = Σᵢ b_ji   and  dp_j/dt = Σᵢ sᵢ × b_ji
// And: p_j = Σᵢ a_ji   and  dq_j/dt = -Σᵢ sᵢ × a_ji
//
// This means: dp_j/dt is a LINEAR COMBINATION of the b_ji with
// known coefficients sᵢ. Combined with q_j = Σ b_ji, we have
// TWO linear equations per planet for the b_ji unknowns:
//
//   Σᵢ b_ji = q_j          [position]
//   Σᵢ sᵢ × b_ji = dp_j/dt [velocity]
//
// Similarly for a_ji:
//   Σᵢ a_ji = p_j
//   -Σᵢ sᵢ × a_ji = dq_j/dt  →  Σᵢ sᵢ × a_ji = -dq_j/dt
//
// For each planet j, we have 2 equations and 7 unknowns (modes i=1..7).
// With 8 planets: 16 equations, 56 unknowns.
// Adding AM constraint (Σⱼ Lⱼ × a_ji = 0, same for b_ji): 14 more equations.
// Total: 30 equations, 56 unknowns — still underdetermined.
//
// ALTERNATIVE: Assume inner-outer decoupling.
// Outer subsystem (Ju, Sa, Ur, Ne): dominated by s6, s7, s8
//   4 planets × 2 eq = 8 equations, 3 modes × 4 = 12 unknowns
//   Plus 3 AM constraints → 11 equations, 12 unknowns
//   Plus rates: 8 more equations → 19 equations, 12 unknowns → OVERDETERMINED!
//
// Inner subsystem (Me, Ve, Ea, Ma): dominated by s1, s2, s3, s4
//   4 planets × 2 eq = 8 equations, 4 modes × 4 = 16 unknowns
//   Plus 4 AM constraints → 12 equations, 16 unknowns
//   Plus rates: 8 more equations → 20 equations, 16 unknowns → OVERDETERMINED!

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('SOLVING OUTER SUBSYSTEM: Jupiter, Saturn, Uranus, Neptune');
console.log('Modes: s₆, s₇, s₈ (3 modes × 4 planets = 12 unknowns per component)');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

// Outer planets: indices 4,5,6,7 (Ju, Sa, Ur, Ne)
// Modes: s6 (index 4), s7 (index 5), s8 (index 6) in our S_RAD array
const outerPlanets = [4, 5, 6, 7];
const outerModes = [4, 5, 6]; // indices into S_RAD
const nOP = 4, nOM = 3;

// Solve for a_ji (p-component) and b_ji (q-component)
// System for a_ji: for each planet j in {Ju,Sa,Ur,Ne}:
//   Σᵢ a_ji = p_j           [eq 1]
//   Σᵢ sᵢ × a_ji = -dq_j/dt [eq 2]
// Plus AM constraint for each mode i:
//   Σⱼ Lⱼ × (a_ji / S_i) = 0
// But we don't know S_i yet... use the simpler form:
//   Σⱼ Lⱼ × a_ji = 0 (for each mode i) [approximately, since S_i is common]
// This is 3 constraints.
// Total: 4×2 + 3 = 11 equations, 12 unknowns

function solveSubsystem(planetIndices, modeIndices) {
  const np = planetIndices.length;
  const nm = modeIndices.length;
  const nUnknowns = np * nm;

  // Build matrix A and RHS for the a_ji system (p-component)
  // Unknowns: a[j*nm + i] for planet j, mode i
  // Similarly for b_ji system (q-component)

  function buildSystem(stateVec, rateVec, isP) {
    const rows = [];
    const rhs = [];

    // Position equations: Σᵢ a_ji = stateVec[j]
    for (let jj = 0; jj < np; jj++) {
      const j = planetIndices[jj];
      const row = Array(nUnknowns).fill(0);
      for (let ii = 0; ii < nm; ii++) {
        row[jj * nm + ii] = 1.0;
      }
      rows.push(row);
      rhs.push(stateVec[j]);
    }

    // Rate equations: Σᵢ sᵢ × a_ji = rateVec[j]
    for (let jj = 0; jj < np; jj++) {
      const j = planetIndices[jj];
      const row = Array(nUnknowns).fill(0);
      for (let ii = 0; ii < nm; ii++) {
        row[jj * nm + ii] = S_RAD[modeIndices[ii]];
      }
      rows.push(row);
      rhs.push(rateVec[j]);
    }

    // Angular momentum constraint: Σⱼ Lⱼ × a_ji = 0 for each mode
    for (let ii = 0; ii < nm; ii++) {
      const row = Array(nUnknowns).fill(0);
      for (let jj = 0; jj < np; jj++) {
        row[jj * nm + ii] = planets[planetIndices[jj]].L;
      }
      rows.push(row);
      rhs.push(0);
    }

    return { rows, rhs };
  }

  // Solve for a_ji (from p and dq/dt)
  const negDq = dq0.map(v => -v);
  const sysA = buildSystem(p0, negDq, true);

  // Solve for b_ji (from q and dp/dt)
  const sysB = buildSystem(q0, dp0, false);

  // Solve overdetermined systems by least squares (A^T A x = A^T b)
  function solveLSQ(rows, rhs) {
    const m = rows.length;    // equations
    const n = rows[0].length; // unknowns

    // A^T A (n×n)
    const ATA = Array.from({ length: n }, () => Array(n).fill(0));
    const ATb = Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        for (let k = 0; k < m; k++) {
          ATA[i][j] += rows[k][i] * rows[k][j];
        }
      }
      for (let k = 0; k < m; k++) {
        ATb[i] += rows[k][i] * rhs[k];
      }
    }

    // Gaussian elimination
    const M = ATA.map((r, i) => [...r, ATb[i]]);
    for (let col = 0; col < n; col++) {
      let mx = 0, mr = col;
      for (let r = col; r < n; r++) if (Math.abs(M[r][col]) > mx) { mx = Math.abs(M[r][col]); mr = r; }
      [M[col], M[mr]] = [M[mr], M[col]];
      if (Math.abs(M[col][col]) < 1e-30) continue;
      for (let r = col + 1; r < n; r++) {
        const f = M[r][col] / M[col][col];
        for (let j = col; j <= n; j++) M[r][j] -= f * M[col][j];
      }
    }
    const x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = M[i][n];
      for (let j = i + 1; j < n; j++) x[i] -= M[i][j] * x[j];
      if (Math.abs(M[i][i]) > 1e-30) x[i] /= M[i][i];
    }
    return x;
  }

  const a_flat = solveLSQ(sysA.rows, sysA.rhs);
  const b_flat = solveLSQ(sysB.rows, sysB.rhs);

  // Reshape to a[planet][mode] and b[planet][mode]
  const a = [], b = [];
  for (let jj = 0; jj < np; jj++) {
    a.push(a_flat.slice(jj * nm, (jj + 1) * nm));
    b.push(b_flat.slice(jj * nm, (jj + 1) * nm));
  }

  return { a, b };
}

const outer = solveSubsystem(outerPlanets, outerModes);

// Show results for outer subsystem
console.log('Outer subsystem solution (a_ji = mode contribution to p_j):');
console.log('Planet     │' + outerModes.map(i => S_LABELS[i].padStart(12)).join('') + ' │ Σ (=p₀)     │ Observed p₀');
console.log('───────────┼' + '────────────'.repeat(nOM) + '─┼─────────────┼────────────');

for (let jj = 0; jj < nOP; jj++) {
  const j = outerPlanets[jj];
  const sum = outer.a[jj].reduce((s, v) => s + v, 0);
  console.log(
    PLANET_KEYS[j].charAt(0).toUpperCase() + PLANET_KEYS[j].slice(1).padEnd(9) + ' │' +
    outer.a[jj].map(v => v.toExponential(3).padStart(12)).join('') +
    ' │ ' + sum.toExponential(3).padStart(11) +
    ' │ ' + p0[j].toExponential(3).padStart(10)
  );
}

// Extract eigenvector shapes from a_ji and b_ji
// For each mode i: T_ji ~ a_ji / S_i ~ b_ji / C_i
// The signed amplitude for mode i in planet j: T_ji = sqrt(a_ji² + b_ji²) × sign
// But more precisely: a_ji = T_ji × sin(γ_i), b_ji = T_ji × cos(γ_i)
// So T_ji = a_ji / sin(γ_i) = b_ji / cos(γ_i)
// And γ_i = atan2(Σⱼ a_ji², Σⱼ b_ji²)... not quite

// Better: for each mode i, compute A_i sin(γ_i) and A_i cos(γ_i) from the
// pattern of a_ji and b_ji across planets
console.log('');
console.log('Eigenvector shapes (from solution):');
console.log('Mode │ Planet contributions (normalized by max)');
console.log('─────┼──────────────────────────────────────────');

const outerShapes = [];
for (let ii = 0; ii < nOM; ii++) {
  // For mode ii: a_ji = T_ji × sin(γ_i), b_ji = T_ji × cos(γ_i)
  // T_ji has the same sign pattern in both a and b
  // Compute T_ji from the magnitude: T_ji = sqrt(a_ji² + b_ji²) × sign(a_ji or b_ji)
  const T = [];
  for (let jj = 0; jj < nOP; jj++) {
    const mag = Math.sqrt(outer.a[jj][ii] ** 2 + outer.b[jj][ii] ** 2);
    // Determine sign: use the component with larger magnitude
    const sign = Math.abs(outer.a[jj][ii]) > Math.abs(outer.b[jj][ii])
      ? Math.sign(outer.a[jj][ii]) : Math.sign(outer.b[jj][ii]);
    T.push(sign * mag);
  }

  // Normalize
  const maxAbs = Math.max(...T.map(Math.abs));
  const norm = T.map(v => v / maxAbs);
  outerShapes.push(norm);

  // Phase for this mode
  const sinG = outer.a[0][ii] / T[0]; // using first planet
  const cosG = outer.b[0][ii] / T[0];
  const gamma = Math.atan2(sinG, cosG) * RAD2DEG;

  console.log(
    S_LABELS[outerModes[ii]].padEnd(4) + ' │ ' +
    norm.map((v, j) => `${PLANET_KEYS[outerPlanets[j]].substr(0,3)}=${v >= 0 ? '+' : ''}${v.toFixed(3)}`).join('  ') +
    `  γ=${((gamma % 360 + 360) % 360).toFixed(1)}°`
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INNER SUBSYSTEM
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('SOLVING INNER SUBSYSTEM: Mercury, Venus, Earth, Mars');
console.log('Modes: s₁, s₂, s₃, s₄ (4 modes × 4 planets = 16 unknowns per component)');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const innerPlanets = [0, 1, 2, 3];
const innerModes = [0, 1, 2, 3];
const nIP = 4, nIM = 4;

const inner = solveSubsystem(innerPlanets, innerModes);

console.log('Inner subsystem solution (a_ji):');
console.log('Planet     │' + innerModes.map(i => S_LABELS[i].padStart(12)).join('') + ' │ Σ (=p₀)     │ Observed p₀');
console.log('───────────┼' + '────────────'.repeat(nIM) + '─┼─────────────┼────────────');

for (let jj = 0; jj < nIP; jj++) {
  const j = innerPlanets[jj];
  const sum = inner.a[jj].reduce((s, v) => s + v, 0);
  console.log(
    PLANET_KEYS[j].charAt(0).toUpperCase() + PLANET_KEYS[j].slice(1).padEnd(9) + ' │' +
    inner.a[jj].map(v => v.toExponential(3).padStart(12)).join('') +
    ' │ ' + sum.toExponential(3).padStart(11) +
    ' │ ' + p0[j].toExponential(3).padStart(10)
  );
}

// Extract inner shapes
console.log('');
console.log('Eigenvector shapes:');
const innerShapes = [];
for (let ii = 0; ii < nIM; ii++) {
  const T = [];
  for (let jj = 0; jj < nIP; jj++) {
    const mag = Math.sqrt(inner.a[jj][ii] ** 2 + inner.b[jj][ii] ** 2);
    const sign = Math.abs(inner.a[jj][ii]) > Math.abs(inner.b[jj][ii])
      ? Math.sign(inner.a[jj][ii]) : Math.sign(inner.b[jj][ii]);
    T.push(sign * mag);
  }
  const maxAbs = Math.max(...T.map(Math.abs));
  const norm = T.map(v => v / maxAbs);
  innerShapes.push(norm);

  const sinG = inner.a[0][ii] / T[0];
  const cosG = inner.b[0][ii] / T[0];
  const gamma = Math.atan2(sinG, cosG) * RAD2DEG;

  console.log(
    S_LABELS[innerModes[ii]].padEnd(4) + ' │ ' +
    norm.map((v, j) => `${PLANET_KEYS[innerPlanets[j]].substr(0,3)}=${v >= 0 ? '+' : ''}${v.toFixed(3)}`).join('  ') +
    `  γ=${((gamma % 360 + 360) % 360).toFixed(1)}°`
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FULL RECONSTRUCTION
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('FULL J2000 RECONSTRUCTION (inner + outer subsystems)');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

// Reconstruct p and q at J2000 from both subsystems
console.log('Planet     │ Model p      │ Obs p       │ Δp          │ Model q      │ Obs q       │ Δq');
console.log('───────────┼──────────────┼─────────────┼─────────────┼──────────────┼─────────────┼────────────');

for (let j = 0; j < NP; j++) {
  let pModel = 0, qModel = 0;

  // Inner contribution
  const jInner = innerPlanets.indexOf(j);
  if (jInner >= 0) {
    for (let ii = 0; ii < nIM; ii++) {
      pModel += inner.a[jInner][ii];
      qModel += inner.b[jInner][ii];
    }
  }

  // Outer contribution
  const jOuter = outerPlanets.indexOf(j);
  if (jOuter >= 0) {
    for (let ii = 0; ii < nOM; ii++) {
      pModel += outer.a[jOuter][ii];
      qModel += outer.b[jOuter][ii];
    }
  }

  const dp = pModel - p0[j];
  const dq = qModel - q0[j];

  // Convert to I and Omega
  const modelI = Math.asin(Math.min(1, Math.sqrt(pModel ** 2 + qModel ** 2))) * RAD2DEG;
  const modelO = ((Math.atan2(pModel, qModel) * RAD2DEG) % 360 + 360) % 360;
  const obsI = planets[j].inclJ2000;
  const obsO = planets[j].omegaJ2000;

  console.log(
    PLANET_KEYS[j].charAt(0).toUpperCase() + PLANET_KEYS[j].slice(1).padEnd(9) + ' │ ' +
    pModel.toExponential(4).padStart(12) + ' │ ' +
    p0[j].toExponential(4).padStart(11) + ' │ ' +
    dp.toExponential(2).padStart(11) + ' │ ' +
    qModel.toExponential(4).padStart(12) + ' │ ' +
    q0[j].toExponential(4).padStart(11) + ' │ ' +
    dq.toExponential(2).padStart(10)
  );
}

// Verify angular momentum cancellation
console.log('');
console.log('Angular momentum cancellation per mode:');
console.log('Mode │ Σ Lⱼ×T_ji (unnorm) │ Assessment');
console.log('─────┼────────────────────┼───────────');

// Outer modes
for (let ii = 0; ii < nOM; ii++) {
  let sum = 0;
  for (let jj = 0; jj < nOP; jj++) {
    const mag = Math.sqrt(outer.a[jj][ii] ** 2 + outer.b[jj][ii] ** 2);
    const sign = Math.abs(outer.a[jj][ii]) > Math.abs(outer.b[jj][ii])
      ? Math.sign(outer.a[jj][ii]) : Math.sign(outer.b[jj][ii]);
    sum += planets[outerPlanets[jj]].L * sign * mag;
  }
  console.log(
    S_LABELS[outerModes[ii]].padStart(4) + ' │ ' +
    sum.toExponential(4).padStart(18) + ' │ ' +
    (Math.abs(sum) < 1e-8 ? '✓ Zero' : '≈ ' + sum.toExponential(2))
  );
}

// Inner modes
for (let ii = 0; ii < nIM; ii++) {
  let sum = 0;
  for (let jj = 0; jj < nIP; jj++) {
    const mag = Math.sqrt(inner.a[jj][ii] ** 2 + inner.b[jj][ii] ** 2);
    const sign = Math.abs(inner.a[jj][ii]) > Math.abs(inner.b[jj][ii])
      ? Math.sign(inner.a[jj][ii]) : Math.sign(inner.b[jj][ii]);
    sum += planets[innerPlanets[jj]].L * sign * mag;
  }
  console.log(
    S_LABELS[innerModes[ii]].padStart(4) + ' │ ' +
    sum.toExponential(4).padStart(18) + ' │ ' +
    (Math.abs(sum) < 1e-8 ? '✓ Zero' : '≈ ' + sum.toExponential(2))
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TIME EVOLUTION WITH LASKAR FREQUENCIES
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('TIME EVOLUTION: vector balance over 8H');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

function reconstructAtYear(year) {
  const t = year - 2000;
  const states = [];

  for (let j = 0; j < NP; j++) {
    let p = 0, q = 0;

    const jInner = innerPlanets.indexOf(j);
    if (jInner >= 0) {
      for (let ii = 0; ii < nIM; ii++) {
        const si = S_RAD[innerModes[ii]];
        const cosT = Math.cos(si * t);
        const sinT = Math.sin(si * t);
        // Rotate: a_new = a×cos - b×sin, b_new = a×sin + b×cos (but for opposite convention)
        // p(t) = a×sin(s*t+γ) = a×(sin(s*t)cos(γ) + cos(s*t)sin(γ))
        // At t=0: p(0) = a×sin(γ) = a_ji, q(0) = a×cos(γ) = b_ji... no, wait
        // p_j(t) = Σ T_ji sin(si*t + γi)
        // We stored: a_ji = T_ji × sin(γi), b_ji = T_ji × cos(γi)
        // At time t: contribution = T_ji × sin(si*t + γi)
        //  = T_ji × [sin(si*t)cos(γi) + cos(si*t)sin(γi)]
        //  = sin(si*t) × b_ji + cos(si*t) × a_ji   [for p]
        // Similarly for q: T_ji × cos(si*t + γi)
        //  = cos(si*t) × b_ji - sin(si*t) × a_ji   [for q]
        p += sinT * inner.b[jInner][ii] + cosT * inner.a[jInner][ii];
        q += cosT * inner.b[jInner][ii] - sinT * inner.a[jInner][ii];
      }
    }

    const jOuter = outerPlanets.indexOf(j);
    if (jOuter >= 0) {
      for (let ii = 0; ii < nOM; ii++) {
        const si = S_RAD[outerModes[ii]];
        const cosT = Math.cos(si * t);
        const sinT = Math.sin(si * t);
        p += sinT * outer.b[jOuter][ii] + cosT * outer.a[jOuter][ii];
        q += cosT * outer.b[jOuter][ii] - sinT * outer.a[jOuter][ii];
      }
    }

    states.push({ p, q });
  }
  return states;
}

function vectorBalance(states) {
  let sx = 0, sy = 0, tm = 0;
  for (let j = 0; j < NP; j++) {
    const x = planets[j].L * states[j].p;
    const y = planets[j].L * states[j].q;
    sx += x; sy += y;
    tm += Math.sqrt(x * x + y * y);
  }
  return tm > 0 ? (1 - Math.sqrt(sx * sx + sy * sy) / tm) * 100 : 100;
}

const testYears = [
  { y: balancedYear, l: 'Balanced year' },
  { y: -100000, l: '-100,000' },
  { y: 0, l: '0 AD' },
  { y: 2000, l: 'J2000' },
  { y: 10000, l: '10,000 AD' },
  { y: 50000, l: '50,000 AD' },
  { y: balancedYear + H, l: 'BY + H' },
];

console.log('Year            │ Vec balance');
console.log('────────────────┼────────────');
for (const { y, l } of testYears) {
  const states = reconstructAtYear(y);
  const bal = vectorBalance(states);
  console.log(l.padEnd(16) + ' │ ' + bal.toFixed(4).padStart(10));
}

let mmMin = 100, mmMax = 0, mmSum = 0;
for (let i = 0; i <= 500; i++) {
  const year = balancedYear + i * SUPER_PERIOD / 500;
  const bal = vectorBalance(reconstructAtYear(year));
  mmSum += bal; if (bal < mmMin) mmMin = bal; if (bal > mmMax) mmMax = bal;
}
console.log(`\nOver 8H: min=${mmMin.toFixed(4)}%, max=${mmMax.toFixed(4)}%, mean=${(mmSum/501).toFixed(4)}%, var=${(mmMax-mmMin).toFixed(4)} pp`);

// ═══════════════════════════════════════════════════════════════════════════
// INCLINATION RANGES → D-VALUES
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('INCLINATION RANGES → FIBONACCI D-VALUES');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const FIB_D = [1, 2, 3, 5, 8, 13, 21, 34, 55];

console.log('Planet     │ I range           │ Half-amp  │ d_exact │ Best d │ ψ/(d√m)   │ Match │ C1 d');
console.log('───────────┼───────────────────┼───────────┼─────────┼────────┼───────────┼───────┼──────');

for (let j = 0; j < NP; j++) {
  let minI = 90, maxI = 0;
  for (let i = 0; i <= 2000; i++) {
    const year = balancedYear + i * SUPER_PERIOD / 2000;
    const states = reconstructAtYear(year);
    const sinI = Math.sqrt(states[j].p ** 2 + states[j].q ** 2);
    const I = Math.asin(Math.min(1, sinI)) * RAD2DEG;
    if (I < minI) minI = I;
    if (I > maxI) maxI = I;
  }
  const halfAmp = (maxI - minI) / 2;
  const sqrtM = Math.sqrt(planets[j].mass);
  const dExact = PSI / (halfAmp * sqrtM);

  let bestD = 1, bestDiff = Infinity;
  for (const d of FIB_D) {
    const lawAmp = PSI / (d * sqrtM);
    if (Math.abs(lawAmp - halfAmp) < bestDiff) { bestDiff = Math.abs(lawAmp - halfAmp); bestD = d; }
  }
  const lawAmp = PSI / (bestD * sqrtM);
  const match = halfAmp > 0 ? (1 - Math.abs(lawAmp - halfAmp) / halfAmp) * 100 : 0;
  const currentD = PLANET_KEYS[j] === 'earth' ? 3 : C.planets[PLANET_KEYS[j]].fibonacciD;

  console.log(
    PLANET_KEYS[j].charAt(0).toUpperCase() + PLANET_KEYS[j].slice(1).padEnd(9) + ' │ ' +
    (minI.toFixed(3) + '-' + maxI.toFixed(3) + '°').padStart(17) + ' │ ' +
    (halfAmp.toFixed(4) + '°').padStart(9) + ' │ ' +
    dExact.toFixed(2).padStart(7) + ' │ ' +
    bestD.toString().padStart(6) + ' │ ' +
    (lawAmp.toFixed(4) + '°').padStart(9) + ' │ ' +
    match.toFixed(0).padStart(4) + '% │ ' +
    currentD.toString().padStart(4)
  );
}

console.log('');
