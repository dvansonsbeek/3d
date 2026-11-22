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
import { assembleSunMeanLongitude } from './model/sun-mean-longitude.js';
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
  return assembleSurface(composeThrough(inputs, 'cardinal-instants'));
}

/**
 * THE SLICE ORDER — ONE home (plan 15; the one-home fix of the plan-34 cascade, where the residual-spectra
 * sweep's hand-written twin of this list failed on a slice added here). Each entry is the slice's assembler, its
 * file under model/ (the generators hash the files: tools/lib/artifact-inputs.js modelSourceFiles), and the
 * forward bindings it fills the moment it returns (model/context.js). The Sun's mean-longitude table is its own
 * slice before the eclipse tier: the lunar bank hashes it and not the eclipse slice (modelSourceFilesExcluding).
 * The surface is the last slice and is RETURNED, not merged (assembleModel above); composeThrough stops before it.
 * @type {ReadonlyArray<{ name: string, file: string, assemble: (c: any) => any, after?: (c: any, late: any) => void }>}
 */
export const MODEL_SLICES = Object.freeze([
  { name: 'assembleDerivedConstants', file: 'derived-constants', assemble: assembleDerivedConstants },
  { name: 'assembleDeepTimeChain', file: 'deep-time-chain', assemble: assembleDeepTimeChain },
  { name: 'assembleEarthScalars', file: 'earth-scalars', assemble: assembleEarthScalars },
  { name: 'assembleYearDayLengths', file: 'year-day-lengths', assemble: assembleYearDayLengths,
    after: (c, late) => { late.certifiedAxialPrecessionJ2000Years = c.certifiedAxialPrecessionJ2000Years; } },
  { name: 'assembleOneSourceMovement', file: 'one-source-movement', assemble: assembleOneSourceMovement,
    after: (c, late) => { late.oneSourceM = c.oneSourceM; late.yearLengthsM = c.yearLengthsM; } },
  { name: 'assembleMoonEpoch', file: 'moon-epoch', assemble: assembleMoonEpoch },
  { name: 'assembleDeltaT', file: 'delta-t', assemble: assembleDeltaT },
  { name: 'assemblePlanetRecords', file: 'planet-records', assemble: assemblePlanetRecords },
  { name: 'assemblePlanetSpinChannel', file: 'planet-spin-channel', assemble: assemblePlanetSpinChannel },
  { name: 'assemblePlanetElementsOfDate', file: 'planet-elements-of-date', assemble: assemblePlanetElementsOfDate },
  { name: 'assembleInvPlaneElements', file: 'inv-plane-elements', assemble: assembleInvPlaneElements },
  { name: 'assembleTimeAxis', file: 'time-axis', assemble: assembleTimeAxis },
  { name: 'assembleLunarTheory', file: 'lunar-theory', assemble: assembleLunarTheory },
  { name: 'assembleSunMeanLongitude', file: 'sun-mean-longitude', assemble: assembleSunMeanLongitude,
    after: (c, late) => { late.sunMeanLongitudeDegAt = c.sunMeanLongitudeDegAt; } },
  { name: 'assembleSunAndEclipses', file: 'sun-and-eclipses', assemble: assembleSunAndEclipses },
  { name: 'assemblePublishedPeriods', file: 'published-periods', assemble: assemblePublishedPeriods,
    after: (c, late) => { late.publishedAxialPrecessionYearsAtYear = c.publishedAxialPrecessionYearsAtYear; late.publishedSiderealYearSecondsAtYear = c.publishedSiderealYearSecondsAtYear; } },
  { name: 'assembleCardinalInstants', file: 'cardinal-instants', assemble: assembleCardinalInstants,
    after: (c, late) => { late.sunAberrationArcsecAt = c.sunAberrationArcsecAt; } },
  { name: 'assembleSurface', file: 'surface', assemble: assembleSurface },
]);

/**
 * Compose the slices in order THROUGH the named one (its file name), merging each slice's result into the
 * shared context and filling the forward bindings — the composer's own walk, also the parity test's
 * counterfactual and the residual-spectra sweep's context (they stop early or read the context itself).
 * @param {any} inputs  { C, F, laws, secularSeriesArtifact, options, late }
 * @param {string} throughFile  the last slice to apply, e.g. 'published-periods' or 'cardinal-instants'
 */
export function composeThrough(inputs, throughFile) {
  let c = inputs;
  for (const s of MODEL_SLICES) {
    if (s.file === 'surface') break;           // the surface is returned by assembleModel, never merged
    c = Object.assign(c, s.assemble(c));
    if (s.after) s.after(c, inputs.late);
    if (s.file === throughFile) return c;
  }
  throw new Error(`composeThrough: no slice "${throughFile}" before the surface`);
}
