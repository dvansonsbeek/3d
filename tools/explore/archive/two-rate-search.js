// ═══════════════════════════════════════════════════════════════
// TWO-GROUP SHARED-RATE SEARCH — Phase C
//
// The single shared-rate hypothesis (Phase B) was falsified for
// Saturn and Neptune: 0/743 presets give them JPL direction match.
// All other 5 fitted planets work fine when their Ω regresses in
// lockstep with Earth at N=40 (−H/5).
//
// Minimal extension: split the 8 planets into TWO rate groups.
//
//   Group A (5 planets + Earth): share Earth's rate −(8H)/40 = −H/5
//     Mercury, Venus, Mars, Jupiter, Uranus + Earth
//
//   Group B (2 planets): share a SECOND rate −(8H)/N_B
//     Saturn, Neptune
//
// Within Group A, vector balance is rigid as before. Within Group B,
// Saturn and Neptune rotate together, also rigid relative to each
// other. Across groups, the cos(Ωp_B − Ωe) term is no longer
// constant — it now precesses linearly at rate (rate_B − rate_A),
// re-introducing a single free rate parameter N_B that DOES affect
// the trend formula for the 2 group-B planets.
//
// Two parameters total: the partition (fixed: {Sat,Nep} in group B)
// and N_B. Plus the per-planet phase angles as before.
//
// The script:
//   1. Locks Mercury, Venus, Mars, Jupiter, Uranus to Earth's rate.
//   2. Sweeps N_B over a wide range (positive AND negative — i.e.
//      both retrograde and prograde, since this is exactly the
//      "could Saturn run prograde?" question we identified earlier).
//   3. For each N_B, computes LL+dir feasibility for Saturn & Neptune
//      under Config #1's (d, antiPhase) values.
//   4. Reports N_B values where BOTH Saturn and Neptune are feasible.
//
// If any N_B works → the two-group hypothesis is viable; we then
// extend across the 743 presets. If none works → Saturn and Neptune
// need either separate rates (3-group) or the (d, antiPhase) space
// for them needs to be searched too.
//
// Usage: node tools/explore/two-rate-search.js [--n-max 120]
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const PHASE_STEP = 0.5;

const argv = process.argv.slice(2);
const N_MAX = (() => { const i = argv.indexOf('--n-max'); return i >= 0 ? parseInt(argv[i+1], 10) : 120; })();

const N_A = 40;                          // Earth + Group A
const PERIOD_A = -(8 * H) / N_A;         // = −H/5

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

const GROUP_A = ['mercury','venus','mars','jupiter','uranus'];
const GROUP_B = ['saturn','neptune'];

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

// ─── Earth (locked) ───
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
  // Earth is in Group A
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

  let llDir = null, llOnly = null;
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
      if (!llDir || errAsec < llDir.errAsec) llDir = cand;
    }
  }
  return { llDir, llOnly };
}

// ═══════════════════════════════════════════════════════════════
// COMPUTE GROUP A ONCE (rate-independent of N_B)
// ═══════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  TWO-GROUP SHARED-RATE SEARCH — Phase C');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Group A (rate −H/5, N=${N_A}): Earth + Mercury + Venus + Mars + Jupiter + Uranus`);
console.log(`  Group B (rate −(8H)/N_B, free N_B): Saturn + Neptune`);
console.log(`  N_B sweep: ±[1..${N_MAX}]  (negative = prograde)`);
console.log(`  Config #1 (d, antiPhase) for all 7 fitted planets`);
console.log(`  Phase step: ${PHASE_STEP}°`);
console.log('');

const groupAResults = {};
let groupATotalErr = 0;
let groupAFeasible = true;
for (const key of GROUP_A) {
  const r = findBestPhase(key, PERIOD_A);
  groupAResults[key] = r;
  if (!r.llDir) groupAFeasible = false;
  else groupATotalErr += r.llDir.errAsec;
}

console.log('  Group A under Config #1 (rate-independent of N_B):');
console.log('  Planet   │ d  │ Group   │ Phase    │ Mean     │ Trend (°/cy)  │ JPL          │ Err(″/cy)');
console.log('  ─────────┼────┼─────────┼──────────┼──────────┼───────────────┼──────────────┼──────────');
for (const key of GROUP_A) {
  const c = groupAResults[key].llDir;
  if (!c) { console.log('  ' + key.padEnd(8) + ' │  ✗ no LL+dir feasible phase'); continue; }
  const cfg = config[key];
  const jpl = jplTrends[key];
  console.log(
    '  ' + key.padEnd(8) + ' │ ' +
    cfg.d.toString().padStart(2) + ' │ ' +
    (cfg.antiPhase ? 'anti  ' : 'in    ') + '  │ ' +
    (c.phase.toFixed(1) + '°').padStart(8) + ' │ ' +
    (c.mean.toFixed(4) + '°').padStart(8) + ' │ ' +
    ((c.trend >= 0 ? '+' : '') + c.trend.toFixed(6)).padStart(13) + ' │ ' +
    ((jpl >= 0 ? '+' : '') + jpl.toFixed(5)).padStart(12) + ' │ ' +
    c.errAsec.toFixed(2).padStart(8)
  );
}
console.log('');
console.log(`  Group A total error: ${groupATotalErr.toFixed(2)}″/cy  (${groupAFeasible ? 'all 5 feasible' : 'NOT all feasible'})`);
console.log('');

// ═══════════════════════════════════════════════════════════════
// SWEEP N_B
// ═══════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  Sweeping N_B (Group B = Saturn + Neptune)');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

const sweepResults = [];
const N_VALUES = [];
for (let n = 1; n <= N_MAX; n++) N_VALUES.push(-n);  // prograde
for (let n = 1; n <= N_MAX; n++) N_VALUES.push(n);   // retrograde

for (const N_B of N_VALUES) {
  if (N_B === N_A) continue;  // would collapse to single-rate
  const periodB = -(8 * H) / N_B;
  const sat = findBestPhase('saturn',  periodB);
  const nep = findBestPhase('neptune', periodB);
  const both = sat.llDir && nep.llDir;
  sweepResults.push({
    N_B, periodB,
    sat, nep, both,
    sumErr: (sat.llDir ? sat.llDir.errAsec : Infinity) + (nep.llDir ? nep.llDir.errAsec : Infinity),
  });
}

const feasible = sweepResults.filter(r => r.both);
feasible.sort((a, b) => a.sumErr - b.sumErr);

console.log(`  Total N_B values tested: ${sweepResults.length}`);
console.log(`  N_B values where BOTH Saturn AND Neptune are LL+dir feasible: ${feasible.length}`);
console.log('');

if (feasible.length === 0) {
  console.log('  ✗ No N_B value (prograde or retrograde) makes both Saturn and Neptune feasible.');
  console.log('');
  // Show single-planet bests
  const satBest = sweepResults.filter(r => r.sat.llDir).sort((a, b) => a.sat.llDir.errAsec - b.sat.llDir.errAsec).slice(0, 5);
  const nepBest = sweepResults.filter(r => r.nep.llDir).sort((a, b) => a.nep.llDir.errAsec - b.nep.llDir.errAsec).slice(0, 5);
  console.log('  Saturn LL+dir feasible at N_B values: ' + (sweepResults.filter(r => r.sat.llDir).map(r => r.N_B).join(', ') || 'NONE'));
  console.log('  Neptune LL+dir feasible at N_B values: ' + (sweepResults.filter(r => r.nep.llDir).map(r => r.N_B).join(', ') || 'NONE'));
  console.log('');
  if (satBest.length > 0) {
    console.log('  Saturn top 5 N_B (by err):');
    for (const r of satBest) console.log(`    N_B=${r.N_B.toString().padStart(4)} (period ${r.periodB.toFixed(0)} yr) → ${r.sat.llDir.errAsec.toFixed(2)}″/cy`);
  }
  if (nepBest.length > 0) {
    console.log('  Neptune top 5 N_B (by err):');
    for (const r of nepBest) console.log(`    N_B=${r.N_B.toString().padStart(4)} (period ${r.periodB.toFixed(0)} yr) → ${r.nep.llDir.errAsec.toFixed(2)}″/cy`);
  }
} else {
  const TOP = Math.min(20, feasible.length);
  console.log(`  TOP ${TOP} feasible N_B values (sorted by Saturn+Neptune sum err):`);
  console.log('');
  console.log('  Rank │ N_B  │ Period (yr) │ Sat phase │ Sat err │ Nep phase │ Nep err │ Sum + GroupA');
  console.log('  ─────┼──────┼─────────────┼───────────┼─────────┼───────────┼─────────┼──────────────');
  for (let i = 0; i < TOP; i++) {
    const r = feasible[i];
    const total = r.sumErr + groupATotalErr;
    console.log(
      '  ' + (i+1).toString().padStart(4) + ' │ ' +
      r.N_B.toString().padStart(4) + ' │ ' +
      r.periodB.toFixed(0).padStart(11) + ' │  ' +
      (r.sat.llDir.phase.toFixed(1) + '°').padStart(8) + ' │ ' +
      r.sat.llDir.errAsec.toFixed(2).padStart(7) + ' │  ' +
      (r.nep.llDir.phase.toFixed(1) + '°').padStart(8) + ' │ ' +
      r.nep.llDir.errAsec.toFixed(2).padStart(7) + ' │ ' +
      total.toFixed(2).padStart(12)
    );
  }
}
console.log('');
