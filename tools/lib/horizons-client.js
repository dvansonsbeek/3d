// ═══════════════════════════════════════════════════════════════════════════
// JPL HORIZONS CLIENT — Fetch geocentric astrometric RA/Dec from JPL
//
// Usage:
//   const jpl = require('./horizons-client');
//   const pos = await jpl.getPosition('mars', 2451716.5);
//   // → { ra: 93.291, dec: 24.061 }  (degrees)
//
//   const positions = await jpl.getPositions('mars', [2451716.5, 2455000.5]);
//   // → [{ jd, ra, dec }, ...]
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, '..', '..', 'data', 'jpl-cache.json');

// JPL Horizons target body codes (geocentric observer)
const TARGET_CODES = {
  mercury: '199',
  venus:   '299',
  mars:    '499',
  jupiter: '599',
  saturn:  '699',
  uranus:  '799',
  neptune: '899',
  sun:     '10',
  moon:    '301',
};

// Rate limit: minimum ms between API calls
const RATE_LIMIT_MS = 200;
let lastCallTime = 0;

// ═══════════════════════════════════════════════════════════════════════════
// DISK CACHE
// ═══════════════════════════════════════════════════════════════════════════

let _cache = null;
let _cacheDirty = false;

function loadCache() {
  if (_cache) return _cache;
  try {
    _cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  } catch {
    _cache = {};
  }
  return _cache;
}

function saveCache() {
  if (!_cacheDirty) return;
  fs.writeFileSync(CACHE_PATH, JSON.stringify(_cache, null, 2));
  _cacheDirty = false;
}

function cacheKey(targetCode, jd) {
  return `${targetCode}_${jd}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// JPL API
// ═══════════════════════════════════════════════════════════════════════════

async function rateLimitWait() {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastCallTime = Date.now();
}

/**
 * Query JPL Horizons for one or more Julian Dates.
 * Returns parsed RA/Dec pairs from the $$SOE..$$EOE block.
 *
 * @param {string} targetCode - JPL body code (e.g. '499')
 * @param {number[]} jdList - array of Julian Day numbers
 * @returns {Promise<Array<{jd: number, ra: number, dec: number}>>}
 */
async function queryAPI(targetCode, jdList) {
  await rateLimitWait();

  const params = new URLSearchParams({
    format: 'json',
    COMMAND: `'${targetCode}'`,
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'",
    CENTER: "'500@399'",
    TLIST: `'${jdList.join(",")}'`,
    QUANTITIES: "'1'",
    ANG_FORMAT: "'DEG'",
  });

  const url = `https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`JPL API HTTP ${res.status}: ${res.statusText}`);

  const json = await res.json();
  const result = json.result || '';

  const soeIdx = result.indexOf('$$SOE');
  const eoeIdx = result.indexOf('$$EOE');
  if (soeIdx === -1 || eoeIdx === -1) {
    throw new Error(`No ephemeris data in JPL response for ${targetCode}`);
  }

  const dataBlock = result.substring(soeIdx + 5, eoeIdx).trim();
  const lines = dataBlock.split('\n').filter(l => l.trim());

  const results = [];
  for (let i = 0; i < lines.length; i++) {
    // Format: " 2451716.500000000     93.29113  24.06143"
    // or:     " 2451716.500000000  A.D. 2000-Jun-21 00:00:00.0000     93.29113  24.06143"
    const tokens = lines[i].trim().split(/\s+/);
    const ra = parseFloat(tokens[tokens.length - 2]);
    const dec = parseFloat(tokens[tokens.length - 1]);
    if (isNaN(ra) || isNaN(dec)) {
      throw new Error(`Could not parse RA/Dec from JPL line: ${lines[i]}`);
    }
    results.push({ jd: jdList[i], ra, dec });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get geocentric astrometric RA/Dec for a single target at a single JD.
 * Uses cache when available, queries JPL otherwise.
 *
 * @param {string} target - planet name ('mercury', 'venus', 'mars', etc.)
 * @param {number} jd - Julian Day number
 * @returns {Promise<{ra: number, dec: number}>} RA/Dec in degrees
 */
async function getPosition(target, jd) {
  const code = TARGET_CODES[target];
  if (!code) throw new Error(`Unknown target: ${target}`);

  const cache = loadCache();
  const key = cacheKey(code, jd);
  if (cache[key]) return cache[key];

  const results = await queryAPI(code, [jd]);
  const pos = { ra: results[0].ra, dec: results[0].dec };
  cache[key] = pos;
  _cacheDirty = true;
  saveCache();
  return pos;
}

/**
 * Get geocentric astrometric RA/Dec for a target at multiple JDs.
 * Batches uncached dates into API calls (max 50 per call).
 *
 * @param {string} target - planet name
 * @param {number[]} jdList - array of Julian Day numbers
 * @returns {Promise<Array<{jd: number, ra: number, dec: number}>>}
 */
async function getPositions(target, jdList) {
  const code = TARGET_CODES[target];
  if (!code) throw new Error(`Unknown target: ${target}`);

  const cache = loadCache();
  const results = [];
  const uncached = [];

  for (const jd of jdList) {
    const key = cacheKey(code, jd);
    if (cache[key]) {
      results.push({ jd, ...cache[key] });
    } else {
      uncached.push(jd);
    }
  }

  // Batch uncached in groups of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
    const batch = uncached.slice(i, i + BATCH_SIZE);
    const fetched = await queryAPI(code, batch);
    for (const pos of fetched) {
      const key = cacheKey(code, pos.jd);
      cache[key] = { ra: pos.ra, dec: pos.dec };
      _cacheDirty = true;
      results.push(pos);
    }
  }

  saveCache();

  // Return in original JD order
  const jdOrder = new Map(jdList.map((jd, i) => [jd, i]));
  results.sort((a, b) => jdOrder.get(a.jd) - jdOrder.get(b.jd));
  return results;
}

module.exports = {
  getPosition,
  getPositions,
  TARGET_CODES,
};
