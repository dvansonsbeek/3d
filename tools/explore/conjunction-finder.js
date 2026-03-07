#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// CONJUNCTION FINDER — Find actual conjunction dates using the full scene
// graph (with equation of center), compare to known dates
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');
const { computePlanetPosition } = require('../lib/scene-graph');

const d2r = Math.PI / 180;

console.log('═══════════════════════════════════════════════════════════════');
console.log('  CONJUNCTION FINDER — Full Scene Graph with EoC');
console.log('═══════════════════════════════════════════════════════════════');
console.log();

// ═══════════════════════════════════════════════════════════════════════════
// Utility: find conjunction by bisection
// A conjunction occurs when two planets have the same RA (geocentric).
// We search for zero crossings of RA_diff, handling the 0/2π wraparound.
// ═══════════════════════════════════════════════════════════════════════════

function raDiff(planet1, planet2, jd) {
  const p1 = computePlanetPosition(planet1, jd);
  const p2 = computePlanetPosition(planet2, jd);
  // ra is in radians (0 to 2π)
  let diff = p1.ra - p2.ra;
  // Normalize to [-π, π]
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}

function findConjunctions(planet1, planet2, startJD, endJD, stepDays) {
  const conjunctions = [];
  let prevDiff = raDiff(planet1, planet2, startJD);
  let jd = startJD + stepDays;

  while (jd <= endJD) {
    const diff = raDiff(planet1, planet2, jd);

    // Zero crossing (sign change) — conjunction
    if (prevDiff * diff < 0 && Math.abs(prevDiff - diff) < Math.PI) {
      // Bisect to find precise JD
      let lo = jd - stepDays, hi = jd;
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        const midDiff = raDiff(planet1, planet2, mid);
        if (prevDiff * midDiff < 0) {
          hi = mid;
        } else {
          lo = mid;
          prevDiff = midDiff;
        }
      }
      const conjJD = (lo + hi) / 2;
      const p1pos = computePlanetPosition(planet1, conjJD);
      const p2pos = computePlanetPosition(planet2, conjJD);
      const raDeg = p1pos.ra / d2r;
      const decDeg1 = (Math.PI / 2 - p1pos.dec) / d2r;
      const decDeg2 = (Math.PI / 2 - p2pos.dec) / d2r;
      const separation = Math.abs(decDeg1 - decDeg2);

      conjunctions.push({
        jd: conjJD,
        year: C.jdToYear(conjJD),
        date: C.jdToDateString(conjJD),
        raDeg,
        dec1: decDeg1,
        dec2: decDeg2,
        separation,
      });
    }

    prevDiff = diff;
    jd += stepDays;
  }
  return conjunctions;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. JUPITER-SATURN GREAT CONJUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
console.log('─── 1. Jupiter-Saturn Great Conjunctions ────────────────────');
console.log();

const knownGCs = [
  // Ancient great conjunctions (well-documented historical events)
  { jd: C.calendarToJD(-6, 5, 27), label: '7 BCE May 27' },    // Star of Bethlehem candidate (triple)
  { jd: C.calendarToJD(-6, 10, 6), label: '7 BCE Oct 06' },    // Second pass
  { jd: C.calendarToJD(-6, 12, 1), label: '7 BCE Dec 01' },    // Third pass
  { jd: C.calendarToJD(54, 7, 10), label: '54 CE Jul 10' },
  { jd: C.calendarToJD(372, 5, 1), label: '372 CE May' },
  { jd: C.calendarToJD(769, 8, 15), label: '769 CE Aug' },
  { jd: C.calendarToJD(1007, 4, 20), label: '1007 CE Apr' },
  { jd: C.calendarToJD(1186, 4, 18), label: '1186 CE Apr' },
  { jd: C.calendarToJD(1226, 4, 16), label: '1226 CE Apr' },   // ~2° separation
  { jd: C.calendarToJD(1306, 5, 24), label: '1306 CE May' },
  { jd: C.calendarToJD(1345, 4, 22), label: '1345 CE Apr' },
  { jd: C.calendarToJD(1425, 6, 1), label: '1425 CE Jun' },
  { jd: C.calendarToJD(1583, 7, 13), label: '1583 CE Jul' },   // Tycho Brahe observed
  { jd: C.calendarToJD(1623, 7, 16), label: '1623 CE Jul' },   // Kepler observed
  { jd: C.calendarToJD(1683, 2, 9), label: '1683 CE Feb' },
  { jd: C.calendarToJD(1702, 5, 21), label: '1702 CE May' },
  { jd: C.calendarToJD(1782, 7, 16), label: '1782 CE Jul' },
  { jd: C.calendarToJD(1821, 6, 19), label: '1821 CE Jun' },
  { jd: C.calendarToJD(1861, 10, 21), label: '1861 CE Oct' },
  // Modern great conjunctions
  { jd: C.calendarToJD(1901, 11, 28), label: '1901 Nov 28' },
  { jd: C.calendarToJD(1921, 9, 10), label: '1921 Sep 10' },
  { jd: C.calendarToJD(1940, 8, 8), label: '1940 Aug 08' },
  { jd: C.calendarToJD(1940, 10, 20), label: '1940 Oct 20' },
  { jd: C.calendarToJD(1941, 2, 15), label: '1941 Feb 15' },
  { jd: C.calendarToJD(1961, 2, 19), label: '1961 Feb 19' },
  { jd: C.calendarToJD(1981, 1, 1), label: '1981 Jan 01' },
  { jd: C.calendarToJD(2000, 5, 28), label: '2000 May 28' },
  { jd: C.calendarToJD(2020, 12, 21), label: '2020 Dec 21' },
  { jd: C.calendarToJD(2040, 10, 31), label: '2040 Oct 31' },
  { jd: C.calendarToJD(2060, 4, 8), label: '2060 Apr 08' },
  { jd: C.calendarToJD(2080, 3, 15), label: '2080 Mar 15' },
  { jd: C.calendarToJD(2100, 9, 18), label: '2100 Sep 18' },
];

// Search from 10 BCE to 2120, step 30 days (Jupiter-Saturn synodic ~20yr, well within step)
const gcConjs = findConjunctions('jupiter', 'saturn',
  C.calendarToJD(-9, 1, 1), C.calendarToJD(2120, 1, 1), 30);

console.log(`  Found ${gcConjs.length} conjunctions (10 BCE - 2120 CE)`);
console.log();
console.log('  ' + C.pad('Model date', 18) + ' | ' + C.pad('RA', 8) + ' | ' +
  C.pad('Sep', 6) + ' | ' + C.pad('Known date', 18) + ' | Diff (days)');
console.log('  ' + '-'.repeat(18) + '-+-' + '-'.repeat(8) + '-+-' +
  '-'.repeat(6) + '-+-' + '-'.repeat(18) + '-+-' + '-'.repeat(11));

for (const conj of gcConjs) {
  // Find closest known
  let closest = null, closestDiff = Infinity;
  for (const gc of knownGCs) {
    const diff = Math.abs(conj.jd - gc.jd);
    if (diff < closestDiff) { closestDiff = diff; closest = gc; }
  }
  const matchStr = closest && closestDiff < 3650 ? closest.label : '';
  const diffDays = closest && closestDiff < 3650 ? (conj.jd - closest.jd).toFixed(1) : '';

  console.log('  ' + C.pad(conj.date, 18) + ' | ' +
    C.padLeft(conj.raDeg.toFixed(2) + '°', 8) + ' | ' +
    C.padLeft(conj.separation.toFixed(2) + '°', 6) + ' | ' +
    C.pad(matchStr, 18) + ' | ' + C.padLeft(diffDays, 11));
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. EARTH-JUPITER OPPOSITIONS (Jupiter RA = Sun RA + 180°)
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 2. Earth-Jupiter Oppositions ────────────────────────────');
console.log();

const knownJupOpp = [
  { jd: C.calendarToJD(2010, 9, 21), label: '2010 Sep 21' },
  { jd: C.calendarToJD(2011, 10, 29), label: '2011 Oct 29' },
  { jd: C.calendarToJD(2012, 12, 3), label: '2012 Dec 03' },
  { jd: C.calendarToJD(2014, 1, 5), label: '2014 Jan 05' },
  { jd: C.calendarToJD(2015, 2, 6), label: '2015 Feb 06' },
  { jd: C.calendarToJD(2016, 3, 8), label: '2016 Mar 08' },
  { jd: C.calendarToJD(2017, 4, 7), label: '2017 Apr 07' },
  { jd: C.calendarToJD(2018, 5, 9), label: '2018 May 09' },
  { jd: C.calendarToJD(2019, 6, 10), label: '2019 Jun 10' },
  { jd: C.calendarToJD(2020, 7, 14), label: '2020 Jul 14' },
  { jd: C.calendarToJD(2021, 8, 20), label: '2021 Aug 20' },
  { jd: C.calendarToJD(2022, 9, 26), label: '2022 Sep 26' },
  { jd: C.calendarToJD(2023, 11, 3), label: '2023 Nov 03' },
  { jd: C.calendarToJD(2024, 12, 7), label: '2024 Dec 07' },
];

// Opposition = Sun and Jupiter 180° apart in RA
function raOppDiff(planet, jd) {
  const p = computePlanetPosition(planet, jd);
  const s = computePlanetPosition('sun', jd);
  let diff = p.ra - s.ra - Math.PI; // opposition = 180° difference
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}

function findOppositions(planet, startJD, endJD, stepDays) {
  const opps = [];
  let prevDiff = raOppDiff(planet, startJD);
  let jd = startJD + stepDays;

  while (jd <= endJD) {
    const diff = raOppDiff(planet, jd);
    if (prevDiff * diff < 0 && Math.abs(prevDiff - diff) < Math.PI) {
      let lo = jd - stepDays, hi = jd;
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        const midDiff = raOppDiff(planet, mid);
        if (prevDiff * midDiff < 0) hi = mid;
        else { lo = mid; prevDiff = midDiff; }
      }
      const oppJD = (lo + hi) / 2;
      opps.push({ jd: oppJD, year: C.jdToYear(oppJD), date: C.jdToDateString(oppJD) });
    }
    prevDiff = diff;
    jd += stepDays;
  }
  return opps;
}

const jupOpps = findOppositions('jupiter',
  C.calendarToJD(2010, 1, 1), C.calendarToJD(2025, 6, 1), 5);

console.log(`  Found ${jupOpps.length} Jupiter oppositions (2010-2025)`);
console.log();
console.log('  ' + C.pad('Model date', 18) + ' | ' + C.pad('Known date', 18) + ' | Diff (days)');
console.log('  ' + '-'.repeat(18) + '-+-' + '-'.repeat(18) + '-+-' + '-'.repeat(11));

for (const opp of jupOpps) {
  let closest = null, closestDiff = Infinity;
  for (const k of knownJupOpp) {
    const diff = Math.abs(opp.jd - k.jd);
    if (diff < closestDiff) { closestDiff = diff; closest = k; }
  }
  const matchStr = closest && closestDiff < 200 ? closest.label : '';
  const diffDays = closest && closestDiff < 200 ? (opp.jd - closest.jd).toFixed(1) : '';
  console.log('  ' + C.pad(opp.date, 18) + ' | ' + C.pad(matchStr, 18) + ' | ' + C.padLeft(diffDays, 11));
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. EARTH-SATURN OPPOSITIONS
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 3. Earth-Saturn Oppositions ─────────────────────────────');
console.log();

const knownSatOpp = [
  { jd: C.calendarToJD(2015, 5, 23), label: '2015 May 23' },
  { jd: C.calendarToJD(2016, 6, 3), label: '2016 Jun 03' },
  { jd: C.calendarToJD(2017, 6, 15), label: '2017 Jun 15' },
  { jd: C.calendarToJD(2018, 6, 27), label: '2018 Jun 27' },
  { jd: C.calendarToJD(2019, 7, 9), label: '2019 Jul 09' },
  { jd: C.calendarToJD(2020, 7, 20), label: '2020 Jul 20' },
  { jd: C.calendarToJD(2021, 8, 2), label: '2021 Aug 02' },
  { jd: C.calendarToJD(2022, 8, 14), label: '2022 Aug 14' },
  { jd: C.calendarToJD(2023, 8, 27), label: '2023 Aug 27' },
  { jd: C.calendarToJD(2024, 9, 8), label: '2024 Sep 08' },
];

const satOpps = findOppositions('saturn',
  C.calendarToJD(2015, 1, 1), C.calendarToJD(2025, 6, 1), 5);

console.log(`  Found ${satOpps.length} Saturn oppositions (2015-2025)`);
console.log();
console.log('  ' + C.pad('Model date', 18) + ' | ' + C.pad('Known date', 18) + ' | Diff (days)');
console.log('  ' + '-'.repeat(18) + '-+-' + '-'.repeat(18) + '-+-' + '-'.repeat(11));

for (const opp of satOpps) {
  let closest = null, closestDiff = Infinity;
  for (const k of knownSatOpp) {
    const diff = Math.abs(opp.jd - k.jd);
    if (diff < closestDiff) { closestDiff = diff; closest = k; }
  }
  const matchStr = closest && closestDiff < 200 ? closest.label : '';
  const diffDays = closest && closestDiff < 200 ? (opp.jd - closest.jd).toFixed(1) : '';
  console.log('  ' + C.pad(opp.date, 18) + ' | ' + C.pad(matchStr, 18) + ' | ' + C.padLeft(diffDays, 11));
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. SUMMARY STATISTICS
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 4. Summary ──────────────────────────────────────────────');
console.log();

function computeStats(modelEvents, knownEvents, maxDiffJD) {
  const diffs = [];
  for (const m of modelEvents) {
    let closest = null, closestDiff = Infinity;
    for (const k of knownEvents) {
      const diff = Math.abs(m.jd - k.jd);
      if (diff < closestDiff) { closestDiff = diff; closest = k; }
    }
    if (closest && closestDiff < maxDiffJD) {
      diffs.push(m.jd - closest.jd);
    }
  }
  if (diffs.length === 0) return null;
  const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const rms = Math.sqrt(diffs.reduce((a, b) => a + b * b, 0) / diffs.length);
  const maxAbs = Math.max(...diffs.map(Math.abs));
  return { mean, rms, maxAbs, n: diffs.length };
}

const gcStats = computeStats(gcConjs, knownGCs, 3650);
const jupOppStats = computeStats(jupOpps, knownJupOpp, 200);
const satOppStats = computeStats(satOpps, knownSatOpp, 200);

if (gcStats) {
  console.log(`  Jupiter-Saturn great conjunctions (n=${gcStats.n}):`);
  console.log(`    Mean error: ${gcStats.mean.toFixed(1)} days`);
  console.log(`    RMS error:  ${gcStats.rms.toFixed(1)} days`);
  console.log(`    Max error:  ${gcStats.maxAbs.toFixed(1)} days`);
}
console.log();
if (jupOppStats) {
  console.log(`  Jupiter oppositions (n=${jupOppStats.n}):`);
  console.log(`    Mean error: ${jupOppStats.mean.toFixed(1)} days`);
  console.log(`    RMS error:  ${jupOppStats.rms.toFixed(1)} days`);
  console.log(`    Max error:  ${jupOppStats.maxAbs.toFixed(1)} days`);
}
console.log();
if (satOppStats) {
  console.log(`  Saturn oppositions (n=${satOppStats.n}):`);
  console.log(`    Mean error: ${satOppStats.mean.toFixed(1)} days`);
  console.log(`    RMS error:  ${satOppStats.rms.toFixed(1)} days`);
  console.log(`    Max error:  ${satOppStats.maxAbs.toFixed(1)} days`);
}

console.log();
console.log('═══════════════════════════════════════════════════════════════');
console.log('  CONJUNCTION FINDER COMPLETE');
console.log('═══════════════════════════════════════════════════════════════');
