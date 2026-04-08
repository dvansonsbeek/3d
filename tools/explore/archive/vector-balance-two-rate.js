// ═══════════════════════════════════════════════════════════════
// VECTOR BALANCE SIMULATOR — TWO-RATE PARTITION
//
// Tests the partition discovered by the Ω-from-inclination solver
// and the three-in-group-B search:
//
//   Group A (Earth + 4): rate −H/5  (N_A = 40)
//     Earth, Mercury, Venus, Mars, Uranus
//
//   Group B (3):          rate −(8H)/70 = −38,322 yr  (N_B = 70)
//     Jupiter, Saturn, Neptune
//
// Phase angles per planet are taken from the three-in-group-B
// search at N_B=70 (the LL+dir best for each planet given its
// group's rate). All 7 planets pass JPL direction match.
//
// We measure max |V(t)| over ±200 kyr and compare to:
//   - The J2000 baseline (≈ 0.42%, intrinsic to data)
//   - The single-rate model max drift (5.45% peak)
//
// If the two-rate partition reduces the time-domain drift
// substantially, the partition is dynamically self-consistent.
// Ideally max |V(t)| should approach the J2000 baseline.
//
// Usage: node tools/explore/vector-balance-two-rate.js
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;

const T_RANGE = 200000;
const T_STEP  = 800;

// ─── Two-rate partition ───
const N_A = 40;
const N_B = 70;
const PERIOD_A = -(8 * H) / N_A;   // = −H/5
const PERIOD_B = -(8 * H) / N_B;   // = −38,322 yr
const RATE_A = 360 / PERIOD_A;
const RATE_B = 360 / PERIOD_B;

const GROUP_A_PLANETS = ['mercury','venus','mars','uranus'];
const GROUP_B_PLANETS = ['jupiter','saturn','neptune'];

// ─── Config #1 + best phase angles from three-in-group-B search ───
// (These satisfy LL bounds and JPL direction match for all 7 fitted planets.)
const config = {
  mercury: { d: 21, antiPhase: false, phase: 108.0, group: 'A' },
  venus:   { d: 34, antiPhase: false, phase:  41.5, group: 'A' },
  mars:    { d:  5, antiPhase: false, phase: 122.5, group: 'A' },
  uranus:  { d: 21, antiPhase: false, phase: 260.5, group: 'A' },
  jupiter: { d:  5, antiPhase: false, phase: 104.5, group: 'B' },
  saturn:  { d:  3, antiPhase: true,  phase: 182.0, group: 'B' },
  neptune: { d: 34, antiPhase: false, phase: 136.0, group: 'B' },
};

const PLANETS = ['mercury','venus','mars','jupiter','saturn','uranus','neptune'];
const ALL = ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];

// ─── Build per-planet data ───
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
    const cosJ2000 = Math.cos((p.longitudePerihelion - cfg.phase) * DEG2RAD);
    const mean = p.invPlaneInclinationJ2000 - antiSign * amp * cosJ2000;
    d[key] = {
      L: C.massFraction[key] * Math.sqrt(a * (1 - e * e)),
      periLongJ2000: p.longitudePerihelion,
      omegaJ2000: p.ascendingNodeInvPlane,
      icrfRate: 360 / icrfPeriod,
      mean, amp, antiSign, phase: cfg.phase,
      group: cfg.group,
      rate: cfg.group === 'A' ? RATE_A : RATE_B,
    };
  }
  d.earth = {
    L: C.massFraction.earth * Math.sqrt(1.0 * (1 - C.eccJ2000.earth ** 2)),
    omegaJ2000: C.ASTRO_REFERENCE.earthAscendingNodeInvPlane,
    earthMean: C.earthInvPlaneInclinationMean,
    earthAmp:  C.earthInvPlaneInclinationAmplitude,
    earthPhaseAngle: C.ASTRO_REFERENCE.earthInclinationPhaseAngle,
    periLongJ2000: C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000,
    icrfRate: 360 / (H / 3),
    isEarth: true,
    rate: RATE_A,
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

function omegaAt(key, year) {
  const pl = data[key];
  return pl.omegaJ2000 + pl.rate * (year - 2000);
}

// ═══════════════════════════════════════════════════════════════
// SIMULATION
// ═══════════════════════════════════════════════════════════════

const TIMES = [];
for (let y = 2000 - T_RANGE; y <= 2000 + T_RANGE; y += T_STEP) TIMES.push(y);

let maxRel = 0, maxYear = 0;
let minRel = Infinity, minYear = 0;
let j2000Rel = 0;
const samples = [];

for (const year of TIMES) {
  let Vx = 0, Vy = 0, totalLsi = 0;
  for (const key of ALL) {
    const i = inclAt(key, year) * DEG2RAD;
    const Om = omegaAt(key, year) * DEG2RAD;
    const Lsi = data[key].L * Math.sin(i);
    Vx += Lsi * Math.cos(Om);
    Vy += Lsi * Math.sin(Om);
    totalLsi += Math.abs(Lsi);
  }
  const Vmag = Math.sqrt(Vx * Vx + Vy * Vy);
  const rel = Vmag / totalLsi;
  samples.push({ year, rel });
  if (rel > maxRel) { maxRel = rel; maxYear = year; }
  if (rel < minRel) { minRel = rel; minYear = year; }
  if (year === 2000) j2000Rel = rel;
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('  VECTOR BALANCE — TWO-RATE PARTITION SIMULATION');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Group A (rate −H/5 = ${PERIOD_A.toFixed(0)} yr):`);
console.log(`    Earth + ${GROUP_A_PLANETS.join(', ')}`);
console.log(`  Group B (rate −(8H)/70 = ${PERIOD_B.toFixed(0)} yr):`);
console.log(`    ${GROUP_B_PLANETS.join(', ')}`);
console.log(`  Time range: ±${T_RANGE/1000} kyr, step ${T_STEP} yr (${TIMES.length} samples)`);
console.log('');

console.log('  ─── Vector residual time evolution ─────────────────────────');
console.log(`    J2000:  ${(j2000Rel * 100).toFixed(4)} %`);
console.log(`    min:    ${(minRel * 100).toFixed(4)} %  at year ${minYear.toLocaleString()}`);
console.log(`    max:    ${(maxRel * 100).toFixed(4)} %  at year ${maxYear.toLocaleString()}`);
console.log('');

console.log('  Timeline (sampled every ~33 kyr):');
console.log('    Year      │ |V| %     │ bar (each ▮ = 0.1%)');
console.log('    ──────────┼───────────┼─────────────────────────────────────────────');
for (let i = 0; i < samples.length; i += Math.floor(samples.length / 12)) {
  const s = samples[i];
  const pct = s.rel * 100;
  const bar = '▮'.repeat(Math.min(70, Math.round(pct * 10)));
  console.log(
    '    ' + s.year.toString().padStart(8) + '  │ ' +
    pct.toFixed(4).padStart(8) + '  │ ' + bar
  );
}
console.log('');

// ─── Comparison to prior runs ───
console.log('  ─── COMPARISON ─────────────────────────────────────────────');
console.log('    Model variant                    │ J2000 │ max |V| over ±200 kyr');
console.log('    ─────────────────────────────────┼───────┼─────────────────────');
console.log('    J2000 baseline (intrinsic)       │ 0.42% │     —');
console.log('    Current model phases, single rate│ 0.42% │     8.16%');
console.log('    Phase B optimum, single rate     │ 0.42% │     5.77%');
console.log('    Vector-optimized single rate     │ 0.42% │     5.45%');
console.log(`    Two-rate partition (THIS)        │ ${(j2000Rel*100).toFixed(2)}% │     ${(maxRel*100).toFixed(2)}%`);
console.log('');

const drift = maxRel - j2000Rel;
const driftSinglePct = 5.45 - 0.42;
const reduction = (1 - drift / driftSinglePct / 0.01) * 100;
console.log(`    Drift (max − J2000):  ${(drift * 100).toFixed(4)}%`);
console.log(`    Single-rate drift:    ~5.03%`);
if (drift * 100 < 1) {
  console.log('    → Two-rate partition essentially eliminates the drift.');
  console.log('      The partition is dynamically self-consistent: Group A and');
  console.log('      Group B each rotate rigidly internally, and the two groups\'');
  console.log('      vector contributions stay balanced as they precess at');
  console.log('      different rates.');
} else if (drift * 100 < 2) {
  console.log('    → Two-rate partition substantially reduces drift but does');
  console.log('      not fully eliminate it. Some residual mode coupling remains.');
} else {
  console.log('    → Two-rate partition only modestly improves drift.');
  console.log('      The partition may need refinement, or the inclination');
  console.log('      oscillations themselves require Ω wobble compensation.');
}
console.log('');

// ─── Per-group residuals (interesting diagnostic) ───
console.log('  ─── PER-GROUP VECTOR RESIDUALS (J2000) ─────────────────────');
let VxA = 0, VyA = 0, VxB = 0, VyB = 0, sumA = 0, sumB = 0;
for (const key of ALL) {
  const i = inclAt(key, 2000) * DEG2RAD;
  const Om = omegaAt(key, 2000) * DEG2RAD;
  const Lsi = data[key].L * Math.sin(i);
  if (key === 'earth' || GROUP_A_PLANETS.includes(key)) {
    VxA += Lsi * Math.cos(Om); VyA += Lsi * Math.sin(Om); sumA += Math.abs(Lsi);
  } else {
    VxB += Lsi * Math.cos(Om); VyB += Lsi * Math.sin(Om); sumB += Math.abs(Lsi);
  }
}
console.log(`    Group A (5 planets + Earth): |V_A| = ${Math.sqrt(VxA*VxA+VyA*VyA).toExponential(3)}, |V_A|/Σ|L sin i| = ${(Math.sqrt(VxA*VxA+VyA*VyA)/sumA*100).toFixed(4)} %`);
console.log(`    Group B (3 planets):         |V_B| = ${Math.sqrt(VxB*VxB+VyB*VyB).toExponential(3)}, |V_B|/Σ|L sin i| = ${(Math.sqrt(VxB*VxB+VyB*VyB)/sumB*100).toFixed(4)} %`);
console.log(`    Total Σ V = V_A + V_B`);
console.log('');
console.log('    Interpretation: each group is internally self-balanced if its');
console.log('    own |V_g|/Σ|L sin i| ≈ 0. If both groups are internally balanced,');
console.log('    they can rotate at independent rates without breaking total balance.');
console.log('');
