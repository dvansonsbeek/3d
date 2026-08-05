/**
 * Climate Formula L1 orbital layer — THE shared evaluator (Phase 8.4,
 * slice 4). The δ¹⁸O contribution from the L1 (orbital/Milankovitch)
 * harmonic layer only, in ‰ — excludes the intercept, L2 (405-kyr
 * carbon), L3 (regime steps), y_mean, and trend_slope: consumers want
 * the orbital FLUCTUATION around J2000, not the secular baseline.
 *
 * Primary consumer: the GIA α(t) chain — one physical mechanism, two
 * observables: the same L1 signal that fits δ¹⁸O also drives α via
 * Milankovitch forcing → ice sheets → GIA J₂/α → LOD (doc 99
 * §prediction-7). Both engines hand-mirrored this loop; it lives once
 * now.
 *
 * ENGINE-SIDE, by design: the regime selection (CLIMATE_FORMULA_COEFFS
 * lookup, the ALPHA_CLIMATE_REGIME_KEY choice), the α formula itself
 * (one subtraction around engine state), and the lattice-α pin machinery
 * (_withLatticeAlpha — mutable engine state with try/finally semantics
 * and, in the browser, a TDZ-history guard).
 */

'use strict';

/**
 * @typedef {Object} ClimateL1Regime
 * @property {Array<{n: number, a: number, b: number}>} l1Terms - 8H-lattice
 *   harmonics (n = cycles per 8H)
 * @property {number} yStdDenormalization - the fit's y_std scale-back
 * @property {number} eightHKyr - 8H in kyr (the fit's period base)
 */

/**
 * @param {number} year - calendar year
 * @param {ClimateL1Regime} regime
 * @returns {number} L1 orbital δ¹⁸O contribution, ‰
 */
function evalClimateL1OrbitalPermil(year, regime) {
  const t_kyr_BP = (2000 - year) / 1000;
  let L1_sum = 0;
  for (const c of regime.l1Terms) {
    const omega = 2 * Math.PI * c.n / regime.eightHKyr;
    L1_sum += c.a * Math.cos(omega * t_kyr_BP) + c.b * Math.sin(omega * t_kyr_BP);
  }
  return L1_sum * regime.yStdDenormalization;
}

module.exports = { evalClimateL1OrbitalPermil };
