// ═══════════════════════════════════════════════════════════════════════════
// INCLINATION PHASE-ANCHOR SEARCH
// ═══════════════════════════════════════════════════════════════════════════
//
// The current model anchors every planet's `inclinationPhaseAngle` to the
// most recent balanced year (n=0). The 8H Grand Holistic Octave gives 8
// candidate balanced years (BY − n·H, n ∈ 0..7). Each planet *could* anchor
// to a different one of those 8 — they all return at 8H regardless.
//
// This search:
//   1. Per planet, evaluates all 8 anchors. For each anchor it computes the
//      implied phase angle, the implied mean (from the J2000 inclination
//      constraint), checks LL bounds, and computes the 1900–2100 ecliptic
//      inclination trend.
//   2. Then runs a global combinatorial pass (8^7 ≈ 2.1M combos) picking one
//      anchor per planet, scoring by total |trend − JPL| while requiring all
//      planets to fit LL and (optionally) match JPL trend direction.
//
// Math identical to tools/lib/orbital-engine.js / inclination-optimization.js:
//   - Fibonacci amplitude:  amp = ψ / (d × √m)
//   - Mean from J2000:      mean = i_J2000 − antiSign × amp × cos(ϖ_J2000 − φ)
//   - ICRF perihelion drives the inclination cosine
//   - Earth Ω regresses at −H/5; planet Ω at −(8H)/N
//   - Ecliptic inclination = angle between two unit normals
//
// Usage: node tools/explore/inclination-phase-anchor-search.js [--top N]
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const BY = C.balancedYear;
const genPrecRate = 1 / (H / 13);

const PLANETS = ['mercury','venus','mars','jupiter','saturn','uranus','neptune'];

const argv = process.argv.slice(2);
const TOP = (() => { const i = argv.indexOf('--top'); return i >= 0 ? parseInt(argv[i+1], 10) : 20; })();

// ─── JPL ecliptic inclination trend rates (deg/century) ───
const jplTrends = {
  mercury: -0.00595, venus: -0.00079, mars: -0.00813,
  jupiter: -0.00184, saturn: +0.00194, uranus: -0.00243, neptune: +0.00035,
};

// ─── Laplace-Lagrange invariable plane bounds ───
const llBounds = {
  mercury: { min: 4.57,  max: 9.86  },
  venus:   { min: 0.00,  max: 3.38  },
  mars:    { min: 0.00,  max: 5.84  },
  jupiter: { min: 0.241, max: 0.489 },
  saturn:  { min: 0.797, max: 1.02  },
  uranus:  { min: 0.902, max: 1.11  },
  neptune: { min: 0.554, max: 0.800 },
};

// ─── Build per-planet input data ───
const planetData = {};
for (const key of PLANETS) {
  const p = C.planets[key];
  const mass = C.massFraction[key];
  const sqrtM = Math.sqrt(mass);
  const amp = PSI / (p.fibonacciD * sqrtM);
  const eclP = p.perihelionEclipticYears;
  const icrfPeriod = 1 / (1 / eclP - genPrecRate);
  const icrfRate = 360 / icrfPeriod;  // deg/yr (signed)
  const ascNodePeriod = p.ascendingNodeCyclesIn8H
    ? -(8 * H) / p.ascendingNodeCyclesIn8H
    : eclP;
  planetData[key] = {
    name: key.charAt(0).toUpperCase() + key.slice(1),
    fibonacciD: p.fibonacciD,
    mass, sqrtM, amp,
    periLongJ2000: p.longitudePerihelion,
    omegaJ2000: p.ascendingNodeInvPlane,
    inclJ2000: p.invPlaneInclinationJ2000,
    icrfPeriod, icrfRate, ascNodePeriod,
    antiPhase: p.antiPhase || false,
    currentPhaseAngle: p.inclinationPhaseAngle,
  };
}

// ─── Earth functions (Ω at −H/5, inclination at H/3 ICRF) ───
const earthMean = C.earthInvPlaneInclinationMean;
const earthAmp  = C.earthInvPlaneInclinationAmplitude;
const earthPhaseAngle = C.ASTRO_REFERENCE.earthInclinationPhaseAngle;
const earthPeriLongJ2000 = C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000;
const earthOmegaJ2000 = C.ASTRO_REFERENCE.earthAscendingNodeInvPlane;
const earthIcrfRate = 360 / (H / 3);   // deg/yr (Earth ICRF perihelion advance)
const earthAscNodeRate = 360 / (-H / 5);  // deg/yr (Earth Ω regression)

function getEarthInclination(year) {
  const peri = earthPeriLongJ2000 + earthIcrfRate * (year - 2000);
  return earthMean + earthAmp * Math.cos((peri - earthPhaseAngle) * DEG2RAD);
}
function getEarthOmega(year) {
  return earthOmegaJ2000 + earthAscNodeRate * (year - 2000);
}

// ─── Anchor → phase angle ───
// At anchor year y_anchor, ϖ_ICRF(y_anchor) = periLongJ2000 + icrfRate * (y_anchor − 2000).
// That value (mod 360) IS the phase angle at which inclination is at extremum.
function phaseAngleForAnchor(pl, anchorYear) {
  const peri = pl.periLongJ2000 + pl.icrfRate * (anchorYear - 2000);
  return ((peri % 360) + 360) % 360;
}

// ─── Mean from J2000 constraint ───
function meanFromPhase(pl, phaseAngle) {
  const antiSign = pl.antiPhase ? -1 : 1;
  const cosJ2000 = Math.cos((pl.periLongJ2000 - phaseAngle) * DEG2RAD);
  return pl.inclJ2000 - antiSign * pl.amp * cosJ2000;
}

// ─── Planet inclination at year (uses ICRF perihelion) ───
function getPlanetInclination(pl, mean, phaseAngle, year) {
  const antiSign = pl.antiPhase ? -1 : 1;
  const peri = pl.periLongJ2000 + pl.icrfRate * (year - 2000);
  return mean + antiSign * pl.amp * Math.cos((peri - phaseAngle) * DEG2RAD);
}

// ─── Ecliptic inclination via plane-normal dot product ───
function calcEclipticIncl(pl, mean, phaseAngle, year) {
  const planetI = getPlanetInclination(pl, mean, phaseAngle, year) * DEG2RAD;
  const planetOmega = (pl.omegaJ2000 + (360 / pl.ascNodePeriod) * (year - 2000)) * DEG2RAD;
  const earthI = getEarthInclination(year) * DEG2RAD;
  const earthOmega = getEarthOmega(year) * DEG2RAD;
  const pnx = Math.sin(planetI) * Math.sin(planetOmega);
  const pny = Math.sin(planetI) * Math.cos(planetOmega);
  const pnz = Math.cos(planetI);
  const enx = Math.sin(earthI) * Math.sin(earthOmega);
  const eny = Math.sin(earthI) * Math.cos(earthOmega);
  const enz = Math.cos(earthI);
  const dot = pnx*enx + pny*eny + pnz*enz;
  return Math.acos(Math.max(-1, Math.min(1, dot))) * RAD2DEG;
}

// ─── Evaluate one (planet, anchor) candidate ───
function evaluateCandidate(key, n) {
  const pl = planetData[key];
  const anchorYear = BY - n * H;
  const phaseAngle = phaseAngleForAnchor(pl, anchorYear);
  const mean = meanFromPhase(pl, phaseAngle);
  const rangeMin = mean - pl.amp;
  const rangeMax = mean + pl.amp;
  const ll = llBounds[key];
  const fitsLL = rangeMin >= ll.min - 0.01 && rangeMax <= ll.max + 0.01;

  // Verify J2000 reproduction (sanity)
  const i2000 = getPlanetInclination(pl, mean, phaseAngle, 2000);
  const j2000ErrAsec = Math.abs(i2000 - pl.inclJ2000) * 3600;

  const ecl1900 = calcEclipticIncl(pl, mean, phaseAngle, 1900);
  const ecl2100 = calcEclipticIncl(pl, mean, phaseAngle, 2100);
  const trend = (ecl2100 - ecl1900) / 2;  // deg/cy
  const jpl = jplTrends[key];
  const dirMatch = (trend >= 0) === (jpl >= 0);
  const trendErrArcsec = Math.abs(trend - jpl) * 3600;

  return { n, anchorYear, phaseAngle, mean, rangeMin, rangeMax, fitsLL,
           j2000ErrAsec, trend, dirMatch, trendErrArcsec };
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. PER-PLANET ENUMERATION
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('  INCLINATION PHASE-ANCHOR SEARCH');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log(`  Balanced year (n=0): ${BY.toLocaleString()}`);
console.log(`  Grand Holistic Octave: 8H = ${(8*H).toLocaleString()} years`);
console.log(`  Anchors: BY − n·H for n ∈ 0..7`);
console.log('');

const perPlanetCandidates = {};
for (const key of PLANETS) {
  const pl = planetData[key];
  const cands = [];
  for (let n = 0; n < 8; n++) cands.push(evaluateCandidate(key, n));
  perPlanetCandidates[key] = cands;

  console.log('─'.repeat(95));
  console.log(`${pl.name.padEnd(8)} │ JPL trend: ${(jplTrends[key] >= 0 ? '+' : '') + jplTrends[key].toFixed(5)}°/cy │ amp=${pl.amp.toFixed(4)}° │ d=${pl.fibonacciD} │ ${pl.antiPhase ? 'ANTI-phase' : 'in-phase'}`);
  console.log('─'.repeat(95));
  console.log(' n │ Anchor year │ Phase φ    │ Mean      │ Range          │ LL  │ Trend (°/cy) │ Dir │ Err(″/cy)');
  console.log('───┼─────────────┼────────────┼───────────┼────────────────┼─────┼──────────────┼─────┼──────────');
  for (const c of cands) {
    const trendStr = ((c.trend >= 0 ? '+' : '') + c.trend.toFixed(6)).padStart(12);
    const phaseStr = (c.phaseAngle.toFixed(2) + '°').padStart(9);
    const meanStr  = (c.mean.toFixed(4) + '°').padStart(9);
    const rangeStr = (c.rangeMin.toFixed(2) + '° – ' + c.rangeMax.toFixed(2) + '°').padStart(14);
    const llStr    = c.fitsLL ? ' ✓ ' : ' ✗ ';
    const dirStr   = c.dirMatch ? ' ✓ ' : ' ✗ ';
    const errStr   = c.trendErrArcsec.toFixed(2).padStart(8);
    const isCurrent = Math.abs(c.phaseAngle - pl.currentPhaseAngle) < 0.05;
    const marker = isCurrent ? ' ←' : '';
    console.log(` ${c.n} │ ${c.anchorYear.toString().padStart(11)} │ ${phaseStr} │ ${meanStr} │ ${rangeStr} │${llStr}│ ${trendStr} │${dirStr}│ ${errStr}${marker}`);
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. GLOBAL COMBINATORIAL SEARCH (8^7 = 2,097,152)
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('  GLOBAL COMBINATORIAL SEARCH (8^7 = 2,097,152 combinations)');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const NP = PLANETS.length;
const all = [];
const idx = new Array(NP).fill(0);

let total = 0, llPassCount = 0, dirPassCount = 0;
while (true) {
  let totErr = 0;
  let allLL = true, allDir = true;
  for (let j = 0; j < NP; j++) {
    const c = perPlanetCandidates[PLANETS[j]][idx[j]];
    if (!c.fitsLL) allLL = false;
    if (!c.dirMatch) allDir = false;
    totErr += c.trendErrArcsec;
  }
  total++;
  if (allLL) llPassCount++;
  if (allLL && allDir) {
    dirPassCount++;
    all.push({ idx: idx.slice(), totErr });
  }
  // increment
  let k = NP - 1;
  while (k >= 0 && ++idx[k] === 8) { idx[k] = 0; k--; }
  if (k < 0) break;
}

console.log(`  Total combinations:                    ${total.toLocaleString()}`);
console.log(`  Pass LL bounds (all 7):                ${llPassCount.toLocaleString()}`);
console.log(`  Pass LL + JPL trend direction (all 7): ${dirPassCount.toLocaleString()}`);
console.log('');

if (dirPassCount === 0) {
  console.log('  ⚠ No combination satisfies LL + direction-match for all 7 planets simultaneously.');
  console.log('    Falling back to LL-only with best total trend-rate error.');
  // re-scan: LL only
  const allLLonly = [];
  const idx2 = new Array(NP).fill(0);
  while (true) {
    let totErr = 0; let allLL = true; let dirCnt = 0;
    for (let j = 0; j < NP; j++) {
      const c = perPlanetCandidates[PLANETS[j]][idx2[j]];
      if (!c.fitsLL) allLL = false;
      if (c.dirMatch) dirCnt++;
      totErr += c.trendErrArcsec;
    }
    if (allLL) allLLonly.push({ idx: idx2.slice(), totErr, dirCnt });
    let k = NP - 1;
    while (k >= 0 && ++idx2[k] === 8) { idx2[k] = 0; k--; }
    if (k < 0) break;
  }
  allLLonly.sort((a, b) => (b.dirCnt - a.dirCnt) || (a.totErr - b.totErr));
  console.log(`  LL-only candidates: ${allLLonly.length.toLocaleString()}\n`);
  console.log(`  TOP ${TOP} (sorted by direction-matches desc, then total trend error asc):`);
  console.log('  ' + 'Dir/7'.padStart(5) + ' │ ' + 'TotErr″/cy'.padStart(11) + ' │ anchors  ' + PLANETS.map(p => p.slice(0,2).padStart(3)).join(' '));
  console.log('  ' + '─'.repeat(80));
  for (const e of allLLonly.slice(0, TOP)) {
    const anchors = e.idx.map(n => n.toString().padStart(3)).join(' ');
    console.log('  ' + (e.dirCnt + '/7').padStart(5) + ' │ ' + e.totErr.toFixed(2).padStart(11) + ' │           ' + anchors);
  }
} else {
  all.sort((a, b) => a.totErr - b.totErr);
  console.log(`  TOP ${TOP} solutions (sorted by total trend-rate error):`);
  console.log('  ' + 'Rank │ TotErr″/cy │ anchors  ' + PLANETS.map(p => p.slice(0,2).padStart(3)).join(' '));
  console.log('  ' + '─'.repeat(80));
  let rank = 1;
  for (const e of all.slice(0, TOP)) {
    const anchors = e.idx.map(n => n.toString().padStart(3)).join(' ');
    console.log('  ' + rank.toString().padStart(4) + ' │ ' + e.totErr.toFixed(2).padStart(10) + ' │           ' + anchors);
    rank++;
  }
  console.log('');
  // detail of best
  const best = all[0];
  console.log('─'.repeat(95));
  console.log('  BEST SOLUTION (detail)');
  console.log('─'.repeat(95));
  console.log('  Planet   │ n │ Phase     │ Mean      │ Trend (°/cy)  │ JPL          │ Err(″/cy)');
  console.log('  ─────────┼───┼───────────┼───────────┼───────────────┼──────────────┼──────────');
  for (let j = 0; j < NP; j++) {
    const key = PLANETS[j];
    const c = perPlanetCandidates[key][best.idx[j]];
    const jpl = jplTrends[key];
    console.log(
      '  ' + key.padEnd(8) + ' │ ' + c.n + ' │ ' +
      (c.phaseAngle.toFixed(2) + '°').padStart(9) + ' │ ' +
      (c.mean.toFixed(4) + '°').padStart(9) + ' │ ' +
      ((c.trend >= 0 ? '+' : '') + c.trend.toFixed(6)).padStart(13) + ' │ ' +
      ((jpl >= 0 ? '+' : '') + jpl.toFixed(5)).padStart(12) + ' │ ' +
      c.trendErrArcsec.toFixed(2).padStart(8)
    );
  }
}
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// 3. CONTINUOUS PHASE-ANGLE SWEEP (per planet, independent)
// ═══════════════════════════════════════════════════════════════════════════
//
// Drops the discrete-anchor constraint. Sweeps phaseAngle ∈ [0°, 360°) at
// 0.1° resolution, finds the best phase per planet under three regimes:
//   (A) LL bounds + JPL direction match
//   (B) LL bounds only
//   (C) Unconstrained — pure trend-rate minimization
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('  CONTINUOUS PHASE-ANGLE SWEEP (0.1° resolution, per planet)');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const STEP = 0.1;
const sweepResults = {};
for (const key of PLANETS) {
  const pl = planetData[key];
  const ll = llBounds[key];
  const jpl = jplTrends[key];
  let bestA = null, bestB = null, bestC = null;
  for (let phase = 0; phase < 360; phase += STEP) {
    const antiSign = pl.antiPhase ? -1 : 1;
    const cosJ2000 = Math.cos((pl.periLongJ2000 - phase) * DEG2RAD);
    const mean = pl.inclJ2000 - antiSign * pl.amp * cosJ2000;
    const rangeMin = mean - pl.amp;
    const rangeMax = mean + pl.amp;
    const fitsLL = rangeMin >= ll.min - 0.01 && rangeMax <= ll.max + 0.01;
    const ecl1900 = calcEclipticIncl(pl, mean, phase, 1900);
    const ecl2100 = calcEclipticIncl(pl, mean, phase, 2100);
    const trend = (ecl2100 - ecl1900) / 2;
    const dirMatch = (trend >= 0) === (jpl >= 0);
    const errAsec = Math.abs(trend - jpl) * 3600;
    const cand = { phase, mean, rangeMin, rangeMax, fitsLL, trend, dirMatch, errAsec };
    if (fitsLL && dirMatch && (!bestA || errAsec < bestA.errAsec)) bestA = cand;
    if (fitsLL && (!bestB || errAsec < bestB.errAsec)) bestB = cand;
    if (!bestC || errAsec < bestC.errAsec) bestC = cand;
  }
  sweepResults[key] = { A: bestA, B: bestB, C: bestC };
}

console.log('  (A) LL bounds + JPL direction match');
console.log('  (B) LL bounds only');
console.log('  (C) Unconstrained (pure trend minimization)');
console.log('');
console.log('  Planet   │ Mode │ Phase    │ Mean      │ Range          │ LL  │ Trend (°/cy)  │ Dir │ Err(″/cy) │ Δ from cur');
console.log('  ─────────┼──────┼──────────┼───────────┼────────────────┼─────┼───────────────┼─────┼───────────┼───────────');
for (const key of PLANETS) {
  const pl = planetData[key];
  const r = sweepResults[key];
  for (const mode of ['A','B','C']) {
    const c = r[mode];
    if (!c) {
      console.log('  ' + pl.name.padEnd(8) + ' │  ' + mode + '   │  (no candidate satisfies constraint)');
      continue;
    }
    const dCurrent = ((c.phase - pl.currentPhaseAngle + 540) % 360) - 180;
    console.log(
      '  ' + pl.name.padEnd(8) + ' │  ' + mode + '   │ ' +
      (c.phase.toFixed(1) + '°').padStart(8) + ' │ ' +
      (c.mean.toFixed(4) + '°').padStart(9) + ' │ ' +
      (c.rangeMin.toFixed(2) + '° – ' + c.rangeMax.toFixed(2) + '°').padStart(14) + ' │ ' +
      (c.fitsLL ? ' ✓ ' : ' ✗ ') + ' │ ' +
      ((c.trend >= 0 ? '+' : '') + c.trend.toFixed(6)).padStart(13) + ' │ ' +
      (c.dirMatch ? ' ✓ ' : ' ✗ ') + ' │ ' +
      c.errAsec.toFixed(2).padStart(8) + '  │ ' +
      ((dCurrent >= 0 ? '+' : '') + dCurrent.toFixed(1) + '°').padStart(8)
    );
  }
  console.log('  ─────────┼──────┼──────────┼───────────┼────────────────┼─────┼───────────────┼─────┼───────────┼───────────');
}
console.log('');

// Summary
let aFeasible = 0, bFeasible = 0;
let totalErrA = 0, totalErrB = 0;
let aOk = true, bOk = true;
for (const key of PLANETS) {
  if (sweepResults[key].A) { aFeasible++; totalErrA += sweepResults[key].A.errAsec; }
  else aOk = false;
  if (sweepResults[key].B) { bFeasible++; totalErrB += sweepResults[key].B.errAsec; }
  else bOk = false;
}
console.log('  ─── Summary ───────────────────────────────────────────────────────────────');
console.log(`  (A) LL+dir feasible: ${aFeasible}/7 planets${aOk ? ` — total trend err: ${totalErrA.toFixed(2)}″/cy` : ''}`);
console.log(`  (B) LL only feasible: ${bFeasible}/7 planets${bOk ? ` — total trend err: ${totalErrB.toFixed(2)}″/cy` : ''}`);
console.log(`  (C) Unconstrained:   7/7 (best possible per planet, may violate LL)`);
console.log('');
