// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: SINGLE-MODE OBSERVATIONAL CONSTRAINTS
// ═══════════════════════════════════════════════════════════════════════════
//
// Our model: i(t) = mean + sign × amp × cos(ω̃_ICRF(t) - φ)
//
// This is a SIMPLE model: one amplitude, one frequency, one phase per planet.
// Nature works simply — no need for 7 superimposed modes.
//
// For each planet, a valid Fibonacci d-value must satisfy ALL of:
//   1. LL BOUNDS: mean ± amp ⊂ [LL_min, LL_max]
//   2. J2000 POSITION: mean + sign × amp × cos(ω̃_J2000 - φ) = I_J2000
//   3. J2000 RATE: di/dt at J2000 must match JPL observed rate (sign + magnitude)
//   4. TREND DIRECTION: ecliptic inclination change 1900-2100 matches JPL sign
//
// The phase angle φ is derived from the balanced year, so it's not free.
// The mean is derived from J2000 constraint, so it's not free either.
// The ONLY free choice is d (and group: in-phase vs anti-phase).
//
// This script tests every valid (d, group) combination per planet against
// ALL these constraints simultaneously.
//
// Usage: node tools/explore/step1-single-mode-constraints.js
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const SUPER_PERIOD = 8 * H;
const balancedYear = C.balancedYear;
const genPrec = H / 13;
const PLANET_KEYS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const NP = 8;
const FIB_D = [1, 2, 3, 5, 8, 13, 21, 34, 55];

// ═══════════════════════════════════════════════════════════════════════════
// OBSERVED DATA (all from JSONs via constants.js)
// ═══════════════════════════════════════════════════════════════════════════

const planets = PLANET_KEYS.map(key => {
  const p = key === 'earth' ? null : C.planets[key];
  const mass = C.massFraction[key];
  const sma = key === 'earth' ? 1.0 : C.derived[key].orbitDistance;
  const ecc = C.eccJ2000[key];
  const sqrtM = Math.sqrt(mass);
  const L = mass * Math.sqrt(sma * (1 - ecc * ecc));

  const inclJ2000 = key === 'earth' ? C.ASTRO_REFERENCE.earthInclinationJ2000_deg : p.invPlaneInclinationJ2000;
  const omegaJ2000 = key === 'earth' ? C.ASTRO_REFERENCE.earthAscendingNodeInvPlane : p.ascendingNodeInvPlane;
  const periLong = key === 'earth' ? C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 : p.longitudePerihelion;
  const eclP = key === 'earth' ? H / 16 : p.perihelionEclipticYears;
  const icrfP = key === 'earth' ? H / 3 : 1 / (1 / eclP - 1 / genPrec);
  const icrfRate = 360 / icrfP;
  const ascCycles = key === 'earth' ? 40 : p.ascendingNodeCyclesIn8H;
  const ascNodeRate = -360 * ascCycles / SUPER_PERIOD;

  return {
    key, mass, sqrtM, sma, ecc, L,
    inclJ2000, omegaJ2000, periLong,
    eclP, icrfP, icrfRate, ascNodeRate,
  };
});

const llBounds = {
  mercury: { min: 4.57, max: 9.86 }, venus: { min: 0.00, max: 3.38 },
  earth: { min: 0.00, max: 2.95 }, mars: { min: 0.00, max: 5.84 },
  jupiter: { min: 0.241, max: 0.489 }, saturn: { min: 0.797, max: 1.02 },
  uranus: { min: 0.902, max: 1.11 }, neptune: { min: 0.554, max: 0.800 },
};

// JPL ecliptic inclination trends (degrees/century, invariable plane frame)
const jplTrends = {
  mercury: -0.00595, venus: -0.00079, earth: 0,
  mars: -0.00813, jupiter: -0.00184, saturn: +0.00194,
  uranus: -0.00243, neptune: +0.00035,
};

// JPL ecliptic inclination rates (arcsec/century) from Standish 1992
const jplRatesArcsecCy = {
  mercury: -23.89, venus: -2.86, earth: -46.94, mars: -18.72,
  jupiter: -2.48, saturn: +6.68, uranus: -3.64, neptune: +0.68,
};

// Earth's inclination parameters (fixed, used for ecliptic calculations)
const earthPhaseAngle = C.ASTRO_REFERENCE.earthInclinationPhaseAngle;
const earthAmp = C.earthInvPlaneInclinationAmplitude;
const earthMean = C.earthInvPlaneInclinationMean;

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║     STEP 1: SINGLE-MODE OBSERVATIONAL CONSTRAINTS                       ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝');
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// TEST EACH (d, group) COMBINATION PER PLANET
// ═══════════════════════════════════════════════════════════════════════════

function computePhaseAngle(pl, antiPhase) {
  const periAtBY = ((pl.periLong + pl.icrfRate * (balancedYear - 2000)) % 360 + 360) % 360;
  return antiPhase ? periAtBY : ((periAtBY - 180 + 360) % 360);
}

function computeMean(pl, amp, phaseAngle, antiPhase) {
  const antiSign = antiPhase ? -1 : 1;
  const cosJ2000 = Math.cos((pl.periLong - phaseAngle) * DEG2RAD);
  return pl.inclJ2000 - antiSign * amp * cosJ2000;
}

function computeInclAtYear(pl, mean, amp, phaseAngle, antiPhase, year) {
  const antiSign = antiPhase ? -1 : 1;
  const peri = pl.periLong + pl.icrfRate * (year - 2000);
  return mean + antiSign * amp * Math.cos((peri - phaseAngle) * DEG2RAD);
}

function earthInclAtYear(year) {
  const peri = planets[2].periLong + planets[2].icrfRate * (year - 2000);
  return earthMean + earthAmp * Math.cos((peri - earthPhaseAngle) * DEG2RAD);
}

function computeEclipticIncl(pl, mean, amp, phaseAngle, antiPhase, year) {
  const pI = computeInclAtYear(pl, mean, amp, phaseAngle, antiPhase, year) * DEG2RAD;
  const eI = earthInclAtYear(year) * DEG2RAD;
  const pOmega = (pl.omegaJ2000 + pl.ascNodeRate * (year - 2000)) * DEG2RAD;
  const eOmega = (planets[2].omegaJ2000 + planets[2].ascNodeRate * (year - 2000)) * DEG2RAD;
  const dot = Math.sin(pI) * Math.sin(eI) * (Math.sin(pOmega) * Math.sin(eOmega) + Math.cos(pOmega) * Math.cos(eOmega)) + Math.cos(pI) * Math.cos(eI);
  return Math.acos(Math.max(-1, Math.min(1, dot))) * RAD2DEG;
}

// Compute invariable-plane di/dt at J2000
function computeInvRateAtJ2000(pl, amp, phaseAngle, antiPhase) {
  const antiSign = antiPhase ? -1 : 1;
  const peri = pl.periLong;
  const icrfRateRad = pl.icrfRate * DEG2RAD; // deg/yr → rad/yr? no, it's already in deg/yr
  // di/dt = -antiSign × amp × sin(peri - φ) × d(peri)/dt
  // where d(peri)/dt = icrfRate (in deg/yr)
  return -antiSign * amp * Math.sin((peri - phaseAngle) * DEG2RAD) * pl.icrfRate;
  // Result in deg/yr
}

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('FOR EACH PLANET: ALL VALID (d, group) COMBINATIONS');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const planetResults = {};

for (let j = 0; j < NP; j++) {
  const pl = planets[j];
  const key = pl.key;
  const ll = llBounds[key];

  if (key === 'earth') {
    console.log(`\n${key.toUpperCase()}: LOCKED at d=3, in-phase\n`);
    planetResults[key] = [{ d: 3, antiPhase: false, valid: true }];
    continue;
  }

  console.log(`\n${'═'.repeat(75)}`);
  console.log(`${key.toUpperCase()} (I_J2000 = ${pl.inclJ2000.toFixed(4)}°, ω̃_J2000 = ${pl.periLong.toFixed(2)}°, ICRF rate = ${pl.icrfRate.toFixed(4)}°/yr)`);
  console.log(`LL bounds: [${ll.min.toFixed(2)}°, ${ll.max.toFixed(2)}°]  JPL trend: ${(jplTrends[key] * 3600).toFixed(2)}″/cy  JPL rate: ${jplRatesArcsecCy[key].toFixed(2)}″/cy`);
  console.log('═'.repeat(75));

  console.log('');
  console.log(' d  │ Group     │ Amplitude │ Phase     │ Mean      │ Range               │ LL  │ Model rate │ JPL rate  │ Dir │ Trend dir │ Score');
  console.log('────┼───────────┼───────────┼───────────┼───────────┼─────────────────────┼─────┼────────────┼───────────┼─────┼───────────┼──────');

  const options = [];

  for (const d of FIB_D) {
    const amp = PSI / (d * pl.sqrtM);

    for (const antiPhase of [false, true]) {
      const phaseAngle = computePhaseAngle(pl, antiPhase);
      const mean = computeMean(pl, amp, phaseAngle, antiPhase);

      // Constraint 1: LL bounds
      const rangeMin = mean - amp;
      const rangeMax = mean + amp;
      const llPass = rangeMin >= ll.min - 0.01 && rangeMax <= ll.max + 0.01;

      // Constraint 2: J2000 position (automatically satisfied by mean derivation)
      // Verify
      const iJ2000 = computeInclAtYear(pl, mean, amp, phaseAngle, antiPhase, 2000);
      const posError = Math.abs(iJ2000 - pl.inclJ2000) * 3600; // arcsec

      // Constraint 3: Invariable plane di/dt at J2000
      const modelRate = computeInvRateAtJ2000(pl, amp, phaseAngle, antiPhase);
      const modelRateArcsecCy = modelRate * 3600 * 100; // deg/yr → arcsec/cy

      // Constraint 4: Ecliptic trend direction 1900-2100
      let trendDir = '—';
      const ecl1900 = computeEclipticIncl(pl, mean, amp, phaseAngle, antiPhase, 1900);
      const ecl2100 = computeEclipticIncl(pl, mean, amp, phaseAngle, antiPhase, 2100);
      const eclTrend = (ecl2100 - ecl1900) / 2; // deg/cy
      const trendMatch = (jplTrends[key] >= 0) === (eclTrend >= 0);
      trendDir = trendMatch ? '✓' : '✗';

      // Rate direction match (invariable plane)
      const rateDir = (jplRatesArcsecCy[key] >= 0) === (modelRateArcsecCy >= 0);

      // Scoring
      let score = 0;
      if (llPass) score += 30;
      if (trendMatch) score += 25;
      if (rateDir) score += 25;
      // Rate magnitude match (closer = better)
      const rateDiff = Math.abs(modelRateArcsecCy - jplRatesArcsecCy[key]);
      const rateScore = Math.max(0, 20 - rateDiff / 5);
      score += rateScore;

      options.push({
        d, antiPhase, amp, phaseAngle, mean, rangeMin, rangeMax,
        llPass, posError, modelRateArcsecCy, rateDir, trendMatch, eclTrend, score,
      });

      const group = antiPhase ? 'anti-phase' : 'in-phase';
      console.log(
        d.toString().padStart(3) + ' │ ' +
        group.padEnd(9) + ' │ ' +
        (amp.toFixed(4) + '°').padStart(9) + ' │ ' +
        (phaseAngle.toFixed(2) + '°').padStart(9) + ' │ ' +
        (mean.toFixed(4) + '°').padStart(9) + ' │ ' +
        (rangeMin.toFixed(2) + '° – ' + rangeMax.toFixed(2) + '°').padStart(19) + ' │ ' +
        (llPass ? '  ✓  ' : '  ✗  ') + '│ ' +
        (modelRateArcsecCy.toFixed(2) + '″').padStart(10) + ' │ ' +
        (jplRatesArcsecCy[key].toFixed(2) + '″').padStart(9) + ' │ ' +
        (rateDir ? '  ✓ ' : '  ✗ ') + '│ ' +
        (trendMatch ? '    ✓    ' : '    ✗    ') + ' │ ' +
        score.toFixed(0).padStart(4)
      );
    }
  }

  // Sort by score and show best
  options.sort((a, b) => b.score - a.score);
  const best = options.filter(o => o.llPass);
  planetResults[key] = best;

  console.log('');
  console.log(`  Best options (LL pass):`);
  for (let i = 0; i < Math.min(5, best.length); i++) {
    const o = best[i];
    console.log(`    d=${o.d} ${o.antiPhase ? 'anti' : 'in'}-phase: score=${o.score.toFixed(0)}, rate dir=${o.rateDir ? '✓' : '✗'}, trend=${o.trendMatch ? '✓' : '✗'}, rate=${o.modelRateArcsecCy.toFixed(1)}″/cy vs JPL ${jplRatesArcsecCy[key].toFixed(1)}″/cy`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY: BEST D-VALUE PER PLANET
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('SUMMARY: BEST D-VALUE PER PLANET (by single-mode observational fit)');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

console.log('Planet     │ Best d │ Group     │ Score │ Rate dir │ Trend │ Rate err  │ Config #1 d │ Same?');
console.log('───────────┼────────┼───────────┼───────┼──────────┼───────┼───────────┼─────────────┼──────');

const bestConfig = {};

for (const key of PLANET_KEYS) {
  if (key === 'earth') {
    console.log('Earth      │      3 │ in-phase  │   100 │     —    │   —   │       —   │           3 │   ✓');
    bestConfig[key] = { d: 3, antiPhase: false };
    continue;
  }

  const best = planetResults[key];
  if (best.length === 0) {
    console.log(`${key.charAt(0).toUpperCase() + key.slice(1).padEnd(9)} │   NONE │           │       │          │       │           │`);
    continue;
  }

  const b = best[0];
  const currentD = C.planets[key].fibonacciD;
  const same = b.d === currentD && b.antiPhase === (key === 'saturn');

  bestConfig[key] = { d: b.d, antiPhase: b.antiPhase };

  const rateDiff = Math.abs(b.modelRateArcsecCy - jplRatesArcsecCy[key]);

  console.log(
    (key.charAt(0).toUpperCase() + key.slice(1)).padEnd(10) + ' │ ' +
    b.d.toString().padStart(6) + ' │ ' +
    (b.antiPhase ? 'anti-phase' : 'in-phase').padEnd(9) + ' │ ' +
    b.score.toFixed(0).padStart(5) + ' │ ' +
    (b.rateDir ? '    ✓   ' : '    ✗   ') + ' │ ' +
    (b.trendMatch ? '  ✓  ' : '  ✗  ') + ' │ ' +
    (rateDiff.toFixed(1) + '″').padStart(9) + ' │ ' +
    currentD.toString().padStart(11) + ' │ ' +
    (same ? '  ✓' : '  ✗')
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCALAR BALANCE CHECK FOR BEST CONFIG
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('SCALAR BALANCE CHECK FOR DERIVED CONFIGURATION');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

let wIn = 0, wAnti = 0, vIn = 0, vAnti = 0;
for (const key of PLANET_KEYS) {
  const pl = planets[PLANET_KEYS.indexOf(key)];
  const d = bestConfig[key].d;
  const eccBase = key === 'earth' ? C.eccentricityBase : C.planets[key].orbitalEccentricityBase;
  const w = Math.sqrt(pl.mass * pl.sma * (1 - pl.ecc * pl.ecc)) / d;
  const v = pl.sqrtM * Math.pow(pl.sma, 1.5) * eccBase / Math.sqrt(d);
  if (bestConfig[key].antiPhase) { wAnti += w; vAnti += v; }
  else { wIn += w; vIn += v; }
}

const inclBal = (1 - Math.abs(wIn - wAnti) / (wIn + wAnti)) * 100;
const eccBal = (1 - Math.abs(vIn - vAnti) / (vIn + vAnti)) * 100;

console.log(`Derived config: ${PLANET_KEYS.map(k => `${k.charAt(0).toUpperCase()}${k.slice(1,3)}=${bestConfig[k].d}`).join(' ')}`);
console.log(`Anti-phase: ${PLANET_KEYS.filter(k => bestConfig[k].antiPhase).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join('+') || '(none)'}`);
console.log(`Inclination balance: ${inclBal.toFixed(4)}%`);
console.log(`Eccentricity balance: ${eccBal.toFixed(4)}%`);

// Compare with Config #1
console.log('');
const D_C1 = { mercury: 21, venus: 34, earth: 3, mars: 5, jupiter: 5, saturn: 3, uranus: 21, neptune: 34 };
let wIn1 = 0, wAnti1 = 0, vIn1 = 0, vAnti1 = 0;
for (const key of PLANET_KEYS) {
  const pl = planets[PLANET_KEYS.indexOf(key)];
  const d = D_C1[key];
  const eccBase = key === 'earth' ? C.eccentricityBase : C.planets[key].orbitalEccentricityBase;
  const w = Math.sqrt(pl.mass * pl.sma * (1 - pl.ecc * pl.ecc)) / d;
  const v = pl.sqrtM * Math.pow(pl.sma, 1.5) * eccBase / Math.sqrt(d);
  if (key === 'saturn') { wAnti1 += w; vAnti1 += v; }
  else { wIn1 += w; vIn1 += v; }
}

console.log(`Config #1:     Me21 Ve34 Ma5 Ju5 Sa3 Ur21 Ne34 (Saturn anti-phase)`);
console.log(`Inclination balance: ${((1 - Math.abs(wIn1 - wAnti1) / (wIn1 + wAnti1)) * 100).toFixed(4)}%`);
console.log(`Eccentricity balance: ${((1 - Math.abs(vIn1 - vAnti1) / (vIn1 + vAnti1)) * 100).toFixed(4)}%`);
console.log('');
