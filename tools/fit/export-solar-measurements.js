#!/usr/bin/env node
/**
 * Export Solar Measurements across the full Holistic Year.
 *
 * Single-pass simulation (1-year steps) measuring all solar events:
 *   - Cardinal points: SS (max dec), WS (min dec), VE (dec=0 asc), AE (dec=0 desc)
 *   - Perihelion (min wobble-center distance), Aphelion (max distance)
 *   - World-angle (sidereal position) at each event
 *
 * Output: data/02-solar-measurements.csv
 *   Type, Model Year, JD, RA (deg), Obliquity (deg), World Angle (deg), Distance (AU)
 *
 * 1-year steps allow a narrow search window (±2 days) and simple forward chaining.
 * No two-pass needed — each event is close to prevJD + meanYear.
 *
 * Downstream consumers:
 *   - obliquity-harmonics.js (step 6b) — reads SS obliquity
 *   - cardinal-point-harmonics.js (step 6c) — reads cardinal point JDs
 *   - year-length-harmonics.js --type sidereal (step 6d) — reads world-angles
 *   - year-length-harmonics.js --type anomalistic (step 6e) — reads PERI/APH JDs
 *   - Tropical year: derived from cardinal point harmonics (no separate step)
 *
 * Usage:
 *   node tools/fit/export-solar-measurements.js                    # full H (~50 min)
 *   node tools/fit/export-solar-measurements.js --start -25000 --end 25000  # test range
 */

const SG = require('../lib/scene-graph');
const C  = require('../lib/constants');
const fs = require('fs');
const path = require('path');

// ─── CLI arguments ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name, defaultVal) {
  const idx = args.indexOf('--' + name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

const START_YEAR = parseFloat(getArg('start', String(C.balancedYear)));
const END_YEAR = parseFloat(getArg('end', String(C.balancedYear + C.H)));
const OUTPUT_CSV = getArg('output', path.join(__dirname, '..', '..', 'data', '02-solar-measurements.csv'));

// ─── Search parameters ───────────────────────────────────────────────────────
const SAMPLE_STEP = 0.5 / 24;   // 0.5 hours in days
const SEARCH_RANGE = 96;        // ±2 days (96 × 0.5h) — narrow window for 1-year chaining

// ─── Cardinal point detection ────────────────────────────────────────────────

/**
 * Find a solstice (max or min declination).
 * prevJD must be provided (except for the very first year).
 */
function findSolstice(type, prevJD) {
  const approxJD = prevJD + C.meanSolarYearDays;
  const isMax = type === 'SS';
  let bestJD = approxJD;
  let bestDec = isMax ? -Infinity : Infinity;
  const samples = [];

  for (let k = -SEARCH_RANGE; k <= SEARCH_RANGE; k++) {
    const jd = approxJD + k * SAMPLE_STEP;
    const pos = SG.computeSunPositionFast(jd);
    const decDeg = 90 - pos.dec * 180 / Math.PI;
    samples.push({ jd, decDeg });
    if (isMax ? decDeg > bestDec : decDeg < bestDec) {
      bestDec = decDeg;
      bestJD = jd;
    }
  }

  // Parabolic interpolation for sub-sample precision
  const bestIdx = samples.findIndex(s => s.jd === bestJD);
  if (bestIdx > 0 && bestIdx < samples.length - 1) {
    const y_m1 = samples[bestIdx - 1].decDeg;
    const y_0  = samples[bestIdx].decDeg;
    const y_p1 = samples[bestIdx + 1].decDeg;
    const denom = y_m1 - 2 * y_0 + y_p1;
    if (Math.abs(denom) > 1e-12) {
      bestJD = samples[bestIdx].jd + (SAMPLE_STEP / 2) * (y_m1 - y_p1) / denom;
    }
  }

  const fp = SG.computeSunPositionFast(bestJD);
  return {
    jd: bestJD,
    raDeg: (fp.ra * 180 / Math.PI + 360) % 360,
    obliqDeg: 90 - fp.dec * 180 / Math.PI,
    worldAngle: fp.worldAngle,
    distAU: fp.wobbleDistAU,
  };
}

/**
 * Find an equinox (declination zero crossing).
 */
function findEquinox(type, prevJD) {
  const approxJD = prevJD + C.meanSolarYearDays;

  for (let k = -SEARCH_RANGE + 1; k <= SEARCH_RANGE; k++) {
    const jd1 = approxJD + (k - 1) * SAMPLE_STEP;
    const jd2 = approxJD + k * SAMPLE_STEP;
    const pos1 = SG.computeSunPositionFast(jd1);
    const pos2 = SG.computeSunPositionFast(jd2);
    const dec1 = 90 - pos1.dec * 180 / Math.PI;
    const dec2 = 90 - pos2.dec * 180 / Math.PI;

    const isAscending  = dec1 < 0 && dec2 >= 0;
    const isDescending = dec1 >= 0 && dec2 < 0;

    if ((type === 'VE' && isAscending) || (type === 'AE' && isDescending)) {
      const t = -dec1 / (dec2 - dec1);
      const refinedJD = jd1 + t * SAMPLE_STEP;
      const fp = SG.computeSunPositionFast(refinedJD);
      return {
        jd: refinedJD,
        raDeg: (fp.ra * 180 / Math.PI + 360) % 360,
        obliqDeg: 90 - fp.dec * 180 / Math.PI,
        worldAngle: fp.worldAngle,
        distAU: fp.wobbleDistAU,
      };
    }
  }
  return null;
}

/**
 * Find perihelion (min distance) or aphelion (max distance).
 */
function findDistanceExtremum(type, prevJD) {
  const isPeri = type === 'PERI';
  const approxJD = prevJD + C.meanAnomalisticYearDays;

  let bestJD = approxJD;
  let bestDist = isPeri ? Infinity : -Infinity;
  const samples = [];

  for (let k = -SEARCH_RANGE; k <= SEARCH_RANGE; k++) {
    const jd = approxJD + k * SAMPLE_STEP;
    const pos = SG.computeSunPositionFast(jd);
    const dist = pos.wobbleDistAU;
    samples.push({ jd, dist });
    if (isPeri ? dist < bestDist : dist > bestDist) {
      bestDist = dist;
      bestJD = jd;
    }
  }

  // Parabolic interpolation
  const bestIdx = samples.findIndex(s => s.jd === bestJD);
  if (bestIdx > 0 && bestIdx < samples.length - 1) {
    const y_m1 = samples[bestIdx - 1].dist;
    const y_0  = samples[bestIdx].dist;
    const y_p1 = samples[bestIdx + 1].dist;
    const denom = y_m1 - 2 * y_0 + y_p1;
    if (Math.abs(denom) > 1e-12) {
      bestJD = samples[bestIdx].jd + (SAMPLE_STEP / 2) * (y_m1 - y_p1) / denom;
    }
  }

  const fp = SG.computeSunPositionFast(bestJD);
  return {
    jd: bestJD,
    raDeg: null,
    obliqDeg: null,
    worldAngle: fp.worldAngle,
    distAU: fp.wobbleDistAU,
  };
}

// ─── Seed: find initial events near J2000 using wide search ──────────────────

function seedEvent(type) {
  const WIDE_RANGE = 960; // ±20 days for the initial search only
  // Approximate JD for this event type near J2000
  const frac = C.cardinalPointYearFractions[type] || 0;
  const approxJD = C.startmodelJD + frac * C.meanSolarYearDays;

  if (type === 'SS' || type === 'WS') {
    const isMax = type === 'SS';
    let bestJD = approxJD;
    let bestDec = isMax ? -Infinity : Infinity;
    const samples = [];
    for (let k = -WIDE_RANGE; k <= WIDE_RANGE; k++) {
      const jd = approxJD + k * SAMPLE_STEP;
      const pos = SG.computeSunPositionFast(jd);
      const decDeg = 90 - pos.dec * 180 / Math.PI;
      samples.push({ jd, decDeg });
      if (isMax ? decDeg > bestDec : decDeg < bestDec) {
        bestDec = decDeg;
        bestJD = jd;
      }
    }
    const bestIdx = samples.findIndex(s => s.jd === bestJD);
    if (bestIdx > 0 && bestIdx < samples.length - 1) {
      const y_m1 = samples[bestIdx - 1].decDeg;
      const y_0 = samples[bestIdx].decDeg;
      const y_p1 = samples[bestIdx + 1].decDeg;
      const denom = y_m1 - 2 * y_0 + y_p1;
      if (Math.abs(denom) > 1e-12)
        bestJD = samples[bestIdx].jd + (SAMPLE_STEP / 2) * (y_m1 - y_p1) / denom;
    }
    return bestJD;
  }

  if (type === 'VE' || type === 'AE') {
    for (let k = -WIDE_RANGE + 1; k <= WIDE_RANGE; k++) {
      const jd1 = approxJD + (k - 1) * SAMPLE_STEP;
      const jd2 = approxJD + k * SAMPLE_STEP;
      const dec1 = 90 - SG.computeSunPositionFast(jd1).dec * 180 / Math.PI;
      const dec2 = 90 - SG.computeSunPositionFast(jd2).dec * 180 / Math.PI;
      const isAsc = dec1 < 0 && dec2 >= 0;
      const isDesc = dec1 >= 0 && dec2 < 0;
      if ((type === 'VE' && isAsc) || (type === 'AE' && isDesc)) {
        const t = -dec1 / (dec2 - dec1);
        return jd1 + t * SAMPLE_STEP;
      }
    }
    return null;
  }

  // PERI / APH
  const isPeri = type === 'PERI';
  const periFrac = isPeri ? 0.03 : 0.53;
  const periApprox = C.startmodelJD + (periFrac - 0.5) * C.meanSolarYearDays;
  let bestJD = periApprox;
  let bestDist = isPeri ? Infinity : -Infinity;
  const samples = [];
  for (let k = -WIDE_RANGE; k <= WIDE_RANGE; k++) {
    const jd = periApprox + k * SAMPLE_STEP;
    const pos = SG.computeSunPositionFast(jd);
    const dist = pos.wobbleDistAU;
    samples.push({ jd, dist });
    if (isPeri ? dist < bestDist : dist > bestDist) {
      bestDist = dist;
      bestJD = jd;
    }
  }
  const bestIdx = samples.findIndex(s => s.jd === bestJD);
  if (bestIdx > 0 && bestIdx < samples.length - 1) {
    const y_m1 = samples[bestIdx - 1].dist;
    const y_0 = samples[bestIdx].dist;
    const y_p1 = samples[bestIdx + 1].dist;
    const denom = y_m1 - 2 * y_0 + y_p1;
    if (Math.abs(denom) > 1e-12)
      bestJD = samples[bestIdx].jd + (SAMPLE_STEP / 2) * (y_m1 - y_p1) / denom;
  }
  return bestJD;
}

// ─── Main export loop ────────────────────────────────────────────────────────
// Seed from J2000, chain forward to end, then chain backward to start.

const startYear = START_YEAR;
const endYear = END_YEAR;
const totalYears = Math.round(endYear - startYear);

const allTypes = ['SS', 'WS', 'VE', 'AE', 'PERI', 'APH'];

console.error(`Solar measurements export: 1-year steps, ${startYear} to ${endYear}`);
console.error(`Total: ${totalYears} years × 6 types = ~${totalYears * 6} rows`);
console.error(`Output: ${OUTPUT_CSV}`);
console.error('');

// Seed near J2000 (model epoch)
console.error('Seeding initial events near J2000...');
const seedJDs = {};
for (const type of allTypes) {
  seedJDs[type] = seedEvent(type);
  if (seedJDs[type]) {
    console.error(`  ${type}: JD=${seedJDs[type].toFixed(3)}`);
  } else {
    console.error(`  ${type}: SEED FAILED`);
    process.exit(1);
  }
}

const allRows = [];
const t0 = Date.now();

// We'll store the seed year's model year (startmodelYear rounded)
const seedModelYear = Math.round(C.startmodelYear);

// ─── Forward pass: seedModelYear → endYear ──────────────────────────────────
console.error('\nForward pass...');
const fwdPrev = { ...seedJDs };

for (let year = seedModelYear; year <= endYear; year++) {
  if (year !== seedModelYear) {
    // Find each event by chaining from previous year
    for (const type of allTypes) {
      const finder = (type === 'SS' || type === 'WS') ? findSolstice
        : (type === 'VE' || type === 'AE') ? findEquinox
        : findDistanceExtremum;
      const r = finder(type, fwdPrev[type]);
      if (r) {
        fwdPrev[type] = r.jd;
        allRows.push({ type, year, ...r });
      }
    }
  } else {
    // Seed year: compute full position at seed JDs
    for (const type of allTypes) {
      const fp = SG.computeSunPositionFast(seedJDs[type]);
      const isCardinal = ['SS', 'WS', 'VE', 'AE'].includes(type);
      allRows.push({
        type, year,
        jd: seedJDs[type],
        raDeg: isCardinal ? (fp.ra * 180 / Math.PI + 360) % 360 : null,
        obliqDeg: isCardinal ? 90 - fp.dec * 180 / Math.PI : null,
        worldAngle: fp.worldAngle,
        distAU: fp.wobbleDistAU,
      });
    }
  }

  const done = year - seedModelYear + 1;
  if (done % 10000 === 0) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
    const pct = (done / totalYears * 50).toFixed(1); // forward = first 50%
    console.error(`  ${done}/${totalYears} fwd (${pct}%) — ${elapsed}s`);
  }
}

// ─── Backward pass: seedModelYear-1 → startYear ─────────────────────────────
console.error('Backward pass...');
const bwdPrev = { ...seedJDs };

for (let year = seedModelYear - 1; year >= startYear; year--) {
  for (const type of allTypes) {
    // Chain backward: prevJD - meanYear
    const meanYear = ['PERI', 'APH'].includes(type) ? C.meanAnomalisticYearDays : C.meanSolarYearDays;
    const backPrevJD = bwdPrev[type] - 2 * meanYear; // shift back so finder's +meanYear lands on target

    const finder = (type === 'SS' || type === 'WS') ? findSolstice
      : (type === 'VE' || type === 'AE') ? findEquinox
      : findDistanceExtremum;
    const r = finder(type, backPrevJD);
    if (r) {
      bwdPrev[type] = r.jd;
      allRows.push({ type, year, ...r });
    }
  }

  const done = seedModelYear - year;
  if (done % 10000 === 0) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
    const pct = (50 + done / totalYears * 50).toFixed(1); // backward = last 50%
    console.error(`  ${done}/${totalYears} bwd (${pct}%) — ${elapsed}s`);
  }
}

// Sort by type then year
allRows.sort((a, b) => {
  const typeOrder = { SS: 0, WS: 1, VE: 2, AE: 3, PERI: 4, APH: 5 };
  return (typeOrder[a.type] - typeOrder[b.type]) || (a.year - b.year);
});

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

// ─── Sanity checks ───────────────────────────────────────────────────────────
console.error('');
console.error(`Sanity checks (year ${seedModelYear}):`);
for (const type of allTypes) {
  const row = allRows.find(r => r.type === type && r.year === seedModelYear);
  if (row) {
    const extra = row.raDeg !== null ? ` RA=${row.raDeg.toFixed(4)}°` : '';
    console.error(`  ${type.padEnd(4)}: JD=${row.jd.toFixed(6)}${extra} WA=${row.worldAngle.toFixed(4)}° dist=${row.distAU.toFixed(6)} AU`);
  } else {
    console.error(`  ${type.padEnd(4)}: NOT FOUND!`);
  }
}

// ─── Write CSV ───────────────────────────────────────────────────────────────
const csvHeader = 'Type,Model Year,JD,RA (deg),Obliquity (deg),World Angle (deg),Distance (AU)';
const csvLines = [csvHeader];
for (const r of allRows) {
  csvLines.push([
    r.type,
    r.year,
    r.jd.toFixed(6),
    r.raDeg !== null ? r.raDeg.toFixed(6) : '',
    r.obliqDeg !== null ? r.obliqDeg.toFixed(6) : '',
    r.worldAngle.toFixed(6),
    r.distAU.toFixed(6),
  ].join(','));
}
fs.writeFileSync(OUTPUT_CSV, csvLines.join('\n') + '\n');

// ─── Summary ─────────────────────────────────────────────────────────────────
const typeCounts = {};
for (const r of allRows) typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;

console.error('');
console.error(`Done in ${elapsed}s.`);
console.error(`Total rows: ${allRows.length}`);
for (const [type, cnt] of Object.entries(typeCounts)) {
  console.error(`  ${type}: ${cnt} rows`);
}
console.error(`CSV: ${OUTPUT_CSV}`);
