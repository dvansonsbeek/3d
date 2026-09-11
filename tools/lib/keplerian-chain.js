// P5/K2 — the Keplerian planet chain, NODE BINDING. The evaluator lives ONCE
// in @essrt/physics/planets/keplerian-chain (pure — the doctrine header and
// all physics are there); this module binds the two Node-side single homes:
// the model's OWN AU (tools/lib/constants — never the IAU literal; under
// Driver 2 the AU and every a scale ∝ 1/M☉(t), and the deep-time consumption
// takes those scaled values, same doctrine) and the governed artifact on disk
// (data/nbody-secular-frequencies.json — regenerated from the constants
// whenever they change, so a changed planet mass propagates engine →
// artifact → here; the freshness gate carries the causal chain).

'use strict';

const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const C = require(path.join(ROOT, 'tools', 'lib', 'constants.js'));
const KC = require('@essrt/physics/planets/keplerian-chain');

const AU_KM = C.currentAUDistance;

const ARTIFACT_PATH = path.join(ROOT, 'data', 'nbody-secular-frequencies.json');

/** @returns {object} the governed engine-D artifact (parsed fresh). */
function loadEngineDArtifact() {
  return JSON.parse(fs.readFileSync(ARTIFACT_PATH, 'utf8'));
}

// D5/one-source — the secular-series element override, NODE BINDING: the
// SAME @essrt/physics/planets/secular-series module the browser runs,
// constructed from the banked artifacts on disk (the series bank + the
// deep-modes embed + the chain anchors). Beyond a planet's MEASURED
// handover boundary the era chain's extrapolation is unphysical (the
// owner-found Mercury e 0.62 / i 31° at +1.35 Myr); inside it this is a
// no-op. Returns null when the series artifact is absent — the override
// is then inactive, mirroring the browser's fetch-failure path.
const SERIES_PATH = path.join(ROOT, 'data', 'nbody-secular-series.json');
let _seriesOverride;   // undefined = not built yet; null = unavailable
function secularSeriesOverride() {
  if (_seriesOverride === undefined) {
    try {
      const S = JSON.parse(fs.readFileSync(SERIES_PATH, 'utf8'));
      const art = loadEngineDArtifact();
      const { DEEP_MODES_ARTIFACT } = require(path.join(ROOT, 'packages', 'physics', 'src', 'moon', 'deep-modes-artifact.cjs'));
      const { createSecularSeriesOverride } = require('@essrt/physics/planets/secular-series');
      _seriesOverride = createSecularSeriesOverride({
        series: S,
        anchorElements: art.j2000AnchorElements,
        invariablePlane: art.invariablePlane,
        planetZModes: DEEP_MODES_ARTIFACT.planetZ,
        planetZetaModes: DEEP_MODES_ARTIFACT.planetZeta,
      });
    } catch (e) { _seriesOverride = null; }
  }
  return _seriesOverride;
}

/** Full osculating elements from a heliocentric ecliptic-J2000 state vector,
 *  in the model's own AU (bound here — the pure core takes auKm explicitly).
 *  @param {number[]} rKm @param {number[]} vKmS @param {number} muKm3S2
 *  @returns {object} */
function computeOsculatingElements(rKm, vKmS, muKm3S2) {
  return KC.computeOsculatingElements(rKm, vKmS, muKm3S2, AU_KM);
}

/** The chain's canonical constructor (K2.1 → K4.6c): EVERY input from the
 *  governed engine-D artifact on disk. One home; see the package module for
 *  the option contract ({skeletonOnly} — the extraction/solve instruments).
 *  @param {{skeletonOnly?:boolean}=} opts @returns {Object<string,object>} */
function buildPlanetChainsFromArtifact(opts = {}) {
  return KC.buildPlanetChainsFromArtifactData(loadEngineDArtifact(), opts);
}

/** Build the per-planet chain inputs: anchors from injected J2000 vectors +
 *  era-typed rates from the governed engine-D artifact.
 *  @param {Object<string,number[]>} hzVectors  {planet: [x,y,z km, vx,vy,vz km/s]}
 *  @param {Object<string,number>} gmPlanets    {planet: GM km³/s²}
 *  @param {Object<string,number>=} windowMeanMotionsDegPerYr  engine-D-measured
 *         window mean motions (until the artifact carries them; default osculating) */
function buildPlanetChains(hzVectors, gmPlanets, windowMeanMotionsDegPerYr = {}) {
  const art = loadEngineDArtifact();
  const chains = {};
  for (const key of Object.keys(hzVectors)) {
    const st = hzVectors[key];
    const anchor = computeOsculatingElements(st.slice(0, 3), st.slice(3, 6), C.GM_SUN + gmPlanets[key]);
    chains[key] = {
      anchor,
      periRateArcsecCy: art.windowRatesArcsecCy.gr[key],
      meanMotionDegPerYr: windowMeanMotionsDegPerYr[key] ?? null,
    };
  }
  return chains;
}

module.exports = {
  ANCHOR_EPOCH_YEAR: KC.ANCHOR_EPOCH_YEAR,
  ANCHOR_EPOCH_JD: KC.ANCHOR_EPOCH_JD,
  buildPlanetChainsFromArtifact,
  secularSeriesOverride,
  computePoissonArgRad: KC.computePoissonArgRad,
  computeOsculatingElements,
  solveKeplerRad: KC.solveKeplerRad,
  computeHeliocentricEclipticFromElements: KC.computeHeliocentricEclipticFromElements,
  computePlanetElementsAtYear: KC.computePlanetElementsAtYear,
  buildPlanetChains,
  loadEngineDArtifact,
};
