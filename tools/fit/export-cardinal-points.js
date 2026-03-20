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

const STEP_YEARS = parseInt(getArg('step', '29'), 10);
const OUTPUT_CSV = getArg('output', path.join(__dirname, '..', '..', 'data', '02-cardinal-points.csv'));
const OUTPUT_JSON = path.join(__dirname, '..', '..', 'data', 'cardinal-points-training.json');

// ─── Verify year 2000 is on the grid ─────────────────────────────────────────
const yearSpan = 2000 - C.balancedYear;
if (yearSpan % STEP_YEARS !== 0) {
  console.error(`WARNING: step ${STEP_YEARS} does not land on year 2000.`);
  console.error(`  (2000 - balancedYear) = ${yearSpan}, mod ${STEP_YEARS} = ${yearSpan % STEP_YEARS}`);
  console.error(`  Year 2000 will NOT be in the output.`);
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
    : C.startmodelJD + ((year + (type === 'SS' ? 0.5 : 0.97)) - C.startModelYearWithCorrection) * C.meanSolarYearDays;

  const isMax = type === 'SS';
  let bestJD = approxJD;
  let bestDec = isMax ? -Infinity : Infinity;
  const samples = [];

  for (let k = -SEARCH_RANGE; k <= SEARCH_RANGE; k++) {
    const jd = approxJD + k * SAMPLE_STEP;
    const pos = SG.computePlanetPosition('sun', jd);
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

  const fp = SG.computePlanetPosition('sun', bestJD);
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
    : C.startmodelJD + ((year + (type === 'VE' ? 0.22 : 0.73)) - C.startModelYearWithCorrection) * C.meanSolarYearDays;

  for (let k = -SEARCH_RANGE + 1; k <= SEARCH_RANGE; k++) {
    const jd1 = approxJD + (k - 1) * SAMPLE_STEP;
    const jd2 = approxJD + k * SAMPLE_STEP;
    const dec1 = 90 - SG.computePlanetPosition('sun', jd1).dec * 180 / Math.PI;
    const dec2 = 90 - SG.computePlanetPosition('sun', jd2).dec * 180 / Math.PI;

    const isAscending  = dec1 < 0 && dec2 >= 0;
    const isDescending = dec1 >= 0 && dec2 < 0;

    if ((type === 'VE' && isAscending) || (type === 'AE' && isDescending)) {
      const t = -dec1 / (dec2 - dec1);
      const refinedJD = jd1 + t * SAMPLE_STEP;
      const fp = SG.computePlanetPosition('sun', refinedJD);
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
const startYear = C.balancedYear;
const endYear = startYear + C.H;
const types = ['VE', 'SS', 'AE', 'WS'];
const totalSteps = Math.ceil(C.H / STEP_YEARS);

console.error(`Cardinal point export: ${STEP_YEARS}-year steps, ${startYear} to ${endYear}`);
console.error(`Expected: ~${totalSteps} points per type, ~${totalSteps * 4} total`);
console.error(`Output: ${OUTPUT_CSV}`);
console.error('');

const allRows = [];
const prevJDs = { VE: null, SS: null, AE: null, WS: null };
let count = 0;
const t0 = Date.now();

for (let y = startYear; y <= endYear; y += STEP_YEARS) {
  for (const type of types) {
    const finder = (type === 'SS' || type === 'WS') ? findSolstice : findEquinox;
    const r = finder(y, type, prevJDs[type]);
    if (r) {
      prevJDs[type] = r.jd;
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

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

// ─── Sanity checks ───────────────────────────────────────────────────────────
const ss2000 = allRows.find(r => r.type === 'SS' && r.year === 2000);
const ws2000 = allRows.find(r => r.type === 'WS' && r.year === 2000);
const ve2000 = allRows.find(r => r.type === 'VE' && r.year === 2000);
const ae2000 = allRows.find(r => r.type === 'AE' && r.year === 2000);

console.error('');
console.error('Sanity checks (year 2000):');
if (ss2000) console.error(`  SS: JD=${ss2000.jd.toFixed(6)} RA=${ss2000.raDeg.toFixed(4)}° (expect ~2451716.575, ~90°)`);
else console.error('  SS: NOT FOUND at year 2000!');
if (ws2000) console.error(`  WS: JD=${ws2000.jd.toFixed(6)} RA=${ws2000.raDeg.toFixed(4)}°`);
if (ve2000) console.error(`  VE: JD=${ve2000.jd.toFixed(6)} RA=${ve2000.raDeg.toFixed(4)}°`);
if (ae2000) console.error(`  AE: JD=${ae2000.jd.toFixed(6)} RA=${ae2000.raDeg.toFixed(4)}°`);

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
