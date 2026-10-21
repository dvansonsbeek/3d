/**
 * The planets' spin channel — each planet's precession constant from its own torques on the chain's orbit.
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 */
import { DEEP_MODES_ARTIFACT } from '../moon/deep-modes-artifact.cjs';
import { CHAIN_ARTIFACT } from '../planets/chain-artifact.js';
import { createPlanetSpinChannelFromArtifacts } from '../planets/spin-channel.cjs';

/** @param {import('./planet-records.js').Ctx} ctx @returns the bindings the later slices read */
export function assemblePlanetSpinChannel(ctx) {
  const { C, GM_SUN, PLANET_KEYS, massFraction } = ctx;
  // The planets' spin channel: the precession constant
  // from each planet's OWN torques (astro-reference planetSpinPhysical) on the
  // model's OWN orbit — the chain's J2000 a/e/plane and the deep ζ table —
  // integrated as dŝ/dt = α(ŝ·n̂)(ŝ×n̂) from the IAU J2000 pole. ONE home:
  // planets/spin-channel.cjs; built lazily per planet, pure in `year`.
  /** @type {Map<string, ReturnType<typeof createPlanetSpinChannelFromArtifacts>>} */
  const spinChannels = new Map();
  /** @param {string} k */
  const planetSpin = (k) => {
    if (!PLANET_KEYS.includes(k)) throw new Error(`planets.spin: unknown planet '${k}'`);
    let ch = spinChannels.get(k);
    if (!ch) {
      ch = createPlanetSpinChannelFromArtifacts({
        key: k,
        planetSpinPhysical: C.planetSpinPhysical,
        chainAnchorElements: /** @type {any} */ (CHAIN_ARTIFACT).j2000AnchorElements,
        planetZeta: /** @type {any} */ (DEEP_MODES_ARTIFACT).planetZeta,
        massFractionOfSun: massFraction[k],
        gmSunKm3S2: GM_SUN,
        obliquityJ2000Deg: C.earthOrbital.obliquityJ2000_deg,
      });
      spinChannels.set(k, ch);
    }
    return ch;
  };

  return { planetSpin };
}
/** @typedef {import('./planet-records.js').Ctx & ReturnType<typeof assemblePlanetSpinChannel>} Ctx */
