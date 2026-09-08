#!/usr/bin/env node
/**
 * Scene-vs-JPL measurement — the rendered bodies against the JPL Horizons
 * cache, bucketed by century. Since the K5 legacy-chain excision the seven
 * planets in the scene ARE the engine-D element chain, so this instrument
 * measures the CHAIN's published accuracy (the Moon rides the engine-K
 * lunar series as always). Under --write it banks the summary as the
 * governed artifact data/chain-vs-jpl-rms.json (inputs-stamped; the K6/K7
 * "published either way it falls" comparison — agreement and divergence
 * are both model content, never tuned).
 *
 * (Historically: the Phase A instrument that quantified how the J2000-only
 * geometric model degraded outside the calibration window.)
 *
 * For each planet, bucket the JPL cache by 100-year epochs and compute the
 * combined RA+Dec joint RMS error (same metric used by tools/lib/optimizer.js
 * `baseline()` Step 10 in verify-pipeline).
 *
 * Conventions:
 *   - JPL cache stores RA/Dec in DEGREES, J2000/ICRF frame
 *   - Scene-graph computePlanetPosition returns (theta, phi) — convert with
 *     thetaToRaDeg / phiToDecDeg
 *   - Apply j2000ToOfDate to JPL coordinates so they're in the same of-date
 *     frame as the model
 *   - rmsTotal = sqrt(sumRA² + sumDec²)/n   (per-bucket per-target)
 *
 * No code changes; pure measurement to inform whether deep-time integration
 * into the fitting pipeline would yield measurable improvement.
 *
 * Usage:
 *   node tools/verify/measure-rms-by-epoch.js
 */

const path = require('path');
const fs = require('fs');

const SG = require('../lib/scene-graph');
const { j2000ToOfDate } = require('../lib/precession');
const CACHE_PATH = path.resolve(__dirname, '..', '..', 'data', 'jpl-cache.json');
const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));

const J2000_JD = 2451545.0;
const J2000_YEAR = 2000.0;

const TARGETS = {
  '199': 'mercury',
  '299': 'venus',
  '301': 'moon',
  '499': 'mars',
  '599': 'jupiter',
  '699': 'saturn',
  '799': 'uranus',
  '899': 'neptune',
};

// 100-year buckets — finer than the previous version, so we can see the trend.
const BUCKETS = [
  { lo: -Infinity, hi: 1600,    label: '<1600' },
  { lo: 1600,      hi: 1700,    label: '1600-1699' },
  { lo: 1700,      hi: 1800,    label: '1700-1799' },
  { lo: 1800,      hi: 1900,    label: '1800-1899' },
  { lo: 1900,      hi: 2000,    label: '1900-1999' },
  { lo: 2000,      hi: 2100,    label: '2000-2099' },
  { lo: 2100,      hi: 2200,    label: '2100-2199' },
  { lo: 2200,      hi: 2300,    label: '2200-2299' },
  { lo: 2300,      hi: 2400,    label: '2300-2399' },
  { lo: 2400,      hi: +Infinity, label: '≥2400' },
];

const TARGET_LIST = ['mercury', 'venus', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

function bucketIndex(year) {
  for (let i = 0; i < BUCKETS.length; i++) {
    if (year >= BUCKETS[i].lo && year < BUCKETS[i].hi) return i;
  }
  return BUCKETS.length - 1;
}

// Init accumulators: sumRA², sumDec², n per bucket per target
const acc = {};
for (const name of TARGET_LIST) {
  acc[name] = BUCKETS.map(() => ({ sumRA2: 0, sumDec2: 0, n: 0, maxJoint: 0 }));
}

let totalSkipped = 0;
let totalProcessed = 0;

const keys = Object.keys(cache);
for (const key of keys) {
  const [tCode, jdStr] = key.split('_');
  const target = TARGETS[tCode];
  if (!target) continue;
  const jd = parseFloat(jdStr);
  if (!Number.isFinite(jd)) continue;
  const entry = cache[key];
  if (!entry || typeof entry.ra !== 'number' || typeof entry.dec !== 'number') continue;

  // JPL: degrees, J2000/ICRF frame
  let refRA = entry.ra;
  let refDec = entry.dec;

  // Convert J2000 → of-date frame (matches model)
  const ofDate = j2000ToOfDate(refRA, refDec, jd);
  refRA = ofDate.ra;
  refDec = ofDate.dec;

  let modelPos;
  try {
    modelPos = SG.computePlanetPosition(target, jd);
  } catch (e) {
    totalSkipped++;
    continue;
  }
  if (!modelPos) { totalSkipped++; continue; }

  const modelRA = SG.thetaToRaDeg(modelPos.ra);
  const modelDec = SG.phiToDecDeg(modelPos.dec);

  // Angular RA difference with wrap-around handling
  let dRA = modelRA - refRA;
  if (dRA > 180) dRA -= 360;
  if (dRA < -180) dRA += 360;
  const dDec = modelDec - refDec;

  const year = (jd - J2000_JD) / 365.25 + J2000_YEAR;
  const bIdx = bucketIndex(year);
  const a = acc[target][bIdx];
  a.sumRA2 += dRA * dRA;
  a.sumDec2 += dDec * dDec;
  a.n++;
  const joint = Math.sqrt(dRA * dRA + dDec * dDec);
  if (joint > a.maxJoint) a.maxJoint = joint;
  totalProcessed++;
}

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('Phase A — RMS by epoch bucket (current J2000-only model vs JPL Horizons)');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log(`Processed: ${totalProcessed} samples (skipped: ${totalSkipped})`);
console.log('Metric:    rmsTotal = sqrt(sumRA² + sumDec²)/n  (same as verify-pipeline Step 10)');
console.log('');

const widths = BUCKETS.map(b => Math.max(b.label.length, 16));
const padded = (s, w) => s.padStart(w);
const headerRow = ['Target'.padEnd(8), ...BUCKETS.map((b, i) => padded(b.label, widths[i]))].join(' │ ');
console.log(headerRow);
console.log('─'.repeat(Math.min(headerRow.length, 200)));

for (const name of TARGET_LIST) {
  const cells = [name.padEnd(8)];
  for (let i = 0; i < BUCKETS.length; i++) {
    const a = acc[name][i];
    if (a.n === 0) {
      cells.push(padded('—', widths[i]));
    } else {
      const rms = Math.sqrt((a.sumRA2 + a.sumDec2) / a.n);
      cells.push(padded(`${rms.toFixed(4)}° (n=${a.n})`, widths[i]));
    }
  }
  console.log(cells.join(' │ '));
}
console.log('');

// Summary: ratio between extreme epochs and J2000-era reference
console.log('═══ Summary: RMS scaling with distance from the 2000-2099 calibration epoch ═══');
const REF_LABEL = '2000-2099';
const refIdx = BUCKETS.findIndex(b => b.label === REF_LABEL);
const cols = ['Target'.padEnd(8), 'Ref RMS (2000-2099)'.padStart(20), 'Furthest past'.padStart(28), 'Furthest future'.padStart(28), 'Past/Ref'.padStart(10)];
console.log(cols.join(' │ '));
console.log('─'.repeat(cols.join(' │ ').length));

for (const name of TARGET_LIST) {
  const ref = acc[name][refIdx];
  const refRms = ref.n > 0 ? Math.sqrt((ref.sumRA2 + ref.sumDec2) / ref.n) : NaN;
  let furthestPast = null;
  let furthestFuture = null;
  for (let i = 0; i < refIdx; i++) {
    if (acc[name][i].n > 0) { furthestPast = i; break; }
  }
  for (let i = BUCKETS.length - 1; i > refIdx; i--) {
    if (acc[name][i].n > 0) { furthestFuture = i; break; }
  }
  const pastRms = furthestPast !== null ? Math.sqrt((acc[name][furthestPast].sumRA2 + acc[name][furthestPast].sumDec2) / acc[name][furthestPast].n) : NaN;
  const futureRms = furthestFuture !== null ? Math.sqrt((acc[name][furthestFuture].sumRA2 + acc[name][furthestFuture].sumDec2) / acc[name][furthestFuture].n) : NaN;
  const cells = [
    name.padEnd(8),
    (Number.isFinite(refRms) ? `${refRms.toFixed(4)}°` : '—').padStart(20),
    (Number.isFinite(pastRms) ? `${pastRms.toFixed(4)}° @ ${BUCKETS[furthestPast].label}` : '—').padStart(28),
    (Number.isFinite(futureRms) ? `${futureRms.toFixed(4)}° @ ${BUCKETS[furthestFuture].label}` : '—').padStart(28),
    (Number.isFinite(pastRms) && Number.isFinite(refRms) && refRms > 0 ? `${(pastRms / refRms).toFixed(2)}×` : '—').padStart(10),
  ];
  console.log(cells.join(' │ '));
}

console.log('');
console.log('Interpretation:');
console.log('  • Ratio ≈ 1× → J2000-only model is flat across this time range; deep-time would NOT help measurably.');
console.log('  • Ratio ≫ 1× → model degrades far from calibration; deep-time integration is the candidate fix.');
console.log('  • Moon is the prime suspect for ≫1× ratios at extended epochs (secular acceleration ~25.85"/cy²).');

// ─── --write: bank the summary as the governed artifact ────────────────────
// data/chain-vs-jpl-rms.json — the published scene-vs-JPL comparison (K6/K7).
// Registry keys (tools/docs/model-values.mjs) and doc 109 §16 read this file;
// the freshness gate re-hashes the inputs on every check.
if (process.argv.includes('--write')) {
  const { buildInputsBlock } = require('../lib/artifact-inputs.js');
  const perTarget = {};
  for (const name of TARGET_LIST) {
    const buckets = {};
    for (let i = 0; i < BUCKETS.length; i++) {
      const a = acc[name][i];
      if (a.n === 0) continue;
      const rmsDeg = Math.sqrt((a.sumRA2 + a.sumDec2) / a.n);
      buckets[BUCKETS[i].label] = { rmsDeg: Number(rmsDeg.toFixed(6)), rmsArcsec: Number((rmsDeg * 3600).toFixed(1)), n: a.n };
    }
    const ref = buckets['2000-2099'] || null;
    perTarget[name] = { buckets, refWindow: '2000-2099', refRmsArcsec: ref ? ref.rmsArcsec : null };
  }
  const out = {
    _description: 'Scene-vs-JPL joint RA+Dec RMS by century bucket — the rendered bodies (the seven planets = the engine-D element chain since the K5 excision; the Moon = the engine-K lunar series) against the JPL Horizons cache, of-date frame, verify-pipeline Step-10 metric. PUBLISHED model content: agreement and divergence are both reported, never tuned (doc 109 §16).',
    meta: {
      metric: 'rmsTotal = sqrt(mean(dRA^2 + dDec^2)), joint RA+Dec, of-date frame',
      samples: totalProcessed,
      skipped: totalSkipped,
    },
    perTarget,
    inputs: buildInputsBlock('node tools/verify/measure-rms-by-epoch.js --write', [
      'tools/verify/measure-rms-by-epoch.js',
      'data/jpl-cache.json',
      'tools/lib/scene-graph.js',
      'packages/physics/src/planets/keplerian-chain.cjs',
      'packages/physics/src/planets/chain-artifact.js',
      // the ONE eccentricity law body — the Moon rows ride its E-factor
      // (Stage A′ of the engine-switch record):
      'packages/physics/src/moon/ecc-channel.cjs',
    ]),
  };
  const outPath = path.resolve(__dirname, '..', '..', 'data', 'chain-vs-jpl-rms.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
  console.log(`\n✓ wrote data/chain-vs-jpl-rms.json (${totalProcessed} samples banked)`);
}
