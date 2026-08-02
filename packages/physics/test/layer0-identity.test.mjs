/**
 * Layer 0 must be BIT-IDENTICAL to the shipped `tools/lib/deep-time.js` chain.
 *
 * Phase B moves code, it does not change numbers. Every R-fix lands in Phase C,
 * so any difference here is a migration defect — full stop. Exact comparison
 * with `Object.is`, no tolerance: a port that is "close" is a port that has
 * silently changed the model.
 *
 * The grid deliberately includes the tidal-lock edge and the Step 6a window
 * edge. A chain error growing as dt^2 is invisible near J2000 and 3.3 d at
 * -302 kyr, so a near-epoch-only comparison proves nothing (CLAUDE.md).
 *
 *   node packages/physics/test/layer0-identity.test.mjs
 */
import { createRequire } from 'node:module';
import { createEpochPrimitives } from '../src/layer0/index.js';

const require = createRequire(import.meta.url);

// tools/lib is PRE-MIGRATION and deliberately outside the typecheck scope
// (jsconfig: "Scope is packages/ only"). `exclude` does not cover files reached
// through imports — the same gap that made `maxNodeModuleJsDepth: 0` necessary
// — so a STATIC require here drags ~2,000 lines of implicit-any into the gate
// and drowns the signal. Assembling the path at runtime keeps the checker out.
// This bridge disappears in B.3, when tools/lib becomes a Layer 0 adapter.
const TOOLS_LIB = '../../../tools/lib/';
const DT = require(`${TOOLS_LIB}deep-time.js`);

// Both come from deep-time.js, which derives them once from constants.js.
// Re-deriving them here would test my arithmetic against itself rather than
// testing the port — and re-derivation is precisely how five implementations
// drifted apart in the first place.
//
// `alphaAtYear` is the LIVE α(t) channel. R2 (pinning α at its J2000 reference
// while BUILDING a lattice table) is a Phase C change and is deliberately not
// applied: this test proves the port is faithful to today's behaviour,
// today's α convention included.
const L0 = createEpochPrimitives({ params: DT.EPOCH_PARAMS, alphaAt: DT.alphaAtYear });

const AGES_MA = [-500, -100, -5, -1, -0.3025, 0, 0.3025, 1, 5, 100, 380, 500];

/** @type {{name: string, mine: (y: number) => number|null, theirs: (t: number) => number|null}[]} */
const PROBES = [
  { name: 'moonDistanceMetres', mine: L0.moonDistanceMetres, theirs: DT.meanMoonDistanceMetresAtAge },
  { name: 'lodSeconds', mine: L0.lodSeconds, theirs: DT.meanLodSecondsAtAge },
  { name: 'holisticH', mine: L0.holisticH, theirs: DT.meanHAtAge },
  { name: 'siderealYearSeconds', mine: L0.siderealYearSeconds, theirs: DT.meanSiderealYearSecondsAtAge },
  { name: 'tropicalYearSeconds', mine: L0.tropicalYearSeconds, theirs: DT.meanTropicalYearSecondsAtAge },
  { name: 'anomalisticYearSeconds', mine: L0.anomalisticYearSeconds, theirs: DT.meanAnomalisticYearSecondsAtAge },
];

let checked = 0;
/** @type {{name: string, t: number, want: number|null, got: number|null}[]} */
const drift = [];
for (const { name, mine, theirs } of PROBES) {
  for (const t of AGES_MA) {
    const got = mine(2000 - t * 1e6);
    const want = theirs(t);
    checked += 1;
    if (!Object.is(got, want)) drift.push({ name, t, want, got });
  }
}

console.log('LAYER 0 — bit-identity vs tools/lib/deep-time.js');
console.log('='.repeat(74));
console.log(`  ${checked} comparisons across ${AGES_MA.length} epochs, ${PROBES.length} primitives`);

for (const d of drift) {
  const got = d.got ?? NaN;
  const want = d.want ?? NaN;
  const rel = want ? (got - want) / want : NaN;
  console.log(`\n  DRIFT ${d.name} @ ${d.t} Ma`);
  console.log(`    deep-time.js ${d.want}`);
  console.log(`    layer0       ${d.got}`);
  console.log(`    delta        ${got - want}  (${rel.toExponential(3)} relative)`);
}

if (drift.length) {
  console.log(`\nFAIL — ${drift.length} of ${checked} differ. Phase B moves code, not numbers.`);
  process.exit(1);
}
console.log('\nPASS — bit-identical.');
