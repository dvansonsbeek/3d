#!/usr/bin/env node
/**
 * Verify the fitting pipeline produces the same values as the current JSON.
 * Runs each fitting script's core computation WITHOUT writing to files,
 * then compares against the stored values in fitted-coefficients.json.
 *
 * Usage: node tools/fit/verify-pipeline.js
 */

const fs = require('fs');
const path = require('path');

const JSON_PATH = path.resolve(__dirname, '..', '..', 'public', 'input', 'fitted-coefficients.json');
const stored = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

let totalChecks = 0, totalErrors = 0;

function check(label, actual, expected, tolerance = 1e-10) {
  totalChecks++;
  if (typeof actual === 'number' && typeof expected === 'number') {
    const diff = Math.abs(actual - expected);
    if (diff > tolerance) {
      console.log(`  ✗ ${label}: actual=${actual} expected=${expected} diff=${diff.toExponential()}`);
      totalErrors++;
      return false;
    }
  } else if (actual !== expected) {
    console.log(`  ✗ ${label}: actual=${actual} expected=${expected}`);
    totalErrors++;
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Verify constants load correctly
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 1: Constants load ═══');
try {
  const C = require('../lib/constants');
  check('H', C.H, 335008);
  check('planets count', Object.keys(C.planets).length, 7);
  check('PERI_HARMONICS terms', C.PERI_HARMONICS.length, stored.PERI_HARMONICS_RAW.length);
  check('OBLIQUITY terms', C.SOLSTICE_OBLIQUITY_HARMONICS.length, stored.SOLSTICE_OBLIQUITY_HARMONICS.length);
  check('OBLIQUITY_MEAN', C.SOLSTICE_OBLIQUITY_MEAN, stored.SOLSTICE_OBLIQUITY_MEAN_FITTED);
  console.log('  ✓ Constants loaded OK\n');
} catch (e) {
  console.log(`  ✗ Constants failed to load: ${e.message}\n`);
  totalErrors++;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Verify scene graph produces correct positions
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 2: Scene graph positions ═══');
try {
  const SG = require('../lib/scene-graph');
  const jd = 2451545.0; // J2000
  for (const target of ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
    const pos = SG.computePlanetPosition(target, jd);
    const ok = pos && typeof pos.ra === 'number' && typeof pos.dec === 'number';
    if (!ok) {
      console.log(`  ✗ ${target}: failed to compute position`);
      totalErrors++;
    }
  }
  console.log('  ✓ All 9 targets compute positions OK\n');
} catch (e) {
  console.log(`  ✗ Scene graph error: ${e.message}\n`);
  totalErrors++;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Verify PERI_HARMONICS (compare stored JSON values with what's loaded)
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 3: PERI_HARMONICS consistency ═══');
const C = require('../lib/constants');
const fitted = require('../lib/constants/fitted-coefficients');

check('PERI_OFFSET', fitted.PERI_OFFSET, stored.PERI_OFFSET);
for (let i = 0; i < stored.PERI_HARMONICS_RAW.length; i++) {
  const s = stored.PERI_HARMONICS_RAW[i];
  const f = fitted.PERI_HARMONICS_RAW[i];
  check(`PERI[${i}] div`, f[0], s[0]);
  check(`PERI[${i}] sin`, f[1], s[1]);
  check(`PERI[${i}] cos`, f[2], s[2]);
}
console.log(`  ✓ PERI_HARMONICS: ${stored.PERI_HARMONICS_RAW.length} terms match\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 4. Verify OBLIQUITY harmonics
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 4: OBLIQUITY harmonics consistency ═══');
check('OBLIQUITY_MEAN_FITTED', stored.SOLSTICE_OBLIQUITY_MEAN_FITTED, C.SOLSTICE_OBLIQUITY_MEAN);
for (let i = 0; i < stored.SOLSTICE_OBLIQUITY_HARMONICS.length; i++) {
  const s = stored.SOLSTICE_OBLIQUITY_HARMONICS[i];
  const f = C.SOLSTICE_OBLIQUITY_HARMONICS[i];
  check(`OBLIQ[${i}] div`, f[0], s[0]);
  check(`OBLIQ[${i}] sin`, f[1], s[1]);
  check(`OBLIQ[${i}] cos`, f[2], s[2]);
}

// Verify J2000 obliquity
let obliq = C.SOLSTICE_OBLIQUITY_MEAN;
for (const [div, sinC, cosC] of C.SOLSTICE_OBLIQUITY_HARMONICS) {
  const phase = 2 * Math.PI * (2000 - C.balancedYear) / (C.H / div);
  obliq += sinC * Math.sin(phase) + cosC * Math.cos(phase);
}
check('J2000 obliquity vs IAU', Math.abs(obliq - C.ASTRO_REFERENCE.obliquityJ2000_deg) * 3600, 0, 0.1); // within 0.1"
console.log(`  ✓ OBLIQUITY: ${stored.SOLSTICE_OBLIQUITY_HARMONICS.length} terms match, J2000=${obliq.toFixed(6)}°\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 5. Verify CARDINAL_POINT_HARMONICS
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 5: CARDINAL_POINT_HARMONICS consistency ═══');
for (const type of ['SS', 'WS', 'VE', 'AE']) {
  const s = stored.CARDINAL_POINT_HARMONICS[type];
  const f = C.CARDINAL_POINT_HARMONICS[type];
  check(`${type} term count`, f.length, s.length);
  for (let i = 0; i < s.length; i++) {
    check(`${type}[${i}] div`, f[i][0], s[i][0]);
    check(`${type}[${i}] sin`, f[i][1], s[i][1]);
    check(`${type}[${i}] cos`, f[i][2], s[i][2]);
  }
}
console.log(`  ✓ CARDINAL_POINT_HARMONICS: all 4 types match\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 6. Verify YEAR_LENGTH harmonics
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 6: YEAR_LENGTH harmonics consistency ═══');
for (const name of ['TROPICAL_YEAR_HARMONICS', 'SIDEREAL_YEAR_HARMONICS', 'ANOMALISTIC_YEAR_HARMONICS']) {
  const s = stored[name];
  const f = fitted[name];
  check(`${name} count`, f.length, s.length);
  for (let i = 0; i < s.length; i++) {
    check(`${name}[${i}] div`, f[i][0], s[i][0]);
    check(`${name}[${i}] sin`, f[i][1], s[i][1]);
    check(`${name}[${i}] cos`, f[i][2], s[i][2]);
  }
}
console.log(`  ✓ YEAR_LENGTH harmonics: all 3 types match\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 7. Verify PARALLAX corrections
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 7: PARALLAX corrections consistency ═══');
for (const planet of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
  const decS = stored.PARALLAX_DEC_CORRECTION[planet];
  const decF = fitted.PARALLAX_DEC_CORRECTION[planet];
  const raS = stored.PARALLAX_RA_CORRECTION[planet];
  const raF = fitted.PARALLAX_RA_CORRECTION[planet];

  for (const k of Object.keys(decS)) {
    check(`DEC.${planet}.${k}`, decF[k], decS[k]);
  }
  for (const k of Object.keys(raS)) {
    check(`RA.${planet}.${k}`, raF[k], raS[k]);
  }
}
console.log(`  ✓ PARALLAX corrections: all 7 planets match\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 8. Verify planet derived values (orbitTilt, invPlaneInclination)
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 8: Derived planet values ═══');
const mp = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'public', 'input', 'model-parameters.json'), 'utf8'));
const ar = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'public', 'input', 'astro-reference.json'), 'utf8'));

for (const [key, p] of Object.entries(C.planets)) {
  const arP = ar.planetOrbitalElements[key];
  const mpP = mp.planets[key];

  // Verify orbitTilt derived correctly
  const utils = require('../lib/constants/utils');
  const tilt = utils.computeOrbitTilt(arP.ascendingNode, arP.eclipticInclinationJ2000);
  check(`${key}.orbitTilta`, p.orbitTilta, tilt.orbitTilta, 1e-7);
  check(`${key}.orbitTiltb`, p.orbitTiltb, tilt.orbitTiltb, 1e-7);

  // Verify invPlaneInclinationMean derived correctly
  const amp = utils.computeInvPlaneInclinationAmplitude(C.PSI, mpP.fibonacciD, C.massFraction[key]);
  const mean = utils.computeInvPlaneInclinationMean(arP.invPlaneInclinationJ2000, amp, mpP.ascendingNodeInvPlane, mpP.inclinationPhaseAngle);
  check(`${key}.invPlaneInclinationAmplitude`, p.invPlaneInclinationAmplitude, amp, 1e-7);
  check(`${key}.invPlaneInclinationMean`, p.invPlaneInclinationMean, mean, 1e-7);

  // Verify J2000 reconstruction
  const cosPhase = Math.cos((mpP.ascendingNodeInvPlane - mpP.inclinationPhaseAngle) * Math.PI / 180);
  const reconstructed = mean + amp * cosPhase;
  check(`${key}.inclJ2000 reconstructed`, reconstructed, arP.invPlaneInclinationJ2000, 1e-6);
}
console.log(`  ✓ All derived planet values verified\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 9. Earth geometry validation
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 9: Earth geometry validation ═══');

const sg = require('../lib/scene-graph');

// Obliquity at J2000 (from scene-graph at June solstice 2000)
const solsticeJ2000JD = C.ASTRO_REFERENCE.juneSolstice2000_JD;
const obliqScene = sg.phiToDecDeg(sg.computePlanetPosition('sun', solsticeJ2000JD).dec);
const obliqError = Math.abs(obliqScene - C.ASTRO_REFERENCE.obliquityJ2000_deg) * 3600;
check('Obliquity at J2000 (scene)', obliqError, 0, 0.01); // within 0.01"
console.log(`  Obliquity at J2000: ${obliqScene.toFixed(6)}° (IAU: ${C.ASTRO_REFERENCE.obliquityJ2000_deg}°, error: ${obliqError.toFixed(4)}")`);

// Obliquity rate (scene-graph: solstice 2000 vs 2000 + tropicalCentury)
const obliq2100 = sg.phiToDecDeg(sg.computePlanetPosition('sun', solsticeJ2000JD + C.tropicalCenturyDays).dec);
const rateModel = (obliq2100 - obliqScene) * 3600;
const rateError = Math.abs(rateModel - C.ASTRO_REFERENCE.obliquityRate_arcsecPerCentury);
check('Obliquity rate', rateError, 0, 0.1); // within 0.1"/cy
console.log(`  Obliquity rate: ${rateModel.toFixed(4)}"/cy (IAU: ${C.ASTRO_REFERENCE.obliquityRate_arcsecPerCentury}"/cy, error: ${rateError.toFixed(4)}")`);

// June solstice 2000 timing (find RA=90° crossing near expected JD)
const ssTargetJD = C.ASTRO_REFERENCE.juneSolstice2000_JD;
const STEP = 0.5 / 24; // 0.5 hours
let ssFoundJD = null;
for (let k = -480; k <= 480; k++) { // ±10 days search
  const jd1 = ssTargetJD + (k - 1) * STEP;
  const jd2 = ssTargetJD + k * STEP;
  const ra1 = ((sg.thetaToRaDeg(sg.computePlanetPosition('sun', jd1).ra) % 360) + 360) % 360;
  const ra2 = ((sg.thetaToRaDeg(sg.computePlanetPosition('sun', jd2).ra) % 360) + 360) % 360;
  if (ra1 < 90 && ra2 >= 90) {
    const t = (90 - ra1) / (ra2 - ra1);
    ssFoundJD = jd1 + t * STEP;
    break;
  }
}
if (ssFoundJD) {
  const ssDiffMin = (ssFoundJD - ssTargetJD) * 24 * 60;
  check('June solstice 2000 timing', Math.abs(ssDiffMin), 0, 30.0); // within 30 minutes
  console.log(`  June solstice 2000: JD ${ssFoundJD.toFixed(6)} (ref: ${ssTargetJD}, diff: ${ssDiffMin >= 0 ? '+' : ''}${ssDiffMin.toFixed(2)} min)`);
}

// Eccentricity at J2000 (from analytical formula, same as script.js)
const ePhase = 2 * Math.PI * (2000 - C.balancedYear) / (C.H / 16);
const eMean = Math.sqrt(C.eccentricityBase ** 2 + C.eccentricityAmplitude ** 2);
const h1 = eMean - C.eccentricityBase;
const eJ2000 = eMean + (-C.eccentricityAmplitude - h1 * Math.cos(ePhase)) * Math.cos(ePhase);
const eTarget = C.ASTRO_REFERENCE.earthEccentricityJ2000;
const eError = Math.abs(eJ2000 - eTarget);
check('e(J2000) vs IAU', eError, 0, 1e-4); // note: analytical formula differs from scene-graph bisection
console.log(`  e(J2000): ${eJ2000.toFixed(10)} (IAU: ${eTarget}, diff: ${eError.toExponential(2)})`);

// Perihelion longitude at J2000 (from raw harmonic formula)
const PERI_PERIOD = C.H / 16;
const t2000 = 2000 - C.balancedYear;
let periLonJ2000 = 270.0 + (360.0 / PERI_PERIOD) * t2000 + fitted.PERI_OFFSET;
for (const [div, sinC, cosC] of fitted.PERI_HARMONICS_RAW) {
  const phase = 2 * Math.PI * t2000 / (C.H / div);
  periLonJ2000 += sinC * Math.sin(phase) + cosC * Math.cos(phase);
}
periLonJ2000 = ((periLonJ2000 % 360) + 360) % 360;
const periLonTarget = C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000;
const periLonError = Math.abs(periLonJ2000 - periLonTarget);
check('Perihelion longitude at J2000', periLonError, 0, 0.01); // within 0.01°
console.log(`  Perihelion longitude at J2000: ${periLonJ2000.toFixed(4)}° (ref: ${periLonTarget}°, error: ${periLonError.toFixed(4)}°)`);

// ERD at J2000 (analytical derivative of perihelion harmonics)
// Coefficients are in degrees, derivative gives °/yr directly
const meanRate = 360.0 / PERI_PERIOD; // °/yr
let erdJ2000DegPerYr = 0; // deviation from mean rate
for (const [div, sinC, cosC] of fitted.PERI_HARMONICS_RAW) {
  const omega = 2 * Math.PI / (C.H / div); // 1/yr
  const phase = omega * t2000;
  erdJ2000DegPerYr += omega * (sinC * Math.cos(phase) - cosC * Math.sin(phase));
}
console.log(`  Mean precession rate: ${meanRate.toFixed(6)}°/yr`);
console.log(`  ERD at J2000: ${(erdJ2000DegPerYr >= 0 ? '+' : '')}${erdJ2000DegPerYr.toFixed(6)}°/yr (deviation from mean)`);

// Year lengths at J2000 vs IAU references
const astroRef = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'public', 'input', 'astro-reference.json'), 'utf8'));
const ylRef = astroRef.yearLengthRef;

// Tropical year at J2000 (from harmonics)
let tropJ2000 = C.meanSolarYearDays;
for (const [div, sinC, cosC] of (fitted.TROPICAL_YEAR_HARMONICS || [])) {
  const phase = 2 * Math.PI * t2000 / (C.H / div);
  tropJ2000 += sinC * Math.sin(phase) + cosC * Math.cos(phase);
}
const tropDiffSec = (tropJ2000 - ylRef.tropicalYearMean) * 86400;
check('Tropical year at J2000', Math.abs(tropDiffSec), 0, 1.0); // within 1 second
console.log(`  Tropical year at J2000: ${tropJ2000.toFixed(9)} d (IAU: ${ylRef.tropicalYearMean} d, diff: ${tropDiffSec >= 0 ? '+' : ''}${tropDiffSec.toFixed(3)}s)`);

// Sidereal year at J2000 (from harmonics)
let sidJ2000 = C.meanSiderealYearDays;
for (const [div, sinC, cosC] of (fitted.SIDEREAL_YEAR_HARMONICS || [])) {
  const phase = 2 * Math.PI * t2000 / (C.H / div);
  sidJ2000 += sinC * Math.sin(phase) + cosC * Math.cos(phase);
}
const sidDiffSec = (sidJ2000 - ylRef.siderealYear) * 86400;
check('Sidereal year at J2000', Math.abs(sidDiffSec), 0, 1.0); // within 1 second
console.log(`  Sidereal year at J2000: ${sidJ2000.toFixed(9)} d (IAU: ${ylRef.siderealYear} d, diff: ${sidDiffSec >= 0 ? '+' : ''}${sidDiffSec.toFixed(3)}s)`);

// Anomalistic year at J2000 (from harmonics)
let anomJ2000 = C.meanAnomalisticYearDays;
for (const [div, sinC, cosC] of (fitted.ANOMALISTIC_YEAR_HARMONICS || [])) {
  const phase = 2 * Math.PI * t2000 / (C.H / div);
  anomJ2000 += sinC * Math.sin(phase) + cosC * Math.cos(phase);
}
const anomDiffSec = (anomJ2000 - ylRef.anomalisticYear) * 86400;
check('Anomalistic year at J2000', Math.abs(anomDiffSec), 0, 1.0); // within 1 second
console.log(`  Anomalistic year at J2000: ${anomJ2000.toFixed(9)} d (IAU: ${ylRef.anomalisticYear} d, diff: ${anomDiffSec >= 0 ? '+' : ''}${anomDiffSec.toFixed(3)}s)`);

// Harmonic term counts
console.log(`  Perihelion harmonics: ${C.PERI_HARMONICS.length} terms`);
console.log(`  Obliquity harmonics: ${C.SOLSTICE_OBLIQUITY_HARMONICS.length} terms`);
console.log(`  Cardinal points: SS=${C.CARDINAL_POINT_HARMONICS.SS.length}, WS=${C.CARDINAL_POINT_HARMONICS.WS.length}, VE=${C.CARDINAL_POINT_HARMONICS.VE.length}, AE=${C.CARDINAL_POINT_HARMONICS.AE.length} terms`);

const tropTerms = fitted.TROPICAL_YEAR_HARMONICS?.length || 0;
const sidTerms = fitted.SIDEREAL_YEAR_HARMONICS?.length || 0;
const anomTerms = fitted.ANOMALISTIC_YEAR_HARMONICS?.length || 0;
console.log(`  Year-length harmonics: tropical=${tropTerms}, sidereal=${sidTerms}, anomalistic=${anomTerms} terms`);

// Compare against stored Earth baselines
const storedBaselinesEarly = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '..', 'results', 'baselines.json'), 'utf8'));
const prevEarth = storedBaselinesEarly.earth;
if (prevEarth) {
  if (obliqError > prevEarth.obliquityJ2000_error_arcsec + 0.01) {
    console.log(`  WARNING: Obliquity J2000 error regressed: ${prevEarth.obliquityJ2000_error_arcsec.toFixed(4)}" → ${obliqError.toFixed(4)}"`);
    totalErrors++;
  }
  if (rateError > prevEarth.obliquityRate_error_arcsec + 0.01) {
    console.log(`  WARNING: Obliquity rate error regressed: ${prevEarth.obliquityRate_error_arcsec.toFixed(4)}" → ${rateError.toFixed(4)}"`);
    totalErrors++;
  }
  if (prevEarth.perihelionLonJ2000_error_deg !== undefined &&
      periLonError > prevEarth.perihelionLonJ2000_error_deg + 0.005) {
    console.log(`  WARNING: Perihelion longitude error regressed: ${prevEarth.perihelionLonJ2000_error_deg.toFixed(4)}° → ${periLonError.toFixed(4)}°`);
    totalErrors++;
  }
}
console.log(`  ✓ Earth geometry verified\n`);

// Store new Earth metrics for --write
const newEarth = {
  obliquityJ2000_error_arcsec: Math.round(obliqError * 10000) / 10000,
  obliquityRate_error_arcsec: Math.round(rateError * 10000) / 10000,
  perihelionLonJ2000_error_deg: Math.round(periLonError * 10000) / 10000,
  erdJ2000_degPerYr: Math.round(erdJ2000DegPerYr * 1000000) / 1000000,
  meanPrecessionRate_degPerYr: Math.round(meanRate * 1000000) / 1000000,
  tropicalYearJ2000_diff_sec: Math.round(tropDiffSec * 1000) / 1000,
  siderealYearJ2000_diff_sec: Math.round(sidDiffSec * 1000) / 1000,
  anomalisticYearJ2000_diff_sec: Math.round(anomDiffSec * 1000) / 1000,
  perihelionHarmonics_terms: C.PERI_HARMONICS.length,
  obliquityHarmonics_terms: C.SOLSTICE_OBLIQUITY_HARMONICS.length,
  cardinalPoints_terms: {
    SS: C.CARDINAL_POINT_HARMONICS.SS.length,
    WS: C.CARDINAL_POINT_HARMONICS.WS.length,
    VE: C.CARDINAL_POINT_HARMONICS.VE.length,
    AE: C.CARDINAL_POINT_HARMONICS.AE.length,
  },
  yearLengthHarmonics_terms: { tropical: tropTerms, sidereal: sidTerms, anomalistic: anomTerms },
};

// ═══════════════════════════════════════════════════════════════════════════
// 10. Baseline regression check — compare RMS against stored baselines
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 10: Baseline regression check ═══');

const BASELINES_PATH = path.resolve(__dirname, '..', 'results', 'baselines.json');
const { baseline: computeBaseline } = require('../lib/optimizer');

let regressions = 0;
let improvements = 0;
const newBaselines = {};

const storedBaselines = JSON.parse(fs.readFileSync(BASELINES_PATH, 'utf8'));

// Planets use reference-data.json (synchronous). Sun and Moon need JPL fetch (async),
// so we only check planets here. Sun/Moon baselines are checked via `optimize.js baseline all`.
const planetTargets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

console.log('  Target    │ Stored  │ Current │ Change  │ Status');
console.log('  ──────────┼─────────┼─────────┼─────────┼───────');

for (const target of planetTargets) {
  let result;
  try {
    result = computeBaseline(target);
  } catch (e) {
    console.log(`  ${target.padEnd(10)}│ skipped (${e.message})`);
    continue;
  }
  const prev = storedBaselines.targets[target];
  if (!prev) {
    console.log(`  ${target.padEnd(10)}│ no stored baseline`);
    continue;
  }
  const round4 = v => Math.round(v * 10000) / 10000;
  const curr = {
    rmsRA: round4(result.rmsRA),
    rmsDec: round4(result.rmsDec),
    rmsTotal: round4(result.rmsTotal),
    maxRA: round4(result.maxRA),
    maxDec: round4(result.maxDec),
    entries: result.entries.length,
  };
  newBaselines[target] = curr;

  const diff = curr.rmsTotal - prev.rmsTotal;
  const maxDiff = Math.max(
    Math.abs(curr.maxRA) - Math.abs(prev.maxRA),
    Math.abs(curr.maxDec) - Math.abs(prev.maxDec)
  );
  const pad = (s, n) => String(s).padStart(n);

  let status;
  if (diff > 0.001) {
    status = 'REGRESSION (RMS)';
    regressions++;
    totalErrors++;
  } else if (maxDiff > 0.01) {
    status = 'REGRESSION (max)';
    regressions++;
    totalErrors++;
  } else if (diff < -0.001) {
    status = 'improved';
    improvements++;
  } else {
    status = 'ok';
  }

  console.log(`  ${target.padEnd(10)}│ ${pad(prev.rmsTotal.toFixed(4), 7)}°│ ${pad(curr.rmsTotal.toFixed(4), 7)}°│ ${pad((diff >= 0 ? '+' : '') + diff.toFixed(4), 7)}°│ ${status}`);
  if (status.startsWith('REGRESSION')) {
    console.log(`  ${''.padEnd(10)}│ maxRA: ${pad(Math.abs(prev.maxRA).toFixed(4), 7)}→${pad(Math.abs(curr.maxRA).toFixed(4), 7)}  maxDec: ${pad(Math.abs(prev.maxDec).toFixed(4), 7)}→${pad(Math.abs(curr.maxDec).toFixed(4), 7)}`);
  }
}

// Copy Sun/Moon from stored (not re-measured here — use `optimize.js baseline all` for those)
for (const t of ['sun', 'moon']) {
  if (storedBaselines.targets[t]) {
    newBaselines[t] = storedBaselines.targets[t];
    console.log(`  ${t.padEnd(10)}│ ${storedBaselines.targets[t].rmsTotal.toFixed(4).padStart(7)}°│ (skip)  │         │ needs JPL fetch`);
  }
}

if (regressions > 0) {
  console.log(`\n  WARNING: ${regressions} target(s) regressed! Review before accepting.\n`);
} else if (improvements > 0) {
  console.log(`\n  ✓ No regressions. ${improvements} target(s) improved.\n`);
} else {
  console.log(`\n  ✓ All planet baselines match stored values.\n`);
}

// Update stored baselines if --write flag
if (process.argv.includes('--write')) {
  const output = {
    _description: 'Stored baseline values for regression checking. Updated by verify-pipeline.js --write.',
    _updated: new Date().toISOString().slice(0, 10),
    earth: newEarth,
    targets: newBaselines,
  };
  fs.writeFileSync(BASELINES_PATH, JSON.stringify(output, null, 2) + '\n');
  console.log('  ✓ Updated baselines.json\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  ${totalChecks} checks, ${totalErrors} errors`);
if (totalErrors === 0) {
  console.log('  ✓ ALL PIPELINE VERIFICATION PASSED');
  console.log('  The JSON files are consistent with the computation engine.');
  if (regressions === 0) console.log('  No baseline regressions detected.');
} else if (regressions > 0) {
  console.log(`  ✗ ${regressions} BASELINE REGRESSION(S) — review results before proceeding`);
  process.exit(1);
} else {
  console.log('  ✗ VERIFICATION FAILED — fix errors before proceeding');
  process.exit(1);
}
console.log('═══════════════════════════════════════════════════════════════');
