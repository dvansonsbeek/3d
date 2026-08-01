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
const YEARS = [-4000, -2000, 0, 1000, 1500, 1900, 2000, 2025, 2100, 3000, 6000];

const write = process.argv.includes('--write');
const s = await openSimulator();

const measured = await s.page.evaluate(({ YEARS }) => {
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
  }
  return v;
}, { YEARS });

const pageErrors = s.errors.length;
await s.dispose();

if (pageErrors) console.log(`  note: ${pageErrors} page error(s) during load`);

if (write) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify({
    _comment: 'REGRESSION fixture — what src/script.js does today, read at the J2000 epoch through window.__test__. Must never change unintentionally. Regenerate: npm run build && node test/browser/snapshot.test.mjs --write',
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
