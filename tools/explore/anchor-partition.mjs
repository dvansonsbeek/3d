#!/usr/bin/env node
// THE DRIVER-1½ ANCHOR PARTITION (plan 04 §4 — the registered obligation;
// plan 01 Phase 20 mirror). μ-conditional vs μ-independent classification of
// the 41 paleo anchors, with the engine-vs-anchor comparison re-run PER CLASS.
//
// WHY. Every deep-time cyclostratigraphic quantity in the literature is
// calibrated against an assumed astronomical model — TimeOpt-class inversions
// tune to the g-beat frequencies (the 405-kyr metronome above all), which are
// exactly the μ-sensitive quantities (period ∝ 1/μ). Such anchors are
// CONDITIONAL on μ = 1 and may not simultaneously calibrate H(t) and test
// M(t) (the W3 circularity guard). Tidal rhythmites, coral/bivalve growth
// bands and the Roche/radiometric endpoint count physical days and tides
// directly — μ-INDEPENDENT. This script partitions data/
// paleo-validation-anchors.json by METHOD (classifier below, one rule per
// method family) and re-evaluates each class with the same recipes the
// paleo-anchors gate uses, so the question "does the recession history
// still validate on the μ-independent anchors ALONE?" gets a measured
// answer. Classification only — no anchor moves, no gate changes.
//
// RESULT (the pre-registered partition, discharged): 16 μ-INDEPENDENT
// (10 Wells corals + flagship-380 + coral-600, Winter, Pannella, Williams
// Elatina, Roche endpoint, Weeli Wolli rhythmite, Moodies bundles) ·
// 23 μ-CONDITIONAL (Wu TimeOptB ×12, Zhou ×6 incl. the paired distances,
// Joffre, Xiamaling, Nanfen, Mitchell-Kirscher, the Triassic compilation) ·
// 2 modern. THE HEADLINE: the recession history holds on the μ-independent
// subset ALONE, 16/16 — Weeli Wolli 2450 Ma −5.2 % (±15 %), Moodies
// 3200 Ma −0.03 %, Williams-620 inside its documented band — so H(t) can be
// calibrated on the independent class and the 23 conditional anchors are
// FREE to serve as M(t) tests through the W3 forward model.
//
//   node tools/explore/anchor-partition.mjs

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const dt = require(ROOT + 'tools/lib/deep-time.js');
const C = require(ROOT + 'tools/lib/constants.js');
const spec = require(ROOT + 'data/paleo-validation-anchors.json');

const RE_KM = C.earthParallaxRadiusKm;
const PREDICT = {
  daysPerYear: (ageMa) => dt.meanYearInDaysAtAge(ageMa),
  lodHr: (ageMa) => dt.meanLodSecondsAtAge(ageMa) / 3600,
  moonDistanceRE: (ageMa) => dt.meanMoonDistanceCorrectedAtAge(ageMa) / RE_KM,
  moonDistanceRawRE: (ageMa) => dt.meanMoonDistanceAtAge(ageMa) / RE_KM,
};

// One rule per method family. Direct physical counts → independent;
// astronomical-model-calibrated inversions/compilations → conditional.
function classify(a) {
  if (a.ageMa === 0) return 'modern';
  const m = a.method.toLowerCase();
  if (/rhythmite|growth band|laminae|increment|bundle|roche|coral/.test(m)) return 'independent';
  // Zhou's paired Earth–Moon distances come out of the SAME cyclostratigraphic
  // records as its LOD values — conditional with them.
  if (/timeopt|cyclostrat|inversion|multi-proxy|compilation|paired earth-moon/.test(m)) return 'conditional';
  return 'UNCLASSIFIED';
}

function evaluate(a) {
  const predicted = PREDICT[a.quantity](a.ageMa);
  const e = a.expectation;
  if (e.type === 'relativePct') {
    const d = (predicted / a.observed - 1) * 100;
    return { ok: Math.abs(d) <= e.tolerancePct, detail: `${d >= 0 ? '+' : ''}${d.toFixed(2)}% (tol ±${e.tolerancePct}%)` };
  }
  if (e.type === 'range') {
    const [lo, hi] = a.observedRange, tol = e.outsideToleranceAbs ?? 0;
    return { ok: predicted >= lo - tol && predicted <= hi + tol, detail: `${predicted.toFixed(2)} vs [${lo}, ${hi}] ±${tol}` };
  }
  if (e.type === 'deviationBandPct') {
    const d = (predicted / a.observed - 1) * 100;
    return { ok: d >= e.band[0] && d <= e.band[1], detail: `documented dev ${d.toFixed(2)}% in [${e.band[0]}, ${e.band[1]}]%`, banded: true };
  }
  if (e.type === 'deviationBandOutsideRange') {
    const [lo, hi] = a.observedRange;
    const dev = predicted > hi ? predicted - hi : predicted < lo ? predicted - lo : 0;
    return { ok: dev >= e.band[0] && dev <= e.band[1], detail: `outside by ${dev.toFixed(2)} in [${e.band[0]}, ${e.band[1]}]`, banded: true };
  }
  return { ok: false, detail: `unknown expectation ${e.type}` };
}

const classes = { independent: [], conditional: [], modern: [], UNCLASSIFIED: [] };
for (const a of spec.anchors) classes[classify(a)].push(a);

for (const [cls, list] of Object.entries(classes)) {
  if (!list.length) continue;
  let pass = 0, banded = 0;
  console.log(`\n=== ${cls.toUpperCase()} — ${list.length} anchor(s) ===`);
  for (const a of list) {
    const r = evaluate(a);
    if (r.ok) pass++;
    if (r.banded) banded++;
    console.log(`  ${r.ok ? '✓' : '✗'} ${a.id.padEnd(24)} ${String(a.ageMa).padStart(5)} Ma  ${a.quantity.padEnd(17)} ${r.detail}   [${a.source}: ${a.method.slice(0, 48)}]`);
  }
  console.log(`  → ${pass}/${list.length} hold (${banded} of them documented-deviation bands, not agreements)`);
}

console.log(`
Reading:
 · The μ-INDEPENDENT class is the only set that may calibrate H(t) in a joint
   H/M inversion; the μ-CONDITIONAL class (TimeOpt/cyclostratigraphy) embeds
   the 405-kyr metronome at μ = 1 and belongs on the M(t)-TEST side only,
   reinterpreted through the two-expansions forward model (W3).
 · This is the pre-registered partition (plan 04 §4); the paleo-anchors gate
   itself is UNCHANGED — all 41 stay in the falsification suite, because as
   a pure μ = 1 consistency test the mixture is legitimate. The partition
   binds only future inversions that fit M(t).`);
