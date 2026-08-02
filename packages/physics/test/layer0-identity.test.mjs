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
import { deriveEpochParams } from '../src/layer0/derive-params.js';

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
// `earthMoiFactorAtAge` is the LIVE α(t) channel, injected on the t_Ma axis it
// already speaks. R2 (pinning α at its J2000 reference while BUILDING a
// lattice table) is a Phase C change and is deliberately not applied: this
// test proves the port is faithful to today's behaviour, today's α convention
// included.
const L0 = createEpochPrimitives({ params: DT.EPOCH_PARAMS, alphaAtAgeMa: DT.earthMoiFactorAtAge });

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

// ── Gate 2: f(year) reproduces the t_Ma chain where t does NOT round-trip ──
// `t → year → t` is not a float identity: a 1e6-point sweep measured 1.9% of
// the domain failing it. That motivated a second t_Ma entry axis — built, then
// REMOVED, because a 200k-point output-level sweep found ZERO cases where the
// wobble reaches the result bits (chain sensitivity ~20 s/Ma on LOD × a 1-ULP
// t wobble sits orders below the output ULP). These t values are harvested
// from the round-trip FAILURES (deterministic LCG, seed 12345), so this gate
// pins that measurement: if the chain ever grows steep enough for the wobble
// to surface, `f(2000 − t·1e6)` stops matching `AtAge(t)` here and the
// single-axis design decision is re-opened loudly rather than rotting.
const AWKWARD_T = [
  -0.03097026348114014,
  -0.014657044410705568,
  -0.002642762660980225,
  -0.0032864779233932498,
  -0.007649835944175721,
  -0.03091012239456177,
  -0.006239527463912964,
  0.00024188756942749025,
];
for (const t of AWKWARD_T) {
  for (const { name, mine, theirs } of PROBES) {
    const got = mine(2000 - t * 1e6);
    const want = theirs(t);
    checked += 1;
    if (!Object.is(got, want)) drift.push({ name: `nonRoundTrip.${name}`, t, want, got });
  }
}

// ── Gate 3: deriveEpochParams reproduces EPOCH_PARAMS field for field ─────
// deep-time.js still derives its bundle inline; the browser will derive via
// deriveEpochParams. Until Phase C consolidates them, THIS comparison is the
// only thing holding the two derivations together. earthDiameterKm is a
// literal in deep-time.js:26 — the same literal here, and this gate is what
// keeps them equal.
const C = require(`${TOOLS_LIB}constants.js`);
const derivedParams = deriveEpochParams({
  solarLuminosityW: C.SOLAR_LUMINOSITY_W,
  solarWindKgPerS: C.SOLAR_WIND_KG_PER_S,
  speedOfLightKmPerS: C.speedOfLight,
  alpha1PerMa: C.ALPHA_1,
  alpha3PerMa3: C.ALPHA_3,
  alpha4PerMa4: C.ALPHA_4,
  holisticYearJ2000: C.H,
  meanSiderealYearSeconds: C.meanSiderealYearSeconds,
  meanSiderealYearDaysKinematic: C.meanSiderealYearDaysKinematic,
  sunMassKg: C.M_SUN,
  gmEarthAloneKm3S2: C.GM_EARTH_ALONE,
  gmMoonAloneKm3S2: C.GM_MOON_ALONE,
  gravitationalConstantKm3KgS2: C.G_CONSTANT,
  earthMoiFactorJ2000: C.EARTH_MOI_FACTOR,
  earthDiameterKm: 12756.27,
  moonDistanceKm: C.moonDistance,
  moonOrbitalEccentricity: C.moonOrbitalEccentricity,
  gmEarthMoonSystemKm3S2: C.GM_EARTH_MOON_SYSTEM,
});
/** @type {string[]} */
const paramDrift = [];
for (const [k, want] of Object.entries(DT.EPOCH_PARAMS)) {
  checked += 1;
  const got = /** @type {Record<string, number>} */ (/** @type {unknown} */ (derivedParams))[k];
  if (!Object.is(got, want)) paramDrift.push(`${k}: deep-time ${want} vs derived ${got}`);
}

console.log('LAYER 0 — bit-identity vs tools/lib/deep-time.js');
console.log('='.repeat(74));
console.log(`  ${checked} comparisons: ${PROBES.length} primitives × ${AGES_MA.length} epochs + ${AWKWARD_T.length} non-round-tripping t + ${Object.keys(DT.EPOCH_PARAMS).length} derived params`);

for (const d of drift) {
  const got = d.got ?? NaN;
  const want = d.want ?? NaN;
  const rel = want ? (got - want) / want : NaN;
  console.log(`\n  DRIFT ${d.name} @ ${d.t} Ma`);
  console.log(`    deep-time.js ${d.want}`);
  console.log(`    layer0       ${d.got}`);
  console.log(`    delta        ${got - want}  (${rel.toExponential(3)} relative)`);
}

for (const line of paramDrift) console.log(`\n  PARAM DRIFT ${line}`);

if (drift.length || paramDrift.length) {
  console.log(`\nFAIL — ${drift.length + paramDrift.length} of ${checked} differ. Phase B moves code, not numbers.`);
  process.exit(1);
}
console.log('\nPASS — bit-identical, including at non-round-tripping t; the two param derivations agree.');
