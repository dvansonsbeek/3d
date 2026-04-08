// ═══════════════════════════════════════════════════════════════
// {JUPITER, SATURN, NEPTUNE} GROUP-B SEARCH
//
// The Ω-from-inclination solver showed that the per-planet δΩ
// compensation needed to maintain continuous vector balance is
// dominated, for EVERY planet, by the Jupiter (H/8) and Saturn
// (H/5) ICRF frequencies. The only three planets that needed
// large δΩ amplitudes (> 1°) were Jupiter, Saturn, and Neptune
// — they form a coherent dynamical group.
//
// This search tests the partition implied by that finding:
//
//   Group A (5 + Earth): Earth + Mercury + Venus + Mars + Uranus
//     → share Earth's rate −H/5  (N_A = 40)
//
//   Group B (3): Jupiter + Saturn + Neptune
//     → share their own rate −(8H)/N_B, swept over a wide range
//
// For each candidate N_B (positive AND negative — prograde
// allowed since the model has no theoretical objection), the
// search computes per-planet phase angles via continuous sweep,
// finds best LL+dir-feasible phase per planet, and reports any
// N_B for which all 7 fitted planets are simultaneously feasible.
//
// Config: Config #1 (d, antiPhase) values.
//
// Usage: node tools/explore/three-in-group-b-search.js [--n-max 120]
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const PHASE_STEP = 0.5;

const argv = process.argv.slice(2);
const N_MAX = (() => { const i = argv.indexOf('--n-max'); return i >= 0 ? parseInt(argv[i+1], 10) : 120; })();

const N_A = 40;
const PERIOD_A = -(8 * H) / N_A;     // = −H/5

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

const GROUP_A = ['mercury','venus','mars','uranus'];        // + Earth (handled separately)
const GROUP_B = ['jupiter','saturn','neptune'];

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

const genPrecRate = 1 / (H / 13);
const planetData = {};
for (const key of [...GROUP_A, ...GROUP_B]) {
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

// Earth (locked, in Group A)
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
function getEarthOmega(year) {
  return earthOmegaJ2000 + (360 / PERIOD_A) * (year - 2000);
}

function calcEclipticIncl(pl, mean, amp, phaseAngle, antiSign, ascNodePeriod, year) {
  const peri = pl.periLongJ2000 + pl.icrfRate * (year - 2000);
  const planetI = (mean + antiSign * amp * Math.cos((peri - phaseAngle) * DEG2RAD)) * DEG2RAD;
  const planetOmega = (pl.omegaJ2000 + (360 / ascNodePeriod) * (year - 2000)) * DEG2RAD;
  const earthI = getEarthInclination(year) * DEG2RAD;
  const earthOmega = getEarthOmega(year) * DEG2RAD;
  const pnx = Math.sin(planetI) * Math.sin(planetOmega);
  const pny = Math.sin(planetI) * Math.cos(planetOmega);
  const pnz = Math.cos(planetI);
  const enx = Math.sin(earthI) * Math.sin(earthOmega);
  const eny = Math.sin(earthI) * Math.cos(earthOmega);
  const enz = Math.cos(earthI);
  return Math.acos(Math.max(-1, Math.min(1, pnx*enx + pny*eny + pnz*enz))) * RAD2DEG;
}

function findBestPhase(key, ascNodePeriod) {
  const pl = planetData[key];
  const ll = llBounds[key];
  const jpl = jplTrends[key];
  const cfg = config[key];
  const amp = PSI / (cfg.d * pl.sqrtM);
  const antiSign = cfg.antiPhase ? -1 : 1;

  let llDir = null;
  for (let phase = 0; phase < 360; phase += PHASE_STEP) {
    const cosJ2000 = Math.cos((pl.periLongJ2000 - phase) * DEG2RAD);
    const mean = pl.inclJ2000 - antiSign * amp * cosJ2000;
    if (mean - amp < ll.min - 0.01 || mean + amp > ll.max + 0.01) continue;
    const ecl1900 = calcEclipticIncl(pl, mean, amp, phase, antiSign, ascNodePeriod, 1900);
    const ecl2100 = calcEclipticIncl(pl, mean, amp, phase, antiSign, ascNodePeriod, 2100);
    const trend = (ecl2100 - ecl1900) / 2;
    if ((trend >= 0) !== (jpl >= 0)) continue;
    const errAsec = Math.abs(trend - jpl) * 3600;
    if (!llDir || errAsec < llDir.errAsec) llDir = { phase, mean, trend, errAsec };
  }
  return llDir;
}

// ═══════════════════════════════════════════════════════════════
// GROUP A (rate-independent of N_B)
// ═══════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  {JUPITER, SATURN, NEPTUNE} GROUP-B SEARCH');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Group A (Earth + 4): Mercury, Venus, Mars, Uranus  → rate −H/5 (N=${N_A})`);
console.log(`  Group B (3):         Jupiter, Saturn, Neptune       → rate −(8H)/N_B (sweep)`);
console.log(`  N_B sweep: ±[1..${N_MAX}]   (negative = prograde)`);
console.log(`  Phase step: ${PHASE_STEP}°`);
console.log(`  Config #1 (d, antiPhase)`);
console.log('');

const groupAResults = {};
let groupATotalErr = 0;
let groupAFeasible = true;
for (const key of GROUP_A) {
  const r = findBestPhase(key, PERIOD_A);
  groupAResults[key] = r;
  if (!r) groupAFeasible = false;
  else groupATotalErr += r.errAsec;
}

console.log('  Group A under Config #1 (5 planets, rate-independent of N_B):');
console.log('  Planet   │ d  │ Phase    │ Mean     │ Trend (°/cy)  │ JPL          │ Err(″/cy)');
console.log('  ─────────┼────┼──────────┼──────────┼───────────────┼──────────────┼──────────');
for (const key of GROUP_A) {
  const c = groupAResults[key];
  if (!c) { console.log('  ' + key.padEnd(8) + ' │  ✗ no LL+dir feasible phase'); continue; }
  const cfg = config[key];
  const jpl = jplTrends[key];
  console.log(
    '  ' + key.padEnd(8) + ' │ ' +
    cfg.d.toString().padStart(2) + ' │ ' +
    (c.phase.toFixed(1) + '°').padStart(8) + ' │ ' +
    (c.mean.toFixed(4) + '°').padStart(8) + ' │ ' +
    ((c.trend >= 0 ? '+' : '') + c.trend.toFixed(6)).padStart(13) + ' │ ' +
    ((jpl >= 0 ? '+' : '') + jpl.toFixed(5)).padStart(12) + ' │ ' +
    c.errAsec.toFixed(2).padStart(8)
  );
}
console.log('');
console.log(`  Group A total error: ${groupATotalErr.toFixed(2)}″/cy  (${groupAFeasible ? 'all 4 feasible' : 'NOT all feasible'})`);
console.log('');

// ═══════════════════════════════════════════════════════════════
// SWEEP N_B for Jupiter, Saturn, Neptune
// ═══════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  Sweeping N_B for Jupiter + Saturn + Neptune');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

const sweepResults = [];
const N_VALUES = [];
for (let n = 1; n <= N_MAX; n++) N_VALUES.push(-n);
for (let n = 1; n <= N_MAX; n++) N_VALUES.push(n);

for (const N_B of N_VALUES) {
  if (N_B === N_A) continue;
  const periodB = -(8 * H) / N_B;
  const jup = findBestPhase('jupiter', periodB);
  const sat = findBestPhase('saturn',  periodB);
  const nep = findBestPhase('neptune', periodB);
  const all3 = jup && sat && nep;
  sweepResults.push({
    N_B, periodB, jup, sat, nep, all3,
    sumErr: (jup ? jup.errAsec : Infinity) + (sat ? sat.errAsec : Infinity) + (nep ? nep.errAsec : Infinity),
  });
}

const feasible = sweepResults.filter(r => r.all3);
feasible.sort((a, b) => a.sumErr - b.sumErr);

console.log(`  Total N_B values tested: ${sweepResults.length}`);
console.log(`  N_B values where Jupiter, Saturn, AND Neptune are all LL+dir feasible: ${feasible.length}`);
console.log('');

if (feasible.length === 0) {
  console.log('  ✗ No N_B satisfies all three group-B planets simultaneously.');
  console.log('');
  // Per-planet feasibility
  for (const key of ['jupiter','saturn','neptune']) {
    const lst = sweepResults.filter(r => r[key === 'jupiter' ? 'jup' : key === 'saturn' ? 'sat' : 'nep']);
    console.log(`  ${key.padEnd(8)} feasible at ${lst.length} N_B values: ${lst.length > 0 ? lst.slice(0, 30).map(r => r.N_B).join(', ') + (lst.length > 30 ? ', ...' : '') : 'NONE'}`);
  }
} else {
  const TOP = Math.min(20, feasible.length);
  console.log(`  TOP ${TOP} feasible N_B values (sorted by group-B sum err):`);
  console.log('');
  console.log('  Rank │ N_B  │ Period (yr) │ Jup err │ Sat err │ Nep err │ Sum err │ Total + GroupA');
  console.log('  ─────┼──────┼─────────────┼─────────┼─────────┼─────────┼─────────┼────────────────');
  for (let i = 0; i < TOP; i++) {
    const r = feasible[i];
    const total = r.sumErr + groupATotalErr;
    console.log(
      '  ' + (i+1).toString().padStart(4) + ' │ ' +
      r.N_B.toString().padStart(4) + ' │ ' +
      r.periodB.toFixed(0).padStart(11) + ' │ ' +
      r.jup.errAsec.toFixed(2).padStart(7) + ' │ ' +
      r.sat.errAsec.toFixed(2).padStart(7) + ' │ ' +
      r.nep.errAsec.toFixed(2).padStart(7) + ' │ ' +
      r.sumErr.toFixed(2).padStart(7) + ' │ ' +
      total.toFixed(2).padStart(14)
    );
  }
  console.log('');

  // Detail of best
  const best = feasible[0];
  console.log(`─── BEST N_B = ${best.N_B} (period = ${best.periodB.toFixed(0)} yr) ──────────────`);
  console.log('  Planet   │ d  │ Group  │ Phase    │ Mean     │ Trend (°/cy)  │ JPL          │ Err(″/cy)');
  console.log('  ─────────┼────┼────────┼──────────┼──────────┼───────────────┼──────────────┼──────────');
  for (const key of [...GROUP_A, ...GROUP_B]) {
    const inB = GROUP_B.includes(key);
    const c = inB
      ? best[key === 'jupiter' ? 'jup' : key === 'saturn' ? 'sat' : 'nep']
      : groupAResults[key];
    const cfg = config[key];
    const jpl = jplTrends[key];
    console.log(
      '  ' + key.padEnd(8) + ' │ ' +
      cfg.d.toString().padStart(2) + ' │ ' +
      (inB ? '   B  ' : '   A  ') + ' │ ' +
      (c.phase.toFixed(1) + '°').padStart(8) + ' │ ' +
      (c.mean.toFixed(4) + '°').padStart(8) + ' │ ' +
      ((c.trend >= 0 ? '+' : '') + c.trend.toFixed(6)).padStart(13) + ' │ ' +
      ((jpl >= 0 ? '+' : '') + jpl.toFixed(5)).padStart(12) + ' │ ' +
      c.errAsec.toFixed(2).padStart(8)
    );
  }
  console.log('');
  console.log(`  Total trend-rate error: ${(best.sumErr + groupATotalErr).toFixed(2)}″/cy across all 7 fitted planets`);
}
console.log('');
