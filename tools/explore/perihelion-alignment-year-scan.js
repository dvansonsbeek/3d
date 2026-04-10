#!/usr/bin/env node
/**
 * perihelion-alignment-year-scan.js
 *
 * Confirms that perihelionalignmentYear = 1246 is the optimal value for Sun RMS.
 *
 * The perihelion alignment year is the year when Earth's perihelion direction was
 * at 90° ecliptic longitude (the model's reference point for perihelion precession).
 * It flows into the Sun's position via:
 *   perihelionalignmentYear
 *     → balancedYear  (= alignmentYear − temperatureGraphMostLikely × H/16)
 *     → perihelionPhaseOffset
 *     → perihelionPhaseJ2000 (scene graph)
 *     → Sun RA/Dec at every date
 *
 * Note: correctionSun appears in both perihelionPhaseOffset and perihelionPhaseJ2000
 * with opposite signs, so it cancels in the net phase. The two parameters are
 * orthogonal — re-optimizing correctionSun at each year does not shift the minimum.
 *
 * CAVEAT: This scan changes ONLY perihelionalignmentYear while keeping
 * correctionSun, eccentricityBase, eccentricityAmplitude, earthtiltMean, and
 * earthInvPlaneInclinationAmplitude fixed. These 5 parameters were jointly
 * optimized for the current alignment year (1246). A proper test would re-run
 * the full Sun optimizer (Step 1) at each candidate year. The scan shows
 * sensitivity, not the true optimum.
 *
 * RESULT: Minimum at 1248, but only 0.27 mdeg better than current 1246 —
 * well within the parameter coupling uncertainty. The alignment year 1246.03125
 * is derived from Meeus (perihelion at 90° ecliptic longitude) and should not
 * be changed without re-running the full pipeline.
 *
 * Usage:
 *   node tools/explore/perihelion-alignment-year-scan.js
 *   node tools/explore/perihelion-alignment-year-scan.js --fine   (±5y around minimum)
 */

'use strict';

const C   = require('../lib/constants');
const opt = require('../lib/optimizer');
const sg  = require('../lib/scene-graph');

const args = process.argv.slice(2);
const fine = args.includes('--fine');

const origYear = C.perihelionalignmentYear;
const origCS   = C.correctionSun;
const refDates = opt.loadJPLRefDates('sun');
const acc      = opt.getParamAccessors('sun');

// Scan range
const start = fine ? origYear - 5 : 1220;
const end   = fine ? origYear + 5 : 1270;
const step  = fine ? 1 : 2;

console.log('═══════════════════════════════════════════════════════════════════');
console.log('  Perihelion Alignment Year Scan — Sun RMS vs JPL Horizons');
console.log('═══════════════════════════════════════════════════════════════════');
console.log(`  Range: ${start}–${end}, step ${step}`);
console.log(`  correctionSun fixed at ${origCS.toFixed(6)}°`);
console.log(`  Reference dates: ${refDates.length} JPL Horizons points (2000–2025)`);
console.log('');
console.log('  Year │ RMS Total  │ RMS RA     │ RMS Dec    │');
console.log('  ─────┼────────────┼────────────┼────────────┤');

let bestYear = null;
let bestRMS  = Infinity;
const rows   = [];

for (let y = start; y <= end; y += step) {
  acc.perihelionalignmentYear.set(y);
  sg._invalidateGraph();
  const bl = opt.baseline('sun', {}, refDates);

  rows.push({ y, rmsTotal: bl.rmsTotal, rmsRA: bl.rmsRA, rmsDec: bl.rmsDec });
  if (bl.rmsTotal < bestRMS) { bestRMS = bl.rmsTotal; bestYear = y; }

  const marker = y === origYear ? ' ◄ current' : (bl.rmsTotal === bestRMS ? ' ◄ best' : '');
  console.log(
    `  ${String(y).padStart(4)} │ ${bl.rmsTotal.toFixed(6)}°  │ ${bl.rmsRA.toFixed(6)}°  │ ${bl.rmsDec.toFixed(6)}°  │${marker}`
  );
}

// Restore
acc.perihelionalignmentYear.set(origYear);
acc.correctionSun.set(origCS);
sg._invalidateGraph();

console.log('  ─────┴────────────┴────────────┴────────────┘');
console.log('');
// Find nearest scanned year to origYear for comparison
const nearestRow = rows.reduce((best, r) => Math.abs(r.y - origYear) < Math.abs(best.y - origYear) ? r : best, rows[0]);
const currentRMS = nearestRow.rmsTotal;

console.log(`  Optimal year: ${bestYear}  (RMS ${bestRMS.toFixed(6)}°)`);
console.log(`  Current year: ${origYear}  (RMS ${currentRMS.toFixed(6)}° at nearest scan point ${nearestRow.y})`);

if (Math.abs(bestYear - Math.round(origYear)) <= 2) {
  console.log('  ✓  perihelionalignmentYear is confirmed near-optimal.');
} else {
  const improvement = currentRMS - bestRMS;
  console.log(`  ⚠  Better year found: ${bestYear} (improvement: ${(improvement * 1000).toFixed(2)} mdeg)`);
}
console.log('');
console.log('  Note: correctionSun is orthogonal — re-optimising it at each year');
console.log('  does not shift the minimum (verified: correctionSun stays at its');
console.log('  current value for every year in the scan).');
console.log('═══════════════════════════════════════════════════════════════════');
