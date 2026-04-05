// ═══════════════════════════════════════════════════════════════════════════
// ASCENDING NODE — INCLINATION COUPLING ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════
//
// Current model: inclination oscillates independently, ascending node
// regresses linearly. They're decoupled.
//
// Physical reality: on the invariable plane, the (I, Ω) motion is coupled.
// When a planet's inclination changes, its ascending node direction also
// shifts — they evolve as a single 2D vector (p, q).
//
// This script tests whether including this coupling changes the ecliptic
// inclination trends (1900-2100), potentially fixing Saturn and Neptune's
// trend direction failures.
//
// Three models compared:
//   A) CURRENT: I oscillates (ICRF), Ω regresses linearly
//   B) COUPLED: I and Ω both evolve from the same eigenmode
//   C) FULL DOC: Using the doc/31 formula (dΩ/dε = -sin(Ω)/tan(i))
//
// Usage: node tools/explore/ascending-node-inclination-coupling.js
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

// ═══════════════════════════════════════════════════════════════════════════
// PLANET DATA
// ═══════════════════════════════════════════════════════════════════════════

const planets = {};
for (const key of PLANET_KEYS) {
  const p = key === 'earth' ? null : C.planets[key];
  const mass = C.massFraction[key];
  const sma = key === 'earth' ? 1.0 : C.derived[key].orbitDistance;
  const ecc = C.eccJ2000[key];
  const sqrtM = Math.sqrt(mass);
  const d = key === 'earth' ? 3 : p.fibonacciD;
  const amp = PSI / (d * sqrtM);
  const eclP = key === 'earth' ? H / 16 : p.perihelionEclipticYears;
  const icrfP = key === 'earth' ? H / 3 : 1 / (1 / eclP - 1 / genPrec);
  const icrfRate = 360 / icrfP; // deg/yr
  const periLong = key === 'earth' ? C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 : p.longitudePerihelion;
  const phaseAngle = key === 'earth' ? C.ASTRO_REFERENCE.earthInclinationPhaseAngle : p.inclinationPhaseAngle;
  const antiPhase = key === 'saturn';
  const inclJ2000 = key === 'earth' ? C.ASTRO_REFERENCE.earthInclinationJ2000_deg : p.invPlaneInclinationJ2000;
  const omegaJ2000 = key === 'earth' ? C.ASTRO_REFERENCE.earthAscendingNodeInvPlane : p.ascendingNodeInvPlane;
  const ascCycles = key === 'earth' ? 40 : p.ascendingNodeCyclesIn8H;
  const ascNodeRate = -360 * ascCycles / SUPER_PERIOD; // deg/yr (linear regression)

  // Derive mean from J2000 constraint
  const antiSign = antiPhase ? -1 : 1;
  const cosJ2000 = Math.cos((periLong - phaseAngle) * DEG2RAD);
  const mean = inclJ2000 - antiSign * amp * cosJ2000;

  planets[key] = {
    key, mass, sqrtM, sma, ecc, d, amp, mean, eclP, icrfP, icrfRate,
    periLong, phaseAngle, antiPhase, inclJ2000, omegaJ2000,
    ascCycles, ascNodeRate, antiSign,
  };
}

// JPL ecliptic inclination trends
const jplTrends = {
  mercury: -0.00595, venus: -0.00079, earth: 0,
  mars: -0.00813, jupiter: -0.00184, saturn: +0.00194,
  uranus: -0.00243, neptune: +0.00035,
};

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║     ASCENDING NODE — INCLINATION COUPLING ANALYSIS                      ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝');
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// MODEL A: CURRENT (decoupled)
// I oscillates via ICRF perihelion, Ω regresses linearly
// ═══════════════════════════════════════════════════════════════════════════

function modelA_state(key, year) {
  const p = planets[key];
  const peri = p.periLong + p.icrfRate * (year - 2000);
  const I = p.mean + p.antiSign * p.amp * Math.cos((peri - p.phaseAngle) * DEG2RAD);
  const Omega = p.omegaJ2000 + p.ascNodeRate * (year - 2000);
  return { I, Omega };
}

// ═══════════════════════════════════════════════════════════════════════════
// MODEL B: COUPLED (p,q eigenvector approach)
// Both I and Ω evolve from the same oscillation
//
// In eigenmode theory: p = sin(I)sin(Ω), q = sin(I)cos(Ω)
// The oscillation is in p,q space — both I and Ω change together.
//
// For a single dominant mode:
//   p(t) = p_mean + δp × cos(ωt + γ)
//   q(t) = q_mean + δq × cos(ωt + γ)
//
// where the mean (p_mean, q_mean) represents the invariable-plane
// reference, and (δp, δq) is the oscillation direction in p,q space.
//
// The ascending node Ω = atan2(p, q) thus oscillates around its mean
// with a period and phase coupled to the inclination oscillation.
// ═══════════════════════════════════════════════════════════════════════════

function modelB_state(key, year) {
  const p = planets[key];

  // J2000 state in (p, q)
  const I_j2000 = p.inclJ2000 * DEG2RAD;
  const O_j2000 = p.omegaJ2000 * DEG2RAD;
  const p_j2000 = Math.sin(I_j2000) * Math.sin(O_j2000);
  const q_j2000 = Math.sin(I_j2000) * Math.cos(O_j2000);

  // Mean state (from mean inclination and linearly regressing node)
  // At J2000, the mean Omega = omegaJ2000 (they coincide at the reference epoch)
  // Over time, the mean Omega regresses at the ascending node rate
  const meanOmega = (p.omegaJ2000 + p.ascNodeRate * (year - 2000)) * DEG2RAD;
  const meanI = p.mean * DEG2RAD;
  const p_mean = Math.sin(meanI) * Math.sin(meanOmega);
  const q_mean = Math.sin(meanI) * Math.cos(meanOmega);

  // Oscillation: the perturbation in (p,q) space
  // The ICRF perihelion drives the inclination oscillation
  // In (p,q) space, an inclination oscillation at fixed Omega is a
  // radial oscillation — but with precessing Omega, the oscillation
  // direction rotates
  //
  // The perturbation vector direction aligns with the ascending node:
  //   δp = δI × cos(I) × sin(Ω)  ← radial in p-direction
  //   δq = δI × cos(I) × cos(Ω)  ← radial in q-direction
  //
  // But there's also a tangential component from the node oscillation:
  //   δp_tan = sin(I) × cos(Ω) × δΩ
  //   δq_tan = -sin(I) × sin(Ω) × δΩ
  //
  // In eigenmode theory, both come from the same mode, so we model
  // the oscillation as a single perturbation in (p,q) space.

  const peri = p.periLong + p.icrfRate * (year - 2000);
  const phase = (peri - p.phaseAngle) * DEG2RAD;
  const deltaI = p.antiSign * p.amp * Math.cos(phase); // in degrees

  // Radial oscillation (inclination change at current node direction)
  const cosI = Math.cos(meanI);
  const dp_radial = deltaI * DEG2RAD * cosI * Math.sin(meanOmega);
  const dq_radial = deltaI * DEG2RAD * cosI * Math.cos(meanOmega);

  // Total p, q
  const p_total = p_mean + dp_radial;
  const q_total = q_mean + dq_radial;

  // Extract I and Omega
  const sinI = Math.sqrt(p_total * p_total + q_total * q_total);
  const I = Math.asin(Math.min(1, sinI)) * RAD2DEG;
  const Omega = Math.atan2(p_total, q_total) * RAD2DEG;

  return { I, Omega: ((Omega % 360) + 360) % 360, p: p_total, q: q_total };
}

// ═══════════════════════════════════════════════════════════════════════════
// MODEL C: FULL COUPLED with tangential (Ω oscillation)
// The inclination oscillation creates a TANGENTIAL perturbation in (p,q)
// that shifts the ascending node direction
// ═══════════════════════════════════════════════════════════════════════════

function modelC_state(key, year) {
  const p = planets[key];

  // Mean state with linear node regression
  const meanOmega = (p.omegaJ2000 + p.ascNodeRate * (year - 2000)) * DEG2RAD;
  const meanI = p.mean * DEG2RAD;

  // ICRF perihelion oscillation
  const peri = p.periLong + p.icrfRate * (year - 2000);
  const phase = (peri - p.phaseAngle) * DEG2RAD;
  const deltaI = p.antiSign * p.amp * Math.cos(phase); // degrees

  // In eigenmode theory, the perturbation in (p,q) has BOTH radial
  // and tangential components. The tangential component arises because
  // the eigenmode doesn't just change I — it also rotates Ω.
  //
  // The ratio of tangential to radial is related to the eigenmode
  // structure. For a pure precession eigenmode:
  //   the perturbation vector rotates at frequency s_i
  //   → tangential/radial ≈ (s_i × t) contribution
  //
  // Approximation: the tangential amplitude = radial amplitude × (Ω_rate / I_rate)
  // This is the ratio of ascending node rate to inclination oscillation rate

  const iRate = Math.abs(p.icrfRate); // deg/yr (inclination oscillation)
  const oRate = Math.abs(p.ascNodeRate); // deg/yr (node regression)
  const tangentialRatio = oRate / iRate; // how much Ω oscillates relative to I

  // Radial perturbation (changes I)
  const cosI = Math.cos(meanI);
  const sinI = Math.sin(meanI);
  const dp_radial = deltaI * DEG2RAD * cosI * Math.sin(meanOmega);
  const dq_radial = deltaI * DEG2RAD * cosI * Math.cos(meanOmega);

  // Tangential perturbation (changes Ω without changing I)
  // Tangential direction is perpendicular to radial: (-cos(Ω), sin(Ω))
  const deltaOmega = deltaI * tangentialRatio; // degrees, coupled oscillation
  const dp_tang = sinI * Math.cos(meanOmega) * deltaOmega * DEG2RAD;
  const dq_tang = -sinI * Math.sin(meanOmega) * deltaOmega * DEG2RAD;

  const p_total = Math.sin(meanI) * Math.sin(meanOmega) + dp_radial + dp_tang;
  const q_total = Math.sin(meanI) * Math.cos(meanOmega) + dq_radial + dq_tang;

  const sinI_total = Math.sqrt(p_total * p_total + q_total * q_total);
  const I = Math.asin(Math.min(1, sinI_total)) * RAD2DEG;
  const Omega = Math.atan2(p_total, q_total) * RAD2DEG;

  return { I, Omega: ((Omega % 360) + 360) % 360, p: p_total, q: q_total };
}

// ═══════════════════════════════════════════════════════════════════════════
// ECLIPTIC INCLINATION COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════

function eclipticIncl(planetState, earthState) {
  const pI = planetState.I * DEG2RAD;
  const eI = earthState.I * DEG2RAD;
  const pO = planetState.Omega * DEG2RAD;
  const eO = earthState.Omega * DEG2RAD;
  const dot = Math.sin(pI) * Math.sin(eI) * (Math.sin(pO) * Math.sin(eO) + Math.cos(pO) * Math.cos(eO))
            + Math.cos(pI) * Math.cos(eI);
  return Math.acos(Math.max(-1, Math.min(1, dot))) * RAD2DEG;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPARE ECLIPTIC TRENDS 1900-2100
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('1. ECLIPTIC INCLINATION TRENDS (1900-2100) — THREE MODELS');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('Planet     │ JPL trend  │ Model A (current)    │ Model B (coupled)    │ Model C (full coupled)');
console.log('           │ (°/cy)     │ trend     │ Dir │ trend     │ Dir │ ΔΩ    │ trend     │ Dir │ ΔΩ');
console.log('───────────┼────────────┼───────────┼─────┼───────────┼─────┼───────┼───────────┼─────┼───────');

for (const key of PLANET_KEYS) {
  if (key === 'earth') continue;

  const jpl = jplTrends[key];
  const jplArcsec = jpl * 3600;

  // Model A
  const eA1900 = modelA_state('earth', 1900);
  const eA2100 = modelA_state('earth', 2100);
  const pA1900 = modelA_state(key, 1900);
  const pA2100 = modelA_state(key, 2100);
  const eclA1900 = eclipticIncl(pA1900, eA1900);
  const eclA2100 = eclipticIncl(pA2100, eA2100);
  const trendA = (eclA2100 - eclA1900) / 2;
  const dirA = (jpl >= 0) === (trendA >= 0);

  // Model B
  const eB1900 = modelB_state('earth', 1900);
  const eB2100 = modelB_state('earth', 2100);
  const pB1900 = modelB_state(key, 1900);
  const pB2100 = modelB_state(key, 2100);
  const eclB1900 = eclipticIncl(pB1900, eB1900);
  const eclB2100 = eclipticIncl(pB2100, eB2100);
  const trendB = (eclB2100 - eclB1900) / 2;
  const dirB = (jpl >= 0) === (trendB >= 0);
  const dOmegaB = pB2100.Omega - pB1900.Omega;

  // Model C
  const eC1900 = modelC_state('earth', 1900);
  const eC2100 = modelC_state('earth', 2100);
  const pC1900 = modelC_state(key, 1900);
  const pC2100 = modelC_state(key, 2100);
  const eclC1900 = eclipticIncl(pC1900, eC1900);
  const eclC2100 = eclipticIncl(pC2100, eC2100);
  const trendC = (eclC2100 - eclC1900) / 2;
  const dirC = (jpl >= 0) === (trendC >= 0);
  const dOmegaC = pC2100.Omega - pC1900.Omega;

  console.log(
    (key.charAt(0).toUpperCase() + key.slice(1)).padEnd(10) + ' │ ' +
    (jplArcsec >= 0 ? '+' : '') + jplArcsec.toFixed(2).padStart(8) + '″ │ ' +
    (trendA * 3600 >= 0 ? '+' : '') + (trendA * 3600).toFixed(2).padStart(7) + '″ │ ' +
    (dirA ? '  ✓ ' : '  ✗ ') + ' │ ' +
    (trendB * 3600 >= 0 ? '+' : '') + (trendB * 3600).toFixed(2).padStart(7) + '″ │ ' +
    (dirB ? '  ✓ ' : '  ✗ ') + ' │ ' +
    (dOmegaB >= 0 ? '+' : '') + dOmegaB.toFixed(2).padStart(4) + '° │ ' +
    (trendC * 3600 >= 0 ? '+' : '') + (trendC * 3600).toFixed(2).padStart(7) + '″ │ ' +
    (dirC ? '  ✓ ' : '  ✗ ') + ' │ ' +
    (dOmegaC >= 0 ? '+' : '') + dOmegaC.toFixed(2).padStart(4) + '°'
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DETAILED SATURN AND NEPTUNE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('2. SATURN & NEPTUNE DETAILED — WHY DO THEY FAIL?');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

for (const key of ['saturn', 'neptune']) {
  const p = planets[key];
  console.log(`${key.toUpperCase()}:`);
  console.log(`  Current model: d=${p.d}, period=${Math.round(Math.abs(p.icrfP))} yr, Ω rate=${p.ascNodeRate.toFixed(6)}°/yr`);
  console.log(`  Phase: sin(ω̃-φ) = ${Math.sin((p.periLong - p.phaseAngle) * DEG2RAD).toFixed(4)}, cos(ω̃-φ) = ${Math.cos((p.periLong - p.phaseAngle) * DEG2RAD).toFixed(4)}`);
  console.log(`  Position at J2000: ${Math.abs(Math.cos((p.periLong - p.phaseAngle) * DEG2RAD)) > 0.8 ? 'near extremum' : Math.abs(Math.sin((p.periLong - p.phaseAngle) * DEG2RAD)) > 0.8 ? 'crossing mean' : 'intermediate'}`);
  console.log('');

  // Show I and Omega at several epochs with all three models
  console.log('  Year  │ Model A: I      Ω       │ Model B: I      Ω       │ Model C: I      Ω');
  console.log('  ──────┼─────────────────────────┼─────────────────────────┼─────────────────────────');

  for (const year of [1900, 1950, 2000, 2050, 2100]) {
    const a = modelA_state(key, year);
    const b = modelB_state(key, year);
    const c = modelC_state(key, year);
    console.log(
      '  ' + year + '  │ ' +
      a.I.toFixed(4) + '° ' + (((a.Omega % 360) + 360) % 360).toFixed(2) + '° │ ' +
      b.I.toFixed(4) + '° ' + b.Omega.toFixed(2) + '° │ ' +
      c.I.toFixed(4) + '° ' + c.Omega.toFixed(2) + '°'
    );
  }

  // Show ecliptic inclination at same epochs
  console.log('');
  console.log('  Year  │ Ecl A    │ Ecl B    │ Ecl C    │ Notes');
  console.log('  ──────┼──────────┼──────────┼──────────┼──────');
  for (const year of [1900, 1950, 2000, 2050, 2100]) {
    const eA = eclipticIncl(modelA_state(key, year), modelA_state('earth', year));
    const eB = eclipticIncl(modelB_state(key, year), modelB_state('earth', year));
    const eC = eclipticIncl(modelC_state(key, year), modelC_state('earth', year));
    console.log(
      '  ' + year + '  │ ' +
      eA.toFixed(4) + '° │ ' +
      eB.toFixed(4) + '° │ ' +
      eC.toFixed(4) + '° │'
    );
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// COUPLING STRENGTH ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('3. COUPLING STRENGTH: Ω_rate / I_rate PER PLANET');
console.log('   How much does the ascending node oscillate relative to inclination?');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('Planet     │ I rate (°/yr) │ Ω rate (°/yr) │ Ratio Ω/I │ ΔΩ per ΔI=1° │ Significance');
console.log('───────────┼──────────────┼───────────────┼───────────┼──────────────┼─────────────');

for (const key of PLANET_KEYS) {
  const p = planets[key];
  const iRate = Math.abs(p.icrfRate);
  const oRate = Math.abs(p.ascNodeRate);
  const ratio = oRate / iRate;
  const significance = ratio > 1 ? 'Ω dominates' : ratio > 0.3 ? 'significant' : ratio > 0.1 ? 'moderate' : 'small';

  console.log(
    (key.charAt(0).toUpperCase() + key.slice(1)).padEnd(10) + ' │ ' +
    iRate.toFixed(5).padStart(12) + ' │ ' +
    oRate.toFixed(5).padStart(13) + ' │ ' +
    ratio.toFixed(4).padStart(9) + ' │ ' +
    (ratio.toFixed(2) + '°').padStart(12) + ' │ ' +
    significance
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DIRECTION MATCH SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('4. DIRECTION MATCH SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

let matchA = 0, matchB = 0, matchC = 0;
for (const key of PLANET_KEYS) {
  if (key === 'earth') { matchA++; matchB++; matchC++; continue; }
  const jpl = jplTrends[key];

  const tA = (eclipticIncl(modelA_state(key, 2100), modelA_state('earth', 2100)) -
              eclipticIncl(modelA_state(key, 1900), modelA_state('earth', 1900))) / 2;
  const tB = (eclipticIncl(modelB_state(key, 2100), modelB_state('earth', 2100)) -
              eclipticIncl(modelB_state(key, 1900), modelB_state('earth', 1900))) / 2;
  const tC = (eclipticIncl(modelC_state(key, 2100), modelC_state('earth', 2100)) -
              eclipticIncl(modelC_state(key, 1900), modelC_state('earth', 1900))) / 2;

  if ((jpl >= 0) === (tA >= 0)) matchA++;
  if ((jpl >= 0) === (tB >= 0)) matchB++;
  if ((jpl >= 0) === (tC >= 0)) matchC++;
}

console.log(`Model A (current, decoupled):     ${matchA}/8 direction matches`);
console.log(`Model B (radial coupling only):    ${matchB}/8 direction matches`);
console.log(`Model C (full radial+tangential):  ${matchC}/8 direction matches`);
console.log('');
