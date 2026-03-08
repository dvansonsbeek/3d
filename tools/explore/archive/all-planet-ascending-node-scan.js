#!/usr/bin/env node
/**
 * Scan ascending node corrections for ALL planets.
 * Quick scan: coarse + fine only, output just the optimal offset.
 */
const sg = require('../lib/scene-graph.js');
const C = require('../lib/constants.js');
const jpl = require('../lib/horizons-client.js');

const d2r = Math.PI / 180;
const r2d = 180 / Math.PI;

function equatorialToEcliptic(raDeg, decDeg, obliquityDeg) {
  const eps = obliquityDeg * d2r;
  const a = raDeg * d2r, d = decDeg * d2r;
  const sinLam = Math.sin(a) * Math.cos(eps) + Math.tan(d) * Math.sin(eps);
  let lam = Math.atan2(sinLam, Math.cos(a)) * r2d;
  if (lam < 0) lam += 360;
  const sinBet = Math.sin(d) * Math.cos(eps) - Math.cos(d) * Math.sin(eps) * Math.sin(a);
  return { lon: lam, lat: Math.asin(sinBet) * r2d };
}

const obliquity = 23.4393;

// Opposition/conjunction dates for each planet
const dates = {
  mercury: [
    2455200.5, 2455400.5, 2455600.5, 2455800.5, 2456000.5,
    2456200.5, 2456400.5, 2456600.5, 2456800.5, 2457000.5,
    2457200.5, 2457400.5, 2457600.5, 2457800.5, 2458000.5,
    2458200.5, 2458400.5, 2458600.5, 2458800.5, 2459000.5,
  ],
  venus: [
    2455200.5, 2455500.5, 2455800.5, 2456100.5, 2456400.5,
    2456700.5, 2457000.5, 2457300.5, 2457600.5, 2457900.5,
    2458200.5, 2458500.5, 2458800.5, 2459100.5, 2459400.5,
    2459700.5, 2460000.5, 2460300.5, 2460600.5,
  ],
  mars: [
    2455413.5, 2456009.5, 2456718.5, 2457391.5, 2457931.5,
    2458321.5, 2458741.5, 2459161.5, 2459581.5, 2460001.5,
    2460421.5,
  ],
  jupiter: [
    2455461.5, 2455864.5, 2456265.5, 2456663.5, 2457060.5,
    2457456.5, 2457851.5, 2458247.5, 2458644.5, 2459044.5,
    2459446.5, 2459849.5, 2460252.5, 2460651.5,
  ],
  saturn: [
    2457165.5, 2457542.5, 2457919.5, 2458296.5, 2458673.5,
    2459050.5, 2459427.5, 2459805.5, 2460183.5, 2460561.5,
  ],
  uranus: [
    2455480.5, 2455860.5, 2456240.5, 2456620.5, 2457000.5,
    2457380.5, 2457760.5, 2458140.5, 2458520.5, 2458900.5,
    2459280.5, 2459660.5, 2460040.5, 2460420.5,
  ],
  neptune: [
    2455385.5, 2455750.5, 2456115.5, 2456480.5, 2456845.5,
    2457210.5, 2457575.5, 2457940.5, 2458305.5, 2458670.5,
    2459035.5, 2459400.5, 2459765.5, 2460130.5,
  ],
};

async function scanPlanet(target) {
  const jds = dates[target];
  if (!jds) return null;

  const jplPositions = await jpl.getPositions(target, jds);
  const jplEcl = jplPositions.map(p => equatorialToEcliptic(p.ra, p.dec, obliquity));
  const currentAscNode = C.planets[target].ascendingNode;

  function computeLatRMS(ascNodeOffset) {
    sg._invalidateGraph();
    C.planets[target].ascendingNode = currentAscNode + ascNodeOffset;
    sg._invalidateGraph();

    let sumLat2 = 0;
    for (let i = 0; i < jds.length; i++) {
      const pos = sg.computePlanetPosition(target, jds[i]);
      const modelRaDeg = sg.thetaToRaDeg(pos.ra);
      const modelDecDeg = sg.phiToDecDeg(pos.dec);
      const modelEcl = equatorialToEcliptic(modelRaDeg, modelDecDeg, obliquity);
      let dLat = modelEcl.lat - jplEcl[i].lat;
      sumLat2 += dLat * dLat;
    }
    C.planets[target].ascendingNode = currentAscNode;
    return Math.sqrt(sumLat2 / jds.length);
  }

  // Coarse scan
  let bestOffset = 0, bestRMS = Infinity;
  for (let offset = -180; offset < 180; offset += 5) {
    const rms = computeLatRMS(offset);
    if (rms < bestRMS) { bestRMS = rms; bestOffset = offset; }
  }

  // Fine scan
  for (let offset = bestOffset - 10; offset <= bestOffset + 10; offset += 0.5) {
    const rms = computeLatRMS(offset);
    if (rms < bestRMS) { bestRMS = rms; bestOffset = offset; }
  }

  // Ultra-fine
  for (let offset = bestOffset - 2; offset <= bestOffset + 2; offset += 0.1) {
    const rounded = Math.round(offset * 10) / 10;
    const rms = computeLatRMS(rounded);
    if (rms < bestRMS) { bestRMS = rms; bestOffset = rounded; }
  }

  const baseRMS = computeLatRMS(0);
  sg._invalidateGraph();

  return {
    target,
    currentAscNode,
    bestOffset,
    newAscNode: currentAscNode + bestOffset,
    baseLatRMS: baseRMS,
    bestLatRMS: bestRMS,
  };
}

async function main() {
  console.log('Ascending Node Corrections for All Planets');
  console.log('==========================================\n');
  console.log('Planet   | J2000 Ω     | Offset  | Tool Ω     | Base Lat RMS | Best Lat RMS');
  console.log('---------+-------------+---------+------------+--------------+-------------');

  for (const target of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
    process.stderr.write(`Scanning ${target}...`);
    const result = await scanPlanet(target);
    if (result) {
      console.log(
        `${result.target.padEnd(9)}| ${result.currentAscNode.toFixed(4).padStart(11)} | ${(result.bestOffset >= 0 ? '+' : '') + result.bestOffset.toFixed(1).padStart(5)}° | ${result.newAscNode.toFixed(4).padStart(10)} | ${result.baseLatRMS.toFixed(3).padStart(12)} | ${result.bestLatRMS.toFixed(3).padStart(11)}`
      );
    }
    process.stderr.write(' done\n');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
