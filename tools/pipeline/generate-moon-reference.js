#!/usr/bin/env node
// Generate Moon reference data from JPL Horizons and add to reference-data.json
//
// The Moon moves ~13°/day, so we need denser sampling than planets.
// Strategy: every 3 days over 2000-2050 (50 years) = ~6083 points
// This covers multiple nodal cycles (18.6 yr) and anomalistic cycles (8.85 yr).
//
// Usage: node tools/pipeline/generate-moon-reference.js

const jpl = require('../lib/horizons-client');
const C = require('../lib/constants');
const fs = require('fs');
const path = require('path');

const REF_PATH = path.join(__dirname, '..', '..', 'config', 'reference-data.json');

async function generate() {
  // Generate JD list: every 3 days from 2000.0 to 2050.0
  const startJD = C.startmodelJD;  // J2000
  const endJD = startJD + 50 * 365.25;  // 50 years
  const step = 3;  // days

  const jdList = [];
  for (let jd = startJD; jd <= endJD; jd += step) {
    jdList.push(parseFloat(jd.toFixed(1)));
  }

  console.log(`Generating ${jdList.length} Moon reference points (every ${step} days, 2000-2050)...`);

  // Fetch from JPL in batches (horizons-client handles batching at 50)
  const positions = await jpl.getPositions('moon', jdList);

  console.log(`Fetched ${positions.length} positions from JPL Horizons`);

  // Convert to reference-data format
  const moonEntries = positions.map(p => ({
    jd: p.jd,
    ra: p.ra.toFixed(6) + '°',
    dec: p.dec.toFixed(6),
    type: 'position',
    label: 'JPL Horizons',
    tier: 2,
    weight: 1,
    source: 'JPL Horizons API (geocentric, astrometric RA/Dec in decimal degrees)',
    calendarYear: parseFloat((C.startmodelYear + (p.jd - C.startmodelJD) / C.meanSolarYearDays).toFixed(3)),
  }));

  // Load existing reference data
  const refData = JSON.parse(fs.readFileSync(REF_PATH, 'utf-8'));

  // Add moon to planets
  refData.planets.moon = moonEntries;

  // Update metadata
  const totalEntries = Object.values(refData.planets).reduce((sum, arr) => sum + arr.length, 0);
  refData._meta.totalEntries = totalEntries;
  refData._meta.moonGeneration = {
    generatedAt: new Date().toISOString(),
    points: moonEntries.length,
    stepDays: step,
    rangeYears: '2000-2050',
    source: 'JPL Horizons API (target 301, geocentric)',
  };

  // Write back
  fs.writeFileSync(REF_PATH, JSON.stringify(refData, null, 2));

  console.log(`\nWrote ${moonEntries.length} Moon entries to reference-data.json`);
  console.log(`Total entries in file: ${totalEntries}`);

  // Show sample
  console.log('\nFirst 5 entries:');
  for (const e of moonEntries.slice(0, 5)) {
    console.log(`  JD ${e.jd}  (${e.calendarYear})  RA=${e.ra}°  Dec=${e.dec}°`);
  }
  console.log('\nLast 5 entries:');
  for (const e of moonEntries.slice(-5)) {
    console.log(`  JD ${e.jd}  (${e.calendarYear})  RA=${e.ra}°  Dec=${e.dec}°`);
  }
}

generate().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
