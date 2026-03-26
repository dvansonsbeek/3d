#!/usr/bin/env node
/**
 * Export Cardinal Point Data (VE, SS, AE, WS) across the full Holistic Year
 *
 * Uses the headless scene-graph (no browser needed) to find solstices and
 * equinoxes by their physical definitions:
 *   SS = maximum sun declination (parabolic interpolation)
 *   WS = minimum sun declination (parabolic interpolation)
 *   VE = declination crosses zero ascending (linear interpolation)
 *   AE = declination crosses zero descending (linear interpolation)
 *
 * Usage:
 *   node tools/export-cardinal-points.js [--step 29] [--output data/02-cardinal-points.csv]
 *
 * Outputs:
 *   - CSV file with columns: Type, Model Year, JD, RA (deg), Obliquity (deg)
 *   - JSON training file: tools/cardinal-points-training.json (per-type arrays)
 *
 * The step size must divide evenly into (2000 - balancedYear) so that year 2000
 * is always included in the output. Default step = 29 years (~11,553 points per type).
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
const OUTPUT_CSV = getArg('output', path.join(__dirname, '..', '..', 'data', '02-cardinal-points.csv'));
const OUTPUT_JSON = path.join(__dirname, '..', '..', 'data', 'cardinal-points-training.json');

// ─── Verify grid year is on the step grid ────────────────────────────────────
const gridCheck = (C.gridYear - C.balancedYear) % STEP_YEARS;
if (Math.abs(gridCheck) > 0.001) {
  console.error(`WARNING: step ${STEP_YEARS} does not land on grid year ${C.gridYear}.`);
  console.error(`  (gridYear - balancedYear) = ${C.gridYear - C.balancedYear}, mod ${STEP_YEARS} = ${gridCheck}`);
} else {
  console.error(`Grid year ${C.gridYear} is on the step grid (step=${STEP_YEARS}).`);
}

// ─── Search parameters ───────────────────────────────────────────────────────
const SAMPLE_STEP = 0.5 / 24;   // 0.5 hours in days
const SEARCH_RANGE = 960;       // ±20 days (960 × 0.5h)

// ─── Cardinal point detection ────────────────────────────────────────────────

/**
 * Find a solstice (max or min declination) for a given year.
 * @param {number} year - Calendar year
 * @param {'SS'|'WS'} type - SS=max declination, WS=min declination
 * @param {number|null} prevJD - Previous solstice JD for chaining
 * @returns {{jd:number, raDeg:number, obliqDeg:number}|null}
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

  const fp = SG.computeSunPositionFast( bestJD);
  return {
    jd: bestJD,
    raDeg: (fp.ra * 180 / Math.PI + 360) % 360,
    obliqDeg: 90 - fp.dec * 180 / Math.PI
  };
}

/**
 * Find an equinox (declination zero crossing) for a given year.
 * @param {number} year - Calendar year
 * @param {'VE'|'AE'} type - VE=ascending, AE=descending
 * @param {number|null} prevJD - Previous equinox JD for chaining
 * @returns {{jd:number, raDeg:number, obliqDeg:number}|null}
 */
function findEquinox(year, type, prevJD) {
  const approxJD = prevJD
    ? prevJD + STEP_YEARS * C.meanSolarYearDays
    : C.startmodelJD + ((year + C.cardinalPointYearFractions[type]) - C.startModelYearWithCorrection) * C.meanSolarYearDays;

  for (let k = -SEARCH_RANGE + 1; k <= SEARCH_RANGE; k++) {
    const jd1 = approxJD + (k - 1) * SAMPLE_STEP;
    const jd2 = approxJD + k * SAMPLE_STEP;
    const dec1 = 90 - SG.computeSunPositionFast(jd1).dec * 180 / Math.PI;
    const dec2 = 90 - SG.computeSunPositionFast(jd2).dec * 180 / Math.PI;

    const isAscending  = dec1 < 0 && dec2 >= 0;
    const isDescending = dec1 >= 0 && dec2 < 0;

    if ((type === 'VE' && isAscending) || (type === 'AE' && isDescending)) {
      const t = -dec1 / (dec2 - dec1);
      const refinedJD = jd1 + t * SAMPLE_STEP;
      const fp = SG.computeSunPositionFast( refinedJD);
      return {
        jd: refinedJD,
        raDeg: (fp.ra * 180 / Math.PI + 360) % 360,
        obliqDeg: 90 - fp.dec * 180 / Math.PI
      };
    }
  }
  return null;
}

// ─── Main export loop ────────────────────────────────────────────────────────
// Two-pass approach: start near J2000 (where approxJD estimate is accurate),
// then chain forward AND backward. This avoids the ±20-day search window
// failing at distant years where the linear estimate drifts by hundreds of days.
const startYear = C.balancedYear;
const endYear = startYear + C.H;
const types = ['VE', 'SS', 'AE', 'WS'];

// Find the grid year closest to J2000
const j2000Year = startYear + Math.round((2000 - startYear) / STEP_YEARS) * STEP_YEARS;

const totalSteps = Math.ceil(C.H / STEP_YEARS);
console.error(`Cardinal point export: ${STEP_YEARS}-year steps, ${startYear} to ${endYear}`);
console.error(`Expected: ~${totalSteps} points per type, ~${totalSteps * 4} total`);
console.error(`Two-pass: forward from ${j2000Year}, then backward`);
console.error(`Output: ${OUTPUT_CSV}`);
console.error('');

const allRows = [];
let count = 0;
const t0 = Date.now();

// Pass 1: Forward from J2000 to endYear
const fwdPrevJDs = { VE: null, SS: null, AE: null, WS: null };
for (let y = j2000Year; y <= endYear; y += STEP_YEARS) {
  for (const type of types) {
    const finder = (type === 'SS' || type === 'WS') ? findSolstice : findEquinox;
    const r = finder(y, type, fwdPrevJDs[type]);
    if (r) {
      fwdPrevJDs[type] = r.jd;
      allRows.push({ type, year: y, jd: r.jd, raDeg: r.raDeg, obliqDeg: r.obliqDeg });
    }
  }
  count++;
  if (count % 500 === 0) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
    const pct = (count / totalSteps * 100).toFixed(1);
    console.error(`  ${count}/${totalSteps} (${pct}%) — ${elapsed}s elapsed`);
  }
}

// Pass 2: Backward from J2000 to startYear
const bwdPrevJDs = { VE: null, SS: null, AE: null, WS: null };
// Seed backward chaining from first forward result (near J2000)
for (const type of types) {
  const firstFwd = allRows.find(r => r.type === type && r.year === j2000Year);
  if (firstFwd) bwdPrevJDs[type] = firstFwd.jd;
}

for (let y = j2000Year - STEP_YEARS; y >= startYear; y -= STEP_YEARS) {
  for (const type of types) {
    const finder = (type === 'SS' || type === 'WS') ? findSolstice : findEquinox;
    // For backward chaining: shift prevJD back by 2×step so that the finder's
    // internal "prevJD + STEP_YEARS * meanSolarYearDays" lands near the target year
    const shiftedPrev = bwdPrevJDs[type]
      ? bwdPrevJDs[type] - 2 * STEP_YEARS * C.meanSolarYearDays
      : null;
    const r = finder(y, type, shiftedPrev);
    if (r) {
      bwdPrevJDs[type] = r.jd;
      allRows.push({ type, year: y, jd: r.jd, raDeg: r.raDeg, obliqDeg: r.obliqDeg });
    }
  }
  count++;
  if (count % 500 === 0) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
    const pct = (count / totalSteps * 100).toFixed(1);
    console.error(`  ${count}/${totalSteps} (${pct}%) — ${elapsed}s elapsed`);
  }
}

// Sort by type then year for consistent output
allRows.sort((a, b) => a.type.localeCompare(b.type) || a.year - b.year);

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

// ─── Sanity checks ───────────────────────────────────────────────────────────
const GY = C.gridYear;
const ssGY = allRows.find(r => r.type === 'SS' && r.year === GY);
const wsGY = allRows.find(r => r.type === 'WS' && r.year === GY);
const veGY = allRows.find(r => r.type === 'VE' && r.year === GY);
const aeGY = allRows.find(r => r.type === 'AE' && r.year === GY);

console.error('');
console.error(`Sanity checks (grid year ${GY}):`);
if (ssGY) console.error(`  SS: JD=${ssGY.jd.toFixed(6)} RA=${ssGY.raDeg.toFixed(4)}° (expect anchor=${C.cardinalPointAnchorsAtGrid.SS.toFixed(3)}, ~90°)`);
else console.error(`  SS: NOT FOUND at grid year ${GY}!`);
if (wsGY) console.error(`  WS: JD=${wsGY.jd.toFixed(6)} RA=${wsGY.raDeg.toFixed(4)}°`);
if (veGY) console.error(`  VE: JD=${veGY.jd.toFixed(6)} RA=${veGY.raDeg.toFixed(4)}°`);
if (aeGY) console.error(`  AE: JD=${aeGY.jd.toFixed(6)} RA=${aeGY.raDeg.toFixed(4)}°`);

// ─── Write CSV ───────────────────────────────────────────────────────────────
const csvLines = ['Type,Model Year,JD,RA (deg),Obliquity (deg)'];
for (const r of allRows) {
  csvLines.push(`${r.type},${r.year},${r.jd.toFixed(6)},${r.raDeg.toFixed(6)},${r.obliqDeg.toFixed(6)}`);
}
fs.writeFileSync(OUTPUT_CSV, csvLines.join('\n'));

// ─── Write per-type JSON for harmonic fitting ────────────────────────────────
const byType = {};
for (const t of types) byType[t] = allRows.filter(r => r.type === t);
fs.writeFileSync(OUTPUT_JSON, JSON.stringify(byType, null, 0));

// ─── Summary ─────────────────────────────────────────────────────────────────
console.error('');
console.error(`Done in ${elapsed}s.`);
console.error(`Total rows: ${allRows.length} (${byType.SS.length} per type)`);
console.error(`CSV: ${OUTPUT_CSV}`);
console.error(`JSON: ${OUTPUT_JSON}`);
