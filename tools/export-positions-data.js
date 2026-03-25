#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// PLANET POSITIONS DATA EXPORT — Generate RA/Dec JSON for positions dashboard
//
// Usage: node tools/export-positions-data.js
//
// Outputs to dashboard/data/positions/:
//   sun.json, mercury.json, ..., neptune.json, metadata.json
// ═══════════════════════════════════════════════════════════════════════════

const path = require('path');
const fs = require('fs');
const C = require('./lib/constants');
const sg = require('./lib/scene-graph');
const prec = require('./lib/precession');

const OUTPUT_DIR = path.join(__dirname, '..', 'dashboard', 'data', 'positions');

// ── Configuration ──────────────────────────────────────────────────────────

const START_YEAR = 1800;
const END_YEAR = 2200;
const STEP_DAYS = 5;                         // 5-day intervals
const STEP_YEARS = STEP_DAYS / 365.2422;     // ~0.01369 years

const TARGETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

const PLANET_COLORS = {
  sun:     '#ffd700',
  moon:    '#c0c0c0',
  mercury: '#9e9e9e',
  venus:   '#d5ab37',
  mars:    '#d04a3e',
  jupiter: '#c97e4f',
  saturn:  '#d9b65c',
  uranus:  '#37c6d0',
  neptune: '#4a7abf',
};

// ── Helpers ────────────────────────────────────────────────────────────────

const d2r = Math.PI / 180;

function yearToJD(year) {
  return C.startmodelJD + (year - C.startmodelYear) * C.meanSolarYearDays;
}

function thetaToRaDeg(theta) {
  let deg = theta / d2r;
  // Normalize to [0, 360)
  while (deg < 0) deg += 360;
  while (deg >= 360) deg -= 360;
  return deg;
}

function phiToDecDeg(phi) {
  return 90 - phi / d2r;
}

// ── Load JPL reference data for validation overlay ─────────────────────────

function loadRefData(target) {
  const refPath = path.join(__dirname, '..', 'data', 'reference-data.json');
  const refData = JSON.parse(fs.readFileSync(refPath, 'utf-8'));
  const entries = refData.planets[target] || [];

  const refYears = [];
  const refRA = [];
  const refDec = [];

  for (const e of entries) {
    if (e.weight <= 0) continue;
    if (e.ra == null || e.dec == null) continue;
    let ra = typeof e.ra === 'string' ? parseFloat(e.ra) : e.ra;
    const dec = typeof e.dec === 'string' ? parseFloat(e.dec) : e.dec;
    if (isNaN(ra) || isNaN(dec)) continue;

    // Detect RA in hours (old script.js entries have ra < 24, no ° suffix)
    // JPL/IMCCE entries have ra in degrees (0-360) or with ° suffix
    const raStr = String(e.ra);
    if (!raStr.includes('°') && ra < 24.1 && ra >= 0) {
      ra = ra * 15; // convert hours to degrees
    }

    const yr = C.startmodelYear + (e.jd - C.startmodelJD) / C.meanSolarYearDays;
    if (yr < START_YEAR || yr > END_YEAR) continue;

    // Convert J2000 to of-date (our model uses of-date frame)
    const ofDate = prec.j2000ToOfDate(ra, dec, e.jd);

    refYears.push(Math.round(yr * 1000) / 1000);
    refRA.push(Math.round(ofDate.ra * 10000) / 10000);
    refDec.push(Math.round(ofDate.dec * 10000) / 10000);
  }

  return { refYears, refRA, refDec };
}

// ── Export planet positions ────────────────────────────────────────────────

function exportTarget(target) {
  const startJD = yearToJD(START_YEAR);
  const endJD = yearToJD(END_YEAR);

  const years = [];
  const ra_deg = [];
  const dec_deg = [];
  const dist_au = [];
  const sun_dist_au = [];

  let count = 0;
  for (let jd = startJD; jd <= endJD; jd += STEP_DAYS) {
    const yr = C.startmodelYear + (jd - C.startmodelJD) / C.meanSolarYearDays;
    const pos = sg.computePlanetPosition(target, jd);

    const ra = thetaToRaDeg(pos.ra);
    const dec = phiToDecDeg(pos.dec);

    years.push(Math.round(yr * 10000) / 10000);
    ra_deg.push(Math.round(ra * 10000) / 10000);
    dec_deg.push(Math.round(dec * 10000) / 10000);
    dist_au.push(Math.round(pos.distAU * 100000) / 100000);
    sun_dist_au.push(Math.round((pos.sunDistAU || 0) * 100000) / 100000);
    count++;
  }

  // NOTE: No null insertion for RA wraps — handled in browser chart code
  // to keep data clean for Sky Path chart which needs continuous RA/Dec.

  // Load reference data for validation overlay
  let ref = { refYears: [], refRA: [], refDec: [] };
  if (target !== 'sun' && target !== 'moon') {
    ref = loadRefData(target);
  }

  const data = {
    planet: target,
    generated: new Date().toISOString(),
    startYear: START_YEAR,
    endYear: END_YEAR,
    stepDays: STEP_DAYS,
    points: count,
    years,
    ra_deg,
    dec_deg,
    dist_au,
    sun_dist_au,
    ref_years: ref.refYears,
    ref_ra: ref.refRA,
    ref_dec: ref.refDec,
  };

  const outPath = path.join(OUTPUT_DIR, `${target}.json`);
  fs.writeFileSync(outPath, JSON.stringify(data));
  const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
  console.log(`  ${target}: ${count} pts, ${ref.refYears.length} ref pts, ${sizeMB} MB`);
}

// ── Export metadata ───────────────────────────────────────────────────────

function exportMetadata() {
  const meta = {
    generated: new Date().toISOString(),
    startYear: START_YEAR,
    endYear: END_YEAR,
    stepDays: STEP_DAYS,
    targets: {},
  };

  for (const t of TARGETS) {
    meta.targets[t] = {
      color: PLANET_COLORS[t],
      displayName: t.charAt(0).toUpperCase() + t.slice(1),
    };
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'metadata.json'), JSON.stringify(meta, null, 2));
}

// ── Main ──────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════');
console.log('  EXPORT PLANET POSITIONS DATA');
console.log(`  Range: ${START_YEAR}–${END_YEAR}, step: ${STEP_DAYS} days`);
console.log('═══════════════════════════════════════════════════════════════\n');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const t0 = Date.now();
for (const target of TARGETS) {
  exportTarget(target);
}
exportMetadata();

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n✓ Done in ${elapsed}s. Output: ${OUTPUT_DIR}`);
