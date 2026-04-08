// ═══════════════════════════════════════════════════════════════
// VECTOR BALANCE OPTIMIZER — phase-angle search
//
// The simulator showed that under rigid Ω rotation at Earth's
// rate (−H/5), the J2000 vector residual (0.42%) balloons to
// ~6–8% over ±200 kyr because inclinations oscillate independently.
//
// This tool tests whether ANY phase-angle assignment for the 7
// fitted planets can drive max|V(t)| back down to the J2000
// baseline. If yes → rigid rotation is rescued by phase choice
// and we're done. If no → rigid rotation is fundamentally
// insufficient and the model needs an Ω wobble term.
//
// Method: coordinate descent
//   - 7 free parameters (one phase angle per fitted planet)
//   - Objective: minimize max |V(t)| over [−200 kyr, +200 kyr]
//   - Sweep one planet's phase 0..360° step 0.5°, pick best,
//     iterate over planets until no further improvement.
//
// Initial point: Phase B continuous-sweep optimum (best known).
//
// After convergence, also reports for each planet at its final
// phase: LL feasibility, JPL trend direction, JPL trend rate,
// so we can see whether the vector-optimal solution is also
// JPL-compatible.
//
// Usage: node tools/explore/vector-balance-optimizer.js
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// ─── Time sampling (cheap enough at 500 samples) ───
const T_RANGE = 200000;
const T_STEP = 800;
const TIMES = [];
for (let y = 2000 - T_RANGE; y <= 2000 + T_RANGE; y += T_STEP) TIMES.push(y);
const SHARED_PERIOD = -H / 5;
const sharedRate = 360 / SHARED_PERIOD;

// ─── Config #1 ───
const config = {
  mercury: { d: 21, antiPhase: false },
  venus:   { d: 34, antiPhase: false },
  mars:    { d: 5,  antiPhase: false },
  jupiter: { d: 5,  antiPhase: false },
  saturn:  { d: 3,  antiPhase: true  },
  uranus:  { d: 21, antiPhase: false },
  neptune: { d: 34, antiPhase: false },
};

const PLANETS = ['mercury','venus','mars','jupiter','saturn','uranus','neptune'];
const ALL = ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];

const jplTrends = {
  mercury: -0.00595, venus: -0.00079, mars: -0.00813,
  jupiter: -0.00184, saturn: +0.00194, uranus: -0.00243, neptune: +0.00035,
};
const llBounds = {
  mercury: { min: 4.57,  max: 9.86  },
  venus:   { min: 0.00,  max: 3.38  },
  mars:    { min: 0.00,  max: 5.84  },
  jupiter: { min: 0.241, max: 0.489 },
  saturn:  { min: 0.797, max: 1.02  },
  uranus:  { min: 0.902, max: 1.11  },
  neptune: { min: 0.554, max: 0.800 },
};

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
    d[key] = {
      mass: C.massFraction[key],
      a, e,
      L: C.massFraction[key] * Math.sqrt(a * (1 - e * e)),
      periLongJ2000: p.longitudePerihelion,
      omegaJ2000: p.ascendingNodeInvPlane,
      inclJ2000: p.invPlaneInclinationJ2000,
      icrfRate: 360 / icrfPeriod,
      sqrtM: Math.sqrt(C.massFraction[key]),
      amp: PSI / (cfg.d * Math.sqrt(C.massFraction[key])),
      antiSign: cfg.antiPhase ? -1 : 1,
    };
  }
  d.earth = {
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
  return d;
}
const data = buildData();

function meanFromPhase(pl, phaseAngle) {
  return pl.inclJ2000 - pl.antiSign * pl.amp * Math.cos((pl.periLongJ2000 - phaseAngle) * DEG2RAD);
}

function inclAt(pl, mean, phaseAngle, year) {
  if (pl.isEarth) {
    const peri = pl.periLongJ2000 + pl.icrfRate * (year - 2000);
    return pl.earthMean + pl.earthAmp * Math.cos((peri - pl.earthPhaseAngle) * DEG2RAD);
  }
  const peri = pl.periLongJ2000 + pl.icrfRate * (year - 2000);
  return mean + pl.antiSign * pl.amp * Math.cos((peri - phaseAngle) * DEG2RAD);
}

// ─── Pre-compute Earth time series (independent of fitted phases) ───
const earthSeries = TIMES.map(y => {
  const i = inclAt(data.earth, null, null, y) * DEG2RAD;
  const Om = (data.earth.omegaJ2000 + sharedRate * (y - 2000)) * DEG2RAD;
  const Lsi = data.earth.L * Math.sin(i);
  return {
    Vx: Lsi * Math.cos(Om),
    Vy: Lsi * Math.sin(Om),
    absLsi: Math.abs(Lsi),
  };
});

// ─── Per-planet contribution time series (depends on phase) ───
function planetSeries(key, phaseAngle) {
  const pl = data[key];
  const mean = meanFromPhase(pl, phaseAngle);
  const series = [];
  for (let k = 0; k < TIMES.length; k++) {
    const y = TIMES[k];
    const i = inclAt(pl, mean, phaseAngle, y) * DEG2RAD;
    const Om = (pl.omegaJ2000 + sharedRate * (y - 2000)) * DEG2RAD;
    const Lsi = pl.L * Math.sin(i);
    series.push({
      Vx: Lsi * Math.cos(Om),
      Vy: Lsi * Math.sin(Om),
      absLsi: Math.abs(Lsi),
    });
  }
  return { series, mean };
}

// ─── Compute max |V|/Σ|L sin i| given a per-planet phase set ───
function computeMaxRel(seriesByPlanet) {
  let maxRel = 0;
  for (let k = 0; k < TIMES.length; k++) {
    let Vx = earthSeries[k].Vx, Vy = earthSeries[k].Vy, absSum = earthSeries[k].absLsi;
    for (const key of PLANETS) {
      const s = seriesByPlanet[key].series[k];
      Vx += s.Vx; Vy += s.Vy; absSum += s.absLsi;
    }
    const rel = Math.sqrt(Vx*Vx + Vy*Vy) / absSum;
    if (rel > maxRel) maxRel = rel;
  }
  return maxRel;
}

// ═══════════════════════════════════════════════════════════════
// COORDINATE DESCENT
// ═══════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  VECTOR BALANCE OPTIMIZER (coordinate descent on phase angles)');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Time range: ±${T_RANGE/1000} kyr, step ${T_STEP} yr (${TIMES.length} samples)`);
console.log(`  Rigid rotation at −H/5; objective = min max|V(t)| / Σ|L sin i|`);
console.log('');

// Initial: Phase B optimum
const phases = {
  mercury: 108.0, venus: 41.5, mars: 122.5, jupiter: 104.5,
  saturn: 182.0, uranus: 260.5, neptune: 316.0,
};
const seriesByPlanet = {};
for (const key of PLANETS) seriesByPlanet[key] = planetSeries(key, phases[key]);
let bestMaxRel = computeMaxRel(seriesByPlanet);
console.log(`  Initial (Phase B optimum) max|V| = ${(bestMaxRel * 100).toFixed(4)} %`);
console.log('');

// Coordinate descent
const STEP = 0.5;
const MAX_ITER = 25;
let improved = true;
let iter = 0;
while (improved && iter < MAX_ITER) {
  improved = false;
  iter++;
  for (const key of PLANETS) {
    let bestPhase = phases[key];
    let bestVal = bestMaxRel;
    for (let phase = 0; phase < 360; phase += STEP) {
      const trial = planetSeries(key, phase);
      const saved = seriesByPlanet[key];
      seriesByPlanet[key] = trial;
      const r = computeMaxRel(seriesByPlanet);
      if (r < bestVal) { bestVal = r; bestPhase = phase; }
      seriesByPlanet[key] = saved;
    }
    if (bestVal < bestMaxRel - 1e-8) {
      phases[key] = bestPhase;
      seriesByPlanet[key] = planetSeries(key, bestPhase);
      bestMaxRel = bestVal;
      improved = true;
    }
  }
  console.log(`  iter ${iter.toString().padStart(2)} : max|V| = ${(bestMaxRel * 100).toFixed(4)} %  ` +
    PLANETS.map(k => `${k.slice(0,2)}=${phases[k].toFixed(1)}°`).join(' '));
}
console.log('');
console.log(`  Converged after ${iter} iterations (max |V| / Σ|L sin i| = ${(bestMaxRel * 100).toFixed(4)} %)`);
console.log('');

// ═══════════════════════════════════════════════════════════════
// EVALUATE FINAL POINT — phase, mean, LL, JPL trend
// ═══════════════════════════════════════════════════════════════

// Recompute earth+planet at year ranges 1900..2100 to also get JPL trend
function calcEclipticIncl(pl, mean, phaseAngle, year) {
  const peri = pl.periLongJ2000 + pl.icrfRate * (year - 2000);
  const planetI = (mean + pl.antiSign * pl.amp * Math.cos((peri - phaseAngle) * DEG2RAD)) * DEG2RAD;
  const planetOmega = (pl.omegaJ2000 + sharedRate * (year - 2000)) * DEG2RAD;
  const eI = inclAt(data.earth, null, null, year) * DEG2RAD;
  const eOm = (data.earth.omegaJ2000 + sharedRate * (year - 2000)) * DEG2RAD;
  const pnx = Math.sin(planetI) * Math.sin(planetOmega);
  const pny = Math.sin(planetI) * Math.cos(planetOmega);
  const pnz = Math.cos(planetI);
  const enx = Math.sin(eI) * Math.sin(eOm);
  const eny = Math.sin(eI) * Math.cos(eOm);
  const enz = Math.cos(eI);
  return Math.acos(Math.max(-1, Math.min(1, pnx*enx + pny*eny + pnz*enz))) * RAD2DEG;
}

console.log('─── FINAL PHASE ANGLES — verification table ─────────────────────');
console.log('  Planet   │ Phase    │ Mean     │ Range          │ LL  │ Trend (°/cy)  │ JPL          │ Dir │ Err(″/cy)');
console.log('  ─────────┼──────────┼──────────┼────────────────┼─────┼───────────────┼──────────────┼─────┼──────────');
let totalErr = 0, llCount = 0, dirCount = 0;
for (const key of PLANETS) {
  const pl = data[key];
  const ph = phases[key];
  const mean = meanFromPhase(pl, ph);
  const rangeMin = mean - pl.amp;
  const rangeMax = mean + pl.amp;
  const ll = llBounds[key];
  const fitsLL = rangeMin >= ll.min - 0.01 && rangeMax <= ll.max + 0.01;
  const ecl1900 = calcEclipticIncl(pl, mean, ph, 1900);
  const ecl2100 = calcEclipticIncl(pl, mean, ph, 2100);
  const trend = (ecl2100 - ecl1900) / 2;
  const jpl = jplTrends[key];
  const dirMatch = (trend >= 0) === (jpl >= 0);
  const err = Math.abs(trend - jpl) * 3600;
  if (fitsLL) llCount++;
  if (dirMatch) dirCount++;
  if (fitsLL && dirMatch) totalErr += err;
  console.log(
    '  ' + key.padEnd(8) + ' │ ' +
    (ph.toFixed(1) + '°').padStart(8) + ' │ ' +
    (mean.toFixed(4) + '°').padStart(8) + ' │ ' +
    (rangeMin.toFixed(2) + '° – ' + rangeMax.toFixed(2) + '°').padStart(14) + ' │ ' +
    (fitsLL ? ' ✓ ' : ' ✗ ') + ' │ ' +
    ((trend >= 0 ? '+' : '') + trend.toFixed(6)).padStart(13) + ' │ ' +
    ((jpl >= 0 ? '+' : '') + jpl.toFixed(5)).padStart(12) + ' │ ' +
    (dirMatch ? ' ✓ ' : ' ✗ ') + ' │ ' +
    err.toFixed(2).padStart(8)
  );
}
console.log('');
console.log(`  LL feasible: ${llCount}/7   JPL direction match: ${dirCount}/7`);
console.log('');

// ─── Final residual timeline ───
console.log('  Vector residual timeline (after optimization):');
console.log('    Year      │ |V| %     │ bar (each ▮ = 0.1%)');
console.log('    ──────────┼───────────┼─────────────────────────────────────────');
for (let i = 0; i < TIMES.length; i += Math.floor(TIMES.length / 12)) {
  const y = TIMES[i];
  let Vx = earthSeries[i].Vx, Vy = earthSeries[i].Vy, absSum = earthSeries[i].absLsi;
  for (const key of PLANETS) {
    const s = seriesByPlanet[key].series[i];
    Vx += s.Vx; Vy += s.Vy; absSum += s.absLsi;
  }
  const rel = Math.sqrt(Vx*Vx + Vy*Vy) / absSum * 100;
  const bar = '▮'.repeat(Math.min(50, Math.round(rel * 10)));
  console.log('    ' + y.toString().padStart(8) + '  │ ' + rel.toFixed(4).padStart(8) + '  │ ' + bar);
}
console.log('');
console.log('  Interpretation:');
console.log(`    J2000 baseline (independent of phase): 0.4170 %`);
console.log(`    Optimized max |V|:                      ${(bestMaxRel * 100).toFixed(4)} %`);
const ratio = bestMaxRel / 0.00417;
if (ratio < 1.5) {
  console.log('    → Optimization SUCCEEDED. Phase angles can rescue rigid rotation.');
} else if (ratio < 5) {
  console.log('    → Significant improvement, but rigid rotation still drifts.');
} else {
  console.log('    → Rigid rotation is fundamentally insufficient. Phase angles can\'t');
  console.log('      bring max|V| close to the J2000 baseline. Step (B) is needed.');
}
console.log('');
