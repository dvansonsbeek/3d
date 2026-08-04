/**
 * Record / check the `src/script.js` regression fixture (plan §5c).
 *
 *   node test/browser/snapshot.test.mjs           check  (exit 1 on drift)
 *   node test/browser/snapshot.test.mjs --write   re-record
 *
 * THIS IS THE TIER THAT GUARDS PHASE 8. `tools/lib` is a few thousand lines and
 * already pure; `src/script.js` is ~64,700 lines and is what Phase 8 dissolves.
 * Without this snapshot, "the extraction changed nothing" is unverifiable for
 * the majority of the code.
 *
 * Everything is read at the J2000 epoch, which the harness resets to first —
 * `f(Y)` is currently epoch-dependent (see transparency.test.mjs), so a snapshot
 * taken at a drifting epoch would not be reproducible. That dependence is the
 * defect being tracked, not something this file works around silently.
 *
 * Exact comparison, deliberately: see record-tools-lib.mjs for the reasoning.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openSimulator } from './harness.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT = join(ROOT, 'packages/fixtures/regression/script-js.json');

// Spread across the fit window and well outside it. Values AT the anchor alone
// would be a tautology (CLAUDE.md), so the grid deliberately reaches away.
//
// The deep years are not decoration. Until they were added this grid stopped at
// 6000 CE, so it could not see the deep-time chain at all — and that chain is
// precisely what the Phase 6 port moves. An error growing as Δt² (the R4 class:
// 0.005 d at −10 kyr, 3.3 d at −302 kyr) would have been bit-identical on every
// value here and catastrophic at the Step 6a window edge. −302635 IS that edge.
const YEARS = [
  -302635, -100000, -25000,                        // deep — the H window
  -4000, -2000, 0, 1000, 1500, 1900, 2000, 2025, 2100, 3000, 6000,
  32682,                                            // deep — the far bracket
];

// Epochs at which to re-read the seven mutable globals. `anchors()` SHOULD
// depend on the epoch — that is its job, and it is what `recomputeEpochAnchors`
// exists to do. `f(Y)` is the thing that must not (transparency.test.mjs).
// Recording anchors@t pins the deep-time chain's output, so Phase 6 cannot move
// it while leaving f(Y) looking clean.
const EPOCHS_MA = [-5, -1, -0.3, 0, 0.3, 1, 5];

const write = process.argv.includes('--write');
const s = await openSimulator();

const measured = await s.page.evaluate(({ YEARS, EPOCHS_MA }) => {
  const T = window.__test__;
  T.resetEpochToJ2000();

  const v = {};
  const a = T.anchors();
  for (const [k, n] of Object.entries(a)) v[`anchor.${k}`] = n;

  for (const y of YEARS) {
    v[`solarYearDays@${y}`] = T.computeSolarYearDaysFromCardinals(y);
    v[`siderealYearDays@${y}`] = T.computeSiderealYearDaysDirect(y);
    v[`solsticeSS@${y}`] = T.computeSolsticeYearLength(y, 'SS');
    v[`solsticeWS@${y}`] = T.computeSolsticeYearLength(y, 'WS');
    v[`solsticeVE@${y}`] = T.computeSolsticeYearLength(y, 'VE');
    v[`solsticeAE@${y}`] = T.computeSolsticeYearLength(y, 'AE');
    // The JD form has its own failure modes the year-length probes cannot see:
    // its equation-of-centre path NaN'd for two phases with no probe noticing.
    // ALL FOUR types + RA — the Phase 7 extraction gate needs the full surface
    // (VE/AE year lengths, WS/AE JD and RA had no probes at all before it).
    v[`solsticeJD_SS@${y}`] = T.computeSolsticeJD(y, 'SS');
    v[`solsticeJD_VE@${y}`] = T.computeSolsticeJD(y, 'VE');
    v[`solsticeJD_WS@${y}`] = T.computeSolsticeJD(y, 'WS');
    v[`solsticeJD_AE@${y}`] = T.computeSolsticeJD(y, 'AE');
    v[`solsticeRA_SS@${y}`] = T.computeSolsticeRA(y, 'SS');
    v[`solsticeRA_VE@${y}`] = T.computeSolsticeRA(y, 'VE');
  }

  // The deep-time chain, read through the globals it fills. Restore J2000 after
  // each so a failure mid-loop cannot leave the scene on a foreign epoch and
  // silently poison every later value.
  for (const t of EPOCHS_MA) {
    T.setEpochByAge(t);
    for (const [k, n] of Object.entries(T.anchors())) v[`epoch@${t}Ma.${k}`] = n;
    T.resetEpochToJ2000();
  }

  // The reset must be exact, or every anchor above is measured against a
  // drifting baseline. Recorded rather than asserted so the fixture shows it.
  const back = T.anchors();
  for (const [k, n] of Object.entries(back)) {
    if (!Object.is(n, a[k])) v[`roundTripDrift.${k}`] = n - a[k];
  }
  return v;
}, { YEARS, EPOCHS_MA });

const pageErrors = s.errors.length;
await s.dispose();

if (pageErrors) console.log(`  note: ${pageErrors} page error(s) during load`);

if (write) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify({
    _comment: 'REGRESSION fixture — what src/script.js does today, through window.__test__. `anchor.*` and `f(Y)@year` are read at J2000; `epoch@tMa.*` re-reads the seven globals AT that epoch (they are meant to depend on it). epoch@0Ma equals anchor.* since B.3b: resetEpochToJ2000 restores the module-load seeds exactly, so the R16 hysteresis is gone and roundTripDrift.* keys no longer appear (they were recorded only when reset failed to restore). The 118 ms seed-vs-chain gap at J2000 is R1 fit basis and closes with the Phase C/D refit. Must never change unintentionally. Regenerate: npm run build && node test/browser/snapshot.test.mjs --write',
    _source: 'src/script.js via dist/, headless Chromium',
    values: measured,
  }, null, 2)}\n`);
  console.log(`recorded ${Object.keys(measured).length} values -> packages/fixtures/regression/script-js.json`);
  process.exit(0);
}

let expected;
try {
  expected = JSON.parse(readFileSync(OUT, 'utf8')).values;
} catch {
  console.error(`No fixture at ${OUT}. Record it first:\n  npm run build && node test/browser/snapshot.test.mjs --write`);
  process.exit(1);
}

const drift = [];
const missing = [];
for (const [k, want] of Object.entries(expected)) {
  if (!(k in measured)) { missing.push(k); continue; }
  if (!Object.is(measured[k], want)) drift.push({ k, want, got: measured[k] });
}
const added = Object.keys(measured).filter((k) => !(k in expected));

console.log('REGRESSION — src/script.js (headless)');
console.log('='.repeat(74));
console.log(`  ${Object.keys(expected).length} fixture values checked`);

for (const { k, want, got } of drift) {
  const rel = want !== 0 ? (got - want) / want : NaN;
  console.log(`\n  DRIFT ${k}`);
  console.log(`    expected ${want}`);
  console.log(`    got      ${got}`);
  console.log(`    delta    ${got - want}  (${rel.toExponential(3)} relative)`);
}
for (const k of missing) console.log(`  GONE  ${k} — fixture exists, the page no longer produces it`);
for (const k of added) console.log(`  NEW   ${k} — page produces it, fixture does not cover it (re-record)`);

if (drift.length || missing.length) {
  console.log(`\nFAIL — ${drift.length} drifted, ${missing.length} missing.`);
  console.log('If the change was intended, re-record with --write and say so in the commit.');
  process.exit(1);
}
console.log(added.length ? `\nPASS (with ${added.length} uncovered new value(s))` : '\nPASS — no drift.');
