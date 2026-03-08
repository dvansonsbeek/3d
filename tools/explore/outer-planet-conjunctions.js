#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// OUTER PLANET CONJUNCTIONS — Test Uranus & Neptune periods via inter-planet
// conjunctions with Jupiter and Saturn (whose periods are well-calibrated)
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');
const { computePlanetPosition, _invalidateGraph } = require('../lib/scene-graph');

const d2r = Math.PI / 180;

function raDiff(planet1, planet2, jd) {
  const p1 = computePlanetPosition(planet1, jd);
  const p2 = computePlanetPosition(planet2, jd);
  let diff = p1.ra - p2.ra;
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
    if (prevDiff * diff < 0 && Math.abs(prevDiff - diff) < Math.PI) {
      let lo = jd - stepDays, hi = jd;
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        const midDiff = raDiff(planet1, planet2, mid);
        if (prevDiff * midDiff < 0) hi = mid;
        else { lo = mid; prevDiff = midDiff; }
      }
      const conjJD = (lo + hi) / 2;
      conjunctions.push({
        jd: conjJD,
        year: C.jdToYear(conjJD),
        date: C.jdToDateString(conjJD),
      });
    }
    prevDiff = diff;
    jd += stepDays;
  }
  return conjunctions;
}

function analyzeConjunctions(label, planet1, planet2, knownDates, startYear, endYear, stepDays) {
  console.log(`─── ${label} ────────────────────────────`);
  console.log();

  const startJD = C.calendarToJD(startYear, 1, 1);
  const endJD = C.calendarToJD(endYear, 12, 31);
  const conjs = findConjunctions(planet1, planet2, startJD, endJD, stepDays);

  console.log(`  Found ${conjs.length} conjunctions (${startYear}-${endYear})`);
  console.log();
  console.log('  ' + C.pad('Model date', 18) + ' | ' + C.pad('Known date', 18) + ' | Diff (days)');
  console.log('  ' + '-'.repeat(18) + '-+-' + '-'.repeat(18) + '-+-' + '-'.repeat(11));

  const matches = [];
  for (const conj of conjs) {
    let closest = null, closestDiff = Infinity;
    for (const k of knownDates) {
      const diff = Math.abs(conj.jd - k.jd);
      if (diff < closestDiff) { closestDiff = diff; closest = k; }
    }
    const matchStr = closest && closestDiff < 365 ? closest.label : '';
    const diffDays = closest && closestDiff < 365 ? (conj.jd - closest.jd).toFixed(1) : '';
    if (closest && closestDiff < 365) {
      matches.push({ diffDays: conj.jd - closest.jd, year: conj.year });
    }
    console.log('  ' + C.pad(conj.date, 18) + ' | ' + C.pad(matchStr, 18) + ' | ' + C.padLeft(diffDays, 11));
  }

  if (matches.length > 1) {
    const diffs = matches.map(m => m.diffDays);
    const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const rms = Math.sqrt(diffs.reduce((a, b) => a + b * b, 0) / diffs.length);
    console.log();
    console.log(`  Matched: ${matches.length}  Mean: ${mean.toFixed(1)} days  RMS: ${rms.toFixed(1)} days`);

    // Check trend
    if (matches.length >= 3) {
      const early = matches.filter(m => m.year < 1960);
      const late = matches.filter(m => m.year >= 1960);
      if (early.length > 0 && late.length > 0) {
        const earlyMean = early.reduce((a, m) => a + m.diffDays, 0) / early.length;
        const lateMean = late.reduce((a, m) => a + m.diffDays, 0) / late.length;
        console.log(`  Early (<1960, n=${early.length}): ${earlyMean.toFixed(1)} days  Late (≥1960, n=${late.length}): ${lateMean.toFixed(1)} days  Drift: ${(earlyMean - lateMean).toFixed(1)} days`);
      }
    }
  }
  console.log();
  return matches;
}

// ═══════════════════════════════════════════════════════════════════════════
// Known conjunction dates (from astronomical records)
// ═══════════════════════════════════════════════════════════════════════════

// Jupiter-Uranus (~14 year synodic period)
const jupiterUranusConj = [
  { jd: C.calendarToJD(1858, 3, 21), label: '1858 Mar 21' },
  { jd: C.calendarToJD(1872, 1, 3), label: '1872 Jan 03' },
  { jd: C.calendarToJD(1885, 11, 10), label: '1885 Nov 10' },
  { jd: C.calendarToJD(1899, 12, 1), label: '1899 Dec 01' },
  { jd: C.calendarToJD(1914, 3, 4), label: '1914 Mar 04' },
  { jd: C.calendarToJD(1927, 8, 19), label: '1927 Aug 19' },
  { jd: C.calendarToJD(1941, 5, 8), label: '1941 May 08' },
  { jd: C.calendarToJD(1954, 10, 19), label: '1954 Oct 19' },
  { jd: C.calendarToJD(1969, 1, 14), label: '1969 Jan 14' },
  { jd: C.calendarToJD(1983, 2, 18), label: '1983 Feb 18' },
  { jd: C.calendarToJD(1997, 2, 16), label: '1997 Feb 16' },
  { jd: C.calendarToJD(2010, 6, 8), label: '2010 Jun 08' },
  { jd: C.calendarToJD(2010, 9, 19), label: '2010 Sep 19' },
  { jd: C.calendarToJD(2011, 1, 4), label: '2011 Jan 04' },
  { jd: C.calendarToJD(2024, 4, 21), label: '2024 Apr 21' },
];

// Jupiter-Neptune (~13 year synodic period)
const jupiterNeptuneConj = [
  { jd: C.calendarToJD(1856, 3, 17), label: '1856 Mar 17' },
  { jd: C.calendarToJD(1869, 4, 13), label: '1869 Apr 13' },
  { jd: C.calendarToJD(1882, 6, 2), label: '1882 Jun 02' },
  { jd: C.calendarToJD(1895, 9, 4), label: '1895 Sep 04' },
  { jd: C.calendarToJD(1907, 9, 10), label: '1907 Sep 10' },
  { jd: C.calendarToJD(1920, 9, 24), label: '1920 Sep 24' },
  { jd: C.calendarToJD(1932, 10, 1), label: '1932 Oct 01' },
  { jd: C.calendarToJD(1945, 8, 1), label: '1945 Aug 01' },
  { jd: C.calendarToJD(1958, 9, 16), label: '1958 Sep 16' },
  { jd: C.calendarToJD(1971, 2, 1), label: '1971 Feb 01' },
  { jd: C.calendarToJD(1984, 1, 19), label: '1984 Jan 19' },
  { jd: C.calendarToJD(1997, 1, 9), label: '1997 Jan 09' },
  { jd: C.calendarToJD(2009, 5, 27), label: '2009 May 27' },
  { jd: C.calendarToJD(2009, 7, 10), label: '2009 Jul 10' },
  { jd: C.calendarToJD(2009, 12, 21), label: '2009 Dec 21' },
  { jd: C.calendarToJD(2022, 4, 12), label: '2022 Apr 12' },
];

// Saturn-Uranus (~45 year synodic period)
const saturnUranusConj = [
  { jd: C.calendarToJD(1852, 6, 26), label: '1852 Jun 26' },
  { jd: C.calendarToJD(1897, 1, 12), label: '1897 Jan 12' },
  { jd: C.calendarToJD(1942, 5, 3), label: '1942 May 03' },
  { jd: C.calendarToJD(1988, 2, 13), label: '1988 Feb 13' },
  { jd: C.calendarToJD(1988, 6, 26), label: '1988 Jun 26' },
  { jd: C.calendarToJD(1988, 10, 18), label: '1988 Oct 18' },
];

// Saturn-Neptune (~36 year synodic period)
const saturnNeptuneConj = [
  { jd: C.calendarToJD(1846, 4, 3), label: '1846 Apr 03' },
  { jd: C.calendarToJD(1882, 5, 14), label: '1882 May 14' },
  { jd: C.calendarToJD(1917, 8, 1), label: '1917 Aug 01' },
  { jd: C.calendarToJD(1953, 11, 21), label: '1953 Nov 21' },
  { jd: C.calendarToJD(1989, 3, 3), label: '1989 Mar 03' },
  { jd: C.calendarToJD(1989, 6, 24), label: '1989 Jun 24' },
  { jd: C.calendarToJD(1989, 11, 13), label: '1989 Nov 13' },
  { jd: C.calendarToJD(2026, 2, 20), label: '2026 Feb 20' },
];

// Uranus-Neptune (~171 year synodic period)
const uranusNeptuneConj = [
  { jd: C.calendarToJD(1821, 5, 29), label: '1821 May 29' },
  { jd: C.calendarToJD(1993, 2, 2), label: '1993 Feb 02' },
  { jd: C.calendarToJD(1993, 8, 20), label: '1993 Aug 20' },
  { jd: C.calendarToJD(1993, 10, 25), label: '1993 Oct 25' },
];

// ═══════════════════════════════════════════════════════════════════════════
// RUN ALL
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  OUTER PLANET CONJUNCTION ANALYSIS');
console.log('═══════════════════════════════════════════════════════════════');
console.log();

// Current periods
console.log('  Current solarYearInput values:');
for (const name of ['jupiter', 'saturn', 'uranus', 'neptune']) {
  const p = C.planets[name];
  const count = Math.round(335008 * 365.2421897 / p.solarYearInput);
  const effectivePeriod = 335008 * 365.2421897 / count;
  console.log(`    ${name}: input=${p.solarYearInput}  count=${count}  effective=${effectivePeriod.toFixed(3)} days`);
}
console.log();

// Conjunctions involving Uranus
analyzeConjunctions('Jupiter-Uranus', 'jupiter', 'uranus', jupiterUranusConj, 1850, 2030, 10);
analyzeConjunctions('Saturn-Uranus', 'saturn', 'uranus', saturnUranusConj, 1850, 2000, 15);

// Conjunctions involving Neptune
analyzeConjunctions('Jupiter-Neptune', 'jupiter', 'neptune', jupiterNeptuneConj, 1850, 2030, 10);
analyzeConjunctions('Saturn-Neptune', 'saturn', 'neptune', saturnNeptuneConj, 1840, 2030, 15);

// Uranus-Neptune
analyzeConjunctions('Uranus-Neptune', 'uranus', 'neptune', uranusNeptuneConj, 1815, 2000, 30);

console.log('═══════════════════════════════════════════════════════════════');
console.log('  COMPLETE');
console.log('═══════════════════════════════════════════════════════════════');
