// ═══════════════════════════════════════════════════════════════
// SINGLE SHARED Ω-RATE SEARCH — Phase B
//
// With Phase A confirmed (J2000 vector residual = 0.42%), we now
// test the rigid-rotation hypothesis directly: all 8 planets'
// ascending nodes regress at one shared rate −(8H)/N. Their
// relative Ω geometry stays frozen forever, so vector balance is
// preserved continuously by construction.
//
// What changes from the multi-N model:
//   - Earth's Ω rate is now also fitted (currently locked to N=40 = -H/5).
//   - cos(Ω_p − Ω_e) is CONSTANT in time → the ecliptic-inclination
//     trend depends ONLY on the time-varying inclinations i_p(t)
//     and i_e(t), driven by their respective ICRF perihelion rates.
//   - Phase angle becomes the sole lever per planet.
//
// What stays the same:
//   - All J2000 (Ω₀, i₀) values from data/planets.json
//   - All ICRF perihelion periods and longitudes
//   - Fibonacci amplitudes (from preset's d-values)
//   - Earth's inclination oscillation at H/3 period
//
// For each candidate shared N ∈ [N_MIN, N_MAX]:
//   For each fitted planet:
//     Sweep phase angle 0..360° step 0.5°
//     Find best LL+dir feasible phase, minimize |trend − JPL|
//   Tally: how many planets are LL+dir feasible
//   Sum the per-planet errors
// Report ranked.
//
// CONFIG: defaults to Config #1 (Mercury 21, Venus 34, Mars 5,
// Jupiter 5, Saturn 3 anti, Uranus 21, Neptune 34).
//
// Usage: node tools/explore/single-rate-search.js [--n-min 1] [--n-max 120]
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const PHASE_STEP = 0.5;

const argv = process.argv.slice(2);
const N_MIN = (() => { const i = argv.indexOf('--n-min'); return i >= 0 ? parseInt(argv[i+1], 10) : 1; })();
const N_MAX = (() => { const i = argv.indexOf('--n-max'); return i >= 0 ? parseInt(argv[i+1], 10) : 120; })();

// ─── Config #1 (d, antiPhase) ───
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

// ─── Per-planet inputs ───
const genPrecRate = 1 / (H / 13);
const planetData = {};
for (const key of PLANETS) {
  const p = C.planets[key];
  const eclP = p.perihelionEclipticYears;
  const icrfPeriod = 1 / (1 / eclP - genPrecRate);
  planetData[key] = {
    sqrtM: Math.sqrt(C.massFraction[key]),
    periLongJ2000: p.longitudePerihelion,
    omegaJ2000: p.ascendingNodeInvPlane,
    inclJ2000: p.invPlaneInclinationJ2000,
    icrfRate: 360 / icrfPeriod,
  };
}

// ─── Earth (locked inclination model; only Ω rate varies with N_shared) ───
const earthMean = C.earthInvPlaneInclinationMean;
const earthAmp  = C.earthInvPlaneInclinationAmplitude;
const earthPhaseAngle = C.ASTRO_REFERENCE.earthInclinationPhaseAngle;
const earthPeriLongJ2000 = C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000;
const earthOmegaJ2000 = C.ASTRO_REFERENCE.earthAscendingNodeInvPlane;
const earthIcrfRate = 360 / (H / 3);

function getEarthInclination(year) {
  const peri = earthPeriLongJ2000 + earthIcrfRate * (year - 2000);
  return earthMean + earthAmp * Math.cos((peri - earthPhaseAngle) * DEG2RAD);
}
// Earth's Ω rate now depends on shared N
function getEarthOmega(year, ascNodePeriod) {
  return earthOmegaJ2000 + (360 / ascNodePeriod) * (year - 2000);
}

// ─── Ecliptic inclination via plane-normal dot product ───
// All 8 planets share ascNodePeriod (Earth too).
function calcEclipticIncl(pl, mean, amp, phaseAngle, antiSign, ascNodePeriod, year) {
  const peri = pl.periLongJ2000 + pl.icrfRate * (year - 2000);
  const planetI = (mean + antiSign * amp * Math.cos((peri - phaseAngle) * DEG2RAD)) * DEG2RAD;
  const planetOmega = (pl.omegaJ2000 + (360 / ascNodePeriod) * (year - 2000)) * DEG2RAD;
  const earthI = getEarthInclination(year) * DEG2RAD;
  const earthOmega = getEarthOmega(year, ascNodePeriod) * DEG2RAD;
  const pnx = Math.sin(planetI) * Math.sin(planetOmega);
  const pny = Math.sin(planetI) * Math.cos(planetOmega);
  const pnz = Math.cos(planetI);
  const enx = Math.sin(earthI) * Math.sin(earthOmega);
  const eny = Math.sin(earthI) * Math.cos(earthOmega);
  const enz = Math.cos(earthI);
  return Math.acos(Math.max(-1, Math.min(1, pnx*enx + pny*eny + pnz*enz))) * RAD2DEG;
}

// ─── For (planet, shared N), find best LL+dir-feasible phase ───
function bestPhaseForPlanet(key, ascNodePeriod) {
  const pl = planetData[key];
  const ll = llBounds[key];
  const jpl = jplTrends[key];
  const cfg = config[key];
  const amp = PSI / (cfg.d * pl.sqrtM);
  const antiSign = cfg.antiPhase ? -1 : 1;

  let best = null;
  let llOnly = null;
  for (let phase = 0; phase < 360; phase += PHASE_STEP) {
    const cosJ2000 = Math.cos((pl.periLongJ2000 - phase) * DEG2RAD);
    const mean = pl.inclJ2000 - antiSign * amp * cosJ2000;
    const rangeMin = mean - amp;
    const rangeMax = mean + amp;
    if (rangeMin < ll.min - 0.01 || rangeMax > ll.max + 0.01) continue;

    const ecl1900 = calcEclipticIncl(pl, mean, amp, phase, antiSign, ascNodePeriod, 1900);
    const ecl2100 = calcEclipticIncl(pl, mean, amp, phase, antiSign, ascNodePeriod, 2100);
    const trend = (ecl2100 - ecl1900) / 2;
    const errAsec = Math.abs(trend - jpl) * 3600;
    const cand = { phase, mean, trend, errAsec };
    if (!llOnly || errAsec < llOnly.errAsec) llOnly = cand;
    if ((trend >= 0) === (jpl >= 0)) {
      if (!best || errAsec < best.errAsec) best = cand;
    }
  }
  return { llDir: best, llOnly };
}

// ═══════════════════════════════════════════════════════════════
// SWEEP SHARED N
// ═══════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  SINGLE SHARED Ω-RATE SEARCH — Phase B');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Hypothesis: all 8 planets share one Ω regression rate −(8H)/N`);
console.log(`  Sweep: N ∈ [${N_MIN}, ${N_MAX}]`);
console.log(`  Phase step: ${PHASE_STEP}°`);
console.log(`  Config: #1 (Mercury 21, Venus 34, Mars 5, Jupiter 5, Saturn 3 anti, Uranus 21, Neptune 34)`);
console.log(`  Earth's current rate is N=40 (−H/5 = −67,063 yr).`);
console.log('');

const results = [];
for (let N = N_MIN; N <= N_MAX; N++) {
  const ascNodePeriod = -(8 * H) / N;
  let llDirCount = 0, llOnlyCount = 0;
  let totalErrLLDir = 0, totalErrLLOnly = 0;
  const perPlanet = {};
  for (const key of PLANETS) {
    const r = bestPhaseForPlanet(key, ascNodePeriod);
    perPlanet[key] = r;
    if (r.llDir)  { llDirCount++;  totalErrLLDir  += r.llDir.errAsec; }
    if (r.llOnly) { llOnlyCount++; totalErrLLOnly += r.llOnly.errAsec; }
  }
  results.push({ N, ascNodePeriod, llDirCount, llOnlyCount, totalErrLLDir, totalErrLLOnly, perPlanet });
}

// ═══════════════════════════════════════════════════════════════
// REPORT
// ═══════════════════════════════════════════════════════════════

// Per-N summary
console.log('  N    │ Period (yr) │ LL+dir │ LL only │ TotErr LL+dir │ TotErr LL only │ note');
console.log('  ─────┼─────────────┼────────┼─────────┼───────────────┼────────────────┼─────');
for (const r of results) {
  const allDir = r.llDirCount === 7;
  const allLL  = r.llOnlyCount === 7;
  const noteParts = [];
  if (r.N === 40) noteParts.push("← Earth's current rate");
  if (allDir) noteParts.push('★ ALL 7 LL+dir');
  else if (r.llDirCount >= 6) noteParts.push(`(${r.llDirCount}/7)`);
  console.log(
    '  ' + r.N.toString().padStart(4) + ' │ ' +
    r.ascNodePeriod.toFixed(0).padStart(11) + ' │  ' +
    (r.llDirCount + '/7').padStart(5) + ' │  ' +
    (r.llOnlyCount + '/7').padStart(6) + ' │ ' +
    (allDir  ? r.totalErrLLDir.toFixed(2)  : '—').padStart(13) + ' │ ' +
    (allLL   ? r.totalErrLLOnly.toFixed(2) : '—').padStart(14) + ' │ ' +
    noteParts.join(' ')
  );
}
console.log('');

// All-feasible solutions
const allFeasible = results.filter(r => r.llDirCount === 7).sort((a, b) => a.totalErrLLDir - b.totalErrLLDir);
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  ALL-PLANETS FEASIBLE SOLUTIONS (${allFeasible.length} N values)`);
console.log('═══════════════════════════════════════════════════════════════');
if (allFeasible.length === 0) {
  console.log('');
  console.log('  ✗ No shared N gives all 7 fitted planets LL+dir feasibility.');
  console.log('');
  // Find best partial
  const bestPartial = [...results].sort((a, b) => (b.llDirCount - a.llDirCount) || (a.totalErrLLDir - b.totalErrLLDir))[0];
  console.log(`  Best partial: N=${bestPartial.N} (${bestPartial.llDirCount}/7 LL+dir feasible)`);
  console.log('');
} else {
  console.log('');
  for (const r of allFeasible.slice(0, 10)) {
    console.log(`  ─── N=${r.N}  period=${r.ascNodePeriod.toFixed(0)} yr  total trend err=${r.totalErrLLDir.toFixed(2)}″/cy ───`);
    console.log('    Planet   │ Phase    │ Mean     │ Trend (°/cy)  │ JPL          │ Err(″/cy)');
    console.log('    ─────────┼──────────┼──────────┼───────────────┼──────────────┼──────────');
    for (const key of PLANETS) {
      const c = r.perPlanet[key].llDir;
      const jpl = jplTrends[key];
      console.log(
        '    ' + key.padEnd(8) + ' │ ' +
        (c.phase.toFixed(1) + '°').padStart(8) + ' │ ' +
        (c.mean.toFixed(4) + '°').padStart(8) + ' │ ' +
        ((c.trend >= 0 ? '+' : '') + c.trend.toFixed(6)).padStart(13) + ' │ ' +
        ((jpl >= 0 ? '+' : '') + jpl.toFixed(5)).padStart(12) + ' │ ' +
        c.errAsec.toFixed(2).padStart(8)
      );
    }
    console.log('');
  }
}
