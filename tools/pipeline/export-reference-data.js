#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// EXPORT REFERENCE DATA — Parse PLANET_TEST_DATES from script.js and
//                          output config/reference-data.json with metadata
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const SCRIPT_PATH = path.join(__dirname, '..', '..', 'src', 'script.js');
const OUTPUT_PATH = path.join(__dirname, '..', '..', 'config', 'reference-data.json');

// ═══════════════════════════════════════════════════════════════════════════
// 1. PARSE PLANET_TEST_DATES FROM script.js
// ═══════════════════════════════════════════════════════════════════════════

const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf-8');

// Find the PLANET_TEST_DATES block
const startMarker = 'const PLANET_TEST_DATES = {';
const startIdx = scriptContent.indexOf(startMarker);
if (startIdx === -1) {
  console.error('ERROR: Could not find PLANET_TEST_DATES in script.js');
  process.exit(1);
}

// Find the closing }; — scan for balanced braces
let braceCount = 0;
let endIdx = -1;
for (let i = startIdx + startMarker.length - 1; i < scriptContent.length; i++) {
  if (scriptContent[i] === '{') braceCount++;
  else if (scriptContent[i] === '}') {
    braceCount--;
    if (braceCount === 0) {
      endIdx = i + 1;
      break;
    }
  }
}

if (endIdx === -1) {
  console.error('ERROR: Could not find end of PLANET_TEST_DATES');
  process.exit(1);
}

const block = scriptContent.substring(startIdx, endIdx);

// Parse each planet's array
const planetNames = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'halleys', 'eros'];

function parseEntries(planetBlock) {
  const entries = [];
  // Match each { ... } entry on a single line (or spanning simple multi-line)
  const entryRegex = /\{\s*([^}]+)\s*\}/g;
  let match;
  while ((match = entryRegex.exec(planetBlock)) !== null) {
    const inner = match[1];
    // Skip if it looks like a comment line that leaked through
    if (!inner.includes('jd:')) continue;

    const entry = {};

    // Parse jd
    const jdMatch = inner.match(/jd:\s*([\d.]+)/);
    if (jdMatch) entry.jd = parseFloat(jdMatch[1]);

    // Parse ra (string)
    const raMatch = inner.match(/ra:\s*'([^']*)'/);
    if (raMatch) entry.ra = raMatch[1];

    // Parse dec (string)
    const decMatch = inner.match(/dec:\s*'([^']*)'/);
    if (decMatch) entry.dec = decMatch[1];

    // Parse longitude (string)
    const lonMatch = inner.match(/longitude:\s*'([^']*)'/);
    if (lonMatch) entry.longitude = lonMatch[1];

    // Parse type
    const typeMatch = inner.match(/type:\s*'([^']*)'/);
    if (typeMatch) entry.type = typeMatch[1];

    // Parse label
    const labelMatch = inner.match(/label:\s*'([^']*)'/);
    if (labelMatch) entry.label = labelMatch[1];

    // Parse showOnScreen
    const showMatch = inner.match(/showOnScreen:\s*(true|false)/);
    if (showMatch) entry.showOnScreen = showMatch[1] === 'true';

    // Parse comparePlanet
    const cpMatch = inner.match(/comparePlanet:\s*'([^']*)'/);
    if (cpMatch) entry.comparePlanet = cpMatch[1];

    if (entry.jd) entries.push(entry);
  }
  return entries;
}

const parsedData = {};
let totalEntries = 0;

for (const planet of planetNames) {
  // Find this planet's array within the block
  const planetStart = block.indexOf(`${planet}: [`);
  if (planetStart === -1) {
    console.log(`  WARNING: No entries found for ${planet}`);
    parsedData[planet] = [];
    continue;
  }

  // Find the matching ]
  let bracketCount = 0;
  let planetEnd = -1;
  for (let i = planetStart + planet.length + 2; i < block.length; i++) {
    if (block[i] === '[') bracketCount++;
    else if (block[i] === ']') {
      bracketCount--;
      if (bracketCount === 0) {
        planetEnd = i + 1;
        break;
      }
    }
  }

  const planetBlock = block.substring(planetStart, planetEnd);
  parsedData[planet] = parseEntries(planetBlock);
  totalEntries += parsedData[planet].length;
}

console.log(`Parsed ${totalEntries} entries from PLANET_TEST_DATES:`);
for (const [planet, entries] of Object.entries(parsedData)) {
  console.log(`  ${planet}: ${entries.length} entries`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. CONVERT JD TO CALENDAR YEAR (for tier assignment)
// ═══════════════════════════════════════════════════════════════════════════

function jdToYear(jd) {
  return C.jdToYear(jd);
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. ASSIGN TIER, WEIGHT, SOURCE, RELIABILITY METADATA
// ═══════════════════════════════════════════════════════════════════════════

// Source mapping based on planet and label
const sourceMap = {
  'NASA date': {
    mercury: 'NASA GSFC Mercury Transit Catalog (Espenak), computed from JPL DE404/DE405',
    venus: 'NASA GSFC Venus Transit Catalog (Espenak), computed from JPL DE404/DE405',
  },
  'Opposition': {
    mars: 'Jean Meeus opposition tables, computed from VSOP87 theory',
    jupiter: 'astropixels.com (Espenak), computed from JPL DE405',
    saturn: 'astropixels.com (Espenak), computed from JPL DE405',
  },
  'Occultation': 'Mutual planetary occultation catalog (Project Pluto / Wikipedia)',
  'Model start date (21 Jun 2000)': 'Model reference point (computed)',
};

// First observed transit dates
const firstObservedTransit = {
  mercury: 1631, // Gassendi, November 7, 1631
  venus: 1639,   // Horrocks & Crabtree, December 4, 1639
};

function assignMetadata(planet, entry) {
  const year = jdToYear(entry.jd);
  const meta = { ...entry };

  meta.calendarYear = Math.round(year * 10) / 10; // rough calendar year for reference

  // --- Tier and Weight ---
  if (entry.label === 'Model start date (21 Jun 2000)') {
    meta.tier = 2;
    meta.weight = 1;
  } else if (year >= 1800 && year <= 2200) {
    meta.tier = 2;
    meta.weight = 1;
  } else if (year < 1800) {
    meta.tier = 3;
    meta.weight = 0;
  } else {
    // After 2200
    meta.tier = 3;
    meta.weight = 0;
  }

  // --- Source ---
  if (entry.label === 'Model start date (21 Jun 2000)') {
    meta.source = 'Model reference point (computed)';
  } else if (entry.label === 'NASA date') {
    meta.source = (sourceMap['NASA date'][planet]) || `NASA GSFC Transit Catalog (Espenak), computed from JPL DE404/DE405`;
  } else if (entry.label === 'Opposition') {
    meta.source = (sourceMap['Opposition'][planet]) || `Opposition data, computed from ephemeris`;
  } else if (entry.label === 'Occultation') {
    meta.source = 'Mutual planetary occultation catalog (Project Pluto / Wikipedia)';
  } else {
    meta.source = 'Unknown source';
  }

  // --- Date Reliability ---
  // Transit dates (NASA date label for Mercury/Venus): historically observed after first transit
  if (entry.label === 'NASA date' && (planet === 'mercury' || planet === 'venus')) {
    const firstObs = firstObservedTransit[planet];
    meta.dateReliable = year >= firstObs;
  } else if (entry.label === 'Opposition' && planet === 'mars') {
    // Mars oppositions are observable; dates after ~1700 are from telescope observations
    meta.dateReliable = year >= 1700;
  } else if (entry.label === 'Occultation') {
    // Occultation dates: computed from ephemeris for future/ancient, some observed
    meta.dateReliable = false; // Conservative: most are computed predictions
  } else if (entry.label === 'Model start date (21 Jun 2000)') {
    meta.dateReliable = true; // Known reference date
  } else {
    meta.dateReliable = false;
  }

  // --- Position Reliability ---
  // ALL current position values (dec, ra, longitude) are computed from DE/VSOP87
  meta.positionReliable = false;

  // --- Notes ---
  meta.notes = '';

  // Flag entries that have longitude but no dec/ra
  if (entry.longitude && entry.longitude !== 'N/A' && !entry.dec && !entry.ra) {
    meta.notes = 'Has ecliptic longitude only (no RA/Dec)';
  }
  if (entry.longitude === 'N/A') {
    meta.notes = 'Date only, no positional data';
  }
  if (entry.comparePlanet) {
    meta.notes = (meta.notes ? meta.notes + '; ' : '') + `Mutual event with ${entry.comparePlanet}`;
  }

  return meta;
}

// Apply metadata to all entries
const referenceData = {
  _meta: {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    generatedBy: 'tools/export-reference-data.js',
    sourceFile: 'src/script.js PLANET_TEST_DATES (lines 6825-7556)',
    totalEntries: totalEntries,
    tierDefinitions: {
      '1A': 'Modern direct observation: < 1 arcsec accuracy (LLR, modern eclipse timing, radar)',
      '1B': 'Telescope-era observation: 1-40 arcsec accuracy (transit contact times, Flamsteed)',
      '1C': 'Pre-telescope precision observation: 1-2 arcmin accuracy (Tycho Brahe)',
      '1D': 'Ancient/medieval observation: 10-60 arcmin accuracy (Ptolemy, Babylonian)',
      2: 'Modern fitted ephemeris (position computed from JPL DE/VSOP87, 1800-2200)',
      3: 'Extrapolation (beyond reliable ephemeris range, or date-only entries)',
    },
    weightDefinitions: {
      '0': 'Tier 3: for comparison only, not used in optimization',
      '1': 'Tier 2: modern ephemeris reference (computed, not observed)',
      '2-4': 'Tier 1D: ancient/medieval observations',
      '5-6': 'Tier 1C: pre-telescope precision observations (Tycho Brahe)',
      '7-9': 'Tier 1B: telescope-era observations',
      '10': 'Tier 1A: modern direct observations (highest precision)',
    },
    notes: [
      'PLANET_TEST_DATES positions (dec, ra, longitude) are Tier 2 (computed from ephemeris)',
      'Transit/opposition DATES may be Tier 1 (historically observed) but positions are still Tier 2',
      'Tier 1C data: Tycho Brahe Mars declinations (923 obs, 1582-1600) imported separately',
      'JPL enrichment adds RA values where only dec is available (still Tier 2)',
    ],
  },
  planets: {},
  // Placeholder for future Tier 1 observational data
  tier1_observations: {
    mercury_transits: {
      description: 'Observed Mercury transit contact times from RGO Bulletin 181 (1677-1973)',
      entries: [],
      status: 'TO BE COMPILED',
    },
    venus_transits: {
      description: 'Observed Venus transit records from Royal Society publications (1639-2012)',
      entries: [],
      status: 'TO BE COMPILED',
    },
    eclipse_records: {
      description: 'Historical eclipse records from Stephenson (1997), 700 BCE-1600 CE',
      entries: [],
      status: 'TO BE COMPILED',
    },
    modern_eclipses: {
      description: 'Modern eclipse timings with precise contact times (1900-2025)',
      entries: [],
      status: 'TO BE COMPILED',
    },
    lunar_laser_ranging: {
      description: 'Lunar Laser Ranging measurements from Apollo retroreflectors (1969-present)',
      entries: [],
      status: 'TO BE COMPILED',
    },
  },
};

// Stats tracking
const stats = {
  perPlanet: {},
  byTier: { 1: 0, 2: 0, 3: 0 },
  withRa: 0,
  withDec: 0,
  withLongitude: 0,
  withComparePlanet: 0,
  dateReliable: 0,
};

for (const [planet, entries] of Object.entries(parsedData)) {
  const annotatedEntries = entries.map(e => assignMetadata(planet, e));
  referenceData.planets[planet] = annotatedEntries;

  stats.perPlanet[planet] = {
    total: annotatedEntries.length,
    tier2: annotatedEntries.filter(e => e.tier === 2).length,
    tier3: annotatedEntries.filter(e => e.tier === 3).length,
    withRa: annotatedEntries.filter(e => e.ra).length,
    withDec: annotatedEntries.filter(e => e.dec).length,
    withLongitude: annotatedEntries.filter(e => e.longitude && e.longitude !== 'N/A').length,
    dateReliable: annotatedEntries.filter(e => e.dateReliable).length,
  };

  for (const e of annotatedEntries) {
    stats.byTier[e.tier]++;
    if (e.ra) stats.withRa++;
    if (e.dec) stats.withDec++;
    if (e.longitude && e.longitude !== 'N/A') stats.withLongitude++;
    if (e.comparePlanet) stats.withComparePlanet++;
    if (e.dateReliable) stats.dateReliable++;
  }
}

// Write output
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(referenceData, null, 2));

// ═══════════════════════════════════════════════════════════════════════════
// 4. REPORT
// ═══════════════════════════════════════════════════════════════════════════

console.log();
console.log('═══════════════════════════════════════════════════════════════');
console.log('  REFERENCE DATA EXPORT — Summary');
console.log('═══════════════════════════════════════════════════════════════');
console.log();
console.log(`  Total entries: ${totalEntries}`);
console.log(`  By tier: Tier 1: ${stats.byTier[1]}, Tier 2: ${stats.byTier[2]}, Tier 3: ${stats.byTier[3]}`);
console.log(`  With RA: ${stats.withRa} (${(stats.withRa/totalEntries*100).toFixed(1)}%)`);
console.log(`  With Dec: ${stats.withDec} (${(stats.withDec/totalEntries*100).toFixed(1)}%)`);
console.log(`  With Longitude: ${stats.withLongitude} (${(stats.withLongitude/totalEntries*100).toFixed(1)}%)`);
console.log(`  With comparePlanet: ${stats.withComparePlanet}`);
console.log(`  Date reliable: ${stats.dateReliable} (${(stats.dateReliable/totalEntries*100).toFixed(1)}%)`);
console.log(`  Position reliable: 0 (0.0%) — all positions are computed`);
console.log();

console.log('  Per planet:');
console.log(`  ${'Planet'.padEnd(10)} ${'Total'.padStart(6)} ${'T2'.padStart(4)} ${'T3'.padStart(4)} ${'RA'.padStart(4)} ${'Dec'.padStart(4)} ${'Lon'.padStart(4)} ${'DateOK'.padStart(7)}`);
console.log(`  ${'-'.repeat(10)} ${'-'.repeat(6)} ${'-'.repeat(4)} ${'-'.repeat(4)} ${'-'.repeat(4)} ${'-'.repeat(4)} ${'-'.repeat(4)} ${'-'.repeat(7)}`);
for (const [planet, s] of Object.entries(stats.perPlanet)) {
  console.log(`  ${planet.padEnd(10)} ${String(s.total).padStart(6)} ${String(s.tier2).padStart(4)} ${String(s.tier3).padStart(4)} ${String(s.withRa).padStart(4)} ${String(s.withDec).padStart(4)} ${String(s.withLongitude).padStart(4)} ${String(s.dateReliable).padStart(7)}`);
}

console.log();
console.log(`  Entries needing JPL RA enrichment (Tier 2, has dec but no ra):`);
let needsRa = 0;
for (const [planet, entries] of Object.entries(referenceData.planets)) {
  const needs = entries.filter(e => e.tier === 2 && e.dec && !e.ra);
  if (needs.length > 0) {
    console.log(`    ${planet}: ${needs.length} entries`);
    needsRa += needs.length;
  }
}
console.log(`    Total: ${needsRa} entries to enrich`);

console.log();
console.log(`  Output: ${OUTPUT_PATH}`);
console.log();
console.log('═══════════════════════════════════════════════════════════════');
