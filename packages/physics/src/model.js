/**
 * createModel() — the canonical assembly of the parts library (§7a step 1).
 *
 * The package deliberately ships unassembled factories; every consumer wires
 * them (tools/lib, script.js's generated-constants side, the website's
 * adapter). This module is that wiring, extracted once: constants in,
 * assembled model out. The api surface (Phase 15) builds on it, and the
 * eventual tools/lib adapter collapse swaps onto it instead of keeping a
 * private twin.
 *
 * The wiring is COMPOSED here from named slices (./model/): each slice file
 * assembles one family of quantities from the context the earlier slices
 * built and returns the bindings the later ones read — a reader finds the
 * obliquity of date in model/one-source-movement.js, the eclipse finders in
 * model/sun-and-eclipses.js, the published object in model/surface.js. The
 * slices run in dependency order on ONE shared context object, so every memo
 * and sampler exists once; the few bindings a slice reads at call time from a
 * later slice are the `late` set (model/context.js), filled below as each
 * owner returns.
 *
 * Counterfactuals are first-class (§2d): the context validation and the
 * counterfactual hashing live in index.js's `createModel`, which composes
 * this assembly with the resolved, frozen context. This module stays pure
 * and browser-safe.
 *
 * Wiring order mirrors the reference adapter (holisticuniverse
 * src/lib/essrt.ts) operation-for-operation where FP association matters,
 * which itself mirrors tools/lib/constants.js §9.
 */
import { assembleDerivedConstants } from './model/derived-constants.js';
import { assembleDeepTimeChain } from './model/deep-time-chain.js';
import { assembleEarthScalars } from './model/earth-scalars.js';
import { assembleYearDayLengths } from './model/year-day-lengths.js';
import { assembleOneSourceMovement } from './model/one-source-movement.js';
import { assembleMoonEpoch } from './model/moon-epoch.js';
import { assembleDeltaT } from './model/delta-t.js';
import { assemblePlanetRecords } from './model/planet-records.js';
import { assemblePlanetSpinChannel } from './model/planet-spin-channel.js';
import { assemblePlanetElementsOfDate } from './model/planet-elements-of-date.js';
import { assembleInvPlaneElements } from './model/inv-plane-elements.js';
import { assembleTimeAxis } from './model/time-axis.js';
import { assembleLunarTheory } from './model/lunar-theory.js';
import { assembleSunAndEclipses } from './model/sun-and-eclipses.js';
import { assemblePublishedPeriods } from './model/published-periods.js';
import { assembleCardinalInstants } from './model/cardinal-instants.js';
import { assembleSurface } from './model/surface.js';

/**
 * Assemble the model surfaces from a resolved constants context + fitted
 * coefficients. Internal: `createModel` in index.js composes this with the
 * §2d context validation and counterfactual hashing — call that, not this.
 *
 * @param {Readonly<Record<string, any>>} C  the frozen constants context
 * @param {Readonly<Record<string, any>>} F  the fitted coefficients
 * @param {import('./model/context.js').Laws} [laws]  research overrides for Earth's orbit laws
 *   (model/context.js); default {} = the shipped laws, bit-identical to before this parameter existed
 * @param {any} [secularSeriesArtifact]  the governed N-body secular series (the API/Node path; the
 *   npm package alone has no 8 MB series)
 * @param {import('./model/context.js').Options} [options]  `giaEllipticityOfDate: false` = the orbital
 *   forcing alone (model/context.js); default true = the shipped physics, bit-identical to before
 * @returns the assembled surfaces (epoch, earth, lengths, cardinal, moon, …) — type inferred so ReturnType stays precise
 */
export function assembleModel(C, F, laws = {}, secularSeriesArtifact = /** @type {any} */ (null), options = {}) {
  /** The forward bindings (model/context.js) — each filled the moment its owning slice returns. */
  const late = /** @type {import('./model/context.js').LateBindings} */ ({});
  /** @type {import('./model/context.js').ModelInputs} */
  const inputs = { C, F, laws, secularSeriesArtifact, options, late };
  const c1 = Object.assign(inputs, assembleDerivedConstants(inputs));
  const c2 = Object.assign(c1, assembleDeepTimeChain(c1));
  const c3 = Object.assign(c2, assembleEarthScalars(c2));
  const c4 = Object.assign(c3, assembleYearDayLengths(c3));
  late.certifiedAxialPrecessionJ2000Years = c4.certifiedAxialPrecessionJ2000Years;
  const c5 = Object.assign(c4, assembleOneSourceMovement(c4));
  late.oneSourceM = c5.oneSourceM;
  late.yearLengthsM = c5.yearLengthsM;
  const c6 = Object.assign(c5, assembleMoonEpoch(c5));
  const c7 = Object.assign(c6, assembleDeltaT(c6));
  const c8 = Object.assign(c7, assemblePlanetRecords(c7));
  const c9 = Object.assign(c8, assemblePlanetSpinChannel(c8));
  const c10 = Object.assign(c9, assemblePlanetElementsOfDate(c9));
  const c11 = Object.assign(c10, assembleInvPlaneElements(c10));
  const c12 = Object.assign(c11, assembleTimeAxis(c11));
  const c13 = Object.assign(c12, assembleLunarTheory(c12));
  const c14 = Object.assign(c13, assembleSunAndEclipses(c13));
  late.sunMeanLongitudeDegAt = c14.sunMeanLongitudeDegAt;
  const c15 = Object.assign(c14, assemblePublishedPeriods(c14));
  late.publishedAxialPrecessionYearsAtYear = c15.publishedAxialPrecessionYearsAtYear;
  late.publishedSiderealYearSecondsAtYear = c15.publishedSiderealYearSecondsAtYear;
  const c16 = Object.assign(c15, assembleCardinalInstants(c15));
  late.sunAberrationArcsecAt = c16.sunAberrationArcsecAt;
  return assembleSurface(c16);
}
