/**
 * DEEP ORBITAL HISTORY — the Node shim (Stage C-2/C-3, plan 02 §8).
 *
 * The mathematics lives ONCE in
 * @essrt/physics/earth/deep-orbital-history (the factory); this shim
 * injects the Node engine's certified surfaces:
 *   - the deep mode tables read from the governed DATA artifact (richer
 *     than the embed: it also carries earthZetaEra, the era ζ tier);
 *   - the anchors from the chain artifact's one home;
 *   - the J2000 precession anchor — the IAU 2006 p_A (plan 09; ONE home,
 *     deep-time.js certifiedAxialPrecessionJ2000Years) — and ε₀ from the
 *     astro reference.
 *
 * Consumers: scripts/extract_insolation_features_deep.js (the deep-source
 * insolation feature set — the DEEP ζ tier over its whole Myr-scale grid,
 * per the no-mid-curve-handoff doctrine) through createDeepOrbitalHistory;
 * the scene graph and the cross-engine probes through createOneSourceMovement;
 * the T7 histories generator (tools/explore/t7-export-orbital-histories.mjs)
 * through createOneSourceTier — the SAME construction on its own 1-kyr grid.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function createDeepOrbitalHistory() {
  const ART = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nbody-deep-secular-modes.json'), 'utf8'));
  const { CHAIN_ARTIFACT } = require('../../packages/physics/src/planets/chain-artifact.js');
  const { createDeepOrbitalHistory: factory } = require('../../packages/physics/src/earth/deep-orbital-history.cjs');
  const DT = require('./deep-time.js');
  const C = require('./constants.js');

  const AE = CHAIN_ARTIFACT.j2000AnchorElements.earth;
  // Plan 09: the J2000 precession anchor is the IAU p_A (ONE home, deep-time.js)
  const axial0 = DT.certifiedAxialPrecessionJ2000Years();

  return factory({
    zModes: ART.modes.earth.z,
    zetaModes: ART.modes.earth.zeta,        // the DEEP ζ tier (Myr-scale grids)
    anchorE: AE.e,
    anchorPeriEclipticDeg: AE.lonPeriEclipticDeg,
    anchorInclEclipticDeg: AE.inclEclipticDeg,
    anchorAscNodeEclipticDeg: AE.ascNodeEclipticDeg,
    axialPrecessionYearsJ2000: axial0,
    obliquityJ2000Deg: C.ASTRO_REFERENCE.obliquityJ2000_deg,
  });
}

/**
 * THE ONE-SOURCE MOVEMENT — Node binding (the CSV re-base precursor,
 * plan 02 Stage C / C-4b): ε(t) and e(t) from the SAME construction the
 * browser's ?hybridSpin runs — the banked engine series inside ±10 Myr
 * (data/nbody-secular-series.json), the deep mode tables as the tail, and
 * α(t) = ψ̇(t)/cos ε₀ with the SECULAR scaling only — on the COMPOSED
 * lunisolar rate, period₀ / [ψ̇(t)/ψ̇₀] (plan 06 D6, the leg-1 claim; the
 * pre-D6 form was the structural period₀·H(t)/H₀; the instantaneous
 * year-length beat double-counts the equinox wobble, the measured C-4b
 * catch).
 *
 * Returns { epsDeg(year), e(year) } over a grown cached grid (the browser
 * sampler pattern, 250-aligned tiers per the factory's stepping contract),
 * or null when the series artifact is absent (the scene graph turns that
 * null into a loud error — plan 06 item 3: the one-source movement is the
 * only Node scene). Consumers: the scene graph and the cross-engine parity
 * probes.
 */
/**
 * The one-source movement's FACTORY INSTANCE — the series-backed history every
 * Node consumer of the movement builds its grids from (createOneSourceMovement's
 * tiered sampler; the T7 generator's own 1-kyr grid over 0 … −5.4 Myr). ONE
 * construction, so a consumer can never drift from the scene by assembling
 * the factory's inputs itself. Returns null when the series artifact is absent.
 * @returns {ReturnType<import('../../packages/physics/src/earth/deep-orbital-history.cjs').createDeepOrbitalHistory> | null}
 */
function createOneSourceTier() {
  let seriesArt;
  try {
    seriesArt = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nbody-secular-series.json'), 'utf8'));
  } catch (e) { return null; }
  const ART = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nbody-deep-secular-modes.json'), 'utf8'));
  const { CHAIN_ARTIFACT } = require('../../packages/physics/src/planets/chain-artifact.js');
  const { createDeepOrbitalHistory: factory } = require('../../packages/physics/src/earth/deep-orbital-history.cjs');
  const DT = require('./deep-time.js');
  const C = require('./constants.js');

  const AE = CHAIN_ARTIFACT.j2000AnchorElements.earth;
  const axial0 = DT.certifiedAxialPrecessionJ2000Years();   // plan 09: the IAU p_A anchor
  const eb = seriesArt.bodies.earth;

  return factory({
    zModes: ART.modes.earth.z,
    zetaModes: ART.modes.earth.zeta,
    zetaSeries: { t0Yr: seriesArt.t0Yr, stepYr: eb.stepYr, q: eb.zetaQ, p: eb.zetaP },
    zSeries: { t0Yr: seriesArt.t0Yr, stepYr: eb.stepYr, q: eb.zQ, p: eb.zP },
    anchorE: AE.e,
    anchorPeriEclipticDeg: AE.lonPeriEclipticDeg,
    anchorInclEclipticDeg: AE.inclEclipticDeg,
    anchorAscNodeEclipticDeg: AE.ascNodeEclipticDeg,
    axialPrecessionYearsJ2000: axial0,
    obliquityJ2000Deg: C.ASTRO_REFERENCE.obliquityJ2000_deg,
    // D6 → Phase 3 (plan 06): the composed lunisolar precession CONSTANT of
    // date (spin × [solar + lunar torque on the recession history]) — the
    // torque period, NOT the published rate of date: the integration's own
    // ŝ·n̂ carries the obliquity's cosine, so the cited mean obliquity's factor
    // (plan 12 §8 option (a)) must not enter twice. Twins: packages/physics
    // model.js and src/script.js _deepHistSeries.
    axialPrecessionYearsAtYearFn: (yr) => DT.meanLunisolarTorquePeriodYearsAtAge((2000 - yr) / 1e6) ?? axial0,
    // THE PRECESSION OF DATE (plan 06 §9 item 10): the solar torque at the
    // eccentricity of date and the oblateness of date from the GIA channel —
    // both exactly 1 at J2000. Twins: packages/physics model.js and
    // src/script.js _deepHistSeries (identical deps).
    solarTorqueShareJ2000: DT.PRECESSION_SOLAR_SHARE_J2000,
    dynamicalEllipticityRatioAtYearFn: DT.j2RatioAtYear,
  });
}

function createOneSourceMovement() {
  const tier = createOneSourceTier();
  if (!tier) return null;
  const DT = require('./deep-time.js');

  // grown-grid sampler (the browser's tiers: 250-aligned beyond ±50 kyr).
  // TIER-FILLING growth: build each grid tier to its FULL span the first time
  // a probe enters it. The integrator walk (adaptive 5/250-yr stepping) and
  // the exact-aligned grid stores are endpoint-independent, so the values at
  // every shared t are IDENTICAL to a need-sized build — only the rebuild
  // pattern changes. The previous |t|·1.25 headroom rebuilt the whole
  // integration nearly every chained year of an outward walk — measured as
  // the Step-6a exporter blowup (>5.5× instead of ~2×; ~9,000 rebuilds).
  // PER-TIER ROUTING (the anomalistic-contamination fix): one sampler PER
  // grid tier, built on first entry and KEPT — a query always reads the
  // tier its own span selects. The former single grown sampler REPLACED the
  // 100-yr grid with the 1000/5000-yr one after any deep-time probe, and
  // the year-length rates (±0.5-yr central differences through the grid)
  // then returned grid-segment AVERAGES instead of local rates: the
  // anomalistic year of date read +2.63 s (1000-yr grid) / +19 s (5000-yr
  // grid), visit-order dependent. Values are now pure in `year`.
  const samplers = new Map();   // tier span → sampler; the >2-Myr tier grows in span
  let deepRangeYr = 0;
  const gridStep = (need) => (need <= 50000 ? 100 : need <= 2000000 ? 1000 : 5000);
  const tierSpan = (need) =>
    (need <= 50000 ? 50000 : need <= 2000000 ? 2000000 : Math.ceil(need * 1.25 / 5000) * 5000);
  const sampleAt = (year) => {
    const t = year - 2000;
    const need = Math.max(20000, Math.abs(t) * 1.25);
    const span = tierSpan(need);
    const key = span > 2000000 ? 'deep' : span;
    if (!samplers.has(key) || (key === 'deep' && span > deepRangeYr)) {
      if (key === 'deep') deepRangeYr = span;
      samplers.set(key, tier.build(span, -span, gridStep(span)));
    }
    return samplers.get(key).at(t);
  };
  // D4b: the one-source cardinal structure (the EoC layer — year lengths,
  // crossing offsets, the e(t)-proportional spread) on THIS movement's own
  // sampler. The mean tropical year is SI SECONDS by contract: the sidereal
  // year of date (SI) reduced by the secular α(H(t)) equinox precession —
  // the same construction the movement runs (a days-of-date year hides a
  // ~2,400 s LOD-vs-SI bias at −300 kyr, measured).
  // S2 (owner: ONE implementation): the of-date year-length family comes
  // from the ONE package factory — tropical = the movement's own equinox-
  // rate mean (wobble included; the former smooth secular mean here was
  // one of the duplicated implementations), sidereal = the λ̇ channel,
  // anomalistic + per-cardinal from the structure on the SAME mean, all
  // λ̇-corrected coherently. Identical construction in model.js (API) and
  // script.js (browser).
  const { createYearLengths } = require('../../packages/physics/src/earth/year-lengths.cjs');
  // The anomalistic year rides THIS movement's own apsidal line (the scene's
  // perihelion) — the factory owns the construction (year-lengths.cjs).
  const yearLengths = createYearLengths({
    sampleAt,
    massLossSiderealSecondsAtYearFn: (year) => DT.meanSiderealYearSecondsAtAge((2000 - year) / 1e6),
  });
  // Back-compat shape for the fixture recorder and existing callers.
  const cardinal = {
    eocOffsetSeconds: yearLengths.cardinal.eocOffsetSeconds,
    yearLengthSeconds: yearLengths.cardinal.yearLengthSeconds,
    spreadSeconds: yearLengths.cardinal.spreadSeconds,
    anomalisticYearSeconds: yearLengths.anomalisticYearSecondsAtYear,
  };

  return {
    sampleAt,                        // the full bundle at a year (R4 Earth frame: ε, e, ϖ, equinox, orbit normal)
    epsDeg: (year) => sampleAt(year).epsDeg,
    e: (year) => sampleAt(year).e,
    periOfDateDeg: (year) => sampleAt(year).periOfDateDeg,   // equinox-referenced ϖ of date (D4c wheel flip)
    equinoxLonJ2000Deg: (year) => sampleAt(year).equinoxLonJ2000Deg,   // ŝ×n̂ node longitude (D4d equinox-phase flip)
    cardinal,                        // {eocOffsetSeconds, yearLengthSeconds, spreadSeconds, anomalisticYearSeconds}
    yearLengths,                     // S2: the ONE of-date family (years + beats, SI seconds)
  };
}

module.exports = { createDeepOrbitalHistory, createOneSourceTier, createOneSourceMovement };
