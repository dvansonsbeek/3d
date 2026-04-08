// ═══════════════════════════════════════════════════════════════
// VECTOR BALANCE TIME-DOMAIN SIMULATOR
//
// New framing: ascending node motion is NOT a free parameter.
// Once inclinations oscillate (driven by ICRF perihelion advance),
// the Ω_i(t) values are constrained by angular momentum conservation
// to maintain vector balance Σ L_i sin(i_i(t)) (cos Ω_i, sin Ω_i) = 0.
//
// This script does NOT solve for Ω_i(t). It runs the OPPOSITE
// experiment: fix Ω_i(t) to the simplest possible model — rigid
// rotation at Earth's observed rate −H/5 — and measure how badly
// the vector residual |V(t)| drifts as inclinations oscillate.
//
// If |V(t)| stays small: rigid rotation is consistent with the
// inclination model and we can stop here.
//
// If |V(t)| drifts: rigid rotation is INSUFFICIENT — the Ω_i must
// themselves wobble to absorb the inclination variations. The
// magnitude and frequency content of the drift tells us what
// kind of additional Ω motion is required.
//
// Two phase-angle scenarios are tested side-by-side:
//   (a) Current model values from constants.js (calibrated to
//       balanced-year ICRF perihelion)
//   (b) Phase B optimum (continuous-sweep phases for the 5 planets
//       that gave LL+dir feasibility)
//
// Usage: node tools/explore/vector-balance-simulator.js
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;

// Time span: ±200 kyr in 2000-yr steps (200 samples)
const T_RANGE = 200000;
const T_STEP  = 2000;
const SHARED_PERIOD = -H / 5;   // Earth's observed Ω regression rate

const PLANETS = ['mercury','venus','mars','jupiter','saturn','uranus','neptune'];
const ALL = ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];

// Config #1
const config = {
  mercury: { d: 21, antiPhase: false },
  venus:   { d: 34, antiPhase: false },
  mars:    { d: 5,  antiPhase: false },
  jupiter: { d: 5,  antiPhase: false },
  saturn:  { d: 3,  antiPhase: true  },
  uranus:  { d: 21, antiPhase: false },
  neptune: { d: 34, antiPhase: false },
};

// Two phase-angle scenarios
const SCENARIO_CURRENT = {
  mercury:  99.52, venus: 79.82, mars: 96.95, jupiter: 291.18,
  saturn: 120.38, uranus: 21.33, neptune: 354.04,
};
const SCENARIO_PHASEB = {
  mercury: 108.0, venus: 41.5, mars: 122.5, jupiter: 104.5,
  saturn: 182.0, uranus: 260.5, neptune: 316.0,  // best LL-only for Sat/Nep
};

const genPrecRate = 1 / (H / 13);

// Build planet base data
function buildPlanetData() {
  const data = {};
  for (const key of PLANETS) {
    const p = C.planets[key];
    const eclP = p.perihelionEclipticYears;
    const icrfPeriod = 1 / (1 / eclP - genPrecRate);
    const icrfRate = 360 / icrfPeriod;       // deg/yr
    const cfg = config[key];
    const sqrtM = Math.sqrt(C.massFraction[key]);
    const amp = PSI / (cfg.d * sqrtM);
    const antiSign = cfg.antiPhase ? -1 : 1;
    const a  = C.derived[key].orbitDistance;
    const e  = C.eccJ2000[key];
    data[key] = {
      mass: C.massFraction[key],
      a, e,
      L: C.massFraction[key] * Math.sqrt(a * (1 - e * e)),
      periLongJ2000: p.longitudePerihelion,
      omegaJ2000: p.ascendingNodeInvPlane,
      inclJ2000: p.invPlaneInclinationJ2000,
      icrfRate,
      amp, antiSign, cfg,
    };
  }
  // Earth
  data.earth = {
    mass: C.massFraction.earth,
    a: 1.0, e: C.eccJ2000.earth,
    L: C.massFraction.earth * Math.sqrt(1.0 * (1 - C.eccJ2000.earth ** 2)),
    periLongJ2000: C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000,
    omegaJ2000:    C.ASTRO_REFERENCE.earthAscendingNodeInvPlane,
    inclJ2000:     C.ASTRO_REFERENCE.earthInclinationJ2000_deg,
    icrfRate: 360 / (H / 3),
    earthMean: C.earthInvPlaneInclinationMean,
    earthAmp:  C.earthInvPlaneInclinationAmplitude,
    earthPhaseAngle: C.ASTRO_REFERENCE.earthInclinationPhaseAngle,
    isEarth: true,
  };
  return data;
}

// Compute mean from J2000 constraint given a phase angle
function meanFromPhase(pl, phaseAngle) {
  const cosJ2000 = Math.cos((pl.periLongJ2000 - phaseAngle) * DEG2RAD);
  return pl.inclJ2000 - pl.antiSign * pl.amp * cosJ2000;
}

function inclinationAt(pl, mean, phaseAngle, year) {
  if (pl.isEarth) {
    const peri = pl.periLongJ2000 + pl.icrfRate * (year - 2000);
    return pl.earthMean + pl.earthAmp * Math.cos((peri - pl.earthPhaseAngle) * DEG2RAD);
  }
  const peri = pl.periLongJ2000 + pl.icrfRate * (year - 2000);
  return mean + pl.antiSign * pl.amp * Math.cos((peri - phaseAngle) * DEG2RAD);
}

// Rigid rotation: Ω_i(t) = Ω_i^0 + (360/SHARED_PERIOD) * (year - 2000)
const sharedRate = 360 / SHARED_PERIOD;  // deg/yr
function ascendingNodeAt(pl, year) {
  return pl.omegaJ2000 + sharedRate * (year - 2000);
}

// Measure |V(t)|/Σ|L sin i| over the time range for a given phase scenario
function simulate(scenario, label) {
  const data = buildPlanetData();
  // Pre-compute means
  const means = {};
  for (const key of PLANETS) means[key] = meanFromPhase(data[key], scenario[key]);

  let maxRel = 0, maxYear = 0;
  let minRel = Infinity, minYear = 0;
  const samples = [];

  for (let year = 2000 - T_RANGE; year <= 2000 + T_RANGE; year += T_STEP) {
    let Vx = 0, Vy = 0, totalLsinI = 0;
    for (const key of ALL) {
      const pl = data[key];
      const i  = inclinationAt(pl, means[key], scenario[key], year) * DEG2RAD;
      const Om = ascendingNodeAt(pl, year) * DEG2RAD;
      const Lsi = pl.L * Math.sin(i);
      Vx += Lsi * Math.cos(Om);
      Vy += Lsi * Math.sin(Om);
      totalLsinI += Math.abs(Lsi);
    }
    const Vmag = Math.sqrt(Vx * Vx + Vy * Vy);
    const rel = Vmag / totalLsinI;
    samples.push({ year, Vmag, rel });
    if (rel > maxRel) { maxRel = rel; maxYear = year; }
    if (rel < minRel) { minRel = rel; minYear = year; }
  }

  console.log(`─── ${label} ──────────────────────────────────────────────`);
  console.log(`  Phase angles (degrees):`);
  for (const key of PLANETS) console.log(`    ${key.padEnd(8)} ${scenario[key].toFixed(2)}°`);
  console.log('');
  console.log(`  |V|/Σ|L sin i| over [${(2000-T_RANGE).toLocaleString()}, ${(2000+T_RANGE).toLocaleString()}]:`);
  console.log(`    min  = ${(minRel * 100).toFixed(4)} %  at year ${minYear.toLocaleString()}`);
  console.log(`    max  = ${(maxRel * 100).toFixed(4)} %  at year ${maxYear.toLocaleString()}`);
  console.log(`    J2000= ${(samples.find(s => s.year === 2000).rel * 100).toFixed(4)} %`);
  console.log('');

  // Print a small ASCII timeline (10 samples evenly spaced)
  console.log('  Timeline (relative residual %):');
  console.log('    Year      │ |V| %     │ bar (each ▮ = 0.1%)');
  console.log('    ──────────┼───────────┼─────────────────────────────────────────────');
  for (let i = 0; i < samples.length; i += Math.floor(samples.length / 12)) {
    const s = samples[i];
    const pct = s.rel * 100;
    const bar = '▮'.repeat(Math.min(50, Math.round(pct * 10)));
    console.log(
      '    ' + s.year.toString().padStart(8) + '  │ ' +
      pct.toFixed(4).padStart(8) + '  │ ' + bar
    );
  }
  console.log('');
  return { maxRel, minRel, samples };
}

// ═══════════════════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  VECTOR BALANCE TIME-DOMAIN SIMULATOR — Config #1');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Time range: ±${(T_RANGE/1000)} kyr around J2000, step ${T_STEP} yr`);
console.log(`  Rigid rotation: all 8 planets at Earth's rate ${SHARED_PERIOD.toFixed(0)} yr (= −H/5)`);
console.log(`  Test: how much does |V(t)| drift as inclinations oscillate?`);
console.log('');

const a = simulate(SCENARIO_CURRENT, '(a) Current model (constants.js phase angles)');
const b = simulate(SCENARIO_PHASEB,  '(b) Phase B continuous-sweep optimum');

console.log('─── COMPARISON ──────────────────────────────────────────────');
console.log(`  Scenario (a) max residual: ${(a.maxRel * 100).toFixed(4)} %`);
console.log(`  Scenario (b) max residual: ${(b.maxRel * 100).toFixed(4)} %`);
console.log(`  J2000 residual (both):     0.4170 %  (independent of phase angles)`);
console.log('');
console.log('  Interpretation:');
console.log('    If max residual ≈ J2000 residual → rigid rotation is consistent.');
console.log('    If max residual >> J2000 residual → rigid rotation insufficient,');
console.log('      Ω_i(t) must wobble to absorb the drift.');
console.log('');
