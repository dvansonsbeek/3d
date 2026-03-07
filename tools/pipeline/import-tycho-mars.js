#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// IMPORT TYCHO MARS — Parse Tycho Brahe's Mars declination observations
//                      (923 entries, 1582-1600) into reference-data.json
// ═══════════════════════════════════════════════════════════════════════════
//
// Source: Wayne Pafko's digitization (2000) of Tychonis Brahe Dani Opera
//         Omnia, volumes 10 and 13. Downloaded from pafko.com/tycho/.
//         GitHub mirror: Derek-Jones/ESEUR-code-data
//
// These are TIER 1C observations — actual naked-eye measurements by Tycho
// Brahe at Uraniborg/Hven, accurate to 1-2 arcminutes (0.017-0.033°).
// They are the most precise pre-telescope planetary position measurements
// ever made and directly constrain geocentric Mars declination.
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', '..', 'config', 'tycho-mars-raw.csv');
const DATA_PATH = path.join(__dirname, '..', '..', 'config', 'reference-data.json');

// ═══════════════════════════════════════════════════════════════════════════
// 1. PARSE CSV
// ═══════════════════════════════════════════════════════════════════════════

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += line[i];
    }
  }
  fields.push(current);
  return fields;
}

// Convert Gregorian date to Julian Day Number
function gregorianToJD(Y, M, D) {
  const a = Math.floor((14 - M) / 12);
  const y = Y + 4800 - a;
  const m = M + 12 * a - 3;
  return D + Math.floor((153 * m + 2) / 5) + 365 * y +
         Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

// Normalize overflowing day-of-month (e.g., December 40 → January 9)
function normalizeDate(year, month, dayAdj) {
  // Use JS Date for normalization (handles overflow)
  const d = new Date(year, month - 1, dayAdj);
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
}

const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
const csvLines = csvContent.split('\n');

// Column indices (from header analysis):
// [8]=Year, [9]=Month, [10]=Day(Julian), [11]=Day(adj/Gregorian),
// [12]=Hour, [13]=Min, [14]=Days since 1 AD, [15]=Date(decimal year),
// [16]=Sign(1.00 or -1.00), [20]=Declination(signed decimal degrees)
// [4]=Quote (original Latin), [5]=Volume, [6]=Page

const entries = [];
let parseErrors = 0;

for (let i = 1; i < csvLines.length; i++) {
  const line = csvLines[i].trim();
  if (!line) continue;

  const cols = parseCSVLine(line);

  const year = parseInt(cols[8]);
  const month = parseInt(cols[9]);
  const dayJulian = parseInt(cols[10]);
  const dayAdj = parseInt(cols[11]); // +10 for Gregorian correction
  const hour = parseFloat(cols[12]) || 0;
  const min = parseFloat(cols[13]) || 0;
  const declination = parseFloat(cols[20]);
  const quote = cols[4] || '';
  const volume = cols[5] || '';
  const page = cols[6] || '';

  if (isNaN(year) || isNaN(month) || isNaN(dayAdj) || isNaN(declination)) {
    parseErrors++;
    continue;
  }

  // Normalize the adjusted date (dayAdj can overflow, e.g., Dec 40 = Jan 9+1yr)
  const norm = normalizeDate(year, month, dayAdj);

  // Compute Julian Day
  const jdInt = gregorianToJD(norm.year, norm.month, norm.day);
  const jdFrac = (hour + min / 60) / 24;
  const jd = jdInt - 0.5 + jdFrac; // JD starts at noon, subtract 0.5 for midnight

  entries.push({
    jd: Math.round(jd * 100) / 100, // 2 decimal places
    dec: declination.toFixed(2),
    type: 'observation',
    label: 'Tycho Brahe',
    tier: '1C',
    weight: 5,
    source: `Tycho Brahe, Opera Omnia vol.${volume} p.${page}`,
    dateReliable: true,
    positionReliable: true,
    positionAccuracy: '1-2 arcmin',
    calendarYear: norm.year + (norm.month - 1) / 12,
    originalQuote: quote.substring(0, 120), // truncate for size
    notes: 'Declination only (no RA). Pre-telescope naked-eye measurement.',
  });
}

console.log(`Parsed ${entries.length} Tycho Mars observations (${parseErrors} errors)`);
console.log(`  Date range: JD ${entries[0].jd} to ${entries[entries.length - 1].jd}`);
console.log(`  Year range: ${entries[0].calendarYear.toFixed(1)} to ${entries[entries.length - 1].calendarYear.toFixed(1)}`);
console.log(`  Dec range: ${Math.min(...entries.map(e => parseFloat(e.dec))).toFixed(2)}° to ${Math.max(...entries.map(e => parseFloat(e.dec))).toFixed(2)}°`);

// ═══════════════════════════════════════════════════════════════════════════
// 2. LOAD AND UPDATE REFERENCE DATA
// ═══════════════════════════════════════════════════════════════════════════

const referenceData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

// Add or replace mars_tycho section
referenceData.tier1_observations = referenceData.tier1_observations || {};

referenceData.tier1_observations.tycho_mars = {
  description: 'Tycho Brahe Mars declination observations from Uraniborg (1582-1600)',
  source: 'Tychonis Brahe Dani Opera Omnia, vols. 10 & 13; digitized by Wayne Pafko (2000)',
  tier: '1C',
  weight: 5,
  accuracy: '1-2 arcminutes (0.017-0.033°)',
  dataType: 'declination only (no RA)',
  count: entries.length,
  dateRange: '1582-1600',
  status: 'COMPILED',
  entries: entries,
};

// Update tier definitions in metadata
referenceData._meta.tierDefinitions = {
  '1A': 'Modern direct observation: < 1 arcsec accuracy (LLR, modern eclipse timing, radar)',
  '1B': 'Telescope-era observation: 1-40 arcsec accuracy (transit contact times, Flamsteed)',
  '1C': 'Pre-telescope precision observation: 1-2 arcmin accuracy (Tycho Brahe)',
  '1D': 'Ancient/medieval observation: 10-60 arcmin accuracy (Ptolemy, Babylonian)',
  2: 'Modern fitted ephemeris (JPL DE441/VSOP87, 1800-2200)',
  3: 'Extrapolation (beyond reliable ephemeris range, or date-only entries)',
};

referenceData._meta.weightDefinitions = {
  '0': 'Tier 3: for comparison only, not used in optimization',
  '1': 'Tier 2: modern ephemeris reference (computed, not observed)',
  '2-4': 'Tier 1D: ancient/medieval observations',
  '5-6': 'Tier 1C: pre-telescope precision observations (Tycho Brahe)',
  '7-9': 'Tier 1B: telescope-era observations',
  '10': 'Tier 1A: modern direct observations (highest precision)',
};

referenceData._meta.tychoImport = {
  importedAt: new Date().toISOString(),
  totalEntries: entries.length,
  source: 'config/tycho-mars-raw.csv (from pafko.com/tycho/)',
  originalSource: 'Tychonis Brahe Dani Opera Omnia, vols. 10 & 13',
};

// Write
fs.writeFileSync(DATA_PATH, JSON.stringify(referenceData, null, 2));

// ═══════════════════════════════════════════════════════════════════════════
// 3. REPORT
// ═══════════════════════════════════════════════════════════════════════════

console.log();
console.log('═══════════════════════════════════════════════════════════════');
console.log('  TYCHO BRAHE MARS IMPORT — Summary');
console.log('═══════════════════════════════════════════════════════════════');
console.log();
console.log(`  Observations imported: ${entries.length}`);
console.log(`  Tier: 1C (pre-telescope precision observation)`);
console.log(`  Weight: 5`);
console.log(`  Accuracy: 1-2 arcminutes (0.017-0.033°)`);
console.log(`  Data type: Declination only (no RA)`);
console.log();

// Observations per year
const byYear = {};
for (const e of entries) {
  const y = Math.floor(e.calendarYear);
  byYear[y] = (byYear[y] || 0) + 1;
}
console.log('  Observations per year:');
for (const [y, n] of Object.entries(byYear).sort()) {
  const bar = '#'.repeat(Math.round(n / 5));
  console.log(`    ${y}: ${String(n).padStart(4)} ${bar}`);
}

console.log();
console.log(`  Tier definitions updated to 1A/1B/1C/1D/2/3`);
console.log(`  Output: ${DATA_PATH}`);
console.log();
console.log('═══════════════════════════════════════════════════════════════');
