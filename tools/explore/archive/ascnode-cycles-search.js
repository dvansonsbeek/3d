// ═══════════════════════════════════════════════════════════════
// ASCENDING-NODE-CYCLES SEARCH
//
// Sibling to tools/verify/jpl-feasible-search.js. That tool proved
// that Saturn, Uranus, and Neptune have ZERO LL+dir-feasible phase
// across all 743 inclination-balance presets — i.e. no choice of
// (d, antiPhase, phase) can flip their ecliptic-inclination trend
// direction. The structural cause must therefore be the only input
// we have not varied: ascendingNodeCyclesIn8H (the integer N that
// sets each planet's Ω regression period to −(8H)/N).
//
// This script holds (d, antiPhase) fixed at Config #1 (or any chosen
// preset) and sweeps N ∈ 1..N_MAX for Jupiter, Saturn, Uranus, and
// Neptune. For each (planet, N) pair it sweeps phaseAngle ∈ [0°,360°)
// at 0.5° resolution and records whether ANY phase satisfies both:
//   - Laplace-Lagrange invariable-plane bounds
//   - JPL ecliptic-inclination trend direction
//
// CONSTRAINT: Jupiter and Saturn must share the same N (the two
// dominant planets must regress in lockstep, otherwise they fall on
// the same side of the inclination balance for parts of the cycle,
// destroying the dynamical symmetry). They are therefore searched
// jointly: only N values where both are LL+dir-feasible survive.
//
// Output:
//   1. Per-planet N-feasibility maps (Jupiter, Saturn, Uranus, Neptune)
//   2. Jupiter∩Saturn shared-N feasibility (the binding constraint)
//   3. Top combinations (N_JS, N_U, N_N) ranked by total trend-rate error
//
// Usage: node tools/explore/ascnode-cycles-search.js [--n-max 120]
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const PHASE_STEP = 0.5;

const argv = process.argv.slice(2);
const nMaxArg = argv.indexOf('--n-max');
const N_MAX = nMaxArg >= 0 ? parseInt(argv[nMaxArg + 1], 10) : 120;
const TOP = 30;

// ─── Config #1 d-values + antiPhase ───
// Mercury 21, Venus 34, Earth 3, Mars 5, Jupiter 5, Saturn 3 (anti),
// Uranus 21, Neptune 34. Saturn is the sole anti-phase planet.
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
const SWEEP_PLANETS = ['jupiter','saturn','uranus','neptune'];

// ─── JPL trends + LL bounds ───
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
    currentN: p.ascendingNodeCyclesIn8H,
  };
}

// ─── Earth (locked) ───
const earthMean = C.earthInvPlaneInclinationMean;
const earthAmp  = C.earthInvPlaneInclinationAmplitude;
const earthPhaseAngle = C.ASTRO_REFERENCE.earthInclinationPhaseAngle;
const earthPeriLongJ2000 = C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000;
const earthOmegaJ2000 = C.ASTRO_REFERENCE.earthAscendingNodeInvPlane;
const earthIcrfRate = 360 / (H / 3);
const earthAscRate  = 360 / (-H / 5);

function getEarthInclination(year) {
  const peri = earthPeriLongJ2000 + earthIcrfRate * (year - 2000);
  return earthMean + earthAmp * Math.cos((peri - earthPhaseAngle) * DEG2RAD);
}
function getEarthOmega(year) {
  return earthOmegaJ2000 + earthAscRate * (year - 2000);
}

// ─── Ecliptic inclination ───
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

// ─── For (planet, N), find best LL+dir-feasible phase ───
function bestPhaseForN(key, N) {
  const pl = planetData[key];
  const ll = llBounds[key];
  const jpl = jplTrends[key];
  const cfg = config[key];
  const amp = PSI / (cfg.d * pl.sqrtM);
  const antiSign = cfg.antiPhase ? -1 : 1;
  const ascNodePeriod = -(8 * H) / N;

  let best = null;
  for (let phase = 0; phase < 360; phase += PHASE_STEP) {
    const cosJ2000 = Math.cos((pl.periLongJ2000 - phase) * DEG2RAD);
    const mean = pl.inclJ2000 - antiSign * amp * cosJ2000;
    const rangeMin = mean - amp;
    const rangeMax = mean + amp;
    if (rangeMin < ll.min - 0.01 || rangeMax > ll.max + 0.01) continue;

    const ecl1900 = calcEclipticIncl(pl, mean, amp, phase, antiSign, ascNodePeriod, 1900);
    const ecl2100 = calcEclipticIncl(pl, mean, amp, phase, antiSign, ascNodePeriod, 2100);
    const trend = (ecl2100 - ecl1900) / 2;
    if ((trend >= 0) !== (jpl >= 0)) continue;

    const errAsec = Math.abs(trend - jpl) * 3600;
    if (!best || errAsec < best.errAsec) {
      best = { phase, mean, trend, errAsec };
    }
  }
  return best;
}

// ═══════════════════════════════════════════════════════════════
// SWEEP N FOR EACH OF THE FOUR SLOW PLANETS
// ═══════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  ASCENDING-NODE-CYCLES SEARCH');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Config: #1 — d-values & antiPhase fixed`);
console.log(`  N range: 1..${N_MAX} (asc-node period = -(8H)/N)`);
console.log(`  Phase step: ${PHASE_STEP}°`);
console.log(`  Constraint: Jupiter and Saturn must share N (lockstep)`);
console.log('');

const feas = {};  // feas[planet] = { [N]: best_candidate or null }
for (const key of SWEEP_PLANETS) {
  feas[key] = {};
  for (let N = 1; N <= N_MAX; N++) {
    feas[key][N] = bestPhaseForN(key, N);
  }
}

// Helper: list N values where the planet is LL+dir-feasible
function feasibleN(key) {
  const list = [];
  for (let N = 1; N <= N_MAX; N++) if (feas[key][N]) list.push(N);
  return list;
}

for (const key of SWEEP_PLANETS) {
  const list = feasibleN(key);
  const cur = planetData[key].currentN;
  console.log(`─── ${key.padEnd(8)} (current N=${cur}, JPL ${jplTrends[key] >= 0 ? '+' : ''}${jplTrends[key].toFixed(5)}°/cy)`);
  if (list.length === 0) {
    console.log('  ✗ NO N value in 1..' + N_MAX + ' produces LL+dir-feasible phase');
  } else {
    console.log(`  Feasible N values (${list.length}): ${list.join(', ')}`);
    // Show top 8 by error
    const ranked = list.map(N => ({ N, ...feas[key][N] }))
                       .sort((a, b) => a.errAsec - b.errAsec).slice(0, 8);
    console.log('  Top 8 by trend-rate error:');
    console.log('    N    │ asc-node period │ Phase    │ Mean     │ Trend (°/cy)  │ Err(″/cy)');
    console.log('    ─────┼─────────────────┼──────────┼──────────┼───────────────┼──────────');
    for (const r of ranked) {
      const period = -(8 * H) / r.N;
      console.log(
        '    ' + r.N.toString().padStart(4) + ' │ ' +
        (period.toFixed(0) + ' yr').padStart(15) + ' │ ' +
        (r.phase.toFixed(1) + '°').padStart(8) + ' │ ' +
        (r.mean.toFixed(4) + '°').padStart(8) + ' │ ' +
        ((r.trend >= 0 ? '+' : '') + r.trend.toFixed(6)).padStart(13) + ' │ ' +
        r.errAsec.toFixed(2).padStart(8)
      );
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════
// JUPITER ∩ SATURN SHARED-N
// ═══════════════════════════════════════════════════════════════

console.log('─── Jupiter ∩ Saturn shared-N feasibility (binding constraint)');
const jSatN = [];
for (let N = 1; N <= N_MAX; N++) {
  if (feas.jupiter[N] && feas.saturn[N]) {
    jSatN.push({
      N,
      jupErr: feas.jupiter[N].errAsec,
      satErr: feas.saturn[N].errAsec,
      sumErr: feas.jupiter[N].errAsec + feas.saturn[N].errAsec,
    });
  }
}
if (jSatN.length === 0) {
  console.log('  ✗ NO shared N satisfies both Jupiter and Saturn LL+dir.');
} else {
  jSatN.sort((a, b) => a.sumErr - b.sumErr);
  console.log(`  ${jSatN.length} shared N values feasible.`);
  console.log('    N    │ asc-node period │ Jup err  │ Sat err  │ Sum err (″/cy)');
  console.log('    ─────┼─────────────────┼──────────┼──────────┼────────────────');
  for (const r of jSatN.slice(0, 15)) {
    const period = -(8 * H) / r.N;
    console.log(
      '    ' + r.N.toString().padStart(4) + ' │ ' +
      (period.toFixed(0) + ' yr').padStart(15) + ' │ ' +
      r.jupErr.toFixed(2).padStart(8) + ' │ ' +
      r.satErr.toFixed(2).padStart(8) + ' │ ' +
      r.sumErr.toFixed(2).padStart(13)
    );
  }
}
console.log('');

// ═══════════════════════════════════════════════════════════════
// FULL COMBINATIONS (N_JS shared, N_U, N_N independent)
// ═══════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  GLOBAL COMBINATIONS (Jupiter+Saturn shared, Uranus, Neptune)');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

const uList = feasibleN('uranus');
const nList = feasibleN('neptune');

const combos = [];
for (const js of jSatN) {
  for (const nU of uList) {
    for (const nN of nList) {
      combos.push({
        N_JS: js.N, N_U: nU, N_N: nN,
        sumErr: js.sumErr + feas.uranus[nU].errAsec + feas.neptune[nN].errAsec,
        jupErr: feas.jupiter[js.N].errAsec,
        satErr: feas.saturn[js.N].errAsec,
        urErr:  feas.uranus[nU].errAsec,
        neErr:  feas.neptune[nN].errAsec,
      });
    }
  }
}
combos.sort((a, b) => a.sumErr - b.sumErr);
console.log(`  Total feasible (J+S, U, N) triples: ${combos.length.toLocaleString()}`);
console.log('');

if (combos.length > 0) {
  console.log(`  TOP ${Math.min(TOP, combos.length)} combinations (by sum of slow-planet trend errors, ″/cy):`);
  console.log('');
  console.log('  Rank │ N_JS │ N_U │ N_N │ Jup err │ Sat err │ Ura err │ Nep err │ Sum');
  console.log('  ─────┼──────┼─────┼─────┼─────────┼─────────┼─────────┼─────────┼─────────');
  for (let i = 0; i < Math.min(TOP, combos.length); i++) {
    const c = combos[i];
    console.log(
      '  ' + (i+1).toString().padStart(4) + ' │ ' +
      c.N_JS.toString().padStart(4) + ' │ ' +
      c.N_U.toString().padStart(3) + ' │ ' +
      c.N_N.toString().padStart(3) + ' │ ' +
      c.jupErr.toFixed(2).padStart(7) + ' │ ' +
      c.satErr.toFixed(2).padStart(7) + ' │ ' +
      c.urErr.toFixed(2).padStart(7) + ' │ ' +
      c.neErr.toFixed(2).padStart(7) + ' │ ' +
      c.sumErr.toFixed(2).padStart(7)
    );
  }
}
console.log('');
