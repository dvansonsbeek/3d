/**
 * The planets' elements of date — the chain with the series handover: ϖ, Ω (S&S origin), i, e.
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 */
import { DEEP_MODES_ARTIFACT } from '../moon/deep-modes-artifact.cjs';
import { CHAIN_ARTIFACT } from '../planets/chain-artifact.js';
import { computeEquatorNodeOriginSFrameDeg, convertNodeSFrameToEquatorOriginDeg } from '../planets/inv-plane-frame.cjs';
import { buildPlanetChainsFromArtifactData, computePlanetElementsAtYear } from '../planets/keplerian-chain.cjs';
import { createSecularSeriesOverride } from '../planets/secular-series.cjs';

/** @param {import('./planet-spin-channel.js').Ctx} ctx @returns the bindings the later slices read */
export function assemblePlanetElementsOfDate(ctx) {
  const { C, secularSeriesArtifact } = ctx;
  // The planets' elements of date ride THE CHAIN — the only planet path the
  // simulator renders — with the series handover beyond each planet's
  // measured boundary when the series artifact is supplied: the mirror of the
  // browser's _chainElementsOfDate → _chainSeriesSecularEl. The chain's
  // argument is dynamical time; the API's decimal year is taken as that
  // argument (ΔT on a secular element is far below its stated accuracy).
  let planetChains = /** @type {any} */ (null);
  let planetSeriesOverride = /** @type {any} */ (null);
  let planetNodeOriginSSDeg = /** @type {number|null} */ (null);
  /** @param {string} k @param {number} year */
  const planetChainElementsAt = (k, year) => {
    if (!planetChains) planetChains = buildPlanetChainsFromArtifactData(/** @type {any} */ (CHAIN_ARTIFACT));
    const el = computePlanetElementsAtYear(year, planetChains[k], planetChains);
    const seriesArt = /** @type {any} */ (secularSeriesArtifact);
    if (!seriesArt) return el;
    if (!planetSeriesOverride) {
      planetSeriesOverride = createSecularSeriesOverride({
        series: seriesArt,
        anchorElements: /** @type {any} */ (CHAIN_ARTIFACT).j2000AnchorElements,
        invariablePlane: /** @type {any} */ (CHAIN_ARTIFACT).invariablePlane,
        planetZModes: /** @type {any} */ (DEEP_MODES_ARTIFACT).planetZ,
        planetZetaModes: /** @type {any} */ (DEEP_MODES_ARTIFACT).planetZeta,
      });
    }
    return planetSeriesOverride.applyToElements(k, year, el);
  };
  /** Ecliptic longitude of perihelion, J2000 ecliptic and equinox (the chain's ϖ). @param {string} k @param {number} year @returns {number} */
  const planetPerihelionDeg = (k, year) => planetChainElementsAt(k, year).lonPeriEclipticDeg;
  /** The S&S longitude origin as an s-frame longitude (J2000-fixed, derived). @returns {number} */
  const nodeOriginSSDeg = () => {
    if (planetNodeOriginSSDeg === null) {
      planetNodeOriginSSDeg = computeEquatorNodeOriginSFrameDeg(/** @type {any} */ (CHAIN_ARTIFACT).invariablePlane, C.earthOrbital.obliquityJ2000_deg);
    }
    return planetNodeOriginSSDeg;
  };
  /** Ascending node on the model's invariable plane, from the plane's ascending node on the ICRF equator (the Souami & Souchay 2012 origin; derived conversion, inv-plane-frame). @param {string} k @param {number} year @returns {number} */
  const planetAscNodeDeg = (k, year) => convertNodeSFrameToEquatorOriginDeg(planetChainElementsAt(k, year).ascNodeInvPlaneDeg, nodeOriginSSDeg());
  /** Inclination to the model's invariable plane (exact orbit-normal rotation). @param {string} k @param {number} year @returns {number} */
  const planetInclinationDeg = (k, year) => planetChainElementsAt(k, year).inclInvPlaneDeg;
  /** Orbital eccentricity of date, from the same chain elements — the chain's
   *  multi-mode e-vector has no single base + amplitude + phase triple, so the
   *  value of date is the published form. @param {string} k @param {number} year @returns {number} */
  const planetEccentricity = (k, year) => planetChainElementsAt(k, year).e;

  return { nodeOriginSSDeg, planetAscNodeDeg, planetEccentricity, planetInclinationDeg, planetPerihelionDeg };
}
/** @typedef {import('./planet-spin-channel.js').Ctx & ReturnType<typeof assemblePlanetElementsOfDate>} Ctx */
