#!/usr/bin/env node
/**
 * Reclassify reference data tiers based on observability and era.
 *
 * Tasks:
 *   1. Reclassify occultations by elongation (observable?) and era
 *   2. Reclassify Mercury transits (observed events, not Tier 3)
 *   3. Integrate Tycho Brahe Mars declinations (923 entries)
 *   4. Fix Venus legacy entry
 *   5. Promote Jupiter-Saturn 2020 conjunction to Tier 1A
 *   6. Reclassify future Mars oppositions
 *
 * Usage:
 *   node tools/fit/reclassify-tiers.js           # dry run
 *   node tools/fit/reclassify-tiers.js --write   # update reference-data.json
 */

const fs = require('fs');
const path = require('path');
const SG = require('../lib/scene-graph');
const C = require('../lib/constants');
const { ofDateToJ2000 } = require('../lib/precession');

const DATA_PATH = path.resolve(__dirname, '..', '..', 'data', 'reference-data.json');
const refData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

const changes = { occultations: 0, occUnobservable: 0, mercuryTransits: 0, venusTransits: 0, transitRA: 0, tycho: 0, venusLegacy: 0, jupSat2020: 0, marsOppositions: 0 };

console.log('═══════════════════════════════════════════════════════════════');
console.log('  TIER RECLASSIFICATION');
console.log('═══════════════════════════════════════════════════════════════\n');

// ─── Helper: compute elongation from Sun ────────────────────────────────

function computeElongation(planet, jd) {
  try {
    const pPos = SG.computePlanetPosition(planet, jd);
    const sPos = SG.computePlanetPosition('sun', jd);
    const pRA = SG.thetaToRaDeg(pPos.ra);
    const sRA = SG.thetaToRaDeg(sPos.ra);
    let elong = pRA - sRA;
    if (elong > 180) elong -= 360;
    if (elong < -180) elong += 360;
    return elong;
  } catch (e) {
    return null;
  }
}

function getYear(e) {
  return e.year || e.calendarYear || C.startmodelYear + (e.jd - C.startmodelJD) / C.meanSolarYearDays;
}

// ─── Task 1: Reclassify Occultations ────────────────────────────────────

console.log('─── 1. Occultations ───\n');

for (const planet of Object.keys(refData.planets)) {
  for (const e of refData.planets[planet]) {
    if (!(e.label || '').includes('Occultation')) continue;

    const yr = getYear(e);
    const elong = computeElongation(planet, e.jd);
    const isObservable = elong !== null && Math.abs(elong) >= 15;

    const oldTier = e.tier;
    const oldWeight = e.weight;

    if (!isObservable) {
      e.tier = '3';
      e.weight = 0;
      if (oldTier !== '3' || oldWeight !== 0) changes.occUnobservable++;
    } else if (yr < 1600) {
      e.tier = '1D';
      e.weight = 3;
      e.dateReliable = true;
      changes.occultations++;
    } else if (yr < 1900) {
      e.tier = '1B';
      e.weight = 7;
      e.dateReliable = true;
      changes.occultations++;
    } else if (yr <= 2100) {
      e.tier = '1A';
      e.weight = 10;
      e.dateReliable = true;
      changes.occultations++;
    } else {
      e.tier = '2B';
      e.weight = 0.7;
      e.dateReliable = false;
      changes.occultations++;
    }

    if (oldTier !== e.tier) {
      console.log(`  ${planet.padEnd(8)} ${yr.toFixed(0).padStart(5)} elong=${elong !== null ? elong.toFixed(0).padStart(4) + '°' : ' N/A '} tier ${oldTier}→${e.tier} w=${e.weight}`);
    }
  }
}
console.log(`  Reclassified: ${changes.occultations} observable, ${changes.occUnobservable} kept unobservable\n`);

// ─── Task 2: Mercury Transits ───────────────────────────────────────────

console.log('─── 2. Mercury Transits ───\n');

const mercuryEntries = refData.planets.mercury || [];
for (const e of mercuryEntries) {
  if ((e.label || '') !== 'NASA date') continue;
  if (e.ra != null) continue; // skip enriched entries, these are Tier 2 JPL data

  const yr = getYear(e);
  const oldTier = e.tier;

  if (yr < 1631) {
    e.tier = '3';
    e.weight = 0;
  } else if (yr <= 2025) {
    e.tier = '1B';
    e.weight = 7;
    e.dateReliable = true;
    e.positionReliable = false;
    changes.mercuryTransits++;
  } else {
    e.tier = '2B';
    e.weight = 0.7;
    e.dateReliable = false;
    e.positionReliable = false;
    changes.mercuryTransits++;
  }

  if (oldTier !== e.tier) {
    console.log(`  ${yr.toFixed(0).padStart(5)} tier ${oldTier}→${e.tier} w=${e.weight}`);
  }
}
console.log(`  Mercury transits reclassified: ${changes.mercuryTransits}\n`);

// ─── Task 2b: Venus Transits ─────────────────────────────────────────

console.log('─── 2b. Venus Transits ───\n');

const venusEntries = refData.planets.venus || [];
for (const e of venusEntries) {
  if ((e.label || '') !== 'NASA date') continue;

  const yr = getYear(e);
  const oldTier = e.tier;

  // 1639: first observed transit (Horrocks). 1631 predicted but not observed.
  // 1761, 1769: international expeditions. 1874, 1882: photographed. 2004, 2012: modern.
  if (yr < 1639) {
    e.tier = '3';
    e.weight = 0;
  } else if (yr < 1900) {
    e.tier = '1B';
    e.weight = 7;
    e.dateReliable = true;
    e.positionReliable = false;
    changes.venusTransits++;
  } else if (yr <= 2025) {
    e.tier = '1A';
    e.weight = 10;
    e.dateReliable = true;
    e.positionReliable = false;
    changes.venusTransits++;
  } else {
    e.tier = '2B';
    e.weight = 0.7;
    e.dateReliable = false;
    e.positionReliable = false;
    changes.venusTransits++;
  }

  if (oldTier !== e.tier) {
    console.log(`  ${yr.toFixed(0).padStart(5)} tier ${oldTier}→${e.tier} w=${e.weight}`);
  }
}
console.log(`  Venus transits reclassified: ${changes.venusTransits}\n`);

// ─── Task 3: Integrate Tycho Brahe Mars ─────────────────────────────────

console.log('─── 3. Tycho Brahe Mars ───\n');

const tychoData = refData.tier1_observations && refData.tier1_observations.tycho_mars;
if (tychoData && tychoData.entries && tychoData.entries.length > 0) {
  const marsEntries = refData.planets.mars || [];
  const existingJDs = new Set(marsEntries.map(e => e.jd));

  let added = 0;
  for (const e of tychoData.entries) {
    if (existingJDs.has(e.jd)) continue;
    marsEntries.push(e);
    added++;
  }

  // Sort by JD
  marsEntries.sort((a, b) => a.jd - b.jd);
  refData.planets.mars = marsEntries;
  changes.tycho = added;
  console.log(`  Added ${added} Tycho Brahe Mars declinations (tier 1C, weight 5)`);
  console.log(`  Mars total: ${marsEntries.length} entries\n`);
} else {
  console.log('  No Tycho Brahe data found in tier1_observations\n');
}

// ─── Task 4: Fix Venus Legacy Entry ─────────────────────────────────────

console.log('─── 4. Venus Legacy Entry ───\n');

for (const e of (refData.planets.venus || [])) {
  if (e.tier === '2' || e.tier === 2) {
    if (e.weight === 0 || e.weight === undefined) {
      const yr = getYear(e);
      if (yr >= 2000 && yr < 2100) {
        e.tier = '2A';
        e.weight = 1;
      } else {
        e.tier = '2B';
        e.weight = 0.7;
      }
      changes.venusLegacy++;
      console.log(`  Fixed: jd=${e.jd} tier 2→${e.tier} w=${e.weight}`);
    }
  }
}
if (changes.venusLegacy === 0) console.log('  No legacy entries found');
console.log('');

// ─── Task 5: Jupiter-Saturn 2020 Conjunction ────────────────────────────

console.log('─── 5. Jupiter-Saturn 2020 Conjunction ───\n');

for (const e of (refData.planets.saturn || [])) {
  const yr = getYear(e);
  if (yr >= 2020.9 && yr <= 2021.1 && (e.notes || '').toLowerCase().includes('jupiter')) {
    const oldTier = e.tier;
    e.tier = '1A';
    e.weight = 10;
    e.dateReliable = true;
    e.notes = (e.notes || '') + ' — globally observed Dec 21, 2020';
    changes.jupSat2020++;
    console.log(`  Saturn entry at ${yr.toFixed(2)}: tier ${oldTier}→1A w=10 (Great Conjunction)`);
  }
}
// Also check Jupiter side
for (const e of (refData.planets.jupiter || [])) {
  const yr = getYear(e);
  if (yr >= 2020.9 && yr <= 2021.1 && (e.notes || '').toLowerCase().includes('saturn')) {
    const oldTier = e.tier;
    e.tier = '1A';
    e.weight = 10;
    e.dateReliable = true;
    e.notes = (e.notes || '') + ' — globally observed Dec 21, 2020';
    changes.jupSat2020++;
    console.log(`  Jupiter entry at ${yr.toFixed(2)}: tier ${oldTier}→1A w=10 (Great Conjunction)`);
  }
}
if (changes.jupSat2020 === 0) console.log('  No 2020 conjunction entries found');
console.log('');

// ─── Task 6: Future Mars Oppositions ────────────────────────────────────

console.log('─── 6. Future Mars Oppositions ───\n');

for (const e of (refData.planets.mars || [])) {
  if ((e.label || '').includes('Opposition') && (e.tier === '3' || e.tier === 3)) {
    const yr = getYear(e);
    if (yr > 2100) {
      e.tier = '2C';
      e.weight = 0.5;
      e.dateReliable = false;
      e.positionReliable = false;
      changes.marsOppositions++;
    }
  }
}
console.log(`  Future Mars oppositions reclassified: ${changes.marsOppositions}\n`);

// ─── Task 7: Enrich Tier 1 RA/Dec from JPL Horizons ─────────────────

// JPL Horizons available from ~1600 AD (JD 2305448). Post-1600 entries
// get independent JPL positions. Pre-1600 entries keep date-only or
// dec-only constraints (no model-computed RA — that would be circular).

const JPL_CUTOFF_JD = 2305448; // ~1600.0 AD
const jpl = require('../lib/horizons-client');

async function enrichTier1WithJPL() {
  console.log('─── 7. Enrich Tier 1 RA/Dec from JPL Horizons ───\n');

  const enrichPlanets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

  for (const planet of enrichPlanets) {
    const entries = refData.planets[planet] || [];

    // Collect Tier 1 entries that need JPL RA/Dec (post-1600, no existing JPL RA)
    const toFetch = [];
    for (const e of entries) {
      if (!(e.tier || '').startsWith('1')) continue;
      if (e.weight === 0) continue;
      if (e.ra != null && !e.positionSource) continue; // already has independent RA
      if (e.jd < JPL_CUTOFF_JD) continue; // pre-1600: JPL unavailable

      toFetch.push(e);
    }

    if (toFetch.length === 0) continue;

    // Fetch from JPL in batches
    const BATCH = 50;
    let fetched = 0;
    for (let i = 0; i < toFetch.length; i += BATCH) {
      const batch = toFetch.slice(i, i + BATCH);
      const jds = batch.map(e => e.jd);

      try {
        const positions = await jpl.getPositions(planet, jds);
        for (let j = 0; j < positions.length; j++) {
          const e = batch[j];
          const pos = positions[j];
          const yr = getYear(e);
          const eventType = (e.label || '').includes('Occultation') ? 'occultn' :
                           (e.label || '') === 'NASA date' ? 'transit' : 'other';

          e.ra = pos.ra.toFixed(5) + '°';
          e.dec = pos.dec.toFixed(5) + '°';
          e.positionReliable = true;
          e.positionSource = 'JPL Horizons (J2000)';
          changes.transitRA++;
          fetched++;

          console.log(`  ${planet.padEnd(8)} ${yr.toFixed(0).padStart(5)} ${eventType.padEnd(8)} RA=${pos.ra.toFixed(3).padStart(8)}° Dec=${pos.dec.toFixed(3).padStart(7)}° tier=${e.tier}`);
        }
      } catch (err) {
        // Batch failed (likely some JDs out of range). Try individually.
        for (let j = 0; j < batch.length; j++) {
          try {
            const [pos] = await jpl.getPositions(planet, [batch[j].jd]);
            const e = batch[j];
            const yr = getYear(e);
            const eventType = (e.label || '').includes('Occultation') ? 'occultn' :
                             (e.label || '') === 'NASA date' ? 'transit' : 'other';
            e.ra = pos.ra.toFixed(5) + '°';
            e.dec = pos.dec.toFixed(5) + '°';
            e.positionReliable = true;
            e.positionSource = 'JPL Horizons (J2000)';
            changes.transitRA++;
            fetched++;
            console.log(`  ${planet.padEnd(8)} ${yr.toFixed(0).padStart(5)} ${eventType.padEnd(8)} RA=${pos.ra.toFixed(3).padStart(8)}° Dec=${pos.dec.toFixed(3).padStart(7)}° tier=${e.tier}`);
          } catch (e2) {
            const yr = getYear(batch[j]);
            console.log(`  ${planet.padEnd(8)} ${yr.toFixed(0).padStart(5)} SKIP (JPL unavailable)`);
          }
        }
      }
    }

    if (fetched > 0) {
      console.log(`  ${planet}: ${fetched} entries enriched from JPL`);
    }
  }

  // Remove model-computed RA from pre-1600 entries (circular reference)
  let removed = 0;
  for (const planet of enrichPlanets) {
    for (const e of (refData.planets[planet] || [])) {
      if (e.positionSource && e.positionSource.includes('model')) {
        delete e.ra;
        delete e.dec;
        delete e.positionSource;
        e.positionReliable = false;
        removed++;
      }
    }
  }
  if (removed > 0) {
    console.log(`\n  Removed ${removed} model-computed RA/Dec (circular reference)`);
  }

  console.log(`  Total Tier 1 entries enriched from JPL: ${changes.transitRA}\n`);
}

// Wrap remaining tasks in async main (JPL fetch is async)
async function main() {
await enrichTier1WithJPL();

// ─── Summary ────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════');
console.log('  SUMMARY');
console.log('═══════════════════════════════════════════════════════════════\n');

// Count new tier distribution
const tierCount = {};
for (const [planet, entries] of Object.entries(refData.planets)) {
  for (const e of entries) {
    const t = e.tier || '?';
    tierCount[t] = (tierCount[t] || 0) + 1;
  }
}

console.log('Tier distribution after reclassification:');
for (const [t, count] of Object.entries(tierCount).sort()) {
  console.log(`  Tier ${t.padEnd(4)}: ${String(count).padStart(6)} entries`);
}

// Tier 1 RA coverage
console.log('\nTier 1 RA/Dec coverage:');
for (const planet of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
  const t1 = (refData.planets[planet] || []).filter(e => (e.tier || '').startsWith('1'));
  const withRA = t1.filter(e => e.ra != null);
  const decOnly = t1.filter(e => e.ra == null && e.dec != null);
  const dateOnly = t1.filter(e => e.ra == null && e.dec == null);
  if (t1.length === 0) continue;
  console.log(`  ${planet.padEnd(10)} T1=${String(t1.length).padStart(4)}  RA/Dec=${String(withRA.length).padStart(3)}  dec-only=${String(decOnly.length).padStart(4)}  date-only=${String(dateOnly.length).padStart(3)}`);
}

const totalChanges = Object.values(changes).reduce((s, v) => s + v, 0);
console.log(`\nTotal changes: ${totalChanges}`);
console.log(`  Occultations reclassified: ${changes.occultations} (${changes.occUnobservable} kept unobservable)`);
console.log(`  Mercury transits: ${changes.mercuryTransits}`);
console.log(`  Venus transits: ${changes.venusTransits}`);
console.log(`  Tier 1 RA/Dec from JPL: ${changes.transitRA}`);
console.log(`  Tycho Brahe Mars added: ${changes.tycho}`);
console.log(`  Venus legacy fixed: ${changes.venusLegacy}`);
console.log(`  Jupiter-Saturn 2020: ${changes.jupSat2020}`);
console.log(`  Mars future oppositions: ${changes.marsOppositions}`);

// ─── Write ──────────────────────────────────────────────────────────────

if (process.argv.includes('--write')) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(refData, null, 2) + '\n');
  jpl.saveCache && jpl.saveCache();
  console.log('\n✓ Written to ' + DATA_PATH);
} else {
  console.log('\n  (dry run — add --write to update reference-data.json)');
}
} // end main()

main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
