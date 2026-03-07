#!/usr/bin/env node
// Validate scene-graph engine against actual model output from Excel reports.

const sg = require('../lib/scene-graph');
const oe = require('../lib/orbital-engine');
const C = require('../lib/constants');

// Reference data from Holistic_objects_results.xlsx — "Sun & Planets" sheet
// Columns: JD, Sun RA/Dec/Dist, Mercury RA/Dec/DistE/DistS, Venus..., Mars..., Jupiter..., Saturn..., Uranus..., Neptune...
const REF = [
  {
    jd: 2451716.5, year: 2000,
    sun:     { ra: 89.915271, dec: 23.4392, dist: 1.016339 },
    mercury: { ra: 111.192967, dec: 21.144475, distE: 0.637721, distS: 0.469048 },
    venus:   { ra: 92.787398, dec: 23.901127, distE: 1.732031, distS: 0.718358 },
    mars:    { ra: 93.291131, dec: 24.061428, distE: 2.59972, distS: 1.585904 },
    jupiter: { ra: 55.948707, dec: 18.790664, distE: 5.646267, distS: 4.814043 },
    saturn:  { ra: 53.70428, dec: 17.109218, distE: 9.559641, distS: 8.740575 },
    uranus:  { ra: 323.177828, dec: -15.254582, distE: 19.957615, distS: 20.617073 },
    neptune: { ra: 308.41577, dec: -18.577743, distE: 29.248379, distS: 30.074888 },
  },
  {
    jd: 2455000.5, year: 2009,
    sun:     { ra: 86.557081, dec: 23.40043, dist: 1.016114 },
    mercury: { ra: 60.832807, dec: 18.226649, distE: 0.976412, distS: 0.425544 },
    venus:   { ra: 39.838172, dec: 12.593092, distE: 0.799955, distS: 0.730332 },
    mars:    { ra: 40.969737, dec: 14.901386, distE: 1.951514, distS: 1.405117 },
    jupiter: { ra: 329.942595, dec: -13.41134, distE: 4.352943, distS: 4.93288 },
    saturn:  { ra: 167.293028, dec: 7.684558, distE: 9.459769, distS: 9.310423 },
    uranus:  { ra: 357.245616, dec: -1.942517, distE: 20.874064, distS: 20.901257 },
    neptune: { ra: 328.74982, dec: -13.242193, distE: 29.372139, distS: 29.900859 },
  },
  {
    jd: 2460000.5, year: 2023,
    sun:     { ra: 337.396344, dec: -9.456986, dist: 0.989929 },
    mercury: { ra: 323.580922, dec: -14.275429, distE: 1.381929, distS: 0.488876 },
    venus:   { ra: 4.287093, dec: 3.78639, distE: 1.387663, distS: 0.723638 },
    mars:    { ra: 76.146261, dec: 23.082252, distE: 1.102237, distS: 1.623793 },
    jupiter: { ra: 9.328296, dec: 4.728839, distE: 5.506642, distS: 4.728104 },
    saturn:  { ra: 331.198322, dec: -12.783318, distE: 11.020464, distS: 10.03848 },
    uranus:  { ra: 43.25151, dec: 17.304084, distE: 20.31757, distS: 20.006338 },
    neptune: { ra: 355.002381, dec: -2.833839, distE: 30.590909, distS: 29.65497 },
  },
];

// Reference data from "Earth Longitude" sheet
const EARTH_LONG_REF = [
  {
    jd: 2451716.5, year: 2000,
    perihelionRA: 102.955175, perihelionDec: 22.904348,
    eccentricity: 0.01671012, // dist Earth from Earth Longitude column
  },
  {
    jd: 2455000.5, year: 2009,
    perihelionRA: 103.108813, perihelionDec: 22.890436,
    eccentricity: 0.01670932,
  },
  {
    jd: 2460000.5, year: 2023,
    perihelionRA: 103.342685, perihelionDec: 22.868973,
    eccentricity: 0.01670809,
  },
];

// Reference from Year Analysis — Detailed sheet
const YEAR_REF = [
  { year: 2000, obliquity: 23.439215, eccentricity: 0.01671039, sidereal: 365.256359537, anomalistic: 365.259692488 },
  { year: 2009, obliquity: 23.438044, eccentricity: 0.01670960, sidereal: 365.256359568, anomalistic: 365.259692493 },
  { year: 2023, obliquity: 23.436222, eccentricity: 0.01670835, sidereal: 365.256359618, anomalistic: 365.259692492 },
];

console.log('═══════════════════════════════════════════════════════════════');
console.log('  ORBITAL ENGINE VALIDATION (constants & year lengths)');
console.log('═══════════════════════════════════════════════════════════════\n');

for (const ref of YEAR_REF) {
  const elems = oe.computeEarthOrbitalElements(ref.year);
  console.log(`Year ${ref.year}:`);
  console.log(`  Obliquity:    model=${ref.obliquity.toFixed(6)}  engine=${elems.obliquity.toFixed(6)}  diff=${(elems.obliquity - ref.obliquity).toFixed(6)}°`);
  console.log(`  Eccentricity: model=${ref.eccentricity.toFixed(8)}  engine=${elems.eccentricity.toFixed(8)}  diff=${(elems.eccentricity - ref.eccentricity).toExponential(3)}`);
  console.log(`  Sidereal yr:  model=${ref.sidereal.toFixed(9)}  engine=${elems.siderealYearDays.toFixed(9)}  diff=${((elems.siderealYearDays - ref.sidereal)*86400).toFixed(3)}s`);
  console.log();
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('  EARTH PERIHELION LONGITUDE VALIDATION');
console.log('═══════════════════════════════════════════════════════════════\n');

for (const ref of EARTH_LONG_REF) {
  const pLong = oe.calcEarthPerihelionPredictive(ref.year);
  console.log(`Year ${ref.year}: model=${ref.perihelionRA.toFixed(6)}  engine=${pLong.toFixed(6)}  diff=${(pLong - ref.perihelionRA).toFixed(4)}°`);
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  SCENE GRAPH VALIDATION — Sun & Planets');
console.log('═══════════════════════════════════════════════════════════════\n');

const planets = ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

for (const ref of REF) {
  console.log(`\n─── JD ${ref.jd} (${ref.year}) ───`);

  for (const p of planets) {
    const target = p === 'sun' ? 'sun' : p;
    try {
      const result = sg.computePlanetPosition(target, ref.jd);
      const ra = sg.thetaToRaDeg(result.ra);
      const dec = sg.phiToDecDeg(result.dec);
      const expected = ref[p];

      if (p === 'sun') {
        const raErr = ra - expected.ra;
        const decErr = dec - expected.dec;
        const distErr = result.distAU - expected.dist;
        console.log(`  ${p.padEnd(8)} RA: ${ra.toFixed(4)}° (exp ${expected.ra.toFixed(4)}°, Δ${raErr.toFixed(4)}°)  Dec: ${dec.toFixed(4)}° (exp ${expected.dec.toFixed(4)}°, Δ${decErr.toFixed(4)}°)  Dist: ${result.distAU.toFixed(6)} (exp ${expected.dist.toFixed(6)}, Δ${distErr.toFixed(6)})`);
      } else {
        const raErr = ra - expected.ra;
        const decErr = dec - expected.dec;
        const distEErr = result.distAU - expected.distE;
        const distSErr = result.sunDistAU - expected.distS;
        console.log(`  ${p.padEnd(8)} RA: ${ra.toFixed(4)}° (exp ${expected.ra.toFixed(4)}°, Δ${raErr.toFixed(4)}°)  Dec: ${dec.toFixed(4)}° (exp ${expected.dec.toFixed(4)}°, Δ${decErr.toFixed(4)}°)  DistE: ${result.distAU.toFixed(4)} (exp ${expected.distE.toFixed(4)}, Δ${distEErr.toFixed(4)})  DistS: ${result.sunDistAU.toFixed(4)} (exp ${expected.distS.toFixed(4)}, Δ${distSErr.toFixed(4)})`);
      }
    } catch (e) {
      console.log(`  ${p.padEnd(8)} ERROR: ${e.message}`);
    }
  }
}
