#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// OPPOSITION DRIFT ANALYSIS — Uranus & Neptune
// Find oppositions over long time ranges, compare to known dates,
// and measure timing drift to tune solarYearInput.
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');
const { computePlanetPosition, _invalidateGraph } = require('../lib/scene-graph');

const d2r = Math.PI / 180;

// ═══════════════════════════════════════════════════════════════════════════
// Opposition finder (planet RA = Sun RA + 180°)
// ═══════════════════════════════════════════════════════════════════════════

function raOppDiff(planet, jd) {
  const p = computePlanetPosition(planet, jd);
  const s = computePlanetPosition('sun', jd);
  let diff = p.ra - s.ra - Math.PI;
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

// ═══════════════════════════════════════════════════════════════════════════
// Known opposition dates (from USNO/JPL)
// ═══════════════════════════════════════════════════════════════════════════

const knownUranusOpp = [
  // Historical (post-discovery)
  { jd: C.calendarToJD(1782, 3, 14), label: '1782 Mar 14' },  // First observed opposition (Herschel)
  { jd: C.calendarToJD(1783, 3, 17), label: '1783 Mar 17' },
  { jd: C.calendarToJD(1789, 4, 8), label: '1789 Apr 08' },
  { jd: C.calendarToJD(1798, 5, 11), label: '1798 May 11' },
  { jd: C.calendarToJD(1810, 6, 24), label: '1810 Jun 24' },
  { jd: C.calendarToJD(1820, 7, 24), label: '1820 Jul 24' },
  { jd: C.calendarToJD(1830, 8, 20), label: '1830 Aug 20' },
  { jd: C.calendarToJD(1840, 9, 14), label: '1840 Sep 14' },
  { jd: C.calendarToJD(1850, 10, 9), label: '1850 Oct 09' },
  { jd: C.calendarToJD(1862, 11, 18), label: '1862 Nov 18' },
  { jd: C.calendarToJD(1872, 12, 12), label: '1872 Dec 12' },
  { jd: C.calendarToJD(1882, 1, 2), label: '1882 Jan 02' },
  { jd: C.calendarToJD(1892, 1, 25), label: '1892 Jan 25' },
  { jd: C.calendarToJD(1902, 2, 16), label: '1902 Feb 16' },
  { jd: C.calendarToJD(1912, 3, 9), label: '1912 Mar 09' },
  { jd: C.calendarToJD(1924, 4, 15), label: '1924 Apr 15' },
  { jd: C.calendarToJD(1934, 5, 11), label: '1934 May 11' },
  { jd: C.calendarToJD(1944, 6, 5), label: '1944 Jun 05' },
  { jd: C.calendarToJD(1954, 6, 30), label: '1954 Jun 30' },
  { jd: C.calendarToJD(1964, 7, 24), label: '1964 Jul 24' },
  { jd: C.calendarToJD(1974, 8, 18), label: '1974 Aug 18' },
  { jd: C.calendarToJD(1984, 9, 11), label: '1984 Sep 11' },
  { jd: C.calendarToJD(1994, 10, 6), label: '1994 Oct 06' },
  { jd: C.calendarToJD(2004, 10, 28), label: '2004 Oct 28' },
  // Modern precise dates
  { jd: C.calendarToJD(2010, 9, 21), label: '2010 Sep 21' },
  { jd: C.calendarToJD(2011, 9, 26), label: '2011 Sep 26' },
  { jd: C.calendarToJD(2012, 9, 29), label: '2012 Sep 29' },
  { jd: C.calendarToJD(2013, 10, 3), label: '2013 Oct 03' },
  { jd: C.calendarToJD(2014, 10, 7), label: '2014 Oct 07' },
  { jd: C.calendarToJD(2015, 10, 12), label: '2015 Oct 12' },
  { jd: C.calendarToJD(2016, 10, 15), label: '2016 Oct 15' },
  { jd: C.calendarToJD(2017, 10, 19), label: '2017 Oct 19' },
  { jd: C.calendarToJD(2018, 10, 24), label: '2018 Oct 24' },
  { jd: C.calendarToJD(2019, 10, 28), label: '2019 Oct 28' },
  { jd: C.calendarToJD(2020, 10, 31), label: '2020 Oct 31' },
  { jd: C.calendarToJD(2021, 11, 5), label: '2021 Nov 05' },
  { jd: C.calendarToJD(2022, 11, 9), label: '2022 Nov 09' },
  { jd: C.calendarToJD(2023, 11, 13), label: '2023 Nov 13' },
  { jd: C.calendarToJD(2024, 11, 17), label: '2024 Nov 17' },
];

const knownNeptuneOpp = [
  // Historical
  { jd: C.calendarToJD(1846, 10, 12), label: '1846 Oct 12' },  // Discovery year
  { jd: C.calendarToJD(1863, 11, 13), label: '1863 Nov 13' },
  { jd: C.calendarToJD(1880, 12, 15), label: '1880 Dec 15' },
  { jd: C.calendarToJD(1898, 1, 14), label: '1898 Jan 14' },
  { jd: C.calendarToJD(1915, 2, 14), label: '1915 Feb 14' },
  { jd: C.calendarToJD(1932, 3, 17), label: '1932 Mar 17' },
  { jd: C.calendarToJD(1949, 4, 16), label: '1949 Apr 16' },
  { jd: C.calendarToJD(1966, 5, 18), label: '1966 May 18' },
  { jd: C.calendarToJD(1983, 6, 18), label: '1983 Jun 18' },
  { jd: C.calendarToJD(2000, 7, 18), label: '2000 Jul 18' },
  // Modern precise dates
  { jd: C.calendarToJD(2010, 8, 20), label: '2010 Aug 20' },
  { jd: C.calendarToJD(2011, 8, 22), label: '2011 Aug 22' },
  { jd: C.calendarToJD(2012, 8, 24), label: '2012 Aug 24' },
  { jd: C.calendarToJD(2013, 8, 27), label: '2013 Aug 27' },
  { jd: C.calendarToJD(2014, 8, 29), label: '2014 Aug 29' },
  { jd: C.calendarToJD(2015, 9, 1), label: '2015 Sep 01' },
  { jd: C.calendarToJD(2016, 9, 2), label: '2016 Sep 02' },
  { jd: C.calendarToJD(2017, 9, 5), label: '2017 Sep 05' },
  { jd: C.calendarToJD(2018, 9, 7), label: '2018 Sep 07' },
  { jd: C.calendarToJD(2019, 9, 10), label: '2019 Sep 10' },
  { jd: C.calendarToJD(2020, 9, 11), label: '2020 Sep 11' },
  { jd: C.calendarToJD(2021, 9, 14), label: '2021 Sep 14' },
  { jd: C.calendarToJD(2022, 9, 16), label: '2022 Sep 16' },
  { jd: C.calendarToJD(2023, 9, 19), label: '2023 Sep 19' },
  { jd: C.calendarToJD(2024, 9, 21), label: '2024 Sep 21' },
];

// ═══════════════════════════════════════════════════════════════════════════
// Analysis function: find oppositions, match to known, compute drift
// ═══════════════════════════════════════════════════════════════════════════

function analyzeOppositions(planet, knownOpps, startYear, endYear, stepDays) {
  const startJD = C.calendarToJD(startYear, 1, 1);
  const endJD = C.calendarToJD(endYear, 12, 31);
  const opps = findOppositions(planet, startJD, endJD, stepDays);

  console.log(`  Found ${opps.length} ${planet} oppositions (${startYear}-${endYear})`);
  console.log();

  // Match to known
  const matches = [];
  for (const opp of opps) {
    let closest = null, closestDiff = Infinity;
    for (const k of knownOpps) {
      const diff = Math.abs(opp.jd - k.jd);
      if (diff < closestDiff) { closestDiff = diff; closest = k; }
    }
    if (closest && closestDiff < 200) {
      const diffDays = opp.jd - closest.jd;
      matches.push({ model: opp, known: closest, diffDays });
    }
  }

  console.log('  ' + C.pad('Model date', 18) + ' | ' + C.pad('Known date', 18) + ' | Diff (days)');
  console.log('  ' + '-'.repeat(18) + '-+-' + '-'.repeat(18) + '-+-' + '-'.repeat(11));

  for (const m of matches) {
    console.log('  ' + C.pad(m.model.date, 18) + ' | ' +
      C.pad(m.known.label, 18) + ' | ' + C.padLeft(m.diffDays.toFixed(1), 11));
  }

  // Compute stats
  if (matches.length > 0) {
    const diffs = matches.map(m => m.diffDays);
    const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const rms = Math.sqrt(diffs.reduce((a, b) => a + b * b, 0) / diffs.length);
    const maxAbs = Math.max(...diffs.map(Math.abs));

    // Split into early and late for drift measurement
    const earlyMatches = matches.filter(m => m.model.year < 1920);
    const lateMatches = matches.filter(m => m.model.year >= 2010);

    console.log();
    console.log(`  Statistics (n=${matches.length}):`);
    console.log(`    Mean error: ${mean.toFixed(2)} days`);
    console.log(`    RMS error:  ${rms.toFixed(2)} days`);
    console.log(`    Max error:  ${maxAbs.toFixed(2)} days`);

    if (earlyMatches.length > 0 && lateMatches.length > 0) {
      const earlyMean = earlyMatches.reduce((a, m) => a + m.diffDays, 0) / earlyMatches.length;
      const lateMean = lateMatches.reduce((a, m) => a + m.diffDays, 0) / lateMatches.length;
      const drift = earlyMean - lateMean;
      const yearSpan = (earlyMatches[Math.floor(earlyMatches.length/2)].model.year +
                        lateMatches[Math.floor(lateMatches.length/2)].model.year) / 2;
      console.log();
      console.log(`    Early epoch mean (pre-1920, n=${earlyMatches.length}): ${earlyMean.toFixed(2)} days`);
      console.log(`    Late epoch mean (2010+, n=${lateMatches.length}): ${lateMean.toFixed(2)} days`);
      console.log(`    Drift (early - late): ${drift.toFixed(2)} days`);
      console.log(`    Direction: ${drift > 0 ? 'model AHEAD at early dates (period too short)' : 'model BEHIND at early dates (period too long)'}`);
    }

    return { mean, rms, maxAbs, matches, diffs };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Period scanning: test different solarYearInput values
// ═══════════════════════════════════════════════════════════════════════════

function scanPeriods(planet, knownOpps, startYear, endYear, stepDays, baseInput, testInputs) {
  console.log();
  console.log(`  Period scan for ${planet}:`);
  console.log('  ' + C.pad('solarYearInput', 16) + ' | ' + C.pad('Count', 8) + ' | ' +
    C.pad('Mean', 8) + ' | ' + C.pad('RMS', 8) + ' | ' +
    C.pad('Early', 8) + ' | ' + C.pad('Late', 8) + ' | ' + C.pad('Drift', 8));
  console.log('  ' + '-'.repeat(16) + '-+-' + '-'.repeat(8) + '-+-' +
    '-'.repeat(8) + '-+-' + '-'.repeat(8) + '-+-' +
    '-'.repeat(8) + '-+-' + '-'.repeat(8) + '-+-' + '-'.repeat(8));

  const p = C.planets[planet];
  const origInput = p.solarYearInput;

  for (const testInput of testInputs) {
    p.solarYearInput = testInput;
    C.rebuildDerived(planet);
    _invalidateGraph();

    const startJD = C.calendarToJD(startYear, 1, 1);
    const endJD = C.calendarToJD(endYear, 12, 31);
    const opps = findOppositions(planet, startJD, endJD, stepDays);

    const matches = [];
    for (const opp of opps) {
      let closest = null, closestDiff = Infinity;
      for (const k of knownOpps) {
        const diff = Math.abs(opp.jd - k.jd);
        if (diff < closestDiff) { closestDiff = diff; closest = k; }
      }
      if (closest && closestDiff < 200) {
        matches.push({ model: opp, known: closest, diffDays: opp.jd - closest.jd });
      }
    }

    if (matches.length > 0) {
      const diffs = matches.map(m => m.diffDays);
      const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      const rms = Math.sqrt(diffs.reduce((a, b) => a + b * b, 0) / diffs.length);

      const earlyMatches = matches.filter(m => m.model.year < 1920);
      const lateMatches = matches.filter(m => m.model.year >= 2010);
      const earlyMean = earlyMatches.length > 0 ? earlyMatches.reduce((a, m) => a + m.diffDays, 0) / earlyMatches.length : NaN;
      const lateMean = lateMatches.length > 0 ? lateMatches.reduce((a, m) => a + m.diffDays, 0) / lateMatches.length : NaN;
      const drift = earlyMean - lateMean;

      const count = Math.round(C.H * C.meanSolarYearDays / testInput);
      const marker = testInput === origInput ? ' *' : '';
      console.log('  ' + C.pad(testInput.toFixed(1) + marker, 16) + ' | ' +
        C.padLeft(count.toString(), 8) + ' | ' +
        C.padLeft(mean.toFixed(2), 8) + ' | ' +
        C.padLeft(rms.toFixed(2), 8) + ' | ' +
        C.padLeft(isNaN(earlyMean) ? 'N/A' : earlyMean.toFixed(2), 8) + ' | ' +
        C.padLeft(isNaN(lateMean) ? 'N/A' : lateMean.toFixed(2), 8) + ' | ' +
        C.padLeft(isNaN(drift) ? 'N/A' : drift.toFixed(2), 8));
    }
  }

  // Restore original
  p.solarYearInput = origInput;
  C.rebuildDerived(planet);
  _invalidateGraph();
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  OPPOSITION DRIFT ANALYSIS — Uranus & Neptune');
console.log('═══════════════════════════════════════════════════════════════');
console.log();

// Also run Jupiter and Saturn for comparison
const allPlanets = [
  { name: 'jupiter', knownOpps: [
    { jd: C.calendarToJD(1869, 6, 15), label: '1869 Jun 15' },
    { jd: C.calendarToJD(1881, 7, 13), label: '1881 Jul 13' },
    { jd: C.calendarToJD(1893, 8, 4), label: '1893 Aug 04' },
    { jd: C.calendarToJD(1905, 8, 23), label: '1905 Aug 23' },
    { jd: C.calendarToJD(1916, 1, 17), label: '1916 Jan 17' },
    { jd: C.calendarToJD(1927, 2, 11), label: '1927 Feb 11' },
    { jd: C.calendarToJD(1938, 3, 12), label: '1938 Mar 12' },
    { jd: C.calendarToJD(1951, 10, 2), label: '1951 Oct 02' },
    { jd: C.calendarToJD(1963, 10, 30), label: '1963 Oct 30' },
    { jd: C.calendarToJD(1975, 12, 15), label: '1975 Dec 15' },
    { jd: C.calendarToJD(1987, 10, 18), label: '1987 Oct 18' },
    { jd: C.calendarToJD(1999, 10, 23), label: '1999 Oct 23' },
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
  ], step: 5 },
  { name: 'saturn', knownOpps: [
    { jd: C.calendarToJD(1870, 5, 5), label: '1870 May 05' },
    { jd: C.calendarToJD(1885, 6, 28), label: '1885 Jun 28' },
    { jd: C.calendarToJD(1900, 8, 17), label: '1900 Aug 17' },
    { jd: C.calendarToJD(1915, 10, 8), label: '1915 Oct 08' },
    { jd: C.calendarToJD(1929, 1, 9), label: '1929 Jan 09' },
    { jd: C.calendarToJD(1943, 3, 3), label: '1943 Mar 03' },
    { jd: C.calendarToJD(1957, 4, 18), label: '1957 Apr 18' },
    { jd: C.calendarToJD(1971, 5, 31), label: '1971 May 31' },
    { jd: C.calendarToJD(1985, 7, 16), label: '1985 Jul 16' },
    { jd: C.calendarToJD(1999, 11, 6), label: '1999 Nov 06' },
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
  ], step: 5 },
  { name: 'uranus', knownOpps: knownUranusOpp, step: 3 },
  { name: 'neptune', knownOpps: knownNeptuneOpp, step: 3 },
];

for (const { name, knownOpps, step } of allPlanets) {
  console.log(`─── ${name.charAt(0).toUpperCase() + name.slice(1)} Oppositions ────────────────────────────`);
  console.log();
  analyzeOppositions(name, knownOpps, 1860, 2025, step);
  console.log();
}

// ═══════════════════════════════════════════════════════════════════════════
// Period scan for Uranus and Neptune
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  PERIOD SCAN');
console.log('═══════════════════════════════════════════════════════════════');

// Uranus: current = 30583, try ±steps
// Step size: H * meanSolarYear / 30583 ≈ 4004, so each count step ≈ 30583/4004 ≈ 7.6 days
const uranusTests = [];
for (let v = 30570; v <= 30596; v += 2) uranusTests.push(v);
scanPeriods('uranus', knownUranusOpp, 1780, 2025, 3, 30583, uranusTests);

console.log();

// Neptune: current = 59980, try ±steps
// Step size: H * meanSolarYear / 59980 ≈ 2042, so each count step ≈ 59980/2042 ≈ 29.4 days
const neptuneTests = [];
for (let v = 59940; v <= 60020; v += 5) neptuneTests.push(v);
scanPeriods('neptune', knownNeptuneOpp, 1846, 2025, 3, 59980, neptuneTests);

console.log();
console.log('═══════════════════════════════════════════════════════════════');
console.log('  ANALYSIS COMPLETE');
console.log('═══════════════════════════════════════════════════════════════');
