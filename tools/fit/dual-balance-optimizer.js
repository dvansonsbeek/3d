#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// Dual Balance Verification + Sensitivity Analysis (Pipeline Step 7b)
//
// Verifies the dual balance (inclination + eccentricity) using
// the phase-derived base eccentricities from constants.js.
// Base eccentricities are derived at runtime from the balanced-year
// phase — this script does NOT set them.
//
// Outputs four sections:
//   1. Current state (using phase-derived bases from constants.js)
//   2. Forced 100%/100% solution (eccentricity-only optimizer, comparison)
//   3. Per-planet contribution to current balance gaps (diagnostic)
//   4. Per-planet sensitivity table — Δm/m, Δa/a, Δe/e shifts that
//      would close eccentricity balance to 100%, holding all other
//      parameters fixed. Sensitivity analysis only — DE440 masses and
//      orbital periods are observed to <1e-7 precision, so a non-trivial
//      shift implies the framework needs an additional contribution
//      (asteroids, TNOs, etc.) rather than that observed values are wrong.
//
// Usage:
//   node tools/fit/dual-balance-optimizer.js
//   node tools/fit/dual-balance-optimizer.js --scan-orbits
//
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const SCAN_ORBITS = process.argv.includes('--scan-orbits');

const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const freePlanets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

// ── Helpers ────────────────────────────────────────────────────

function getOrbitalParams(solarYearOverrides) {
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
      antiPhase: p === 'earth' ? false : (C.planets[p].antiPhase || false),
    };
  }
  return params;
}

function computeBalances(ecc, params) {
  let w203 = 0, w23 = 0, v203 = 0, v23 = 0;
  for (const p of planets) {
    const { mass, sma, d, antiPhase } = params[p];
    const e = ecc[p];
    const w = Math.sqrt(mass * sma * (1 - e * e)) / d;
    const v = Math.sqrt(mass) * Math.pow(sma, 1.5) * e / Math.sqrt(d);
    if (!antiPhase) { w203 += w; v203 += v; }
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

// Solve for Saturn + Neptune given all other eccentricities
// Uses Newton's method (2 equations, 2 unknowns)
function solveSaturnNeptune(gridEcc, fixedEcc, params) {
  let satE = 0.054;
  let nepE = 0.0087;

  for (let iter = 0; iter < 100; iter++) {
    const ecc = { ...fixedEcc, ...gridEcc, saturn: satE, neptune: nepE };
    const { inclGap, eccGap } = computeBalances(ecc, params);

    if (Math.abs(inclGap) < 1e-18 && Math.abs(eccGap) < 1e-18) break;

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

// J2000 reference values
const j2k = {};
for (const p of planets) {
  j2k[p] = p === 'earth' ? C.eccJ2000.earth : C.planets[p].orbitalEccentricityJ2000;
}

// Compute max J2000 error across all free planets
function maxJ2000Err(ecc) {
  let maxErr = 0;
  for (const p of freePlanets) {
    const err = Math.abs((ecc[p] - j2k[p]) / j2k[p]) * 100;
    if (err > maxErr) maxErr = err;
  }
  return maxErr;
}

function rmsJ2000Err(ecc) {
  let sumSq = 0;
  for (const p of freePlanets) {
    const err = (ecc[p] - j2k[p]) / j2k[p];
    sumSq += err * err;
  }
  return Math.sqrt(sumSq / freePlanets.length) * 100;
}

// ── Grid search ───────────────────────────────────────────────

function optimize(params, fixedEcc) {
  // Offsets around J2000 for each grid planet
  // Range scaled by amplitude significance: wider for planets with larger amp/base ratio
  const offsets = {
    mercury: [-0.0003, -0.0002, -0.0001, 0, 0.0001, 0.0002, 0.0003],
    venus:   [-0.001, -0.0005, -0.0002, 0, 0.0002, 0.0005, 0.001],
    mars:    [-0.002, -0.001, -0.0005, 0, 0.0005, 0.001, 0.002],
    jupiter: [-0.0005, -0.0002, 0, 0.0002, 0.0005],
    uranus:  [-0.0005, -0.0002, 0, 0.0002, 0.0005],
  };

  let bestMaxErr = 999;
  let bestSolution = null;
  let tested = 0;

  for (const mOff of offsets.mercury) {
    for (const vOff of offsets.venus) {
      for (const maOff of offsets.mars) {
        for (const jOff of offsets.jupiter) {
          for (const uOff of offsets.uranus) {
            const gridEcc = {
              mercury: j2k.mercury + mOff,
              venus: j2k.venus + vOff,
              mars: j2k.mars + maOff,
              jupiter: j2k.jupiter + jOff,
              uranus: j2k.uranus + uOff,
            };

            const solved = solveSaturnNeptune(gridEcc, fixedEcc, params);

            if (solved.saturn < 0.01 || solved.saturn > 0.1 ||
                solved.neptune < 0.001 || solved.neptune > 0.02) continue;

            const ecc = { ...fixedEcc, ...gridEcc, saturn: solved.saturn, neptune: solved.neptune };
            const bal = computeBalances(ecc, params);
            if (bal.inclBalance < 99.9999 || bal.eccBalance < 99.9999) continue;

            const maxErr = maxJ2000Err(ecc);
            if (maxErr < bestMaxErr) {
              bestMaxErr = maxErr;
              bestSolution = { ...ecc };
            }
            tested++;
          }
        }
      }
    }
  }

  return { bestSolution, bestMaxErr, tested };
}

// ── Main ───────────────────────────────────────────────────────

console.log('═══ Dual Balance Optimizer ═══');
console.log('');
console.log('  Fixed: Earth (Sun optimizer)');
console.log('  Grid:  Mercury, Venus, Mars, Jupiter, Uranus');
console.log('  Solve: Saturn + Neptune (Newton, 2 eq / 2 unknowns)');
console.log('');

const fixedEcc = { earth: C.eccentricityBase };

// ── Step 1: Current state ──────────────────────────────────────

const defaultParams = getOrbitalParams({});
const currentEcc = { ...fixedEcc };
for (const p of freePlanets) currentEcc[p] = C.planets[p].orbitalEccentricityBase;
const currentBal = computeBalances(currentEcc, defaultParams);

console.log('  Current state:');
console.log(`    Inclination balance: ${currentBal.inclBalance.toFixed(6)}%`);
console.log(`    Eccentricity balance: ${currentBal.eccBalance.toFixed(6)}%`);
console.log(`    J2000 RMS error: ${rmsJ2000Err(currentEcc).toFixed(4)}%`);
console.log(`    J2000 max error: ${maxJ2000Err(currentEcc).toFixed(4)}%`);
console.log('');

// ── Step 2: Optimize with default solarYearInput ───────────────

const { bestSolution, bestMaxErr, tested } = optimize(defaultParams, fixedEcc);

console.log(`  Tested ${tested.toLocaleString()} combinations`);
console.log('');
console.log('  Dual-balance solution (solarYearInput unchanged):');
printSolution(bestSolution, defaultParams);

// ── Step 3: Scan ±1 orbit count (optional) ─────────────────────

let finalSolution = bestSolution;
let finalMaxErr = bestMaxErr;

if (SCAN_ORBITS) {
  console.log('');
  console.log('  ═══ Scanning ±1 orbit count per outer planet ═══');
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

      const result = optimize(params, fixedEcc);

      const marker = delta === 0 ? ' ← current' : '';
      const improvement = result.bestSolution && result.bestMaxErr < finalMaxErr ? ' ★ BETTER' : '';
      console.log(`    ${scanPlanet} count ${newCount} (Δ${delta >= 0 ? '+' : ''}${delta}): max J2000 err = ${result.bestMaxErr < 999 ? result.bestMaxErr.toFixed(3) + '%' : 'N/A'}${marker}${improvement}`);

      if (result.bestSolution && result.bestMaxErr < finalMaxErr) {
        finalMaxErr = result.bestMaxErr;
        finalSolution = { ...result.bestSolution, _solarYearOverrides: overrides };
      }
    }
    console.log('');
  }

  if (finalSolution._solarYearOverrides && Object.keys(finalSolution._solarYearOverrides).length > 0) {
    console.log('  Best solution includes orbit count change:');
    for (const [p, sy] of Object.entries(finalSolution._solarYearOverrides)) {
      const oldSY = C.planets[p].solarYearInput;
      console.log(`    ${p}: solarYearInput ${oldSY} → ${sy.toFixed(4)}`);
    }
    console.log('');
    printSolution(finalSolution, getOrbitalParams(finalSolution._solarYearOverrides));
  } else {
    console.log('  No orbit count change improves the solution.');
  }
}

// ── Summary ───────────────────────────────────────────────────

if (!finalSolution) {
  console.log('\n  ✗ No dual-balance solution found.\n');
  process.exit(1);
}

console.log('');
console.log('  Note: Base eccentricities are derived at runtime from the');
console.log('  balanced-year phase (constants.js). The optimizer solution above');
console.log('  shows what forced 100% balance would require — for comparison only.');
console.log('');

// ── Section 3: Per-planet contribution to current balance gaps ───
//
// Decomposes the in-phase and anti-phase sums into per-planet shares,
// so it's visible which planet contributes most to each balance group.

console.log('═══ Section 3: Per-planet contribution to current balance gaps ═══');
console.log('');

(function showContributionGap() {
  let w203 = 0, w23 = 0, v203 = 0, v23 = 0;
  const rows = [];
  for (const p of planets) {
    const { mass, sma, d, antiPhase } = defaultParams[p];
    const e = currentEcc[p];
    const w = Math.sqrt(mass * sma * (1 - e * e)) / d;
    const v = Math.sqrt(mass) * Math.pow(sma, 1.5) * e / Math.sqrt(d);
    rows.push({ p, w, v, antiPhase });
    if (!antiPhase) { w203 += w; v203 += v; }
    else { w23 += w; v23 += v; }
  }
  const wGap = w203 - w23;
  const vGap = v203 - v23;

  console.log(`  Inclination:  in-phase Σw = ${w203.toFixed(8)}   anti-phase Σw = ${w23.toFixed(8)}   gap = ${wGap.toExponential(3)}`);
  console.log(`  Eccentricity: in-phase Σv = ${v203.toFixed(8)}   anti-phase Σv = ${v23.toFixed(8)}   gap = ${vGap.toExponential(3)}`);
  console.log('');
  console.log('  ' + 'Planet'.padEnd(10) + ' │ group │       w       │ % of group │       v       │ % of group');
  console.log('  ' + '─'.repeat(78));
  for (const { p, w, v, antiPhase } of rows) {
    const groupW = antiPhase ? w23 : w203;
    const groupV = antiPhase ? v23 : v203;
    console.log(
      '  ' + p.padEnd(10) + ' │ ' + (antiPhase ? 'anti' : 'in  ') +
      '  │ ' + w.toFixed(8).padStart(13) +
      ' │ ' + (w / groupW * 100).toFixed(2).padStart(8) + '%' +
      ' │ ' + v.toFixed(8).padStart(13) +
      ' │ ' + (v / groupV * 100).toFixed(2).padStart(8) + '%'
    );
  }
  console.log('');
})();

// ── Section 4: Per-planet sensitivity to close eccentricity balance ──
//
// For each free planet, computes the single-parameter shift required
// to close the eccentricity-balance gap to exactly 100%, holding all
// other planets and other parameters fixed. Also reports the side-effect
// on inclination balance.

console.log('═══ Section 4: Per-planet sensitivity to close eccentricity balance ═══');
console.log('');
console.log('  "If only this planet\'s single parameter could change, what shift would');
console.log('   close the ecc-balance gap to 100%? What does it do to incl balance?"');
console.log('');

(function showSensitivityTable() {
  // Recompute per-planet w, v and the signed gap
  let w203 = 0, w23 = 0, v203 = 0, v23 = 0;
  const pv = {};
  for (const p of planets) {
    const { mass, sma, d, antiPhase } = defaultParams[p];
    const e = currentEcc[p];
    const w = Math.sqrt(mass * sma * (1 - e * e)) / d;
    const v = Math.sqrt(mass) * Math.pow(sma, 1.5) * e / Math.sqrt(d);
    pv[p] = { w, v, antiPhase };
    if (!antiPhase) { w203 += w; v203 += v; }
    else { w23 += w; v23 += v; }
  }
  const wGap = w203 - w23;
  const vGap = v203 - v23;   // signed: positive ⇒ in-phase Σv exceeds anti-phase Σv

  const eccBal = (1 - Math.abs(vGap) / (v203 + v23)) * 100;
  const inclBal = (1 - Math.abs(wGap) / (w203 + w23)) * 100;
  console.log(`  Current eccentricity balance: ${eccBal.toFixed(6)}%   (signed gap = ${vGap.toExponential(3)})`);
  console.log(`  Current inclination balance:  ${inclBal.toFixed(6)}%   (signed gap = ${wGap.toExponential(3)})`);
  console.log('');
  console.log('  ' + 'Planet'.padEnd(10) + ' │ grp  │   Δm/m    │   Δa/a    │   Δe/e    │ ΔinclBal (m)│ ΔinclBal (a)│ ΔinclBal (e)');
  console.log('  ' + '─'.repeat(108));

  for (const p of freePlanets) {
    const { w, v, antiPhase } = pv[p];
    // To close ecc balance:
    //   if in-phase  → planet's v must decrease by vGap (Δv = -vGap)
    //   if anti-phase → planet's v must increase by vGap (Δv = +vGap)
    const needed_dv = antiPhase ? +vGap : -vGap;

    // Δm/m = 2·Δv/v          (since dv/dm = v/(2m))
    const dm_over_m = 2 * needed_dv / v;
    // Δa/a = (2/3)·Δv/v       (since dv/da = 1.5·v/a)
    const da_over_a = (2 / 3) * needed_dv / v;
    // Δe/e = Δv/v             (since dv/de = v/e)
    const de_over_e = needed_dv / v;

    // Side-effect on inclination balance:
    // Δw from a Δm/m shift  =  (Δm/m) · w/2
    // Δw from a Δa/a shift  =  (Δa/a) · w/2
    // Δw from a Δe/e shift  ≈  -e²·(Δe/e)·w  (negligible for small e)
    const dw_m = dm_over_m * w / 2;
    const dw_a = da_over_a * w / 2;
    const e_p = currentEcc[p];
    const dw_e = -(e_p * e_p) * de_over_e * w / (1 - e_p * e_p);

    // New incl gap after each shift (sign depends on phase group)
    const wGapAfter = (sign) => (antiPhase ? wGap - sign : wGap + sign);
    const inclBalAfter = (signed_dw) => {
      const newGap = wGapAfter(signed_dw);
      const newTotal = (w203 + w23) + (antiPhase ? signed_dw : signed_dw);
      return (1 - Math.abs(newGap) / newTotal) * 100;
    };

    const inclBal_m = inclBalAfter(dw_m);
    const inclBal_a = inclBalAfter(dw_a);
    const inclBal_e = inclBalAfter(dw_e);

    const fmtPct = (x) => (x >= 0 ? '+' : '') + (x * 100).toFixed(3) + '%';
    const fmtDeltaBal = (newBal) => {
      const delta = newBal - inclBal;
      return (delta >= 0 ? '+' : '') + delta.toExponential(2);
    };

    console.log(
      '  ' + p.padEnd(10) + ' │ ' + (antiPhase ? 'anti' : 'in  ') +
      ' │ ' + fmtPct(dm_over_m).padStart(9) +
      ' │ ' + fmtPct(da_over_a).padStart(9) +
      ' │ ' + fmtPct(de_over_e).padStart(9) +
      ' │ ' + fmtDeltaBal(inclBal_m).padStart(11) +
      ' │ ' + fmtDeltaBal(inclBal_a).padStart(11) +
      ' │ ' + fmtDeltaBal(inclBal_e).padStart(11)
    );
  }

  console.log('');
  console.log('  Sensitivity readings:');
  console.log('  • Δe/e — most physically defensible. Base eccentricity is a framework-derived');
  console.log('    quantity (not directly observed). Side-effect on incl balance is negligible.');
  console.log('  • Δa/a — leverages a^(3/2) in v. ~2/3 the size of Δe/e for the same v-shift,');
  console.log('    but a (orbital period) is observed to <1e-9 precision, so any non-trivial Δa');
  console.log('    is a sensitivity reading, not a prediction. Side-effect on incl balance non-zero.');
  console.log('  • Δm/m — twice the size of Δe/e for the same v-shift. DE440 masses are observed');
  console.log('    to ~1e-7 precision, so Δm/m sensitivity values indicate by how much the framework');
  console.log('    would have to be "wrong" about mass to close balance via that channel alone.');
  console.log('');
  console.log('  Implication of non-trivial sensitivities: the framework\'s 0.14% ecc-balance gap');
  console.log('  is NOT attributable to a single planet\'s observed mass or period being off — both');
  console.log('  are known far below the required shift. The gap therefore reflects either (a) a');
  console.log('  small framework-level imperfection in the phase-derived base eccentricities, or');
  console.log('  (b) the absence of additional gravitating bodies (asteroids, TNOs, dust) in the');
  console.log('  balance equation. The latter is the natural next analysis step.');
  console.log('');
})();

// ── Print helper ───────────────────────────────────────────────

function printSolution(sol, params) {
  if (!sol) { console.log('    No solution found.'); return; }

  const bal = computeBalances(sol, params);
  console.log(`    Inclination balance: ${bal.inclBalance.toFixed(10)}%`);
  console.log(`    Eccentricity balance: ${bal.eccBalance.toFixed(10)}%`);
  console.log(`    J2000 RMS error: ${rmsJ2000Err(sol).toFixed(4)}%`);
  console.log(`    J2000 max error: ${maxJ2000Err(sol).toFixed(4)}%`);
  console.log('');

  // Venus R value
  const PSI = C.PSI;
  const R = PSI / (sol.venus * Math.sqrt(C.massFraction.venus));
  console.log(`    Venus R = ψ/(e_V×√m_V) = ${R.toFixed(4)}`);
  console.log('');

  console.log(`    ${'Planet'.padEnd(12)}│ ${'Dual-bal base'.padStart(12)} │ ${'Current base'.padStart(12)} │ ${'J2000'.padStart(12)} │ ${'vs J2000'.padStart(9)} │ ${'vs Current'.padStart(10)}`);
  console.log('    ' + '─'.repeat(78));

  for (const p of planets) {
    const eNew = sol[p];
    const eCur = p === 'earth' ? C.eccentricityBase : C.planets[p].orbitalEccentricityBase;
    const eJ2k = j2k[p];
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
