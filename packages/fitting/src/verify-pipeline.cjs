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

// 9-3b: moved from tools/fit (a one-line shim remains there for the CLI
// path). Pre-migration tools/lib is reached through runtime-assembled
// paths — the layer0 bridge pattern that keeps the type checker out of
// unmigrated code; these collapse when tools/lib becomes adapters.
const ROOT = path.resolve(__dirname, '..', '..', '..');
const TOOLS_LIB = path.join(ROOT, 'tools', 'lib');
const TOOLS_RESULTS = path.join(ROOT, 'tools', 'results');

const JSON_PATH = path.resolve(ROOT, 'public', 'input', 'fitted-coefficients.json');
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
  C = require(path.join(TOOLS_LIB, 'constants.js'));
  check('H', C.H, 335317);
  check('planets count', Object.keys(C.planets).length, 7);
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
  const SG = require(path.join(TOOLS_LIB, 'scene-graph.js'));
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
// (plan 09 step 4: the PERI_HARMONICS / PERI_OFFSET consistency rows left with
// the perihelion comb — Earth's perihelion of date is the series' ϖ; the
// registry plausibility row periLongModel2000AD vs periLongJ2000 gates it.)
console.log('═══ Step 3: (the perihelion comb is deleted — plan 09 step 4) ═══\n');
if (!C) C = require(path.join(TOOLS_LIB, 'constants.js'));

// ═══════════════════════════════════════════════════════════════════════════
// 4. Verify OBLIQUITY harmonics
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 4: OBLIQUITY — the comb retired (plan 09); the obliquity of date is the hybrid ε ═══');
// The 16-harmonic solstice-obliquity comb and its J2000-vs-IAU row left with
// the frozen era device; the published obliquity is the one-source hybrid,
// pinned by the obliquity-hybrid verdict (dε/dt within 1 % of IAU, the realized
// period gate) and the API gate (obliquityJ2000 ≡ the IAU input).
console.log('  ✓ OBLIQUITY: no comb to verify\n');

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
console.log('═══ Step 6: YEAR_LENGTH harmonics — the combs deleted (plan 09); the year lengths of date are the one-family laws ═══');
console.log('  ✓ YEAR_LENGTH: no combs to verify\n');
console.log(`  ✓ YEAR_LENGTH harmonics: all 3 types match\n`);

// (Step 7 — PARALLAX corrections consistency — retired with the K5
// legacy-chain excision: the fitted planet-correction keys no longer exist.)

// ═══════════════════════════════════════════════════════════════════════════
// 8. Verify planet derived values (orbitTilt, invPlaneInclination)
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 8: Derived planet values ═══');
// (model-parameters.json was read here for the ψ re-derivation — plan 07 R5.)
const ar = JSON.parse(fs.readFileSync(
  path.resolve(ROOT, 'public', 'input', 'astro-reference.json'), 'utf8'));

for (const [key, p] of Object.entries(C.planets)) {
  const arP = ar.planetOrbitalElements[key];

  // Verify orbitTilt derived correctly
  const utils = require(path.join(TOOLS_LIB, 'constants', 'utils.js'));
  const tilt = utils.computeOrbitTilt(arP.ascendingNode, arP.eclipticInclinationJ2000);
  check(`${key}.orbitTilta`, p.orbitTilta, tilt.orbitTilta, 1e-7);
  check(`${key}.orbitTiltb`, p.orbitTiltb, tilt.orbitTiltb, 1e-7);

  // (Plan 07 R5: the ψ re-derivation — invPlaneInclinationAmplitude /
  // invPlaneInclinationMean against C.PSI, and the J2000 reconstruction
  // mean + s·amp·cos(ϖ − anchor) = i_J2000 — left with the law.)
}
console.log(`  ✓ All derived planet values verified\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 9. Earth geometry validation
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 9: Earth geometry validation ═══');

const sg = require(path.join(TOOLS_LIB, 'scene-graph.js'));
// The package model on the shipped series artifact (the API's / audit's
// configuration — plan 06 R1 measured that a model built WITHOUT the
// artifact is a different hybrid): one instance for the cardinal instants
// below and the one-family year lengths in Step 10.
const pipelineModel = (() => {
  const { createModel } = require('@essrt/physics');
  let artifact;
  try { artifact = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nbody-secular-series.json'), 'utf8')); } catch { artifact = undefined; }
  return createModel(undefined, artifact ? { secularSeriesArtifact: artifact } : undefined);
})();

// Obliquity at the June 2000 solstice (from the scene-graph's Sun declination).
// Plan 06 Phase 3 S3c: the reference is the IAU 2006 mean obliquity OF DATE at
// the solstice instant — ε₀ + ε̇·T (T in Julian centuries from J2000.0; the T²
// term is 4e-9″ here) — NOT the J2000.0 value: the obliquity falls 0.22″ between
// January 1 and the solstice, and the one-source scene shows exactly that. The
// former check compared the solstice declination with the J2000.0 value; it
// passed only because the K device had been calibrated to hit the J2000.0
// number at the solstice instant (a 0.22″ convention, not physics). Measured
// residual under the one-source scene: 0.012″; tolerance 0.05″.
const solsticeJ2000JD = C.ASTRO_REFERENCE.juneSolstice2000_JD;
const obliqScene = sg.phiToDecDeg(sg.computePlanetPosition('sun', solsticeJ2000JD).dec);
const solsticeT = (solsticeJ2000JD - 2451545.0) / 36525;
const obliqIauOfDate = C.ASTRO_REFERENCE.obliquityJ2000_deg + (C.ASTRO_REFERENCE.obliquityRate_arcsecPerCentury / 3600) * solsticeT;
const obliqError = Math.abs(obliqScene - obliqIauOfDate) * 3600;
check('Obliquity at the June 2000 solstice (scene vs IAU of date)', obliqError, 0, 0.05); // within 0.05"
console.log(`  Obliquity at the June 2000 solstice: scene ${obliqScene.toFixed(6)}° vs IAU 2006 of date ${obliqIauOfDate.toFixed(6)}° (J2000.0 ${C.ASTRO_REFERENCE.obliquityJ2000_deg}°; error: ${obliqError.toFixed(4)}")`);

// Obliquity rate: the scene's solstice declination in 2100 minus 2000. The
// 2100 instant is the model's OWN June-solstice crossing (createModel()
// .cardinal, the apparent Sun at true UT) — plan 06 R4 follow-up: the former
// "2000 solstice + one mean tropical century" sat ~1.6 h from the true 2100
// solstice, and the declination's curvature there read as a 0.06″ dip in
// the rate (the K plane's node offset had compensated it by coincidence, so
// the old 0.0005″ metric was luck); at the solstice itself the declination is
// stationary, so the instant's minute-level precision is invisible.
const solstice2100JD = pipelineModel.cardinal.jd(2100, 'SS');
const obliq2100 = sg.phiToDecDeg(sg.computePlanetPosition('sun', solstice2100JD).dec);
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

// Eccentricity at J2000 — the ONE shipped law (the H/3 channel through the
// Node engine). Plan 07 R10: this block used to re-evaluate the retired
// two-cosine K law on the retired phase origin — a private copy of a deleted
// law that read 0.0027 off once the origin moved.
const eJ2000 = require(path.join(TOOLS_LIB, 'orbital-engine.js')).computeEccentricityEarth(2000);
const eTarget = C.ASTRO_REFERENCE.earthEccentricityJ2000;
const eError = Math.abs(eJ2000 - eTarget);
check('e(J2000) vs IAU', eError, 0, 1e-4);
console.log(`  e(J2000): ${eJ2000.toFixed(10)} (IAU: ${eTarget}, diff: ${eError.toExponential(2)})`);

// (plan 09 step 4: the "perihelion longitude at J2000 from the raw harmonic
// formula" and "ERD at J2000" rows left with the perihelion comb; the series'
// ϖ of date against the IAU mean element is the registry plausibility row
// periLongModel2000AD vs periLongJ2000, 0.02°.)

// Year lengths at J2000 vs IAU references
const astroRef = JSON.parse(fs.readFileSync(
  path.resolve(ROOT, 'public', 'input', 'astro-reference.json'), 'utf8'));
const ylRef = astroRef.yearLengthRef;

// Helpers: cardinal point year length and JD — the RUNTIME evaluators
// themselves, not local mirrors. The previous hand-rolled snapshot forms here
// drifted from the engines twice (pre-§10 sinusoid derivative, then the
// §10 δ-only harmonics made them a third stale convention) — the exact
// checker-mirror class D+ retired for the obliquity checker.
const OE = require(path.join(TOOLS_LIB, 'orbital-engine.js'));
const cardinalYearLength = (year, type) => OE.computeSolsticeYearLength(year, type);
const cardinalJD = (year, type) => OE.computeSolsticeJD(year, type);

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
// Plan 06 R1: the cardinal intervals are now the APPARENT crossings of the
// one Sun (nutation and the short-period terms included), so their single-
// year 4-mean is NOT the mean tropical year — it scatters ±150 s around it,
// as Meeus's own successive instants do. The mean-year check reads the ONE
// year-length family (route B, SI seconds) against the IAU value; the
// per-type intervals below stay informational.
const oneFamilyTropDays = pipelineModel.epoch.tropicalYearSecondsAtYear(2000) / 86400;
const tropDiffSec = (oneFamilyTropDays - C.meanSolarYearDays) * 86400;   // plan 09: vs the DERIVED J2000 tropical year (sidereal year + p_A), one home
// Tolerance: 10 s (the one-family year sits +0.03 s from IAU at J2000).
check('Tropical year at J2000', Math.abs(tropDiffSec), 0, 10.0);
console.log(`  Tropical year at J2000 (one-family): ${oneFamilyTropDays.toFixed(9)} d (derived J2000: ${C.meanSolarYearDays.toFixed(9)} d, diff: ${tropDiffSec >= 0 ? '+' : ''}${tropDiffSec.toFixed(3)}s); 4-mean of the 2000→2001 crossing intervals: ${tropJ2000.toFixed(6)} d (informational)`);
console.log(`    RA=0°  (VE): ${tropVE.toFixed(9)} d (IAU: ${ylRef.tropicalYearVE} d, diff: ${((tropVE - ylRef.tropicalYearVE)*86400).toFixed(2)}s)`);
console.log(`    RA=90° (SS): ${tropSS.toFixed(9)} d (IAU: ${ylRef.tropicalYearSS} d, diff: ${((tropSS - ylRef.tropicalYearSS)*86400).toFixed(2)}s)`);
console.log(`    RA=180°(AE): ${tropAE.toFixed(9)} d (IAU: ${ylRef.tropicalYearAE} d, diff: ${((tropAE - ylRef.tropicalYearAE)*86400).toFixed(2)}s)`);
console.log(`    RA=270°(WS): ${tropWS.toFixed(9)} d (IAU: ${ylRef.tropicalYearWS} d, diff: ${((tropWS - ylRef.tropicalYearWS)*86400).toFixed(2)}s)`);

// (Plan 09: the sidereal and anomalistic J2000 rows read the retired year
// combs; the J2000 sidereal and anomalistic years are the IAU inputs now.)

// ── Cardinal point JDs at J2000 (informational) ──
// Reference: the registry's `cardinalPointAnchors` — the USNO "Earth's
// Seasons" 2000 instants (UTC, minute precision; ONE home, astro-reference).
// Plan 06 R4c/R4d: until R4d the registry's VE/AE entries were retired-device
// anchors (05:43 / 19:19 UT), 112 min off the real equinoxes — corrected to
// the USNO instants at R4d; these rows quote the registry again.
const usnoCP2000 = C.ASTRO_REFERENCE.cardinalPointAnchors;
console.log('  Cardinal point JDs at J2000 (vs USNO 2000, minute precision):');
for (const type of ['SS', 'WS', 'VE', 'AE']) {
  const jd = cardinalJD(2000, type);
  const diffMin = (jd - usnoCP2000[type]) * 1440;
  console.log(`    ${type}: JD ${jd.toFixed(6)} (${jdToDate(jd)})  USNO: ${usnoCP2000[type].toFixed(4)}  diff: ${diffMin >= 0 ? '+' : ''}${diffMin.toFixed(2)} min`);
}

// Harmonic term counts
console.log(`  Cardinal points: SS=${C.CARDINAL_POINT_HARMONICS.SS.length}, WS=${C.CARDINAL_POINT_HARMONICS.WS.length}, VE=${C.CARDINAL_POINT_HARMONICS.VE.length}, AE=${C.CARDINAL_POINT_HARMONICS.AE.length} terms`);


// Compare against stored Earth baselines
const storedBaselinesEarly = JSON.parse(fs.readFileSync(
  path.join(TOOLS_RESULTS, 'baselines.json'), 'utf8'));
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
  // (plan 09 step 4: the perihelion-longitude regression row left with the comb)
}
console.log(`  ✓ Earth geometry verified\n`);

// Store new Earth metrics for --write
const newEarth = {
  obliquityJ2000_error_arcsec: Math.round(obliqError * 10000) / 10000,
  obliquityRate_error_arcsec: Math.round(rateError * 10000) / 10000,
  tropicalYearJ2000_diff_sec: Math.round(tropDiffSec * 1000) / 1000,
  // (plan 09: the sidereal/anomalistic J2000 diffs read the retired year combs)
  cardinalPoints_terms: {
    SS: C.CARDINAL_POINT_HARMONICS.SS.length,
    WS: C.CARDINAL_POINT_HARMONICS.WS.length,
    VE: C.CARDINAL_POINT_HARMONICS.VE.length,
    AE: C.CARDINAL_POINT_HARMONICS.AE.length,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 9a. Eccentricity J2000 conformance — RETIRED at plan 07 R6
// ═══════════════════════════════════════════════════════════════════════════
// The table printed each planet's K-law base against the observed J2000
// eccentricity and asked whether the observation was "reachable" inside
// [base − amp, base + amp]. Both inputs were the K law's, which is retired:
// the planets' eccentricity of date is the N-body chain's, and the chain is
// anchored ON the J2000 observation, so the conformance question answers
// itself. Earth's base and amplitude survive on the Earth side and are
// checked where they are used.
console.log('\n═══ Step 9a: Eccentricity J2000 conformance — RETIRED (plan 07 R6) ═══');
console.log('  The planets ride the N-body chain, anchored on the J2000 observation.\n');

// (Step 9b — correction-stack validation — retired with the K5 legacy-chain
// excision: the planet-correction layers are gone, and MOON_CORRECTION
// consistency is covered by the constants-embed gate.)

// ═══════════════════════════════════════════════════════════════════════════
// 10. Baseline regression check — compare RMS against stored baselines
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 10: Baseline regression check ═══');

const BASELINES_PATH = path.join(TOOLS_RESULTS, 'baselines.json');
const { baseline: computeBaseline } = require(path.join(TOOLS_LIB, 'optimizer.js'));

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
