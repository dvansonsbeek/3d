// ═══════════════════════════════════════════════════════════════════════════
// VECTOR BALANCE SCAN OF ALL 743 BALANCE PRESETS
// ═══════════════════════════════════════════════════════════════════════════
//
// Each of the 743 presets in balance-presets.json has ≥99.994% SCALAR
// inclination balance. This script tests which of them ALSO achieve high
// VECTOR balance stability (locked nodes, over full 8H).
//
// The sweet spot: a configuration with BOTH high scalar AND high vector
// balance would prove that the Fibonacci structure maintains the invariable
// plane dynamically — not just statically.
//
// Usage: node tools/explore/vector-balance-preset-scan.js
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');
const fs = require('fs');
const path = require('path');

const H = C.H;
const balancedYear = C.balancedYear;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const genPrec = H / 13;
const SUPER_PERIOD = 8 * H;
const PLANET_KEYS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

// Load presets
const presetsPath = path.resolve(__dirname, '..', '..', 'data', 'balance-presets.json');
const presetsData = JSON.parse(fs.readFileSync(presetsPath, 'utf8'));
const presets = presetsData.presets;

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║     VECTOR BALANCE SCAN — ALL 743 BALANCE PRESETS                       ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝');
console.log(`\nLoaded ${presets.length} presets (threshold: ≥${presetsData.threshold}% scalar balance)`);
console.log('');

// ═══════════════════════════════════════════════════════════════════════════

function buildFromPreset(row, ascRateMode) {
  // row: [scenario, balance, me_d, me_phase, ve_d, ve_phase, ma_d, ma_phase,
  //       ju_d, ju_phase, sa_d, sa_phase, ur_d, ur_phase, ne_d, ne_phase]
  const config = {
    mercury: { d: row[2], antiPhase: row[3] === 1 },
    venus:   { d: row[4], antiPhase: row[5] === 1 },
    earth:   { d: 3, antiPhase: false },
    mars:    { d: row[6], antiPhase: row[7] === 1 },
    jupiter: { d: row[8], antiPhase: row[9] === 1 },
    saturn:  { d: row[10], antiPhase: row[11] === 1 },
    uranus:  { d: row[12], antiPhase: row[13] === 1 },
    neptune: { d: row[14], antiPhase: row[15] === 1 },
  };

  const planets = {};
  for (const key of PLANET_KEYS) {
    const p = key === 'earth' ? null : C.planets[key];
    const pd = {
      name: key.charAt(0).toUpperCase() + key.slice(1),
      mass: C.massFraction[key],
      sma: key === 'earth' ? 1.0 : C.derived[key].orbitDistance,
      ecc: C.eccJ2000[key],
      eclP: key === 'earth' ? H / 16 : p.perihelionEclipticYears,
      periLong: key === 'earth' ? C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 : p.longitudePerihelion,
      inclJ2000: key === 'earth' ? C.ASTRO_REFERENCE.earthInclinationJ2000_deg : p.invPlaneInclinationJ2000,
      omegaJ2000: key === 'earth' ? C.ASTRO_REFERENCE.earthAscendingNodeInvPlane : p.ascendingNodeInvPlane,
      d: config[key].d,
      antiPhase: config[key].antiPhase,
    };

    pd.icrfP = key === 'earth' ? H / 3 : 1 / (1 / pd.eclP - 1 / genPrec);
    pd.icrfRate = 360 / pd.icrfP;
    pd.amp = PSI / (pd.d * Math.sqrt(pd.mass));
    pd.L = pd.mass * Math.sqrt(pd.sma * (1 - pd.ecc * pd.ecc));

    // Ascending node rate
    if (ascRateMode === 'locked') {
      pd.ascNodeRate = -360 * 55 / SUPER_PERIOD;  // all locked at 55
    } else {
      const defaultCycles = key === 'earth' ? 40 : p.ascendingNodeCyclesIn8H;
      pd.ascNodeRate = -360 * defaultCycles / SUPER_PERIOD;
    }

    // Derive phase angle from balanced year
    const periAtBY = ((pd.periLong + pd.icrfRate * (balancedYear - 2000)) % 360 + 360) % 360;
    pd.phaseAngle = config[key].antiPhase ? periAtBY : ((periAtBY - 180 + 360) % 360);

    const antiSign = pd.antiPhase ? -1 : 1;
    const cosJ2000 = Math.cos((pd.periLong - pd.phaseAngle) * DEG2RAD);
    pd.mean = pd.inclJ2000 - antiSign * pd.amp * cosJ2000;

    planets[key] = pd;
  }
  return { planets, config };
}

function measureStability(planets, nSamples) {
  const step = SUPER_PERIOD / nSamples;
  let min = 100, max = 0, sum = 0;
  for (let i = 0; i <= nSamples; i++) {
    const year = balancedYear + i * step;
    let sumX = 0, sumY = 0, totalMag = 0;
    for (const key of PLANET_KEYS) {
      const p = planets[key];
      const antiSign = p.antiPhase ? -1 : 1;
      const peri = p.periLong + p.icrfRate * (year - 2000);
      const incl = p.mean + antiSign * p.amp * Math.cos((peri - p.phaseAngle) * DEG2RAD);
      const omega = (p.omegaJ2000 + p.ascNodeRate * (year - 2000)) * DEG2RAD;
      const mag = p.L * Math.sin(incl * DEG2RAD);
      sumX += mag * Math.cos(omega);
      sumY += mag * Math.sin(omega);
      totalMag += Math.abs(mag);
    }
    const residual = Math.sqrt(sumX * sumX + sumY * sumY);
    const bal = totalMag > 0 ? (1 - residual / totalMag) * 100 : 100;
    sum += bal;
    if (bal < min) min = bal;
    if (bal > max) max = bal;
  }
  return { min, max, mean: sum / (nSamples + 1), variation: max - min };
}

function checkLL(planets) {
  const llBounds = {
    mercury: { min: 4.57, max: 9.86 }, venus: { min: 0.00, max: 3.38 },
    earth: { min: 0.00, max: 2.95 }, mars: { min: 0.00, max: 5.84 },
    jupiter: { min: 0.241, max: 0.489 }, saturn: { min: 0.797, max: 1.02 },
    uranus: { min: 0.902, max: 1.11 }, neptune: { min: 0.554, max: 0.800 },
  };
  let pass = 0, fail = [];
  for (const key of PLANET_KEYS) {
    const p = planets[key];
    const ll = llBounds[key];
    if (p.mean - p.amp >= ll.min - 0.01 && p.mean + p.amp <= ll.max + 0.01) pass++;
    else fail.push(key);
  }
  return { pass, fail };
}

// ═══════════════════════════════════════════════════════════════════════════
// SCAN ALL PRESETS WITH LOCKED NODES
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('PHASE 1: SCAN ALL 743 PRESETS WITH LOCKED NODES');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const results = [];

for (let i = 0; i < presets.length; i++) {
  const row = presets[i];
  const { planets, config } = buildFromPreset(row, 'locked');
  const stab = measureStability(planets, 100);
  const ll = checkLL(planets);

  const antiPlanets = PLANET_KEYS.filter(k => config[k].antiPhase);
  const antiLabel = antiPlanets.length === 0 ? '(none)' : antiPlanets.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join('+');

  const dLabel = `Me${config.mercury.d} Ve${config.venus.d} Ma${config.mars.d} Ju${config.jupiter.d} Sa${config.saturn.d} Ur${config.uranus.d} Ne${config.neptune.d}`;

  results.push({
    index: i + 1,
    scenario: row[0],
    scalarBal: row[1],
    dLabel,
    antiLabel,
    llPass: ll.pass,
    llFail: ll.fail,
    vecMin: stab.min,
    vecMean: stab.mean,
    vecVar: stab.variation,
    config,
  });
}

// Sort by vector min balance
results.sort((a, b) => b.vecMin - a.vecMin);

console.log('TOP 40 BY HIGHEST MIN VECTOR BALANCE (locked nodes):');
console.log('');
console.log('Rank │ #    │ Sc │ Anti-phase           │ d-values                              │ LL │ Scalar   │ Vec min  │ Vec mean │ Vec var');
console.log('─────┼──────┼────┼──────────────────────┼───────────────────────────────────────┼────┼──────────┼──────────┼──────────┼─────────');

for (let i = 0; i < Math.min(40, results.length); i++) {
  const r = results[i];
  console.log(
    (i + 1).toString().padStart(4) + ' │ ' +
    r.index.toString().padStart(4) + ' │ ' +
    r.scenario.padStart(2) + ' │ ' +
    r.antiLabel.padEnd(20) + ' │ ' +
    r.dLabel.padEnd(37) + ' │ ' +
    (r.llPass + '/8').padStart(3) + ' │ ' +
    r.scalarBal.toFixed(4).padStart(8) + ' │ ' +
    r.vecMin.toFixed(4).padStart(8) + ' │ ' +
    r.vecMean.toFixed(4).padStart(8) + ' │ ' +
    r.vecVar.toFixed(4).padStart(7)
  );
}

// Filter: LL pass ≥ 7 AND vector min ≥ 90%
const filtered = results.filter(r => r.llPass >= 7 && r.vecMin >= 90);
console.log('');
console.log(`\nConfigs with LL ≥ 7/8 AND vector min ≥ 90%: ${filtered.length} out of ${results.length}`);

if (filtered.length > 0) {
  console.log('');
  console.log('Rank │ #    │ Sc │ Anti-phase           │ d-values                              │ LL │ Scalar   │ Vec min  │ Vec mean │ Vec var');
  console.log('─────┼──────┼────┼──────────────────────┼───────────────────────────────────────┼────┼──────────┼──────────┼──────────┼─────────');

  for (let i = 0; i < Math.min(20, filtered.length); i++) {
    const r = filtered[i];
    console.log(
      (i + 1).toString().padStart(4) + ' │ ' +
      r.index.toString().padStart(4) + ' │ ' +
      r.scenario.padStart(2) + ' │ ' +
      r.antiLabel.padEnd(20) + ' │ ' +
      r.dLabel.padEnd(37) + ' │ ' +
      (r.llPass + '/8').padStart(3) + ' │ ' +
      r.scalarBal.toFixed(4).padStart(8) + ' │ ' +
      r.vecMin.toFixed(4).padStart(8) + ' │ ' +
      r.vecMean.toFixed(4).padStart(8) + ' │ ' +
      r.vecVar.toFixed(4).padStart(7)
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 2: ALSO SCAN WITH DEFAULT (MIXED) NODE RATES
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('PHASE 2: SAME PRESETS WITH DEFAULT (MIXED) NODE RATES');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const results2 = [];

for (let i = 0; i < presets.length; i++) {
  const row = presets[i];
  const { planets, config } = buildFromPreset(row, 'default');
  const stab = measureStability(planets, 100);
  const ll = checkLL(planets);

  const antiPlanets = PLANET_KEYS.filter(k => config[k].antiPhase);
  const antiLabel = antiPlanets.length === 0 ? '(none)' : antiPlanets.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join('+');
  const dLabel = `Me${config.mercury.d} Ve${config.venus.d} Ma${config.mars.d} Ju${config.jupiter.d} Sa${config.saturn.d} Ur${config.uranus.d} Ne${config.neptune.d}`;

  results2.push({
    index: i + 1, scenario: row[0], scalarBal: row[1],
    dLabel, antiLabel, llPass: ll.pass,
    vecMin: stab.min, vecMean: stab.mean, vecVar: stab.variation, config,
  });
}

results2.sort((a, b) => b.vecMin - a.vecMin);

console.log('TOP 40 BY HIGHEST MIN VECTOR BALANCE (default node rates):');
console.log('');
console.log('Rank │ #    │ Sc │ Anti-phase           │ d-values                              │ LL │ Scalar   │ Vec min  │ Vec mean │ Vec var');
console.log('─────┼──────┼────┼──────────────────────┼───────────────────────────────────────┼────┼──────────┼──────────┼──────────┼─────────');

for (let i = 0; i < Math.min(40, results2.length); i++) {
  const r = results2[i];
  console.log(
    (i + 1).toString().padStart(4) + ' │ ' +
    r.index.toString().padStart(4) + ' │ ' +
    r.scenario.padStart(2) + ' │ ' +
    r.antiLabel.padEnd(20) + ' │ ' +
    r.dLabel.padEnd(37) + ' │ ' +
    (r.llPass + '/8').padStart(3) + ' │ ' +
    r.scalarBal.toFixed(4).padStart(8) + ' │ ' +
    r.vecMin.toFixed(4).padStart(8) + ' │ ' +
    r.vecMean.toFixed(4).padStart(8) + ' │ ' +
    r.vecVar.toFixed(4).padStart(7)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 3: CURRENT CONFIG #1 COMPARISON
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('PHASE 3: CURRENT CONFIG #1 COMPARISON');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

// Find Config #1 in results (Me21 Ve34 Ma5 Ju5 Sa3 Ur21 Ne34, Saturn anti-phase)
const config1 = results.find(r =>
  r.config.mercury.d === 21 && r.config.venus.d === 34 &&
  r.config.mars.d === 5 && r.config.jupiter.d === 5 &&
  r.config.saturn.d === 3 && r.config.saturn.antiPhase &&
  r.config.uranus.d === 21 && r.config.neptune.d === 34 &&
  !r.config.mercury.antiPhase && !r.config.jupiter.antiPhase
);

if (config1) {
  const rank = results.indexOf(config1) + 1;
  console.log(`Config #1 rank by vector balance: ${rank} out of ${results.length}`);
  console.log(`  Scalar: ${config1.scalarBal.toFixed(4)}%  Vec min: ${config1.vecMin.toFixed(4)}%  Vec mean: ${config1.vecMean.toFixed(4)}%  Vec var: ${config1.vecVar.toFixed(4)}`);
  console.log(`  LL: ${config1.llPass}/8`);
} else {
  console.log('Config #1 not found in presets (may be preset #1)');
  // Test it directly
  const c1row = presets[0];
  const { planets } = buildFromPreset(c1row, 'locked');
  const stab = measureStability(planets, 200);
  console.log(`  Preset #1: scalar=${c1row[1].toFixed(4)}%  Vec min: ${stab.min.toFixed(4)}%  Vec mean: ${stab.mean.toFixed(4)}%  Vec var: ${stab.variation.toFixed(4)}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 4: DETAILED ANALYSIS OF TOP CONFIGS
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('PHASE 4: DETAILED ANALYSIS OF TOP 5 CONFIGS (locked nodes)');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

for (let i = 0; i < Math.min(5, results.length); i++) {
  const r = results[i];
  const { planets } = buildFromPreset(presets[r.index - 1], 'locked');
  const stab = measureStability(planets, 500);

  console.log(`--- #${i + 1}: Preset ${r.index} (Scenario ${r.scenario}) ---`);
  console.log(`  d-values: ${r.dLabel}`);
  console.log(`  Anti-phase: ${r.antiLabel}`);
  console.log(`  Scalar balance: ${r.scalarBal.toFixed(6)}%`);
  console.log(`  Vector balance: min=${stab.min.toFixed(4)}%, max=${stab.max.toFixed(4)}%, mean=${stab.mean.toFixed(4)}%, var=${stab.variation.toFixed(4)}`);
  console.log(`  LL bounds: ${r.llPass}/8 ${r.llFail.length > 0 ? '(fail: ' + r.llFail.join(', ') + ')' : ''}`);
  console.log('');

  // Per-planet details
  console.log('  Planet     │ d  │ Group     │ Amplitude │ Mean      │ Range              │ LL  │ Pert %');
  console.log('  ───────────┼────┼───────────┼───────────┼───────────┼────────────────────┼─────┼───────');

  let totalPert = 0;
  for (const key of PLANET_KEYS) {
    totalPert += Math.abs(planets[key].L * Math.cos(planets[key].mean * DEG2RAD) * planets[key].amp * DEG2RAD);
  }

  for (const key of PLANET_KEYS) {
    const p = planets[key];
    const pert = Math.abs(p.L * Math.cos(p.mean * DEG2RAD) * p.amp * DEG2RAD);
    const pct = (pert / totalPert * 100).toFixed(1);
    const llB = { mercury: { min: 4.57, max: 9.86 }, venus: { min: 0.00, max: 3.38 }, earth: { min: 0.00, max: 2.95 }, mars: { min: 0.00, max: 5.84 }, jupiter: { min: 0.241, max: 0.489 }, saturn: { min: 0.797, max: 1.02 }, uranus: { min: 0.902, max: 1.11 }, neptune: { min: 0.554, max: 0.800 } };
    const ll = llB[key] && (p.mean - p.amp >= llB[key].min - 0.01 && p.mean + p.amp <= llB[key].max + 0.01);
    console.log(
      '  ' + p.name.padEnd(10) + ' │ ' +
      p.d.toString().padStart(2) + ' │ ' +
      (p.antiPhase ? 'anti-phase' : 'in-phase').padEnd(9) + ' │ ' +
      (p.amp.toFixed(4) + '°').padStart(9) + ' │ ' +
      (p.mean.toFixed(4) + '°').padStart(9) + ' │ ' +
      ((p.mean - p.amp).toFixed(2) + '° – ' + (p.mean + p.amp).toFixed(2) + '°').padStart(18) + ' │ ' +
      (ll ? '  ✓  ' : '  ✗  ') + '│ ' +
      pct.padStart(5)
    );
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log(`Total presets scanned: ${presets.length}`);
console.log(`All have scalar inclination balance ≥ ${presetsData.threshold}%`);
console.log('');

const best = results[0];
console.log(`Best vector balance (locked nodes):`);
console.log(`  Preset #${best.index} (Scenario ${best.scenario}): ${best.dLabel}`);
console.log(`  Anti-phase: ${best.antiLabel}`);
console.log(`  Scalar: ${best.scalarBal.toFixed(4)}%  Vec min: ${best.vecMin.toFixed(4)}%  Vec var: ${best.vecVar.toFixed(4)}`);
console.log(`  LL: ${best.llPass}/8`);

const best2 = results2[0];
console.log('');
console.log(`Best vector balance (default node rates):`);
console.log(`  Preset #${best2.index} (Scenario ${best2.scenario}): ${best2.dLabel}`);
console.log(`  Anti-phase: ${best2.antiLabel}`);
console.log(`  Scalar: ${best2.scalarBal.toFixed(4)}%  Vec min: ${best2.vecMin.toFixed(4)}%  Vec var: ${best2.vecVar.toFixed(4)}`);
console.log(`  LL: ${best2.llPass}/8`);
console.log('');
