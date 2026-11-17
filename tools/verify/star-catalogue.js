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
let nNaked = 0, nNakedRv = 0, n45 = 0, n45Rv = 0, nGaia = 0, nPulkovo = 0, nPlx = 0, nPrior = 0, nDef = 0, nPriorNear = 0, dMin = Infinity, dMinHip = 0;
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
  if (r[ci.distFlag] === 0) nPlx++; else if (r[ci.distFlag] === 1) { nPrior++; if (r[ci.distPc] < 50) nPriorNear++; } else nDef++;
  if (r[ci.distPc] < dMin) { dMin = r[ci.distPc]; dMinHip = hip; }
  if ((rv === null) !== (r[ci.rvFlag] === 0)) fail(`stars.json: HIP ${hip} rv ${rv} with rvFlag ${r[ci.rvFlag]}`);
});
const named = Object.values(stars.names).filter((n) => n.name).length;
const C = stars._meta.counts;
const recomputed = { stars: stars.stars.length, nakedEye: nNaked, nakedEyeWithRv: nNakedRv, brighterThan45: n45, brighterThan45WithRv: n45Rv, rvGaia: nGaia, rvPulkovo: nPulkovo, distParallax: nPlx, distPrior: nPrior, distDefault: nDef, named };
for (const [k, v] of Object.entries(recomputed)) if (C[k] !== v) fail(`stars.json: recorded counts.${k} ${C[k]} ≠ recomputed ${v}`);
// The distances are the 3-D field's (plan 28, the stars at their measured distances): the nearest star in the
// catalogue is α Centauri (HIP 71681/71683, 1.25–1.35 pc — Proxima is V 11, outside the V 8 cut), and the
// distance prior keeps the far giants far: the former photometric main-sequence placement put 6,332 flagged
// stars (mostly giants) within 50 pc, 242 inside 1 pc; under the prior 4 remain within 50 pc.
if (dMin < 1.2 || dMin > 1.3) fail(`stars.json: the nearest star is HIP ${dMinHip} at ${dMin} pc — α Centauri at 1.25–1.3 pc is expected (a photometric distance leaked in?)`);
if (nPriorNear > 10) fail(`stars.json: ${nPriorNear} prior-distance stars within 50 pc — the flagged distances are clumped near the Sun (the prior's mode expected, ≤ 10)`);
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

// 6. the orbit model (plan 28 §D; ONE home packages/physics/src/sky/galactic-orbits.cjs): the closed form (the
//    second-order epicycle) against the potential's exact integrator — the scene's evaluator — on the same potential:
//    its MEASURED floor, 1.13 % of the relative vector over ±50 Myr at a 2.9 % radial amplitude and 11.1 % at 12.8 %
//    (the floor is third order in the amplitude; pinned at 1.5 % / 12 % as a regression, never as accuracy); the
//    integrator's step convergence (1-Myr vs 0.25-Myr steps); Gliese 710's closest approach ≡ the pinned model
//    value, inside the published bracket (the physical check).
const O = require(path.join(ROOT, 'packages/physics/src/sky/galactic-orbits.cjs'));
const enc = rd('data/star-encounter-reference.json');
{
  const sunEl = O.orbitElements(null), sun0 = O.galactocentricState(null);
  const sample = [[{ xPc: 12, yPc: -9, zPc: 8, uKmS: -12.7, vKmS: -6.66, wKmS: -1.51 }, 0.015], [{ xPc: 300, yPc: -200, zPc: 80, uKmS: 25, vKmS: -15, wKmS: 8 }, 0.12]];
  for (const [h, tol] of sample) {
    const el = O.orbitElements(h), s0 = O.galactocentricState(h);
    for (const T of [-5e7, 2e7, 5e7]) {
      const nSteps = Math.round(Math.abs(T) / O.ORBIT_INTEGRATION.named.stepYears);
      const p = O.integrateOrbitRK4(s0, T, nSteps), q = O.integrateOrbitRK4(sun0, T, nSteps);
      const exact = [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
      const m = O.heliocentricGalacticAtYear(el, sunEl, 2000 + T);
      const off = Math.hypot(m[0] - exact[0], m[1] - exact[1], m[2] - exact[2]), rel = Math.hypot(...exact);
      if (!(off / rel <= tol)) fail(`the epicycle (amplitude ${(100 * el.amplitudeFraction).toFixed(1)} % of R₀) is ${(100 * off / rel).toFixed(2)} % off the exact orbit at ${T / 1e6} Myr (≤ ${100 * tol} %)`);
      const fine = O.integrateOrbitRK4(s0, T, 4 * nSteps);
      const conv = Math.hypot(fine[0] - p[0], fine[1] - p[1], fine[2] - p[2]) / Math.hypot(p[0], p[1]);
      if (!(conv < 1e-7)) fail(`the integrator's 1-Myr steps part from 0.25-Myr steps by ${conv.toExponential(2)} of the radius at ${T / 1e6} Myr`);
    }
  }
  // Gliese 710
  const g = enc.gaiaDr3;
  const el = O.orbitElements(O.heliocentricGalacticState({ raDeg: g.raDeg, decDeg: g.decDeg, distPc: 1000 / g.parallaxMas, pmRaMasYr: g.pmRaMasYr, pmDecMasYr: g.pmDecMasYr, rvKmS: g.rvKmS }), g.epochYear);
  let best = { d: Infinity, t: 0 };
  for (let t = 0; t <= 3e6; t += 100) { const r = O.heliocentricGalacticAtYear(el, sunEl, g.epochYear + t); const d = Math.hypot(r[0], r[1], r[2]); if (d < best.d) best = { d, t }; }
  const M = enc.model;
  if (Math.abs(best.t / 1e6 - M.approachMyr) > M.tolerance.approachMyr || Math.abs(best.d - M.distancePc) > M.tolerance.distancePc) fail(`Gliese 710: the model reads ${(best.t / 1e6).toFixed(3)} Myr / ${best.d.toFixed(4)} pc, the record pins ${M.approachMyr} / ${M.distancePc}`);
  if (best.t / 1e6 < M.physicalBracket.approachMyr[0] || best.t / 1e6 > M.physicalBracket.approachMyr[1] || best.d < M.physicalBracket.distancePc[0] || best.d > M.physicalBracket.distancePc[1]) fail(`Gliese 710: ${(best.t / 1e6).toFixed(3)} Myr / ${best.d.toFixed(4)} pc is outside the published bracket`);
}

// 7. the arriving stars (plan 28 §D): the manifest, its binary (the sha256, the size), the counts, the colour relations' rms
const gman = rd('public/input/stars-gaia.json')._meta;
{
  const binPath = path.join(ROOT, gman.binary.file);
  if (!fs.existsSync(binPath)) fail(`${gman.binary.file} is absent`);
  else {
    const bytes = fs.readFileSync(binPath);
    const h = crypto.createHash('sha256').update(bytes).digest('hex');
    if (h !== gman.binary.sha256) fail(`${gman.binary.file}: sha256 ${h.slice(0, 12)}… ≠ the manifest's ${String(gman.binary.sha256).slice(0, 12)}…`);
    if (bytes.length !== 4 * gman.columns.length * gman.n) fail(`${gman.binary.file}: ${bytes.length} bytes for ${gman.columns.length} × ${gman.n} floats`);
    const all = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4);
    let bad = 0; for (let i = 0; i < all.length; i++) if (!Number.isFinite(all[i])) bad++;
    if (bad) fail(`${gman.binary.file}: ${bad} non-finite values`);
    const n = gman.n, dCol = gman.columns.indexOf('distPc'), vCol = gman.columns.indexOf('vmag');
    let dMin = Infinity, dMax = 0, vToday = 0;
    for (let i = 0; i < n; i++) { const d = all[dCol * n + i]; if (d < dMin) dMin = d; if (d > dMax) dMax = d; if (all[vCol * n + i] <= gman.cuts.vLimit) vToday++; }
    if (!(dMin > 1 && dMax <= 1500)) fail(`stars-gaia: distances ${dMin}–${dMax} pc (expected within 1.5 kpc, none inside 1 pc)`);
    if (vToday !== gman.counts.visibleToday) fail(`stars-gaia: ${vToday} visible today from the rows, the manifest says ${gman.counts.visibleToday}`);
  }
  if (gman.epochYear !== 2016) fail(`stars-gaia: epochYear ${gman.epochYear}, not Gaia's J2016.0`);
  if (gman.counts.kept !== gman.n) fail(`stars-gaia: counts.kept ${gman.counts.kept} ≠ n ${gman.n}`);
  if (!(gman.counts.kept >= 100000 && gman.counts.kept <= 600000)) fail(`stars-gaia: ${gman.counts.kept} stars kept (100k–600k expected for V 8 within ±50 Myr)`);
  if (!(gman.colourRelations.vMinusG.rms <= 0.02 && gman.colourRelations.bv.rms <= 0.05)) fail(`stars-gaia: the colour relations' rms ${gman.colourRelations.vMinusG.rms} / ${gman.colourRelations.bv.rms} (≤ 0.02 / 0.05)`);
  if (gman.cuts.windowYears !== O.LOCAL_GALACTIC_KINEMATICS.catalogueRegimeYears || gman.cuts.sampleYears !== O.ORBIT_INTEGRATION.sampling.stepYears) fail('stars-gaia: the cuts do not match the orbit home');
  const gsrc = path.join(ROOT, gman.source.file);
  if (fs.existsSync(gsrc)) { const h = canonicalSha256(fs.readFileSync(gsrc, 'utf8')); if (h !== gman.source.sha256Canonical) fail(`stars-gaia: the cached source's canonical sha256 ${h.slice(0, 12)}… ≠ the manifest's ${String(gman.source.sha256Canonical).slice(0, 12)}…`); cacheNote += ' (the Gaia source matches)'; }
}

if (failures.length) {
  console.error(`FAIL star-catalogue: ${failures.length} problem(s)`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}
console.log(`PASS star-catalogue: ${recomputed.stars} stars to V 8.0 (${recomputed.nakedEye} to V ${V_NAKED}, ${recomputed.nakedEyeWithRv} with RV; V ≤ 4.5: ${n45Rv}/${n45}), ${named} IAU names, ${consts.strokes.length} strokes / ${vertices} vertices; the referee on this catalogue${cacheNote}.`);
