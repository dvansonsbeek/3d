/**
 * DEEP ORBITAL HISTORY — the Node shim (Stage C-2/C-3, plan 02 §8).
 *
 * The mathematics lives ONCE in
 * @essrt/physics/earth/deep-orbital-history (the factory); this shim
 * injects the Node engine's certified surfaces:
 *   - the deep mode tables read from the governed DATA artifact (richer
 *     than the embed: it also carries earthZetaEra, the era ζ tier);
 *   - the anchors from the chain artifact's one home;
 *   - the equinox-precession anchor from the engine's own year lengths
 *     (sid/(sid−sol) at 2000 = 25,771.4 yr — the same surface the Stage-C
 *     lab uses; the kinematic H/13 25,793.6 is a recorded 0.09% relation
 *     tension, stated never tuned) and ε₀ from the astro reference.
 *
 * Consumers: scripts/extract_insolation_features_deep.js (the deep-source
 * insolation feature set — the DEEP ζ tier over its whole Myr-scale grid,
 * per the no-mid-curve-handoff doctrine).
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
  const sidDays = DT.computeSiderealYearDaysDirect(2000);
  const solDays = DT.computeSolarYearDaysDirect(2000);

  return factory({
    zModes: ART.modes.earth.z,
    zetaModes: ART.modes.earth.zeta,        // the DEEP ζ tier (Myr-scale grids)
    anchorE: AE.e,
    anchorPeriEclipticDeg: AE.lonPeriEclipticDeg,
    anchorInclEclipticDeg: AE.inclEclipticDeg,
    anchorAscNodeEclipticDeg: AE.ascNodeEclipticDeg,
    axialPrecessionYearsJ2000: sidDays / (sidDays - solDays),
    obliquityJ2000Deg: C.ASTRO_REFERENCE.obliquityJ2000_deg,
  });
}

/**
 * THE ONE-SOURCE MOVEMENT — Node binding (the CSV re-base precursor,
 * plan 02 Stage C / C-4b): ε(t) and e(t) from the SAME construction the
 * browser's ?hybridSpin runs — the banked engine series inside ±10 Myr
 * (data/nbody-secular-series.json), the deep mode tables as the tail, and
 * α(t) = ψ̇(t)/cos ε₀ with the SECULAR H(t) scaling only
 * (period₀·H(t)/H₀ — the leg-1 claim; the instantaneous year-length beat
 * double-counts the equinox wobble, the measured C-4b catch).
 *
 * Returns { epsDeg(year), e(year) } over a grown cached grid (the browser
 * sampler pattern, 250-aligned tiers per the factory's stepping contract),
 * or null when the series artifact is absent. Consumers: the scene-graph
 * one-source option (setOneSourceMovement — the CSV exporter's re-base
 * mode) and the cross-engine parity probes.
 */
function createOneSourceMovement() {
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
  const sidDays = DT.computeSiderealYearDaysDirect(2000);
  const solDays = DT.computeSolarYearDaysDirect(2000);
  const axial0 = sidDays / (sidDays - solDays);
  const H0 = DT.meanHAtAge(0);
  const eb = seriesArt.bodies.earth;

  const tier = factory({
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
    axialPrecessionYearsAtYearFn: (yr) => axial0 * DT.meanHAtAge((2000 - yr) / 1e6) / H0,
  });

  // grown-grid sampler (the browser's tiers: 250-aligned beyond ±50 kyr).
  // TIER-FILLING growth: build each grid tier to its FULL span the first time
  // a probe enters it. The integrator walk (adaptive 5/250-yr stepping) and
  // the exact-aligned grid stores are endpoint-independent, so the values at
  // every shared t are IDENTICAL to a need-sized build — only the rebuild
  // pattern changes. The previous |t|·1.25 headroom rebuilt the whole
  // integration nearly every chained year of an outward walk — measured as
  // the Step-6a exporter blowup (>5.5× instead of ~2×; ~9,000 rebuilds).
  let sampler = null, rangeYr = 0;
  const gridStep = (need) => (need <= 50000 ? 100 : need <= 2000000 ? 1000 : 5000);
  const tierSpan = (need) =>
    (need <= 50000 ? 50000 : need <= 2000000 ? 2000000 : Math.ceil(need * 1.25 / 5000) * 5000);
  const sampleAt = (year) => {
    const t = year - 2000;
    const need = Math.max(20000, Math.abs(t) * 1.25);
    if (!sampler || need > rangeYr) {
      rangeYr = tierSpan(need);
      sampler = tier.build(rangeYr, -rangeYr, gridStep(rangeYr));
    }
    return sampler.at(t);
  };
  // D4b: the one-source cardinal structure (the EoC layer — year lengths,
  // crossing offsets, the e(t)-proportional spread) on THIS movement's own
  // sampler. The mean tropical year is SI SECONDS by contract: the sidereal
  // year of date (SI) reduced by the secular α(H(t)) equinox precession —
  // the same construction the movement runs (a days-of-date year hides a
  // ~2,400 s LOD-vs-SI bias at −300 kyr, measured).
  const { createCardinalStructure } = require('../../packages/physics/src/cardinal/one-source-structure.cjs');
  const tropicalYearSecondsAtYearFn = (year) => {
    const tMa = (2000 - year) / 1e6;
    return DT.meanSiderealYearSecondsAtAge(tMa) * (1 - 1 / (axial0 * DT.meanHAtAge(tMa) / H0));
  };
  const cardinal = createCardinalStructure({ sampleAt, tropicalYearSecondsAtYearFn });

  return {
    epsDeg: (year) => sampleAt(year).epsDeg,
    e: (year) => sampleAt(year).e,
    cardinal,                        // {eocOffsetSeconds, yearLengthSeconds, spreadSeconds}
  };
}

module.exports = { createDeepOrbitalHistory, createOneSourceMovement };
