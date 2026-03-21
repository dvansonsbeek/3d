#!/usr/bin/env node
/**
 * Fetch additional JPL Horizons reference data for planets with sparse coverage.
 *
 * Adds data points at regular intervals (default: monthly) for the specified
 * date range, merged into the existing reference-data.json.
 *
 * Usage:
 *   node tools/fit/fetch-jpl-data.js                      # fetch all sparse planets
 *   node tools/fit/fetch-jpl-data.js --planet uranus       # single planet
 *   node tools/fit/fetch-jpl-data.js --start 1800 --end 2200 --step 30
 */

const fs = require('fs');
const path = require('path');
const jpl = require('../lib/horizons-client');
const C = require('../lib/constants');

const DATA_PATH = path.resolve(__dirname, '..', '..', 'data', 'reference-data.json');

// Parse arguments
const args = process.argv.slice(2);
function getArg(name, def) {
  const idx = args.indexOf('--' + name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : def;
}

const targetPlanet = getArg('planet', null);
const startYear = parseFloat(getArg('start', '1800'));
const endYear = parseFloat(getArg('end', '2200'));
const stepDays = parseFloat(getArg('step', '30'));  // monthly

// Target ~5000 points per planet over the date range.
// Step size computed from synodic period to ensure even orbital phase coverage.
// No elongation filter — all orbital phases included.
const TARGET_POINTS = 5000;

const allPlanets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const sparsePlanets = targetPlanet ? [targetPlanet] : allPlanets;

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  FETCH JPL HORIZONS REFERENCE DATA');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const refData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

  for (const planet of sparsePlanets) {
    const existing = refData.planets[planet] || [];
    const existingJDs = new Set(existing.map(e => e.jd));

    const validExisting = existing.filter(e => e.ra != null).length;
    console.log(`${planet}: ${validExisting} existing points`);

    // Compute step size to reach ~TARGET_POINTS over the date range
    const startJD = C.startmodelJD + (startYear - C.startmodelYear) * C.meanSolarYearDays;
    const endJD = C.startmodelJD + (endYear - C.startmodelYear) * C.meanSolarYearDays;
    const totalDays = endJD - startJD;
    const smartStepDays = totalDays / TARGET_POINTS;

    console.log(`  Target: ${TARGET_POINTS} pts → step ${smartStepDays.toFixed(0)}d (${(smartStepDays/365.25*12).toFixed(1)} months)`);

    // Generate JD list
    const newJDs = [];
    for (let jd = startJD; jd <= endJD; jd += smartStepDays) {
      const roundedJD = Math.round(jd * 100) / 100;
      if (!existingJDs.has(roundedJD)) {
        newJDs.push(roundedJD);
      }
    }

    console.log(`  Requesting ${newJDs.length} new points (${startYear}-${endYear}, step ${stepDays}d)...`);

    if (newJDs.length === 0) {
      console.log('  No new points needed.\n');
      continue;
    }

    // Fetch in batches
    const BATCH = 50;
    const fetched = [];
    for (let i = 0; i < newJDs.length; i += BATCH) {
      const batch = newJDs.slice(i, i + BATCH);
      const pct = Math.floor(i / newJDs.length * 100);
      process.stdout.write(`  Fetching ${i}/${newJDs.length} (${pct}%)...\r`);

      try {
        const positions = await jpl.getPositions(planet, batch);
        for (const pos of positions) {
          const yr = C.startmodelYear + (pos.jd - C.startmodelJD) / C.meanSolarYearDays;
          // Era-based tier and weight (Section 4.7 of docs/60)
          let tier, weight;
          if (yr >= 2000 && yr < 2100) {
            tier = '2A'; weight = 1.0;   // Modern era, highest JPL confidence
          } else if ((yr >= 1900 && yr < 2000) || (yr >= 2100 && yr < 2200)) {
            tier = '2B'; weight = 0.7;   // Near-modern, slight extrapolation
          } else {
            tier = '2C'; weight = 0.5;   // Historical, Delta-T uncertainty grows
          }
          fetched.push({
            jd: pos.jd,
            ra: pos.ra + '°',    // degrees with ° suffix (matches existing format)
            dec: pos.dec + '°',   // degrees with ° suffix
            weight,
            tier,
            label: 'JPL Horizons',
            year: yr,
          });
        }
      } catch (err) {
        console.log(`  Warning: batch at JD ${batch[0].toFixed(0)} failed: ${err.message}`);
      }
    }

    console.log(`  Fetched ${fetched.length} new points.                    `);

    // Merge with existing
    const merged = [...existing];
    const mergedJDs = new Set(existingJDs);
    for (const f of fetched) {
      if (!mergedJDs.has(f.jd)) {
        merged.push(f);
        mergedJDs.add(f.jd);
      }
    }
    merged.sort((a, b) => a.jd - b.jd);

    const validCount = merged.filter(e => e.ra != null && e.weight > 0).length;
    console.log(`  Total: ${validCount} valid points (was ${existing.filter(e => e.ra != null).length})\n`);

    refData.planets[planet] = merged;
  }

  // Write
  if (args.includes('--write')) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(refData, null, 2) + '\n');
    console.log('✓ Written to ' + DATA_PATH);
  } else {
    console.log('(dry run — add --write to update reference-data.json)');
  }
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
