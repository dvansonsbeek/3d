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
 *                   frame=both sample=20000 lunar=1 asteroids=1 mean=1   (~13 h)
 *      → tools/explore/lattice-long-window-ecliptic-20000000-gr.local.json
 *      (the calibrated lunar quadrupole on the Sun–EMB interaction and
 *      Ceres/Vesta/Pallas as force-only bodies — the dump's `physics` block
 *      records both and is copied into meta; the pre-lunar twin
 *      `…-gr-pre-lunar.local.json` is the point-mass record).
 *      mean=1: each 20,000-d sample is the RUNNING MEAN of the osculating
 *      vectors (z, ζ, unwrapped L, a) over its own interval, accumulated
 *      every 20 d — not the instantaneous elements at the sample instant.
 *      Measured: point sampling at 54.76 yr aliased ~1e-4 of Jupiter/Venus
 *      short-period content into the secular band (Earth's secular e
 *      0.5e-5 rms off DE441 through the series' 1-kyr boxcar, ϖ 56″); the
 *      running mean reads 0.08e-5 / 6″. The dump's `sampling` block records
 *      the form and is copied into meta; a point-sampled dump is refused.
 *      Cost: the element conversion every 20 d makes the run ~13 h of
 *      compute (measured 48,588 s) where the point-sampled run took 3.4 h.
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
 * MEASURED CONTEXT banked with the verdict (doc 109 §17): g5 matches La2004
 * to 0.0001 ″/yr. The point-mass run (EMB merged, no asteroids — the
 * pre-lunar dump) read g2 = 7.4230 ″/yr, 0.029 ″/yr (0.39 %) below La2004's
 * 7.452, beat 409.4 kyr; the shipped run's lunar quadrupole + asteroids move
 * g2 to 7.4524 (the lab's asteroid measurement is null for Earth, so it is
 * the Moon) — on La2004 to its published digits (La2010a: 7.453; the
 * literature's own 100-Myr wander of g2 is 0.019 ″/yr) — and the beat to
 * 405.6 against La2004's 405.7 and the rock value 405.6. No gap remains to
 * attribute. Measured with naff-frequencies.mjs on the two dumps. The same
 * pair in the time domain: the shipped run's Earth e(t) tracks La2004 at
 * 3e-5 rms over the last 500 kyr and 7e-5 over 5–10 Myr; the point-mass run
 * departs to 7e-4 and 1e-2 on the same windows.
 *
 * REFERENCE VALUES: La2004's main secular frequencies as tabulated in
 * Laskar et al. (2011), A&A 532, A89, Table 6 (La2004 | La2010a columns):
 * g2 7.452 | 7.453, g5 4.257452 | 4.257482.
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
const RUN_CMD = 'node tools/explore/lattice-long-window-test.mjs years=20000000 integrator=wh dt=2 order=2 gr=1 frame=both sample=20000 lunar=1 asteroids=1 mean=1';
const DECIMATE = 4;
const NAFF_TERMS = 18;
// Stage C: the obliquity hybrid consumes the deep ζ table — 16 terms
// (the z rows are unaffected; NAFF is deterministic, so re-extraction
// reproduces them bit-for-bit and the lunar chain's embed is unchanged
// in content).
const NAFF_ZETA_TERMS = 16;
const NAFF_ZETA_TERMS_ERA = 8;   // the era-tier ζ table is its OWN extraction
const RAD2AS = (180 / Math.PI) * 3600;
// Laskar 2004 Table 3 reference values — THEORY labels, never inputs.
const LA2004 = { g5: 4.2575, g2: 7.452 };
const ROCK_METRONOME_KYR = 405.6;   // the rock-record long-eccentricity period (plan 04 leg)
// The point-mass twin's g2 (the pre-lunar 20-Myr dump, EMB merged, no
// asteroids; naff-frequencies.mjs terms=6) — a RECORD for the verdict note,
// never an input: that dump is untracked and not read here.
const POINT_MASS_G2 = 7.4230;

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
  console.error('REFUSING: the ±10-Myr ecliptic dump is absent. Produce it first (≈13 h):');
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
if (!(D.sampling && D.sampling.kind === 'running mean')) {
  console.error(`REFUSING: dump sampling ${JSON.stringify(D.sampling ?? 'absent')} is not the registered running mean (mean=1); point sampling aliases short-period content into the secular band.`);
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

console.log(`NAFF at ${NAFF_TERMS} terms (the one-home analyzer; ~2 h) …`);
execFileSync('node', [path.join(ROOT, 'tools', 'explore', 'naff-frequencies.mjs'), `file=${tmpDump}`, `terms=${NAFF_TERMS}`, `zterms=${NAFF_ZETA_TERMS}`, `out=${tmpModes}`],
  { stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' } });
const MT = JSON.parse(fs.readFileSync(tmpModes, 'utf8'));

// SECOND ζ pass — the ERA tier (Stage C two-tier verdict). A top-8 SLICE of
// the deep table is NOT the pure 8-term extraction (Gram–Schmidt on the
// later multiplet terms reshapes the early amplitudes — measured: the
// sliced era rate drifts 0.5″/cy). The era tier is therefore its own
// extraction: zterms=8 (terms=1 skips the z work — ζ is independent of z).
console.log('NAFF era-ζ pass (zterms=8; ~15 min) …');
execFileSync('node', [path.join(ROOT, 'tools', 'explore', 'naff-frequencies.mjs'), `file=${tmpDump}`, 'terms=1', `zterms=${NAFF_ZETA_TERMS_ERA}`, `out=${tmpModes}`],
  { stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' } });
const MT_ERA = JSON.parse(fs.readFileSync(tmpModes, 'utf8'));
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
// the verdict note's numbers are WRITTEN from this extraction (the second
// Earth z-mode by amplitude is g2 — asserted, so the note cannot mislabel)
const g2 = earthZ[1].omegaRadPerYr * RAD2AS;
if (Math.abs(g2 - LA2004.g2) > 0.05) { console.error(`REFUSING: Earth second z-mode ${g2.toFixed(4)} ″/yr is not g2-class (La2004 ${LA2004.g2} ± 0.05)`); process.exit(1); }
const verdictNote = `g5 matches La2004 to ${Math.abs(lead - LA2004.g5).toFixed(4)} ″/yr and g2 (${g2.toFixed(4)}) to ${Math.abs(g2 - LA2004.g2).toFixed(4)} ″/yr (La2004 ${LA2004.g2}, La2010a 7.453) — the point-mass run read ${POINT_MASS_G2.toFixed(4)} (EMB merged, no asteroids; the pre-lunar dump), ${(LA2004.g2 - POINT_MASS_G2).toFixed(3)} ″/yr low; the lunar quadrupole + asteroids this run carries supply ${(g2 - POINT_MASS_G2).toFixed(4)} ″/yr (the lab’s asteroid effect on Earth is null, so it is the Moon) and close that gap — doc 109 §17.`;

const art = {
  _description: 'Engine-D DEEP-TIME secular mode table from the model’s own ±10-Myr N-body run (WH order-2, dt 2 d, 1PN, NAFF 18 terms on the 4×-decimated series) — the two-tier Earth-z design’s deep-time law (plan 02 §8 Stage B). Ecliptic-J2000 z-modes (z = e·e^{iϖ} = Σ (re+i·im)·e^{iωt}, t years from J2000), all eight planets. The 1-Myr era-local table (nbody-secular-frequencies.json) stays the in-window evaluator; NO consumer reads this table until its T5d-revised per-consumer gate passes (registered in the plan). La2004 values are theory reference labels, never inputs; the falsification criterion keeps the ROCK 405.6-kyr metronome as its reference. See tools/verify/deep-secular-modes.js for the assertions carried.',
  meta: {
    integrator: D.integrator, order: 2, dtDays: D.dt, spanYears: D.years, sampleDays: D.sampleDays,
    gr: D.gr, seed: 'JPL Horizons J2000 heliocentric state vectors (tools/explore/j2000-state.mjs, the one home)',
    masses: 'DE440 mass ratios (astro-reference physicalConstants)',
    runCommand: RUN_CMD,
    // the dump's own provenance block: the lunar quadrupole (calibrated
    // effective factor) and the force-only asteroids the run carried
    physics: D.physics ?? null,
    // the dump's sampling form: running means over each 20,000-d interval
    sampling: D.sampling ?? null,
    dumpFile: 'tools/explore/lattice-long-window-ecliptic-20000000-gr.local.json (untracked, 337 MB)',
    dumpSha256: dumpSha,
    conservationMaxDE: maxDE,
    decimation: DECIMATE, naffTerms: NAFF_TERMS, naffZetaTerms: NAFF_ZETA_TERMS,
    naffZetaTermsEra: NAFF_ZETA_TERMS_ERA,
    frame: 'ecliptic-J2000 (z-modes for the lunar-chain e; ζ-modes for the Stage-C obliquity hybrid — the invariable-frame ζ table remains unbanked, no consumer)',
    laskarRef: 'Laskar, J. et al. (2004), A&A 428, 261–285, Table 3, as tabulated beside La2010a in Laskar et al. (2011), A&A 532, A89, Table 6 (theory reference labels)',
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
    note: verdictNote,
  },
  modes: MT.modes,
  // The era-tier ζ table (pure 8-term extraction — the Stage-C obliquity
  // hybrid's J2000-local tier; NOT a slice of the deep table, see above).
  earthZetaEra: MT_ERA.modes.earth.zeta,
  inputs: buildInputsBlock('node tools/verify/deep-secular-modes.js --write', [
    'tools/verify/deep-secular-modes.js',
    'tools/explore/naff-frequencies.mjs',
    'tools/explore/lattice-long-window-test.mjs',
  ]),
};
fs.writeFileSync(OUT, JSON.stringify(art, null, 1) + '\n');
console.log(`✓ wrote data/nbody-deep-secular-modes.json — strongest beat ${v.beatPeriodKyr.toFixed(1)} kyr (La2004 ${la2004BeatPeriodKyr.toFixed(1)}, rock ${ROCK_METRONOME_KYR}); companions ${art.verdict.companion124Kyr?.toFixed(1)} / ${art.verdict.companion95Kyr?.toFixed(1)} kyr`);
