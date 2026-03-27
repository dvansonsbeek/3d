#!/usr/bin/env node
/**
 * Export Solar Measurements across the full Holistic Year.
 *
 * Single-pass simulation that measures all solar events:
 *   - Cardinal points: SS (max dec), WS (min dec), VE (dec=0 asc), AE (dec=0 desc)
 *   - Perihelion (min wobble-center distance), Aphelion (max distance)
 *   - World-angle (sidereal position) at each event
 *
 * Output: data/02-solar-measurements.csv
 *   Type, Model Year, JD, RA (deg), Obliquity (deg), World Angle (deg), Distance (AU)
 *
 * Downstream consumers:
 *   - obliquity-harmonics.js (step 6b) — reads SS obliquity
 *   - cardinal-point-harmonics.js (step 6c) — reads cardinal point JDs
 *   - year-length-harmonics.js --type sidereal (step 6d) — reads world-angles at cardinal points
 *   - year-length-harmonics.js --type anomalistic (step 6e) — reads PERI/APH JDs
 *   - Tropical year: derived from cardinal point harmonics (no separate step)
 *
 * Usage:
 *   node tools/fit/export-solar-measurements.js
 *   node tools/fit/export-solar-measurements.js --step 21
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

const STEP_YEARS = parseInt(getArg('step', String(C.stepYears)), 10);
const OUTPUT_CSV = getArg('output', path.join(__dirname, '..', '..', 'data', '02-solar-measurements.csv'));

// ─── Verify grid year is on the step grid ────────────────────────────────────
const gridCheck = (C.gridYear - C.balancedYear) % STEP_YEARS;
if (Math.abs(gridCheck) > 0.001) {
  console.error(`WARNING: step ${STEP_YEARS} does not land on grid year ${C.gridYear}.`);
} else {
  console.error(`Grid year ${C.gridYear} is on the step grid (step=${STEP_YEARS}).`);
}

// ─── Search parameters ───────────────────────────────────────────────────────
const SAMPLE_STEP = 0.5 / 24;   // 0.5 hours in days
const SEARCH_RANGE = 960;       // ±20 days (960 × 0.5h)

// ─── Cardinal point detection ────────────────────────────────────────────────

/**
 * Find a solstice (max or min declination) for a given year.
 * Returns JD, RA, obliquity, world-angle, and wobble-distance.
 */
function findSolstice(year, type, prevJD) {
  const approxJD = prevJD
    ? prevJD + STEP_YEARS * C.meanSolarYearDays
    : C.startmodelJD + ((year + C.cardinalPointYearFractions[type]) - C.startModelYearWithCorrection) * C.meanSolarYearDays;

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
 * Find an equinox (declination zero crossing) for a given year.
 * Returns JD, RA, obliquity, world-angle, and wobble-distance.
 */
function findEquinox(year, type, prevJD) {
  const approxJD = prevJD
    ? prevJD + STEP_YEARS * C.meanSolarYearDays
    : C.startmodelJD + ((year + C.cardinalPointYearFractions[type]) - C.startModelYearWithCorrection) * C.meanSolarYearDays;

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

// ─── Perihelion/Aphelion detection (min/max wobble-center distance) ──────────

/**
 * Find perihelion (minimum distance) or aphelion (maximum distance).
 * Uses computeSunPositionFast for ~5x speedup over full moveModel.
 */
function findDistanceExtremum(year, type, prevJD) {
  const isPeri = type === 'PERI';

  let approxJD;
  if (prevJD) {
    approxJD = prevJD + STEP_YEARS * C.meanAnomalisticYearDays;
  } else {
    const perihelionCycle = C.H / 16;
    const refFrac = isPeri ? 0.03 : 0.53;  // perihelion ~January, aphelion ~July
    const yearsSinceRef = year - C.perihelionalignmentYear;
    let frac = (refFrac + (yearsSinceRef / perihelionCycle) % 1) % 1;
    if (frac < 0) frac += 1;
    approxJD = C.startmodelJD + ((year + frac) - C.startModelYearWithCorrection) * C.meanSolarYearDays;
  }

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

// ─── Main export loop ────────────────────────────────────────────────────────
// Two-pass approach: forward from J2000, then backward (for reliable chaining).

const startYear = C.balancedYear;
const endYear = startYear + C.H;
const j2000Year = startYear + Math.round((2000 - startYear) / STEP_YEARS) * STEP_YEARS;
const totalSteps = Math.ceil(C.H / STEP_YEARS);

console.error(`Solar measurements export: ${STEP_YEARS}-year steps, ${startYear} to ${endYear}`);
console.error(`Expected: ~${totalSteps} points per type, ~${totalSteps * 6} total rows`);
console.error(`Two-pass: forward from ${j2000Year}, then backward`);
console.error(`Output: ${OUTPUT_CSV}`);
console.error('');

const allRows = [];
let count = 0;
const t0 = Date.now();

// All 6 event types
const cardinalTypes = ['VE', 'SS', 'AE', 'WS'];
const distTypes = ['PERI', 'APH'];

function findEvent(type, year, prevJD) {
  if (type === 'SS' || type === 'WS') return findSolstice(year, type, prevJD);
  if (type === 'VE' || type === 'AE') return findEquinox(year, type, prevJD);
  return findDistanceExtremum(year, type, prevJD);
}

// Pass 1: Forward from J2000
const fwdPrev = {};
for (let y = j2000Year; y <= endYear; y += STEP_YEARS) {
  for (const type of [...cardinalTypes, ...distTypes]) {
    const r = findEvent(type, y, fwdPrev[type] || null);
    if (r) {
      fwdPrev[type] = r.jd;
      allRows.push({ type, year: y, ...r });
    }
  }
  count++;
  if (count % 500 === 0) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
    const pct = (count / totalSteps * 100).toFixed(1);
    console.error(`  ${count}/${totalSteps} (${pct}%) — ${elapsed}s elapsed`);
  }
}

// Pass 2: Backward from J2000
const bwdPrev = {};
for (const type of [...cardinalTypes, ...distTypes]) {
  const firstFwd = allRows.find(r => r.type === type && r.year === j2000Year);
  if (firstFwd) bwdPrev[type] = firstFwd.jd;
}

for (let y = j2000Year - STEP_YEARS; y >= startYear; y -= STEP_YEARS) {
  for (const type of [...cardinalTypes, ...distTypes]) {
    // Shift prevJD back by 2×step for backward chaining
    const shiftedPrev = bwdPrev[type]
      ? bwdPrev[type] - 2 * STEP_YEARS * (distTypes.includes(type) ? C.meanAnomalisticYearDays : C.meanSolarYearDays)
      : null;
    const r = findEvent(type, y, shiftedPrev);
    if (r) {
      bwdPrev[type] = r.jd;
      allRows.push({ type, year: y, ...r });
    }
  }
  count++;
  if (count % 500 === 0) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
    const pct = (count / totalSteps * 100).toFixed(1);
    console.error(`  ${count}/${totalSteps} (${pct}%) — ${elapsed}s elapsed`);
  }
}

// Sort by type then year
allRows.sort((a, b) => {
  const typeOrder = { SS: 0, WS: 1, VE: 2, AE: 3, PERI: 4, APH: 5 };
  return (typeOrder[a.type] - typeOrder[b.type]) || (a.year - b.year);
});

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

// ─── Sanity checks ───────────────────────────────────────────────────────────
const GY = C.gridYear;
console.error('');
console.error(`Sanity checks (grid year ${GY}):`);
for (const type of [...cardinalTypes, ...distTypes]) {
  const row = allRows.find(r => r.type === type && r.year === GY);
  if (row) {
    const extra = row.raDeg !== null ? ` RA=${row.raDeg.toFixed(4)}°` : '';
    console.error(`  ${type.padEnd(4)}: JD=${row.jd.toFixed(6)}${extra} WA=${row.worldAngle.toFixed(4)}° dist=${row.distAU.toFixed(6)} AU`);
  } else {
    console.error(`  ${type.padEnd(4)}: NOT FOUND at grid year ${GY}!`);
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
for (const [type, count] of Object.entries(typeCounts)) {
  console.error(`  ${type}: ${count} rows`);
}
console.error(`CSV: ${OUTPUT_CSV}`);
