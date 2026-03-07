#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// ENRICH WITH JPL — Query JPL Horizons for missing RA/Dec values in
//                    reference-data.json (Tier 2 entries only)
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_PATH = path.join(__dirname, '..', '..', 'config', 'reference-data.json');
const CACHE_PATH = path.join(__dirname, '..', '..', 'config', 'jpl-cache.json');

// JPL Horizons command codes for geocentric queries
const PLANET_CODES = {
  mercury: '199',
  venus: '299',
  mars: '499',
  jupiter: '599',
  saturn: '699',
  uranus: '799',
  neptune: '899',
};

// ═══════════════════════════════════════════════════════════════════════════
// 1. LOAD DATA AND CACHE
// ═══════════════════════════════════════════════════════════════════════════

const referenceData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

let cache = {};
if (fs.existsSync(CACHE_PATH)) {
  cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  console.log(`Loaded ${Object.keys(cache).length} cached JPL responses`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. IDENTIFY ENTRIES NEEDING ENRICHMENT
// ═══════════════════════════════════════════════════════════════════════════

const toEnrich = [];

for (const [planet, entries] of Object.entries(referenceData.planets)) {
  if (!PLANET_CODES[planet]) continue; // skip pluto, halleys, eros (no simple code)

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.tier !== 2) continue;

    const needsRa = e.dec && !e.ra;
    const needsBoth = e.longitude && e.longitude !== 'N/A' && !e.dec && !e.ra;
    const needsAll = !e.dec && !e.ra && (!e.longitude || e.longitude === 'N/A');

    if (needsRa || needsBoth || needsAll) {
      toEnrich.push({ planet, index: i, jd: e.jd, needsRa, needsBoth, needsAll });
    }
  }
}

console.log(`Found ${toEnrich.length} Tier 2 entries needing JPL enrichment`);
console.log(`  Needs RA only: ${toEnrich.filter(e => e.needsRa).length}`);
console.log(`  Needs RA+Dec: ${toEnrich.filter(e => e.needsBoth).length}`);
console.log(`  Needs all position: ${toEnrich.filter(e => e.needsAll).length}`);
console.log();

// ═══════════════════════════════════════════════════════════════════════════
// 3. JPL HORIZONS API QUERY
// ═══════════════════════════════════════════════════════════════════════════

function queryJPL(planetCode, jd) {
  const cacheKey = `${planetCode}_${jd}`;
  if (cache[cacheKey]) return Promise.resolve(cache[cacheKey]);

  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      format: 'json',
      COMMAND: `'${planetCode}'`,
      OBJ_DATA: "'NO'",
      MAKE_EPHEM: "'YES'",
      EPHEM_TYPE: "'OBSERVER'",
      CENTER: "'500@399'",
      TLIST: `'${jd}'`,
      QUANTITIES: "'1'",
      ANG_FORMAT: "'DEG'",
    });

    const url = `https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const result = json.result || '';

          // Parse between $$SOE and $$EOE
          const soeIdx = result.indexOf('$$SOE');
          const eoeIdx = result.indexOf('$$EOE');
          if (soeIdx === -1 || eoeIdx === -1) {
            reject(new Error(`No ephemeris data in response for ${planetCode} at JD ${jd}`));
            return;
          }

          const dataBlock = result.substring(soeIdx + 5, eoeIdx).trim();
          // Format: " 1802-Nov-09 09:36:00.000     226.55741 -17.46806"
          // RA and Dec are the last two whitespace-separated tokens
          const tokens = dataBlock.trim().split(/\s+/);
          const ra = parseFloat(tokens[tokens.length - 2]);
          const dec = parseFloat(tokens[tokens.length - 1]);

          if (isNaN(ra) || isNaN(dec)) {
            reject(new Error(`Could not extract RA/Dec from JPL response for ${planetCode} at JD ${jd}: ${dataBlock}`));
            return;
          }

          const parsed = { ra, dec };
          cache[cacheKey] = parsed;
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. RUN ENRICHMENT
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  let enriched = 0;
  let errors = 0;
  let cached = 0;
  const total = toEnrich.length;

  for (let idx = 0; idx < toEnrich.length; idx++) {
    const item = toEnrich[idx];
    const planetCode = PLANET_CODES[item.planet];
    const cacheKey = `${planetCode}_${item.jd}`;
    const isCached = !!cache[cacheKey];

    try {
      const result = await queryJPL(planetCode, item.jd);
      const entry = referenceData.planets[item.planet][item.index];

      // Add JPL RA (formatted as decimal degrees string)
      entry.ra_jpl = result.ra.toFixed(5);
      if (!entry.ra) {
        entry.ra = result.ra.toFixed(5) + '°';
      }

      // Add JPL Dec if missing
      if (!entry.dec) {
        entry.dec_jpl = result.dec.toFixed(5);
        entry.dec = result.dec.toFixed(5) + '°';
      }

      entry.jpl_enriched = true;

      if (isCached) {
        cached++;
      } else {
        enriched++;
        // Save cache after each new API call
        fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
      }

      // Progress
      if ((idx + 1) % 25 === 0 || idx === total - 1) {
        console.log(`  Progress: ${idx + 1}/${total} (${enriched} new, ${cached} cached, ${errors} errors)`);
      }

      // Rate limit: ~1 request/second for new API calls only
      if (!isCached) {
        await sleep(1000);
      }
    } catch (err) {
      errors++;
      console.error(`  ERROR: ${item.planet} JD ${item.jd}: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. SAVE ENRICHED DATA
  // ═══════════════════════════════════════════════════════════════════════════

  // Update metadata
  referenceData._meta.jplEnrichment = {
    enrichedAt: new Date().toISOString(),
    totalEnriched: enriched + cached,
    newApiCalls: enriched,
    fromCache: cached,
    errors: errors,
    source: 'JPL Horizons API (geocentric, astrometric RA/Dec in decimal degrees)',
    center: '500@399 (geocenter)',
    quantities: "1 (astrometric RA/Dec)",
    angFormat: 'DEG',
  };

  fs.writeFileSync(DATA_PATH, JSON.stringify(referenceData, null, 2));
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. REPORT
  // ═══════════════════════════════════════════════════════════════════════════

  console.log();
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  JPL ENRICHMENT — Summary');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log();
  console.log(`  Total processed: ${total}`);
  console.log(`  New API calls:   ${enriched}`);
  console.log(`  From cache:      ${cached}`);
  console.log(`  Errors:          ${errors}`);
  console.log();

  // Count enrichment by planet
  for (const [planet, entries] of Object.entries(referenceData.planets)) {
    const jplCount = entries.filter(e => e.jpl_enriched).length;
    if (jplCount > 0) {
      console.log(`  ${planet}: ${jplCount} entries enriched`);
    }
  }

  // Count total RA coverage now
  let totalEntries = 0, withRa = 0, withDec = 0;
  for (const entries of Object.values(referenceData.planets)) {
    for (const e of entries) {
      totalEntries++;
      if (e.ra) withRa++;
      if (e.dec) withDec++;
    }
  }

  console.log();
  console.log(`  RA coverage:  ${withRa}/${totalEntries} (${(withRa/totalEntries*100).toFixed(1)}%)`);
  console.log(`  Dec coverage: ${withDec}/${totalEntries} (${(withDec/totalEntries*100).toFixed(1)}%)`);
  console.log();
  console.log(`  Output: ${DATA_PATH}`);
  console.log(`  Cache:  ${CACHE_PATH}`);
  console.log();
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
