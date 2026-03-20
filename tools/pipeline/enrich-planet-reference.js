#!/usr/bin/env node
// Enrich reference-data.json with dense JPL Horizons reference points for specified planets.
//
// Generates RA/Dec every 30 days from 2000-2200 (200 years) = ~2433 points per planet.
// Merges with existing data, skipping duplicate JDs.
//
// Usage: node tools/pipeline/enrich-planet-reference.js venus jupiter saturn

const jpl = require('../lib/horizons-client');
const C = require('../lib/constants');
const fs = require('fs');
const path = require('path');

const REF_PATH = path.join(__dirname, '..', '..', 'data', 'reference-data.json');

const VALID_PLANETS = Object.keys(jpl.TARGET_CODES).filter(k => k !== 'sun' && k !== 'moon');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** Fetch positions with retry logic — tolerates transient JPL API failures. */
async function fetchWithRetry(planetName, jdList) {
  const BATCH_SIZE = 50;
  const allPositions = [];
  let batchNum = 0;
  const totalBatches = Math.ceil(jdList.length / BATCH_SIZE);

  for (let i = 0; i < jdList.length; i += BATCH_SIZE) {
    batchNum++;
    const batch = jdList.slice(i, i + BATCH_SIZE);
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const positions = await jpl.getPositions(planetName, batch);
        allPositions.push(...positions);
        if (batchNum % 10 === 0 || batchNum === totalBatches) {
          process.stdout.write(`  Batch ${batchNum}/${totalBatches} (${allPositions.length} fetched)\n`);
        }
        break;
      } catch (err) {
        console.warn(`  Batch ${batchNum}/${totalBatches} attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * attempt);
        } else {
          // Fall back to individual fetches — some JDs may be beyond ephemeris range
          console.warn(`  Falling back to individual fetches for batch ${batchNum}...`);
          for (const jd of batch) {
            try {
              const pos = await jpl.getPosition(planetName, jd);
              allPositions.push({ jd, ...pos });
            } catch {
              console.warn(`  JD ${jd} unavailable (likely beyond ephemeris range)`);
            }
          }
        }
      }
    }
  }

  return allPositions;
}

async function enrichPlanet(planetName, refData) {
  if (!jpl.TARGET_CODES[planetName]) {
    throw new Error(`Unknown planet: ${planetName}. Valid: ${VALID_PLANETS.join(', ')}`);
  }

  // Generate JD list: every 30 days from 2000.0 to 2200.0
  const startJD = C.startmodelJD;  // J2000.5
  const endJD = startJD + 200 * 365.25;  // 200 years
  const step = 30;  // days

  const jdList = [];
  for (let jd = startJD; jd <= endJD; jd += step) {
    jdList.push(parseFloat(jd.toFixed(1)));
  }

  // Collect existing JDs for this planet to avoid duplicates
  const existing = refData.planets[planetName] || [];
  const existingJDs = new Set(existing.map(e => e.jd));

  const newJDs = jdList.filter(jd => !existingJDs.has(jd));

  console.log(`\n${planetName}: ${jdList.length} total JDs, ${existingJDs.size} existing, ${newJDs.length} new to fetch`);

  if (newJDs.length === 0) {
    console.log(`  Skipping ${planetName} — all points already exist`);
    return 0;
  }

  // Fetch from JPL with retry logic
  const positions = await fetchWithRetry(planetName, newJDs);
  console.log(`  Fetched ${positions.length} positions from JPL Horizons`);

  // Convert to reference-data format
  const newEntries = positions.map(p => ({
    jd: p.jd,
    ra: p.ra.toFixed(5) + '°',
    dec: p.dec.toFixed(5),
    type: 'position',
    label: 'JPL Horizons',
    tier: 2,
    weight: 1,
    source: 'JPL Horizons API (geocentric, astrometric RA/Dec in decimal degrees)',
    calendarYear: parseFloat((C.startmodelYear + (p.jd - C.startmodelJD) / C.meanSolarYearDays).toFixed(3)),
  }));

  // Merge: combine existing + new, then sort by JD
  const merged = [...existing, ...newEntries];
  merged.sort((a, b) => a.jd - b.jd);
  refData.planets[planetName] = merged;

  console.log(`  Added ${newEntries.length} new points (total: ${merged.length})`);

  return newEntries.length;
}

async function main() {
  const args = process.argv.slice(2).map(a => a.toLowerCase());

  if (args.length === 0) {
    console.log('Usage: node tools/pipeline/enrich-planet-reference.js <planet1> [planet2] ...');
    console.log(`Valid planets: ${VALID_PLANETS.join(', ')}`);
    process.exit(1);
  }

  // Validate all planet names before starting
  for (const name of args) {
    if (!jpl.TARGET_CODES[name]) {
      console.error(`Unknown planet: ${name}. Valid: ${VALID_PLANETS.join(', ')}`);
      process.exit(1);
    }
  }

  // Load existing reference data
  const refData = JSON.parse(fs.readFileSync(REF_PATH, 'utf-8'));

  let totalAdded = 0;

  for (const planetName of args) {
    const added = await enrichPlanet(planetName, refData);
    totalAdded += added;
  }

  // Update metadata
  const totalEntries = Object.values(refData.planets).reduce((sum, arr) => sum + arr.length, 0);
  refData._meta.totalEntries = totalEntries;
  refData._meta.planetEnrichment = refData._meta.planetEnrichment || {};
  for (const planetName of args) {
    refData._meta.planetEnrichment[planetName] = {
      generatedAt: new Date().toISOString(),
      points: refData.planets[planetName].length,
      stepDays: 30,
      rangeYears: '2000-2200',
      source: `JPL Horizons API (target ${jpl.TARGET_CODES[planetName]}, geocentric)`,
    };
  }

  // Write back
  fs.writeFileSync(REF_PATH, JSON.stringify(refData, null, 2));

  console.log(`\n=== Summary ===`);
  console.log(`Total new points added: ${totalAdded}`);
  console.log(`Total entries in file: ${totalEntries}`);

  // Show samples for each planet
  for (const planetName of args) {
    const entries = refData.planets[planetName];
    const tier2 = entries.filter(e => e.label === 'JPL Horizons');
    console.log(`\n${planetName}: ${tier2.length} JPL Horizons points (${entries.length} total)`);
    if (tier2.length > 0) {
      console.log('  First: JD', tier2[0].jd, `(${tier2[0].calendarYear})`, `RA=${tier2[0].ra}`, `Dec=${tier2[0].dec}`);
      console.log('  Last:  JD', tier2[tier2.length - 1].jd, `(${tier2[tier2.length - 1].calendarYear})`, `RA=${tier2[tier2.length - 1].ra}`, `Dec=${tier2[tier2.length - 1].dec}`);
    }
  }
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
