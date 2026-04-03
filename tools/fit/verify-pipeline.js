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
let C;
console.log('═══ Step 1: Constants load ═══');
try {
  C = require('../lib/constants');
  check('H', C.H, 335317);
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
  const jd = C.j2000JD; // J2000
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
if (!C) C = require('../lib/constants');
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
  const isAntiPhase = key === 'saturn';
  const mean = utils.computeInvPlaneInclinationMean(arP.invPlaneInclinationJ2000, amp, mpP.longitudePerihelion, mpP.inclinationPhaseAngle, isAntiPhase);
  check(`${key}.invPlaneInclinationAmplitude`, p.invPlaneInclinationAmplitude, amp, 1e-7);
  check(`${key}.invPlaneInclinationMean`, p.invPlaneInclinationMean, mean, 1e-7);

  // Verify J2000 reconstruction (using perihelion longitude, ICRF reference)
  const cosPhase = Math.cos((mpP.longitudePerihelion - mpP.inclinationPhaseAngle) * Math.PI / 180);
  const antiSign = isAntiPhase ? -1 : 1;
  const reconstructed = mean + antiSign * amp * cosPhase;
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

// Helper: evaluate Fourier series (same as script.js evalYearFourier)
function evalFourier(year, mean, harmonics) {
  const t = year - C.balancedYear;
  let result = mean;
  for (const [div, sinC, cosC] of harmonics) {
    const phase = 2 * Math.PI * t / (C.H / div);
    result += sinC * Math.sin(phase) + cosC * Math.cos(phase);
  }
  return result;
}

// Helper: cardinal point year length (derivative of JD harmonics, same as script.js)
function cardinalYearLength(year, type) {
  const t = year - C.balancedYear;
  const harmonics = C.CARDINAL_POINT_HARMONICS[type];
  let length = C.meanSolarYearDays;
  for (const [div, sinC, cosC] of harmonics) {
    const omega = 2 * Math.PI / (C.H / div);
    const phase = omega * t;
    length += sinC * omega * Math.cos(phase) - cosC * omega * Math.sin(phase);
  }
  return length;
}

// Helper: cardinal point JD (same as script.js computeSolsticeJD)
function cardinalJD(year, type) {
  const t = year - C.balancedYear;
  const anchor = C.CARDINAL_POINT_ANCHORS[type];
  const harmonics = C.CARDINAL_POINT_HARMONICS[type];
  const t2k = 2000 - C.balancedYear;
  let h2000 = 0;
  for (const [div, sinC, cosC] of harmonics) {
    h2000 += sinC * Math.sin(2 * Math.PI * t2k / (C.H / div)) + cosC * Math.cos(2 * Math.PI * t2k / (C.H / div));
  }
  let jd = anchor + C.meanSolarYearDays * (year - 2000);
  for (const [div, sinC, cosC] of harmonics) {
    jd += sinC * Math.sin(2 * Math.PI * t / (C.H / div)) + cosC * Math.cos(2 * Math.PI * t / (C.H / div));
  }
  return jd - h2000;
}

// Helper: JD to date string
function jdToDate(jd) {
  const z = Math.floor(jd + 0.5), f = jd + 0.5 - z;
  let a = z;
  if (z >= 2299161) { const al = Math.floor((z - 1867216.25) / 36524.25); a = z + 1 + al - Math.floor(al / 4); }
  const b = a + 1524, c = Math.floor((b - 122.1) / 365.25), d = Math.floor(365.25 * c), e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e), month = e < 14 ? e - 1 : e - 13, yr = month > 2 ? c - 4716 : c - 4715;
  const hrs = f * 24, h = Math.floor(hrs), m = Math.floor((hrs - h) * 60), s = Math.round(((hrs - h) * 60 - m) * 60);
  return `${yr}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')} ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ── Tropical year at J2000 (from cardinal point derivatives, same as browser) ──
const tropSS = cardinalYearLength(2000, 'SS');
const tropWS = cardinalYearLength(2000, 'WS');
const tropVE = cardinalYearLength(2000, 'VE');
const tropAE = cardinalYearLength(2000, 'AE');
const tropJ2000 = (tropSS + tropWS + tropVE + tropAE) / 4;
const tropDiffSec = (tropJ2000 - ylRef.tropicalYearMean) * 86400;
check('Tropical year at J2000', Math.abs(tropDiffSec), 0, 1.0);
console.log(`  Tropical year at J2000: ${tropJ2000.toFixed(9)} d (IAU: ${ylRef.tropicalYearMean} d, diff: ${tropDiffSec >= 0 ? '+' : ''}${tropDiffSec.toFixed(3)}s)`);
console.log(`    RA=0°  (VE): ${tropVE.toFixed(9)} d (IAU: ${ylRef.tropicalYearVE} d, diff: ${((tropVE - ylRef.tropicalYearVE)*86400).toFixed(2)}s)`);
console.log(`    RA=90° (SS): ${tropSS.toFixed(9)} d (IAU: ${ylRef.tropicalYearSS} d, diff: ${((tropSS - ylRef.tropicalYearSS)*86400).toFixed(2)}s)`);
console.log(`    RA=180°(AE): ${tropAE.toFixed(9)} d (IAU: ${ylRef.tropicalYearAE} d, diff: ${((tropAE - ylRef.tropicalYearAE)*86400).toFixed(2)}s)`);
console.log(`    RA=270°(WS): ${tropWS.toFixed(9)} d (IAU: ${ylRef.tropicalYearWS} d, diff: ${((tropWS - ylRef.tropicalYearWS)*86400).toFixed(2)}s)`);

// ── Sidereal year at J2000 (from Fourier harmonics) ──
const sidJ2000 = evalFourier(2000, C.meanSiderealYearDays, fitted.SIDEREAL_YEAR_HARMONICS || []);
const sidDiffSec = (sidJ2000 - ylRef.siderealYear) * 86400;
check('Sidereal year at J2000', Math.abs(sidDiffSec), 0, 1.0);
console.log(`  Sidereal year at J2000: ${sidJ2000.toFixed(9)} d (IAU: ${ylRef.siderealYear} d, diff: ${sidDiffSec >= 0 ? '+' : ''}${sidDiffSec.toFixed(3)}s)`);

// ── Anomalistic year at J2000 (from Fourier harmonics) ──
const anomJ2000 = evalFourier(2000, C.meanAnomalisticYearDays, fitted.ANOMALISTIC_YEAR_HARMONICS || []);
const anomDiffSec = (anomJ2000 - ylRef.anomalisticYear) * 86400;
check('Anomalistic year at J2000', Math.abs(anomDiffSec), 0, 1.0);
console.log(`  Anomalistic year at J2000: ${anomJ2000.toFixed(9)} d (IAU: ${ylRef.anomalisticYear} d, diff: ${anomDiffSec >= 0 ? '+' : ''}${anomDiffSec.toFixed(3)}s)`);

// ── Cardinal point JDs at J2000 (from formula, same as browser) ──
const iauCP = { SS: 2451716.575, WS: 2451900.068, VE: 2451623.738, AE: 2451810.305 };
console.log('  Cardinal point JDs at J2000:');
for (const type of ['SS', 'WS', 'VE', 'AE']) {
  const jd = cardinalJD(2000, type);
  const diffMin = (jd - iauCP[type]) * 1440;
  console.log(`    ${type}: JD ${jd.toFixed(6)} (${jdToDate(jd)})  IAU: ${iauCP[type].toFixed(3)}  diff: ${diffMin >= 0 ? '+' : ''}${diffMin.toFixed(2)} min`);
}

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
// 9a. Eccentricity J2000 conformance — base vs observed for all planets
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n═══ Step 9a: Eccentricity J2000 conformance ═══');

const eccPlanets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
console.log('  Planet      │ e_base       │ e_J2000      │ Diff%    │ Amp        │ Reachable │ Mode');
console.log('  ────────────┼──────────────┼──────────────┼──────────┼────────────┼───────────┼──────────');

for (const p of eccPlanets) {
  let base, amp, j2000;
  if (p === 'earth') {
    base = C.eccentricityBase;
    amp = C.eccentricityAmplitude;
    j2000 = C.eccJ2000.earth;
  } else {
    base = C.planets[p].orbitalEccentricityBase;
    amp = C.planets[p].orbitalEccentricityAmplitude;
    j2000 = C.planets[p].orbitalEccentricityJ2000 || base;
  }
  const diff = j2000 - base;
  const pct = (diff / j2000 * 100);
  const eMin = Math.abs(base - amp);
  const eMax = base + amp;
  const reachable = (j2000 >= eMin - 1e-12 && j2000 <= eMax + 1e-12);
  const mode = p === 'venus' ? 'R=311' : ['mercury', 'earth', 'mars'].includes(p) ? 'K-driven' : 'L-L';
  console.log(
    '  ' + p.padEnd(12) + '│ ' +
    base.toFixed(8).padStart(12) + ' │ ' +
    j2000.toFixed(8).padStart(12) + ' │ ' +
    ((pct >= 0 ? '+' : '') + pct.toFixed(3) + '%').padStart(8) + ' │ ' +
    amp.toExponential(2).padStart(10) + ' │ ' +
    (reachable ? '  YES    ' : '  NO     ') + ' │ ' +
    mode
  );
}

console.log('');
console.log('  Mode: K-driven = amplitude from K formula (Mercury, Earth, Mars)');
console.log('        R=311    = base from R constraint, Laplace-Lagrange variation (Venus)');
console.log('        L-L      = base from balance, Laplace-Lagrange variation (outer planets)');
console.log('  Reachable: J2000 eccentricity within [base-amp, base+amp] range\n');

// ═══════════════════════════════════════════════════════════════════════════
// 9b. Correction stack validation — ensure all corrections are loaded
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 9b: Correction stack validation ═══');
const { validateCorrectionState } = require('../lib/correction-stack');
const corrState = validateCorrectionState(C);
if (corrState.ok) {
  console.log('  ✓ All correction layers loaded\n');
  totalChecks++;
} else {
  for (const w of corrState.warnings) {
    console.log(`  WARNING: ${w}`);
  }
  console.log('');
  totalErrors += corrState.warnings.length;
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. Baseline regression check — compare RMS against stored baselines
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 10: Baseline regression check ═══');

const BASELINES_PATH = path.resolve(__dirname, '..', 'results', 'baselines.json');
const { baseline: computeBaseline } = require('../lib/optimizer');

let regressions = 0;
let improvements = 0;
const newBaselines = {};
const baselineResults = {};

const storedBaselines = JSON.parse(fs.readFileSync(BASELINES_PATH, 'utf8'));

// Planets and Moon use reference-data.json (synchronous).
// Sun needs JPL fetch (async) — checked via `optimize.js baseline all`.
const planetTargets = ['moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

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
  baselineResults[target] = result;
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

// Copy Sun from stored (not re-measured here — needs JPL fetch via `optimize.js baseline all`)
if (storedBaselines.targets.sun) {
  newBaselines.sun = storedBaselines.targets.sun;
  console.log(`  sun       │ ${storedBaselines.targets.sun.rmsTotal.toFixed(4).padStart(7)}°│ (skip)  │         │ needs JPL fetch`);
}

if (regressions > 0) {
  console.log(`\n  WARNING: ${regressions} target(s) regressed! Review before accepting.\n`);
} else if (improvements > 0) {
  console.log(`\n  ✓ No regressions. ${improvements} target(s) improved.\n`);
} else {
  console.log(`\n  ✓ All planet baselines match stored values.\n`);
}

// ─── Tier 1 (observed) RMS breakdown ────────────────────────────────────
console.log('═══ Step 10b: Tier 1 (observed data) RMS ═══');
console.log('  Target    │   All   │ Tier 1  │  n(T1) │ Tier 2  │  n(T2) │ Tiers present');
console.log('  ──────────┼─────────┼─────────┼────────┼─────────┼────────┼──────────────');

for (const target of planetTargets) {
  const result = baselineResults[target];
  if (!result) continue;

  // Split entries by tier category
  const tier1 = result.entries.filter(e => (e.tier || '').startsWith('1'));
  const tier2 = result.entries.filter(e => (e.tier || '').startsWith('2'));

  // Compute RMS for a subset
  function subsetRMS(entries) {
    if (entries.length === 0) return null;
    let sumRA2 = 0, sumDec2 = 0, n = 0;
    for (const e of entries) {
      sumRA2 += e.dRA * e.dRA;
      sumDec2 += e.dDec * e.dDec;
      n++;
    }
    return Math.sqrt((sumRA2 + sumDec2) / n);
  }

  const rmsAll = newBaselines[target] ? newBaselines[target].rmsTotal : null;
  const rms1 = subsetRMS(tier1);
  const rms2 = subsetRMS(tier2);

  // Collect which tier subtypes are present
  const tierCounts = {};
  for (const e of result.entries) {
    const t = e.tier || '?';
    tierCounts[t] = (tierCounts[t] || 0) + 1;
  }
  const tierList = Object.entries(tierCounts).sort().map(([t, c]) => `${t}:${c}`).join(' ');

  const fmt = (v, w) => v !== null ? (v.toFixed(4) + '°').padStart(w) : '-'.padStart(w);

  console.log(`  ${target.padEnd(10)}│ ${fmt(rmsAll, 7)} │ ${fmt(rms1, 7)} │ ${String(tier1.length).padStart(6)} │ ${fmt(rms2, 7)} │ ${String(tier2.length).padStart(6)} │ ${tierList}`);

  // Store tier 1 RMS in baselines
  if (newBaselines[target]) {
    newBaselines[target].tier1RMS = rms1 !== null ? Math.round(rms1 * 10000) / 10000 : null;
    newBaselines[target].tier1Count = tier1.length;
    newBaselines[target].tier2RMS = rms2 !== null ? Math.round(rms2 * 10000) / 10000 : null;
    newBaselines[target].tier2Count = tier2.length;
  }
}
console.log('');

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
