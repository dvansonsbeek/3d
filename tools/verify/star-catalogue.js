#!/usr/bin/env node
/**
 * star-catalogue — the sky of date's inputs (plan 28 §B/§G (6); doc 111 §1.48). A GATE: fails or passes.
 *
 * Reads public/input/stars.json (v2) and public/input/constellations.json (v2), both written by
 * tools/pipeline/import-star-catalogue.js, and data/star-motion-reference.json, the astropy referee's
 * record (scripts/star_motion_reference.py --write):
 *   1. the catalogue's shape — the v2 columns, the epoch J1991.25, every row finite, no HIP twice,
 *      the recorded counts ≡ the counts recomputed from the rows (the two tiers, the RVs, the
 *      distances, the names), and the pinned sizes (41,394 stars to V 8.0; 8,870 to V 6.5 — the
 *      naked-eye sky the plan named 8,874 from Hipparcos's own V; 367 IAU names);
 *   2. the strokes — every HIP a stroke names is in the catalogue (a stroke through a missing star
 *      would silently drop a vertex), the vertex count and the fixed-vertex count as recorded;
 *   3. a few anchors by value — Sirius's astrometry (plx 379.21 mas, μ −546.01 / −1223.07 mas/yr,
 *      V −1.44), Arcturus's RV (−5.2 km/s) — the catalogue's content, not only its shape;
 *   4. the referee's record names the CURRENT catalogue (its sha256) — a catalogue change without
 *      a regenerated referee fails naming the command;
 *   5. the sources' canonical hashes in the catalogue's _meta ≡ the cached source files, where the
 *      cache exists (data/.cache/stars/, gitignored; SKIP with a note where absent — CI).
 * Fail-proven via ESSRT_STAR_CATALOGUE_PLANT=1 (one row's HIP duplicated in the check).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const PLANT = process.env.ESSRT_STAR_CATALOGUE_PLANT === '1';
const rd = (/** @type {string} */ f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
/** @type {string[]} */
const failures = [];
const fail = (/** @type {string} */ m) => failures.push(m);
const canonicalSha256 = (/** @type {string} */ text) => crypto.createHash('sha256').update(text.split('\n').filter((l) => l.trim() && !l.startsWith('#')).sort().join('\n')).digest('hex');

const EXPECTED = { stars: 41394, nakedEye: 8870, named: 367, strokes: 204, vertices: 1077, fixedVertices: 0 };
const V_NAKED = 6.5;

const starsRaw = fs.readFileSync(path.join(ROOT, 'public/input/stars.json'), 'utf8');
const stars = JSON.parse(starsRaw);
const consts = rd('public/input/constellations.json');
const ref = rd('data/star-motion-reference.json');

// 1. shape and counts
const cols = stars.columns, ci = Object.fromEntries(cols.map((c, i) => [c, i]));
for (const c of ['hip', 'raDeg', 'decDeg', 'plxMas', 'pmRaMasYr', 'pmDecMasYr', 'rvKmS', 'vmag', 'bv', 'distPc', 'distFlag', 'rvFlag']) if (!(c in ci)) fail(`stars.json: column ${c} missing`);
if (stars._meta.version !== 2) fail(`stars.json: version ${stars._meta.version}, not 2`);
if (stars._meta.epochYear !== 1991.25) fail(`stars.json: epochYear ${stars._meta.epochYear}, not the Hipparcos J1991.25`);
const seen = new Set();
let nNaked = 0, nNakedRv = 0, n45 = 0, n45Rv = 0, nGaia = 0, nPulkovo = 0, nPlx = 0, nPhot = 0, nDef = 0;
const byHip = new Map();
stars.stars.forEach((r, k) => {
  const hip = PLANT && k === 1 ? stars.stars[0][ci.hip] : r[ci.hip];
  if (seen.has(hip)) fail(`stars.json: HIP ${hip} appears twice`);
  seen.add(hip); byHip.set(hip, r);
  for (const c of ['raDeg', 'decDeg', 'plxMas', 'pmRaMasYr', 'pmDecMasYr', 'vmag', 'distPc']) if (!Number.isFinite(r[ci[c]])) fail(`stars.json: HIP ${hip} ${c} = ${r[ci[c]]}`);
  const v = r[ci.vmag], rv = r[ci.rvKmS];
  if (v > 8.0) fail(`stars.json: HIP ${hip} V ${v} beyond the V 8.0 cut`);
  if (v <= V_NAKED) { nNaked++; if (rv !== null) nNakedRv++; }
  if (v <= 4.5) { n45++; if (rv !== null) n45Rv++; }
  if (r[ci.rvFlag] === 1) nGaia++; else if (r[ci.rvFlag] === 2) nPulkovo++;
  if (r[ci.distFlag] === 0) nPlx++; else if (r[ci.distFlag] === 1) nPhot++; else nDef++;
  if ((rv === null) !== (r[ci.rvFlag] === 0)) fail(`stars.json: HIP ${hip} rv ${rv} with rvFlag ${r[ci.rvFlag]}`);
});
const named = Object.values(stars.names).filter((n) => n.name).length;
const C = stars._meta.counts;
const recomputed = { stars: stars.stars.length, nakedEye: nNaked, nakedEyeWithRv: nNakedRv, brighterThan45: n45, brighterThan45WithRv: n45Rv, rvGaia: nGaia, rvPulkovo: nPulkovo, distParallax: nPlx, distPhotometric: nPhot, distDefault: nDef, named };
for (const [k, v] of Object.entries(recomputed)) if (C[k] !== v) fail(`stars.json: recorded counts.${k} ${C[k]} ≠ recomputed ${v}`);
for (const [k, v] of Object.entries({ stars: EXPECTED.stars, nakedEye: EXPECTED.nakedEye, named: EXPECTED.named })) if (recomputed[k] !== v) fail(`stars.json: ${k} ${recomputed[k]}, the pinned ${v}`);

// 2. the strokes
if (consts._meta.version !== 2 || !Array.isArray(consts.strokes)) fail('constellations.json: not the v2 HIP stroke list');
let vertices = 0, fixed = 0;
for (const s of consts.strokes) for (const v of s) { vertices++; if (typeof v === 'number') { if (!byHip.has(v)) fail(`constellations.json: stroke names HIP ${v}, not in the catalogue`); } else fixed++; }
if (consts.strokes.length !== EXPECTED.strokes || vertices !== EXPECTED.vertices || fixed !== EXPECTED.fixedVertices) fail(`constellations.json: ${consts.strokes.length} strokes / ${vertices} vertices / ${fixed} fixed, the pinned ${EXPECTED.strokes} / ${EXPECTED.vertices} / ${EXPECTED.fixedVertices}`);
if (consts._meta.counts.strokes !== consts.strokes.length || consts._meta.counts.vertices !== vertices || consts._meta.counts.fixedVertices !== fixed) fail('constellations.json: the recorded counts ≠ the strokes');

// 3. anchors by value
const sirius = byHip.get(32349), arcturus = byHip.get(69673);
if (!sirius || Math.abs(sirius[ci.plxMas] - 379.21) > 0.01 || Math.abs(sirius[ci.pmRaMasYr] + 546.01) > 0.01 || Math.abs(sirius[ci.pmDecMasYr] + 1223.07) > 0.01 || Math.abs(sirius[ci.vmag] + 1.44) > 0.01) fail(`Sirius: ${JSON.stringify(sirius)}`);
if (!stars.names['32349'] || stars.names['32349'].name !== 'Sirius' || stars.names['32349'].hr !== 2491) fail(`Sirius's names: ${JSON.stringify(stars.names['32349'])}`);
if (!arcturus || arcturus[ci.rvKmS] === null || Math.abs(arcturus[ci.rvKmS] + 5.2) > 0.3) fail(`Arcturus's RV: ${arcturus && arcturus[ci.rvKmS]}`);

// 4. the referee names this catalogue
const sha = crypto.createHash('sha256').update(starsRaw).digest('hex');
const recorded = ref.inputs && ref.inputs['public/input/stars.json'] && ref.inputs['public/input/stars.json'].sha256;
if (recorded !== sha) fail(`data/star-motion-reference.json was generated on another catalogue (sha256 ${String(recorded).slice(0, 12)}… vs ${sha.slice(0, 12)}…) — regenerate: python3 scripts/star_motion_reference.py --write`);
for (const hip of Object.keys(ref.stars)) if (!byHip.has(Number(hip))) fail(`the referee names HIP ${hip}, not in the catalogue`);

// 5. the sources' canonical hashes vs the cache
let cacheNote = '';
const cacheDir = path.join(ROOT, 'data', '.cache', 'stars');
if (fs.existsSync(cacheDir)) {
  for (const [k, s] of Object.entries(stars._meta.sources)) {
    const f = path.join(ROOT, s.file);
    if (!fs.existsSync(f)) { cacheNote += ` ${k}: absent;`; continue; }
    const h = canonicalSha256(fs.readFileSync(f, 'utf8'));
    if (h !== s.sha256Canonical) fail(`source ${k}: the cached file's canonical sha256 ${h.slice(0, 12)}… ≠ the catalogue's recorded ${String(s.sha256Canonical).slice(0, 12)}…`);
  }
  cacheNote = cacheNote ? ` (cache: ${cacheNote.trim()})` : ' (every cached source matches)';
} else cacheNote = ' (the source cache is absent — the hashes are not re-checked here)';

if (failures.length) {
  console.error(`FAIL star-catalogue: ${failures.length} problem(s)`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}
console.log(`PASS star-catalogue: ${recomputed.stars} stars to V 8.0 (${recomputed.nakedEye} to V ${V_NAKED}, ${recomputed.nakedEyeWithRv} with RV; V ≤ 4.5: ${n45Rv}/${n45}), ${named} IAU names, ${consts.strokes.length} strokes / ${vertices} vertices; the referee on this catalogue${cacheNote}.`);
