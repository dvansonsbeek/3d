/**
 * Layer 1 must reproduce what `src/script.js` puts in its mutable epoch globals.
 *
 * The comparison is against `packages/fixtures/regression/script-js.json`
 * `epoch@tMa.*` — values recorded FROM THE BROWSER, in headless Chromium, by
 * calling `setEpochByAge(t)` and reading the globals back. So this is not
 * layer1 versus another of my own implementations; it is layer1 versus the
 * thing that actually ships.
 *
 * That matters for B.3. Once the globals become a cache filled from Layer 1,
 * they must land on these same numbers — and this test says so BEFORE the
 * rewiring, not after.
 *
 *   node packages/physics/test/layer1-identity.test.mjs
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createEpochPrimitives } from '../src/layer0/index.js';
import { createDerivedViews } from '../src/layer1/index.js';

const require = createRequire(import.meta.url);
// Runtime-assembled path: tools/lib is pre-migration and outside the typecheck
// scope. See the same note in layer0-identity.test.mjs.
const TOOLS_LIB = '../../../tools/lib/';
const DT = require(`${TOOLS_LIB}deep-time.js`);

const FIXTURE = new URL('../../fixtures/regression/script-js.json', import.meta.url);
const recorded = JSON.parse(readFileSync(FIXTURE, 'utf8')).values;

const L0 = createEpochPrimitives({ params: DT.EPOCH_PARAMS, alphaAtAgeMa: DT.earthMoiFactorAtAge });
const L1 = createDerivedViews({ primitives: L0 });

// Global name in script.js -> the Layer 0/1 view that must reproduce it.
const MAPPING = [
  { global: 'holisticyearLength', view: L0.holisticH },
  { global: 'H', view: L0.holisticH },
  { global: 'meanlengthofday', view: L0.lodSeconds },
  { global: 'meansiderealyearlengthinSeconds', view: L0.siderealYearSeconds },
  { global: 'meansiderealyearlengthinDays', view: L1.siderealYearDays },
  { global: 'meansolaryearlengthinDays', view: L1.tropicalYearDays },
  // The lattice route, which script.js keeps as a separate global.
  { global: 'meansiderealyearlengthinDays_kinematic', view: L1.siderealYearDaysViaLattice },
];

const EPOCHS_MA = [...new Set(
  Object.keys(recorded)
    .filter((k) => k.startsWith('epoch@'))
    .map((k) => Number(k.slice('epoch@'.length, k.indexOf('Ma.')))),
)];

let checked = 0;
/** @type {{key: string, want: number, got: number|null}[]} */
const drift = [];
for (const t of EPOCHS_MA) {
  const year = DT.EPOCH_PARAMS.epochYear - t * 1e6;
  for (const { global: g, view } of MAPPING) {
    const key = `epoch@${t}Ma.${g}`;
    if (!(key in recorded)) continue;
    checked += 1;
    const got = view(year);
    if (!Object.is(got, recorded[key])) drift.push({ key, want: recorded[key], got });
  }
}

// The claim layer1 makes in prose, checked as arithmetic rather than trusted:
// the lattice route and the direct route are the same quantity.
//
// Tolerance is 2 ULP, not exact — deliberately, and measured rather than
// assumed. The two routes cancel algebraically but multiply and divide in a
// different ORDER, so the last bit is not guaranteed. Across this grid they are
// identical at six of seven epochs and 0.7 ULP apart at +0.3 Ma. The BROWSER
// splits at exactly the same single epoch, which is the evidence that this is
// float ordering rather than a porting error. An exact check here would fail
// for a reason that has nothing to do with the model.
const ULP_TOL = 2;
/** @type {{t: number, direct: number|null, lattice: number|null, ulp: number}[]} */
const routeMismatch = [];
for (const t of EPOCHS_MA) {
  const year = DT.EPOCH_PARAMS.epochYear - t * 1e6;
  const direct = L1.siderealYearDays(year);
  const lattice = L1.siderealYearDaysViaLattice(year);
  if (direct === null || lattice === null) {
    if (direct !== lattice) routeMismatch.push({ t, direct, lattice, ulp: NaN });
    continue;
  }
  const ulp = Math.abs(lattice - direct) / (Math.abs(direct) * Number.EPSILON);
  if (ulp > ULP_TOL) routeMismatch.push({ t, direct, lattice, ulp });
}

console.log('LAYER 1 — vs the browser-recorded epoch globals');
console.log('='.repeat(74));
console.log(`  ${checked} comparisons across ${EPOCHS_MA.length} epochs`);

for (const d of drift) {
  const got = d.got ?? NaN;
  const rel = d.want ? (got - d.want) / d.want : NaN;
  console.log(`\n  DRIFT ${d.key}`);
  console.log(`    browser ${d.want}`);
  console.log(`    layer1  ${d.got}`);
  console.log(`    delta   ${got - d.want}  (${rel.toExponential(3)} relative)`);
}
for (const m of routeMismatch) {
  console.log(`\n  ROUTE  sidereal days disagree at ${m.t} Ma by ${m.ulp.toFixed(1)} ULP (tolerance ${ULP_TOL})`);
  console.log(`    direct  ${m.direct}`);
  console.log(`    lattice ${m.lattice}`);
}

if (drift.length || routeMismatch.length) {
  console.log(`\nFAIL — ${drift.length} drifted, ${routeMismatch.length} route mismatch(es).`);
  process.exit(1);
}
console.log(`\nPASS — layer1 reproduces the browser globals exactly; both sidereal routes within ${ULP_TOL} ULP.`);
