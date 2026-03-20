#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// ADD JPL REFERENCE POINTS — Generate evenly-spaced Tier 2 reference data
//                             for all planets from JPL Horizons
//
// Creates reference points every N years across 2000-2200, fetches RA/Dec
// from JPL Horizons, and merges into reference-data.json.
//
// Usage:
//   node tools/pipeline/add-jpl-reference-points.js [--interval 5] [--planet venus]
//
// Options:
//   --interval N   Years between reference points (default: 5)
//   --planet NAME  Only process this planet (default: all)
//   --start YEAR   Start year (default: 2000)
//   --end YEAR     End year (default: 2200)
//   --dry-run      Show what would be added without modifying files
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const jpl = require('../lib/horizons-client');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'reference-data.json');

// Model epoch constants (from constants.js)
const startmodelJD = 2451716.5;        // JD of 21 Jun 2000
const startmodelYear = 2000.5;         // calendar year of model start
const meanSolarYearDays = 365.24219;   // mean solar year in days

// ═══════════════════════════════════════════════════════════════════════════
// PARSE ARGUMENTS
// ═══════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
function getArg(name, defaultVal) {
  const idx = args.indexOf('--' + name);
  if (idx === -1) return defaultVal;
  return args[idx + 1];
}

const interval = parseInt(getArg('interval', '5'));
const onlyPlanet = getArg('planet', null);
const startYear = parseInt(getArg('start', '2000'));
const endYear = parseInt(getArg('end', '2200'));
const dryRun = args.includes('--dry-run');

const PLANETS = onlyPlanet ? [onlyPlanet] : ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE DATES
// ═══════════════════════════════════════════════════════════════════════════

function yearToJD(calendarYear) {
  return startmodelJD + (calendarYear - startmodelYear) * meanSolarYearDays;
}

function generateDates() {
  const dates = [];
  for (let y = startYear; y <= endYear; y += interval) {
    // Use June 21 (mid-year) for each reference year
    const calYear = y + 0.5; // June ~21
    dates.push({
      jd: parseFloat(yearToJD(calYear).toFixed(1)),
      calendarYear: calYear,
    });
  }
  return dates;
}

// ═══════════════════════════════════════════════════════════════════════════
// MERGE AND FETCH
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const referenceData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  const dates = generateDates();

  console.log(`Generating ${dates.length} reference dates (${startYear}-${endYear}, every ${interval} years)`);
  console.log(`Planets: ${PLANETS.join(', ')}`);
  if (dryRun) console.log('DRY RUN — no files will be modified\n');
  console.log();

  let totalAdded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const planet of PLANETS) {
    // Ensure planet array exists
    if (!referenceData.planets[planet]) {
      referenceData.planets[planet] = [];
    }

    const existing = referenceData.planets[planet];
    const existingJDs = new Set(existing.map(e => e.jd));

    // Find which dates are new
    const newDates = dates.filter(d => !existingJDs.has(d.jd));
    const skipped = dates.length - newDates.length;

    console.log(`${planet}: ${newDates.length} new dates (${skipped} already exist)`);
    totalSkipped += skipped;

    if (newDates.length === 0 || dryRun) {
      if (dryRun && newDates.length > 0) {
        console.log(`  Would add: JD ${newDates[0].jd} (${newDates[0].calendarYear}) ... JD ${newDates[newDates.length-1].jd} (${newDates[newDates.length-1].calendarYear})`);
        totalAdded += newDates.length;
      }
      continue;
    }

    // Fetch all positions from JPL (uses cache + rate limiting internally)
    const jds = newDates.map(d => d.jd);
    let positions;
    try {
      positions = await jpl.getPositions(planet, jds);
    } catch (err) {
      console.error(`  ERROR fetching ${planet}: ${err.message}`);
      totalErrors += jds.length;
      continue;
    }

    // Add to reference data
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const dateInfo = newDates[i];

      if (pos.ra == null || pos.dec == null) {
        console.error(`  WARNING: null RA/Dec for ${planet} at JD ${pos.jd}`);
        totalErrors++;
        continue;
      }

      existing.push({
        jd: pos.jd,
        ra: pos.ra.toFixed(5) + '°',
        dec: pos.dec.toFixed(5) + '°',
        type: 'both',
        label: `JPL Horizons (${Math.floor(dateInfo.calendarYear)})`,
        calendarYear: dateInfo.calendarYear,
        tier: 2,
        weight: 1,
        source: 'JPL Horizons API (geocentric astrometric)',
        jpl_enriched: true,
      });
      totalAdded++;
    }

    // Sort by JD
    existing.sort((a, b) => a.jd - b.jd);

    console.log(`  Added ${positions.length} reference points`);
  }

  if (!dryRun) {
    // Update metadata
    referenceData._meta.jplReferenceEnrichment = {
      enrichedAt: new Date().toISOString(),
      interval: `${interval} years`,
      range: `${startYear}-${endYear}`,
      totalAdded,
      totalSkipped,
      totalErrors,
    };

    fs.writeFileSync(DATA_PATH, JSON.stringify(referenceData, null, 2));
  }

  // Final summary
  console.log();
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ADD JPL REFERENCE POINTS — Summary');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log();
  console.log(`  Added:   ${totalAdded}`);
  console.log(`  Skipped: ${totalSkipped} (already exist)`);
  console.log(`  Errors:  ${totalErrors}`);
  console.log();

  // Show final coverage
  if (!dryRun) {
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    for (const planet of PLANETS) {
      const entries = data.planets[planet] || [];
      const withRA = entries.filter(e => e.ra != null).length;
      const tier2 = entries.filter(e => e.tier === 2 && e.ra != null).length;
      console.log(`  ${planet.padEnd(8)}: ${withRA} total RA points (${tier2} Tier 2)`);
    }
  }

  console.log();
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
