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

module.exports = { createDeepOrbitalHistory };
