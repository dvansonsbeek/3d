/**
 * Cross-engine identity gate: the recorded BROWSER fixture values must equal
 * the NODE engine's live outputs for every shared cardinal-point probe.
 *
 *   node test/cross-engine.test.mjs        (exit 1 on divergence)
 *
 * This is the check that caught nothing three times by luck — run as a
 * scratchpad one-off during the §10g and symmetric-set landings — promoted to
 * a permanent gate ahead of the Phase 7 physics/cardinal extraction, whose
 * gate is exactly this identity. Requires a fresh browser fixture
 * (test:snapshot runs first in the chain).
 *
 * Expectations, calibrated from measurement:
 *   - solstice JDs: BIT-EXACT (Object.is) — the two engines share the §10
 *     evaluation form and the integrated-phase convention; measured 0.000 ms.
 *   - year lengths: BIT-EXACT since Phase 7.2 — the pre-extraction ≤5.6e-8 d
 *     gap turned out to be OPERATION-ORDER divergence between the two
 *     hand-mirrors (per-div phaseAdvance vs 2π·div·c), not the twins; the
 *     shared @essrt/physics/cardinal implementation dissolved it.
 *   - RA: bit-exact since the integrated-phase migration (same reason).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(join(ROOT, 'package.json'));
const OE = require(join(ROOT, 'tools/lib/orbital-engine.js'));

const fixture = JSON.parse(readFileSync(
  join(ROOT, 'packages/fixtures/regression/script-js.json'), 'utf8')).values;

const YL_TOL_DAYS = 0;      // bit-exact — achieved at Phase 7.2 (shared code)
let exact = 0, withinTol = 0, failures = 0;

for (const [key, browserVal] of Object.entries(fixture)) {
  let m;
  let nodeVal, klass;
  if ((m = key.match(/^solsticeJD_(SS|WS|VE|AE)@(-?\d+)$/))) {
    nodeVal = OE.computeSolsticeJD(Number(m[2]), m[1]);
    klass = 'exact';
  } else if ((m = key.match(/^solstice(SS|WS|VE|AE)@(-?\d+)$/))) {
    nodeVal = OE.computeSolsticeYearLength(Number(m[2]), m[1]);
    klass = 'tol';
  } else if ((m = key.match(/^solsticeRA_(SS|WS|VE|AE)@(-?\d+)$/))) {
    nodeVal = OE.computeSolsticeRA(Number(m[2]), m[1]);
    klass = 'tol';
  } else {
    continue;
  }

  if (klass === 'exact') {
    if (Object.is(browserVal, nodeVal)) { exact++; continue; }
    console.log(`  DIVERGED (must be bit-exact) ${key}`);
    console.log(`    browser ${browserVal}`);
    console.log(`    node    ${nodeVal}`);
    failures++;
  } else {
    const d = Math.abs(browserVal - nodeVal);
    if (Object.is(browserVal, nodeVal)) { exact++; continue; }
    if (d <= YL_TOL_DAYS) { withinTol++; continue; }
    console.log(`  DIVERGED (>${YL_TOL_DAYS}) ${key}  Δ=${d.toExponential(3)}`);
    failures++;
  }
}

const total = exact + withinTol + failures;
console.log(`CROSS-ENGINE — ${total} shared probes: ${exact} bit-exact, ${withinTol} within mirror tolerance, ${failures} diverged`);
if (failures) {
  console.log('FAIL — the two engines no longer compute the same cardinal model.');
  process.exit(1);
}
console.log('PASS — browser fixture ≡ Node engine on every shared probe.');
