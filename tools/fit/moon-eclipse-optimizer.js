const { computePlanetPosition, thetaToRaDeg, phiToDecDeg, _invalidateGraph } = require('../lib/scene-graph');
const C = require('../lib/constants');

// Known solar eclipses 2000-2025 — JD of greatest eclipse from NASA GSFC
// Source: https://eclipse.gsfc.nasa.gov/SEcat5/SE2001-2100.html
//         https://eclipse.gsfc.nasa.gov/SEcat5/SE1901-2000.html
const ECLIPSES = [
  { jd: 2451580.035035, label: '2000-Feb-05 Partial' },
  { jd: 2451727.314977, label: '2000-Jul-01 Partial' },
  { jd: 2451756.593148, label: '2000-Jul-31 Partial' },
  { jd: 2451904.233299, label: '2000-Dec-25 Partial' },
  { jd: 2452082.003310, label: '2001-Jun-21 Total' },
  { jd: 2452258.370150, label: '2001-Dec-14 Annular' },
  { jd: 2452436.489838, label: '2002-Jun-10 Annular' },
  { jd: 2452612.814074, label: '2002-Dec-04 Total' },
  { jd: 2452790.673171, label: '2003-May-31 Annular' },
  { jd: 2452967.451644, label: '2003-Nov-23 Total' },
  { jd: 2453115.066030, label: '2004-Apr-19 Partial' },
  { jd: 2453292.625266, label: '2004-Oct-14 Partial' },
  { jd: 2453469.358924, label: '2005-Apr-08 Hybrid' },
  { jd: 2453646.939433, label: '2005-Oct-03 Annular' },
  { jd: 2453823.925266, label: '2006-Mar-29 Total' },
  { jd: 2454000.986991, label: '2006-Sep-22 Annular' },
  { jd: 2454178.606215, label: '2007-Mar-19 Partial' },
  { jd: 2454355.022500, label: '2007-Sep-11 Partial' },
  { jd: 2454503.664005, label: '2008-Feb-07 Annular' },
  { jd: 2454679.932083, label: '2008-Aug-01 Total' },
  { jd: 2454857.833160, label: '2009-Jan-26 Annular' },
  { jd: 2455034.608623, label: '2009-Jul-22 Total' },
  { jd: 2455211.796979, label: '2010-Jan-15 Annular' },
  { jd: 2455389.315718, label: '2010-Jul-11 Total' },
  { jd: 2455565.869236, label: '2011-Jan-04 Partial' },
  { jd: 2455714.387014, label: '2011-Jun-01 Partial' },
  { jd: 2455743.860764, label: '2011-Jul-01 Partial' },
  { jd: 2455890.764861, label: '2011-Nov-25 Partial' },
  { jd: 2456068.495764, label: '2012-May-20 Annular' },
  { jd: 2456245.425637, label: '2012-Nov-13 Total' },
  { jd: 2456422.518287, label: '2013-May-10 Annular' },
  { jd: 2456600.033056, label: '2013-Nov-03 Hybrid' },
  { jd: 2456776.753160, label: '2014-Apr-29 Annular' },
  { jd: 2456954.406701, label: '2014-Oct-23 Partial' },
  { jd: 2457101.907488, label: '2015-Mar-20 Total' },
  { jd: 2457278.788414, label: '2015-Sep-13 Partial' },
  { jd: 2457456.582164, label: '2016-Mar-09 Total' },
  { jd: 2457632.880579, label: '2016-Sep-01 Annular' },
  { jd: 2457811.121215, label: '2017-Feb-26 Annular' },
  { jd: 2457987.268519, label: '2017-Aug-21 Total' },
  { jd: 2458165.369826, label: '2018-Feb-15 Partial' },
  { jd: 2458312.626574, label: '2018-Jul-13 Partial' },
  { jd: 2458341.907963, label: '2018-Aug-11 Partial' },
  { jd: 2458489.571273, label: '2019-Jan-06 Partial' },
  { jd: 2458667.308414, label: '2019-Jul-02 Total' },
  { jd: 2458843.721447, label: '2019-Dec-26 Annular' },
  { jd: 2459021.778646, label: '2020-Jun-21 Annular' },
  { jd: 2459198.176840, label: '2020-Dec-14 Total' },
  { jd: 2459375.946609, label: '2021-Jun-10 Annular' },
  { jd: 2459552.815718, label: '2021-Dec-04 Total' },
  { jd: 2459700.362917, label: '2022-Apr-30 Partial' },
  { jd: 2459877.959259, label: '2022-Oct-25 Partial' },
  { jd: 2460054.679120, label: '2023-Apr-20 Hybrid' },
  { jd: 2460232.250475, label: '2023-Oct-14 Annular' },
  { jd: 2460409.262836, label: '2024-Apr-08 Total' },
  { jd: 2460586.282095, label: '2024-Oct-02 Annular' },
  { jd: 2460763.950417, label: '2025-Mar-29 Partial' },
  { jd: 2460940.321574, label: '2025-Sep-21 Partial' },
];

function computeSeparation(jd) {
  const moon = computePlanetPosition('moon', jd);
  const sun = computePlanetPosition('sun', jd);
  const moonRA = thetaToRaDeg(moon.ra);
  const moonDec = phiToDecDeg(moon.dec);
  const sunRA = thetaToRaDeg(sun.ra);
  const sunDec = phiToDecDeg(sun.dec);

  let dRA = moonRA - sunRA;
  if (dRA > 180) dRA -= 360;
  if (dRA < -180) dRA += 360;
  const dDec = moonDec - sunDec;
  const cosDec = Math.cos(sunDec * Math.PI / 180);
  const sep = Math.sqrt((dRA * cosDec) ** 2 + dDec ** 2);
  return { sep, dRA, dDec, moonRA, moonDec, sunRA, sunDec };
}

function computeEclipseRMS(eclipses) {
  let sumSep2 = 0;
  const details = [];
  for (const e of eclipses) {
    const r = computeSeparation(e.jd);
    sumSep2 += r.sep * r.sep;
    details.push({ ...e, ...r });
  }
  return { rms: Math.sqrt(sumSep2 / eclipses.length), details };
}

// --- BASELINE ---
console.log('═══ CURRENT BASELINE: Moon-Sun separation at eclipses ═══\n');
const baseline = computeEclipseRMS(ECLIPSES);
console.log(`RMS separation: ${baseline.rms.toFixed(4)}°`);
console.log(`\n${'Eclipse'.padEnd(25)} Sep°    dRA°    dDec°`);
for (const d of baseline.details) {
  console.log(`${d.label.padEnd(25)} ${d.sep.toFixed(2).padStart(5)}  ${d.dRA.toFixed(2).padStart(7)}  ${d.dDec.toFixed(2).padStart(7)}`);
}

// --- OPTIMIZE ---
console.log('\n═══ OPTIMIZING startPos against eclipses ═══\n');

const origNodal = C.moonStartposNodal;
const origApsidal = C.moonStartposApsidal;
const origMoon = C.moonStartposMoon;

function setParams(nodal, apsidal, moon) {
  C.moonStartposNodal = nodal;
  C.moonStartposApsidal = apsidal;
  C.moonStartposMoon = moon;
  _invalidateGraph();
}

function evalRMS(nodal, apsidal, moon) {
  setParams(nodal, apsidal, moon);
  return computeEclipseRMS(ECLIPSES).rms;
}

let bestNodal = origNodal, bestApsidal = origApsidal, bestMoon = origMoon;
let bestRMS = evalRMS(bestNodal, bestApsidal, bestMoon);
console.log(`Start: nodal=${bestNodal} apsidal=${bestApsidal} moon=${bestMoon} RMS=${bestRMS.toFixed(4)}`);

for (let iter = 0; iter < 4; iter++) {
  for (const param of ['moon', 'nodal', 'apsidal']) {
    let improved = true;
    while (improved) {
      improved = false;
      for (const step of [10, 5, 1, 0.5, 0.1, 0.05, 0.01]) {
        for (const dir of [-1, 1]) {
          let n = bestNodal, a = bestApsidal, m = bestMoon;
          if (param === 'nodal') n += dir * step;
          if (param === 'apsidal') a += dir * step;
          if (param === 'moon') m += dir * step;
          const r = evalRMS(n, a, m);
          if (r < bestRMS) {
            bestNodal = n; bestApsidal = a; bestMoon = m;
            bestRMS = r; improved = true;
          }
        }
      }
    }
  }
  console.log(`Iter ${iter+1}: nodal=${bestNodal.toFixed(3)} apsidal=${bestApsidal.toFixed(3)} moon=${bestMoon.toFixed(3)} RMS=${bestRMS.toFixed(4)}`);
}

// Show final results
setParams(bestNodal, bestApsidal, bestMoon);
const final = computeEclipseRMS(ECLIPSES);
console.log(`\n═══ OPTIMIZED RESULTS ═══\n`);
console.log(`moonStartposNodal  = ${bestNodal.toFixed(3)}  (was ${origNodal})`);
console.log(`moonStartposApsidal = ${bestApsidal.toFixed(3)}  (was ${origApsidal})`);
console.log(`moonStartposMoon   = ${bestMoon.toFixed(3)}  (was ${origMoon})`);
console.log(`RMS separation: ${final.rms.toFixed(4)}° (was ${baseline.rms.toFixed(4)}°)`);

console.log(`\n${'Eclipse'.padEnd(25)} Sep°    dRA°    dDec°`);
for (const d of final.details) {
  console.log(`${d.label.padEnd(25)} ${d.sep.toFixed(2).padStart(5)}  ${d.dRA.toFixed(2).padStart(7)}  ${d.dDec.toFixed(2).padStart(7)}`);
}

// ─── Write to model-parameters.json if --write flag ─────────────────────────
if (process.argv.includes('--write')) {
  const fs = require('fs');
  const path = require('path');
  const jsonPath = path.resolve(__dirname, '..', '..', 'public', 'input', 'model-parameters.json');
  const mp = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  mp.moon.moonStartposNodal = bestNodal;
  mp.moon.moonStartposApsidal = bestApsidal;
  mp.moon.moonStartposMoon = bestMoon;
  fs.writeFileSync(jsonPath, JSON.stringify(mp, null, 2) + '\n');
  console.log('\n✓ Written moonStartposNodal/Apsidal/Moon to model-parameters.json');
} else {
  console.log('\n  (dry run — add --write to update model-parameters.json)');
}

// Restore original values in memory
setParams(origNodal, origApsidal, origMoon);
