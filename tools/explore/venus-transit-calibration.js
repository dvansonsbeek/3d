#!/usr/bin/env node
// Debug Venus declination — scan ascNodeToolCorrection effect on baseline + transits
const C = require('../lib/constants');
const { computePlanetPosition, phiToDecDeg, _invalidateGraph } = require('../lib/scene-graph');
const { baseline } = require('../lib/optimizer');

// Transit dates
const transits = [
  { jd: C.calendarToJD(1882, 12, 6) + 16.8/24, label: '1882' },
  { jd: C.calendarToJD(2004, 6, 8) + 7.2/24,   label: '2004' },
  { jd: C.calendarToJD(2012, 6, 6) + 2.4/24,   label: '2012' },
];

function computeTransitErrors() {
  return transits.map(t => {
    const v = computePlanetPosition('venus', t.jd);
    const s = computePlanetPosition('sun', t.jd);
    return phiToDecDeg(v.dec) - phiToDecDeg(s.dec);
  });
}

const origCorr = C.ASTRO_REFERENCE.ascNodeTiltCorrection.venus;

console.log('═══ Venus ascNodeToolCorrection: Baseline + Transit scan ═══\n');
console.log('  corr°   RMS-RA  RMS-Dec  RMS-Tot   transit-2004  transit-2012  transit-1882  transit-mean');
console.log('  ' + '─'.repeat(100));

for (let corr = 70; corr <= 110; corr += 5) {
  C.ASTRO_REFERENCE.ascNodeTiltCorrection.venus = corr;
  _invalidateGraph();

  // Use optimizer baseline
  const origLog = console.log;
  console.log = () => {};  // suppress output
  const bl = baseline('venus');
  console.log = origLog;
  const te = computeTransitErrors();
  const meanAbs = te.reduce((a, b) => a + Math.abs(b), 0) / te.length;
  const mark = Math.abs(corr - origCorr) < 1 ? ' ◄ CURRENT' : '';

  console.log(`  ${String(corr).padStart(4)}°   ${bl.rmsRA.toFixed(2).padStart(5)}  ${bl.rmsDec.toFixed(2).padStart(6)}   ${bl.rmsTotal.toFixed(2).padStart(5)}    ${te[1].toFixed(2).padStart(7)}°      ${te[2].toFixed(2).padStart(7)}°      ${te[0].toFixed(2).padStart(7)}°      ${meanAbs.toFixed(2).padStart(5)}°${mark}`);
}

// Restore
C.ASTRO_REFERENCE.ascNodeTiltCorrection.venus = origCorr;
_invalidateGraph();
