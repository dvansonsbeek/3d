#!/usr/bin/env node
/**
 * ENGINE-D DEEP-TIME SECULAR MODE TABLE — the governed artifact (plan 02 §8,
 * the engine-switch record, Stage B; the TWO-TIER Earth-z decision).
 *
 * WRITES data/nbody-deep-secular-modes.json (tracked; --write only) from the
 * model's own ±10-Myr N-body run: the Wisdom–Holman 9-body integration
 * (tools/explore/lattice-long-window-test.mjs; exact Kepler drifts, 1PN,
 * DE440 masses, Horizons J2000 seed) and NAFF frequency analysis
 * (tools/explore/naff-frequencies.mjs, Laskar 1990/1993). This script
 * ORCHESTRATES those one-home scripts — it never re-implements either.
 *
 * WHAT THE ARTIFACT HOLDS: the 18-term ecliptic-frame z-mode tables of all
 * eight planets from the ±10-Myr run — the engine's DEEP-TIME apsidal law
 * (two-tier design: the 1-Myr era-local table in nbody-secular-frequencies
 * stays the in-window evaluator; THIS table owns deep time, no consumer
 * wired until its T5d-revised gate passes). Verdict block: the measured
 * T5c result — the strongest Earth eccentricity beat (g2−g5) and the
 * 124/95-kyr companions, beside the La2004 reference values (theory
 * labels, never inputs) and the rock-record 405.6-kyr metronome the
 * falsification criterion keeps using.
 *
 * PROVENANCE CHAIN (the 337-MB dump is untracked — too large for git):
 *   1. the run:   node tools/explore/lattice-long-window-test.mjs \
 *                   years=20000000 integrator=wh dt=2 order=2 gr=1 \
 *                   frame=both sample=20000            (~3.4 h)
 *      → tools/explore/lattice-long-window-ecliptic-20000000-gr.local.json
 *   2. --write here: decimate 4× (80,000-d sampling still oversamples the
 *      fastest secular period ~200×; validated — identical frequencies to
 *      the undecimated extraction), NAFF at 18 terms (~75 min), verdict
 *      assertions, artifact written with the dump's sha256 in meta.
 *   The inputs block hashes the RECIPE (this script + the two one-home
 *   scripts); the dump itself is reproduced by step 1, and its sha256 in
 *   meta ties the banked numbers to the exact series they came from.
 *
 * ASSERTIONS UNDER --write (registered in the plan's Stage-B record):
 *   - dump meta must match the registered run (wh / dt 2 / 1PN / ±10 Myr);
 *   - conservation |ΔE/E| ≤ 1e-7 (symplectic bound);
 *   - Earth's leading z-mode within 0.01 ″/yr of La2004 g5 (4.2575) — the
 *     frame/seed sanity line;
 *   - the strongest Earth e-beat period inside the REGISTERED T5c window
 *     395–415 kyr (the criterion the single H/3 line cannot meet).
 *
 * MEASURED CONTEXT banked with the verdict (the 409.4-vs-405.6 anatomy,
 * plan 02 §8): g5 exact to 0.0002 ″/yr; the 0.9% beat gap is g2 0.029 ″/yr
 * low — omitted bodies (separate Moon, asteroids; the measured sensitivity
 * class: 1PN moved g1 by +0.47 ″/yr) plus g2's own chaotic diffusion
 * (measured window sensitivity: 1-Myr 7.3956 vs 20-Myr 7.4230).
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { ROOT, buildInputsBlock } = require('../lib/artifact-inputs');

const WRITE = process.argv.includes('--write');
const OUT = path.join(ROOT, 'data', 'nbody-deep-secular-modes.json');
const DUMP = path.join(ROOT, 'tools', 'explore', 'lattice-long-window-ecliptic-20000000-gr.local.json');
const RUN_CMD = 'node tools/explore/lattice-long-window-test.mjs years=20000000 integrator=wh dt=2 order=2 gr=1 frame=both sample=20000';
const DECIMATE = 4;
const NAFF_TERMS = 18;
const RAD2AS = (180 / Math.PI) * 3600;
// Laskar 2004 Table 3 reference values — THEORY labels, never inputs.
const LA2004 = { g5: 4.2575, g2: 7.452 };
const ROCK_METRONOME_KYR = 405.6;   // the rock-record long-eccentricity period (plan 04 leg)

/** @param {{omegaRadPerYr:number,re:number,im:number}[]} Z @returns {{beatArcsecPerYr:number,beatPeriodKyr:number,lines:{periodKyr:number,amp:number}[]}} */
function beatVerdict(Z) {
  const lines = [];
  for (let i = 0; i < Z.length; i++) {
    for (let j = i + 1; j < Z.length; j++) {
      const dw = Math.abs(Z[i].omegaRadPerYr - Z[j].omegaRadPerYr);
      if (dw < 1e-9) continue;
      lines.push({ periodKyr: (2 * Math.PI) / dw / 1000, amp: Math.hypot(Z[i].re, Z[i].im) * Math.hypot(Z[j].re, Z[j].im) });
    }
  }
  lines.sort((a, b) => b.amp - a.amp);
  const top = lines[0];
  return { beatArcsecPerYr: 1296000 / (top.periodKyr * 1000), beatPeriodKyr: top.periodKyr, lines: lines.slice(0, 8) };
}

if (!WRITE) {
  if (!fs.existsSync(OUT)) { console.log('no artifact yet — run with --write (needs the ±10-Myr dump; see the header)'); process.exit(0); }
  const art = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  console.log('data/nbody-deep-secular-modes.json — current artifact');
  console.log(`  run: ±${art.meta.spanYears / 2} yr, ${art.meta.integrator} dt ${art.meta.dtDays} d, ${art.meta.gr ? '1PN' : 'Newton'}; NAFF ${art.meta.naffTerms} terms (decimation ×${art.meta.decimation})`);
  console.log(`  Earth strongest e-beat: ${art.verdict.strongestBeatPeriodKyr.toFixed(1)} kyr (La2004 g2−g5 ${art.verdict.la2004BeatPeriodKyr.toFixed(1)}; rock metronome ${ROCK_METRONOME_KYR})`);
  console.log('  (generator class — a plain run only prints; --write re-extracts from the dump)');
  process.exit(0);
}

if (!fs.existsSync(DUMP)) {
  console.error('REFUSING: the ±10-Myr ecliptic dump is absent. Produce it first (≈3.4 h):');
  console.error('  ' + RUN_CMD);
  process.exit(1);
}

console.log('hashing the dump …');
const dumpBuf = fs.readFileSync(DUMP);
const dumpSha = crypto.createHash('sha256').update(dumpBuf).digest('hex');
const D = JSON.parse(dumpBuf.toString('utf8'));
if (!(D.integrator === 'wh' && D.dt === 2 && D.gr === true && D.years === 20000000)) {
  console.error(`REFUSING: dump meta ${D.integrator}/dt${D.dt}/gr${D.gr}/${D.years} is not the registered run (wh/dt2/1PN/20e6).`);
  process.exit(1);
}
const maxDE = Math.max(...D.conservation.map((c) => c.maxDE));
if (!(maxDE <= 1e-7)) { console.error(`REFUSING: conservation maxDE ${maxDE} > 1e-7`); process.exit(1); }

console.log(`decimating ×${DECIMATE} …`);
const tmpDump = path.join(os.tmpdir(), 'deep-secular-dec.local.json');
const tmpModes = path.join(os.tmpdir(), 'deep-secular-modes.tmp.json');
{
  const pick = (arr) => arr.filter((_, i) => i % DECIMATE === 0);
  const dec = { ...D, sampleDays: D.sampleDays * DECIMATE, t: pick(D.t), elements: {} };
  for (const k of Object.keys(D.elements)) {
    dec.elements[k] = {};
    for (const el of Object.keys(D.elements[k])) dec.elements[k][el] = pick(D.elements[k][el]);
  }
  fs.writeFileSync(tmpDump, JSON.stringify(dec));
}

console.log(`NAFF at ${NAFF_TERMS} terms (the one-home analyzer; ~75 min) …`);
execFileSync('node', [path.join(ROOT, 'tools', 'explore', 'naff-frequencies.mjs'), `file=${tmpDump}`, `terms=${NAFF_TERMS}`, `out=${tmpModes}`],
  { stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' } });
const MT = JSON.parse(fs.readFileSync(tmpModes, 'utf8'));
fs.unlinkSync(tmpDump); fs.unlinkSync(tmpModes);

// verdict + assertions
const earthZ = MT.modes.earth.z.slice().sort((a, b) => Math.hypot(b.re, b.im) - Math.hypot(a.re, a.im));
const lead = earthZ[0].omegaRadPerYr * RAD2AS;
if (Math.abs(lead - LA2004.g5) > 0.01) { console.error(`REFUSING: Earth leading z-mode ${lead.toFixed(4)} ″/yr is not g5-class (La2004 ${LA2004.g5} ± 0.01)`); process.exit(1); }
const v = beatVerdict(MT.modes.earth.z);
if (!(v.beatPeriodKyr >= 395 && v.beatPeriodKyr <= 415)) {
  console.error(`REFUSING: strongest Earth e-beat ${v.beatPeriodKyr.toFixed(1)} kyr outside the registered T5c window 395–415`);
  process.exit(1);
}
const la2004BeatPeriodKyr = 1296000 / (LA2004.g2 - LA2004.g5) / 1000;
const inBand = (lo, hi) => { const l = v.lines.find((q) => q.periodKyr >= lo && q.periodKyr <= hi); return l ? l.periodKyr : null; };

const art = {
  _description: 'Engine-D DEEP-TIME secular mode table from the model’s own ±10-Myr N-body run (WH order-2, dt 2 d, 1PN, NAFF 18 terms on the 4×-decimated series) — the two-tier Earth-z design’s deep-time law (plan 02 §8 Stage B). Ecliptic-J2000 z-modes (z = e·e^{iϖ} = Σ (re+i·im)·e^{iωt}, t years from J2000), all eight planets. The 1-Myr era-local table (nbody-secular-frequencies.json) stays the in-window evaluator; NO consumer reads this table until its T5d-revised per-consumer gate passes (registered in the plan). La2004 values are theory reference labels, never inputs; the falsification criterion keeps the ROCK 405.6-kyr metronome as its reference. See tools/verify/deep-secular-modes.js for the assertions carried.',
  meta: {
    integrator: D.integrator, order: 2, dtDays: D.dt, spanYears: D.years, sampleDays: D.sampleDays,
    gr: D.gr, seed: 'JPL Horizons J2000 heliocentric state vectors (tools/explore/j2000-state.mjs, the one home)',
    masses: 'DE440 mass ratios (astro-reference physicalConstants)',
    runCommand: RUN_CMD,
    dumpFile: 'tools/explore/lattice-long-window-ecliptic-20000000-gr.local.json (untracked, 337 MB)',
    dumpSha256: dumpSha,
    conservationMaxDE: maxDE,
    decimation: DECIMATE, naffTerms: NAFF_TERMS,
    frame: 'ecliptic-J2000 (z-modes; the invariable-plane ζ deep table is not banked — no registered consumer)',
    laskarRef: 'Laskar, J. et al. (2004), A&A 428, 261–285, Table 3 (theory reference labels)',
  },
  verdict: {
    strongestBeatPeriodKyr: v.beatPeriodKyr,
    strongestBeatArcsecPerYr: v.beatArcsecPerYr,
    la2004BeatPeriodKyr,
    rockMetronomeKyr: ROCK_METRONOME_KYR,
    companion124Kyr: inBand(119, 129),
    companion95Kyr: inBand(90, 100),
    earthLeadingModesArcsecPerYr: earthZ.slice(0, 4).map((m) => m.omegaRadPerYr * RAD2AS),
    topBeatLines: v.lines.map((l) => ({ periodKyr: l.periodKyr, productAmp: l.amp })),
    note: 'g5 matches La2004 to 0.0002 ″/yr; the beat gap vs 405.6 is g2 (chaotic-diffusion window sensitivity + omitted separate-Moon/asteroid terms) — the anatomy is the plan’s Stage-B record.',
  },
  modes: MT.modes,
  inputs: buildInputsBlock('node tools/verify/deep-secular-modes.js --write', [
    'tools/verify/deep-secular-modes.js',
    'tools/explore/naff-frequencies.mjs',
    'tools/explore/lattice-long-window-test.mjs',
  ]),
};
fs.writeFileSync(OUT, JSON.stringify(art, null, 1) + '\n');
console.log(`✓ wrote data/nbody-deep-secular-modes.json — strongest beat ${v.beatPeriodKyr.toFixed(1)} kyr (La2004 ${la2004BeatPeriodKyr.toFixed(1)}, rock ${ROCK_METRONOME_KYR}); companions ${art.verdict.companion124Kyr?.toFixed(1)} / ${art.verdict.companion95Kyr?.toFixed(1)} kyr`);
