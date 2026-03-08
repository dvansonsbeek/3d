#!/usr/bin/env node
// Test Mars with elipticOrbit = marsEccDist/2 + dynamic geocentric
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = '/home/dennis/code/3d';
const sgPath = path.join(ROOT, 'tools/lib/scene-graph.js');
const constPath = path.join(ROOT, 'tools/lib/constants.js');
const evalPath = path.join(ROOT, 'tools/_mars_eval.js');

const origSG = fs.readFileSync(sgPath, 'utf8');
const origConst = fs.readFileSync(constPath, 'utf8');

// Write eval script
fs.writeFileSync(evalPath, `
const sg = require('${sgPath}');
const refData = JSON.parse(require('fs').readFileSync('${path.join(ROOT, 'config/reference-data.json')}', 'utf8'));
const marsRefs = refData.planets.mars;
let sumSqRA = 0, sumSqDec = 0, n = 0;
for (const ref of marsRefs) {
  let refRA = parseFloat(ref.ra);
  if (typeof ref.ra === 'string' && !ref.ra.includes('\u00b0')) refRA *= 15;
  const refDec = parseFloat(ref.dec);
  if (isNaN(refRA) || isNaN(refDec)) continue;
  const r = sg.computePlanetPosition('mars', ref.jd);
  const ra = sg.thetaToRaDeg(r.ra);
  const dec = sg.phiToDecDeg(r.dec);
  let dra = ra - refRA;
  if (dra > 180) dra -= 360;
  if (dra < -180) dra += 360;
  sumSqRA += dra * dra;
  sumSqDec += (dec - refDec) * (dec - refDec);
  n++;
}
console.log(JSON.stringify({rmsRA: Math.sqrt(sumSqRA/n), rmsDec: Math.sqrt(sumSqDec/n), n}));
`);

// Test configurations
const tests = [
  { label: 'CURRENT (static 7.72)', mode: 'current' },
  { label: 'eccDist/2=7.12 static, no dynamic', mode: 'halfEcc', dynamic: false },
  { label: 'eccDist/2=7.12 + dynamic geo', mode: 'halfEcc', dynamic: true },
  { label: 'eccDist/2=7.12 + dynamic geo + EoC -0.02', mode: 'halfEcc', dynamic: true, eocFrac: -0.02 },
  { label: 'eccDist/2=7.12 + dynamic geo + EoC -0.05', mode: 'halfEcc', dynamic: true, eocFrac: -0.05 },
  { label: 'eccDist/2=7.12 + dynamic geo + EoC +0.02', mode: 'halfEcc', dynamic: true, eocFrac: 0.02 },
  { label: 'eccDist/2=7.12 + dynamic geo + EoC +0.05', mode: 'halfEcc', dynamic: true, eocFrac: 0.05 },
  { label: 'eccDist/2=7.12 + dynamic geo/2', mode: 'halfEcc', dynamic: true, geoFrac: 0.5 },
  { label: 'eccDist/2=7.12 - dynamic geo/2', mode: 'halfEcc', dynamic: true, geoFrac: -0.5 },
];

try {
  for (const test of tests) {
    let sgCode = origSG;
    let cCode = origConst;

    if (test.mode === 'halfEcc') {
      // Change constants.js: Mars elipticOrbit = e * a * 100 / 2 (static base)
      // perihelionDistance = e * a * 100 + elipticOrbit
      cCode = cCode.replace(
        `} else if (p.type === 'II') {\n    realOrbitalEccentricity = p.orbitalEccentricity / (1 + p.orbitalEccentricity);\n    elipticOrbit = ((realOrbitalEccentricity * orbitDistance) / 2) * 100\n                 + (p.orbitalEccentricity * orbitDistance - realOrbitalEccentricity * orbitDistance) * 100;\n    perihelionDistance = (orbitDistance * p.orbitalEccentricity * 100) + elipticOrbit;`,
        `} else if (p.type === 'II') {\n    realOrbitalEccentricity = p.orbitalEccentricity;\n    elipticOrbit = (p.orbitalEccentricity * orbitDistance * 100) / 2;\n    perihelionDistance = (orbitDistance * p.orbitalEccentricity * 100) + elipticOrbit;`
      );

      if (test.dynamic) {
        // Add dynamic geocentric update for Type II in scene-graph moveModel
        const geoFrac = test.geoFrac !== undefined ? test.geoFrac : 1.0;
        sgCode = sgCode.replace(
          `// Dynamic geocentric elipticOrbit for Type III planets\n    if (pm.sceneData && pm.sceneData.p.type === 'III') {`,
          `// Dynamic geocentric elipticOrbit for Type II + III planets\n    if (pm.sceneData && (pm.sceneData.p.type === 'III' || pm.sceneData.p.type === 'II')) {`
        );
        // Also need to set the base offset for Type II (eccDist/2) and add geocentric on top
        // The Type III code sets pm.realPeri.pivot.px = eo directly (replacing orbitRadius)
        // For Type II we want: base + geocentric
        sgCode = sgCode.replace(
          `let eo = 2 * C.ASTRO_REFERENCE.earthEccentricityJ2000 * 100 * Math.sin(dw);\n      if (key === 'saturn') eo = -eo;\n      pm.realPeri.pivot.px = eo;\n      pm.realPeri.rotAxis.px = eo;`,
          `let eo = 2 * C.ASTRO_REFERENCE.earthEccentricityJ2000 * 100 * Math.sin(dw);\n      if (key === 'saturn') eo = -eo;\n      if (pm.sceneData.p.type === 'II') {\n        const eccDist = pm.sceneData.p.orbitalEccentricity * pm.sceneData.d.orbitDistance * 100;\n        eo = eccDist / 2 + eo * ${geoFrac};\n      }\n      pm.realPeri.pivot.px = eo;\n      pm.realPeri.rotAxis.px = eo;`
        );
      }
    }

    if (test.eocFrac) {
      // Enable Mars EoC
      sgCode = sgCode.replace(
        'planetDef.eccentricity = pd.p.orbitalEccentricity / 2;',
        `planetDef.eccentricity = (key === 'mars') ? pd.p.orbitalEccentricity * ${test.eocFrac} : pd.p.orbitalEccentricity / 2;`
      );
    } else {
      // Disable Mars EoC
      sgCode = sgCode.replace(
        'mars: C.ASTRO_REFERENCE.marsPerihelionRef_JD,',
        '// mars_disabled: 0,'
      );
    }

    fs.writeFileSync(sgPath, sgCode);
    fs.writeFileSync(constPath, cCode);

    const result = execSync('node ' + evalPath, { encoding: 'utf8' });
    const r = JSON.parse(result.trim());
    console.log(`${test.label.padEnd(48)}: RMS_RA=${r.rmsRA.toFixed(4)}\u00b0  RMS_Dec=${r.rmsDec.toFixed(4)}\u00b0`);
  }
} finally {
  fs.writeFileSync(sgPath, origSG);
  fs.writeFileSync(constPath, origConst);
  try { fs.unlinkSync(evalPath); } catch(e) {}
  console.log('\nRestored original files.');
}
