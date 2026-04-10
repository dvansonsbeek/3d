#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// ASCENDING NODE — INCLINATION COUPLING ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════
//
// Tests whether coupling I and Ω (instead of treating them independently)
// improves the ecliptic inclination trends vs JPL.
//
// Three models compared:
//   A) CURRENT (decoupled): I oscillates via ICRF perihelion, Ω regresses linearly
//   B) COUPLED (radial only): I oscillation creates radial perturbation in (p,q) space
//   C) FULL COUPLED (radial + tangential): adds Ω oscillation from eigenmode coupling
//
// All comparisons use the J2000-FIXED frame (Earth frozen at J2000) to match
// JPL's published dI/dt values directly.
//
// Usage: node tools/explore/ascending-node-inclination-coupling.js
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const SUPER_PERIOD = 8 * H;
const PLANET_KEYS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

// ═══════════════════════════════════════════════════════════════════════════
// PLANET DATA (from constants.js)
// ═══════════════════════════════════════════════════════════════════════════

const planets = {};
const genPrec = H / 13;

for (const key of ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
  const p = key === 'earth' ? null : C.planets[key];
  const mass = C.massFraction[key];
  const sqrtM = Math.sqrt(mass);
  const d = key === 'earth' ? 3 : p.fibonacciD;
  const amp = PSI / (d * sqrtM);
  const eclP = key === 'earth' ? H / 16 : p.perihelionEclipticYears;
  const icrfP = key === 'earth' ? H / 3 : 1 / (1 / eclP - 1 / genPrec);
  const icrfRate = 360 / icrfP;
  const periLong = key === 'earth' ? C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 : p.longitudePerihelion;
  const phaseAngle = key === 'earth' ? C.ASTRO_REFERENCE.earthInclinationPhaseAngle : p.inclinationPhaseAngle;
  const antiPhase = key === 'saturn';
  const inclJ2000 = key === 'earth' ? C.ASTRO_REFERENCE.earthInclinationJ2000_deg : p.invPlaneInclinationJ2000;
  const omegaJ2000 = key === 'earth' ? C.ASTRO_REFERENCE.earthAscendingNodeInvPlane : p.ascendingNodeInvPlane;
  const ascCycles = key === 'earth' ? 40 : p.ascendingNodeCyclesIn8H;
  const ascNodeRate = -360 * ascCycles / SUPER_PERIOD;
  const antiSign = antiPhase ? -1 : 1;
  const cosJ2000 = Math.cos((periLong - phaseAngle) * DEG2RAD);
  const mean = inclJ2000 - antiSign * amp * cosJ2000;

  planets[key] = {
    key, mass, sqrtM, d, amp, mean, icrfP, icrfRate,
    periLong, phaseAngle, antiPhase, inclJ2000, omegaJ2000,
    ascCycles, ascNodeRate, antiSign,
  };
}

// JPL ecliptic inclination trends (J2000-fixed frame, °/century)
const jplTrends = {
  mercury: -0.00595, venus: -0.00079,
  mars: -0.00813, jupiter: -0.00184, saturn: +0.00194,
  uranus: -0.00243, neptune: +0.00035,
};

// ═══════════════════════════════════════════════════════════════════════════
// MODEL A: CURRENT (decoupled) — I oscillates, Ω regresses linearly
// ═══════════════════════════════════════════════════════════════════════════

function modelA_state(key, year) {
  const p = planets[key];
  const peri = p.periLong + p.icrfRate * (year - 2000);
  const I = p.mean + p.antiSign * p.amp * Math.cos((peri - p.phaseAngle) * DEG2RAD);
  const Omega = p.omegaJ2000 + p.ascNodeRate * (year - 2000);
  return { I, Omega };
}

// ═══════════════════════════════════════════════════════════════════════════
// MODEL B: COUPLED (radial only in p,q space)
// ═══════════════════════════════════════════════════════════════════════════

function modelB_state(key, year) {
  const p = planets[key];
  const meanOmega = (p.omegaJ2000 + p.ascNodeRate * (year - 2000)) * DEG2RAD;
  const meanI = p.mean * DEG2RAD;
  const peri = p.periLong + p.icrfRate * (year - 2000);
  const phase = (peri - p.phaseAngle) * DEG2RAD;
  const deltaI = p.antiSign * p.amp * Math.cos(phase);
  const cosI = Math.cos(meanI);
  const dp = deltaI * DEG2RAD * cosI * Math.sin(meanOmega);
  const dq = deltaI * DEG2RAD * cosI * Math.cos(meanOmega);
  const pt = Math.sin(meanI) * Math.sin(meanOmega) + dp;
  const qt = Math.sin(meanI) * Math.cos(meanOmega) + dq;
  const sinI = Math.sqrt(pt * pt + qt * qt);
  const I = Math.asin(Math.min(1, sinI)) * RAD2DEG;
  const Omega = Math.atan2(pt, qt) * RAD2DEG;
  return { I, Omega: ((Omega % 360) + 360) % 360 };
}

// ═══════════════════════════════════════════════════════════════════════════
// MODEL C: FULL COUPLED (radial + tangential)
// ═══════════════════════════════════════════════════════════════════════════

function modelC_state(key, year) {
  const p = planets[key];
  const meanOmega = (p.omegaJ2000 + p.ascNodeRate * (year - 2000)) * DEG2RAD;
  const meanI = p.mean * DEG2RAD;
  const peri = p.periLong + p.icrfRate * (year - 2000);
  const phase = (peri - p.phaseAngle) * DEG2RAD;
  const deltaI = p.antiSign * p.amp * Math.cos(phase);
  const iRate = Math.abs(p.icrfRate);
  const oRate = Math.abs(p.ascNodeRate);
  const tangentialRatio = oRate / iRate;
  const cosI = Math.cos(meanI);
  const sinI = Math.sin(meanI);
  const dp_r = deltaI * DEG2RAD * cosI * Math.sin(meanOmega);
  const dq_r = deltaI * DEG2RAD * cosI * Math.cos(meanOmega);
  const deltaOmega = deltaI * tangentialRatio;
  const dp_t = sinI * Math.cos(meanOmega) * deltaOmega * DEG2RAD;
  const dq_t = -sinI * Math.sin(meanOmega) * deltaOmega * DEG2RAD;
  const pt = Math.sin(meanI) * Math.sin(meanOmega) + dp_r + dp_t;
  const qt = Math.sin(meanI) * Math.cos(meanOmega) + dq_r + dq_t;
  const sinIT = Math.sqrt(pt * pt + qt * qt);
  const I = Math.asin(Math.min(1, sinIT)) * RAD2DEG;
  const Omega = Math.atan2(pt, qt) * RAD2DEG;
  return { I, Omega: ((Omega % 360) + 360) % 360 };
}

// ═══════════════════════════════════════════════════════════════════════════
// ECLIPTIC INCLINATION — angle between two orbital planes
// ═══════════════════════════════════════════════════════════════════════════

function eclipticIncl(ps, es) {
  const pI = ps.I * DEG2RAD, eI = es.I * DEG2RAD;
  const pO = ps.Omega * DEG2RAD, eO = es.Omega * DEG2RAD;
  const dot = Math.sin(pI) * Math.sin(eI) * Math.cos(pO - eO) + Math.cos(pI) * Math.cos(eI);
  return Math.acos(Math.max(-1, Math.min(1, dot))) * RAD2DEG;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPUTE TRENDS in J2000-FIXED frame (Earth frozen at J2000)
// This matches JPL's published dI/dt directly
// ═══════════════════════════════════════════════════════════════════════════

const earthJ2000 = { I: planets.earth.inclJ2000, Omega: planets.earth.omegaJ2000 };

function computeTrend(modelFn, key) {
  // J2000-fixed: planet evolves, Earth frozen
  const p1900 = modelFn(key, 1900);
  const p2100 = modelFn(key, 2100);
  const i1900 = eclipticIncl(p1900, earthJ2000);
  const i2100 = eclipticIncl(p2100, earthJ2000);
  return (i2100 - i1900) / 2; // °/century
}

// Also compute moving-frame trend for comparison
function computeTrendMoving(modelFn, key) {
  const e1900 = modelFn('earth', 1900);
  const e2100 = modelFn('earth', 2100);
  const p1900 = modelFn(key, 1900);
  const p2100 = modelFn(key, 2100);
  return (eclipticIncl(p2100, e2100) - eclipticIncl(p1900, e1900)) / 2;
}

// ═══════════════════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════════════════

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║     ASCENDING NODE — INCLINATION COUPLING ANALYSIS                      ║');
console.log('║     All trends in J2000-FIXED frame (matching JPL convention)            ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝');
console.log('');

console.log('Planet     │ JPL (″/cy) │ Model A (decoupled)  │ Model B (radial)     │ Model C (full coupled)');
console.log('           │            │ trend    err    Dir   │ trend    err    Dir   │ trend    err    Dir');
console.log('───────────┼────────────┼──────────────────────┼──────────────────────┼──────────────────────');

let totalA = 0, totalB = 0, totalC = 0;
let dirMatchA = 0, dirMatchB = 0, dirMatchC = 0;

for (const key of PLANET_KEYS) {
  const jpl = jplTrends[key];
  const jplAs = jpl * 3600;

  const tA = computeTrend(modelA_state, key);
  const tB = computeTrend(modelB_state, key);
  const tC = computeTrend(modelC_state, key);

  const errA = Math.abs(tA - jpl) * 3600;
  const errB = Math.abs(tB - jpl) * 3600;
  const errC = Math.abs(tC - jpl) * 3600;

  const dA = (jpl >= 0) === (tA >= 0);
  const dB = (jpl >= 0) === (tB >= 0);
  const dC = (jpl >= 0) === (tC >= 0);

  totalA += errA; totalB += errB; totalC += errC;
  if (dA) dirMatchA++; if (dB) dirMatchB++; if (dC) dirMatchC++;

  const fmt = (t) => (t * 3600 >= 0 ? '+' : '') + (t * 3600).toFixed(2).padStart(7) + '″';
  const fmtE = (e) => e.toFixed(1).padStart(4) + '″';

  console.log(
    (key.charAt(0).toUpperCase() + key.slice(1)).padEnd(10) + ' │ ' +
    (jplAs >= 0 ? '+' : '') + jplAs.toFixed(2).padStart(7) + '″ │ ' +
    fmt(tA) + ' ' + fmtE(errA) + ' ' + (dA ? ' ✓  ' : ' ✗  ') + '│ ' +
    fmt(tB) + ' ' + fmtE(errB) + ' ' + (dB ? ' ✓  ' : ' ✗  ') + '│ ' +
    fmt(tC) + ' ' + fmtE(errC) + ' ' + (dC ? ' ✓  ' : ' ✗  ')
  );
}

console.log('───────────┼────────────┼──────────────────────┼──────────────────────┼──────────────────────');
console.log(
  'Total      │            │ ' +
  '         ' + totalA.toFixed(1).padStart(4) + '″ ' + dirMatchA + '/7  │ ' +
  '         ' + totalB.toFixed(1).padStart(4) + '″ ' + dirMatchB + '/7  │ ' +
  '         ' + totalC.toFixed(1).padStart(4) + '″ ' + dirMatchC + '/7'
);

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('CONCLUSION');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
if (totalB < totalA - 0.1) {
  console.log('  Model B (radial coupling) IMPROVES total trend error by ' + (totalA - totalB).toFixed(1) + '″/cy');
} else if (totalC < totalA - 0.1) {
  console.log('  Model C (full coupling) IMPROVES total trend error by ' + (totalA - totalC).toFixed(1) + '″/cy');
} else {
  console.log('  Coupling does NOT significantly improve trend errors.');
  console.log('  The decoupled model (A) is sufficient for current precision.');
}
console.log('');
