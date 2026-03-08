#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// TEST: Circular Orbit vs Elliptical Orbit (Variable Speed)
// ═══════════════════════════════════════════════════════════════════════════
//
// Hypothesis: Kepler's elliptical orbits are mathematical constructs,
// not physical necessities. A circular orbit with the correct geometric
// offset should produce the same observable positions as an elliptical
// orbit with variable speed (Kepler's 2nd law).
//
// This test compares two equivalent representations of orbital eccentricity:
//
//   Config A — TRUE CIRCULAR ORBIT
//     Circular orbit with reduced eccentricity e/(1+e) as geometric offset.
//     Constant angular speed. No speed variation needed.
//
//   Config B — CONSTRUCTED ELLIPTICAL (Kepler model)
//     Circular orbit with full J2000 eccentricity as geometric offset.
//     Variable speed via equation of center (Kepler's 2nd law):
//     faster at perihelion, slower at aphelion.
//
// For Type I/II planets (Mercury, Venus, Mars):
//   Config A = default build (already uses e/(1+e), no EoC)
//   Config B = patched (full e orbit offset + EoC scan)
//
// For Type III planets (Jupiter, Saturn, Uranus, Neptune):
//   Config A = patched (e/(1+e) orbit offset, no EoC)
//   Config B = default build (already uses full e + EoC e/2)
//   Config B scan = fix orbit at full e, vary EoC fraction
//
// If both produce the same accuracy against JPL reference data, this
// demonstrates that elliptical orbits and circular orbits are
// mathematically interchangeable descriptions of the same motion.
//
// Usage:
//   node tools/explore/test-circular-vs-variable-speed.js [planet]
//   Default: mercury (largest eccentricity among inner planets)
//   Options: mercury, venus, mars, jupiter, saturn, uranus, neptune
// ═══════════════════════════════════════════════════════════════════════════

const path = require('path');
const fs = require('fs');

const C = require(path.join(__dirname, '..', 'lib', 'constants.js'));
const SG = require(path.join(__dirname, '..', 'lib', 'scene-graph.js'));

const targetPlanet = (process.argv[2] || 'mercury').toLowerCase();

const refDataPath = path.join(__dirname, '..', '..', 'config', 'reference-data.json');
const refData = JSON.parse(fs.readFileSync(refDataPath, 'utf-8'));

const planetRef = refData.planets[targetPlanet];
if (!planetRef) { console.error(`No reference data for: ${targetPlanet}`); process.exit(1); }

const p = C.planets[targetPlanet];
if (!p) { console.error(`Unknown planet: ${targetPlanet}`); process.exit(1); }

const d2r = Math.PI / 180;
const thetaToRaDeg = SG.thetaToRaDeg;
const phiToDecDeg = SG.phiToDecDeg;

// Perihelion passage dates near J2000 (from JPL Horizons)
const perihelionRefJDs = {
  mercury: 2451590.3,   // 2000 Feb 15.8
  venus: 2451631.5,     // 2000 Mar 28
  mars: C.ASTRO_REFERENCE.marsPerihelionRef_JD,
  jupiter: C.ASTRO_REFERENCE.jupiterPerihelionRef_JD,
  saturn: C.ASTRO_REFERENCE.saturnPerihelionRef_JD,
  uranus: C.ASTRO_REFERENCE.uranusPerihelionRef_JD,
  neptune: C.ASTRO_REFERENCE.neptunePerihelionRef_JD,
};

const isTypeIII = (p.type === 'III');
const isTypeII = (p.type === 'II');

// ═══════════════════════════════════════════════════════════════════════════
// Reference data
// ═══════════════════════════════════════════════════════════════════════════

function parseRA(raStr) {
  if (typeof raStr === 'number') return raStr;
  if (typeof raStr === 'string' && raStr.includes('°'))
    return parseFloat(raStr.replace('°', ''));
  return parseFloat(raStr) * 15; // hours to degrees
}

function getRefEntries() {
  const entries = [];
  for (const entry of Object.values(planetRef)) {
    if (typeof entry !== 'object' || entry === null) continue;
    const jd = entry.jd || entry.JD;
    if (!jd) continue;
    if ((entry.tier || 2) > 2) continue;
    if (entry.ra === undefined || entry.ra === null) continue;
    entries.push({
      jd,
      ra: parseRA(entry.ra),
      dec: entry.dec !== undefined ? parseFloat(entry.dec) : null,
    });
  }
  return entries;
}

// ═══════════════════════════════════════════════════════════════════════════
// Measurement engine
// ═══════════════════════════════════════════════════════════════════════════

function measureRMS(entries, graph) {
  const sDay = 1 / C.meanSolarYearDays;
  let sumRA2 = 0, sumDec2 = 0, nRA = 0, nDec = 0;

  for (const entry of entries) {
    SG.moveModel(graph, sDay * (entry.jd - C.startmodelJD));
    const wp = graph.planetNodeMap[targetPlanet].planet.pivot.getWorldPosition();
    const local = graph.earthNodes.rotAxis.worldToLocal(wp[0], wp[1], wp[2]);
    const sph = SG.cartesianToSpherical(local[0], local[1], local[2]);

    let errRA = thetaToRaDeg(sph.theta) - entry.ra;
    if (errRA > 180) errRA -= 360;
    if (errRA < -180) errRA += 360;
    sumRA2 += errRA * errRA;
    nRA++;

    if (entry.dec !== null) {
      sumDec2 += (phiToDecDeg(sph.phi) - entry.dec) ** 2;
      nDec++;
    }
  }

  // Start date position
  SG.moveModel(graph, 0);
  const wp0 = graph.planetNodeMap[targetPlanet].planet.pivot.getWorldPosition();
  const loc0 = graph.earthNodes.rotAxis.worldToLocal(wp0[0], wp0[1], wp0[2]);
  const sph0 = SG.cartesianToSpherical(loc0[0], loc0[1], loc0[2]);
  const startRef = entries.find(e => Math.abs(e.jd - C.startmodelJD) < 1);
  let startDeltaRA = null, startDeltaDec = null;
  if (startRef) {
    startDeltaRA = thetaToRaDeg(sph0.theta) - startRef.ra;
    if (startDeltaRA > 180) startDeltaRA -= 360;
    if (startDeltaRA < -180) startDeltaRA += 360;
    if (startRef.dec !== null) startDeltaDec = phiToDecDeg(sph0.phi) - startRef.dec;
  }

  return {
    rmsRA: Math.sqrt(sumRA2 / nRA),
    rmsDec: nDec > 0 ? Math.sqrt(sumDec2 / nDec) : 0,
    rmsTotal: Math.sqrt(sumRA2/nRA + (nDec > 0 ? sumDec2/nDec : 0)),
    nRA, nDec, startDeltaRA, startDeltaDec,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Config A — TRUE CIRCULAR: e/(1+e) offset, constant speed
// ═══════════════════════════════════════════════════════════════════════════
//
// Type I/II: default build already uses e/(1+e), no EoC
// Type III:  patch default build — scale PeriFromEarth orbit center
//            down to e/(1+e), and remove EoC from planet node
// ═══════════════════════════════════════════════════════════════════════════

function buildConfigA() {
  SG._invalidateGraph();
  const graph = SG.buildSceneGraph();

  if (isTypeIII) {
    const pm = graph.planetNodeMap[targetPlanet];
    const fullEcc = p.orbitalEccentricity;
    const scaleFactor = 1 / (1 + fullEcc);

    // Scale PerihelionFromEarth orbit center: full e → e/(1+e)
    // Orbit center is stored on the container node (px=orbitCentera, pz=orbitCenterb)
    pm.periFromE.container.px *= scaleFactor;
    pm.periFromE.container.pz *= scaleFactor;

    // Remove equation of center (constant speed)
    const planetDef = pm.planet.def;
    delete planetDef.eccentricity;
    delete planetDef.perihelionPhaseJ2000;
    delete planetDef.perihelionPrecessionRate;
  }

  return graph;
}

// ═══════════════════════════════════════════════════════════════════════════
// Config B — CONSTRUCTED ELLIPTICAL: full e offset + variable speed (EoC)
// ═══════════════════════════════════════════════════════════════════════════
//
// Type I/II: patch default — bigger RealPeri radius + EoC
// Type III:  default build already uses full e + EoC
//            scan varies the EoC fraction (default is 0.50 = e/2)
// ═══════════════════════════════════════════════════════════════════════════

function buildConfigB(eocFraction) {
  SG._invalidateGraph();
  const graph = SG.buildSceneGraph();
  const pm = graph.planetNodeMap[targetPlanet];
  const d = C.derived[targetPlanet];
  const fullEcc = p.orbitalEccentricity;

  if (isTypeIII) {
    // PerihelionFromEarth orbit center already at full e (default).
    // Patch planet EoC to the requested fraction.
    const planetDef = pm.planet.def;
    const periRefJD = perihelionRefJDs[targetPlanet];

    if (eocFraction !== 0 && periRefJD) {
      const periPrecRate = Math.PI * 2 / p.perihelionEclipticYears;
      const pos_peri = (periRefJD - C.startmodelJD) / C.meanSolarYearDays;
      planetDef.eccentricity = fullEcc * eocFraction;
      planetDef.perihelionPhaseJ2000 = -p.startpos * d2r
        + (pm.planet.def.speed - periPrecRate) * pos_peri;
      planetDef.perihelionPrecessionRate = periPrecRate;
    } else {
      delete planetDef.eccentricity;
      delete planetDef.perihelionPhaseJ2000;
      delete planetDef.perihelionPrecessionRate;
    }
  } else {
    // Type I/II: patch RealPeri orbit radius to full eccentricity
    const fullElipticOrbit = isTypeII
      ? (fullEcc * d.orbitDistance * 100) / 2
      : (d.orbitDistance * fullEcc * 100) / 2;

    const sign = pm.realPeri.pivot.px >= 0 ? 1 : -1;
    pm.realPeri.pivot.px = sign * fullElipticOrbit;
    pm.realPeri.rotAxis.px = sign * fullElipticOrbit;
    pm.realPeri.def.orbitRadius = fullElipticOrbit;

    // Inject equation of center (variable speed)
    const planetDef = pm.planet.def;
    const periRefJD = perihelionRefJDs[targetPlanet];

    if (eocFraction !== 0 && periRefJD) {
      const periPrecRate = Math.PI * 2 / p.perihelionEclipticYears;
      const pos_peri = (periRefJD - C.startmodelJD) / C.meanSolarYearDays;
      planetDef.eccentricity = fullEcc * eocFraction;
      planetDef.perihelionPhaseJ2000 = (planetDef.speed - periPrecRate) * pos_peri
        - p.startpos * d2r;
      planetDef.perihelionPrecessionRate = periPrecRate;
    } else {
      delete planetDef.eccentricity;
      delete planetDef.perihelionPhaseJ2000;
      delete planetDef.perihelionPrecessionRate;
    }
  }

  return graph;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

const entries = getRefEntries();
const fullEcc = p.orbitalEccentricity;
const reducedEcc = fullEcc / (1 + fullEcc);
const d = C.derived[targetPlanet];

// Compute elipticOrbit / orbit center sizes for display
let orbitSizeA, orbitSizeB, orbitSizeLabel;
if (isTypeIII) {
  // Type III: orbit center magnitude (PerihelionFromEarth)
  const periDistFull = fullEcc * d.orbitDistance * 100;
  const periDistReduced = reducedEcc * d.orbitDistance * 100;
  orbitSizeA = periDistReduced;
  orbitSizeB = periDistFull;
  orbitSizeLabel = 'perihelionDistance';
} else {
  // Type I/II: elipticOrbit (RealPeri radius)
  orbitSizeA = isTypeII
    ? (reducedEcc * d.orbitDistance * 100) / 2 + (fullEcc - reducedEcc) * d.orbitDistance * 100
    : (d.orbitDistance * reducedEcc * 100) / 2;
  orbitSizeB = (d.orbitDistance * fullEcc * 100) / 2;
  orbitSizeLabel = 'elipticOrbit';
}

// ─── Header ───

console.log();
console.log('═══════════════════════════════════════════════════════════════');
console.log('  CIRCULAR ORBIT vs ELLIPTICAL ORBIT — ' + targetPlanet.toUpperCase());
console.log('  Are Kepler\'s elliptical orbits physical or mathematical?');
console.log('═══════════════════════════════════════════════════════════════');
console.log();
console.log('  Planet type: ' + p.type + (isTypeIII ? ' (outer — uses EoC e/2 by default)' : isTypeII ? ' (Mars — no EoC by default)' : ' (inner — no EoC by default)'));
console.log('  Test: Compare two equivalent representations of eccentricity');
console.log('  against ' + entries.length + ' JPL reference positions (Tier 1-2 with RA)');
console.log();
console.log(`  J2000 eccentricity (e):   ${fullEcc}`);
console.log(`  Circular equivalent:      ${reducedEcc.toFixed(8)}  [e/(1+e)]`);
console.log(`  Reduction:                ${((1 - reducedEcc/fullEcc) * 100).toFixed(1)}%`);
console.log();

// ─── Config A: True Circular ───

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│  Config A — TRUE CIRCULAR ORBIT                            │');
console.log('│  Orbit offset: e/(1+e) = ' + reducedEcc.toFixed(8).padEnd(33) + '│');
console.log('│  Speed: constant (no equation of center)' + ' '.repeat(18) + '│');
console.log('│  ' + orbitSizeLabel + ': ' + orbitSizeA.toFixed(3).padEnd(38 - orbitSizeLabel.length) + '│');
console.log('└─────────────────────────────────────────────────────────────┘');

const graphA = buildConfigA();
const resultA = measureRMS(entries, graphA);

console.log(`  RMS RA:    ${resultA.rmsRA.toFixed(4)}°`);
console.log(`  RMS Dec:   ${resultA.rmsDec.toFixed(4)}°`);
console.log(`  RMS Total: ${resultA.rmsTotal.toFixed(4)}°`);
if (resultA.startDeltaRA !== null)
  console.log(`  Start ΔRA: ${resultA.startDeltaRA > 0 ? '+' : ''}${resultA.startDeltaRA.toFixed(3)}°`);
console.log();

// ─── Config B: Constructed Elliptical ───

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│  Config B — CONSTRUCTED ELLIPTICAL ORBIT (Kepler model)    │');
console.log('│  Orbit offset: e = ' + fullEcc.toString().padEnd(39) + '│');
console.log('│  Speed: variable (equation of center, Kepler 2nd law)      │');
console.log('│  ' + orbitSizeLabel + ': ' + orbitSizeB.toFixed(3) + ' (' + ((orbitSizeB/orbitSizeA - 1)*100).toFixed(1) + '% larger)' + ' '.repeat(Math.max(0, 30 - orbitSizeLabel.length - ((orbitSizeB/orbitSizeA - 1)*100).toFixed(1).length)) + '│');
console.log('└─────────────────────────────────────────────────────────────┘');
console.log();

// ─── EoC scan ───

// For Type III, the default EoC is e/2 (fraction 0.50).
// Scan a wider range to find if different fractions work better.
const eocFractions = isTypeIII
  ? [
      -1.00, -0.50, -0.30, -0.20, -0.10,
      0.00,
      0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 1.00,
    ]
  : [
      -1.00, -0.50, -0.30, -0.20, -0.15, -0.12, -0.10, -0.08, -0.05,
      0.00,
      0.05, 0.10, 0.20, 0.30, 0.50, 1.00,
    ];

const keplerFrac = isTypeIII ? 0.50 : 0.50; // e/2 is the Kepler prediction

console.log('  Scanning EoC fraction (positive = Kepler, negative = reverse):');
console.log();
console.log('  EoC frac │ eoc value  │ RMS RA   │ RMS Dec  │ RMS Total │ vs Circular');
console.log('  ─────────┼────────────┼──────────┼──────────┼───────────┼────────────');

let bestFrac = null, bestTotal = Infinity, bestResult = null;
const allResults = [];

for (const frac of eocFractions) {
  const graphB = buildConfigB(frac);
  const result = measureRMS(entries, graphB);

  const diff = ((result.rmsTotal - resultA.rmsTotal) / resultA.rmsTotal * 100);
  const isBest = result.rmsTotal < bestTotal;
  if (isBest) { bestTotal = result.rmsTotal; bestFrac = frac; bestResult = result; }

  const diffStr = (diff > 0 ? '+' : '') + diff.toFixed(1) + '%';
  const marker = isBest ? '  best' : '';
  const label = frac === 0.50 ? '  [Kepler e/2]'
    : frac === 1.00 ? '  [full Kepler]'
    : frac === 0 ? '  [no EoC]' : '';

  console.log(
    `  ${frac >= 0 ? ' ' : ''}${frac.toFixed(2)} │ ` +
    `${(fullEcc * frac >= 0 ? ' ' : '') + (fullEcc * frac).toFixed(6)} │ ` +
    `${result.rmsRA.toFixed(4).padStart(8)} │ ` +
    `${result.rmsDec.toFixed(4).padStart(8)} │ ` +
    `${result.rmsTotal.toFixed(4).padStart(9)} │ ` +
    `${diffStr.padStart(9)}${marker}${label}`
  );

  allResults.push({ frac, result, diff });
}

// ─── Fine scan around best ───

if (bestFrac !== null && bestFrac > -1.0 && bestFrac < 1.0) {
  console.log();
  console.log(`  Fine scan around best (${bestFrac.toFixed(2)}):`);
  console.log('  EoC frac │ eoc value  │ RMS RA   │ RMS Dec  │ RMS Total │ vs Circular');
  console.log('  ─────────┼────────────┼──────────┼──────────┼───────────┼────────────');

  const lo = Math.max(-1, bestFrac - 0.08);
  const hi = Math.min(1, bestFrac + 0.08);

  for (let frac = lo; frac <= hi + 0.001; frac += 0.02) {
    const graphB = buildConfigB(frac);
    const result = measureRMS(entries, graphB);
    const diff = ((result.rmsTotal - resultA.rmsTotal) / resultA.rmsTotal * 100);
    const isBest = result.rmsTotal < bestTotal;
    if (isBest) { bestTotal = result.rmsTotal; bestFrac = frac; bestResult = result; }

    const diffStr = (diff > 0 ? '+' : '') + diff.toFixed(2) + '%';
    const marker = isBest ? '  best' : '';

    console.log(
      `  ${frac >= 0 ? ' ' : ''}${frac.toFixed(2)} │ ` +
      `${(fullEcc * frac >= 0 ? ' ' : '') + (fullEcc * frac).toFixed(6)} │ ` +
      `${result.rmsRA.toFixed(4).padStart(8)} │ ` +
      `${result.rmsDec.toFixed(4).padStart(8)} │ ` +
      `${result.rmsTotal.toFixed(4).padStart(9)} │ ` +
      `${diffStr.padStart(10)}${marker}`
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONCLUSION
// ═══════════════════════════════════════════════════════════════════════════

const bestB = bestResult;
const totalDiff = bestB.rmsTotal - resultA.rmsTotal;
const pctDiff = (totalDiff / resultA.rmsTotal * 100);

console.log();
console.log('═══════════════════════════════════════════════════════════════');
console.log('  RESULT');
console.log('═══════════════════════════════════════════════════════════════');
console.log();
console.log('                      │ True Circular   │ Best Elliptical');
console.log('  ────────────────────┼─────────────────┼─────────────────');
console.log(`  Orbit offset        │ e/(1+e) = ${reducedEcc.toFixed(4)} │ e = ${fullEcc.toFixed(4)}`);
console.log(`  Speed model         │ constant        │ EoC frac = ${bestFrac.toFixed(2)}`);
console.log(`  RMS RA              │ ${resultA.rmsRA.toFixed(4)}°${' '.repeat(10)}│ ${bestB.rmsRA.toFixed(4)}°`);
console.log(`  RMS Dec             │ ${resultA.rmsDec.toFixed(4)}°${' '.repeat(10)}│ ${bestB.rmsDec.toFixed(4)}°`);
console.log(`  RMS Total           │ ${resultA.rmsTotal.toFixed(4)}°${' '.repeat(10)}│ ${bestB.rmsTotal.toFixed(4)}°`);
console.log(`  Difference          │                 │ ${totalDiff > 0 ? '+' : ''}${totalDiff.toFixed(4)}° (${pctDiff > 0 ? '+' : ''}${pctDiff.toFixed(2)}%)`);
console.log();

if (Math.abs(pctDiff) < 2.0) {
  console.log('  CONCLUSION: The two representations produce identical accuracy.');
  console.log();
  console.log('  A true circular orbit with the geometric correction e/(1+e)');
  console.log('  matches the observable positions just as well as an elliptical');
  console.log('  orbit with Kepler\'s 2nd law variable speed.');
  console.log();
  console.log('  This demonstrates that Kepler\'s elliptical orbits are');
  console.log('  mathematical constructs — equivalent to circular orbits with a');
  console.log('  geometric offset. The eccentricity can be fully expressed as');
  console.log('  geometry (position) rather than kinematics (speed variation).');
  console.log();
  console.log('  No elliptical path is required. A circle suffices.');
} else if (totalDiff > 0) {
  console.log('  CONCLUSION: The circular orbit is MORE accurate.');
  console.log();
  console.log('  The e/(1+e) geometric correction on a circular orbit produces');
  console.log('  better results than the Kepler elliptical model with variable');
  console.log('  speed. This supports the interpretation that circular orbits');
  console.log('  are the more natural physical description.');
} else {
  console.log('  CONCLUSION: The elliptical model is more accurate.');
  console.log();
  console.log('  Variable speed (Kepler 2nd law) provides a better fit than');
  console.log('  the purely geometric circular correction.');
}

console.log();
console.log('═══════════════════════════════════════════════════════════════');
console.log();
