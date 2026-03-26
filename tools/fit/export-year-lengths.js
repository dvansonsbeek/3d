#!/usr/bin/env node
/**
 * Export year-length analysis data across the full Holistic Year.
 *
 * Uses the headless scene-graph (no browser) to measure:
 *   - Tropical year: 4 cardinal point intervals (VE, SS, AE, WS)
 *   - Sidereal year: 4 world-angle crossings (0°, 90°, 180°, 270°)
 *   - Anomalistic year: perihelion-to-perihelion intervals
 *
 * Output: data/03-year-length-analysis.xlsx with 'Detailed' sheet
 * compatible with year-length-harmonics.js.
 *
 * Usage:
 *   node tools/fit/export-year-lengths.js          # generate Excel
 *   node tools/fit/export-year-lengths.js --step 29  # custom step (default 29)
 */

const SG = require('../lib/scene-graph');
const C  = require('../lib/constants');
const { execSync } = require('child_process');
const path = require('path');

// ─── CLI arguments ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name, defaultVal) {
  const idx = args.indexOf('--' + name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

const STEP_YEARS = parseInt(getArg('step', String(C.stepYears)), 10);
const START_YEAR = parseInt(getArg('start', String(C.balancedYear)), 10);
const END_YEAR = parseInt(getArg('end', String(C.balancedYear + C.H)), 10);
const OUTPUT_PATH = path.join(__dirname, '..', '..', 'data', '03-year-length-analysis.xlsx');

// ─── Search parameters ──────────────────────────────────────────────────────
const SAMPLE_STEP = 0.5 / 24;   // 0.5 hours in days
const SEARCH_RANGE = 960;       // ±20 days (960 × 0.5h)

// ─── Cardinal point detection (same approach as export-cardinal-points.js) ──

/**
 * Find when Sun RA crosses a target angle (0°, 90°, 180°, 270°).
 * This is the tropical year measurement — same method as the browser's
 * sunRACrossingForYear(). Uses RA crossings, NOT declination extrema.
 */
function findRACrossing(year, targetRA, prevJD) {
  const approxJD = prevJD
    ? prevJD + STEP_YEARS * C.meanSolarYearDays
    : C.startmodelJD + ((year + 0.21 + targetRA / 360) - C.startModelYearWithCorrection) * C.meanSolarYearDays;

  for (let k = -SEARCH_RANGE + 1; k <= SEARCH_RANGE; k++) {
    const jd1 = approxJD + (k - 1) * SAMPLE_STEP;
    const jd2 = approxJD + k * SAMPLE_STEP;
    const pos1 = SG.computePlanetPosition('sun', jd1);
    const pos2 = SG.computePlanetPosition('sun', jd2);
    let ra1 = (pos1.ra * 180 / Math.PI + 360) % 360;
    let ra2 = (pos2.ra * 180 / Math.PI + 360) % 360;

    // Handle wraparound at 0°/360°
    if (Math.abs(ra2 - ra1) > 180) {
      if (ra2 > ra1) ra1 += 360; else ra2 += 360;
    }
    let adj = targetRA;
    if (ra1 > 360 || ra2 > 360) {
      if (targetRA < 180) adj = targetRA + 360;
    }

    // RA increases monotonically (Sun moves eastward) — find the crossing
    if (ra1 < adj && ra2 >= adj) {
      const t = (adj - ra1) / (ra2 - ra1);
      return { jd: jd1 + t * SAMPLE_STEP };
    }
  }
  return null;
}

// ─── Perihelion detection (minimum WobbleCenter→Sun distance) ───────────────
// Uses WobbleCenter (scene origin) → Sun distance, NOT Earth → Sun.
// This matches the browser's perihelionForYearMethodB which measures the
// true anomalistic orbit without axial-precession noise.

function findPerihelion(year, prevJD) {
  let approxJD;
  if (prevJD) {
    // Chain using anomalistic year length (matches browser)
    approxJD = prevJD + STEP_YEARS * C.meanAnomalisticYearDays;
  } else {
    // First search: account for perihelion precession through the year
    const perihelionCycle = C.H / 16;
    const perihelionAtReference = 0.03;  // early January at perihelionalignmentYear
    const yearsSinceRef = year - C.perihelionalignmentYear;
    let periFrac = (perihelionAtReference + (yearsSinceRef / perihelionCycle) % 1) % 1;
    if (periFrac < 0) periFrac += 1;
    approxJD = C.startmodelJD + ((year + periFrac) - C.startModelYearWithCorrection) * C.meanSolarYearDays;
  }

  let bestJD = approxJD;
  let bestDist = Infinity;
  const samples = [];

  for (let k = -SEARCH_RANGE; k <= SEARCH_RANGE; k++) {
    const jd = approxJD + k * SAMPLE_STEP;
    const dist = SG.getWobbleSunDistAU(jd);
    samples.push({ jd, dist });
    if (dist < bestDist) {
      bestDist = dist;
      bestJD = jd;
    }
  }

  // Parabolic interpolation for sub-sample precision
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

  return { jd: bestJD };
}

// ─── Aphelion detection (maximum WobbleCenter→Sun distance) ─────────────────

function findAphelion(year, prevJD) {
  let approxJD;
  if (prevJD) {
    approxJD = prevJD + STEP_YEARS * C.meanAnomalisticYearDays;
  } else {
    // Aphelion is ~0.5 year after perihelion
    const perihelionCycle = C.H / 16;
    const aphelionAtReference = 0.53;  // early July at perihelionalignmentYear
    const yearsSinceRef = year - C.perihelionalignmentYear;
    let aphFrac = (aphelionAtReference + (yearsSinceRef / perihelionCycle) % 1) % 1;
    if (aphFrac < 0) aphFrac += 1;
    approxJD = C.startmodelJD + ((year + aphFrac) - C.startModelYearWithCorrection) * C.meanSolarYearDays;
  }

  let bestJD = approxJD;
  let bestDist = -Infinity;
  const samples = [];

  for (let k = -SEARCH_RANGE; k <= SEARCH_RANGE; k++) {
    const jd = approxJD + k * SAMPLE_STEP;
    const dist = SG.getWobbleSunDistAU(jd);
    samples.push({ jd, dist });
    if (dist > bestDist) {
      bestDist = dist;
      bestJD = jd;
    }
  }

  // Parabolic interpolation for sub-sample precision
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

  return { jd: bestJD };
}

// ─── Sidereal crossing detection (Sun world angle) ─────────────────────────

// Helper: find angle crossing in sample array
function findAngleCrossing(samples, targetAngle, step) {
  for (let i = 1; i < samples.length; i++) {
    let a1 = samples[i - 1].angle;
    let a2 = samples[i].angle;
    if (Math.abs(a2 - a1) > 180) {
      if (a2 > a1) a1 += 360; else a2 += 360;
    }
    let adj = targetAngle;
    if (a1 > 360 || a2 > 360) {
      if (targetAngle < 180) adj = targetAngle + 360;
    }
    if ((a1 < adj && a2 >= adj) || (a1 > adj && a2 <= adj)) {
      const t = Math.abs(adj - a1) / Math.abs(a2 - a1);
      return samples[i - 1].jd + t * step;
    }
  }
  return null;
}

function findSiderealCrossing(year, targetAngle, prevJD) {
  const fineStep = SAMPLE_STEP;         // 0.5 hours
  const coarseStep = 6 / 24;            // 6 hours

  if (prevJD) {
    // Subsequent: narrow fine search ±20 days around expected
    const approxJD = prevJD + STEP_YEARS * C.meanSiderealYearDays;
    const samples = [];
    for (let k = -SEARCH_RANGE; k <= SEARCH_RANGE; k++) {
      const jd = approxJD + k * fineStep;
      samples.push({ jd, angle: SG.getSunWorldAngle(jd) });
    }
    const jd = findAngleCrossing(samples, targetAngle, fineStep);
    return jd ? { jd } : null;
  }

  // First year: coarse search over full year at 6-hour steps, then refine
  const yearStartJD = C.startmodelJD + (year - C.startModelYearWithCorrection) * C.meanSolarYearDays;
  const coarseSamples = [];
  for (let k = 0; k <= 1460; k++) {
    const jd = yearStartJD + k * coarseStep;
    coarseSamples.push({ jd, angle: SG.getSunWorldAngle(jd) });
  }
  const coarseJD = findAngleCrossing(coarseSamples, targetAngle, coarseStep);
  if (!coarseJD) return null;

  // Refine with 0.5-hour steps in ±12 hour window
  const fineSamples = [];
  for (let k = -24; k <= 24; k++) {
    const jd = coarseJD + k * fineStep;
    fineSamples.push({ jd, angle: SG.getSunWorldAngle(jd) });
  }
  const fineJD = findAngleCrossing(fineSamples, targetAngle, fineStep);
  return fineJD ? { jd: fineJD } : { jd: coarseJD };
}

// ─── Main export loop ───────────────────────────────────────────────────────

const startYear = START_YEAR;
const endYear = END_YEAR;

// Verify grid year is on the step grid
const gridCheck = (C.gridYear - startYear) % STEP_YEARS;
if (Math.abs(gridCheck) > 0.001) {
  console.error(`WARNING: step ${STEP_YEARS} does not land on grid year ${C.gridYear}.`);
} else {
  console.error(`Grid year ${C.gridYear} is on the step grid (step=${STEP_YEARS}).`);
}

console.log(`Exporting year-length analysis: ${startYear} to ${endYear}, step ${STEP_YEARS}`);
console.log(`Total points: ${Math.floor(C.H / STEP_YEARS) + 1}`);

// Track previous JDs for chaining
let prevVE = null, prevSS = null, prevAE = null, prevWS = null;
let prevPeri = null, prevAph = null;
let prevSid0 = null, prevSid90 = null, prevSid180 = null, prevSid270 = null;

// Store all events
const events = [];

const totalYears = Math.floor((endYear - startYear) / STEP_YEARS) + 1;
let count = 0;
const t0 = Date.now();

for (let year = startYear; year <= endYear; year += STEP_YEARS) {
  count++;
  if (count % 200 === 0 || count === 1) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const pct = (count / totalYears * 100).toFixed(1);
    console.log(`  ${count}/${totalYears} (${pct}%) year=${year}  elapsed=${elapsed}s`);
  }

  // Cardinal points
  // Tropical year: find RA crossings at 0°, 90°, 180°, 270° (same as browser report)
  const ve = findRACrossing(year, 0, prevVE);
  const ss = findRACrossing(year, 90, prevSS);
  const ae = findRACrossing(year, 180, prevAE);
  const ws = findRACrossing(year, 270, prevWS);
  if (ve) prevVE = ve.jd;
  if (ss) prevSS = ss.jd;
  if (ae) prevAE = ae.jd;
  if (ws) prevWS = ws.jd;

  // Perihelion & Aphelion
  const peri = findPerihelion(year, prevPeri);
  if (peri) prevPeri = peri.jd;
  const aph = findAphelion(year, prevAph);
  if (aph) prevAph = aph.jd;

  // Sidereal crossings (4 reference angles)
  const s0   = findSiderealCrossing(year, 0,   prevSid0);
  const s90  = findSiderealCrossing(year, 90,  prevSid90);
  const s180 = findSiderealCrossing(year, 180, prevSid180);
  const s270 = findSiderealCrossing(year, 270, prevSid270);
  if (s0)   prevSid0   = s0.jd;
  if (s90)  prevSid90  = s90.jd;
  if (s180) prevSid180 = s180.jd;
  if (s270) prevSid270 = s270.jd;

  // Obliquity and eccentricity (analytical, inline)
  const tBal = year - C.balancedYear;
  const A = C.earthInvPlaneInclinationAmplitude;
  const obliq = C.earthtiltMean
    - A * Math.cos(2 * Math.PI * tBal / (C.H / 3))
    + A * Math.cos(2 * Math.PI * tBal / (C.H / 8));
  const eccPhase = 2 * Math.PI * tBal / (C.H / 16);
  const eccMean = Math.sqrt(C.eccentricityBase * C.eccentricityBase + C.eccentricityAmplitude * C.eccentricityAmplitude);
  const h1 = eccMean - C.eccentricityBase;
  const ecc = eccMean + (-C.eccentricityAmplitude - h1 * Math.cos(eccPhase)) * Math.cos(eccPhase);

  events.push({
    year,
    veJD: ve ? ve.jd : null,
    ssJD: ss ? ss.jd : null,
    aeJD: ae ? ae.jd : null,
    wsJD: ws ? ws.jd : null,
    periJD: peri ? peri.jd : null,
    aphJD: aph ? aph.jd : null,
    s0JD: s0 ? s0.jd : null,
    s90JD: s90 ? s90.jd : null,
    s180JD: s180 ? s180.jd : null,
    s270JD: s270 ? s270.jd : null,
    obliquity: obliq,
    eccentricity: ecc,
  });
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`Data collection complete in ${elapsed}s. Computing intervals...`);

// ─── Compute intervals ──────────────────────────────────────────────────────

const rows = [];
for (let i = 1; i < events.length; i++) {
  const curr = events[i];
  const prev = events[i - 1];

  const veInt  = (curr.veJD && prev.veJD)   ? curr.veJD - prev.veJD   : null;
  const ssInt  = (curr.ssJD && prev.ssJD)   ? curr.ssJD - prev.ssJD   : null;
  const aeInt  = (curr.aeJD && prev.aeJD)   ? curr.aeJD - prev.aeJD   : null;
  const wsInt  = (curr.wsJD && prev.wsJD)   ? curr.wsJD - prev.wsJD   : null;
  const periInt = (curr.periJD && prev.periJD) ? curr.periJD - prev.periJD : null;
  const aphInt  = (curr.aphJD && prev.aphJD)  ? curr.aphJD - prev.aphJD  : null;
  const s0Int  = (curr.s0JD && prev.s0JD)   ? curr.s0JD - prev.s0JD   : null;
  const s90Int = (curr.s90JD && prev.s90JD) ? curr.s90JD - prev.s90JD : null;
  const s180Int = (curr.s180JD && prev.s180JD) ? curr.s180JD - prev.s180JD : null;
  const s270Int = (curr.s270JD && prev.s270JD) ? curr.s270JD - prev.s270JD : null;

  // Divide multi-step intervals by step count
  const steps = STEP_YEARS;
  const meanTrop = (veInt && ssInt && aeInt && wsInt)
    ? (veInt + ssInt + aeInt + wsInt) / (4 * steps) : null;
  const meanSid = (s0Int && s90Int && s180Int && s270Int)
    ? (s0Int + s90Int + s180Int + s270Int) / (4 * steps) : null;
  // Mean anomalistic = average of perihelion + aphelion intervals (cancels EoC bias)
  const meanAnom = (periInt && aphInt)
    ? (periInt + aphInt) / (2 * steps) : null;

  rows.push({
    Year: curr.year,
    Obliquity: curr.obliquity,
    Eccentricity: curr.eccentricity,
    'VE Interval': veInt ? veInt / steps : null,
    'SS Interval': ssInt ? ssInt / steps : null,
    'AE Interval': aeInt ? aeInt / steps : null,
    'WS Interval': wsInt ? wsInt / steps : null,
    'Mean Tropical Year': meanTrop,
    'Peri Interval': periInt ? periInt / steps : null,
    'Aph Interval': aphInt ? aphInt / steps : null,
    'Mean Anomalistic': meanAnom,
    'Sid 0°': s0Int ? s0Int / steps : null,
    'Sid 90°': s90Int ? s90Int / steps : null,
    'Sid 180°': s180Int ? s180Int / steps : null,
    'Sid 270°': s270Int ? s270Int / steps : null,
    'Mean Sidereal': meanSid,
  });
}

console.log(`${rows.length} data rows. Writing to ${OUTPUT_PATH}...`);

// ─── Write Excel via Python ─────────────────────────────────────────────────

const pyScript = `
import pandas as pd, json, sys
data = json.load(sys.stdin)
df = pd.DataFrame(data)
# Ensure column order
cols = ['Year', 'Obliquity', 'Eccentricity',
        'VE Interval', 'SS Interval', 'AE Interval', 'WS Interval', 'Mean Tropical Year',
        'Peri Interval', 'Aph Interval', 'Mean Anomalistic',
        'Sid 0°', 'Sid 90°', 'Sid 180°', 'Sid 270°', 'Mean Sidereal']
df = df[cols]
df.to_excel(sys.argv[1], sheet_name='Detailed', index=False)
print(f'Written {len(df)} rows to {sys.argv[1]}')
`;

try {
  const result = execSync(`python3 -c '${pyScript.replace(/'/g, "'\\''")}' '${OUTPUT_PATH}'`, {
    input: JSON.stringify(rows),
    encoding: 'utf8',
    timeout: 30000,
    maxBuffer: 100 * 1024 * 1024,
  });
  console.log(result.trim());
  console.log('Done.');
} catch (err) {
  console.error('Excel write failed:', err.message);
  // Fallback: write JSON
  const jsonPath = OUTPUT_PATH.replace('.xlsx', '.json');
  require('fs').writeFileSync(jsonPath, JSON.stringify(rows, null, 2));
  console.log(`Wrote fallback JSON to ${jsonPath}`);
}
