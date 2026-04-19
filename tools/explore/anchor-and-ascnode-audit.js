// ═══════════════════════════════════════════════════════════════
// ANCHOR + ASCENDING-NODE AUDIT
//
// For each fitted planet, under Config #1's fixed (d, antiPhase),
// jointly sweep:
//
//   - balanced-year anchor n ∈ {0..7}  → sets the phase angle
//   - ascendingNodeCyclesIn8H N ∈ {1..120} (retrograde) → sets the
//     planet Ω regression rate −(8H)/N
//
// For each (planet, n, N) we compute the apparent ecliptic-inclination
// trend in the model's moving-Earth frame (the actual observable),
// re-express JPL's catalog value into the moving frame via the per-
// configuration frame correction, and report the trend error against
// JPL.
//
// We then identify, per planet:
//   - Best LL+dir-feasible (n, N)
//   - Whether ANY (n, N) gives error ~0
//   - Comparison to current (n=0, current N)
//
// Finally we report a "global best": picking each planet's individually
// optimal (n, N) and totaling the trend errors. Since each planet's
// trend is independent of the others under shared rotation, the global
// best IS the sum of per-planet bests — there's no joint coupling to
// optimize.
//
// Usage: node tools/explore/anchor-and-ascnode-audit.js [--n-max 120]
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const BY = C.balancedYear;

const argv = process.argv.slice(2);
const N_MAX = (() => { const i = argv.indexOf('--n-max'); return i >= 0 ? parseInt(argv[i+1], 10) : 120; })();

const PLANETS = ['mercury','venus','mars','jupiter','saturn','uranus','neptune'];
const config = {
  mercury: { d: 21, anti: false }, venus: { d: 34, anti: false },
  mars:    { d:  5, anti: false }, jupiter: { d: 5, anti: false },
  saturn:  { d:  3, anti: true  }, uranus:  { d: 21, anti: false },
  neptune: { d: 34, anti: false },
};
const jplCat = {
  mercury: -0.00595, venus: -0.00079, mars: -0.00813, jupiter: -0.00184,
  saturn: +0.00194, uranus: -0.00243, neptune: +0.00035,
};
const ll = {
  mercury: { min: 4.57,  max: 9.86  }, venus:   { min: 0.00,  max: 3.38 },
  mars:    { min: 0.00,  max: 5.84  }, jupiter: { min: 0.241, max: 0.489 },
  saturn:  { min: 0.797, max: 1.02  }, uranus:  { min: 0.902, max: 1.11 },
  neptune: { min: 0.554, max: 0.800 },
};

const eMean = C.earthInvPlaneInclinationMean;
const eAmp  = C.earthInvPlaneInclinationAmplitude;
const ePh   = C.ASTRO_REFERENCE.earthInclinationCycleAnchor;
const eL    = C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000;
const eO0   = C.ASTRO_REFERENCE.earthAscendingNodeInvPlane;
const eIfix = C.ASTRO_REFERENCE.earthInclinationJ2000_deg;
const earthIcrfRate = 360 / (H / 3);
const earthAscRate  = 360 / (-H / 5);
const genPrec = 1 / (H / 13);

// Per-planet static
const staticData = {};
for (const k of PLANETS) {
  const p = C.planets[k];
  const eclP = p.perihelionEclipticYears;
  const icrfPeriod = 1 / (1 / eclP - genPrec);
  const cfg = config[k];
  staticData[k] = {
    icrfRate: 360 / icrfPeriod,
    sqrtM: Math.sqrt(C.massFraction[k]),
    amp: PSI / (cfg.d * Math.sqrt(C.massFraction[k])),
    sign: cfg.anti ? -1 : +1,
    periJ: p.longitudePerihelion,
    omJ: p.ascendingNodeInvPlane,
    inclJ2000: p.invPlaneInclinationJ2000,
    currentN: p.ascendingNodeCyclesIn8H,
    currentPhase: p.inclinationCycleAnchor,
  };
}

function evalPlanet(k, n, N) {
  const s = staticData[k];
  const cfg = config[k];
  // Phase from balanced-year anchor
  const yA = BY - n * H;
  const periAtAnchor = ((s.periJ + s.icrfRate * (yA - 2000)) % 360 + 360) % 360;
  const phase = cfg.anti ? periAtAnchor : (periAtAnchor + 180) % 360;
  // Mean from J2000 constraint
  const cosJ = Math.cos((s.periJ - phase) * DEG2RAD);
  const mean = s.inclJ2000 - s.sign * s.amp * cosJ;
  const inLL = mean - s.amp >= ll[k].min - 0.01 && mean + s.amp <= ll[k].max + 0.01;
  // Trend
  const ascNodePeriod = -(8 * H) / N;
  function ecl(year, fixed) {
    const peri = s.periJ + s.icrfRate * (year - 2000);
    const iP = (mean + s.sign * s.amp * Math.cos((peri - phase) * DEG2RAD)) * DEG2RAD;
    const omP = (s.omJ + (360 / ascNodePeriod) * (year - 2000)) * DEG2RAD;
    let iE, omE;
    if (fixed) { iE = eIfix * DEG2RAD; omE = eO0 * DEG2RAD; }
    else {
      const ePeri = eL + earthIcrfRate * (year - 2000);
      iE = (eMean + eAmp * Math.cos((ePeri - ePh) * DEG2RAD)) * DEG2RAD;
      omE = (eO0 + earthAscRate * (year - 2000)) * DEG2RAD;
    }
    const dot = Math.cos(iP) * Math.cos(iE) + Math.sin(iP) * Math.sin(iE) * Math.cos(omP - omE);
    return Math.acos(Math.max(-1, Math.min(1, dot))) * RAD2DEG;
  }
  const tMov = (ecl(2100, false) - ecl(1900, false)) / 2;
  const tFix = (ecl(2100, true)  - ecl(1900, true))  / 2;
  const jplMoving = jplCat[k] + (tMov - tFix);
  const err = Math.abs(tMov - jplMoving) * 3600;
  const dirMatch = (tMov >= 0) === (jplMoving >= 0);
  return { phase, mean, range:[mean - s.amp, mean + s.amp], inLL, tMov, jplMoving, err, dirMatch };
}

// ═══════════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  ANCHOR + ASCENDING-NODE AUDIT');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  For each fitted planet, sweep:`);
console.log(`    n ∈ {0..7} (balanced-year anchor → phase angle)`);
console.log(`    N ∈ {1..${N_MAX}}  (ascendingNodeCyclesIn8H → Ω rate)`);
console.log(`  Search space per planet: 8 × ${N_MAX} = ${8 * N_MAX}`);
console.log(`  Total evaluations: ${7 * 8 * N_MAX}`);
console.log('');

const perPlanetBest = {};
let totalCurrent = 0;
let totalBest = 0;
let allDirCurrent = true, allDirBest = true;

for (const k of PLANETS) {
  const s = staticData[k];

  // Current state (using current N and current phase, which corresponds
  // to anchor n=0 for all planets currently)
  // For audit purposes, we evaluate (n=0, current N).
  const currentEval = evalPlanet(k, 0, s.currentN);
  if (!currentEval.dirMatch) allDirCurrent = false;
  totalCurrent += currentEval.err;

  // Sweep all (n, N)
  let best = null;
  const allFeasible = [];
  for (let n = 0; n < 8; n++) {
    for (let N = 1; N <= N_MAX; N++) {
      const r = evalPlanet(k, n, N);
      if (!r.inLL) continue;
      if (!r.dirMatch) continue;
      allFeasible.push({ n, N, ...r });
      if (!best || r.err < best.err) best = { n, N, ...r };
    }
  }
  perPlanetBest[k] = { current: currentEval, best, feasibleCount: allFeasible.length };
  if (best) totalBest += best.err;
  else allDirBest = false;

  // Print per-planet result
  console.log(`─── ${k.toUpperCase()} (${cfg(k).anti ? 'anti' : 'in '}-phase, d=${cfg(k).d}) ───`);
  console.log(`  Current: n=0  N=${s.currentN}  phase=${s.currentPhase.toFixed(2)}°  ` +
    `→ err ${currentEval.err.toFixed(2)}″  dir ${currentEval.dirMatch ? '✓' : '✗'}  ` +
    `LL ${currentEval.inLL ? '✓' : '✗'}`);
  if (best) {
    console.log(`  Best:    n=${best.n}  N=${best.N}  phase=${best.phase.toFixed(2)}°  ` +
      `→ err ${best.err.toFixed(2)}″  dir ${best.dirMatch ? '✓' : '✗'}  ` +
      `LL ${best.inLL ? '✓' : '✗'}`);
    console.log(`  Best ascNode period: ${(-(8 * H) / best.N).toFixed(0)} yr` +
      (best.N === 1 ? '  (= −8H, full Grand Octave)' :
       best.N === 2 ? '  (= −4H)' :
       best.N === 4 ? '  (= −2H)' :
       best.N === 8 ? '  (= −H)' :
       best.N === 16 ? '  (= −H/2)' : ''));
    console.log(`  ${allFeasible.length} (n, N) combinations are LL+dir feasible.`);
  } else {
    console.log(`  ✗ No (n, N) combination is LL+dir feasible under Config #1.`);
  }
  console.log('');
}

function cfg(k) { return config[k]; }

// ─── Summary table ───
console.log('═══════════════════════════════════════════════════════════════');
console.log('  PER-PLANET BEST (n, N) UNDER CONFIG #1');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('  Planet   │ cur n │ cur N │ cur err │ best n │ best N │ best err │ improvement');
console.log('  ─────────┼───────┼───────┼─────────┼────────┼────────┼──────────┼─────────────');
for (const k of PLANETS) {
  const r = perPlanetBest[k];
  const s = staticData[k];
  if (!r.best) {
    console.log('  ' + k.padEnd(8) + ' │   0   │ ' + s.currentN.toString().padStart(5) + ' │ ' +
      r.current.err.toFixed(2).padStart(7) + ' │   —    │   —    │    —     │   no LL+dir');
    continue;
  }
  const imp = r.current.err - r.best.err;
  console.log('  ' + k.padEnd(8) + ' │   0   │ ' + s.currentN.toString().padStart(5) + ' │ ' +
    r.current.err.toFixed(2).padStart(7) + ' │   ' + r.best.n + '    │ ' +
    r.best.N.toString().padStart(6) + ' │ ' + r.best.err.toFixed(2).padStart(8) + ' │ ' +
    (imp >= 0 ? '−' : '+') + Math.abs(imp).toFixed(2) + '″');
}
console.log('');

console.log('  ─── Totals ──────────────────────────────────');
console.log(`  Current total: ${totalCurrent.toFixed(2)}″/cy   (all directions match: ${allDirCurrent ? 'yes' : 'NO'})`);
console.log(`  Best total:    ${totalBest.toFixed(2)}″/cy   (all directions match: ${allDirBest ? 'yes' : 'NO'})`);
console.log(`  Improvement:   ${(totalCurrent - totalBest).toFixed(2)}″/cy`);
console.log('');

// ═══════════════════════════════════════════════════════════════
// SHARED-ANCHOR EVALUATION
// ═══════════════════════════════════════════════════════════════
//
// "Could we have ALL planets share one anchor n* AND each pick its
// best N at that anchor?" That's a sub-question of the per-planet
// search above. For each n* we compute the total err with each
// planet's best N at that specific anchor.

console.log('═══════════════════════════════════════════════════════════════');
console.log('  IF ALL PLANETS SHARE THE SAME ANCHOR n*');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  (each planet still picks its best N at that anchor)');
console.log('');
console.log('  n* │ year         │ total err │ all dir? │ all LL?');
console.log('  ───┼──────────────┼───────────┼──────────┼────────');
for (let n = 0; n < 8; n++) {
  let tot = 0, dirCount = 0, llCount = 0;
  for (const k of PLANETS) {
    let bestAtN = null;
    for (let N = 1; N <= N_MAX; N++) {
      const r = evalPlanet(k, n, N);
      if (!r.inLL || !r.dirMatch) continue;
      if (!bestAtN || r.err < bestAtN.err) bestAtN = r;
    }
    if (bestAtN) {
      tot += bestAtN.err;
      dirCount++;
      llCount++;
    }
  }
  const yA = BY - n * H;
  console.log('  ' + n + ' │ ' + yA.toLocaleString().padStart(12) + ' │ ' +
    (dirCount === 7 ? tot.toFixed(2) + '″' : '   —   ').padStart(8) + ' │   ' +
    dirCount + '/7    │  ' + llCount + '/7');
}
console.log('');

// ─── Detail of GLOBAL BEST (per-planet anchor freedom) ───
console.log('═══════════════════════════════════════════════════════════════');
console.log('  GLOBAL BEST (each planet at its own optimal n, N)');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('  Planet   │ n │ N    │ asc period (yr) │ phase    │ mean    │ trend mov   │ jpl mov   │ err     │ Dir');
console.log('  ─────────┼───┼──────┼─────────────────┼──────────┼─────────┼─────────────┼───────────┼─────────┼─────');
for (const k of PLANETS) {
  const r = perPlanetBest[k];
  if (!r.best) { console.log('  ' + k.padEnd(8) + ' │ no LL+dir feasible (n, N)'); continue; }
  const ascP = -(8 * H) / r.best.N;
  console.log('  ' + k.padEnd(8) + ' │ ' + r.best.n + ' │ ' +
    r.best.N.toString().padStart(4) + ' │ ' + ascP.toFixed(0).padStart(15) + ' │ ' +
    (r.best.phase.toFixed(1) + '°').padStart(8) + ' │ ' +
    (r.best.mean.toFixed(4) + '°').padStart(7) + ' │ ' +
    ((r.best.tMov >= 0 ? '+' : '') + r.best.tMov.toFixed(6)).padStart(11) + ' │ ' +
    ((r.best.jplMoving >= 0 ? '+' : '') + r.best.jplMoving.toFixed(6)).padStart(9) + ' │ ' +
    (r.best.err.toFixed(2) + '″').padStart(7) + ' │  ' + (r.best.dirMatch ? '✓' : '✗'));
}
console.log('');
