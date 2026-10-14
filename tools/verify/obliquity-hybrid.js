#!/usr/bin/env node
/**
 * STAGE-C OBLIQUITY-HYBRID VERDICT — the governed artifact (plan 02 §8,
 * Stage C / K8b-3 opening result; the C-1 publish leg).
 *
 * WRITES data/obliquity-hybrid-verdict.json (tracked; --write only) by
 * running the one-home lab tools/explore/stage-c-obliquity-hybrid.mjs
 * (--json) — ε(t) from the single averaged precession equation with the
 * orbit plane from ENGINE D (the deep ζ-modes of
 * data/nbody-deep-secular-modes.json, anchored at the JPL J2000 seed) and
 * ONE engine-K anchor, α = (H/13 rate)/cos ε₀. ZERO fitted constants.
 *
 * WHAT THE ARTIFACT HOLDS (the registry's Stage-C keys read it): the
 * derived dε/dt(J2000) beside the IAU reference the shipped scene A-solve
 * TARGETS (an input become an output); the ε(t)-vs-La2004 window table for
 * BOTH ζ depths (the two-tier verdict: the top-8 slice owns the era
 * window, the full table owns deep time — the same era-vs-deep tension the
 * e-story measured); the derived H/8 beat |ψ̇| − |s₃|; α and the H/13 rate.
 * La2004 is a THEORY reference label, never an input.
 *
 * ASSERTIONS UNDER --write (T5d revision, owner-approved 2026-09-13):
 *   - the SERIES-INTEGRATED dε/dt(J2000) (data/nbody-secular-series.json →
 *     verdict.rateJ2000ArcsecPerCy — the full-resolution ζ route) within 1%
 *     of the IAU reference (read from the shared astro reference — E20,
 *     never retyped);
 *   - the H/8 beat inside 40–42.5 kyr (lab);
 *   - the era-slice 13-kyr rms beats the mode-table ε's — the same hybrid
 *     integration on a bare createModel()'s 18-mode ζ table, the series-less
 *     configuration (lab; the comb-era "fitted law" is deleted, plan 09).
 * The NAFF-tier truncation slopes (era-8 / full-16) are REPORTED, not
 * gated: the s₃ multiplet (three near-degenerate lines) makes any
 * truncation's local derivative ill-conditioned — measured old/new:
 * full-16 always ≈ −38.5-class; era-8 read −46.96 then −48.00 across two
 * runs whose ε(t) fit IMPROVED (56″ → 50″). The robust local-rate
 * instrument is the series integration (−46.79, 0.10% from IAU).
 * ORDER: regenerate data/nbody-secular-series.json BEFORE this artifact.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { ROOT, buildInputsBlock } = require('../lib/artifact-inputs');
const C = require('../lib/constants.js');

const WRITE = process.argv.includes('--write');
const OUT = path.join(ROOT, 'data', 'obliquity-hybrid-verdict.json');
const LAB = 'tools/explore/stage-c-obliquity-hybrid.mjs';

if (!WRITE) {
  if (!fs.existsSync(OUT)) { console.log('no artifact yet — run with --write'); process.exit(0); }
  const art = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  console.log('data/obliquity-hybrid-verdict.json — current artifact');
  console.log(`  gated deps/dt(J2000) ${(art.verdict.rateSeriesArcsecPerCy ?? art.verdict.rateEraArcsecPerCy).toFixed(2)} ″/cy series-integrated (IAU ref ${art.verdict.iauRateArcsecPerCy}); H/8 beat ${art.verdict.beatKyr.toFixed(1)} kyr; NAFF-tier slopes era ${art.verdict.rateEraArcsecPerCy.toFixed(2)} / full ${art.verdict.rateFullArcsecPerCy.toFixed(2)} (reported, ill-conditioned)`);
  console.log(`  era slice 0–13 kyr: ${art.verdict.windowsEra['13'].hybridRmsArcsec.toFixed(0)}″ vs the mode-table ε ${art.verdict.windowsEra['13'].modeTableRmsArcsec.toFixed(0)}″`);
  console.log('  (generator class — a plain run only prints; --write re-runs the lab)');
  process.exit(0);
}

console.log('running the one-home lab (two ζ-depth integrations, ~1 min) …');
const out = execFileSync('node', [path.join(ROOT, LAB), '--json'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const line = out.split('\n').find((l) => l.startsWith('@@OBLIQUITY_HYBRID_JSON@@ '));
if (!line) { console.error('REFUSING: no @@OBLIQUITY_HYBRID_JSON@@ line in the lab output'); process.exit(1); }
const lab = JSON.parse(line.slice('@@OBLIQUITY_HYBRID_JSON@@ '.length));

const iauRate = C.ASTRO_REFERENCE.obliquityRate_arcsecPerCentury;   // the one home (E20)
// T5d: the gated J2000-local rate is the SERIES-INTEGRATED one (the
// full-resolution ζ route banked by secular-series.js) — the NAFF-tier
// truncation slopes are ill-conditioned in the s₃ multiplet and are
// carried as reported diagnostics only (see the header).
const SERIES = path.join(ROOT, 'data', 'nbody-secular-series.json');
if (!fs.existsSync(SERIES)) {
  console.error('REFUSING: data/nbody-secular-series.json missing — regenerate it first (node tools/verify/secular-series.js --write); this artifact gates on its series-integrated rate.');
  process.exit(1);
}
const seriesVerdict = JSON.parse(fs.readFileSync(SERIES, 'utf8')).verdict;
const seriesRate = seriesVerdict.rateJ2000ArcsecPerCy;
if (!Number.isFinite(seriesRate) || Math.abs(seriesRate - iauRate) > Math.abs(iauRate) * 0.01) {
  console.error(`REFUSING: series-integrated rate ${Number(seriesRate).toFixed(2)} not within 1% of the IAU reference ${iauRate}`);
  process.exit(1);
}
if (!(lab.beatKyr >= 40 && lab.beatKyr <= 42.5)) {
  console.error(`REFUSING: derived obliquity beat ${lab.beatKyr.toFixed(1)} kyr outside 40–42.5`);
  process.exit(1);
}
// v23.0 — the REALIZED obliquity period: the model's own ε(t) over the LR04 window, fitted
// (the full line set, one free p), must sit on the one-home prediction (the window mean of
// the pole rate with its of-date factors, minus |s₃|) within 0.1 % — the self-consistency
// gate between the integration and the law the climate lines ride. Fail-proven via
// ESSRT_OBLIQ_REALIZED_PLANT=1 (perturbs the prediction by 0.5 %).
const rz = lab.realized;
const predicted = rz.modelPredicted.periodYr * (process.env.ESSRT_OBLIQ_REALIZED_PLANT ? 1.005 : 1);
const realizedRel = Math.abs(rz.modelFit.periodYr - predicted) / predicted;
if (!(realizedRel <= 1e-3)) {
  console.error(`REFUSING: realized obliquity period — ε(t) fit ${rz.modelFit.periodYr.toFixed(0)} yr vs the window-mean prediction ${predicted.toFixed(0)} yr (${(realizedRel * 100).toFixed(3)} %, limit 0.1 %)`);
  process.exit(1);
}
const era13 = lab.windowsEra['13'];
if (!(era13.hybridRmsArcsec < era13.modeTableRmsArcsec)) {
  console.error(`REFUSING: era-slice 13-kyr rms ${era13.hybridRmsArcsec.toFixed(0)}″ does not beat the mode-table ε's ${era13.modeTableRmsArcsec.toFixed(0)}″`);
  process.exit(1);
}

const art = {
  _description: 'Stage-C obliquity-hybrid verdict — ε(t) from ds/dt = α(ŝ·n̂)(ŝ×n̂) with the orbit plane from engine D (the deep ζ-modes of nbody-deep-secular-modes.json, JPL-seed anchored) and ONE engine-K anchor α = (H/13 rate)/cos ε₀; ZERO fitted constants. The derived dε/dt(J2000) sits beside the IAU reference the shipped scene A-solve TARGETS; the window tables (vs La2004, a THEORY reference label) carry BOTH ζ depths — the two-tier verdict (era slice vs full deep table). GENERATED by tools/verify/obliquity-hybrid.js --write, which runs the one-home lab tools/explore/stage-c-obliquity-hybrid.mjs. See the plan 02 §8 Stage-C record for the discovery measurements and the convention catch.',
  verdict: {
    alphaArcsecPerYr: lab.alphaArcsecPerYr,
    psiDotH13ArcsecPerYr: lab.psiDotH13ArcsecPerYr,
    rateSeriesArcsecPerCy: seriesRate,   // T5d: the GATED J2000-local rate (series-integrated, full-resolution ζ)
    rateFullArcsecPerCy: lab.rateFullArcsecPerCy,   // reported only — ill-conditioned truncation slope
    rateEraArcsecPerCy: lab.rateEraArcsecPerCy,     // reported only — ill-conditioned truncation slope
    iauRateArcsecPerCy: iauRate,
    beatKyr: lab.beatKyr,   // v22.0: the J2000 beat on the spin axis's inertial rate (the shipped model's one home)
    realized: lab.realized,  // v23.0: the realized obliquity period over the LR04 window — model ε(t) fit, the window-mean prediction, La2004's fit (theory label)
    zetaTermsFull: lab.zetaTermsFull,
    zetaTermsEra: lab.zetaTermsEra,
    windowsFull: lab.windowsFull,
    windowsEra: lab.windowsEra,
  },
  inputs: buildInputsBlock('node tools/verify/obliquity-hybrid.js --write', [
    'tools/verify/obliquity-hybrid.js',
    'tools/explore/stage-c-obliquity-hybrid.mjs',
    'data/nbody-deep-secular-modes.json',
    'data/nbody-secular-series.json',
    'data/la2004-earth-51myr-back.asc',
    'data/lr04-stack.txt',   // v23.0: the realized window is the record's span
    'packages/physics/src/model.js',   // v23.0: the one-home window-mean pole rate the verdict gates on
    // R4 (measured): the verdict runs the hybrid on these evaluators; they
    // were not inputs, so the banked verdict had gone stale unseen (the
    // fitted-law rows 711″ → 529″, the deep fork rows) until an unrelated
    // input change forced a regeneration.
    'packages/physics/src/earth/deep-orbital-history.cjs',
    'packages/physics/src/deltat/deep-time.cjs',
    'packages/physics/src/earth/precession-composed.cjs',
    'tools/lib/deep-time.js',
  ]),
};
fs.writeFileSync(OUT, JSON.stringify(art, null, 1) + '\n');
console.log(`✓ wrote data/obliquity-hybrid-verdict.json — gated series rate ${seriesRate.toFixed(2)} ″/cy (IAU ${iauRate}), J2000 beat ${lab.beatKyr.toFixed(2)} kyr, realized ${rz.modelFit.periodYr.toFixed(0)} yr (predicted ${rz.modelPredicted.periodYr.toFixed(0)}, La2004 ${rz.la2004Fit.periodYr.toFixed(0)}), era 13-kyr ${era13.hybridRmsArcsec.toFixed(0)}″ vs mode-table ε ${era13.modeTableRmsArcsec.toFixed(0)}″ (NAFF-tier slopes reported: era ${lab.rateEraArcsecPerCy.toFixed(2)} / full ${lab.rateFullArcsecPerCy.toFixed(2)})`);
