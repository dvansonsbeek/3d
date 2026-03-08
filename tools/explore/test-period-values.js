#!/usr/bin/env node
// Test different solarYearInput values for Uranus & Neptune
// by comparing conjunctions with Jupiter and Saturn

const C = require('../lib/constants');
const { computePlanetPosition, _invalidateGraph } = require('../lib/scene-graph');

const H = 335008;
const meanSolarYear = 365.2421897;
const totalDays = H * meanSolarYear;

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
      conjunctions.push((lo + hi) / 2);
    }
    prevDiff = diff;
    jd += stepDays;
  }
  return conjunctions;
}

// ALL known conjunctions (including pre-1940 and triples)
const jupiterUranusAll = [
  { jd: C.calendarToJD(1858, 3, 21), label: '1858' },
  { jd: C.calendarToJD(1872, 1, 3), label: '1872' },
  { jd: C.calendarToJD(1885, 11, 10), label: '1886' },
  { jd: C.calendarToJD(1899, 12, 1), label: '1900' },
  { jd: C.calendarToJD(1914, 3, 4), label: '1914' },
  { jd: C.calendarToJD(1927, 8, 19), label: '1928' },
  { jd: C.calendarToJD(1941, 5, 8), label: '1941' },
  { jd: C.calendarToJD(1954, 10, 19), label: '1955' },
  { jd: C.calendarToJD(1969, 1, 14), label: '1969' },
  { jd: C.calendarToJD(1983, 2, 18), label: '1983' },
  { jd: C.calendarToJD(1997, 2, 16), label: '1997' },
  { jd: C.calendarToJD(2010, 9, 19), label: '2011' },  // middle of triple
  { jd: C.calendarToJD(2024, 4, 21), label: '2024' },
];

const saturnUranusAll = [
  { jd: C.calendarToJD(1852, 6, 26), label: '1852' },
  { jd: C.calendarToJD(1897, 1, 12), label: '1897' },
  { jd: C.calendarToJD(1942, 5, 3), label: '1942' },
  { jd: C.calendarToJD(1988, 6, 26), label: '1988' },  // middle of triple
];

const jupiterNeptuneAll = [
  { jd: C.calendarToJD(1856, 3, 17), label: '1856' },
  { jd: C.calendarToJD(1869, 4, 13), label: '1869' },
  { jd: C.calendarToJD(1882, 6, 2), label: '1882' },
  { jd: C.calendarToJD(1895, 9, 4), label: '1896' },
  { jd: C.calendarToJD(1907, 9, 10), label: '1908' },
  { jd: C.calendarToJD(1920, 9, 24), label: '1921' },
  { jd: C.calendarToJD(1932, 10, 1), label: '1933' },
  { jd: C.calendarToJD(1945, 8, 1), label: '1945' },
  { jd: C.calendarToJD(1958, 9, 16), label: '1959' },
  { jd: C.calendarToJD(1971, 2, 1), label: '1971' },
  { jd: C.calendarToJD(1984, 1, 19), label: '1984' },
  { jd: C.calendarToJD(1997, 1, 9), label: '1997' },
  { jd: C.calendarToJD(2009, 7, 10), label: '2010' },  // middle of triple
  { jd: C.calendarToJD(2022, 4, 12), label: '2022' },
];

const saturnNeptuneAll = [
  { jd: C.calendarToJD(1846, 4, 3), label: '1846' },
  { jd: C.calendarToJD(1882, 5, 14), label: '1882' },
  { jd: C.calendarToJD(1917, 8, 1), label: '1917' },
  { jd: C.calendarToJD(1953, 11, 21), label: '1954' },
  { jd: C.calendarToJD(1989, 6, 24), label: '1989' },  // middle of triple
  { jd: C.calendarToJD(2026, 2, 20), label: '2026' },
];

function matchConjunctions(modelConjs, knownList, maxDist) {
  const results = [];
  for (const k of knownList) {
    let bestConj = null, bestDist = Infinity;
    for (const mc of modelConjs) {
      const d = Math.abs(mc - k.jd);
      if (d < bestDist) { bestDist = d; bestConj = mc; }
    }
    if (bestDist < maxDist) {
      results.push({ label: k.label, diff: bestConj - k.jd, year: C.jdToYear(k.jd) });
    }
  }
  return results;
}

function testPlanet(planet, counts, pairs) {
  const original = C.planets[planet].solarYearInput;

  console.log(`\n═══ ${planet.toUpperCase()} ═══`);

  for (const count of counts) {
    const effective = totalDays / count;
    const inputVal = Math.round(effective);

    C.planets[planet].solarYearInput = inputVal;
    C.rebuildDerived(planet);
    _invalidateGraph();

    const current = count === Math.round(totalDays / original) ? ' ◄ CURRENT' : '';
    console.log(`\n  count=${count}  effective=${effective.toFixed(3)} days  (input=${inputVal})${current}`);

    for (const [p1, p2, knownList, sy, ey, step, label] of pairs) {
      const conjs = findConjunctions(p1, p2, C.calendarToJD(sy, 1, 1), C.calendarToJD(ey, 12, 31), step);
      // Use generous 500-day match window
      const matches = matchConjunctions(conjs, knownList, 500);
      const diffs = matches.map(m => m.diff);
      const rms = diffs.length > 0 ? Math.sqrt(diffs.reduce((a, b) => a + b * b, 0) / diffs.length) : 0;
      const mean = diffs.length > 0 ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;

      // Split into pre-1940 and post-1940
      const pre = matches.filter(m => m.year < 1940);
      const post = matches.filter(m => m.year >= 1940);
      const preRms = pre.length > 0 ? Math.sqrt(pre.map(m=>m.diff).reduce((a, b) => a + b * b, 0) / pre.length) : 0;
      const postRms = post.length > 0 ? Math.sqrt(post.map(m=>m.diff).reduce((a, b) => a + b * b, 0) / post.length) : 0;

      console.log(`    ${label.padEnd(18)} n=${String(matches.length).padEnd(3)} RMS=${rms.toFixed(1).padStart(6)}d  post1940-RMS=${postRms.toFixed(1).padStart(5)}d (n=${post.length})  pre1940-RMS=${preRms.toFixed(1).padStart(6)}d (n=${pre.length})`);
      // Show post-1940 individual diffs
      const postStr = post.map(m => `${m.label}:${m.diff > 0 ? '+' : ''}${m.diff.toFixed(0)}`).join(' ');
      if (postStr) console.log(`      post1940: ${postStr}`);
    }
  }

  // Restore
  C.planets[planet].solarYearInput = original;
  C.rebuildDerived(planet);
  _invalidateGraph();
}

// Neptune: scan counts 2038-2042
console.log('Neptune accepted sidereal period: 60190 days (164.8 years)');
console.log(`  count for 60190: ${Math.round(totalDays / 60190)} → effective ${(totalDays / Math.round(totalDays / 60190)).toFixed(1)}`);
testPlanet('neptune', [2038, 2039, 2040, 2041, 2042, 2043],
  [['jupiter', 'neptune', jupiterNeptuneAll, 1850, 2030, 10, 'Jupiter-Neptune'],
   ['saturn', 'neptune', saturnNeptuneAll, 1840, 2030, 15, 'Saturn-Neptune']]);

// Uranus: scan counts 3998-4003
console.log('\n\nUranus accepted sidereal period: 30687 days (84.01 years)');
console.log(`  count for 30687: ${Math.round(totalDays / 30687)} → effective ${(totalDays / Math.round(totalDays / 30687)).toFixed(1)}`);
testPlanet('uranus', [3998, 3999, 4000, 4001, 4002, 4003],
  [['jupiter', 'uranus', jupiterUranusAll, 1850, 2030, 10, 'Jupiter-Uranus'],
   ['saturn', 'uranus', saturnUranusAll, 1850, 2000, 15, 'Saturn-Uranus']]);
