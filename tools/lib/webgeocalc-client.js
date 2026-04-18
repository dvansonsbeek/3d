// ═══════════════════════════════════════════════════════════════════════════
// WebGeoCalc API Client — NAIF SPICE web calculator
//
// Endpoint: https://wgc2.jpl.nasa.gov:8443/webgeocalc/api/
// Calculation types: OSCULATING_ELEMENTS, STATE_VECTOR, ANGULAR_SEPARATION, etc.
//
// Docs: https://wgc2.jpl.nasa.gov:8443/webgeocalc/documents/api-info.html
//       https://webgeocalc.readthedocs.io/
//
// Usage:
//   const wgc = require('./webgeocalc-client');
//   const result = await wgc.osculatingElements({
//     orbitingBody: 'MERCURY',
//     centerBody: 'SUN',
//     times: ['1900-01-01T00:00:00.000', '2000-01-01T00:00:00.000'],
//     kernelSetId: 1,
//   });
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const API_BASE = 'https://wgc2.jpl.nasa.gov:8443/webgeocalc/api';

// Disk cache (separate from Horizons cache)
const CACHE_PATH = path.join(__dirname, '..', '..', 'data', 'webgeocalc-cache.json');
let _cache = null;

function loadCache() {
  if (_cache) return _cache;
  try { _cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8')); }
  catch { _cache = {}; }
  return _cache;
}
function saveCache() {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(_cache, null, 2));
}

// Rate limit
const RATE_LIMIT_MS = 300;
let lastCallTime = 0;
async function rateLimitWait() {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < RATE_LIMIT_MS) await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed));
  lastCallTime = Date.now();
}

/**
 * List available kernel sets on WGC.
 * Returns array of { id, caption } describing what's available.
 */
async function listKernelSets() {
  await rateLimitWait();
  const res = await fetch(`${API_BASE}/kernel-sets`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`WGC kernel-sets HTTP ${res.status}: ${res.statusText}`);
  const json = await res.json();
  return json.items || json;
}

/**
 * Submit a new calculation and return the parsed results.
 * WGC2 returns phase='COMPLETE' in the submit response itself; we just need to
 * fetch /results with the returned calculationId. Only poll if phase='QUEUED'.
 */
async function submitCalculation(payload) {
  await rateLimitWait();

  const submitRes = await fetch(`${API_BASE}/calculation/new`, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`WGC submit HTTP ${submitRes.status}: ${errText.slice(0, 500)}`);
  }
  const submitJson = await submitRes.json();
  const calculationId = submitJson.calculationId;
  if (!calculationId) {
    throw new Error(`WGC submit: no calculationId: ${JSON.stringify(submitJson).slice(0, 500)}`);
  }

  // Poll if not already complete
  let phase = submitJson.result && submitJson.result.phase;
  const MAX_POLLS = 120;
  for (let i = 0; phase !== 'COMPLETE' && phase !== 'COMPLETED' && i < MAX_POLLS; i++) {
    if (phase === 'FAILED' || phase === 'ERROR') {
      throw new Error(`WGC calculation failed: ${JSON.stringify(submitJson).slice(0, 500)}`);
    }
    await new Promise(r => setTimeout(r, 1000));
    const statusRes = await fetch(`${API_BASE}/calculation/${calculationId}`, {
      headers: { 'Accept': 'application/json' },
    });
    const statusJson = await statusRes.json();
    phase = statusJson.phase || (statusJson.result && statusJson.result.phase);
  }

  const resRes = await fetch(`${API_BASE}/calculation/${calculationId}/results`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!resRes.ok) {
    const errText = await resRes.text();
    throw new Error(`WGC results HTTP ${resRes.status}: ${errText.slice(0, 500)}`);
  }
  return await resRes.json();
}

/**
 * OSCULATING_ELEMENTS calculation.
 *
 * @param {Object} opts
 *   orbitingBody: e.g. 'MERCURY', 'EARTH', 'URANUS'
 *   centerBody: e.g. 'SUN', 'SUN BARYCENTER'
 *   times: array of ISO UTC strings, e.g. ['1900-01-01T00:00:00.000']
 *   kernelSetId: integer, default 1 (Solar System Kernels)
 *   referenceFrame: default 'J2000'
 *   timeSystem: default 'UTC'
 *   timeFormat: default 'CALENDAR'
 * @returns {Promise<Object>} full WGC result JSON (contains rows[] with elements)
 */
async function osculatingElements({
  orbitingBody,
  centerBody = 'SUN',
  times,
  kernelSetId = 1,
  referenceFrame = 'ECLIPJ2000',  // J2000 ecliptic (not equatorial)
  timeSystem = 'UTC',
  timeFormat = 'CALENDAR',
}) {
  const cache = loadCache();
  const cacheKey = `OSC|${kernelSetId}|${orbitingBody}|${centerBody}|${referenceFrame}|${times.join(',')}`;
  if (cache[cacheKey]) return cache[cacheKey];

  const payload = {
    kernels: [{ type: 'KERNEL_SET', id: kernelSetId }],
    timeSystem, timeFormat,
    times,
    calculationType: 'OSCULATING_ELEMENTS',
    orbitingBody,
    centerBody,
    referenceFrame,
  };

  const result = await submitCalculation(payload);
  cache[cacheKey] = result;
  saveCache();
  return result;
}

module.exports = {
  API_BASE,
  listKernelSets,
  submitCalculation,
  osculatingElements,
};
