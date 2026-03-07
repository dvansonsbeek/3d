/**
 * Test Moon-Sun separation at historical and ancient solar eclipses.
 * JD values computed from calendar dates using standard Julian Day algorithm.
 * Tests how full Meeus Ch. 47 accuracy holds across different eras.
 */

const { computePlanetPosition, thetaToRaDeg, phiToDecDeg } = require('../lib/scene-graph');

const d2r = Math.PI / 180;
const PARALLAX = 0.95;

function calToJD(year, month, day, hourUT) {
  hourUT = hourUT || 12;
  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  let B;
  if (year > 1582 || (year === 1582 && (month > 10 || (month === 10 && day >= 15)))) {
    const A = Math.floor(y / 100);
    B = 2 - A + Math.floor(A / 4);
  } else {
    B = 0;
  }
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + hourUT/24.0 + B - 1524.5;
}

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
  const cosDec = Math.cos(sunDec * d2r);
  const sep = Math.sqrt((dRA * cosDec) ** 2 + dDec ** 2);
  return { sep, dRA, dDec, moonRA, moonDec, sunRA, sunDec };
}

// Modern (2000-2025) — from NASA GSFC catalog (precise JD)
const MODERN = [
  { jd: 2459021.778646, label: '2020-Jun-21 Annular', gamma: 0.1209 },
  { jd: 2460409.262836, label: '2024-Apr-08 Total', gamma: 0.3431 },
  { jd: 2457987.268519, label: '2017-Aug-21 Total', gamma: 0.4367 },
  { jd: 2455034.608623, label: '2009-Jul-22 Total', gamma: 0.0698 },
  { jd: 2452436.489838, label: '2002-Jun-10 Annular', gamma: 0.1986 },
];

// 20th century
const C20 = [
  { jd: calToJD(1999,8,11,11.1), label: '1999-Aug-11 Total', gamma: 0.506 },
  { jd: calToJD(1991,7,11,19.1), label: '1991-Jul-11 Total', gamma: 0.007 },
  { jd: calToJD(1980,2,16,8.7), label: '1980-Feb-16 Total', gamma: 0.461 },
  { jd: calToJD(1973,6,30,11.4), label: '1973-Jun-30 Total', gamma: 0.072 },
  { jd: calToJD(1963,7,20,20.4), label: '1963-Jul-20 Total', gamma: 0.833 },
  { jd: calToJD(1952,2,25,9.6), label: '1952-Feb-25 Total', gamma: 0.353 },
  { jd: calToJD(1945,7,9,13.9), label: '1945-Jul-09 Total', gamma: 0.380 },
  { jd: calToJD(1919,5,29,13.1), label: '1919-May-29 Total (Einstein)', gamma: 0.596 },
  { jd: calToJD(1900,5,28,7.5), label: '1900-May-28 Total', gamma: -0.312 },
];

// 19th century
const C19 = [
  { jd: calToJD(1868,8,18,10), label: '1868-Aug-18 Total (Helium)', gamma: -0.099 },
  { jd: calToJD(1860,7,18,14), label: '1860-Jul-18 Total', gamma: 0.376 },
  { jd: calToJD(1842,7,8,6), label: '1842-Jul-08 Total', gamma: -0.474 },
  { jd: calToJD(1806,6,16,16), label: '1806-Jun-16 Total', gamma: 0.570 },
];

// 18th century
const C18 = [
  { jd: calToJD(1780,1,24,18), label: '1780-Jan-24 Annular', gamma: -0.287 },
  { jd: calToJD(1764,4,1,4), label: '1764-Apr-01 Total', gamma: -0.148 },
  { jd: calToJD(1724,5,22,8), label: '1724-May-22 Total', gamma: 0.095 },
  { jd: calToJD(1706,5,12,1), label: '1706-May-12 Total', gamma: 0.666 },
];

// 17th-15th century
const C17_15 = [
  { jd: calToJD(1652,4,8,6), label: '1652-Apr-08 Total', gamma: -0.035 },
  { jd: calToJD(1567,4,9,12), label: '1567-Apr-09 Annular (Clavius)', gamma: 0.047 },
  { jd: calToJD(1504,2,29,21), label: '1504-Feb-29 Total (Columbus)', gamma: 0.302 },
  { jd: calToJD(1433,6,17,6), label: '1433-Jun-17 Total', gamma: -0.127 },
];

// Medieval (Julian calendar)
const MEDIEVAL = [
  { jd: calToJD(1261,4,1,8), label: '1261-Apr-01 Total', gamma: 0.117 },
  { jd: calToJD(1133,8,2,6), label: '1133-Aug-02 Total (King Henry)', gamma: -0.243 },
  { jd: calToJD(1054,5,10,12), label: '1054-May-10 Total', gamma: 0.389 },
  { jd: calToJD(840,5,5,12), label: '0840-May-05 Total (Louis)', gamma: 0.344 },
  { jd: calToJD(632,1,27,12), label: '0632-Jan-27 Annular (Muhammad)', gamma: 0.136 },
];

// Ancient — astronomical year numbering (585 BCE = year -584)
const ANCIENT = [
  { jd: calToJD(-584,5,28,15), label: '-0584 May-28 Total (Thales)', gamma: 0.353 },
  { jd: calToJD(-430,8,3,18), label: '-0430 Aug-03 Annular (Thucydides)', gamma: -0.741 },
  { jd: calToJD(-309,8,15,12), label: '-0309 Aug-15 Total', gamma: 0.195 },
  { jd: calToJD(-189,3,14,9), label: '-0189 Mar-14 Total (Ennius)', gamma: 0.209 },
  { jd: calToJD(-135,4,15,5), label: '-0135 Apr-15 Total (Hipparchus)', gamma: -0.296 },
  { jd: calToJD(28,6,19,12), label: '0028-Jun-19 Total', gamma: 0.222 },
  { jd: calToJD(334,7,17,12), label: '0334-Jul-17 Total', gamma: 0.104 },
  { jd: calToJD(484,1,14,8), label: '0484-Jan-14 Total', gamma: -0.389 },
];

function analyzeEra(label, eclipses) {
  console.log(`\n--- ${label} ---`);
  console.log(`${'Eclipse'.padEnd(42)} Sep°   |gamma|  Expected°  Resid°`);
  let sumSep2 = 0, sumRes2 = 0, within1 = 0, count = 0;
  for (const e of eclipses) {
    const r = computeSeparation(e.jd);
    const expected = Math.abs(e.gamma) * PARALLAX;
    const residual = r.sep - expected;
    sumSep2 += r.sep * r.sep;
    sumRes2 += residual * residual;
    if (r.sep <= 1.5) within1++;
    count++;
    const flag = Math.abs(residual) > 2.0 ? '!!' : Math.abs(residual) > 0.5 ? ' !' : '  ';
    console.log(`${e.label.padEnd(42)}${flag}${r.sep.toFixed(3).padStart(6)}  ${Math.abs(e.gamma).toFixed(3).padStart(6)}   ${expected.toFixed(3).padStart(8)}  ${(residual >= 0 ? '+' : '') + residual.toFixed(3)}`);
  }
  const rms = Math.sqrt(sumSep2 / count);
  const resRms = Math.sqrt(sumRes2 / count);
  console.log(`  RMS: ${rms.toFixed(3)}°  |  Residual: ${resRms.toFixed(3)}°  |  ≤1.5°: ${within1}/${count}`);
  return { rms, resRms, within1, count };
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('  HISTORICAL ECLIPSE TEST: Full Meeus Ch. 47 accuracy by era');
console.log('═══════════════════════════════════════════════════════════════');

const results = [];
results.push({ era: 'Modern (2000-2024)', ...analyzeEra('Modern (2000-2024)', MODERN) });
results.push({ era: '20th century', ...analyzeEra('20th century (1900-1999)', C20) });
results.push({ era: '19th century', ...analyzeEra('19th century (1806-1868)', C19) });
results.push({ era: '18th century', ...analyzeEra('18th century (1706-1780)', C18) });
results.push({ era: '17th-15th century', ...analyzeEra('17th-15th century (1433-1652)', C17_15) });
results.push({ era: 'Medieval (632-1261)', ...analyzeEra('Medieval (632-1261)', MEDIEVAL) });
results.push({ era: 'Ancient (584 BCE-484 CE)', ...analyzeEra('Ancient (584 BCE - 484 CE)', ANCIENT) });

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  SUMMARY BY ERA');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`${'Era'.padEnd(30)}  Sep RMS°  Resid RMS°  ≤1.5°`);
for (const r of results) {
  console.log(`${r.era.padEnd(30)}  ${r.rms.toFixed(3).padStart(7)}    ${r.resRms.toFixed(3).padStart(7)}    ${r.within1}/${r.count}`);
}

console.log('\nNotes:');
console.log('- Geocentric parallax contributes ~|gamma|×0.95° (expected, not an error)');
console.log('- Residual = actual separation minus expected parallax');
console.log('- Eclipse times may have ~hours uncertainty for ancient dates');
console.log('- Meeus Ch. 47 designed for accuracy within ±few centuries of J2000');
