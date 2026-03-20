#!/usr/bin/env node
// Fit Dec correction coefficients for each planet
// Model: dDec = A + B * sin(u - phi) / d
// where u = RA - ascendingNode, d = geocentric distance

const { computePlanetPosition } = require('../lib/scene-graph.js');
const C = require('../lib/constants.js');
const { j2000ToOfDate } = require('../lib/precession.js');
const refData = require('../../data/reference-data.json');
const d2r = Math.PI / 180;

const sg = require('../lib/scene-graph.js');
const targets = ['mercury','venus','mars','jupiter','saturn','uranus','neptune'];

for (const target of targets) {
  const allPoints = refData.planets[target] || [];
  const points = allPoints.filter(p => p.ra != null && p.dec != null && (p.weight || 0) > 0);
  if (points.length === 0) { console.log(target, '— no reference points'); continue; }
  const p = C.planets[target];
  const ascNode = p.ascendingNode;

  const data = [];
  for (const pt of points) {
    const result = computePlanetPosition(target, pt.jd);
    const modelDec = sg.phiToDecDeg(result.dec);

    // Parse reference RA/Dec same way as optimizer
    let refRA = parseFloat(pt.ra);
    if (typeof pt.ra === 'string' && !pt.ra.includes('°')) refRA *= 15;
    let refDec = parseFloat(pt.dec);
    const ofDate = j2000ToOfDate(refRA, refDec, pt.jd);
    refDec = ofDate.dec;

    const dDec = modelDec - refDec;
    const dd = result.distAU;
    const eclLon = sg.thetaToRaDeg(result.ra);
    const u = (eclLon - ascNode) * d2r;
    data.push({ dDec, d: dd, u });
  }

  // Grid search for optimal phase
  let bestPhase = 0, bestRMS = 1e9, bestA = 0, bestB = 0;
  for (let phi = -180; phi < 180; phi += 0.5) {
    const phiR = phi * d2r;
    let sY = 0, sS = 0, sSS = 0, sYS = 0;
    const n = data.length;
    for (const pt of data) {
      const s = Math.sin(pt.u - phiR) / pt.d;
      sY += pt.dDec; sS += s; sSS += s * s; sYS += pt.dDec * s;
    }
    const mY = sY / n, mS = sS / n;
    const denom = sSS / n - mS * mS;
    if (Math.abs(denom) < 1e-12) continue;
    const B = (sYS / n - mY * mS) / denom;
    const A = mY - B * mS;
    let rms = 0;
    for (const pt of data) {
      const pred = A + B * Math.sin(pt.u - phiR) / pt.d;
      rms += (pt.dDec - pred) ** 2;
    }
    rms = Math.sqrt(rms / n);
    if (rms < bestRMS) { bestRMS = rms; bestPhase = phi; bestA = A; bestB = B; }
  }

  let origRMS = 0;
  for (const pt of data) origRMS += pt.dDec ** 2;
  origRMS = Math.sqrt(origRMS / data.length);

  const impr = ((1 - bestRMS / origRMS) * 100).toFixed(0);
  console.log(`${target.padEnd(10)} n=${String(data.length).padStart(3)}  phase=${String(bestPhase).padStart(6)}°  A=${bestA.toFixed(4).padStart(8)}  B=${bestB.toFixed(4).padStart(8)}  origDec=${origRMS.toFixed(3)}  corrDec=${bestRMS.toFixed(3)}  impr=${impr}%`);
}
