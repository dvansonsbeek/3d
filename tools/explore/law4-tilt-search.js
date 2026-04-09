#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// Law 4 Exploration: Does e_base follow a "K₂-like" formula involving tilt?
//
// The K formula predicts eccentricity AMPLITUDES:
//   e_amp = K × sin(tilt) × √d / (√m × a^1.5)
//
// This script asks: is there a similar formula for BASE eccentricities?
//   e_base = K₂ × sin(tilt)^p × d^q × m^r × a^s
//
// We sweep exponents (p, q, r, s) and check if e_base / (sin(tilt)^p × d^q × m^r × a^s)
// is constant across all 8 planets (or across subsets like inner/outer).
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const DEG2RAD = Math.PI / 180;

// Compute semi-major axis from Kepler's 3rd law (same as orbital-engine.js)
function sma(key) {
  if (key === 'earth') return 1.0;
  const p = C.planets[key];
  const orbitCount = Math.round(C.H * C.meanSolarYearDays / p.solarYearInput);
  const T = C.H / orbitCount;
  return Math.pow(T * T, 1 / 3);
}

// ── Gather per-planet data ───────────────────────────────────────────────
const names = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

const data = names.map(key => {
  const p = C.planets[key];  // undefined for earth
  const isEarth = key === 'earth';
  const tilt = isEarth ? C.earthtiltMean : p.axialTiltMean;
  return {
    name: key,
    e_base: isEarth ? C.eccentricityBase : p.orbitalEccentricityBase,
    e_amp: isEarth ? C.eccentricityAmplitude : p.orbitalEccentricityAmplitude,
    tilt,
    sinTilt: Math.sin(tilt * DEG2RAD),
    d: isEarth ? 3 : p.fibonacciD,
    m: C.massFraction[key],
    sqrtM: Math.sqrt(C.massFraction[key]),
    a: sma(key),
    inclMean: isEarth ? C.earthInvPlaneInclinationMean : p.invPlaneInclinationMean,
    inclAmp: isEarth ? C.earthInvPlaneInclinationAmplitude : p.invPlaneInclinationAmplitude,
  };
});

// ── Print raw data ──────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════════════');
console.log('LAW 4 EXPLORATION: Tilt-eccentricity relationships');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('Raw data:');
console.log('Planet       e_base       e_amp        tilt(°)    sin(tilt)   d    √m          a');
console.log('─'.repeat(95));
for (const d of data) {
  console.log(`${d.name.padEnd(12)} ${d.e_base.toExponential(5)}  ${d.e_amp.toExponential(5)}  ${d.tilt.toFixed(2).padStart(7)}  ${d.sinTilt.toFixed(6).padStart(9)}  ${String(d.d).padStart(2)}   ${d.sqrtM.toExponential(3)}  ${d.a.toFixed(3)}`);
}

// ── K formula verification ──────────────────────────────────────────────
console.log('\n\n═══ K FORMULA VERIFICATION (amplitudes) ═══');
console.log('e_amp = K × sin(tilt) × √d / (√m × a^1.5)');
console.log(`K = ${C.eccentricityAmplitudeK.toExponential(6)}\n`);

for (const d of data) {
  const predicted = C.eccentricityAmplitudeK * d.sinTilt * Math.sqrt(d.d) / (d.sqrtM * Math.pow(d.a, 1.5));
  const ratio = d.e_amp / predicted;
  console.log(`${d.name.padEnd(10)} predicted=${predicted.toExponential(4)}  actual=${d.e_amp.toExponential(4)}  ratio=${ratio.toFixed(6)}`);
}

// ── Search 1: K₂ formula  e_base = K₂ × sin(tilt)^p × d^q × m^r × a^s ─
console.log('\n\n═══ SEARCH 1: Universal constant K₂ ═══');
console.log('e_base = K₂ × sin(tilt)^p × d^q × m^r × a^s');
console.log('Sweeping p,q,r,s ∈ [-2, 2] step 0.25\n');

function computeSpread(vals) {
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  const maxDev = Math.max(...vals.map(v => Math.abs(v - mean)));
  return { mean, spread: maxDev / Math.abs(mean) * 100 };
}

let bestAll = { spread: Infinity };
let bestInner = { spread: Infinity };
let bestOuter = { spread: Infinity };

const steps = [];
for (let x = -2; x <= 2; x += 0.25) steps.push(x);

for (const p of steps) {
  for (const q of steps) {
    for (const r of steps) {
      for (const s of steps) {
        const vals = data.map(d =>
          d.e_base / (Math.pow(d.sinTilt, p) * Math.pow(d.d, q) * Math.pow(d.m, r) * Math.pow(d.a, s))
        );
        // Skip if any NaN/Inf
        if (vals.some(v => !isFinite(v) || v <= 0)) continue;

        const { spread } = computeSpread(vals);
        if (spread < bestAll.spread) {
          bestAll = { p, q, r, s, spread, vals: [...vals] };
        }

        // Inner planets only
        const innerVals = vals.slice(0, 4);
        const innerSpread = computeSpread(innerVals).spread;
        if (innerSpread < bestInner.spread) {
          bestInner = { p, q, r, s, spread: innerSpread, vals: [...innerVals] };
        }

        // Outer planets only
        const outerVals = vals.slice(4);
        const outerSpread = computeSpread(outerVals).spread;
        if (outerSpread < bestOuter.spread) {
          bestOuter = { p, q, r, s, spread: outerSpread, vals: [...outerVals] };
        }
      }
    }
  }
}

function printResult(label, result, planetNames) {
  console.log(`\n${label}:`);
  console.log(`  Best exponents: p=${result.p}, q=${result.q}, r=${result.r}, s=${result.s}`);
  console.log(`  Spread: ${result.spread.toFixed(2)}%`);
  console.log(`  Formula: e_base / (sin(tilt)^${result.p} × d^${result.q} × m^${result.r} × a^${result.s})`);
  console.log(`  Values:`);
  for (let i = 0; i < planetNames.length; i++) {
    console.log(`    ${planetNames[i].padEnd(10)} = ${result.vals[i].toExponential(6)}`);
  }
}

printResult('ALL 8 PLANETS', bestAll, names);
printResult('INNER 4 (Me,Ve,Ea,Ma)', bestInner, names.slice(0, 4));
printResult('OUTER 4 (Ju,Sa,Ur,Ne)', bestOuter, names.slice(4));

// ── Search 2: Ratios involving e_base, e_amp, tilt, inclination ─────────
console.log('\n\n═══ SEARCH 2: Simple ratio patterns ═══\n');

console.log('e_base / e_amp (how many amplitudes fit in the base):');
for (const d of data) {
  console.log(`  ${d.name.padEnd(10)} ${(d.e_base / d.e_amp).toFixed(1)}`);
}

console.log('\ne_base × sin(tilt):');
for (const d of data) {
  console.log(`  ${d.name.padEnd(10)} ${(d.e_base * d.sinTilt).toExponential(4)}`);
}

console.log('\ne_base / sin(tilt):');
for (const d of data) {
  console.log(`  ${d.name.padEnd(10)} ${(d.e_base / d.sinTilt).toExponential(4)}`);
}

console.log('\ne_base × √m × a^1.5 / (sin(tilt) × √d)  — "K₂ if same formula as K":');
for (const d of data) {
  const k2 = d.e_base * d.sqrtM * Math.pow(d.a, 1.5) / (d.sinTilt * Math.sqrt(d.d));
  console.log(`  ${d.name.padEnd(10)} ${k2.toExponential(6)}`);
}

console.log('\ne_base × √m / √d  — "ξ/√d" (AMD-like):');
for (const d of data) {
  const val = d.e_base * d.sqrtM / Math.sqrt(d.d);
  console.log(`  ${d.name.padEnd(10)} ${val.toExponential(6)}`);
}

console.log('\ne_base × √m × √d  — "ξ×√d" (ecc ladder product d×ξ):');
for (const d of data) {
  const val = d.e_base * d.sqrtM * Math.sqrt(d.d);
  console.log(`  ${d.name.padEnd(10)} ${val.toExponential(6)}`);
}

// ── Search 3: Amplitude balance (Law-5-style but with amplitudes) ───────
console.log('\n\n═══ SEARCH 3: Amplitude balance (Law 5 form with e_amp) ═══');
console.log('v_amp_j = √m × a^1.5 × e_amp / √d\n');

let inPhaseSum = 0, antiPhaseSum = 0;
for (const d of data) {
  const v = d.sqrtM * Math.pow(d.a, 1.5) * d.e_amp / Math.sqrt(d.d);
  const isAnti = d.name === 'saturn';
  if (isAnti) antiPhaseSum += v; else inPhaseSum += v;
  console.log(`  ${d.name.padEnd(10)} ${isAnti ? 'ANTI' : 'IN  '}  v=${v.toExponential(4)}`);
}
console.log(`\n  In-phase sum:   ${inPhaseSum.toExponential(6)}`);
console.log(`  Anti-phase sum: ${antiPhaseSum.toExponential(6)}`);
const ampBalance = 1 - Math.abs(inPhaseSum - antiPhaseSum) / Math.max(inPhaseSum, antiPhaseSum);
console.log(`  Balance: ${(ampBalance * 100).toFixed(4)}%`);

// ── Search 4: Does e_base relate to inclination amplitude? ──────────────
console.log('\n\n═══ SEARCH 4: e_base vs inclination amplitude ═══\n');

console.log('e_base / inclAmp (radians):');
for (const d of data) {
  const inclAmpRad = d.inclAmp * DEG2RAD;
  console.log(`  ${d.name.padEnd(10)} ${(d.e_base / inclAmpRad).toFixed(4)}`);
}

console.log('\ne_base / (inclAmp_rad × sin(tilt)):');
for (const d of data) {
  const val = d.e_base / (d.inclAmp * DEG2RAD * d.sinTilt);
  console.log(`  ${d.name.padEnd(10)} ${val.toFixed(4)}`);
}

console.log('\ne_base × d / (inclAmp_rad × sin(tilt) × a):');
for (const d of data) {
  const val = d.e_base * d.d / (d.inclAmp * DEG2RAD * d.sinTilt * d.a);
  console.log(`  ${d.name.padEnd(10)} ${val.toFixed(4)}`);
}

// ── Search 5: Fine-grained sweep near the K-formula exponents ───────────
console.log('\n\n═══ SEARCH 5: Fine sweep near K-formula exponents ═══');
console.log('Testing e_base = C × sin(tilt)^p × d^q × m^r × a^s');
console.log('Fine sweep: p ∈ [-1,2], q ∈ [-1,1], r ∈ [-1,0], s ∈ [-2,1] step 0.1\n');

let bestFine = { spread: Infinity };
const fineSteps = [];
for (let x = -2; x <= 2; x += 0.1) fineSteps.push(Math.round(x * 10) / 10);

for (const p of fineSteps.filter(x => x >= -1 && x <= 2)) {
  for (const q of fineSteps.filter(x => x >= -1 && x <= 1)) {
    for (const r of fineSteps.filter(x => x >= -1 && x <= 0)) {
      for (const s of fineSteps.filter(x => x >= -2 && x <= 1)) {
        const vals = data.map(d =>
          d.e_base / (Math.pow(d.sinTilt, p) * Math.pow(d.d, q) * Math.pow(d.m, r) * Math.pow(d.a, s))
        );
        if (vals.some(v => !isFinite(v) || v <= 0)) continue;
        const { spread } = computeSpread(vals);
        if (spread < bestFine.spread) {
          bestFine = { p, q, r, s, spread, vals: [...vals] };
        }
      }
    }
  }
}

printResult('FINE SWEEP — ALL 8 PLANETS', bestFine, names);

// ── Search 6: Include inclination mean as extra variable ────────────────
console.log('\n\n═══ SEARCH 6: Add inclination mean as variable ═══');
console.log('e_base = C × sin(tilt)^p × inclMean^q × d^r × m^s × a^t');
console.log('Sweep p,q ∈ [-2,2] step 0.5; r,s,t ∈ [-2,2] step 0.5\n');

let bestIncl = { spread: Infinity };
const coarseSteps = [];
for (let x = -2; x <= 2; x += 0.5) coarseSteps.push(x);

for (const p of coarseSteps) {
  for (const q of coarseSteps) {
    for (const r of coarseSteps) {
      for (const s of coarseSteps) {
        for (const t of coarseSteps) {
          const vals = data.map(d =>
            d.e_base / (
              Math.pow(d.sinTilt, p) *
              Math.pow(d.inclMean * DEG2RAD, q) *
              Math.pow(d.d, r) *
              Math.pow(d.m, s) *
              Math.pow(d.a, t)
            )
          );
          if (vals.some(v => !isFinite(v) || v <= 0)) continue;
          const { spread } = computeSpread(vals);
          if (spread < bestIncl.spread) {
            bestIncl = { p, q, r, s, t, spread, vals: [...vals] };
          }
        }
      }
    }
  }
}

console.log(`Best exponents: p=${bestIncl.p}, q=${bestIncl.q}, r=${bestIncl.r}, s=${bestIncl.s}, t=${bestIncl.t}`);
console.log(`Spread: ${bestIncl.spread.toFixed(2)}%`);
console.log(`Formula: e_base / (sin(tilt)^${bestIncl.p} × inclMean^${bestIncl.q} × d^${bestIncl.r} × m^${bestIncl.s} × a^${bestIncl.t})`);
for (let i = 0; i < names.length; i++) {
  console.log(`  ${names[i].padEnd(10)} = ${bestIncl.vals[i].toExponential(6)}`);
}

console.log('\n═══ DONE ═══');
