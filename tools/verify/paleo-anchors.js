#!/usr/bin/env node
/**
 * PALEO-ANCHORS GATE (Phase 19 — deep-time validation dossier)
 * ============================================================
 *
 * The dossier's central claim — "the model's deep-time curve passes through
 * the published paleontological record" — asserted, not narrated. Every
 * model prediction is recomputed LIVE from the engine (nothing pre-stored)
 * and compared against data/paleo-validation-anchors.json, which carries
 * the published observed values with per-anchor expectations.
 *
 * Three expectation classes, and the third is the load-bearing one:
 *   relativePct                — an agreement claim; fails on drift.
 *   range (+ tolerance)        — an inside-the-error-bar claim.
 *   deviationBand*             — a DOCUMENTED deviation (Williams 620 Ma,
 *                                the Wu Pangea interval): the prediction
 *                                must stay INSIDE the documented band. An
 *                                unexplained IMPROVEMENT fails too — the
 *                                verify-laws precedent: a suddenly-matching
 *                                miss means the formula changed, and that
 *                                needs investigating, not celebrating.
 *
 * Fail-proven on a planted tolerance violation.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const dt = require(path.join(ROOT, 'tools', 'lib', 'deep-time.js'));
const C = require(path.join(ROOT, 'tools', 'lib', 'constants.js'));
const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'paleo-validation-anchors.json'), 'utf8'));

const RE_KM = C.earthParallaxRadiusKm;

/** The recipe table — mirrors _meta.recipes in the JSON. */
const PREDICT = {
  daysPerYear: (ageMa) => dt.meanYearInDaysAtAge(ageMa),
  lodHr: (ageMa) => dt.meanLodSecondsAtAge(ageMa) / 3600,
  moonDistanceRE: (ageMa) => dt.meanMoonDistanceCorrectedAtAge(ageMa) / RE_KM,
  moonDistanceRawRE: (ageMa) => dt.meanMoonDistanceAtAge(ageMa) / RE_KM,
};

const failures = [];
const lines = [];
let checks = 0;

for (const a of spec.anchors) {
  checks++;
  const predictFn = PREDICT[a.quantity];
  if (!predictFn) { failures.push(`${a.id}: unknown quantity "${a.quantity}"`); continue; }
  const predicted = predictFn(a.ageMa);
  if (!Number.isFinite(predicted)) { failures.push(`${a.id}: prediction not finite (${predicted})`); continue; }
  const e = a.expectation;

  if (e.type === 'relativePct') {
    const deltaPct = (predicted / a.observed - 1) * 100;
    const ok = Math.abs(deltaPct) <= e.tolerancePct;
    lines.push(`  ${ok ? '✓' : '✗'} ${a.id}: ${predicted.toFixed(2)} vs ${a.observed} (${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(2)}% | tol ±${e.tolerancePct}%)`);
    if (!ok) failures.push(`${a.id}: ${deltaPct.toFixed(2)}% exceeds ±${e.tolerancePct}%`);

  } else if (e.type === 'range') {
    const [lo, hi] = a.observedRange;
    const tol = e.outsideToleranceAbs ?? 0;
    const ok = predicted >= lo - tol && predicted <= hi + tol;
    lines.push(`  ${ok ? '✓' : '✗'} ${a.id}: ${predicted.toFixed(2)} vs [${lo}, ${hi}] (±${tol} outside allowed)`);
    if (!ok) failures.push(`${a.id}: ${predicted.toFixed(2)} outside [${lo - tol}, ${hi + tol}]`);

  } else if (e.type === 'deviationBandPct') {
    const deltaPct = (predicted / a.observed - 1) * 100;
    const ok = deltaPct >= e.band[0] && deltaPct <= e.band[1];
    lines.push(`  ${ok ? '✓' : '✗'} ${a.id}: documented deviation ${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(2)}% (must stay in [${e.band[0]}, ${e.band[1]}]%)`);
    if (!ok) failures.push(`${a.id}: deviation ${deltaPct.toFixed(2)}% left the documented band [${e.band[0]}, ${e.band[1]}]% — if this is an IMPROVEMENT, the formula changed; investigate before touching the band`);

  } else if (e.type === 'deviationBandOutsideRange') {
    const [lo, hi] = a.observedRange;
    const dev = predicted > hi ? predicted - hi : predicted < lo ? predicted - lo : 0;
    const ok = dev >= e.band[0] && dev <= e.band[1];
    lines.push(`  ${ok ? '✓' : '✗'} ${a.id}: ${predicted.toFixed(2)} vs [${lo}, ${hi}] → outside by ${dev.toFixed(2)} (must stay in [${e.band[0]}, ${e.band[1]}])`);
    if (!ok) failures.push(`${a.id}: deviation ${dev.toFixed(2)} left the documented band [${e.band[0]}, ${e.band[1]}] — if this is an IMPROVEMENT, the formula changed; investigate before touching the band`);

  } else {
    failures.push(`${a.id}: unknown expectation type "${e.type}"`);
  }
}

console.log(`paleo-anchors gate — ${checks} anchors (Wells 1963 · Winter 2020 · Pannella 1972 · Williams 2000 · Mitchell-Kirscher 2023 · Wu 2024 · Patterson/Roche):`);
for (const l of lines) console.log(l);

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} anchor violation(s):`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}
console.log(`\nPASS — all ${checks} anchors hold (agreements within tolerance, documented deviations inside their bands).`);
