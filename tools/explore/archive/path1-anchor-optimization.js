// ═══════════════════════════════════════════════════════════════
// PATH 1 ANCHOR OPTIMIZATION
//
// Stay strictly within the balanced-year framework (Path 1) but
// let each of the 7 fitted planets pick INDEPENDENTLY which of
// the 8 balanced-year anchors (BY − n·H, n ∈ 0..7) defines its
// inclinationPhaseAngle. This preserves the symbolic structure
// (every phase IS the planet's ICRF perihelion at some balanced
// year) while allowing the discrete 8^7 ≈ 2.1M combinations.
//
// The current model has all 7 planets at n=0 (the most recent
// balanced year). This script asks whether any other anchor
// assignment gives a lower JPL trend error in the J2000-fixed
// frame, while keeping Config #1's (d, antiPhase) untouched.
//
// Saturn is anti-phase: its phase angle = ϖ_ICRF(anchor) directly
// (cos = +1 condition). All other planets are in-phase: same
// formula. (The "anti" sign just flips the cosine.)
//
// For each candidate (n_1, n_2, ..., n_7), we compute the trend
// for each planet under the corresponding phase angle and total
// the per-planet errors against JPL.
//
// Usage: node tools/explore/path1-anchor-optimization.js
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const SHARED_PERIOD = -H / 5;
const sharedRate = 360 / SHARED_PERIOD;
const BY = C.balancedYear;

// JPL J2000-fixed frame
const EARTH_I_J2000 = C.ASTRO_REFERENCE.earthInclinationJ2000_deg;
const EARTH_OM_J2000 = C.ASTRO_REFERENCE.earthAscendingNodeInvPlane;

// Config #1 (locked structure)
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

const genPrecRate = 1 / (H / 13);
const planetData = {};
for (const k of PLANETS) {
  const p = C.planets[k];
  const eclP = p.perihelionEclipticYears;
  const icrfPeriod = 1 / (1 / eclP - genPrecRate);
  const cfg = config[k];
  const sqrtM = Math.sqrt(C.massFraction[k]);
  planetData[k] = {
    periLongJ2000: p.longitudePerihelion,
    omegaJ2000: p.ascendingNodeInvPlane,
    inclJ2000: p.invPlaneInclinationJ2000,
    icrfRate: 360 / icrfPeriod,
    amp: PSI / (cfg.d * sqrtM),
    antiSign: cfg.antiPhase ? -1 : 1,
  };
}

// ─── Compute the 8 anchor phase angles per planet ───
function anchorPhase(key, n) {
  const pd = planetData[key];
  const yAnchor = BY - n * H;
  const peri = pd.periLongJ2000 + pd.icrfRate * (yAnchor - 2000);
  return ((peri % 360) + 360) % 360;
}

// ─── For a given (key, anchor n), compute trend & LL fit ───
const cache = {};
function evaluatePlanet(key, n) {
  const cKey = `${key}:${n}`;
  if (cache[cKey]) return cache[cKey];
  const pd = planetData[key];
  const phase = anchorPhase(key, n);
  const cosJ2000 = Math.cos((pd.periLongJ2000 - phase) * DEG2RAD);
  const mean = pd.inclJ2000 - pd.antiSign * pd.amp * cosJ2000;
  const ll = llBounds[key];
  const fitsLL = mean - pd.amp >= ll.min - 0.01 && mean + pd.amp <= ll.max + 0.01;

  // Trend in JPL J2000-fixed frame
  function eclAt(year) {
    const peri = pd.periLongJ2000 + pd.icrfRate * (year - 2000);
    const iP = (mean + pd.antiSign * pd.amp * Math.cos((peri - phase) * DEG2RAD)) * DEG2RAD;
    const omP = (pd.omegaJ2000 + sharedRate * (year - 2000)) * DEG2RAD;
    const iE = EARTH_I_J2000 * DEG2RAD;
    const omE = EARTH_OM_J2000 * DEG2RAD;
    const dot = Math.cos(iP) * Math.cos(iE) + Math.sin(iP) * Math.sin(iE) * Math.cos(omP - omE);
    return Math.acos(Math.max(-1, Math.min(1, dot))) * RAD2DEG;
  }
  const trend = (eclAt(2100) - eclAt(1900)) / 2;
  const dirMatch = (trend >= 0) === (jplTrends[key] >= 0);
  const errAsec = Math.abs(trend - jplTrends[key]) * 3600;

  const r = { phase, mean, fitsLL, trend, dirMatch, errAsec };
  cache[cKey] = r;
  return r;
}

// Pre-compute all 7×8 = 56 (planet, anchor) pairs
const perPlanet = {};
for (const k of PLANETS) {
  perPlanet[k] = [];
  for (let n = 0; n < 8; n++) perPlanet[k].push(evaluatePlanet(k, n));
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('  PATH 1 ANCHOR OPTIMIZATION');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  Config #1 (d, antiPhase) FIXED. Each planet picks its anchor n ∈ 0..7.');
console.log('  Trends computed in JPL J2000-fixed frame (corrected observable).');
console.log('  Search space: 8^7 = 2,097,152 combinations.');
console.log('');

console.log('  ─── Per-planet anchor evaluation ─────────────────────────────');
console.log('  Planet   │ n=0   │ n=1   │ n=2   │ n=3   │ n=4   │ n=5   │ n=6   │ n=7   │ best n');
console.log('  ─────────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┼────────');
for (const k of PLANETS) {
  const cells = [];
  let bestN = -1, bestErr = Infinity;
  for (let n = 0; n < 8; n++) {
    const r = perPlanet[k][n];
    if (!r.fitsLL) {
      cells.push('  LL✗ ');
    } else if (!r.dirMatch) {
      cells.push(`  d✗${r.errAsec.toFixed(0).padStart(2)}`);
    } else {
      cells.push(' ' + r.errAsec.toFixed(1).padStart(5));
      if (r.errAsec < bestErr) { bestErr = r.errAsec; bestN = n; }
    }
  }
  console.log('  ' + k.padEnd(8) + ' │' + cells.join(' │') + ' │  n=' + (bestN >= 0 ? bestN + ' (' + bestErr.toFixed(2) + '″)' : '—'));
}
console.log('');
console.log('  Legend: " 12.3" = LL+dir feasible with err 12.3″/cy');
console.log('          "d✗12" = LL ok but direction wrong, err 12');
console.log('          "LL✗" = LL bound violated');
console.log('');

// Per-planet best vs current (n=0)
console.log('  ─── Per-planet best (independent) anchor ────────────────────');
console.log('  Planet   │ n=0 (current) │ best n │ best phase │ best err');
console.log('  ─────────┼───────────────┼────────┼────────────┼─────────');
let totalCurrent = 0, totalBest = 0;
let allDirCurrent = true, allDirBest = true;
const bestPick = {};
for (const k of PLANETS) {
  const cur = perPlanet[k][0];
  if (!cur.dirMatch) allDirCurrent = false;
  totalCurrent += cur.errAsec;
  let bestN = -1, bestErr = Infinity;
  for (let n = 0; n < 8; n++) {
    const r = perPlanet[k][n];
    if (r.fitsLL && r.dirMatch && r.errAsec < bestErr) { bestErr = r.errAsec; bestN = n; }
  }
  if (bestN < 0) { bestPick[k] = -1; allDirBest = false; continue; }
  bestPick[k] = bestN;
  totalBest += bestErr;
  console.log(
    '  ' + k.padEnd(8) + ' │ ' +
    cur.errAsec.toFixed(2).padStart(8) + (cur.dirMatch?' ':' ✗') + '    │   n=' + bestN + '  │ ' +
    (perPlanet[k][bestN].phase.toFixed(1)+'°').padStart(8) + ' │ ' +
    bestErr.toFixed(2).padStart(7)
  );
}
console.log('  ─────────┴───────────────┴────────┴────────────┴─────────');
console.log(`  Current (n=0 all): ${totalCurrent.toFixed(2)}″/cy${allDirCurrent ? '' : '  (some direction-wrong)'}`);
console.log(`  Best (per-planet): ${totalBest.toFixed(2)}″/cy${allDirBest ? '' : '  (some planet has NO LL+dir feasible anchor)'}`);
console.log('');

// ═══════════════════════════════════════════════════════════════
// FULL 8^7 SEARCH (since per-planet best may not be jointly best
// — but actually they're independent under shared rate, so they
// should be. We confirm anyway.)
// ═══════════════════════════════════════════════════════════════

console.log('  ─── Full 8^7 combinatorial search ───────────────────────────');
let count = 0, bestTotal = Infinity, bestCombo = null;
const idx = new Array(7).fill(0);
while (true) {
  let totErr = 0, allDir = true, allLL = true;
  for (let i = 0; i < 7; i++) {
    const r = perPlanet[PLANETS[i]][idx[i]];
    if (!r.fitsLL) { allLL = false; break; }
    if (!r.dirMatch) { allDir = false; break; }
    totErr += r.errAsec;
  }
  count++;
  if (allLL && allDir && totErr < bestTotal) {
    bestTotal = totErr;
    bestCombo = idx.slice();
  }
  let k = 6;
  while (k >= 0 && ++idx[k] === 8) { idx[k] = 0; k--; }
  if (k < 0) break;
}
console.log(`  Combinations evaluated: ${count.toLocaleString()}`);
if (bestCombo) {
  console.log(`  Best combination: ${PLANETS.map((p, i) => p.slice(0,2)+'='+bestCombo[i]).join(' ')}`);
  console.log(`  Best total error: ${bestTotal.toFixed(2)}″/cy`);
  console.log('');
  console.log('  ─── Best anchor combination — detail ─────────────────────────');
  console.log('  Planet   │ anchor │ year (BC/AD) │ phase   │ trend         │ err');
  console.log('  ─────────┼────────┼──────────────┼─────────┼───────────────┼─────');
  for (let i = 0; i < 7; i++) {
    const k = PLANETS[i];
    const n = bestCombo[i];
    const r = perPlanet[k][n];
    const yAnchor = BY - n * H;
    const yLabel = yAnchor < 0 ? Math.abs(yAnchor).toLocaleString() + ' BC' : yAnchor.toLocaleString() + ' AD';
    console.log(
      '  ' + k.padEnd(8) + ' │   n=' + n + '  │ ' + yLabel.padStart(12) + ' │ ' +
      (r.phase.toFixed(1) + '°').padStart(7) + ' │ ' +
      ((r.trend >= 0 ? '+' : '') + r.trend.toFixed(6)).padStart(13) + ' │ ' +
      r.errAsec.toFixed(2).padStart(5)
    );
  }
} else {
  console.log('  ✗ No combination satisfies LL+dir for all 7 planets simultaneously.');
}
console.log('');

// ─── Comparison summary ───
console.log('  ─── COMPARISON ───────────────────────────────────────────────');
console.log('  Configuration                        │ Total trend err (J2000-fixed)');
console.log('  ─────────────────────────────────────┼──────────────────────────────');
console.log('  Current (Config #1, current phases)  │ 146.77″/cy');
console.log('  Path 1: Config #1, all n=0           │ ' + totalCurrent.toFixed(2) + '″/cy');
console.log(`  Path 1: Config #1, best per-planet n │ ${bestTotal.toFixed(2)}″/cy`);
console.log('  Path 2: free phase, Δ=0              │  55.89″/cy');
console.log('  Path 2: free phase, Δ=3              │  37.81″/cy');
console.log('  Path 2: free phase, best (Δ=11)      │  33.12″/cy');
console.log('');
