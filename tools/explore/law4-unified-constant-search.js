#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// Unified constant search: Can ψ and K derive from a single deeper constant?
//
// Both ψ and K are empirical constants derived from Earth. This script
// explores whether they are structurally related.
//
// RESULT: ψ/K ≈ 968.4 ≈ F₆ × L₅² = 8 × 11² (0.04% error). This is a
// striking near-integer with Fibonacci/Lucas structure, but whether it
// reflects deeper physics is an open question. Both constants remain
// empirical — no closed-form derivation has been found.
//
// Usage: node tools/explore/law4-unified-constant-search.js
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');
const DEG2RAD = Math.PI / 180;

function sma(key) {
  if (key === 'earth') return 1.0;
  const p = C.planets[key];
  const orbitCount = Math.round(C.H * C.meanSolarYearDays / p.solarYearInput);
  return Math.pow(C.H / orbitCount, 2 / 3);
}

const names = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

const data = names.map(key => {
  const p = C.planets[key];
  const isEarth = key === 'earth';
  const tilt = isEarth ? C.earthtiltMean : p.axialTiltJ2000;
  const d = isEarth ? 3 : p.fibonacciD;
  const m = C.massFraction[key];
  const a = sma(key);
  const inclAmp = isEarth ? C.earthInvPlaneInclinationAmplitude : p.invPlaneInclinationAmplitude;
  const inclMean = isEarth ? C.earthInvPlaneInclinationMean : p.invPlaneInclinationMean;
  const e_base = isEarth ? C.eccentricityBase : p.orbitalEccentricityBase;
  const e_amp = isEarth ? C.eccentricityAmplitude : p.orbitalEccentricityAmplitude;
  return { name: key, tilt, d, m, a, inclAmp, inclMean, e_base, e_amp,
           sqrtM: Math.sqrt(m), sinTilt: Math.sin(tilt * DEG2RAD) };
});

const H = C.H;

console.log('═══════════════════════════════════════════════════════════════');
console.log('UNIFIED CONSTANT SEARCH');
console.log('═══════════════════════════════════════════════════════════════\n');

// ── 1. Measure ψ and K empirically per planet ──────────────────────────
console.log('=== 1. EMPIRICAL ψ AND K PER PLANET ===\n');
console.log('ψ_j = d × inclAmp(deg) × √m');
console.log('K_j = e_amp × √m × a^1.5 / (sin(tilt) × √d)\n');

const psiValues = [];
const kValues = [];
for (const d of data) {
  const psi_j = d.d * d.inclAmp * d.sqrtM;
  const k_j = d.e_amp * d.sqrtM * Math.pow(d.a, 1.5) / (d.sinTilt * Math.sqrt(d.d));
  psiValues.push(psi_j);
  kValues.push(k_j);
  console.log(`${d.name.padEnd(10)} ψ=${psi_j.toExponential(6)}  K=${k_j.toExponential(6)}  ψ/K=${(psi_j/k_j).toFixed(2)}`);
}

const psiOldFormula = 2205 / (2 * H);  // historical formula (superseded)
const psiModel = C.PSI;                // current: empirical from Earth
const kModel = C.eccentricityAmplitudeK;
console.log(`\nModel ψ (empirical) = ${psiModel.toExponential(6)}`);
console.log(`Old ψ = 2205/(2H)   = ${psiOldFormula.toExponential(6)} (superseded, ${((psiOldFormula/psiModel-1)*100).toFixed(3)}% off)`);
console.log(`Model K = ${kModel.toExponential(6)}`);
console.log(`Note: All ψ_j are identical because inclAmp = ψ/(d×√m) by construction.`);

// ── 2. What is the "true" ψ from Earth's data? ─────────────────────────
console.log('\n\n=== 2. TRUE ψ FROM EARTH DATA ===\n');
// Earth's inclination amplitude is model-derived from earthInvPlaneInclinationAmplitude
// which was set from model-parameters.json. What is it really?
const earthInclAmpActual = C.earthInvPlaneInclinationAmplitude;
const psiFromEarth = 3 * earthInclAmpActual * Math.sqrt(C.massFraction.earth);
console.log(`Earth inclination amplitude (from model-params): ${earthInclAmpActual}°`);
console.log(`ψ from Earth = 3 × ${earthInclAmpActual} × √m_E = ${psiFromEarth.toExponential(6)}`);
console.log(`ψ old formula = 2205/(2H) = ${psiOldFormula.toExponential(6)} (superseded)`);
console.log(`Difference: ${((psiFromEarth / psiModel - 1) * 100).toFixed(3)}%`);

// ── 3. AMD-inspired coupling ────────────────────────────────────────────
console.log('\n\n=== 3. AMD COUPLING: Do ψ and K trade off? ===\n');
console.log('AMD oscillation: ΔC_j ≈ m_j × √a_j × (e_base × e_amp + i_mean_rad × inclAmp_rad)');
console.log('If AMD oscillation is universal, Σ in-phase = Σ anti-phase?\n');

for (const d of data) {
  const amdE = d.e_base * d.e_amp;
  const amdI = (d.inclMean * DEG2RAD) * (d.inclAmp * DEG2RAD);
  const amdTotal = d.m * Math.sqrt(d.a) * (amdE + amdI);
  const ratio = amdE / amdI;
  console.log(`${d.name.padEnd(10)} e×Δe=${amdE.toExponential(3)}  i×Δi=${amdI.toExponential(3)}  ratio=${ratio.toFixed(3)}  ΔC=${amdTotal.toExponential(3)}`);
}

// ── 4. What if ψ and K share a common root? ─────────────────────────────
console.log('\n\n=== 4. COMMON ROOT SEARCH ===\n');

// If ψ = Λ × f₁(Fibonacci) and K = Λ × f₂(Fibonacci, tilt), what is Λ?
//
// ψ = d × inclAmp × √m  →  inclAmp = ψ / (d × √m)
// K = e_amp × √m × a^1.5 / (sin(tilt) × √d)  →  e_amp = K × sin(tilt) × √d / (√m × a^1.5)
//
// Ratio per planet: e_amp / inclAmp_rad = K × sin(tilt) × √d × d × √m / (√m × a^1.5 × ψ_rad)
//   = (K/ψ_rad) × d^1.5 × sin(tilt) / a^1.5
//   = (K/ψ_rad) × (d/a)^1.5 × sin(tilt)  ... but d and a are very different
//
// With a^1.5 = T (orbital period), and T = H/N (orbit count N):
//   = (K×N)/(ψ_rad×H) × d^1.5 × sin(tilt)
//
// Let's compute (K/ψ) for reference:
const psiRad = psiModel * DEG2RAD;
console.log(`ψ (deg) = ${psiModel.toExponential(6)}`);
console.log(`ψ (rad) = ${psiRad.toExponential(6)}`);
console.log(`K       = ${kModel.toExponential(6)}`);
console.log(`K/ψ_deg = ${(kModel / psiModel).toExponential(6)}`);
console.log(`K/ψ_rad = ${(kModel / psiRad).toExponential(6)}`);
console.log(`ψ_deg/K = ${(psiModel / kModel).toFixed(4)}`);
console.log(`ψ_rad/K = ${(psiRad / kModel).toFixed(4)}`);

// ── 5. Per-planet: e_amp_j / inclAmp_j ─────────────────────────────────
console.log('\n\n=== 5. AMPLITUDE RATIO e_amp / inclAmp_rad ===\n');
console.log('If both derive from the same source, this ratio should have structure.\n');

for (const d of data) {
  const inclAmpRad = d.inclAmp * DEG2RAD;
  const ratio = d.e_amp / inclAmpRad;
  const ratioTimesD = ratio * d.d;
  const ratioOverSinTilt = ratio / d.sinTilt;
  const ratioOverSinTiltTimesA15 = ratio * Math.pow(d.a, 1.5) / d.sinTilt;
  console.log(`${d.name.padEnd(10)} e_amp/i_amp_rad=${ratio.toExponential(3)}  ×d=${ratioTimesD.toExponential(3)}  /sin(t)=${ratioOverSinTilt.toExponential(3)}  ×a^1.5/sin(t)=${ratioOverSinTiltTimesA15.toExponential(3)}`);
}

// ── 6. Rewrite K using ψ ────────────────────────────────────────────────
console.log('\n\n=== 6. EXPRESS K IN TERMS OF ψ ===\n');

// From the formulas:
//   inclAmp = ψ / (d × √m)
//   e_amp = K × sin(tilt) × √d / (√m × a^1.5)
//
// So e_amp / inclAmp = K × sin(tilt) × √d × d × √m / (√m × a^1.5 × ψ)
//   = (K/ψ) × d^1.5 × sin(tilt) / a^1.5
//
// This means: (K/ψ) = (e_amp/inclAmp) × a^1.5 / (d^1.5 × sin(tilt))
// This should be the SAME for all planets if K and ψ are both universal.

console.log('(K/ψ) = (e_amp/inclAmp) × a^1.5 / (d^1.5 × sin(tilt))  — should be constant\n');
for (const d of data) {
  const ratio = (d.e_amp / d.inclAmp) * Math.pow(d.a, 1.5) / (Math.pow(d.d, 1.5) * d.sinTilt);
  console.log(`${d.name.padEnd(10)} K/ψ = ${ratio.toExponential(6)}`);
}
console.log(`\nDirect K/ψ_deg = ${(kModel / psiModel).toExponential(6)}`);

// ── 7. Can we define a SINGLE amplitude constant? ───────────────────────
console.log('\n\n=== 7. SINGLE UNIFIED CONSTANT Λ? ===\n');
console.log('What if: Λ = ψ × K = product of the two constants?');
const Lambda = psiModel * kModel;
console.log(`Λ = ψ × K = ${Lambda.toExponential(6)}`);
console.log(`Λ × H = ${(Lambda * H).toExponential(6)}`);
console.log(`Λ × H² = ${(Lambda * H * H).toExponential(6)}`);
console.log(`Λ × 2H = ${(Lambda * 2 * H).toExponential(6)}`);
console.log(`√Λ = ${Math.sqrt(Lambda).toExponential(6)}`);
console.log(`√Λ × H = ${(Math.sqrt(Lambda) * H).toExponential(6)}`);

console.log('\nWhat if: Λ = ψ / K = ratio?');
const ratio = psiModel / kModel;
console.log(`ψ/K = ${ratio.toFixed(4)}`);
console.log(`≈ 963 (= 9 × 107)`);
// Check various decompositions of ~963
console.log('\nDecompositions near 963:');
const fibs = [1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,1597];
const lucas = [1,2,3,4,7,11,18,29,47,76,123,199,322,521,843,1364];
for (const a of [...fibs, ...lucas]) {
  for (const b of [...fibs, ...lucas]) {
    const prod = a * b;
    if (Math.abs(prod - ratio) / ratio < 0.005) {
      const isFibA = fibs.includes(a) ? 'F' : 'L';
      const isFibB = fibs.includes(b) ? 'F' : 'L';
      console.log(`  ${a}(${isFibA}) × ${b}(${isFibB}) = ${prod}  error: ${(((prod/ratio)-1)*100).toFixed(3)}%`);
    }
    const quot = a / b;
    if (b > 1 && Math.abs(quot - ratio) / ratio < 0.005) {
      const isFibA = fibs.includes(a) ? 'F' : 'L';
      const isFibB = fibs.includes(b) ? 'F' : 'L';
      console.log(`  ${a}(${isFibA}) / ${b}(${isFibB}) = ${quot.toFixed(4)}  error: ${(((quot/ratio)-1)*100).toFixed(3)}%`);
    }
  }
}

// ── 8. The a^1.5 = T connection ─────────────────────────────────────────
console.log('\n\n=== 8. KEPLER SUBSTITUTION: a^1.5 = T = H/N ===\n');
console.log('Rewrite K formula using orbital period T instead of a:\n');
console.log('e_amp = K × sin(tilt) × √d / (√m × T)');
console.log('     = (K/H) × N × sin(tilt) × √d / √m\n');
console.log('Compare with: inclAmp = ψ / (d × √m)\n');
console.log('Both have √m in denominator. Factor it out:\n');
console.log('  inclAmp × √m = ψ / d');
console.log('  e_amp × √m   = (K/H) × N × sin(tilt) × √d');
console.log('');

const KoverH = kModel / H;
console.log(`K/H = ${KoverH.toExponential(6)}`);

for (const d of data) {
  const N = Math.round(H * C.meanSolarYearDays / (d.name === 'earth' ? C.meanSolarYearDays : C.planets[d.name].solarYearInput));
  const T = H / N;
  const eAmpCheck = KoverH * N * d.sinTilt * Math.sqrt(d.d) / d.sqrtM;
  const eta = d.inclAmp * d.sqrtM;  // inclAmp × √m = ψ/d
  const xi = d.e_amp * d.sqrtM;     // e_amp × √m = (K/H) × N × sin(tilt) × √d
  console.log(`${d.name.padEnd(10)} N=${String(N).padStart(10)}  T=${T.toFixed(1).padStart(10)}  η=ψ/d=${(psiModel/d.d).toExponential(3)}  ξ_amp=${xi.toExponential(3)}  e_amp_check=${eAmpCheck.toExponential(3)}`);
}

// ── 9. Natural units: express everything per-Holistic-Year ──────────────
console.log('\n\n=== 9. EVERYTHING IN H-NATURAL UNITS ===\n');
console.log('Define: T̃ = T/H = 1/N (orbital period in H-units)');
console.log('Then a^1.5 = T = H/N = H×T̃');
console.log('So e_amp = K × sin(tilt) × √d / (√m × H × T̃)');
console.log('       = (K/H) × sin(tilt) × √d / (√m × T̃)');
console.log('And inclAmp = ψ / (d × √m)');
console.log('');
console.log('In H-natural units, the two constants are:');
console.log(`  ψ = ${psiModel.toExponential(6)}`);
console.log(`  κ = K/H = ${KoverH.toExponential(6)}`);
console.log(`  ψ/κ = ${(psiModel / KoverH).toExponential(6)} = ${(psiModel / KoverH).toFixed(2)}`);
console.log(`  ψ × κ = ${(psiModel * KoverH).toExponential(6)}`);

// ── 10. The REAL question: can ψ and κ=K/H both be Fibonacci? ───────────
console.log('\n\n=== 10. FIBONACCI SEARCH FOR κ = K/H ===\n');
console.log(`κ = K/H = ${KoverH}`);
console.log(`1/κ = H/K = ${(H/kModel).toFixed(2)}`);
console.log(`2H/K = ${(2*H/kModel).toFixed(2)}`);
console.log('');

// H/K ≈ 292833 and H = 335317
// H/K / H = 1/K ≈ 292833
// That's not illuminating.
//
// κ = K/H ≈ 3.414e-6 / 335317 ≈ 1.018e-11 ... very small

// Actually wait. Let me reconsider.
// PSI = 2205 / (2H)
// If K = X / (2H) then X = K × 2H ≈ 2.290
// PSI/K = 2205 / X ≈ 963
// X ≈ 2.290

// What if PSI and K are BOTH = something / (2H)?
// PSI × 2H = 2205 (exact by construction)
// K × 2H ≈ 2.2902

// 2205 and 2.2902... ratio = 963.
// 2205 = 5 × 441 = 5 × 21²
// 2.2902... = ?

// What if K × 2H = 2205 / 963? Then K = 2205/(963 × 2H) = PSI/963
// K_test = PSI/963:
const K_test = psiModel / 963;
console.log('If K = ψ/963 = 2205/(963×2H):');
console.log(`  K_test = ${K_test.toExponential(10)}`);
console.log(`  K_real = ${kModel.toExponential(10)}`);
console.log(`  error  = ${((K_test/kModel)-1)*100}%`);
console.log('');

// 963 = 9 × 107. Check: is 107 prime? Yes.
// Not Fibonacci. But what if the factor isn't 963?

// The ACTUAL best integer: ψ/K
const bestInt = Math.round(psiModel / kModel);
console.log(`Best integer N where K = ψ/N: N = ${bestInt}`);
console.log(`  error: ${((psiModel/bestInt/kModel)-1)*100}%`);
console.log(`  ${bestInt} = ${factorize(bestInt)}`);

// What about ψ/K in radians?
const psiOverKrad = (psiModel * DEG2RAD) / kModel;
console.log(`\nψ_rad / K = ${psiOverKrad.toFixed(4)}`);
console.log(`  ≈ ${Math.round(psiOverKrad)} → ${factorize(Math.round(psiOverKrad))}`);

function factorize(n) {
  if (n <= 1) return String(n);
  const factors = [];
  let rem = n;
  for (let p = 2; p * p <= rem; p++) {
    while (rem % p === 0) { factors.push(p); rem /= p; }
  }
  if (rem > 1) factors.push(rem);
  return factors.join(' × ');
}

// ── 11. Completely empirical: fit ψ to minimize spread ──────────────────
console.log('\n\n=== 11. BEST-FIT ψ (empirical from Earth) ===\n');
// If ψ were free, what value minimizes the spread of d × i_J2000_to_inv × √m?
// This requires knowing the "true" inclination at extremum, which we don't have.
// What we have is J2000 inclinations and a phase model.
//
// Instead: what ψ gives the best balance (Law 3)?
// Or: what ψ makes Earth's inclination amplitude match the model-parameter value?
const psiFromEarthParam = 3 * C.earthInvPlaneInclinationAmplitude * Math.sqrt(C.massFraction.earth);
console.log(`ψ from Earth's model-param amplitude (${C.earthInvPlaneInclinationAmplitude}°):`);
console.log(`  ψ_Earth = ${psiFromEarthParam.toExponential(10)}`);
console.log(`  ψ_model = ${psiModel.toExponential(10)}`);
console.log(`  diff: ${((psiFromEarthParam/psiModel)-1)*100}% `);
console.log(`  ψ_Earth × 2H = ${(psiFromEarthParam * 2 * H).toFixed(6)}`);
console.log(`  (vs 2205 for model)`);

// Is ψ_Earth × 2H close to anything?
const psiE2H = psiFromEarthParam * 2 * H;
console.log(`\n  ${psiE2H.toFixed(4)} ≈ ?`);
// Search Fibonacci products
for (const a of fibs.slice(0,10)) {
  for (const b of fibs.slice(0,10)) {
    for (const c of fibs.slice(0,8)) {
      const prod = a * b * c;
      if (Math.abs(prod - psiE2H) / psiE2H < 0.005) {
        console.log(`    ${a} × ${b} × ${c} = ${prod}  error: ${(((prod/psiE2H)-1)*100).toFixed(3)}%`);
      }
    }
  }
}

console.log('\n═══ DONE ═══');
