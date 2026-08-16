/**
 * Epoch-consistency gate: the pure f(Y) year-length evaluators must agree
 * with the epoch-anchor chain (recomputeEpochAnchors) at the same epoch.
 *
 *   node test/browser/epoch-consistency.test.mjs      (exit 1 on mismatch)
 *
 * WHY THIS GATE EXISTS. The R16 purity fix froze the evaluators' Fourier
 * baselines to J2000 consts so f(Y) would not depend on scene-epoch state
 * (transparency gate). The contract was that a pure epoch-aware baseline
 * replaces the mutable-global read — but nothing verified the two chains
 * still agreed, and they silently did not: under deep time the evaluators
 * stayed frozen at J2000 while the anchors moved. User-visible result: the
 * solar-day panel froze — LOD_real at year 9001 read 86400.006 s where the
 * model says 86400.156 s, ΔT rate 2.2 s/yr vs 57 s/yr.
 *
 * The snapshot golden master cannot catch this class: it records whatever
 * the code does. This gate pins the INVARIANT between the two chains.
 *
 * Tolerance 0.002 d: above the evaluators' harmonic content (≤ ~3e-4 d for
 * the tropical set), far below the frozen-baseline failure (0.1–0.5 d at
 * ±1–5 Myr).
 */
import { openSimulator } from './harness.mjs';

const EPOCHS_MA = [-5, -1, 1, 5];
const TOL_DAYS = 0.002;

const s = await openSimulator();

const rows = await s.page.evaluate(({ EPOCHS_MA }) => {
  const T = window.__test__;
  T.resetEpochToJ2000();
  const out = [];
  for (const t of EPOCHS_MA) {
    T.setEpochByAge(t);
    const a = T.anchors();
    const year = 2000 - t * 1e6;
    // Phase 20.2 delegation-gate purity pin: evaluate the Layer-4 composite
    // while the scene sits on the foreign epoch...
    const lodRealMutated = T.computeLodRealSecondsAtEpoch(year);
    T.resetEpochToJ2000();
    const H_t = a.holisticyearLength;
    out.push({
      t, year,
      // What the epoch-anchor chain says at this epoch (the mutated globals,
      // plus the anomalistic identity anom = trop·(H/16)/(H/16−1) they imply).
      sidKinAnchor: a.meansiderealyearlengthinDays_kinematic,
      solAnchor: a.meansolaryearlengthinDays,
      anomAnchor: a.meansolaryearlengthinDays * (H_t / 16) / (H_t / 16 - 1),
      // What the pure f(Y) evaluators say at the same year, J2000 scene state.
      sidEval: T.computeSiderealYearDaysDirect(year),
      solEval: T.computeSolarYearDaysDirect(year),
      anomEval: T.computeAnomalisticYearDaysDirect(year),
      // ...and again at J2000 scene state — must be bit-equal (purity).
      lodRealPure: T.computeLodRealSecondsAtEpoch(year),
      lodRealMutated,
    });
  }
  return out;
}, { EPOCHS_MA });

const pageErrors = s.errors.length;
await s.dispose();
if (pageErrors) console.log(`  note: ${pageErrors} page error(s) during load`);

console.log('EPOCH CONSISTENCY — f(Y) evaluators vs recomputeEpochAnchors');
console.log('============================================================');
let fail = 0;
for (const r of rows) {
  for (const [label, evalV, anchorV] of [
    ['sidereal (kinematic)', r.sidEval, r.sidKinAnchor],
    ['tropical', r.solEval, r.solAnchor],
    ['anomalistic', r.anomEval, r.anomAnchor],
  ]) {
    const d = evalV - anchorV;
    const ok = Number.isFinite(d) && Math.abs(d) <= TOL_DAYS;
    if (!ok) fail++;
    console.log(`${ok ? '  ok ' : 'FAIL '} ${String(r.t).padStart(4)} Ma  ${label.padEnd(22)}`
      + ` eval ${Number(evalV).toFixed(9)}  anchor ${anchorV.toFixed(9)}  Δ ${Number(d).toExponential(2)} d`);
  }
}

// Delegation-gate purity pin (Phase 20.2): the Layer-4 composite must be
// scene-state independent — bit-equal on the mutated epoch and at J2000 state.
for (const r of rows) {
  const ok = Object.is(r.lodRealPure, r.lodRealMutated);
  if (!ok) fail++;
  console.log(`${ok ? '  ok ' : 'FAIL '} ${String(r.t).padStart(4)} Ma  lodReal purity`
    + `         ${Number(r.lodRealPure).toFixed(9)} s ${ok ? '(bit-equal)' : `vs mutated ${r.lodRealMutated}`}`);
}

if (fail) {
  console.log(`\nFAIL — ${fail} evaluator/anchor mismatches: the f(Y) year-length`
    + ' baselines are not tracking the epoch (frozen at J2000?), or the lodReal'
    + ' composite has become scene-state dependent.');
  process.exit(1);
}
console.log('\nPASS — f(Y) year-length evaluators track the epoch-anchor chain.');
