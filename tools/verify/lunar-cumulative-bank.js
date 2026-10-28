#!/usr/bin/env node
/**
 * THE LUNAR CUMULATIVE BANK — the lunar tables' coarse segment prefixes every 250 kyr (plan 25).
 *
 *   node tools/verify/lunar-cumulative-bank.js            reproduce + compare against the record
 *   node tools/verify/lunar-cumulative-bank.js --write    (re)write data/lunar-cumulative-checkpoints.json (~3 min)
 *
 * WHAT IT IS. The lunar arguments integrate from J2000: five chain counts (the draconic,
 * tropical, anomalistic and sidereal months, Jupiter — chain-cycles/index.cjs) and two
 * bounded carriers (planetary e², obliquity — moon/arguments.cjs makeDeepCarrier), each a
 * cumulative table of 1-kyr cells beyond the dense ±250-kyr tier that reads ε(t)/e(t) at
 * every cell. A deep jump therefore paid the whole spin walk even with the spin-axis bank
 * seated (plan 24, measured: 0.21 s per Myr in Node, 84 s at −400 Myr). Since plan 25 those
 * coarse tiers are SEGMENTS of 250 cells with separate segment prefixes P[k] (the value at
 * the start of segment k), a value being the two-term sum P[k] + S_k[j]; this bank stores
 * the P[k] of every named table in both directions over ±600 Myr (the chain-cycle limit),
 * computed by the tables' own recursion on the shipped context. A runtime seated on it
 * computes only the segment it reads — the SAME doubles in the SAME order as the unseeded
 * path, so the bank is a seat, never a value (test:sampler-purity's lunar rows).
 *
 * GATES under --write (REFUSE on any failure):
 *   1. seat-and-resume — for every 20th prefix, a model seeded with P[0..k] reaches P[k+1]
 *      bit-exactly through its own segment sum (the JSON round-trip and the recursion hold);
 *   2. the read path — the deep lunar longitude at three ages reads bit-identically with and
 *      without the bank (the seat changes nothing);
 *   3. the bank's edge values P[0] are the dense tier's (the same configuration).
 * Plain run: re-derives the first ±5 Myr of every table and compares bit-exactly.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, buildInputsBlock, modelSourceFiles } = require('../lib/artifact-inputs');

const OUT = path.join(ROOT, 'data', 'lunar-cumulative-checkpoints.json');
const WRITE = process.argv.includes('--write');
const LIMIT_YEARS = 600e6;   // the chain-cycle coarse limit; the arguments are undefined beyond
const INPUT_FILES = [
  'tools/verify/lunar-cumulative-bank.js',
  'packages/physics/src/chain-cycles/index.cjs',
  'packages/physics/src/moon/arguments.cjs',
  'packages/physics/src/moon/ecc-sensitivities.cjs',
  'packages/physics/src/moon/deep-ecc-channel.cjs',
  'packages/physics/src/earth/deep-orbital-history.cjs',
  'packages/physics/src/planets/orbit-chain.cjs',
  'packages/physics/src/deltat/deep-time-chain.js',
  'packages/physics/src/deltat/deep-time.cjs',
  'packages/physics/src/deltat/moon-distance-history.cjs',
  'packages/physics/src/deltat/moon-distance-artifact.cjs',
  'packages/physics/src/moon/deep-modes-artifact.cjs',
  'packages/physics/src/planets/chain-artifact.js',
  'packages/physics/src/climate/l1-orbital.cjs',
  'packages/physics/src/constants/generated.js',
  'packages/physics/src/constants/coefficients.js',
  'data/nbody-secular-series.json',
  'data/spin-axis-checkpoints.json',
  'public/input/astro-reference.json',
  'public/input/climate-formula-coefficients.json',
  ...modelSourceFiles(),
];

const same = (/** @type {number[]} */ a, /** @type {number[]} */ b) => a.length === b.length && a.every((v, i) => v === b[i]);
const gate = (/** @type {boolean} */ ok, /** @type {string} */ msg) => { if (!ok) { console.error('REFUSING: ' + msg); process.exit(1); } };

async function main() {
  const { createModel } = await import('../../packages/physics/src/index.js');
  const series = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nbody-secular-series.json'), 'utf8'));
  let spin = null;
  try { spin = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'spin-axis-checkpoints.json'), 'utf8')); } catch { /* the full walk then */ }
  // The CONTINUOUS tables — never seated on the record they write (the spin bank is a seat of the
  // walk, bit-identical to it, so it may serve the integrands' ε reads).
  const bare = createModel(undefined, { secularSeriesArtifact: series, spinCheckpointsArtifact: spin });

  if (WRITE) {
    const t0 = Date.now();
    console.log(`recording the lunar tables' segment prefixes to ±${LIMIT_YEARS / 1e6} Myr …`);
    const rec = bare.moon.recordCumulativeBank(LIMIT_YEARS);
    for (const [name, v] of Object.entries(rec.chains)) gate(v !== null, `chain ${name} is undefined inside the limit`);
    const nChains = Object.keys(rec.chains).length, nCarriers = Object.keys(rec.carriers).length;
    console.log(`  ${nChains} chains × 2 directions × ${rec.chains.draconic.fwd.length} prefixes, ${nCarriers} carriers × 2 × ${rec.carriers.obliquity.fwd.length}, ${((Date.now() - t0) / 60000).toFixed(1)} min`);

    const art = {
      _description: 'The lunar cumulative bank — GENERATED by tools/verify/lunar-cumulative-bank.js --write (plan 25). The coarse segment prefixes P[k] (the cumulative value at the start of each 250-kyr segment beyond the dense ±250-kyr tier, both directions) of the five chain-count tables (chain-cycles/index.cjs; cycles per SI year, anchored C(2000) = 0) and the two bounded Lp carriers (moon/arguments.cjs; degrees, T in Julian centuries from J2000), computed by the tables\' own recursion on the shipped context. A runtime seated on it sums only the segment it reads — the same doubles in the same order as without it (a seat, never a value; test:sampler-purity\'s lunar rows). meta.gates records the three gates the generator passed before writing.',
      meta: {
        segmentYears: rec.segmentYears,
        limitYears: LIMIT_YEARS,
        chainLimitYears: rec.chainLimitYears,
        chainEdgeYears: 250000,     // the dense tier's edge, |year − 2000|
        carrierEdgeCenturies: 2500, // the fine tier's edge, |T| in Julian centuries
        chains: Object.keys(rec.chains),
        carriers: Object.keys(rec.carriers),
        gates: null,
        generatedAtWalkSeconds: null,
      },
      chains: rec.chains,
      carriers: rec.carriers,
      inputs: null,
    };

    // gate 1 — seat-and-resume: seed a fresh model with the prefixes up to k, read through
    // the segment, and compare the recorded P[k+1] with what the seeded recursion produces
    // (the seeded side holds P[0..k] only, so its P[k+1] is its own segment sum).
    let resumed = 0;
    const truncated = (/** @type {number} */ k) => ({
      chains: Object.fromEntries(Object.entries(rec.chains).map(([n, v]) => [n, { fwd: v.fwd.slice(0, k + 1), bwd: v.bwd.slice(0, k + 1) }])),
      carriers: Object.fromEntries(Object.entries(rec.carriers).map(([n, v]) => [n, { fwd: v.fwd.slice(0, k + 1), bwd: v.bwd.slice(0, k + 1) }])),
    });
    for (let k = 0; k + 1 < rec.chains.draconic.fwd.length; k += 20) {
      const seeded = createModel(undefined, { secularSeriesArtifact: series, spinCheckpointsArtifact: spin, lunarCheckpointsArtifact: truncated(k) });
      const r = seeded.moon.recordCumulativeBank(rec.segmentYears * (k + 1));   // forces P[0..k+1] on the seeded side
      for (const [n, v] of Object.entries(rec.chains)) {
        for (const dir of /** @type {Array<'fwd'|'bwd'>} */ (['fwd', 'bwd'])) {
          gate(r.chains[n] !== null && r.chains[n][dir][k + 1] === v[dir][k + 1], `seat-and-resume: chain ${n} ${dir} segment ${k} does not reach P[${k + 1}] bit-exactly from the seeded prefixes`);
        }
      }
      for (const [n, v] of Object.entries(rec.carriers)) {
        for (const dir of /** @type {Array<'fwd'|'bwd'>} */ (['fwd', 'bwd'])) {
          if (k + 1 < v[dir].length) gate(r.carriers[n][dir][k + 1] === v[dir][k + 1], `seat-and-resume: carrier ${n} ${dir} segment ${k} does not reach P[${k + 1}] bit-exactly`);
        }
      }
      resumed++;
    }
    // gate 2 — the read path: the deep lunar longitude with and without the bank, bit-identical
    const seatedFull = createModel(undefined, { secularSeriesArtifact: series, spinCheckpointsArtifact: spin, lunarCheckpointsArtifact: art });
    const readRows = [];
    for (const ageMa of [3, 37, 137]) {
      const jd = 2451545 - ageMa * 1e6 * 365.25 + 12345.678;
      const a = bare.moon.lonDegAtJD(jd), b = seatedFull.moon.lonDegAtJD(jd);
      gate(a === b, `read path at ${ageMa} Ma: lunar longitude ${a} (unseated) vs ${b} (seated) — not bit-identical`);
      readRows.push({ ageMa, lonDeg: a });
    }
    // gate 3 — the edge values are the dense tier's: by construction P[0] is read from the model's own tables
    // (the seating code refuses a bank whose P[0] differs); checked here through the seated read above.
    art.meta.gates = { seatAndResumeChecked: resumed, readPathBitIdentical: readRows };
    art.meta.generatedAtWalkSeconds = Number(((Date.now() - t0) / 1000).toFixed(1));
    art.inputs = buildInputsBlock('node tools/verify/lunar-cumulative-bank.js --write', INPUT_FILES);
    fs.writeFileSync(OUT, JSON.stringify(art));
    console.log(`✓ wrote data/lunar-cumulative-checkpoints.json — ${(fs.statSync(OUT).size / 1e6).toFixed(2)} MB, ${resumed} seat-and-resume checks, read path bit-identical at 3/37/137 Ma, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
    return;
  }

  // plain run: the first ±5 Myr of every table re-derived and compared bit-exactly
  if (!fs.existsSync(OUT)) { console.error('FAIL — no recorded bank. First run: node tools/verify/lunar-cumulative-bank.js --write'); process.exit(1); }
  const recOnDisk = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const live = bare.moon.recordCumulativeBank(5e6);
  let bad = 0, n = 0;
  for (const [name, v] of Object.entries(live.chains)) {
    if (v === null) { bad++; console.error(`  chain ${name} undefined`); continue; }
    for (const dir of /** @type {Array<'fwd'|'bwd'>} */ (['fwd', 'bwd'])) { n++; const r = recOnDisk.chains[name] && recOnDisk.chains[name][dir]; if (!r || !same(v[dir], r.slice(0, v[dir].length))) { bad++; console.error(`  DIVERGED chain ${name} ${dir}`); } }
  }
  for (const [name, v] of Object.entries(live.carriers)) {
    for (const dir of /** @type {Array<'fwd'|'bwd'>} */ (['fwd', 'bwd'])) { n++; const r = recOnDisk.carriers[name] && recOnDisk.carriers[name][dir]; if (!r || !same(v[dir], r.slice(0, v[dir].length))) { bad++; console.error(`  DIVERGED carrier ${name} ${dir}`); } }
  }
  if (bad) { console.error(`FAIL — ${bad} of ${n} table sides diverge from the recorded bank over ±5 Myr. The tables' inputs moved: regenerate with --write.`); process.exit(1); }
  console.log(`PASS — the recorded lunar bank is reproduced over ±5 Myr (${n} table sides bit-exact); ${recOnDisk.chains.draconic.fwd.length} prefixes per side on record.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
