#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// Dual Balance Optimizer (Pipeline Step 7a-ii)
//
// Finds outer planet base eccentricities that simultaneously
// achieve 100% inclination balance AND 100% eccentricity balance,
// while minimizing deviation from J2000 observed eccentricities.
//
// Fixed (cannot change):
//   - Mercury base: J2000 (tilt ~0, no oscillation)
//   - Venus base: from R=311 constraint
//   - Earth base + amplitude: from Sun optimizer
//   - Mars base: from JPL cosine fit
//   - All masses, d-values, phase groups (Config #1)
//   - All solarYearInput (default) — optionally scans ±1 orbit count
//
// Free:
//   - Jupiter, Saturn, Uranus, Neptune base eccentricities
//   - 4 unknowns, 2 balance equations → 2 DOF
//   - 2 DOF used to minimize distance from J2000
//
// Optionally scans solarYearInput ±1 orbit count per planet to
// check if a different orbit count improves the dual balance fit.
//
// Usage:
//   node tools/fit/dual-balance-optimizer.js              # analyze only
//   node tools/fit/dual-balance-optimizer.js --scan-orbits # also scan ±1 orbit counts
//   node tools/fit/dual-balance-optimizer.js --write       # apply best solution
//
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');
const fs = require('fs');
const path = require('path');

const WRITE = process.argv.includes('--write');
const SCAN_ORBITS = process.argv.includes('--scan-orbits');
const MP_PATH = path.join(__dirname, '..', '..', 'public', 'input', 'model-parameters.json');

const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const freePlanets = ['jupiter', 'saturn', 'uranus', 'neptune'];

// ── Helpers ────────────────────────────────────────────────────

function getOrbitalParams(solarYearOverrides) {
  // Returns { mass, sma, d, phase } for all planets
  // sma from Kepler's 3rd law: a = (P/P_earth)^(2/3)
  const params = {};
  for (const p of planets) {
    const solarYear = solarYearOverrides[p] || (p === 'earth'
      ? C.meanSolarYearDays
      : C.planets[p].solarYearInput);
    const a = Math.pow(solarYear / C.meanSolarYearDays, 2 / 3);
    params[p] = {
      mass: C.massFraction[p],
      sma: a,
      d: p === 'earth' ? 3 : C.planets[p].fibonacciD,
      phase: p === 'earth' ? 203 : (p === 'saturn' ? 23 : 203),
    };
  }
  return params;
}

function computeBalances(ecc, params) {
  let w203 = 0, w23 = 0, v203 = 0, v23 = 0;
  for (const p of planets) {
    const { mass, sma, d, phase } = params[p];
    const e = ecc[p];
    const w = Math.sqrt(mass * sma * (1 - e * e)) / d;
    const v = Math.sqrt(mass) * Math.pow(sma, 1.5) * e / Math.sqrt(d);
    if (phase === 203) { w203 += w; v203 += v; }
    else { w23 += w; v23 += v; }
  }
  const wTotal = w203 + w23;
  const vTotal = v203 + v23;
  return {
    inclBalance: (1 - Math.abs(w203 - w23) / wTotal) * 100,
    eccBalance: (1 - Math.abs(v203 - v23) / vTotal) * 100,
    inclGap: w203 - w23,
    eccGap: v203 - v23,
  };
}

// Solve for Saturn + Neptune given Jupiter + Uranus eccentricities
// Uses Newton's method (2 equations, 2 unknowns)
function solveSaturnNeptune(jupE, uraE, fixedEcc, params) {
  let satE = 0.054;
  let nepE = 0.0087;

  for (let iter = 0; iter < 100; iter++) {
    const ecc = { ...fixedEcc, jupiter: jupE, saturn: satE, uranus: uraE, neptune: nepE };
    const { inclGap, eccGap } = computeBalances(ecc, params);

    if (Math.abs(inclGap) < 1e-18 && Math.abs(eccGap) < 1e-18) break;

    // Numerical Jacobian
    const h = 1e-10;
    const ecc_ds = { ...ecc, saturn: satE + h };
    const ecc_dn = { ...ecc, neptune: nepE + h };
    const b_ds = computeBalances(ecc_ds, params);
    const b_dn = computeBalances(ecc_dn, params);

    const dw_ds = (b_ds.inclGap - inclGap) / h;
    const dw_dn = (b_dn.inclGap - inclGap) / h;
    const dv_ds = (b_ds.eccGap - eccGap) / h;
    const dv_dn = (b_dn.eccGap - eccGap) / h;

    const det = dw_ds * dv_dn - dw_dn * dv_ds;
    if (Math.abs(det) < 1e-30) break;

    satE -= (dv_dn * inclGap - dw_dn * eccGap) / det;
    nepE -= (-dv_ds * inclGap + dw_ds * eccGap) / det;
  }

  return { saturn: satE, neptune: nepE };
}

// Compute J2000 RMS error for all free planets
function j2000Error(ecc) {
  let sumSq = 0;
  for (const p of freePlanets) {
    const j2k = C.planets[p].orbitalEccentricityJ2000;
    const err = (ecc[p] - j2k) / j2k;
    sumSq += err * err;
  }
  return Math.sqrt(sumSq / freePlanets.length) * 100; // RMS %
}

function maxJ2000Err(ecc) {
  let maxErr = 0;
  for (const p of freePlanets) {
    const j2k = C.planets[p].orbitalEccentricityJ2000;
    const err = Math.abs((ecc[p] - j2k) / j2k) * 100;
    if (err > maxErr) maxErr = err;
  }
  return maxErr;
}

// ── Main ───────────────────────────────────────────────────────

console.log('═══ Dual Balance Optimizer ═══');
console.log('');

const fixedEcc = {
  mercury: C.planets.mercury.orbitalEccentricityBase,
  venus: C.planets.venus.orbitalEccentricityBase,
  earth: C.eccentricityBase,
  mars: C.planets.mars.orbitalEccentricityBase,
};

// ── Step 1: Current state ──────────────────────────────────────

const defaultParams = getOrbitalParams({});
const currentEcc = { ...fixedEcc };
for (const p of freePlanets) currentEcc[p] = C.planets[p].orbitalEccentricityBase;
const currentBal = computeBalances(currentEcc, defaultParams);

console.log('  Current state:');
console.log(`    Inclination balance: ${currentBal.inclBalance.toFixed(6)}%`);
console.log(`    Eccentricity balance: ${currentBal.eccBalance.toFixed(6)}%`);
console.log(`    J2000 RMS error: ${j2000Error(currentEcc).toFixed(4)}%`);
console.log('');

// ── Step 2: Optimize with default solarYearInput ───────────────

// Scan Jupiter and Uranus around J2000 to find best dual-balance
let bestMaxErr = 999;
let bestSolution = null;

const jupJ2k = C.planets.jupiter.orbitalEccentricityJ2000;
const uraJ2k = C.planets.uranus.orbitalEccentricityJ2000;

for (let jOff = -0.001; jOff <= 0.001; jOff += 0.00005) {
  for (let uOff = -0.001; uOff <= 0.001; uOff += 0.00005) {
    const jupE = jupJ2k + jOff;
    const uraE = uraJ2k + uOff;
    const solved = solveSaturnNeptune(jupE, uraE, fixedEcc, defaultParams);

    if (solved.saturn < 0.01 || solved.saturn > 0.1 ||
        solved.neptune < 0.001 || solved.neptune > 0.02) continue;

    const ecc = { ...fixedEcc, jupiter: jupE, saturn: solved.saturn, uranus: uraE, neptune: solved.neptune };
    const bal = computeBalances(ecc, defaultParams);

    if (bal.inclBalance < 99.9999 || bal.eccBalance < 99.9999) continue;

    const maxErr = maxJ2000Err(ecc);
    if (maxErr < bestMaxErr) {
      bestMaxErr = maxErr;
      bestSolution = { ...ecc, _params: defaultParams, _solarYearOverrides: {} };
    }
  }
}

console.log('  Dual-balance solution (solarYearInput unchanged):');
printSolution(bestSolution, defaultParams);

// ── Step 3: Scan ±1 orbit count (optional) ─────────────────────

if (SCAN_ORBITS) {
  console.log('');
  console.log('  ═══ Scanning ±1 orbit count per planet ═══');
  console.log('');

  const scanPlanets = ['jupiter', 'saturn', 'uranus', 'neptune'];

  for (const scanPlanet of scanPlanets) {
    const currentSY = C.planets[scanPlanet].solarYearInput;
    const currentCount = Math.round(C.H * C.meanSolarYearDays / currentSY);

    for (const delta of [-1, 0, +1]) {
      const newCount = currentCount + delta;
      const newSY = C.H * C.meanSolarYearDays / newCount;
      const overrides = { [scanPlanet]: newSY };
      const params = getOrbitalParams(overrides);

      // Re-optimize for this orbit count
      let localBest = null;
      let localBestErr = 999;

      for (let jOff = -0.0005; jOff <= 0.0005; jOff += 0.0001) {
        for (let uOff = -0.0005; uOff <= 0.0005; uOff += 0.0001) {
          const jupE = jupJ2k + jOff;
          const uraE = uraJ2k + uOff;
          const solved = solveSaturnNeptune(jupE, uraE, fixedEcc, params);

          if (solved.saturn < 0.01 || solved.saturn > 0.1 ||
              solved.neptune < 0.001 || solved.neptune > 0.02) continue;

          const ecc = { ...fixedEcc, jupiter: jupE, saturn: solved.saturn, uranus: uraE, neptune: solved.neptune };
          const bal = computeBalances(ecc, params);
          if (bal.inclBalance < 99.9999 || bal.eccBalance < 99.9999) continue;

          const maxErr = maxJ2000Err(ecc);
          if (maxErr < localBestErr) {
            localBestErr = maxErr;
            localBest = { ...ecc, _params: params, _solarYearOverrides: overrides };
          }
        }
      }

      const marker = delta === 0 ? ' ← current' : '';
      const improvement = localBest && localBestErr < bestMaxErr ? ' ★ BETTER' : '';
      console.log(`    ${scanPlanet} count ${newCount} (Δ${delta >= 0 ? '+' : ''}${delta}): max J2000 err = ${localBestErr < 999 ? localBestErr.toFixed(3) + '%' : 'N/A'}${marker}${improvement}`);

      if (localBest && localBestErr < bestMaxErr) {
        bestMaxErr = localBestErr;
        bestSolution = localBest;
      }
    }
    console.log('');
  }

  if (bestSolution._solarYearOverrides && Object.keys(bestSolution._solarYearOverrides).length > 0) {
    console.log('  Best solution includes orbit count change:');
    for (const [p, sy] of Object.entries(bestSolution._solarYearOverrides)) {
      const oldSY = C.planets[p].solarYearInput;
      console.log(`    ${p}: solarYearInput ${oldSY} → ${sy.toFixed(4)}`);
    }
    console.log('');
    printSolution(bestSolution, bestSolution._params);
  } else {
    console.log('  No orbit count change improves the solution.');
  }
}

// ── Step 4: Write ──────────────────────────────────────────────

if (!bestSolution) {
  console.log('\n  ✗ No dual-balance solution found.\n');
  process.exit(1);
}

if (!WRITE) {
  console.log(`\n  Run with --write to apply. Add --scan-orbits to also test ±1 orbit counts.\n`);
  process.exit(0);
}

const mp = JSON.parse(fs.readFileSync(MP_PATH, 'utf8'));

for (const p of freePlanets) {
  mp.planets[p].orbitalEccentricityBase = bestSolution[p];
}

// Update solarYearInput if orbit count changed
if (bestSolution._solarYearOverrides) {
  for (const [p, sy] of Object.entries(bestSolution._solarYearOverrides)) {
    // solarYearInput is in astro-reference.json, not model-parameters
    // Just report — user needs to update manually
    console.log(`  ⚠ ${p} solarYearInput change requires manual update to astro-reference.json`);
  }
}

fs.writeFileSync(MP_PATH, JSON.stringify(mp, null, 2) + '\n');
console.log('  ✓ Updated model-parameters.json with dual-balance eccentricities');
console.log('  Next: run export-to-script.js --write to sync to script.js\n');

// ── Print helper ───────────────────────────────────────────────

function printSolution(sol, params) {
  if (!sol) { console.log('    No solution found.'); return; }

  const bal = computeBalances(sol, params);
  console.log(`    Inclination balance: ${bal.inclBalance.toFixed(10)}%`);
  console.log(`    Eccentricity balance: ${bal.eccBalance.toFixed(10)}%`);
  console.log(`    J2000 RMS error: ${j2000Error(sol).toFixed(4)}%`);
  console.log(`    J2000 max error: ${maxJ2000Err(sol).toFixed(4)}%`);
  console.log('');
  console.log(`    ${'Planet'.padEnd(12)}│ ${'Dual-bal base'.padStart(12)} │ ${'Current base'.padStart(12)} │ ${'J2000'.padStart(12)} │ ${'vs J2000'.padStart(9)} │ ${'vs Current'.padStart(10)}`);
  console.log('    ' + '─'.repeat(78));

  for (const p of planets) {
    const eNew = sol[p];
    const eCur = p === 'earth' ? C.eccentricityBase : C.planets[p].orbitalEccentricityBase;
    const eJ2k = p === 'earth' ? C.eccJ2000.earth : C.planets[p].orbitalEccentricityJ2000;
    const changed = freePlanets.includes(p) && Math.abs(eNew - eCur) > 1e-10;
    const marker = changed ? ' ←' : '';
    console.log(
      '    ' + p.padEnd(12) + '│ ' +
      eNew.toFixed(8).padStart(12) + ' │ ' +
      eCur.toFixed(8).padStart(12) + ' │ ' +
      eJ2k.toFixed(8).padStart(12) + ' │ ' +
      ((eNew / eJ2k - 1) * 100 >= 0 ? '+' : '') + ((eNew / eJ2k - 1) * 100).toFixed(3) + '%'.padEnd(3) + ' │ ' +
      ((eNew / eCur - 1) * 100 >= 0 ? '+' : '') + ((eNew / eCur - 1) * 100).toFixed(3) + '%' + marker
    );
  }
}
